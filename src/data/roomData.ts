import { ArchetypeId, Hotspot, Lang, Memory, RoomThemeConfig, Slot } from '../types/room';
import { generateArchetypeSprite, generatePolaroidSprite } from '../utils/pixelSpriteEngine';

export const DEFAULT_THEME_CONFIG: RoomThemeConfig = {
  mode: 'dusk',
  lampOn: true,
  skyTop: '#2C161A',
  skyMid: '#702F53',
  skyHorizon: '#EA6949',
  wallColor: '#4B243B',
  accentColor: '#FDB644',
  lampGlow: 1.15,
  expandedShelves: true,
  layoutDensity: 'balanced',
  contrastBoost: 1.0,
  hudCompact: true,
};

export const ARCHETYPE_LABELS: Record<ArchetypeId, { zh: string; en: string }> = {
  snow_globe: { zh: '雪花水晶球', en: 'Snow Globe' },
  postcard: { zh: '旅行明信片', en: 'Postcard' },
  shell_bottle: { zh: '海边贝壳瓶', en: 'Shell Bottle' },
  ramen_bowl: { zh: '迷你美食碗', en: 'Mini Food Bowl' },
  vinyl_ticket: { zh: '黑胶 / 票根', en: 'Vinyl & Ticket' },
  polaroid_frame: { zh: '像素拍立得', en: 'Pixel Polaroid' },
  plushie: { zh: '毛绒小玩偶', en: 'Plushie' },
  medal: { zh: '纪念奖牌', en: 'Medal' },
  grad_cap: { zh: '学士帽摆件', en: 'Grad Cap' },
  lanyard: { zh: '活动工牌', en: 'Event Badge' },
  cake: { zh: '庆生小蛋糕', en: 'Mini Cake' },
  game_cart: { zh: '复古游戏卡带', en: 'Game Cartridge' },
};

