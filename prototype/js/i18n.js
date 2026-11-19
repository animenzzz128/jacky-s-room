// 界面文字（中 / 英）。面板内容在 data/content.json。

const STRINGS = {
  loading: { zh: '正在整理房间…', en: 'Tidying up the room…' },
  loadingTips: {
    zh: ['正在给猫喂食…', '正在泡咖啡…', '正在擦眼镜…', '正在给青蛙拍灰…'],
    en: ['Feeding the cat…', 'Brewing coffee…', 'Cleaning glasses…', 'Dusting the frog…'],
  },
  roomLabel: { zh: '房间里的物件', en: 'Things in the room' },
  panHint: { zh: '← 左右滑动看看 →', en: '← Swipe to look around →' },

  // HUD
  hudSound: { zh: '声音', en: 'Sound' },
  hudSoundOn: { zh: '声音：开', en: 'Sound: on' },
  hudSoundOff: { zh: '声音：关', en: 'Sound: off' },
  hudLang: { zh: 'EN', en: '中' },
  hudLangLabel: { zh: 'Switch to English', en: '切换到中文' },
  hudList: { zh: '清单', en: 'Items' },
  hudQuick: { zh: '快速浏览', en: 'Quick view' },
  hudAlbum: { zh: '相册', en: 'Album' },
  hudUpload: { zh: '＋照片', en: '+ Photo' },
  hudContact: { zh: '联系我', en: 'Contact' },

  // 物件名称（悬停标签 & 读屏）
  hot_window: { zh: '窗户：我的足迹', en: 'Window: places I\'ve been' },
  hot_lamp: { zh: '台灯：开关灯', en: 'Lamp: lights on / off' },
  hot_books: { zh: '技能书', en: 'Skill books' },
  hot_mug: { zh: '马克杯：冷知识', en: 'Mug: fun facts' },
  hot_laptop: { zh: '笔记本电脑：工作与项目', en: 'Laptop: work & projects' },
  hot_avatar: { zh: '关于我', en: 'About me' },
  hot_headphones: { zh: '耳机：最近在听', en: 'Headphones: now playing' },
  hot_bookshelf: { zh: '书架：书单', en: 'Bookshelf: reading list' },
  hot_frog: { zh: '青蛙玩偶', en: 'Frog plush' },
  hot_cat: { zh: '小猫', en: 'Cat' },
  hot_plant: { zh: '绿萝：正在学习', en: 'Pothos: what I\'m learning' },
  hot_tallshelf: { zh: '高书架：我的经历', en: 'Tall bookshelf: my story' },
  hot_trophy: { zh: '奖杯：荣誉', en: 'Trophy: awards' },
  hot_record: { zh: '唱片机：播放 / 停止音乐', en: 'Record player: play / stop music' },
  hot_sticky: { zh: '便利贴：今年想做的事', en: 'Sticky notes: goals this year' },
  hot_chest: { zh: '收藏箱：全部记忆', en: 'Chest: all memories' },
  hot_clock: { zh: '挂钟：现在几点', en: 'Clock: what time is it' },
  hot_phone: { zh: '手机：联系我', en: 'Phone: contact me' },
  hot_calendar: { zh: '挂历：最近在忙', en: 'Calendar: what I\'m up to' },
  hot_corkboard: { zh: '软木板：照片墙', en: 'Cork board: photo wall' },
  hot_certificate: { zh: '证书：教育', en: 'Certificate: education' },
  hot_poster: { zh: '海报：爱好', en: 'Poster: hobbies' },

  // 通用
  close: { zh: '关闭', en: 'Close' },
  prev: { zh: '← 上一个', en: '← Prev' },
  next: { zh: '下一个 →', en: 'Next →' },
  more: { zh: '了解更多', en: 'Learn more' },
  back: { zh: '← 返回', en: '← Back' },
  copy: { zh: '复制', en: 'Copy' },
  copied: { zh: '已复制！', en: 'Copied!' },
  crispFont: { zh: 'Aa 清晰字体', en: 'Aa Clear font' },
  pixelFont: { zh: 'Aa 像素字体', en: 'Aa Pixel font' },

  // 面板标题
  p_about: { zh: '关于我', en: 'About me' },
  p_os: { zh: 'PixelOS', en: 'PixelOS' },
  p_timeline: { zh: '我的经历', en: 'My story' },
  p_skills: { zh: '技能书', en: 'Skill books' },
  p_music: { zh: '最近在听', en: 'Now playing' },
  p_places: { zh: '我的足迹', en: 'Places' },
  p_facts: { zh: '冷知识', en: 'Fun facts' },
  p_contact: { zh: '联系我', en: 'Contact' },
  p_quick: { zh: '快速浏览', en: 'Quick view' },
  p_list: { zh: '物件清单', en: 'All items' },
  p_album: { zh: '记忆相册', en: 'Memory album' },
  p_upload: { zh: '把照片放进房间', en: 'Put a photo in the room' },
  p_reading: { zh: '书单', en: 'Reading list' },
  p_goals: { zh: '今年想做的事', en: 'Goals this year' },
  p_awards: { zh: '荣誉', en: 'Awards' },
  p_education: { zh: '教育', en: 'Education' },
  p_now: { zh: '最近在忙', en: 'Now' },
  p_learning: { zh: '正在学习', en: 'Learning' },
  p_hobbies: { zh: '爱好', en: 'Hobbies' },
  recordOn: { zh: '♪ 放一张唱片', en: '♪ Spinning a record' },
  recordOff: { zh: '唱片停了', en: 'Record stopped' },
  clockYou: { zh: '你那边现在是 {you}', en: 'It\'s {you} where you are' },
  clockBoth: { zh: '你那边现在是 {you}，我这边是 {me}', en: 'It\'s {you} for you and {me} for me' },

  // 关于我
  nowTitle: { zh: '最近', en: 'Lately' },

  // PixelOS
  os_work: { zh: '工作经历.exe', en: 'experience.exe' },
  os_projects: { zh: '项目', en: 'projects' },
  os_resume: { zh: '简历.pdf', en: 'resume.pdf' },
  os_contact: { zh: '联系我.txt', en: 'contact.txt' },
  os_hint: { zh: '点击图标打开', en: 'Click an icon to open it' },
  os_noResume: { zh: '简历还没放上来，在 content.json 的 contact.resume 里填链接。', en: 'No resume yet. Add a link at contact.resume in content.json.' },
  os_myRole: { zh: '我的角色', en: 'My role' },
  os_open: { zh: '打开链接', en: 'Open link' },

  // 经历
  page: { zh: '第 {n} / {total} 页', en: 'Page {n} / {total}' },

  // 冷知识
  anotherFact: { zh: '再来一条', en: 'Another one' },

  // 音乐
  bgmPlay: { zh: '▶ 播放小屋背景音乐', en: '▶ Play room music' },
  bgmStop: { zh: '■ 停止背景音乐', en: '■ Stop room music' },
  bgmNote: { zh: '原型里的音乐是浏览器实时合成的，正式版换成授权的 lo-fi 曲子。', en: 'The prototype synthesizes music live. Swap in a licensed lo-fi track later.' },

  // 足迹
  lived: { zh: '住过', en: 'Lived' },
  visited: { zh: '去过', en: 'Visited' },

  // 彩蛋
  frogSay: { zh: '呱！', en: 'Ribbit!' },
  catSay: { zh: '呼噜噜～', en: 'Purrr~' },
  lampOff: { zh: '关灯了，晚安～', en: 'Lights off. Good night~' },
  lampOn: { zh: '开灯！', en: 'Lights on!' },

  // 记忆
  memory: { zh: '记忆', en: 'Memory' },
  memEmpty: { zh: '还没有记忆，上传第一张照片吧！', en: 'No memories yet. Upload your first photo!' },
  memInRoom: { zh: '在房间里', en: 'In the room' },
  memInAlbum: { zh: '在相册里', en: 'In the album' },
  memNew: { zh: '新！', en: 'New!' },
  memDelete: { zh: '删除这条记忆', en: 'Delete this memory' },
  memDeleteConfirm: { zh: '确定删除吗？删除后无法恢复。', en: 'Delete this memory? This cannot be undone.' },
  memHide: { zh: '从房间里收起', en: 'Remove from room' },
  memSaved: { zh: '已经放进房间啦！', en: 'It\'s in the room now!' },
  memFull: { zh: '房间放满啦，已经收进相册。', en: 'The room is full, so it went into the album.' },
  memNote: { zh: '原型说明：照片只保存在这台电脑的浏览器里，不会上传到任何地方。', en: 'Prototype note: photos stay in this browser only and are never uploaded.' },
  up_photo: { zh: '选择照片', en: 'Choose a photo' },
  up_title: { zh: '标题', en: 'Title' },
  up_date: { zh: '日期', en: 'Date' },
  up_place: { zh: '地点', en: 'Place' },
  up_story: { zh: '照片背后的故事', en: 'The story behind it' },
  up_tags: { zh: '标签（用逗号分开）', en: 'Tags (comma separated)' },
  up_preview: { zh: '选一种摆件', en: 'Pick an object style' },
  up_kind_polaroid: { zh: '像素拍立得', en: 'Pixel polaroid' },
  up_kind_ai: { zh: 'AI 摆件', en: 'AI object' },
  up_ai_make: { zh: '生成 AI 摆件', en: 'Make AI object' },
  up_ai_idle: { zh: '选好照片后，可以让 AI 把它变成一个小摆件', en: 'After choosing a photo, let AI turn it into a little object' },
  up_ai_off: { zh: 'AI 摆件没有开启（scene.json 的 ai.enabled）', en: 'AI objects are off (ai.enabled in scene.json)' },
  up_ai_loading: { zh: 'AI 正在看照片、画摆件…（10–30 秒）', en: 'AI is looking at the photo and drawing… (10–30 s)' },
  up_ai_done: { zh: 'AI 把它变成了：{motif}', en: 'AI turned it into: {motif}' },
  up_ai_failed: { zh: 'AI 摆件这次没成功：{reason}。可以先用拍立得。', en: 'AI object failed: {reason}. The polaroid still works.' },
  up_ai_nokey: { zh: '服务器没有配置 GEMINI_API_KEY', en: 'GEMINI_API_KEY is not set on the server' },
  up_ai_static: { zh: '当前是纯静态部署，没有 AI 后端', en: 'this is a static deploy with no AI backend' },
  up_ai_bad: { zh: 'AI 画出来的摆件太空了', en: 'the AI drawing came back nearly empty' },
  up_ai_note: { zh: '点「生成」时，这张照片会发给 Gemini 分析；不点就不会发送。', en: 'Clicking “Make” sends this photo to Gemini for analysis; nothing is sent otherwise.' },
  up_people: { zh: '照片里有其他人，我已经取得他们的同意', en: 'There are other people in this photo and I have their consent' },
  up_people_need: { zh: '照片里有其他人，请先勾选确认已取得同意', en: 'Please confirm you have consent from the people in this photo' },
  up_save: { zh: '放进房间', en: 'Put it in the room' },
  up_cancel: { zh: '取消', en: 'Cancel' },
  up_needPhoto: { zh: '先选一张照片', en: 'Choose a photo first' },
  up_needTitle: { zh: '写个标题吧', en: 'Add a title' },

  // 快速浏览
  q_intro: { zh: '不想逛房间？这里是全部内容。', en: 'In a hurry? Everything is here.' },
  q_experience: { zh: '经历', en: 'Experience' },
  q_projects: { zh: '项目', en: 'Projects' },
  q_timeline: { zh: '时间线', en: 'Timeline' },
  q_skills: { zh: '技能', en: 'Skills' },
  q_memories: { zh: '记忆', en: 'Memories' },
};

let lang = 'zh';

export function initLang() {
  const saved = localStorage.getItem('room.lang');
  if (saved === 'zh' || saved === 'en') lang = saved;
  else lang = (navigator.language || 'zh').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  return lang;
}

export function getLang() {
  return lang;
}

export function setLang(next) {
  lang = next;
  localStorage.setItem('room.lang', lang);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
}

/** UI 文字：s('close') / s('page', {n:1,total:3}) */
export function s(key, vars) {
  const entry = STRINGS[key];
  if (!entry) return key;
  let text = entry[lang] ?? entry.zh;
  if (vars && typeof text === 'string') {
    for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
  }
  return text;
}

/** 内容文字：{zh, en} → 当前语言；字符串原样返回 */
export function t(value) {
  if (value == null) return '';
  if (typeof value === 'string' || Array.isArray(value)) return value;
  return value[lang] ?? value.zh ?? '';
}
