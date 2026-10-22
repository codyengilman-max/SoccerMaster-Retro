#!/usr/bin/env python3
"""Jungle Ball sheets (owner package SoccerMaster_Jungle_Ball_Devin): name the package's clip frames and pack runtime atlases.

Source sheets are copied unchanged to docs/art/sprites-v2/source/jungle-<id>.png. Frames come from the package's own
atlas rectangles (6x4 grid of 160x128 cells, feet on (80,120)) and are named from its clips.json, never guessed.
Side poses face right in the sheet; a pre-mirrored "-w" copy is packed for leftward facing (the package's flipX).
Main-character frames 18-21 (hand actions) are never packed. Output: src/assets/art/sprites-v2/jungle-<id>.webp/.json.
Owner action sheets (2026-10-22, docs/art/sprites-v2/source/jungle-<id>-actions.png, 6x5 poses on 1536x1024) add the
contact poses: impact, fall, grounded, dazed, getting up, sprint, charged shot and shoulder charge. Each pose is found
by its connected pixels (assigned to the nominal 256x204.8 cell by centroid, so the dazed stars stay with their frame),
scaled so the sprint matches the package run height, and bottom-centred on the same (80,120) anchor.
Run: python3 scripts/art/build-jungle-sprites.py <package dir>   (needs Pillow, numpy, scipy)
"""
import hashlib, json, pathlib, shutil, sys
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parents[2]
PKG = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/home/ubuntu/pkg/jb/SoccerMaster_Jungle_Ball_Devin')
SRC = ROOT / 'docs/art/sprites-v2/source'
OUT = ROOT / 'src/assets/art/sprites-v2'
CELL_W, CELL_H, AX, AY, BODY = 160, 128, 80, 120, 100
SETS = {'boy': 'player_boy', 'girl': 'player_girl', 'blake': 'blake', 'sam': 'sam'}
EXCLUDED_MAIN = {18, 19, 20, 21}
# Owner action sheets: row-major pose index -> frame name (side poses face right; "-w" mirrors are packed too).
ACTION_NAMES = (['impact', 'fall-0', 'fall-1', 'down-0', 'down-1', 'down-2', 'down-3', 'dazed-0', 'dazed-1', 'rise-0', 'rise-1', 'rise-2']
                + [f'sprint-{i}' for i in range(6)] + [f'shot-{i}' for i in range(6)] + [f'hit-{i}' for i in range(6)])


def _cut(profile, nominal, slack):
    """Index of the emptiest line within `slack` of a nominal grid boundary."""
    lo, hi = int(nominal - slack), int(nominal + slack)
    return lo + int(np.argmin(profile[lo:hi]))


def action_cells(path):
    """30 poses from a 6x5 owner sheet. Row cuts are the emptiest lines near the nominal 204.8 px boundaries (so the
    dazed stars stay with their frame); column cuts are found the same way inside each row band."""
    im = Image.open(path).convert('RGBA')
    a = (np.array(im)[:, :, 3] > 24).astype(np.int32)
    cw, ch = im.width / 6, im.height / 5
    rows = [0] + [_cut(a.sum(1), ch * r, 45) for r in range(1, 5)] + [im.height]
    out = []
    for r in range(5):
        band = a[rows[r]:rows[r + 1]]
        cols = [0] + [_cut(band.sum(0), cw * c, 45) for c in range(1, 6)] + [im.width]
        for c in range(6):
            cell = band[:, cols[c]:cols[c + 1]]
            ys, xs = np.nonzero(cell)
            assert ys.size > 400, (path, r, c)
            box = (cols[c] + xs.min(), rows[r] + ys.min(), cols[c] + xs.max() + 1, rows[r] + ys.max() + 1)
            crop = np.array(im.crop(box))
            crop[:, :, 3][crop[:, :, 3] <= 24] = 0
            out.append(Image.fromarray(crop))
    return out


