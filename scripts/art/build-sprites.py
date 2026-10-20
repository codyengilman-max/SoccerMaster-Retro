#!/usr/bin/env python3
"""Sprites v2: cut the supplied sheets into poses, normalise them onto one foot anchor and pack runtime atlases.

Source sheets in docs/art/sprites-v2/source/ are never modified. Poses are found as separate connected
alpha regions (not an equal grid), grouped into rows by vertical position and named from the sheet layout
below. Output: src/assets/art/sprites-v2/<set>.webp + <set>.json (Phaser JSON-hash atlas with anchors).
Run: python3 scripts/art/build-sprites.py   (needs Pillow, numpy, scipy)
"""
import hashlib, json, pathlib, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'docs/art/sprites-v2/source'
OUT = ROOT / 'src/assets/art/sprites-v2'
CELL_W, CELL_H, ANCHOR_X, ANCHOR_Y, BODY_H = 160, 128, 80, 120, 100

# Row-by-row pose names for each sheet layout (left to right). None = present in the sheet but not used.
PROTAGONIST = [
    ['idle-n', 'idle-ne', 'idle-e', 'idle-se', 'idle-s', 'idle-sw', 'idle-w', 'idle-nw'],
    [f'run-{i}' for i in range(8)],
    [f'kick-{i}' for i in range(8)],
    ['jockey-0', 'jockey-1', 'dribble-0', 'dribble-1', 'slide-0', 'slide-1', 'block-0', 'block-1'],
    [f'juggle-{i}' for i in range(8)],
]
GOALKEEPER = [
    ['ready-s', 'ready-n', 'ready-0', 'ready-1', 'shuffle-0', 'shuffle-1'],
    [f'dive-l-{i}' for i in range(6)],
    [f'dive-r-{i}' for i in range(6)],
    ['catch-ready', 'catch-chest-ball', 'catch-high', 'catch-high-ball', 'catch-low', 'catch-low-ball'],
    ['throw-0', 'throw-1', 'throw-2', 'throw-3', 'kick-0', 'kick-1'],
]
CLUB = [
    [f'run-{i}' for i in range(6)],
    [f'kick-{i}' for i in range(6)],
    ['idle-s', 'idle-n', 'idle-e', 'idle-e2', 'slide-0', 'block-0'],
    ['gk-ready', 'gk-dive-l', 'gk-dive-r', 'gk-catch-ball', 'alt-a', 'alt-b'],
]
CLUB_TRAINING = [
    [f'run-{i}' for i in range(6)],
    [f'juggle-{i}' for i in range(6)],
    ['ready-0', 'kick-0', 'kick-1', 'run-alt', 'slide-0', 'block-0'],
    [f'mate-{i}' for i in range(6)],
]
COACH = [['idle', 'back', 'walk'], ['point', 'explain', 'clipboard'], ['shout', 'clap', 'hips']]
# Facing-right poses that also get a pre-mirrored "-w" copy for westward play.
MIRROR_PREFIX = ('run-', 'kick-', 'dribble-', 'slide-', 'jockey-', 'block-', 'idle-e', 'throw-', 'shuffle-', 'ready-0', 'ready-1', 'walk', 'point')
# Sheet -> (layout, pose whose height defines the standing body, set id)
SHEETS = {
    'boy-match': PROTAGONIST, 'girl-match': PROTAGONIST, 'boy-training': PROTAGONIST, 'girl-training': PROTAGONIST,
    'boy-goalkeeper': GOALKEEPER, 'girl-goalkeeper': GOALKEEPER,
    'club-batavia-match': CLUB, 'club-batavia-training': CLUB_TRAINING, 'club-royal_salt': CLUB, 'club-valley_rising': CLUB,
    'club-desert_tuzon': CLUB, 'club-sol_vista': CLUB, 'club-next_horizon': CLUB, 'coach-code': COACH,
}
STAND = {id(PROTAGONIST): 'idle-s', id(GOALKEEPER): 'ready-s', id(CLUB): 'idle-s', id(CLUB_TRAINING): 'mate-0', id(COACH): 'idle'}


def regions(alpha):
    solid = alpha > 24
    lab, _ = ndimage.label(ndimage.binary_dilation(solid, iterations=3))
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        mask = (lab[sl] == i + 1) & solid[sl]
        if mask.sum() >= 150:
            out.append((sl, mask))
    # A pose touching the one below it (e.g. a low slide above a juggle) merges vertically: cut it at its thinnest row.
    med = float(np.median([r[0][0].stop - r[0][0].start for r in out]))
    done = []
    while out:
        sl, mask = out.pop()
        h = mask.shape[0]
        if h <= 1.3 * med:
            done.append((sl, mask))
            continue
        rows = mask.sum(axis=1)
        cut = h // 4 + int(np.argmin(rows[h // 4: h - h // 4]))
        for a, b in ((0, cut), (cut, h)):
            m = mask[a:b]
            xs = np.nonzero(m.any(axis=0))[0]
            out.append(((slice(sl[0].start + a, sl[0].start + b), slice(sl[1].start + xs[0], sl[1].start + xs[-1] + 1)), m[:, xs[0]:xs[-1] + 1]))
    return done


