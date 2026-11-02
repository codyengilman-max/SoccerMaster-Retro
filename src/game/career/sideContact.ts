/**
 * Ball Mastery side-view contact lessons. Framework-free: one timeline gives the pose, the working and supporting
 * foot, the contact surface, the ball position and the caption for any moment, so the character, ball, foot inset and
 * caption share one state. Feet are anatomical: the figure faces east, the right leg is the near leg; a left-foot
 * contact uses the left (far) leg's own pose, never a mirror. Pose ids name derived side-view frames
 * (scripts/art/build-side-contact.py): `stand`, `<foot>-lift`, `<foot>-tap` at the tap position, `<foot>-on@<dx>` /
 * `<foot>-lift@<dx>` / `stand@<dx>` with the ball `dx` px forward of it.
 */
export type Foot = 'right' | 'left';
export type SidePose = string;
export type ContactSurface = 'sole' | 'inside' | 'none';
export type ContactPhase = 'pre' | 'contact' | 'post' | 'rest';
/** rest: both feet down. lift: working sole held over the ball. tap: light touch. cover: sole rests on top.
 *  roll / draw: the sole on top rolls the ball forward / draws it back (the ball turns as it travels). */
export type SideAction = 'rest' | 'lift' | 'tap' | 'cover' | 'roll' | 'draw';

export interface SideBeat {
  /** Index into the lesson's steps (caption title). */
  readonly step: number;
  readonly seconds: number;
  readonly phase: ContactPhase;
  /** 'lead' = the foot chosen with Right/Left foot first; 'other' = the opposite foot; null while both feet rest. */
  readonly foot: 'lead' | 'other' | null;
  readonly action: SideAction;
  /** Ball position (px forward of the tap position) at the start and end of the beat. */
  readonly ball: readonly [number, number];
}

export interface SoleLesson {
  readonly kind?: 'sole';
  readonly activityId: string;
  readonly titles: readonly string[];
  readonly beats: readonly SideBeat[];
}

/**
 * Inside-of-the-foot lessons (owner option A): the side view keeps the character in a planted stance with the ball
 * between the feet (drawn between the far and near leg layers), and the foot detail shows both boots and the ball from
 * above, where an inside touch can be seen. Top-down units are side-art px: x forward (east, as in the side view),
 * y lateral, +y = the RIGHT foot's side (the near side in the side view).
 */
export interface InsideBeat {
  readonly step: number;
  readonly seconds: number;
  readonly phase: ContactPhase;
  readonly foot: 'lead' | 'other' | null;
  readonly action: 'rest' | 'reach' | 'push' | 'travel' | 'receive' | 'withdraw';
  /** Ball y, measured towards the lead foot's side, at the start and end of the beat. */
  readonly ball: readonly [number, number];
  /** How far each boot has moved in towards the ball (px; negative = out), start and end. */
  readonly lead: readonly [number, number];
  readonly other: readonly [number, number];
}
export interface InsideLesson {
  readonly kind: 'inside';
  readonly activityId: string;
  readonly titles: readonly string[];
  readonly beats: readonly InsideBeat[];
}
export type SideLesson = SoleLesson | InsideLesson;

/** Top-down boot geometry (px): feet centres at y = +/-FEET_Y, boot length along x, width along y. */
export const TOP = Object.freeze({ feetY: 18, bootL: 22, bootW: 9 });
/** Ball y (towards one foot) at which it touches that foot's inside edge with the foot at rest. */
export const TOUCH_Y = TOP.feetY - TOP.bootW / 2 - 7;

const B = (step: number, seconds: number, phase: ContactPhase, foot: SideBeat['foot'], action: SideAction, ball: readonly [number, number]): SideBeat => ({ step, seconds, phase, foot, action, ball });
/** Rest, lift over the ball, sole on top, roll forward and draw back, lift off, rest: one foot's forward-back roll. */
const rollAndDraw = (foot: 'lead' | 'other', step: number, end: number): SideBeat[] => [
  B(step, 0.4, 'pre', foot, 'lift', [0, 0]),
  B(step, 0.4, 'contact', foot, 'cover', [0, 0]),
  B(step, 0.8, 'contact', foot, 'roll', [0, 8]),
  B(step, 0.8, 'contact', foot, 'draw', [8, 0]),
  B(end, 0.4, 'post', foot, 'lift', [0, 0]),
];

