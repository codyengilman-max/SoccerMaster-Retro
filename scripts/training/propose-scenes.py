#!/usr/bin/env python3
"""Devin's PROPOSED numeric scenes for the 39 v1.2 cards marked ready on REVIEW_SHEET.md, for Coach Cody's scene
review. Nothing here is approved: positions, velocities and facing are Devin's reading of each card's coordination
line, not source content. Emits docs/training/library-v1.2/scenes/{proposed-scenes.json,SCENE_REVIEW.html,
SESSION_PROPOSAL.md,session-proposal.json}.

Frame (metres): x along the length, home goal line x=0, home attacks toward +x; y across, home's LEFT touchline at
y=width. So the away team's left is low y. facingDeg 0 = toward +x, 90 = toward +y.
"""
import hashlib, html, json, math, subprocess, sys

DIR = 'docs/training/library-v1.2'
OUT = DIR + '/scenes'
lib = json.load(open(DIR + '/scenarios.json'))
gen = json.load(open('src/game/training12/library/tacticalLibrary.generated.json'))
CARDS = {c['id']: c for c in gen['cards']}
L, W = lib['pitch_proposal']['length_m'], lib['pitch_proposal']['width_m']
HALF = L / 2
ROSTER = [a['id'] for t in ('H', 'A') for a in lib['rosters'][t]]
BLOCKED = ['LB01', 'RB01', 'DM03', 'DM05', 'CM05', 'LW03', 'RW03', 'ST03', 'ST04']
canon = lambda v: json.dumps(v, sort_keys=True, separators=(',', ':'), ensure_ascii=False)

# id: (x, y[, vx, vy[, facing]]); ball owner facing defaults toward the opponents' goal.
S = {}
C = {}  # changed cue: {'moves': {...}, 'owner': optional, 'note': str}
S['CB01'] = dict(H_LB=(20, 39), H_CB=(14, 27), H_RB=(13, 16), H_DM=(24, 27), A_RW=(22, 41, -2, 0), A_ST=(21, 30, -3, 2.5))
C['CB01'] = dict(moves=dict(A_RW=(15, 37, -3, -1), H_LB=(19, 40.5, -3, 0)), note='LB is beaten: A_RW is past H_LB and running at goal.')
S['CB02'] = dict(H_ST=(52, 25, 2, 0), H_LW=(49, 37), H_RW=(49, 9), H_CM=(44, 24), H_DM=(37, 25), H_CB=(24, 22), H_LB=(26, 34), H_RB=(26, 10),
                 A_CB=(56, 24, 0, 0, 0), A_LB=(52, 6), A_RB=(52, 40), A_DM=(46, 22), A_CM=(40, 27), A_ST=(33, 21))
