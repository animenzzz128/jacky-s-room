# Jacky's Room · 像素小屋

一个可以点来点去的像素风个人主页：黄昏书房里坐着我的 Q 版形象，点房间里的物件就能看到经历、项目、爱好；我的照片会变成房间里的像素小摆件，点开能看到照片和背后的故事。

## 目录

| 路径 | 是什么 |
|------|--------|
| `prototype/` | **网站本体**（纯 HTML / CSS / JS，无构建）。说明见 [prototype/README.md](prototype/README.md)，交接说明见 [prototype/STUDIO-HANDOFF.md](prototype/STUDIO-HANDOFF.md) |
| `server.ts` | Node 服务器：静态托管 `prototype/`（AI Studio / Cloud Run 发布用），没有后端接口 |
| `metadata.json` | AI Studio 的项目信息 |
| `tools/` | `add_memory.py`（照片 → 房间摆件）；美术工具：`pixel_snap.py`（AI 图吸附成真像素）、`draw_room.py`（逐像素画整间房）、`make_outpaint.py` / `merge_outpaint.py`（用生图工具扩图） |
| `.claude/skills/add-memory/` | 照片摆件的聊天工作流说明（Claude Code 会自动读取） |
| `art-source/` | 原始插画、扩图画布和说明；`memories/` 里是照片摆件的像素网格原稿 |
| `pixel-room-spec.md` | 完整设计稿与需求 |

## 运行

```bash
cd prototype
python tools/serve.py
```

打开 http://127.0.0.1:5173 。网站是纯静态的，不需要任何 API key。

AI Studio 发布时用的是 `server.ts`（`npm install` 后 `npm run dev`，默认端口 3000，被占用时用 `PORT=3010 npm run dev`），它只是把 `prototype/` 原样托管出去。

## 往房间里加照片

网站上没有上传按钮。加照片的方式是在 Claude Code 里打开这个仓库，直接在聊天里说：

> 把这张照片放进房间：（照片）故事是……，2025 年 7 月在京都。

Claude 会按 `.claude/skills/add-memory/SKILL.md`：看照片 → 画一个代表它的 12×14 像素小物件（或者做成像素拍立得）→ 选一个合适的槽位 → 运行 `tools/add_memory.py` → 给你看预览，你确认后再提交、合进 main。

- 照片如果没法直接从聊天里拿到，就放进仓库的 `photos-inbox/` 文件夹（不会被提交），或者告诉 Claude 路径
- 照片会去掉 EXIF（包括 GPS 定位），长边压到 1600px
- 改故事、换位置、撤下摆件，也是在聊天里说

## 部署注意

- AI Studio：合进 main 后，在 Settings → GitHub 里 Pull，再重新 Publish
- 也可以把 `prototype/` 原样放到任何静态托管（GitHub Pages、Vercel 等）

---

设计稿和原型代码由 Claude（Anthropic）在 Jacky Yao 的指导下起草和编写。
