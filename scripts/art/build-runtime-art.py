#!/usr/bin/env python3
"""Offline: derive runtime cutscene images from the unmodified Graphics v1 masters.

Masters stay byte-identical in docs/art/graphics-v1. Output goes to src/assets/art/v1/ as
lossless-alpha WebP at half resolution (premultiplied resize, so no edge halos), plus
runtime-manifest.json with each master's checksum. Needs Pillow. No network access.
Run: python3 scripts/art/build-runtime-art.py
"""
import hashlib, json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
pkg = root / 'docs/art/graphics-v1'
out = root / 'src/assets/art/v1'
out.mkdir(parents=True, exist_ok=True)
manifest = json.loads((pkg / 'assets/asset-manifest.json').read_text())
rows = []
for a in manifest['assets']:
    src = pkg / a['path']
    raw = src.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == a['sha256'], a['assetId']
    im = Image.open(src)
    im.load()
    w, h = im.width // 2, im.height // 2
    if a['hasAlpha']:
        small = im.convert('RGBA').convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')
        dst = out / f"{a['assetId']}.webp"
        small.save(dst, 'WEBP', quality=88, method=6, alpha_quality=100, exact=False)
    else:
        small = im.convert('RGB').resize((w, h), Image.LANCZOS)
        dst = out / f"{a['assetId']}.webp"
        small.save(dst, 'WEBP', quality=88, method=6)
    rows.append({'assetId': a['assetId'], 'file': dst.name, 'width': w, 'height': h, 'masterSha256': a['sha256'], 'bytes': dst.stat().st_size})
(out / 'runtime-manifest.json').write_text(json.dumps({'schemaVersion': 1, 'source': 'docs/art/graphics-v1/assets/asset-manifest.json', 'packageRevision': manifest.get('packageRevision'), 'assets': rows}, indent=2) + '\n')
print(len(rows), 'runtime images,', sum(r['bytes'] for r in rows), 'bytes')
