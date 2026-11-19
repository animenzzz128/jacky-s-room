"""手绘（逐像素）整间房：把现在的书桌特写放在正中 1/4，四周按设计稿原始线框画满。

输出 prototype/assets/bg/room-full.png（480×270）和 4 倍预览。
以后如果有生图工具扩出来的更好的版本，用 tools/merge_outpaint.py 生成同名文件替换即可。

用法（在 pixel-room 目录下）：
  python tools/draw_room.py
"""
import math
import random

from PIL import Image

random.seed(11)
W, H = 480, 270
CX, CY = 120, 67
center = Image.open("prototype/assets/bg/room.png").convert("RGB")
cpx = center.load()
img = Image.new("RGB", (W, H))
px = img.load()

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def hx(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


C = {k: hx(v) for k, v in {
    "K": "1c1215", "D": "2c161a", "P": "3d202e", "M": "4b243b", "V": "582f44", "U": "702f53",
    "G": "a62b66", "B": "95424a", "C": "ea6949", "O": "f5994a", "A": "fdb644", "a": "c27a2c",
    "Y": "fbcda6", "W": "f8f0e6", "S": "fcb989", "s": "d48a59", "R": "a45939", "r": "6b3a35",
    "L": "a89060", "l": "846030", "T": "ccb49c", "t": "8f7a68", "n": "87414b", "m": "673638",
    "d": "793257", "e": "5c2546", "f": "45263a", "w": "25181d", "x": "211519", "h": "2a1b21",
    "q": "221519", "N": "4b5f86", "Q": "7f97b8",
}.items()}


def put(x, y, c):
    if 0 <= x < W and 0 <= y < H:
        px[x, y] = c


def rect(x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(x, y, c)


def frame(x0, y0, x1, y1, c=C["K"]):
    for x in range(x0, x1 + 1):
        put(x, y0, c)
        put(x, y1, c)
    for y in range(y0, y1 + 1):
        put(x0, y, c)
        put(x1, y, c)


def dither(x0, y0, x1, y1, c, level):
    """在区域里按 Bayer 抖动叠一层颜色（level 0–16）"""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if BAYER[y % 4][x % 4] < level:
                put(x, y, c)


def mix(c1, c2, t):
    return tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))


def pattern(rows, x, y, cmap=None):
    cmap = cmap or C
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch in cmap:
                put(x + i, y + j, cmap[ch])


def box(x0, y0, x1, y1, fill, hi=None, lo=None):
    """带墨色描边、左上高光、右下阴影的盒子"""
    rect(x0, y0, x1, y1, fill)
    if hi:
        for x in range(x0 + 1, x1):
            put(x, y0 + 1, hi)
        for y in range(y0 + 1, y1):
            put(x0 + 1, y, hi)
    if lo:
        for x in range(x0 + 1, x1):
            put(x, y1 - 1, lo)
        for y in range(y0 + 1, y1):
            put(x1 - 1, y, lo)
    frame(x0, y0, x1, y1)


