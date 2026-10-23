#!/usr/bin/env python3
"""Offline: Mom Replacement v2 (owner package, docs/art/season-one/assets/mom-v2, byte-identical).

Each supplied 512x512 portrait is placed unscaled at the bottom of a transparent 512x768 canvas
(cutscene portraits are 2:3, bottom-anchored) and written as src/assets/art/v1/mom2-<outfit>-<expr>.webp.
No recolouring, matte, crop or resize. Updates the Season One and runtime manifests; the six old
mom-* portraits stay in the docs manifest as retired (runtime: false) and leave the runtime.
Run: python3 scripts/art/build-mom-v2.py   (needs Pillow)
"""
import hashlib, json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
pkg = root / 'docs/art/season-one/assets/mom-v2'
rt = root / 'src/assets/art/v1'
OUTFITS = {'casual': 'casual teal', 'dressy': 'dressy burgundy'}
EXPRS = ['neutral', 'laughing', 'worried', 'firm', 'reassuring', 'proud']
OLD = ['mom-neutral', 'mom-proud', 'mom-worried', 'mom-laughing', 'mom-firm', 'mom-sad']

s1p = root / 'docs/art/season-one/asset-manifest.json'
s1 = json.loads(s1p.read_text())
rtp = rt / 'runtime-manifest.json'
rtm = json.loads(rtp.read_text())
s1['assets'] = [a for a in s1['assets'] if not a['assetId'].startswith('mom2-')]
rtm['assets'] = [a for a in rtm['assets'] if not a['assetId'].startswith('mom2-') and a['assetId'] not in OLD]
for a in s1['assets']:
    if a['assetId'] in OLD:
        a['runtime'] = False
        a['status'] = 'RETIRED_REPLACED_BY_MOM_V2'
for f in OLD:
    (rt / f'{f}.webp').unlink(missing_ok=True)
for outfit, label in OUTFITS.items():
    for e in EXPRS:
        src = pkg / 'portraits' / f'mom_{outfit}_{e}.png'
        raw = src.read_bytes()
        sha = hashlib.sha256(raw).hexdigest()
        cell = Image.open(src).convert('RGBA')
        assert cell.size == (512, 512), src
        canvas = Image.new('RGBA', (512, 768), (0, 0, 0, 0))
        canvas.alpha_composite(cell, (0, 256))
        aid = f'mom2-{outfit}-{e}'
        out = rt / f'{aid}.webp'
        canvas.save(out, 'WEBP', quality=92, method=6, exact=True)
        s1['assets'].append({
            'assetId': aid, 'path': f'assets/mom-v2/portraits/mom_{outfit}_{e}.png',
            'sourcePath': f'SoccerMaster_Mom_Replacement_v2_Devin.zip/Mom_Replacement_v2/portraits/mom_{outfit}_{e}.png',
            'type': 'portrait', 'characterId': 'caregiver', 'label': f'Mom ({label}, {e})', 'outfitId': outfit,
            'width': 512, 'height': 512, 'hasAlpha': True, 'sha256': sha, 'sizeBytes': len(raw),
            'status': 'REFERENCE_APPROVED', 'continuityFlags': ['owner_supplied_mom_v2'],
            'use': 'Mom standalone cutscene portrait (bottom-anchored on a transparent 2:3 canvas at runtime)', 'runtime': True,
        })
        rtm['assets'].append({'assetId': aid, 'file': out.name, 'width': 512, 'height': 768, 'masterSha256': sha, 'bytes': out.stat().st_size})
s1p.write_text(json.dumps(s1, indent=2) + '\n')
rtp.write_text(json.dumps(rtm, indent=2) + '\n')
print('ok', len(s1['assets']), len(rtm['assets']))
