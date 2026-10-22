/**
 * Jungle Ball (story package v0.7 §02 "JUNGLE SOCCER / BULL BALL"): the player and three AI
 * competitors attack one shared goal past a neutral keeper. Individual scores, no elimination.
 * v3 (owner arcade brief, 2026-10-22: NFL Blitz energy): committed HIT shoulder charges and slides,
 * staged knockdowns (impact, falling, grounded, getting up) with protection afterwards, quick and
 * charged shots with limited aim assist, a ball with height that rebounds off posts, crossbar, boards,
 * bodies and the keeper (sub-stepped so fast shots never tunnel), a keeper who sets, dives, catches,
 * parries and distributes, and a short goal celebration before a fair restart.
 * Framework-free and deterministic for a seed. Units: yards, seconds. Every tuning number is in JUNGLE.
 */
import { createRng } from '../rng';

export const JUNGLE_SIM_VERSION = 3;
export const JUNGLE = {
  length: 32,
  width: 22,
  goalX: 32,
  goalHalfWidth: 2.6,
  /** Crossbar height, post/bar radius and net depth behind the goal line. */
  crossbar: 2,
  postRadius: 0.08,
  netDepth: 1.6,
  roundSeconds: 75,
  restartFreeze: 1.2,
  /** After a goal: the scorer celebrates, the ball sits in the net, nothing scores, then a fair restart. */
  celebrateSeconds: 1.5,
  dt: 1 / 60,
  runSpeed: 6.2,
  dribbleSpeed: 5.2,
  accel: 30,
  playerRadius: 0.55,
  ballRadius: 0.2,
  controlReach: 0.95,
  /** A ball above this height cannot be controlled (it has to come down first). */
  controlHeight: 0.6,
  carryOffset: 0.75,
  /** Rolling deceleration is ballFriction * 6 yd/s²; in the air only a little drag. */
  ballFriction: 1.6,
  airDrag: 0.25,
  gravity: 10.7,
  bounce: 0.45,
  wallRestitution: 0.7,
  /** Free balls faster than this cannot be trapped; they deflect off bodies instead. */
  trapSpeed: 14,
  /** Ball sub-steps keep every move under this length (no tunnelling through posts, keeper or bodies). */
  ballSubstep: 0.08,
  minShot: 9,
  maxShot: 22,
  /** SHOOT: a tap (released within tapSeconds) is a quick shot; holding charges to the cap. */
  quickPower: 0.4,
  tapSeconds: 0.18,
  maxChargeSeconds: 0.9,
  chargeSpeedFactor: 0.7,
  strikeSeconds: 0.18,
  /** Shot lift (yd/s up) for power 0 and 1; charged shots rise more. */
  loftMin: 1.2,
  loftMax: 4.4,
  /** Aim help: a stick aim this close to the goal mouth (degrees) is nudged by at most aimAssistMax. */
  aimAssistCone: 14,
  aimAssistMax: 7,
  /** Neutral stick aims this far from the goal centre on the side away from the keeper. */
  neutralAim: 1.4,
  /** A plain hit staggers (slowed); a knockdown is impact, falling, grounded, getting up. */
  stunSeconds: 0.45,
  stunSpeedFactor: 0.35,
  impactSeconds: 0.1,
  fallSeconds: 0.22,
  riseSeconds: 0.28,
  protectSeconds: 1.6,
  /** Shoulder contact pushes at most this far per contact (bounded displacement). */
  maxPush: 0.6,
  /** A loose-ball pickup after a steal is blocked for the dispossessed player for this long. */
  regainDelay: 0.5,
  /** A fresh owner cannot be dispossessed by body contact for this long. */
  possessionGrace: 0.4,
  /** Neutral keeper: positioning speed, line offset, reach, reaction, dive, catch and distribution. */
  keeperSpeed: 4.2,
  keeperLine: 0.7,
  keeperReach: 0.9,
  keeperDepth: 0.45,
  keeperHands: 2.1,
  keeperRadius: 0.6,
  keeperReaction: 0.16,
  keeperDiveSpeed: 7.5,
  keeperDiveSeconds: 0.45,
  keeperDiveReach: 2.6,
  keeperDiveHands: 1.3,
  keeperRecoverSeconds: 0.45,
  keeperCatchSpeed: 12,
  keeperHoldSeconds: 0.9,
  keeperThrowSpeed: 9,
  keeperTouchCooldown: 0.5,
  keeperRecatch: 1.2,
  aiReaction: 0.22,
  aiShotRange: 12,
  /** Difficulty (documented, centralised): AI runs slightly slower and aims less accurately; never more meter. */
  aiSpeedFactor: 0.94,
  aiAimError: 2.4,
  aiChasers: 2,
  aiHitChance: 0.35,
  aiSlideChance: 0.12,
  aiChargeChance: 0.45,
  /** HIT: a committed shoulder charge. Lands only on real contact in front within the lunge window. */
  hitReach: 0.35,
  hitWindow: 0.18,
  hitLungeSpeed: 7.5,
  hitCone: 0.3,
  hitCooldown: 0.7,
  hitWhiffLag: 0.2,
  pushKnock: 1.1,
  pokeSpeed: 7,
  /** SLIDE: committed direction and distance; one hit per slide; a miss leaves the slider on the grass longer. */
  slideSeconds: 0.35,
  slideSpeed: 8.5,
  slideLag: 0.3,
  slideMissLag: 0.6,
  slideCooldown: 1.0,
  slideReach: 1.0,
  slideKnockSeconds: 0.8,
  /** Turbo (held): faster running while the meter drains; it refills while released. Same rules for the AI. */
  turboSpeed: 1.3,
  turboDrain: 0.45,
  turboRegen: 0.3,
  /** Turbo + a move spends this much meter for the big version of that move. */
  turboMoveCost: 0.25,
  /** Turbo hit: knocked down and pushed further; protection still follows. */
  bigKnock: 2,
  knockdownSeconds: 0.9,
  /** Turbo slide: a longer, faster dive. */
  diveSeconds: 0.5,
  diveSpeed: 10,
  /** Turbo shot: extra ball speed (still saveable). */
  turboShot: 3,
  /** Three goals in a row by one competitor sets them ON FIRE until someone else scores. */
  fireStreak: 3,
  aiTurboChase: 4,
} as const;

