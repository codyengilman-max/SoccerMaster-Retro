/**
 * Juggling demos on the owner's prepared juggling sheets (Juggling/Referee pack, art review build, not shipping
 * approved). Pure: compiles a ladder pattern into body-frame segments and an independent ball flight in sheet cell
 * pixels (160 x 128 cells, ground anchor 80,120). Calibration below was measured on the supplied poses.
 */
export type JuggleSex = 'boy' | 'girl';
export type JuggleBeat = { readonly s: 'laces' | 'bounce' | 'catch'; readonly foot: 'right' | 'left' };

export const JUGGLE_SHEET = Object.freeze({ cols: 6, rows: 4, cell: { w: 160, h: 128 }, anchor: { x: 80, y: 120 }, ballR: 7 });
/** Sheet frame ids (zero-based, row-major) from the pack's frame map. */
export const JF = Object.freeze({
  ready: 0, hold: 1, release: 2, track: 3, anticipate: 4, reset: 5,
  prepA: 6, touchA: 7, recoverA: 8, prepB: 9, touchB: 10, recoverB: 11,
  waitBounce: 12, stepR: 13, stepL: 14, catchPrep: 15, catch: 16, finish: 17,
  miss: 18, chase: 19, reach: 20, pickup: 21, stand: 22, celebrate: 23,
});

type Pt = { readonly x: number; readonly y: number };
interface Calibration {
  /** Neutral stance boot centres (frame 0), viewer-left then viewer-right. */
  readonly stance: readonly [number, number];
  /** Grounded boot centres per frame (x, cell px), measured from the sheet. */
  readonly ground: readonly (readonly number[])[];
  /** Ball centre where the ball meets the body: laces top on touch frames, between the hands when held. */
  readonly ball: Readonly<Partial<Record<number, Pt>>>;
}

export const JUGGLE_CAL: Readonly<Record<JuggleSex, Calibration>> = {
  boy: {
    stance: [58, 98],
    ground: [[98, 58], [94, 62.5], [88, 58.5], [91, 61], [99.5, 58], [59, 98], [96.5], [90], [96, 65], [105, 65], [81], [102, 57], [94.5, 63.5], [63, 109.5], [105, 54], [98, 53], [99.5, 58.5], [60, 98.5], [91.5, 63.5], [96.5], [85.5, 58], [59, 100], [96, 62.5], [58.5, 97.5]],
    ball: { 1: { x: 80, y: 77.5 }, 7: { x: 111.5, y: 87 }, 10: { x: 115, y: 81 }, 16: { x: 81, y: 70.5 }, 17: { x: 79.5, y: 70 }, 20: { x: 88, y: 113 }, 21: { x: 83, y: 106 }, 22: { x: 79.5, y: 72 } },
  },
  girl: {
    stance: [67, 97.5],
    ground: [[67, 97.5], [97.5, 68.5], [96.5, 61.5], [63.5, 95.5], [62, 97], [69.5, 97.5], [96], [73], [79], [101], [74], [77.5], [59, 96.5], [103, 53.5], [56, 99.5], [93, 54.5], [61, 101.5], [68, 99], [96.5, 65.5], [58, 97], [91, 58], [64.5, 98.5], [69, 99.5], [101.5, 60.5]],
    ball: { 1: { x: 84, y: 72.5 }, 7: { x: 115, y: 80 }, 10: { x: 114, y: 79 }, 16: { x: 81.5, y: 70.5 }, 17: { x: 83.5, y: 68 }, 20: { x: 90.5, y: 113 }, 21: { x: 88, y: 107 }, 22: { x: 83.5, y: 66 } },
  },
};

/** Largest body shift used to keep a planted boot still; bigger gaps are art defects (reported, not hidden). */
export const MAX_SUPPORT_SHIFT = 8;

/**
 * Per-frame horizontal shift (cell px) that keeps the planted boot on the neutral stance spot: one grounded boot
 * snaps to the nearer stance boot; two grounded boots keep their average on the stance centre.
 */
export function supportShift(sex: JuggleSex, frame: number): { dx: number; raw: number } {
  const c = JUGGLE_CAL[sex];
  const g = c.ground[frame] ?? [];
  let raw = 0;
  if (g.length === 1) {
    const x = g[0]!;
    const near = Math.abs(x - c.stance[0]) < Math.abs(x - c.stance[1]) ? c.stance[0] : c.stance[1];
    raw = near - x;
  } else if (g.length >= 2) raw = (c.stance[0] + c.stance[1]) / 2 - (Math.min(...g) + Math.max(...g)) / 2;
  return { dx: Math.abs(raw) <= MAX_SUPPORT_SHIFT ? raw : 0, raw };
}

