#!/usr/bin/env python3
"""Ball Mastery side-view contact poses, derived from the approved sprites-v2 training sheets (never modified).

Each pose is rebuilt from approved pixels: torso = idle-e above the shorts hem; lower leg + boot = one rigid part cut
from an approved frame (boy dribble-0 front leg, girl idle-e front leg); thigh = a skin capsule hidden at the root by
the shorts. The figure faces east, so the character's RIGHT side faces the viewer: the near leg is the right leg, the
far (darker, behind the body) leg is the left leg. Nothing is mirrored. Each pose is two layers (back = far leg,
front = thigh + torso + near leg) so the runtime can draw the ball between them. The ball is the approved Jungle Ball
strip, drawn separately at runtime; this script only writes its centre and the contact point per pose and checks the
geometry (ball edge on the sole, not inside the boot).

Usage: python3 scripts/art/build-side-contact.py
"""
import json, math, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'src/assets/art/sprites-v2')
OUT = os.path.join(ROOT, 'src/assets/art/ball-mastery-side')
DOC = os.path.join(ROOT, 'docs/art/ball-mastery-side')
TS = os.path.join(ROOT, 'src/render/art/sideContactFrames.ts')
BALL = os.path.join(ROOT, 'src/assets/art/jungle-v4/jungle4-ball.webp')
W, H, GROUND = 160, 128, 120
BALL_R = 7.0          # 14 px ball against the 100 px body (leg-length scale of the sprites)
HEM = 94              # first row below the shorts on both idle-e frames
LIFT = 3.0            # sole clearance above the ball in the pre/post-contact poses
SS = 8                # supersampling for rotation
SEX = {
    'boy': {'leg': ('dribble-0', (83, 93, 108, 121), (92, 110)), 'hip': (79.0, 80.0)},
    'girl': {'leg': ('idle-e', (84, 93, 108, 121), (95, 112)), 'hip': (82.0, 80.0)},
}
FAR_TINT = (0.84, 0.85, 0.93)


def frame(sex, name):
    j = json.load(open(os.path.join(SRC, f'{sex}-training.json')))
    im = Image.open(os.path.join(SRC, f'{sex}-training.webp')).convert('RGBA')
    f = j['frames'][name]['frame']
    return im.crop((f['x'], f['y'], f['x'] + W, f['y'] + H))


def component(im, rect, seed):
    x0, y0, x1, y1 = rect
    px = im.load()
    keep, st = set(), [seed]
    while st:
        p = st.pop()
        if p in keep:
            continue
        x, y = p
        if not (x0 <= x < x1 and y0 <= y < y1) or px[x, y][3] < 40:
            continue
        keep.add(p)
        st += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    o = out.load()
    for p in keep:
        o[p] = px[p]
    return out


