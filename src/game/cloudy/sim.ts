/**
 * Cloudy's Feeding Frenzy (owner brief 2026-10-23): framework-free round simulation.
 * Every position is in pixels of the supplied 1536x1024 aquarium painting; the scene draws the painting with one
 * uniform fit transform (`fitBackground`) and maps the same points to the screen, so the goal trigger always lines
 * up with the goal painted in the background. No goal is drawn by the game.
 */
import { createRng } from '../rng';

export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

export const CLOUDY = {
  /** The painting's pixel size; all coordinates below are in these pixels. */
  bg: { w: 1536, h: 1024 },
  /** Where Cloudy's centre may go: inside the glass, below the surface, above the sand. */
  tank: { x0: 110, x1: 1426, y0: 150, y1: 860 },
  /** The ball keeps inside the glass and above the gravel. */
  ballTank: { x0: 40, x1: 1496, y0: 130, y1: 900 },
  /** Food that sinks past this line is missed. */
  foodFloor: 860,
  /**
   * The opening of the painted goal (between the posts, under the crossbar), as fractions of the painting,
   * measured from the artwork: x 908..1166 px, y 746..855 px of 1536x1024.
   */
  goal: { x0: 908 / 1536, x1: 1166 / 1536, y0: 746 / 1024, y1: 855 / 1024 },
  roundSeconds: 45,
  countdownSeconds: 3,
  fish: {
    accel: 1900,
    maxSpeed: 430,
    /** Speed toward the target scales with distance (px/s per px) up to maxSpeed, so he settles without overshoot. */
    approach: 4.5,
    idleDrag: 3.2,
    dashSpeed: 900,
    dashAccel: 5200,
    dashSeconds: 0.35,
    dashCooldown: 3,
    /** Body circle (for nudging the ball) and the mouth hitbox in front of his face. */
    bodyRadius: 58,
    mouthOffset: 72,
    mouthRadius: 30,
    eatSeconds: 0.3,
    celebrateSeconds: 1.2,
    /** Swimming tilt never exceeds this (degrees), so he is never upside down. */
    maxTilt: 25,
  },
  food: {
    radius: 10,
    points: 10,
    /** Spawning ends this many seconds before time so the last pellets can be caught. */
    spawnStart: 1,
    finishBefore: 8,
    /** Consecutive drops stay within this horizontal distance (px) of each other. */
    maxJump: 520,
    spawnY: 160,
    spawnX: [140, 1400] as const,
  },
  levels: {
    easy: { pellets: 18, sink: 70, current: 0, currentEvery: 0, currentSeconds: 0 },
    medium: { pellets: 24, sink: 100, current: 35, currentEvery: 11, currentSeconds: 4 },
    hard: { pellets: 30, sink: 135, current: 85, currentEvery: 8, currentSeconds: 4 },
  } satisfies Record<Difficulty, { pellets: number; sink: number; current: number; currentEvery: number; currentSeconds: number }>,
  /** A current is shown this long before it pushes anything. */
  currentWarning: 1.2,
  combo: { x2: 5, x3: 10 },
  ball: {
    at: [12, 28] as const,
    lifeSeconds: 10,
    radius: 22,
    /** Water drag (1/s): speed falls by e^-drag per second. */
    drag: 1.3,
    /** Impulse = this share of Cloudy's speed into the ball, plus a small base push, capped. */
    transfer: 1.1,
    base: 90,
    dashFactor: 1.6,
    maxSpeed: 720,
    points: 50,
    restitution: 0.6,
    /** Spawn region: open water left of centre, well away from the goal. */
    spawnX: [360, 760] as const,
    spawnY: [420, 640] as const,
  },
  stars: { two: 0.6, three: 0.85 },
} as const;