def book(x, bottom, w, h, col, lean=0):
    """立着的书：x 左边，bottom 底边 y"""
    top = bottom - h + 1
    dark = mix(col, C["K"], 0.45)
    light = mix(col, C["W"], 0.25)
    for y in range(top, bottom + 1):
        off = round(lean * (bottom - y) / h)
        for i in range(w):
            c = col
            if i == 0:
                c = light
            if i == w - 1:
                c = dark
            put(x + i + off, y, c)
        put(x - 1 + off, y, C["K"])
        put(x + w + off, y, C["K"])
    for i in range(-1, w + 1):
        put(x + i + round(lean), top - 1, C["K"])
    # 书脊上的横纹
    band = top + max(2, h // 4)
    for i in range(w):
        put(x + i + round(lean * (bottom - band) / h), band, light if i else C["W"])


def books_row(x0, x1, bottom, hmin, hmax, palette, stop=None):
    x = x0
    while x < x1 - 3:
        w = random.choice([3, 3, 4, 4, 5])
        if stop and x + w > stop:
            break
        h = random.randint(hmin, hmax)
        book(x + 1, bottom, w, h, random.choice(palette))
        x += w + 1
    return x


BOOK_COLORS = [C["U"], C["n"], C["B"], C["R"], C["V"], C["l"], C["G"], C["m"], C["a"], C["N"]]

# ---------------------------------------------------------------- 1. 墙面
for y in range(H):
    for x in range(W):
        c = C["w"]
        if x % 12 == 0 and (y // 2) % 2 == 0:
            c = C["h"]  # 竖条壁纸
        elif BAYER[y % 4][x % 4] < 2:
            c = C["x"]
        px[x, y] = c
rect(0, 0, W - 1, 2, C["K"])  # 天花板阴影
rect(0, 3, W - 1, 3, C["q"])

# ---------------------------------------------------------------- 2. 中间画面向上延伸（窗户、窗框、书架立柱）
for x in range(CX, CX + 160):
    col = cpx[x - CX, 0]
    glass = 150 <= x <= 237 and not (173 <= x <= 178)
    for y in range(10, CY):
        if glass:
            # 天空越往上越暗，用抖动过渡
            k = (CY - y) / (CY - 27)
            c = mix(col, C["P"], min(0.75, k * 0.75))
            c2 = mix(col, C["P"], min(0.75, k * 0.75 + 0.18))
            put(x, y, c2 if BAYER[y % 4][x % 4] < 6 else c)
        else:
            put(x, y, col)
# 星星
for _ in range(16):
    sx, sy = random.randint(152, 236), random.randint(28, 60)
    if not 173 <= sx <= 178:
        put(sx, sy, C["Y"] if random.random() < 0.6 else C["W"])
# 窗户顶框：外沿高光线 / 浅紫框板 / 深色内沿（和左右两侧的结构一致）
outer = cpx[11, 40]
panel = cpx[20, 40]
inner = cpx[28, 40]
rect(130, 7, 269, 9, outer)
rect(133, 10, 266, 23, panel)
rect(147, 24, 240, 26, inner)
for x in range(133, 267, 2):
    put(x, 10, mix(panel, C["W"], 0.15))
frame(129, 6, 270, 26)
for y in range(27, CY):  # 左右框外侧描边
    put(129, y, C["K"])
    put(270, y, C["K"])

# ---------------------------------------------------------------- 3. 右上书架：往上加一层 + 往右延伸
post_a = [cpx[161, y] for y in range(0, 1)][0]
post_b = cpx[171, 2]
board_rows = [cpx[239, y] for y in range(26, 31)]       # 中间画面里的层板颜色（从上到下）
board2_rows = [cpx[239, y] for y in range(56, 63)]
inside = cpx[236, 2]
SH_X0, SH_X1 = 278, 396
# 立柱向上到顶
for y in range(28, CY):
    for x in (280, 281, 282):
        put(x, y, cpx[x - CX, 0])
    for x in (290, 291, 292):
        put(x, y, cpx[x - CX, 0])
rect(293, 34, SH_X1 - 9, CY - 1, inside)
rect(283, 28, 289, CY - 1, cpx[165, 0])
# 顶板（书架顶）
rect(SH_X0, 28, SH_X1, 33, board_rows[1])
rect(SH_X0, 28, SH_X1, 28, board_rows[0])
rect(SH_X0, 33, SH_X1, 33, board_rows[-1])
frame(SH_X0 - 1, 27, SH_X1 + 1, 34)
# 中间层板（中间画面顶端上方）
for i, c in enumerate(board_rows):
    rect(293, 62 + i, SH_X1 - 9, 62 + i, c)
# 上层：一排书 + 空位
books_row(294, 336, 61, 18, 25, BOOK_COLORS)
# 往右延伸的部分（x 360–396）
for y in range(CY, 130):
    for x in range(360, SH_X1 - 8):
        put(x, y, inside)
for i, c in enumerate(board_rows):
    rect(360, 93 + i, SH_X1 - 9, 93 + i, c)
for i, c in enumerate(board2_rows):
    rect(360, 123 + i, SH_X1 - 9, 123 + i, c)
books_row(360, 368, 92, 16, 22, BOOK_COLORS)
books_row(360, 386, 122, 14, 21, BOOK_COLORS)
# 右侧立柱
for y in range(28, 130):
    for x in (384, 385, 386):
        put(x, y, cpx[161 + (x - 384), 10])
    for x in (387, 388, 389, 390, 391):
        put(x, y, cpx[165, 10])
    for x in (392, 393, 394):
        put(x, y, cpx[171 + (x - 392), 10])
    put(395, y, C["K"])
rect(SH_X0 - 1, 129, SH_X1, 130, C["K"])
# 书架顶上：小盆栽 + 一摞平放的书
pattern([
    "...ll.l...",
    "..lLLlLl..",
    ".lLLlLLLl.",
    "..lLLLLl..",
    "KKKKKKKKKK",
    "KrRRRRRRrK",
    ".KrRRRRrK.",
    ".KrRRRRrK.",
    "..KKKKKK..",
], 298, 18)
for i, (col, w) in enumerate([(C["U"], 22), (C["R"], 20), (C["n"], 23)]):
    y = 25 - i * 3
    rect(360 - (w - 20) // 2, y, 360 + w - (w - 20) // 2, y + 2, col)
    frame(359 - (w - 20) // 2, y - 1, 361 + w - (w - 20) // 2, y + 3)

# ---------------------------------------------------------------- 4. 左墙：高书架（展示照片的空位多）
BX0, BY0, BX1, BY1 = 8, 52, 100, 160
box(BX0, BY0, BX1, BY1, C["m"], hi=C["n"], lo=C["r"])
rect(BX0 + 4, BY0 + 5, BX1 - 4, BY1 - 22, C["q"])  # 内部
for j in range(BY0 + 5, BY1 - 22):  # 内部背板竖纹
    for i in range(BX0 + 4, BX1 - 3, 9):
        put(i, j, C["D"])
shelf_y = [79, 107, 135]
for sy in shelf_y:
    rect(BX0 + 1, sy, BX1 - 1, sy + 3, C["n"])
    rect(BX0 + 1, sy + 3, BX1 - 1, sy + 3, C["m"])
    rect(BX0 + 1, sy - 1, BX1 - 1, sy - 1, C["K"])
    rect(BX0 + 1, sy + 4, BX1 - 1, sy + 4, C["K"])
books_row(BX0 + 5, 50, shelf_y[0] - 1, 14, 20, BOOK_COLORS)
books_row(BX0 + 5, 48, shelf_y[1] - 1, 13, 21, BOOK_COLORS)
# 第 3 层：奖杯 + 几本书
pattern([
    "..KKKKKKK..",
    ".KAAAAAAaK.",
    "KAKAWAAAaKAK",
    "KAKAAAAAaKAK",
    ".KAAAAAAaK..",
    "..KAAAAaK...",
    "...KAAaK....",
    "....KaK.....",
    "....KAK.....",
    "...KAAaK....",
    "..KrrrrrK...",
    "..KRRRRrK...",
    "..KKKKKKK...",
], BX0 + 6, shelf_y[2] - 13)
books_row(BX0 + 20, 50, shelf_y[2] - 1, 12, 19, BOOK_COLORS)
# 底部柜门
rect(BX0 + 4, BY1 - 20, BX1 - 4, BY1 - 4, C["m"])
for x0 in (BX0 + 4, (BX0 + BX1) // 2 + 1):
    frame(x0, BY1 - 20, x0 + (BX1 - BX0) // 2 - 5, BY1 - 4)
    put(x0 + (BX1 - BX0) // 2 - 8 if x0 == BX0 + 4 else x0 + 3, BY1 - 12, C["A"])

# ---------------------------------------------------------------- 5. 相片绳（挂照片用）+ 小三角旗
def string_y(x):
    return round(15 + 4 * math.sin(math.pi * (x - 58) / (128 - 58)))


for x in range(58, 129):
    put(x, string_y(x), C["T"])
    put(x, string_y(x) + 1, C["K"])
pattern(["KK", "KA"], 56, 13)
pattern(["KK", "AK"], 128, 13)
for i, x in enumerate(range(60, 128, 5)):
    if 64 < x < 122:
        continue  # 中间留给照片
    y = string_y(x) + 2
    col = [C["C"], C["A"], C["G"]][i % 3]
    pattern(["XXX", ".X."], x, y, {"X": col})

# ---------------------------------------------------------------- 6. 吊着的绿萝
for x0, x1 in ((22, 30), (38, 30), (30, 30)):
    for y in range(4, 19):
        t = (y - 4) / 14
        put(round(x0 + (x1 - x0) * t), y, C["t"])
pattern([
    "KKKKKKKKKKKKKKKK",
    "KRRRRRRRRRRRRRRK",
    "KrrrrrrrrrrrrrrK",
    ".KRRRRRRRRRRRRK.",
    ".KROORRRRRRRRrK.",
    ".KRRRRRRRRRRRrK.",
    "..KRRRRRRRRRrK..",
    "..KrRRRRRRRrrK..",
    "...KKKKKKKKKK...",
], 22, 19)
LEAF = [".LL.", "LLLl", ".ll."]
LEAF2 = [".L.", "LLl", ".l."]


def vine(x, y, length, drift):
    for i in range(length):
        yy = y + i
        xx = x + round(math.sin(i / 4 + drift) * 2)
        put(xx, yy, C["l"])
        if i % 5 == 2:
            pattern(LEAF if i % 10 == 2 else LEAF2, xx - 2 + (i % 2) * 2, yy - 1)


for vx, ln, dr in ((23, 36, 0.3), (28, 22, 1.5), (34, 40, 2.6), (39, 26, 0.9), (25, 14, 2.0)):
    vine(vx, 27, ln, dr)
for lx, ly in ((20, 17), (25, 15), (31, 16), (36, 15), (41, 17), (28, 18), (34, 18)):
    pattern(LEAF, lx, ly)

# ---------------------------------------------------------------- 7. 便利贴（左墙，书桌上方）
for i, (nx, ny, col) in enumerate(((58, 164, C["A"]), (70, 162, C["Y"]), (60, 177, C["S"]), (72, 175, C["O"]))):
    rect(nx, ny, nx + 10, ny + 10, col)
    rect(nx, ny, nx + 10, ny + 1, mix(col, C["K"], 0.2))
    for k in range(3):
        for j in range(nx + 2, nx + 9 - (k % 2) * 2):
            if (j + k) % 3:
                put(j, ny + 4 + k * 2, mix(col, C["K"], 0.55))
    frame(nx - 1, ny - 1, nx + 11, ny + 11)

# ---------------------------------------------------------------- 8. 书桌往左右延伸 + 正面
desk_rows = [cpx[1, y] for y in range(131, 135)]
desk_rows_r = [cpx[238, y] for y in range(131, 135)]
for i, c in enumerate(desk_rows):
    rect(0, CY + 131 + i - 0, CX - 1, CY + 131 + i, c)
for i, c in enumerate(desk_rows_r):
    rect(CX + 240, CY + 131 + i, W - 1, CY + 131 + i, c)
DESK_TOP = CY + 135  # 202
rect(0, DESK_TOP, W - 1, DESK_TOP, C["n"])
rect(0, DESK_TOP + 1, W - 1, DESK_TOP + 1, C["K"])
rect(0, DESK_TOP + 2, W - 1, 244, C["e"])
dither(0, DESK_TOP + 2, W - 1, 244, mix(C["e"], C["K"], 0.3), 3)
rect(0, 244, W - 1, 245, C["K"])
# 中间挡板的木纹
for y in (DESK_TOP + 14, DESK_TOP + 28):
    rect(118, y, 362, y, mix(C["e"], C["K"], 0.4))
    rect(118, y + 1, 362, y + 1, mix(C["e"], C["W"], 0.08))
# 左右抽屉
for dx0, dx1 in ((8, 112), (368, 472)):
    for dy0, dy1 in ((DESK_TOP + 5, 222), (225, 241)):
        box(dx0, dy0, dx1, dy1, C["d"], hi=mix(C["d"], C["W"], 0.15), lo=C["e"])
        mid = (dx0 + dx1) // 2
        rect(mid - 5, (dy0 + dy1) // 2, mid + 5, (dy0 + dy1) // 2 + 1, C["A"])
        frame(mid - 6, (dy0 + dy1) // 2 - 1, mid + 6, (dy0 + dy1) // 2 + 2)

# ---------------------------------------------------------------- 9. 地板 + 地毯
for y in range(246, H):
    for x in range(W):
        c = C["D"]
        if (y - 246) % 6 == 5:
            c = C["q"]
        elif (x + ((y - 246) // 6) * 37) % 64 == 0:
            c = C["q"]
        elif BAYER[y % 4][x % 4] < 2:
            c = C["P"]
        px[x, y] = c
for y in range(250, H):
    inset = max(0, 254 - y)
    for x in range(92 + inset, 462 - inset):
        c = C["U"]
        if y in (251, 252) or x in (93 + inset, 94 + inset, 460 - inset, 459 - inset):
            c = C["G"]
        elif (x // 6 + y // 3) % 7 == 0 and BAYER[y % 4][x % 4] < 8:
            c = C["Y"]
        elif BAYER[y % 4][x % 4] < 3:
            c = C["V"]
        put(x, y, c)
    put(91 + inset, y, C["K"])
    put(462 - inset, y, C["K"])
rect(96, 250, 458, 250, C["K"])

# ---------------------------------------------------------------- 10. 储物箱（左下，前景）
CB = (6, 222, 62, 266)
box(CB[0], CB[1] + 8, CB[2], CB[3], C["R"], hi=mix(C["R"], C["W"], 0.2), lo=C["r"])
for y in range(CB[1] + 14, CB[3], 7):  # 木板缝
    rect(CB[0] + 2, y, CB[2] - 2, y, C["r"])
box(CB[0] - 1, CB[1], CB[2] + 1, CB[1] + 10, C["r"], hi=C["R"], lo=mix(C["r"], C["K"], 0.3))
for bx in (CB[0] + 8, CB[2] - 10):  # 金属包边
    rect(bx, CB[1] + 1, bx + 2, CB[3] - 1, C["a"])
    rect(bx, CB[1] + 1, bx, CB[3] - 1, C["A"])
pattern(["KKKKK", "KAAaK", "KAKaK", "KaaaK", "KKKKK"], (CB[0] + CB[2]) // 2 - 2, CB[1] + 8)

# ---------------------------------------------------------------- 11. 唱片机（书桌左端）
RP = (10, 180, 52, 200)
box(RP[0], RP[1] + 6, RP[2], RP[3] - 1, C["r"], hi=C["R"], lo=mix(C["r"], C["K"], 0.3))
rect(RP[0] + 1, RP[1] + 3, RP[2] - 1, RP[1] + 6, C["T"])  # 顶板
frame(RP[0], RP[1] + 2, RP[2], RP[1] + 7)
cx, cy = 27, RP[1] + 3
for y in range(cy - 4, cy + 3):
    for x in range(cx - 13, cx + 14):
        if ((x - cx) / 13) ** 2 + ((y - cy + 0.5) / 3.6) ** 2 <= 1:
            c = C["K"] if ((x - cx) ** 2 // 9 + (y - cy) * 3) % 3 else C["P"]
            if abs(x - cx) <= 2 and abs(y - cy) <= 0:
                c = C["C"]
            put(x, y, c)
for i in range(9):  # 唱臂
    put(RP[2] - 4 - i, RP[1] - 2 + i // 3, C["T"])
put(RP[2] - 3, RP[1] - 3, C["W"])
rect(RP[2] - 4, RP[1] - 3, RP[2] - 2, RP[1] + 1, C["t"])
for kx in (RP[0] + 5, RP[0] + 9):
    put(kx, RP[1] + 11, C["A"])

# ---------------------------------------------------------------- 12. 中间书堆往左补完
for y in range(CY + 108, CY + 132):
    c = cpx[0, y - CY]
    if c[0] + c[1] + c[2] < 120:
        continue
    for x in range(108, CX):
        put(x, y, c)
    put(107, y, C["K"])
for y in range(CY + 108, CY + 132):
    if px[109, y] != px[109, y - 1] and sum(px[109, y]) > 120 and sum(px[109, y - 1]) > 120:
        for x in range(107, CX):
            put(x, y - 1, C["K"])

# ---------------------------------------------------------------- 13. 右墙：挂历、软木板、证书、小海报
# 挂历
CA = (406, 12, 440, 46)
rect(CA[0], CA[1], CA[2], CA[3], C["T"])
rect(CA[0], CA[1] + 9, CA[2], CA[1] + 9, C["W"])
rect(CA[0], CA[1], CA[2], CA[1] + 8, C["C"])
frame(CA[0] - 1, CA[1] - 1, CA[2] + 1, CA[3] + 1)
for rx in (CA[0] + 8, CA[2] - 8):
    rect(rx, CA[1] - 3, rx + 1, CA[1] + 1, C["K"])
for row in range(4):
    for col in range(5):
        x = CA[0] + 3 + col * 6
        y = CA[1] + 12 + row * 8
        rect(x, y, x + 3, y + 1, C["t"])
frame(CA[0] + 2 + 3 * 6, CA[1] + 10 + 2 * 8, CA[0] + 7 + 3 * 6, CA[1] + 15 + 2 * 8, C["G"])
# 软木板
CO = (398, 52, 474, 110)
box(CO[0], CO[1], CO[2], CO[3], C["r"], hi=C["R"], lo=mix(C["r"], C["K"], 0.3))
for y in range(CO[1] + 3, CO[3] - 2):
    for x in range(CO[0] + 3, CO[2] - 2):
        c = mix(C["R"], C["s"], 0.35)
        r = BAYER[y % 4][x % 4]
        if (x * 7 + y * 13) % 11 == 0:
            c = C["r"]
        elif r < 2:
            c = C["R"]
        elif (x * 5 + y * 3) % 23 == 0:
            c = C["s"]
        put(x, y, c)
frame(CO[0] + 2, CO[1] + 2, CO[2] - 2, CO[3] - 2, C["K"])
pattern(["KKKKKKKKK", "KWWWWWWWK", "KWTTTTTWK", "KWWWWWWWK", "KWTTTWWWK", "KKKKKKKKK"], 450, 92)  # 小纸条
pattern(["XX", "XX"], 454, 91, {"X": C["C"]})
pattern(["KKKKKKKKKKK", "KCCCCWCCCCK", "KCYCCWCCYCK", "KCCCCWCCCCK", "KKKKKKKKKKK"], 403, 96)  # 票根
pattern(["XX"], 407, 95, {"X": C["A"]})
# 证书
CE = (402, 120, 440, 150)
box(CE[0], CE[1], CE[2], CE[3], C["a"], hi=C["A"], lo=C["r"])
rect(CE[0] + 3, CE[1] + 3, CE[2] - 3, CE[3] - 3, C["T"])
frame(CE[0] + 3, CE[1] + 3, CE[2] - 3, CE[3] - 3, C["T"])
rect(CE[0] + 9, CE[1] + 7, CE[2] - 9, CE[1] + 8, C["U"])
for k in range(3):
    rect(CE[0] + 7, CE[1] + 12 + k * 3, CE[2] - 7 - (k == 2) * 8, CE[1] + 12 + k * 3, C["T"])
pattern([".KKK.", "KCCCK", "KCYCK", "KCCCK", ".KGK.", ".G.G."], CE[2] - 12, CE[3] - 10)
# 小海报：夜空 + 带环的星球（呼应笔记本上的 logo）
PO = (446, 118, 474, 154)
rect(PO[0], PO[1], PO[2], PO[3], C["U"])
dither(PO[0], PO[1] + 14, PO[2], PO[3], C["G"], 5)
frame(PO[0] - 1, PO[1] - 1, PO[2] + 1, PO[3] + 1)
for sx, sy in ((450, 122), (466, 125), (470, 140), (452, 146), (461, 120)):
    put(sx, sy, C["Y"])
pattern([
    "......KKKK......",
    "....KKOOOOKK....",
    "...KOOAAOOOOK...",
    "KKKKKKKKKKKKKKKK",
    "KYYYYYYYYYYYYYYK",
    "KKKKKKKKKKKKKKKK",
    "...KOOOOOOOOK...",
    "....KKOOOOKK....",
    "......KKKK......",
], 452, 130)
put(PO[0] + 1, PO[1] - 3, C["K"])
for i in range(13):
    put(PO[0] + 1 + i, PO[1] - 3 + i // 4, C["t"])
    put(PO[2] - 1 - i, PO[1] - 3 + i // 4, C["t"])

# ---------------------------------------------------------------- 14. 手机（书桌右侧，平放）
PH = (366, 193, 392, 198)
rect(PH[0], PH[1], PH[2], PH[3], C["V"])
rect(PH[0] + 2, PH[1] + 1, PH[2] - 2, PH[1] + 2, C["P"])
put(PH[2] - 4, PH[1] + 1, C["A"])
frame(PH[0] - 1, PH[1] - 1, PH[2] + 1, PH[3] + 1)

# ---------------------------------------------------------------- 15. 小彩灯（和 room.js 里的公式一致）
ANCH = list(range(0, W + 1, 80))
for a, b in zip(ANCH, ANCH[1:]):
    for x in range(a, b + 1):
        y = round(4 + 5 * math.sin(math.pi * (x - a) / (b - a)))
        put(x, y, C["t"])
    pattern(["KK", "KK"], a - 1, 3)
bulb = 0
for a, b in zip(ANCH, ANCH[1:]):
    for x in range(a + 6, b - 3, 10):
        y = round(4 + 5 * math.sin(math.pi * (x - a) / (b - a)))
        col = [C["A"], C["C"], C["Y"], C["O"]][bulb % 4]
        put(x, y + 1, C["K"])
        put(x + 1, y + 1, C["K"])
        put(x, y + 2, col)
        put(x + 1, y + 2, col)
        put(x, y + 3, mix(col, C["K"], 0.3))
        put(x + 1, y + 3, mix(col, C["K"], 0.3))
        bulb += 1

# ---------------------------------------------------------------- 16. 圆钟（窗户和书架之间）
CLK = (259, 38, 9)
for y in range(CLK[1] - CLK[2] - 1, CLK[1] + CLK[2] + 2):
    for x in range(CLK[0] - CLK[2] - 1, CLK[0] + CLK[2] + 2):
        d = math.hypot(x - CLK[0], y - CLK[1])
        if d <= CLK[2] + 1.2:
            put(x, y, C["K"])
        if d <= CLK[2]:
            put(x, y, C["a"] if d > CLK[2] - 1.5 else C["W"])
for a in range(12):
    ang = a * math.pi / 6
    put(round(CLK[0] + math.sin(ang) * 6.5), round(CLK[1] - math.cos(ang) * 6.5), C["T"] if a % 3 else C["K"])
for i in range(5):
    put(CLK[0], CLK[1] - i, C["K"])
for i in range(4):
    put(CLK[0] + i, CLK[1] + i // 2, C["K"])
put(CLK[0], CLK[1], C["C"])

# ---------------------------------------------------------------- 16b. 接缝过渡
for y in range(CY, CY + 128):
    for side, edge_x, rng in (("L", 0, range(CX - 10, CX)), ("R", 239, range(CX + 240, CX + 250))):
        ec = cpx[edge_x, y - CY]
        for x in rng:
            dist = (CX - x) if side == "L" else (x - (CX + 239))
            if px[x, y] in (C["w"], C["x"], C["h"]) and BAYER[y % 4][x % 4] < max(0, 12 - dist * 1.3):
                px[x, y] = ec

# ---------------------------------------------------------------- 17. 边缘暗角（让视线集中在中间，也让四周和中间的光照更统一）
for y in range(H):
    for x in range(W):
        if CX <= x < CX + 240 and CY <= y < CY + 135:
            continue
        dx = max(0, CX - x, x - (CX + 239)) / 120
        dy = max(0, CY - y, y - (CY + 134)) / 67
        k = min(1.0, math.hypot(dx, dy))
        level = int(k * 7)
        if BAYER[y % 4][x % 4] < level:
            px[x, y] = mix(px[x, y], C["K"], 0.3)

# ---------------------------------------------------------------- 18. 贴回中间画面
img.paste(center, (CX, CY))
img.save("prototype/assets/bg/room-full.png")
img.resize((W * 4, H * 4), Image.Resampling.NEAREST).save("art-source/room-full@4x.png")
print("ok", img.size)
