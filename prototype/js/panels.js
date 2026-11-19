// 各个物件对应的面板内容。内容全部来自 data/content.json。

import { s, t } from './i18n.js';
import { el } from './ui.js';
import { sfx, soundOn, setSound, startBgm, stopBgm, bgmPlaying } from './sound.js';

// 12×12 像素图标（PixelOS 桌面用）
const ICON_COLORS = { K: '#1c1215', A: '#fdb644', D: '#c27a2c', W: '#f8f0e6', R: '#ea6949', P: '#702f53', G: '#ccb49c', B: '#4b243b' };
const ICONS = {
  exe: ['KKKKKKKKKKKK', 'KRRRRRRRRWRK', 'KKKKKKKKKKKK', 'KWWWWWWWWWWK', 'KWPPPWWWWWWK', 'KWPPPWGGGGWK', 'KWWWWWWWWWWK', 'KWGGGGGGGGWK', 'KWGGGGGGWWWK', 'KWWWWWWWWWWK', 'KKKKKKKKKKKK', '............'],
  folder: ['............', '.KKKK.......', 'KDDDDK......', 'KKKKKKKKKKK.', 'KAAAAAAAAAAK', 'KAAAAAAAAAAK', 'KAAAAAAAAAAK', 'KAAAAAAAAAAK', 'KAAAAAAAAAAK', 'KAAAAAAAAAAK', '.KKKKKKKKKK.', '............'],
  pdf: ['.KKKKKKK....', '.KWWWWWKK...', '.KWWWWWKWK..', '.KWWWWWKKKK.', '.KWGGGGGGWK.', '.KWWWWWWWWK.', '.KWGGGGGGWK.', '.KRRRRRRRRK.', '.KRWRWRRWRK.', '.KRRRRRRRRK.', '.KKKKKKKKKK.', '............'],
  txt: ['.KKKKKKK....', '.KWWWWWKK...', '.KWWWWWKWK..', '.KWWWWWKKKK.', '.KWGGGGGGWK.', '.KWWWWWWWWK.', '.KWGGGGGWWK.', '.KWWWWWWWWK.', '.KWGGGGGGWK.', '.KWWWWWWWWK.', '.KKKKKKKKKK.', '............'],
};

function iconCanvas(name) {
  const rows = ICONS[name];
  const c = el('canvas', { class: 'px-icon', width: 12, height: 12, 'aria-hidden': 'true' });
  const ctx = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ICON_COLORS[ch]) {
      ctx.fillStyle = ICON_COLORS[ch];
      ctx.fillRect(x, y, 1, 1);
    }
  }));
  return c;
}

const chips = (list) => el('ul', { class: 'chips' }, list.map((x) => el('li', {}, x)));

export const PANEL_ORDER = ['about', 'os', 'timeline', 'education', 'awards', 'skills', 'learning', 'goals', 'reading', 'music', 'hobbies', 'places', 'now', 'facts'];

