/**
 * Crossbar challenge (story package v0.7 spec "CROSSBAR CHALLENGE" + K7). An isolated 3-D ball
 * simulation: the 9v9 match engine is flat (no ball height), so this prototype does not touch
 * MatchSim, its goalkeeper or its camera. Pitch metres: x lateral, y toward the goal, z height.
 */

export const CROSSBAR_SIM_VERSION = 1;
export const CROSSBAR = {
  /** U11 9v9 goal: 6.4 m x 2.13 m (21 ft x 7 ft). */
  goalWidth: 6.4,
  barHeight: 2.13,
  barRadius: 0.05,
  postRadius: 0.05,
  ballRadius: 0.105,
  /** Identical marked spot for every participant. */
  spotDistance: 11,
  gravity: 9.81,
  elevationDeg: 32,
  minSpeed: 11.5,
  maxSpeed: 16,
  maxAzimuthDeg: 25,
  dt: 1 / 240,
  maxTime: 3,
} as const;

export interface KickInput {
  /** Unit-ish aim direction from the pull-back gesture: x lateral, y toward the goal (must be > 0). */
  readonly dirX: number;
  readonly dirY: number;
  /** 0..1 from the pull length. */
  readonly power: number;
}
export type Contact = 'bar' | 'post' | 'ground' | 'net' | 'miss';
export interface ShotResult {
  readonly contact: Contact;
  readonly scored: boolean;
  readonly time: number;
  /** Ball samples (x, y, z) at 60 Hz up to the first contact, for presentation only. */
  readonly path: readonly (readonly [number, number, number])[];
}

export function validKick(k: unknown): k is KickInput {
  if (typeof k !== 'object' || k === null) return false;
  const o = k as Record<string, unknown>;
  return [o.dirX, o.dirY, o.power].every((v) => typeof v === 'number' && Number.isFinite(v)) && (o.dirY as number) > 0 && (o.power as number) >= 0 && (o.power as number) <= 1;
}

/** First root t in [0,1] of |a + t b|^2 = r^2 (2-D), or 0 if already inside, or null. */
function sweep2(ax: number, ay: number, bx: number, by: number, r: number): number | null {
  const c = ax * ax + ay * ay - r * r;
  if (c <= 0) return 0;
  const a = bx * bx + by * by;
  if (a === 0) return null;
  const b = 2 * (ax * bx + ay * by);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

/** Deterministic flight with swept (continuous) contact tests per step; the first contact is authoritative. */
export function simulateShot(input: KickInput): ShotResult {
  const C = CROSSBAR;
  const az = Math.max(-C.maxAzimuthDeg, Math.min(C.maxAzimuthDeg, (Math.atan2(input.dirX, input.dirY) * 180) / Math.PI)) * (Math.PI / 180);
  const el = (C.elevationDeg * Math.PI) / 180;
  const speed = C.minSpeed + (C.maxSpeed - C.minSpeed) * Math.max(0, Math.min(1, input.power));
  let p: [number, number, number] = [0, 0, C.ballRadius];
  let v: [number, number, number] = [speed * Math.cos(el) * Math.sin(az), speed * Math.cos(el) * Math.cos(az), speed * Math.sin(el)];
  const half = C.goalWidth / 2;
  const gy = C.spotDistance;
  const path: [number, number, number][] = [[...p]];
  const steps = Math.ceil(C.maxTime / C.dt);
  for (let i = 0; i < steps; i++) {
    const dt = C.dt;
    const q: [number, number, number] = [p[0] + v[0] * dt, p[1] + v[1] * dt, p[2] + v[2] * dt - 0.5 * C.gravity * dt * dt];
    const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]] as const;
    const hits: { t: number; c: Contact }[] = [];
    // Crossbar: an infinite line along x at (y = gy, z = barHeight), limited to the goal width.
    const tb = sweep2(p[1] - gy, p[2] - C.barHeight, d[1], d[2], C.barRadius + C.ballRadius);
    if (tb !== null && Math.abs(p[0] + d[0] * tb) <= half + C.postRadius) hits.push({ t: tb, c: 'bar' });
    for (const px of [-half, half]) {
      const tp = sweep2(p[0] - px, p[1] - gy, d[0], d[1], C.postRadius + C.ballRadius);
      if (tp !== null && p[2] + d[2] * tp <= C.barHeight) hits.push({ t: tp, c: 'post' });
    }
    // The initial resting contact is not a bounce: ground only counts once the ball is descending after launch.
    if (i > 0 && v[2] < 0 && p[2] > C.ballRadius && q[2] <= C.ballRadius) hits.push({ t: (p[2] - C.ballRadius) / (p[2] - q[2]), c: 'ground' });
    if (p[1] < gy && q[1] >= gy) {
      const t = (gy - p[1]) / d[1];
      const x = p[0] + d[0] * t;
      const z = p[2] + d[2] * t;
      if (Math.abs(x) < half - C.postRadius - C.ballRadius && z < C.barHeight - C.barRadius - C.ballRadius) hits.push({ t, c: 'net' });
    }
    if (hits.length > 0) {
      hits.sort((a, b) => a.t - b.t);
      const first = hits[0]!;
      // Simultaneous ground/bar (same instant) is defined as no score.
      const tie = hits.some((h) => h !== first && Math.abs(h.t - first.t) < 1e-9 && (h.c === 'ground') !== (first.c === 'ground'));
      const at: [number, number, number] = [p[0] + d[0] * first.t, p[1] + d[1] * first.t, p[2] + d[2] * first.t];
      path.push(at);
      const scored = first.c === 'bar' && !tie;
      return { contact: first.c, scored, time: (i + first.t) * dt, path };
    }
    p = q;
    v = [v[0], v[1], v[2] - C.gravity * dt];
    if (i % 4 === 3) path.push([...p]);
    if (p[1] > gy + 4 || Math.abs(p[0]) > half + 8) break;
  }
  return { contact: 'miss', scored: false, time: C.maxTime, path };
}