const I = (step: number, seconds: number, phase: ContactPhase, foot: InsideBeat['foot'], action: InsideBeat['action'], ball: readonly [number, number], lead: readonly [number, number], other: readonly [number, number]): InsideBeat => ({ step, seconds, phase, foot, action, ball, lead, other });
const T = TOUCH_Y;
/** One inside-foot pass across: the sending foot (already touching the ball) pushes 2 px with it, the ball rolls to
 *  the receiving foot's inside edge and that foot stops it there. `s` = +1 when the lead foot sends. */
const across = (from: 'lead' | 'other', step: number, roll: number, recvStep: number): InsideBeat[] => {
  const sgn = from === 'lead' ? 1 : -1;
  const push = (a: number, b: number): [readonly [number, number], readonly [number, number]] => (from === 'lead' ? [[a, b], [0, 0]] : [[0, 0], [a, b]]);
  const [pl, po] = push(0, 2);
  const [rl, ro] = push(2, 0);
  const to: 'lead' | 'other' = from === 'lead' ? 'other' : 'lead';
  return [
    I(step, 0.25, 'contact', from, 'push', [sgn * T, sgn * (T - 2)], pl, po),
    I(step, roll, 'pre', to, 'travel', [sgn * (T - 2), -sgn * T], rl, ro),
    I(recvStep, 0.3, 'contact', to, 'receive', [-sgn * T, -sgn * T], [0, 0], [0, 0]),
  ];
};

