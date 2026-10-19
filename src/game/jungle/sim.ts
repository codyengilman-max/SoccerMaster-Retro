/**
 * Jungle Ball (story package v0.7 §02 "JUNGLE SOCCER / BULL BALL"): the player and three AI
 * competitors attack one shared goal past a neutral keeper. Individual scores, no elimination.
 * v2 plays like an arcade football game (owner reference: NFL Blitz 2001): a turbo meter, turbo
 * shoves that knock players down, diving slides, harder shots, and ON FIRE after three goals in a row.
 * Framework-free and deterministic for a seed. Units: yards, seconds.
 */
import { createRng } from '../rng';

export const JUNGLE_SIM_VERSION = 2;
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
  /** Arcade moves (owner direction: SHOOT, SLIDE, PUSH). Every hit is bounded and respects stun protection. */
  pushRange: 1.6,
  pushKnock: 1.1,
  pushCooldown: 0.6,
  slideSeconds: 0.35,
  slideSpeed: 8.5,
  slideLag: 0.4,
  slideCooldown: 1.0,
  slideReach: 1.0,
  pokeSpeed: 7,
  aiPushChance: 0.3,
  aiSlideChance: 0.12,
  /** Turbo (held): faster running while the meter drains; it refills while released. Same rules for the AI. */
  turboSpeed: 1.3,
  turboDrain: 0.45,
  turboRegen: 0.3,
  /** Turbo + a move spends this much meter for the big version of that move. */
  turboMoveCost: 0.25,
  /** Turbo shove: knocked down (no movement) for longer, pushed further; protection still follows. */
  bigKnock: 2,
  knockdownSeconds: 0.9,
  /** Turbo slide: a longer, faster dive. */
  diveSeconds: 0.5,
  diveSpeed: 10,
  /** Turbo shot: extra ball speed (still saveable; pickup limit unchanged). */
  turboShot: 3,
  /** Three goals in a row by one competitor sets them ON FIRE until someone else scores. */
  fireStreak: 3,
  aiTurboChase: 4,
} as const;

export type MoveKind = 'push' | 'slide';

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
  /** Arcade move state: facing (unit), slide time, recovery lag, cooldown and the last move for drawing. */
  facing: V;
  slideDir: V | null;
  slideUntil: number;
  slideHit: boolean;
  lagUntil: number;
  cooldownUntil: number;
  lastMove: { kind: MoveKind; t: number; big: boolean } | null;
  /** Turbo meter 0..1, whether turbo is held this step, and knocked-down time (a big hit: no movement). */
  turbo: number;
  turboOn: boolean;
  downUntil: number;
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
  | { readonly type: 'hit'; readonly by: CompetitorId; readonly on: CompetitorId; readonly kind: MoveKind; readonly big: boolean; readonly carrier: boolean; readonly t: number }
  | { readonly type: 'fire'; readonly by: CompetitorId; readonly on: boolean; readonly t: number }
  | { readonly type: 'whiff'; readonly by: CompetitorId; readonly kind: MoveKind; readonly t: number }
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
  /** Consecutive goals by one competitor; `fire` is whoever is ON FIRE (unlimited turbo). */
  streak: { by: CompetitorId | null; n: number };
  fire: CompetitorId | null;
  events: JungleEvent[];
  /** Player stick (−1..1 each axis) and a pending kick request; the scene writes only through commands. */
  stick: V;
  kick: { dir: V; power: number } | null;
  move: MoveKind | null;
  /** Player turbo held (the scene sends press/release). */
  turbo: boolean;
}

export type JungleCommand =
  | { readonly type: 'move'; readonly x: number; readonly y: number }
  | { readonly type: 'kick'; readonly x: number; readonly y: number; readonly power: number }
  | { readonly type: 'push' }
  | { readonly type: 'slide' }
  | { readonly type: 'turbo'; readonly on: boolean };

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
    COMPETITORS.map((id) => [id, { id, pos: { ...spots[id] }, vel: { x: 0, y: 0 }, stunUntil: 0, protectedUntil: 0, noPickupUntil: 0, facing: { x: 1, y: 0 }, slideDir: null, slideUntil: 0, slideHit: false, lagUntil: 0, cooldownUntil: 0, lastMove: null, turbo: 1, turboOn: false, downUntil: 0, thinkAt: 0, target: ballSpot() }]),
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
    streak: { by: null, n: 0 },
    fire: null,
    events: [],
    stick: { x: 0, y: 0 },
    kick: null,
    move: null,
    turbo: false,
  };
}

