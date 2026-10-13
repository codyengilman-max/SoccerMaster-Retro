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
  normalize,
  rotate,
  scale,
  seek,
  sub,
  vec,
  type MutableVec2,
} from '../attack/math';
import { createRng } from '../attack/rng';
import { classifySwipe, passSpeedFor, type ActionMode, type Command } from '../attack/sim';
import { DEFAULT_FORMATION, FORMATIONS, roleDef, type FormationId } from './formations';
import { MATCH_TUNING, type MatchTuning } from './tuning';
import { computeAnchor, decideCarrier, planTeams, toTeam, toWorld, velToTeam, type AiContext } from './ai';
import {
  AWAY_IDS,
  HOME_IDS,
  MATCH_PLAYER_IDS,
  TEAM_PLAYER_IDS,
  otherTeam,
  type MatchEventType,
  type MatchKick,
  type MatchPlayer,
  type MatchPlayerId,
  type MatchState,
  type TeamId,
} from './types';

export type MatchCommand =
  | Exclude<Command, { type: 'retry' }>
  | { readonly type: 'pause' }
  | { readonly type: 'resume' }
  | { readonly type: 'reset' }
  | { readonly type: 'setFormation'; readonly team: TeamId; readonly formation: FormationId };

export interface MatchSimOptions {
  readonly seed?: number;
  readonly tuning?: MatchTuning;
  readonly homeFormation?: FormationId;
  readonly awayFormation?: FormationId;
}

const MAX_EVENTS = 40;

/**
 * 9v9 team-play sandbox: 18 players, two goals, one ball. Home is the user's team (controls the
 * carrier with the M2 gestures), away is AI. Deterministic for a seed, a sequence of step durations
 * and commands: the fixed step (tuning.stepSeconds) decides every outcome, never the frame rate.
 */
export class MatchSim {
  readonly tuning: MatchTuning;
  private readonly seed: number;
  private rng: () => number;
  private s: MatchState;
  private accumulator = 0;
  private seq = 0;

  constructor(options: MatchSimOptions = {}) {
    this.tuning = options.tuning ?? MATCH_TUNING;
    this.seed = options.seed ?? 1;
    this.rng = createRng(this.seed);
    this.s = this.createState({
      home: options.homeFormation ?? DEFAULT_FORMATION,
      away: options.awayFormation ?? DEFAULT_FORMATION,
    });
  }

  get state(): Readonly<MatchState> {
    return this.s;
  }

  /** Test/debug hook to stage a scenario. Gameplay code never calls this. */
  arrange(edit: (state: MatchState) => void): void {
    edit(this.s);
  }

  player(id: MatchPlayerId): MatchPlayer {
    return this.s.players[id];
  }

  /** True while a home outfield player the user controls has the ball. */
  userHasBall(): boolean {
    const s = this.s;
    const o = s.ball.owner;
    return o !== null && o === s.controlledId && !s.players[o].isKeeper && s.players[o].team === 'home';
  }

  command(cmd: MatchCommand): boolean {
    const s = this.s;
    switch (cmd.type) {
      case 'pause':
        if (s.paused) return false;
        if (s.phase === 'aiming') this.cancelAim('paused');
        s.paused = true;
        this.emit('paused', null, '');
        return true;
      case 'resume':
        if (!s.paused) return false;
        s.paused = false;
        this.emit('resumed', null, '');
        return true;
      case 'reset':
        this.s = this.createState({ ...s.formations });
        this.accumulator = 0;
        this.rng = createRng(this.seed + this.s.events.length + Math.round(s.simTime * 1000));
        this.emit('reset', null, 'sandbox reset');
        return true;
      case 'setFormation':
        return this.setFormation(cmd.team, cmd.formation);
      case 'setAction':
        return this.setAction(cmd.action);
      case 'toggleAction':
        return this.setAction(s.action === 'pass' ? 'shoot' : 'pass');
      case 'swipe':
        return this.swipe(cmd.direction);
      case 'aimStart':
        if (s.paused || s.phase !== 'live' || !this.userHasBall()) return false;
        s.phase = 'aiming';
        s.aim = { direction: null, power: 0, epoch: s.controlEpoch };
        this.emit('aimStart', s.controlledId, s.action);
        return true;
      case 'aimUpdate': {
        if (s.phase !== 'aiming' || !s.aim) return false;
        const dir = cmd.direction && length(cmd.direction) > 1e-6 ? normalize(cmd.direction) : null;
        s.aim = { direction: dir, power: clamp(cmd.power, 0, 1), epoch: s.aim.epoch };
        return true;
      }
      case 'aimRelease': {
        if (s.phase !== 'aiming') return false;
        const aim = s.aim;
        s.phase = 'live';
        s.aim = null;
        // An aim started for another carrier (or before a turnover) never fires for the new one.
        if (!aim?.direction || aim.epoch !== s.controlEpoch || !this.userHasBall()) {
          this.emit('aimCancel', s.controlledId, aim?.direction ? 'control changed' : 'no aim');
          return false;
        }
        this.userKick(aim.direction, aim.power);
        return true;
      }
      case 'aimCancel':
        if (s.phase !== 'aiming') return false;
        this.cancelAim(cmd.reason);
        return true;
    }
  }