export const SIDE_LESSONS: readonly SideLesson[] = [
  {
    // BM-055 Sole taps: Settle, Tap (sole), Recover, Alternate (other sole). Ball stays still between contacts.
    activityId: 'bmd-055',
    titles: ['Settle', 'Tap', 'Recover', 'Alternate'],
    beats: [
      B(0, 0.9, 'rest', null, 'rest', [0, 0]),
      B(1, 0.4, 'pre', 'lead', 'lift', [0, 0]),
      B(1, 0.5, 'contact', 'lead', 'tap', [0, 0]),
      B(2, 0.4, 'post', 'lead', 'lift', [0, 0]),
      B(2, 0.5, 'rest', null, 'rest', [0, 0]),
      B(3, 0.4, 'pre', 'other', 'lift', [0, 0]),
      B(3, 0.5, 'contact', 'other', 'tap', [0, 0]),
      B(3, 0.4, 'post', 'other', 'lift', [0, 0]),
      B(3, 0.6, 'rest', null, 'rest', [0, 0]),
    ],
  },
  {
    // v1.1 BM03 L1: still ball; roll it a short distance forward with one sole; foot down, stop.
    activityId: 'v11-BM03-L1',
    titles: ['Still ball', 'Roll forward', 'Foot down, stop'],
    beats: [
      B(0, 0.9, 'rest', null, 'rest', [0, 0]),
      B(1, 0.4, 'pre', 'lead', 'lift', [0, 0]),
      B(1, 0.4, 'contact', 'lead', 'cover', [0, 0]),
      B(1, 0.8, 'contact', 'lead', 'roll', [0, 8]),
      B(2, 0.4, 'post', 'lead', 'lift', [8, 8]),
      B(2, 0.8, 'rest', null, 'rest', [8, 8]),
    ],
  },
  {
    // v1.1 BM03 L2: still ball; roll forward and draw back with the same sole; foot down, reset.
    activityId: 'v11-BM03-L2',
    titles: ['Still ball', 'Roll forward, draw back', 'Foot down, reset'],
    beats: [B(0, 0.9, 'rest', null, 'rest', [0, 0]), ...rollAndDraw('lead', 1, 2), B(2, 0.8, 'rest', null, 'rest', [0, 0])],
  },
  {
    // v1.1 BM03 L3: as L2 with the less-preferred sole (chosen with Right/Left foot first).
    activityId: 'v11-BM03-L3',
    titles: ['Still ball', 'Less-preferred sole: roll forward, draw back', 'Foot down, reset'],
    beats: [B(0, 0.9, 'rest', null, 'rest', [0, 0]), ...rollAndDraw('lead', 1, 2), B(2, 0.8, 'rest', null, 'rest', [0, 0])],
  },
  {
    // v1.1 BM03 L4: roll forward and back with one sole, reset both feet, repeat with the other sole; stop.
    activityId: 'v11-BM03-L4',
    titles: ['Still ball', 'One sole, reset, other sole', 'Stop'],
    beats: [
      B(0, 0.9, 'rest', null, 'rest', [0, 0]),
      ...rollAndDraw('lead', 1, 1),
      B(1, 0.6, 'rest', null, 'rest', [0, 0]),
      ...rollAndDraw('other', 1, 2),
      B(2, 0.8, 'rest', null, 'rest', [0, 0]),
    ],
  },
  {
    // v1.1 TR01 L1: still ball in front; draw it back a short distance with the sole; foot down, stop.
    activityId: 'v11-TR01-L1',
    titles: ['Ball in front', 'Draw it back', 'Foot down, stop'],
    beats: [
      B(0, 0.9, 'rest', null, 'rest', [8, 8]),
      B(1, 0.4, 'pre', 'lead', 'lift', [8, 8]),
      B(1, 0.4, 'contact', 'lead', 'cover', [8, 8]),
      B(1, 0.9, 'contact', 'lead', 'draw', [8, 0]),
      B(2, 0.4, 'post', 'lead', 'lift', [0, 0]),
      B(2, 0.8, 'rest', null, 'rest', [0, 0]),
    ],
  },
  {
    // BM-056 Inside-foot shuffles: start beside the first foot's inside edge; transfer across (that foot's inside),
    // return (the other foot's inside); reset with control.
    kind: 'inside',
    activityId: 'bmd-056',
    titles: ['Start', 'Transfer', 'Return', 'Reset'],
    beats: [
      I(0, 0.8, 'rest', null, 'rest', [T - 2, T - 2], [0, 0], [0, 0]),
      I(1, 0.3, 'pre', 'lead', 'reach', [T - 2, T - 2], [0, 2], [0, 0]),
      I(1, 0.25, 'contact', 'lead', 'push', [T - 2, T - 4], [2, 4], [0, 0]),
      I(1, 0.7, 'pre', 'other', 'travel', [T - 4, -T], [4, 0], [0, 0]),
      I(2, 0.3, 'contact', 'other', 'receive', [-T, -T], [0, 0], [0, 0]),
      ...across('other', 2, 0.7, 3),
      I(3, 0.3, 'post', 'lead', 'withdraw', [T, T], [0, -2], [0, 0]),
      I(3, 0.6, 'rest', null, 'rest', [T, T], [-2, -2], [0, 0]),
    ],
  },
  ...(['v11-BM01-L1', 'v11-CO01-L1'] as const).map((activityId): InsideLesson => ({
    // v1.1 BM01 L1 / CO01 L1: ball between the feet (CO01: a still ball); one inside-foot transfer; stop (and reset).
    kind: 'inside',
    activityId,
    titles: activityId === 'v11-BM01-L1' ? ['Ball between feet', 'One inside transfer', 'Stop and reset'] : ['Still ball', 'One inside transfer', 'Stop'],
    beats: [
      I(0, 0.8, 'rest', null, 'rest', [0, 0], [0, 0], [0, 0]),
      I(1, 0.6, 'pre', 'lead', 'reach', [0, 0], [0, T], [0, 0]),
      I(1, 0.25, 'contact', 'lead', 'push', [0, -2], [T, T + 2], [0, 0]),
      I(1, 0.6, 'pre', 'other', 'travel', [-2, -T], [T + 2, 0], [0, 0]),
      I(2, 0.3, 'contact', 'other', 'receive', [-T, -T], [0, 0], [0, 0]),
      I(2, 0.3, 'post', 'other', 'withdraw', [-T, -T], [0, 0], [0, -2]),
      I(2, 0.6, 'rest', null, 'rest', [-T, -T], [0, 0], [-2, -2]),
    ],
  })),
  {
    // v1.1 BM01 L2: ball between the feet; four gentle alternating inside-foot transfers; stop and reset.
    kind: 'inside',
    activityId: 'v11-BM01-L2',
    titles: ['Ball between feet', 'Four alternating inside transfers', 'Stop and reset'],
    beats: [
      I(0, 0.8, 'rest', null, 'rest', [0, 0], [0, 0], [0, 0]),
      I(1, 0.6, 'pre', 'lead', 'reach', [0, 0], [0, T], [0, 0]),
      I(1, 0.25, 'contact', 'lead', 'push', [0, -2], [T, T + 2], [0, 0]),
      I(1, 0.6, 'pre', 'other', 'travel', [-2, -T], [T + 2, 0], [0, 0]),
      I(1, 0.3, 'contact', 'other', 'receive', [-T, -T], [0, 0], [0, 0]),
      ...across('other', 1, 0.6, 1),
      ...across('lead', 1, 0.6, 1),
      ...across('other', 1, 0.6, 2),
      I(2, 0.3, 'post', 'lead', 'withdraw', [T, T], [0, -2], [0, 0]),
      I(2, 0.6, 'rest', null, 'rest', [T, T], [-2, -2], [0, 0]),
    ],
  },
  {
    // v1.1 BM01 L3: two slow then two comfortable alternating inside-foot transfers; stop and reset.
    kind: 'inside',
    activityId: 'v11-BM01-L3',
    titles: ['Ball between feet', 'Two slow, two comfortable transfers', 'Stop and reset'],
    beats: [
      I(0, 0.8, 'rest', null, 'rest', [0, 0], [0, 0], [0, 0]),
      I(1, 0.6, 'pre', 'lead', 'reach', [0, 0], [0, T], [0, 0]),
      I(1, 0.25, 'contact', 'lead', 'push', [0, -2], [T, T + 2], [0, 0]),
      I(1, 1.0, 'pre', 'other', 'travel', [-2, -T], [T + 2, 0], [0, 0]),
      I(1, 0.3, 'contact', 'other', 'receive', [-T, -T], [0, 0], [0, 0]),
      ...across('other', 1, 1.0, 1),
      ...across('lead', 1, 0.6, 1),
      ...across('other', 1, 0.6, 2),
      I(2, 0.3, 'post', 'lead', 'withdraw', [T, T], [0, -2], [0, 0]),
      I(2, 0.6, 'rest', null, 'rest', [T, T], [-2, -2], [0, 0]),
    ],
  },
];

