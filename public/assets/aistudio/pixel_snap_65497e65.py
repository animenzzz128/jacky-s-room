"""把 AI 生成的「伪像素」图片变成真正的像素素材。

做的事情：
  1. （可选）把纯色背景（默认 #00FF00 绿幕）抠成透明
  2. 把每个颜色锁定到主调色板（设计稿第 3.3 节的 21 色）
  3. 按「每块取出现最多的颜色」缩小到目标像素网格，得到干净的硬边像素
  4. （可选）给物件加 1px 墨色外描边
  5. 输出 1 倍原尺寸 PNG（给代码用）+ 放大预览图（给人看）

只依赖 Pillow：  pip install pillow

用法示例：
  # 背景：缩到 480 宽，锁色，去 1 遍杂点，输出 ×4 预览
  python pixel_snap.py room_bg.png out/room_bg.png --width 480 --clean 1 --preview 4

  # 物件：绿幕抠图，缩到 32 宽，加描边
  python pixel_snap.py frog_raw.png out/frog.png --width 32 --chroma 00FF00 --outline --preview 8
"""
import argparse
import os
from collections import Counter

from PIL import Image

PALETTE = [
    "1C1215", "2C161A", "3D202E", "4B243B", "582F44", "702F53", "A62B66",
    "95424A", "EA6949", "F5994A", "FDB644", "FBCDA6", "F8F0E6", "FCB989",
    "D48A59", "F8A078", "A45939", "6B3A35", "A89060", "846030", "CCB49C",
]
INK = (0x1C, 0x12, 0x15)


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def palette_image(colors):
    flat = []
    for c in colors:
        flat.extend(hex_rgb(c))
    p = Image.new("P", (1, 1))
    p.putpalette(flat + [0] * (768 - len(flat)))
    return p


def chroma_mask(img, key, tol):
    """返回 L 模式蒙版：255 = 保留，0 = 背景。"""
    kr, kg, kb = hex_rgb(key)
    rgb = img.convert("RGB")
    mask = Image.new("L", rgb.size, 255)
    src, dst = rgb.load(), mask.load()
    w, h = rgb.size
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            if abs(r - kr) + abs(g - kg) + abs(b - kb) <= tol:
                dst[x, y] = 0
    return mask


def snap(img, out_w, out_h, pal, mask):
    """每个目标像素取对应区块里出现最多的调色板颜色。"""
    q = img.convert("RGB").quantize(palette=pal, dither=Image.Dither.NONE)
    qpx = q.load()
    mpx = mask.load() if mask else None
    w, h = img.size
    palette = q.getpalette()
    out = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
    opx = out.load()
    for ty in range(out_h):
        y0, y1 = ty * h // out_h, max((ty + 1) * h // out_h, ty * h // out_h + 1)
        for tx in range(out_w):
            x0, x1 = tx * w // out_w, max((tx + 1) * w // out_w, tx * w // out_w + 1)
            counts, solid, total = Counter(), 0, 0
            for y in range(y0, y1):
                for x in range(x0, x1):
                    total += 1
                    if mpx and mpx[x, y] == 0:
                        continue
                    solid += 1
                    counts[qpx[x, y]] += 1
            if solid * 2 < total or not counts:
                continue  # 这一块大部分是背景 → 透明
            i = counts.most_common(1)[0][0]
            opx[tx, ty] = (palette[i * 3], palette[i * 3 + 1], palette[i * 3 + 2], 255)
    return out


def clean_isolated(img, passes=1):
    """去掉孤立的杂点：一个像素和上下左右 4 个邻居都不同，且其中至少 3 个邻居颜色相同，就改成那个颜色。"""
    for _ in range(passes):
        src = img.copy().load()
        dst = img.load()
        w, h = img.size
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                c = src[x, y]
                if not c[3]:
                    continue
                nb = [src[x + 1, y], src[x - 1, y], src[x, y + 1], src[x, y - 1]]
                if c in nb:
                    continue
                top, n = Counter(nb).most_common(1)[0]
                if n >= 3 and top[3]:
                    dst[x, y] = top
    return img


def add_outline(sprite):
    w, h = sprite.size
    canvas = Image.new("RGBA", (w + 2, h + 2), (0, 0, 0, 0))
    canvas.paste(sprite, (1, 1))
    src = canvas.copy().load()
    dst = canvas.load()
    for y in range(h + 2):
        for x in range(w + 2):
            if src[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w + 2 and 0 <= ny < h + 2 and src[nx, ny][3]:
                    dst[x, y] = INK + (255,)
                    break
    return canvas


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--width", type=int, required=True, help="目标像素宽度（高度按比例）")
    ap.add_argument("--height", type=int, help="指定目标高度（不填则按比例）")
    ap.add_argument("--chroma", help="要抠掉的背景色，例如 00FF00")
    ap.add_argument("--tol", type=int, default=120, help="抠图容差（RGB 差值之和），默认 120")
    ap.add_argument("--outline", action="store_true", help="加 1px 墨色外描边（物件用）")
    ap.add_argument("--clean", type=int, default=0, help="去杂点的次数（0 = 不去，建议 1–2）")
    ap.add_argument("--no-palette", action="store_true", help="不锁定主调色板")
    ap.add_argument("--preview", type=int, default=0, help="额外输出 N 倍放大预览图")
    a = ap.parse_args()

    img = Image.open(a.input)
    out_h = a.height or round(img.height * a.width / img.width)
    mask = chroma_mask(img, a.chroma, a.tol) if a.chroma else None
    if a.no_palette:
        pal = img.convert("RGB").quantize(colors=64, dither=Image.Dither.NONE)
    else:
        pal = palette_image(PALETTE)
    result = snap(img, a.width, out_h, pal, mask)
    if a.clean:
        result = clean_isolated(result, a.clean)
    if a.outline:
        result = add_outline(result)

    os.makedirs(os.path.dirname(os.path.abspath(a.output)), exist_ok=True)
    result.save(a.output)
    print(f"已保存 {a.output}  ({result.width}×{result.height})")
    if a.preview:
        root, ext = os.path.splitext(a.output)
        prev = result.resize((result.width * a.preview, result.height * a.preview), Image.Resampling.NEAREST)
        prev.save(f"{root}@{a.preview}x{ext}")
        print(f"预览图 {root}@{a.preview}x{ext}")


if __name__ == "__main__":
    main()
