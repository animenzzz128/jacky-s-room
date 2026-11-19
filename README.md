# Jacky's Room · 像素小屋

一个可以点来点去的像素风个人主页：黄昏书房里坐着我的 Q 版形象，点房间里的物件就能看到经历、项目、爱好；上传的照片会变成房间里的小摆件。

## 目录

| 路径 | 是什么 |
|------|--------|
| `prototype/` | **网站本体**（纯 HTML / CSS / JS，无构建）。说明见 [prototype/README.md](prototype/README.md)，交接说明见 [prototype/STUDIO-HANDOFF.md](prototype/STUDIO-HANDOFF.md) |
| `server.ts` | Node 服务器：静态托管 `prototype/`，并提供 Gemini 接口（`/api/analyze-photo` 照片 → 像素摆件、`/api/translate` 翻译） |
| `metadata.json` | AI Studio 的项目信息 |
| `tools/` | 美术工具：`pixel_snap.py`（AI 图吸附成真像素）、`draw_room.py`（逐像素画整间房）、`make_outpaint.py` / `merge_outpaint.py`（用生图工具扩图） |
| `art-source/` | 原始插画、扩图画布和说明 |
| `pixel-room-spec.md` | 完整设计稿与需求 |

## 运行

**只看网站（不需要 AI）**

```bash
cd prototype
python tools/serve.py
```

打开 http://127.0.0.1:5173 。上传照片时只能用「像素拍立得」。

**带 AI 摆件（需要 Gemini API key）**

```bash
npm install          # 或 bun install（仓库里的锁文件是 bun.lock）
cp .env.example .env    # 在 .env 里填 GEMINI_API_KEY
npm run dev
```

打开 http://localhost:3000 （端口被占用时可以用 `PORT=3010 npm run dev` 换一个）。上传照片后点「✨ 生成 AI 摆件」，Gemini 会分析照片，画一个 12×14 的像素摆件，并给出标题、故事和替代文本建议。

在 AI Studio 里运行时，API key 由 AI Studio 自动注入。

## 站长模式（上传照片只给自己用）

访客看不到「＋照片」，也调用不了 AI 接口（不会用掉你的 Gemini 额度）。

1. 生成一个足够长的随机密钥：
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
   ```
2. 把它设成服务器的环境变量 `OWNER_TOKEN`：AI Studio 里在 **Secrets** 面板添加；本地写进 `.env`。没设置时 AI 接口一律关闭。
3. 用 `你的网址/?owner` 打开网站，输入密钥，就进入站长模式（顶栏出现「站长 ✓」，点它可以退出）。密钥只存在这台设备的浏览器里，不会出现在网址里。

服务器还对 `/api` 做了限流：每个 IP 每 10 分钟最多 30 次请求。

## 部署注意

- 纯静态部署（GitHub Pages 等）也能用，只是没有 AI 摆件；如果想彻底隐藏这个选项，把 `prototype/data/scene.json` 里的 `ai.enabled` 改成 `false`
- 访客上传的照片只存在他们自己的浏览器里（IndexedDB）；正式版需要后台存储（设计稿第 12 节）

---

设计稿和原型代码由 Claude（Anthropic）在 Jacky Yao 的指导下起草和编写。
