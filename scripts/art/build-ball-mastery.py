#!/usr/bin/env python3
"""Ball Mastery art v1: clean transparent derivatives of the owner's draft sheets (sources kept unchanged).

Thresholds the background haze, makes body pixels opaque, slices each figure by its measured bounds,
and records rectangles + foot anchors (lowest opaque row, centre of the two lowest boot blobs).
Output: docs/art/ball-mastery-v1/derived/*.png and frames.json. Not a runtime atlas: no frame is approved.
"""
import json, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'docs/art/ball-mastery-v1/source'
OUT = ROOT / 'docs/art/ball-mastery-v1/derived'
HAZE = 24  # alpha at or below this is background haze

def clean(path):
    a = np.array(Image.open(path).convert('RGBA'))
    al = a[..., 3].astype(int)
    keep = al > HAZE
    # keep only components big enough to be art; fill pinholes inside figures
    lab, n = ndimage.label(keep)
    sizes = ndimage.sum(keep, lab, range(1, n + 1))
    big = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 400])
    big = ndimage.binary_fill_holes(big)
    out = a.copy()
    out[..., 3] = np.where(big, np.where(al >= 200, 255, np.clip(al * 255 // 200, 0, 255)), 0)
    out[~big, :3] = 0
    return out, big

def figures(mask, rows, cols):
    H, W = mask.shape
    res = []
    for r in range(rows):
        for c in range(cols):
            y0, y1, x0, x1 = r * H // rows, (r + 1) * H // rows, c * W // cols, (c + 1) * W // cols
            m = mask[y0:y1, x0:x1]
            ys, xs = np.nonzero(m)
            if not len(ys):
                res.append(None); continue
            res.append((int(x0 + xs.min()), int(y0 + ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)))
    return res

def boots_anchor(rgba, rect):
    x, y, w, h = rect
    crop = rgba[y:y + h, x:x + w].astype(int)
    blue = (crop[..., 2] > 150) & (crop[..., 0] < 120) & (crop[..., 3] > 0)
    lab, n = ndimage.label(blue)
    blobs = sorted(((ndimage.sum(blue, lab, i), i) for i in range(1, n + 1)), reverse=True)[:2]
    boots = []
    for _, i in blobs:
        ys, xs = np.nonzero(lab == i)
        boots.append({'x': int(x + xs.mean()), 'bottom': int(y + ys.max()), 'left': int(x + xs.min()), 'right': int(x + xs.max())})
    boots.sort(key=lambda b: b['x'])
    ground = max(b['bottom'] for b in boots) if boots else y + h - 1
    return boots, ground

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {'haze_alpha': HAZE, 'sheets': {}}
    for sex in ('boy', 'girl'):
        rgba, mask = clean(SRC / f'{sex}_contact_poses_DRAFT.png')
        Image.fromarray(rgba).save(OUT / f'{sex}_contact_poses_clean.png')
        frames = []
        for i, rect in enumerate(figures(mask, 3, 4)):
            boots, ground = boots_anchor(rgba, rect)
            frames.append({'id': f'P{i + 1}', 'rect': rect, 'boots_image_left_to_right': boots, 'ground_y': ground,
                           'anchor': {'x': int(sum(b['x'] for b in boots) / max(1, len(boots))), 'y': ground},
                           'visible_height': ground - rect[1] + 1})
        meta['sheets'][sex] = frames
    rgba, mask = clean(SRC / 'boots_and_ball_DRAFT.png')
    Image.fromarray(rgba).save(OUT / 'boots_and_ball_clean.png')
    meta['sheets']['boots_and_ball'] = [r for r in figures(mask, 4, 8)]
    (OUT / 'frames.json').write_text(json.dumps(meta, indent=1) + '\n')

if __name__ == '__main__':
    main()
