#!/usr/bin/env python3
"""Offline: runtime images from the unmodified Tournament Art v1 and Diverse Rosters v1 sources.

Sources stay byte-identical in docs/art/tournament-v1 and docs/art/rosters-v1 (checked against
FILE_INVENTORY.json). Backgrounds are re-encoded whole; components, reactions and portraits are cut
from the ASSET_MAP.json source rectangles and trimmed to their visible pixels. Roster figures are
found as alpha islands (9 per sheet, row-major) for the Art Gallery only: they are single standing
references, not gameplay animation. Output: src/assets/art/tournament/*.webp + manifest.json.
Run: python3 scripts/art/build-tournament-art.py
"""
import hashlib, json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

root = Path(__file__).resolve().parents[2]
art = root / 'docs/art'
out = root / 'src/assets/art/tournament'
out.mkdir(parents=True, exist_ok=True)
inventory = {e['path']: e['sha256'] for e in json.loads((art / 'FILE_INVENTORY.json').read_text())}
pkg = {'SoccerMaster_Tournament_Art_v1': art / 'tournament-v1', 'SoccerMaster_Diverse_Rosters_v1': art / 'rosters-v1'}

def source(folder: str, rel: str) -> Image.Image:
    p = pkg[folder] / rel
    assert inventory.get(f'{folder}/{rel}') == hashlib.sha256(p.read_bytes()).hexdigest(), f'{folder}/{rel} does not match FILE_INVENTORY.json'
    im = Image.open(p); im.load(); return im

rows = []
def save(asset_id: str, im: Image.Image, src: str, scale: float = 1.0, alpha: bool = True) -> None:
    if scale != 1.0:
        w, h = max(1, round(im.width * scale)), max(1, round(im.height * scale))
        im = im.convert('RGBA').convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA') if alpha else im.convert('RGB').resize((w, h), Image.LANCZOS)
    dst = out / f'{asset_id}.webp'
    (im.convert('RGBA') if alpha else im.convert('RGB')).save(dst, 'WEBP', quality=88, method=6, alpha_quality=100, exact=False)
    rows.append({'assetId': asset_id, 'file': dst.name, 'width': im.width, 'height': im.height, 'source': src, 'bytes': dst.stat().st_size})

def trim(im: Image.Image, pad: int = 4) -> Image.Image:
    a = np.array(im.convert('RGBA'))[:, :, 3] > 8
    ys, xs = np.where(a)
    if not len(xs): return im
    return im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + 1 + pad), min(im.height, ys.max() + 1 + pad)))

amap = json.loads((pkg['SoccerMaster_Tournament_Art_v1'] / 'ASSET_MAP.json').read_text())
T = 'SoccerMaster_Tournament_Art_v1'
for a in amap['assets']:
    im = source(T, a['file'])
    if not a.get('regions'):
        save(a['id'].replace('_', '-'), im, a['file'], 2 / 3, alpha=False)
        continue
    for r in a['regions']:
        x, y, w, h = r['rect']
        piece = trim(im.convert('RGBA').crop((x, y, x + w, y + h)))
        # Gameplay source cells stay at source scale for review; everything else is UI-sized.
        save(f"{a['id']}-{r['name']}".replace('_', '-'), piece, f"{a['file']}#{r['name']}", 1.0 if 'gameplay' in a['id'] else 0.5)

R = 'SoccerMaster_Diverse_Rosters_v1'
roster = json.loads((pkg[R] / 'roster_manifest.json').read_text())
for t in roster['teams']:
    im = source(R, t['file']).convert('RGBA')
    a = np.array(im)[:, :, 3] > 16
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=6))
    boxes = ndimage.find_objects(lab)
    sizes = ndimage.sum(a, lab, range(1, n + 1))
    figs = [boxes[i] for i in range(n) if sizes[i] > 0.25 * sizes.max()]
    # Two figures standing on top of each other can touch (feet to hair): split those at their thinnest row.
    med = float(np.median([f[0].stop - f[0].start for f in figs]))
    split = []
    for f in figs:
        h = f[0].stop - f[0].start
        if h > 1.6 * med:
            prof = a[f].sum(1)
            lo, hi = int(h * 0.3), int(h * 0.7)
            cut = f[0].start + lo + int(np.argmin(prof[lo:hi]))
            split += [(slice(f[0].start, cut), f[1]), (slice(cut, f[0].stop), f[1])]
        else:
            split.append(f)
    figs = split
    assert len(figs) == 9, f"{t['id']}: expected 9 figures, found {len(figs)}"
    figs.sort(key=lambda s: (s[0].start + s[0].stop) / 2)
    ordered = []
    for r in range(3):
        ordered += sorted(figs[r * 3:r * 3 + 3], key=lambda s: s[1].start)
    for d, s in zip(t['designs'], ordered):
        piece = trim(im.crop((s[1].start, s[0].start, s[1].stop, s[0].stop)))
        save(f"roster-{d['appearance_id']}".replace('_', '-'), piece, f"{t['file']}#r{d['row']}c{d['column']}", 0.5)

(out / 'manifest.json').write_text(json.dumps({'schemaVersion': 1, 'source': ['docs/art/tournament-v1/ASSET_MAP.json', 'docs/art/rosters-v1/roster_manifest.json'], 'assets': rows}, indent=2) + '\n')
print(len(rows), 'runtime images,', sum(r['bytes'] for r in rows), 'bytes')