export type Phase = 'ready' | 'countdown' | 'playing' | 'results';
export interface Vec { x: number; y: number }
export interface Pellet { id: number; x: number; y: number }
export interface Ball { id: number; x: number; y: number; vx: number; vy: number; until: number; inside: boolean }
export type CloudyEvent =
  | { type: 'catch'; points: number; multiplier: number; x: number; y: number }
  | { type: 'miss' }
  | { type: 'dash' }
  | { type: 'ball' }
  | { type: 'goal'; x: number; y: number }
  | { type: 'ballGone' }
  | { type: 'current'; dir: number }
  | { type: 'go' }
  | { type: 'end' };

export interface CloudyState {
  readonly difficulty: Difficulty;
  readonly seed: number;
  phase: Phase;
  paused: boolean;
  /** Countdown seconds left, then active play time. */
  countdown: number;
  t: number;
  fish: { x: number; y: number; vx: number; vy: number; facing: 1 | -1; dashLeft: number; cooldown: number; eatLeft: number; celebrateLeft: number };
  target: Vec | null;
  pellets: Pellet[];
  /** Pending drops: [time, x], in time order. */
  schedule: { at: number; x: number }[];
  ball: Ball | null;
  ballQueue: number[];
  /** Horizontal current velocity now (px/s), and the warning/active windows. */
  current: number;
  currents: { warnAt: number; from: number; to: number; dir: number }[];
  score: number;
  caught: number;
  missed: number;
  total: number;
  combo: number;
  bestCombo: number;
  goals: number;
  ended: boolean;
  events: CloudyEvent[];
  nextId: number;
}

export const multiplierFor = (combo: number): number => (combo >= CLOUDY.combo.x3 ? 3 : combo >= CLOUDY.combo.x2 ? 2 : 1);
export const starsFor = (caught: number, total: number): 1 | 2 | 3 => {
  const r = total > 0 ? caught / total : 0;
  return r >= CLOUDY.stars.three ? 3 : r >= CLOUDY.stars.two ? 2 : 1;
};
/** The scoring target in painting pixels: the goal opening inset by the ball radius, so a ball on a post never counts. */
export function goalTarget(r: number = CLOUDY.ball.radius): { x0: number; x1: number; y0: number; y1: number } {
  const g = CLOUDY.goal;
  return { x0: g.x0 * CLOUDY.bg.w + r, x1: g.x1 * CLOUDY.bg.w - r, y0: g.y0 * CLOUDY.bg.h + r, y1: g.y1 * CLOUDY.bg.h - r };
}
export const insideGoal = (x: number, y: number): boolean => {
  const t = goalTarget();
  return x >= t.x0 && x <= t.x1 && y >= t.y0 && y <= t.y1;
};

/** The single painting→screen transform: uniform scale (no stretch), whole painting visible, centred in `view`. */
export interface Fit { readonly scale: number; readonly x: number; readonly y: number }
export function fitBackground(view: { x: number; y: number; width: number; height: number }): Fit {
  const scale = Math.min(view.width / CLOUDY.bg.w, view.height / CLOUDY.bg.h);
  return { scale, x: view.x + (view.width - CLOUDY.bg.w * scale) / 2, y: view.y + (view.height - CLOUDY.bg.h * scale) / 2 };
}
export const toScreen = (f: Fit, p: Vec): Vec => ({ x: f.x + p.x * f.scale, y: f.y + p.y * f.scale });
export const toPainting = (f: Fit, p: Vec): Vec => ({ x: (p.x - f.x) / f.scale, y: (p.y - f.y) / f.scale });

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export function newRound(difficulty: Difficulty, seed = 1): CloudyState {
  const L = CLOUDY.levels[difficulty];
  const F = CLOUDY.food;
  const rng = createRng(seed);
  const end = CLOUDY.roundSeconds - F.finishBefore;
  const step = (end - F.spawnStart) / Math.max(1, L.pellets - 1);
  const schedule: { at: number; x: number }[] = [];
  let x = 400 + rng() * 700;
  for (let i = 0; i < L.pellets; i++) {
    const at = F.spawnStart + i * step + (i > 0 && i < L.pellets - 1 ? (rng() - 0.5) * step * 0.5 : 0);
    x = clamp(x + (rng() * 2 - 1) * F.maxJump, F.spawnX[0], F.spawnX[1]);
    schedule.push({ at, x });
  }
  const currents: CloudyState['currents'] = [];
  if (L.current > 0) {
    for (let at = 6; at + L.currentSeconds < end; at += L.currentEvery) currents.push({ warnAt: at, from: at + CLOUDY.currentWarning, to: at + CLOUDY.currentWarning + L.currentSeconds, dir: rng() < 0.5 ? -1 : 1 });
  }
  return {
    difficulty, seed, phase: 'ready', paused: false, countdown: CLOUDY.countdownSeconds, t: 0,
    fish: { x: 560, y: 470, vx: 0, vy: 0, facing: 1, dashLeft: 0, cooldown: 0, eatLeft: 0, celebrateLeft: 0 },
    target: null, pellets: [], schedule, ball: null, ballQueue: [...CLOUDY.ball.at], current: 0, currents,
    score: 0, caught: 0, missed: 0, total: L.pellets, combo: 0, bestCombo: 0, goals: 0, ended: false, events: [], nextId: 1,
  };
}

