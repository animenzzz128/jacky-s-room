"""从吸附好的背景图生成原型用的角色眼睛补丁。

背景图本身是 wink（画面右边那只眼闭着）。补丁：
  eye_open_r.png   盖在闭着的那只眼上 → 两只眼都睁开（默认状态）
  eye_closed_l.png 盖在睁开的那只眼上 → 配合不盖 eye_open_r = 眨眼（两只都闭）

坐标都写死在下面，对应 assets/bg/room.png（240×135）。换背景图后要重新量坐标。

用法（在 prototype 目录下）：
  python tools/build_art.py
"""
from collections import Counter

from PIL import Image

BG = "assets/bg/room.png"
OUT = "assets/avatar/"


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def is_dark(c):
    return lum(c) < 40


def is_eye(c):
    """眼睛像素：深色瞳孔、棕色下半瞳孔、奶白高光。"""
    if is_dark(c):
        return True
    if c == (0xFD, 0xDE, 0xBD):  # 高光
        return True
    r, g, b = c
    return r > 90 and g < 90 and b < 90 and lum(c) < 120  # 棕色瞳孔


def main():
    bg = Image.open(BG).convert("RGB")
    px = bg.load()

    # 皮肤主色 = 左眼镜片内部最常见的浅色
    skin = Counter(px[x, y] for x in range(110, 120) for y in range(66, 76) if lum(px[x, y]) > 205).most_common(1)[0][0]
    ink = px[138, 66]  # wink 线条的颜色

    # ---- 补丁 A：把右边闭着的眼睛改成睁开 ----
    ax, ay, aw, ah = 130, 63, 20, 12
    a = bg.crop((ax, ay, ax + aw, ay + ah)).convert("RGBA")
    apx = a.load()
    for y in range(64, 74):           # 镜片内部
        for x in range(131, 149):
            if is_dark(px[x, y]):
                apx[x - ax, y - ay] = skin + (255,)
    for y in range(66, 75):           # 复制左眼 → 右移 25、上移 1
        for x in range(111, 120):
            c = px[x, y]
            if is_eye(c):
                apx[x + 25 - ax, y - 1 - ay] = c + (255,)
    a.save(OUT + "eye_open_r.png")

    # ---- 补丁 B：把左边睁开的眼睛闭上 ----
    bx, by, bw, bh = 109, 65, 12, 12
    b = bg.crop((bx, by, bx + bw, by + bh)).convert("RGBA")
    bpx = b.load()
    for y in range(66, 76):
        for x in range(110, 120):
            if is_eye(px[x, y]):
                bpx[x - bx, y - by] = skin + (255,)
    # 闭眼线 = 把原图 wink 线条水平镜像到左眼（x' = 254 - x，下移 2 行），保持同一种画法
    for y in range(65, 71):
        for x in range(134, 147):
            if is_dark(px[x, y]):
                mx, my = 254 - x, y + 2
                if 109 <= mx <= 120:
                    bpx[mx - bx, my - by] = ink + (255,)
    b.save(OUT + "eye_closed_l.png")

    print("skin", "#%02x%02x%02x" % skin, "ink", "#%02x%02x%02x" % ink)
    print("eye_open_r  at", (ax, ay), (aw, ah))
    print("eye_closed_l at", (bx, by), (bw, bh))


if __name__ == "__main__":
    main()
