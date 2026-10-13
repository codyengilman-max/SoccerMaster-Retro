import type { Vec2 } from '../vec';
import {
  add,
  approach,
  clamp,
  copy,
  distance,
  distanceToSegment,
  length,
  lerp,
  lerpVec,
  normalize,
  rotate,
  scale,
  seek,
  sub,
  vec,
  type MutableVec2,
} from './math';
import { createRng } from './rng';
import { ATTACK_TUNING, type AttackTuning } from './tuning';

export type PlayerId = 'A1' | 'A2' | 'A3' | 'D1' | 'D2' | 'GK';
export const ATTACKER_IDS: readonly PlayerId[] = ['A1', 'A2', 'A3'];
export const DEFENDER_IDS: readonly PlayerId[] = ['D1', 'D2'];
export const PLAYER_IDS: readonly PlayerId[] = ['A1', 'A2', 'A3', 'D1', 'D2', 'GK'];

export type Team = 'attack' | 'defense';
/** reset: pre-kickoff countdown; live: normal play; aiming: pass/shot aim (slow motion); ended: outcome shown. */
export type Phase = 'reset' | 'live' | 'aiming' | 'ended';
export type ActionMode = 'pass' | 'shoot';
export type Outcome = 'goal' | 'out' | 'intercepted' | 'tackled' | 'saved';
export type SwipeKind = 'cut' | 'burst' | 'check';
export type Role = 'carrier' | 'support' | 'runner' | 'receiver' | 'chaser' | 'presser' | 'cover' | 'keeper';

export interface SimPlayer {
  readonly id: PlayerId;
  readonly team: Team;
  readonly isKeeper: boolean;
  pos: MutableVec2;
  vel: MutableVec2;
  role: Role;
}

export interface KickInfo {
  readonly by: PlayerId;
  readonly kind: 'pass' | 'shot' | 'touch';
  readonly at: number;
  readonly target: Vec2 | null;
  readonly receiver: PlayerId | null;
}

export interface BallState {
  pos: MutableVec2;
  vel: MutableVec2;
  /** The only possession field: at most one player can own the ball. */
  owner: PlayerId | null;
  kick: KickInfo | null;
  /** Players who cannot touch the ball until the given sim time (kicker, deflector, parrying keeper). */
  ignore: { id: PlayerId; until: number }[];
}

export interface CarrierMove {
  readonly kind: SwipeKind;
  remaining: number;
  readonly sign: number;
}

export interface AimState {
  readonly direction: Vec2 | null;
  readonly power: number;
}

export type SimEventType =
  | 'attemptStart'
  | 'live'
  | 'swipe'
  | 'swipeRejected'
  | 'aimStart'
  | 'aimCancel'
  | 'slowMoSpent'
  | 'pass'
  | 'shot'
  | 'received'
  | 'deflected'
  | 'parried'
  | 'runStarted'
  | 'actionChanged'
  | 'ended';

export interface SimEvent {
  readonly seq: number;
  readonly t: number;
  readonly type: SimEventType;
  readonly by: PlayerId | null;
  readonly detail: string;
}

export interface AttackState {
  readonly seed: number;
  readonly attempt: number;
  phase: Phase;
  /** Real seconds in reset/ended, sim seconds otherwise. */
  phaseTime: number;
  simTime: number;
  realTime: number;
  players: Record<PlayerId, SimPlayer>;
  ball: BallState;
  /** The attacker the user controls. Changes only when an attacker secures the ball. */
  controlledId: PlayerId;
  action: ActionMode;
  control: number;
  swipeCooldown: number;
  move: CarrierMove | null;
  laneY: number;
  touchPhase: number;
  aim: AimState | null;
  slowMoBudget: number;
  timeScale: number;
  outcome: Outcome | null;
  outcomeBy: PlayerId | null;
  outcomeDetail: string;
  /** How many times the attempt was resolved; must never exceed 1. */
  resolutions: number;
  events: SimEvent[];
  contact: Record<PlayerId, number>;
  runnerId: PlayerId | null;
  runTarget: MutableVec2 | null;
  runRemaining: number;
  runCooldown: number;
  presserId: PlayerId;
  coverId: PlayerId;
  coverMarkId: PlayerId | null;
  roleTimer: number;
  keeperDiving: boolean;
}