export const ROOM_HOTSPOTS: Hotspot[] = [
  {
    id: 'character',
    label: { zh: '关于我', en: 'About Me' },
    description: { zh: '产品工程师 & AI 交互设计师，点击听我打招呼', en: 'Product Engineer & AI Designer — click to say hi' },
    pos: { x: 220, y: 40 },
    hitbox: { x: 190, y: 38, w: 125, h: 122 },
    layer: 'avatar',
    tabOrder: 1,
    side: 'center',
    action: { type: 'panel', template: 'about', contentId: 'about' },
    priority: 'P0',
  },
  {
    id: 'laptop',
    label: { zh: '笔记本电脑 · 工作与项目', en: 'Laptop · Work & Projects' },
    description: { zh: '打开桌面系统，查看工作经历、项目与简历', en: 'Open Pixel OS to browse experience, projects & resume' },
    pos: { x: 96, y: 158 },
    hitbox: { x: 96, y: 156, w: 145, h: 98 },
    layer: 'desk_front',
    tabOrder: 2,
    side: 'center',
    action: { type: 'panel', template: 'os', contentId: 'os' },
    priority: 'P0',
  },
  {
    id: 'bookshelf',
    label: { zh: '书架 · 经历时间轴', en: 'Bookshelf · Timeline' },
    description: { zh: '翻阅我的教育背景、实习与成长历程', en: 'Flip through my education and career milestones' },
    pos: { x: 344, y: 6 },
    hitbox: { x: 344, y: 6, w: 130, h: 158 },
    layer: 'wall',
    tabOrder: 3,
    side: 'right',
    action: { type: 'panel', template: 'timeline', contentId: 'timeline' },
    priority: 'P0',
  },
  {
    id: 'corkboard',
    label: { zh: '记忆展示区 · 照片墙', en: 'Memory Wall · Gallery' },
    description: { zh: '浏览全部已发布的照片记忆与摆件', en: 'Browse all published photo memories & collectibles' },
    pos: { x: 288, y: 12 },
    hitbox: { x: 286, y: 10, w: 54, h: 52 },
    layer: 'wall',
    tabOrder: 4,
    side: 'right',
    action: { type: 'panel', template: 'grid', contentId: 'memories' },
    priority: 'P0',
  },
  {
    id: 'sticky_notes',
    label: { zh: '便利贴 · 技能栈', en: 'Sticky Notes · Skills' },
    description: { zh: '编程、设计工具、AI 工作流与语言能力', en: 'Engineering, design craft, AI workflows & languages' },
    pos: { x: 10, y: 74 },
    hitbox: { x: 8, y: 70, w: 34, h: 48 },
    layer: 'wall',
    tabOrder: 5,
    side: 'left',
    action: { type: 'panel', template: 'notes', contentId: 'skills' },
    priority: 'P0',
  },
  {
    id: 'phone',
    label: { zh: '手机 · 联系我', en: 'Phone · Contact' },
    description: { zh: '复制邮箱、GitHub、LinkedIn 与下载简历', en: 'Copy email, visit GitHub/LinkedIn & download CV' },
    pos: { x: 320, y: 222 },
    hitbox: { x: 316, y: 218, w: 42, h: 36 },
    layer: 'desk_front',
    tabOrder: 6,
    side: 'right',
    action: { type: 'panel', template: 'contact', contentId: 'contact' },
    priority: 'P0',
  },
  {
    id: 'chest',
    label: { zh: '收藏箱 · 记忆仓库', en: 'Memory Archive · Chest' },
    description: { zh: '打开珍藏的照片记忆与未展出的摆件', en: 'Open archived memories and collectible gallery' },
    pos: { x: 10, y: 216 },
    hitbox: { x: 6, y: 212, w: 46, h: 46 },
    layer: 'desk_front',
    tabOrder: 7,
    side: 'left',
    action: { type: 'panel', template: 'grid', contentId: 'memories' },
    priority: 'P0',
  },
  {
    id: 'vinyl',
    label: { zh: '黑胶唱片 · 最近在听', en: 'Vinyl · Playlist & BGM' },
    description: { zh: '切换房间 Lo-fi 背景音乐与查看私人歌单', en: 'Play lo-fi BGM and view my recent soundtrack' },
    pos: { x: 348, y: 120 },
    hitbox: { x: 344, y: 116, w: 40, h: 40 },
    layer: 'wall',
    tabOrder: 8,
    side: 'right',
    action: { type: 'panel', template: 'playlist', contentId: 'playlist' },
    priority: 'P1',
  },
  {
    id: 'window',
    label: { zh: '黄昏之窗 · 我的足迹', en: 'Sunset Window · Footprints' },
    description: { zh: '查看我生活与旅行过的城市地图', en: 'Explore cities where I have lived and traveled' },
    pos: { x: 48, y: 8 },
    hitbox: { x: 48, y: 8, w: 185, h: 140 },
    layer: 'window_frame',
    tabOrder: 9,
    side: 'left',
    action: { type: 'panel', template: 'map', contentId: 'footprints' },
    priority: 'P1',
  },
  {
    id: 'trophy',
    label: { zh: '奖杯 · 荣誉奖项', en: 'Trophy · Honors & Awards' },
    description: { zh: '黑客松、设计竞赛与工程奖项列表', en: 'Hackathon wins, design awards & recognitions' },
    pos: { x: 386, y: 74 },
    hitbox: { x: 382, y: 70, w: 30, h: 36 },
    layer: 'wall',
    tabOrder: 10,
    side: 'right',
    action: { type: 'panel', template: 'list', contentId: 'awards' },
    priority: 'P1',
  },
  {
    id: 'certificate',
    label: { zh: '证书框 · 教育背景', en: 'Certificate · Education' },
    description: { zh: '学校、专业与核心研究方向', en: 'University degree, coursework & research focus' },
    pos: { x: 242, y: 12 },
    hitbox: { x: 240, y: 10, w: 42, h: 36 },
    layer: 'wall',
    tabOrder: 11,
    side: 'center',
    action: { type: 'panel', template: 'card', contentId: 'education' },
    priority: 'P1',
  },
  {
    id: 'calendar',
    label: { zh: '日历 · 此刻在做', en: 'Calendar · Now' },
    description: { zh: '最近在读的书、在做的实验与日常节奏', en: 'What I am reading, building, and learning right now' },
    pos: { x: 10, y: 18 },
    hitbox: { x: 8, y: 16, w: 34, h: 38 },
    layer: 'wall',
    tabOrder: 12,
    side: 'left',
    action: { type: 'panel', template: 'now', contentId: 'now' },
    priority: 'P1',
  },
  {
    id: 'mug',
    label: { zh: '小蛙马克杯 · 冷知识', en: 'Froggy Mug · Fun Facts' },
    description: { zh: '喝一口咖啡，抽取一条关于我的冷知识', en: 'Take a sip and draw a random fun fact' },
    pos: { x: 56, y: 214 },
    hitbox: { x: 54, y: 210, w: 46, h: 48 },
    layer: 'desk_front',
    tabOrder: 13,
    side: 'left',
    action: { type: 'easter_egg', id: 'mug' },
    priority: 'P1',
  },
  {
    id: 'lamp',
    label: { zh: '暖光方灯 · 开关昼夜光影', en: 'Glow Lamp · Toggle Lighting' },
    description: { zh: '切换黄昏余晖与深夜台灯模式', en: 'Switch between sunset dusk & cozy night mode' },
    pos: { x: 8, y: 128 },
    hitbox: { x: 4, y: 126, w: 60, h: 82 },
    layer: 'desk_back',
    tabOrder: 14,
    side: 'left',
    action: { type: 'toggle', target: 'lamp' },
    priority: 'P1',
  },
  {
    id: 'plant',
    label: { zh: '窗台绿植 · 正在学习', en: 'Window Plant · Learning' },
    description: { zh: '像植物一样持续生长的技能树', en: 'Skills and crafts currently growing' },
    pos: { x: 64, y: 120 },
    hitbox: { x: 60, y: 114, w: 34, h: 40 },
    layer: 'wall',
    tabOrder: 15,
    side: 'left',
    action: { type: 'panel', template: 'learning', contentId: 'learning' },
    priority: 'P2',
  },
  {
    id: 'frog',
    label: { zh: '书架青蛙 · 彩蛋', en: 'Shelf Frog · Easter Egg' },
    description: { zh: '连续点击 5 次解锁摇摆彩蛋！', en: 'Click 5 times for a musical surprise!' },
    pos: { x: 422, y: 14 },
    hitbox: { x: 418, y: 12, w: 48, h: 46 },
    layer: 'wall',
    tabOrder: 16,
    side: 'right',
    action: { type: 'easter_egg', id: 'frog' },
    priority: 'P2',
  },
  {
    id: 'cat',
    label: { zh: '三花小猫 · 摸摸它', en: 'Calico Cat · Pet Me' },
    description: { zh: '桌面右下角打盹的三花伙伴，点击摸猫', en: 'Click to pet my sleeping calico companion' },
    pos: { x: 368, y: 204 },
    hitbox: { x: 364, y: 200, w: 108, h: 66 },
    layer: 'desk_front',
    tabOrder: 17,
    side: 'right',
    action: { type: 'easter_egg', id: 'cat' },
    priority: 'P2',
  },
];

