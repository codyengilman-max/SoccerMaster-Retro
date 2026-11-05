"""Reference thumbnails for docs/training/moments/ART_BRIEF.md: the standing frame of each existing runtime sheet, unchanged."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'src/assets/art/team-training-v1'
OUT = ROOT / 'docs/training/moments/art-brief'
CELL = 160
STAND = 6  # outfield atlas frame 6 (row 1, col 0); keeper strip pose 0 = stand
OUT.mkdir(parents=True, exist_ok=True)
names = ['boy', 'girl'] + [f'teammate_{i:02d}' for i in range(1, 8)] + [f'opponent_{i:02d}' for i in range(1, 9)] + ['keeper_home', 'keeper_away']
for n in names:
    im = Image.open(SRC / f'{n}.webp').convert('RGBA')
    f = 0 if n.startswith('keeper') else STAND
    x, y = (f % 6) * CELL, (f // 6) * CELL
    im.crop((x, y, x + CELL, y + CELL)).save(OUT / f'{n}.png', optimize=True)
print(len(names), 'thumbnails')
