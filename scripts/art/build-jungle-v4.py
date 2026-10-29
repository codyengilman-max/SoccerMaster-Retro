#!/usr/bin/env python3
"""Jungle Ball replacement package (SoccerMaster_JungleBall_Replacement_Devin): cut each drawn pose and pack runtime atlases.

The package says its layout values are visual row/column counts, not crop rectangles, and sheet sizes differ, so no fixed
grid is assumed. Each pose is the set of connected opaque parts (alpha >= CORE) whose centroids sort into that row/column;
two poses drawn touching are split by eroding until they separate and giving every pixel to the nearer half. Small parts
(a detached hand, stars) join the nearest pose. The soft edge (alpha > EDGE) is kept only within GROW px of a pose's own
core, which removes the translucent background haze without deleting character pixels.
Every pose of a character gets ONE scale, from its front idle height (BODY px), and is trimmed to its own box with a pivot:
x = the pose's horizontal mass centre, y = its lowest opaque row (the ground). Dives and slides keep their size.
Side poses face right; "-w" mirrors are packed for leftward facing.
Sources are copied unchanged to docs/art/jungle-v4/source (sha256 checked against inventory.json).
Run: python3 scripts/art/build-jungle-v4.py <package dir>   (needs Pillow, numpy, scipy)
"""
import hashlib, json, pathlib, shutil, sys
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parents[2]
PKG = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/home/ubuntu/jbpkg/SoccerMaster_JungleBall_Replacement_Devin')
SRC = ROOT / 'docs/art/jungle-v4/source'
OUT = ROOT / 'src/assets/art/jungle-v4'
CORE, EDGE, GROW = 160, 24, 4
BODY = 150          # front idle height in atlas px (every pose of that character uses the same factor)
BALL = 64           # ball diameter in atlas px
PAD = 2

ACTIONS = (['run-0', 'run-1', 'run-2', 'run-3', 'run-4', 'run-5'],
           ['idle-s', 'idle-n', 'idle-e', 'receive', 'kick', 'taunt'],
           ['shot-0', 'shot-1', 'shot-2', 'shot-3', 'shot-4', 'shot-5'],
           ['push-0', 'push-1', 'stumble', 'down', 'seated', 'recovery'])
SLIDES = (['slide-0', 'slide-1', 'slide-2', 'slide-3', 'slide-4', 'slide-5'],
          ['rise-0', 'rise-1', 'rise-2', 'rise-3', 'rise-4', 'rise-5'])
KEEPER = (['ready', 'crouch', 'lateral-0', 'lateral-1', 'rear', 'side'],
          ['dive-a0', 'dive-a1', 'dive-a2', 'land-a', 'ground-a', 'up-a'],
          ['dive-b0', 'dive-b1', 'dive-b2', 'land-b', 'ground-b', 'up-b'],
          ['scoop', 'catch-chest', 'catch-high', 'roll', 'throw', 'punt'])
# Poses drawn front/back-on (no mirrored copy needed).
NO_MIRROR = {'idle-s', 'idle-n', 'ready', 'crouch', 'rear', 'catch-chest', 'catch-high', 'scoop'}
CHARS = ('boy', 'girl', 'sam', 'blake', 'rival')