const ALL_ARCHETYPES: ArchetypeId[] = [
  'snow_globe',
  'postcard',
  'shell_bottle',
  'ramen_bowl',
  'vinyl_ticket',
  'polaroid_frame',
  'plushie',
  'medal',
  'grad_cap',
  'lanyard',
  'cake',
  'game_cart',
];

// Slots aligned cleanly to shelves, window sill, wall frames, cork strip & desk without overlapping the hero character
export const ROOM_SLOTS: Slot[] = [
  // Wall frames W1-W3
  { id: 'W1', zone: 'wall', pos: { x: 292, y: 18 }, size: 'M', accepts: ['polaroid_frame', 'medal', 'postcard', 'grad_cap'] },
  { id: 'W2', zone: 'wall', pos: { x: 316, y: 18 }, size: 'M', accepts: ['polaroid_frame', 'medal', 'postcard', 'vinyl_ticket'] },
  { id: 'W3', zone: 'wall', pos: { x: 292, y: 42 }, size: 'M', accepts: ALL_ARCHETYPES },

  // Bookshelf SH1-SH12 (right-side bookshelf tiers)
  { id: 'SH1', zone: 'shelf', pos: { x: 356, y: 36 }, size: 'S', accepts: ALL_ARCHETYPES },
  { id: 'SH2', zone: 'shelf', pos: { x: 382, y: 36 }, size: 'S', accepts: ALL_ARCHETYPES },
  { id: 'SH3', zone: 'shelf', pos: { x: 402, y: 36 }, size: 'S', accepts: ALL_ARCHETYPES },
  { id: 'SH4', zone: 'shelf', pos: { x: 356, y: 84 }, size: 'S', accepts: ALL_ARCHETYPES },
  { id: 'SH5', zone: 'shelf', pos: { x: 418, y: 84 }, size: 'S', accepts: ALL_ARCHETYPES },
  { id: 'SH6', zone: 'shelf', pos: { x: 444, y: 84 }, size: 'S', accepts: ALL_ARCHETYPES },
  { id: 'SH7', zone: 'shelf', pos: { x: 356, y: 128 }, size: 'S', accepts: ALL_ARCHETYPES },
  { id: 'SH8', zone: 'shelf', pos: { x: 388, y: 128 }, size: 'S', accepts: ALL_ARCHETYPES },
  { id: 'SH9', zone: 'shelf', pos: { x: 416, y: 128 }, size: 'S', accepts: ALL_ARCHETYPES },
  { id: 'SH10', zone: 'shelf', pos: { x: 444, y: 128 }, size: 'S', accepts: ALL_ARCHETYPES },
  { id: 'SH11', zone: 'shelf', pos: { x: 392, y: 162 }, size: 'S', accepts: ALL_ARCHETYPES },
  { id: 'SH12', zone: 'shelf', pos: { x: 420, y: 162 }, size: 'S', accepts: ALL_ARCHETYPES },

  // Window Sill S1-S3
  { id: 'S1', zone: 'sill', pos: { x: 100, y: 128 }, size: 'S', accepts: ['shell_bottle', 'snow_globe', 'plushie', 'cake', 'ramen_bowl'] },
  { id: 'S2', zone: 'sill', pos: { x: 126, y: 128 }, size: 'S', accepts: ['shell_bottle', 'snow_globe', 'plushie', 'ramen_bowl', 'polaroid_frame'] },
  { id: 'S3', zone: 'sill', pos: { x: 152, y: 128 }, size: 'S', accepts: ALL_ARCHETYPES },

  // Corkboard / Wall Strip C1-C6
  { id: 'C1', zone: 'cork', pos: { x: 244, y: 50 }, size: 'S', accepts: ['postcard', 'vinyl_ticket', 'lanyard', 'polaroid_frame', 'medal'] },
  { id: 'C2', zone: 'cork', pos: { x: 268, y: 50 }, size: 'S', accepts: ALL_ARCHETYPES },
  { id: 'C3', zone: 'cork', pos: { x: 316, y: 42 }, size: 'S', accepts: ALL_ARCHETYPES },
  { id: 'C4', zone: 'cork', pos: { x: 12, y: 102 }, size: 'S', accepts: ALL_ARCHETYPES },
  { id: 'C5', zone: 'cork', pos: { x: 294, y: 66 }, size: 'S', accepts: ALL_ARCHETYPES },
  { id: 'C6', zone: 'cork', pos: { x: 318, y: 66 }, size: 'S', accepts: ALL_ARCHETYPES },

  // Desk D1-D2
  { id: 'D1', zone: 'desk', pos: { x: 74, y: 184 }, size: 'S', accepts: ['ramen_bowl', 'cake', 'snow_globe', 'game_cart', 'plushie', 'polaroid_frame'] },
  { id: 'D2', zone: 'desk', pos: { x: 336, y: 184 }, size: 'S', accepts: ALL_ARCHETYPES },

  // Adaptive Expansion Shelf EX1-EX4
  { id: 'EX1', zone: 'expansion', pos: { x: 246, y: 74 }, size: 'S', accepts: ALL_ARCHETYPES, isExpansion: true },
  { id: 'EX2', zone: 'expansion', pos: { x: 270, y: 74 }, size: 'S', accepts: ALL_ARCHETYPES, isExpansion: true },
  { id: 'EX3', zone: 'expansion', pos: { x: 444, y: 162 }, size: 'S', accepts: ALL_ARCHETYPES, isExpansion: true },
  { id: 'EX4', zone: 'expansion', pos: { x: 12, y: 54 }, size: 'S', accepts: ALL_ARCHETYPES, isExpansion: true },
];

