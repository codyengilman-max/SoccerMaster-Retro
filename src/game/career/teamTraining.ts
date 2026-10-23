import { CAREER_CONFIG } from './config';
import type { CareerPlayer } from './player';
import { ATTRIBUTES, ATTRIBUTE_LABELS, type AttributeId, type Position } from './types';
import { LOGIC_CATALOG } from '../logic/catalog';
import type { StageFixture } from '../match/lab';
import type { MatchPlayerId, MatchState } from '../match/types';

/**
 * Weekly Team Training (owner request 2026-10-17): three soccer-logic catalog situations a week,
 * staged on the real MatchSim and played with the normal joystick and action buttons. Each catalog
 * entry used here has a typed fixture and observable grading written in code; the catalog text is
 * shown to the player but never executed. Set pieces, aerial play and goalkeeping stay inactive.
 */
export type SituationKind = 'attack' | 'defend';

export interface TeamTrainingSituation {
  /** Soccer-logic catalog id. */
  readonly id: string;
  readonly kind: SituationKind;
  readonly title: string;
  readonly goal: string;
  readonly positions: readonly Position[];
  readonly attributes: readonly AttributeId[];
  readonly seconds: number;
  readonly fixture: StageFixture;
}

const S = (x: TeamTrainingSituation): TeamTrainingSituation => x;

export const TEAM_TRAINING_SITUATIONS: readonly TeamTrainingSituation[] = [
  S({ id: 'CB01', kind: 'attack', title: 'Carry out from the back', goal: 'Carry into space until a defender has to choose, then pass or keep going.', positions: ['DEF'], attributes: ['dribbling', 'awareness'], seconds: 10,
    fixture: { place: { H3: [18, 25], H5: [27, 14], H6: [27, 36], A9: [44, 25] }, carrier: 'H3' } }),
  S({ id: 'CB04', kind: 'defend', title: 'Delay the counterattack', goal: 'Stay goal-side and slow the runner down. Tackle only when it is safe.', positions: ['DEF'], attributes: ['defending', 'awareness'], seconds: 10,
    fixture: { place: { A8: [40, 22], A9: [43, 34], H3: [24, 24], H4: [20, 34] }, carrier: 'A8', run: { A8: [-4, 0] } } }),
  S({ id: 'OB03', kind: 'defend', title: 'Wide 1 v 1', goal: 'Approach under control and keep the winger away from goal.', positions: ['DEF'], attributes: ['defending'], seconds: 10,
    fixture: { place: { A7: [36, 7], H2: [26, 9] }, carrier: 'A7' } }),
  S({ id: 'DEF01', kind: 'defend', title: 'Press a poor touch', goal: 'Win the ball when their touch gets away. Back off if they control it first.', positions: ['DEF', 'FWD'], attributes: ['defending', 'awareness'], seconds: 8,
    fixture: { place: { A8: [33, 30], H4: [25, 28] }, carrier: null, ball: [31, 30], ballVel: [-3, 0] } }),
  S({ id: 'DT01', kind: 'defend', title: 'Win it straight back', goal: 'You just lost the ball. Press at once while it is close.', positions: ['DEF', 'MID'], attributes: ['defending', 'awareness'], seconds: 8,
    fixture: { place: { A6: [36, 25], H6: [30.5, 23], H8: [41, 32] }, carrier: 'A6' } }),
  S({ id: 'SIX01', kind: 'attack', title: 'Receive under pressure', goal: 'A defender is right behind you. Shield, bounce it back or turn if it is safe.', positions: ['MID'], attributes: ['firstTouch', 'passing'], seconds: 10,
    fixture: { place: { H6: [30, 25], A8: [32.5, 25.5], H7: [40, 36], H9: [44, 19] }, carrier: 'H6' } }),
  S({ id: 'SIX04', kind: 'attack', title: 'Win it and play forward', goal: 'Get to the loose ball first, then play forward if there is a chance.', positions: ['MID'], attributes: ['passing', 'awareness'], seconds: 10,
    fixture: { place: { H5: [29, 25], A6: [35, 26], H9: [48, 22], H7: [44, 36] }, carrier: null, ball: [32, 25], ballVel: [0, 0] } }),
  S({ id: 'EIGHT01', kind: 'attack', title: 'Between the lines', goal: 'You have the ball between their midfield and defence. Move it forward while there is space.', positions: ['MID'], attributes: ['firstTouch', 'dribbling'], seconds: 10,
    fixture: { place: { H5: [38, 25], A4: [47, 21], A5: [47, 30], A6: [33, 25], H9: [52, 25] }, carrier: 'H5' } }),
  S({ id: 'GM01', kind: 'attack', title: 'Protect a late lead', goal: 'Keep the ball safely. Still take a clear chance if one opens.', positions: ['MID'], attributes: ['passing', 'awareness'], seconds: 12,
    fixture: { place: { H6: [40, 25], H5: [34, 17], H7: [45, 36], A7: [46, 25], A8: [44, 17] }, carrier: 'H6' } }),
  S({ id: 'WING01', kind: 'attack', title: 'Attack an isolated defender', goal: 'Run at the one defender. Dribble, pass or shoot, whichever is on.', positions: ['FWD'], attributes: ['dribbling', 'finishing'], seconds: 10,
    fixture: { place: { H7: [42, 40], A2: [50, 39], H9: [54, 25] }, carrier: 'H7' } }),
  S({ id: 'NINE02', kind: 'attack', title: 'Back to goal', goal: 'Protect the ball and lay it off. Turn only if the defender gets too close.', positions: ['FWD'], attributes: ['firstTouch', 'passing'], seconds: 10,
    fixture: { place: { H9: [50, 25], A4: [52.5, 25], H6: [41, 21], H8: [42, 32] }, carrier: 'H9' } }),
  S({ id: 'AT01', kind: 'attack', title: 'Break while they are short', goal: 'You won it back with more of you than them. Attack fast, or keep it if they recover.', positions: ['FWD'], attributes: ['passing', 'finishing'], seconds: 10,
    fixture: { place: { H8: [34, 25], H7: [37, 39], H9: [39, 12], A4: [49, 20], A5: [51, 32] }, carrier: 'H8' } }),
];

