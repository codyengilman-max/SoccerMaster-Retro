#!/usr/bin/env python3
"""Offline: owner's standing Mom sheets (docs/art/season-one/assets/mom-v3/mom_sheet_<face>.png, byte-identical to
the chat attachments, 2026-10-26). Each 1448x1086 sheet shows the same face twice: casual teal overshirt on the left,
dressy burgundy wrap top on the right. They replace the v2 busts (512x512 padded onto 512x768, so Mom stood a third
shorter than the rest of the cast).

Each figure is cut out by its own alpha (largest connected shape on its side, plus the stray hair pixels on that
side), centred on a 780x1170 (2:3) transparent canvas with its bottom edge on the canvas bottom, and resized to
512x768 (Lanczos; the sheets are not on an integer pixel grid). No recolour, matte or redraw. Writes
src/assets/art/v1/mom3-<outfit>-<face>.webp and updates both manifests.
Run: python3 scripts/art/build-mom-v3.py   (needs Pillow, numpy, scipy)
"""
import hashlib, json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

root = Path(__file__).resolve().parents[2]
pkg = root / 'docs/art/season-one/assets/mom-v3'
rt = root / 'src/assets/art/v1'
FACES = ['confident', 'worried', 'smiling']
OUTFITS = {'casual': ('left', 'casual teal overshirt'), 'dressy': ('right', 'dressy burgundy wrap top')}
CW, CH = 780, 1170
s1p = root / 'docs/art/season-one/asset-manifest.json'
s1 = json.loads(s1p.read_text())
rtp = rt / 'runtime-manifest.json'
rtm = json.loads(rtp.read_text())
s1['assets'] = [a for a in s1['assets'] if not a['assetId'].startswith('mom3-')]
rtm['assets'] = [a for a in rtm['assets'] if not a['assetId'].startswith('mom3-')]


def figures(im):
    a = np.array(im)
    lab, n = ndimage.label(a[..., 3] > 0)
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    big = sorted(np.argsort(sizes)[-2:] + 1, key=lambda i: np.where(lab == i)[1].mean())
    assert all(sizes[i - 1] > 300000 for i in big), 'expected two figures'
    cx = [np.where(lab == i)[1].mean() for i in big]
    split = (cx[0] + cx[1]) / 2
    centres = ndimage.center_of_mass(np.ones_like(lab), lab, range(1, n + 1))
    out = []
    for side, i in enumerate(big):
        keep = {i} | {j + 1 for j, c in enumerate(centres) if j + 1 not in big and (c[1] < split) == (side == 0)}
        m = np.isin(lab, list(keep))
        cut = a.copy()
        cut[~m] = 0
        ys, xs = np.where(m)
        out.append(Image.fromarray(cut).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)))
    return out


for face in FACES:
    src = pkg / f'mom_sheet_{face}.png'
    raw = src.read_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    im = Image.open(src)
    assert im.mode == 'RGBA' and im.size == (1448, 1086), src
    figs = dict(zip(['left', 'right'], figures(im)))
    for outfit, (side, label) in OUTFITS.items():
        fig = figs[side]
        assert fig.width <= CW and fig.height <= CH, (src, side, fig.size)
        canvas = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
        canvas.alpha_composite(fig, ((CW - fig.width) // 2, CH - fig.height))
        small = canvas.resize((512, 768), Image.LANCZOS)
        aid = f'mom3-{outfit}-{face}'
        out = rt / f'{aid}.webp'
        small.save(out, 'WEBP', lossless=True, method=6, exact=True)
        s1['assets'].append({
            'assetId': aid, 'path': f'assets/mom-v3/mom_sheet_{face}.png', 'crop': side,
            'sourcePath': f'owner chat attachment (standing Mom sheet, {face}, 2026-10-26)',
            'type': 'portrait', 'characterId': 'caregiver', 'label': f'Mom standing ({label}, {face})', 'outfitId': outfit,
            'width': 1448, 'height': 1086, 'hasAlpha': True, 'sha256': sha, 'sizeBytes': len(raw),
            'status': 'REFERENCE_APPROVED', 'continuityFlags': ['owner_supplied_mom_v3'],
            'use': f'Mom standalone cutscene portrait ({side} figure of the sheet, bottom-anchored on a 2:3 canvas)', 'runtime': True,
        })
        rtm['assets'].append({'assetId': aid, 'file': out.name, 'width': 512, 'height': 768, 'masterSha256': sha, 'bytes': out.stat().st_size})
s1p.write_text(json.dumps(s1, indent=2) + '\n')
rtp.write_text(json.dumps(rtm, indent=2) + '\n')
print('ok', len(s1['assets']), len(rtm['assets']))
