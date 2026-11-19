"""把生图工具扩出来的整间房，合成为原型用的 480×270 背景。

步骤：
  1. 吸附到 480×270 像素网格（不锁色板，保留原图颜色，去 1 遍杂点）
  2. 在 (120, 67) 附近 ±8 像素内自动对齐：找出生成图里「中间那 1/4」的真实位置，整体平移对齐
  3. 把现在的 prototype/assets/bg/room.png（240×135）原样贴回 (120, 67)
     → 角色、眨眼补丁、原有坐标全部保持，只需整体平移 (+120, +67)
  4. 输出 prototype/assets/bg/room-full.png 和 4 倍预览图

用法（在 pixel-room 目录下）：
  python tools/merge_outpaint.py art-source/你生成的整间房.png
"""
import importlib.util
import os
import sys

from PIL import Image, ImageChops, ImageStat

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("pixel_snap", os.path.join(HERE, "pixel_snap.py"))
ps = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ps)

W, H = 480, 270
CX, CY = 120, 67
CENTER = "prototype/assets/bg/room.png"
OUT = "prototype/assets/bg/room-full.png"


def diff(a, b):
    return sum(ImageStat.Stat(ImageChops.difference(a.convert("L"), b.convert("L"))).mean)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    gen = Image.open(sys.argv[1]).convert("RGB")
    ratio = gen.width / gen.height
    if abs(ratio - 16 / 9) > 0.05:
        print(f"提醒：生成图比例是 {ratio:.2f}，不是 16:9（1.78），会被拉伸，最好重新生成 16:9 的图")

    pal = gen.quantize(colors=64, dither=Image.Dither.NONE)
    room = ps.snap(gen, W, H, pal, None)
    room = ps.clean_isolated(room, 1).convert("RGB")

    center = Image.open(CENTER).convert("RGB")
    cw, ch = center.size
    best = min(
        ((dx, dy) for dx in range(-8, 9) for dy in range(-8, 9)),
        key=lambda o: diff(room.crop((CX + o[0], CY + o[1], CX + o[0] + cw, CY + o[1] + ch)), center),
    )
    score = diff(room.crop((CX + best[0], CY + best[1], CX + best[0] + cw, CY + best[1] + ch)), center)
    print(f"中间区域偏移 {best}，差异 {score:.1f}（越小越好，> 40 说明生成图把中间画变了，需要人工检查）")

    if best != (0, 0):
        # 整体平移，让生成图的中间和原图对齐；边缘用最近的像素补
        shifted = Image.new("RGB", (W, H))
        shifted.paste(room, (-best[0], -best[1]))
        room = shifted
        if best[0] > 0:
            room.paste(room.crop((W - best[0] - 1, 0, W - best[0], H)).resize((best[0], H)), (W - best[0], 0))
        if best[0] < 0:
            room.paste(room.crop((-best[0], 0, -best[0] + 1, H)).resize((-best[0], H)), (0, 0))
        if best[1] > 0:
            room.paste(room.crop((0, H - best[1] - 1, W, H - best[1])).resize((W, best[1])), (0, H - best[1]))
        if best[1] < 0:
            room.paste(room.crop((0, -best[1], W, -best[1] + 1)).resize((W, -best[1])), (0, 0))

    room.paste(center, (CX, CY))
    room.save(OUT)
    room.resize((W * 4, H * 4), Image.Resampling.NEAREST).save(OUT.replace(".png", "@4x.png"))
    print(f"已保存 {OUT}（{W}×{H}）和 4 倍预览")


if __name__ == "__main__":
    main()
