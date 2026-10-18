import type { Vec2 } from '../vec';
import {
  add,
  clamp,
  copy,
  distance,
  distanceToSegment,
  length,
  lerp,
  normalize,
  rotate,
  scale,
  sub,
  vec,
  type MutableVec2,
  approachInPlace,
  seekInto,
} from '../math';
import { createRng } from '../rng';
import { DEFAULT_FORMATION, FORMATIONS, roleDef, type FormationId } from './formations';
import { MATCH_TUNING, type MatchTuning } from './tuning';
import { planUserPass } from './predict';
import { TacticalDirector, type TacticsMode } from './tacticalDirector';
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
import type { PadAction, PadState, PassScan, PlayerAttrs } from './types';

export type MatchCommand =
  | { readonly type: 'padMove'; readonly x: number; readonly y: number }
  | { readonly type: 'padPress'; readonly id: number; readonly action: PadAction }
  | { readonly type: 'padRelease'; readonly id: number; readonly action: PadAction }
  | { readonly type: 'padCancel'; readonly id: number; readonly reason: string }
  | { readonly type: 'pause' }
  | { readonly type: 'resume' }
  | { readonly type: 'reset'; readonly seed?: number }
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
  /** Per-player movement attributes (multipliers, clamped to tuning.pad.attrRange); missing = 1. */
  readonly attributes?: Partial<Record<MatchPlayerId, Partial<PlayerAttrs>>>;
  /** Computer-player tactics: 'v05' runs the v0.5 decision engine for attacking possessions (tacticalDirector.ts). */
  readonly tactics?: TacticsMode;
}

const MAX_EVENTS = 40;

/**
 * 9v9 team-play sandbox: 18 players, two goals, one ball. Home is the user's team (controls the
 * carrier with the M2 gestures), away is AI. Deterministic for a seed, a sequence of step durations
 * and commands: the fixed step (tuning.stepSeconds) decides every outcome, never the frame rate.
 */
/** Desired velocity, acceleration and optional speed cap for the controlled player this step. */
interface PadVelocity {
  desired: MutableVec2;
  accel: number;
  cap: number | undefined;
}

export class MatchSim {
  readonly tuning: MatchTuning;
  readonly tactics: TacticalDirector;
  private readonly seed: number;
  private rng: () => number;
  private s: MatchState;
  private accumulator = 0;
  private seq = 0;
  private readonly halfSeconds: number | null;

  /**
   * Last assisted-pass target search, for live debugging (?debug&passlog). Pre-allocated and overwritten in place;
   * never read by the simulation itself.
   */
  readonly passScan: PassScan = {
    aimX: 0,
    aimY: 0,
    count: 0,
    chosen: null,
    entries: Array.from({ length: 9 }, () => ({ id: 'H1' as MatchPlayerId, angle: 0, perp: 0, dist: 0, score: 0, inCone: false })),
  };
  /** Per-step scratch vectors (overwritten in place; never stored in state). */
  private readonly focusScratch: MutableVec2 = { x: 0, y: 0 };
  private readonly keeperRes = { target: { x: 0, y: 0 } as MutableVec2, speed: 0 };
  private readonly kbT: MutableVec2 = { x: 0, y: 0 };
  private readonly kvT: MutableVec2 = { x: 0, y: 0 };
  private readonly kgT: MutableVec2 = { x: 0, y: 0 };
  private readonly padVel: PadVelocity = { desired: { x: 0, y: 0 }, accel: 0, cap: undefined };
  private readonly desired: MutableVec2 = { x: 0, y: 0 };
  private readonly mePrev: MutableVec2 = { x: 0, y: 0 };
  private readonly ballPrev: MutableVec2 = { x: 0, y: 0 };
  private readonly aiCtx: AiContext = { s: null as unknown as MatchState, T: MATCH_TUNING, rng: () => 0 };
  private readonly attrOverrides: Partial<Record<MatchPlayerId, Partial<PlayerAttrs>>>;

  constructor(options: MatchSimOptions = {}) {
    this.tuning = options.tuning ?? MATCH_TUNING;
    this.tactics = new TacticalDirector(options.tactics ?? 'classic', this.tuning);
    (this.aiCtx as { T: MatchTuning }).T = this.tuning;
    this.attrOverrides = { ...(options.attributes ?? {}) };
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
        this.padReset('paused');
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
        // A seeded reset (Gameplay Lab) replays a fresh sim exactly: the RNG is reseeded before the state is built.
        if (cmd.seed !== undefined) {
          this.rng = createRng(cmd.seed);
          this.seq = 0;
        }
        this.s = this.createState({ ...s.formations });
        this.accumulator = 0;
        if (cmd.seed === undefined) this.rng = createRng(this.seed + this.s.events.length + Math.round(s.simTime * 1000));
        this.emit('reset', null, this.s.clock ? 'new match' : 'sandbox reset');
        return true;
      case 'setFormation':
        return this.setFormation(cmd.team, cmd.formation);
      case 'padMove':
        return this.padMove(cmd.x, cmd.y);
      case 'padPress':
        return this.padPress(cmd.id, cmd.action);
      case 'padRelease':
        return this.padRelease(cmd.id, cmd.action);
      case 'padCancel':
        return this.padCancel(cmd.id, cmd.reason);
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
    this.padReset(label);
    if (s.coachIntent) this.clearCoachIntent(label);
    s.stoppage = null;
    zero(s.ball.vel);
    s.ball.kick = null;
    for (const p of Object.values(s.players)) zero(p.vel);
    s.phase = c.half === 1 ? 'halftime' : 'fulltime';
    s.phaseTime = 0;
    s.timeScale = 0;
    this.accumulator = 0;
    this.emit(c.half === 1 ? 'halftime' : 'fulltime', null, `${s.score.home}-${s.score.away}`);
  }

  private startSecondHalf(): boolean {
    const s = this.s;
    if (s.phase !== 'halftime' || !s.clock || s.paused) return false;
    s.clock.half = 2;
    s.clock.elapsed = 0;
    this.placeForKickoff('away');
    s.phase = 'kickoff';
    s.phaseTime = 0;
    s.timeScale = 1;
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
    if (s.phase !== 'live') return;
    const kick = s.ball.kick;
    if (!owner && kick && kick.team === 'home' && kick.kind !== 'touch') return;
    const pick = owner ? s.defense.home.presserId : s.chaser.home.id;
    if (!pick || pick === s.controlledId || s.players[pick].isKeeper) return;
    if (s.simTime - s.controlSince < T.offBall.minHoldSeconds) return;
    // A slide or block in progress is never handed to another player.
    if (s.pad.phase !== 'ready') return;
    // Never bounce straight back.
    if (pick === s.prevControlledId && s.simTime - s.controlSince < T.offBall.returnHoldSeconds) return;
    this.setControl(pick, owner ? 'defend' : 'loose ball');
  }