export type Command =
  | { readonly type: 'swipe'; readonly direction: Vec2 }
  | { readonly type: 'aimStart' }
  | { readonly type: 'aimUpdate'; readonly direction: Vec2 | null; readonly power: number }
  | { readonly type: 'aimRelease' }
  | { readonly type: 'aimCancel'; readonly reason: string }
  | { readonly type: 'setAction'; readonly action: ActionMode }
  | { readonly type: 'toggleAction' }
  | { readonly type: 'retry' };

export interface AttackSimOptions {
  readonly seed?: number;
  readonly tuning?: AttackTuning;
}

/** Maps a swipe (pitch-space direction) to a dribble move: toward goal = burst, away = check, across = cut. */
export function classifySwipe(direction: Vec2): { kind: SwipeKind; sign: number } | null {
  if (length(direction) < 1e-6) return null;
  if (Math.abs(direction.x) >= Math.abs(direction.y)) return { kind: direction.x > 0 ? 'burst' : 'check', sign: 0 };
  return { kind: 'cut', sign: direction.y > 0 ? 1 : -1 };
}

/** Rolling distance before a ball at `speed` stops. */
export function stoppingDistance(speed: number, friction: number): number {
  return (speed * speed) / (2 * friction);
}

/** Kick speed that reaches `distanceYards` still moving at `arriveSpeed`. */
export function passSpeedFor(distanceYards: number, tuning: AttackTuning = ATTACK_TUNING): number {
  const { arriveSpeed, maxSpeed } = tuning.pass;
  return Math.min(maxSpeed, Math.sqrt(arriveSpeed * arriveSpeed + 2 * tuning.ball.friction * distanceYards));
}

/**
 * Training attack: 3 attackers vs 2 defenders + goalkeeper in the attacking half.
 * Deterministic for a given seed and sequence of step durations and commands.
 */
export class AttackSim {
  readonly tuning: AttackTuning;
  private readonly baseSeed: number;
  private s: AttackState;
  private accumulator = 0;
  private seq = 0;

  constructor(options: AttackSimOptions = {}) {
    this.tuning = options.tuning ?? ATTACK_TUNING;
    this.baseSeed = options.seed ?? 1;
    this.s = this.createState(1);
  }

  get state(): Readonly<AttackState> {
    return this.s;
  }

  /** Test/debug hook to arrange a scenario. Gameplay code never calls this. */
  arrange(edit: (state: AttackState) => void): void {
    edit(this.s);
  }

  player(id: PlayerId): SimPlayer {
    return this.s.players[id];
  }

  command(cmd: Command): boolean {
    const s = this.s;
    switch (cmd.type) {
      case 'retry':
        if (s.phase !== 'ended') return false;
        this.s = this.createState(s.attempt + 1);
        this.accumulator = 0;
        return true;
      case 'setAction':
        return this.setAction(cmd.action);
      case 'toggleAction':
        return this.setAction(s.action === 'pass' ? 'shoot' : 'pass');
      case 'swipe':
        return this.swipe(cmd.direction);
      case 'aimStart':
        if (s.phase !== 'live' || !this.userHasBall()) return false;
        s.phase = 'aiming';
        s.aim = { direction: null, power: 0 };
        this.emit('aimStart', s.controlledId, s.action);
        return true;
      case 'aimUpdate': {
        if (s.phase !== 'aiming') return false;
        const dir = cmd.direction && length(cmd.direction) > 1e-6 ? normalize(cmd.direction) : null;
        s.aim = { direction: dir, power: clamp(cmd.power, 0, 1) };
        return true;
      }
      case 'aimRelease': {
        if (s.phase !== 'aiming') return false;
        const aim = s.aim;
        s.phase = 'live';
        s.aim = null;
        if (!aim?.direction || !this.userHasBall()) {
          this.emit('aimCancel', s.controlledId, 'no aim');
          return false;
        }
        this.kick(aim.direction, aim.power);
        return true;
      }
      case 'aimCancel':
        if (s.phase !== 'aiming') return false;
        s.phase = 'live';
        s.aim = null;
        this.emit('aimCancel', s.controlledId, cmd.reason);
        return true;
    }
  }

