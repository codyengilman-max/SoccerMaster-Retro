#!/usr/bin/env python3
"""Cloudy's Feeding Frenzy art (owner, 2026-10-23): aquarium background + Cloudy 16-pose sheet.

Sources are copied unchanged to docs/art/cloudy/source/. The sheet is already transparent RGBA (checked: no matte).
Poses sit on a nominal 4x4 grid of 384x256 cells; one eating pose touches the next row, so row/column cuts are the
emptiest lines near the nominal boundaries (same method as build-jungle-sprites.py). Each pose is cropped to its
visible pixels, scaled so every frame has the median swim-pose body length (front/up/down use their own height
against the swim height), and centred in a 200x140 cell. Output: src/assets/art/cloudy/cloudy.webp + .json and
aquarium.webp (lossless, same 1536x1024 size so normalized goal coordinates stay valid).
Run: python3 scripts/art/build-cloudy-art.py <aquarium.png> <cloudy-sheet.png>
"""
import hashlib, json, pathlib, shutil, sys
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'docs/art/cloudy/source'
OUT = ROOT / 'src/assets/art/cloudy'
CW, CH = 200, 140
NAMES = ['swim-0', 'swim-1', 'swim-2', 'swim-3', 'left', 'up', 'down', 'front',
         'eat-0', 'eat-1', 'eat-2', 'eat-3', 'dash-0', 'dash-1', 'celebrate', 'idle']


def cut(profile, nominal, slack=45):
    lo, hi = int(nominal - slack), int(nominal + slack)
    return lo + int(np.argmin(profile[lo:hi]))


def poses(im):
    a = (np.array(im)[:, :, 3] > 24).astype(np.int32)
    rows = [0] + [cut(a.sum(1), im.height / 4 * r) for r in range(1, 4)] + [im.height]
    out = []
    for r in range(4):
        band = a[rows[r]:rows[r + 1]]
        cols = [0] + [cut(band.sum(0), im.width / 4 * c) for c in range(1, 4)] + [im.width]
        for c in range(4):
            ys, xs = np.nonzero(band[:, cols[c]:cols[c + 1]])
            assert ys.size > 2000, (r, c)
            box = (cols[c] + xs.min(), rows[r] + ys.min(), cols[c] + xs.max() + 1, rows[r] + ys.max() + 1)
            crop = np.array(im.crop(box))
            crop[:, :, 3][crop[:, :, 3] <= 24] = 0
            out.append(Image.fromarray(crop))
    return out


def main(bg_path, sheet_path):
    SRC.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    sums = {}
    for p, name in ((bg_path, 'aquarium.png'), (sheet_path, 'cloudy-sheet.png')):
        shutil.copyfile(p, SRC / name)
        sums[name] = hashlib.sha256((SRC / name).read_bytes()).hexdigest()
    bg = Image.open(SRC / 'aquarium.png').convert('RGB')
    assert bg.size == (1536, 1024), bg.size
    bg.save(OUT / 'aquarium.webp', 'WEBP', quality=90, method=6)
    sheet = Image.open(SRC / 'cloudy-sheet.png')
    assert sheet.mode == 'RGBA' and np.array(sheet)[0, 0, 3] == 0, 'sheet must be transparent'
    ps = poses(sheet)
    swim_w = float(np.median([ps[i].width for i in range(4)]))
    swim_h = float(np.median([ps[i].height for i in range(4)]))
    # Side views share the swim body length; head-on/vertical views share the swim body height.
    k_side = (CW - 16) / swim_w
    atlas = Image.new('RGBA', (CW * 8, CH * 2), (0, 0, 0, 0))
    frames = {}
    for i, (name, im) in enumerate(zip(NAMES, ps)):
        k = k_side
        w, h = max(1, round(im.width * k)), max(1, round(im.height * k))
        if w > CW - 4 or h > CH - 4:
            s = min((CW - 4) / w, (CH - 4) / h)
            w, h = round(w * s), round(h * s)
        sm = im.resize((w, h), Image.LANCZOS)
        x, y = (i % 8) * CW, (i // 8) * CH
        atlas.alpha_composite(sm, (x + (CW - w) // 2, y + (CH - h) // 2))
        frames[name] = {'frame': {'x': x, 'y': y, 'w': CW, 'h': CH}, 'rotated': False, 'trimmed': False,
                        'spriteSourceSize': {'x': 0, 'y': 0, 'w': CW, 'h': CH}, 'sourceSize': {'w': CW, 'h': CH},
                        'bodyBox': [(CW - w) // 2, (CH - h) // 2, (CW - w) // 2 + w, (CH - h) // 2 + h]}
    atlas.save(OUT / 'cloudy.webp', 'WEBP', lossless=True, method=6)
    meta = {'image': 'cloudy.webp', 'size': {'w': atlas.width, 'h': atlas.height}, 'scale': '1', 'cell': {'w': CW, 'h': CH},
            'anchor': 'cell centre', 'facing': 'swim/eat/dash/celebrate/idle face right; mirror for left',
            'source': 'docs/art/cloudy/source/cloudy-sheet.png', 'sourceSha256': sums['cloudy-sheet.png'],
            'background': 'docs/art/cloudy/source/aquarium.png', 'backgroundSha256': sums['aquarium.png']}
    (OUT / 'cloudy.json').write_text(json.dumps({'frames': frames, 'meta': meta}, indent=1, sort_keys=True) + '\n')
    print(json.dumps(sums, indent=1))
    for n in NAMES:
        print(n, frames[n]['bodyBox'])


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
