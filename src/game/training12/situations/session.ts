/**
 * One scheduled Team Training run on the tactical-situation model (ts-1): three rounds of the route's three moments.
 * Round 1 plays each moment's cue variant with a hint, round 2 its counter variant with a hint, round 3 a seeded
 * variant at game speed with no hint. Each moment ends at its authored review point, never on a play timer.
 * Decision evidence (quality, hinted) is kept apart from the play-out outcome and from any movement time. Framework-free.
 */
import type { RoleId } from '../ref/catalog.mjs';
import { createRng } from '../../rng';
import { fixtureById, fixtureKey, sideText, type RoutePlan } from './index';
import { choose, createSituation, SIM, step, type SituationState } from './sim';
import { MODEL_VERSION, type Fixture, type FixtureOption, type OptionGrade, type Variant, type Verdict } from './types';

export const ROUNDS = 3;
export const MOMENTS_PER_ROUND = 3;
export const TIMED_DECISION_SECONDS = 5;
/** Credit needs this many of the nine moments decided (not timed out) and this many decided without a hint. */
export const MIN_DECIDED = 6;
export const MIN_INDEPENDENT = 3;

export type SitSessionStatus = 'ready' | 'playing' | 'paused' | 'reflection' | 'complete' | 'aborted';

export interface SitAttempt {
  readonly round: number;
  readonly moment: number;
  readonly key: string;
  readonly variant: Variant;
  readonly mirrored: boolean;
  readonly optionId: string | null;
  readonly verdict: Verdict | null;
  readonly quality: number;
  readonly hinted: boolean;
  readonly replay: boolean;
  /** Filled when the play-out reaches its review point. Never used to grade the decision. */
  outcome: string;
  /** Positions at the decision freeze, the chosen point and every good read then: what LEARN draws. */
  readonly frozen: {
    readonly actors: readonly { readonly slot: string; readonly side: string; readonly human: boolean; readonly pos: { x: number; y: number } }[];
    readonly ball: { x: number; y: number };
    readonly chosen: { x: number; y: number } | null;
    readonly good: readonly { readonly id: string; readonly label: string; readonly point: { x: number; y: number } }[];
  };
}

export interface SitCompletion {
  readonly model: typeof MODEL_VERSION;
  readonly runId: string;
  readonly sessionId: string;
  readonly role: RoleId;
  readonly moments: readonly string[];
  readonly score: number;
  readonly decisions: { readonly independent: number; readonly assisted: number };
  readonly decided: number;
  readonly creditEligible: boolean;
}

export class SituationSession {
  status: SitSessionStatus = 'ready';
  round = 0;
  moment = 0;
  sit: SituationState | null = null;
  readonly attempts: SitAttempt[] = [];
  completion: SitCompletion | null = null;
  generation = 0;
  private hintUsed = false;
  private replayRun = false;
  private decideClock = 0;
  private shown: string[] | null = null;
  private readonly rand: () => number;
  private readonly round3: Variant[];

  /** fixtures: the approved library scenes for a scored route; they are the only fixtures it resolves. Without it, the review-only proposals. */
  fixtureOf(id: string): Fixture | null {
    return this.fixtures ? this.fixtures.find((f) => f.id === id) ?? null : fixtureById(id);
  }

  constructor(readonly plan: RoutePlan, readonly runId: string, readonly seed: number, private readonly fixtures?: readonly Fixture[]) {
    if (plan.moments.length !== MOMENTS_PER_ROUND || plan.moments.some((m) => !this.fixtureOf(m.fixtureId))) throw new Error('A complete route plan is required');
    this.rand = createRng(seed >>> 0);
    this.round3 = plan.moments.map(() => (this.rand() < 0.5 ? 'cue' : 'counter'));
  }

  get roundNumber(): number { return Math.min(ROUNDS, this.round + 1); }
  get guided(): boolean { return this.round === 0; }
  get timed(): boolean { return this.round === 2; }
  get decideSecondsLeft(): number { return Math.max(0, TIMED_DECISION_SECONDS - this.decideClock); }
  get variant(): Variant { return this.round === 0 ? 'cue' : this.round === 1 ? 'counter' : this.round3[this.moment]!; }
  get mirrored(): boolean { return this.plan.moments[this.moment]!.mirrored; }
  get hinted(): boolean { return this.hintUsed; }
  get replaying(): boolean { return this.replayRun; }
  get hintAvailable(): boolean { return !this.timed && this.status === 'playing' && this.sit?.phase === 'observe'; }

  /** Fixture text for the current moment, with left/right reflected when the moment is mirrored. */
  text(s: string): string { return sideText(s, this.mirrored); }

  startRound(): boolean {
    if (this.status !== 'ready') return false;
    this.status = 'playing';
    this.load(false);
    return true;
  }

  private load(replay: boolean): void {
    const m = this.plan.moments[this.moment]!;
    this.sit = createSituation(this.fixtureOf(m.fixtureId)!, this.variant, m.mirrored);
    this.hintUsed = false;
    this.replayRun = replay;
    this.decideClock = 0;
    this.shown = null;
    this.generation++;
  }

  hint(generation = this.generation): boolean {
    if (!this.hintAvailable || generation !== this.generation) return false;
    this.hintUsed = true;
    return true;
  }

  /** Play the same moment again from its start. Practice only: never evidence or score. */
  replay(generation = this.generation): boolean {
    if (this.status !== 'playing' || this.sit?.phase !== 'explain' || this.timed || generation !== this.generation) return false;
    this.load(true);
    return true;
  }