/** `push` is the v2 name of HIT, still accepted by `command` and `canMove`. */
export type MoveKind = 'hit' | 'slide';

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
  facing: V;
  /** SLIDE: fixed direction, end time, whether it already hit someone. */
  slideDir: V | null;
  slideUntil: number;
  slideHit: boolean;
  lagUntil: number;
  /** HIT cooldown (cooldownUntil) and SLIDE cooldown are separate. */
  cooldownUntil: number;
  slideCooldownUntil: number;
  lastMove: { kind: MoveKind; t: number; big: boolean } | null;
  /** HIT lunge: committed window, direction, and whether it landed (one victim per hit). */
  hitUntil: number;
  hitDir: V;
  hitLanded: boolean;
  /** Knockdown: start, end (downUntil) and whether it was a big one. */
  downAt: number;
  downUntil: number;
  /** SHOOT charge start (null when not charging), last strike and celebration. */
  chargeAt: number | null;
  strikeAt: number;
  strikeCharged: boolean;
  celebrateUntil: number;
  turbo: number;
  turboOn: boolean;
  /** AI: think time, target, planned shot release. Perception is only the present state. */
  thinkAt: number;
  target: V;
  aiReleaseAt: number;
  aiAim: V;
}
export type SaveKind = 'catch' | 'parry';
export type JungleEvent =
  | { readonly type: 'goal'; readonly by: CompetitorId; readonly t: number }
  | { readonly type: 'save'; readonly kind: SaveKind; readonly t: number }
  | { readonly type: 'steal'; readonly by: CompetitorId; readonly from: CompetitorId; readonly t: number }
  | { readonly type: 'bump'; readonly a: CompetitorId; readonly b: CompetitorId; readonly down: boolean; readonly t: number }
  | { readonly type: 'shot'; readonly by: CompetitorId; readonly power: number; readonly charged: boolean; readonly t: number }
  | { readonly type: 'swing'; readonly by: CompetitorId; readonly kind: MoveKind; readonly big: boolean; readonly t: number }
  | { readonly type: 'hit'; readonly by: CompetitorId; readonly on: CompetitorId; readonly kind: MoveKind; readonly big: boolean; readonly carrier: boolean; readonly t: number }
  | { readonly type: 'fire'; readonly by: CompetitorId; readonly on: boolean; readonly t: number }
  | { readonly type: 'whiff'; readonly by: CompetitorId; readonly kind: MoveKind; readonly t: number }
  | { readonly type: 'woodwork'; readonly t: number }
  | { readonly type: 'block'; readonly by: CompetitorId; readonly t: number }
  | { readonly type: 'dive'; readonly dir: -1 | 1; readonly t: number }
  | { readonly type: 'distribute'; readonly t: number }
  | { readonly type: 'dead'; readonly t: number }
  | { readonly type: 'end'; readonly t: number };

export type KeeperMode = 'set' | 'dive' | 'down' | 'hold';
export interface Keeper {
  x: number;
  y: number;
  mode: KeeperMode;
  modeUntil: number;
  diveFrom: number;
  diveDir: -1 | 1;
  reactAt: number | null;
  predY: number;
  touchUntil: number;
  catchUntil: number;
  throwSide: -1 | 1;
}
export interface JungleBall {
  pos: V;
  /** Height above the grass and vertical speed (yd, yd/s). */
  z: number;
  vz: number;
  vel: V;
  owner: CompetitorId | null;
  /** Goal credit: the last competitor to kick or control it. Body deflections and keeper parries keep it. */
  lastTouch: CompetitorId | null;
  inGoal: boolean;
  graceUntil: number;
  held: boolean;
}

export interface JungleState {
  readonly seed: number;
  t: number;
  phase: 'restart' | 'live' | 'goal' | 'ended';
  restartUntil: number;
  goalUntil: number;
  competitors: Record<CompetitorId, Competitor>;
  ball: JungleBall;
  keeper: Keeper;
  scores: Record<CompetitorId, number>;
  /** Consecutive goals by one competitor; `fire` is whoever is ON FIRE (unlimited turbo). */
  streak: { by: CompetitorId | null; n: number };
  fire: CompetitorId | null;
  events: JungleEvent[];
  /** Player stick (−1..1, length ≤ 1) and pending requests; the scene writes only through commands. */
  stick: V;
  kick: { dir: V; power: number } | null;
  move: MoveKind | null;
  shoot: 'press' | 'release' | 'cancel' | null;
  turbo: boolean;
}

export type JungleCommand =
  | { readonly type: 'move'; readonly x: number; readonly y: number }
  | { readonly type: 'kick'; readonly x: number; readonly y: number; readonly power: number }
  | { readonly type: 'shoot'; readonly phase: 'press' | 'release' | 'cancel' }
  | { readonly type: 'hit' }
  | { readonly type: 'push' }
  | { readonly type: 'slide' }
  | { readonly type: 'turbo'; readonly on: boolean };

const len = (v: V): number => Math.hypot(v.x, v.y);
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const finite = (...n: number[]): boolean => n.every((x) => typeof x === 'number' && Number.isFinite(x));
const MID = JUNGLE.width / 2;
const inPen = (p: V): V => {
  const r = JUNGLE.playerRadius;
  return { x: clamp(p.x, r, JUNGLE.length - r), y: clamp(p.y, r, JUNGLE.width - r) };
};

/** Spread, fair restart spots: everyone the same distance from the ball, nobody nearer the goal. */
export function restartSpots(): Record<CompetitorId, V> {
  const c = ballSpot();
  const r = 4.5;
  const ang = [Math.PI, Math.PI * 0.5, -Math.PI * 0.5, Math.PI * 0.75];
  return Object.fromEntries(COMPETITORS.map((id, i) => [id, { x: c.x + Math.cos(ang[i]!) * r, y: c.y + Math.sin(ang[i]!) * r }])) as Record<CompetitorId, V>;
}
function ballSpot(): V {
  return { x: JUNGLE.length * 0.38, y: MID };
}
/** Support spots around the ball (one angle each) so non-chasers spread instead of bunching. */
const SUPPORT_ANGLE: Record<CompetitorId, number> = { player: Math.PI, alex: Math.PI * 0.6, blake: -Math.PI * 0.6, sam: Math.PI * 0.15 };
const REBOUND_Y: Record<CompetitorId, number> = { player: 0, alex: -2.2, blake: 2.2, sam: 0.6 };

function freshBall(): JungleBall {
  return { pos: ballSpot(), z: 0, vz: 0, vel: { x: 0, y: 0 }, owner: null, lastTouch: null, inGoal: false, graceUntil: 0, held: false };
}
function freshKeeper(): Keeper {
  return { x: JUNGLE.goalX - JUNGLE.keeperLine, y: MID, mode: 'set', modeUntil: 0, diveFrom: MID, diveDir: 1, reactAt: null, predY: MID, touchUntil: 0, catchUntil: 0, throwSide: 1 };
}
function freshCompetitor(id: CompetitorId, pos: V): Competitor {
  return {
    id, pos: { ...pos }, vel: { x: 0, y: 0 }, stunUntil: 0, protectedUntil: 0, noPickupUntil: 0, facing: { x: 1, y: 0 },
    slideDir: null, slideUntil: 0, slideHit: false, lagUntil: 0, cooldownUntil: 0, slideCooldownUntil: 0, lastMove: null,
    hitUntil: 0, hitDir: { x: 1, y: 0 }, hitLanded: false, downAt: 0, downUntil: 0, chargeAt: null, strikeAt: -1, strikeCharged: false,
    celebrateUntil: 0, turbo: 1, turboOn: false, thinkAt: 0, target: ballSpot(), aiReleaseAt: 0, aiAim: { x: 1, y: 0 },
  };
}

export function newJungle(seed: number): JungleState {
  const spots = restartSpots();
  return {
    seed,
    t: 0,
    phase: 'restart',
    restartUntil: JUNGLE.restartFreeze,
    goalUntil: 0,
    competitors: Object.fromEntries(COMPETITORS.map((id) => [id, freshCompetitor(id, spots[id])])) as Record<CompetitorId, Competitor>,
    ball: freshBall(),
    keeper: freshKeeper(),
    scores: { player: 0, alex: 0, blake: 0, sam: 0 },
    streak: { by: null, n: 0 },
    fire: null,
    events: [],
    stick: { x: 0, y: 0 },
    kick: null,
    move: null,
    shoot: null,
    turbo: false,
  };
}