  /** Advances by `realSeconds` of wall time. Pause freezes everything; aiming slows everything. */
  step(realSeconds: number): void {
    const T = this.tuning;
    const s = this.s;
    const dt = clamp(realSeconds, 0, T.maxFrameSeconds);
    s.realTime += dt;
    if (s.paused) {
      s.timeScale = 0;
      return;
    }
    if (s.phase === 'kickoff' || s.phase === 'stopped') {
      s.timeScale = 1;
    } else if (s.phase === 'aiming' && s.slowMoBudget > 0) {
      s.timeScale = T.aim.slowMoScale;
      s.slowMoBudget = Math.max(0, s.slowMoBudget - dt);
      if (s.slowMoBudget === 0) this.emit('slowMoSpent', s.controlledId, '');
    } else {
      s.timeScale = 1;
      if (s.phase !== 'aiming') s.slowMoBudget = Math.min(T.aim.slowMoBudgetSeconds, s.slowMoBudget + T.aim.budgetRegenPerSecond * dt);
    }
    // Every phase (including kickoff countdowns and stoppages) advances in whole fixed ticks, so the
    // frame rate never changes when play resumes or what happens after.
    this.accumulator += dt * s.timeScale;
    const h = T.stepSeconds;
    while (this.accumulator >= h - 1e-9) {
      this.accumulator -= h;
      if (this.s.phase === 'kickoff') this.tickKickoff(h);
      else if (this.s.phase === 'stopped') this.tickStopped(h);
      else this.tick(h);
    }
  }

  private tickKickoff(h: number): void {
    const s = this.s;
    s.phaseTime += h;
    if (s.phaseTime >= this.tuning.kickoff.countdownSeconds - 1e-9) {
      s.phase = 'live';
      s.phaseTime = 0;
      this.emit('live', null, '');
    }
  }

  private tickStopped(h: number): void {
    const s = this.s;
    s.phaseTime += h;
    if (s.stoppage && s.phaseTime >= s.stoppage.until - 1e-9) this.restart();
  }

  // ---- commands -------------------------------------------------------------------------------

  private setFormation(team: TeamId, formation: FormationId): boolean {
    const s = this.s;
    if (!s.paused || !FORMATIONS[formation]) return false;
    if (s.formations[team] === formation) return false;
    const from = s.formations[team];
    s.formations[team] = formation;
    // Explicit slot mapping: identities, positions, velocities, ball and possession are untouched.
    for (const id of TEAM_PLAYER_IDS[team]) {
      const p = s.players[id];
      p.role = roleDef(formation, p.slot).id;
    }
    this.emit('formation', null, `${team} ${from} -> ${formation}`);
    return true;
  }

  private setAction(action: ActionMode): boolean {
    const s = this.s;
    if (s.phase === 'aiming' || s.action === action) return false;
    s.action = action;
    return true;
  }

