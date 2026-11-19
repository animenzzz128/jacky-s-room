"""本地预览服务器（不缓存，改完文件刷新就能看到）。

用法（在 prototype 目录下）：
  python tools/serve.py          # 打开 http://127.0.0.1:5173
  python tools/serve.py 8080     # 换端口
"""
import functools
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".json": "application/json",
        ".woff2": "font/woff2",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    handler = functools.partial(NoCacheHandler, directory=root)
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"像素小屋：http://127.0.0.1:{port}  （Ctrl+C 停止）")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
