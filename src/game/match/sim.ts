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
import { passSpeedFor } from '../attack/sim';
import { DEFAULT_FORMATION, FORMATIONS, roleDef, type FormationId } from './formations';
import { MATCH_TUNING, type MatchTuning } from './tuning';
import { computeAnchor, decideCarrier, planTeams, toTeam, toWorld, velToTeam, type AiContext } from './ai';
import {
  AWAY_IDS,
  HOME_IDS,
  MATCH_PLAYER_IDS,
  TEAM_PLAYER_IDS,
  otherTeam,
  type CoachIntentKind,
  type MatchEventType,
  type MatchKick,
  type MatchPlayer,
  type MatchPlayerId,
  type MatchState,
  type TeamId,
} from './types';

export type MatchCommand =
  /** Sets the user carrier's dribble direction (world/pitch vector; its length is ignored). */
  | { readonly type: 'dribble'; readonly direction: Vec2 }
  | { readonly type: 'feint' }
  | { readonly type: 'aimStart' }
  | { readonly type: 'aimUpdate'; readonly direction: Vec2 | null; readonly power: number }
  | { readonly type: 'aimRelease' }
  | { readonly type: 'aimCancel'; readonly reason: string }
  | { readonly type: 'pause' }
  | { readonly type: 'resume' }
  | { readonly type: 'reset' }
  | { readonly type: 'setFormation'; readonly team: TeamId; readonly formation: FormationId }
  /** Coach Moment freeze. Independent of the user's pause: releasing it never resumes a user/background pause. */
  | { readonly type: 'coachHold' }
  | { readonly type: 'coachRelease' }
  | { readonly type: 'coachIntent'; readonly playerId: MatchPlayerId; readonly kind: CoachIntentKind; readonly target: Vec2; readonly seconds: number; readonly source: string }
  | { readonly type: 'coachIntentClear'; readonly reason: string }
  /** Timed match only: leave half-time and kick off the second half (the team that did not start kicks off). */
  | { readonly type: 'startSecondHalf' };

/** The only commands accepted while play is over for a half or the match. */
const BREAK_COMMANDS: ReadonlySet<MatchCommand['type']> = new Set(['pause', 'resume', 'coachHold', 'coachRelease', 'coachIntentClear', 'reset', 'setFormation', 'startSecondHalf']);

export interface MatchSimOptions {
  readonly seed?: number;
  readonly tuning?: MatchTuning;
  readonly homeFormation?: FormationId;
  readonly awayFormation?: FormationId;
  /** Sim seconds per half for a timed match. Omitted or null: the open-ended sandbox (no clock). */
  readonly halfSeconds?: number | null;
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
  private readonly halfSeconds: number | null;