const moveKind = (k: string): MoveKind => (k === 'slide' ? 'slide' : 'hit');

/** Validates and applies one player command; invalid input is ignored. */
export function command(s: JungleState, c: JungleCommand): boolean {
  if (s.phase === 'ended' || !c || typeof c !== 'object') return false;
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
  if (c.type === 'hit' || c.type === 'push' || c.type === 'slide') {
    const kind = moveKind(c.type);
    if (s.phase !== 'live' || !canMove(s, s.competitors.player, kind)) return false;
    s.move = kind;
    return true;
  }
  if (c.type === 'shoot') {
    if (c.phase !== 'press' && c.phase !== 'release' && c.phase !== 'cancel') return false;
    if (c.phase === 'press' && (s.phase !== 'live' || !canAct(s, s.competitors.player))) return false;
    s.shoot = c.phase;
    return true;
  }
  if (c.type !== 'kick') return false;
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
    const old = s.competitors[id];
    const c = freshCompetitor(id, spots[id]);
    c.turbo = old.turbo;
    c.thinkAt = s.t;
    s.competitors[id] = c;
  }
  s.ball = freshBall();
  const side = s.keeper.throwSide;
  s.keeper = freshKeeper();
  s.keeper.throwSide = side;
  s.phase = 'restart';
  s.restartUntil = s.t + JUNGLE.restartFreeze;
  s.stick = { x: 0, y: 0 };
  s.kick = null;
  s.move = null;
  s.shoot = null;
}

const isDown = (s: JungleState, c: Competitor): boolean => s.t < c.downUntil;

/** Free to act: not staggered, knocked down, sliding, recovering, lunging or mid-strike. */
export function canAct(s: JungleState, c: Competitor): boolean {
  return s.t >= c.stunUntil && s.t >= c.downUntil && s.t >= c.slideUntil && s.t >= c.lagUntil && s.t >= c.hitUntil && s.t - c.strikeAt >= JUNGLE.strikeSeconds;
}

/** A move is allowed when free to act and its own cooldown has run out; a ball carrier cannot slide. */
export function canMove(s: JungleState, c: Competitor, kind: MoveKind | 'push'): boolean {
  const k = moveKind(kind);
  if (!canAct(s, c)) return false;
  if (k === 'hit') return s.t >= c.cooldownUntil;
  return s.t >= c.slideCooldownUntil && s.ball.owner !== c.id;
}

/** Seconds of cooldown left for a move (0 when ready); for the HUD. */
export function cooldownLeft(s: JungleState, id: CompetitorId, kind: MoveKind): number {
  const c = s.competitors[id];
  return Math.max(0, (kind === 'hit' ? c.cooldownUntil : c.slideCooldownUntil) - s.t);
}

/** SHOOT charge 0..1 while held (null when not charging); for the HUD. */
export function shotCharge(s: JungleState, id: CompetitorId): number | null {
  const c = s.competitors[id];
  return c.chargeAt === null ? null : clamp((s.t - c.chargeAt) / JUNGLE.maxChargeSeconds, 0, 1);
}

export type ActState = 'active' | 'charge' | 'strike' | 'hit' | 'slide' | 'recover' | 'stagger' | 'impact' | 'falling' | 'down' | 'rising' | 'celebrate';
/** The drawable action state of a competitor (one at a time, derived from the timers). */
export function actState(s: JungleState, id: CompetitorId): ActState {
  const c = s.competitors[id];
  const t = s.t;
  if (t < c.downUntil) {
    if (t < c.downAt + JUNGLE.impactSeconds) return 'impact';
    if (t < c.downAt + JUNGLE.impactSeconds + JUNGLE.fallSeconds) return 'falling';
    if (t >= c.downUntil - JUNGLE.riseSeconds) return 'rising';
    return 'down';
  }
  if (t < c.celebrateUntil) return 'celebrate';
  if (t < c.slideUntil) return 'slide';
  if (t < c.hitUntil) return 'hit';
  if (t < c.lagUntil) return 'recover';
  if (t < c.stunUntil) return 'stagger';
  if (t - c.strikeAt < JUNGLE.strikeSeconds) return 'strike';
  if (c.chargeAt !== null) return 'charge';
  return 'active';
}

/** Turbo held with meter to spend (or ON FIRE) turns a move into its big version. */
function spendTurbo(s: JungleState, c: Competitor): boolean {
  if (s.fire === c.id) return true;
  if (!c.turboOn || c.turbo < JUNGLE.turboMoveCost) return false;
  c.turbo -= JUNGLE.turboMoveCost;
  return true;
}

/** Releases a carried ball with an impulse (never handed to anyone). */
function popBall(s: JungleState, dir: V, speed: number, lift: number, carry: V): void {
  const b = s.ball;
  b.owner = null;
  b.vel = { x: dir.x * speed + carry.x * 0.3, y: dir.y * speed + carry.y * 0.3 };
  b.vz = lift;
  b.z = Math.max(b.z, 0.05);
}

/** A landed HIT or SLIDE: the victim loses the ball, drops any charge, and is staggered or knocked down unless protected. */
function land(s: JungleState, by: Competitor, on: Competitor, kind: MoveKind, big: boolean): void {
  const carrier = s.ball.owner === by.id;
  if (s.ball.owner === on.id) {
    const dir = kind === 'slide' && by.slideDir ? by.slideDir : by.facing;
    popBall(s, dir, kind === 'slide' ? JUNGLE.pokeSpeed : JUNGLE.pokeSpeed * 0.8, kind === 'slide' ? 0.6 : 2.2, on.vel);
    s.ball.lastTouch = by.id;
    on.noPickupUntil = s.t + JUNGLE.regainDelay;
    by.noPickupUntil = Math.max(by.noPickupUntil, s.t + 0.12);
    s.events.push({ type: 'steal', by: by.id, from: on.id, t: s.t });
  }
  on.chargeAt = null;
  if (s.t >= on.protectedUntil) {
    const down = big || kind === 'slide';
    const dur = big ? JUNGLE.knockdownSeconds : down ? JUNGLE.slideKnockSeconds : JUNGLE.stunSeconds;
    on.stunUntil = s.t + dur;
    if (down) {
      on.downAt = s.t;
      on.downUntil = s.t + dur;
      on.slideUntil = Math.min(on.slideUntil, s.t);
      on.hitUntil = Math.min(on.hitUntil, s.t);
      on.vel = { x: 0, y: 0 };
    }
    on.protectedUntil = s.t + dur + JUNGLE.protectSeconds;
    s.events.push({ type: 'bump', a: by.id, b: on.id, down, t: s.t });
  }
  s.events.push({ type: 'hit', by: by.id, on: on.id, kind, big, carrier, t: s.t });
}