C['CB02'] = dict(moves=dict(A_CB=(56, 24, 0, 0, 180), H_ST=(47, 25, 1, 0)), note='A_CB has turned and faces our goal with time; H_ST is too far to restrict the forward pass.')
S['CB03'] = dict(H_CM=(38, 24, -1, 0), H_CB=(24, 22), H_DM=(33, 27, -4, 0), H_LB=(28, 36, -3, -1), H_RB=(28, 9, -3, 1), A_CM=(36, 22, -3, 0), A_ST=(27, 17, -3, -1))
C['CB03'] = dict(moves=dict(H_DM=(27, 24, -2, 0), H_LB=(25, 31, -2, -1)), note='H_DM and H_LB are back goal-side: support has arrived.')
S['CB04'] = dict(H_CB=(12, 23), H_DM=(17, 30), H_CM=(28, 16), H_LB=(18, 40), H_RB=(18, 5), H_ST=(40, 22), A_ST=(18, 23, -1, 0), A_CM=(26, 26))
C['CB04'] = dict(moves=dict(A_CM=(18.5, 30.5, -1, 0)), note='A_CM marks H_DM tightly.')
S['CB05'] = dict(H_CB=(14, 15), H_CM=(38, 19), H_DM=(22, 25), H_RB=(20, 5), A_ST=(19, 22, 1, -1), A_DM=(32, 23), A_CB=(44, 22))
C['CB05'] = dict(moves=dict(A_DM=(35, 18.5, 1, -2)), note='A_DM closes the window before H_CB plays. Card limitation: the source (S13) is unopposed; opposed validity needs review.')
S['CB06'] = dict(H_LB=(21, 39, -3, 0), H_CB=(13, 29), H_RB=(10, 22), H_DM=(20, 30), A_RW=(18, 37, -3, -1), A_ST=(14, 22, -2, 0))
C['CB06'] = dict(moves=dict(H_RB=(14, 8)), note='H_RB is not covering: no cover behind H_CB.')
S['LB02'] = dict(H_LB=(19, 38), H_CB=(16, 30), H_RB=(15, 15), H_DM=(24, 28), H_LW=(31, 40), A_RW=(24, 40, 0, 0, 0), A_RB=(34, 42), A_ST=(20, 28, -1, 0))
C['LB02'] = dict(moves=dict(H_CB=(16, 20), A_ST=(19, 18, -1, 0)), note='H_CB is pulled away with A_ST: no cover behind H_LB.')
S['LB03'] = dict(H_LB=(24, 36, -3, -2), H_CB=(19, 14), H_RB=(21, 9), H_DM=(29, 20), A_LW=(26, 7, -3, 0), A_ST=(25, 24, -3, 0), A_RW=(30, 40, -1, 0))
C['LB03'] = dict(moves=dict(A_ST=(20.5, 12, -1, 0), A_RW=(24, 38, -4, 0)), note='A_ST has drifted to the ball side next to H_CB; A_RW is now the free runner.')
S['LB04'] = dict(H_LB=(40, 42, 3, 0), H_LW=(46, 36, 1, -1.5), H_CB=(28, 30), H_RB=(28, 12), H_DM=(36, 24), H_CM=(44, 22), A_RB=(49, 35), A_CB=(56, 24), A_ST=(36, 22))
C['LB04'] = dict(moves=dict(A_RB=(47, 41, 2, 0)), note='A_RB tracks the overlap instead of H_LW.')
S['LB05'] = dict(H_LB=(56, 40), H_LW=(60, 32), H_ST=(58, 26, 2, -1), H_CM=(52, 30), H_CB=(34, 26), H_RB=(36, 12), H_DM=(44, 24), A_RB=(54, 41), A_CB=(62, 24), A_GK=(67, 23))
C['LB05'] = dict(moves=dict(H_ST=(52, 20)), note='H_ST is not arriving: no receiver for the early ball.')
S['LB06'] = dict(H_LB=(26, 40, -3, 0), H_LW=(32, 40, -1, 0), H_CB=(17, 26), H_RB=(15, 13), H_DM=(24, 27), A_RW=(24, 38, -3, 0), A_RB=(31, 42), A_ST=(19, 24, -1, 0))
C['LB06'] = dict(moves=dict(H_LW=(24.5, 41.8, -3, 0), H_DM=(20, 32)), note='H_LW is back pressing A_RW and H_DM covers inside.')
S['DM01'] = dict(H_DM=(23, 22), H_CB=(12, 22), H_CM=(26, 14), H_RB=(18, 5), A_ST=(19, 22, -1, 0), A_CM=(27, 24))
C['DM01'] = dict(moves=dict(A_CM=(24.5, 20.8)), note='A_CM follows H_DM tightly.')
S['DM02'] = dict(H_DM=(28, 26), H_CM=(31, 24, -1, 0), H_CB=(21, 22), A_CM=(34, 24, -2, 0), A_ST=(26, 20))
C['DM02'] = dict(moves=dict(A_CM=(30, 25, -3, 0), H_CM=(33, 25, -1, 0)), note='A_CM has beaten H_CM.')
S['DM04'] = dict(H_DM=(22, 22), H_CB=(12, 22), H_CM=(32, 18), H_RB=(17, 5), A_ST=(17, 20, -1, 0), A_CM=(24, 24))
C['DM04'] = dict(moves=dict(H_CM=(17, 29)), note='H_CM already occupies the dropping angle.')
S['DM06'] = dict(H_DM=(32, 27), H_CM=(37, 24, 1, 0), H_CB=(20, 22), H_LB=(26, 38), H_RB=(26, 8), A_DM=(36, 22, -1, 0), A_ST=(27, 22))
C['DM06'] = dict(moves=dict(H_CM=(41, 26)), note='Nobody contests A_DM.')
S['CM01'] = dict(H_CM=(34, 22, 0, 0, 180), H_DM=(27, 25), H_ST=(46, 22), A_DM=(36, 22, -1, 0), A_CB=(48, 22))
C['CM01'] = dict(moves=dict(A_DM=(42, 24)), note='A_DM backs off: H_CM has room to turn.')
S['CM02'] = dict(H_CM=(45, 25), H_ST=(52, 24, 2, 0), H_LW=(50, 36), H_RW=(50, 9), H_DM=(38, 27), H_CB=(26, 22),
                 A_CB=(56, 24, 0, 0, 0), A_DM=(47, 23), A_CM=(41, 28), A_LB=(53, 5), A_RB=(53, 40), A_ST=(32, 21))
