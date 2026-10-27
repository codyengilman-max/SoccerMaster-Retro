/** Text entry and display for performance-based home training (framework-free; the scene only shows these). */
import { FEEDBACK, feedbackFor, skillProgress, specFor, type Attempt, type HomeLog, type HomeSkillId, type PhaseSpec, type SkillProgress } from './homeMastery';

export const SKILL_LABEL: Readonly<Record<HomeSkillId, string>> = { juggling: 'Juggling', firstTouch: 'First touch', passing: 'Passing' };

/** How to type three attempts for this phase. */
export const entryHint = (spec: PhaseSpec): string =>
  spec.kind === 'count'
    ? 'Type your three attempts, e.g. 4 6 5'
    : spec.kind === 'reps'
      ? `Type successes out of ${spec.of} for three attempts, e.g. ${Math.max(0, spec.of! - 3)} ${Math.max(0, spec.of! - 2)} ${Math.max(0, spec.of! - 4)}`
      : 'Type three attempts as clean reps/seconds/errors, e.g. 8/30/1 9/30/0 7/30/2';

/** Parses typed scores. Zero is fine; anything negative, fractional or malformed is rejected (reducer checks again). */
export function parseAttempts(spec: PhaseSpec, text: string): Attempt[] | string {
  const parts = String(text ?? '').trim().split(/[\s,]+/).filter(Boolean);
  if (parts.length !== 3) return 'Log exactly three attempts.';
  const whole = (s: string): number | null => (/^\d{1,5}$/.test(s) ? Number(s) : null);
  const out: Attempt[] = [];
  for (const p of parts) {
    if (spec.kind === 'timed') {
      const f = p.split('/').map(whole);
      if (f.length !== 3 || f.some((n) => n === null)) return 'Timed tries need clean reps/seconds/errors, whole numbers from 0.';
      const [value, seconds, errors] = f as number[];
      out.push({ value: value!, of: Math.max(1, value! + errors!), seconds: seconds!, errors: errors! });
      continue;
    }
    const n = whole(p);
    if (n === null) return 'Scores must be whole numbers from 0.';
    if (spec.kind === 'reps' && n > spec.of!) return 'Successes cannot be more than attempts.';
    out.push(spec.kind === 'reps' ? { value: n, of: spec.of! } : { value: n });
  }
  return out;
}

export const targetText = (spec: PhaseSpec): string =>
  spec.kind === 'count' ? `${spec.target}+ in 2 of 3 attempts` : spec.kind === 'reps' ? `${spec.target} of ${spec.of} in 2 of 3 attempts` : `${spec.target}+ clean with ${spec.maxErrors ?? 0} or fewer errors in 2 of 3 attempts`;

export function masteryLines(logs: readonly HomeLog[], skill: HomeSkillId): { progress: SkillProgress; lines: string[] } {
  const g = skillProgress(logs, skill);
  const lines = [
    `Phase ${g.phase} of 5: ${g.spec.name}`,
    `${g.spec.what} Target: ${targetText(g.spec)} (proposed target, not an age standard).`,
    `Personal best ${g.personalBest ?? '-'} - consistency (recent median) ${g.recentMedian ?? '-'}`,
    g.phase === 5 && g.qualifying >= 2 ? 'Phase 5 mastered. Keep applying it.' : `To advance: ${2 - g.qualifying} more qualifying session${2 - g.qualifying === 1 ? '' : 's'} at this phase.`,
  ];
  if (g.struggling) lines.push(`Try the easier version next: ${g.spec.easier}`);
  return { progress: g, lines };
}

/** Feedback after saving or correcting a log; the "check" message offers correct or confirm. */
export function feedbackLine(logs: readonly HomeLog[], id: string): { kind: ReturnType<typeof feedbackFor>; text: string } | null {
  const log = logs.find((l) => l.id === id);
  if (!log) return null;
  const kind = feedbackFor(logs, log);
  const spec = specFor(log.skill, log.phase);
  const rec = log.attempts.map((a) => (a.seconds !== undefined ? `${a.value}/${a.seconds}s/${a.errors}` : a.of !== undefined ? `${a.value}/${a.of}` : `${a.value}`)).join(', ');
  return { kind, text: `Recorded ${spec ? SKILL_LABEL[log.skill] : ''} Phase ${log.phase}: ${rec}. ${FEEDBACK[kind]}` };
}