  /** Advances by `realSeconds` of wall time. Aiming slows sim time for everything (players, ball, cooldowns). */
  step(realSeconds: number): void {
    const T = this.tuning;
    const s = this.s;
    const dt = clamp(realSeconds, 0, T.maxFrameSeconds);
    s.realTime += dt;

    if (s.phase === 'reset') {
      s.phaseTime += dt;
      if (s.phaseTime >= T.reset.countdownSeconds) {
        s.phase = 'live';
        s.phaseTime = 0;
        this.emit('live', null, '');
      }
      return;
    }
    if (s.phase === 'ended') {
      s.phaseTime += dt;
      return;
    }

    if (s.phase === 'aiming' && s.slowMoBudget > 0) {
      s.timeScale = T.aim.slowMoScale;
      s.slowMoBudget = Math.max(0, s.slowMoBudget - dt);
      if (s.slowMoBudget === 0) this.emit('slowMoSpent', s.controlledId, '');
    } else {
      s.timeScale = 1;
      if (s.phase !== 'aiming') {
        s.slowMoBudget = Math.min(T.aim.slowMoBudgetSeconds, s.slowMoBudget + T.aim.budgetRegenPerSecond * dt);
      }
    }

    this.accumulator += dt * s.timeScale;
    const h = T.stepSeconds;
    while (this.accumulator >= h - 1e-9) {
      this.accumulator -= h;
      this.tick(h);
      if (this.s.phase === 'ended') {
        this.accumulator = 0;
        break;
      }
    }
  }

  /** Point where the loose ball would stop rolling. */
  predictedStop(): MutableVec2 {
    const b = this.s.ball;
    const speed = length(b.vel);
    return add(b.pos, scale(normalize(b.vel), stoppingDistance(speed, this.tuning.ball.friction)));
  }

  private userHasBall(): boolean {
    const s = this.s;
    return s.ball.owner === s.controlledId && s.players[s.controlledId].team === 'attack';
  }

  private setAction(action: ActionMode): boolean {
    const s = this.s;
    if (s.phase === 'ended') return false;
    if (s.action !== action) {
      s.action = action;
      this.emit('actionChanged', null, action);
    }
    return true;
  }

  private swipe(direction: Vec2): boolean {
    const T = this.tuning;
    const s = this.s;
    if (s.phase !== 'live') return false;
    const move = classifySwipe(direction);
    if (!move) return false;
    if (!this.userHasBall()) return this.rejectSwipe('no ball');
    if (s.swipeCooldown > 0) return this.rejectSwipe('cooldown');
    const cost = T[move.kind].controlCost;
    if (s.control < cost) return this.rejectSwipe('control');

    s.control -= cost;
    s.swipeCooldown = T.swipe.cooldownSeconds;
    const carrier = s.players[s.controlledId];
    if (move.kind === 'cut') {
      s.laneY = this.clampLane(carrier.pos.y + move.sign * T.cut.distance);
      s.move = { kind: 'cut', remaining: T.cut.seconds, sign: move.sign };
    } else if (move.kind === 'check') {
      s.move = { kind: 'check', remaining: T.check.seconds, sign: 0 };
    } else {
      s.move = { kind: 'burst', remaining: T.burst.seconds, sign: 0 };
      const dir = normalize({ x: 1, y: (s.laneY - carrier.pos.y) * 0.15 });
      this.kickBall(carrier.id, scale(dir, T.burst.ballSpeed), 'touch', null, null);
    }
    this.emit('swipe', carrier.id, move.kind);
    return true;
  }

  private rejectSwipe(reason: string): boolean {
    this.emit('swipeRejected', this.s.controlledId, reason);
    return false;
  }

  private kick(direction: Vec2, power: number): void {
    const T = this.tuning;
    const s = this.s;
    const carrier = s.players[s.controlledId];
    const dir = normalize(direction);
    if (s.action === 'pass') {
      const d = lerp(T.pass.minDistance, T.pass.maxDistance, power);
      const target = add(s.ball.pos, scale(dir, d));
      const receiver = this.nearest(
        ATTACKER_IDS.filter((id) => id !== carrier.id),
        target,
      );
      this.kickBall(carrier.id, scale(dir, passSpeedFor(d, T)), 'pass', target, receiver);
      this.emit('pass', carrier.id, receiver ?? '');
    } else {
      const speed = lerp(T.shot.minSpeed, T.shot.maxSpeed, power);
      this.kickBall(carrier.id, scale(dir, speed), 'shot', null, null);
      this.emit('shot', carrier.id, speed.toFixed(1));
      this.setAction('pass');
    }
    s.move = null;
  }

