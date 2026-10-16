import type { MatchSim } from '../match/sim';
import type { MatchPlayerId, MatchState } from '../match/types';
import { createRng } from '../rng';
import { extractFacts, type CoachFacts } from './facts';
import { buildMoment } from './moment';
import { makeNames } from './names';
import { CATALOG } from './templates';
import { COACH_TUNING, type CoachTuning } from './tuning';
import type { EvaluatedOption, Grade, Intention, MomentView, NameFn, TemplateDef, Topic } from './types';
import { assertValidCatalog } from './validate';

export interface CoachConfig {
  readonly sessionId: string;
  /** Moments per session: clamped to 4–6, default 5. */
  readonly moments?: number;
  readonly sessionSeconds?: number;
  readonly seed?: number;
  readonly names?: Partial<Record<MatchPlayerId, string>>;
  readonly catalog?: readonly TemplateDef[];
  readonly tuning?: CoachTuning;
}

/** What the host knows that the sim does not: an active gameplay gesture or another overlay on screen. */
export interface HostContext {
  readonly gestureActive: boolean;
  readonly overlayOpen: boolean;
}

export type CoachPhase = 'playing' | 'question' | 'feedback' | 'summary';
export type ObservedAction = 'pass' | 'shot' | 'carry' | 'feint' | 'lost' | 'moved' | 'none';

export interface LearningEntry {
  readonly sessionId: string;
  readonly momentId: string;
  readonly templateId: string;
  readonly templateVersion: number;
  readonly topic: Topic;
  readonly openedAt: number;
  readonly facts: CoachFacts;
  readonly options: readonly { readonly id: string; readonly text: string; readonly grade: Grade }[];
  selectedOptionId: string | null;
  selectedGrade: Grade | null;
  /** The intention the answer stands for, separate from what the player then actually did. */
  intention: Intention | null;
  intentionStatus: 'pending' | 'cue' | 'applied' | 'deferred' | 'rejected' | 'none';
  observed: { action: ObservedAction; detail: string; outcome: string } | null;
}

export interface CoachSummary {
  readonly sessionId: string;
  readonly target: number;
  readonly completed: number;
  readonly shortfall: number;
  readonly abandoned: boolean;
  readonly strengths: readonly string[];
  readonly nextFocus: string;
  readonly entries: readonly LearningEntry[];
}

/** Future weekly-focus / RPG progression can consume finished sessions through this; nothing is persisted here. */
export interface LearningSink {
  recordSession(summary: CoachSummary): void;
}

export interface CoachCue {
  readonly action: string;
  readonly targetId: MatchPlayerId | null;
  readonly carrierId: MatchPlayerId | null;
  readonly until: number;
}

const OBJECTIVES: Record<Topic, string> = {
  carry: 'carrying into open space',
  release: 'passing quickly under pressure',
  combine: 'quick passes with a nearby teammate',
  switch: 'switching play to the open side',
  protect: 'protecting the ball when pressed',
  turn: 'turning to face forward when free',
  shoot: 'shooting when the chance is clear',
  chance: 'creating a better chance',
  risk: 'choosing safe or bold play at the right time',
  support: 'moving to support the player with the ball',
  press: 'pressing at the right moment',
  recover: 'getting back goal-side',
  cover: 'covering for a teammate',
  balance: 'keeping the team balanced',
  space: 'finding and using space',
};

/**
 * Coach Moment orchestration on top of `MatchSim`. Scheduling, eligibility/evaluation (`moment.ts`),
 * consequences (sim `coachIntent` / on-ball cues) and the learning record are kept separate; the UI only
 * reads `view`, `phase`, `cue` and `summary()` and calls `answer()` / `continueMoment()`.
 */
export class CoachDirector {
  readonly target: number;
  readonly sessionSeconds: number;
  readonly catalog: readonly TemplateDef[];
  private readonly C: CoachTuning;
  private readonly rng: () => number;
  private readonly namesInput: Partial<Record<MatchPlayerId, string>>;
  phase: CoachPhase = 'playing';
  view: MomentView | null = null;
  selected: EvaluatedOption | null = null;
  cue: CoachCue | null = null;
  readonly entries: LearningEntry[] = [];
  abandoned = false;
  private sessionId: string;
  private lastReleaseAt = -Infinity;
  private lastTopic: Topic | null = null;
  private usage = new Map<string, { count: number; lastAt: number }>();
  private observing: { entry: LearningEntry; from: number; startedAt: number; startDist: number | null } | null = null;
  private deferred: Extract<Intention, { kind: 'offBall' }> | null = null;

