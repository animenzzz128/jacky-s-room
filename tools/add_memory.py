"""把一张照片 + 介绍变成房间里的照片摆件（聊天工作流用，说明见 .claude/skills/add-memory/SKILL.md）。

用法（在仓库根目录运行）：
  python tools/add_memory.py --list [--map 输出.png]          列出槽位占用情况；--map 画一张标了槽位编号的房间图
  python tools/add_memory.py --palette                        打印画摆件用的调色板字母
  python tools/add_memory.py --photo 照片 --entry 介绍.json [--grid 摆件.txt] [--slot B4|none] [--replace] [--preview 输出.png]

做的事：
  1. 照片：按 EXIF 方向转正，去掉 EXIF（包括 GPS 定位），长边压到 1600px，存成 prototype/assets/memories/<id>.jpg
  2. 摆件：有 --grid 就按 12×14 字母网格画专属小物件；没有就用照片生成像素拍立得。存成 <id>.sprite.png
     网格原稿另存一份到 art-source/memories/<id>.txt，以后可以改了重跑
  3. 槽位：--slot 指定；不指定时自动找空位（专属小物件优先放台面 stand，拍立得优先钉墙 pin）；--slot none 只进相册
  4. 写进 prototype/data/memories.json（同一个 id 已存在时要加 --replace）
  5. --preview：把摆件合成到房间图里、放大 4 倍，方便检查效果
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent.parent
PROTO = ROOT / 'prototype'
SCENE = PROTO / 'data' / 'scene.json'
MEMORIES = PROTO / 'data' / 'memories.json'
ASSET_DIR = PROTO / 'assets' / 'memories'
GRID_DIR = ROOT / 'art-source' / 'memories'

W, H = 12, 14  # 摆件尺寸（逻辑像素）
MAX_PHOTO = 1600

# 调色板：主调色板（黄昏）+ 照片补充色，和 js/memories.js 保持一致
PALETTE = {
    'K': '1c1215', 'k': '2c161a', 'D': '3d202e', 'd': '4b243b', 'M': '582f44', 'm': '702f53',
    'R': 'a62b66', 'r': '95424a', 'O': 'ea6949', 'o': 'f5994a', 'Y': 'fdb644', 'p': 'fbcda6',
    'W': 'f8f0e6', 's': 'fcb989', 'S': 'd48a59', 'c': 'f8a078', 'T': 'a45939', 't': '6b3a35',
    'L': 'a89060', 'l': '846030', 'P': 'ccb49c',
    'N': '2f3b57', 'B': '4b5f86', 'b': '7f97b8', 'i': 'b4c3d6', 'E': '3d6466', 'e': '6c8f86',
    'V': '4a5e3a', 'v': '7d9460',
}
NAMES = {
    'K': '描边 / 最深', 'k': '近黑紫', 'D': '深阴影', 'd': '暗梅紫', 'M': '梅紫（木头）', 'm': '中梅紫',
    'R': '洋红', 'r': '砖红', 'O': '橘', 'o': '浅橘', 'Y': '琥珀黄', 'p': '桃色',
    'W': '奶白（高光）', 's': '浅杏', 'S': '棕褐 / 肤色', 'c': '珊瑚', 'T': '赤陶', 't': '深棕',
    'L': '卡其', 'l': '橄榄棕', 'P': '燕麦（纸）',
    'N': '藏青', 'B': '蓝', 'b': '浅蓝', 'i': '冰蓝', 'E': '青绿', 'e': '灰绿', 'V': '深绿', 'v': '绿',
}
DUSK_KEYS = 'KkDdMmRrOoYpWsScTtLlP'
rgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
PHOTO_PALETTE = [rgb(v) for v in PALETTE.values()]

ZONES = {
    'S': '窗台（角色左后方）', 'L': '左上相片绳', 'B': '左边书架', 'P': '窗户左侧墙面', 'D': '书桌',
    'U': '右边书架顶层', 'H': '右边书架中下层', 'W': '书架下方墙面', 'C': '右侧软木板',
}

INK, CORAL = rgb('1c1215'), rgb('ea6949')


def die(msg: str) -> None:
    print(f'错误：{msg}', file=sys.stderr)
    sys.exit(1)


def load_json(p: Path, default=None):
    if not p.exists():
        return default
    return json.loads(p.read_text(encoding='utf-8'))


def save_memories(data: dict) -> None:
    MEMORIES.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


# ---------------- 摆件 ----------------
def nearest(c):
    r, g, b = c
    return min(PHOTO_PALETTE, key=lambda p: 0.3 * (r - p[0]) ** 2 + 0.59 * (g - p[1]) ** 2 + 0.11 * (b - p[2]) ** 2)


def make_polaroid(photo: Image.Image) -> Image.Image:
    """照片 → 12×14 像素拍立得（照片区 8×7），算法和 js/memories.js 的 makePolaroid 一致"""
    pw, ph = 8, 7
    iw, ih = photo.size
    if iw / ih > pw / ph:
        sw = ih * pw / ph
        box = ((iw - sw) / 2, 0, (iw + sw) / 2, ih)
    else:
        sh = iw * ph / pw
        box = (0, (ih - sh) / 2, iw, (ih + sh) / 2)
    small = photo.convert('RGB').resize((pw, ph), Image.Resampling.BOX, box=box)
    out = Image.new('RGBA', (W, H), rgb('1c1215') + (255,))
    d = ImageDraw.Draw(out)
    d.rectangle((1, 1, 10, 12), fill=rgb('f8f0e6'))
    for y in range(ph):
        for x in range(pw):
            r, g, b = small.getpixel((x, y))
            q = nearest((min(255, r * 1.03 + 4), g, b * 0.94))  # 轻微暖调，融进黄昏房间
            out.putpixel((2 + x, 2 + y), q + (255,))
    d.line((3, 11, 7, 11), fill=rgb('ccb49c'))  # 底部「手写字」
    return out


def parse_grid(text: str) -> list[str]:
    rows = [ln.rstrip() for ln in text.splitlines()]
    rows = [r for r in rows if r and not r.lstrip().startswith('#')]
    if not rows:
        die('网格是空的')
    if len(rows) > H:
        die(f'网格有 {len(rows)} 行，最多 {H} 行')
    bad = sorted({ch for r in rows for ch in r if ch != '.' and ch not in PALETTE})
    if bad:
        die(f'网格里有调色板以外的字母：{" ".join(bad)}（用 --palette 查看可用字母）')
    for i, r in enumerate(rows, 1):
        if len(r) > W:
            die(f'第 {i} 行有 {len(r)} 个字符，最多 {W} 个')
    rows = [r.ljust(W, '.') for r in rows]
    rows = ['.' * W] * (H - len(rows)) + rows  # 不够高就从上面补，底部贴着台面
    if sum(ch != '.' for r in rows for ch in r) < 18:
        die('网格太空了，摆件在房间里会看不清')
    return rows


def grid_sprite(rows: list[str]) -> Image.Image:
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.':
                out.putpixel((x, y), rgb(PALETTE[ch]) + (255,))
    return out


# ---------------- 预览 ----------------
def room_image() -> Image.Image:
    scene = load_json(SCENE)
    return Image.open(PROTO / scene['background']).convert('RGBA')


def place_sprite(room: Image.Image, sprite: Image.Image, slot: dict) -> None:
    x, y = slot['x'], slot['y']
    if slot['kind'] == 'stand':  # 台面上的影子，和 room.js 一致
        shadow = Image.new('RGBA', (11, 1), (14, 6, 18, 140))
        room.alpha_composite(shadow, (x + 1, y + 14))
    room.alpha_composite(sprite, (x, y))
    if slot['kind'] == 'pin':  # 图钉
        room.putpixel((x + 5, y - 1), INK + (255,))
        room.putpixel((x + 6, y - 1), INK + (255,))
        room.putpixel((x + 5, y), CORAL + (255,))
        room.putpixel((x + 6, y), CORAL + (255,))


def all_sprites(memories: list[dict], skip_id: str | None = None):
    """已有摆件（预览里一起画出来，方便看整体效果）"""
    for m in memories:
        if m.get('id') == skip_id or not m.get('slot'):
            continue
        p = PROTO / m['sprite'] if m.get('sprite') else None
        if p and p.exists():
            yield m['slot'], Image.open(p).convert('RGBA')
        elif (PROTO / m.get('photo', '')).is_file():
            yield m['slot'], make_polaroid(Image.open(PROTO / m['photo']))


def write_preview(out: Path, sprite: Image.Image, slot: dict | None, memories: list[dict], mid: str) -> None:
    k = 4
    big = sprite.resize((W * 8, H * 8), Image.Resampling.NEAREST)
    if slot:
        scene = load_json(SCENE)
        slots = {s['id']: s for s in scene['slots']}
        room = room_image()
        for sid, spr in all_sprites(memories, mid):
            if sid in slots:
                place_sprite(room, spr, slots[sid])
        place_sprite(room, sprite, slot)
        x0 = max(0, min(room.width - 120, slot['x'] - 54))
        y0 = max(0, min(room.height - 72, slot['y'] - 30))
        crop = room.crop((x0, y0, x0 + 120, y0 + 72)).resize((120 * k, 72 * k), Image.Resampling.NEAREST)
    else:
        crop = Image.new('RGBA', (120 * k, 72 * k), rgb('2c161a') + (255,))
    canvas = Image.new('RGBA', (crop.width + big.width + 24, max(crop.height, big.height)), rgb('2c161a') + (255,))
    canvas.alpha_composite(crop, (0, 0))
    canvas.alpha_composite(big, (crop.width + 12, (canvas.height - big.height) // 2))
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert('RGB').save(out)
    print(f'预览：{out}')


def write_map(out: Path, memories: list[dict]) -> None:
    scene = load_json(SCENE)
    slots = {s['id']: s for s in scene['slots']}
    room = room_image()
    for sid, spr in all_sprites(memories):
        if sid in slots:
            place_sprite(room, spr, slots[sid])
    k = 3
    big = room.resize((room.width * k, room.height * k), Image.Resampling.NEAREST)
    d = ImageDraw.Draw(big)
    used = {m.get('slot') for m in memories}
    for s in scene['slots']:
        col = (120, 120, 120) if s['id'] in used else (253, 182, 68)
        x, y = s['x'] * k, s['y'] * k
        d.rectangle((x, y, x + W * k - 1, y + H * k - 1), outline=col, width=2)
        d.rectangle((x, y - 12, x + 7 * len(s['id']) + 3, y - 1), fill=(28, 18, 21))
        d.text((x + 2, y - 12), s['id'], fill=col)
    out.parent.mkdir(parents=True, exist_ok=True)
    big.convert('RGB').save(out)
    print(f'槽位图（黄框 = 空位，灰框 = 已占用）：{out}')


# ---------------- 主流程 ----------------
def pick_slot(scene: dict, memories: list[dict], want: str | None, kind_pref: str, mid: str):
    slots = scene['slots']
    used = {m.get('slot'): m.get('id') for m in memories if m.get('id') != mid and m.get('slot')}
    if want == 'none':
        return None
    if want:
        slot = next((s for s in slots if s['id'] == want), None)
        if not slot:
            die(f'没有槽位 {want}（用 --list 查看）')
        if want in used:
            die(f'槽位 {want} 已经放了 {used[want]}')
        return slot
    free = [s for s in slots if s['id'] not in used]
    slot = next((s for s in free if s['kind'] == kind_pref), None) or (free[0] if free else None)
    if not slot:
        print('提示：房间槽位都满了，这张只放进相册')
    return slot


def norm_text(v, field: str, required: bool = False):
    if v in (None, '', {}):
        if required:
            die(f'介绍里缺少 {field}')
        return None
    if isinstance(v, str):
        return v.strip()
    if isinstance(v, dict) and set(v) <= {'zh', 'en'} and all(isinstance(x, str) for x in v.values()):
        return {k: x.strip() for k, x in v.items()}
    die(f'{field} 要么是字符串，要么是 {{"zh": "...", "en": "..."}}')


def cmd_add(a) -> None:
    entry = load_json(Path(a.entry))
    if not isinstance(entry, dict):
        die('介绍文件必须是一个 JSON 对象')
    mid = entry.get('id', '')
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{1,47}', mid):
        die('id 只能用小写字母、数字和连字符，2–48 个字符，例如 2025-kyoto-trip')
    if entry.get('date') and not re.fullmatch(r'\d{4}(-\d{2}){0,2}', entry['date']):
        die('date 的格式是 2025、2025-07 或 2025-07-14')

    scene = load_json(SCENE)
    data = load_json(MEMORIES, {'memories': []})
    memories = data.setdefault('memories', [])
    old = next((m for m in memories if m.get('id') == mid), None)
    if old and not a.replace:
        die(f'已经有 id 为 {mid} 的摆件；要覆盖就加 --replace')

    # 先检查完所有输入，再动文件：失败时不会留下写了一半的结果
    rows = parse_grid(Path(a.grid).read_text(encoding='utf-8')) if a.grid else None
    want = a.slot or entry.get('slot') or (old.get('slot') if old else None)  # --replace 且没指定时沿用原来的
    slot = pick_slot(scene, memories, want, 'stand' if rows else 'pin', mid)
    title = norm_text(entry.get('title'), 'title', required=True)
    try:
        photo = Image.open(a.photo)
        photo.load()
    except FileNotFoundError:
        die(f'找不到照片 {a.photo}')
    except Exception as e:  # HEIC 等 Pillow 读不了的格式
        die(f'读不了这张照片（{e}）。iPhone 的 HEIC 先导出成 JPG 再试')

    # 1. 照片
    photo = ImageOps.exif_transpose(photo).convert('RGB')
    if max(photo.size) > MAX_PHOTO:
        photo.thumbnail((MAX_PHOTO, MAX_PHOTO), Image.Resampling.LANCZOS)
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    photo_path = ASSET_DIR / f'{mid}.jpg'
    photo.save(photo_path, 'JPEG', quality=86, optimize=True, progressive=True)  # 不传 exif = 去掉定位等信息

    # 2. 摆件
    if rows:
        sprite = grid_sprite(rows)
        GRID_DIR.mkdir(parents=True, exist_ok=True)
        grid_copy = GRID_DIR / f'{mid}.txt'
        if Path(a.grid).resolve() != grid_copy.resolve():
            shutil.copyfile(a.grid, grid_copy)
    else:
        sprite = make_polaroid(photo)
    sprite_path = ASSET_DIR / f'{mid}.sprite.png'
    sprite.save(sprite_path)

    # 4. 写入
    rec = {
        'id': mid,
        'slot': slot['id'] if slot else None,
        'photo': photo_path.relative_to(PROTO).as_posix(),
        'sprite': sprite_path.relative_to(PROTO).as_posix(),
        'title': title,
        'date': entry.get('date') or None,
        'place': norm_text(entry.get('place'), 'place'),
        'story': norm_text(entry.get('story'), 'story'),
        'alt': norm_text(entry.get('alt'), 'alt'),
        'tags': [t for t in (entry.get('tags') or []) if t] or None,
    }
    rec = {k: v for k, v in rec.items() if v is not None or k == 'slot'}
    if old:
        memories[memories.index(old)] = rec
    else:
        memories.append(rec)
    save_memories(data)

    where = f'{slot["id"]}（{ZONES.get(slot["id"][0], "")}）' if slot else '只在相册里'
    print(f'{"已更新" if old else "已加入"}：{mid} → {where}')
    print(f'  照片 {photo_path.relative_to(ROOT).as_posix()}  {photo.size[0]}×{photo.size[1]}')
    print(f'  摆件 {sprite_path.relative_to(ROOT).as_posix()}  {"专属小物件" if rows else "像素拍立得"}')
    if a.preview:
        write_preview(Path(a.preview), sprite, slot, memories, mid)


def cmd_list(a) -> None:
    scene = load_json(SCENE)
    memories = load_json(MEMORIES, {'memories': []}).get('memories', [])
    used = {m.get('slot'): m['id'] for m in memories if m.get('slot')}
    print(f'已有 {len(memories)} 个照片摆件，{len(used)} 个在房间里')
    for zone, name in ZONES.items():
        ss = [s for s in scene['slots'] if s['id'][0] == zone]
        if not ss:
            continue
        cells = [f'{s["id"]}={used[s["id"]]}' if s['id'] in used else s['id'] for s in ss]
        print(f'  {name:<10} [{ss[0]["kind"]}]  ' + '  '.join(cells))
    album = [m['id'] for m in memories if not m.get('slot')]
    if album:
        print('  只在相册：' + '、'.join(album))
    if a.map:
        write_map(Path(a.map), memories)


def cmd_palette() -> None:
    print('网格：最多 14 行 × 12 列，"." = 透明，底部一行贴着台面。以 # 开头的行是注释。')
    print('主调色板（黄昏）：')
    for k in DUSK_KEYS:
        print(f'  {k}  #{PALETTE[k]}  {NAMES[k]}')
    print('照片补充色（只在需要蓝天、海、植物时用）：')
    for k in PALETTE:
        if k not in DUSK_KEYS:
            print(f'  {k}  #{PALETTE[k]}  {NAMES[k]}')


def main() -> None:
    sys.stdout.reconfigure(errors='replace')  # Windows 控制台不是 UTF-8 时别因为个别符号崩掉
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--list', action='store_true', help='列出槽位占用情况')
    ap.add_argument('--map', help='和 --list 一起用：输出标了槽位编号的房间图')
    ap.add_argument('--palette', action='store_true', help='打印网格可用的调色板字母')
    ap.add_argument('--photo', help='照片文件')
    ap.add_argument('--entry', help='介绍（JSON：id、title、story、date、place、tags、alt）')
    ap.add_argument('--grid', help='专属小物件的 12×14 字母网格（不给就做像素拍立得）')
    ap.add_argument('--slot', help='槽位编号，例如 B4；none = 只放进相册')
    ap.add_argument('--replace', action='store_true', help='覆盖同 id 的摆件')
    ap.add_argument('--preview', help='输出预览图（房间局部 ×4 + 摆件 ×8）')
    a = ap.parse_args()
    if a.palette:
        cmd_palette()
    elif a.list:
        cmd_list(a)
    elif a.photo and a.entry:
        cmd_add(a)
    else:
        ap.print_help()


if __name__ == '__main__':
    main()
