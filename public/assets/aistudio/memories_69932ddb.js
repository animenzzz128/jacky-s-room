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
        m.sprite = makePolaroid(m.img);
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
    const photo = el('img', { class: 'photo', src: m.photoURL, alt: t(m.title) });
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
    let file = null;
    let img = null;
    const preview = el('canvas', { class: 'sprite-preview', width: 12, height: 14, 'aria-label': s('up_preview'), role: 'img' });
    const thumb = el('img', { class: 'thumb', alt: '', hidden: true });
    const input = el('input', { type: 'file', accept: 'image/*', id: 'up-file', class: 'sr-only' });
    const err = el('p', { class: 'error', role: 'alert' });
    const field = (key, node) => el('label', { class: 'field' }, el('span', {}, s(key)), node);
    const title = el('input', { type: 'text', maxlength: 40, required: true });
    const date = el('input', { type: 'month' });
    const place = el('input', { type: 'text', maxlength: 40 });
    const story = el('textarea', { rows: 4, maxlength: 600 });
    const tags = el('input', { type: 'text', maxlength: 60 });

    input.addEventListener('change', async () => {
      file = input.files && input.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      try {
        img = await loadImage(url);
        const sp = makePolaroid(img);
        preview.getContext('2d').clearRect(0, 0, 12, 14);
        preview.getContext('2d').drawImage(sp, 0, 0);
        thumb.src = url;
        thumb.hidden = false;
        if (!title.value) title.value = file.name.replace(/\.[^.]+$/, '').slice(0, 40);
        sfx.sparkle();
        err.textContent = '';
      } catch {
        err.textContent = s('up_needPhoto');
      }
    });

    const form = el('form', { class: 'upload', novalidate: true },
      el('div', { class: 'upload-top' },
        el('label', { class: 'drop', for: 'up-file' }, input, el('span', { class: 'px-btn' }, s('up_photo')), thumb),
        el('div', { class: 'preview-box' }, preview, el('span', { class: 'muted small' }, s('up_preview'))),
      ),
      field('up_title', title),
      el('div', { class: 'row two' }, field('up_date', date), field('up_place', place)),
      field('up_story', story),
      field('up_tags', tags),
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