function startMove(s: JungleState, c: Competitor, kind: MoveKind): void {
  if (!canMove(s, c, kind)) return;
  const big = spendTurbo(s, c);
  c.lastMove = { kind, t: s.t, big };
  c.chargeAt = null;
  s.events.push({ type: 'swing', by: c.id, kind, big, t: s.t });
  if (kind === 'slide') {
    c.slideDir = { ...c.facing };
    c.slideUntil = s.t + (big ? JUNGLE.diveSeconds : JUNGLE.slideSeconds);
    c.slideHit = false;
    c.lagUntil = c.slideUntil + JUNGLE.slideLag;
    c.slideCooldownUntil = s.t + JUNGLE.slideCooldown;
    return;
  }
  c.hitDir = { ...c.facing };
  c.hitUntil = s.t + JUNGLE.hitWindow;
  c.hitLanded = false;
  c.cooldownUntil = s.t + JUNGLE.hitCooldown;
  hitContacts(s, c);
}

/** During the HIT window: the first competitor in real contact in front is hit once; the lunge then stops. */
function hitContacts(s: JungleState, c: Competitor): void {
  if (s.t >= c.hitUntil || c.hitLanded) return;
  let best: Competitor | null = null;
  let bestD = Infinity;
  for (const id of COMPETITORS) {
    const o = s.competitors[id];
    if (o === c || isDown(s, o)) continue;
    const d = { x: o.pos.x - c.pos.x, y: o.pos.y - c.pos.y };
    const m = len(d);
    if (m > JUNGLE.playerRadius * 2 + JUNGLE.hitReach || m >= bestD) continue;
    if (m > 1e-6 && (d.x * c.hitDir.x + d.y * c.hitDir.y) / m <= JUNGLE.hitCone) continue;
    best = o;
    bestD = m;
  }
  if (!best) return;
  const big = c.lastMove?.big === true;
  c.hitLanded = true;
  c.hitUntil = s.t;
  c.lagUntil = s.t + 0.08;
  c.vel = { x: c.hitDir.x * 1.5, y: c.hitDir.y * 1.5 };
  const knock = big ? JUNGLE.bigKnock : JUNGLE.pushKnock;
  if (s.t >= best.protectedUntil || best.id !== s.ball.owner) best.pos = inPen({ x: best.pos.x + c.hitDir.x * knock, y: best.pos.y + c.hitDir.y * knock });
  land(s, c, best, 'hit', big);
}

/** During a slide: one hit on the first competitor touched; a loose low ball in reach is poked on. */
function slideContacts(s: JungleState, c: Competitor): void {
  if (s.t >= c.slideUntil || !c.slideDir) return;
  const b = s.ball;
  if (!b.owner && !b.held && b.z < JUNGLE.controlHeight && Math.hypot(b.pos.x - c.pos.x, b.pos.y - c.pos.y) <= JUNGLE.slideReach) {
    b.lastTouch = c.id;
    b.vel = { x: c.slideDir.x * JUNGLE.pokeSpeed, y: c.slideDir.y * JUNGLE.pokeSpeed };
  }
  if (c.slideHit) return;
  for (const id of COMPETITORS) {
    const o = s.competitors[id];
    if (o === c || isDown(s, o) || Math.hypot(o.pos.x - c.pos.x, o.pos.y - c.pos.y) > JUNGLE.playerRadius * 2 + 0.25) continue;
    c.slideHit = true;
    land(s, c, o, 'slide', c.lastMove?.kind === 'slide' && c.lastMove.big);
    return;
  }
}

/** A slide or a HIT that ended without contact: a miss, with its recovery. */
function endMisses(s: JungleState, c: Competitor, prevT: number): void {
  if (c.lastMove?.kind === 'slide' && c.slideUntil > prevT && c.slideUntil <= s.t && !c.slideHit) {
    c.lagUntil = Math.max(c.lagUntil, c.slideUntil + JUNGLE.slideMissLag);
    s.events.push({ type: 'whiff', by: c.id, kind: 'slide', t: s.t });
  }
  if (c.lastMove?.kind === 'hit' && c.hitUntil > prevT && c.hitUntil <= s.t && !c.hitLanded) {
    c.lagUntil = Math.max(c.lagUntil, s.t + JUNGLE.hitWhiffLag);
    s.events.push({ type: 'whiff', by: c.id, kind: 'hit', t: s.t });
  }
}

/** Nearest point of the goal mouth (inside the posts) to aim at, and limited assist toward it. */
export function aimShot(s: JungleState, from: V, stick: V): V {
  const k = s.keeper;
  const m = len(stick);
  let dir: V;
  if (m > 0.3) dir = { x: stick.x / m, y: stick.y / m };
  else {
    const y = MID + (k.y > MID ? -JUNGLE.neutralAim : k.y < MID ? JUNGLE.neutralAim : JUNGLE.neutralAim);
    const d = { x: JUNGLE.goalX - from.x, y: y - from.y };
    const dl = len(d) || 1;
    return { x: d.x / dl, y: d.y / dl };
  }
  if (dir.x <= 1e-6) return dir;
  const lineY = from.y + (dir.y / dir.x) * (JUNGLE.goalX - from.x);
  const lo = MID - JUNGLE.goalHalfWidth + JUNGLE.ballRadius + 0.2;
  const hi = MID + JUNGLE.goalHalfWidth - JUNGLE.ballRadius - 0.2;
  if (lineY >= lo && lineY <= hi) return dir;
  const target = { x: JUNGLE.goalX - from.x, y: clamp(lineY, lo, hi) - from.y };
  const a0 = Math.atan2(dir.y, dir.x);
  const a1 = Math.atan2(target.y, target.x);
  let da = a1 - a0;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  if (Math.abs(da) > (JUNGLE.aimAssistCone * Math.PI) / 180) return dir;
  const a = a0 + clamp(da, (-JUNGLE.aimAssistMax * Math.PI) / 180, (JUNGLE.aimAssistMax * Math.PI) / 180);
  return { x: Math.cos(a), y: Math.sin(a) };
}

function kickBall(s: JungleState, by: CompetitorId, dir: V, power: number, charged: boolean): void {
  const c = s.competitors[by];
  const p = clamp(power, 0, 1);
  const speed = JUNGLE.minShot + (JUNGLE.maxShot - JUNGLE.minShot) * p + (spendTurbo(s, c) ? JUNGLE.turboShot : 0);
  const b = s.ball;
  b.owner = null;
  b.lastTouch = by;
  b.pos = { x: Math.min(c.pos.x + dir.x * (JUNGLE.carryOffset + 0.1), JUNGLE.goalX - JUNGLE.ballRadius - 0.01), y: clamp(c.pos.y + dir.y * (JUNGLE.carryOffset + 0.1), JUNGLE.ballRadius, JUNGLE.width - JUNGLE.ballRadius) };
  b.vel = { x: dir.x * speed, y: dir.y * speed };
  b.z = 0.1;
  b.vz = JUNGLE.loftMin + (JUNGLE.loftMax - JUNGLE.loftMin) * p * p;
  c.noPickupUntil = s.t + 0.25;
  c.strikeAt = s.t;
  c.strikeCharged = charged;
  c.chargeAt = null;
  s.events.push({ type: 'shot', by, power: p, charged, t: s.t });
}

