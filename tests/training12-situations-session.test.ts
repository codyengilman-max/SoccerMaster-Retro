import { describe, expect, it } from 'vitest';
import { routePlan } from '../src/game/training12/situations/index';
import { SituationSession, TIMED_DECISION_SECONDS } from '../src/game/training12/situations/session';

function drive(s: SituationSession, pick: (s: SituationSession) => string | null, hintRounds: readonly number[] = []): void {
  s.startRound();
  for (let guard = 0; guard < 20000 && s.status !== 'complete'; guard++) {
    if (s.status === 'reflection') { s.continueRound(); continue; }
    const p = s.sit!.phase;
    if (p === 'observe') {
      if (hintRounds.includes(s.round)) s.hint();
      const id = pick(s);
      if (id) s.decide(id); else s.update(TIMED_DECISION_SECONDS + 0.1);
    } else if (p === 'explain') s.next();
    else s.update(0.25);
  }
}

const best = (s: SituationSession): string => s.choices().map((c) => c.option.id).sort((a, b) => (s.grade(b)!.quality - s.grade(a)!.quality))[0]!;

describe('tactical situation session (ts-1)', () => {
  const plan = routePlan('S1-W01-A', 'CB')!;

  it('plays 3 rounds x 3 moments to authored review points and completes with versioned keys', () => {
    const s = new SituationSession(plan, 'run-1', 42);
    drive(s, best);
    expect(s.status).toBe('complete');
    expect(s.attempts).toHaveLength(9);
    expect(s.attempts.every((a) => a.outcome.length > 0)).toBe(true);
    expect(s.attempts.slice(0, 3).every((a) => a.variant === 'cue')).toBe(true);
    expect(s.attempts.slice(3, 6).every((a) => a.variant === 'counter')).toBe(true);
    expect(s.completion!.model).toBe('ts-1');
    expect(s.completion!.moments.every((k) => /^ts-1:[A-Z0-9]+@1$/.test(k))).toBe(true);
    expect(s.completion!.creditEligible).toBe(true);
    expect(s.completion!.score).toBe(1);
  });

  it('a hinted decision is assisted and worth half; it never counts as independent', () => {
    const s = new SituationSession(plan, 'run-2', 42);
    drive(s, best, [0]);
    expect(s.completion!.decisions).toEqual({ independent: 6, assisted: 3 });
    expect(s.completion!.score).toBeCloseTo((6 + 1.5) / 9);
  });

  it('only hinted decisions plus timed-out game-speed moments earn no credit', () => {
    const s = new SituationSession(plan, 'run-3', 42);
    drive(s, (x) => (x.timed ? null : best(x)), [0, 1]);
    expect(s.attempts.filter((a) => a.round === 2).every((a) => a.optionId === null && a.quality === 0)).toBe(true);
    expect(s.completion!.decided).toBe(6);
    expect(s.completion!.decisions).toEqual({ independent: 0, assisted: 6 });
    expect(s.completion!.creditEligible).toBe(false);
  });

  it('a replay is practice only and does not use up the moment', () => {
    const s = new SituationSession(plan, 'run-4', 7);
    s.startRound();
    while (s.sit!.phase !== 'observe') s.update(0.25);
    s.decide(best(s));
    while (s.sit!.phase !== 'explain') s.update(0.25);
    expect(s.replay()).toBe(true);
    while (s.sit!.phase !== 'observe') s.update(0.25);
    s.decide(best(s));
    expect(s.attempts.filter((a) => a.replay)).toHaveLength(1);
    expect(s.moment).toBe(0);
  });

  it('refuses stale generations and the hint in the timed round', () => {
    const s = new SituationSession(plan, 'run-5', 3);
    s.startRound();
    const g = s.generation;
    while (s.sit!.phase !== 'observe') s.update(0.25);
    expect(s.decide(best(s), g - 1)).toBe(false);
    s.round = 2;
    expect(s.hint()).toBe(false);
  });
});