C['CM02'] = dict(moves=dict(A_DM=(49, 15, 1, -2)), note='A_DM moves to open a different lane.')
S['CM03'] = dict(H_CM=(44, 18), H_RW=(48, 8, 2, 0), H_ST=(56, 10), H_DM=(38, 20), H_LW=(52, 36), A_LB=(52, 8), A_DM=(50, 18))
C['CM03'] = dict(moves=dict(H_DM=(43, 11), A_LB=(51, 10)), note='H_DM now gives the underneath angle and space opens behind A_LB.')
S['CM04'] = dict(H_CM=(44, 22, 0, 0, 0), H_ST=(58, 22), H_LW=(56, 38), H_RW=(56, 7), H_DM=(36, 24), A_DM=(41, 22, 1, 0), A_CB=(56, 22), A_LB=(54, 10), A_RB=(54, 35))
C['CM04'] = dict(moves=dict(A_CB=(48, 22, -3, 0)), note='A_CB steps out early toward H_CM.')
S['CM06'] = dict(H_CM=(58, 16), H_RW=(66, 6), H_ST=(64, 19), H_LW=(62, 34), H_DM=(48, 22), H_CB=(34, 22), H_LB=(38, 36), H_RB=(40, 10),
                 A_LB=(65, 9), A_CB=(65.5, 17.5), A_DM=(63, 22), A_GK=(67, 20))
C['CM06'] = dict(moves=dict(A_DM=(61, 15)), note='A_DM screens the cutback lane.')
S['LW01'] = dict(H_LW=(44, 38), H_LB=(39, 41), H_CM=(42, 24), H_ST=(52, 22), A_RB=(47, 38, -1, 0), A_DM=(46, 30, 0, 2))
C['LW01'] = dict(moves=dict(A_DM=(48, 22, 0, 0)), note='A_DM stays central: no cover for A_RB.')
S['LW02'] = dict(H_LW=(48, 34), H_ST=(52, 22, 2, 0), H_CM=(44, 24), H_DM=(38, 26), H_LB=(33, 38), H_CB=(26, 28),
                 A_CB=(56, 22, 0, 0, 0), A_RB=(52, 40), A_DM=(46, 22), A_RW=(38, 40), A_ST=(30, 24))
C['LW02'] = dict(moves=dict(A_RB=(47, 41, -3, 0)), owner='A_RB', note='The ball has bypassed the first line to A_RB.')
S['LW04'] = dict(H_LW=(46, 38), H_LB=(40, 43, 3, 0), H_CM=(44, 26), H_DM=(36, 24), H_CB=(26, 26), H_RB=(28, 10), A_RB=(49, 37), A_CB=(56, 24), A_ST=(36, 22))
C['LW04'] = dict(moves=dict(H_LB=(36, 40, 0, 0)), note='H_LB has stopped; no overlap.')
S['LW05'] = dict(H_LW=(54, 32, 2, -1), H_RW=(60, 7), H_ST=(61, 18, 2, 0), H_CM=(54, 20), H_DM=(44, 22), A_GK=(67, 21), A_LB=(61, 9), A_CB=(63, 20), A_RB=(62, 30))
C['LW05'] = dict(moves=dict(H_RW=(55, 6, 0, 0, 180), A_LB=(58, 7)), note='H_RW is forced backward; no delivery yet.')
S['LW06'] = dict(H_LW=(66, 40), H_CM=(58, 30, 1, 0), H_ST=(64, 24), H_RW=(60, 10), H_DM=(48, 22), H_CB=(34, 22), H_RB=(38, 10),
                 A_RB=(65, 37), A_CB=(64, 26), A_DM=(60, 25), A_GK=(67, 24))
