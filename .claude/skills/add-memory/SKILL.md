---
name: add-memory
description: 把用户在聊天里发来的照片和介绍做成像素小屋里的照片摆件（画 12×14 像素小物件、选槽位、写进 prototype/data/memories.json），也负责修改或撤下已有摆件。用户说「把这张照片放进房间」「加个摆件」「这张照片的故事是…」「换个位置」「把那个摆件撤掉」时使用。
---

# 照片 → 房间摆件

网站本身没有上传功能。用户在聊天里发照片和介绍，由你来做：
看照片 → 画一个代表它的像素小物件 → 选槽位 → 运行脚本 → 检查效果 → 用户确认后提交。

所有命令都在仓库根目录运行。脚本是 `tools/add_memory.py`，需要 Pillow。

## 1. 拿到照片文件

脚本要读真实的照片文件，聊天里看到的图片不一定已经存在电脑上。按顺序找：

1. 用户给的路径
2. `~/.claude/uploads/` 里本次会话的文件夹（按修改时间找最新的图片）
3. 仓库里的 `photos-inbox/`（已加入 .gitignore，原图不会被提交）

都找不到就请用户把照片放进 `photos-inbox/`，或者告诉你路径。
不要根据聊天里看到的图片自己重新画一张「照片」来代替。

HEIC 格式 Pillow 读不了，请用户导出成 JPG。

## 2. 写介绍

先看清照片内容，再写一个 JSON 文件（放在临时目录里，不要提交）：

```json
{
  "id": "2025-kyoto-trip",
  "title": { "zh": "京都的雨天", "en": "A rainy day in Kyoto" },
  "date": "2025-07",
  "place": { "zh": "京都", "en": "Kyoto" },
  "story": { "zh": "……", "en": "……" },
  "tags": ["旅行", "travel"],
  "alt": { "zh": "雨中的石板路和红色鸟居", "en": "A stone path and red torii gate in the rain" }
}
```

- `id`：小写字母、数字、连字符，建议「年份-主题」
- `title`、`story` 尽量用用户自己的话，只做轻微润色；英文是翻译。用户没讲故事时先问，不要替用户编经历或感受
- `alt` 是给读屏软件的照片描述，你看照片来写
- 缺日期或地点就留空，不要猜

**隐私检查**：照片会公开在网站和 GitHub 仓库里。照片里有其他人的脸、证件、地址、车牌、屏幕上的私人信息时，先问用户是否确定要公开。脚本会去掉 EXIF（包括 GPS 定位）。

## 3. 画摆件

默认画一个**专属小物件**来代表这张照片，比如：拉面照片 → 一碗拉面；演唱会 → 门票或荧光棒；旅行 → 雪球、明信片、纪念品；毕业 → 学士帽；宠物 → 小玩偶。
照片本身就适合直接展示时（合照、风景）可以不给网格，脚本会生成**像素拍立得**。

网格文件：最多 14 行 × 12 列，每个字母代表一种颜色，`.` 是透明，以 `#` 开头的行是注释。
用 `python tools/add_memory.py --palette` 查看全部字母。常用的有：

| 字母 | 用途 | 字母 | 用途 |
|---|---|---|---|
| `K` | 1px 描边（最深） | `W` | 高光（少用） |
| `D` `d` `M` | 阴影、木头、梅紫 | `T` `t` `S` | 棕、赤陶、肤色 |
| `O` `o` `Y` | 橘、浅橘、琥珀 | `R` `r` `c` | 洋红、砖红、珊瑚 |
| `P` `p` `L` | 纸、桃色、卡其 | `B` `b` `i` `N` | 蓝（天空、海） |
| `V` `v` `e` `E` | 绿（植物） | | |

画法要求（和房间里其他物件保持一致）：

- 外轮廓一圈 `K` 描边；光从左上方来，左上用亮色、右下用暗色
- 最下面一行贴着台面（钉墙槽位则贴着图钉，顶部居中）；不够 14 行时脚本会从上面补透明
- 轮廓要一眼认得出来，至少填满一半面积；`W` 只用在 1–3 个高光点
- 优先用黄昏主色；蓝色和绿色只在照片的主题需要时使用

```
# 例：小雪球
...KKKKKK...
..KbiiiibK..
.KbiWiibbiK.
.KiWibbbbiK.
.KibbVvbbbK.
.KbbVvvVbbK.
.KbVvVvvVbK.
..KbbttbbK..
...KKKKKK...
..KTTTTTTK..
.KTYTTTTYTK.
.KttttttttK.
.KKKKKKKKKK.
```

## 4. 选槽位

```bash
python tools/add_memory.py --list --map <临时目录>/slot-map.png
```

`--list` 列出每个区域的空位，`--map` 画一张标了编号的房间图（黄框是空位）。按主题选：

| 区域 | 槽位 | 类型 | 适合 |
|---|---|---|---|
| 窗台（角色左后方） | S1–S4 | 台面 | 最显眼，放最重要的 |
| 左边书架 | B1–B9 | 台面 | 读书、学习、奖杯类 |
| 书桌 | D1–D3 | 台面 | 日常小物、食物 |
| 右边书架 | U1–U3、H1–H2 | 台面 | 收藏、纪念品 |
| 左上相片绳 | L1–L4 | 钉墙 | 拍立得、合照 |
| 窗户左侧墙面 / 书架下方墙面 | P1–P3、W1–W2 | 钉墙 | 拍立得、明信片 |
| 右侧软木板 | C1–C6 | 钉墙 | 门票、明信片、扁平的小东西 |

立体的小物件放「台面」槽位，扁平的东西和拍立得放「钉墙」槽位。不指定时脚本自动选：小物件优先台面，拍立得优先钉墙。槽位满了就只放进相册。

## 5. 运行脚本并检查

```bash
python tools/add_memory.py --photo <照片> --entry <介绍.json> --grid <网格.txt> --slot B4 --preview <临时目录>/preview.png
```

- 用 Read 看预览图：左边是房间局部（放大 4 倍），右边是摆件放大 8 倍。看不出是什么就改网格，加 `--replace` 重跑
- 再在浏览器里确认：`cd prototype && python tools/serve.py`，打开 `http://127.0.0.1:5173/?memory=<id>`，检查摆件、飞出动画、照片卡片和中英文切换
- 把预览图发给用户（SendUserFile），说明放在了哪里

脚本会写这些文件：`prototype/assets/memories/<id>.jpg`（处理过的照片）、`<id>.sprite.png`（摆件）、`art-source/memories/<id>.txt`（网格原稿），以及 `prototype/data/memories.json` 里的一条记录。

## 6. 用户确认后提交

用户同意后再提交。按这个仓库的习惯：新建分支 → 提交 → 推送 → 开 PR → 合进 main。
提醒用户：AI Studio 要在 Settings → GitHub 里 Pull，然后重新 Publish，网站上才会出现。

## 修改和撤下

- **改文字或换位置**：改介绍 JSON，然后加 `--replace` 重跑。照片可以直接用 `prototype/assets/memories/<id>.jpg`；不给 `--grid` 会变回拍立得，所以要保留小物件就把 `art-source/memories/<id>.txt` 传给 `--grid`。`--slot none` 表示只放进相册
- **撤下**：从 `prototype/data/memories.json` 删掉这条记录，再把 `<id>.jpg`、`<id>.sprite.png`、`art-source/memories/<id>.txt` 移到回收站（不要永久删除）
