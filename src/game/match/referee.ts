import type { Vec2 } from '../vec';
import type { MutableVec2 } from '../math';
import { U11_9V9_PITCH, type PitchSpec } from '../pitch';
import { TEAM_PLAYER_IDS, type MatchPlayer, type MatchPlayerId, type TeamId } from './types';

/**
 * Referee: Laws of the Game calls for the 9v9 sim (out of play, offside, slide fouls).
 * Pitch yards on the drawn U11 markings (`U11_9V9_PITCH`), never screen pixels, so a call cannot
 * change with the camera. Every check writes into preallocated fields; nothing allocates per tick.
 * The sim calls it from its fixed-step tick, so calls are identical at any frame rate.
 */

export type RestartKind = 'kickoff' | 'throwIn' | 'goalKick' | 'corner' | 'freeKick' | 'indirectFreeKick' | 'penalty';

export interface RefereeTuning {
  /** Slide speed (yd/s) above which a slide from behind, or one that reaches the body before the ball, is a foul. */
  readonly maxSafeTackleThreshold: number;
  /** The slider is "behind" when the opponent is heading away from them within this cosine. */
  readonly behindCos: number;
  /** An attacker within this many yards of the offside line is level, so onside. */
  readonly levelTolerance: number;
  /** A ball this close to a player is at their feet: it marks their front for "from behind". */
  readonly footReach: number;
  /** Opponents are moved at least this far from a throw-in, corner or free-kick spot. */
  readonly restartDistance: number;
  /** Seconds after the restart before an AI taker throws in or takes a penalty. */
  readonly aiTakeSeconds: number;
  /** Seconds before a user taker who has not acted throws in or takes the penalty automatically. */
  readonly userTakeSeconds: number;
  /** Longest throw-in the auto throw aims at (yards). */
  readonly throwRange: number;
  /** Longest automatic short pass from a free kick, corner or goal kick (yd). */
  readonly setPieceRange: number;
}

export const REFEREE_TUNING: RefereeTuning = {
  maxSafeTackleThreshold: 3.5,
  behindCos: 0.5,
  levelTolerance: 0.25,
  footReach: 1.5,
  restartDistance: 8,
  aiTakeSeconds: 0.6,
  userTakeSeconds: 4,
  throwRange: 15,
  setPieceRange: 25,
};

export interface RefereeCall {
  kind: RestartKind;
  /** Team that restarts. */
  team: TeamId;
  /** Where the restart is taken. */
  readonly spot: MutableVec2;
  /** Where the ball crossed the line, or where the offence happened. */
  readonly at: MutableVec2;
  offender: MatchPlayerId | null;
  victim: MatchPlayerId | null;
}

