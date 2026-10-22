/**
 * One scheduled Team Training run: the v1.2 reference run lifecycle driving three rounds of drill attempts.
 * Guided decision mode: the player picks every assessed decision; the game carries it out, so only the
 * decision (not execution) is recorded as evidence. Framework-free.
 */
import type { RoleId } from './ref/catalog.mjs';
import { completionRequest, reduceRun, type BoundContext, type CompletionRequest, type Evidence, type RosterPlayer, type RunEvent, type RunState } from './ref/engine.mjs';
import { createScheduledRun, planSession, sessions, type Plan } from './ref/seasons.mjs';
import { assessAll, choose, createDrill, DRILL, human, options as drillOptions, step, type Assessment, type DrillOption, type DrillState } from './drill';
import { PRACTICE_CAPABILITIES, RULES_PROFILE, verifiedRecord } from './registry';

/** Live-ball seconds per round (the reference allows 30-90). Decision and explanation screens do not count. */
export const BOUT_SECONDS = 45;
/** Round 3 asks for a decision at game speed. */
export const TIMED_DECISION_SECONDS = 5;

export const HUMAN_ID = 'you';

export interface Attempt {
  readonly round: number;
  readonly index: number;
  readonly optionId: string | null;
  readonly kind: DrillOption['kind'] | null;
  readonly decision: Assessment | null;
  readonly best: readonly string[];
  readonly outcome: string;
}

export type SessionStatus = 'unavailable' | 'ready' | 'playing' | 'paused' | 'reflection' | 'complete' | 'aborted';

/** Teammates and opponents for the reference planner. The human is always `you`. */
export function trainingRoster(role: RoleId): RosterPlayer[] {
  const out: RosterPlayer[] = [{ id: HUMAN_ID, keeper: role === 'GK', role }];
  for (let i = 1; i <= 12; i++) out.push({ id: `mate-${i}`, keeper: false, role: '8' });
  for (let i = 1; i <= (role === 'GK' ? 1 : 2); i++) out.push({ id: `keeper-${i}`, keeper: true, role: 'GK' });
  return out;
}

export const sessionId = (season: number, week: number, slot: 'A' | 'B' | 'C'): string => `S${season}-W${String(week).padStart(2, '0')}-${slot}`;

/** Plan a session for a role, or explain why it is not available. Only exact verified layouts are offered. */
export function planFor(id: string, role: RoleId, earnedLevel = 1): Plan {
  const s = sessions.find((x) => x.id === id);
  if (!s) return { status: 'unavailable', reason: 'No such session' };
  const level = Math.min(earnedLevel, s.maxLevel);
  const rec = verifiedRecord(id, role, level);
  return planSession({ sessionId: id, role, earnedLevel, players: trainingRoster(role), humanId: HUMAN_ID, rulesProfile: RULES_PROFILE, practiceCapabilities: PRACTICE_CAPABILITIES, scenarioCapabilities: rec ? [rec] : [] });
}

export class TrainingSession {
  readonly plan: Plan & { status: 'selected' };
  run: RunState;
  drill: DrillState | null = null;
  readonly attempts: Attempt[] = [];
  /** Events the reference reducer refused (stale or invalid). Counted, never applied. */
  rejected = 0;
  /** Last few refusal reasons (bounded), for diagnostics. */
  readonly rejections: string[] = [];
  completion: CompletionRequest | null = null;
  private eventNo = 0;
  private tick = 0;
  private attemptNo = 0;
  private decideClock = 0;
  private windowStart = 0;
  private windowOpen = false;
  private assessed: Map<string, Assessment> | null = null;
  private readonly bound: BoundContext;