export const TEAM_TRAINING_IDS: readonly string[] = TEAM_TRAINING_SITUATIONS.map((s) => s.id);
export const SITUATIONS_PER_WEEK = 3;

/** Catalog entries with no typed fixture yet (set pieces, aerial play, goalkeeping, multi-player runs). */
export const TEAM_TRAINING_INACTIVE: readonly string[] = LOGIC_CATALOG.scenarios.map((s) => s.id).filter((id) => !TEAM_TRAINING_IDS.includes(id));

export function situationById(id: string): TeamTrainingSituation | undefined {
  return TEAM_TRAINING_SITUATIONS.find((s) => s.id === id);
}

/** This week's three situations for the position: a fixed rotation, so every save sees the same week. */
export function selectSituations(position: Position, week: number): readonly TeamTrainingSituation[] {
  const pool = TEAM_TRAINING_SITUATIONS.filter((s) => s.positions.includes(position));
  const w = Number.isFinite(week) ? Math.max(1, Math.floor(week)) : 1;
  const start = ((w - 1) * SITUATIONS_PER_WEEK) % pool.length;
  return Array.from({ length: SITUATIONS_PER_WEEK }, (_, i) => pool[(start + i) % pool.length]!);
}

export interface SituationResult {
  readonly id: string;
  /** 0 (poor) to 1 (excellent), from what happened on the pitch. */
  readonly score: number;
  readonly notes: readonly string[];
  /** The evaluator saw a good choice (open pass or sensible shot) that did not come off. */
  readonly choiceMissed?: boolean;
}

const ATTACK_GOAL = { x: 75, y: 25 };
const OPEN_YARDS = 3;
const SENSIBLE_SHOT_YARDS = 20;
const PROGRESS_YARDS = 6;
const SETTLE_SECONDS = 1;
const DEFEND_YARDS = 6;
const ACTIVE_SECONDS = 1;

const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Watches one staged situation and grades the user's play from observable facts: possession kept or
 * lost, ball progress, completed passes, shots on target, goal-side time, the ball won back. A pass to
 * an open teammate or a shot from a sensible range still earns part credit when it does not come off.
 */
export class SituationObserver {
  private readonly startTime: number;
  private readonly startBallX: number;
  private readonly startScore: { home: number; away: number };
  private maxBallX: number;
  private lastSeq: number;
  private owner: MatchPlayerId | null;
  private pendingPass: { by: MatchPlayerId; open: boolean } | null = null;
  private passOpen = 0;
  private passDone = 0;
  private passLostOpen = 0;
  private pendingShot: { sensible: boolean } | null = null;
  private shotSensible = 0;
  private shotOnTarget = 0;
  private shots = 0;
  private awayShots = 0;
  private turnover = false;
  private wonBack = false;
  private teamWonBack = false;
  private prevControlled: MatchPlayerId;
  private activeAt = -Infinity;
  private goalFor = false;
  private goalAgainst = false;
  private sideN = 0;
  private sideHit = 0;
  private endAt: number | null = null;
  private done = false;