export function createPanels(ctx) {
  const { ui, room, content, memories, hotspotButton, openHotspot } = ctx;
  const c = content;

  const navFooter = (id) => {
    const i = PANEL_ORDER.indexOf(id);
    if (i < 0) return null;
    const prev = PANEL_ORDER[(i - 1 + PANEL_ORDER.length) % PANEL_ORDER.length];
    const next = PANEL_ORDER[(i + 1) % PANEL_ORDER.length];
    return [
      el('button', { class: 'px-btn small', type: 'button', onclick: () => open(prev) }, `${s('prev').replace(/[^←]*$/, '')} ${s('p_' + prev)}`),
      el('button', { class: 'px-btn small', type: 'button', onclick: () => open(next) }, `${s('p_' + next)} ${s('next').replace(/^[^→]*/, '')}`),
    ];
  };

  // ---------------- 关于我 ----------------
  function about() {
    const portrait = room.crop();
    portrait.className = 'portrait';
    portrait.setAttribute('role', 'img');
    portrait.setAttribute('aria-label', t(c.profile.name));
    return el('div', { class: 'about' },
      el('div', { class: 'about-top' },
        el('div', { class: 'portrait-frame' }, portrait),
        el('div', { class: 'about-id' },
          el('h3', { class: 'big' }, t(c.profile.name)),
          el('p', { class: 'tagline' }, t(c.profile.tagline)),
          chips(t(c.profile.tags)),
        ),
      ),
      t(c.profile.intro).map((p) => el('p', {}, p)),
      el('h4', {}, s('nowTitle')),
      el('ul', { class: 'px-list' }, t(c.profile.now).map((x) => el('li', {}, x))),
      el('div', { class: 'row' },
        el('button', { class: 'px-btn', type: 'button', onclick: () => open('contact') }, s('p_contact')),
        el('button', { class: 'px-btn ghost', type: 'button', onclick: () => open('quick') }, s('p_quick')),
      ),
    );
  }

  // ---------------- 笔记本电脑：PixelOS ----------------
  function os() {
    const win = el('div', { class: 'os-window', hidden: true });
    const winTitle = el('span', { class: 'os-title' });
    const winBody = el('div', { class: 'os-body' });
    const backBtn = el('button', { class: 'px-btn small', type: 'button' }, s('back'));
    win.append(el('div', { class: 'os-bar' }, el('span', { class: 'os-dots', 'aria-hidden': 'true' }, el('i'), el('i'), el('i')), winTitle, backBtn), winBody);
    const desktop = el('div', { class: 'os-icons' });
    const hint = el('p', { class: 'os-hint' }, s('os_hint'));
    const wrap = el('div', { class: 'os' }, desktop, win, hint);

    const show = (title, node, onBack) => {
      winTitle.textContent = title;
      winBody.replaceChildren(node);
      win.hidden = false;
      desktop.hidden = true;
      hint.hidden = true;
      backBtn.onclick = onBack || home;
      sfx.open();
      setTimeout(() => backBtn.focus({ preventScroll: true }), 20);
    };
    function home() {
      win.hidden = true;
      desktop.hidden = false;
      hint.hidden = false;
      sfx.close();
      setTimeout(() => desktop.querySelector('button')?.focus({ preventScroll: true }), 20);
    }

    const work = () => el('div', { class: 'stack' }, c.experience.map((e) => el('article', { class: 'card' },
      el('div', { class: 'card-head' }, el('h4', {}, t(e.org)), el('span', { class: 'muted' }, e.period)),
      el('p', { class: 'role' }, t(e.role)),
      el('ul', { class: 'px-list' }, t(e.bullets).map((b) => el('li', {}, b))),
    )));

    const projectDetail = (p) => el('article', { class: 'card' },
      el('h4', { class: 'big' }, t(p.name)),
      el('p', {}, t(p.oneLiner)),
      el('p', {}, el('b', {}, `${s('os_myRole')}：`), t(p.role)),
      chips(p.stack),
      p.link ? el('a', { class: 'px-btn', href: p.link, target: '_blank', rel: 'noopener' }, s('os_open')) : null,
    );
    const projects = () => el('div', { class: 'proj-grid' }, c.projects.map((p) => el('button', {
      class: 'proj', type: 'button',
      onclick: () => show(`${s('os_projects')}/${t(p.name)}`, projectDetail(p), () => show(s('os_projects'), projects())),
    }, iconCanvas('exe'), el('span', { class: 'proj-name' }, t(p.name)), el('span', { class: 'muted' }, t(p.oneLiner)))));

    const apps = [
      { icon: 'exe', label: s('os_work'), run: () => show(s('os_work'), work()) },
      { icon: 'folder', label: s('os_projects'), run: () => show(s('os_projects'), projects()) },
      {
        icon: 'pdf', label: s('os_resume'), run: () => {
          if (c.contact.resume) window.open(c.contact.resume, '_blank', 'noopener');
          else show(s('os_resume'), el('p', {}, s('os_noResume')));
        },
      },
      { icon: 'txt', label: s('os_contact'), run: () => show(s('os_contact'), contactBody()) },
    ];
    apps.forEach((a) => desktop.append(el('button', { class: 'os-app', type: 'button', onclick: a.run }, iconCanvas(a.icon), el('span', {}, a.label))));
    return wrap;
  }

  // ---------------- 书架：经历时间轴（翻书） ----------------
  function timeline() {
    let i = 0;
    const left = el('div', { class: 'page left' });
    const right = el('div', { class: 'page right' });
    const book = el('div', { class: 'book' }, left, el('div', { class: 'spine', 'aria-hidden': 'true' }), right);
    const counter = el('span', { class: 'muted counter', 'aria-live': 'polite' });
    const prev = el('button', { class: 'px-btn small', type: 'button' }, s('prev'));
    const next = el('button', { class: 'px-btn small', type: 'button' }, s('next'));
    const render = () => {
      const e = c.timeline[i];
      left.replaceChildren(el('p', { class: 'period' }, e.period), el('h3', { class: 'big' }, t(e.title)));
      right.replaceChildren(el('h4', {}, t(e.org)), el('p', {}, t(e.text)));
      counter.textContent = s('page', { n: i + 1, total: c.timeline.length });
      prev.disabled = i === 0;
      next.disabled = i === c.timeline.length - 1;
    };
    const flip = (d) => {
      const j = i + d;
      if (j < 0 || j >= c.timeline.length) return;
      sfx.click();
      if (ui.reduced) {
        i = j;
        render();
        return;
      }
      book.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0.04)' }, { transform: 'scaleX(1)' }], { duration: 260, easing: 'steps(6, end)' });
      setTimeout(() => { i = j; render(); }, 130);
    };
    prev.onclick = () => flip(-1);
    next.onclick = () => flip(1);
    render();
    return el('div', { class: 'timeline' }, book, el('div', { class: 'row spread' }, prev, counter, next));
  }

  // ---------------- 技能书 ----------------
  function skills() {
    const colors = ['#95424a', '#702f53', '#846030', '#a62b66'];
    return el('div', { class: 'skill-books' }, c.skills.map((g, gi) => el('article', { class: 'skill-book', style: `--book:${colors[gi % colors.length]}` },
      el('h4', {}, t(g.name)),
      el('ul', {}, g.items.map((it) => el('li', {},
        el('span', {}, it.name),
        it.level ? el('span', { class: 'meter', role: 'img', 'aria-label': `${it.level} / 5` }, [1, 2, 3, 4, 5].map((k) => el('i', { class: k <= it.level ? 'on' : '' }))) : null,
      ))),
    )));
  }

  // ---------------- 耳机：最近在听 + 背景音乐 ----------------
  function music() {
    const btn = el('button', { class: 'px-btn', type: 'button' });
    const label = () => { btn.textContent = bgmPlaying() ? s('bgmStop') : s('bgmPlay'); };
    btn.onclick = () => {
      if (bgmPlaying()) {
        stopBgm();
        room.bgmOn = false;
      } else {
        if (!soundOn()) {
          setSound(true);
          ctx.onSoundChange && ctx.onSoundChange();
        }
        startBgm();
        room.bgmOn = true;
      }
      label();
    };
    label();
    return el('div', { class: 'music' },
      el('ol', { class: 'tracks' }, c.music.map((m, i) => el('li', {},
        el('span', { class: 'track-no', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')),
        el('div', {}, el('b', {}, m.song), el('span', { class: 'muted' }, ` — ${m.artist}`), el('p', {}, t(m.note))),
      ))),
      btn,
      el('p', { class: 'muted small' }, s('bgmNote')),
    );
  }

  // ---------------- 窗户：足迹 ----------------
  function places() {
    return el('div', { class: 'postcards' }, c.places.map((p) => el('article', { class: 'postcard' },
      el('span', { class: `stamp ${p.type}` }, s(p.type)),
      el('h4', {}, t(p.name)),
      el('p', {}, t(p.text)),
    )));
  }

  // ---------------- 马克杯：冷知识 ----------------
  function facts() {
    const list = t(c.facts);
    let i = Math.floor(Math.random() * list.length);
    const p = el('p', { class: 'fact', 'aria-live': 'polite' }, list[i]);
    const more = el('button', { class: 'px-btn', type: 'button', onclick: () => {
      let j = i;
      while (list.length > 1 && j === i) j = Math.floor(Math.random() * list.length);
      i = j;
      sfx.click();
      p.textContent = list[i];
      if (!ui.reduced) p.animate([{ transform: 'translateY(4px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 160, easing: 'steps(3, end)' });
    } }, s('anotherFact'));
    return el('div', { class: 'facts' }, el('div', { class: 'fact-card' }, p), more);
  }

  // ---------------- 联系我 ----------------
  function contactBody() {
    const copyBtn = el('button', { class: 'px-btn small', type: 'button', onclick: async () => {
      try {
        await navigator.clipboard.writeText(c.contact.email);
        copyBtn.textContent = s('copied');
        setTimeout(() => { copyBtn.textContent = s('copy'); }, 1500);
      } catch {
        ui.toast(c.contact.email);
      }
    } }, s('copy'));
    return el('div', { class: 'contact' },
      el('div', { class: 'row' }, el('a', { class: 'email', href: `mailto:${c.contact.email}` }, c.contact.email), copyBtn),
      el('div', { class: 'row wrap' }, c.contact.links.map((l) => el('a', { class: 'px-btn ghost', href: l.url, target: '_blank', rel: 'noopener' }, l.label))),
      c.contact.resume ? el('a', { class: 'px-btn', href: c.contact.resume, target: '_blank', rel: 'noopener' }, s('os_resume')) : null,
    );
  }

  // ---------------- 快速浏览（纯文字版） ----------------
  function quick() {
    const sec = (title, ...kids) => el('section', { class: 'q-sec' }, el('h3', {}, title), kids);
    return el('div', { class: 'quick' },
      el('p', { class: 'muted' }, s('q_intro')),
      sec(t(c.profile.name), el('p', { class: 'tagline' }, t(c.profile.tagline)), t(c.profile.intro).map((p) => el('p', {}, p))),
      sec(s('q_experience'), c.experience.map((e) => el('div', { class: 'q-item' },
        el('b', {}, `${t(e.role)} · ${t(e.org)}`), el('span', { class: 'muted' }, `  ${e.period}`),
        el('ul', { class: 'px-list' }, t(e.bullets).map((b) => el('li', {}, b)))))),
      sec(s('q_projects'), c.projects.map((p) => el('div', { class: 'q-item' }, el('b', {}, t(p.name)), el('p', {}, t(p.oneLiner))))),
      sec(s('q_timeline'), c.timeline.map((e) => el('div', { class: 'q-item' }, el('b', {}, `${e.period}  ${t(e.title)}`), el('p', {}, `${t(e.org)} — ${t(e.text)}`)))),
      sec(s('q_skills'), c.skills.map((g) => el('p', {}, el('b', {}, `${t(g.name)}：`), g.items.map((i) => i.name).join(' / ')))),
      sectionIds.map((sid) => {
        const data = c.sections && c.sections[sid];
        if (!data || !data.items.length) return null;
        return sec(s(`p_${sid}`), el('ul', { class: 'px-list' }, data.items.map((it) => el('li', {}, [t(it.title), it.meta ? ` · ${t(it.meta)}` : '', it.text ? ` — ${t(it.text)}` : ''].join('')))));
      }),
      sec(s('q_memories'), memories.all().length ? el('ul', { class: 'px-list' }, memories.all().map((m) => el('li', {}, `${t(m.title)} · ${m.date || ''}`))) : el('p', { class: 'muted' }, s('memEmpty'))),
      sec(s('p_contact'), contactBody()),
    );
  }

  // ---------------- 物件清单 ----------------
  function list() {
    const go = (fn) => () => { ui.closePanel({ silent: true, keepFocus: true }); fn(); };
    return el('div', { class: 'item-list' },
      el('ul', { class: 'list-grid' }, ctx.scene.hotspots.map((h) => el('li', {}, el('button', {
        class: 'px-btn ghost block', type: 'button',
        onclick: go(() => { room.reveal(h.hitbox); hotspotButton(h.id)?.focus({ preventScroll: true }); openHotspot(h.id); }),
      }, s('hot_' + h.id))))),
      el('h4', {}, s('p_album')),
      memories.all().length
        ? el('ul', { class: 'list-grid' }, memories.all().map((m) => el('li', {}, el('button', { class: 'px-btn ghost block', type: 'button', onclick: go(() => memories.open(m)) }, `📷 ${t(m.title)}`))))
        : el('p', { class: 'muted' }, s('memEmpty')),
    );
  }

  // ---------------- 通用卡片面板（书单、目标、荣誉、教育、此刻、在学、爱好） ----------------
  // 内容在 content.json 的 sections.<id>.items：{ title, meta, text, done, progress }
  function cards(id) {
    const sec = (c.sections && c.sections[id]) || { items: [] };
    const intro = sec.intro ? el('p', { class: 'muted' }, t(sec.intro)) : null;
    return el('div', { class: `cards cards-${id}` }, intro, el('ul', { class: 'card-list' }, sec.items.map((it) => el('li', { class: `card${it.done ? ' done' : ''}` },
      el('div', { class: 'card-head' },
        el('h4', {}, it.done !== undefined ? el('span', { class: 'check', 'aria-hidden': 'true' }, it.done ? '☑ ' : '☐ ') : null, t(it.title)),
        it.meta ? el('span', { class: 'muted' }, t(it.meta)) : null,
      ),
      it.text ? el('p', {}, t(it.text)) : null,
      it.progress ? el('span', { class: 'meter', role: 'img', 'aria-label': `${it.progress} / 5` }, [1, 2, 3, 4, 5].map((k) => el('i', { class: k <= it.progress ? 'on' : '' }))) : null,
    ))));
  }
  const sectionIds = ['reading', 'goals', 'awards', 'education', 'now', 'learning', 'hobbies'];

  const builders = { about, os, timeline, skills, music, places, facts, contact: contactBody, quick, list };
  sectionIds.forEach((sid) => { builders[sid] = () => cards(sid); });

  function open(id, { returnFocus } = {}) {
    const build = builders[id];
    if (!build) return;
    ctx.onOpen && ctx.onOpen(id);
    ui.openPanel({
      id,
      title: s('p_' + id),
      body: build(),
      footer: navFooter(id),
      wide: ['os', 'timeline', 'quick', 'skills'].includes(id),
      returnFocus: returnFocus || hotspotButton(ctx.hotspotFor(id)) || document.activeElement,
    });
    ctx.setUrl && ctx.setUrl({ item: ctx.hotspotFor(id) || id });
  }

  return { open };
}