  constructor(cfg: CoachConfig) {
    this.C = cfg.tuning ?? COACH_TUNING;
    const m = Number.isFinite(cfg.moments) ? Math.round(cfg.moments as number) : this.C.moments.default;
    this.target = Math.min(this.C.moments.max, Math.max(this.C.moments.min, m));
    this.sessionSeconds = cfg.sessionSeconds && cfg.sessionSeconds > 0 ? cfg.sessionSeconds : this.C.sessionSeconds;
    this.catalog = assertValidCatalog(cfg.catalog ?? CATALOG);
    this.rng = createRng(cfg.seed ?? 1);
    this.namesInput = cfg.names ?? {};
    this.sessionId = cfg.sessionId;
  }

  get id(): string {
    return this.sessionId;
  }

  names(s: MatchState): NameFn {
    return makeNames((id) => s.players[id]?.role ?? id, this.namesInput);
  }

  timeLeft(s: MatchState): number {
    return Math.max(0, this.sessionSeconds - s.simTime);
  }

  /** Earliest sim time the k-th moment may open, so moments spread across the session. */
  slotStart(k: number): number {
    return (this.sessionSeconds * (k + 0.35)) / this.target;
  }

  /** Call once per frame after the sim stepped. Returns the moment view if one just opened. */
  update(sim: MatchSim, host: HostContext): MomentView | null {
    const s = sim.state;
    this.observe(s);
    this.applyDeferred(sim);
    if (this.cue && s.simTime >= this.cue.until) this.cue = null;
    if (this.cue && s.ball.owner !== this.cue.carrierId) this.cue = null;
    if (this.phase !== 'playing') return null;
    if (s.simTime >= this.sessionSeconds || s.phase === 'fulltime') {
      this.endSession(sim);
      return null;
    }
    if (this.entries.length >= this.target) return null;
    if (!this.safeToInterrupt(s, host)) return null;
    if (s.simTime < this.slotStart(this.entries.length) || s.simTime - this.lastReleaseAt < this.C.minGapSeconds) return null;
    const facts = extractFacts(s, sim.tuning, 'home', { timeLeft: this.timeLeft(s), C: this.C });
    if (!facts) return null;
    const view = this.pick(facts, this.names(s), `${this.sessionId}#${this.entries.length + 1}`);
    if (!view) return null;
    if (!sim.command({ type: 'coachHold' })) return null;
    this.open(view, facts);
    return view;
  }

  /** Never interrupt an active gesture, a shot in flight, a goal, another overlay, or a paused game. */
  safeToInterrupt(s: MatchState, host: HostContext): boolean {
    if (s.paused || host.gestureActive || host.overlayOpen) return false;
    if (s.phase === 'aiming' || s.phase === 'kickoff' || s.aim) return false;
    if (s.phase === 'stopped') return s.stoppage?.reason === 'out';
    if (!s.ball.owner && s.ball.kick) return false;
    return s.phase === 'live';
  }

  private pick(facts: CoachFacts, names: NameFn, momentId: string): MomentView | null {
    const used = new Set(this.entries.map((e) => e.topic));
    const candidates: MomentView[] = [];
    for (const t of this.catalog) {
      const u = this.usage.get(t.id);
      if (u && (u.count >= t.maxPerSession || facts.simTime - u.lastAt < t.cooldownSeconds)) continue;
      if (t.topic === this.lastTopic) continue;
      const v = buildMoment(t, facts, names, momentId);
      if (v) candidates.push(v);
    }
    if (candidates.length === 0) return null;
    const fresh = candidates.filter((v) => !used.has(v.topic));
    const pool = fresh.length > 0 ? fresh : candidates;
    return pool[Math.floor(this.rng() * pool.length) % pool.length] ?? null;
  }

