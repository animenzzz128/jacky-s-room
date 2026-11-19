// 房间场景：整数倍缩放 + 一张 240×135 的画布。所有画面（背景、眼睛、粒子、灯光、摆件、选择框）
// 都画在这张逻辑分辨率的画布上，再用 CSS 最近邻放大，所以永远是对齐网格的硬边像素。

const TICK = 1000 / 12; // 环境动画按 12fps 走，保持逐帧感
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const INK = '#1c1215';
const AMBER = '#fdb644';
const CORAL = '#ea6949';

// 小像素图案（X = 填色）
const PAT = {
  note: ['.X..', '.XX.', '.X.X', 'XX..', 'XX..'],
  heart: ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'],
  arrow: ['XXXXX', '.XXX.', '..X..'],
  spark: [
    ['.....', '.....', '..X..', '.....', '.....'],
    ['.....', '..X..', '.XXX.', '..X..', '.....'],
    ['..X..', '..X..', 'XXXXX', '..X..', '..X..'],
    ['.....', '..X..', '.XXX.', '..X..', '.....'],
  ],
};

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const rand = (a, b) => a + Math.random() * (b - a);

export class Room {
  constructor({ root, scene, images, reduced }) {
    this.root = root;
    this.scene = scene;
    this.W = scene.width;
    this.H = scene.height;
    this.img = images;
    this.reduced = reduced;

    this.viewport = root.querySelector('#viewport');
    this.stageEl = root.querySelector('#stage');
    this.canvas = root.querySelector('#scene');
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.n = 1;
    this.listeners = [];

    // 状态
    this.hover = null; // 当前高亮的矩形 {x,y,w,h}
    this.hintsOn = false;
    this.memories = []; // [{slot, sprite(canvas), isNew}]
    this.lampTarget = true;
    this.lampStep = 0; // 0 = 开灯，4 = 完全关灯
    this.eyes = 'open';
    this.eyesUntil = 0;
    this.nextBlink = performance.now() + 2200;
    this.winkHold = false;
    this.bgmOn = false;
    this.particles = [];
    this.twinkles = [];
    this.frogJump = -1;
    this.tickN = 0;
    this.last = 0;
    this.dirty = true;
    this.running = false;

    this.prepare();
    this.frame = this.frame.bind(this);
  }

