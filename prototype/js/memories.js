// 照片摆件：data/memories.json → 房间槽位里的像素摆件 → 点击后飞出、翻转、像素显影。
// 摆件由聊天工作流生成（tools/add_memory.py，见 .claude/skills/add-memory），网站本身没有上传功能。

import { s, t } from './i18n.js';
import { el, typewrite } from './ui.js';
import { sfx } from './sound.js';

const rgb = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];

// 主调色板（设计稿第 3.3 节）
const DUSK = [
  '1c1215', '2c161a', '3d202e', '4b243b', '582f44', '702f53', 'a62b66', '95424a', 'ea6949', 'f5994a', 'fdb644',
  'fbcda6', 'f8f0e6', 'fcb989', 'd48a59', 'f8a078', 'a45939', '6b3a35', 'a89060', '846030', 'ccb49c',
].map(rgb);

// 照片补充色（设计稿第 3.3 节「照片摆件补充色」）：低饱和、略偏暖的蓝和绿，
// 让蓝天、大海、树木在小拍立得里还能认出来，但不会跳出黄昏色调。只用于照片摆件。
const PHOTO_ACCENTS = ['2f3b57', '4b5f86', '7f97b8', 'b4c3d6', '3d6466', '6c8f86', '4a5e3a', '7d9460'].map(rgb);

const PHOTO_PALETTE = [...DUSK, ...PHOTO_ACCENTS];

