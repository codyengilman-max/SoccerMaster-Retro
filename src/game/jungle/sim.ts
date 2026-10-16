/**
 * Jungle Ball (story package v0.7 §02 "JUNGLE SOCCER / BULL BALL"): the player and three AI
 * competitors attack one shared goal past a neutral keeper. Individual scores, no elimination.
 * Framework-free and deterministic for a seed. Units: yards, seconds.
 */
import { createRng } from '../attack/rng';

export const JUNGLE_SIM_VERSION = 1;
export const JUNGLE = {
  length: 32,
  width: 22,
  goalX: 32,
  goalHalfWidth: 2.6,
  roundSeconds: 75,
  restartFreeze: 1.2,
  dt: 1 / 60,
  runSpeed: 6.2,
  dribbleSpeed: 5.2,
  accel: 30,
  playerRadius: 0.55,
  ballRadius: 0.2,
  controlReach: 0.95,
  carryOffset: 0.75,
  ballFriction: 1.6,
  wallRestitution: 0.7,
  minShot: 9,
  maxShot: 22,
  /** A dispossessed or bumped competitor is briefly slowed, then protected from another bump. */
  stunSeconds: 0.45,
  stunSpeedFactor: 0.35,
  protectSeconds: 1.6,
  /** Shoulder contact pushes at most this far per contact (bounded displacement). */
  maxPush: 0.6,
  /** A loose-ball pickup after a steal is blocked for the dispossessed player for this long. */
  regainDelay: 0.5,
  /** A fresh owner cannot be dispossessed for this long (one contact, one chance; no 60 Hz ping-pong). */
  possessionGrace: 0.4,
  keeperSpeed: 4.2,
  keeperReach: 1.15,
  aiReaction: 0.22,
  aiShotRange: 12,
  /** AI handicap so a phone player can compete: slightly slower, less accurate, at most two chasers. */
  aiSpeedFactor: 0.9,
  aiAimError: 2.6,
  aiChasers: 2,
} as const;

export type CompetitorId = 'player' | 'alex' | 'blake' | 'sam';
export const COMPETITORS: readonly CompetitorId[] = ['player', 'alex', 'blake', 'sam'];
export const AI_COMPETITORS: readonly CompetitorId[] = ['alex', 'blake', 'sam'];

export interface V { x: number; y: number }
export interface Competitor {
  readonly id: CompetitorId;
  pos: V;
  vel: V;
  stunUntil: number;
  protectedUntil: number;
  noPickupUntil: number;
  /** AI: target refresh time and current target (perception is only the present state). */
  thinkAt: number;
  target: V;
}
export type JungleEvent =
  | { readonly type: 'goal'; readonly by: CompetitorId; readonly t: number }
  | { readonly type: 'save'; readonly t: number }
  | { readonly type: 'steal'; readonly by: CompetitorId; readonly from: CompetitorId; readonly t: number }
  | { readonly type: 'bump'; readonly a: CompetitorId; readonly b: CompetitorId; readonly t: number }
  | { readonly type: 'shot'; readonly by: CompetitorId; readonly t: number }
  | { readonly type: 'end'; readonly t: number };

export interface JungleState {
  readonly seed: number;
  t: number;
  phase: 'restart' | 'live' | 'ended';
  restartUntil: number;
  competitors: Record<CompetitorId, Competitor>;
  ball: { pos: V; vel: V; owner: CompetitorId | null; lastTouch: CompetitorId | null; inGoal: boolean; graceUntil: number };
  keeper: { y: number };
  scores: Record<CompetitorId, number>;
  events: JungleEvent[];
  /** Player stick (−1..1 each axis) and a pending kick request; the scene writes only through commands. */
  stick: V;
  kick: { dir: V; power: number } | null;
}

export type JungleCommand =
  | { readonly type: 'move'; readonly x: number; readonly y: number }
  | { readonly type: 'kick'; readonly x: number; readonly y: number; readonly power: number };

const len = (v: V): number => Math.hypot(v.x, v.y);
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const finite = (...n: number[]): boolean => n.every((x) => typeof x === 'number' && Number.isFinite(x));