export const SHOWCASE_CONTENT = {
  owner: {
    name: { zh: '阿曜 Jacky', en: 'Jacky Yao' },
    role: { zh: '全栈创意工程师 · AI 交互设计师', en: 'Creative Full-Stack Engineer & AI Designer' },
    oneLiner: {
      zh: '用像素温度与 AI 交互，建造会随生活生长的数字房间。',
      en: 'Crafting warm pixel interfaces and adaptive AI experiences.',
    },
    bubbleLines: {
      zh: [
        '嗨！欢迎来到我的像素小屋 ✨',
        '桌面、书架和软木板都可以点击探索。',
        '每上传一张新照片，小屋就会长出新摆件并自动适配风格！',
      ],
      en: [
        'Hey there! Welcome to my Pixel Study ✨',
        'Click my laptop, bookshelf, or corkboard to explore.',
        'Upload any photo and watch it transform into a pixel artifact & adapt the room!',
      ],
    },
    bio: {
      zh: '我是一名专注于前端架构、生成式 AI 应用与游戏化交互体验的工程师。我相信个人主页不该只是一张冰冷的简历 PDF，而应是一间随时有暖光、音乐和记忆的书房。目前专注多模态视觉工作流与自适应界面系统设计。',
      en: 'I build expressive web products at the intersection of frontend engineering, generative AI, and playful interaction design. I believe personal websites should feel less like static brochures and more like a lived-in room with warm lighting, music, and evolving memories.',
    },
    stats: [
      { label: { zh: '上线项目', en: 'Shipped Products' }, value: '14+' },
      { label: { zh: '核心技术', en: 'Primary Stack' }, value: 'React / TS / AI' },
      { label: { zh: '所在城市', en: 'Based In' }, value: 'Shanghai · SF' },
    ],
  },
  experience: [
    {
      id: 'exp-1',
      org: 'Studio Nebula AI',
      role: { zh: '高级前端与交互工程师', en: 'Senior Frontend & Interaction Engineer' },
      period: '2024.03 – Present',
      bullets: {
        zh: [
          '主导多模态视觉画布与实时 AI 设计评审工作台，日活创作者 45K+',
          '构建像素级确定性渲染管线与自适应主题引擎，首屏交互延迟 < 100ms',
          '设计跨端无障碍组件库，Lighthouse 无障碍评分稳定 99+',
        ],
        en: [
          'Led multimodal visual canvas & real-time AI critique studio serving 45K+ creators',
          'Built deterministic pixel-grid rendering and adaptive theme engine (<100ms interaction latency)',
          'Architected accessible bilingual component primitives achieving 99+ Lighthouse Accessibility',
        ],
      },
    },
    {
      id: 'exp-2',
      org: 'Lofi Craft Labs',
      role: { zh: '产品工程师', en: 'Product Engineer' },
      period: '2022.07 – 2024.02',
      bullets: {
        zh: [
          '负责互动展示编辑器核心开发，支持动态布局重排与即插即用媒体管线',
          '将 Web Audio API 合成音效融入 2D 场景，平均停留时长提升 2.4×',
        ],
        en: [
          'Engineered interactive showcase editor with dynamic layout adaptation and media pipelines',
          'Integrated Web Audio synthesized lo-fi soundscapes, lifting average session dwell by 2.4x',
        ],
      },
    },
    {
      id: 'exp-3',
      org: 'Pixel Forge Indie',
      role: { zh: '创意前端实习生', en: 'Creative Technologist Intern' },
      period: '2021.06 – 2022.01',
      bullets: {
        zh: [
          '独立完成 480×270 逻辑网格 RPG 原型及 16-bit 着色器调色板工具',
          '实现基于 IndexedDB 的离线素材缓存机制，资源加载体积缩减 62%',
        ],
        en: [
          'Built 480x270 logical-grid RPG prototype and 16-bit palette quantizer tooling',
          'Implemented IndexedDB offline sprite caching reducing asset transfer size by 62%',
        ],
      },
    },
  ],
  projects: [
    {
      id: 'proj-room',
      name: { zh: '像素小屋自适应引擎', en: 'Pixel Room Adaptive Engine' },
      oneLiner: {
        zh: '将日常照片 AI 解析为 16×16 像素摆件，并实时优化房间布局与光影风格',
        en: 'Turns real photos into 16x16 pixel collectibles and dynamically adapts room layout & lighting',
      },
      myRole: { zh: '独立架构与全栈实现', en: 'Sole Architect & Full-Stack Builder' },
      stack: ['React 19', 'TypeScript', 'Gemini Vision', 'Canvas 2D', 'Web Audio'],
      highlight: { zh: 'AI 审美闭环评分 ≥ 9.5', en: 'Iterative AI Critique >= 9.5/10' },
    },
    {
      id: 'proj-dither',
      name: { zh: 'DitherLab 抖动调色器', en: 'DitherLab Palette Studio' },
      oneLiner: {
        zh: '浏览器端实时 Bayer 抖动与调色板量化工具，零后端依赖',
        en: 'Browser-native Bayer dithering & perceptual palette quantization toolkit',
      },
      myRole: { zh: '核心作者', en: 'Creator & Maintainer' },
      stack: ['WebAssembly', 'Canvas API', 'Tailwind CSS'],
      highlight: { zh: 'GitHub 1.8k Stars', en: '1.8k GitHub Stars' },
    },
    {
      id: 'proj-lofi',
      name: { zh: 'Sunset Synth 合成器', en: 'Sunset Lo-fi Synth' },
      oneLiner: {
        zh: '基于 Web Audio API 的极简和弦氛围发生器，陪伴专注编码',
        en: 'Minimal Web Audio lo-fi chord generator built for deep focus coding',
      },
      myRole: { zh: '音频设计与前端开发', en: 'Audio DSP & Frontend' },
      stack: ['Web Audio API', 'TypeScript', 'CSS Steps'],
      highlight: { zh: '零音频文件 < 12KB', en: 'Zero audio files < 12KB' },
    },
  ],
  trashProjects: [
    {
      name: { zh: '半夜三点的番茄钟 v0.1', en: '3AM Pomodoro v0.1' },
      note: {
        zh: '闹铃声音大到把隔壁猫吓醒，现已温柔重构。',
        en: 'Alarm was loud enough to wake the neighbor’s cat. Retired peacefully.',
      },
    },
    {
      name: { zh: '全自动写周报机器人', en: 'Auto Weekly-Report Bot' },
      note: {
        zh: '写得太像真人导致老板给我加了三个新需求。',
        en: 'Wrote reports so convincingly my manager assigned three new projects.',
      },
    },
  ],
  timeline: [
    {
      year: '2025 – 2026',
      title: { zh: '探索自适应多模态界面与 AI 审美闭环', en: 'Adaptive Multimodal UI & AI Design Critique' },
      place: 'Shanghai',
      detail: {
        zh: '把「上传即更新布局」与「双 AI 审核迭代」融入个人展示与创作工具链，追求既有技术精度又有生活呼吸感的作品。',
        en: 'Combining photo-driven layout adaptation with dual-AI design review loops to craft living digital spaces.',
      },
    },
    {
      year: '2023 – 2024',
      title: { zh: '深耕创意工程与 2D 像素系统', en: 'Creative Engineering & 2D Pixel Systems' },
      place: 'San Francisco / Remote',
      detail: {
        zh: '在 Studio Nebula 负责交互编辑器，系统研究了像素网格对齐、Bayer 抖动与低延迟微交互。',
        en: 'Shipped collaborative visual editors and refined pixel-grid rendering, dithering, and micro-interaction craft.',
      },
    },
    {
      year: '2019 – 2023',
      title: { zh: '计算机科学与人机交互 (HCI)', en: 'B.S. in Computer Science & HCI' },
      place: 'Zhejiang University',
      detail: {
        zh: '主修软件工程与图形交互，独立开发了多款独立像素小游戏和开源视觉工具。',
        en: 'Studied Software Engineering & HCI; built indie pixel games and open-source graphics tools.',
      },
    },
  ],
  skills: [
    {
      group: { zh: '前端与图形', en: 'Frontend & Graphics' },
      color: '#FDB644',
      items: ['TypeScript', 'React 19', 'Tailwind CSS', 'Canvas 2D / Pixel Grid', 'Web Audio API'],
    },
    {
      group: { zh: 'AI 与全栈', en: 'AI & Full-Stack' },
      color: '#EA6949',
      items: ['Gemini Vision & JSON Schema', 'Node.js / Express', 'IndexedDB', 'Prompt Critique Loops'],
    },
    {
      group: { zh: '设计与语言', en: 'Design & Languages' },
      color: '#A89060',
      items: ['16-bit Pixel Art', 'Figma / Aseprite', 'WCAG AA Accessibility', '中文 / English'],
    },
  ],
  awards: [
    {
      year: '2025',
      title: { zh: 'AI Creative Web Hackathon 一等奖', en: '1st Place · AI Creative Web Hackathon' },
      desc: { zh: '凭借动态视觉自适应画廊原型获奖', en: 'Awarded for adaptive photo-to-room gallery engine' },
    },
    {
      year: '2024',
      title: { zh: 'Awwwards Honorable Mention', en: 'Awwwards Honorable Mention' },
      desc: { zh: '互动像素实验室作品入选', en: 'Featured interactive pixel laboratory showcase' },
    },
    {
      year: '2022',
      title: { zh: '全国大学生游戏设计创意奖', en: 'National Indie Game Craft Award' },
      desc: { zh: '最佳 2D 美术与声音设计提名', en: 'Best 2D Pixel Art & Audio Direction nominee' },
    },
  ],
  education: {
    school: { zh: '浙江大学 · 计算机科学与技术学院', en: 'Zhejiang University · College of Computer Science' },
    degree: { zh: '工学学士 · 软件工程 & 人机交互方向', en: 'B.Eng. in Software Engineering & HCI' },
    period: '2019.09 – 2023.06',
    highlights: {
      zh: ['GPA 3.9/4.0 · 优秀毕业设计', '人机交互实验室本科研究员', '独立游戏社团创始人'],
      en: ['GPA 3.9/4.0 · Honors Thesis', 'HCI Lab Undergraduate Researcher', 'Founder, Indie Pixel Game Club'],
    },
  },
  playlist: [
    { title: 'Sunset on Plum Street', artist: 'Lofi Study Club', mood: { zh: '黄昏敲代码的暖调和弦', en: 'Warm Rhodes chords for dusk coding' } },
    { title: 'Rain on Pixel Window', artist: 'Koto & Tape', mood: { zh: '京都夜晚散步时循环最多', en: 'Most replayed during Kyoto night walks' } },
    { title: '8-Bit Espresso', artist: 'Chip & Brew', mood: { zh: '周五下午赶上线前的提神曲', en: 'Friday afternoon shipping anthem' } },
  ],
  footprints: [
    { city: { zh: '杭州', en: 'Hangzhou' }, x: 68, y: 48, note: { zh: '四年大学时光，西湖边的日落灵感起点', en: '4 university years — where my sunset palette began' } },
    { city: { zh: '上海', en: 'Shanghai' }, x: 74, y: 45, note: { zh: '现在的常驻基地，做有趣的 AI 产品', en: 'Current home base building creative AI products' } },
    { city: { zh: '京都', en: 'Kyoto' }, x: 84, y: 40, note: { zh: '春天的樱花与红色鸟居，带回一只水晶球', en: 'Spring blossoms & torii gates — brought back a snow globe' } },
    { city: { zh: '旧金山', en: 'San Francisco' }, x: 18, y: 38, note: { zh: '参加黑客松与朋友重聚的金门夕阳', en: 'Golden Gate dusk & hackathon sprints with friends' } },
  ],
  now: {
    updated: '2026.11',
    reading: { zh: '《The Design of Everyday Things》 & 像素着色器笔记', en: 'The Design of Everyday Things & Pixel Shader Notes' },
    building: { zh: '支持 AI 审美自迭代的个人空间框架', en: 'Self-iterating AI-critiqued personal showcase architecture' },
    habit: { zh: '每天下午 5 点半泡一杯手冲，看窗外夕阳配色', en: '5:30 PM pour-over coffee & studying sunset palettes' },
  },
  learning: [
    { topic: { zh: 'GLSL 像素风光照与抖动着色器', en: 'GLSL Pixel Lighting & Dither Shaders' }, progress: 78 },
    { topic: { zh: '多模态 Agent 自动 UI 评审协议', en: 'Multimodal Agent UI Critique Protocols' }, progress: 88 },
    { topic: { zh: '日语 N3 日常会话', en: 'Japanese N3 Conversational Practice' }, progress: 55 },
  ],
  funFacts: [
    { zh: '咖啡杯里其实是乌龙拿铁，加了少许肉桂粉。', en: 'The mug actually holds an oolong latte with a pinch of cinnamon.' },
    { zh: '这间屋子的 20 个主色调全部取自真实的日落摄影。', en: 'All 20 colors in this room palette were sampled from real sunset photos.' },
    { zh: '桌面左边的青蛙玩偶连点 5 下会戴上耳机跳舞！', en: 'Click the frog plushie 5 times to unlock its secret headphone dance!' },
    { zh: '晚上 11 点后来访，你会看到主角趴在桌上打盹。', en: 'Visit after 11 PM local time and you will catch me napping at the desk.' },
  ],
  contact: {
    email: 'jacky.pixel@example.com',
    github: 'https://github.com/jacky-pixel',
    linkedin: 'https://linkedin.com/in/jacky-pixel',
    location: { zh: '上海 · 支持远程协作', en: 'Shanghai · Open to Remote' },
  },
};