export function start(s: CloudyState): void {
  if (s.phase === 'ready') s.phase = 'countdown';
}
/** Pausing freezes everything (timer, drops, currents, cooldowns); input is cleared so nothing sticks. */
export function setPaused(s: CloudyState, paused: boolean): void {
  if (s.phase === 'results') return;
  s.paused = paused;
  if (paused) s.target = null;
}
/** Swim target in painting pixels, or null on release. Kept inside the tank. */
export function setTarget(s: CloudyState, p: Vec | null): void {
  s.target = p && s.phase === 'playing' && !s.paused ? { x: clamp(p.x, CLOUDY.tank.x0, CLOUDY.tank.x1), y: clamp(p.y, CLOUDY.tank.y0, CLOUDY.tank.y1) } : null;
}
export function dash(s: CloudyState): boolean {
  const f = s.fish;
  if (s.phase !== 'playing' || s.paused || f.cooldown > 0) return false;
  f.dashLeft = CLOUDY.fish.dashSeconds;
  f.cooldown = CLOUDY.fish.dashCooldown;
  s.events.push({ type: 'dash' });
  return true;
}
export const drainEvents = (s: CloudyState): CloudyEvent[] => s.events.splice(0, s.events.length);
export const mouth = (s: CloudyState): Vec => ({ x: s.fish.x + s.fish.facing * CLOUDY.fish.mouthOffset, y: s.fish.y + 4 });
/** Restrained swimming tilt in degrees (never upside down). */
export const tilt = (s: CloudyState): number => {
  const f = s.fish;
  const sp = Math.hypot(f.vx, f.vy);
  if (sp < 40) return 0;
  return clamp((Math.atan2(f.vy, Math.abs(f.vx)) * 180) / Math.PI, -CLOUDY.fish.maxTilt, CLOUDY.fish.maxTilt);
};

/** Advance by `seconds` (clamped, so a resume never jumps); fixed 1/120 s sub-steps keep it frame-rate independent. */
export function step(s: CloudyState, seconds: number): void {
  if (s.paused || s.phase === 'ready' || s.phase === 'results') return;
  let left = clamp(seconds, 0, 0.1);
  while (left > 1e-9 && (s.phase as Phase) !== 'results') {
    const dt = Math.min(1 / 120, left);
    left -= dt;
    if (s.phase === 'countdown') {
      s.countdown -= dt;
      if (s.countdown <= 0) { s.countdown = 0; s.phase = 'playing'; s.events.push({ type: 'go' }); }
      continue;
    }
    tick(s, dt);
  }
}