  private setControl(id: MatchPlayerId, why: string): void {
    const s = this.s;
    s.controlEpoch += 1;
    if (s.controlledId !== id) s.prevControlledId = s.controlledId;
    s.controlledId = id;
    s.controlSince = s.simTime;
    this.emit('control', id, why);
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




  // ---- joystick + four-button controls (controls=pad) --------------------------------------------

  private attrsFor(id: MatchPlayerId): PlayerAttrs {
    const R = this.tuning.pad.attrRange;
    const o = this.attrOverrides[id] ?? {};
    const f = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, R.min, R.max) : 1);
    return { pace: f(o.pace), accel: f(o.accel), agility: f(o.agility), control: f(o.control) };
  }

  /** Late attribute source (e.g. a career save loaded after the sim was built); values are clamped like constructor ones. */
  setPlayerAttrs(id: MatchPlayerId, attrs: Partial<PlayerAttrs>): boolean {
    const p = this.s.players[id];
    if (!p || typeof attrs !== 'object' || attrs === null) return false;
    this.attrOverrides[id] = { ...attrs };
    p.attrs = this.attrsFor(id);
    return true;
  }

  private newPad(): PadState {
    return {
      stick: vec(0, 0), facing: vec(1, 0), phase: 'ready', braking: false,
      jockeying: false, actor: null, since: 0, epoch: -1, ownedSince: -1, chargeStart: 0,
      receiver: null, locked: null, slideDir: null, ballTouchedAt: null, bodyResolved: false, lastCmdId: 0, readyAt: 0,
    };
  }

  /** Which of the four buttons the authoritative state allows right now (brief §10). */
  padAvailability(): Record<PadAction, boolean> {
    const s = this.s;
    const none = { pass: false, shoot: false, slide: false, block: false };
    if (s.paused || s.phase !== 'live') return none;
    const me = s.players[s.controlledId];
    if (!me || me.team !== 'home' || me.isKeeper) return none;
    const ph = s.pad.phase;
    const cool = s.simTime >= s.pad.readyAt;
    const owner = s.ball.owner ? s.players[s.ball.owner] : null;
    if (owner?.id === me.id) {
      return { pass: cool && (ph === 'ready' || ph === 'chargingPass'), shoot: cool && (ph === 'ready' || ph === 'chargingShoot'), slide: false, block: false };
    }
    if (owner && owner.team === 'home') return none;
    const free = cool && ph === 'ready';
    return { pass: false, shoot: false, slide: free, block: free || ph === 'blocking' };
  }

  /** Neutral-aim target for shots: the goal this team attacks (ends never switch in this engine). */
  attackingGoal(team: TeamId): MutableVec2 {
    return toWorld(team, vec(this.tuning.pitch.length, this.tuning.pitch.goalCenterY), this.tuning);
  }

  private padMove(x: number, y: number): boolean {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return this.reject('padMove', 'non-finite');
    const m = Math.hypot(x, y);
    const k = m > 1 ? 1 / m : 1;
    this.s.pad.stick = vec(x * k, y * k);
    return true;
  }

  private padCmdId(id: number, what: string): boolean {
    const pad = this.s.pad;
    if (!Number.isSafeInteger(id) || id <= pad.lastCmdId) return this.reject(what, 'stale or duplicate command');
    pad.lastCmdId = id;
    return true;
  }

  private padPress(id: number, action: PadAction): boolean {
    if (!this.padCmdId(id, 'padPress')) return false;
    const s = this.s;
    const pad = s.pad;
    if (!(['pass', 'shoot', 'slide', 'block'] as const).includes(action)) return this.reject('padPress', 'unknown action');
    if (pad.phase !== 'ready' || !this.padAvailability()[action]) return this.reject('padPress', `${action} unavailable`);
    const me = s.players[s.controlledId];
    pad.actor = me.id;
    pad.since = s.simTime;
    pad.epoch = s.controlEpoch;
    pad.ownedSince = s.ownedSince;
    pad.locked = null;
    pad.receiver = null;
    if (action === 'pass' || action === 'shoot') {
      pad.phase = action === 'pass' ? 'chargingPass' : 'chargingShoot';
      pad.chargeStart = s.simTime;
      if (action === 'pass') pad.receiver = this.pickReceiver(me, null);
    } else if (action === 'block') {
      pad.phase = 'blocking';
      this.emit('block', me.id, 'start');
    } else {
      pad.phase = 'slideStart';
      pad.slideDir = length(pad.stick) > 0.2 ? normalize(pad.stick) : copy(pad.facing);
      pad.ballTouchedAt = null;
      pad.bodyResolved = false;
      this.emit('slide', me.id, 'start');
    }
    this.emit('padPress', me.id, action);
    return true;
  }

  private padRelease(id: number, action: PadAction): boolean {
    if (!this.padCmdId(id, 'padRelease')) return false;
    const s = this.s;
    const pad = s.pad;
    const T = this.tuning.pad;
    if (action === 'block') {
      if (pad.phase !== 'blocking') return false;
      this.emit('block', pad.actor, 'end');
      this.padToReady(0);
      return true;
    }
    if (action !== 'pass' && action !== 'shoot') return false;
    if (pad.phase !== (action === 'pass' ? 'chargingPass' : 'chargingShoot')) return this.reject('padRelease', 'not charging');
    if (!this.padKickValid()) {
      this.padReset('possession lost');
      return false;
    }
    const me = s.players[pad.actor!];
    const P = action === 'pass' ? T.passPower : T.shotPower;
    const full = action === 'pass' ? T.passChargeSeconds : T.shotChargeSeconds;
    const power = lerp(P.min, P.max, clamp((s.simTime - pad.chargeStart) / full, 0, 1));
    let dir: Vec2;
    if (length(pad.stick) > 0) dir = normalize(pad.stick);
    else if (action === 'shoot') dir = normalize(sub(this.attackingGoal('home'), s.ball.pos));
    else dir = copy(pad.facing);
    const receiver = action === 'pass' ? this.pickReceiver(me, pad.receiver) : null;
    pad.locked = { kind: action === 'pass' ? 'pass' : 'shot', dir, power, receiver };
    pad.receiver = receiver;
    pad.phase = 'kickPrep';
    pad.since = s.simTime;
    this.emit('padRelease', me.id, `${action} ${power.toFixed(2)}`);
    return true;
  }

  /** Pointer cancel, lost focus, layout rebuild: never a kick. */
  private padCancel(id: number, reason: string): boolean {
    if (!this.padCmdId(id, 'padCancel')) return false;
    const ph = this.s.pad.phase;
    if (ph !== 'chargingPass' && ph !== 'chargingShoot' && ph !== 'kickPrep' && ph !== 'blocking') return false;
    this.padReset(String(reason).slice(0, 40));
    return true;
  }

  private padKickValid(): boolean {
    const s = this.s;
    const pad = s.pad;
    return !!pad.actor && s.ball.owner === pad.actor && s.controlledId === pad.actor && s.controlEpoch === pad.epoch && s.ownedSince === pad.ownedSince;
  }

  private padToReady(cooldown: number): void {
    const pad = this.s.pad;
    pad.phase = 'ready';
    pad.actor = null;
    pad.locked = null;
    pad.receiver = null;
    pad.slideDir = null;
    pad.readyAt = this.s.simTime + cooldown;
  }

  private padReset(reason: string): void {
    const pad = this.s.pad;
    if (pad.phase === 'ready') return;
    this.emit('padCancel', pad.actor, `${pad.phase}: ${reason}`);
    this.padToReady(0);
  }

  private tickPad(h: number): void {
    const s = this.s;
    const pad = s.pad;
    const T = this.tuning.pad;
    const S = T.slide;
    const me = s.players[s.controlledId];
    const sliding = pad.phase === 'slideStart' || pad.phase === 'slideActive' || pad.phase === 'slideRecovery';
    if (pad.phase === 'blocking') {
      const tx = s.ball.pos.x - me.pos.x;
      const ty = s.ball.pos.y - me.pos.y;
      const tl = Math.sqrt(tx * tx + ty * ty);
      if (tl > 0.05) turnTowardInto(pad.facing, tx / tl, ty / tl, T.blockTurnRate * h);
    } else if (!sliding && length(me.vel) > 0.5) {
      const vl = length(me.vel);
      pad.facing.x = me.vel.x / vl;
      pad.facing.y = me.vel.y / vl;
    }
    const t = s.simTime - pad.since;
    switch (pad.phase) {
      case 'chargingPass':
      case 'chargingShoot':
        if (!this.padKickValid()) return this.padReset('possession lost');
        if (pad.phase === 'chargingPass') pad.receiver = this.pickReceiver(me, pad.receiver);
        return;
      case 'kickPrep':
        if (!this.padKickValid()) return this.padReset('possession lost');
        if (t >= T.prepSeconds - 1e-9) this.padContact();
        return;
      case 'kickRecovery':
        if (t >= T.recoverySeconds - 1e-9) this.padToReady(0);
        return;
      case 'blocking':
        if (pad.actor !== s.controlledId || pad.epoch !== s.controlEpoch) return this.padReset('control changed');
        if (s.ball.owner === pad.actor) {
          this.emit('block', pad.actor, 'gained possession');
          this.padToReady(0);
        }
        return;
      case 'slideStart':
        if (pad.actor !== s.controlledId) return this.padToReady(S.cooldownSeconds);
        if (t >= S.startSeconds - 1e-9) {
          pad.phase = 'slideActive';
          pad.since = s.simTime;
        }
        return;
      case 'slideActive':
        if (pad.actor !== s.controlledId) return this.padToReady(S.cooldownSeconds);
        if (pad.slideDir && length(pad.stick) > 0.2) {
          const sl = length(pad.stick);
          turnTowardInto(pad.slideDir, pad.stick.x / sl, pad.stick.y / sl, S.steerRate * h);
        }
        if (t >= S.activeSeconds - 1e-9) {
          pad.phase = 'slideRecovery';
          pad.since = s.simTime;
        }
        return;
      case 'slideRecovery':
        if (t >= S.recoverySeconds - 1e-9) {
          this.emit('slide', pad.actor, 'recovered');
          this.padToReady(S.cooldownSeconds);
        }
        return;
      default:
        return;
    }
  }

  /** The single ball-contact moment of a pad kick: possession and reach are checked again here. */
  private padContact(): void {
    const s = this.s;
    const pad = s.pad;
    const T = this.tuning.pad;
    const L = pad.locked;
    const me = pad.actor ? s.players[pad.actor] : null;
    if (!L || !me) return this.padReset('nothing locked');
    if (distance(me.pos, s.ball.pos) > T.contactReach) return this.padReset('ball out of reach');
    const speed = kickSpeed(L.power, this.tuning);
    let dir: Vec2 = L.dir;
    if (L.kind === 'pass') {
      const r = L.receiver ? s.players[L.receiver] : null;
      if (r) {
        // Intercept: where the receiver's current run meets a ball at this speed (fixed iterations, no allocation in the loop).
        let tx = r.pos.x + r.vel.x * T.leadSeconds;
        let ty = r.pos.y + r.vel.y * T.leadSeconds;
        for (let i = 0; i < 3; i++) {
          const t = Math.min(2, Math.hypot(tx - s.ball.pos.x, ty - s.ball.pos.y) / Math.max(1, speed));
          tx = r.pos.x + r.vel.x * t;
          ty = r.pos.y + r.vel.y * t;
        }
        dir = turnToward(L.dir, normalize(vec(tx - s.ball.pos.x, ty - s.ball.pos.y)), T.leadLockAngle);
      }
      const plan = planUserPass(s, me.id, s.ball.pos, dir, speed, this.tuning);
      const receiver = plan.reachable ? plan.receiver : (L.receiver ?? plan.receiver);
      this.kickBall(me, scale(dir, speed), 'pass', plan.target, receiver);
      this.afterPass(me, plan.target);
      this.emit('pass', me.id, receiver ?? '');
    } else {
      const misalign = (1 - dot2(pad.facing, L.dir)) / 2;
      const err = T.shotErrorMax * (0.25 + 0.75 * this.pressureOn(me)) * (1 + misalign) * (2 - me.attrs.control);
      dir = rotate(L.dir, (this.rng() * 2 - 1) * err);
      this.kickBall(me, scale(dir, speed), 'shot', null, null);
      s.stats.shots.home += 1;
      this.emit('shot', me.id, speed.toFixed(1));
    }
    pad.phase = 'kickRecovery';
    pad.since = s.simTime;
    pad.locked = null;
    pad.receiver = null;
  }

  private pressureOn(p: MatchPlayer): number {
    let d = Infinity;
    for (const id of TEAM_PLAYER_IDS[otherTeam(p.team)]) d = Math.min(d, distance(this.s.players[id].pos, p.pos));
    return clamp(1 - d / this.tuning.pad.pressureRadius, 0, 1);
  }

  /** Receiver by intended direction first, then distance; a highlighted receiver is kept unless clearly beaten. */
  private pickReceiver(me: MatchPlayer, current: MatchPlayerId | null): MatchPlayerId | null {
    const s = this.s;
    const T = this.tuning.pad;
    const aim = length(s.pad.stick) > 0 ? normalize(s.pad.stick) : s.pad.facing;
    const scan = this.passScan;
    const score = (id: MatchPlayerId, record: boolean): number | null => {
      const p = s.players[id];
      if (id === me.id || p.team !== me.team || p.isKeeper) return null;
      const dx = p.pos.x - s.ball.pos.x;
      const dy = p.pos.y - s.ball.pos.y;
      const dist = Math.hypot(dx, dy);
      const ang = dist > 0 ? Math.acos(clamp((dx * aim.x + dy * aim.y) / dist, -1, 1)) : 0;
      // Yards from the stick's line plus distance from the passer.
      const perp = dist * Math.sin(ang);
      const inCone = dist >= T.receiverMinRange && dist <= T.receiverMaxRange && ang <= T.receiverCone;
      const v = perp / T.receiverLineYards + (0.35 * dist) / T.receiverMaxRange;
      if (record && scan.count < scan.entries.length) {
        const e = scan.entries[scan.count++]!;
        e.id = id;
        e.angle = ang;
        e.perp = perp;
        e.dist = dist;
        e.score = v;
        e.inCone = inCone;
      }
      return inCone ? v : null;
    };
    scan.aimX = aim.x;
    scan.aimY = aim.y;
    scan.count = 0;
    let best: MatchPlayerId | null = null;
    let bestScore = Infinity;
    for (const id of TEAM_PLAYER_IDS[me.team]) {
      const v = score(id, true);
      if (v !== null && v < bestScore) {
        best = id;
        bestScore = v;
      }
    }
    if (current) {
      const c = score(current, false);
      if (c !== null && c <= bestScore + T.receiverStickiness) best = current;
    }
    scan.chosen = best;
    return best;
  }

  /** Stick-driven velocity for the controlled player: pace caps speed, acceleration and agility shape how it is reached. */
  /**
   * Jockey: hold a point goal-side of the opponent carrier (mirroring their run a beat ahead), shaded by the stick,
   * never closer than the gap, at no more than the carrier's speed. Null when no opponent carrier is in range.
   */
  private jockeyVelocity(p: MatchPlayer): PadVelocity | null {
    const s = this.s;
    const pad = s.pad;
    const T = this.tuning;
    const J = T.pad.jockey;
    const owner = s.ball.owner ? s.players[s.ball.owner] : null;
    if (!owner || owner.team === p.team || distance(owner.pos, p.pos) > J.radius) {
      pad.jockeying = false;
      return null;
    }
    pad.jockeying = true;
    const P = T.pitch;
    const goalX = p.team === 'home' ? 0 : P.length;
    const goalY = p.team === 'home' ? P.goalCenterY : P.width - P.goalCenterY;
    const cx = owner.pos.x + owner.vel.x * J.lookahead;
    const cy = owner.pos.y + owner.vel.y * J.lookahead;
    let gx = goalX - cx;
    let gy = goalY - cy;
    const gl = Math.hypot(gx, gy) || 1;
    gx /= gl;
    gy /= gl;
    // Stick shades the line sideways only (perpendicular to carrier→goal), so pushing at the carrier can't overcommit.
    const side = pad.stick.x * -gy + pad.stick.y * gx;
    const tx = cx + gx * J.gap + -gy * side * J.stickShade;
    const ty = cy + gy * J.gap + gx * side * J.stickShade;
    let dx = (tx - p.pos.x) * J.gain;
    let dy = (ty - p.pos.y) * J.gain;
    const cap = Math.min(T.movement.chaseSpeed * p.attrs.pace, Math.max(J.minSpeed, length(owner.vel)));
    const want = Math.hypot(dx, dy);
    if (want > cap) {
      dx *= cap / want;
      dy *= cap / want;
    }
    return this.padResult(dx, dy, T.movement.sprintAccel * p.attrs.accel * p.attrs.agility, cap);
  }

  /** Fills the single reused movement result (callers read it before the next call). */
  private padResult(dx: number, dy: number, accel: number, cap?: number): PadVelocity {
    const r = this.padVel;
    r.desired.x = dx;
    r.desired.y = dy;
    r.accel = accel;
    r.cap = cap;
    return r;
  }

  private padVelocity(p: MatchPlayer): PadVelocity {
    const s = this.s;
    const T = this.tuning;
    const pad = s.pad;
    const A = p.attrs;
    const S = T.pad.slide;
    const mine = pad.actor === p.id;
    if (mine && pad.phase === 'slideActive' && pad.slideDir) {
      const k = Math.min(S.speed, T.movement.chaseSpeed) * A.pace;
      return this.padResult(pad.slideDir.x * k, pad.slideDir.y * k, 60);
    }
    if (mine && pad.phase === 'slideStart' && pad.slideDir) {
      const k = Math.max(length(p.vel), T.movement.chaseSpeed * 0.6);
      return this.padResult(pad.slideDir.x * k, pad.slideDir.y * k, 30);
    }
    if (mine && pad.phase === 'slideRecovery') return this.padResult(0, 0, 25);
    const carrying = s.ball.owner === p.id;
    let top = (carrying ? T.carrier.speed * (0.85 + 0.15 * A.control) : T.movement.chaseSpeed) * A.pace;
    if (p.id === s.controlledId && pad.phase !== 'blocking') pad.jockeying = false;
    if (mine && pad.phase === 'blocking') {
      const j = this.jockeyVelocity(p);
      if (j) return j;
      top *= T.pad.blockSpeedFactor;
    }
    const desired = this.padResult(pad.stick.x * top, pad.stick.y * top, 0).desired;
    if (carrying) {
      if (length(pad.stick) > 0.05) {
        const sl = length(pad.stick);
        s.dribbleDir.x = pad.stick.x / sl;
        s.dribbleDir.y = pad.stick.y / sl;
      }
      const P = T.pitch;
      if (desired.x > 0) desired.x *= clamp((P.length - T.dribble.stopShort - p.pos.x) / T.dribble.slowZone, 0, 1);
      if (desired.x < 0) desired.x *= clamp((p.pos.x - 1.5) / 3, 0, 1);
      if (desired.y > 0) desired.y *= clamp((P.width - 1.5 - p.pos.y) / 3, 0, 1);
      if (desired.y < 0) desired.y *= clamp((p.pos.y - 1.5) / 3, 0, 1);
    }
    const base = (carrying ? T.carrier.accel : T.movement.sprintAccel) * A.accel;
    const v = length(p.vel);
    const want = length(desired);
    const L = T.pad.locomotion;
    // pad.actor is only set while a button is held; locomotion applies to the controlled player always.
    const user = p.id === s.controlledId;
    const m = length(pad.stick);
    // 0 = close control, 1 = running; blended between the two stick bands.
    const band = clamp((m - L.closeControlMax) / (L.runMin - L.closeControlMax), 0, 1);
    let accel = base;
    if (v > 0.5 && want > 0.1) {
      const cos = dot2(p.vel, desired) / (v * want);
      // Momentum: a sharp reversal at running pace brakes (agility shortens it) before accelerating the new way.
      if (user && cos < L.brakeCos && v > top * L.brakeMinSpeedFrac * Math.max(band, 0.01)) pad.braking = true;
      if (pad.braking && user && v > top * L.brakeDoneFrac && cos < 0) return this.padResult(0, 0, L.brakeAccel * A.agility * A.accel);
      pad.braking = false;
      // Nearly stopped (e.g. after a brake): turning is free, momentum no longer applies.
      const turn = v < top * L.brakeDoneFrac * 1.5 ? 0 : (1 - cos) / 2;
      const factor = lerp(L.closeTurnFactor, L.runTurnFactor, band);
      accel = base * Math.max(0.15, 1 - T.pad.agilityTurnPenalty * factor * turn * (2 - A.agility));
    } else if (user) pad.braking = false;
    this.padVel.accel = accel;
    return this.padVel;
  }

  /**
   * Slide and block contacts along this tick's swept paths, before goals and ordinary interceptions.
   * Returns the ball's new sweep origin after a deflection, 'stopped' after a foul, else null.
   */
  private resolvePadContacts(me: MatchPlayer, mePrev: Vec2, ballPrev: Vec2): Vec2 | 'stopped' | null {
    const s = this.s;
    const pad = s.pad;
    const T = this.tuning.pad;
    const S = T.slide;
    const ball = s.ball;
    if (pad.actor !== me.id) return null;
    if (pad.phase === 'slideActive' && !pad.bodyResolved && pad.slideDir) {
      type Hit = { at: number; q: MatchPlayer | null };
      const hits: Hit[] = [];
      const owner = ball.owner ? s.players[ball.owner] : null;
      const rel0 = sub(ballPrev, mePrev);
      const rel1 = sub(ball.pos, me.pos);
      const origin = vec(0, 0);
      if (pad.ballTouchedAt === null && owner?.team !== me.team && distanceToSegment(origin, rel0, rel1) <= S.ballReach) {
        const t = clamp(along(rel0, rel1, origin), 0, 1);
        const at = vec(ballPrev.x + (ball.pos.x - ballPrev.x) * t, ballPrev.y + (ball.pos.y - ballPrev.y) * t);
        hits.push({ at: along(mePrev, me.pos, at), q: null });
      }
      for (const id of TEAM_PLAYER_IDS[otherTeam(me.team)]) {
        const q = s.players[id];
        if (distanceToSegment(q.pos, mePrev, me.pos) <= S.bodyReach) hits.push({ at: along(mePrev, me.pos, q.pos), q });
      }
      hits.sort((a, b) => a.at - b.at);
      for (const hit of hits) {
        if (!hit.q) {
          pad.ballTouchedAt = s.simTime;
          const carried = owner ? copy(owner.vel) : copy(ball.vel);
          if (owner) {
            s.tackleBan[owner.id] = s.simTime + this.tuning.tackle.loserBanSeconds;
            s.beatenUntil[owner.id] = s.simTime + this.tuning.tackle.beatenSeconds;
          }
          ball.owner = null;
          setXY(ball.vel, pad.slideDir.x * S.pokeSpeed + carried.x * 0.3, pad.slideDir.y * S.pokeSpeed + carried.y * 0.3);
          ball.kick = { by: me.id, team: me.team, kind: 'touch', at: s.simTime, target: null, receiver: null };
          ball.lastTouch = me.team;
          ball.ignore.push({ id: me.id, until: s.simTime + S.sliderIgnoreSeconds });
          this.emit('slide', me.id, owner ? `ball poked from ${owner.id}` : 'ball touched');
          continue;
        }
        pad.bodyResolved = true;
        const clean = pad.ballTouchedAt !== null && s.simTime - pad.ballTouchedAt <= S.cleanWindow;
        if (clean) {
          s.beatenUntil[hit.q.id] = s.simTime + this.tuning.tackle.beatenSeconds;
          this.emit('slide', me.id, `clean contact ${hit.q.id}`);
          break;
        }
        this.emit('foul', me.id, `slide on ${hit.q.id}`);
        this.stop('foul', null, `foul by ${me.id} on ${hit.q.id}`, otherTeam(me.team), hit.q.pos);
        return 'stopped';
      }
      return null;
    }
    if (pad.phase === 'blocking' && !ball.owner) {
      const speed = length(ball.vel);
      if (speed < 0.5 || ball.kick?.team === me.team) return null;
      const n = pad.facing;
      if (dot2(ball.vel, n) >= 0) return null;
      const c = add(me.pos, scale(n, T.blockDepth));
      const side = vec(-n.y, n.x);
      const a = sub(c, scale(side, T.blockHalfWidth));
      const b = add(c, scale(side, T.blockHalfWidth));
      const near = Math.min(
        distanceToSegment(ballPrev, a, b),
        distanceToSegment(ball.pos, a, b),
        distanceToSegment(a, ballPrev, ball.pos),
        distanceToSegment(b, ballPrev, ball.pos),
      );
      const t = clamp(along(ballPrev, ball.pos, c), 0, 1);
      const hit = segmentHit(ballPrev, ball.pos, a, b) ?? (near <= T.blockBallRadius ? vec(ballPrev.x + (ball.pos.x - ballPrev.x) * t, ballPrev.y + (ball.pos.y - ballPrev.y) * t) : null);
      if (!hit) return null;
      const vn = dot2(ball.vel, n);
      setXY(ball.vel, (ball.vel.x - n.x * (2 * vn)) * T.blockRestitution, (ball.vel.y - n.y * (2 * vn)) * T.blockRestitution);
      setXY(ball.pos, hit.x + n.x * 0.25, hit.y + n.y * 0.25);
      ball.kick = { by: me.id, team: me.team, kind: 'touch', at: s.simTime, target: null, receiver: null };
      ball.lastTouch = me.team;
      if (speed > T.blockHardSpeed) ball.ignore.push({ id: me.id, until: s.simTime + T.blockIgnoreSeconds });
      this.emit('deflect', me.id, speed.toFixed(1));
      return copy(ball.pos);
    }
    return null;
  }

  // ---- simulation -----------------------------------------------------------------------------

  private tick(h: number): void {
    const T = this.tuning;
    const s = this.s;
    s.simTime += h;
    s.phaseTime += h;
    s.control = Math.min(T.control.max, s.control + T.control.regenPerSecond * h);
    const ig = s.ball.ignore;
    let keep = 0;
    for (let i = 0; i < ig.length; i++) if (ig[i]!.until > s.simTime) ig[keep++] = ig[i]!;
    ig.length = keep;

    this.expireCoachIntent();
    this.establishPossession();
    this.releaseMissedReceiver();
    this.updatePressRead(h);
    planTeams(this.ctx());
    this.tactics.plan(s);
    this.updateUserControl();
    this.tickPad(h);
    this.aiCarrier();
    const me = s.players[s.controlledId];
    const mePrev = this.mePrev;
    mePrev.x = me.pos.x;
    mePrev.y = me.pos.y;
    for (const id of MATCH_PLAYER_IDS) this.movePlayer(s.players[id], h);
    let prev: Vec2 = this.ballPrev;
    this.ballPrev.x = s.ball.pos.x;
    this.ballPrev.y = s.ball.pos.y;
    this.moveBall(h);
    {
      const r = this.resolvePadContacts(me, mePrev, prev);
      if (r === 'stopped') return;
      if (r) prev = r;
    }
    this.resolveContacts(prev, h);
  }

  /** A possession spell is established once a team has held the ball for possessionEstablishSeconds. */
  private establishPossession(): void {
    const T = this.tuning;
    const s = this.s;
    const o = s.ball.owner;
    if (!o) return;
    const team = s.players[o].team;
    if (s.establishedTeam === team || s.simTime - s.ownedSince < T.possessionEstablishSeconds - 1e-9) return;
    s.establishedTeam = team;
    s.possessionSeq += 1;
    this.emit('possession', o, `established ${team} #${s.possessionSeq}`);
  }

  /**
   * Once a pass rolls clearly past its meeting point the named receiver has missed it: the ball
   * becomes an ordinary loose ball so the normal chaser logic (both teams) goes after it.
   */
  private releaseMissedReceiver(): void {
    const s = this.s;
    const k = s.ball.kick;
    if (s.ball.owner || !k || k.kind !== 'pass' || !k.receiver || !k.target) return;
    const b = s.ball;
    const dx = b.pos.x - k.target.x;
    const dy = b.pos.y - k.target.y;
    const past = dx * b.vel.x + dy * b.vel.y > 0 && Math.hypot(dx, dy) > this.tuning.receive.radius * 2;
    const stopped = Math.hypot(b.vel.x, b.vel.y) < 0.05;
    if (!past && !stopped) return;
    b.kick = { ...k, receiver: null };
    this.emit('rejected', k.receiver, 'receive: missed');
  }

  private ctx(): AiContext {
    const c = this.aiCtx as { s: MatchState; T: MatchTuning; rng: () => number };
    c.s = this.s;
    c.rng = this.rng;
    return this.aiCtx;
  }

  /** Opponent carriers and both keepers decide on a bounded cadence after a reaction delay. */
  private aiCarrier(): void {
    const T = this.tuning;
    const s = this.s;
    const id = s.ball.owner;
    if (!id) return;
    const p = s.players[id];
    if (p.team === 'home' && !p.isKeeper) return;
    if (this.tactics.ownsCarrier(s, p)) return this.tacticalCarrier(p);
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
      p.target.x = d.target.x;
      p.target.y = d.target.y;
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
    const speed = kickSpeed(powerForSpeed(passSpeedFor(dist, T), T) * (1 + noise(T.ai.powerNoise)), T);
    const target = add(s.ball.pos, scale(dir, dist));
    this.kickBall(p, scale(dir, speed), p.isKeeper && d.why === 'long' ? 'clearance' : 'pass', target, d.receiver === p.id ? null : d.receiver);
    this.afterPass(p, target);
    this.emit(p.isKeeper ? 'distributed' : 'pass', p.id, `${d.receiver} ${d.why}`);
  }

  /** v0.5 carrier: carry toward the engine's target, or execute its PASS/SHOOT through the same AI kick path. */
  private tacticalCarrier(p: MatchPlayer): void {
    const T = this.tuning;
    const s = this.s;
    p.intent = 'carry';
    const a = this.tactics.takeAction(s, p.id);
    if (!a) {
      this.tactics.heldTarget(s, p, p.target);
      return;
    }
    s.nextDecisionAt = s.simTime + T.ai.decisionSeconds;
    const aim = this.tactics.toWorld(p.team, a.aim.x, a.aim.y, vec(0, 0));
    const noise = (k: number): number => (this.rng() * 2 - 1) * k;
    const raw = sub(aim, s.ball.pos);
    const dir = rotate(normalize(raw), noise(T.ai.aimNoise));
    if (a.type === 'SHOOT') {
      const speed = kickSpeed(powerForSpeed(lerp(T.shot.minSpeed, T.shot.maxSpeed, clamp(a.power, 0, 1)), T) + noise(T.ai.powerNoise), T);
      this.kickBall(p, scale(dir, speed), 'shot', null, null);
      s.stats.shots[p.team] += 1;
      this.emit('shot', p.id, `${speed.toFixed(1)} v05`);
      return;
    }
    const receiver = (a.targetId ?? null) as MatchPlayerId | null;
    const dist = clamp(length(raw), T.pass.minDistance, T.pass.maxDistance);
    const speed = kickSpeed(powerForSpeed(passSpeedFor(dist, T), T) * (1 + noise(T.ai.powerNoise)), T);
    const target = add(s.ball.pos, scale(dir, dist));
    this.kickBall(p, scale(dir, speed), 'pass', target, receiver);
    this.afterPass(p, target);
    this.emit('pass', p.id, `${receiver} v05`);
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
    const w = toWorld(team, spot, T);
    passer.target.x = w.x;
    passer.target.y = w.y;
    passer.speed = T.movement.runSpeed;
  }

  /** Pressers react to the carrier's cuts after a short lag instead of mirroring them instantly. */
  private updatePressRead(h: number): void {
    const s = this.s;
    const b = s.ball;
    const owner = b.owner ? s.players[b.owner] : null;
    const focus = this.focusScratch;
    focus.x = owner ? owner.pos.x : b.pos.x + b.vel.x * 0.35;
    focus.y = owner ? owner.pos.y : b.pos.y + b.vel.y * 0.35;
    const r = s.pressRead;
    // First tick, or the ball was teleported (restart, Lab staging): no lag to carry over.
    if (!finiteVec(r) || distance(r, focus) > 12) {
      r.x = focus.x;
      r.y = focus.y;
      return;
    }
    const k = 1 - Math.exp(-h / Math.max(1e-3, this.tuning.defense.readSeconds));
    r.x = r.x + (focus.x - r.x) * k;
    r.y = r.y + (focus.y - r.y) * k;
  }

  private movePlayer(p: MatchPlayer, h: number): void {
    const T = this.tuning;
    const s = this.s;
    const M = T.movement;
    let desired: MutableVec2 = this.desired;
    let accel = M.accel;
    if (p.id === s.controlledId && p.team === 'home' && !p.isKeeper) {
      if (s.ball.owner === p.id) p.intent = 'carry';
      const v = this.padVelocity(p);
      approachInPlace(p.vel, v.desired.x, v.desired.y, v.accel * h);
      // Jockey caps the actual speed, so entering it at a sprint can't carry the defender through the gap.
      if (v.cap !== undefined) {
        const sp = Math.hypot(p.vel.x, p.vel.y);
        if (sp > v.cap) {
          p.vel.x *= v.cap / sp;
          p.vel.y *= v.cap / sp;
        }
      }
      p.pos.x = clamp(p.pos.x + p.vel.x * h, 0.3, T.pitch.length - 0.3);
      p.pos.y = clamp(p.pos.y + p.vel.y * h, 0.5, T.pitch.width - 0.5);
      return;
    }
    if (s.ball.owner === p.id) {
      if (p.isKeeper) {
        desired.x = 0;
        desired.y = 0;
      }
      else if (p.team === 'home') {
        p.intent = 'carry';
        desired = this.userCarrierVelocity(p);
        accel = T.carrier.accel;
      } else {
        seekInto(desired, p.pos, p.target, M.carrySpeed, 0.6);
        accel = T.dribble.accel;
      }
    } else if (p.isKeeper) {
      const k = this.keeperTarget(p);
      seekInto(desired, p.pos, k.target, k.speed, 0.4);
      accel = T.keeper.accel;
    } else {
      seekInto(desired, p.pos, p.target, p.speed, p.intent === 'chase' || p.intent === 'receive' ? 0.4 : 1.5);
      if (p.intent === 'chase' || p.intent === 'press' || p.intent === 'run' || p.intent === 'recover') accel = M.sprintAccel;
    }
    approachInPlace(p.vel, desired.x, desired.y, accel * h);
    p.pos.x = clamp(p.pos.x + p.vel.x * h, 0.3, T.pitch.length - 0.3);
    p.pos.y = clamp(p.pos.y + p.vel.y * h, 0.5, T.pitch.width - 0.5);
  }

  /** Steers toward `dribbleDir` with a bounded turn rate; a sharp change slows the carrier first. */
  private userCarrierVelocity(p: MatchPlayer): MutableVec2 {
    const T = this.tuning;
    const C = T.carrier;
    const s = this.s;
    const want = normalize(s.dribbleDir);
    const top = C.speed * (want.x < -0.3 ? C.backSpeedFactor : 1);
    // Steer straight at the requested direction; movePlayer's accel cap is the only limit on cuts and reversals.
    let vx = want.x * top;
    let vy = want.y * top;
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
    const home = team === 'home';
    const bT = this.kbT;
    bT.x = home ? ball.pos.x : P.length - ball.pos.x;
    bT.y = home ? ball.pos.y : P.width - ball.pos.y;
    const vT = this.kvT;
    vT.x = home ? ball.vel.x : -ball.vel.x;
    vT.y = home ? ball.vel.y : -ball.vel.y;
    const gT = this.kgT;
    gT.x = home ? gk.pos.x : P.length - gk.pos.x;
    gT.y = home ? gk.pos.y : P.width - gk.pos.y;
    const kick = ball.kick;
    // Any opponent ball on target counts, whatever it was labelled (long passes, deflections), so range never skips the dive.
    const shotIncoming =
      !ball.owner && !!kick && kick.team !== team && vT.x < -0.5 && s.simTime - kick.at >= K.reactionSeconds && (kick.kind === 'shot' || this.onTarget(bT, vT));
    gk.intent = 'keeper';
    if (shotIncoming) {
      const t = (gT.x - bT.x) / vT.x;
      const y = t > 0 ? bT.y + vT.y * t : bT.y;
      s.keeperDiving[team] = true;
      return this.keeperResult(team, gT.x, clamp(y, P.goalCenterY - P.goalHalfWidth - 1, P.goalCenterY + P.goalHalfWidth + 1), K.diveSpeed);
    }
    s.keeperDiving[team] = false;
    // A slow loose ball inside the box that the keeper reaches first is his to collect.
    if (!ball.owner && length(ball.vel) < 5 && this.inBox(team, ball.pos) && this.keeperFirst(gk)) {
      this.keeperRes.target.x = ball.pos.x;
      this.keeperRes.target.y = ball.pos.y;
      this.keeperRes.speed = K.speed;
      return this.keeperRes;
    }
    const depth = K.depth;
    const y = P.goalCenterY + (bT.y - P.goalCenterY) * K.shade;
    return this.keeperResult(team, depth, clamp(y, P.goalCenterY - P.goalHalfWidth + 0.5, P.goalCenterY + P.goalHalfWidth - 0.5), K.speed);
  }

  /** Fills the reused keeper result with a team-frame point mirrored to world yards. */
  private keeperResult(team: TeamId, x: number, y: number, speed: number): { target: MutableVec2; speed: number } {
    const P = this.tuning.pitch;
    const r = this.keeperRes;
    r.target.x = team === 'home' ? x : P.length - x;
    r.target.y = team === 'home' ? y : P.width - y;
    r.speed = speed;
    return r;
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
    const tx = team === 'home' ? p.x : P.length - p.x;
    const ty = team === 'home' ? p.y : P.width - p.y;
    return tx <= P.boxDepth && Math.abs(ty - P.goalCenterY) <= P.boxHalfWidth;
  }

  private moveBall(h: number): void {
    const T = this.tuning;
    const s = this.s;
    const ball = s.ball;
    if (ball.owner) {
      const o = s.players[ball.owner];
      if (o.isKeeper) {
        setXY(ball.pos, o.pos.x, o.pos.y);
        zero(ball.vel);
        return;
      }
      s.touchPhase = (s.touchPhase + h / T.dribble.touchSeconds) % 1;
      const t = s.touchPhase;
      const k = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;
      const hl = length(o.vel);
      const hx = hl > 0.3 ? o.vel.x / hl : o.team === 'home' ? 1 : -1;
      const hy = hl > 0.3 ? o.vel.y / hl : 0;
      const lead = lerp(T.dribble.minLead, T.dribble.maxLead, k);
      setXY(ball.pos, o.pos.x + hx * lead, o.pos.y + hy * lead);
      setXY(ball.vel, o.vel.x, o.vel.y);
      return;
    }
    setXY(ball.pos, ball.pos.x + ball.vel.x * h, ball.pos.y + ball.vel.y * h);
    const speed = length(ball.vel);
    if (speed > 0) {
      const k = Math.max(0, speed - T.ball.friction * h) / speed;
      setXY(ball.vel, ball.vel.x * k, ball.vel.y * k);
    }
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
      setXY(ball.pos, gk.pos.x, gk.pos.y);
      this.take(gk, shot ? 'saved' : 'received', shot ? `keeper caught it (${speed.toFixed(1)} yd/s)` : 'keeper collected');
      if (shot) s.stats.saves[team] += 1;
      return true;
    }
    const vT = velToTeam(team, ball.vel);
    const side = toTeam(team, ball.pos, T).y >= toTeam(team, gk.pos, T).y ? 1 : -1;
    copyInto(ball.vel, toWorldVel(team, vec(Math.abs(vT.x) * T.keeper.parryFactor, side * speed * 0.3)));
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
        setXY(ball.vel, ball.vel.x * T.receive.hotTouchFactor, ball.vel.y * T.receive.hotTouchFactor);
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
      copyInto(ball.vel, scale(rotate(ball.vel, (cross >= 0 ? 1 : -1) * T.intercept.deflectAngle), T.intercept.deflectSpeedFactor));
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
    if (p.isKeeper) zero(ball.vel);
    else setXY(ball.vel, p.vel.x, p.vel.y);
    // Control brings the ball to the receiver's feet (it was within reach), so ownership and ball position agree.
    const hl = length(p.vel);
    const hx = hl > 0.3 ? p.vel.x / hl : p.team === 'home' ? 1 : -1;
    const hy = hl > 0.3 ? p.vel.y / hl : 0;
    if (p.isKeeper) setXY(ball.pos, p.pos.x, p.pos.y);
    else setXY(ball.pos, p.pos.x + hx * T.dribble.minLead, p.pos.y + hy * T.dribble.minLead);
    ball.kick = null;
    ball.ignore = [];
    ball.lastTouch = p.team;
    s.possession = p.team;
    s.ownedSince = s.simTime;
    s.protectUntil = s.simTime + T.tackle.protectSeconds;
    s.nextDecisionAt = s.simTime + T.ai.reactionSeconds;
    s.touchPhase = 0;
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
    }
    if (userControl) {
      if (s.controlledId !== p.id) s.prevControlledId = s.controlledId;
      s.controlledId = p.id;
      s.controlSince = s.simTime;
      // Keep the receiver's own momentum (any direction); only a standing receiver defaults to facing upfield.
      s.dribbleDir = length(p.vel) > 0.3 ? normalize(p.vel) : vec(1, 0);
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
    setXY(s.ball.vel, velocity.x, velocity.y);
    s.ball.kick = { by: by.id, team: by.team, kind, at: s.simTime, target, receiver };
    s.ball.ignore = [{ id: by.id, until: s.simTime + this.tuning.ball.kickerIgnoreSeconds }];
    s.ball.lastTouch = by.team;
    s.possession = by.team;
  }

  private stop(reason: 'goal' | 'out' | 'foul', scorer: TeamId | null, detail: string, restartTeam: TeamId, spot: Vec2): void {
    const T = this.tuning;
    const s = this.s;
    if (s.phase === 'stopped') return;
    this.padReset('play stopped');
    s.phase = 'stopped';
    s.phaseTime = 0;
    s.timeScale = 1;
    s.stoppage = { reason, scorer, detail, restartTeam, spot: copy(spot), until: reason === 'goal' ? T.stoppage.goalSeconds : T.stoppage.outSeconds };
    zero(s.ball.vel);
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
      setXY(taker.pos, st.spot.x, st.spot.y);
      zero(taker.vel);
      setXY(s.ball.pos, st.spot.x, st.spot.y);
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
        const w = toWorld(t, vec(a.x, a.y + jitter), T);
        setXY(p.pos, w.x, w.y);
        zero(p.vel);
        p.target.x = p.pos.x;
        p.target.y = p.pos.y;
        setXY(p.anchor, p.pos.x, p.pos.y);
        p.intent = p.isKeeper ? 'keeper' : 'hold';
        p.intentUntil = 0;
      }
    }
    const kicker = s.players[team === 'home' ? 'H8' : 'A8'];
    const k = toWorld(team, vec(T.pitch.length / 2 - 1, T.pitch.goalCenterY), T);
    setXY(kicker.pos, k.x, k.y);
    setXY(s.ball.pos, centre.x, centre.y);
    zero(s.ball.vel);
    s.ball.owner = null;
    s.ball.kick = null;
    s.runs = { home: { runnerId: null, until: 0, cooldownUntil: 0 }, away: { runnerId: null, until: 0, cooldownUntil: 0 } };
    s.defense = { home: { presserId: null, coverId: null, until: 0 }, away: { presserId: null, coverId: null, until: 0 } };
    this.take(kicker, 'kickoff', team);
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
          attrs: this.attrsFor(id),
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
      prevControlledId: null,
      possessionSeq: 0,
      establishedTeam: null,
      controlEpoch: 0,
      control: T.control.max,
      dribbleDir: vec(1, 0),
      pad: this.newPad(),
      touchPhase: 0,
      protectUntil: 0,
      ownedSince: 0,
      contact,
      tackleBan: {},
      beatenUntil: {},
      defense: { home: { presserId: null, coverId: null, until: 0 }, away: { presserId: null, coverId: null, until: 0 } },
      chaser: { home: { id: null, until: 0 }, away: { id: null, until: 0 } },
      pressRead: vec(Number.NaN, Number.NaN),
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