  private kickBall(by: PlayerId, velocity: Vec2, kind: KickInfo['kind'], target: Vec2 | null, receiver: PlayerId | null): void {
    const s = this.s;
    s.ball.owner = null;
    s.ball.vel = copy(velocity);
    s.ball.kick = { by, kind, at: s.simTime, target, receiver };
    s.ball.ignore = [{ id: by, until: s.simTime + this.tuning.ball.kickerIgnoreSeconds }];
  }

  private tick(h: number): void {
    const T = this.tuning;
    const s = this.s;
    s.simTime += h;
    s.phaseTime += h;
    s.swipeCooldown = Math.max(0, s.swipeCooldown - h);
    s.control = Math.min(T.control.max, s.control + T.control.regenPerSecond * h);
    if (s.move) {
      s.move.remaining -= h;
      if (s.move.remaining <= 0) s.move = null;
    }
    s.ball.ignore = s.ball.ignore.filter((e) => e.until > s.simTime);

    this.assignRoles(h);
    for (const id of PLAYER_IDS) this.movePlayer(s.players[id], h);
    const prev = copy(s.ball.pos);
    this.moveBall(h);
    this.resolveContacts(prev, h);
  }

  private assignRoles(h: number): void {
    const T = this.tuning;
    const s = this.s;
    const ball = s.ball;
    const owner = ball.owner ? s.players[ball.owner] : null;

    for (const id of ATTACKER_IDS) s.players[id].role = 'support';
    if (owner?.team === 'attack') {
      owner.role = 'carrier';
    } else if (!owner) {
      const kick = ball.kick;
      if (kick?.kind === 'pass' && kick.receiver) s.players[kick.receiver].role = 'receiver';
      else if (kick?.kind === 'touch' && s.players[kick.by].team === 'attack') s.players[kick.by].role = 'chaser';
      else {
        const chaser = this.nearest(ATTACKER_IDS, ball.pos);
        if (chaser) s.players[chaser].role = 'chaser';
      }
    }

    // One supporting attacker makes a run into space when the lane to that space is open.
    if (owner?.team === 'attack') {
      s.runCooldown -= h;
      if (s.runnerId) {
        s.runRemaining -= h;
        if (s.runRemaining <= 0 || s.runnerId === owner.id) this.endRun();
      }
      if (!s.runnerId && s.runCooldown <= 0) this.tryStartRun(owner);
    }
    if (s.runnerId && s.players[s.runnerId].role === 'support') s.players[s.runnerId].role = 'runner';

    // Defenders: nearest presses the ball, the other covers a passing lane. Hysteresis avoids flicker.
    s.roleTimer -= h;
    const presser = s.players[s.presserId];
    const other = s.players[s.coverId];
    if (s.roleTimer <= 0 && distance(presser.pos, ball.pos) - distance(other.pos, ball.pos) > T.defense.swapMargin) {
      s.presserId = other.id;
      s.coverId = presser.id;
      s.roleTimer = T.defense.swapSeconds;
    }
    s.players[s.presserId].role = 'presser';
    s.players[s.coverId].role = 'cover';
    s.players.GK.role = 'keeper';

    const ballHolder = owner?.id ?? null;
    const markCandidates = ATTACKER_IDS.filter((id) => id !== ballHolder && s.players[id].role !== 'chaser');
    let best: PlayerId | null = null;
    let bestScore = -Infinity;
    for (const id of markCandidates) {
      const p = s.players[id].pos;
      const score = p.x - 0.3 * Math.abs(p.y - T.area.goalCenterY);
      if (score > bestScore) {
        bestScore = score;
        best = id;
      }
    }
    s.coverMarkId = best;
  }

  private tryStartRun(carrier: SimPlayer): void {
    const T = this.tuning;
    const s = this.s;
    const deepest = Math.max(...DEFENDER_IDS.map((id) => s.players[id].pos.x));
    const candidates = ATTACKER_IDS.filter((id) => id !== carrier.id && id !== s.coverMarkId);
    for (const id of candidates) {
      const runner = s.players[id];
      const target = vec(
        clamp(deepest + T.run.beyondDefence, carrier.pos.x + 4, T.run.maxX),
        this.clampLane(lerp(runner.pos.y, T.area.goalCenterY, 0.4)),
      );
      const laneOpen = DEFENDER_IDS.every(
        (d) => distanceToSegment(s.players[d].pos, carrier.pos, target) > T.run.laneClearance,
      );
      if (!laneOpen) continue;
      s.runnerId = id;
      s.runTarget = target;
      s.runRemaining = T.run.seconds;
      this.emit('runStarted', id, '');
      return;
    }
    s.runCooldown = 0.3;
  }

