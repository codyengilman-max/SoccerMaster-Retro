#!/usr/bin/env python3
"""Team Training package (art review build, not shipping approved) -> derived runtime atlases.

Source sheets are copied byte-for-byte to docs/art/team-training-v1/source/ and never edited. Each outfield sheet is
6 columns x 4 rows of poses (run, pass, receive/first touch, defensive shuffle); figures are found as connected alpha
components (bounds are not assumed), scaled once per sheet so every character's median running height matches the
roster median, and pasted into fixed cells with the feet on one baseline and the torso centred. The keeper strips hold
4 key poses each. Writes src/assets/art/team-training-v1/{<id>.webp, manifest.json} and the frame audit.

  python3 scripts/art/build-team-training.py /path/to/SoccerMaster_Team_Training_Devin
"""
import hashlib, json, shutil, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
PKG = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'docs/art/team-training-v1/source'
SRC_OUT = ROOT / 'docs/art/team-training-v1/source'
RT = ROOT / 'src/assets/art/team-training-v1'
CELL_W, CELL_H, FOOT_Y = 160, 160, 154
RUNTIME_SCALE = 0.5            # source px -> atlas px before the per-sheet normalisation
ROWS = ['run', 'pass', 'receive', 'shuffle']
STAND = 6                      # row 2 column 1: upright two-foot stance, the per-sheet scale reference
OUTLINE_PX = 3                 # protagonist gold outline ring excluded from visible-height measurement

OUTFIELD = [('boy', '01_Protagonists/boy_highlight.png', 'home', True), ('girl', '01_Protagonists/girl_highlight.png', 'home', True)]
OUTFIELD += [(f'teammate_{i:02d}', f'02_Teammates/teammate_{i:02d}.png', 'home', False) for i in range(1, 8)]
OUTFIELD += [(f'opponent_{i:02d}', f'03_Opponents/opponent_{i:02d}.png', 'away', False) for i in range(1, 9)]
KEEPERS = [('keeper_home', '04_Goalkeepers/home_keeper_keyposes.png', 'home'), ('keeper_away', '04_Goalkeepers/opposition_keeper_keyposes.png', 'away')]
KEEPER_POSES = ['stand', 'run', 'stride', 'ready']
REFS = ['05_Roster_References/home_roster.png', '05_Roster_References/opposition_roster.png']

sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()


def src_path(rel: str) -> Path:
    p = PKG / rel
    return p if p.exists() else PKG / Path(rel).name


def figures(a: np.ndarray, want: int, min_px=4000):
    lab, n = ndimage.label(a > 20)
    objs = ndimage.find_objects(lab)
    big = [(i + 1, o) for i, o in enumerate(objs) if (lab[o] == i + 1).sum() >= min_px]
    small = [(i + 1, o) for i, o in enumerate(objs) if 60 <= (lab[o] == i + 1).sum() < min_px]
    return lab, big, small


def measure(mask: np.ndarray, outline: bool):
    m = ndimage.binary_erosion(mask, iterations=OUTLINE_PX) if outline else mask
    ys, xs = np.nonzero(m)
    top, bottom = ys.min(), ys.max()
    h = bottom - top + 1
    band = (ys >= top + 0.30 * h) & (ys <= top + 0.60 * h)
    cx = float(xs[band].mean())
    feet = ys >= bottom - 0.08 * h
    return int(h), cx, int(bottom), m


def foot_lows(m: np.ndarray, cx: float):
    """Lowest opaque row left and right of the torso centre (raised-foot check)."""
    ys, xs = np.nonzero(m)
    l, r = ys[xs < cx], ys[xs >= cx]
    return (int(l.max()) if l.size else -1, int(r.max()) if r.size else -1)


def cut(img: np.ndarray, lab, idx, o, outline):
    sub = img[o].copy()
    mask = lab[o] == idx
    sub[..., 3] = np.where(mask, sub[..., 3], 0)
    h, cx, bottom, m = measure(mask, outline)
    return sub, mask, h, cx, bottom, m


def place(sub, cx, bottom, scale):
    im = Image.fromarray(sub)
    w, h = im.size
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    im = im.resize((nw, nh), Image.LANCZOS)
    cell = Image.new('RGBA', (CELL_W, CELL_H), (0, 0, 0, 0))
    ox, oy = round(CELL_W / 2 - cx * scale), round(FOOT_Y - (bottom + 1) * scale)
    cell.alpha_composite(im, (max(0, ox), max(0, oy)), (max(0, -ox), max(0, -oy)))
    clipped = ox < 0 or oy < 0 or ox + nw > CELL_W or oy + nh > CELL_H
    return cell, clipped