/** Spread, fair restart spots: everyone the same distance from the ball, nobody nearer the goal. */
export function restartSpots(): Record<CompetitorId, V> {
  const c = { x: JUNGLE.length * 0.38, y: JUNGLE.width / 2 };
  const r = 4.5;
  const ang = [Math.PI, Math.PI * 0.5, -Math.PI * 0.5, Math.PI * 0.75];
  return Object.fromEntries(COMPETITORS.map((id, i) => [id, { x: c.x + Math.cos(ang[i]!) * r * (i === 3 ? 1 : 1), y: c.y + Math.sin(ang[i]!) * r }])) as Record<CompetitorId, V>;
}
const REBOUND_SPOTS: Record<CompetitorId, V> = {
  player: { x: JUNGLE.length * 0.6, y: JUNGLE.width / 2 },
  alex: { x: JUNGLE.length * 0.7, y: JUNGLE.width * 0.25 },
  blake: { x: JUNGLE.length * 0.7, y: JUNGLE.width * 0.75 },
  sam: { x: JUNGLE.length * 0.55, y: JUNGLE.width * 0.5 },
};
const ballSpot = (): V => ({ x: JUNGLE.length * 0.38, y: JUNGLE.width / 2 });

export function newJungle(seed: number): JungleState {
  const spots = restartSpots();
  const competitors = Object.fromEntries(
    COMPETITORS.map((id) => [id, { id, pos: { ...spots[id] }, vel: { x: 0, y: 0 }, stunUntil: 0, protectedUntil: 0, noPickupUntil: 0, thinkAt: 0, target: ballSpot() }]),
  ) as Record<CompetitorId, Competitor>;
  return {
    seed,
    t: 0,
    phase: 'restart',
    restartUntil: JUNGLE.restartFreeze,
    competitors,
    ball: { pos: ballSpot(), vel: { x: 0, y: 0 }, owner: null, lastTouch: null, inGoal: false, graceUntil: 0 },
    keeper: { y: JUNGLE.width / 2 },
    scores: { player: 0, alex: 0, blake: 0, sam: 0 },
    events: [],
    stick: { x: 0, y: 0 },
    kick: null,
  };
}

/** Validates and applies one player command; invalid input is ignored. */
export function command(s: JungleState, c: JungleCommand): boolean {
  if (s.phase === 'ended') return false;
  if (c.type === 'move') {
    if (!finite(c.x, c.y)) return false;
    const m = Math.hypot(c.x, c.y);
    s.stick = m > 1 ? { x: c.x / m, y: c.y / m } : { x: c.x, y: c.y };
    return true;
  }
  if (!finite(c.x, c.y, c.power) || c.power < 0 || c.power > 1 || Math.hypot(c.x, c.y) < 1e-6) return false;
  if (s.ball.owner !== 'player') return false;
  const m = Math.hypot(c.x, c.y);
  s.kick = { dir: { x: c.x / m, y: c.y / m }, power: c.power };
  return true;
}

/** Ends the round early (player left). Scores so far stand; nothing is invented. */
export function abandon(s: JungleState): void {
  if (s.phase !== 'ended') {
    s.phase = 'ended';
    s.events.push({ type: 'end', t: s.t });
  }
}

function resetForRestart(s: JungleState): void {
  const spots = restartSpots();
  for (const id of COMPETITORS) {
    const c = s.competitors[id];
    c.pos = { ...spots[id] };
    c.vel = { x: 0, y: 0 };
    c.stunUntil = 0;
    c.protectedUntil = 0;
    c.noPickupUntil = 0;
  }
  s.ball = { pos: ballSpot(), vel: { x: 0, y: 0 }, owner: null, lastTouch: null, inGoal: false, graceUntil: 0 };
  s.keeper.y = JUNGLE.width / 2;
  s.phase = 'restart';
  s.restartUntil = s.t + JUNGLE.restartFreeze;
  s.stick = { x: 0, y: 0 };
  s.kick = null;
}

function kickBall(s: JungleState, by: CompetitorId, dir: V, power: number): void {
  const speed = JUNGLE.minShot + (JUNGLE.maxShot - JUNGLE.minShot) * clamp(power, 0, 1);
  const c = s.competitors[by];
  s.ball.owner = null;
  s.ball.lastTouch = by;
  s.ball.pos = { x: c.pos.x + dir.x * (JUNGLE.carryOffset + 0.1), y: c.pos.y + dir.y * (JUNGLE.carryOffset + 0.1) };
  s.ball.vel = { x: dir.x * speed, y: dir.y * speed };
  c.noPickupUntil = s.t + 0.25;
  s.events.push({ type: 'shot', by, t: s.t });
}