  private endRun(): void {
    const s = this.s;
    s.runnerId = null;
    s.runTarget = null;
    s.runCooldown = this.tuning.run.cooldownSeconds;
  }

  private movePlayer(p: SimPlayer, h: number): void {
    const T = this.tuning;
    const s = this.s;
    const A = T.area;
    let desired: MutableVec2;
    let accel: number;

    switch (p.role) {
      case 'carrier':
        desired = this.carrierVelocity(p);
        accel = T.dribble.accel;
        break;
      case 'chaser': {
        const bursting = s.move?.kind === 'burst' && s.ball.kick?.by === p.id;
        desired = seek(p.pos, this.chasePoint(), bursting ? T.burst.runSpeed : T.chase.speed, 0.4);
        accel = T.chase.accel;
        break;
      }
      case 'receiver': {
        // Run to the pass target; once there, step toward the ball to meet it instead of waiting.
        const target = s.ball.kick?.target ?? this.chasePoint();
        const meet = distance(p.pos, target) < T.receive.meetDistance;
        desired = meet ? seek(p.pos, s.ball.pos, T.support.speed, 0.2) : seek(p.pos, target, T.run.speed, 0.3);
        accel = T.chase.accel;
        break;
      }
      case 'runner':
        desired = seek(p.pos, s.runTarget ?? p.pos, T.run.speed);
        accel = T.support.accel;
        break;
      case 'support':
        desired = seek(p.pos, this.supportTarget(p), T.support.speed);
        accel = T.support.accel;
        break;
      case 'presser': {
        const owner = s.ball.owner ? s.players[s.ball.owner] : null;
        if (owner && owner.team === 'attack') {
          const goalSide = normalize(sub(this.goalCenter(), owner.pos));
          desired = seek(p.pos, add(owner.pos, scale(goalSide, T.defense.goalSideOffset)), T.defense.pressSpeed, 0.5);
        } else {
          desired = seek(p.pos, this.chasePoint(), T.defense.chaseSpeed, 0.4);
        }
        accel = T.defense.accel;
        break;
      }
      case 'cover': {
        const anchor = s.ball.owner ? s.players[s.ball.owner].pos : s.ball.pos;
        const mark = s.coverMarkId ? s.players[s.coverMarkId].pos : this.goalCenter();
        const spot = lerpVec(anchor, mark, T.defense.coverFraction);
        spot.x += T.defense.goalSideOffset;
        desired = seek(p.pos, spot, T.defense.coverSpeed);
        accel = T.defense.accel;
        break;
      }
      case 'keeper': {
        const { target, speed } = this.keeperTarget(p);
        desired = seek(p.pos, target, speed, 0.4);
        accel = T.keeper.accel;
        break;
      }
    }

    p.vel = approach(p.vel, desired, accel * h);
    p.pos.x = clamp(p.pos.x + p.vel.x * h, A.minX - 2, A.maxX - 0.3);
    p.pos.y = clamp(p.pos.y + p.vel.y * h, 0.5, A.width - 0.5);
  }

  private carrierVelocity(p: SimPlayer): MutableVec2 {
    const T = this.tuning;
    const s = this.s;
    let vx = T.dribble.speed;
    let vy = clamp((s.laneY - p.pos.y) * 1.5, -2.5, 2.5);
    const move = s.move;
    if (move?.kind === 'cut') {
      vx = T.cut.forwardSpeed;
      vy = (s.laneY - p.pos.y) * move.sign > 0.05 ? move.sign * T.cut.lateralSpeed : 0;
    } else if (move?.kind === 'check') {
      vx = -T.check.backSpeed;
      vy = 0;
    }
    if (vx > 0) {
      const room = T.area.maxX - T.dribble.stopShort - p.pos.x;
      vx *= clamp(room / T.dribble.slowZone, 0, 1);
    }
    return vec(vx, vy);
  }

  private supportTarget(p: SimPlayer): MutableVec2 {
    const T = this.tuning;
    const s = this.s;
    const anchor = s.ball.owner ? s.players[s.ball.owner].pos : s.ball.pos;
    const others = ATTACKER_IDS.filter(
      (id) => id !== p.id && (s.players[id].role === 'support' || s.players[id].role === 'runner'),
    );
    const mate = others[0] ? s.players[others[0]] : null;
    const left = mate ? p.pos.y <= mate.pos.y : p.pos.y <= anchor.y;
    let y = left ? T.support.width : T.area.width - T.support.width;
    if (Math.abs(anchor.y - y) < T.support.crowdDistance) {
      y = anchor.y + (left ? T.support.insideOffset : -T.support.insideOffset);
    }
    return vec(clamp(anchor.x + T.support.depth, T.area.minX + 2, T.run.maxX), this.clampLane(y));
  }