/** Releases a held SHOOT: a tap is a quick shot, a hold scales up to the cap. Without the ball, nothing. */
function releaseShot(s: JungleState, c: Competitor, aim: V): void {
  if (c.chargeAt === null) return;
  const held = s.t - c.chargeAt;
  c.chargeAt = null;
  if (s.ball.owner !== c.id || !canAct(s, c)) return;
  const charged = held > JUNGLE.tapSeconds;
  const power = charged ? JUNGLE.quickPower + (1 - JUNGLE.quickPower) * clamp((held - JUNGLE.tapSeconds) / (JUNGLE.maxChargeSeconds - JUNGLE.tapSeconds), 0, 1) : JUNGLE.quickPower;
  kickBall(s, c.id, aim, power, charged);
}

interface Intent { move: V; act?: MoveKind }

/** AI decisions use only the present positions/velocities, refreshed every reaction period; same moves and meter as the player. */
function think(s: JungleState, c: Competitor, rnd: () => number): Intent {
  const ball = s.ball;
  const far = Math.hypot(ball.pos.x - c.pos.x, ball.pos.y - c.pos.y) > JUNGLE.aiTurboChase;
  const want = ball.owner === c.id || (far && !ball.held);
  c.turboOn = s.fire === c.id || (want && (c.turboOn ? c.turbo > 0.15 : c.turbo > 0.6));
  const tick = s.t >= c.thinkAt;
  if (tick) c.thinkAt = s.t + JUNGLE.aiReaction * (0.8 + rnd() * 0.4);
  if (ball.owner === c.id) {
    const goalY = MID + (s.keeper.y < MID ? 1.6 : -1.6);
    const to = { x: JUNGLE.goalX - c.pos.x, y: goalY - c.pos.y };
    const d = len(to);
    if (c.chargeAt !== null) {
      if (s.t >= c.aiReleaseAt) releaseShot(s, c, c.aiAim);
      return { move: { x: (to.x / d) * 0.5, y: (to.y / d) * 0.5 } };
    }
    if (tick && d < JUNGLE.aiShotRange && rnd() < 0.35 + 0.5 * (1 - d / JUNGLE.aiShotRange) && canAct(s, c)) {
      const aimY = goalY + (rnd() - 0.5) * JUNGLE.aiAimError * 2;
      const dir = { x: JUNGLE.goalX - c.pos.x, y: aimY - c.pos.y };
      const m = len(dir);
      c.aiAim = { x: dir.x / m, y: dir.y / m };
      c.chargeAt = s.t;
      c.aiReleaseAt = s.t + (rnd() < JUNGLE.aiChargeChance ? JUNGLE.tapSeconds + 0.1 + rnd() * 0.55 : 0);
      if (c.aiReleaseAt <= s.t) releaseShot(s, c, c.aiAim);
      return { move: { x: 0, y: 0 } };
    }
    // Dribble at goal, edging away from the nearest challenger.
    let dir = { x: to.x / d, y: to.y / d };
    let near: Competitor | null = null;
    let nd = 3;
    for (const id of COMPETITORS) {
      const o = s.competitors[id];
      const od = Math.hypot(o.pos.x - c.pos.x, o.pos.y - c.pos.y);
      if (o !== c && !isDown(s, o) && od < nd) (near = o), (nd = od);
    }
    if (near) {
      const away = { x: c.pos.x - near.pos.x, y: c.pos.y - near.pos.y };
      const side = dir.x * away.y - dir.y * away.x >= 0 ? 1 : -1;
      dir = { x: dir.x - dir.y * side * 0.6, y: dir.y + dir.x * side * 0.6 };
      const dm = len(dir);
      dir = { x: dir.x / dm, y: dir.y / dm };
    }
    return { move: dir };
  }
  c.chargeAt = null;
  if (tick) {
    const lead = ball.owner ? 0.25 : 0.3;
    const p = ball.owner ? s.competitors[ball.owner].pos : ball.pos;
    const v = ball.owner ? s.competitors[ball.owner].vel : ball.vel;
    const aim = inPen({ x: p.x + v.x * lead, y: p.y + v.y * lead });
    const chasers = COMPETITORS.filter((id) => id !== ball.owner && !isDown(s, s.competitors[id]))
      .map((id) => ({ id, d: Math.hypot(s.competitors[id].pos.x - aim.x, s.competitors[id].pos.y - aim.y) }))
      .sort((a, b) => a.d - b.d || COMPETITORS.indexOf(a.id) - COMPETITORS.indexOf(b.id))
      .slice(0, JUNGLE.aiChasers)
      .map((r) => r.id);
    const shotOn = !ball.owner && !ball.held && ball.vel.x > 6;
    if (chasers.includes(c.id)) c.target = aim;
    else if (shotOn) c.target = { x: JUNGLE.goalX - 4.5, y: MID + REBOUND_Y[c.id] };
    else {
      const a = SUPPORT_ANGLE[c.id];
      c.target = inPen({ x: aim.x + Math.cos(a) * 4.5, y: aim.y + Math.sin(a) * 4.5 });
    }
    if (ball.owner && chasers.includes(c.id)) {
      const o = s.competitors[ball.owner];
      const to = { x: o.pos.x - c.pos.x, y: o.pos.y - c.pos.y };
      const d = len(to);
      if (d > 1e-6) {
        const roll = rnd();
        const face = { x: to.x / d, y: to.y / d };
        if (roll < Math.max(JUNGLE.aiHitChance, JUNGLE.aiSlideChance) && c.turbo >= JUNGLE.turboMoveCost && rnd() < 0.5) c.turboOn = true;
        if (d <= JUNGLE.playerRadius * 2 + JUNGLE.hitReach && roll < JUNGLE.aiHitChance && canMove(s, c, 'hit')) return (c.facing = face), { move: face, act: 'hit' };
        if (d > 1.8 && d < 3.2 && roll < JUNGLE.aiSlideChance && canMove(s, c, 'slide')) return (c.facing = face), { move: face, act: 'slide' };
      }
    }
  }
  const to = { x: c.target.x - c.pos.x, y: c.target.y - c.pos.y };
  const d = len(to);
  let mv = d > 0.05 ? { x: to.x / d, y: to.y / d } : { x: 0, y: 0 };
  if (d < 0.6) mv = { x: mv.x * d / 0.6, y: mv.y * d / 0.6 };
  return { move: mv };
}

function moveCompetitor(s: JungleState, c: Competitor, want: V, dt: number): void {
  if (s.t < c.slideUntil && c.slideDir) {
    const v = c.lastMove?.kind === 'slide' && c.lastMove.big ? JUNGLE.diveSpeed : JUNGLE.slideSpeed;
    c.vel = { x: c.slideDir.x * v, y: c.slideDir.y * v };
    c.pos = inPen({ x: c.pos.x + c.vel.x * dt, y: c.pos.y + c.vel.y * dt });
    return;
  }
  if (s.t < c.hitUntil) {
    c.vel = { x: c.hitDir.x * JUNGLE.hitLungeSpeed, y: c.hitDir.y * JUNGLE.hitLungeSpeed };
    c.pos = inPen({ x: c.pos.x + c.vel.x * dt, y: c.pos.y + c.vel.y * dt });
    return;
  }
  if (s.t < c.lagUntil || isDown(s, c) || s.t < c.celebrateUntil) {
    c.vel = { x: 0, y: 0 };
    return;
  }
  const stunned = s.t < c.stunUntil;
  const boost = c.turboOn && (c.turbo > 0 || s.fire === c.id) && len(want) > 0.2 ? JUNGLE.turboSpeed : 1;
  const charging = c.chargeAt !== null ? JUNGLE.chargeSpeedFactor : 1;
  const top = (s.ball.owner === c.id ? JUNGLE.dribbleSpeed : JUNGLE.runSpeed) * boost * charging * (stunned ? JUNGLE.stunSpeedFactor : 1) * (c.id === 'player' ? 1 : JUNGLE.aiSpeedFactor);
  const tv = { x: want.x * top, y: want.y * top };
  const dv = { x: tv.x - c.vel.x, y: tv.y - c.vel.y };
  const m = len(dv);
  const step = JUNGLE.accel * dt;
  c.vel = m <= step ? tv : { x: c.vel.x + (dv.x / m) * step, y: c.vel.y + (dv.y / m) * step };
  c.pos = inPen({ x: c.pos.x + c.vel.x * dt, y: c.pos.y + c.vel.y * dt });
  const sp = len(c.vel);
  if (sp > 0.5) c.facing = { x: c.vel.x / sp, y: c.vel.y / sp };
}

