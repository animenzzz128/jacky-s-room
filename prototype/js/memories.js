// 记忆物件：上传照片 → 生成「像素拍立得」摆件 → 放进房间空槽位 → 点击后飞出、翻转、像素显影。
// 原型阶段数据存在浏览器 IndexedDB（只在本机），正式版换成后端存储。

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

// ---------------- AI 摆件：Gemini 返回的像素网格 → 12×14 精灵 ----------------
const AI_W = 12;
const AI_H = 14;
const FIXED = {
  O: [0x1c, 0x12, 0x15], W: [0xf8, 0xf0, 0xe6], G: [0xfb, 0xcd, 0xa6], M: [0x58, 0x2f, 0x44], D: [0x3d, 0x20, 0x2e],
};

/** 把模型给的网格整理成 12×14：去掉四周透明边，超出就居中裁切，不够就居中补透明 */
export function normalizeGrid(grid) {
  if (!Array.isArray(grid)) return null;
  let rows = grid.filter((r) => typeof r === 'string').map((r) => r.replace(/[^.OWGMDPSA]/g, '.'));
  if (!rows.length) return null;
  const width = Math.max(...rows.map((r) => r.length));
  rows = rows.map((r) => r.padEnd(width, '.'));
  const filled = (r) => /[^.]/.test(r);
  while (rows.length && !filled(rows[0])) rows.shift();
  while (rows.length && !filled(rows[rows.length - 1])) rows.pop();
  if (!rows.length) return null;
  let left = Math.min(...rows.map((r) => (r.search(/[^.]/) < 0 ? width : r.search(/[^.]/))));
  let right = Math.max(...rows.map((r) => r.length - 1 - [...r].reverse().join('').search(/[^.]/)));
  rows = rows.map((r) => r.slice(left, right + 1));
  const w = rows[0].length;
  if (w > AI_W) rows = rows.map((r) => r.slice(Math.floor((w - AI_W) / 2), Math.floor((w - AI_W) / 2) + AI_W));
  if (rows.length > AI_H) rows = rows.slice(rows.length - AI_H); // 保留底部（物件立在台面上）
  const padL = Math.floor((AI_W - rows[0].length) / 2);
  rows = rows.map((r) => ('.'.repeat(padL) + r).padEnd(AI_W, '.'));
  while (rows.length < AI_H) rows.unshift('.'.repeat(AI_W)); // 不够高就从上面补，底部贴地
  const ink = rows.join('').replace(/\./g, '').length;
  return ink >= 18 ? rows : null; // 太空的结果当作失败
}

/** 网格 + 照片主色 → 画布。P/S/A 三个照片色先加暖再对齐到「主调色板 + 照片补充色」 */
export function makeAISprite(grid, keyColors = []) {
  const rows = normalizeGrid(grid);
  if (!rows) return null;
  const photo = ['P', 'S', 'A'].reduce((acc, k, i) => {
    const h = (keyColors[i] || '#a45939').replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) || 0;
    const g = parseInt(h.slice(2, 4), 16) || 0;
    const b = parseInt(h.slice(4, 6), 16) || 0;
    acc[k] = nearest(Math.min(255, r * 1.03 + 4), g, b * 0.94);
    return acc;
  }, {});
  const colors = { ...FIXED, ...photo };
  const c = document.createElement('canvas');
  c.width = AI_W;
  c.height = AI_H;
  const x = c.getContext('2d');
  rows.forEach((row, yy) => [...row].forEach((ch, xx) => {
    const col = colors[ch];
    if (!col) return;
    x.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
    x.fillRect(xx, yy, 1, 1);
  }));
  return c;
}