export const sideLessonFor = (activityId: string): SideLesson | undefined => SIDE_LESSONS.find((l) => l.activityId === activityId);
export const sideLength = (l: SideLesson): number => Math.round(l.beats.reduce((t, b) => t + b.seconds, 0) * 1000) / 1000;
/** Beat start times; Step visits every beat, so each pre-contact, contact and post-contact pose can be held. */
export const sideStarts = (l: SideLesson): number[] => l.beats.map((_, i) => Math.round(l.beats.slice(0, i).reduce((t, b) => t + b.seconds, 0) * 1000) / 1000);

const other = (f: Foot): Foot => (f === 'right' ? 'left' : 'right');
/** Ball strip frames (12 rotations of the approved Jungle Ball) and its radius in side-art px. */
export const BALL_TURNS = 12;
export const SIDE_BALL_R = 7;

/** The pose drawn for an action with the ball at integer position dx. */
export function sidePoseId(action: SideAction, foot: Foot | null, dx: number): SidePose {
  if (action === 'rest' || !foot) return dx === 0 ? 'stand' : `stand@${dx}`;
  if (action === 'lift') return dx === 0 ? `${foot}-lift` : `${foot}-lift@${dx}`;
  return dx === 0 ? `${foot}-tap` : `${foot}-on@${dx}`;
}