// Programmatic crisp pixel photo generator for starter memories (zero broken external URLs)
function makeStarterPhoto(palette: [string, string, string, string], motif: 'torii' | 'vinyl' | 'coffee'): string {
  const c = document.createElement('canvas');
  c.width = 480;
  c.height = 360;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 360);
  grad.addColorStop(0, palette[0]);
  grad.addColorStop(0.55, palette[1]);
  grad.addColorStop(1, palette[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 480, 360);

  // Warm sun orb
  ctx.fillStyle = palette[3];
  ctx.beginPath();
  ctx.arc(340, 110, 44, 0, Math.PI * 2);
  ctx.fill();

  if (motif === 'torii') {
    ctx.fillStyle = '#2C161A';
    ctx.fillRect(0, 250, 480, 110);
    ctx.fillStyle = '#EA6949';
    ctx.fillRect(140, 110, 200, 18);
    ctx.fillRect(160, 145, 160, 12);
    ctx.fillRect(175, 120, 16, 140);
    ctx.fillRect(289, 120, 16, 140);
    // Blossoms
    ctx.fillStyle = '#FBCDA6';
    for (let i = 0; i < 24; i++) {
      ctx.fillRect(60 + ((i * 37) % 360), 60 + ((i * 23) % 140), 10, 8);
    }
  } else if (motif === 'vinyl') {
    ctx.fillStyle = '#1C1215';
    ctx.beginPath();
    ctx.arc(240, 180, 105, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette[3];
    ctx.beginPath();
    ctx.arc(240, 180, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F8F0E6';
    ctx.beginPath();
    ctx.arc(240, 180, 9, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#3D202E';
    ctx.fillRect(0, 240, 480, 120);
    ctx.fillStyle = '#F8F0E6';
    ctx.fillRect(175, 150, 130, 105);
    ctx.fillStyle = '#A45939';
    ctx.fillRect(190, 162, 100, 18);
    ctx.fillStyle = '#FBCDA6';
    ctx.fillRect(225, 100, 10, 35);
    ctx.fillRect(250, 90, 10, 45);
  }
  return c.toDataURL('image/jpeg', 0.88);
}

export async function createStarterMemories(): Promise<Memory[]> {
  const kyotoImg = makeStarterPhoto(['#4B243B', '#A62B66', '#F5994A', '#FDB644'], 'torii');
  const liveImg = makeStarterPhoto(['#2C161A', '#702F53', '#95424A', '#EA6949'], 'vinyl');
  const coffeeImg = makeStarterPhoto(['#3D202E', '#582F44', '#D48A59', '#FBCDA6'], 'coffee');

  return [
    {
      id: '2025-kyoto',
      status: 'published',
      title: { zh: '京都黄昏的鸟居', en: 'Kyoto Sunset Torii' },
      story: {
        zh: '四月傍晚走过鸭川和伏见稻荷，整条街道被晚霞染成暖梅紫与落日橙。把那天的风雪与樱花装进一只小水晶球带回书桌。',
        en: 'Walking past Kamogawa at dusk in April, the whole street glowed in plum and sunset orange. Brought home that memory inside a tiny snow globe.',
      },
      date: { value: '2025-04', precision: 'month' },
      place: { zh: '日本 · 京都', en: 'Kyoto, Japan' },
      tags: ['旅行', 'Travel'],
      category: 'travel',
      archetype: 'snow_globe',
      keyColors: ['#EA6949', '#F5994A', '#FBCDA6'],
      photo: {
        web: kyotoImg,
        thumb: kyotoImg,
        width: 480,
        height: 360,
        alt: { zh: '晚霞与樱花下的红色鸟居', en: 'Red torii gate under sunset blossoms' },
      },
      sprite: {
        dataUrl: generateArchetypeSprite('snow_globe', ['#EA6949', '#F5994A', '#FBCDA6']),
        polaroidDataUrl: await generatePolaroidSprite(kyotoImg),
        size: 16,
        source: 'preset',
      },
      slotId: 'SH2',
      isNew: true,
      createdAt: '2025-04-12T10:00:00Z',
    },
    {
      id: '2025-livehouse',
      status: 'published',
      title: { zh: '秋夜 Lo-fi 现场', en: 'Autumn Lo-fi Livehouse' },
      story: {
        zh: '站在台下第二排，听合成器与黑胶采样在旧仓库里回响。散场后把皱巴巴的票根钉在了软木板上。',
        en: 'Standing second row in an old brick warehouse listening to warm synth & vinyl loops. Pinned the ticket stub straight to my corkboard.',
      },
      date: { value: '2025-10', precision: 'month' },
      place: { zh: '上海 · 育音堂', en: 'Shanghai, China' },
      tags: ['音乐', 'Music'],
      category: 'music',
      archetype: 'vinyl_ticket',
      keyColors: ['#A62B66', '#FDB644', '#F8F0E6'],
      photo: {
        web: liveImg,
        thumb: liveImg,
        width: 480,
        height: 360,
        alt: { zh: '暖紫色灯光的黑胶演出现场', en: 'Warm plum-lit vinyl livehouse stage' },
      },
      sprite: {
        dataUrl: generateArchetypeSprite('vinyl_ticket', ['#A62B66', '#FDB644', '#F8F0E6']),
        polaroidDataUrl: await generatePolaroidSprite(liveImg),
        size: 16,
        source: 'preset',
      },
      slotId: 'C2',
      createdAt: '2025-10-18T21:00:00Z',
    },
    {
      id: '2026-espresso',
      status: 'published',
      title: { zh: '窗边的手冲午后', en: 'Afternoon Pour-Over' },
      story: {
        zh: '每次卡在排版与色彩对比度的问题上时，就停下来煮一杯手冲。看着窗外斜照进来的光线，新灵感总是刚好出现。',
        en: 'Whenever I get stuck on layout rhythm or color contrast, I pause to brew coffee by the window—the afternoon light always resets my eyes.',
      },
      date: { value: '2026-08', precision: 'month' },
      place: { zh: '工作室书窗前', en: 'Studio Window' },
      tags: ['日常', 'Daily'],
      category: 'food',
      archetype: 'ramen_bowl',
      keyColors: ['#D48A59', '#F8F0E6', '#F5994A'],
      photo: {
        web: coffeeImg,
        thumb: coffeeImg,
        width: 480,
        height: 360,
        alt: { zh: '冒着热气的窗边咖啡杯', en: 'Steaming coffee cup by the window' },
      },
      sprite: {
        dataUrl: generateArchetypeSprite('ramen_bowl', ['#D48A59', '#F8F0E6', '#F5994A']),
        polaroidDataUrl: await generatePolaroidSprite(coffeeImg),
        size: 16,
        source: 'preset',
      },
      slotId: 'S1',
      createdAt: '2026-08-05T15:30:00Z',
    },
  ];
}

export function pickBestSlot(
  memories: Memory[],
  preferredZone: string,
  archetype: ArchetypeId,
  includeExpansion: boolean
): string | null {
  const occupied = new Set(memories.map((m) => m.slotId).filter(Boolean));
  const candidates = ROOM_SLOTS.filter((s) => !s.isExpansion || includeExpansion);

  // 1. Preferred zone + archetype accepted
  const exact = candidates.find(
    (s) => !occupied.has(s.id) && s.zone === preferredZone && s.accepts.includes(archetype)
  );
  if (exact) return exact.id;

  // 2. Any free slot accepting archetype
  const byArchetype = candidates.find((s) => !occupied.has(s.id) && s.accepts.includes(archetype));
  if (byArchetype) return byArchetype.id;

  // 3. Any free slot
  const anyFree = candidates.find((s) => !occupied.has(s.id));
  return anyFree ? anyFree.id : null;
}

export function t(item: { zh: string; en: string }, lang: Lang): string {
  return lang === 'zh' ? item.zh : item.en;
}