  update(seconds: number): void {
    const s = this.sit;
    if (this.status !== 'playing' || !s) return;
    if (s.phase === 'observe') {
      if (this.timed) {
        this.decideClock += seconds;
        if (this.decideClock >= TIMED_DECISION_SECONDS) this.commit(null);
      }
      return;
    }
    let left = Math.min(seconds, 0.25);
    while (left > 1e-9 && (s.phase === 'release' || s.phase === 'execute')) {
      const dt = Math.min(SIM.dt, left);
      left -= dt;
      step(s, dt);
    }
    const last = this.attempts.at(-1);
    if (phaseOf(s) === 'explain' && last && last.outcome === '' && s.outcome) last.outcome = s.outcome.text;
  }

  /** The options at the freeze, in a seeded order that never says which is best. Labels are neutral. */
  choices(): { option: FixtureOption; label: string }[] {
    const s = this.sit;
    if (!s || s.phase !== 'observe' || this.status !== 'playing') return [];
    if (!this.shown) {
      const ids = s.options.filter((o) => s.spec.grades[o.id]).map((o) => o.id);
      const r = createRng((this.seed + this.round * 101 + this.moment * 13 + (this.replayRun ? 7 : 0)) >>> 0);
      for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ids[i], ids[j]] = [ids[j]!, ids[i]!]; }
      this.shown = ids;
    }
    return this.shown.map((id) => { const o = s.options.find((x) => x.id === id)!; return { option: o, label: this.text(o.label) }; });
  }

  grade(optionId: string): OptionGrade | null { return this.sit?.spec.grades[optionId] ?? null; }

  decide(optionId: string, generation = this.generation): boolean {
    if (generation !== this.generation || !this.choices().some((c) => c.option.id === optionId)) return false;
    return this.commit(optionId);
  }

  private commit(optionId: string | null): boolean {
    const s = this.sit!;
    const g = optionId ? s.spec.grades[optionId]! : null;
    const chosen = optionId ? s.options.find((o) => o.id === optionId)! : null;
    const good = s.options.filter((o) => s.spec.grades[o.id]?.verdict === 'good').map((o) => ({ id: o.id, label: this.text(o.label), point: { ...o.point } }));
    const frozen = { actors: s.actors.map((a) => ({ slot: a.slot, side: a.side, human: a.human, pos: { x: a.pos.x, y: a.pos.y } })), ball: { x: s.ball.pos.x, y: s.ball.pos.y }, chosen: chosen ? { ...chosen.point } : null, good };
    if (!choose(s, optionId)) return false;
    const m = this.plan.moments[this.moment]!;
    this.attempts.push({ round: this.round, moment: this.moment, key: fixtureKey(this.fixtureOf(m.fixtureId)!), variant: s.variant, mirrored: s.mirrored, optionId, verdict: g?.verdict ?? null, quality: g?.quality ?? 0, hinted: this.hintUsed, replay: this.replayRun, outcome: '', frozen });
    return true;
  }

  /** After a moment's review: the next moment, or the round reflection after the third. */
  next(): void {
    if (this.status !== 'playing' || this.sit?.phase !== 'explain') return;
    if (this.moment + 1 < MOMENTS_PER_ROUND) { this.moment++; this.load(false); return; }
    this.status = 'reflection';
    this.sit = null;
    this.generation++;
  }

  continueRound(): boolean {
    if (this.status !== 'reflection') return false;
    if (this.round + 1 < ROUNDS) { this.round++; this.moment = 0; this.status = 'playing'; this.load(false); return true; }
    this.status = 'complete';
    this.completion = this.complete();
    return true;
  }

  private complete(): SitCompletion {
    const real = this.attempts.filter((a) => !a.replay);
    const decided = real.filter((a) => a.optionId !== null).length;
    const dc = this.decisionCounts;
    return {
      model: MODEL_VERSION, runId: this.runId, sessionId: this.plan.sessionId, role: this.plan.role,
      moments: this.plan.moments.map((m) => fixtureKey(this.fixtureOf(m.fixtureId)!)),
      score: this.score, decisions: dc, decided,
      creditEligible: real.length === ROUNDS * MOMENTS_PER_ROUND && decided >= MIN_DECIDED && dc.independent >= MIN_INDEPENDENT,
    };
  }

  pause(): boolean { if (this.status !== 'playing') return false; this.status = 'paused'; return true; }
  resume(): boolean { if (this.status !== 'paused') return false; this.status = 'playing'; return true; }
  abort(): boolean {
    if (this.status === 'complete' || this.status === 'aborted') return false;
    this.status = 'aborted'; this.generation++; return true;
  }

  get decisionCounts(): { independent: number; assisted: number } {
    const real = this.attempts.filter((a) => a.optionId !== null && !a.replay);
    return { independent: real.filter((a) => !a.hinted).length, assisted: real.filter((a) => a.hinted).length };
  }

  /** Mean decision quality over the nine moments; a hinted decision is worth half, a timed-out one zero. */
  get score(): number {
    const real = this.attempts.filter((a) => !a.replay);
    if (!real.length) return 0;
    return real.reduce((t, a) => t + a.quality * (a.hinted ? 0.5 : 1), 0) / real.length;
  }
}

const phaseOf = (s: SituationState): SituationState['phase'] => s.phase;