export interface SideFrame {
  readonly beat: number;
  readonly step: number;
  readonly pose: SidePose;
  readonly phase: ContactPhase;
  readonly action: SideAction | InsideBeat['action'];
  /** Working foot (null while both feet rest), supporting foot, and the surface touching the ball right now. */
  readonly working: Foot | null;
  readonly support: Foot | null;
  readonly surface: ContactSurface;
  /** Ball position, whole px forward of the tap position (each roll position has its own pose, so sole and ball agree). */
  readonly ball: number;
  /** Ball strip frame: the ball turns by the distance it has rolled (arc length / radius). */
  readonly ballTurn: number;
  readonly caption: string;
  readonly inset: string;
  /** Inside-foot lessons only: the top-down state (boot centres and ball, px) and each boot's gap to the ball. */
  readonly top?: TopState;
}

export interface TopState {
  readonly ball: { readonly x: number; readonly y: number };
  readonly boots: Readonly<Record<Foot, { readonly x: number; readonly y: number }>>;
  /** Inside edge of each boot to the ball's edge, px (0 = touching; negative would be overlap, never authored). */
  readonly gap: Readonly<Record<Foot, number>>;
}

/** The single state for time t (clamped; the demo plays once and holds its last frame). `lead` = foot that works first. */
export function sideFrame(l: SideLesson, t: number, lead: Foot): SideFrame {
  if (l.kind === 'inside') return insideFrame(l, t, lead);
  let at = Math.min(sideLength(l), Math.max(0, t));
  let i = 0;
  while (i < l.beats.length - 1 && at >= l.beats[i]!.seconds - 1e-9) at -= l.beats[i++]!.seconds;
  const b = l.beats[i]!;
  const u = b.seconds > 0 ? Math.min(1, Math.max(0, at / b.seconds)) : 1;
  // Smooth start and stop for a roll; the ball only moves while the sole is on it.
  const e = u * u * (3 - 2 * u);
  const ball = Math.round(b.ball[0] + (b.ball[1] - b.ball[0]) * e);
  const working: Foot | null = b.foot === null ? null : b.foot === 'lead' ? lead : other(lead);
  const pose = sidePoseId(b.action, working, ball);
  const surface: ContactSurface = b.phase === 'contact' ? 'sole' : 'none';
  const turn = Math.round(((ball / SIDE_BALL_R) * BALL_TURNS) / (2 * Math.PI));
  const ballTurn = ((turn % BALL_TURNS) + BALL_TURNS) % BALL_TURNS;
  const Name = (f: Foot): string => (f === 'right' ? 'Right' : 'Left');
  const what =
    working === null ? 'both feet down, ball still'
    : b.phase === 'pre' ? `${Name(working)} sole lifts over the ball`
    : b.phase === 'post' ? `${Name(working)} foot comes back down`
    : b.action === 'tap' ? `${Name(working)} sole taps the top of the ball`
    : b.action === 'cover' ? `${Name(working)} sole rests on top of the ball`
    : b.action === 'roll' ? `${Name(working)} sole rolls the ball forward`
    : `${Name(working)} sole draws the ball back`;
  const how = b.action === 'roll' ? ', rolling forward' : b.action === 'draw' ? ', drawing back' : '';
  return {
    beat: i, step: b.step, pose, phase: b.phase, action: b.action, working, support: working ? other(working) : null, surface, ball, ballTurn,
    caption: `${b.step + 1}. ${l.titles[b.step]}: ${what}.`,
    inset: working === null ? 'No contact\nboth feet down' : surface === 'sole' ? `${Name(working)} foot\nsole on top of ball${how}` : `${Name(working)} foot\nno contact`,
  };
}