/** What the player sees after a shot: the first contact, and for a miss whether it went over, wide or fell short. */
export type ShotOutcome = 'bar' | 'post' | 'under' | 'short' | 'over' | 'wide';
export function describeShot(r: ShotResult): ShotOutcome {
  if (r.contact === 'bar') return 'bar';
  if (r.contact === 'post') return 'post';
  if (r.contact === 'net') return 'under';
  // The flight is a straight line in plan view, so its lateral position on the goal line follows from any sample.
  const gy = CROSSBAR.spotDistance;
  const last = r.path[r.path.length - 1]!;
  const xAtGoal = last[1] > 0 ? (last[0] / last[1]) * gy : last[0];
  if (Math.abs(xAtGoal) > CROSSBAR.goalWidth / 2) return 'wide';
  return r.contact === 'ground' ? 'short' : 'over';
}

// ---- Contest (K7 lifecycle) ----

export type Participant = 'player' | 'blake';
export const PARTICIPANTS: readonly Participant[] = ['player', 'blake'];
export type Round = 'warmup' | 'main' | 'sudden';
export interface Attempt {
  readonly key: string;
  readonly round: Round;
  readonly participant: Participant;
  readonly index: number;
  readonly state: 'launched' | 'resolved';
  readonly input: KickInput;
  readonly simVersion: number;
  readonly contact: Contact | null;
  readonly scored: boolean;
}
export interface Contest {
  readonly contestId: string;
  readonly simVersion: number;
  readonly warmup: boolean;
  /** False when a tie stands as a draw (Season One weeks 1-2). Absent on older saves: sudden death. */
  readonly sudden?: boolean;
  readonly attempts: readonly Attempt[];
  readonly status: 'active' | 'resolved' | 'abandoned' | 'interrupted';
}
export const MAIN_SHOTS = 3;

export const attemptKey = (contestId: string, round: Round, participant: Participant, index: number): string => JSON.stringify([contestId, round, participant, index]);

export function newContest(contestId: string, warmup: boolean, sudden = true): Contest {
  return { contestId, simVersion: CROSSBAR_SIM_VERSION, warmup, ...(sudden ? {} : { sudden: false }), attempts: [], status: 'active' };
}

export function points(c: Contest, who: Participant): number {
  return c.attempts.filter((a) => a.participant === who && a.round !== 'warmup' && a.state === 'resolved' && a.scored).length;
}

/** Next slot to shoot, alternating participants; equal scored attempts before any winner is assessed. */
export function nextSlot(c: Contest): { round: Round; participant: Participant; index: number } | null {
  if (c.status !== 'active') return null;
  if (c.attempts.some((a) => a.state === 'launched')) return null;
  const count = (round: Round, who: Participant) => c.attempts.filter((a) => a.round === round && a.participant === who).length;
  const plan: [Round, number][] = [];
  if (c.warmup) plan.push(['warmup', 1]);
  plan.push(['main', MAIN_SHOTS]);
  const mainDone = PARTICIPANTS.every((p) => count('main', p) === MAIN_SHOTS);
  // Sudden death is one pair: once the player has shot, Blake always replies, so both have equal attempts.
  if (mainDone && c.sudden !== false && (points(c, 'player') === points(c, 'blake') || count('sudden', 'player') !== count('sudden', 'blake'))) plan.push(['sudden', 1]);
  for (const [round, n] of plan) {
    for (let i = 0; i < n; i++) for (const who of PARTICIPANTS) if (count(round, who) === i) return { round, participant: who, index: i };
  }
  return null;
}

