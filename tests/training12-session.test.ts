import { describe, expect, it } from 'vitest';
import { planFor, TrainingSession } from '../src/game/training12/session';

/** Play a whole run; `pick` chooses an option id from the offered choices (or null to stay idle). */
function play(s: TrainingSession, pick: (c: ReturnType<TrainingSession['choices']>) => string | null, maxSeconds = 2000): void {
  for (let t = 0; t < maxSeconds * 10 && s.status !== 'complete'; t++) {
    if (s.status === 'ready') s.startRound();
    else if (s.status === 'reflection') s.continueRound();
    else if (s.drill?.phase === 'observe') {
      const id = pick(s.choices());
      if (id) s.decide(id);
      else s.update(0.1);
    } else if (s.drill?.phase === 'explain') s.next();
    else s.update(0.1);
  }
}
const best = (c: ReturnType<TrainingSession['choices']>) => [...c].sort((a, b) => b.assessment.quality - a.assessment.quality)[0]!.option.id;

describe('Team Training v1.2 session', () => {
  it('only verified routes are offered: S1 week 1 plans, week 5 is unavailable', () => {
    expect(planFor('S1-W01-A', '8').status).toBe('selected');
    expect(planFor('S1-W05-A', '8').status).toBe('unavailable');
    expect(planFor('S2-W01-A', '8', 3).status).toBe('unavailable');
  });

  it('a played run completes all three rounds with observed participation and credit eligibility, but no mastery or attribute delta', () => {
    const s = new TrainingSession(planFor('S1-W01-A', '8'), 'career-1', 'run-1', 42);
    play(s, best);
    expect(s.status).toBe('complete');
    const c = s.completion!;
    expect(c.entitlementTuple).toEqual(['career-1', 1, 'S1-W01', 'A']);
    expect(c.participation).toBe('observed');
    expect(c.creditEligible).toBe(true);
    expect(c.masteryGranted).toBe(false);
    expect(c.attributeDelta).toBeNull();
    expect(s.rejected).toBe(0);
    expect(new Set(s.attempts.map((a) => a.round))).toEqual(new Set([0, 1, 2]));
  });

  it('idle play earns nothing: rounds 1-2 wait for a decision, round 3 lets moments pass without evidence', () => {
    const s = new TrainingSession(planFor('S1-W01-C', 'CB'), 'career-1', 'run-2', 5);
    s.startRound();
    for (let i = 0; i < 6000; i++) s.update(0.1);
    expect(s.status).toBe('playing');
    expect(s.run.elapsed).toBeLessThan(5);
    expect(s.run.events).toHaveLength(0);
  });

  it('a decision carrying an old generation (from before a pause) is ignored', () => {
    const s = new TrainingSession(planFor('S1-W02-A', 'LW'), 'career-1', 'run-3', 9);
    s.startRound();
    while (s.drill?.phase !== 'observe') s.update(0.05);
    const gen = s.generation;
    expect(s.pause()).toBe(true);
    const id = s.choices()[0]?.option.id ?? 'pass-A2';
    expect(s.decide(id, gen)).toBe(false);
    expect(s.resume()).toBe(true);
    expect(s.decide(s.choices()[0]!.option.id, gen)).toBe(false);
    expect(s.decide(s.choices()[0]!.option.id)).toBe(true);
  });

  it('every S1 week 1-4 route for every role completes with credit when played well', () => {
    for (const w of [1, 2, 3, 4]) for (const slot of ['A', 'B', 'C'] as const) for (const role of ['GK', 'CB', 'LB', 'RB', '6', '8', 'LW', 'RW', '9'] as const) {
      const s = new TrainingSession(planFor(`S1-W0${w}-${slot}`, role), 'c', `r-${w}${slot}${role}`, w * 7);
      play(s, best);
      expect(s.status, `${w}${slot} ${role}`).toBe('complete');
      expect(s.completion!.creditEligible, `${w}${slot} ${role}`).toBe(true);
      expect(s.rejected).toBe(0);
    }
  }, 120_000);
});