  constructor(plan: Plan, careerId: string, runId: string, seed: number) {
    if (plan.status !== 'selected') throw new Error('A verified plan is required');
    this.plan = plan;
    this.run = createScheduledRun({ plan, careerId, runId, seed, boutSeconds: BOUT_SECONDS });
    const r = this.run;
    this.bound = {
      careerId: r.careerId, seasonId: r.seasonId, weekId: r.weekId, slotId: r.slotId, sessionId: r.sessionId, variantId: r.variantId,
      layoutKey: r.layoutKey, rulesProfile: r.rulesProfile, curriculumVersion: r.curriculumVersion, scenarioVersion: r.scenarioVersion,
      humanId: r.humanId, practiceId: r.practiceId, contentVersion: r.contentVersion,
    };
  }

  get status(): SessionStatus { return this.run.status as SessionStatus; }
  /** 1-based round shown to the player. */
  get roundNumber(): number { return Math.min(3, this.run.round + 1); }
  get guided(): boolean { return this.run.round === 0; }
  get timed(): boolean { return this.run.round === 2; }
  get decideSecondsLeft(): number { return Math.max(0, TIMED_DECISION_SECONDS - this.decideClock); }

  /** Apply one event through the reference reducer. Returns false (and changes nothing) when it is refused. */
  private send(e: Omit<RunEvent, 'id' | 'runId' | 'generation'>, generation = this.run.generation): boolean {
    const ev = { ...e, id: `${this.run.runId}-e${++this.eventNo}`, runId: this.run.runId, generation } as RunEvent;
    try {
      this.run = reduceRun(this.run, ev);
      return true;
    } catch (err) {
      this.rejected++;
      if (this.rejections.length < 16) this.rejections.push(`${e.type}: ${err instanceof Error ? err.message : 'refused'}`);
      return false;
    }
  }

  /** The generation a deferred callback must present; a callback holding an older one is ignored. */
  get generation(): number { return this.run.generation; }

  startRound(): boolean {
    if (this.run.status !== 'ready') return false;
    if (!this.send({ type: 'start' })) return false;
    this.send({ type: 'telemetry', health: 'healthy' } as never);
    this.nextAttempt();
    return true;
  }

  private nextAttempt(): void {
    const seed = this.run.seed + this.run.round * 1009 + this.attemptNo * 31;
    // The first attempt of round 1 is the authored layout; every other attempt is a varied situation.
    this.drill = createDrill(this.plan.definition, seed, this.run.round === 0 && this.attemptNo === 0 ? 0 : 1);
    this.attemptNo++;
    this.assessed = null;
    this.decideClock = 0;
  }

  /** Advance real time. Bout time only runs while the ball is live (release and play-out), not on decision screens. */
  update(seconds: number): void {
    if (this.run.status !== 'playing' || !this.drill) return;
    const d = this.drill;
    if (d.phase === 'observe') {
      if (this.timed) {
        this.decideClock += seconds;
        if (this.decideClock >= TIMED_DECISION_SECONDS) this.record(null);
      }
      return;
    }
    if (d.phase === 'explain') return;
    let left = Math.min(seconds, 0.25);
    while (left > 1e-9 && (d.phase === 'release' || d.phase === 'execute') && this.run.status === 'playing') {
      const dt = Math.min(DRILL.dt, left);
      left -= dt;
      // Close the participation span before the tick that ends the bout: spans are only accepted during play.
      if (d.phase === 'execute' && this.run.elapsed + dt >= this.run.boutSeconds - 1e-9) this.closeWindow();
      if (!this.send({ type: 'tick', tick: ++this.tick, dt } as never)) return;
      step(d, dt);
      if (phaseOf(d) === 'explain') this.closeWindow();
    }
  }

  /** Options shown at the decision moment, with assessments computed from the frozen snapshot. */
  choices(): { option: DrillOption; assessment: Assessment }[] {
    const d = this.drill;
    if (!d || d.phase !== 'observe' || this.run.status !== 'playing') return [];
    this.assessed ??= assessAll(d);
    return [...this.assessed.entries()].map(([id, a]) => ({ option: optionOf(d, id), assessment: a }));
  }