/** AI decisions use only the present positions/velocities (declared perception); refreshed every reaction period. */
function think(s: JungleState, c: Competitor, rnd: () => number): { move: V; kick: { dir: V; power: number } | null } {
  const ball = s.ball;
  if (ball.owner === c.id) {
    const goal = { x: JUNGLE.goalX, y: JUNGLE.width / 2 + (s.keeper.y < JUNGLE.width / 2 ? 1.6 : -1.6) };
    const to = { x: goal.x - c.pos.x, y: goal.y - c.pos.y };
    const d = len(to);
    if (d < JUNGLE.aiShotRange && rnd() < 0.5) {
      const aimY = goal.y + (rnd() - 0.5) * JUNGLE.aiAimError * 2;
      const dir = { x: goal.x - c.pos.x, y: aimY - c.pos.y };
      const m = len(dir);
      return { move: { x: 0, y: 0 }, kick: { dir: { x: dir.x / m, y: dir.y / m }, power: 0.5 + rnd() * 0.4 } };
    }
    return { move: { x: to.x / d, y: to.y / d }, kick: null };
  }
  if (s.t >= c.thinkAt) {
    c.thinkAt = s.t + JUNGLE.aiReaction * (0.8 + rnd() * 0.4);
    // Only the nearest non-owners chase; the rest wait at their own rebound spot (no swarming).
    const chasers = COMPETITORS.filter((id) => id !== ball.owner)
      .map((id) => ({ id, d: Math.hypot(s.competitors[id].pos.x - ball.pos.x, s.competitors[id].pos.y - ball.pos.y) }))
      .sort((a, b) => a.d - b.d || COMPETITORS.indexOf(a.id) - COMPETITORS.indexOf(b.id))
      .slice(0, JUNGLE.aiChasers)
      .map((r) => r.id);
    if (chasers.includes(c.id)) c.target = { x: ball.pos.x + ball.vel.x * 0.15, y: ball.pos.y + ball.vel.y * 0.15 };
    else c.target = REBOUND_SPOTS[c.id];
  }
  const to = { x: c.target.x - c.pos.x, y: c.target.y - c.pos.y };
  const d = len(to);
  return { move: d > 0.05 ? { x: to.x / d, y: to.y / d } : { x: 0, y: 0 }, kick: null };
}

function moveCompetitor(s: JungleState, c: Competitor, want: V, dt: number): void {
  const stunned = s.t < c.stunUntil;
  const top = (s.ball.owner === c.id ? JUNGLE.dribbleSpeed : JUNGLE.runSpeed) * (stunned ? JUNGLE.stunSpeedFactor : 1) * (c.id === 'player' ? 1 : JUNGLE.aiSpeedFactor);
  const tv = { x: want.x * top, y: want.y * top };
  const dv = { x: tv.x - c.vel.x, y: tv.y - c.vel.y };
  const m = len(dv);
  const step = JUNGLE.accel * dt;
  c.vel = m <= step ? tv : { x: c.vel.x + (dv.x / m) * step, y: c.vel.y + (dv.y / m) * step };
  const r = JUNGLE.playerRadius;
  c.pos = { x: clamp(c.pos.x + c.vel.x * dt, r, JUNGLE.length - r), y: clamp(c.pos.y + c.vel.y * dt, r, JUNGLE.width - r) };
}