const smooth = (u: number): number => u * u * (3 - 2 * u);
/** Lateral distance the ball has rolled up to beat i at fraction e (for the strip's rotation). */
function rolled(l: InsideLesson, i: number, e: number): number {
  let d = 0;
  for (let k = 0; k < i; k++) d += Math.abs(l.beats[k]!.ball[1] - l.beats[k]!.ball[0]);
  const b = l.beats[i]!;
  return d + Math.abs(b.ball[1] - b.ball[0]) * e;
}

function insideFrame(l: InsideLesson, t: number, lead: Foot): SideFrame {
  let at = Math.min(sideLength(l), Math.max(0, t));
  let i = 0;
  while (i < l.beats.length - 1 && at >= l.beats[i]!.seconds - 1e-9) at -= l.beats[i++]!.seconds;
  const b = l.beats[i]!;
  const e = smooth(b.seconds > 0 ? Math.min(1, Math.max(0, at / b.seconds)) : 1);
  const lerp = (p: readonly [number, number]) => p[0] + (p[1] - p[0]) * e;
  // Lead-relative values to anatomical sides: +y is the right foot's side.
  const sgn = lead === 'right' ? 1 : -1;
  const ballY = sgn * lerp(b.ball);
  const inward: Record<Foot, number> = lead === 'right' ? { right: lerp(b.lead), left: lerp(b.other) } : { right: lerp(b.other), left: lerp(b.lead) };
  const edge = TOP.feetY - TOP.bootW / 2;
  const boots = { right: { x: 0, y: TOP.feetY - inward.right }, left: { x: 0, y: -TOP.feetY + inward.left } };
  const r = SIDE_BALL_R;
  const gap = { right: edge - inward.right - (ballY + r), left: ballY - r - (-edge + inward.left) };
  const round = (v: number) => Math.round(v * 1000) / 1000;
  const working: Foot | null = b.foot === null ? null : b.foot === 'lead' ? lead : other(lead);
  const surface: ContactSurface = b.phase === 'contact' ? 'inside' : 'none';
  const turn = Math.round(((rolled(l, i, e) / r) * BALL_TURNS) / (2 * Math.PI));
  const Name = (f: Foot): string => (f === 'right' ? 'Right' : 'Left');
  const towards = (f: Foot) => `across to the ${f} foot`;
  const what =
    b.action === 'rest' ? 'both feet down, no contact'
    : b.action === 'reach' ? `${Name(working!)} foot moves in beside the ball`
    : b.action === 'push' ? `inside of the ${working} foot sends the ball ${towards(other(working!))}`
    : b.action === 'travel' ? `ball rolls ${towards(working!)}, no contact`
    : b.action === 'receive' ? `inside of the ${working} foot stops the ball`
    : `${Name(working!)} foot eases away from the ball`;
  return {
    beat: i, step: b.step, pose: 'stand', phase: b.phase, action: b.action, working, support: working ? other(working) : null, surface,
    ball: 0, ballTurn: ((turn % BALL_TURNS) + BALL_TURNS) % BALL_TURNS,
    caption: `${b.step + 1}. ${l.titles[b.step]}: ${what.charAt(0).toUpperCase()}${what.slice(1)}.`,
    inset: `From above\n${working === null ? 'no contact' : surface === 'inside' ? `${Name(working)} foot: inside on ball` : `${Name(working)} foot: no contact`}`,
    top: { ball: { x: 0, y: round(ballY) }, boots, gap: { right: round(gap.right), left: round(gap.left) } },
  };
}

/** Every pose a lesson can show (both lead feet, every whole ball position), for asset checks and the inset crop. */
export function sidePoses(l: SideLesson): SidePose[] {
  if (l.kind === 'inside') return ['stand'];
  const out = new Set<SidePose>();
  for (const lead of ['right', 'left'] as const) {
    for (const b of l.beats) {
      const f: Foot | null = b.foot === null ? null : b.foot === 'lead' ? lead : other(lead);
      const [lo, hi] = [Math.min(...b.ball), Math.max(...b.ball)];
      for (let dx = lo; dx <= hi; dx++) out.add(sidePoseId(b.action, f, dx));
    }
  }
  return [...out];
}