  private open(view: MomentView, facts: CoachFacts): void {
    this.view = view;
    this.selected = null;
    this.phase = 'question';
    this.cue = null;
    this.finishObservation('another moment opened');
    this.entries.push({
      sessionId: this.sessionId,
      momentId: view.momentId,
      templateId: view.templateId,
      templateVersion: view.templateVersion,
      topic: view.topic,
      openedAt: facts.simTime,
      facts,
      options: view.options.map((o) => ({ id: o.id, text: o.text, grade: o.grade })),
      selectedOptionId: null,
      selectedGrade: null,
      intention: null,
      intentionStatus: 'pending',
      observed: null,
    });
    const u = this.usage.get(view.templateId);
    this.usage.set(view.templateId, { count: (u?.count ?? 0) + 1, lastAt: facts.simTime });
    this.lastTopic = view.topic;
  }

  /** Untimed: the question waits for exactly one answer. Duplicate or late taps return false. */
  answer(optionId: string): boolean {
    if (this.phase !== 'question' || !this.view) return false;
    const o = this.view.options.find((x) => x.id === optionId);
    const entry = this.entries[this.entries.length - 1];
    if (!o || !entry) return false;
    this.selected = o;
    entry.selectedOptionId = o.id;
    entry.selectedGrade = o.grade;
    entry.intention = o.intention;
    this.phase = 'feedback';
    return true;
  }

  /** Applies the consequence and releases the coach hold exactly once. */
  continueMoment(sim: MatchSim): boolean {
    if (this.phase !== 'feedback' || !this.selected) return false;
    const s = sim.state;
    const entry = this.entries[this.entries.length - 1]!;
    const it = this.selected.intention;
    let startDist: number | null = null;
    if (it.kind === 'onBall') {
      entry.intentionStatus = 'cue';
      this.cue = { action: it.action, targetId: it.targetId, carrierId: s.ball.owner, until: s.simTime + this.C.cueSeconds };
    } else if (it.kind === 'offBall') {
      const p = s.players[it.playerId];
      startDist = p ? Math.hypot(p.pos.x - it.target.x, p.pos.y - it.target.y) : null;
      if (s.phase === 'stopped') {
        this.deferred = it;
        entry.intentionStatus = 'deferred';
      } else {
        entry.intentionStatus = sim.command({ type: 'coachIntent', playerId: it.playerId, kind: it.intent, target: it.target, seconds: this.C.intentSeconds, source: entry.templateId }) ? 'applied' : 'rejected';
      }
    } else entry.intentionStatus = 'none';
    sim.command({ type: 'coachRelease' });
    this.phase = 'playing';
    this.view = null;
    this.selected = null;
    this.lastReleaseAt = s.simTime;
    this.observing = { entry, from: s.events[s.events.length - 1]?.seq ?? 0, startedAt: s.simTime, startDist };
    return true;
  }

  private applyDeferred(sim: MatchSim): void {
    const d = this.deferred;
    if (!d) return;
    const s = sim.state;
    if (s.phase !== 'live') return;
    this.deferred = null;
    const entry = this.observing?.entry;
    const ok = sim.command({ type: 'coachIntent', playerId: d.playerId, kind: d.intent, target: d.target, seconds: this.C.intentSeconds, source: entry?.templateId ?? 'restart' });
    if (entry) entry.intentionStatus = ok ? 'applied' : 'rejected';
  }

  /** Records what actually happened after Continue, separately from the chosen intention. */
  private observe(s: MatchState): void {
    const ob = this.observing;
    if (!ob) return;
    const entry = ob.entry;
    const it = entry.intention;
    const carrier = entry.facts.carrier?.id ?? null;
    for (const e of s.events) {
      if (e.seq <= ob.from) continue;
      ob.from = e.seq;
      const o = entry.observed;
      if (e.type === 'goal') return this.closeObs(s, o?.action ?? 'none', o?.detail ?? '', e.detail);
      if (e.type === 'out') return this.closeObs(s, o?.action ?? 'none', o?.detail ?? '', 'ball went out');
      if (e.type === 'saved' || e.type === 'parried') return this.closeObs(s, o?.action ?? 'none', o?.detail ?? '', `${e.by?.startsWith('H') ? 'our' : 'their'} keeper ${e.type} it`);
      if (e.type === 'possession') {
        const won = e.detail === 'home';
        if (!o) entry.observed = { action: won ? 'none' : 'lost', detail: '', outcome: '' };
        return this.closeObs(s, entry.observed!.action, entry.observed!.detail, won ? 'we won the ball' : 'possession lost');
      }
      if (it?.kind === 'onBall' && e.by === carrier && !o) {
        if (e.type === 'pass') entry.observed = { action: 'pass', detail: e.detail ? `to ${e.detail}` : '', outcome: '' };
        else if (e.type === 'shot') entry.observed = { action: 'shot', detail: '', outcome: '' };
        else if (e.type === 'feint') entry.observed = { action: 'feint', detail: '', outcome: '' };
        else if (e.type === 'dribble') entry.observed = { action: 'carry', detail: '', outcome: '' };
      }
      if (e.type === 'received' && entry.observed?.action === 'pass') return this.closeObs(s, 'pass', entry.observed.detail, `pass completed to ${e.by ?? ''}`.trim());
    }
    if (s.simTime - ob.startedAt >= this.C.observeSeconds) {
      this.closeObs(s, entry.observed?.action ?? 'none', entry.observed?.detail ?? '', s.possession === 'home' ? 'we kept the ball' : 'they have the ball');
    }
  }