  constructor(readonly situation: TeamTrainingSituation, s: MatchState) {
    this.startTime = s.simTime;
    this.startBallX = s.ball.pos.x;
    this.maxBallX = s.ball.pos.x;
    this.startScore = { home: s.score.home, away: s.score.away };
    this.lastSeq = s.events.reduce((m, e) => Math.max(m, e.seq), 0);
    this.owner = s.ball.owner;
    this.prevControlled = s.controlledId;
  }

  get finished(): boolean {
    return this.done;
  }

  /** Seconds left before the situation ends on time. */
  remaining(s: MatchState): number {
    return Math.max(0, this.situation.seconds - (s.simTime - this.startTime));
  }

  /** Call once per rendered frame after stepping the sim. Returns true once the situation is over. */
  step(s: MatchState): boolean {
    if (this.done) return true;
    const attack = this.situation.kind === 'attack';
    // Defending credit needs the user's own input (stick, BLOCK or a slide), not the engine's assists.
    const pad = s.pad;
    if (Math.hypot(pad.stick.x, pad.stick.y) > 0.2 || pad.jockeying || pad.phase === 'blocking' || pad.phase === 'slideStart' || pad.phase === 'slideActive') this.activeAt = s.simTime;
    const active = s.simTime - this.activeAt <= ACTIVE_SECONDS;
    // Progress only counts while the home team still has the ball.
    if (!this.turnover && s.possession === 'home') this.maxBallX = Math.max(this.maxBallX, s.ball.pos.x);
    for (const e of s.events) {
      if (e.seq <= this.lastSeq) continue;
      this.lastSeq = e.seq;
      const by = e.by ? s.players[e.by] : undefined;
      if ((e.type === 'shot' || e.type === 'quickShot') && by) {
        if (by.team === 'home') {
          this.shots += 1;
          this.pendingPass = null;
          this.pendingShot = { sensible: dist(by.pos, ATTACK_GOAL) <= SENSIBLE_SHOT_YARDS };
          if (this.pendingShot.sensible) this.shotSensible += 1;
        } else this.awayShots += 1;
      } else if (e.type === 'pass' && by?.team === 'home') {
        const rid = e.detail.split(' ')[0] as MatchPlayerId;
        const r = s.players[rid];
        const open = !!r && rid !== e.by && Object.values(s.players).every((p) => p.team === 'home' || p.isKeeper || dist(p.pos, r.pos) > OPEN_YARDS);
        if (open) this.passOpen += 1;
        this.pendingPass = { by: e.by!, open };
      } else if (e.type === 'parried' && this.pendingShot) {
        this.shotOnTarget += 1;
        this.pendingShot = null;
      }
    }
    if (s.score.home > this.startScore.home && !this.goalFor) {
      this.goalFor = true;
      if (this.pendingShot) this.shotOnTarget += 1;
      this.pendingShot = null;
    }
    if (s.score.away > this.startScore.away) this.goalAgainst = true;
    const owner = s.ball.owner;
    if (owner !== this.owner) {
      this.owner = owner;
      if (owner) {
        const p = s.players[owner];
        if (this.pendingPass) {
          if (p.team === 'home' && owner !== this.pendingPass.by) this.passDone += 1;
          else if (p.team === 'away' && this.pendingPass.open) this.passLostOpen += 1;
          this.pendingPass = null;
        }
        if (this.pendingShot) {
          if (p.team === 'away' && p.isKeeper) this.shotOnTarget += 1;
          this.pendingShot = null;
        }
        if (p.team === 'away' && attack) this.turnover = true;
        // Only the player the user was controlling earns the win; a computer teammate's win is part credit.
        if (p.team === 'home' && !attack) {
          if (owner === this.prevControlled && active) this.wonBack = true;
          else this.teamWonBack = true;
        }
      }
    }
    if (!attack && owner && s.players[owner].team === 'away') {
      const me = s.players[s.controlledId];
      const carrier = s.players[owner];
      this.sideN += 1;
      // Goal-side and close enough to matter: standing still far away is not defending.
      if (active && me && me.pos.x < carrier.pos.x - 0.5 && dist(me.pos, carrier.pos) <= DEFEND_YARDS) this.sideHit += 1;
    }
    this.prevControlled = s.controlledId;
    const over = attack ? this.turnover || this.goalFor || (this.shots > 0 && !this.pendingShot) : this.wonBack || this.teamWonBack || this.goalAgainst;
    if (over && this.endAt === null) this.endAt = s.simTime + SETTLE_SECONDS;
    if (s.simTime - this.startTime >= this.situation.seconds || (this.endAt !== null && s.simTime >= this.endAt)) this.done = true;
    return this.done;
  }