def main():
    SRC_OUT.mkdir(parents=True, exist_ok=True)
    RT.mkdir(parents=True, exist_ok=True)
    rels = [r for _, r, *_ in OUTFIELD] + [r for _, r, _ in KEEPERS] + REFS + ['asset_inventory.json', 'START_HERE_DEVIN.md', 'DEVIN_PROMPT.txt']
    for rel in rels:
        s = src_path(rel)
        if s.resolve() != (SRC_OUT / Path(rel).name).resolve():
            shutil.copyfile(s, SRC_OUT / Path(rel).name)
    inventory = json.loads((SRC_OUT / 'asset_inventory.json').read_text())

    sheets, audit = {}, []
    raw = {}
    for sid, rel, side, outline in OUTFIELD:
        img = np.array(Image.open(src_path(rel)).convert('RGBA'))
        lab, big, small = figures(img[..., 3], 24)
        assert len(big) == 24, (sid, len(big))
        big.sort(key=lambda t: ((t[1][0].start + t[1][0].stop) // 2 // 256, t[1][1].start))
        frames = []
        for k, (idx, o) in enumerate(big):
            sub, mask, h, cx, bottom, m = cut(img, lab, idx, o, outline)
            row = k // 6
            cell_r = (o[0].start // 256, o[0].stop - 1) 
            frames.append(dict(idx=idx, o=o, sub=sub, h=h, cx=cx, bottom=bottom, m=m, row=row,
                               edge=o[0].start <= row * 256 + 1 or o[0].stop >= (row + 1) * 256 - 1 or o[1].start <= 0 or o[1].stop >= img.shape[1]))
        baked = [o for idx, o in small if 600 <= (lab[o] == idx).sum() and img[o][..., :3][lab[o] == idx].mean() > 200]
        raw[sid] = (rel, side, outline, img, frames, baked)
    run_med = {sid: float(fr[STAND]['h']) for sid, (_, _, _, _, fr, _) in raw.items()}
    ref_h = float(np.median(list(run_med.values())))

    for sid, (rel, side, outline, img, frames, baked) in raw.items():
        norm = ref_h / run_med[sid]
        scale = RUNTIME_SCALE * norm
        atlas = Image.new('RGBA', (CELL_W * 6, CELL_H * 4), (0, 0, 0, 0))
        out = []
        for k, f in enumerate(frames):
            cell, clipped = place(f['sub'], f['cx'] - f['o'][1].start * 0 , f['bottom'], scale) if False else place(f['sub'], f['cx'], f['bottom'], scale)
            atlas.alpha_composite(cell, ((k % 6) * CELL_W, (k // 6) * CELL_H))
            fl = foot_lows(f['m'], f['cx'])
            raised = abs(fl[0] - fl[1]) > 0.06 * f['h']
            o = f['o']
            out.append({'index': k, 'row': ROWS[k // 6], 'column': k % 6 + 1,
                        'sourceRect': [int(o[1].start), int(o[0].start), int(o[1].stop - o[1].start), int(o[0].stop - o[0].start)],
                        'visibleSourceHeight': f['h'], 'visibleHeight': round(f['h'] * scale, 1), 'raisedFoot': bool(raised),
                        'clipped': bool(clipped)})
        # Near-duplicate neighbours inside a row, compared on the derived cells.
        cells = np.array(atlas).astype(np.float32)
        def cellpx(k):
            x, y = (k % 6) * CELL_W, (k // 6) * CELL_H
            return cells[y:y + CELL_H, x:x + CELL_W]
        for k in range(24):
            if k % 6 == 5:
                continue
            a, b = cellpx(k), cellpx(k + 1)
            on = (a[..., 3] > 20) | (b[..., 3] > 20)
            diff = float((np.abs(a[..., 3] - b[..., 3]) > 60)[on].mean())
            out[k]['diffToNext'] = round(diff, 3)
        path = RT / f'{sid}.webp'
        atlas.save(path, 'WEBP', quality=92, alpha_quality=100, method=6)
        sheets[sid] = {'kind': 'outfield', 'side': side, 'protagonist': outline, 'source': f'docs/art/team-training-v1/source/{Path(rel).name}',
                       'sourceSha256': sha(src_path(rel)), 'file': f'{sid}.webp', 'sha256': sha(path), 'scale': round(scale, 5),
                       'sheetNormalisation': round(norm, 4), 'standSourceHeight': run_med[sid], 'bakedBallCandidates': len(baked), 'frames': out}

    for sid, rel, side in KEEPERS:
        img = np.array(Image.open(src_path(rel)).convert('RGBA'))
        lab, big, _ = figures(img[..., 3], 4)
        masks = [lab == idx for idx, _ in big]
        # Two poses in the opposition strip touch: split the tallest blob at its emptiest row near the middle.
        while len(masks) < 4:
            masks.sort(key=lambda m: -np.ptp(np.nonzero(m)[0]))
            m = masks.pop(0)
            ys = np.nonzero(m)[0]
            lo, hi = ys.min(), ys.max()
            rows = m.sum(axis=1)
            mid = int(lo + 0.3 * (hi - lo)) + int(np.argmin(rows[int(lo + 0.3 * (hi - lo)):int(lo + 0.7 * (hi - lo))]))
            top, bot = m.copy(), m.copy()
            top[mid:] = False
            bot[:mid] = False
            masks += [top, bot]
        masks.sort(key=lambda m: np.nonzero(m)[0].min())
        frames = []
        for keep in masks:
            ys, xs = np.nonzero(keep)
            o = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
            sub = img[o].copy()
            sub[..., 3] = np.where(keep[o], sub[..., 3], 0)
            h, cx, bottom, m = measure(keep[o], False)
            frames.append((o, sub, h, cx, bottom, xs.min() <= 0 or xs.max() >= img.shape[1] - 1 or ys.max() >= img.shape[0] - 1))
        norm = ref_h / frames[0][2]
        scale = RUNTIME_SCALE * norm
        atlas = Image.new('RGBA', (CELL_W * 4, CELL_H), (0, 0, 0, 0))
        out = []
        for i, (o, sub, h, cx, bottom, edge) in enumerate(frames):
            cell, clipped = place(sub, cx, bottom, scale)
            atlas.alpha_composite(cell, (i * CELL_W, 0))
            out.append({'index': i, 'pose': KEEPER_POSES[i], 'sourceRect': [int(o[1].start), int(o[0].start), int(o[1].stop - o[1].start), int(o[0].stop - o[0].start)],
                        'visibleSourceHeight': h, 'visibleHeight': round(h * scale, 1), 'sourceEdge': bool(edge), 'clipped': bool(clipped)})
        path = RT / f'{sid}.webp'
        atlas.save(path, 'WEBP', quality=92, alpha_quality=100, method=6)
        sheets[sid] = {'kind': 'keeper', 'side': side, 'protagonist': False, 'source': f'docs/art/team-training-v1/source/{Path(rel).name}', 'sourceSha256': sha(src_path(rel)),
                       'file': f'{sid}.webp', 'sha256': sha(path), 'scale': round(scale, 5), 'sheetNormalisation': round(norm, 4), 'frames': out}

    run_heights = [f['visibleHeight'] for s in sheets.values() if s['kind'] == 'outfield' for f in s['frames'][:6]]
    manifest = {
        'status': 'art_review_build_not_shipping_approved',
        'package': 'SoccerMaster_Team_Training_Devin.zip',
        'inventoryEntries': len(inventory) if isinstance(inventory, list) else len(inventory.get('assets', inventory)),
        'cell': [CELL_W, CELL_H], 'anchor': [CELL_W // 2, FOOT_Y],
        'rows': ROWS, 'columns': 6, 'facing': 'right three-quarter (mirror for left)',
        'referenceVisibleHeight': round(float(np.median(run_heights)), 2),
        'standVisibleHeight': round(ref_h * RUNTIME_SCALE, 2),
        'referenceVisibleHeightNote': 'median running-row body height in atlas px after per-sheet normalisation on the standing frame, protagonist outline excluded',
        'keeperPoses': KEEPER_POSES,
        'missingKeeperCycles': ['save', 'dive', 'catch', 'recovery', 'throw', 'punt'],
        'ball': 'separate runtime ball; no ball is drawn into these frames',
        'sources': {Path(r).name: sha(src_path(r)) for r in rels},
        'sheets': sheets,
    }
    (RT / 'manifest.json').write_text(json.dumps(manifest, indent=1) + '\n')
    print('ref visible height', manifest['referenceVisibleHeight'])
    for sid, s in sheets.items():
        fl = s['frames']
        print(sid, 'norm', s['sheetNormalisation'], 'clipped', [f['index'] for f in fl if f['clipped']], 'edge', [f['index'] for f in fl if f.get('sourceEdge')], 'h', [f['visibleHeight'] for f in fl][:8],
              'raised', [f['index'] for f in fl if f.get('raisedFoot')], 'dups', [f['index'] for f in fl if f.get('diffToNext', 1) < 0.08], 'ball', s.get('bakedBallCandidates'))


if __name__ == '__main__':
    main()