def landmarks(part):
    px = part.load()
    pts = [(x, y) for y in range(H) for x in range(W) if px[x, y][3] >= 40]
    top = min(y for _, y in pts)
    bot = max(y for _, y in pts)
    tops = [x for x, y in pts if y <= top + 1]
    low = [x for x, y in pts if y >= bot - 3]
    heel, toe = min(low), max(low) + 1
    skin = sorted((px[x, y][:3] for x, y in pts if y <= top + 3 and px[x, y][0] > 170 and px[x, y][0] > px[x, y][2] + 40), key=sum)
    return {
        'knee': (sum(tops) / len(tops) + 0.5, top + 1.0),
        'sole': bot + 1.0, 'heel': float(heel), 'toe': float(toe),
        'bof': (heel + 0.62 * (toe - heel), bot + 1.0),
        'skin': skin[len(skin) // 2], 'width': max(tops) - min(tops) + 1,
    }


def rot(v, th):
    c, s = math.cos(th), math.sin(th)
    return (c * v[0] - s * v[1], s * v[0] + c * v[1])


def place(part, lm, th, bof_at):
    """Rotate the rigid lower leg by th (clockwise on screen: knee forward, toe down) about its ball-of-foot point and
    put that point at bof_at. Returns the layer and the transformed landmarks."""
    big = part.resize((W * SS, H * SS), Image.NEAREST)
    cx, cy = lm['bof'][0] * SS, lm['bof'][1] * SS
    big = big.rotate(-math.degrees(th), resample=Image.NEAREST, center=(cx, cy))
    small = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sp, bp = small.load(), big.load()
    dx, dy = bof_at[0] - lm['bof'][0], bof_at[1] - lm['bof'][1]
    for y in range(H):
        for x in range(W):
            sx, sy = (x - dx) * SS + SS // 2, (y - dy) * SS + SS // 2
            if 0 <= sx < W * SS and 0 <= sy < H * SS:
                sp[x, y] = bp[int(sx), int(sy)]
    def tf(p):
        r = rot((p[0] - lm['bof'][0], p[1] - lm['bof'][1]), th)
        return (bof_at[0] + r[0], bof_at[1] + r[1])
    geo = {k: tf(v) for k, v in {'knee': lm['knee'], 'heel': (lm['heel'], lm['sole']), 'toe': (lm['toe'], lm['sole']), 'bof': lm['bof']}.items()}
    return small, geo


def thigh(hip, knee, skin, width):
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    o = out.load()
    rad = width / 2.0
    hx, hy = hip
    kx, ky = knee
    L2 = (kx - hx) ** 2 + (ky - hy) ** 2 or 1.0
    nx, ny = -(ky - hy), (kx - hx)
    nl = math.hypot(nx, ny) or 1.0
    if ny < 0:
        nx, ny = -nx, -ny
    mask = set()
    for y in range(H):
        for x in range(W):
            px, py = x + 0.5, y + 0.5
            t = max(0.0, min(1.0, ((px - hx) * (kx - hx) + (py - hy) * (ky - hy)) / L2))
            if math.hypot(px - (hx + t * (kx - hx)), py - (hy + t * (ky - hy))) <= rad:
                mask.add((x, y))
    shade = tuple(int(c * 0.82) for c in skin)
    for (x, y) in mask:
        edge = any((x + a, y + b) not in mask for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        side = ((x + 0.5 - hx) * nx + (y + 0.5 - hy) * ny) / nl
        o[x, y] = (70, 40, 30, 255) if edge else (*(shade if side > rad * 0.35 else skin), 255)
    return out


def tint(im, k):
    out = im.copy()
    p = out.load()
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if a:
                p[x, y] = (int(r * k[0]), int(g * k[1]), int(b * k[2]), a)
    return out


def solve_tap(lm, hip, L, th, lift):
    """Ball x for which the sole (rotated th) rests on the ball top (raised by `lift`) and the thigh keeps length L."""
    d = rot((0.0, 1.0), th)                       # sole outward normal
    k = rot((lm['knee'][0] - lm['bof'][0], lm['knee'][1] - lm['bof'][1]), th)
    by = GROUND - BALL_R - lift
    oy = by - BALL_R * d[1] + k[1] - hip[1]
    if abs(oy) > L:
        return None
    ox = -BALL_R * d[0] + k[0]
    return hip[0] - ox + math.sqrt(L * L - oy * oy)


def tap_leg(lm, hip, L, bx, lift):
    """Rotation that puts the sole on the ball top at ball x `bx`, keeping the thigh closest to length L."""
    best = None
    for i in range(0, 1201):
        th = math.radians(i * 0.05)
        d = rot((0.0, 1.0), th)
        c = (bx - BALL_R * d[0], GROUND - BALL_R - lift - BALL_R * d[1])
        k = rot((lm['knee'][0] - lm['bof'][0], lm['knee'][1] - lm['bof'][1]), th)
        knee = (c[0] + k[0], c[1] + k[1])
        err = abs(math.hypot(knee[0] - hip[0], knee[1] - hip[1]) - L)
        if knee[0] > hip[0] and (best is None or err < best[0]):
            best = (err, th, c)
    return best


def nearest(img, ball):
    p = img.load()
    return min(math.hypot(x + 0.5 - ball[0], y + 0.5 - ball[1]) for y in range(H) for x in range(W) if p[x, y][3] >= 128)


def edge_contact(img, ball):
    """Where the drawn sole meets the ball: the ball-edge point towards the nearest opaque boot pixel."""
    p = img.load()
    _, x, y = min((math.hypot(x + 0.5 - ball[0], y + 0.5 - ball[1]), x + 0.5, y + 0.5) for y in range(H) for x in range(W) if p[x, y][3] >= 128)
    d = math.hypot(x - ball[0], y - ball[1])
    return (ball[0] + BALL_R * (x - ball[0]) / d, ball[1] + BALL_R * (y - ball[1]) / d)


def planted(lm, knee_x):
    return (knee_x + (lm['bof'][0] - lm['knee'][0]), float(GROUND))


def build(sex):
    cfg = SEX[sex]
    name, rect, seed = cfg['leg']
    part = component(frame(sex, name), rect, seed)
    lm = landmarks(part)
    torso = frame(sex, 'idle-e')
    tp = torso.load()
    for y in range(HEM, H):
        for x in range(W):
            tp[x, y] = (0, 0, 0, 0)
    near_hip = cfg['hip']
    far_hip = (near_hip[0] - 1.0, near_hip[1])
    stand_knee = lambda hip, dx: (hip[0] + dx, GROUND - (lm['sole'] - lm['knee'][1]))
    L = math.hypot(*(a - b for a, b in zip(stand_knee(near_hip, 1.0), near_hip)))
    bx = solve_tap(lm, near_hip, L, math.radians(25), 0.0)
    assert bx is not None, sex
    ball = (bx, GROUND - BALL_R)
    # Support foot: planted with its toe behind the ball's back edge.
    # Support foot: planted beside and just behind the ball (its toe may pass behind/in front of the ball's back edge,
    # which the two layers draw at the right depth), knee 6 px behind the hip so the thigh stays under the shorts.
    sup_knee_x = near_hip[0] - 6.0

    def leg(hip, mode):
        if mode in ('stand', 'support'):
            kx = sup_knee_x - (0.0 if hip is near_hip else 1.0)
            bof = planted(lm, kx)
            layer, geo = place(part, lm, 0.0, bof)
            return layer, geo, 0.0
        lift = LIFT if mode == 'lift' else 0.0
        err, th, c = tap_leg(lm, hip, L, bx, lift)
        layer, geo = place(part, lm, th, c)
        # Rasterising drops the boot's soft bottom edge; close the measured gap along the sole normal so the ball's
        # edge meets the drawn sole (pixel centre within half a pixel of the ball edge), never inside it.
        for _ in range(3):
            gap = nearest(layer, ball) - (BALL_R + 0.5 + lift)
            if abs(gap) <= 0.25:
                break
            d = rot((0.0, 1.0), th)
            c = (c[0] + d[0] * gap, c[1] + d[1] * gap)
            layer, geo = place(part, lm, th, c)
        geo['thighError'] = abs(math.hypot(geo['knee'][0] - hip[0], geo['knee'][1] - hip[1]) - L)
        return layer, geo, th

    poses = {
        'stand': ('stand', 'stand'),
        'right-lift': ('lift', 'support'), 'right-tap': ('tap', 'support'),
        'left-lift': ('support', 'lift'), 'left-tap': ('support', 'tap'),
    }
    out, meta = {}, {}
    for pid, (rmode, lmode) in poses.items():
        rl, rg, rth = leg(near_hip, rmode)
        ll, lg, lth = leg(far_hip, lmode)
        back = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        back.alpha_composite(tint(thigh(far_hip, lg['knee'], lm['skin'], lm['width'] - 1), FAR_TINT))
        back.alpha_composite(tint(ll, FAR_TINT))
        front = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        front.alpha_composite(thigh(near_hip, rg['knee'], lm['skin'], lm['width'] - 1))
        front.alpha_composite(torso)
        if lmode in ('lift', 'tap'):
            # A lifted far leg's knee and shin swing in front of the standing shorts; draw them over the torso
            # (still under the near leg) so the working foot is never a boot floating under the hem.
            front.alpha_composite(tint(ll, FAR_TINT))
        front.alpha_composite(rl)
        out[pid] = (back, front, rl, ll)
        work = 'right' if rmode in ('lift', 'tap') else 'left' if lmode in ('lift', 'tap') else None
        g = rg if work == 'right' else lg if work == 'left' else None
        meta[pid] = {
            'working': work, 'support': None if work is None else ('left' if work == 'right' else 'right'),
            'surface': 'sole' if (rmode == 'tap' or lmode == 'tap') else 'none',
            'contact': [round(v, 2) for v in edge_contact(rl if work == 'right' else ll, ball)] if g and (rmode == 'tap' or lmode == 'tap') else None,
            'boots': {'right': {k: [round(v, 2) for v in rg[k]] for k in ('heel', 'toe', 'bof')}, 'left': {k: [round(v, 2) for v in lg[k]] for k in ('heel', 'toe', 'bof')}},
            'rotation': {'right': round(math.degrees(rth), 2), 'left': round(math.degrees(lth), 2)},
            'thighError': round(max(rg.get('thighError', 0), lg.get('thighError', 0)), 2),
        }
    return out, meta, ball, lm


def check(meta, layers, ball):
    """Pixel check: distance from the ball centre to the nearest opaque pixel of the working boot."""
    res = {}
    for pid, m in meta.items():
        if not m['working']:
            res[pid] = None
            continue
        img = layers[pid][2] if m['working'] == 'right' else layers[pid][3]
        p = img.load()
        dmin = min(math.hypot(x + 0.5 - ball[0], y + 0.5 - ball[1]) for y in range(H) for x in range(W) if p[x, y][3] >= 128)
        inside = sum(1 for y in range(H) for x in range(W) if p[x, y][3] >= 128 and math.hypot(x + 0.5 - ball[0], y + 0.5 - ball[1]) < BALL_R - 0.75)
        res[pid] = {'nearestBootPixel': round(dmin, 2), 'bootPixelsInsideBall': inside}
    return res


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(DOC, exist_ok=True)
    ball_img = Image.open(BALL).convert('RGBA').crop((0, 0, 64, 64)).resize((int(BALL_R * 2), int(BALL_R * 2)), Image.LANCZOS)
    ts = ['// Generated by scripts/art/build-side-contact.py. Do not edit by hand.',
          '/** Side-view contact poses: cell px, ground at anchor.y. Right = near leg (facing east), left = far leg; never mirrored. */',
          'export const SIDE_CONTACT = Object.freeze({']
    report = {}
    for sex in SEX:
        layers, meta, ball, lm = build(sex)
        names = [f'{p}-{l}' for p in layers for l in ('back', 'front')]
        sheet = Image.new('RGBA', (W * len(names), H), (0, 0, 0, 0))
        frames = {}
        for i, n in enumerate(names):
            pid, l = n.rsplit('-', 1)
            sheet.alpha_composite(layers[pid][0 if l == 'back' else 1], (i * W, 0))
            frames[n] = {'frame': {'x': i * W, 'y': 0, 'w': W, 'h': H}, 'rotated': False, 'trimmed': False, 'spriteSourceSize': {'x': 0, 'y': 0, 'w': W, 'h': H}, 'sourceSize': {'w': W, 'h': H}}
        sheet.save(os.path.join(OUT, f'{sex}-side.webp'), lossless=True, quality=100, method=6)
        json.dump({'frames': frames, 'meta': {'image': f'{sex}-side.webp', 'size': {'w': sheet.width, 'h': H}, 'scale': '1', 'source': f'sprites-v2/{sex}-training (idle-e torso, {SEX[sex]["leg"][0]} lower leg)'}}, open(os.path.join(OUT, f'{sex}-side.json'), 'w'), indent=1)
        chk = check(meta, layers, ball)
        report[sex] = {'ball': [round(v, 2) for v in ball], 'ballRadius': BALL_R, 'poses': {p: {**meta[p], 'pixelCheck': chk[p]} for p in meta}}
        # Proof sheet: each pose composed with the approved ball, x4.
        proof = Image.new('RGBA', (W * 4 * len(layers), H * 4), (196, 226, 196, 255))
        for i, (pid, (back, front, _, _)) in enumerate(layers.items()):
            c = Image.new('RGBA', (W, H), (196, 226, 196, 255))
            c.alpha_composite(back)
            c.alpha_composite(ball_img, (int(round(ball[0] - BALL_R)), int(round(ball[1] - BALL_R))))
            c.alpha_composite(front)
            proof.alpha_composite(c.resize((W * 4, H * 4), Image.NEAREST), (i * W * 4, 0))
        proof.save(os.path.join(DOC, f'proof-{sex}.png'))
        zoom = Image.new('RGBA', (60 * 8 * len(layers), 54 * 8), (196, 226, 196, 255))
        for i, (pid, (back, front, _, _)) in enumerate(layers.items()):
            c = Image.new('RGBA', (W, H), (196, 226, 196, 255))
            c.alpha_composite(back)
            c.alpha_composite(ball_img, (int(round(ball[0] - BALL_R)), int(round(ball[1] - BALL_R))))
            c.alpha_composite(front)
            zoom.alpha_composite(c.crop((62, 70, 122, 124)).resize((480, 432), Image.NEAREST), (i * 480, 0))
        zoom.save(os.path.join(DOC, f'zoom-{sex}.png'))
        boxes = [im.getbbox() for b, f, _, _ in layers.values() for im in (b, f)]
        vis = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
        ts.append(f'  {sex}: {{ cell: {{ w: {W}, h: {H} }}, anchor: {{ x: 80, y: {GROUND} }}, bodyHeight: 100, visible: {{ x: {vis[0]}, y: {vis[1]}, w: {vis[2] - vis[0]}, h: {vis[3] - vis[1]} }}, ball: {{ x: {ball[0]:.2f}, y: {ball[1]:.2f}, r: {BALL_R} }}, poses: {{')
        for p, m in meta.items():
            ts.append(f"    '{p}': {json.dumps({k: m[k] for k in ('working', 'support', 'surface', 'contact', 'boots')}, separators=(', ', ': '))},")
        ts.append('  } },')
    ts.append('});')
    ts.append('export type SideSex = keyof typeof SIDE_CONTACT;')
    ts.append('export type SidePoseId = keyof (typeof SIDE_CONTACT)["boy"]["poses"];')
    open(TS, 'w').write('\n'.join(ts) + '\n')
    json.dump(report, open(os.path.join(DOC, 'contact-report.json'), 'w'), indent=1)
    print(json.dumps({s: {p: (r['pixelCheck'], r['rotation'], r['thighError']) for p, r in report[s]['poses'].items()} for s in report}, indent=0))
    print({s: report[s]['ball'] for s in report})


if __name__ == '__main__':
    main()