/** Shoulder contact: bounded separation; the owner may lose the ball; a protected player is never stunned again. */
function contacts(s: JungleState, rnd: () => number): void {
  const ids = COMPETITORS;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = s.competitors[ids[i]!];
      const b = s.competitors[ids[j]!];
      const d = { x: b.pos.x - a.pos.x, y: b.pos.y - a.pos.y };
      const dist = len(d);
      const min = JUNGLE.playerRadius * 2;
      if (dist >= min) continue;
      const n = dist > 1e-6 ? { x: d.x / dist, y: d.y / dist } : { x: 1, y: 0 };
      const push = Math.min(JUNGLE.maxPush, (min - dist) / 2 + 0.02);
      a.pos = { x: clamp(a.pos.x - n.x * push, JUNGLE.playerRadius, JUNGLE.length - JUNGLE.playerRadius), y: clamp(a.pos.y - n.y * push, JUNGLE.playerRadius, JUNGLE.width - JUNGLE.playerRadius) };
      b.pos = { x: clamp(b.pos.x + n.x * push, JUNGLE.playerRadius, JUNGLE.length - JUNGLE.playerRadius), y: clamp(b.pos.y + n.y * push, JUNGLE.playerRadius, JUNGLE.width - JUNGLE.playerRadius) };
      const owner = s.ball.owner === a.id ? a : s.ball.owner === b.id ? b : null;
      if (!owner) continue;
      const other = owner === a ? b : a;
      if (s.t < other.stunUntil || s.t < other.noPickupUntil || s.t < s.ball.graceUntil) continue;
      // Shielding: an owner facing away from the challenger keeps the ball more often.
      const shield = owner.vel.x * (owner.pos.x - other.pos.x) + owner.vel.y * (owner.pos.y - other.pos.y) > 0 ? 0.45 : 0.75;
      if (rnd() >= shield) continue;
      s.ball.owner = other.id;
      s.ball.lastTouch = other.id;
      s.ball.graceUntil = s.t + JUNGLE.possessionGrace;
      owner.noPickupUntil = s.t + JUNGLE.regainDelay;
      s.events.push({ type: 'steal', by: other.id, from: owner.id, t: s.t });
      if (s.t >= owner.protectedUntil) {
        owner.stunUntil = s.t + JUNGLE.stunSeconds;
        owner.protectedUntil = s.t + JUNGLE.stunSeconds + JUNGLE.protectSeconds;
        s.events.push({ type: 'bump', a: other.id, b: owner.id, t: s.t });
      }
    }
  }
}

/** Goal plane: the ball centre reaching the end wall line inside the mouth. Saved or scored; returns true when handled. */
function goalPlane(s: JungleState, prevX: number, prevY: number): boolean {
  const b = s.ball;
  const r = JUNGLE.ballRadius;
  const line = JUNGLE.goalX - r;
  if (!(b.pos.x >= line && prevX < line)) return false;
  const t = (line - prevX) / (b.pos.x - prevX);
  const y = prevY + (b.pos.y - prevY) * t;
  if (Math.abs(y - JUNGLE.width / 2) > JUNGLE.goalHalfWidth - r) return false;
  if (Math.abs(y - s.keeper.y) <= JUNGLE.keeperReach) {
    s.events.push({ type: 'save', t: s.t });
    b.owner = null;
    b.pos = { x: line - 1.2, y };
    b.vel = { x: -Math.abs(b.vel.x) * 0.45, y: b.vel.y * 0.4 + (y >= s.keeper.y ? 2 : -2) };
    b.lastTouch = null;
    return true;
  }
  // One score per crossing: the round restarts before the ball could cross again.
  if (!b.inGoal && b.lastTouch) {
    b.inGoal = true;
    s.scores[b.lastTouch] += 1;
    s.events.push({ type: 'goal', by: b.lastTouch, t: s.t });
    resetForRestart(s);
  }
  return true;
}