  /** Off-ball answers are observed as movement toward the instructed spot (the player, not the user, acts). */
  private closeObs(s: MatchState, action: ObservedAction, detail: string, outcome: string): void {
    const ob = this.observing;
    if (!ob) return;
    const it = ob.entry.intention;
    if (it?.kind === 'offBall' && action !== 'lost') {
      const p = s.players[it.playerId];
      const d = p ? Math.hypot(p.pos.x - it.target.x, p.pos.y - it.target.y) : null;
      if (d !== null && ob.startDist !== null && d < ob.startDist - 1) {
        action = 'moved';
        detail = `${it.playerId} moved ${Math.round(ob.startDist - d)} yd toward the spot`;
      }
    }
    ob.entry.observed = { action, detail, outcome };
    this.observing = null;
  }

  private finishObservation(outcome: string): void {
    const ob = this.observing;
    if (ob && !ob.entry.observed) ob.entry.observed = { action: 'none', detail: '', outcome };
    this.observing = null;
  }

  private endSession(sim: MatchSim): void {
    this.finishObservation('session ended');
    this.deferred = null;
    this.cue = null;
    sim.command({ type: 'coachIntentClear', reason: 'session ended' });
    sim.command({ type: 'coachHold' });
    this.phase = 'summary';
  }

  /** Leaving mid-session: no target applies, nothing pending stays active. */
  abandon(sim: MatchSim | null): void {
    if (this.phase === 'summary') return;
    this.abandoned = true;
    const e = this.entries[this.entries.length - 1];
    if (e && e.selectedOptionId === null) e.intentionStatus = 'none';
    this.finishObservation('session abandoned');
    this.deferred = null;
    this.cue = null;
    if (sim) {
      sim.command({ type: 'coachIntentClear', reason: 'abandoned' });
      sim.command({ type: 'coachRelease' });
    }
    this.view = null;
    this.selected = null;
    this.phase = 'summary';
  }

  summary(): CoachSummary {
    const done = this.entries.filter((e) => e.selectedOptionId !== null);
    const strongTopics = [...new Set(done.filter((e) => e.selectedGrade === 'strong').map((e) => e.topic))];
    const risky = done.filter((e) => e.selectedGrade === 'risky').map((e) => e.topic);
    const reasonable = done.filter((e) => e.selectedGrade === 'reasonable').map((e) => e.topic);
    const focusTopic: Topic | undefined = risky[0] ?? reasonable[0];
    const unseen = (['support', 'press', 'cover', 'switch', 'carry'] as const).find((t) => !done.some((e) => e.topic === t));
    return {
      sessionId: this.sessionId,
      target: this.target,
      completed: done.length,
      shortfall: this.abandoned ? 0 : Math.max(0, this.target - done.length),
      abandoned: this.abandoned,
      strengths: strongTopics.map((t) => `Good decisions on ${OBJECTIVES[t]}.`),
      nextFocus: focusTopic ? `Next match, focus on ${OBJECTIVES[focusTopic]}.` : `Next match, focus on ${OBJECTIVES[unseen ?? 'support']}.`,
      entries: this.entries,
    };
  }
}

export { OBJECTIVES as TOPIC_OBJECTIVES };
