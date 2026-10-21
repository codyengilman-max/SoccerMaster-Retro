#!/usr/bin/env python3
"""Jungle Ball sheets (owner package SoccerMaster_Jungle_Ball_Devin): name the package's clip frames and pack runtime atlases.

Source sheets are copied unchanged to docs/art/sprites-v2/source/jungle-<id>.png. Frames come from the package's own
atlas rectangles (6x4 grid of 160x128 cells, feet on (80,120)) and are named from its clips.json, never guessed.
Side poses face right in the sheet; a pre-mirrored "-w" copy is packed for leftward facing (the package's flipX).
Main-character frames 18-21 (hand actions) are never packed. Output: src/assets/art/sprites-v2/jungle-<id>.webp/.json.
Run: python3 scripts/art/build-jungle-sprites.py <package dir>   (needs Pillow, numpy)
"""
import hashlib, json, pathlib, shutil, sys
import numpy as np
from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parents[2]
PKG = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/home/ubuntu/pkg/jb/SoccerMaster_Jungle_Ball_Devin')
SRC = ROOT / 'docs/art/sprites-v2/source'
OUT = ROOT / 'src/assets/art/sprites-v2'
CELL_W, CELL_H, AX, AY, BODY = 160, 128, 80, 120, 100
SETS = {'boy': 'player_boy', 'girl': 'player_girl', 'blake': 'blake', 'sam': 'sam'}
EXCLUDED_MAIN = {18, 19, 20, 21}

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
    lines.append(f"{hashlib.sha256((SRC / f'jungle-{sid}.png').read_bytes()).hexdigest()}  jungle-{sid}.png")
(SRC / 'SHA256SUMS').write_text('\n'.join(lines) + '\n')