/** 调用后端 /api/analyze-photo（AI Studio 版 server.ts）。照片先压到 768px 以内。 */
async function analyzePhoto(endpoint, img, hints) {
  const scale = Math.min(1, 768 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const imageBase64 = c.toDataURL('image/jpeg', 0.82).split(',')[1];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg', ...hints }),
      signal: ctrl.signal,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------- IndexedDB ----------------
function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('no indexedDB'));
    const r = indexedDB.open('pixel-room', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('memories', { keyPath: 'id' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function store(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('memories', mode);
    const req = fn(tx.objectStore('memories'));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
  });
}

// ---------------- 主类 ----------------
export class Memories {
  constructor({ room, ui, scene, content, layer, reduced, onSelect }) {
    this.room = room;
    this.ui = ui;
    this.scene = scene;
    this.content = content;
    this.layer = layer;
    this.reduced = reduced;
    this.onSelect = onSelect;
    this.items = [];
    this.buttons = new Map();
    this.db = null;
    this.mem = []; // IndexedDB 不可用时的内存备份
    this.seen = new Set(JSON.parse(localStorage.getItem('room.seenMemories') || '[]'));
  }

  async init() {
    try {
      this.db = await openDB();
    } catch {
      this.db = null;
    }
    await this.load();
    this.render();
  }

  all() {
    return this.items;
  }

  async uploads() {
    if (!this.db) return this.mem;
    return (await store(this.db, 'readonly', (st) => st.getAll())) || [];
  }

  async putUpload(rec) {
    if (!this.db) {
      this.mem = this.mem.filter((m) => m.id !== rec.id).concat(rec);
      return;
    }
    await store(this.db, 'readwrite', (st) => st.put(rec));
  }

  async deleteUpload(id) {
    if (!this.db) {
      this.mem = this.mem.filter((m) => m.id !== id);
      return;
    }
    await store(this.db, 'readwrite', (st) => st.delete(id));
  }

  async load() {
    this.items.forEach((m) => m.objectURL && URL.revokeObjectURL(m.objectURL));
    const hidden = JSON.parse(localStorage.getItem('room.hiddenSeeds') || '[]');
    const seeds = (this.content.seedMemories || [])
      .filter((m) => !hidden.includes(m.id))
      .map((m) => ({ ...m, seed: true, photoURL: m.photo }));
    const ups = (await this.uploads())
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      .map((r) => {
        const url = URL.createObjectURL(r.photo);
        return { ...r, seed: false, photoURL: url, objectURL: url };
      });
    const items = [...seeds, ...ups];
    await Promise.all(items.map(async (m) => {
      try {
        m.img = await loadImage(m.photoURL);
        // 选了 AI 摆件就按保存的网格重画；网格无效时退回拍立得
        m.sprite = (m.spriteKind === 'ai' && m.ai && makeAISprite(m.ai.grid, m.ai.colors)) || makePolaroid(m.img);
      } catch {
        m.img = null;
        m.sprite = null;
      }
    }));
    // 槽位：保留合法且不冲突的，其余进相册
    const used = new Set();
    for (const m of items) {
      const slot = this.scene.slots.find((sl) => sl.id === m.slotId);
      if (slot && !used.has(slot.id) && m.sprite) {
        m.slot = slot;
        used.add(slot.id);
      } else {
        m.slot = null;
      }
    }
    this.items = items;
  }

  freeSlot() {
    const used = new Set(this.items.filter((m) => m.slot).map((m) => m.slot.id));
    return this.scene.slots.find((sl) => !used.has(sl.id)) || null;
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
    const photo = el('img', { class: 'photo', src: m.photoURL, alt: t((m.ai && m.ai.alt) || m.title) });
    const wrap = el('div', { class: 'photo-wrap' }, photo, canvas);
    const story = el('p', { class: 'story' });
    const meta = [m.date, t(m.place)].filter(Boolean).join(' · ');
    const tags = (m.tags || []).filter(Boolean);
    const actions = el('div', { class: 'row wrap mem-actions' });
    if (!m.seed) {
      actions.append(el('button', { class: 'px-btn small ghost', type: 'button', onclick: () => this.toggleRoom(m) }, m.slot ? s('memHide') : s('up_save')));
    }
    actions.append(el('button', { class: 'px-btn small danger', type: 'button', onclick: () => this.remove(m) }, s('memDelete')));

    const body = el('div', { class: 'mem-card' },
      el('figure', { class: 'polaroid' }, wrap, el('figcaption', {}, t(m.title))),
      el('div', { class: 'mem-text' },
        el('h3', { class: 'big' }, t(m.title)),
        meta ? el('p', { class: 'muted' }, meta) : null,
        story,
        tags.length ? el('ul', { class: 'chips' }, tags.map((x) => el('li', {}, `#${x}`))) : null,
        actions,
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

  async toggleRoom(m) {
    const rec = (await this.uploads()).find((r) => r.id === m.id);
    if (!rec) return;
    if (m.slot) rec.slotId = null;
    else {
      const free = this.freeSlot();
      if (!free) {
        this.ui.toast(s('memFull'));
        return;
      }
      rec.slotId = free.id;
    }
    await this.putUpload(rec);
    this.ui.closePanel();
    await this.load();
    this.render();
  }

  async remove(m) {
    if (!window.confirm(s('memDeleteConfirm'))) return;
    if (m.seed) {
      const hidden = JSON.parse(localStorage.getItem('room.hiddenSeeds') || '[]');
      localStorage.setItem('room.hiddenSeeds', JSON.stringify([...new Set([...hidden, m.id])]));
    } else {
      await this.deleteUpload(m.id);
    }
    this.ui.closePanel();
    await this.load();
    this.render();
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
      body: el('div', {}, grid, el('div', { class: 'row' }, el('button', { class: 'px-btn', type: 'button', onclick: () => this.uploadPanel() }, s('hudUpload')))),
      wide: true,
    });
  }

  // ---------------- 上传 ----------------
  uploadPanel() {
    let img = null;
    let kind = 'polaroid';
    let aiResult = null;
    let autoTitle = '';
    const aiCfg = this.scene.ai || {};
    const aiEndpoint = aiCfg.enabled === false ? '' : aiCfg.endpoint || '/api/analyze-photo';

    const thumb = el('img', { class: 'thumb', alt: '', hidden: true });
    const input = el('input', { type: 'file', accept: 'image/*', id: 'up-file', class: 'sr-only' });
    const err = el('p', { class: 'error', role: 'alert' });
    const field = (key, node) => el('label', { class: 'field' }, el('span', {}, s(key)), node);
    const title = el('input', { type: 'text', maxlength: 40, required: true });
    const date = el('input', { type: 'month' });
    const place = el('input', { type: 'text', maxlength: 40 });
    const story = el('textarea', { rows: 4, maxlength: 600 });
    const tags = el('input', { type: 'text', maxlength: 60 });

    // 两种摆件：像素拍立得（本地生成）/ AI 摆件（Gemini）
    const pv = () => el('canvas', { class: 'sprite-preview', width: 12, height: 14, 'aria-hidden': 'true' });
    const pvPolaroid = pv();
    const pvAI = pv();
    const rPolaroid = el('input', { type: 'radio', name: 'kind', value: 'polaroid', checked: true });
    const rAI = el('input', { type: 'radio', name: 'kind', value: 'ai', disabled: true });
    const aiStatus = el('span', { class: 'muted small ai-status', 'aria-live': 'polite' }, aiEndpoint ? s('up_ai_idle') : s('up_ai_off'));
    const aiBtn = el('button', { class: 'px-btn small', type: 'button', disabled: true }, '✨ ' + s('up_ai_make'));
    const consent = el('input', { type: 'checkbox' });
    const consentRow = el('label', { class: 'consent', hidden: true }, consent, el('span', {}, s('up_people')));
    const choiceP = el('label', { class: 'choice on' }, rPolaroid, pvPolaroid, el('span', {}, s('up_kind_polaroid')));
    const choiceA = el('label', { class: 'choice disabled' }, rAI, pvAI, el('span', {}, s('up_kind_ai')));
    const pick = (k) => {
      kind = k;
      choiceP.classList.toggle('on', k === 'polaroid');
      choiceA.classList.toggle('on', k === 'ai');
      (k === 'ai' ? rAI : rPolaroid).checked = true;
    };
    rPolaroid.addEventListener('change', () => pick('polaroid'));
    rAI.addEventListener('change', () => pick('ai'));
    const draw = (canvas, sprite) => {
      const g = canvas.getContext('2d');
      g.clearRect(0, 0, 12, 14);
      if (sprite) g.drawImage(sprite, 0, 0);
    };

    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      try {
        img = await loadImage(url);
        draw(pvPolaroid, makePolaroid(img));
        draw(pvAI, null);
        aiResult = null;
        rAI.disabled = true;
        choiceA.classList.add('disabled');
        consentRow.hidden = true;
        pick('polaroid');
        thumb.src = url;
        thumb.hidden = false;
        if (!title.value || title.value === autoTitle) {
          autoTitle = file.name.replace(/\.[^.]+$/, '').slice(0, 40);
          title.value = autoTitle;
        }
        aiBtn.disabled = !aiEndpoint;
        aiStatus.textContent = aiEndpoint ? s('up_ai_idle') : s('up_ai_off');
        sfx.sparkle();
        err.textContent = '';
      } catch {
        err.textContent = s('up_needPhoto');
      }
    });

    aiBtn.addEventListener('click', async () => {
      if (!img) return;
      aiBtn.disabled = true;
      aiStatus.textContent = s('up_ai_loading');
      choiceA.classList.add('loading');
      try {
        const res = await analyzePhoto(aiEndpoint, img, { title: title.value, story: story.value, place: place.value });
        const sprite = makeAISprite(res.custom_pixel_grid, res.key_colors);
        if (!sprite) throw new Error(s('up_ai_bad'));
        aiResult = res;
        draw(pvAI, sprite);
        rAI.disabled = false;
        choiceA.classList.remove('disabled');
        pick('ai');
        aiStatus.textContent = s('up_ai_done', { motif: res.motif || res.archetype || '' });
        if (!title.value || title.value === autoTitle) {
          title.value = t(res.suggested_title).slice(0, 40);
          autoTitle = title.value;
        }
        if (!story.value.trim() && res.suggested_story) story.value = t(res.suggested_story);
        consentRow.hidden = !res.has_people;
        sfx.sparkle();
      } catch (e2) {
        const msg = String((e2 && e2.message) || e2);
        const reason = /GEMINI_API_KEY/.test(msg) ? s('up_ai_nokey')
          : /HTTP 404|HTTP 405|HTTP 501|Failed to fetch|NetworkError|Unexpected token/.test(msg) ? s('up_ai_static')
            : msg.slice(0, 80);
        aiStatus.textContent = s('up_ai_failed', { reason });
      } finally {
        choiceA.classList.remove('loading');
        aiBtn.disabled = !aiEndpoint;
      }
    });

    const form = el('form', { class: 'upload', novalidate: true },
      el('div', { class: 'upload-top' },
        el('label', { class: 'drop', for: 'up-file' }, input, el('span', { class: 'px-btn' }, s('up_photo')), thumb),
      ),
      el('fieldset', { class: 'kinds' },
        el('legend', {}, s('up_preview')),
        el('div', { class: 'choices' }, choiceP, choiceA),
        el('div', { class: 'ai-row' }, aiBtn, aiStatus),
        aiEndpoint ? el('p', { class: 'muted small' }, s('up_ai_note')) : null,
      ),
      field('up_title', title),
      el('div', { class: 'row two' }, field('up_date', date), field('up_place', place)),
      field('up_story', story),
      field('up_tags', tags),
      consentRow,
      err,
      el('p', { class: 'muted small' }, s('memNote')),
      el('div', { class: 'row end' },
        el('button', { class: 'px-btn ghost', type: 'button', onclick: () => this.ui.closePanel() }, s('up_cancel')),
        el('button', { class: 'px-btn', type: 'submit' }, s('up_save')),
      ),
    );

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!img) {
        err.textContent = s('up_needPhoto');
        return;
      }
      if (!title.value.trim()) {
        err.textContent = s('up_needTitle');
        title.focus();
        return;
      }
      if (aiResult && aiResult.has_people && !consent.checked) {
        err.textContent = s('up_people_need');
        consent.focus();
        return;
      }
      // 重新编码：去掉 EXIF（包括 GPS 定位），并压到 1600px 以内
      const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
      const free = this.freeSlot();
      const rec = {
        id: `m-${Date.now().toString(36)}`,
        title: title.value.trim(),
        date: date.value || '',
        place: place.value.trim(),
        story: story.value.trim(),
        tags: tags.value.split(/[,，]/).map((x) => x.trim()).filter(Boolean),
        photo: blob,
        slotId: free ? free.id : null,
        createdAt: Date.now(),
        spriteKind: kind,
        ai: aiResult ? {
          grid: aiResult.custom_pixel_grid,
          colors: aiResult.key_colors,
          archetype: aiResult.archetype,
          motif: aiResult.motif,
          alt: aiResult.alt_text,
        } : null,
      };
      await this.putUpload(rec);
      this.ui.closePanel({ keepFocus: true });
      await this.load();
      this.render();
      sfx.sparkle();
      this.ui.toast(free ? s('memSaved') : s('memFull'));
      if (free) {
        this.room.reveal({ x: free.x, y: free.y, w: 12, h: 14 });
        this.room.winkHold = true;
        setTimeout(() => { this.room.winkHold = false; }, 900);
        setTimeout(() => this.buttons.get(rec.id)?.focus({ preventScroll: true }), 50);
      }
    });

    this.room.emptySlotsOn = true;
    this.room.dirty = true;
    const p = this.ui.openPanel({ id: 'upload', title: s('p_upload'), body: form, wide: true });
    p.onClose = () => {
      this.room.emptySlotsOn = false;
      this.room.dirty = true;
    };
  }
}
