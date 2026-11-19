// 静态托管 prototype/（AI Studio / Cloud Run 发布时用）。网站本身不需要任何后端接口。
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prototypeDir = path.resolve(__dirname, 'prototype');
const PORT = Number(process.env.PORT) || 3000;

const app = express();

// 不缓存，改完刷新就能看到
app.use(
  express.static(prototypeDir, {
    index: 'index.html',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store');
    },
  }),
);

// 其他 GET 路径都回到首页（深链接用的是 ?item= / ?memory=，这里只是兜底）
app.get('*', (_req, res) => {
  res.sendFile(path.join(prototypeDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Pixel Room server running on http://0.0.0.0:${PORT}`);
});