C['LW06'] = dict(moves=dict(A_DM=(59, 28.6)), note='A_DM recovers to cover H_CM.')
S['RW04'] = dict(H_RW=(48, 5), H_CM=(44, 22), H_RB=(40, 8), H_ST=(55, 22), H_DM=(37, 24), A_LB=(50, 9), A_DM=(47, 22), A_CB=(54, 20))
C['RW04'] = dict(moves=dict(A_LB=(48.5, 6.5)), note='A_LB sits on H_RW: a touchline reception would be trapped.')
S['RW06'] = dict(H_RW=(56, 6), H_RB=(48, 6), H_CM=(52, 18), H_ST=(62, 20), H_LW=(62, 33), H_DM=(44, 22),
                 A_LB=(57, 8, 0, -1), A_CB=(63.6, 21.4), A_RB=(63.5, 31.5), A_DM=(56, 20), A_GK=(67, 22))
C['RW06'] = dict(moves=dict(H_CM=(58, 16, 2, 0), A_DM=(54, 24)), note='H_CM arrives free between the lines.')
S['ST01'] = dict(H_ST=(50, 22, 0, 0, 180), H_CM=(45, 19), H_LW=(56, 38), H_RW=(56, 7), A_CB=(52, 22, -1, 0), A_DM=(46, 28))
C['ST01'] = dict(moves=dict(A_CB=(56, 22)), note='A_CB backs away: a turning lane opens.')
S['ST02'] = dict(S['CB02'], H_ST=(51, 24, 2, 0))
C['ST02'] = dict(moves=dict(H_CM=(36, 24), H_DM=(30, 24)), note='Midfield has not followed: H_CM and H_DM are detached.')
S['ST05'] = dict(H_ST=(57, 22, 3, -1), H_RW=(52, 6), H_LW=(52, 32), H_CM=(48, 18), H_DM=(40, 22), A_GK=(66, 22), A_CB=(58, 20), A_LB=(54, 9), A_RB=(58, 32))
C['ST05'] = dict(moves=dict(H_RW=(50, 6, 0, 0, 180)), note='Delivery delayed: offside is judged again at the passer\'s next contact.')
S['ST06'] = dict(H_ST=(61, 22), H_LW=(62, 40), H_RW=(63.5, 28), H_CM=(55, 26), H_DM=(46, 24), H_CB=(34, 22), H_LB=(38, 36), H_RB=(38, 10),
                 A_GK=(67, 24), A_CB=(64.8, 25.6), A_LB=(63, 16), A_RB=(62, 36))
C['ST06'] = dict(moves=dict(A_LB=(62.8, 20.2)), note='A_LB marks the central zone.')

SWAP = {'LB': 'RB', 'RB': 'LB', 'LW': 'RW', 'RW': 'LW'}
def mid(i):
    t, r = i.split('_'); return t + '_' + SWAP.get(r, r)
def mpos(v):
    v = list(v) + [0, 0][len(v) - 2:] if len(v) < 4 else list(v)
    out = [v[0], W - v[1], v[2], -v[3]]
    if len(v) > 4: out.append((-v[4]) % 360)
    return tuple(out)
def mirror(d): return {mid(k): mpos(v) for k, v in d.items()}
MIRRORS = {'RB02': 'LB02', 'RB03': 'LB03', 'RB04': 'LB04', 'RW01': 'LW01', 'RW02': 'LW02', 'RW05': 'LW05'}
for k, src in MIRRORS.items():
    S[k] = mirror(S[src]); C[k] = dict(C[src], moves=mirror(C[src]['moves']))
    if 'owner' in C[src]: C[k]['owner'] = mid(C[src]['owner'])
C['RB02'] = dict(moves={'A_LW': (24, W - 40, 0, 0, 180)}, note='A_LW has opened up to face our goal.')
C['RB03'] = dict(moves={'H_DM': (22, W - 22)}, note='H_DM arrives centrally: the centre is secure.')
C['RB04'] = dict(moves={'H_RW': (46, 5)}, note='H_RW holds the touchline.')
C['RB05'] = dict(moves={'A_LB': (62, 5)}, note='A_LB closes the byline but opens early service.')
S['RB05'] = dict(H_RB=(58, 6), H_RW=(62, 13), H_ST=(61, 20), H_CM=(57, 17, 1, 0), H_CB=(34, 22), H_LB=(36, 34), H_DM=(46, 22),
                 A_LB=(58.5, 9), A_CB=(63, 21), A_DM=(57, 22), A_GK=(67, 22))