def fit_cell(im, k):
    """Scale by k and bottom-centre on the (AX, AY) anchor of a 160x128 cell."""
    w, h = max(1, round(im.width * k)), max(1, round(im.height * k))
    sm = im.resize((w, h), Image.LANCZOS)
    assert w <= CELL_W and h <= AY, (w, h)
    cell = Image.new('RGBA', (CELL_W, CELL_H), (0, 0, 0, 0))
    cell.alpha_composite(sm, (AX - w // 2, AY - h))
    return cell

sums = dict(reversed(l.split()) for l in (PKG / 'SHA256SUMS.txt').read_text().splitlines() if l.strip())
for sid, name in SETS.items():
    src_png = PKG / 'sprites' / f'{name}.png'
    raw = src_png.read_bytes()
    want = sums.get(f'sprites/{name}.png') or sums.get(f'./sprites/{name}.png')
    assert want and hashlib.sha256(raw).hexdigest() == want, name
    dst_png = SRC / f'jungle-{sid}.png'
    shutil.copyfile(src_png, dst_png)
    sheet = Image.open(src_png).convert('RGBA')
    rects = json.loads((PKG / 'sprites' / f'{name}.json').read_text())['frames']
    clips = json.loads((PKG / 'sprites' / f'{name}.clips.json').read_text())
    assert tuple(clips['anchorPx']) == (AX, AY) and tuple(clips['cell']) == (CELL_W, CELL_H)
    main = sid in ('boy', 'girl')

    def cell(frame_id):
        idx = int(frame_id.rsplit('_', 1)[1])
        assert not (main and idx in EXCLUDED_MAIN), frame_id
        r = rects[frame_id]['frame']
        return sheet.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']))

    c = clips['clips']
    poses = {}
    def side(base, im):
        poses[base] = im
        poses[f'{base}-w'] = ImageOps.mirror(im)
    poses['idle-s'] = cell(c['idle_front']['frames'][0])
    poses['idle-n'] = cell(c['idle_back']['frames'][0])
    poses['idle-e'] = cell(c['idle_right']['frames'][0])
    # Main characters: the package's left idle is the mirrored right idle (source frame 8 faces right).
    poses['idle-w'] = ImageOps.mirror(poses['idle-e']) if main else cell(c['idle_left']['frames'][0])
    for i, f in enumerate(c['run_right']['frames']):
        side(f'run-{i}', cell(f))
    for i, f in enumerate(c['pass']['frames']):
        side(f'kick-{i}', cell(f))
    for i, f in enumerate(c.get('shoot', {}).get('frames', [])):
        side(f'shoot-{i}', cell(f))
    side('stumble', cell(c['stumble']['frames'][0]))
    poses['celebrate'] = cell(c['celebrate']['frames'][0])
    act_png = SRC / f'jungle-{sid}-actions.png'
    if act_png.exists():
        acts = action_cells(act_png)
        run_h = np.median([np.ptp(np.nonzero(np.array(poses[f'run-{i}'].split()[3]) > 24)[0]) + 1 for i in range(6)])
        sprint_h = np.median([acts[12 + i].height for i in range(6)])
        k = float(run_h / sprint_h)
        for name, im in zip(ACTION_NAMES, acts):
            side(name, fit_cell(im, k))

    names = list(poses)
    cols = 8
    rows = (len(names) + cols - 1) // cols
    atlas = Image.new('RGBA', (cols * CELL_W, rows * CELL_H), (0, 0, 0, 0))
    frames = {}
    for k, n in enumerate(names):
        x, y = (k % cols) * CELL_W, (k // cols) * CELL_H
        im = poses[n]
        atlas.alpha_composite(im, (x, y))
        a = np.array(im.split()[3])
        ys, xs = np.nonzero(a > 24)
        frames[n] = {'frame': {'x': x, 'y': y, 'w': CELL_W, 'h': CELL_H}, 'rotated': False, 'trimmed': False,
                     'spriteSourceSize': {'x': 0, 'y': 0, 'w': CELL_W, 'h': CELL_H}, 'sourceSize': {'w': CELL_W, 'h': CELL_H},
                     'bodyBox': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]}
    img = f'jungle-{sid}.webp'
    atlas.save(OUT / img, 'WEBP', lossless=True, method=6)
    meta = {'anchor': {'x': AX, 'y': AY}, 'bodyHeight': BODY, 'cell': {'h': CELL_H, 'w': CELL_W}, 'image': img, 'scale': '1',
            'size': {'h': atlas.height, 'w': atlas.width}, 'source': f'docs/art/sprites-v2/source/jungle-{sid}.png',
            'sourceSha256': want, 'package': 'SoccerMaster_Jungle_Ball_Devin', 'clips': f'sprites/{name}.clips.json'}
    (OUT / f'jungle-{sid}.json').write_text(json.dumps({'frames': frames, 'meta': meta}, indent=1, sort_keys=True) + '\n')
    feet = {n: f['bodyBox'][3] for n, f in frames.items() if abs(f['bodyBox'][3] - AY) > 1}
    print(sid, len(frames), 'frames', atlas.size, 'feet off anchor:', feet)

lines = [l for l in (SRC / 'SHA256SUMS').read_text().splitlines() if l.strip() and 'jungle-' not in l]
for sid in SETS:
    if (SRC / f'jungle-{sid}-actions.png').exists():
        lines.append(f"{hashlib.sha256((SRC / f'jungle-{sid}-actions.png').read_bytes()).hexdigest()}  jungle-{sid}-actions.png")
    lines.append(f"{hashlib.sha256((SRC / f'jungle-{sid}.png').read_bytes()).hexdigest()}  jungle-{sid}.png")
(SRC / 'SHA256SUMS').write_text('\n'.join(lines) + '\n')