  // ---------- 预处理：从背景图里取数据 ----------
  prepare() {
    const { W, H, scene } = this;
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const octx = off.getContext('2d');
    octx.drawImage(this.img.bg, 0, 0);
    const data = octx.getImageData(0, 0, W, H).data;
    const px = (x, y) => {
      const i = (y * W + x) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    };

    // 城市楼体上可以亮灯的像素：楼体颜色（偏暗）且四周也是楼体
    const c = scene.fx.city;
    const isBody = (x, y) => {
      const [r, g, b] = px(x, y);
      const l = lum(r, g, b);
      return l > 22 && l < 70 && b >= g;
    };
    this.cityCandidates = [];
    for (let y = c.y + 1; y < c.y + c.h - 1; y++) {
      for (let x = c.x + 1; x < c.x + c.w - 1; x++) {
        if (isBody(x, y) && isBody(x - 1, y) && isBody(x + 1, y) && isBody(x, y - 1) && isBody(x, y + 1)) {
          this.cityCandidates.push([x, y]);
        }
      }
    }

    // 青蛙：切一块下来，跳起来时用墙面颜色补位
    const f = scene.fx.frog;
    const counts = new Map();
    for (let x = f.x; x < f.x + f.w; x++) {
      const k = px(x, f.y).join(',');
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const wall = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number);
    this.frogWall = `rgb(${wall.join(',')})`;
    this.frogSprite = document.createElement('canvas');
    this.frogSprite.width = f.w;
    this.frogSprite.height = f.h;
    this.frogSprite.getContext('2d').drawImage(off, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);

    // 台灯光晕：阶梯状同心圆（像素风不用平滑渐变）
    const L = scene.fx.lamp;
    this.glow = document.createElement('canvas');
    this.glow.width = W;
    this.glow.height = H;
    const g = this.glow.getContext('2d');
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const d = Math.hypot(x - L.x, (y - L.y) * 1.15);
        let a = 0;
        if (d < L.r * 0.35) a = 0.16;
        else if (d < L.r * 0.65) a = 0.1;
        else if (d < L.r) a = BAYER[y % 4][x % 4] < 8 ? 0.06 : 0.03;
        if (a) {
          g.fillStyle = `rgba(253,182,68,${a})`;
          g.fillRect(x, y, 1, 1);
        }
      }
    }

    // 关灯遮罩：4 级 Bayer 抖动，窗外（天空）保持亮
    const win = scene.fx.window;
    const inSky = (x, y) => {
      if (x < win.x || x >= win.x + win.w || y < win.y || y >= win.y + win.h) return false;
      const [r, gg, b] = px(x, y);
      return lum(r, gg, b) > 70 && r > b; // 晚霞
    };
    const shade = L.shade;
    this.night = [null];
    for (let step = 1; step <= 4; step++) {
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const nctx = cv.getContext('2d');
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (BAYER[y % 4][x % 4] >= step * 4) continue;
          if (inSky(x, y)) continue;
          const inShade = x >= shade.x && x < shade.x + shade.w && y >= shade.y && y < shade.y + shade.h;
          nctx.fillStyle = inShade ? 'rgba(14,6,18,0.72)' : 'rgba(14,6,20,0.5)';
          nctx.fillRect(x, y, 1, 1);
        }
      }
      this.night.push(cv);
    }

    // 天花板小彩灯：位置公式和 tools/draw_room.py 一致
    const BULB = ['#fdb644', '#ea6949', '#fbcda6', '#f5994a'];
    const Lt = scene.fx.lights;
    this.bulbs = [];
    if (Lt) {
      let i = 0;
      for (let a = 0; a + Lt.anchorStep <= W; a += Lt.anchorStep) {
        const b = a + Lt.anchorStep;
        for (let x = a + Lt.offset; x < b - 3; x += Lt.bulbStep) {
          const y = Math.round(Lt.y + Lt.sag * Math.sin((Math.PI * (x - a)) / (b - a)));
          this.bulbs.push({ x, y: y + 2, c: BULB[i % 4], glow: 0 });
          i++;
        }
      }
    }
  }

  // ---------- 布局：整数倍缩放；手机竖屏改为按高度缩放 + 左右拖动 ----------
  layout() {
    const vw = this.viewport.clientWidth;
    const vh = this.viewport.clientHeight;
    const { W, H } = this;
    let n = Math.floor(Math.min(vw / W, vh / H));
    if (vw < 760 && vh > vw) {
      // 手机竖屏：按高度放大，房间最多约 2.6 屏宽，左右拖动
      const byH = Math.floor(vh / H);
      const cap = Math.floor((2.6 * vw) / W);
      n = Math.max(n, Math.min(byH, cap));
    }
    n = Math.max(1, n);
    const pan = W * n > vw + 1;
    this.n = n;
    this.stageEl.style.width = `${W * n}px`;
    this.stageEl.style.height = `${H * n}px`;
    this.root.style.setProperty('--n', n);
    this.root.style.setProperty('--u', `${Math.max(2, Math.round(n / 2))}px`);
    this.viewport.classList.toggle('pan', pan);
    this.pan = pan;
    if (pan && !this.panInit) {
      this.panInit = true;
      this.viewport.scrollLeft = this.scene.focusX * n - vw / 2;
    }
    if (!pan) this.panInit = false;
    this.listeners.forEach((fn) => fn());
  }

  onLayout(fn) {
    this.listeners.push(fn);
  }

  /** 逻辑坐标 → 屏幕坐标（相对于浏览器视口） */
  toClient(x, y) {
    const r = this.stageEl.getBoundingClientRect();
    return { x: r.left + x * this.n, y: r.top + y * this.n };
  }

  /** 让某个逻辑区域滚动到可见（手机平移模式） */
  reveal(box) {
    if (!this.pan) return;
    const vw = this.viewport.clientWidth;
    const cx = (box.x + box.w / 2) * this.n;
    const target = Math.max(0, cx - vw / 2);
    this.viewport.scrollTo({ left: target, behavior: this.reduced ? 'auto' : 'smooth' });
  }

  // ---------- 主循环 ----------
  start() {
    if (this.running) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  frame(now) {
    if (!this.running) return;
    if (now - this.last >= TICK) {
      this.last = now;
      this.tick(now);
      this.dirty = true;
    }
    if (this.dirty) {
      this.draw();
      this.dirty = false;
    }
    this.raf = requestAnimationFrame(this.frame);
  }

  tick(now) {
    this.tickN++;
    const fx = this.scene.fx;

    // 眼睛：默认睁眼，随机眨眼，偶尔 wink；悬停在角色上时一直 wink
    if (this.winkHold) {
      this.eyes = 'wink';
    } else if (now > this.eyesUntil) {
      this.eyes = 'open';
      if (now > this.nextBlink) {
        if (Math.random() < 0.2) {
          this.eyes = 'wink';
          this.eyesUntil = now + 800;
        } else {
          this.eyes = 'blink';
          this.eyesUntil = now + 160;
        }
        this.nextBlink = now + rand(2500, 6000);
      }
    }

    // 台灯开关过渡（每帧走一级抖动）
    if (!this.lampTarget && this.lampStep < 4) this.lampStep++;
    if (this.lampTarget && this.lampStep > 0) this.lampStep--;

    // 青蛙跳
    if (this.frogJump >= 0) {
      this.frogJump++;
      if (this.frogJump > 8) this.frogJump = -1;
    }

    // 粒子
    for (const p of this.particles) {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      if (p.kind === 'steam') p.x += Math.sin((p.life + p.seed) / 3) * 0.18;
      if (p.kind === 'note') p.x += Math.sin((p.life + p.seed) / 4) * 0.25;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);

    if (this.reduced) return;

    // 灰尘：窗前光里慢慢飘
    const dust = this.particles.filter((p) => p.kind === 'dust').length;
    if (dust < 9 && Math.random() < 0.3) {
      const d = fx.dust;
      this.particles.push({ kind: 'dust', x: rand(d.x, d.x + d.w), y: rand(d.y, d.y + d.h), vx: rand(-0.06, 0.06), vy: rand(-0.04, 0.05), life: 0, max: Math.round(rand(60, 140)), seed: Math.random() * 10 });
    }
    // 马克杯热气
    if (this.tickN % 3 === 0) {
      const st = fx.steam;
      this.particles.push({ kind: 'steam', x: st.x + rand(0, st.w), y: st.y, vx: 0, vy: -0.3, life: 0, max: Math.round(rand(14, 24)), seed: Math.random() * 10 });
    }
    // 背景音乐开着时，耳机和唱片机轮流冒音符
    if (this.bgmOn && this.tickN % 14 === 0) {
      const src = fx.record && (this.tickN / 14) % 2 ? { x: fx.record.x, y: fx.record.y - 8 } : fx.notes;
      this.particles.push({ kind: 'note', x: src.x + rand(-2, 4), y: src.y, vx: 0.12, vy: -0.28, life: 0, max: 34, seed: Math.random() * 10 });
    }
    // 小彩灯：随机一颗亮一下
    for (const b of this.bulbs) if (b.glow > 0) b.glow--;
    if (this.bulbs.length && Math.random() < 0.35) {
      this.bulbs[Math.floor(Math.random() * this.bulbs.length)].glow = Math.round(rand(6, 16));
    }
    // 城市窗灯：随机亮起、熄灭
    this.twinkles = this.twinkles.filter((tw) => --tw.left > 0);
    if (this.twinkles.length < 7 && Math.random() < 0.12 && this.cityCandidates.length) {
      const [x, y] = this.cityCandidates[Math.floor(Math.random() * this.cityCandidates.length)];
      this.twinkles.push({ x, y, left: Math.round(rand(30, 110)), color: Math.random() < 0.7 ? '#fdbe71' : '#f8f0e6' });
    }
  }

  burstHearts() {
    const h = this.scene.fx.hearts;
    for (let i = 0; i < 3; i++) {
      this.particles.push({ kind: 'heart', x: h.x + i * 7 + rand(-1, 1), y: h.y + rand(-1, 2), vx: rand(-0.08, 0.08), vy: -0.32, life: -i * 3, max: 26, seed: 0 });
    }
    this.dirty = true;
  }

  jumpFrog() {
    this.frogJump = 0;
  }

  setLamp(on) {
    this.lampTarget = on;
  }

  // ---------- 绘制 ----------
  pattern(rows, x, y, color, shadow = null) {
    const ctx = this.ctx;
    x = Math.round(x);
    y = Math.round(y);
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] !== 'X') continue;
        if (shadow) {
          ctx.fillStyle = shadow;
          ctx.fillRect(x + i + 1, y + j + 1, 1, 1);
        }
      }
    });
    ctx.fillStyle = color;
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === 'X') ctx.fillRect(x + i, y + j, 1, 1);
    });
  }

  draw() {
    const { ctx, scene } = this;
    const fx = scene.fx;
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.drawImage(this.img.bg, 0, 0);

    // 青蛙跳
    if (this.frogJump >= 0) {
      const f = fx.frog;
      const lift = [0, 2, 4, 5, 5, 4, 2, 1, 0][this.frogJump] || 0;
      ctx.fillStyle = this.frogWall;
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.drawImage(this.frogSprite, f.x, f.y - lift);
    }

    // 城市窗灯
    for (const tw of this.twinkles) {
      ctx.fillStyle = tw.color;
      ctx.fillRect(tw.x, tw.y, 1, 1);
    }

    // 眼睛补丁
    const av = scene.avatar;
    if (this.eyes === 'open') ctx.drawImage(this.img.openR, av.openR.x, av.openR.y);
    else if (this.eyes === 'blink') ctx.drawImage(this.img.closedL, av.closedL.x, av.closedL.y);

    // 记忆摆件
    for (const m of this.memories) {
      const sl = m.slot;
      if (sl.kind === 'stand') {
        ctx.fillStyle = 'rgba(14,6,18,0.55)';
        ctx.fillRect(sl.x + 1, sl.y + 14, 11, 1);
      }
      ctx.drawImage(m.sprite, sl.x, sl.y);
      if (sl.kind === 'pin') {
        ctx.fillStyle = INK;
        ctx.fillRect(sl.x + 5, sl.y - 1, 2, 1);
        ctx.fillStyle = CORAL;
        ctx.fillRect(sl.x + 5, sl.y, 2, 1);
      }
    }

    // 关灯遮罩 / 台灯光晕
    if (this.lampStep > 0) ctx.drawImage(this.night[this.lampStep], 0, 0);
    if (this.lampStep < 4) {
      const pulse = [1, 0.9, 0.8, 0.9][Math.floor(this.tickN / 9) % 4];
      ctx.globalAlpha = pulse * (1 - this.lampStep / 4);
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(this.glow, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    // 小彩灯：关灯后全部亮起，平时随机闪
    const night = this.lampStep / 4;
    for (const b of this.bulbs) {
      if (b.glow <= 0 && night === 0) continue;
      ctx.fillStyle = `rgba(253,182,68,${(b.glow > 0 ? 0.22 : 0) + 0.18 * night})`;
      ctx.fillRect(b.x - 1, b.y - 1, 4, 4);
      ctx.fillStyle = b.glow > 0 ? '#fff1d6' : b.c;
      ctx.fillRect(b.x, b.y, 2, 1);
    }
    // 唱片机：放音乐时唱片上的反光转圈
    if (this.bgmOn && fx.record) {
      const r = fx.record;
      const ang = this.tickN * 0.7;
      ctx.fillStyle = '#ccb49c';
      ctx.fillRect(Math.round(r.x + Math.cos(ang) * r.rx * 0.7), Math.round(r.y + Math.sin(ang) * r.ry * 0.7), 2, 1);
    }

    // 粒子
    for (const p of this.particles) {
      if (p.life < 0) continue;
      const k = p.life / p.max;
      if (p.kind === 'dust') {
        const a = Math.sin((p.life / p.max) * Math.PI) * (0.55 + 0.35 * Math.sin(p.life / 5 + p.seed));
        ctx.fillStyle = `rgba(251,205,166,${Math.max(0, a).toFixed(2)})`;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      } else if (p.kind === 'steam') {
        ctx.fillStyle = `rgba(248,240,230,${(0.55 * (1 - k)).toFixed(2)})`;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      } else if (p.kind === 'note') {
        ctx.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1;
        this.pattern(PAT.note, p.x, p.y, '#fbcda6', INK);
        ctx.globalAlpha = 1;
      } else if (p.kind === 'heart') {
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        this.pattern(PAT.heart, p.x, p.y, CORAL, INK);
        ctx.globalAlpha = 1;
      }
    }

    // 新摆件的闪光
    const sparkFrame = Math.floor(this.tickN / 3) % 4;
    for (const m of this.memories) {
      if (!m.isNew) continue;
      this.pattern(PAT.spark[sparkFrame], m.slot.x + 9, m.slot.y - 3, AMBER);
    }

    // 首次访问的提示箭头
    if (this.hintsOn) {
      const bob = [0, 1, 2, 1][Math.floor(this.tickN / 3) % 4];
      for (const h of scene.hints) this.pattern(PAT.arrow, h.x, h.y + bob, AMBER, INK);
    }

    // 悬停 / 键盘焦点的选择框（四角 L 形）
    if (this.hover) {
      const p = Math.floor(this.tickN / 5) % 2;
      const b = this.hover;
      const x0 = Math.max(0, b.x - 1 - p);
      const y0 = Math.max(0, b.y - 1 - p);
      const x1 = Math.min(this.W - 1, b.x + b.w + p);
      const y1 = Math.min(this.H - 1, b.y + b.h + p);
      const L = Math.max(2, Math.min(4, Math.floor(Math.min(b.w, b.h) / 4)));
      const corners = (color, o) => {
        ctx.fillStyle = color;
        // 左上
        ctx.fillRect(x0 + o, y0 + o, L, 1);
        ctx.fillRect(x0 + o, y0 + o, 1, L);
        // 右上
        ctx.fillRect(x1 - L + 1 + o, y0 + o, L, 1);
        ctx.fillRect(x1 + o, y0 + o, 1, L);
        // 左下
        ctx.fillRect(x0 + o, y1 + o, L, 1);
        ctx.fillRect(x0 + o, y1 - L + 1 + o, 1, L);
        // 右下
        ctx.fillRect(x1 - L + 1 + o, y1 + o, L, 1);
        ctx.fillRect(x1 + o, y1 - L + 1 + o, 1, L);
      };
      corners(INK, 1);
      corners(AMBER, 0);
    }
  }

  /** 截取背景的一块（关于我面板里的头像用）；不传参数时用 scene.json 里的 avatar.portrait */
  crop(x, y, w, h) {
    if (x === undefined) ({ x, y, w, h } = this.scene.avatar.portrait);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cx = c.getContext('2d');
    cx.drawImage(this.img.bg, x, y, w, h, 0, 0, w, h);
    const av = this.scene.avatar;
    cx.drawImage(this.img.openR, av.openR.x - x, av.openR.y - y);
    return c;
  }
}