def poses(path, rows, cols):
    im = Image.open(path).convert('RGBA')
    A = np.array(im)
    al = A[:, :, 3]
    core = al >= CORE
    lab, n = ndimage.label(core, structure=np.ones((3, 3)))
    cw = im.width / cols
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if sl is None or sl[1].stop - sl[1].start <= 1.5 * cw:
            continue
        sub = lab[sl] == i + 1
        er, k = sub.copy(), 0
        while True:
            er = ndimage.binary_erosion(er)
            k += 1
            l2, n2 = ndimage.label(er)
            sz = ndimage.sum(er, l2, range(1, n2 + 1)) if n2 else []
            if n2 >= 2 and sorted(sz)[-2] > 0.2 * max(sz):
                break
            assert k < 60, ('cannot split touching poses', path)
        a, b = [int(j) + 1 for j in np.argsort(sz)[-2:]]
        _, (iy, ix) = ndimage.distance_transform_edt(~((l2 == a) | (l2 == b)), return_indices=True)
        part = np.zeros_like(core)
        part[sl] = sub & (l2[iy, ix] == b)
        lab[part] = n + 1
        n += 1
        print(f'  {path.name}: split two touching poses ({k} erosions)')
    idx = np.arange(1, n + 1)
    sizes = ndimage.sum(core, lab, idx)
    cents = ndimage.center_of_mass(core, lab, idx)
    big = [i for i in range(n) if sizes[i] >= 0.15 * sizes.max()]
    assert len(big) == rows * cols, (path.name, len(big))
    order = sorted(big, key=lambda i: cents[i][0])
    gaps = sorted(range(1, len(order)), key=lambda k: cents[order[k]][0] - cents[order[k - 1]][0])[-(rows - 1):] if rows > 1 else []
    bounds = [0] + sorted(gaps) + [len(order)]
    seed = {}
    for r in range(rows):
        row = sorted(order[bounds[r]:bounds[r + 1]], key=lambda i: cents[i][1])
        assert len(row) == cols, (path.name, r, len(row))
        for c, i in enumerate(row):
            seed[i] = (r, c)
    groups = {v: [i + 1] for i, v in seed.items()}
    for i in range(n):
        if i in seed or sizes[i] < 30:
            continue
        j = min(big, key=lambda b: (cents[b][0] - cents[i][0]) ** 2 + (cents[b][1] - cents[i][1]) ** 2)
        groups[seed[j]].append(i + 1)
    out = {}
    for (r, c), ids in groups.items():
        own = np.isin(lab, ids)
        m = ndimage.binary_dilation(own, iterations=GROW) & (al > EDGE)
        m &= own | ~ndimage.binary_dilation(core & ~own, iterations=1)
        ys, xs = np.nonzero(m)
        box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        px = A.copy()
        px[:, :, 3] = np.where(m, al, 0)
        out[(r, c)] = (Image.fromarray(px).crop(box), box)
    return im.size, out


