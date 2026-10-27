/**
 * Performance-based home training (owner spec, 2026-10-27). Each home skill has Phases 1–5; a phase advances only
 * from logged performance: the target met in at least 2 of 3 attempts, in 2 separate sessions at that phase's own
 * setup. Phases are derived by replaying the logs, so a correction edits the original entry and never adds a
 * session. Targets are PROPOSED starting values for coaching review (docs/training/home/TARGETS.md), not age
 * standards. Framework-free.
 */
export type HomeSkillId = 'juggling' | 'firstTouch' | 'passing';
export const HOME_SKILLS: readonly HomeSkillId[] = ['juggling', 'firstTouch', 'passing'];
export type Variation = 'touch-and-catch' | 'bounce-assisted' | 'continuous' | 'standard' | 'weaker-foot' | 'timed';
export type ScoreKind = 'count' | 'reps' | 'timed';
export type Phase = 1 | 2 | 3 | 4 | 5;

export interface PhaseSpec {
  readonly phase: Phase;
  readonly name: string;
  readonly activityIds: readonly string[];
  readonly variation: Variation;
  readonly kind: ScoreKind;
  /** count: contacts in one attempt; reps: successes out of `of`; timed: clean repetitions with at most `maxErrors`. */
  readonly target: number;
  readonly of?: number;
  readonly maxErrors?: number;
  readonly what: string;
  readonly success: string;
  readonly record: string;
  /** Entry check thresholds (manual entries only): above `max`, or above median × factor + plus, or a jump of `jump`. */
  readonly surprise: { readonly max: number; readonly factor?: number; readonly plus?: number; readonly jump?: number };
  /** Simpler variation offered after repeated difficulty (the phase target is unchanged). */
  readonly easier: string;
}

const PHASE_NAMES = ['Basic control', 'Repeatable control', 'Linked actions', 'Variation and weaker foot', 'Applied challenge'] as const;
const p = (phase: Phase, s: Omit<PhaseSpec, 'phase' | 'name'>): PhaseSpec => ({ phase, name: PHASE_NAMES[phase - 1]!, ...s });
const reps = (target: number) => ({ kind: 'reps' as const, target, of: 10, record: 'Successes out of 10, three sets', surprise: { max: 10, jump: 5 } });
const timed = { kind: 'timed' as const, target: 3, maxErrors: 2, record: 'Duration, clean circuits and errors, three tries', surprise: { max: 10, jump: 3 } };

export const HOME_PHASES: Readonly<Record<HomeSkillId, readonly PhaseSpec[]>> = {
  juggling: [
    p(1, { activityIds: ['jg-1', 'jg-2'], variation: 'touch-and-catch', kind: 'count', target: 3, what: 'One contact, then catch. Repeat.', success: 'A clean contact followed by a catch', record: 'Catches in a row, three attempts', surprise: { max: 40, factor: 3, plus: 10 }, easier: 'Let it bounce before the contact.' }),
    p(2, { activityIds: ['jg-3', 'jg-4'], variation: 'bounce-assisted', kind: 'count', target: 6, what: 'Keep it going with one bounce allowed between contacts.', success: 'A contact (one bounce allowed between)', record: 'Contacts, three attempts', surprise: { max: 40, factor: 3, plus: 10 }, easier: 'Two bounces allowed.' }),
    p(3, { activityIds: ['jg-5', 'jg-6'], variation: 'continuous', kind: 'count', target: 5, what: 'Keep it up without a bounce.', success: 'A contact without the ball touching the floor', record: 'Contacts in a row, three attempts', surprise: { max: 80, factor: 3, plus: 10 }, easier: 'Use bounce-assisted for one attempt.' }),
    p(4, { activityIds: ['jg-7'], variation: 'weaker-foot', kind: 'count', target: 8, what: 'Continuous juggling with at least one weaker-foot contact.', success: 'A contact without a bounce; one or more with the weaker foot', record: 'Contacts in a row, three attempts', surprise: { max: 80, factor: 3, plus: 10 }, easier: 'Strong foot only, then add one weaker-foot touch.' }),
    p(5, { activityIds: ['jg-8'], variation: 'continuous', kind: 'reps', target: 2, of: 3, what: 'Juggle 5, settle, pass to a spot.', success: 'A clean juggle-settle-pass sequence', record: 'Clean sequences out of 3, three attempts', surprise: { max: 3, jump: 3 }, easier: 'Juggle 3 before settling.' }),
  ],
  firstTouch: [
    p(1, { activityIds: ['ft-soft-landing'], variation: 'standard', ...reps(6), what: 'Drop and cushion the ball.', success: 'The ball stays within one step', easier: 'Drop from knee height.' }),
    p(2, { activityIds: ['ft-side-door'], variation: 'standard', ...reps(6), what: 'First touch through the chosen gate.', success: 'The first touch alone goes through the gate', easier: 'Use wider gates.' }),
    p(3, { activityIds: ['ft-touch-turn-travel'], variation: 'standard', ...reps(7), what: 'Touch, turn and travel.', success: 'Touch, turn and travel with no extra touch', easier: 'Turn with the ball stopped first.' }),
    p(4, { activityIds: ['ft-called-exit'], variation: 'weaker-foot', ...reps(6), what: 'Exit through the called gate with the weaker foot.', success: 'Called gate, weaker foot', easier: 'Strong foot with an early call.' }),
    p(5, { activityIds: ['ft-circuit'], variation: 'timed', ...timed, what: 'First-touch circuit, timed.', success: 'A clean circuit', easier: 'Walk the circuit.' }),
  ],
  passing: [
    p(1, { activityIds: ['ps-wide-gate'], variation: 'standard', ...reps(6), what: 'Pass through a wide gate.', success: 'Through the gate along the ground', easier: 'Move closer.' }),
    p(2, { activityIds: ['ps-two-foot'], variation: 'standard', ...reps(6), what: 'Alternate feet to the target.', success: 'Target hit, feet alternating', easier: 'Strong foot twice, weaker once.' }),
    p(3, { activityIds: ['ps-near-far'], variation: 'standard', ...reps(7), what: 'Alternate near and far targets.', success: 'The called distance reached along the ground', easier: 'Closer far target.' }),
    p(4, { activityIds: ['ps-channel'], variation: 'weaker-foot', ...reps(6), what: 'Pass along the channel with the weaker foot.', success: 'The ball stays inside the channel', easier: 'Wider channel, strong foot.' }),
    p(5, { activityIds: ['ps-circuit'], variation: 'timed', ...timed, what: 'Passing circuit, timed.', success: 'A clean circuit', easier: 'One gate only.' }),
  ],
};