const other = (t: TeamId): TeamId => (t === 'home' ? 'away' : 'home');
const clampN = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export class Referee {
  readonly pitch: PitchSpec;
  readonly tuning: RefereeTuning;
  readonly ballRadius: number;
  /** The last two different players to touch the ball, newest first. */
  readonly touches: [MatchPlayerId | null, MatchPlayerId | null] = [null, null];
  readonly call: RefereeCall = { kind: 'kickoff', team: 'home', spot: { x: 0, y: 0 }, at: { x: 0, y: 0 }, offender: null, victim: null };
  /** Offside position of each player at the last pass (the kick instance). */
  private readonly offsideAtKick: Record<MatchPlayerId, boolean>;
  /** Team whose last pass is being checked for offside, or null. */
  private passTeam: TeamId | null = null;
  /** World x of the offside line cached at the kick instance (second-last opponent, ball or halfway). */
  lineX = 0;
  /** Taker of a throw-in, goal kick or corner: their first kick cannot be offside. */
  private exemptBy: MatchPlayerId | null = null;
  /** Taker of an indirect free kick or throw-in: no goal until someone else touches the ball. */
  private indirectBy: MatchPlayerId | null = null;

  constructor(ballRadius: number, pitch: PitchSpec = U11_9V9_PITCH, tuning: RefereeTuning = REFEREE_TUNING) {
    this.pitch = pitch;
    this.tuning = tuning;
    this.ballRadius = ballRadius;
    const flags = {} as Record<MatchPlayerId, boolean>;
    for (const t of ['home', 'away'] as const) for (const id of TEAM_PLAYER_IDS[t]) flags[id] = false;
    this.offsideAtKick = flags;
  }

  /** Clears pass and restart tracking (kick-offs, resets, half-time). */
  reset(): void {
    this.touches[0] = null;
    this.touches[1] = null;
    this.passTeam = null;
    this.exemptBy = null;
    this.indirectBy = null;
  }

  /** Play stopped: the pass check and any restart restrictions end. */
  stopPlay(): void {
    this.passTeam = null;
    this.exemptBy = null;
    this.indirectBy = null;
  }

  /** Distance a team has advanced toward the goal it attacks (home attacks +x). */
  private adv(team: TeamId, x: number): number {
    return team === 'home' ? x : this.pitch.length - x;
  }

  /**
   * A player touches the ball. Returns true when that touch is an offside offence: a teammate of the
   * last passer who was in an offside position at the kick instance. Any touch ends the pass check.
   */
  touch(p: MatchPlayer): boolean {
    if (this.touches[0] !== p.id) {
      this.touches[1] = this.touches[0];
      this.touches[0] = p.id;
    }
    if (this.exemptBy !== p.id) this.exemptBy = null;
    if (this.indirectBy !== p.id) this.indirectBy = null;
    const team = this.passTeam;
    if (team === null) return false;
    this.passTeam = null;
    return p.team === team && this.offsideAtKick[p.id];
  }

  /**
   * Kick instance: the passer plays the ball. Caches the offside line (second-last opponent, the
   * keeper included; never behind the ball or in the passer's own half) and which teammates are past it.
   */
  notePass(kicker: MatchPlayer, players: Readonly<Record<MatchPlayerId, MatchPlayer>>, ball: Vec2): void {
    const exempt = this.exemptBy === kicker.id;
    this.exemptBy = null;
    const team = kicker.team;
    if (exempt) {
      this.passTeam = null;
      return;
    }
    let first = -Infinity;
    let second = -Infinity;
    for (const id of TEAM_PLAYER_IDS[other(team)]) {
      const a = this.adv(team, players[id].pos.x);
      if (a > first) {
        second = first;
        first = a;
      } else if (a > second) second = a;
    }
    const line = Math.max(second, this.adv(team, ball.x), this.pitch.length / 2);
    this.lineX = team === 'home' ? line : this.pitch.length - line;
    for (const id of TEAM_PLAYER_IDS[team]) {
      this.offsideAtKick[id] = id !== kicker.id && this.adv(team, players[id].pos.x) > line + this.tuning.levelTolerance;
    }
    this.passTeam = team;
  }

  /** True while the last pass is being checked and `id` was offside at its kick instance. */
  wasOffsideAtKick(id: MatchPlayerId): boolean {
    return this.passTeam !== null && this.offsideAtKick[id];
  }

  /** A goal scored with no touch since an indirect free kick or throw-in does not count. */
  directGoalDisallowed(): boolean {
    return this.indirectBy !== null;
  }

  /** Starts restart tracking for the taker (call after placing them). */
  restartTaken(kind: RestartKind, taker: MatchPlayerId): void {
    this.touches[1] = this.touches[0];
    this.touches[0] = taker;
    this.passTeam = null;
    this.exemptBy = kind === 'throwIn' || kind === 'goalKick' || kind === 'corner' ? taker : null;
    this.indirectBy = kind === 'indirectFreeKick' || kind === 'throwIn' ? taker : null;
  }

  /** True once the whole ball is over a touchline or goal line. */
  isOut(pos: Vec2): boolean {
    const r = this.ballRadius;
    return pos.x > this.pitch.length + r || pos.x < -r || pos.y > this.pitch.width + r || pos.y < -r;
  }

  /** The ball wholly crossed a goal line between the goalposts (centre interpolated onto the line). */
  isGoalMouth(prev: Vec2, pos: Vec2, goalCenterY: number, goalHalfWidth: number): boolean {
    if (!this.crossedGoalLineFirst(prev, pos)) return false;
    return Math.abs(this.crossAt(prev, pos, true) - goalCenterY) <= goalHalfWidth - this.ballRadius;
  }

  private crossedGoalLineFirst(prev: Vec2, pos: Vec2): boolean {
    const L = this.pitch.length;
    const W = this.pitch.width;
    const r = this.ballRadius;
    const tx = pos.x > L + r ? (L + r - prev.x) / (pos.x - prev.x || 1e-9) : pos.x < -r ? (-r - prev.x) / (pos.x - prev.x || -1e-9) : Infinity;
    const ty = pos.y > W + r ? (W + r - prev.y) / (pos.y - prev.y || 1e-9) : pos.y < -r ? (-r - prev.y) / (pos.y - prev.y || -1e-9) : Infinity;
    return tx !== Infinity && tx <= ty;
  }

  /** Where the centre crossed the goal line (y) or touchline (x). */
  private crossAt(prev: Vec2, pos: Vec2, goalLine: boolean): number {
    if (goalLine) {
      const lineX = pos.x > this.pitch.length / 2 ? this.pitch.length : 0;
      const dx = pos.x - prev.x;
      const t = Math.abs(dx) > 1e-9 ? clampN((lineX - prev.x) / dx, 0, 1) : 1;
      return prev.y + (pos.y - prev.y) * t;
    }
    const lineY = pos.y > this.pitch.width / 2 ? this.pitch.width : 0;
    const dy = pos.y - prev.y;
    const t = Math.abs(dy) > 1e-9 ? clampN((lineY - prev.y) / dy, 0, 1) : 1;
    return prev.x + (pos.x - prev.x) * t;
  }

  /**
   * Out of play (not a goal): throw-in to the team that did not touch it last; over the goal line a
   * goal kick when the attackers touched it last, else a corner. Writes `call`.
   */
  callOut(prev: Vec2, pos: Vec2, lastTeam: TeamId): RefereeCall {
    const P = this.pitch;
    const c = this.call;
    c.offender = null;
    c.victim = null;
    if (this.crossedGoalLineFirst(prev, pos)) {
      const lineX = pos.x > P.length / 2 ? P.length : 0;
      const y = this.crossAt(prev, pos, true);
      c.at.x = lineX;
      c.at.y = y;
      const defending: TeamId = lineX === 0 ? 'home' : 'away';
      const low = y < P.width / 2;
      if (lastTeam !== defending) {
        c.kind = 'goalKick';
        c.team = defending;
        c.spot.x = lineX === 0 ? P.goalAreaDepth : P.length - P.goalAreaDepth;
        c.spot.y = P.width / 2 + (low ? -1 : 1) * (P.goalAreaWidth / 2);
      } else {
        c.kind = 'corner';
        c.team = other(defending);
        c.spot.x = lineX === 0 ? 0.5 : P.length - 0.5;
        c.spot.y = low ? 0.5 : P.width - 0.5;
      }
      return c;
    }
    const lineY = pos.y > P.width / 2 ? P.width : 0;
    const x = this.crossAt(prev, pos, false);
    c.at.x = x;
    c.at.y = lineY;
    c.kind = 'throwIn';
    c.team = other(lastTeam);
    c.spot.x = clampN(x, 1, P.length - 1);
    c.spot.y = lineY === 0 ? 0.4 : P.width - 0.4;
    return c;
  }

  /** Offside offence by `p` where they played the ball: indirect free kick to the defenders. */
  callOffside(p: MatchPlayer): RefereeCall {
    const c = this.call;
    c.kind = 'indirectFreeKick';
    c.team = other(p.team);
    c.offender = p.id;
    c.victim = null;
    c.at.x = p.pos.x;
    c.at.y = p.pos.y;
    this.insideSpot(c.spot, p.pos);
    return c;
  }

  /** Inside the penalty area that `defending` defends. */
  inPenaltyArea(p: Vec2, defending: TeamId): boolean {
    const P = this.pitch;
    const x = defending === 'home' ? p.x : P.length - p.x;
    return x >= 0 && x <= P.penaltyAreaDepth && Math.abs(p.y - P.width / 2) <= P.penaltyAreaWidth / 2;
  }

  /**
   * Slide body contact. A foul when the slide comes from behind or reaches the body without winning the
   * ball first, at more than `maxSafeTackleThreshold`. Inside the slider's own penalty area it is a
   * penalty, else a free kick at the contact point. Returns the call, or null to play on.
   */
  assessSlide(slider: MatchPlayer, victim: MatchPlayer, ballFirst: boolean, ball: Vec2, front: Vec2 | null = null): RefereeCall | null {
    const T = this.tuning;
    const speed = Math.hypot(slider.vel.x, slider.vel.y);
    if (speed <= T.maxSafeTackleThreshold) return null;
    // The victim's front: the ball side when it was poked (`front`), else toward the ball at their
    // feet, else their running direction, else upfield.
    const bx = front ? front.x : ball.x - victim.pos.x;
    const by = front ? front.y : ball.y - victim.pos.y;
    const bl = Math.hypot(bx, by);
    const vs = Math.hypot(victim.vel.x, victim.vel.y);
    let hx = victim.team === 'home' ? 1 : -1;
    let hy = 0;
    if (bl > 1e-6 && (front !== null || bl <= T.footReach)) {
      hx = bx / bl;
      hy = by / bl;
    } else if (vs > 0.5) {
      hx = victim.vel.x / vs;
      hy = victim.vel.y / vs;
    }
    const rx = victim.pos.x - slider.pos.x;
    const ry = victim.pos.y - slider.pos.y;
    const rl = Math.hypot(rx, ry) || 1;
    const behind = (hx * rx + hy * ry) / rl > T.behindCos;
    if (!behind && ballFirst) return null;
    const c = this.call;
    c.offender = slider.id;
    c.victim = victim.id;
    c.team = victim.team;
    c.at.x = victim.pos.x;
    c.at.y = victim.pos.y;
    if (this.inPenaltyArea(victim.pos, slider.team)) {
      c.kind = 'penalty';
      c.spot.x = slider.team === 'home' ? this.pitch.penaltyMarkDistance : this.pitch.length - this.pitch.penaltyMarkDistance;
      c.spot.y = this.pitch.width / 2;
    } else {
      c.kind = 'freeKick';
      this.insideSpot(c.spot, victim.pos);
    }
    return c;
  }

  private insideSpot(out: MutableVec2, p: Vec2): void {
    out.x = clampN(p.x, 1, this.pitch.length - 1);
    out.y = clampN(p.y, 1, this.pitch.width - 1);
  }

  /**
   * Places everyone for a restart (positions only; the sim zeroes velocities and hands the ball over).
   * Penalty: taker on the mark, the defending keeper on the goal line, everyone else outside the area.
   * Goal kick: opponents leave the penalty area. Otherwise opponents retreat `restartDistance`.
   */
  arrange(kind: RestartKind, team: TeamId, spot: Vec2, taker: MatchPlayer, players: Readonly<Record<MatchPlayerId, MatchPlayer>>): void {
    const P = this.pitch;
    const R = this.tuning.restartDistance;
    taker.pos.x = spot.x;
    taker.pos.y = spot.y;
    const defending = other(team);
    for (const t of ['home', 'away'] as const) {
      for (const id of TEAM_PLAYER_IDS[t]) {
        const p = players[id];
        if (p === taker) continue;
        if (kind === 'penalty') {
          if (p.isKeeper && t === defending) {
            p.pos.x = defending === 'home' ? 0.3 : P.length - 0.3;
            p.pos.y = P.width / 2;
          } else if (!(p.isKeeper && t === team)) this.outsideArea(p, defending, P.penaltyAreaDepth + 2);
          continue;
        }
        if (t === team) continue;
        if (kind === 'goalKick') {
          if (this.inPenaltyArea(p.pos, team)) this.outsideArea(p, team, P.penaltyAreaDepth + 1);
          continue;
        }
        if (p.isKeeper) continue;
        const dx = p.pos.x - spot.x;
        const dy = p.pos.y - spot.y;
        const d = Math.hypot(dx, dy);
        if (d >= R) continue;
        // Retreat toward their own goal when standing on the spot.
        const ux = d > 1e-6 ? dx / d : t === 'home' ? -1 : 1;
        const uy = d > 1e-6 ? dy / d : 0;
        p.pos.x = clampN(spot.x + ux * R, 1, P.length - 1);
        p.pos.y = clampN(spot.y + uy * R, 1, P.width - 1);
      }
    }
  }

  /**
   * While a restart waits to be taken, opponents stay `restartDistance` from the ball
   * (outside the area for a goal kick). Positions only, no allocation. Penalties are fully held.
   */
  holdOff(kind: RestartKind, team: TeamId, ball: Vec2, players: Readonly<Record<MatchPlayerId, MatchPlayer>>): void {
    if (kind === 'penalty' || kind === 'kickoff') return;
    const P = this.pitch;
    const R = this.tuning.restartDistance;
    const opp = other(team);
    for (const id of TEAM_PLAYER_IDS[opp]) {
      const p = players[id];
      if (kind === 'goalKick') {
        if (this.inPenaltyArea(p.pos, team)) this.outsideArea(p, team, P.penaltyAreaDepth + 1);
        continue;
      }
      if (p.isKeeper) continue;
      const dx = p.pos.x - ball.x;
      const dy = p.pos.y - ball.y;
      const d = Math.hypot(dx, dy);
      if (d >= R) continue;
      const ux = d > 1e-6 ? dx / d : opp === 'home' ? -1 : 1;
      const uy = d > 1e-6 ? dy / d : 0;
      p.pos.x = clampN(ball.x + ux * R, 1, P.length - 1);
      p.pos.y = clampN(ball.y + uy * R, 1, P.width - 1);
    }
  }

  /** Moves a player just outside the penalty area `defending` defends, keeping their lateral position. */
  private outsideArea(p: MatchPlayer, defending: TeamId, depth: number): void {
    const P = this.pitch;
    const x = defending === 'home' ? p.pos.x : P.length - p.pos.x;
    if (x >= depth) return;
    p.pos.x = defending === 'home' ? depth : P.length - depth;
    p.pos.y = clampN(p.pos.y, 2, P.width - 2);
  }
}