/** Validates and applies one player command; invalid input is ignored. */
export function command(s: JungleState, c: JungleCommand): boolean {
  if (s.phase === 'ended') return false;
  if (c.type === 'turbo') {
    if (typeof c.on !== 'boolean') return false;
    s.turbo = c.on;
    return true;
  }
  if (c.type === 'move') {
    if (!finite(c.x, c.y)) return false;
    const m = Math.hypot(c.x, c.y);
    s.stick = m > 1 ? { x: c.x / m, y: c.y / m } : { x: c.x, y: c.y };
    return true;
  }
  if (c.type === 'push' || c.type === 'slide') {
    if (s.phase !== 'live' || !canMove(s, s.competitors.player, c.type)) return false;
    s.move = c.type;
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
    c.facing = { x: 1, y: 0 };
    c.slideDir = null;
    c.slideUntil = 0;
    c.lagUntil = 0;
    c.cooldownUntil = 0;
    c.downUntil = 0;
    c.turboOn = false;
  }
  s.ball = { pos: ballSpot(), vel: { x: 0, y: 0 }, owner: null, lastTouch: null, inGoal: false, graceUntil: 0 };
  s.keeper.y = JUNGLE.width / 2;
  s.phase = 'restart';
  s.restartUntil = s.t + JUNGLE.restartFreeze;
  s.stick = { x: 0, y: 0 };
  s.kick = null;
  s.move = null;
}

/** A move is allowed when not stunned, sliding, recovering or cooling down; a ball carrier cannot slide. */
export function canMove(s: JungleState, c: Competitor, kind: MoveKind): boolean {
  if (s.t < c.stunUntil || s.t < c.slideUntil || s.t < c.lagUntil || s.t < c.cooldownUntil) return false;
  return !(kind === 'slide' && s.ball.owner === c.id);
}

/** A landed hit: the victim drops the ball (it pops forward) and is stunned only when not protected. */
function land(s: JungleState, by: Competitor, on: Competitor, kind: MoveKind, big: boolean): void {
  const carrier = s.ball.owner === by.id;
  if (s.ball.owner === on.id) {
    s.ball.owner = null;
    s.ball.lastTouch = by.id;
    s.ball.vel = { x: by.facing.x * JUNGLE.pokeSpeed * 0.7, y: by.facing.y * JUNGLE.pokeSpeed * 0.7 };
    on.noPickupUntil = s.t + JUNGLE.regainDelay;
    s.events.push({ type: 'steal', by: by.id, from: on.id, t: s.t });
  }
  if (s.t >= on.protectedUntil) {
    const stun = big ? JUNGLE.knockdownSeconds : JUNGLE.stunSeconds;
    on.stunUntil = s.t + stun;
    if (big) on.downUntil = s.t + stun;
    on.protectedUntil = s.t + stun + JUNGLE.protectSeconds;
    s.events.push({ type: 'bump', a: by.id, b: on.id, t: s.t });
  }
  s.events.push({ type: 'hit', by: by.id, on: on.id, kind, big, carrier, t: s.t });
}

/** Turbo held with meter to spend (or ON FIRE) turns a move into its big version. */
function spendTurbo(s: JungleState, c: Competitor): boolean {
  if (s.fire === c.id) return true;
  if (!c.turboOn || c.turbo < JUNGLE.turboMoveCost) return false;
  c.turbo -= JUNGLE.turboMoveCost;
  return true;
}