function nearest(r, g, b, palette = PHOTO_PALETTE) {
  let best = palette[0];
  let bd = Infinity;
  for (const p of palette) {
    // 加权距离，更接近人眼感受
    const dr = r - p[0];
    const dg = g - p[1];
    const db = b - p[2];
    const d = 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

/**
 * 照片 → 12×14 的像素拍立得（照片区域 8×7）。
 * 先轻轻加一层暖色（黄昏感），再对齐到「主调色板 + 照片补充色」。
 * keepColor = false 时只用主调色板（完全统一成黄昏色）。
 */
export function makePolaroid(img, { keepColor = true } = {}) {
  const palette = keepColor ? PHOTO_PALETTE : DUSK;
  const PW = 8;
  const PH = 7;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  let sx = 0;
  let sy = 0;
  let sw = iw;
  let sh = ih;
  if (iw / ih > PW / PH) {
    sw = ih * (PW / PH);
    sx = (iw - sw) / 2;
  } else {
    sh = iw / (PW / PH);
    sy = (ih - sh) / 2;
  }
  const mid = document.createElement('canvas');
  mid.width = PW * 8;
  mid.height = PH * 8;
  const m = mid.getContext('2d');
  m.imageSmoothingQuality = 'high';
  m.drawImage(img, sx, sy, sw, sh, 0, 0, mid.width, mid.height);
  const d = m.getImageData(0, 0, mid.width, mid.height).data;

  const c = document.createElement('canvas');
  c.width = 12;
  c.height = 14;
  const x = c.getContext('2d');
  x.fillStyle = '#1c1215';
  x.fillRect(0, 0, 12, 14);
  x.fillStyle = '#f8f0e6';
  x.fillRect(1, 1, 10, 12);
  for (let py = 0; py < PH; py++) {
    for (let px = 0; px < PW; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let yy = 0; yy < 8; yy++) {
        for (let xx = 0; xx < 8; xx++) {
          const i = ((py * 8 + yy) * mid.width + (px * 8 + xx)) * 4;
          r += d[i];
          g += d[i + 1];
          b += d[i + 2];
        }
      }
      // 轻微暖调：红 +、蓝 −，让照片融进黄昏房间
      const wr = Math.min(255, (r / 64) * 1.03 + 4);
      const wg = g / 64;
      const wb = (b / 64) * 0.94;
      const [qr, qg, qb] = nearest(wr, wg, wb, palette);
      x.fillStyle = `rgb(${qr},${qg},${qb})`;
      x.fillRect(2 + px, 2 + py, 1, 1);
    }
  }
  x.fillStyle = '#ccb49c'; // 底部「手写字」
  x.fillRect(3, 11, 5, 1);
  return c;
}

const loadImage = (src) => new Promise((resolve, reject) => {
  const i = new Image();
  i.onload = () => resolve(i);
  i.onerror = reject;
  i.src = src;
});

/** 图片 → 画布（房间和飞出动画都按画布处理） */
function toCanvas(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  return c;
}

// ---------------- 主类 ----------------
export class Memories {
  constructor({ room, ui, scene, list, layer, reduced, onSelect }) {
    this.room = room;
    this.ui = ui;
    this.scene = scene;
    this.list = list || [];
    this.layer = layer;
    this.reduced = reduced;
    this.onSelect = onSelect;
    this.items = [];
    this.buttons = new Map();
    this.seen = new Set(JSON.parse(localStorage.getItem('room.seenMemories') || '[]'));
  }

  async init() {
    await this.load();
    this.render();
  }

  all() {
    return this.items;
  }

  async load() {
    // sprite = 画好的 12×14 摆件 PNG；没有就用照片现做一张像素拍立得
    const items = this.list.map(({ sprite, slot, ...m }) => ({ ...m, spriteSrc: sprite, slotId: slot }));
    await Promise.all(items.map(async (m) => {
      try {
        m.sprite = m.spriteSrc ? toCanvas(await loadImage(m.spriteSrc)) : makePolaroid(await loadImage(m.photo));
      } catch {
        m.sprite = null;
        console.warn(`照片摆件 ${m.id} 的图片加载失败`);
      }
    }));
    // 槽位：保留合法且不冲突的，其余只在相册里
    const used = new Set();
    for (const m of items) {
      const slot = this.scene.slots.find((sl) => sl.id === m.slotId);
      if (slot && !used.has(slot.id) && m.sprite) {
        m.slot = slot;
        used.add(slot.id);
      } else {
        if (m.slotId && slot && used.has(slot.id)) console.warn(`槽位 ${slot.id} 已被占用，${m.id} 只放进相册`);
        m.slot = null;
      }
    }
    this.items = items;
  }

  render() {
    this.room.memories = this.items
      .filter((m) => m.slot)
      .map((m) => ({ id: m.id, slot: m.slot, sprite: m.sprite, isNew: !this.seen.has(m.id) }));
    this.room.dirty = true;

    this.buttons.forEach((b) => b.remove());
    this.buttons.clear();
    for (const m of this.items) {
      if (!m.slot) continue;
      const box = { x: m.slot.x - 1, y: m.slot.y - 2, w: 14, h: 17 };
      const label = `${s('memory')}：${t(m.title)}`;
      const b = el('button', {
        class: 'hot mem',
        type: 'button',
        'aria-label': label,
        style: `--x:${box.x};--y:${box.y};--w:${box.w};--h:${box.h}`,
      });
      const tip = `📷 ${t(m.title)}${m.date ? ' · ' + m.date : ''}`;
      const on = () => {
        this.room.hover = { x: m.slot.x, y: m.slot.y, w: 12, h: 14 };
        this.room.dirty = true;
        this.ui.showTooltip(tip, box);
        sfx.hover();
      };
      const off = () => {
        this.room.hover = null;
        this.room.dirty = true;
        this.ui.hideTooltip();
      };
      b.addEventListener('pointerenter', on);
      b.addEventListener('focus', on);
      b.addEventListener('pointerleave', off);
      b.addEventListener('blur', off);
      b.addEventListener('click', () => {
        sfx.click();
        this.open(m, b);
      });
      this.layer.append(b);
      this.buttons.set(m.id, b);
    }
  }

  markSeen(m) {
    if (this.seen.has(m.id)) return;
    this.seen.add(m.id);
    localStorage.setItem('room.seenMemories', JSON.stringify([...this.seen]));
    const rm = this.room.memories.find((x) => x.id === m.id);
    if (rm) rm.isNew = false;
    this.room.dirty = true;
  }

  // ---------------- 打开记忆：飞出 → 翻转 → 卡片 ----------------
  async open(m, fromBtn) {
    this.room.hover = null;
    this.ui.hideTooltip();
    this.ui.closeAllBubbles();
    const wasNew = !this.seen.has(m.id);
    this.markSeen(m);
    if (this.ui.panel) this.ui.closePanel({ silent: true, keepFocus: true });
    if (m.slot && !this.reduced) {
      this.room.reveal({ x: m.slot.x, y: m.slot.y, w: 12, h: 14 });
      await this.fly(m);
    }
    this.card(m, fromBtn || this.buttons.get(m.id));
    if (wasNew) {
      this.room.winkHold = true;
      setTimeout(() => { this.room.winkHold = false; }, 900);
    }
    this.onSelect && this.onSelect(m);
  }

  fly(m) {
    const n = this.room.n;
    const p = this.room.toClient(m.slot.x, m.slot.y);
    const w = 12 * n;
    const h = 14 * n;
    const img = el('img', { class: 'fly', src: m.sprite.toDataURL(), alt: '', style: `left:${p.x}px;top:${p.y}px;width:${w}px;height:${h}px` });
    this.ui.layer.append(img);
    const k = Math.max(2, Math.round((window.innerHeight * 0.42) / h));
    const dx = window.innerWidth / 2 - (p.x + w / 2);
    const dy = window.innerHeight / 2 - (p.y + h / 2);
    const end = `translate(${dx}px, ${dy}px) scale(${k})`;
    sfx.open();
    return img
      .animate([{ transform: 'translate(0,0) scale(1)' }, { transform: end }], { duration: 300, easing: 'steps(6, end)', fill: 'forwards' })
      .finished.then(() => img.animate([{ transform: end }, { transform: `translate(${dx}px, ${dy}px) scale(0.05, ${k})` }], { duration: 120, easing: 'steps(3, end)', fill: 'forwards' }).finished)
      .then(() => img.remove(), () => img.remove());
  }

  card(m, returnFocus) {
    const idx = this.items.indexOf(m);
    const canvas = el('canvas', { class: 'reveal', 'aria-hidden': 'true' });
    const photo = el('img', { class: 'photo', src: m.photo, alt: t(m.alt || m.title) });
    const wrap = el('div', { class: 'photo-wrap' }, photo, canvas);
    const story = el('p', { class: 'story' });
    const meta = [m.date, t(m.place)].filter(Boolean).join(' · ');
    const tags = (m.tags || []).filter(Boolean);

    const body = el('div', { class: 'mem-card' },
      el('figure', { class: 'polaroid' }, wrap, el('figcaption', {}, t(m.title))),
      el('div', { class: 'mem-text' },
        el('h3', { class: 'big' }, t(m.title)),
        meta ? el('p', { class: 'muted' }, meta) : null,
        story,
        tags.length ? el('ul', { class: 'chips' }, tags.map((x) => el('li', {}, `#${t(x)}`))) : null,
      ),
    );
    const n = this.items.length;
    const footer = n > 1 ? [
      el('button', { class: 'px-btn small', type: 'button', onclick: () => this.open(this.items[(idx - 1 + n) % n]) }, s('prev')),
      el('span', { class: 'muted' }, `${idx + 1} / ${n}`),
      el('button', { class: 'px-btn small', type: 'button', onclick: () => this.open(this.items[(idx + 1) % n]) }, s('next')),
    ] : null;
    this.ui.openPanel({ id: 'memory', title: `📷 ${s('memory')}`, body, footer, wide: true, anim: 'flip', returnFocus });

    // 像素显影：马赛克 32 → 16 → 8 → 4 → 清晰
    const run = () => {
      const W = wrap.clientWidth;
      const H = wrap.clientHeight;
      if (!W || !H || this.reduced) {
        canvas.remove();
        typewrite(story, t(m.story), { reduced: this.reduced });
        return;
      }
      canvas.width = W;
      canvas.height = H;
      const cx = canvas.getContext('2d');
      const tmp = document.createElement('canvas');
      const steps = [32, 16, 8, 4];
      let i = 0;
      const stepFn = () => {
        if (i >= steps.length) {
          canvas.remove();
          typewrite(story, t(m.story));
          return;
        }
        const b = steps[i++];
        tmp.width = Math.max(1, Math.round(W / b));
        tmp.height = Math.max(1, Math.round(H / b));
        const tx = tmp.getContext('2d');
        tx.imageSmoothingQuality = 'high';
        tx.drawImage(photo, 0, 0, tmp.width, tmp.height);
        cx.imageSmoothingEnabled = false;
        cx.drawImage(tmp, 0, 0, W, H);
        setTimeout(stepFn, 140);
      };
      stepFn();
    };
    if (photo.complete) requestAnimationFrame(run);
    else photo.addEventListener('load', () => requestAnimationFrame(run), { once: true });
  }

  // ---------------- 相册 ----------------
  album() {
    const grid = this.items.length
      ? el('ul', { class: 'album' }, this.items.map((m) => {
        const thumb = el('img', { class: 'sprite', src: m.sprite ? m.sprite.toDataURL() : '', alt: '' });
        return el('li', {}, el('button', { class: 'album-item', type: 'button', onclick: () => this.open(m) },
          thumb,
          el('span', { class: 'album-title' }, t(m.title)),
          el('span', { class: 'muted small' }, m.slot ? s('memInRoom') : s('memInAlbum')),
        ));
      }))
      : el('p', { class: 'muted' }, s('memEmpty'));
    this.ui.openPanel({
      id: 'album',
      title: s('p_album'),
      body: grid,
      wide: true,
    });
  }
}
