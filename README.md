# Jacky's Room · 像素小屋

一个可以点来点去的像素风个人主页：黄昏书房里坐着我的 Q 版形象，点房间里的物件就能看到经历、项目、爱好；上传的照片会变成房间里的小摆件。

## 目录

| 路径 | 是什么 |
|------|--------|
| `prototype/` | **网站本体**（纯 HTML / CSS / JS，无构建）。说明见 [prototype/README.md](prototype/README.md)，交接说明见 [prototype/STUDIO-HANDOFF.md](prototype/STUDIO-HANDOFF.md) |
| `server.ts` | AI Studio 生成的 Node 服务器：静态托管 `prototype/`，并提供 Gemini 接口（`/api/analyze-photo` 照片 → 像素摆件、`/api/translate`、`/api/design-audit`） |
| `src/`、根目录 `index.html` | AI Studio 早期生成的 React 版本，**目前没有被使用**（`server.ts` 把 `/` 交给了 `prototype/`） |
| `tools/` | 美术工具：`pixel_snap.py`（AI 图吸附成真像素）、`draw_room.py`（逐像素画整间房）、`make_outpaint.py` / `merge_outpaint.py`（用生图工具扩图） |
| `art-source/` | 原始插画、扩图画布和说明 |
| `pixel-room-spec.md` | 完整设计稿与需求 |
| `public/assets/aistudio/` | 上传到 AI Studio 时的附件副本 |

## 运行

**只看网站（不需要 AI）**

```bash
cd prototype
python tools/serve.py
```

打开 http://127.0.0.1:5173 。上传照片时只能用「像素拍立得」。

**带 AI 摆件（需要 Gemini API key）**

```bash
npm install
cp .env.example .env    # 在 .env 里填 GEMINI_API_KEY
npm run dev
```

打开 http://localhost:3000 。上传照片后点「✨ 生成 AI 摆件」，Gemini 会分析照片，画一个 12×14 的像素摆件，并给出标题、故事和替代文本建议。

在 AI Studio 里运行时，API key 由 AI Studio 自动注入。

## 部署注意

- 纯静态部署（GitHub Pages 等）也能用，只是没有 AI 摆件；如果想彻底隐藏这个选项，把 `prototype/data/scene.json` 里的 `ai.enabled` 改成 `false`
- 访客上传的照片只存在他们自己的浏览器里（IndexedDB）；正式版需要后台存储（设计稿第 12 节）

---

设计稿和原型代码由 Claude（Anthropic）在 Jacky Yao 的指导下起草和编写。