/** Turbo meter: drains while held and moving, refills while released; ON FIRE keeps it full. */
function stepTurbo(s: JungleState, c: Competitor, want: V, dt: number): void {
  if (s.fire === c.id) return void (c.turbo = 1);
  const using = c.turboOn && len(want) > 0.2 && !isDown(s, c) && s.t >= c.lagUntil;
  c.turbo = clamp(c.turbo + (using ? -JUNGLE.turboDrain : JUNGLE.turboRegen) * dt, 0, 1);
}

/** Shoulder contact: bounded separation (also off the keeper); the owner may lose the ball to a challenger. */
function contacts(s: JungleState, rnd: () => number): void {
  const ids = COMPETITORS;
  const k = s.keeper;
  for (const id of ids) {
    const c = s.competitors[id];
    const d = { x: c.pos.x - k.x, y: c.pos.y - k.y };
    const m = len(d);
    const min = JUNGLE.playerRadius + JUNGLE.keeperRadius;
    if (m < min) {
      const n = m > 1e-6 ? { x: d.x / m, y: d.y / m } : { x: -1, y: 0 };
      const push = Math.min(JUNGLE.maxPush, min - m);
      c.pos = inPen({ x: c.pos.x + n.x * push, y: c.pos.y + n.y * push });
    }
  }
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
      a.pos = inPen({ x: a.pos.x - n.x * push, y: a.pos.y - n.y * push });
      b.pos = inPen({ x: b.pos.x + n.x * push, y: b.pos.y + n.y * push });
      const owner = s.ball.owner === a.id ? a : s.ball.owner === b.id ? b : null;
      if (!owner) continue;
      const other = owner === a ? b : a;
      if (s.t < other.stunUntil || isDown(s, other) || s.t < other.noPickupUntil || s.t < s.ball.graceUntil) continue;
      const shield = owner.vel.x * (owner.pos.x - other.pos.x) + owner.vel.y * (owner.pos.y - other.pos.y) > 0 ? 0.45 : 0.75;
      if (rnd() >= shield) continue;
      s.ball.owner = other.id;
      s.ball.lastTouch = other.id;
      s.ball.graceUntil = s.t + JUNGLE.possessionGrace;
      owner.noPickupUntil = s.t + JUNGLE.regainDelay;
      owner.chargeAt = null;
      s.events.push({ type: 'steal', by: other.id, from: owner.id, t: s.t });
      if (s.t >= owner.protectedUntil) {
        owner.stunUntil = s.t + JUNGLE.stunSeconds;
        owner.protectedUntil = s.t + JUNGLE.stunSeconds + JUNGLE.protectSeconds;
        s.events.push({ type: 'bump', a: other.id, b: owner.id, down: false, t: s.t });
      }
    }
  }
}

const inMouth = (y: number, z: number): boolean => Math.abs(y - MID) <= JUNGLE.goalHalfWidth - JUNGLE.ballRadius && z + JUNGLE.ballRadius <= JUNGLE.crossbar;

/** One goal per crossing: credit to the last competitor to kick or control the ball. */
function scoreGoal(s: JungleState): void {
  const b = s.ball;
  if (b.inGoal) return;
  b.inGoal = true;
  const by = b.lastTouch;
  if (!by) {
    s.events.push({ type: 'dead', t: s.t });
    s.phase = 'goal';
    s.goalUntil = s.t + JUNGLE.celebrateSeconds * 0.5;
    return;
  }
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
  s.phase = 'goal';
  s.goalUntil = s.t + JUNGLE.celebrateSeconds;
  for (const id of COMPETITORS) s.competitors[id].chargeAt = null;
  s.competitors[by].celebrateUntil = s.goalUntil;
}

/** Bounce off a round bar or post (circle in the given plane). Returns true when it touched. */
function bar(p: { a: number; b: number }, v: { a: number; b: number }, ca: number, cb: number, e: number): boolean {
  const da = p.a - ca;
  const db = p.b - cb;
  const m = Math.hypot(da, db);
  const min = JUNGLE.ballRadius + JUNGLE.postRadius;
  if (m >= min) return false;
  const na = m > 1e-6 ? da / m : -1;
  const nb = m > 1e-6 ? db / m : 0;
  p.a = ca + na * min;
  p.b = cb + nb * min;
  const vn = v.a * na + v.b * nb;
  if (vn < 0) (v.a -= (1 + e) * vn * na), (v.b -= (1 + e) * vn * nb);
  return true;
}

/** Keeper hands: standing reach or a dive; returns true when the ball was caught or parried. */
function keeperTouch(s: JungleState, rnd: () => number): boolean {
  const k = s.keeper;
  const b = s.ball;
  if (k.mode === 'hold' || k.mode === 'down' || s.t < k.touchUntil) return false;
  const diving = k.mode === 'dive';
  const reach = diving ? 0.55 : JUNGLE.keeperReach;
  const hands = diving ? JUNGLE.keeperDiveHands : JUNGLE.keeperHands;
  if (Math.abs(b.pos.x - k.x) > JUNGLE.keeperDepth + JUNGLE.ballRadius || Math.abs(b.pos.y - k.y) > reach + JUNGLE.ballRadius || b.z > hands) return false;
  const speed = len(b.vel);
  const canCatch = s.t >= k.catchUntil && (b.owner !== null || speed < (diving ? JUNGLE.keeperCatchSpeed * 0.6 : JUNGLE.keeperCatchSpeed));
  if (b.owner) {
    const c = s.competitors[b.owner];
    c.noPickupUntil = s.t + JUNGLE.regainDelay;
    c.chargeAt = null;
  }
  if (canCatch) {
    b.owner = null;
    b.held = true;
    b.vel = { x: 0, y: 0 };
    b.vz = 0;
    b.lastTouch = null;
    k.mode = 'hold';
    k.modeUntil = s.t + JUNGLE.keeperHoldSeconds;
    k.reactAt = null;
    s.events.push({ type: 'save', kind: 'catch', t: s.t });
    return true;
  }
  const side = b.pos.y >= k.y ? 1 : -1;
  b.owner = null;
  b.pos = { x: k.x - JUNGLE.keeperDepth - JUNGLE.ballRadius - 0.05, y: b.pos.y };
  b.vel = { x: -Math.abs(b.vel.x) * 0.4 - 2, y: b.vel.y * 0.3 + side * (3 + rnd() * 3) };
  b.vz = 2.5;
  k.touchUntil = s.t + JUNGLE.keeperTouchCooldown;
  s.events.push({ type: 'save', kind: 'parry', t: s.t });
  return true;
}