S['RB06'] = dict(H_RB=(28, 6), H_CB=(26, 28), H_LB=(30, 36), H_DM=(36, 30), H_LW=(48, 38), H_RW=(46, 12), A_RB=(50, 40), A_LB=(50, 6), A_LW=(40, 8), A_ST=(34, 26))
C['RB06'] = dict(moves=dict(H_LW=(44, 36)), note='H_LW has dropped off A_RB: the switch is imminent and unpressured.')
C['RW05'] = dict(moves={'A_LB': (61, 13)}, note='A_LB closes the far-side zone.')

def facing(a, b):
    return round(math.degrees(math.atan2(b[1] - a[1], b[0] - a[0])) % 360, 1)

def state(cid, pos, owner):
    card = CARDS[cid]
    o = pos[owner]
    of = o[4] if len(o) > 4 else (0 if owner.startswith('H_') else 180)
    bp = (round(o[0] + 1.2 * math.cos(math.radians(of)), 2), round(o[1] + 1.2 * math.sin(math.radians(of)), 2))
    actors = []
    for i in ROSTER:
        if i not in pos: continue
        v = pos[i]
        vx, vy = (v[2], v[3]) if len(v) >= 4 else (0, 0)
        f = v[4] if len(v) > 4 else (of if i == owner else facing(v, bp))
        actors.append({'id': i, 'pos': {'x': v[0], 'y': v[1]}, 'vel': {'x': vx, 'y': vy}, 'facingDeg': f})
    pts = [(a['pos']['x'], a['pos']['y']) for a in actors] + [bp]
    x0, x1 = max(0, min(p[0] for p in pts) - 5), min(L, max(p[0] for p in pts) + 5)
    y0, y1 = max(0, min(p[1] for p in pts) - 5), min(W, max(p[1] for p in pts) + 5)
    kind = 'area'
    if x0 < HALF < x1 and x1 - x0 > 0.6 * L: x0, x1, y0, y1, kind = 0, L, 0, W, 'full'
    reason = ("Not named in the card's coordination or required actors. Devin assumes it is away from the decision and "
              "cannot change it; confirm, or ask for it to be shown.")
    return {
        'units': 'm', 'pitch': {'length_m': L, 'width_m': W},
        'view': {'kind': kind, 'min': {'x': round(x0, 2), 'y': round(y0, 2)}, 'max': {'x': round(x1, 2), 'y': round(y1, 2)}},
        'actors': actors, 'omitted': [{'id': i, 'reason': reason} for i in ROSTER if i not in pos],
        'ball': {'pos': {'x': bp[0], 'y': bp[1]}, 'vel': {'x': 0, 'y': 0}, 'owner': owner}, 'events': [],
        'localRules': 'Provisional 75 x 50 yd profile; local age-group rules NOT verified (local_rules_verified: false).',
    }

ready = [c for c in gen['cards'] if c['id'] not in BLOCKED]
assert len(ready) == 39 and set(S) == {c['id'] for c in ready}, sorted(set(c['id'] for c in ready) ^ set(S))
scenes = []
for c in ready:
    cid = c['id']
    pos = S[cid]
    req = set(c['required_visible_actor_ids']) | {c['protagonist'], c['ball_owner_at_freeze']}
    assert req <= set(pos), (cid, req - set(pos))
    num = state(cid, pos, c['ball_owner_at_freeze'])
    ch = C[cid]
    chpos = dict(pos); chpos.update(ch['moves'])
    chnum = state(cid, chpos, ch.get('owner', c['ball_owner_at_freeze']))
    extra = sorted(set(pos) - req)
    sc = {
        'cardId': cid, 'sceneId': cid + '-p1', 'cardSha256': c['cardSha256'], 'status': 'PROPOSAL_FOR_SCENE_REVIEW',
        'numeric': num, 'changedCue': {'note': ch['note'], 'numeric': chnum},
        'mirrorOf': MIRRORS.get(cid),
        'adaptations': [
            'All positions, velocities and facing are authored by Devin from the card\'s coordination line; no source gives numeric geometry.',
            'Package adaptation type: ' + c['adaptation_type'] + '.',
            'Changed-cue picture is Devin\'s reading of: ' + c['changed_cue_test'],
        ] + (['Also shown (not in required_visible_actor_ids, but named in coordination): ' + ', '.join(extra)] if extra else []),
        'reviewChecks': ['Card condition: ' + c['correction']] + ['Package test: ' + t for t in c['required_tests']],
    }
    sc['proposalSha256'] = hashlib.sha256(canon({k: v for k, v in sc.items() if k != 'proposalSha256'}).encode()).hexdigest()
    scenes.append(sc)