/** Frames whose working foot or left/right reading is unclear, or whose support foot jumps (owner review list). */
export const DEFICIENT_FRAMES: Readonly<Record<JuggleSex, readonly { frame: number; why: string }[]>> = {
  boy: [
    { frame: 9, why: 'no clear backswing: both boots near the ground, reads as a walking stride' },
    { frame: 9, why: 'opposite-foot cycle 9–11 is a near duplicate of 6–8 (same side kicks); working foot not distinguishable' },
    { frame: 10, why: 'kick extends to the same side as frame 7; support boot sits 17 px from either stance spot (slides)' },
    { frame: 11, why: 'recovery duplicates frame 8' },
  ],
  girl: [
    { frame: 6, why: 'backswing leg is not the kicking leg in frame 7 (support boot swaps sides)' },
    { frame: 7, why: 'support boot 24 px from frame 6 planted boot (slides)' },
    { frame: 8, why: 'recovery with raised knee (elevated, thigh-like)' },
    { frame: 9, why: 'opposite-foot cycle 9–11 duplicates 6–8 (same side kicks); working foot not distinguishable' },
    { frame: 10, why: 'support boot swaps sides from frame 9 (slides)' },
    { frame: 11, why: 'recovery with raised knee (elevated), duplicates frame 8' },
    { frame: 15, why: 'catch preparation stance sits 8.5 px off the neutral stance centre (small slide)' },
  ],
};

export interface SheetPose {
  readonly index: number;
  /** Body shift (cell px) keeping the planted boot still. */
  readonly dx: number;
  /** Ball centre and radius in cell px (anchor-relative cell coordinates). */
  readonly ball: { readonly x: number; readonly y: number; readonly r: number };
  readonly contact: 'laces' | 'catch' | 'bounce' | 'none';
  readonly caption: string;
}

interface Seg {
  readonly t0: number;
  readonly t1: number;
  readonly frames: readonly { readonly until: number; readonly index: number }[];
  readonly ball: (t: number) => Pt;
  readonly contact: (t: number) => SheetPose['contact'];
  readonly caption: string;
}
export interface JuggleTimeline {
  readonly length: number;
  readonly segs: readonly Seg[];
  /** Event times (seconds) for tests: ball meets the laces / ground / hands. */
  readonly events: readonly { readonly t: number; readonly kind: 'release' | 'touch' | 'bounce' | 'catch' | 'land' | 'pickup'; readonly frame: number; readonly ball: Pt }[];
}

/** Gravity in cell px / s² (100 px body ≈ 1.4 m, eased slightly for readability). */
export const JUGGLE_G = 560;
const APEX_Y = 24;
const BOUNCE_APEX_Y = 64;
const PREP = 0.18, TOUCH = 0.12, RECOVER = 0.18, HOLD = 0.6, CATCH = 0.4, FINISH = 0.45;
const GROUND_Y = JUGGLE_SHEET.anchor.y - JUGGLE_SHEET.ballR;

const fallTime = (h: number) => Math.sqrt((2 * Math.max(0, h)) / JUGGLE_G);
/** Ballistic flight from a to b over T seconds (y down): exact endpoints, constant gravity. */
function flight(a: Pt, b: Pt, t0: number, T: number): (t: number) => Pt {
  const vy = (b.y - a.y - 0.5 * JUGGLE_G * T * T) / T;
  return (t) => {
    const u = Math.min(T, Math.max(0, t - t0));
    return { x: a.x + ((b.x - a.x) * u) / T, y: a.y + vy * u + 0.5 * JUGGLE_G * u * u };
  };
}
/** Hands carry the ball from one held position to the next over `d` seconds (no teleporting between poses). */
function carry(a: Pt, b: Pt, t0: number, d: number): (t: number) => Pt {
  return (t) => {
    const u = Math.min(1, Math.max(0, (t - t0) / d));
    const e = u * u * (3 - 2 * u);
    return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
  };
}
const CARRY = 0.18;
const flightTime = (a: Pt, b: Pt, apexY: number) => fallTime(a.y - apexY) + fallTime(b.y - apexY);