function stepBall(s: JungleState, dt: number): void {
  const b = s.ball;
  const r = JUNGLE.ballRadius;
  if (b.owner) {
    const c = s.competitors[b.owner];
    const sp = len(c.vel);
    const dir = sp > 0.3 ? { x: c.vel.x / sp, y: c.vel.y / sp } : { x: 1, y: 0 };
    const prev = b.pos;
    b.pos = { x: c.pos.x + dir.x * JUNGLE.carryOffset, y: c.pos.y + dir.y * JUNGLE.carryOffset };
    b.vel = { ...c.vel };
    // A carried ball is checked against the goal plane like a free one (the keeper can still save it).
    if (goalPlane(s, prev.x, prev.y)) return;
    b.pos = { x: clamp(b.pos.x, r, JUNGLE.goalX - r - 1e-3), y: clamp(b.pos.y, r, JUNGLE.width - r) };
    return;
  }
  const prevX = b.pos.x;
  const prevY = b.pos.y;
  b.pos = { x: b.pos.x + b.vel.x * dt, y: b.pos.y + b.vel.y * dt };
  const sp = len(b.vel);
  const f = Math.max(0, sp - JUNGLE.ballFriction * 6 * dt);
  b.vel = sp > 0 ? { x: (b.vel.x / sp) * f, y: (b.vel.y / sp) * f } : b.vel;
  if (goalPlane(s, prevX, prevY)) return;
  if (b.pos.x < r) b.pos.x = r, (b.vel.x = Math.abs(b.vel.x) * JUNGLE.wallRestitution);
  if (b.pos.x > JUNGLE.length - r) b.pos.x = JUNGLE.length - r, (b.vel.x = -Math.abs(b.vel.x) * JUNGLE.wallRestitution);
  if (b.pos.y < r) b.pos.y = r, (b.vel.y = Math.abs(b.vel.y) * JUNGLE.wallRestitution);
  if (b.pos.y > JUNGLE.width - r) b.pos.y = JUNGLE.width - r, (b.vel.y = -Math.abs(b.vel.y) * JUNGLE.wallRestitution);
  // Loose ball: the nearest eligible competitor within reach takes control (stable id order breaks ties).
  let best: Competitor | null = null;
  let bestD = Infinity;
  for (const id of COMPETITORS) {
    const c = s.competitors[id];
    if (s.t < c.noPickupUntil || s.t < c.stunUntil) continue;
    const d = Math.hypot(c.pos.x - b.pos.x, c.pos.y - b.pos.y);
    if (d <= JUNGLE.controlReach && d < bestD && len(b.vel) < 14) (best = c), (bestD = d);
  }
  if (best) {
    b.owner = best.id;
    b.lastTouch = best.id;
    b.graceUntil = s.t + JUNGLE.possessionGrace;
  }
}

function stepKeeper(s: JungleState, dt: number): void {
  // Neutral: tracks only the ball's current lateral position, never who has it.
  const target = clamp(s.ball.pos.y, JUNGLE.width / 2 - JUNGLE.goalHalfWidth + 0.4, JUNGLE.width / 2 + JUNGLE.goalHalfWidth - 0.4);
  const d = target - s.keeper.y;
  s.keeper.y += clamp(d, -JUNGLE.keeperSpeed * dt, JUNGLE.keeperSpeed * dt);
}

/** Advances the round by real seconds in fixed sub-steps. */
export function step(s: JungleState, seconds: number, rng?: () => number): void {
  if (!(seconds > 0) || s.phase === 'ended') return;
  const rnd = rng ?? rngFor(s);
  let left = Math.min(seconds, 0.25);
  while (left > 1e-9 && (s.phase as JungleState['phase']) !== 'ended') {
    const dt = Math.min(JUNGLE.dt, left);
    left -= dt;
    s.t += dt;
    if (s.t >= JUNGLE.roundSeconds) {
      s.phase = 'ended';
      s.events.push({ type: 'end', t: s.t });
      break;
    }
    if (s.phase === 'restart') {
      if (s.t >= s.restartUntil) s.phase = 'live';
      continue;
    }
    const intents: Partial<Record<CompetitorId, V>> = {};
    for (const id of AI_COMPETITORS) {
      const c = s.competitors[id];
      const d = think(s, c, rnd);
      intents[id] = d.move;
      if (d.kick && s.ball.owner === id && s.t >= c.stunUntil) kickBall(s, id, d.kick.dir, d.kick.power);
    }
    intents.player = s.stick;
    if (s.kick && s.ball.owner === 'player' && s.t >= s.competitors.player.stunUntil) kickBall(s, 'player', s.kick.dir, s.kick.power);
    s.kick = null;
    for (const id of COMPETITORS) moveCompetitor(s, s.competitors[id], intents[id]!, dt);
    contacts(s, rnd);
    stepBall(s, dt);
    stepKeeper(s, dt);
  }
}

const rngs = new WeakMap<JungleState, () => number>();
function rngFor(s: JungleState): () => number {
  let r = rngs.get(s);
  if (!r) rngs.set(s, (r = createRng(s.seed)));
  return r;
}

export function drainEvents(s: JungleState): JungleEvent[] {
  const e = s.events;
  s.events = [];
  return e;
}

/** Final standings: individual scores, ties shared, no elimination. */
export function standings(s: JungleState): { id: CompetitorId; score: number; place: number }[] {
  const rows = COMPETITORS.map((id) => ({ id, score: s.scores[id] })).sort((a, b) => b.score - a.score);
  return rows.map((r) => ({ ...r, place: 1 + rows.filter((o) => o.score > r.score).length }));
}