json.dump({'library': gen['meta']['file'], 'version': gen['meta']['version'], 'frame': __doc__.split('Frame (metres): ')[1].strip(),
           'status': 'PROPOSALS_NOT_APPROVED', 'blockedCards': BLOCKED, 'scenes': scenes},
          open(OUT + '/proposed-scenes.json', 'w'), indent=1, ensure_ascii=False)

# ---------- review page ----------
PX = 7.2
def svg(num, prot, title):
    w, h = L * PX, W * PX
    X = lambda x: x * PX
    Y = lambda y: (W - y) * PX  # home left (high y) at the top of the picture
    s = [f'<svg viewBox="-6 -22 {w+12:.0f} {h+28:.0f}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{html.escape(title)}">',
         f'<text x="0" y="-8" font-size="13" font-family="sans-serif" fill="#222">{html.escape(title)}</text>',
         f'<rect x="0" y="0" width="{w:.1f}" height="{h:.1f}" fill="#3f8f3a" stroke="#fff" stroke-width="2"/>',
         f'<line x1="{X(HALF):.1f}" y1="0" x2="{X(HALF):.1f}" y2="{h:.1f}" stroke="#fff" stroke-width="1.5"/>',
         f'<circle cx="{X(HALF):.1f}" cy="{h/2:.1f}" r="{7.3*PX:.1f}" fill="none" stroke="#fff" stroke-width="1.2"/>']
    for gx, d in ((0, 1), (L, -1)):
        bw, bd = 32.9, 12.8
        s.append(f'<rect x="{X(min(gx, gx + d*bd)):.1f}" y="{Y(W/2 + bw/2):.1f}" width="{bd*PX:.1f}" height="{bw*PX:.1f}" fill="none" stroke="#fff" stroke-dasharray="5 4" stroke-width="1"/>')
        s.append(f'<rect x="{X(gx) - (6 if d == 1 else 0):.1f}" y="{Y(W/2 + 3.2):.1f}" width="6" height="{6.4*PX:.1f}" fill="#fff"/>')
    v = num['view']
    s.append(f'<rect x="{X(v["min"]["x"]):.1f}" y="{Y(v["max"]["y"]):.1f}" width="{(v["max"]["x"]-v["min"]["x"])*PX:.1f}" height="{(v["max"]["y"]-v["min"]["y"])*PX:.1f}" fill="none" stroke="#ffd54a" stroke-width="2" stroke-dasharray="8 5"/>')
    for a in num['actors']:
        x, y = X(a['pos']['x']), Y(a['pos']['y'])
        vx, vy = a['vel']['x'], a['vel']['y']
        if vx or vy:
            s.append(f'<line x1="{x:.1f}" y1="{y:.1f}" x2="{x + vx*PX*1.2:.1f}" y2="{y - vy*PX*1.2:.1f}" stroke="#111" stroke-width="2" marker-end="url(#ah)"/>')
        f = math.radians(a['facingDeg'])
        s.append(f'<line x1="{x:.1f}" y1="{y:.1f}" x2="{x + 13*math.cos(f):.1f}" y2="{y - 13*math.sin(f):.1f}" stroke="#fff" stroke-width="2"/>')
        home = a['id'].startswith('H_')
        fill = '#f08a24' if home else '#2fae5b'
        if a['id'].endswith('_GK'): fill = '#1fa3a3' if home else '#e05aa0'
        if a['id'] == prot: s.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="13" fill="none" stroke="#ffd54a" stroke-width="4"/>')
        s.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="8.5" fill="{fill}" stroke="{"#000" if home else "#fff"}" stroke-width="1.5"/>')
        s.append(f'<text x="{x:.1f}" y="{y+4:.1f}" font-size="9" text-anchor="middle" font-family="sans-serif" font-weight="700" fill="#000">{a["id"][2:]}</text>')
    b = num['ball']['pos']
    s.append(f'<circle cx="{X(b["x"]):.1f}" cy="{Y(b["y"]):.1f}" r="3.5" fill="#fff" stroke="#000" stroke-width="1.5"/>')
    s.append('<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0L10,5L0,10z" fill="#111"/></marker></defs></svg>')
    return ''.join(s)