const touchFrames = (foot: JuggleBeat['foot']) => (foot === 'right' ? [JF.prepA, JF.touchA, JF.recoverA] : [JF.prepB, JF.touchB, JF.recoverB]);
const footName = (foot: JuggleBeat['foot']) => (foot === 'right' ? 'Right' : 'Left');

/** Compile a ladder pattern (laces / bounce / catch beats). `miss` replaces the final catch with miss → retrieve → reset. */
export function compileJuggle(beats: readonly JuggleBeat[], sex: JuggleSex, miss = false): JuggleTimeline {
  const c = JUGGLE_CAL[sex];
  const at = (frame: number): Pt => {
    const p = c.ball[frame]!;
    return { x: p.x + supportShift(sex, frame).dx, y: p.y };
  };
  const segs: Seg[] = [];
  const events: { t: number; kind: JuggleTimeline['events'][number]['kind']; frame: number; ball: Pt }[] = [];
  let t = 0;
  const still = (p: Pt) => () => p;
  const none = () => 'none' as const;
  const push = (dur: number, frames: { d: number; index: number }[], ball: (t: number) => Pt, caption: string, contact: Seg['contact'] = none) => {
    let u = t;
    const fr = frames.map((f) => ({ until: (u += f.d), index: f.index }));
    segs.push({ t0: t, t1: t + dur, frames: fr, ball, contact, caption });
    t += dur;
  };
  /** Body frames while the ball is in flight towards `next` for `T` seconds. */
  const flightFrames = (T: number, after: 'touch' | 'bounce' | 'catch' | 'land', nextFoot?: JuggleBeat['foot']): { d: number; index: number }[] => {
    const lead = after === 'touch' ? PREP : after === 'catch' ? 0.28 : 0;
    const leadIndex = after === 'touch' ? touchFrames(nextFoot!)[0]! : JF.catchPrep;
    const body = Math.max(0, T - lead);
    const out: { d: number; index: number }[] = [];
    if (after === 'bounce' || after === 'land') return [{ d: T, index: after === 'land' ? JF.track : JF.waitBounce }];
    out.push({ d: body * 0.5, index: JF.ready }, { d: body * 0.5, index: JF.track }, { d: Math.min(lead, T), index: leadIndex });
    return out;
  };

  let pos: Pt = at(JF.hold);
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i]!;
    const prev = beats[i - 1];
    if (b.s === 'laces' && (!prev || prev.s === 'catch')) {
      // Hold, release and drop onto the laces.
      push(HOLD, [{ d: HOLD, index: JF.hold }], carry(pos, at(JF.hold), t, CARRY), 'Hold the ball at waist height', () => 'catch');
      const [, touch] = touchFrames(b.foot);
      const to = at(touch!);
      const from = at(JF.hold);
      const T = fallTime(to.y - from.y);
      events.push({ t, kind: 'release', frame: JF.release, ball: from });
      push(T, [{ d: Math.min(0.08, T / 2), index: JF.release }, { d: T - Math.min(0.08, T / 2), index: touchFrames(b.foot)[0]! }], flight(from, to, t, T), 'Drop it onto the laces');
      pos = to;
    }
    if (b.s === 'laces') {
      const [, touch, recover] = touchFrames(b.foot);
      const cap = `${footName(b.foot)} laces up`;
      events.push({ t, kind: 'touch', frame: touch!, ball: pos });
      const next = beats[i + 1];
      const last = !next || next.s === 'catch';
      if (last && miss) {
        // Mistimed touch: the ball drops in front instead of rising to the hands.
        const land = { x: at(JF.reach).x + 3, y: GROUND_Y };
        const T = flightTime(pos, land, 70);
        const t0 = t;
        const f1 = flight(pos, land, t0, T);
        push(T, [{ d: TOUCH, index: touch! }, { d: RECOVER, index: recover! }, { d: Math.max(0, T - TOUCH - RECOVER), index: JF.miss }], f1, 'Miss: it got away', (u) => (u - t0 < TOUCH ? 'laces' : 'none'));
        events.push({ t, kind: 'land', frame: JF.miss, ball: land });
        const rest = at(JF.reach);
        const hop = 0.42;
        const t1 = t;
        const hopF = flight(land, rest, t1, hop);
        push(hop + 0.35, [{ d: 0.4, index: JF.miss }, { d: 0.37, index: JF.chase }], (u) => (u - t1 < hop ? hopF(u) : rest), 'Chase it down', () => 'bounce');
        push(0.3, [{ d: 0.3, index: JF.reach }], still(rest), 'Reach for it');
        const lift = at(JF.pickup);
        events.push({ t, kind: 'pickup', frame: JF.pickup, ball: lift });
        push(0.35, [{ d: 0.35, index: JF.pickup }], carry(rest, lift, t, CARRY), 'Pick it up', () => 'catch');
        push(0.6, [{ d: 0.6, index: JF.stand }], carry(lift, at(JF.stand), t, 0.3), 'Reset and go again', () => 'catch');
        pos = at(JF.stand);
        break;
      }
      if (last) {
        const hands = at(JF.catch);
        const T = flightTime(pos, hands, APEX_Y);
        const t0 = t;
        const fr = [{ d: TOUCH, index: touch! }, { d: RECOVER, index: recover! }, ...flightFrames(T - TOUCH - RECOVER, 'catch')];
        push(T, fr, flight(pos, hands, t0, T), cap, (u) => (u - t0 < TOUCH ? 'laces' : 'none'));
        pos = hands;
        continue;
      }
      if (next.s === 'bounce') {
        const after = beats[i + 2];
        const ground = { x: (pos.x + 92) / 2, y: GROUND_Y };
        const T1 = flightTime(pos, ground, APEX_Y);
        const t0 = t;
        push(T1, [{ d: TOUCH, index: touch! }, { d: RECOVER, index: recover! }, { d: Math.max(0, T1 - TOUCH - RECOVER), index: JF.waitBounce }], flight(pos, ground, t0, T1), cap, (u) => (u - t0 < TOUCH ? 'laces' : 'none'));
        events.push({ t, kind: 'bounce', frame: JF.waitBounce, ball: ground });
        const target = after?.s === 'laces' ? at(touchFrames(after.foot)[1]!) : at(JF.catch);
        const T2 = flightTime(ground, target, BOUNCE_APEX_Y);
        const lead = after?.s === 'laces' ? touchFrames(after.foot)[0]! : JF.catchPrep;
        push(T2, [{ d: Math.max(0, T2 - PREP - 0.2), index: JF.waitBounce }, { d: 0.2, index: JF.anticipate }, { d: PREP, index: lead }], flight(ground, target, t, T2), 'Let it bounce once', (u) => (u - t < 0.06 ? 'bounce' : 'none'));
        pos = target;
        continue;
      }
      // Next touch (same or other foot).
      const to = at(touchFrames(next.foot)[1]!);
      const T = flightTime(pos, to, APEX_Y);
      const t0 = t;
      push(T, [{ d: TOUCH, index: touch! }, { d: RECOVER, index: recover! }, ...flightFrames(T - TOUCH - RECOVER, 'touch', next.foot)], flight(pos, to, t0, T), cap, (u) => (u - t0 < TOUCH ? 'laces' : 'none'));
      pos = to;
      continue;
    }
    if (b.s === 'catch') {
      events.push({ t, kind: 'catch', frame: JF.catch, ball: at(JF.catch) });
      push(CATCH, [{ d: CATCH, index: JF.catch }], still(at(JF.catch)), 'Catch it', () => 'catch');
      push(FINISH, [{ d: FINISH, index: JF.finish }], carry(at(JF.catch), at(JF.finish), t, CARRY), 'Catch it', () => 'catch');
      pos = at(JF.finish);
    }
    // 'bounce' beats are consumed by the touch before them.
  }
  return { length: t, segs, events };
}

const cache = new Map<string, JuggleTimeline>();
export function juggleTimeline(id: string, beats: readonly JuggleBeat[], sex: JuggleSex, miss: boolean): JuggleTimeline {
  const k = `${id}:${sex}:${miss ? 1 : 0}`;
  let tl = cache.get(k);
  if (!tl) cache.set(k, (tl = compileJuggle(beats, sex, miss)));
  return tl;
}

export function sheetPoseAt(tl: JuggleTimeline, sex: JuggleSex, time: number): SheetPose {
  const t = ((time % tl.length) + tl.length) % tl.length;
  const seg = tl.segs.find((s) => t < s.t1) ?? tl.segs[tl.segs.length - 1]!;
  const index = (seg.frames.find((f) => t < f.until) ?? seg.frames[seg.frames.length - 1]!).index;
  const b = seg.ball(t);
  return { index, dx: supportShift(sex, index).dx, ball: { x: b.x, y: b.y, r: JUGGLE_SHEET.ballR }, contact: seg.contact(t), caption: seg.caption };
}