export function contestResult(c: Contest): 'WIN' | 'LOSS' | 'DRAW' | null {
  if (nextSlot(c) !== null || c.status !== 'active' || c.attempts.some((a) => a.state === 'launched')) return null;
  const p = points(c, 'player');
  const b = points(c, 'blake');
  return p > b ? 'WIN' : p < b ? 'LOSS' : 'DRAW';
}

export type ContestStep = { ok: true; contest: Contest } | { ok: false; error: string };

/** Step 1: freeze the launch input for the next slot. Persist this BEFORE simulating. */
export function launchAttempt(c: Contest, who: Participant, input: KickInput): ContestStep {
  const slot = nextSlot(c);
  if (!slot) return { ok: false, error: 'no attempt is ready' };
  if (slot.participant !== who) return { ok: false, error: 'not your turn' };
  if (!validKick(input)) return { ok: false, error: 'invalid kick' };
  const a: Attempt = { key: attemptKey(c.contestId, slot.round, who, slot.index), ...slot, state: 'launched', input, simVersion: c.simVersion, contact: null, scored: false };
  return { ok: true, contest: { ...c, attempts: [...c.attempts, a] } };
}

/** Step 2: resolve the launched attempt deterministically (reload replays the same frozen input). */
export function resolveAttempt(c: Contest): ContestStep {
  const i = c.attempts.findIndex((a) => a.state === 'launched');
  if (i < 0) return { ok: false, error: 'nothing launched' };
  const a = c.attempts[i]!;
  if (a.simVersion !== CROSSBAR_SIM_VERSION) return { ok: true, contest: { ...c, status: 'interrupted' } };
  const r = simulateShot(a.input);
  const attempts = c.attempts.slice();
  attempts[i] = { ...a, state: 'resolved', contact: r.contact, scored: r.scored };
  return { ok: true, contest: { ...c, attempts } };
}

/**
 * Compare-and-commit a launch against the stored contest: only from the exact state this client saw
 * (same attempt count, still active). A stale tab, or a second tap after the turn moved, launches nothing.
 */
export function commitLaunch(stored: unknown, seen: number, who: Participant, input: KickInput): Contest | null {
  const c = restoreContest(stored);
  if (!c || c.status !== 'active' || c.attempts.length !== seen) return null;
  const l = launchAttempt(c, who, input);
  return l.ok ? l.contest : null;
}

/** Compare-and-commit the result of one launched attempt; already resolved (or unknown) leaves the record alone. */
export function commitResolve(stored: unknown, key: string): Contest | null {
  const c = restoreContest(stored);
  const a = c?.attempts.find((x) => x.key === key);
  if (!c || !a || a.state !== 'launched') return null;
  const r = resolveAttempt(c);
  return r.ok ? r.contest : null;
}

/** Restore after reload: an incompatible simulation version is interrupted, never an invented result. */
export function restoreContest(raw: unknown): Contest | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const c = raw as Contest;
  if (typeof c.contestId !== 'string' || !Array.isArray(c.attempts)) return null;
  if (c.simVersion !== CROSSBAR_SIM_VERSION && c.status === 'active') return { ...c, status: 'interrupted' };
  return c;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rand(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Power that grazes the crossbar centre, found by bisection on the same simulation the player uses. */
export function idealPower(): number {
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    const r = simulateShot({ dirX: 0, dirY: 1, power: mid });
    const top = r.path[r.path.length - 1]!;
    if (r.contact === 'bar') return mid;
    if (r.contact === 'net' || r.contact === 'ground' || (r.contact === 'post' && top[2] < CROSSBAR.barHeight)) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
/** Blake's kick: seeded by the stable attempt key, so a reload never rerolls; same physics and scoring. */
export function opponentKick(key: string): KickInput {
  const r = rand(hash(key));
  const g = () => (r() + r() + r() - 1.5) / 1.5;
  return { dirX: 0.12 * g(), dirY: 1, power: Math.max(0, Math.min(1, idealPower() + 0.12 * g())) };
}