E = html.escape
srcs = {s['id']: s for s in lib['sources']}
parts = ['<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
         '<title>v1.2 proposed scenes for review</title><style>body{font:15px/1.45 -apple-system,sans-serif;margin:0 auto;max-width:900px;padding:12px;color:#222}'
         'section{border-top:3px solid #333;margin-top:22px;padding-top:6px}td{vertical-align:top;padding:3px 6px;border-bottom:1px solid #ddd}'
         'th{text-align:left;padding:3px 6px;width:30%;background:#f4f4f4}table{border-collapse:collapse;width:100%}.k{color:#a33;font-weight:700}'
         'nav a{display:inline-block;margin:2px 4px}</style></head><body>',
         '<h1>Audited Library v1.2: proposed scenes (not approved)</h1>',
         f'<p class="k">Every scene below is Devin\'s PROPOSAL. Positions, movement and facing are authored from each card\'s coordination line; no source supplies geometry. Nothing here scores until you sign off the scene and the local rules are verified.</p>',
         f'<p>{len(scenes)} cards. 9 cards stay blocked for tactical authoring/review and have no scene: {", ".join(BLOCKED)}.</p>',
         '<p>Picture: the whole 75 x 50 yd pitch, home goal on the LEFT, home attacking to the right, home\'s left touchline at the top. Orange = home (you are the gold ring), green = away, teal/pink = keepers. White tick = facing; black arrow = movement at the freeze (about 1.2 s). Dashed yellow box = the area the game would show. Dashed white boxes are indicative only (local box size not verified).</p>',
         '<nav>' + ''.join(f'<a href="#{s["cardId"]}">{s["cardId"]}</a>' for s in scenes) + '</nav>']
for sc in scenes:
    c = CARDS[sc['cardId']]
    rows = [('Cue', c['cue']), ('Coordination', c['coordination']), ('Preferred decision', c['preferred_decision']),
            ('Acceptable alternative', c['acceptable_alternative']), ('Misconception', c['misconception']),
            ('Coach Code (card)', c['coach_feedback']), ('Changed cue', c['changed_cue_test']), ('Card condition', c['correction']),
            ('Sources', '; '.join(f'{i}: {srcs[i]["supports"]} <{srcs[i]["url"]}> ({c["source_sections"].get(i, "format/background")})' for i in c['source_ids'] + c['format_source_ids'])),
            ('Shown', ', '.join(a['id'] for a in sc['numeric']['actors'])), ('Omitted (assumed irrelevant)', ', '.join(o['id'] for o in sc['numeric']['omitted']) or 'none')]
    parts.append(f'<section id="{sc["cardId"]}"><h2>{sc["cardId"]}: {E(c["title"])} <small>({c["role"]}, {c["phase"]})</small></h2>')
    hf = 'yes' if sc['numeric']['view']['max']['x'] <= HALF or sc['numeric']['view']['min']['x'] >= HALF else 'no: needs more than half the pitch, so the current half-field player cannot show it yet'
    parts.append(f'<p><b>Fits the half-field player:</b> {hf}.</p>')
    if sc['mirrorOf']: parts.append(f'<p>Mirror of {sc["mirrorOf"]} (left/right, facing and movement mirrored).</p>')
    parts.append(svg(sc['numeric'], c['protagonist'], 'Freeze (the cue)'))
    parts.append(svg(sc['changedCue']['numeric'], c['protagonist'], 'Changed cue: ' + sc['changedCue']['note']))
    parts.append('<table>' + ''.join(f'<tr><th>{E(k)}</th><td>{E(v)}</td></tr>' for k, v in rows) + '</table>')
    parts.append('<p><b>Adaptations:</b></p><ul>' + ''.join(f'<li>{E(a)}</li>' for a in sc['adaptations']) + '</ul>')
    parts.append(f'<p style="font-size:12px;color:#666">scene {sc["sceneId"]} · card {c["cardSha256"][:12]} · proposal {sc["proposalSha256"][:12]}</p></section>')