function startMove(s: JungleState, c: Competitor, kind: MoveKind): void {
  if (!canMove(s, c, kind)) return;
  const big = spendTurbo(s, c);
  c.lastMove = { kind, t: s.t, big };
  if (kind === 'slide') {
    c.slideDir = { ...c.facing };
    c.slideUntil = s.t + (big ? JUNGLE.diveSeconds : JUNGLE.slideSeconds);
    c.slideHit = false;
    c.lagUntil = c.slideUntil + JUNGLE.slideLag;
    c.cooldownUntil = s.t + JUNGLE.slideCooldown;
    return;
  }
  c.cooldownUntil = s.t + JUNGLE.pushCooldown;
  let best: Competitor | null = null;
  let bestD = Infinity;
  for (const id of COMPETITORS) {
    const o = s.competitors[id];
    if (o === c) continue;
    const d = { x: o.pos.x - c.pos.x, y: o.pos.y - c.pos.y };
    const m = len(d);
    if (m <= JUNGLE.pushRange && m < bestD && (m < 1e-6 || (d.x * c.facing.x + d.y * c.facing.y) / m > 0.3)) (best = o), (bestD = m);
  }
  if (!best) return void s.events.push({ type: 'whiff', by: c.id, kind, t: s.t });
  const r = JUNGLE.playerRadius;
  const knock = big ? JUNGLE.bigKnock : JUNGLE.pushKnock;
  best.pos = { x: clamp(best.pos.x + c.facing.x * knock, r, JUNGLE.length - r), y: clamp(best.pos.y + c.facing.y * knock, r, JUNGLE.width - r) };
  land(s, c, best, kind, big);
}

/** During a slide: one hit on the first competitor touched; a loose ball in reach is poked on. */
function slideContacts(s: JungleState, c: Competitor): void {
  if (s.t >= c.slideUntil || !c.slideDir) return;
  const b = s.ball;
  if (!b.owner && Math.hypot(b.pos.x - c.pos.x, b.pos.y - c.pos.y) <= JUNGLE.slideReach) {
    b.lastTouch = c.id;
    b.vel = { x: c.slideDir.x * JUNGLE.pokeSpeed, y: c.slideDir.y * JUNGLE.pokeSpeed };
  }
  if (c.slideHit) return;
  for (const id of COMPETITORS) {
    const o = s.competitors[id];
    if (o === c || Math.hypot(o.pos.x - c.pos.x, o.pos.y - c.pos.y) > JUNGLE.playerRadius * 2 + 0.25) continue;
    c.slideHit = true;
    land(s, c, o, 'slide', c.lastMove?.kind === 'slide' && c.lastMove.big);
    return;
  }
}

function kickBall(s: JungleState, by: CompetitorId, dir: V, power: number): void {
  const c = s.competitors[by];
  const speed = JUNGLE.minShot + (JUNGLE.maxShot - JUNGLE.minShot) * clamp(power, 0, 1) + (spendTurbo(s, c) ? JUNGLE.turboShot : 0);
  s.ball.owner = null;
  s.ball.lastTouch = by;
  s.ball.pos = { x: c.pos.x + dir.x * (JUNGLE.carryOffset + 0.1), y: c.pos.y + dir.y * (JUNGLE.carryOffset + 0.1) };
  s.ball.vel = { x: dir.x * speed, y: dir.y * speed };
  c.noPickupUntil = s.t + 0.25;
  s.events.push({ type: 'shot', by, t: s.t });
}

/** AI decisions use only the present positions/velocities (declared perception); refreshed every reaction period. */
function think(s: JungleState, c: Competitor, rnd: () => number): { move: V; kick: { dir: V; power: number } | null; act?: MoveKind } {
  const ball = s.ball;
  // Turbo like the player: on while carrying with meter to spare or chasing a far ball; off to refill.
  const far = Math.hypot(ball.pos.x - c.pos.x, ball.pos.y - c.pos.y) > JUNGLE.aiTurboChase;
  const want = ball.owner === c.id || far;
  c.turboOn = s.fire === c.id || (want && (c.turboOn ? c.turbo > 0.15 : c.turbo > 0.6));
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
    // Arcade challenges on the carrier, decided once per reaction period (never every frame).
    if (ball.owner && chasers.includes(c.id)) {
      const o = s.competitors[ball.owner];
      const to = { x: o.pos.x - c.pos.x, y: o.pos.y - c.pos.y };
      const d = len(to);
      if (d > 1e-6) {
        const roll = rnd();
        const face = { x: to.x / d, y: to.y / d };
        // Big hits only with meter to spend, and not every time.
        if (roll < Math.max(JUNGLE.aiPushChance, JUNGLE.aiSlideChance) && c.turbo >= JUNGLE.turboMoveCost && rnd() < 0.5) c.turboOn = true;
        if (d <= JUNGLE.pushRange && roll < JUNGLE.aiPushChance) return (c.facing = face), { move: face, kick: null, act: 'push' };
        if (d > JUNGLE.pushRange && d < 3 && roll < JUNGLE.aiSlideChance) return (c.facing = face), { move: face, kick: null, act: 'slide' };
      }
    }
  }
  const to = { x: c.target.x - c.pos.x, y: c.target.y - c.pos.y };
  const d = len(to);
  return { move: d > 0.05 ? { x: to.x / d, y: to.y / d } : { x: 0, y: 0 }, kick: null };
}