  constructor(options: MatchSimOptions = {}) {
    this.tuning = options.tuning ?? MATCH_TUNING;
    this.seed = options.seed ?? 1;
    this.rng = createRng(this.seed);
    const hs = options.halfSeconds;
    const M = this.tuning.match;
    this.halfSeconds = typeof hs === 'number' && Number.isFinite(hs) ? clamp(hs, M.minHalfSeconds, M.maxHalfSeconds) : null;
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
    if ((s.phase === 'halftime' || s.phase === 'fulltime') && !BREAK_COMMANDS.has(cmd.type)) return false;
    switch (cmd.type) {
      case 'startSecondHalf':
        return this.startSecondHalf();
      case 'pause':
        if (s.pauseReasons.user) return false;
        if (s.phase === 'aiming') this.cancelAim('paused');
        s.pauseReasons.user = true;
        s.paused = true;
        this.emit('paused', null, '');
        return true;
      case 'resume':
        if (!s.pauseReasons.user) return false;
        s.pauseReasons.user = false;
        s.paused = s.pauseReasons.coach;
        this.emit('resumed', null, s.paused ? 'coach hold remains' : '');
        return true;
      case 'coachHold':
        if (s.pauseReasons.coach) return false;
        if (s.phase === 'aiming') this.cancelAim('coach moment');
        s.pauseReasons.coach = true;
        s.paused = true;
        this.emit('coachHold', null, '');
        return true;
      case 'coachRelease':
        if (!s.pauseReasons.coach) return false;
        s.pauseReasons.coach = false;
        s.paused = s.pauseReasons.user;
        // No frame time carries over a freeze: play restarts from exactly the frozen state.
        this.accumulator = 0;
        this.emit('coachRelease', null, s.paused ? 'user pause remains' : '');
        return true;
      case 'coachIntent':
        return this.setCoachIntent(cmd);
      case 'coachIntentClear':
        if (!s.coachIntent) return false;
        this.clearCoachIntent(cmd.reason);
        return true;
      case 'reset':
        this.s = this.createState({ ...s.formations });
        this.accumulator = 0;
        this.rng = createRng(this.seed + this.s.events.length + Math.round(s.simTime * 1000));
        this.emit('reset', null, this.s.clock ? 'new match' : 'sandbox reset');
        return true;
      case 'setFormation':
        return this.setFormation(cmd.team, cmd.formation);
      case 'dribble':
        return this.dribble(cmd.direction);
      case 'feint':
        return this.feint();
      case 'aimStart':
        if (s.paused || s.phase !== 'live' || !this.userHasBall()) return false;
        s.phase = 'aiming';
        s.aim = { direction: null, power: 0, epoch: s.controlEpoch };
        this.emit('aimStart', s.controlledId, s.aimAllowance.home > 0 ? 'slow' : 'normal');
        return true;
      case 'aimUpdate': {
        if (s.phase !== 'aiming' || !s.aim) return false;
        if (!Number.isFinite(cmd.power) || (cmd.direction && !finiteVec(cmd.direction))) return this.reject('aim', 'non-finite');
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
    if (s.phase === 'halftime' || s.phase === 'fulltime') {
      s.timeScale = 0;
      return;
    }
    if (s.phase === 'kickoff' || s.phase === 'stopped') {
      s.timeScale = 1;
    } else if (s.phase === 'aiming' && s.aimAllowance.home > 0) {
      // The allowance is spent in real time and never refills from releasing, cancelling or passing.
      s.timeScale = T.aim.slowMoScale;
      s.aimAllowance.home = Math.max(0, s.aimAllowance.home - dt);
      if (s.aimAllowance.home === 0) this.emit('slowMoSpent', s.controlledId, '');
    } else {
      s.timeScale = 1;
    }
    // Every phase (including kickoff countdowns and stoppages) advances in whole fixed ticks, so the
    // frame rate never changes when play resumes or what happens after.
    this.accumulator += dt * s.timeScale;
    const h = T.stepSeconds;
    while (this.accumulator >= h - 1e-9) {
      this.accumulator -= h;
      if (this.s.phase === 'kickoff') this.tickKickoff(h);
      else if (this.s.phase === 'stopped') this.tickStopped(h);
      else {
        this.tick(h);
        if (this.advanceClock(h)) break;
      }
    }
  }

  /** The clock runs while the ball is in play (including slow-motion aiming); stoppages, kick-off countdowns and pauses never count. */
  private advanceClock(h: number): boolean {
    const c = this.s.clock;
    if (!c) return false;
    c.elapsed += h;
    if (c.elapsed < c.halfSeconds - 1e-9) return false;
    this.endHalf();
    return true;
  }

  /** The whistle: everything in progress ends where it is (a ball in flight does not count). */
  private endHalf(): void {
    const s = this.s;
    const c = s.clock;
    if (!c) return;
    const label = c.half === 1 ? 'half-time' : 'full-time';
    c.elapsed = c.halfSeconds;
    if (s.phase === 'aiming') this.cancelAim(label);
    if (s.coachIntent) this.clearCoachIntent(label);
    s.aim = null;
    s.feint = null;
    s.stoppage = null;
    s.ball.vel = vec(0, 0);
    s.ball.kick = null;
    for (const p of Object.values(s.players)) p.vel = vec(0, 0);
    s.phase = c.half === 1 ? 'halftime' : 'fulltime';
    s.phaseTime = 0;
    s.timeScale = 0;
    this.accumulator = 0;
    this.emit(c.half === 1 ? 'halftime' : 'fulltime', null, `${s.score.home}-${s.score.away}`);
  }

  private startSecondHalf(): boolean {
    const T = this.tuning;
    const s = this.s;
    if (s.phase !== 'halftime' || !s.clock || s.paused) return false;
    s.clock.half = 2;
    s.clock.elapsed = 0;
    this.placeForKickoff('away');
    s.phase = 'kickoff';
    s.phaseTime = 0;
    s.timeScale = 1;
    s.aimAllowance = { home: T.aimAllowance.seconds, away: T.aimAllowance.seconds };
    s.allowanceRefillPending = { home: false, away: false };
    this.accumulator = 0;
    this.emit('secondHalf', null, 'away kick off');
    return true;
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
    if (!s.pauseReasons.user || !FORMATIONS[formation]) return false;
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

  private dribble(direction: Vec2): boolean {
    const T = this.tuning;
    const s = this.s;
    if (s.paused || s.phase !== 'live') return false;
    if (!finiteVec(direction) || length(direction) < 1e-6) return this.reject('dribble', 'invalid direction');
    if (s.swipeCooldown > 0) return this.reject('dribble', 'cooldown');
    if (!this.userHasBall()) return this.steerOffBall(direction);
    s.swipeCooldown = T.carrier.redirectSeconds;
    const dir = normalize(direction);
    // Only the direction changes; speed stays bounded by carrier.speed, acceleration and turn rate.
    s.dribbleDir = vec(dir.x, dir.y);
    const f = s.feint;
    if (f && f.by === s.controlledId && s.simTime < f.until && !f.exitDir) f.exitDir = copy(dir);
    this.emit('dribble', s.controlledId, `${dir.x.toFixed(2)},${dir.y.toFixed(2)}`);
    return true;
  }

  /** Off the ball a swipe steers the controlled home outfielder for a short spell (normal speed caps, no boost). */
  private steerOffBall(direction: Vec2): boolean {
    const T = this.tuning;
    const s = this.s;
    const p = s.players[s.controlledId];
    if (!p || p.team !== 'home' || p.isKeeper || s.ball.owner === p.id) return this.reject('dribble', 'no ball');
    const owner = s.ball.owner ? s.players[s.ball.owner] : null;
    if (owner && owner.team === 'home') return this.reject('dribble', 'teammate has the ball');
    s.swipeCooldown = T.carrier.redirectSeconds;
    const dir = normalize(direction);
    s.userSteer = { dir: vec(dir.x, dir.y), until: s.simTime + T.offBall.steerSeconds, epoch: s.controlEpoch };
    this.emit('dribble', p.id, `steer ${dir.x.toFixed(2)},${dir.y.toFixed(2)}`);
    return true;
  }

  /**
   * Off-ball control policy. Opponent ball: the home presser. Loose ball: the home chaser, except
   * that a friendly pass in flight keeps the current player until someone receives it. Both picks
   * come from the AI's committed assignments (with their own hysteresis); control additionally stays
   * put for offBall.minHoldSeconds so it never flickers frame to frame.
   */
  private updateUserControl(): void {
    const T = this.tuning;
    const s = this.s;
    const owner = s.ball.owner ? s.players[s.ball.owner] : null;
    if (owner && owner.team === 'home') return;
    if (s.phase !== 'live' && s.phase !== 'aiming') return;
    const kick = s.ball.kick;
    if (!owner && kick && kick.team === 'home' && kick.kind !== 'touch') return;
    const pick = owner ? s.defense.home.presserId : s.chaser.home.id;
    if (!pick || pick === s.controlledId || s.players[pick].isKeeper) return;
    if (s.simTime - s.controlSince < T.offBall.minHoldSeconds) return;
    this.setControl(pick, owner ? 'defend' : 'loose ball');
  }

  private setControl(id: MatchPlayerId, why: string): void {
    const s = this.s;
    s.controlEpoch += 1;
    if (s.phase === 'aiming') this.cancelAim('control changed');
    s.controlledId = id;
    s.controlSince = s.simTime;
    s.userSteer = null;
    this.emit('control', id, why);
  }

  private feint(): boolean {
    const T = this.tuning;
    const s = this.s;
    if (s.paused || s.phase !== 'live') return false;
    if (!this.userHasBall()) return this.reject('feint', 'no ball');
    if (s.feint || s.simTime < s.feintReadyAt) return this.reject('feint', 'cooldown');
    const carrier = s.players[s.controlledId];
    const heading = length(carrier.vel) > 0.3 ? normalize(carrier.vel) : normalize(s.dribbleDir);
    const side = this.rng() < 0.5 ? 1 : -1;
    s.feint = { by: carrier.id, start: s.simTime, until: s.simTime + T.feint.seconds, side, exitDir: null };
    s.feintReadyAt = s.simTime + T.feint.cooldownSeconds;
    // The nearest opponent may (or may not) bite on the shoulder drop. Nothing else is granted.
    let nearest: MatchPlayer | null = null;
    let best = T.feint.biteRange;
    for (const id of AWAY_IDS) {
      const o = s.players[id];
      if (o.isKeeper) continue;
      const d = distance(o.pos, carrier.pos);
      if (d <= best) {
        best = d;
        nearest = o;
      }
    }
    let detail = 'no defender';
    if (nearest) {
      if (this.rng() < T.feint.biteChance) {
        s.feintBought = { id: nearest.id, until: s.simTime + T.feint.seconds + T.feint.biteSeconds, dir: vec(-heading.y * side, heading.x * side) };
        detail = `bit ${nearest.id}`;
      } else detail = `read ${nearest.id}`;
    }
    this.emit('feint', carrier.id, detail);
    return true;
  }

  private setCoachIntent(cmd: Extract<MatchCommand, { type: 'coachIntent' }>): boolean {
    const T = this.tuning;
    const s = this.s;
    const p = s.players[cmd.playerId];
    if (!p || p.team !== 'home' || p.isKeeper) return this.reject('coachIntent', 'not a home outfielder');
    if (!finiteVec(cmd.target) || !Number.isFinite(cmd.seconds) || cmd.seconds <= 0) return this.reject('coachIntent', 'invalid');
    if (s.phase === 'stopped' || s.phase === 'kickoff') return this.reject('coachIntent', 'play not live');
    const target = vec(clamp(cmd.target.x, 0.5, T.pitch.length - 0.5), clamp(cmd.target.y, 0.5, T.pitch.width - 0.5));
    s.coachIntent = { playerId: p.id, kind: cmd.kind, target, until: s.simTime + Math.min(cmd.seconds, T.coach.maxIntentSeconds), possession: s.possession, source: cmd.source };
    this.emit('coachIntent', p.id, `${cmd.kind} ${cmd.source}`);
    return true;
  }

  private expireCoachIntent(): void {
    const s = this.s;
    const ci = s.coachIntent;
    if (!ci) return;
    if (s.simTime >= ci.until) this.clearCoachIntent('expired');
    else if (s.possession !== ci.possession) this.clearCoachIntent('possession changed');
    else if (s.ball.owner === ci.playerId) this.clearCoachIntent('player has the ball');
  }

  private clearCoachIntent(reason: string): void {
    const ci = this.s.coachIntent;
    if (!ci) return;
    this.s.coachIntent = null;
    this.emit('coachIntentEnd', ci.playerId, reason);
  }

  private reject(command: string, reason: string): boolean {
    this.emit('rejected', this.s.controlledId, `${command}: ${reason}`);
    return false;
  }

  private cancelAim(reason: string): void {
    const s = this.s;
    if (s.phase !== 'aiming') return;
    s.phase = 'live';
    s.aim = null;
    this.emit('aimCancel', s.controlledId, reason);
  }

  /** One ground kick for passes and shots: the ball leaves the current ball position along `direction`. */
  private userKick(direction: Vec2, power: number): void {
    const T = this.tuning;
    const s = this.s;
    const carrier = s.players[s.controlledId];
    const dir = normalize(direction);
    const speed = kickSpeed(power, T);
    const ball = s.ball.pos;
    const P = T.pitch;
    let onGoal = false;
    if (dir.x > 1e-3) {
      // A kick is a shot whenever it is on target and rolls far enough, from any range.
      const path = (P.length - ball.x) / dir.x;
      const y = ball.y + dir.y * path;
      onGoal = Math.abs(y - P.goalCenterY) <= P.goalHalfWidth + 1 && path <= (speed * speed) / (2 * T.ball.friction);
    }
    if (onGoal) {
      this.kickBall(carrier, scale(dir, speed), 'shot', null, null);
      s.stats.shots.home += 1;
      this.emit('shot', carrier.id, speed.toFixed(1));
    } else {
      // Where a ground ball of this speed slows to a receivable pace; teammates read it, nothing is redirected.
      const roll = clamp((speed * speed - T.pass.arriveSpeed * T.pass.arriveSpeed) / (2 * T.ball.friction), T.pass.minDistance, 45);
      const target = add(ball, scale(dir, roll));
      const receiver = this.nearestMate(carrier, target);
      this.kickBall(carrier, scale(dir, speed), 'pass', target, receiver);
      this.afterPass(carrier, target);
      this.emit('pass', carrier.id, receiver ?? '');
    }
    s.feint = null;
  }

  // ---- simulation -----------------------------------------------------------------------------

  private tick(h: number): void {
    const T = this.tuning;
    const s = this.s;
    s.simTime += h;
    s.phaseTime += h;
    s.swipeCooldown = Math.max(0, s.swipeCooldown - h);
    s.control = Math.min(T.control.max, s.control + T.control.regenPerSecond * h);
    if (s.feint && (s.ball.owner !== s.feint.by || s.simTime >= s.feint.until + T.feint.exitSeconds)) s.feint = null;
    if (s.feintBought && s.simTime >= s.feintBought.until) s.feintBought = null;
    s.ball.ignore = s.ball.ignore.filter((e) => e.until > s.simTime);

    this.expireCoachIntent();
    this.establishPossession();
    planTeams(this.ctx());
    this.updateUserControl();
    if (s.userSteer && (s.simTime >= s.userSteer.until || s.userSteer.epoch !== s.controlEpoch)) s.userSteer = null;
    this.aiCarrier();
    for (const id of MATCH_PLAYER_IDS) this.movePlayer(s.players[id], h);
    const prev = copy(s.ball.pos);
    this.moveBall(h);
    this.resolveContacts(prev, h);
  }

  /**
   * A possession spell is established once a team has held the ball for aimAllowance.establishSeconds.
   * Only then does the other team's aim allowance become refillable, so deflections, ownership
   * flicker and instant steals never refill it.
   */
  private establishPossession(): void {
    const T = this.tuning;
    const s = this.s;
    const o = s.ball.owner;
    if (!o) return;
    const team = s.players[o].team;
    if (s.establishedTeam === team || s.simTime - s.ownedSince < T.aimAllowance.establishSeconds - 1e-9) return;
    s.establishedTeam = team;
    s.possessionSeq += 1;
    s.allowanceRefillPending[otherTeam(team)] = true;
    if (s.allowanceRefillPending[team]) {
      s.allowanceRefillPending[team] = false;
      s.aimAllowance[team] = T.aimAllowance.seconds;
    }
    this.emit('possession', o, `established ${team} #${s.possessionSeq}`);
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
      const speed = kickSpeed(powerForSpeed(lerp(T.shot.minSpeed, T.shot.maxSpeed, clamp(d.power, 0, 1)), T) + noise(T.ai.powerNoise), T);
      this.kickBall(p, scale(dir, speed), 'shot', null, null);
      s.stats.shots[p.team] += 1;
      this.emit('shot', p.id, speed.toFixed(1));
      return;
    }
    const dist = clamp(length(raw), T.pass.minDistance, T.pass.maxDistance);
    const speed = kickSpeed(powerForSpeed(passSpeedFor(dist), T) * (1 + noise(T.ai.powerNoise)), T);
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
        desired = this.userCarrierVelocity(p, h);
        accel = T.carrier.accel;
      } else {
        desired = seek(p.pos, p.target, M.carrySpeed, 0.6);
        accel = T.dribble.accel;
      }
    } else if (p.isKeeper) {
      const k = this.keeperTarget(p);
      desired = seek(p.pos, k.target, k.speed, 0.4);
      accel = T.keeper.accel;
    } else if (s.userSteer && p.id === s.controlledId && p.team === 'home') {
      desired = scale(s.userSteer.dir, M.chaseSpeed);
      accel = M.sprintAccel;
    } else {
      desired = seek(p.pos, p.target, p.speed, p.intent === 'chase' || p.intent === 'receive' ? 0.4 : 1.5);
      if (p.intent === 'chase' || p.intent === 'press' || p.intent === 'run' || p.intent === 'recover') accel = M.sprintAccel;
    }
    const bit = s.feintBought;
    if (bit && bit.id === p.id && s.ball.owner !== p.id && s.simTime < bit.until) desired = scale(bit.dir, M.pressSpeed);
    p.vel = approach(p.vel, desired, accel * h);
    p.pos.x = clamp(p.pos.x + p.vel.x * h, 0.3, T.pitch.length - 0.3);
    p.pos.y = clamp(p.pos.y + p.vel.y * h, 0.5, T.pitch.width - 0.5);
  }

