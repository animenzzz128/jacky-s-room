// 入口：加载 → 搭房间 → 物件热区 → 顶栏 → 深链接 / 嵌入通信。

import { initLang, getLang, setLang, s, t } from './i18n.js';
import { initSound, soundOn, setSound, sfx, startBgm, stopBgm, bgmPlaying } from './sound.js';
import { Room } from './room.js';
import { UI, el } from './ui.js';
import { createPanels } from './panels.js';
import { Memories } from './memories.js';

const root = document.getElementById('app');
const params = new URLSearchParams(location.search);
const embed = params.has('embed');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const loadJSON = (u) => fetch(u).then((r) => {
  if (!r.ok) throw new Error(`${u}: ${r.status}`);
  return r.json();
});
const loadImg = (src) => new Promise((resolve, reject) => {
  const i = new Image();
  i.onload = () => resolve(i);
  i.onerror = () => reject(new Error(src));
  i.src = src;
});

// ---------------- 加载页 ----------------
const loading = root.querySelector('#loading');
const bar = loading.querySelector('.bar span');
const tipEl = loading.querySelector('.loading-tip');
let progress = 0;
const bump = (k) => {
  progress = Math.min(1, progress + k);
  bar.style.width = `${Math.round(progress * 10) * 10}%`; // 分 10 格跳，不做平滑
};