function tick(s: CloudyState, dt: number): void {
  const C = CLOUDY;
  const L = C.levels[s.difficulty];
  s.t += dt;
  // Currents: warned first, then a steady sideways push on food, ball and (gently) Cloudy.
  const w = s.currents.find((c) => s.t >= c.warnAt && s.t < c.to);
  if (w && s.t - dt < w.warnAt) s.events.push({ type: 'current', dir: w.dir });
  s.current = w && s.t >= w.from ? w.dir * L.current : 0;
  // Food drops.
  while (s.schedule.length && s.schedule[0]!.at <= s.t) {
    const d = s.schedule.shift()!;
    s.pellets.push({ id: s.nextId++, x: d.x, y: C.food.spawnY });
  }
  // Ball opportunities (never more than one).
  if (!s.ball && s.ballQueue.length && s.t >= s.ballQueue[0]!) {
    s.ballQueue.shift();
    const r = createRng(s.seed * 31 + s.nextId);
    const x = C.ball.spawnX[0] + r() * (C.ball.spawnX[1] - C.ball.spawnX[0]);
    const y = C.ball.spawnY[0] + r() * (C.ball.spawnY[1] - C.ball.spawnY[0]);
    s.ball = { id: s.nextId++, x, y, vx: 0, vy: 0, until: Math.min(s.t + C.ball.lifeSeconds, C.roundSeconds), inside: insideGoal(x, y) };
    s.events.push({ type: 'ball' });
  }
  moveFish(s, dt);
  moveFood(s, dt);
  moveBall(s, dt);
  if (s.t >= C.roundSeconds) finish(s);
}

function moveFish(s: CloudyState, dt: number): void {
  const F = CLOUDY.fish;
  const f = s.fish;
  f.cooldown = Math.max(0, f.cooldown - dt);
  f.eatLeft = Math.max(0, f.eatLeft - dt);
  f.celebrateLeft = Math.max(0, f.celebrateLeft - dt);
  const dashing = f.dashLeft > 0;
  f.dashLeft = Math.max(0, f.dashLeft - dt);
  let dvx = 0;
  let dvy = 0;
  if (s.target) {
    const dx = s.target.x - f.x;
    const dy = s.target.y - f.y;
    const d = Math.hypot(dx, dy);
    if (d > 1) {
      const sp = dashing ? F.dashSpeed : Math.min(F.maxSpeed, d * F.approach);
      dvx = (dx / d) * sp;
      dvy = (dy / d) * sp;
    }
  } else if (dashing) {
    dvx = f.facing * F.dashSpeed;
  }
  if (s.target || dashing) {
    const ax = dvx - f.vx;
    const ay = dvy - f.vy;
    const a = Math.hypot(ax, ay);
    const max = (dashing ? F.dashAccel : F.accel) * dt;
    const k = a > max ? max / a : 1;
    f.vx += ax * k;
    f.vy += ay * k;
  } else {
    const k = Math.exp(-F.idleDrag * dt);
    f.vx *= k;
    f.vy *= k;
  }
  const cap = dashing ? F.dashSpeed : F.maxSpeed;
  const sp = Math.hypot(f.vx, f.vy);
  if (sp > cap) { f.vx *= cap / sp; f.vy *= cap / sp; }
  f.x += (f.vx + s.current * 0.25) * dt;
  f.y += f.vy * dt;
  const T = CLOUDY.tank;
  if (f.x < T.x0) { f.x = T.x0; f.vx = Math.max(0, f.vx); }
  if (f.x > T.x1) { f.x = T.x1; f.vx = Math.min(0, f.vx); }
  if (f.y < T.y0) { f.y = T.y0; f.vy = Math.max(0, f.vy); }
  if (f.y > T.y1) { f.y = T.y1; f.vy = Math.min(0, f.vy); }
  if (Math.abs(f.vx) > 25) f.facing = f.vx > 0 ? 1 : -1;
}

