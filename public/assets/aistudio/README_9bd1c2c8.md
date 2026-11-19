# 像素小屋 · 可交互原型

纯 HTML / CSS / JavaScript，没有依赖，不需要安装任何东西（只需要 Python 来开一个本地服务器）。

## 怎么打开

```bash
cd prototype
python tools/serve.py
```

然后在浏览器打开 http://127.0.0.1:5173 。

> 直接双击 `index.html` 打不开：浏览器不允许本地文件读取 JSON 和 JS 模块，必须通过服务器访问。

## 已经能用的功能

| 功能 | 说明 |
|------|------|
| 房间 | 240×135 像素画布，整数倍放大，像素始终清晰；手机竖屏可以左右滑动 |
| 角色 | 默认睁眼，随机眨眼，偶尔 wink；鼠标悬停在角色上会 wink |
| 环境动效 | 窗前灰尘、马克杯热气、城市窗灯随机亮灭、台灯光晕 |
| 物件交互 | 10 个物件：悬停出现四角选择框和名称，点击打开对应面板或彩蛋 |
| 面板 | 关于我、PixelOS（工作经历 / 项目 / 简历 / 联系）、经历时间轴（翻书）、技能书、最近在听、足迹明信片、冷知识、联系我 |
| 彩蛋 | 台灯开关灯（夜晚模式）、青蛙跳（连点 5 次有隐藏台词）、摸猫冒爱心、耳机播放实时合成的 lo-fi 背景音乐 |
| 记忆物件 | 右上角「＋照片」上传 → 自动生成像素拍立得 → 放进空槽位（共 10 个）→ 点击后飞出、翻转、马赛克逐步变清晰、打字机讲故事；槽位满了自动进相册 |
| 其他 | 中 / 英切换、快速浏览（纯文字版）、物件清单、键盘操作（Tab / Enter / Esc）、减弱动效、深链接 `?item=laptop` / `?memory=id`、iframe 嵌入通信 |

## 改文字内容

所有文字都在 `data/content.json`，带【示例】的是占位，直接替换。每一项都有 `zh` 和 `en`。

- 名字：`profile.name`
- 欢迎语：`bubble.first` / `bubble.again`
- 经历、项目、时间轴、技能、歌单、足迹、冷知识、联系方式：对应同名字段
- 简历：把 PDF 链接填进 `contact.resume`
- 预置的示例记忆：`seedMemories`（可以删掉，或者换成你自己的照片放在 `assets/memories/`）

界面上的按钮文字在 `js/i18n.js`。

## 改物件位置

`data/scene.json` 里的坐标都是**背景图上的像素坐标**（240×135）：

- `hotspots`：可以点的物件和点击区域 `hitbox`，以及它打开哪个面板（`panel`）或触发什么（`action`）
- `slots`：记忆摆件的槽位（`stand` = 立在台面上，`pin` = 钉在墙上）
- `fx`：灰尘、热气、窗灯、台灯光晕、青蛙、音符、爱心的位置
- `avatar`：眼睛补丁的位置、欢迎气泡指向的点

## 换美术

1. 用上一层目录的 `tools/pixel_snap.py` 把新的生成图吸附成 240 宽的像素图，保存为 `assets/bg/room.png`
2. 重新量 `data/scene.json` 里的坐标
3. 眼睛补丁：`tools/build_art.py` 里的坐标是按现在这张图写死的，换图后要改坐标再运行 `python tools/build_art.py`

原始插画在上一层目录的 `art-source/room_original.png`。

## 嵌入到个人网站

```html
<iframe src="https://你的域名/room/?embed=1" title="像素小屋"
        style="width:100%; aspect-ratio:16/9; border:0" loading="lazy"></iframe>
```

- `?embed=1` 会隐藏「＋照片」按钮
- 小屋会向主站发 `postMessage`：`room:ready`、`room:open`
- 主站可以发 `{type:'room:open', item:'laptop'}` 打开某个物件、`{type:'room:mute'}` 静音；必须先把主站域名加进 `scene.json` 的 `embed.allowedOrigins`

## 还没做 / 已知限制

- **照片只存在当前浏览器里**（IndexedDB），换电脑或清缓存就没了；正式版需要后台和存储（设计稿第 12 节）
- **还没有 AI 物件化**：现在每张照片都变成像素拍立得（设计稿里的「兜底样式」），AI 生成水晶球、票根等摆件是 M3
- 拍立得只有 8×7 像素，只能看出大概的颜色和构图（蓝天、大海、树木会保留成低饱和的蓝绿色，见 `js/memories.js` 里的 `PHOTO_ACCENTS`；想完全统一成黄昏色，把 `makePolaroid` 的 `keepColor` 默认值改成 `false`）
- 物件都画在背景图里（附录 D 的路线 A），所以悬停只能显示四角框，不能给物件本身描边，物件也不能单独动（青蛙跳是特殊处理）
- 角色只有眨眼和 wink，没有喝咖啡、伸懒腰、看向物件这些动作（需要分层的角色精灵图）
- 背景音乐是浏览器实时合成的占位，正式版换授权曲目
- 手机竖屏时房间上下留白较多

## 文件结构

```
prototype/
├── index.html
├── css/style.css
├── js/
│   ├── main.js       入口：加载、物件热区、顶栏、深链接、嵌入通信
│   ├── room.js       画布：缩放、绘制、眼睛、粒子、灯光、选择框
│   ├── ui.js         悬停标签、气泡、面板、焦点管理、打字机
│   ├── panels.js     各物件对应的面板内容
│   ├── memories.js   照片 → 像素拍立得、槽位、上传、相册、显影动画
│   ├── sound.js      音效和背景音乐（WebAudio 合成）
│   └── i18n.js       中英文界面文字
├── data/
│   ├── scene.json    坐标：物件、槽位、特效
│   └── content.json  文字内容
├── assets/           背景、眼睛补丁、字体、光标、示例照片
└── tools/
    ├── serve.py      本地预览服务器（不缓存）
    └── build_art.py  生成眼睛补丁
```

## 授权

- 字体：Fusion Pixel Font 12px（SIL Open Font License 1.1），见 `assets/fonts/OFL.txt`
- 背景插画：Jacky 用 AI 生成的原图，经过像素网格吸附处理

---

原型代码由 Claude（Anthropic）在 Jacky Yao 的指导下编写。