async function boot() {
  initLang();
  initSound();
  if (localStorage.getItem('room.crisp') === '1') root.classList.add('crisp');
  if (embed) root.classList.add('embed');
  loading.querySelector('.loading-text').textContent = s('loading');
  const tips = s('loadingTips');
  let tipI = 0;
  tipEl.textContent = tips[0];
  const tipTimer = setInterval(() => { tipEl.textContent = tips[++tipI % tips.length]; }, 700);

  const track = (p, k) => p.then((v) => { bump(k); return v; });
  const [scene, content, photoData] = await Promise.all([
    track(loadJSON('data/scene.json'), 0.1),
    track(loadJSON('data/content.json'), 0.1),
    track(loadJSON('data/memories.json').catch(() => ({ memories: [] })), 0.1),
    document.fonts ? track(document.fonts.load('12px FusionPixel').catch(() => null), 0.2) : null,
  ]);
  const [bg, openR, closedL] = await Promise.all([
    track(loadImg(scene.background), 0.3),
    track(loadImg(scene.avatar.openR.src), 0.1),
    track(loadImg(scene.avatar.closedL.src), 0.1),
  ]);

  const room = new Room({ root, scene, images: { bg, openR, closedL }, reduced });
  const ui = new UI(root, room, { reduced });
  const layer = root.querySelector('#hotspots');

  // ---------------- 物件热区 ----------------
  const buttons = new Map();
  const hotspotButton = (id) => buttons.get(id);
  const hotspotFor = (panelId) => scene.hotspots.find((h) => h.panel === panelId)?.id;

  let visited = localStorage.getItem('room.visited') === '1';
  const firstInteraction = () => {
    if (visited) return;
    visited = true;
    localStorage.setItem('room.visited', '1');
    room.hintsOn = false;
    room.dirty = true;
  };

  const setUrl = (q) => {
    const url = new URL(location.href);
    url.searchParams.delete('item');
    url.searchParams.delete('memory');
    if (q) Object.entries(q).forEach(([k, v]) => v && url.searchParams.set(k, v));
    history.replaceState(null, '', url);
  };
  const send = (msg) => {
    if (window.parent !== window) window.parent.postMessage({ source: 'pixel-room', ...msg }, '*');
  };

  const memories = new Memories({
    room, ui, scene, layer, reduced, list: photoData.memories,
    onSelect: (m) => {
      firstInteraction();
      setUrl({ memory: m.id });
      send({ type: 'room:open', memory: m.id });
    },
  });

  const panels = createPanels({
    ui, room, content, scene, memories, hotspotButton, hotspotFor, setUrl,
    openHotspot: (id) => openHotspot(id),
    onOpen: (id) => {
      firstInteraction();
      send({ type: 'room:open', item: hotspotFor(id) || id });
    },
    onSoundChange: () => relabel(),
  });
  ui.onPanelClose = () => setUrl(null);

  let lampOn = true;
  let frogCount = 0;
  const introBubble = (kind) => {
    ui.bubble('avatar', {
      anchor: scene.avatar.bubbleAnchor,
      side: 'left',
      text: t(content.bubble[kind]),
      actions: [{ label: `📖 ${s('more')}`, onClick: () => { ui.closeBubble('avatar'); panels.open('about', { returnFocus: buttons.get('avatar') }); } }],
    });
  };

  function openHotspot(id) {
    const h = scene.hotspots.find((x) => x.id === id);
    if (!h) return;
    firstInteraction();
    if (id === 'avatar') {
      room.winkHold = true;
      setTimeout(() => { room.winkHold = false; }, 900);
      introBubble('first');
      return;
    }
    if (h.panel) {
      panels.open(h.panel, { returnFocus: buttons.get(id) });
      return;
    }
    const anchor = h.anchor || { x: h.hitbox.x + h.hitbox.w / 2, y: h.hitbox.y };
    if (h.action === 'lamp') {
      lampOn = !lampOn;
      room.setLamp(lampOn);
      sfx.lamp();
      ui.bubble('lamp', { anchor, text: lampOn ? s('lampOn') : s('lampOff'), small: true, timeout: 1500, typewriter: false });
    } else if (h.action === 'frog') {
      room.jumpFrog();
      sfx.frog();
      frogCount++;
      if (frogCount >= 5) {
        frogCount = 0;
        ui.bubble('frog', { anchor, text: t(content.frogSecret), timeout: 7000 });
      } else {
        ui.bubble('frog', { anchor, text: s('frogSay'), small: true, timeout: 1100, typewriter: false });
      }
    } else if (h.action === 'cat') {
      room.burstHearts();
      sfx.purr();
      ui.bubble('cat', { anchor, text: s('catSay'), small: true, timeout: 1500, typewriter: false });
    } else if (h.action === 'record') {
      // 唱片机：直接开 / 关背景音乐
      if (bgmPlaying()) {
        stopBgm();
        room.bgmOn = false;
      } else {
        if (!soundOn()) setSound(true);
        startBgm();
        room.bgmOn = true;
      }
      relabel();
      ui.bubble('record', { anchor, text: room.bgmOn ? s('recordOn') : s('recordOff'), small: true, timeout: 1600, typewriter: false });
    } else if (h.action === 'clock') {
      const fmt = (tz) => new Intl.DateTimeFormat(getLang() === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false, ...(tz ? { timeZone: tz } : {}) }).format(new Date());
      const tz = content.profile.timezone;
      const text = tz ? s('clockBoth', { you: fmt(), me: fmt(tz) }) : s('clockYou', { you: fmt() });
      ui.bubble('clock', { anchor, text, small: true, timeout: 2600, typewriter: false });
    } else if (h.action === 'album') {
      memories.album();
    }
    send({ type: 'room:open', item: id });
  }

  for (const h of scene.hotspots) {
    const b = el('button', { class: 'hot', type: 'button', 'data-id': h.id, style: `--x:${h.hitbox.x};--y:${h.hitbox.y};--w:${h.hitbox.w};--h:${h.hitbox.h}` });
    const on = () => {
      room.hover = h.hitbox;
      room.dirty = true;
      if (h.id === 'avatar') room.winkHold = true;
      ui.showTooltip(s(`hot_${h.id}`), h.hitbox);
      sfx.hover();
    };
    const off = () => {
      if (room.hover === h.hitbox) room.hover = null;
      room.dirty = true;
      if (h.id === 'avatar') room.winkHold = false;
      ui.hideTooltip();
    };
    b.addEventListener('pointerenter', on);
    b.addEventListener('focus', () => { on(); room.reveal(h.hitbox); });
    b.addEventListener('pointerleave', off);
    b.addEventListener('blur', off);
    b.addEventListener('click', () => {
      sfx.click();
      ui.hideTooltip();
      openHotspot(h.id);
    });
    layer.append(b);
    buttons.set(h.id, b);
  }

  // ---------------- 顶栏 ----------------
  const hud = root.querySelector('#hud');
  const hudBtn = (id) => hud.querySelector(`[data-hud="${id}"]`);
  hudBtn('sound').addEventListener('click', () => {
    setSound(!soundOn());
    if (!soundOn()) room.bgmOn = false;
    else sfx.click();
    relabel();
  });
  hudBtn('lang').addEventListener('click', () => {
    setLang(getLang() === 'zh' ? 'en' : 'zh');
    ui.closePanel({ silent: true });
    ui.closeAllBubbles();
    relabel();
    memories.render();
  });
  hudBtn('list').addEventListener('click', () => panels.open('list', { returnFocus: hudBtn('list') }));
  hudBtn('quick').addEventListener('click', () => panels.open('quick', { returnFocus: hudBtn('quick') }));
  hudBtn('album').addEventListener('click', () => memories.album());

  function relabel() {
    const name = t(content.profile.name);
    const title = getLang() === 'zh' ? `${name} 的像素小屋` : `${name}'s Pixel Room`;
    document.title = title;
    hud.querySelector('.hud-title').textContent = title;
    hudBtn('sound').textContent = soundOn() ? s('hudSoundOn') : s('hudSoundOff');
    hudBtn('sound').setAttribute('aria-pressed', String(soundOn()));
    hudBtn('lang').textContent = s('hudLang');
    hudBtn('lang').setAttribute('aria-label', s('hudLangLabel'));
    hudBtn('list').textContent = s('hudList');
    hudBtn('quick').textContent = s('hudQuick');
    hudBtn('album').textContent = s('hudAlbum');
    layer.setAttribute('aria-label', s('roomLabel'));
    buttons.forEach((b, id) => b.setAttribute('aria-label', s(`hot_${id}`)));
    root.querySelector('#pan-hint').textContent = s('panHint');
  }
  relabel();

  // ---------------- 布局 & 启动 ----------------
  const ro = new ResizeObserver(() => room.layout());
  ro.observe(room.viewport);
  room.layout();
  await memories.init();
  room.hintsOn = !visited;
  room.start();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      room.stop();
      stopBgm();
      room.bgmOn = false;
    } else room.start();
  });

  clearInterval(tipTimer);
  bump(1);
  root.classList.remove('is-loading');
  setTimeout(() => loading.remove(), reduced ? 0 : 400);

  if (room.pan && !sessionStorage.getItem('room.panHint')) {
    sessionStorage.setItem('room.panHint', '1');
    const ph = root.querySelector('#pan-hint');
    ph.hidden = false;
    setTimeout(() => { ph.hidden = true; }, 3200);
  }

  // 深链接：?item=laptop / ?memory=id
  const item = params.get('item');
  const memId = params.get('memory');
  if (item && buttons.has(item)) openHotspot(item);
  else if (item && ['quick', 'list', 'contact'].includes(item)) panels.open(item);
  else if (memId) {
    const m = memories.all().find((x) => x.id === memId);
    if (m) memories.open(m);
  } else {
    setTimeout(() => {
      room.winkHold = true;
      setTimeout(() => { room.winkHold = false; }, 900);
      introBubble(visited ? 'again' : 'first');
    }, reduced ? 0 : 700);
  }

  // 嵌入通信：只接受 scene.json 里 embed.allowedOrigins 列出的来源
  const allowed = new Set([location.origin, ...((scene.embed && scene.embed.allowedOrigins) || [])]);
  window.addEventListener('message', (e) => {
    if (!allowed.has(e.origin) || !e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'room:open' && typeof e.data.item === 'string') openHotspot(e.data.item);
    if (e.data.type === 'room:mute') {
      setSound(false);
      room.bgmOn = false;
      relabel();
    }
  });
  send({ type: 'room:ready' });

  // 调试用
  window.__room = { room, ui, memories, panels, openHotspot };
}

boot().catch((err) => {
  console.error(err);
  const msg = loading.querySelector('.loading-text');
  if (msg) msg.textContent = `加载失败：${err.message}（需要通过本地服务器打开，见 README）`;
});