function moveCompetitor(s: JungleState, c: Competitor, want: V, dt: number): void {
  const r0 = JUNGLE.playerRadius;
  if (s.t < c.slideUntil && c.slideDir) {
    c.vel = { x: c.slideDir.x * JUNGLE.slideSpeed, y: c.slideDir.y * JUNGLE.slideSpeed };
    c.pos = { x: clamp(c.pos.x + c.vel.x * dt, r0, JUNGLE.length - r0), y: clamp(c.pos.y + c.vel.y * dt, r0, JUNGLE.width - r0) };
    return;
  }
  if (s.t < c.lagUntil || s.t < c.downUntil) {
    // Recovering from a slide or knocked down by a big hit: on the grass, not moving.
    c.vel = { x: 0, y: 0 };
    return;
  }
  const stunned = s.t < c.stunUntil;
  const boost = c.turboOn && (c.turbo > 0 || s.fire === c.id) && Math.hypot(want.x, want.y) > 0.2 ? JUNGLE.turboSpeed : 1;
  const top = (s.ball.owner === c.id ? JUNGLE.dribbleSpeed : JUNGLE.runSpeed) * boost * (stunned ? JUNGLE.stunSpeedFactor : 1) * (c.id === 'player' ? 1 : JUNGLE.aiSpeedFactor);
  const tv = { x: want.x * top, y: want.y * top };
  const dv = { x: tv.x - c.vel.x, y: tv.y - c.vel.y };
  const m = len(dv);
  const step = JUNGLE.accel * dt;
  c.vel = m <= step ? tv : { x: c.vel.x + (dv.x / m) * step, y: c.vel.y + (dv.y / m) * step };
  const r = JUNGLE.playerRadius;
  c.pos = { x: clamp(c.pos.x + c.vel.x * dt, r, JUNGLE.length - r), y: clamp(c.pos.y + c.vel.y * dt, r, JUNGLE.width - r) };
  const sp = len(c.vel);
  if (sp > 0.5) c.facing = { x: c.vel.x / sp, y: c.vel.y / sp };
}

/** Turbo meter: drains while held and moving, refills while released; ON FIRE keeps it full. */
function stepTurbo(s: JungleState, c: Competitor, want: V, dt: number): void {
  if (s.fire === c.id) return void (c.turbo = 1);
  const using = c.turboOn && Math.hypot(want.x, want.y) > 0.2 && s.t >= c.downUntil && s.t >= c.lagUntil;
  c.turbo = clamp(c.turbo + (using ? -JUNGLE.turboDrain : JUNGLE.turboRegen) * dt, 0, 1);
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
    const by = b.lastTouch;
    s.scores[by] += 1;
    s.events.push({ type: 'goal', by, t: s.t });
    s.streak = s.streak.by === by ? { by, n: s.streak.n + 1 } : { by, n: 1 };
    if (s.fire && s.fire !== by) {
      s.events.push({ type: 'fire', by: s.fire, on: false, t: s.t });
      s.fire = null;
    }
    if (!s.fire && s.streak.n >= JUNGLE.fireStreak) {
      s.fire = by;
      s.events.push({ type: 'fire', by, on: true, t: s.t });
    }
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
      if (d.act) startMove(s, c, d.act);
    }
    intents.player = s.stick;
    const me = s.competitors.player;
    me.turboOn = s.turbo;
    const sm = len(s.stick);
    if (sm > 0.2 && s.t >= me.slideUntil) me.facing = { x: s.stick.x / sm, y: s.stick.y / sm };
    if (s.kick && s.ball.owner === 'player' && s.t >= me.stunUntil) kickBall(s, 'player', s.kick.dir, s.kick.power);
    if (s.move) startMove(s, me, s.move);
    s.kick = null;
    s.move = null;
    for (const id of COMPETITORS) moveCompetitor(s, s.competitors[id], intents[id]!, dt);
    for (const id of COMPETITORS) stepTurbo(s, s.competitors[id], intents[id]!, dt);
    for (const id of COMPETITORS) slideContacts(s, s.competitors[id]);
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