  private keeperTarget(gk: SimPlayer): { target: MutableVec2; speed: number } {
    const T = this.tuning;
    const s = this.s;
    const K = T.keeper;
    const A = T.area;
    const ball = s.ball;
    const kick = ball.kick;
    const shotIncoming =
      !ball.owner && kick?.kind === 'shot' && ball.vel.x > 0.5 && s.simTime - kick.at >= K.reactionSeconds;
    if (shotIncoming) {
      const t = (gk.pos.x - ball.pos.x) / ball.vel.x;
      const y = t > 0 ? ball.pos.y + ball.vel.y * t : ball.pos.y;
      s.keeperDiving = true;
      return {
        target: vec(gk.pos.x, clamp(y, A.goalCenterY - A.goalHalfWidth - 1, A.goalCenterY + A.goalHalfWidth + 1)),
        speed: K.diveSpeed,
      };
    }
    s.keeperDiving = false;
    const y = A.goalCenterY + (ball.pos.y - A.goalCenterY) * K.shade;
    return {
      target: vec(A.maxX - K.depth, clamp(y, A.goalCenterY - A.goalHalfWidth + 0.5, A.goalCenterY + A.goalHalfWidth - 0.5)),
      speed: K.speed,
    };
  }

  private moveBall(h: number): void {
    const T = this.tuning;
    const s = this.s;
    const ball = s.ball;
    if (ball.owner) {
      const o = s.players[ball.owner];
      s.touchPhase = (s.touchPhase + h / T.dribble.touchSeconds) % 1;
      const t = s.touchPhase;
      const k = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;
      const heading = length(o.vel) > 0.3 ? normalize(o.vel) : vec(1, 0);
      ball.pos = add(o.pos, scale(heading, lerp(T.dribble.minLead, T.dribble.maxLead, k)));
      ball.vel = copy(o.vel);
      return;
    }
    ball.pos = add(ball.pos, scale(ball.vel, h));
    const speed = length(ball.vel);
    if (speed > 0) ball.vel = scale(ball.vel, Math.max(0, speed - T.ball.friction * h) / speed);
  }

  private resolveContacts(prev: Vec2, h: number): void {
    if (this.s.ball.owner) {
      this.resolveTackles(h);
      return;
    }
    if (this.resolveKeeper(prev)) return;
    if (this.resolveBoundaries(prev)) return;
    this.resolveLooseBall(prev);
  }

  private resolveTackles(h: number): void {
    const T = this.tuning;
    const s = this.s;
    const owner = s.ball.owner ? s.players[s.ball.owner] : null;
    if (!owner || owner.team !== 'attack') return;
    for (const id of ['D1', 'D2', 'GK'] as const) {
      const d = s.players[id];
      const gap = Math.min(distance(d.pos, owner.pos), distance(d.pos, s.ball.pos));
      if (gap > T.tackle.radius) {
        s.contact[id] = 0;
        continue;
      }
      s.contact[id] += h;
      if (s.contact[id] >= T.tackle.contactSeconds) {
        s.ball.owner = id;
        s.ball.vel = vec(0, 0);
        this.end(d.isKeeper ? 'saved' : 'tackled', id, d.isKeeper ? 'keeper smothered the ball' : 'defender won the ball');
        return;
      }
    }
  }

  private resolveKeeper(prev: Vec2): boolean {
    const T = this.tuning;
    const s = this.s;
    const ball = s.ball;
    const gk = s.players.GK;
    if (this.ignored('GK')) return false;
    const reach = s.keeperDiving ? T.keeper.diveReach : T.keeper.reach;
    if (distanceToSegment(gk.pos, prev, ball.pos) > reach) return false;
    const speed = length(ball.vel);
    if (speed <= T.keeper.catchSpeed) {
      ball.owner = 'GK';
      ball.vel = vec(0, 0);
      ball.pos = copy(gk.pos);
      this.end('saved', 'GK', `keeper caught it (${speed.toFixed(1)} yd/s)`);
      return true;
    }
    const side = ball.pos.y >= gk.pos.y ? 1 : -1;
    ball.vel = vec(-Math.abs(ball.vel.x) * T.keeper.parryFactor, side * speed * 0.3);
    ball.ignore.push({ id: 'GK', until: s.simTime + T.keeper.ignoreSeconds });
    s.keeperDiving = false;
    this.emit('parried', 'GK', speed.toFixed(1));
    return false;
  }

