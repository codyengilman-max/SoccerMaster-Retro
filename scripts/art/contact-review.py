"""Tactical Moments contact-frame review sheets (owner decision 2026-11).

For every outfield team-training-v1 sheet: enlarged before-contact / contact / after-contact frames for the pass row
(7, 8, 9, 10) and the receive row (13, 14, 15), with an ESTIMATED foot/contact anchor and ball placement. Anatomical
foot, supporting foot and contact surface are NOT identified automatically: every entry is UNVERIFIED until the owner
reviews it. Writes docs/training/moments/contact/<sheet>.png and docs/training/moments/contact-frames.json.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / 'src/assets/art/team-training-v1'
OUT = ROOT / 'docs/training/moments/contact'
CELL = 160
SCALE = 3
SHEETS = ['boy', 'girl'] + [f'teammate_{i:02d}' for i in range(1, 8)] + [f'opponent_{i:02d}' for i in range(1, 9)]
ROWS = {'pass': [(7, 'before (plant)'), (8, 'before (plant)'), (9, 'CONTACT'), (10, 'after')], 'receive': [(13, 'before (reach)'), (14, 'CONTACT'), (15, 'after')]}
APPROACH = {'pass': 'ball at the foot, leaves along the facing direction at contact', 'receive': 'ball arrives toward the body along the facing direction, stops at the foot at contact'}


def cell(im, f):
    r, c = divmod(f, 6)
    return im.crop((c * CELL, r * CELL, c * CELL + CELL, r * CELL + CELL))


def anchor(fr):
    """Estimated contact point: the right-most opaque pixel in the lowest 30% of the body (toe of the forward foot)."""
    a = fr.getchannel('A')
    w, h = a.size
    px = a.load()
    ys = [y for y in range(h) for x in range(w) if px[x, y] > 128]
    if not ys:
        return None
    top, bottom = min(ys), max(ys)
    lo = int(bottom - 0.3 * (bottom - top))
    best = None
    for y in range(lo, bottom + 1):
        for x in range(w):
            if px[x, y] > 128 and (best is None or x > best[0]):
                best = (x, y)
    return best


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    meta = []
    for name in SHEETS:
        im = Image.open(ART / f'{name}.webp').convert('RGBA')
        cols = max(len(v) for v in ROWS.values())
        W, H = cols * CELL * SCALE, len(ROWS) * (CELL * SCALE + 40) + 50
        sheet = Image.new('RGBA', (W, H), (40, 96, 48, 255))
        d = ImageDraw.Draw(sheet)
        d.text((10, 10), f'{name}: anatomical foot / supporting foot / surface UNVERIFIED. Ball = estimated contact anchor. Mirrored (W) frames swap L/R.', fill=(255, 244, 220, 255))
        for ri, (row, frames) in enumerate(ROWS.items()):
            y0 = 50 + ri * (CELL * SCALE + 40)
            for ci, (f, stage) in enumerate(frames):
                fr = cell(im, f)
                big = fr.resize((CELL * SCALE, CELL * SCALE), Image.NEAREST)
                x0 = ci * CELL * SCALE
                sheet.alpha_composite(big, (x0, y0 + 20))
                d.text((x0 + 6, y0 + 2), f'{row} frame {f}: {stage}', fill=(242, 193, 78, 255))
                a = anchor(fr)
                if stage == 'CONTACT' and a:
                    bx, by = x0 + a[0] * SCALE, y0 + 20 + a[1] * SCALE
                    d.ellipse((bx - 14, by - 26, bx + 14, by + 2), outline=(255, 255, 255, 255), width=3)
                    d.text((bx + 18, by - 20), 'ball (est.)', fill=(255, 255, 255, 255))
                d.text((x0 + 6, y0 + 20 + CELL * SCALE - 34), 'L? / R?  UNVERIFIED', fill=(255, 80, 80, 255))
                if stage == 'CONTACT':
                    meta.append({'sheet': name, 'action': row, 'contactFrame': f, 'beforeFrames': [x for x, s in frames if s.startswith('before')], 'afterFrames': [x for x, s in frames if s == 'after'],
                                 'anatomicalContactFoot': 'UNVERIFIED', 'supportingFoot': 'UNVERIFIED', 'contactSurface': 'UNVERIFIED',
                                 'contactAnchorPx': {'x': a[0], 'y': a[1], 'estimated': True} if a else None, 'cellPx': CELL, 'feetAnchorPx': {'x': 80, 'y': 154},
                                 'ballApproachDeparture': APPROACH[row], 'mirrorRule': 'a true horizontal mirror swaps the anatomical foot, anchors and motion; it does not verify the original identification',
                                 'review': f'contact/{name}.png', 'status': 'UNVERIFIED'})
        sheet.convert('RGB').save(OUT / f'{name}.png', optimize=True)
    (ROOT / 'docs/training/moments/contact-frames.json').write_text(json.dumps(meta, indent=1) + '\n')
    print(len(meta), 'contact entries,', len(SHEETS), 'sheets')


if __name__ == '__main__':
    main()