function moveFood(s: CloudyState, dt: number): void {
  const L = CLOUDY.levels[s.difficulty];
  const m = mouth(s);
  const reach = CLOUDY.fish.mouthRadius + CLOUDY.food.radius;
  for (let i = s.pellets.length - 1; i >= 0; i--) {
    const p = s.pellets[i]!;
    p.y += L.sink * dt;
    p.x = clamp(p.x + s.current * dt, CLOUDY.ballTank.x0, CLOUDY.ballTank.x1);
    if (Math.hypot(p.x - m.x, p.y - m.y) <= reach) {
      const mult = multiplierFor(s.combo);
      const points = CLOUDY.food.points * mult;
      s.score += points;
      s.caught++;
      s.combo++;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      s.fish.eatLeft = CLOUDY.fish.eatSeconds;
      s.events.push({ type: 'catch', points, multiplier: mult, x: p.x, y: p.y });
      s.pellets.splice(i, 1);
    } else if (p.y >= CLOUDY.foodFloor) {
      s.missed++;
      s.combo = 0;
      s.events.push({ type: 'miss' });
      s.pellets.splice(i, 1);
    }
  }
}

function moveBall(s: CloudyState, dt: number): void {
  const b = s.ball;
  if (!b) return;
  const B = CLOUDY.ball;
  const f = s.fish;
  // Contact: the ball is pushed out of Cloudy's body along the contact normal and takes an impulse from his motion.
  const dx = b.x - f.x;
  const dy = b.y - f.y;
  const d = Math.hypot(dx, dy) || 1;
  const min = CLOUDY.fish.bodyRadius + B.radius;
  if (d < min) {
    const nx = dx / d;
    const ny = dy / d;
    b.x = f.x + nx * min;
    b.y = f.y + ny * min;
    const into = Math.max(0, f.vx * nx + f.vy * ny);
    const k = f.dashLeft > 0 ? B.dashFactor : 1;
    const rel = b.vx * nx + b.vy * ny;
    const push = Math.max(0, into * B.transfer * k + B.base - rel);
    b.vx += nx * push;
    b.vy += ny * push;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > B.maxSpeed) { b.vx *= B.maxSpeed / sp; b.vy *= B.maxSpeed / sp; }
  }
  const drag = Math.exp(-B.drag * dt);
  b.vx = b.vx * drag + s.current * 0.6 * dt;
  b.vy *= drag;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  const T = CLOUDY.ballTank;
  if (b.x < T.x0 + B.radius) { b.x = T.x0 + B.radius; b.vx = Math.abs(b.vx) * B.restitution; }
  if (b.x > T.x1 - B.radius) { b.x = T.x1 - B.radius; b.vx = -Math.abs(b.vx) * B.restitution; }
  if (b.y < T.y0 + B.radius) { b.y = T.y0 + B.radius; b.vy = Math.abs(b.vy) * B.restitution; }
  if (b.y > T.y1 - B.radius) { b.y = T.y1 - B.radius; b.vy = -Math.abs(b.vy) * B.restitution; }
  // A goal is the whole ball entering the inset goal mouth from outside, once.
  const inside = insideGoal(b.x, b.y);
  if (inside && !b.inside) {
    s.score += B.points;
    s.goals++;
    f.celebrateLeft = CLOUDY.fish.celebrateSeconds;
    s.events.push({ type: 'goal', x: b.x, y: b.y });
    s.ball = null;
    return;
  }
  b.inside = inside;
  if (s.t >= b.until) {
    s.ball = null;
    s.events.push({ type: 'ballGone' });
  }
}

function finish(s: CloudyState): void {
  if (s.ended) return;
  s.ended = true;
  s.phase = 'results';
  s.t = CLOUDY.roundSeconds;
  s.target = null;
  s.pellets = [];
  s.schedule = [];
  s.ball = null;
  s.ballQueue = [];
  s.current = 0;
  s.events.push({ type: 'end' });
}

export interface CloudyResult { score: number; caught: number; total: number; bestCombo: number; goals: number; stars: 1 | 2 | 3 }
export const resultOf = (s: CloudyState): CloudyResult => ({ score: s.score, caught: s.caught, total: s.total, bestCombo: s.bestCombo, goals: s.goals, stars: starsFor(s.caught, s.total) });