  result(): SituationResult {
    const notes: string[] = [];
    let score: number;
    if (this.situation.kind === 'attack') {
      const gained = this.maxBallX - this.startBallX;
      const secure = this.turnover ? (this.passLostOpen > 0 ? 0.25 : 0) : 0.5;
      notes.push(this.turnover ? (this.passLostOpen > 0 ? 'Lost the ball, but the pass was a good choice.' : 'Lost the ball.') : 'Kept the ball.');
      const progress = this.goalFor ? 0.25 : 0.25 * Math.min(1, Math.max(0, gained) / PROGRESS_YARDS);
      if (gained >= 1) notes.push(`Moved the ball ${Math.round(gained)} yd forward.`);
      let product = 0;
      if (this.goalFor || this.shotOnTarget > 0 || this.passDone > 0) product = 0.25;
      else if (this.shotSensible > 0 || this.passOpen > 0) product = 0.125;
      if (this.goalFor) notes.push('Scored.');
      else if (this.shotOnTarget > 0) notes.push('Shot on target.');
      else if (this.passDone > 0) notes.push(`${this.passDone} pass${this.passDone > 1 ? 'es' : ''} completed.`);
      else if (product > 0) notes.push('Good choice, it just did not come off.');
      score = secure + progress + product;
    } else {
      const side = this.sideN > 0 ? this.sideHit / this.sideN : this.wonBack ? 1 : 0;
      notes.push(`Close and goal-side ${Math.round(side * 100)}% of the time.`);
      // Not conceding and stopping shots only count when you were part of it.
      const involved = this.wonBack || side >= 0.5;
      const noGoal = this.goalAgainst ? 0 : involved ? 0.25 : 0.05;
      if (this.goalAgainst) notes.push('They scored.');
      const win = this.wonBack ? 0.25 : this.teamWonBack ? 0.05 : involved && this.awayShots === 0 && !this.goalAgainst ? 0.125 : 0;
      notes.push(this.wonBack ? 'Won the ball back.' : this.teamWonBack ? 'A teammate won it back.' : win > 0 ? 'Kept them from shooting.' : 'They got a shot away.');
      score = 0.5 * side + noGoal + win;
    }
    const choiceMissed = this.situation.kind === 'attack' && !this.goalFor && ((this.turnover && this.passLostOpen > 0) || (this.shotOnTarget === 0 && this.passDone === 0 && (this.shotSensible > 0 || this.passOpen > 0)));
    return { id: this.situation.id, score: Math.round(Math.min(1, Math.max(0, score)) * 1000) / 1000, notes, choiceMissed };
  }
}

export type WeekDelta = -1 | 0 | 1 | 2;

/** Average score to attribute points: a good week up to +2, a poor week -1. */
export function weekDelta(scores: readonly number[]): WeekDelta {
  if (scores.length === 0) return 0;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 0.75) return 2;
  if (avg >= 0.5) return 1;
  if (avg >= 0.3) return 0;
  return -1;
}

export interface AttributeChange {
  readonly attribute: AttributeId;
  readonly from: number;
  readonly to: number;
}

/**
 * Spread the week's points over the attributes the situations trained: gains go to the best-played
 * attributes (one point each, never past potential), a loss to the worst-played one and never below
 * the value a new player starts with.
 */
export function teamTrainingChanges(player: CareerPlayer, results: readonly SituationResult[]): AttributeChange[] {
  const delta = weekDelta(results.map((r) => r.score));
  if (delta === 0) return [];
  const total = new Map<AttributeId, number>();
  for (const r of results) for (const a of situationById(r.id)?.attributes ?? []) total.set(a, (total.get(a) ?? 0) + r.score);
  const ranked = ATTRIBUTES.filter((a) => total.has(a)).sort((a, b) => total.get(b)! - total.get(a)!);
  const A = CAREER_CONFIG.attributes;
  if (delta < 0) {
    const a = [...ranked].reverse().find((x) => player.attributes[x] > A.start);
    return a ? [{ attribute: a, from: player.attributes[a], to: player.attributes[a] - 1 }] : [];
  }
  const out: AttributeChange[] = [];
  for (const a of ranked) {
    if (out.length >= delta) break;
    const ceiling = Math.min(player.potential[a], A.max);
    if (player.attributes[a] < ceiling) out.push({ attribute: a, from: player.attributes[a], to: player.attributes[a] + 1 });
  }
  return out;
}

export function describeChanges(changes: readonly AttributeChange[]): string {
  if (changes.length === 0) return 'No attribute change this week.';
  return changes.map((c) => `${c.to > c.from ? '+' : ''}${c.to - c.from} ${ATTRIBUTE_LABELS[c.attribute]}`).join(', ');
}
