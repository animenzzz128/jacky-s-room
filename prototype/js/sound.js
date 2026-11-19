// 音效与背景音乐：全部用 WebAudio 实时合成，不需要音频文件。默认关闭。

let ctx = null;
let master = null;
let noiseBuf = null;
let enabled = false;

export function initSound() {
  enabled = localStorage.getItem('room.sound') === '1';
}

export function soundOn() {
  return enabled;
}

export function setSound(on) {
  enabled = on;
  localStorage.setItem('room.sound', on ? '1' : '0');
  if (on) ensure();
  else stopBgm();
}

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq = 440, to = null, dur = 0.08, type = 'square', vol = 0.05, delay = 0, dest = null }) {
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(dest || master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.1, vol = 0.05, hp = 0, lp = 0, delay = 0, dest = null, am = 0 }) {
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  let node = src;
  if (hp) {
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    node.connect(f);
    node = f;
  }
  if (lp) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lp;
    node.connect(f);
    node = f;
  }
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  if (am) {
    // 振幅调制（猫的呼噜）
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = am;
    lg.gain.value = vol * 0.8;
    lfo.connect(lg);
    lg.connect(g.gain);
    lfo.start(t0);
    lfo.stop(t0 + dur);
  }
  node.connect(g);
  g.connect(dest || master);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + dur + 0.02);
}

const play = (fn) => (...args) => {
  if (enabled) fn(...args);
};

export const sfx = {
  hover: play(() => tone({ freq: 1500, dur: 0.02, vol: 0.012 })),
  click: play(() => tone({ freq: 700, to: 340, dur: 0.07, vol: 0.045 })),
  open: play(() => tone({ freq: 380, to: 920, dur: 0.12, vol: 0.035, type: 'triangle' })),
  close: play(() => tone({ freq: 820, to: 300, dur: 0.1, vol: 0.03, type: 'triangle' })),
  type: play(() => tone({ freq: 880 + Math.random() * 220, dur: 0.018, vol: 0.01 })),
  frog: play(() => {
    tone({ freq: 230, to: 140, dur: 0.11, vol: 0.06 });
    tone({ freq: 270, to: 150, dur: 0.12, vol: 0.05, delay: 0.14 });
  }),
  purr: play(() => noise({ dur: 1.1, vol: 0.09, lp: 260, am: 24 })),
  lamp: play(() => {
    tone({ freq: 2100, dur: 0.014, vol: 0.04 });
    tone({ freq: 1300, dur: 0.02, vol: 0.03, delay: 0.035 });
  }),
  sparkle: play(() => [1200, 1600, 2100].forEach((f, i) => tone({ freq: f, dur: 0.07, vol: 0.025, type: 'triangle', delay: i * 0.07 }))),
};

// ---------------- 背景音乐：Fmaj7 – Em7 – Dm7 – Cmaj7 的 lo-fi 循环 ----------------
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = [
  [53, 57, 60, 64],
  [52, 55, 59, 62],
  [50, 53, 57, 60],
  [48, 52, 55, 59],
];
const BASS = [41, 40, 38, 36];
const PENTA = [72, 74, 76, 79, 81, 84];
const BPM = 74;

let bgm = null;

export function bgmPlaying() {
  return !!bgm;
}

export function startBgm() {
  const c = ensure();
  if (!c || bgm) return;
  const bus = c.createGain();
  bus.gain.value = 0.55;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  bus.connect(lp);
  lp.connect(master);
  const beat = 60 / BPM;
  let step = 0; // 八分音符计数
  let next = c.currentTime + 0.1;

  const keys = (notes, t) => {
    for (const n of notes) {
      for (const det of [-6, 5]) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'triangle';
        o.frequency.value = midi(n);
        o.detune.value = det;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.022, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.006, t + beat * 2.5);
        g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 3.9);
        o.connect(g);
        g.connect(bus);
        o.start(t);
        o.stop(t + beat * 4);
      }
    }
  };

  const schedule = () => {
    while (next < c.currentTime + 0.35) {
      const bar = Math.floor(step / 8) % 4;
      const inBar = step % 8;
      const swing = inBar % 2 === 1 ? beat * 0.12 : 0;
      const t = next + swing;
      const delay = Math.max(0, t - c.currentTime);
      if (inBar === 0) keys(CHORDS[bar], t);
      if (inBar === 0 || inBar === 4) tone({ freq: midi(BASS[bar]), dur: beat * 1.6, vol: 0.07, type: 'sine', delay, dest: bus });
      if (inBar === 0 || inBar === 5) tone({ freq: 110, to: 45, dur: 0.16, vol: 0.09, type: 'sine', delay, dest: bus });
      if (inBar === 2 || inBar === 6) noise({ dur: 0.09, vol: 0.035, hp: 1800, lp: 6000, delay, dest: bus });
      noise({ dur: 0.025, vol: inBar % 2 ? 0.006 : 0.01, hp: 7000, delay, dest: bus });
      if (Math.random() < 0.28) tone({ freq: midi(PENTA[Math.floor(Math.random() * PENTA.length)]), dur: beat * 0.9, vol: 0.012, type: 'sine', delay, dest: bus });
      if (Math.random() < 0.12) noise({ dur: 0.01, vol: 0.02, hp: 3000, delay: delay + Math.random() * beat * 0.5, dest: bus });
      next += beat / 2;
      step++;
    }
  };
  schedule();
  bgm = { timer: setInterval(schedule, 90), bus };
}

export function stopBgm() {
  if (!bgm) return;
  clearInterval(bgm.timer);
  const b = bgm.bus;
  if (ctx) b.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
  setTimeout(() => b.disconnect(), 800);
  bgm = null;
}