export interface Attempt {
  /** count: contacts; reps/timed: successes (clean repetitions). */
  readonly value: number;
  readonly of?: number;
  readonly seconds?: number;
  readonly errors?: number;
}
export interface HomeLog {
  readonly id: string;
  readonly week: number;
  readonly skill: HomeSkillId;
  readonly phase: Phase;
  readonly activityId: string;
  readonly variation: Variation;
  readonly foot: 'left' | 'right' | 'both' | null;
  readonly source: 'self-reported' | 'minigame';
  readonly attempts: readonly Attempt[];
  readonly at: number;
  /** The player confirmed an unusually high entry ("My Score Is Correct"); cleared when the entry changes. */
  readonly confirmed: boolean;
  /** Times this entry was corrected (the session itself is still one session). */
  readonly revision: number;
}

export const specFor = (skill: HomeSkillId, phase: number): PhaseSpec | null => HOME_PHASES[skill]?.[phase - 1] ?? null;
const nonNegInt = (n: unknown, max: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;

/** Reject malformed entries; zero is valid. Returns an error message or null. */
export function attemptsError(spec: PhaseSpec, attempts: readonly Attempt[]): string | null {
  if (!Array.isArray(attempts) || attempts.length !== 3) return 'Log exactly three attempts.';
  for (const a of attempts) {
    if (!a || typeof a !== 'object') return 'Unreadable attempt.';
    if (spec.kind === 'count') {
      if (!nonNegInt(a.value, 10_000)) return 'Counts must be whole numbers from 0.';
    } else {
      const of = spec.kind === 'reps' ? spec.of! : a.of;
      if (!nonNegInt(of, 1000) || of < 1) return 'Attempts must be at least 1.';
      if (!nonNegInt(a.value, 1000)) return 'Successes must be whole numbers from 0.';
      if (a.value > of) return 'Successes cannot be more than attempts.';
      if (spec.kind === 'timed' && (!nonNegInt(a.seconds, 3600) || !nonNegInt(a.errors, 1000))) return 'Timed tries need a duration in seconds and an error count.';
    }
  }
  return null;
}

export const meets = (spec: PhaseSpec, a: Attempt): boolean => (spec.kind === 'timed' ? a.value >= spec.target && (a.errors ?? 0) <= (spec.maxErrors ?? 0) : a.value >= spec.target);
const qualifies = (spec: PhaseSpec, l: HomeLog): boolean => l.variation === spec.variation && spec.activityIds.includes(l.activityId) && l.attempts.filter((a) => meets(spec, a)).length >= 2;
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2) : 0;
};
const best = (l: HomeLog): number => Math.max(...l.attempts.map((a) => a.value));
const sameSetup = (a: HomeLog, b: HomeLog): boolean => a.skill === b.skill && a.activityId === b.activityId && a.variation === b.variation && a.foot === b.foot && a.source === b.source;