def rows_of(regs, n_rows):
    regs = sorted(regs, key=lambda r: (r[0][0].start + r[0][0].stop) / 2)
    centres = [(r[0][0].start + r[0][0].stop) / 2 for r in regs]
    # Split at the n_rows-1 largest gaps between consecutive vertical centres.
    gaps = sorted(range(1, len(regs)), key=lambda i: centres[i] - centres[i - 1], reverse=True)[: n_rows - 1]
    rows, start = [], 0
    for cut in sorted(gaps) + [len(regs)]:
        rows.append(sorted(regs[start:cut], key=lambda r: r[0][1].start))
        start = cut
    return rows


def split_widest(found):
    """Two poses drawn touching each other merge into one region: cut the widest at its thinnest column."""
    i = max(range(len(found)), key=lambda j: found[j][0][1].stop - found[j][0][1].start)
    sl, mask = found[i]
    cols = mask.sum(axis=0)
    w = len(cols)
    lo, hi = w // 4, w - w // 4
    cut = lo + int(np.argmin(cols[lo:hi]))
    parts = []
    for a, b in ((0, cut), (cut, w)):
        m = mask[:, a:b]
        ys = np.nonzero(m.any(axis=1))[0]
        sub = (slice(sl[0].start + ys[0], sl[0].start + ys[-1] + 1), slice(sl[1].start + a, sl[1].start + b))
        parts.append((sub, m[ys[0]:ys[-1] + 1]))
    return found[:i] + parts + found[i + 1:]


def body_box(img, x, y):
    """Opaque body bounds in cell pixels, [x0, y0, x1, y1]; y1 is the feet line."""
    bb = img.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    return [x + bb[0], y + bb[1], x + bb[2], y + bb[3]]


def clean(rgba, mask):
    px = rgba.copy()
    a = px[:, :, 3]
    a[~mask] = 0
    a[a <= 24] = 0
    # Light fringe left by the sheet's antialiasing against white: drop faint near-white edge pixels.
    lum = px[:, :, :3].astype(int).sum(axis=2) / 3
    a[(a < 128) & (lum > 215)] = 0
    px[a == 0] = 0
    return px


def build(name, layout):
    path = SRC / f'{name}.png'
    rgba = np.array(Image.open(path).convert('RGBA'))
    rows = rows_of(regions(rgba[:, :, 3]), len(layout))
    poses = {}
    for r, (names, found) in enumerate(zip(layout, rows)):
        while len(found) < len(names):
            found = split_widest(found)
        if len(found) != len(names):
            sys.exit(f'{name}: row {r} has {len(found)} poses, layout expects {len(names)}')
        for pose, (sl, mask) in zip(names, found):
            if pose:
                poses[pose] = clean(rgba[sl], mask)
    stand = poses[STAND[id(layout)]]
    k = BODY_H / stand.shape[0]
    frames = {}
    for pose, px in poses.items():
        img = Image.fromarray(px)
        w, h = max(1, round(img.width * k)), max(1, round(img.height * k))
        img = img.resize((w, h), Image.LANCZOS)
        arr = np.array(img)
        arr[arr[:, :, 3] < 24] = 0
        img = Image.fromarray(arr)
        a = arr[:, :, 3] > 0
        ys, xs = np.nonzero(a)
        # Foot anchor: horizontal alpha centroid, bottom-most opaque row.
        cx = int(round(xs.mean())) if len(xs) else w // 2
        bottom = int(ys.max()) + 1 if len(ys) else h
        frames[pose] = (img, cx, bottom)
        if pose.startswith(MIRROR_PREFIX):
            frames[f'{pose}-w'] = (img.transpose(Image.FLIP_LEFT_RIGHT), w - cx, bottom)
    cols = 8
    names = list(frames)
    sheet = Image.new('RGBA', (cols * CELL_W, -(-len(names) // cols) * CELL_H), (0, 0, 0, 0))
    meta = {}
    for i, pose in enumerate(names):
        img, cx, bottom = frames[pose]
        ox, oy = (i % cols) * CELL_W, (i // cols) * CELL_H
        x, y = ANCHOR_X - cx, ANCHOR_Y - bottom
        if x < 0 or y < 0 or x + img.width > CELL_W or y + img.height > CELL_H:
            sys.exit(f'{name}:{pose} does not fit the {CELL_W}x{CELL_H} cell ({img.width}x{img.height}, anchor {cx},{bottom})')
        sheet.alpha_composite(img, (ox + x, oy + y))
        meta[pose] = {'frame': {'x': ox, 'y': oy, 'w': CELL_W, 'h': CELL_H}, 'rotated': False, 'trimmed': False,
                      'spriteSourceSize': {'x': 0, 'y': 0, 'w': CELL_W, 'h': CELL_H}, 'sourceSize': {'w': CELL_W, 'h': CELL_H},
                      'bodyBox': body_box(img, x, y)}
    OUT.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT / f'{name}.webp', 'WEBP', quality=90, alpha_quality=100, method=6)
    atlas = {'frames': meta, 'meta': {'image': f'{name}.webp', 'size': {'w': sheet.width, 'h': sheet.height}, 'scale': '1',
             'cell': {'w': CELL_W, 'h': CELL_H}, 'anchor': {'x': ANCHOR_X, 'y': ANCHOR_Y}, 'bodyHeight': BODY_H,
             'source': f'docs/art/sprites-v2/source/{name}.png', 'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest()}}
    (OUT / f'{name}.json').write_text(json.dumps(atlas, indent=1, sort_keys=True) + '\n')
    return len(names), sheet.size


if __name__ == '__main__':
    for name, layout in SHEETS.items():
        n, size = build(name, layout)
        print(f'{name}: {n} frames, atlas {size[0]}x{size[1]}')