  /** The player's decision. Ignored unless the run is live, the drill is waiting, and the generation still matches. */
  decide(optionId: string, generation = this.run.generation): boolean {
    const d = this.drill;
    if (!d || d.phase !== 'observe' || this.run.status !== 'playing' || generation !== this.run.generation) return false;
    const a = this.choices().find((c) => c.option.id === optionId);
    if (!a) return false;
    this.windowStart = this.run.totalPlayed;
    this.windowOpen = true;
    if (!choose(d, optionId)) return false;
    this.record(a.option, a.assessment);
    return true;
  }

  private record(option: DrillOption | null, assessment: Assessment | null = null): void {
    const d = this.drill!;
    const best = [...(this.assessed ?? assessAll(d)).entries()].filter(([, x]) => x.good).map(([id]) => id);
    if (option && assessment) {
      const opportunityId = `r${this.run.round}-a${this.attemptNo}`;
      const dimension: Evidence['dimension'] = ['press', 'delay', 'cover', 'recover'].includes(option.kind) ? 'defense'
        : ['support', 'width', 'run', 'short'].includes(option.kind) ? 'support' : 'decision';
      this.send({ type: 'evidence', evidence: { id: `${opportunityId}-${dimension}`, actorId: HUMAN_ID, opportunityId, dimension, quality: assessment.quality, observable: true, eligible: true } } as never);
    }
    this.attempts.push({ round: this.run.round, index: this.attemptNo, optionId: option?.id ?? null, kind: option?.kind ?? null, decision: assessment, best, outcome: option ? '' : 'The moment passed before a decision.' });
    if (!option) { d.phase = 'explain'; d.outcome = { kind: 'held', text: 'The moment passed before a decision.' }; }
  }

  private closeWindow(): void {
    if (!this.windowOpen) return;
    this.windowOpen = false;
    const last = this.attempts.at(-1);
    const d = this.drill;
    if (last && d?.outcome && last.outcome === '') (last as { outcome: string }).outcome = d.outcome.text;
    // The reference accepts spans of at most 5 s; a transition can play longer, so only its first 5 s count (margin for float error).
    const end = Math.min(this.run.totalPlayed, this.windowStart + 4.999);
    if (last?.optionId && end > this.windowStart) {
      const kind = last.kind && ['support', 'width', 'run', 'short'].includes(last.kind) ? 'off-ball-support' : 'active-play';
      this.send({ type: 'participation', actorId: HUMAN_ID, windowId: `w-${this.run.round}-${last.index}`, kind, observable: true, start: this.windowStart, end } as never);
    }
  }

  /** After the explanation: the next attempt, or nothing if the bout ended (status is then 'reflection'). */
  next(): void {
    if (this.run.status !== 'playing' || this.drill?.phase !== 'explain') return;
    this.nextAttempt();
  }

  /** From the round reflection to the next round, or to completion after round 3. */
  continueRound(): boolean {
    if (this.run.status !== 'reflection') return false;
    if (!this.send({ type: 'continue' })) return false;
    this.drill = null;
    this.attemptNo = 0;
    if (statusOf(this.run) === 'complete') this.completion = completionRequest(this.run, this.bound);
    return true;
  }

  pause(): boolean { return this.run.status === 'playing' && this.send({ type: 'pause' }); }
  resume(): boolean { return this.run.status === 'paused' && this.send({ type: 'resume' }); }
  abort(): boolean { return this.send({ type: 'abort' }); }

  /** Seconds of observed play the player has contributed (credit needs 30). */
  get activeSeconds(): number { return this.run.activeSeconds; }
  get humanSlot(): string { return this.drill ? human(this.drill).slot : ''; }
}

function optionOf(d: DrillState, id: string): DrillOption {
  return drillOptions(d).find((o) => o.id === id)!;
}

/** Re-read after a mutating call (defeats TypeScript's stale narrowing). */
const phaseOf = (d: DrillState): DrillState['phase'] => d.phase;
const statusOf = (r: RunState): RunState['status'] => r.status;