  private resolveBoundaries(prev: Vec2): boolean {
    const A = this.tuning.area;
    const s = this.s;
    const p = s.ball.pos;
    if (p.x >= A.maxX) {
      const dx = p.x - prev.x;
      const t = dx > 1e-9 ? clamp((A.maxX - prev.x) / dx, 0, 1) : 1;
      const y = prev.y + (p.y - prev.y) * t;
      if (Math.abs(y - A.goalCenterY) <= A.goalHalfWidth - A.ballRadius) {
        this.end('goal', s.ball.kick?.by ?? null, 'ball crossed the goal line between the posts');
      } else {
        this.end('out', null, 'ball went over the goal line');
      }
      return true;
    }
    if (p.y <= 0 || p.y >= A.width) {
      this.end('out', null, 'ball went over the touchline');
      return true;
    }
    if (p.x <= A.minX) {
      this.end('out', null, 'ball left the training area');
      return true;
    }
    return false;
  }

  private resolveLooseBall(prev: Vec2): void {
    const T = this.tuning;
    const s = this.s;
    const ball = s.ball;
    const speed = length(ball.vel);
    let best: { p: SimPlayer; d: number } | null = null;
    for (const id of PLAYER_IDS) {
      const p = s.players[id];
      if (p.isKeeper || this.ignored(id)) continue;
      const d = distanceToSegment(p.pos, prev, ball.pos);
      const radius = p.team === 'attack' ? T.receive.radius : T.intercept.radius;
      if (d <= radius && (!best || d < best.d)) best = { p, d };
    }
    if (!best) return;
    const { p, d } = best;

    if (p.team === 'attack') {
      if (speed <= T.receive.maxSpeed) {
        this.take(p);
      } else {
        ball.vel = scale(ball.vel, T.receive.hotTouchFactor);
        ball.ignore.push({ id: p.id, until: s.simTime + T.intercept.ignoreSeconds });
        this.emit('deflected', p.id, 'too fast to control');
      }
      return;
    }
    const kick = ball.kick;
    if (kick?.kind === 'pass' && s.simTime - kick.at < T.intercept.reactionSeconds && d > T.intercept.blockRadius) return;
    if (speed <= T.intercept.maxSpeed) {
      ball.owner = p.id;
      ball.vel = vec(0, 0);
      this.end('intercepted', p.id, 'defender cut out the ball');
      return;
    }
    if (d <= T.intercept.deflectRadius) {
      const toBall = sub(ball.pos, p.pos);
      const cross = ball.vel.x * toBall.y - ball.vel.y * toBall.x;
      const angle = (cross >= 0 ? 1 : -1) * T.intercept.deflectAngle;
      ball.vel = scale(rotate(ball.vel, angle), T.intercept.deflectSpeedFactor);
      ball.ignore.push({ id: p.id, until: s.simTime + T.intercept.ignoreSeconds });
      this.emit('deflected', p.id, 'deflected by a defender');
    }
  }

  /** Attacker secures the ball: possession and user control move to them; nobody else is repositioned. */
  private take(p: SimPlayer): void {
    const s = this.s;
    const ball = s.ball;
    ball.owner = p.id;
    ball.vel = copy(p.vel);
    ball.kick = null;
    ball.ignore = [];
    s.controlledId = p.id;
    s.laneY = this.clampLane(p.pos.y);
    s.move = null;
    s.touchPhase = 0;
    if (s.runnerId === p.id) this.endRun();
    for (const id of PLAYER_IDS) s.contact[id] = 0;
    this.emit('received', p.id, length(p.vel).toFixed(1));
  }

  private end(outcome: Outcome, by: PlayerId | null, detail: string): void {
    const s = this.s;
    if (s.phase === 'ended') return;
    s.phase = 'ended';
    s.phaseTime = 0;
    s.outcome = outcome;
    s.outcomeBy = by;
    s.outcomeDetail = detail;
    s.resolutions += 1;
    s.aim = null;
    s.move = null;
    s.timeScale = 1;
    this.emit('ended', by, outcome);
  }

