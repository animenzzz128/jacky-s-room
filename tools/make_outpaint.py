"""生成「扩图」用的两张图：

  art-source/outpaint-canvas.png   原插画放在正中间，四周留白，交给生图工具补全成整间房
  art-source/outpaint-layout.png   构图参考：四周每个区域放什么（只给生图工具当参考，不要照抄方框和文字）

新房间逻辑分辨率 480×270；原图吸附后是 240×135，正好 1:1 放在 (120, 67)。
生成好之后，用 pixel_snap.py 吸附到 480 宽，再把 prototype/assets/bg/room.png 原样贴回 (120, 67)，
这样角色、眨眼补丁和原来所有坐标都只需要整体平移 (+120, +67)。

用法（在 pixel-room 目录下）：
  python tools/make_outpaint.py
"""
from PIL import Image, ImageDraw, ImageFont

SRC = "art-source/room_original.png"
S = 4                       # 1 逻辑像素 = 4 输出像素 → 1920×1080
W, H = 480, 270
CX, CY, CW, CH = 120, 67, 240, 135   # 原图在新房间里的位置（逻辑像素）

# 新增物件（逻辑像素坐标）：(x0, y0, x1, y1, 中文, English, 是否留空给照片)
# 按设计稿第 5.2 节的原始线框摆放；中间 1/4 已经有的东西（台灯、青蛙、马克杯、小猫、窗户下半、右上书架）不重复画
ITEMS = [
    # 上方一条（y 0–67）
    (10, 0, 52, 44, "14 吊着的绿萝", "hanging pothos plant", False),
    (60, 12, 138, 44, "相框墙：3 个空相框", "3 small EMPTY picture frames", True),
    (140, 0, 246, 67, "8 同一扇窗户的上半部分", "top of the SAME window", False),
    (252, 16, 280, 44, "圆形挂钟", "round wall clock", False),
    (286, 0, 360, 67, "同一个书架的上层", "upper part of the SAME bookshelf", False),
    (294, 34, 352, 62, "书架空位", "EMPTY shelf gap", True),
    (372, 10, 406, 44, "11 挂历", "wall calendar", False),
    # 左墙（x 0–120）
    (10, 52, 100, 160, "", "", False),
    (14, 56, 96, 80, "3 高书架 第 1 层：空位", "tall bookshelf, shelf 1: EMPTY gaps", True),
    (14, 84, 96, 108, "第 2 层：空位", "shelf 2: EMPTY gaps", True),
    (14, 112, 96, 156, "第 3 层：小奖杯 + 空位", "shelf 3: small trophy + EMPTY gaps", True),
    (8, 166, 52, 198, "7 唱片机", "record player", False),
    (56, 164, 84, 196, "5 便利贴", "sticky notes", False),
    (88, 172, 118, 198, "空位", "EMPTY", True),
    # 右墙（x 360–480）
    (366, 50, 472, 108, "4 软木板：图钉 + 大片空位", "4 cork board: pins + lots of EMPTY space", True),
    (370, 116, 410, 150, "10 证书", "framed certificate", False),
    (420, 116, 472, 150, "小装饰画", "small poster", False),
    (366, 176, 396, 198, "6 手机", "phone lying flat", False),
    (404, 172, 428, 198, "空位", "EMPTY", True),
    (436, 160, 474, 198, "空位", "EMPTY", True),
    # 下方（y 202–270）
    (72, 204, 474, 244, "书桌正面（接着原来的书桌，带抽屉）", "front of the SAME desk, with drawers", False),
    (6, 212, 66, 266, "17 储物箱", "wooden storage chest", False),
    (76, 248, 474, 270, "地毯", "rug on the floor", False),
]


def main():
    src = Image.open(SRC).convert("RGB")
    center = src.resize((CW * S, CH * S), Image.Resampling.LANCZOS)

    # 1) 扩图画布：四周纯白
    canvas = Image.new("RGB", (W * S, H * S), "#ffffff")
    canvas.paste(center, (CX * S, CY * S))
    canvas.save("art-source/outpaint-canvas.png")

    # 2) 构图参考
    lay = Image.new("RGB", (W * S, H * S), "#4b243b")
    lay.paste(center, (CX * S, CY * S))
    d = ImageDraw.Draw(lay)
    f = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 22)
    fs = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 17)
    fb = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 26)
    for x0, y0, x1, y1, zh, en, empty in ITEMS:
        box = (x0 * S, y0 * S, x1 * S - 1, y1 * S - 1)
        if empty:
            # 虚线框 = 留空给照片摆件
            for k in range(box[0], box[2], 16):
                d.line([(k, box[1]), (min(k + 8, box[2]), box[1])], fill="#ea6949", width=3)
                d.line([(k, box[3]), (min(k + 8, box[2]), box[3])], fill="#ea6949", width=3)
            for k in range(box[1], box[3], 16):
                d.line([(box[0], k), (box[0], min(k + 8, box[3]))], fill="#ea6949", width=3)
                d.line([(box[2], k), (box[2], min(k + 8, box[3]))], fill="#ea6949", width=3)
            col = "#f5994a"
        else:
            d.rectangle(box, outline="#fdb644", width=3)
            col = "#fbcda6"
        cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
        d.text((cx, cy - 11), zh, font=f, fill=col, anchor="mm")
        d.text((cx, cy + 13), en, font=fs, fill=col, anchor="mm")
    d.rectangle((CX * S, CY * S, (CX + CW) * S - 1, (CY + CH) * S - 1), outline="#a62b66", width=5)
    d.text(((CX + CW / 2) * S, CY * S - 22), "中间 = 现有插画，保持不变（只是整体变小）  CENTER = keep exactly as is",
           font=fb, fill="#f8f0e6", anchor="mm", stroke_width=3, stroke_fill="#1c1215")
    lay.save("art-source/outpaint-layout.png")
    print("ok", canvas.size)


if __name__ == "__main__":
    main()