/** Carried ball: follows the carrier; carried over the line inside the mouth it is released into the net. */
function stepCarried(s: JungleState, rnd: () => number): void {
  const b = s.ball;
  const c = s.competitors[b.owner!];
  if (isDown(s, c)) return void popBall(s, c.facing, 2, 0.5, c.vel);
  const sp = len(c.vel);
  const dir = sp > 0.3 ? { x: c.vel.x / sp, y: c.vel.y / sp } : c.facing;
  b.pos = { x: c.pos.x + dir.x * JUNGLE.carryOffset, y: c.pos.y + dir.y * JUNGLE.carryOffset };
  b.vel = { ...c.vel };
  b.z = 0;
  b.vz = 0;
  if (keeperTouch(s, rnd)) return;
  const r = JUNGLE.ballRadius;
  if (b.pos.x >= JUNGLE.goalX - r && inMouth(b.pos.y, 0)) {
    b.owner = null;
    b.vel = { x: Math.max(4, b.vel.x), y: b.vel.y };
    return;
  }
  b.pos = { x: clamp(b.pos.x, r, JUNGLE.goalX - r - 1e-3), y: clamp(b.pos.y, r, JUNGLE.width - r) };
}

function stepFree(s: JungleState, dt: number, rnd: () => number): void {
  const b = s.ball;
  const r = JUNGLE.ballRadius;
  const travel = (len(b.vel) + Math.abs(b.vz)) * dt;
  const n = Math.min(24, Math.max(1, Math.ceil(travel / JUNGLE.ballSubstep)));
  const h = dt / n;
  let wood = false;
  for (let i = 0; i < n; i++) {
    const prevX = b.pos.x;
    b.pos = { x: b.pos.x + b.vel.x * h, y: b.pos.y + b.vel.y * h };
    b.z += b.vz * h;
    if (b.z > 0) b.vz -= JUNGLE.gravity * h;
    if (b.z <= 0) {
      b.z = 0;
      b.vz = b.vz < -1.2 ? -b.vz * JUNGLE.bounce : 0;
    }
    const sp = len(b.vel);
    const decel = b.z > 0.02 ? JUNGLE.airDrag : JUNGLE.ballFriction * 6;
    const f = Math.max(0, sp - decel * h);
    if (sp > 0) b.vel = { x: (b.vel.x / sp) * f, y: (b.vel.y / sp) * f };
    // Posts (vertical, in plan view) and the crossbar (horizontal, in the x–z plane).
    if (b.z < JUNGLE.crossbar) {
      for (const py of [MID - JUNGLE.goalHalfWidth, MID + JUNGLE.goalHalfWidth]) {
        const p = { a: b.pos.x, b: b.pos.y };
        const v = { a: b.vel.x, b: b.vel.y };
        if (bar(p, v, JUNGLE.goalX, py, 0.6)) (b.pos = { x: p.a, y: p.b }), (b.vel = { x: v.a, y: v.b }), (wood = true);
      }
    }
    if (Math.abs(b.pos.y - MID) <= JUNGLE.goalHalfWidth) {
      const p = { a: b.pos.x, b: b.z };
      const v = { a: b.vel.x, b: b.vz };
      if (bar(p, v, JUNGLE.goalX, JUNGLE.crossbar, 0.6)) (b.pos = { x: p.a, y: b.pos.y }), (b.z = Math.max(0, p.b)), (b.vel = { x: v.a, y: b.vel.y }), (b.vz = v.b), (wood = true);
    }
    // End boards outside the mouth (and over the bar); the mouth itself is open.
    const open = inMouth(b.pos.y, b.z) || (prevX > JUNGLE.goalX && Math.abs(b.pos.y - MID) <= JUNGLE.goalHalfWidth);
    if (!open && b.pos.x > JUNGLE.goalX - r && prevX <= JUNGLE.goalX - r + 1e-9) (b.pos.x = JUNGLE.goalX - r), (b.vel.x = -Math.abs(b.vel.x) * JUNGLE.wallRestitution);
    if (b.pos.x > JUNGLE.goalX) {
      // Inside the goal: side netting, roof and back net hold the ball.
      const half = JUNGLE.goalHalfWidth - r;
      if (Math.abs(b.pos.y - MID) > half) (b.pos.y = MID + Math.sign(b.pos.y - MID) * half), (b.vel.y *= -0.3);
      if (b.z > JUNGLE.crossbar - r) (b.z = JUNGLE.crossbar - r), (b.vz = -Math.abs(b.vz) * 0.3);
      if (b.pos.x > JUNGLE.goalX + JUNGLE.netDepth - r) (b.pos.x = JUNGLE.goalX + JUNGLE.netDepth - r), (b.vel = { x: -Math.abs(b.vel.x) * 0.1, y: b.vel.y * 0.4 });
      if (b.pos.x >= JUNGLE.goalX + r && s.phase === 'live') scoreGoal(s);
      continue;
    }
    if (b.pos.x < r) (b.pos.x = r), (b.vel.x = Math.abs(b.vel.x) * JUNGLE.wallRestitution);
    if (b.pos.y < r) (b.pos.y = r), (b.vel.y = Math.abs(b.vel.y) * JUNGLE.wallRestitution);
    if (b.pos.y > JUNGLE.width - r) (b.pos.y = JUNGLE.width - r), (b.vel.y = -Math.abs(b.vel.y) * JUNGLE.wallRestitution);
    if (s.phase !== 'live') continue;
    if (keeperTouch(s, rnd)) return;
    // Fast low balls deflect off bodies (credit unchanged); the shooter is clear of their own shot briefly.
    if (b.z < 1.5 && len(b.vel) >= JUNGLE.trapSpeed) {
      for (const id of COMPETITORS) {
        const c = s.competitors[id];
        if (s.t < c.noPickupUntil) continue;
        const d = { x: b.pos.x - c.pos.x, y: b.pos.y - c.pos.y };
        const m = len(d);
        const min = JUNGLE.playerRadius * 0.7 + r;
        if (m >= min) continue;
        const nn = m > 1e-6 ? { x: d.x / m, y: d.y / m } : { x: -1, y: 0 };
        const vn = b.vel.x * nn.x + b.vel.y * nn.y;
        if (vn < 0) b.vel = { x: (b.vel.x - 1.3 * vn * nn.x) * 0.6, y: (b.vel.y - 1.3 * vn * nn.y) * 0.6 };
        b.pos = { x: c.pos.x + nn.x * min, y: c.pos.y + nn.y * min };
        c.noPickupUntil = s.t + 0.15;
        s.events.push({ type: 'block', by: id, t: s.t });
        break;
      }
    }
  }
  if (wood) s.events.push({ type: 'woodwork', t: s.t });
  if (s.phase !== 'live' || b.pos.x > JUNGLE.goalX) return;
  // Loose low ball: the nearest eligible competitor within reach takes control (stable id order breaks ties).
  let best: Competitor | null = null;
  let bestD = Infinity;
  if (b.z > JUNGLE.controlHeight || len(b.vel) >= JUNGLE.trapSpeed) return;
  for (const id of COMPETITORS) {
    const c = s.competitors[id];
    if (s.t < c.noPickupUntil || s.t < c.stunUntil || isDown(s, c) || s.t < c.slideUntil) continue;
    const d = Math.hypot(c.pos.x - b.pos.x, c.pos.y - b.pos.y);
    if (d <= JUNGLE.controlReach && d < bestD) (best = c), (bestD = d);
  }
  if (best) {
    b.owner = best.id;
    b.lastTouch = best.id;
    b.graceUntil = s.t + JUNGLE.possessionGrace;
  }
}