  private swipe(direction: Vec2): boolean {
    const T = this.tuning;
    const s = this.s;
    if (s.paused || s.phase !== 'live') return false;
    const move = classifySwipe(direction);
    if (!move) return false;
    if (!this.userHasBall()) return this.reject('no ball');
    if (s.swipeCooldown > 0) return this.reject('cooldown');
    const cost = T[move.kind].controlCost;
    if (s.control < cost) return this.reject('control');
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
      this.kickBall(carrier, scale(dir, T.burst.ballSpeed), 'touch', null, carrier.id);
    }
    this.emit('swipe', carrier.id, move.kind);
    return true;
  }

  private reject(reason: string): boolean {
    this.emit('swipeRejected', this.s.controlledId, reason);
    return false;
  }

  private cancelAim(reason: string): void {
    const s = this.s;
    if (s.phase !== 'aiming') return;
    s.phase = 'live';
    s.aim = null;
    this.emit('aimCancel', s.controlledId, reason);
  }

  private userKick(direction: Vec2, power: number): void {
    const T = this.tuning;
    const s = this.s;
    const carrier = s.players[s.controlledId];
    const dir = normalize(direction);
    if (s.action === 'pass') {
      const d = lerp(T.pass.minDistance, T.pass.maxDistance, power);
      const target = add(s.ball.pos, scale(dir, d));
      const receiver = this.nearestMate(carrier, target);
      this.kickBall(carrier, scale(dir, passSpeedFor(d)), 'pass', target, receiver);
      this.afterPass(carrier, target);
      this.emit('pass', carrier.id, receiver ?? '');
    } else {
      const speed = lerp(T.shot.minSpeed, T.shot.maxSpeed, power);
      this.kickBall(carrier, scale(dir, speed), 'shot', null, null);
      s.stats.shots.home += 1;
      this.emit('shot', carrier.id, speed.toFixed(1));
      s.action = 'pass';
    }
    s.move = null;
  }

  // ---- simulation -----------------------------------------------------------------------------

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

    planTeams(this.ctx());
    this.aiCarrier();
    for (const id of MATCH_PLAYER_IDS) this.movePlayer(s.players[id], h);
    const prev = copy(s.ball.pos);
    this.moveBall(h);
    this.resolveContacts(prev, h);
  }

  private ctx(): AiContext {
    return { s: this.s, T: this.tuning, rng: this.rng };
  }

  /** Opponent carriers and both keepers decide on a bounded cadence after a reaction delay. */
  private aiCarrier(): void {
    const T = this.tuning;
    const s = this.s;
    const id = s.ball.owner;
    if (!id) return;
    const p = s.players[id];
    if (p.team === 'home' && !p.isKeeper) return;
    if (p.isKeeper) {
      p.intent = 'distribute';
      const held = s.simTime - s.ownedSince;
      if (held < T.keeper.holdSeconds || (held < T.keeper.maxHoldSeconds && s.simTime < s.nextDecisionAt)) return;
    } else {
      p.intent = 'carry';
      if (s.simTime < s.nextDecisionAt) return;
    }
    s.nextDecisionAt = s.simTime + T.ai.decisionSeconds;
    const d = decideCarrier(this.ctx(), p);
    if (d.type === 'carry') {
      p.target = d.target;
      return;
    }
    const noise = (k: number): number => (this.rng() * 2 - 1) * k;
    const raw = sub(d.target, s.ball.pos);
    const dir = rotate(normalize(raw), noise(T.ai.aimNoise));
    if (d.type === 'shoot') {
      const speed = lerp(T.shot.minSpeed, T.shot.maxSpeed, clamp(d.power + noise(T.ai.powerNoise), 0, 1));
      this.kickBall(p, scale(dir, speed), 'shot', null, null);
      s.stats.shots[p.team] += 1;
      this.emit('shot', p.id, speed.toFixed(1));
      return;
    }
    const dist = clamp(length(raw), T.pass.minDistance, T.pass.maxDistance);
    const speed = passSpeedFor(dist) * (1 + noise(T.ai.powerNoise));
    const target = add(s.ball.pos, scale(dir, dist));
    this.kickBall(p, scale(dir, speed), p.isKeeper && d.why === 'long' ? 'clearance' : 'pass', target, d.receiver === p.id ? null : d.receiver);
    this.afterPass(p, target);
    this.emit(p.isKeeper ? 'distributed' : 'pass', p.id, `${d.receiver} ${d.why}`);
  }

  /** Give-and-go: the passer moves on into useful space instead of stopping or sprinting blindly. */
  private afterPass(passer: MatchPlayer, target: Vec2): void {
    const T = this.tuning;
    const s = this.s;
    s.stats.passes[passer.team] += 1;
    if (passer.isKeeper) return;
    const G = T.giveAndGo;
    const team = passer.team;
    const tT = toTeam(team, target, T);
    const pT = toTeam(team, passer.pos, T);
    const side = tT.y >= pT.y ? -1 : 1;
    const ahead = vec(clamp(Math.max(pT.x, tT.x) + G.ahead * 0.5, 2, T.shape.maxAttackX), clamp(tT.y + side * G.lateral, 3, T.pitch.width - 3));
    const opp = TEAM_PLAYER_IDS[otherTeam(team)].map((id) => toTeam(team, s.players[id].pos, T));
    const blocked = opp.some((o) => distance(o, ahead) < G.blockedRadius);
    const spot = blocked ? vec(clamp(tT.x - 2, 2, T.shape.maxAttackX), clamp(pT.y, 3, T.pitch.width - 3)) : ahead;
    passer.intent = 'giveAndGo';
    passer.intentUntil = s.simTime + G.seconds;
    passer.target = toWorld(team, spot, T);
    passer.speed = T.movement.runSpeed;
  }

  private movePlayer(p: MatchPlayer, h: number): void {
    const T = this.tuning;
    const s = this.s;
    const M = T.movement;
    let desired: MutableVec2;
    let accel = M.accel;
    if (s.ball.owner === p.id) {
      if (p.isKeeper) desired = vec(0, 0);
      else if (p.team === 'home') {
        p.intent = 'carry';
        desired = this.userCarrierVelocity(p);
        accel = T.dribble.accel;
      } else {
        desired = seek(p.pos, p.target, M.carrySpeed, 0.6);
        accel = T.dribble.accel;
      }
    } else if (p.isKeeper) {
      const k = this.keeperTarget(p);
      desired = seek(p.pos, k.target, k.speed, 0.4);
      accel = T.keeper.accel;
    } else {
      desired = seek(p.pos, p.target, p.speed, p.intent === 'chase' || p.intent === 'receive' ? 0.4 : 1.5);
      if (p.intent === 'chase' || p.intent === 'press' || p.intent === 'run' || p.intent === 'recover') accel = M.sprintAccel;
    }
    p.vel = approach(p.vel, desired, accel * h);
    p.pos.x = clamp(p.pos.x + p.vel.x * h, 0.3, T.pitch.length - 0.3);
    p.pos.y = clamp(p.pos.y + p.vel.y * h, 0.5, T.pitch.width - 0.5);
  }

  private userCarrierVelocity(p: MatchPlayer): MutableVec2 {
    const T = this.tuning;
    const s = this.s;
    let vx: number = T.dribble.speed;
    let vy = clamp((s.laneY - p.pos.y) * 1.5, -2.5, 2.5);
    const move = s.move;
    if (move?.kind === 'cut') {
      vx = T.cut.forwardSpeed;
      vy = (s.laneY - p.pos.y) * move.sign > 0.05 ? move.sign * T.cut.lateralSpeed : 0;
    } else if (move?.kind === 'check') {
      vx = -T.check.backSpeed;
      vy = 0;
    }
    if (vx > 0) vx *= clamp((T.pitch.length - T.dribble.stopShort - p.pos.x) / T.dribble.slowZone, 0, 1);
    return vec(vx, vy);
  }

  private keeperTarget(gk: MatchPlayer): { target: MutableVec2; speed: number } {
    const T = this.tuning;
    const s = this.s;
    const K = T.keeper;
    const P = T.pitch;
    const team = gk.team;
    const ball = s.ball;
    const bT = toTeam(team, ball.pos, T);
    const vT = velToTeam(team, ball.vel);
    const gT = toTeam(team, gk.pos, T);
    const kick = ball.kick;
    const shotIncoming = !ball.owner && kick?.kind === 'shot' && kick.team !== team && vT.x < -0.5 && s.simTime - kick.at >= K.reactionSeconds;
    gk.intent = 'keeper';
    if (shotIncoming) {
      const t = (gT.x - bT.x) / vT.x;
      const y = t > 0 ? bT.y + vT.y * t : bT.y;
      s.keeperDiving[team] = true;
      return { target: toWorld(team, vec(gT.x, clamp(y, P.goalCenterY - P.goalHalfWidth - 1, P.goalCenterY + P.goalHalfWidth + 1)), T), speed: K.diveSpeed };
    }
    s.keeperDiving[team] = false;
    // A slow loose ball inside the box that the keeper reaches first is his to collect.
    if (!ball.owner && length(ball.vel) < 5 && this.inBox(team, ball.pos) && this.keeperFirst(gk)) {
      return { target: copy(ball.pos), speed: K.speed };
    }
    const depth = K.depth;
    const y = P.goalCenterY + (bT.y - P.goalCenterY) * K.shade;
    return {
      target: toWorld(team, vec(depth, clamp(y, P.goalCenterY - P.goalHalfWidth + 0.5, P.goalCenterY + P.goalHalfWidth - 0.5)), T),
      speed: K.speed,
    };
  }

  private keeperFirst(gk: MatchPlayer): boolean {
    const b = this.s.ball.pos;
    const d = distance(gk.pos, b) / this.tuning.keeper.speed;
    for (const id of MATCH_PLAYER_IDS) {
      const p = this.s.players[id];
      if (p.isKeeper) continue;
      if (distance(p.pos, b) / this.tuning.movement.chaseSpeed < d) return false;
    }
    return true;
  }

  private inBox(team: TeamId, p: Vec2): boolean {
    const P = this.tuning.pitch;
    const t = toTeam(team, p, this.tuning);
    return t.x <= P.boxDepth && Math.abs(t.y - P.goalCenterY) <= P.boxHalfWidth;
  }

  private moveBall(h: number): void {
    const T = this.tuning;
    const s = this.s;
    const ball = s.ball;
    if (ball.owner) {
      const o = s.players[ball.owner];
      if (o.isKeeper) {
        ball.pos = copy(o.pos);
        ball.vel = vec(0, 0);
        return;
      }
      s.touchPhase = (s.touchPhase + h / T.dribble.touchSeconds) % 1;
      const t = s.touchPhase;
      const k = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;
      const heading = length(o.vel) > 0.3 ? normalize(o.vel) : vec(o.team === 'home' ? 1 : -1, 0);
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
    for (const team of ['home', 'away'] as const) if (this.resolveKeeper(team, prev)) return;
    if (this.resolveBoundaries(prev)) return;
    this.resolveLooseBall(prev);
  }

  private resolveTackles(h: number): void {
    const T = this.tuning;
    const s = this.s;
    const owner = s.ball.owner ? s.players[s.ball.owner] : null;
    if (!owner || owner.isKeeper || s.simTime < s.protectUntil) {
      for (const id of MATCH_PLAYER_IDS) s.contact[id] = 0;
      return;
    }
    for (const id of TEAM_PLAYER_IDS[otherTeam(owner.team)]) {
      const d = s.players[id];
      if (d.isKeeper && !this.inBox(d.team, owner.pos)) continue;
      if ((s.tackleBan[id] ?? 0) > s.simTime) {
        s.contact[id] = 0;
        continue;
      }
      const gap = Math.min(distance(d.pos, owner.pos), distance(d.pos, s.ball.pos));
      if (gap > T.tackle.radius) {
        s.contact[id] = 0;
        continue;
      }
      s.contact[id] += h;
      if (s.contact[id] >= T.tackle.contactSeconds) {
        s.tackleBan[owner.id] = s.simTime + T.tackle.loserBanSeconds;
        s.beatenUntil[owner.id] = s.simTime + T.tackle.beatenSeconds;
        this.take(d, d.isKeeper ? 'saved' : 'tackle', d.isKeeper ? 'keeper smothered the ball' : `won the ball from ${owner.id}`);
        if (d.isKeeper) s.stats.saves[d.team] += 1;
        return;
      }
    }
  }

  private resolveKeeper(team: TeamId, prev: Vec2): boolean {
    const T = this.tuning;
    const s = this.s;
    const ball = s.ball;
    const gk = s.players[team === 'home' ? 'H1' : 'A1'];
    if (this.ignored(gk.id) || !this.inBox(team, ball.pos)) return false;
    const reach = s.keeperDiving[team] ? T.keeper.diveReach : T.keeper.reach;
    if (distanceToSegment(gk.pos, prev, ball.pos) > reach) return false;
    const speed = length(ball.vel);
    const shot = ball.kick?.kind === 'shot' && ball.kick.team !== team;
    if (speed <= T.keeper.catchSpeed) {
      ball.pos = copy(gk.pos);
      this.take(gk, shot ? 'saved' : 'received', shot ? `keeper caught it (${speed.toFixed(1)} yd/s)` : 'keeper collected');
      if (shot) s.stats.saves[team] += 1;
      return true;
    }
    const vT = velToTeam(team, ball.vel);
    const side = toTeam(team, ball.pos, T).y >= toTeam(team, gk.pos, T).y ? 1 : -1;
    ball.vel = toWorldVel(team, vec(Math.abs(vT.x) * T.keeper.parryFactor, side * speed * 0.3));
    ball.ignore.push({ id: gk.id, until: s.simTime + T.keeper.ignoreSeconds });
    ball.lastTouch = team;
    s.keeperDiving[team] = false;
    if (shot) s.stats.saves[team] += 1;
    this.emit('parried', gk.id, speed.toFixed(1));
    return false;
  }

  private resolveBoundaries(prev: Vec2): boolean {
    const P = this.tuning.pitch;
    const s = this.s;
    const p = s.ball.pos;
    const crossY = (lineX: number): number => {
      const dx = p.x - prev.x;
      const t = Math.abs(dx) > 1e-9 ? clamp((lineX - prev.x) / dx, 0, 1) : 1;
      return prev.y + (p.y - prev.y) * t;
    };
    const inMouth = (y: number): boolean => Math.abs(y - P.goalCenterY) <= P.goalHalfWidth - P.ballRadius;
    if (p.x >= P.length || p.x <= 0) {
      const lineX = p.x >= P.length ? P.length : 0;
      const y = crossY(lineX);
      const defending: TeamId = lineX === 0 ? 'home' : 'away';
      if (inMouth(y)) {
        const scorer = otherTeam(defending);
        s.score[scorer] += 1;
        this.stop('goal', scorer, `${scorer} scored`, defending, vec(P.length / 2, P.goalCenterY));
      } else {
        const restart = otherTeam(s.ball.lastTouch);
        const spot = restart === defending ? toWorld(defending, vec(6, P.goalCenterY), this.tuning) : vec(clamp(p.x, 4, P.length - 4), clamp(y, 4, P.width - 4));
        this.stop('out', null, 'ball went over the goal line', restart, spot);
      }
      return true;
    }
    if (p.y <= 0 || p.y >= P.width) {
      this.stop('out', null, 'ball went over the touchline', otherTeam(s.ball.lastTouch), vec(clamp(p.x, 3, P.length - 3), clamp(p.y, 1.5, P.width - 1.5)));
      return true;
    }
    return false;
  }

  private resolveLooseBall(prev: Vec2): void {
    const T = this.tuning;
    const s = this.s;
    const ball = s.ball;
    const kick = ball.kick;
    const speed = length(ball.vel);
    let best: { p: MatchPlayer; d: number; friendly: boolean } | null = null;
    for (const id of MATCH_PLAYER_IDS) {
      const p = s.players[id];
      if (p.isKeeper || this.ignored(id) || (s.beatenUntil[id] ?? 0) > s.simTime) continue;
      const friendly = !kick || kick.team === p.team;
      const d = distanceToSegment(p.pos, prev, ball.pos);
      if (d <= (friendly ? T.receive.radius : T.intercept.radius) && (!best || d < best.d)) best = { p, d, friendly };
    }
    if (!best) return;
    const { p, d, friendly } = best;
    if (friendly) {
      if (speed <= T.receive.maxSpeed) this.take(p, 'received', '');
      else {
        ball.vel = scale(ball.vel, T.receive.hotTouchFactor);
        ball.ignore.push({ id: p.id, until: s.simTime + T.intercept.ignoreSeconds });
        ball.lastTouch = p.team;
        this.emit('deflected', p.id, 'too fast to control');
      }
      return;
    }
    if (kick?.kind === 'pass' && s.simTime - kick.at < T.intercept.reactionSeconds && d > T.intercept.blockRadius) return;
    if (speed <= T.intercept.maxSpeed) {
      this.take(p, 'intercepted', `cut out ${kick?.by ?? 'the ball'}`);
      return;
    }
    if (d <= T.intercept.deflectRadius) {
      const toBall = sub(ball.pos, p.pos);
      const cross = ball.vel.x * toBall.y - ball.vel.y * toBall.x;
      ball.vel = scale(rotate(ball.vel, (cross >= 0 ? 1 : -1) * T.intercept.deflectAngle), T.intercept.deflectSpeedFactor);
      ball.ignore.push({ id: p.id, until: s.simTime + T.intercept.ignoreSeconds });
      ball.lastTouch = p.team;
      ball.kick = { by: p.id, team: p.team, kind: 'touch', at: s.simTime, target: null, receiver: null };
      this.emit('deflected', p.id, 'deflected');
    }
  }

  /** `p` secures the ball. Nobody is repositioned; possession and (for home outfielders) user control move to `p`. */
  private take(p: MatchPlayer, how: MatchEventType, detail: string): void {
    const T = this.tuning;
    const s = this.s;
    const ball = s.ball;
    const changed = s.possession !== p.team;
    ball.owner = p.id;
    ball.vel = p.isKeeper ? vec(0, 0) : copy(p.vel);
    // Control brings the ball to the receiver's feet (it was within reach), so ownership and ball position agree.
    const heading = length(p.vel) > 0.3 ? normalize(p.vel) : vec(p.team === 'home' ? 1 : -1, 0);
    ball.pos = p.isKeeper ? copy(p.pos) : add(p.pos, scale(heading, T.dribble.minLead));
    ball.kick = null;
    ball.ignore = [];
    ball.lastTouch = p.team;
    s.possession = p.team;
    s.ownedSince = s.simTime;
    s.protectUntil = s.simTime + T.tackle.protectSeconds;
    s.nextDecisionAt = s.simTime + T.ai.reactionSeconds;
    s.touchPhase = 0;
    s.move = null;
    for (const id of MATCH_PLAYER_IDS) s.contact[id] = 0;
    for (const t of ['home', 'away'] as const) s.chaser[t].id = null;
    const run = s.runs[p.team];
    if (run.runnerId === p.id) {
      run.runnerId = null;
      run.cooldownUntil = s.simTime + T.run.cooldownSeconds;
    }
    if (p.intent === 'giveAndGo') p.intentUntil = 0;
    const userControl = p.team === 'home' && !p.isKeeper;
    if (userControl ? s.controlledId !== p.id || changed : s.controlledId !== null) {
      // Any half-finished aim belonged to the previous carrier: void it.
      s.controlEpoch += 1;
      if (s.phase === 'aiming') this.cancelAim(changed ? 'possession lost' : 'control changed');
    }
    if (userControl) {
      s.controlledId = p.id;
      s.laneY = this.clampLane(p.pos.y);
      this.emit('control', p.id, '');
    }
    if (changed) {
      s.stats.turnovers += 1;
      this.emit('possession', p.id, p.team);
    }
    this.emit(how, p.id, detail);
  }

  private kickBall(by: MatchPlayer, velocity: Vec2, kind: MatchKick['kind'], target: Vec2 | null, receiver: MatchPlayerId | null): void {
    const s = this.s;
    s.ball.owner = null;
    s.ball.vel = copy(velocity);
    s.ball.kick = { by: by.id, team: by.team, kind, at: s.simTime, target, receiver };
    s.ball.ignore = [{ id: by.id, until: s.simTime + this.tuning.ball.kickerIgnoreSeconds }];
    s.ball.lastTouch = by.team;
    s.possession = by.team;
  }

  private stop(reason: 'goal' | 'out', scorer: TeamId | null, detail: string, restartTeam: TeamId, spot: Vec2): void {
    const T = this.tuning;
    const s = this.s;
    if (s.phase === 'stopped') return;
    if (s.phase === 'aiming') this.cancelAim('play stopped');
    s.phase = 'stopped';
    s.phaseTime = 0;
    s.aim = null;
    s.move = null;
    s.timeScale = 1;
    s.stoppage = { reason, scorer, detail, restartTeam, spot: copy(spot), until: reason === 'goal' ? T.stoppage.goalSeconds : T.stoppage.outSeconds };
    s.ball.vel = vec(0, 0);
    this.emit(reason, s.ball.kick?.by ?? null, detail);
  }

  /** Temporary sandbox reset after play has stopped (not a formal kickoff, throw-in, corner or goal kick). */
  private restart(): void {
    const s = this.s;
    const st = s.stoppage;
    if (!st) return;
    s.stoppage = null;
    if (st.reason === 'goal') {
      this.placeForKickoff(st.restartTeam);
    } else {
      const goalKick = distance(st.spot, toWorld(st.restartTeam, vec(6, this.tuning.pitch.goalCenterY), this.tuning)) < 0.01;
      const taker = goalKick
        ? s.players[st.restartTeam === 'home' ? 'H1' : 'A1']
        : TEAM_PLAYER_IDS[st.restartTeam].map((id) => s.players[id]).filter((p) => !p.isKeeper)
            .sort((a, b) => distance(a.pos, st.spot) - distance(b.pos, st.spot))[0];
      if (!taker) return;
      taker.pos = copy(st.spot);
      taker.vel = vec(0, 0);
      s.ball.pos = copy(st.spot);
      s.ball.owner = null;
      this.take(taker, 'restart', st.reason);
      s.protectUntil = s.simTime + 1.5;
    }
    s.phase = 'kickoff';
    s.phaseTime = 0;
  }

  private placeForKickoff(team: TeamId): void {
    const T = this.tuning;
    const s = this.s;
    const centre = vec(T.pitch.length / 2, T.pitch.goalCenterY);
    for (const t of ['home', 'away'] as const) {
      for (const id of TEAM_PLAYER_IDS[t]) {
        const p = s.players[id];
        const role = roleDef(s.formations[t], p.slot);
        const a = p.isKeeper ? vec(role.base.x, role.base.y) : computeAnchor(role, toTeam(t, centre, T), t === team, T);
        a.x = Math.min(a.x, T.pitch.length / 2 - (t === team ? 0.5 : 6));
        const jitter = t === 'away' ? (this.rng() * 2 - 1) * 0.5 : 0;
        p.pos = toWorld(t, vec(a.x, a.y + jitter), T);
        p.vel = vec(0, 0);
        p.target = copy(p.pos);
        p.anchor = copy(p.pos);
        p.intent = p.isKeeper ? 'keeper' : 'hold';
        p.intentUntil = 0;
      }
    }
    const kicker = s.players[team === 'home' ? 'H8' : 'A8'];
    kicker.pos = toWorld(team, vec(T.pitch.length / 2 - 1, T.pitch.goalCenterY), T);
    s.ball.pos = copy(centre);
    s.ball.vel = vec(0, 0);
    s.ball.owner = null;
    s.ball.kick = null;
    s.runs = { home: { runnerId: null, until: 0, cooldownUntil: 0 }, away: { runnerId: null, until: 0, cooldownUntil: 0 } };
    s.defense = { home: { presserId: null, coverId: null, until: 0 }, away: { presserId: null, coverId: null, until: 0 } };
    this.take(kicker, 'kickoff', team);
  }

  private nearestMate(carrier: MatchPlayer, point: Vec2): MatchPlayerId | null {
    let best: MatchPlayerId | null = null;
    let bestD = Infinity;
    for (const id of TEAM_PLAYER_IDS[carrier.team]) {
      const p = this.s.players[id];
      if (id === carrier.id || p.isKeeper) continue;
      const d = distance(p.pos, point);
      if (d < bestD) {
        best = id;
        bestD = d;
      }
    }
    return best;
  }

  private clampLane(y: number): number {
    const P = this.tuning.pitch;
    return clamp(y, P.laneMargin, P.width - P.laneMargin);
  }

  private ignored(id: MatchPlayerId): boolean {
    return this.s.ball.ignore.some((e) => e.id === id && e.until > this.s.simTime);
  }

  private emit(type: MatchEventType, by: MatchPlayerId | null, detail: string): void {
    const s = this.s;
    s.events.push({ seq: ++this.seq, type, at: s.simTime, by, detail });
    if (s.events.length > MAX_EVENTS) s.events.splice(0, s.events.length - MAX_EVENTS);
  }

  private createState(formations: Record<TeamId, FormationId>): MatchState {
    const T = this.tuning;
    const players = {} as Record<MatchPlayerId, MatchPlayer>;
    const contact = {} as Record<MatchPlayerId, number>;
    for (const [team, ids] of [['home', HOME_IDS], ['away', AWAY_IDS]] as const) {
      ids.forEach((id, slot) => {
        const role = roleDef(formations[team], slot);
        players[id] = {
          id,
          team,
          slot,
          role: role.id,
          isKeeper: slot === 0,
          pos: vec(0, 0),
          vel: vec(0, 0),
          intent: 'hold',
          target: vec(0, 0),
          anchor: vec(0, 0),
          intentUntil: 0,
          speed: T.movement.shapeSpeed,
        };
        contact[id] = 0;
      });
    }
    const state: MatchState = {
      phase: 'kickoff',
      paused: false,
      simTime: 0,
      realTime: 0,
      phaseTime: 0,
      timeScale: 1,
      players,
      ball: { pos: vec(T.pitch.length / 2, T.pitch.goalCenterY), vel: vec(0, 0), owner: null, kick: null, ignore: [], lastTouch: 'home' },
      formations: { ...formations },
      possession: 'home',
      controlledId: 'H8',
      controlEpoch: 0,
      action: 'pass',
      aim: null,
      slowMoBudget: T.aim.slowMoBudgetSeconds,
      control: T.control.max,
      swipeCooldown: 0,
      move: null,
      laneY: T.pitch.goalCenterY,
      touchPhase: 0,
      protectUntil: 0,
      ownedSince: 0,
      contact,
      tackleBan: {},
      beatenUntil: {},
      defense: { home: { presserId: null, coverId: null, until: 0 }, away: { presserId: null, coverId: null, until: 0 } },
      chaser: { home: { id: null, until: 0 }, away: { id: null, until: 0 } },
      runs: { home: { runnerId: null, until: 0, cooldownUntil: 0 }, away: { runnerId: null, until: 0, cooldownUntil: 0 } },
      nextDecisionAt: 0,
      keeperDiving: { home: false, away: false },
      score: { home: 0, away: 0 },
      stoppage: null,
      stats: { passes: { home: 0, away: 0 }, shots: { home: 0, away: 0 }, saves: { home: 0, away: 0 }, turnovers: 0 },
      events: [],
    };
    this.s = state;
    this.placeForKickoff('home');
    state.stats.turnovers = 0;
    return state;
  }
}

