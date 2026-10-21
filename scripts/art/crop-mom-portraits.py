#!/usr/bin/env python3
"""Offline: cut the owner's Mom expression sheet (3x2 busts) into 2:3 cutscene portraits.

The sheet stays byte-identical in docs/art/season-one/assets/v2. Each bust is split at the
emptiest row/column band between cells and placed at the bottom of a transparent 512x768
canvas (cutscene portraits are 2:3, bottom-anchored). Needs Pillow + numpy. No network access.
Run: python3 scripts/art/crop-mom-portraits.py
"""
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[2]
d = root / 'docs/art/season-one/assets/v2'
sheet = Image.open(d / 'mom_expressions_source.png').convert('RGBA')
alpha = np.array(sheet.split()[3], dtype=np.int64)
H, W = alpha.shape

def cut(profile, lo, hi):
    return lo + int(np.argmin(profile[lo:hi]))

row = cut(alpha.sum(1), int(H * 0.44), int(H * 0.56))
xs = [0, cut(alpha.sum(0), int(W * 0.28), int(W * 0.38)), cut(alpha.sum(0), int(W * 0.62), int(W * 0.72)), W]
NAMES = [['neutral', 'proud', 'worried'], ['laughing', 'firm', 'sad']]
for r, (y0, y1) in enumerate([(0, row), (row, H)]):
    for c in range(3):
        cell = sheet.crop((xs[c], y0, xs[c + 1], y1))
        bb = cell.getbbox()
        bust = cell.crop(bb)
        k = min(480 / bust.width, 520 / bust.height)
        bust = bust.resize((round(bust.width * k), round(bust.height * k)), Image.LANCZOS)
        out = Image.new('RGBA', (512, 768), (0, 0, 0, 0))
        out.alpha_composite(bust, ((512 - bust.width) // 2, 768 - bust.height))
        out.save(d / f'mom_{NAMES[r][c]}.png', optimize=True)
        print(NAMES[r][c], (xs[c], y0, xs[c + 1], y1), bb, bust.size)
print('split row', row, 'cols', xs)