function stepBall(s: JungleState, dt: number, rnd: () => number): void {
  const b = s.ball;
  if (b.held) {
    const k = s.keeper;
    b.pos = { x: k.x - 0.3, y: k.y };
    b.z = 0.9;
    return;
  }
  if (b.owner) stepCarried(s, rnd);
  if (!b.owner && !b.held) stepFree(s, dt, rnd);
}

/** Neutral keeper: watches only the ball (never input or who has it), reacts after a delay, limited speed and reach. */
function stepKeeper(s: JungleState, dt: number): void {
  const k = s.keeper;
  const b = s.ball;
  const lo = MID - JUNGLE.goalHalfWidth + 0.3;
  const hi = MID + JUNGLE.goalHalfWidth - 0.3;
  if (k.mode === 'hold') {
    if (s.t < k.modeUntil) return;
    // Distribute: a rolled throw to alternating sides of the pen, into contested space.
    k.throwSide = k.throwSide === 1 ? -1 : 1;
    const to = { x: JUNGLE.length * 0.55 - k.x, y: MID + k.throwSide * JUNGLE.width * 0.25 - k.y };
    const m = len(to);
    b.held = false;
    b.pos = { x: k.x - JUNGLE.keeperDepth - JUNGLE.ballRadius - 0.1, y: k.y };
    b.vel = { x: (to.x / m) * JUNGLE.keeperThrowSpeed, y: (to.y / m) * JUNGLE.keeperThrowSpeed };
    b.z = 0.6;
    b.vz = 1.5;
    b.lastTouch = null;
    k.mode = 'set';
    k.touchUntil = s.t + JUNGLE.keeperTouchCooldown;
    k.catchUntil = s.t + JUNGLE.keeperRecatch;
    s.events.push({ type: 'distribute', t: s.t });
    return;
  }
  if (k.mode === 'dive') {
    k.y = clamp(k.y + k.diveDir * JUNGLE.keeperDiveSpeed * dt, Math.max(lo - 0.6, k.diveFrom - JUNGLE.keeperDiveReach), Math.min(hi + 0.6, k.diveFrom + JUNGLE.keeperDiveReach));
    if (s.t >= k.modeUntil) (k.mode = 'down'), (k.modeUntil = s.t + JUNGLE.keeperRecoverSeconds);
    return;
  }
  if (k.mode === 'down') {
    if (s.t >= k.modeUntil) k.mode = 'set';
    return;
  }
  let target = clamp(MID + (b.pos.y - MID) * 0.6, lo, hi);
  const incoming = !b.owner && b.vel.x > 3 && b.pos.x < k.x;
  if (incoming) {
    const ttl = (k.x - b.pos.x) / b.vel.x;
    const predY = b.pos.y + b.vel.y * ttl;
    if (ttl < 1.2 && Math.abs(predY - MID) < JUNGLE.goalHalfWidth + 0.6) {
      if (k.reactAt === null) k.reactAt = s.t + JUNGLE.keeperReaction;
      if (s.t >= k.reactAt) {
        k.predY = predY;
        target = clamp(predY, lo - 0.6, hi + 0.6);
        if (Math.abs(predY - k.y) > JUNGLE.keeperReach * 0.8 && ttl < 0.6) {
          k.mode = 'dive';
          k.diveDir = predY > k.y ? 1 : -1;
          k.diveFrom = k.y;
          k.modeUntil = s.t + JUNGLE.keeperDiveSeconds;
          s.events.push({ type: 'dive', dir: k.diveDir, t: s.t });
          return;
        }
      }
    } else k.reactAt = null;
  } else k.reactAt = null;
  k.y += clamp(target - k.y, -JUNGLE.keeperSpeed * dt, JUNGLE.keeperSpeed * dt);
}

/** Advances the round by real seconds in fixed sub-steps. */
export function step(s: JungleState, seconds: number, rng?: () => number): void {
  if (!(seconds > 0) || s.phase === 'ended') return;
  const rnd = rng ?? rngFor(s);
  let left = Math.min(seconds, 0.25);
  while (left > 1e-9 && (s.phase as JungleState['phase']) !== 'ended') {
    const dt = Math.min(JUNGLE.dt, left);
    left -= dt;
    const prevT = s.t;
    s.t += dt;
    if (s.t >= JUNGLE.roundSeconds) {
      s.phase = 'ended';
      s.events.push({ type: 'end', t: s.t });
      break;
    }
    if (s.phase === 'restart') {
      if (s.t >= s.restartUntil) s.phase = 'live';
      s.move = null;
      if (s.shoot !== 'press') s.shoot = null;
      continue;
    }
    if (s.phase === 'goal') {
      for (const id of COMPETITORS) moveCompetitor(s, s.competitors[id], { x: 0, y: 0 }, dt);
      stepBall(s, dt, rnd);
      if (s.t >= s.goalUntil) resetForRestart(s);
      continue;
    }
    const intents: Partial<Record<CompetitorId, V>> = {};
    for (const id of AI_COMPETITORS) {
      const c = s.competitors[id];
      const d = think(s, c, rnd);
      intents[id] = d.move;
      if (d.act) startMove(s, c, d.act);
    }
    intents.player = s.stick;
    const me = s.competitors.player;
    me.turboOn = s.turbo;
    const sm = len(s.stick);
    if (sm > 0.2 && canAct(s, me)) me.facing = { x: s.stick.x / sm, y: s.stick.y / sm };
    if (s.kick && s.ball.owner === 'player' && canAct(s, me)) kickBall(s, 'player', s.kick.dir, s.kick.power, s.kick.power > JUNGLE.quickPower);
    if (s.shoot === 'press' && canAct(s, me)) me.chargeAt = s.t;
    else if (s.shoot === 'release') releaseShot(s, me, aimShot(s, me.pos, s.stick));
    else if (s.shoot === 'cancel') me.chargeAt = null;
    if (s.move) startMove(s, me, s.move);
    s.kick = null;
    s.move = null;
    s.shoot = null;
    for (const id of COMPETITORS) moveCompetitor(s, s.competitors[id], intents[id]!, dt);
    for (const id of COMPETITORS) stepTurbo(s, s.competitors[id], intents[id]!, dt);
    for (const id of COMPETITORS) hitContacts(s, s.competitors[id]);
    for (const id of COMPETITORS) slideContacts(s, s.competitors[id]);
    for (const id of COMPETITORS) endMisses(s, s.competitors[id], prevT);
    contacts(s, rnd);
    stepBall(s, dt, rnd);
    if ((s.phase as JungleState['phase']) === 'live') stepKeeper(s, dt);
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