function toWorldVel(team: TeamId, v: Vec2): MutableVec2 {
  return team === 'home' ? vec(v.x, v.y) : vec(-v.x, -v.y);
}

/** Structural checks that must hold after every step. Returns human-readable violations. */
export function checkInvariants(s: Readonly<MatchState>, T: MatchTuning = MATCH_TUNING): string[] {
  const out: string[] = [];
  const ids = Object.keys(s.players);
  if (ids.length !== 18 || new Set(ids).size !== 18) out.push(`expected 18 unique players, got ${ids.length}`);
  const keepers = Object.values(s.players).filter((p) => p.isKeeper);
  if (keepers.length !== 2 || new Set(keepers.map((k) => k.team)).size !== 2) out.push('expected one keeper per team');
  for (const t of ['home', 'away'] as const) {
    const roles = TEAM_PLAYER_IDS[t].map((id) => s.players[id].role);
    if (new Set(roles).size !== 9) out.push(`${t} has duplicate roles`);
  }
  const o = s.ball.owner;
  if (o) {
    if (!s.players[o]) out.push(`unknown owner ${o}`);
    else {
      if (distance(s.players[o].pos, s.ball.pos) > T.dribble.maxLead + 0.6) out.push('owner too far from ball');
      if (s.possession !== s.players[o].team) out.push('possession does not match owner');
    }
  }
  for (const p of Object.values(s.players)) {
    if (!Number.isFinite(p.pos.x) || !Number.isFinite(p.pos.y)) out.push(`${p.id} position not finite`);
  }
  return out;
}