  private chasePoint(): MutableVec2 {
    const stop = this.predictedStop();
    const b = this.s.ball.pos;
    // Aim a little ahead of the ball rather than at its final resting spot when it is still fast.
    return distance(stop, b) > 6 ? add(b, scale(normalize(sub(stop, b)), 6)) : stop;
  }

  private goalCenter(): MutableVec2 {
    const A = this.tuning.area;
    return vec(A.maxX, A.goalCenterY);
  }

  private clampLane(y: number): number {
    const A = this.tuning.area;
    return clamp(y, A.laneMargin, A.width - A.laneMargin);
  }

  private ignored(id: PlayerId): boolean {
    return this.s.ball.ignore.some((e) => e.id === id);
  }

  private nearest(ids: readonly PlayerId[], point: Vec2): PlayerId | null {
    let best: PlayerId | null = null;
    let bestD = Infinity;
    for (const id of ids) {
      const d = distance(this.s.players[id].pos, point);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    return best;
  }

  private emit(type: SimEventType, by: PlayerId | null, detail: string): void {
    this.seq += 1;
    this.s.events.push({ seq: this.seq, t: this.s.simTime, type, by, detail });
  }

  private createState(attempt: number): AttackState {
    const T = this.tuning;
    const rng = createRng(this.baseSeed * 7919 + attempt);
    const jitter = (): number => (rng() * 2 - 1) * T.setup.jitter;
    const make = (id: PlayerId, team: Team, x: number, y: number): SimPlayer => ({
      id,
      team,
      isKeeper: id === 'GK',
      pos: vec(x, y),
      vel: vec(0, 0),
      role: 'support',
    });
    const players: Record<PlayerId, SimPlayer> = {
      A1: make('A1', 'attack', 38, 25),
      A2: make('A2', 'attack', 40, 9),
      A3: make('A3', 'attack', 40, 41),
      D1: make('D1', 'defense', 59 + jitter(), 23 + jitter()),
      D2: make('D2', 'defense', 57 + jitter(), 33 + jitter()),
      GK: make('GK', 'defense', T.area.maxX - T.keeper.depth, T.area.goalCenterY),
    };
    const state: AttackState = {
      seed: this.baseSeed,
      attempt,
      phase: 'reset',
      phaseTime: 0,
      simTime: 0,
      realTime: 0,
      players,
      ball: { pos: vec(38 + T.dribble.minLead, 25), vel: vec(0, 0), owner: 'A1', kick: null, ignore: [] },
      controlledId: 'A1',
      action: 'pass',
      control: T.control.max,
      swipeCooldown: 0,
      move: null,
      laneY: 25,
      touchPhase: 0,
      aim: null,
      slowMoBudget: T.aim.slowMoBudgetSeconds,
      timeScale: 1,
      outcome: null,
      outcomeBy: null,
      outcomeDetail: '',
      resolutions: 0,
      events: [],
      contact: { A1: 0, A2: 0, A3: 0, D1: 0, D2: 0, GK: 0 },
      runnerId: null,
      runTarget: null,
      runRemaining: 0,
      runCooldown: T.run.firstDelaySeconds,
      presserId: 'D1',
      coverId: 'D2',
      coverMarkId: null,
      roleTimer: 0,
      keeperDiving: false,
    };
    this.s = state;
    this.emit('attemptStart', null, String(attempt));
    return state;
  }
}

/** Invariant checks used by tests and debug builds. Returns human-readable violations. */
export function checkInvariants(state: Readonly<AttackState>, tuning: AttackTuning = ATTACK_TUNING): string[] {
  const problems: string[] = [];
  const { owner } = state.ball;
  if (owner && !(owner in state.players)) problems.push(`unknown owner ${owner}`);
  if (owner && state.phase !== 'ended') {
    const gap = distance(state.players[owner].pos, state.ball.pos);
    if (gap > tuning.dribble.maxLead + 0.5) problems.push(`ball ${gap.toFixed(2)} yd from owner ${owner}`);
  }
  if ((state.phase === 'ended') !== (state.outcome !== null)) problems.push('phase/outcome mismatch');
  if (state.resolutions > 1) problems.push(`resolved ${state.resolutions} times`);
  if (state.phase === 'aiming' && state.ball.owner !== state.controlledId) problems.push('aiming without the ball');
  if (state.players[state.controlledId].team !== 'attack') problems.push('user controls a defender');
  return problems;
}