parts.append('</body></html>')
open(OUT + '/SCENE_REVIEW.html', 'w').write('\n'.join(parts))

# ---------- session proposal ----------
FAM = {'build': ['build', 'receive'], 'defend': ['defend', 'press'], 'transition': ['transition'], 'combine': ['combine', 'wide', 'support', 'receive'],
       'switch': ['wide', 'press', 'support'], 'wide': ['wide', 'cross', 'support'], 'finish': ['cross'], 'keeper': ['build']}
sessions = json.loads(subprocess.check_output(['node', '-e', "import('./src/game/training12/ref/seasons.mjs').then(m=>console.log(JSON.stringify(m.sessions.map(s=>({id:s.id,season:s.season,week:s.week,slot:s.slot,theme:s.theme,routes:Object.fromEntries(Object.entries(s.roleRoutes).map(([r,v])=>[r,v.family]))})))))"]))
by_role = {}
for c in ready: by_role.setdefault(c['gameRole'], []).append(c)
rows, prop, counts = [], {}, {'exact': 0, 'related': 0, 'weak': 0, 'blocked': 0}
for n, s in enumerate(sessions):
    for role, fam in s['routes'].items():
        if role == 'GK':
            rows.append((s, role, fam, 'BLOCKED: GK01-GK03 retired; no goalkeeper decision sessions', '')); counts['blocked'] += 1; continue
        want = FAM.get(fam, [])
        pool = by_role.get(role, [])
        score = lambda c: 3 if want and c['phase'] == want[0] else 2 if c['phase'] in want else 1
        rot = sorted(pool, key=lambda c: (-score(c), (pool.index(c) - n) % len(pool)))[:3]
        tags = ['exact' if score(c) == 3 else 'related' if score(c) == 2 else 'weak' for c in rot]
        for t in tags: counts[t] += 1
        prop.setdefault(s['id'], {})[role] = [c['id'] for c in rot]
        rows.append((s, role, fam, ', '.join(f'{c["id"]} ({c["phase"]}, {t})' for c, t in zip(rot, tags)), ''))
json.dump({'status': 'PROPOSAL_NOT_APPROVED', 'note': 'Not loaded by the game. SESSION_CARDS stays empty until approved.', 'mapping': prop},
          open(OUT + '/session-proposal.json', 'w'), indent=1)
md = ['# v1.2 session-to-card PROPOSAL (not approved, not loaded)', '',
      'Generated by `scripts/training/propose-scenes.py`. The package says the 108-session assignment is a separate curriculum task; this is Devin\'s proposal for it, using only the 39 ready cards. '
      'Each scheduled role route gets 3 cards of that role, picked by matching the session route family to the card phase, rotating through ties. '
      'exact = card phase is the family\'s main phase; related = an allowed neighbouring phase; weak = no card of that role fits, so the closest was used and needs your call.', '',
      f'Totals over {sum(1 for _ in rows)} role routes: {counts["exact"]} exact, {counts["related"]} related, {counts["weak"]} weak card slots; {counts["blocked"]} GK routes blocked.', '',
      'Family → phases used: ' + '; '.join(f'{k} → {", ".join(v)}' for k, v in FAM.items()) + '. (Outfield "keeper" family = playing with the keeper → build.)', '',
      '| Session | Theme | Role | Family | Proposed cards |', '|---|---|---|---|---|']
for s, role, fam, cards, _ in rows:
    md.append(f'| {s["id"]} | {s["theme"]} | {role} | {fam} | {cards} |')
open(OUT + '/SESSION_PROPOSAL.md', 'w').write('\n'.join(md) + '\n')
close = []
for sc in scenes:
    for lab, num in (('cue', sc['numeric']), ('changed', sc['changedCue']['numeric'])):
        a = num['actors']
        for i in range(len(a)):
            for j in range(i + 1, len(a)):
                d = math.hypot(a[i]['pos']['x'] - a[j]['pos']['x'], a[i]['pos']['y'] - a[j]['pos']['y'])
                if d < 1.5: close.append((sc['cardId'], lab, a[i]['id'], a[j]['id'], round(d, 2)))
print('CLOSE', close)
print('HALF-FIT', sum(1 for sc in scenes if sc['numeric']['view']['max']['x'] <= HALF or sc['numeric']['view']['min']['x'] >= HALF), 'of', len(scenes))
print(len(scenes), 'scenes;', counts)
