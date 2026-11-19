// 界面层：悬停标签、对话气泡、面板（弹窗）、提示条、打字机效果。

import { s } from './i18n.js';
import { sfx } from './sound.js';

/** 小工具：el('div', {class:'x', onclick}, child1, 'text') */
export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return e;
}

/** 打字机效果，返回 { skip() } */
export function typewrite(node, text, { reduced = false, speed = 28, onDone } = {}) {
  const chars = Array.from(text);
  let timer = null;
  const finish = () => {
    if (timer) clearInterval(timer);
    timer = null;
    node.textContent = text;
    onDone && onDone();
  };
  if (reduced || !chars.length) {
    finish();
    return { skip() {}, get done() { return true; } };
  }
  let i = 0;
  node.textContent = '';
  timer = setInterval(() => {
    i++;
    node.textContent = chars.slice(0, i).join('');
    if (i % 2 === 0) sfx.type();
    if (i >= chars.length) finish();
  }, speed);
  return {
    skip() { if (timer) finish(); },
    get done() { return !timer; },
  };
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';

export class UI {
  constructor(root, room, { reduced }) {
    this.root = root;
    this.room = room;
    this.reduced = reduced;
    this.layer = root.querySelector('#ui-layer');
    this.modalRoot = root.querySelector('#modal-root');
    this.live = root.querySelector('#sr-live');
    this.tooltip = el('div', { class: 'tooltip', 'aria-hidden': 'true' });
    this.layer.append(this.tooltip);
    this.tipBox = null;
    this.bubbles = new Map();
    this.panel = null;

    const reposition = () => this.reposition();
    room.onLayout(reposition);
    room.viewport.addEventListener('scroll', reposition, { passive: true });
    window.addEventListener('resize', reposition);

    document.addEventListener('keydown', (e) => this.onKey(e));
  }

  announce(text) {
    this.live.textContent = '';
    setTimeout(() => { this.live.textContent = text; }, 30);
  }

  // ---------- 悬停标签 ----------
  showTooltip(text, box) {
    this.tooltip.textContent = text;
    this.tooltip.classList.add('on');
    this.tipBox = box;
    this.placeTooltip();
  }

  hideTooltip() {
    this.tooltip.classList.remove('on');
    this.tipBox = null;
  }

  placeTooltip() {
    if (!this.tipBox) return;
    const b = this.tipBox;
    const top = this.room.toClient(b.x + b.w / 2, b.y);
    const bottom = this.room.toClient(b.x + b.w / 2, b.y + b.h);
    const tw = this.tooltip.offsetWidth;
    const th = this.tooltip.offsetHeight;
    const minTop = this.room.viewport.getBoundingClientRect().top + 4;
    let y = top.y - th - 8;
    if (y < minTop) y = bottom.y + 8;
    const x = Math.min(Math.max(4, top.x - tw / 2), window.innerWidth - tw - 4);
    this.tooltip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  // ---------- 对话气泡（锚定在房间里的某个点上） ----------
  bubble(key, { anchor, text, actions = [], typewriter = true, timeout = 0, small = false, side = 'auto' }) {
    this.closeBubble(key);
    const textEl = el('p', { class: 'bubble-text' });
    const closeBtn = el('button', { class: 'bubble-x', type: 'button', 'aria-label': s('close') }, '×');
    const actionsEl = actions.length
      ? el('div', { class: 'bubble-actions' }, actions.map((a) => el('button', { class: 'px-link', type: 'button', onclick: () => a.onClick() }, a.label)))
      : null;
    const b = el('div', { class: `bubble${small ? ' small' : ''}` }, closeBtn, textEl, actionsEl);
    this.layer.append(b);
    const entry = { el: b, anchor, timer: null, text, side, small };
    this.bubbles.set(key, entry);
    closeBtn.addEventListener('click', () => this.closeBubble(key));
    const tw = typewrite(textEl, text, { reduced: this.reduced || !typewriter, onDone: () => this.placeBubble(entry) });
    b.addEventListener('click', (e) => {
      if (e.target === closeBtn) return;
      tw.skip();
    });
    this.announce(text);
    this.placeBubble(entry, text); // 用完整文字先定好尺寸，打字时气泡不跳
    if (timeout) entry.timer = setTimeout(() => this.closeBubble(key), timeout);
    if (!this.reduced) b.animate([{ transform: `${b.style.transform} scale(0.6)`, opacity: 0 }, { transform: `${b.style.transform} scale(1)`, opacity: 1 }], { duration: 160, easing: 'steps(3, end)' });
    return entry;
  }

  placeBubble(entry, fullText) {
    const b = entry.el;
    // 放左边时，宽度不超过锚点左侧的空间（至少 260px，不够就退回上 / 下摆放）
    const room0 = this.room.toClient(entry.anchor.x, entry.anchor.y).x - 22;
    const sideFits = entry.side === 'left' && room0 >= 260 && window.innerWidth >= 760;
    if (fullText) b.style.maxWidth = sideFits ? `${Math.min(460, room0)}px` : '';
    if (fullText) {
      // 用完整文字撑开尺寸，打字时不抖
      // 测量时先藏起正在打字的文字，换成完整文字的「影子」
      const textEl = b.querySelector('.bubble-text');
      const ghost = el('p', { class: 'bubble-text ghost', 'aria-hidden': 'true' }, fullText);
      textEl.style.display = 'none';
      textEl.after(ghost);
      b.style.width = '';
      b.style.minHeight = '';
      const w = b.offsetWidth;
      b.style.width = `${w}px`;
      const h = b.offsetHeight;
      ghost.remove();
      textEl.style.display = '';
      b.style.minHeight = `${h}px`;
    }
    const p = this.room.toClient(entry.anchor.x, entry.anchor.y);
    const bw = b.offsetWidth;
    const bh = b.offsetHeight;
    const minTop = this.room.viewport.getBoundingClientRect().top + 4;
    b.classList.remove('left', 'below', 'dock');

    // 小屏幕：像 RPG 一样固定在底部的对话框，不挡住角色
    if (!entry.small && window.innerWidth < 760) {
      b.classList.add('dock');
      b.style.transform = '';
      return;
    }
    // 放在锚点左边（角色的自我介绍：气泡在窗户上方，不挡脸）
    if (entry.side === 'left' && p.x - bw - 16 >= 6) {
      const x = p.x - bw - 16;
      const y = Math.min(Math.max(minTop, p.y - bh * 0.4), window.innerHeight - bh - 6);
      b.classList.add('left');
      b.style.setProperty('--tail-y', `${Math.round(Math.min(Math.max(12, p.y - y), bh - 20))}px`);
      b.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      return;
    }
    let x = p.x - bw * 0.35;
    x = Math.min(Math.max(6, x), window.innerWidth - bw - 6);
    let y = p.y - bh - 14;
    const below = y < minTop;
    if (below) y = p.y + 14;
    b.classList.toggle('below', below);
    b.style.setProperty('--tail', `${Math.round(Math.min(Math.max(16, p.x - x), bw - 24))}px`);
    b.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  closeBubble(key) {
    const entry = this.bubbles.get(key);
    if (!entry) return;
    clearTimeout(entry.timer);
    entry.el.remove();
    this.bubbles.delete(key);
  }

  closeAllBubbles() {
    [...this.bubbles.keys()].forEach((k) => this.closeBubble(k));
  }

  reposition() {
    this.placeTooltip();
    // 尺寸变化时重新测量气泡宽高（页面刚加载时容器可能还没有宽度）
    const vw = window.innerWidth;
    const resized = vw !== this.lastVW;
    this.lastVW = vw;
    this.bubbles.forEach((entry) => this.placeBubble(entry, resized ? entry.text : undefined));
  }

  // ---------- 面板 ----------
  openPanel({ id, title, body, footer = null, wide = false, anim = 'pop', onClose = null, returnFocus = null }) {
    if (this.panel) this.closePanel({ silent: true, keepFocus: true });
    this.hideTooltip();
    const titleId = `panel-title-${id}`;
    const closeBtn = el('button', { class: 'px-btn icon close', type: 'button', 'aria-label': s('close'), onclick: () => this.closePanel() }, '×');
    const fontBtn = el('button', { class: 'px-btn small font-toggle', type: 'button', onclick: () => this.toggleFont(fontBtn) }, this.fontLabel());
    const panel = el(
      'section',
      { class: `panel panel-${id}${wide ? ' wide' : ''}` },
      el('header', { class: 'panel-head' }, el('h2', { id: titleId }, title), el('div', { class: 'panel-tools' }, fontBtn, closeBtn)),
      el('div', { class: 'panel-body' }, body),
      footer ? el('footer', { class: 'panel-foot' }, footer) : null,
    );
    const backdrop = el('div', { class: 'backdrop', onclick: () => this.closePanel() });
    const modal = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, backdrop, panel);
    this.modalRoot.append(modal);
    this.root.classList.add('has-modal');
    this.panel = { id, modal, panel, onClose, returnFocus: returnFocus || document.activeElement };
    if (!this.reduced) {
      const frames = anim === 'flip'
        ? [{ transform: 'scaleX(0.05)' }, { transform: 'scaleX(1)' }]
        : [{ transform: 'scale(0.7)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }];
      panel.animate(frames, { duration: anim === 'flip' ? 150 : 220, easing: 'steps(4, end)' });
      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'steps(3, end)' });
    }
    sfx.open();
    const first = panel.querySelector('.panel-body ' + FOCUSABLE) || closeBtn;
    setTimeout(() => first.focus({ preventScroll: true }), 30);
    return this.panel;
  }

  closePanel({ silent = false, keepFocus = false } = {}) {
    const p = this.panel;
    if (!p) return;
    this.panel = null;
    this.root.classList.remove('has-modal');
    if (!silent) sfx.close();
    const done = () => p.modal.remove();
    if (!silent && !this.reduced) {
      p.panel.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.8)', opacity: 0 }], { duration: 140, easing: 'steps(3, end)', fill: 'forwards' }).finished.then(done, done);
    } else done();
    p.onClose && p.onClose();
    this.onPanelClose && this.onPanelClose(p.id);
    if (!keepFocus && p.returnFocus && document.contains(p.returnFocus)) p.returnFocus.focus({ preventScroll: true });
  }

  fontLabel() {
    return this.root.classList.contains('crisp') ? s('pixelFont') : s('crispFont');
  }

  toggleFont(btn) {
    const on = !this.root.classList.contains('crisp');
    this.root.classList.toggle('crisp', on);
    localStorage.setItem('room.crisp', on ? '1' : '0');
    btn.textContent = this.fontLabel();
  }

  onKey(e) {
    if (e.key === 'Escape') {
      if (this.panel) {
        e.preventDefault();
        this.closePanel();
      } else if (this.bubbles.size) {
        this.closeAllBubbles();
      }
      return;
    }
    if (e.key === 'Tab' && this.panel) {
      const items = [...this.panel.panel.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!this.panel.panel.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // ---------- 提示条 ----------
  toast(text) {
    const t = el('div', { class: 'toast', role: 'status' }, text);
    this.layer.append(t);
    setTimeout(() => t.classList.add('out'), 2200);
    setTimeout(() => t.remove(), 2600);
  }
}