/** Ground-pass launch speed that arrives at `pass.arriveSpeed` after rolling `distanceYards` under friction. */
function passSpeedFor(distanceYards: number, T: MatchTuning): number {
  const { arriveSpeed, maxSpeed } = T.pass;
  return Math.min(maxSpeed, Math.sqrt(arriveSpeed * arriveSpeed + 2 * T.ball.friction * distanceYards));
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

function kickCurve(T: MatchTuning): { f: number; dMin: number; dPass: number; pp: number; a: number; c: number } {
  const K = T.kick;
  const f = T.ball.friction;
  const dMin = (K.minSpeed * K.minSpeed) / (2 * f);
  const dMax = (K.maxSpeed * K.maxSpeed) / (2 * f);
  const pp = K.passPower;
  const dPass = K.passRoll;
  const a = ((dPass - dMin) / pp) * (1 - pp);
  return { f, dMin, dPass, pp, a, c: dMax - dPass - a };
}

/** Roll distance (yd) for a power 0..1; see tuning.kick. */
export function kickRoll(power: number, T: MatchTuning = MATCH_TUNING): number {
  const p = Number.isFinite(power) ? clamp(power, 0, 1) : 0;
  const k = kickCurve(T);
  if (p <= k.pp) return k.dMin + ((k.dPass - k.dMin) * p) / k.pp;
  const u = (p - k.pp) / (1 - k.pp);
  return k.dPass + k.a * u + k.c * u * u;
}

/** The single kick-speed mapping used by user and AI kicks (ground balls only), in yd/s. */
export function kickSpeed(power: number, T: MatchTuning = MATCH_TUNING): number {
  const p = Number.isFinite(power) ? clamp(power, 0, 1) : 0;
  if (p <= 0) return T.kick.minSpeed;
  if (p >= 1) return T.kick.maxSpeed;
  return Math.sqrt(2 * T.ball.friction * kickRoll(p, T));
}

export function powerForSpeed(speed: number, T: MatchTuning = MATCH_TUNING): number {
  if (!Number.isFinite(speed) || speed <= T.kick.minSpeed) return 0;
  if (speed >= T.kick.maxSpeed) return 1;
  const k = kickCurve(T);
  const d = (speed * speed) / (2 * k.f);
  if (d <= k.dPass) return clamp((k.pp * (d - k.dMin)) / (k.dPass - k.dMin), 0, 1);
  const r = d - k.dPass;
  const u = Math.abs(k.c) < 1e-9 ? r / k.a : (-k.a + Math.sqrt(k.a * k.a + 4 * k.c * r)) / (2 * k.c);
  return clamp(k.pp + u * (1 - k.pp), 0, 1);
}

const dot2 = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;

/** Rotates unit vector `from` toward `to` by at most `max` radians. */
function setXY(v: MutableVec2, x: number, y: number): void {
  v.x = x;
  v.y = y;
}
const zero = (v: MutableVec2): void => setXY(v, 0, 0);
const copyInto = (v: MutableVec2, a: Vec2): void => setXY(v, a.x, a.y);

/** In-place turnToward: rotates the unit vector `v` toward the unit direction (tx, ty) by at most `max` radians. */
function turnTowardInto(v: MutableVec2, tx: number, ty: number, max: number): void {
  const a = Math.atan2(v.y, v.x);
  let d = Math.atan2(ty, tx) - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const r = a + clamp(d, -max, max);
  v.x = Math.cos(r);
  v.y = Math.sin(r);
}

function turnToward(from: Vec2, to: Vec2, max: number): MutableVec2 {
  const a = Math.atan2(from.y, from.x);
  let d = Math.atan2(to.y, to.x) - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const r = a + clamp(d, -max, max);
  return vec(Math.cos(r), Math.sin(r));
}

/** Fraction along a->b of p's projection (0 when a = b). */
function along(a: Vec2, b: Vec2, p: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  return l2 < 1e-12 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
}

/** Intersection point of segments p0-p1 and a-b, or null. */
function segmentHit(p0: Vec2, p1: Vec2, a: Vec2, b: Vec2): MutableVec2 | null {
  const rx = p1.x - p0.x;
  const ry = p1.y - p0.y;
  const qx = b.x - a.x;
  const qy = b.y - a.y;
  const den = rx * qy - ry * qx;
  if (Math.abs(den) < 1e-12) return null;
  const wx = a.x - p0.x;
  const wy = a.y - p0.y;
  const t = (wx * qy - wy * qx) / den;
  const u = (wx * ry - wy * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return vec(p0.x + rx * t, p0.y + ry * t);
}