def scaled(img, k):
    w, h = max(1, round(img.width * k)), max(1, round(img.height * k))
    sm = np.array(img.resize((w, h), Image.LANCZOS))
    sm[:, :, 3][sm[:, :, 3] <= EDGE] = 0
    ys, xs = np.nonzero(sm[:, :, 3])
    sm = sm[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return Image.fromarray(sm)


def pivot(img):
    a = np.array(img)[:, :, 3] > EDGE
    return float(np.nonzero(a)[1].mean()), float(img.height)


def pack(name, frames, meta):
    """Shelf-pack trimmed frames; JSON hash with each frame's pivot (pixels inside the trimmed frame)."""
    items = sorted(frames.items(), key=lambda kv: -kv[1].height)
    width = 2048
    x = y = shelf = 0
    place = {}
    for n, im in items:
        if x + im.width + PAD > width:
            x, y, shelf = 0, y + shelf + PAD, 0
        place[n] = (x, y)
        x += im.width + PAD
        shelf = max(shelf, im.height)
    height = y + shelf
    atlas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    data = {}
    for n, im in frames.items():
        px, py = place[n]
        atlas.alpha_composite(im, (px, py))
        pvx, pvy = meta['pivots'][n]
        data[n] = {'frame': {'x': px, 'y': py, 'w': im.width, 'h': im.height}, 'rotated': False, 'trimmed': False,
                   'spriteSourceSize': {'x': 0, 'y': 0, 'w': im.width, 'h': im.height}, 'sourceSize': {'w': im.width, 'h': im.height},
                   'pivot': {'x': round(pvx / im.width, 4), 'y': round(pvy / im.height, 4)}}
    atlas.save(OUT / f'{name}.webp', 'WEBP', lossless=True, method=6)
    m = {k: v for k, v in meta.items() if k != 'pivots'}
    m.update({'image': f'{name}.webp', 'size': {'w': width, 'h': height}, 'scale': '1'})
    (OUT / f'{name}.json').write_text(json.dumps({'frames': data, 'meta': m}, indent=1, sort_keys=True) + '\n')
    print(name, len(frames), 'frames', atlas.size)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    SRC.mkdir(parents=True, exist_ok=True)
    inv = {e['file']: e for e in json.loads((PKG / 'inventory.json').read_text())}
    for f, e in inv.items():
        raw = (PKG / f).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == e['sha256'], f
        shutil.copyfile(PKG / f, SRC / f)
    shutil.copyfile(PKG / 'inventory.json', SRC / 'inventory.json')
    shutil.copyfile(PKG / 'DEVIN_START_HERE.txt', SRC / 'DEVIN_START_HERE.txt')
    report = {}
    for ch in CHARS + ('keeper',):
        sheets = [('goalkeeper_actions.png', KEEPER)] if ch == 'keeper' else [(f'{ch}_actions.png', ACTIONS), (f'{ch}_slide.png', SLIDES)]
        cut = {}
        for f, names in sheets:
            _, ps = poses(PKG / f, len(names), len(names[0]))
            for (r, c), (img, box) in ps.items():
                cut[names[r][c]] = (img, f, box)
        ref = cut['ready' if ch == 'keeper' else 'idle-s'][0]
        k = BODY / ref.height
        # The slide sheet is drawn at its own scale: match its jog-recovery pose to the action run height.
        frames, pivots, src = {}, {}, {}
        ks = {}
        if ch != 'keeper':
            run_h = np.median([cut[f'run-{i}'][0].height for i in range(6)])
            ks[f'{ch}_slide.png'] = float(run_h / cut['rise-5'][0].height)
        for n, (img, f, box) in cut.items():
            im = scaled(img, k * ks.get(f, 1.0))
            frames[n], pivots[n], src[n] = im, pivot(im), {'sheet': f, 'box': box}
            if n not in NO_MIRROR:
                w = ImageOps.mirror(im)
                frames[f'{n}-w'], pivots[f'{n}-w'] = w, (im.width - pivots[n][0], pivots[n][1])
        report[ch] = {'scale': round(k, 5), 'slideSheetFactor': round(ks.get(f'{ch}_slide.png', 1.0), 5), 'frames': src}
        pack(f'jungle4-{ch}', frames, {'bodyHeight': BODY, 'package': 'SoccerMaster_JungleBall_Replacement_Devin',
                                       'source': [s for s, _ in sheets], 'pivots': pivots})
    # Ball: 12 rotation poses, each normalised to the same diameter and centred (so spin never wobbles the radius).
    _, ps = poses(PKG / 'soccer_ball.png', 3, 4)
    frames, pivots = {}, {}
    for (r, c), (img, box) in sorted(ps.items()):
        d = max(img.width, img.height)
        sq = Image.new('RGBA', (d, d), (0, 0, 0, 0))
        sq.alpha_composite(img, ((d - img.width) // 2, (d - img.height) // 2))
        n = f'ball-{r * 4 + c}'
        frames[n] = sq.resize((BALL, BALL), Image.LANCZOS)
        pivots[n] = (BALL / 2, BALL / 2)
    pack('jungle4-ball', frames, {'diameter': BALL, 'package': 'SoccerMaster_JungleBall_Replacement_Devin', 'source': ['soccer_ball.png'], 'pivots': pivots})
    (ROOT / 'docs/art/jungle-v4/frames.json').write_text(json.dumps(report, indent=1, sort_keys=True) + '\n')
    lines = [f"{inv[f]['sha256']}  {f}" for f in sorted(inv)]
    (SRC / 'SHA256SUMS').write_text('\n'.join(lines) + '\n')


main()