export interface SkillProgress {
  readonly skill: HomeSkillId;
  readonly phase: Phase;
  readonly spec: PhaseSpec;
  /** Separate qualifying sessions at the current phase (0 or 1; 2 advances). */
  readonly qualifying: number;
  readonly personalBest: number | null;
  readonly recentMedian: number | null;
  /** Three or more sessions in a row below target at this phase: offer the easier variation. */
  readonly struggling: boolean;
}

/** Replay the logs in order. Every skill starts at Phase 1; only qualifying sessions move it, nothing moves it back. */
export function skillProgress(logs: readonly HomeLog[], skill: HomeSkillId): SkillProgress {
  let phase: Phase = 1;
  let qual = 0;
  let misses = 0;
  const mine = logs.filter((l) => l.skill === skill).slice().sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
  for (const l of mine) {
    const spec = specFor(skill, phase)!;
    if (l.phase !== phase) continue;
    if (qualifies(spec, l)) {
      misses = 0;
      if (++qual >= 2 && phase < 5) {
        phase = (phase + 1) as Phase;
        qual = 0;
      }
    } else misses++;
  }
  const spec = specFor(skill, phase)!;
  const here = mine.filter((l) => l.phase === phase && l.variation === spec.variation);
  return { skill, phase, spec, qualifying: qual, personalBest: here.length ? Math.max(...here.map(best)) : null, recentMedian: here.length ? median(here.at(-1)!.attempts.map((a) => a.value)) : null, struggling: misses >= 3 };
}

export type FeedbackKind = 'check' | 'first' | 'progress' | 'personalBest' | 'persistence' | 'needsWork';
export const FEEDBACK: Readonly<Record<FeedbackKind, string>> = {
  check: "That's a HUGE score!!! Are you sure you're not making it up to get ahead in the game? Cheaters never prosper! Do the work, double-check your count, and report your score again.",
  first: 'Starting score saved. Now you have a mark to build from.',
  progress: "That practice is paying off! You're getting more consistent. Let's see if you can match it next session.",
  personalBest: "New personal best! Now let's work on reaching it more consistently.",
  persistence: "You completed another practice session. That matters. Your best score won't improve every time—keep building.",
  needsWork: "Not there yet—and that's okay. Slow it down, focus on clean touches, and aim for one more next time.",
};

/** The entry check: unusually high for this assignment's scoring, or a sudden jump. Manual entries only. */
export function surprising(logs: readonly HomeLog[], log: HomeLog): boolean {
  if (log.source !== 'self-reported' || log.confirmed) return false;
  const spec = specFor(log.skill, log.phase);
  if (!spec) return false;
  const prior = logs.filter((l) => l.id !== log.id && sameSetup(l, log) && l.at <= log.at);
  const values = log.attempts.map((a) => a.value);
  const top = Math.max(...values);
  const s = spec.surprise;
  if (spec.kind === 'count') {
    if (top > s.max) return true;
    if (prior.length && s.factor !== undefined && top > median(prior.flatMap((l) => l.attempts.map((a) => a.value))) * s.factor + (s.plus ?? 0)) return true;
    return false;
  }
  if (!prior.length) return values.every((v, i) => v === (spec.kind === 'reps' ? spec.of : log.attempts[i]!.of)) && (spec.of ?? 0) >= 10;
  return s.jump !== undefined && median(values) - median(prior.flatMap((l) => l.attempts.map((a) => a.value))) >= s.jump;
}

/** Deterministic feedback from the recorded evidence, in the owner's selection order. */
export function feedbackFor(logs: readonly HomeLog[], log: HomeLog): FeedbackKind {
  if (surprising(logs, log)) return 'check';
  const prior = logs.filter((l) => l.id !== log.id && sameSetup(l, log) && (l.at < log.at || (l.at === log.at && l.id < log.id)));
  if (!prior.length) return 'first';
  const last = prior.at(-1)!;
  const med = median(log.attempts.map((a) => a.value));
  const lastMed = median(last.attempts.map((a) => a.value));
  const prevBest = Math.max(...prior.map(best));
  if (med > lastMed) return 'progress';
  if (best(log) > prevBest) return 'personalBest';
  const spec = specFor(log.skill, log.phase)!;
  if (!qualifies(spec, log) && prior.length >= 1 && med <= lastMed && prior.length >= 2) return 'persistence';
  return 'needsWork';
}
