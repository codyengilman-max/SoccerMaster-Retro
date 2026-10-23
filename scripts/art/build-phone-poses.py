#!/usr/bin/env python3
"""Offline: the owner's five "main characters on their phones" images (docs/art/season-one/assets/phones,
byte-identical to the supplied PNGs). Each is one character in one existing pose; it is downscaled exactly 2:1
(1024x1536 -> 512x768, nearest-neighbour so the pixel art stays crisp) with its own transparency kept, and
written as src/assets/art/v1/phone-<who>.webp. No recolouring, matte or crop. Updates both manifests.
Run: python3 scripts/art/build-phone-poses.py   (needs Pillow)
"""
import hashlib, json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
pkg = root / 'docs/art/season-one/assets/phones'
rt = root / 'src/assets/art/v1'
WHO = {'blake': ('blake', 'Blake'), 'sam': ('sam', 'Sam'), 'boy': ('boy', 'player (boy)'), 'girl': ('girl', 'player (girl)'), 'mom-dressy': ('caregiver', 'Mom (dressy burgundy)')}
s1p = root / 'docs/art/season-one/asset-manifest.json'
s1 = json.loads(s1p.read_text())
rtp = rt / 'runtime-manifest.json'
rtm = json.loads(rtp.read_text())
s1['assets'] = [a for a in s1['assets'] if not a['assetId'].startswith('phone-')]
rtm['assets'] = [a for a in rtm['assets'] if not a['assetId'].startswith('phone-')]
for who, (char, label) in WHO.items():
    src = pkg / f'phone-{who}.png'
    raw = src.read_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    im = Image.open(src)
    assert im.mode == 'RGBA' and im.size == (1024, 1536), src
    # Top corners are fully clear; the figure may run off the bottom edge (bottom-anchored portrait).
    assert all(im.getpixel(p)[3] == 0 for p in [(0, 0), (1023, 0)]) and all(im.getpixel(p)[3] <= 8 for p in [(0, 1535), (1023, 1535)]), f'{src}: corners must be transparent'
    small = im.resize((512, 768), Image.NEAREST)
    aid = f'phone-{who}'
    out = rt / f'{aid}.webp'
    small.save(out, 'WEBP', lossless=True, method=6, exact=True)
    s1['assets'].append({
        'assetId': aid, 'path': f'assets/phones/phone-{who}.png', 'sourcePath': f'owner chat attachment ({label} on phone)',
        'type': 'portrait', 'characterId': char, 'label': f'{label} using a phone', 'outfitId': 'phone',
        'width': 1024, 'height': 1536, 'hasAlpha': True, 'sha256': sha, 'sizeBytes': len(raw),
        'status': 'REFERENCE_APPROVED', 'continuityFlags': ['owner_supplied_phone_pose'],
        'use': 'Shown only on story lines where this character is explicitly using a phone', 'runtime': True,
    })
    rtm['assets'].append({'assetId': aid, 'file': out.name, 'width': 512, 'height': 768, 'masterSha256': sha, 'bytes': out.stat().st_size})
s1p.write_text(json.dumps(s1, indent=2) + '\n')
rtp.write_text(json.dumps(rtm, indent=2) + '\n')
print('ok', len(s1['assets']), len(rtm['assets']))