  /** Steers toward `dribbleDir` with a bounded turn rate; a sharp change slows the carrier first. */
  private userCarrierVelocity(p: MatchPlayer, h: number): MutableVec2 {
    const T = this.tuning;
    const C = T.carrier;
    const s = this.s;
    const want = normalize(s.dribbleDir);
    let top = C.speed * (want.x < -0.3 ? C.backSpeedFactor : 1);
    const f = s.feint;
    if (f && f.by === p.id) {
      if (s.simTime < f.until) top *= T.feint.speedFactor;
      else if (f.exitDir) top *= T.feint.exitSpeedFactor;
    }
    const sp = length(p.vel);
    let heading = want;
    let factor = 1;
    if (sp > 0.4) {
      const cur = normalize(p.vel);
      const angle = Math.atan2(cur.x * want.y - cur.y * want.x, cur.x * want.x + cur.y * want.y);
      const maxTurn = C.turnRate * h;
      const turn = clamp(angle, -maxTurn, maxTurn);
      heading = rotate(cur, turn);
      factor = Math.max(C.minTurnSpeedFactor, Math.cos(Math.min(Math.abs(angle - turn), Math.PI / 2)));
    }
    let vx = heading.x * top * factor;
    let vy = heading.y * top * factor;
    const P = T.pitch;
    if (vx > 0) vx *= clamp((P.length - T.dribble.stopShort - p.pos.x) / T.dribble.slowZone, 0, 1);
    if (vx < 0) vx *= clamp((p.pos.x - 1.5) / 3, 0, 1);
    if (vy > 0) vy *= clamp((P.width - 1.5 - p.pos.y) / 3, 0, 1);
    if (vy < 0) vy *= clamp((p.pos.y - 1.5) / 3, 0, 1);
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
    // Any opponent ball on target counts, whatever it was labelled (long passes, deflections), so range never skips the dive.
    const shotIncoming =
      !ball.owner && !!kick && kick.team !== team && vT.x < -0.5 && s.simTime - kick.at >= K.reactionSeconds && (kick.kind === 'shot' || this.onTarget(bT, vT));
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

  /** True if a loose ball (team coordinates, own goal line at x = 0) would roll into the goal mouth (+1 yd). */
  private onTarget(bT: Vec2, vT: Vec2): boolean {
    const P = this.tuning.pitch;
    const speed = length(vT);
    if (vT.x >= 0 || speed < 1e-6) return false;
    const t = bT.x / -vT.x;
    const y = bT.y + vT.y * t;
    return Math.abs(y - P.goalCenterY) <= P.goalHalfWidth + 1 && t * speed <= (speed * speed) / (2 * this.tuning.ball.friction);
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
    s.feint = null;
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
      s.controlSince = s.simTime;
      s.userSteer = null;
      s.dribbleDir = length(p.vel) > 0.3 && p.vel.x >= 0 ? normalize(p.vel) : vec(1, 0);
      this.emit('control', p.id, '');
    }
    if (changed) {
      // Aim allowance accounting happens in establishPossession(), not on first touch.
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
    s.feint = null;
    s.timeScale = 1;
    s.stoppage = { reason, scorer, detail, restartTeam, spot: copy(spot), until: reason === 'goal' ? T.stoppage.goalSeconds : T.stoppage.outSeconds };
    s.ball.vel = vec(0, 0);
    if (s.coachIntent) this.clearCoachIntent('play stopped');
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
      pauseReasons: { user: false, coach: false },
      coachIntent: null,
      simTime: 0,
      realTime: 0,
      phaseTime: 0,
      timeScale: 1,
      players,
      ball: { pos: vec(T.pitch.length / 2, T.pitch.goalCenterY), vel: vec(0, 0), owner: null, kick: null, ignore: [], lastTouch: 'home' },
      formations: { ...formations },
      possession: 'home',
      controlledId: 'H8',
      controlSince: 0,
      userSteer: null,
      possessionSeq: 0,
      establishedTeam: null,
      controlEpoch: 0,
      aim: null,
      aimAllowance: { home: T.aimAllowance.seconds, away: T.aimAllowance.seconds },
      allowanceRefillPending: { home: false, away: false },
      control: T.control.max,
      swipeCooldown: 0,
      dribbleDir: vec(1, 0),
      feint: null,
      feintReadyAt: 0,
      feintBought: null,
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
      clock: this.halfSeconds ? { half: 1, elapsed: 0, halfSeconds: this.halfSeconds } : null,
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

function finiteVec(v: Vec2): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y);
}

/** The single kick-speed mapping used by user and AI kicks (ground balls only). */
export function kickSpeed(power: number, T: MatchTuning = MATCH_TUNING): number {
  const p = Number.isFinite(power) ? clamp(power, 0, 1) : 0;
  return lerp(T.kick.minSpeed, T.kick.maxSpeed, p);
}

export function powerForSpeed(speed: number, T: MatchTuning = MATCH_TUNING): number {
  return clamp((speed - T.kick.minSpeed) / (T.kick.maxSpeed - T.kick.minSpeed), 0, 1);
}
