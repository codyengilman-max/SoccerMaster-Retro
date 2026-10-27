import { describe, expect, it } from 'vitest';
import { HOME_PHASES, HOME_SKILLS, attemptsError, feedbackFor, skillProgress, specFor, surprising, type Attempt, type HomeLog } from '../src/game/career/homeMastery';

let n = 0;
const log = (skill: HomeLog['skill'], phase: HomeLog['phase'], values: number[], extra: Partial<HomeLog> = {}): HomeLog => {
  const spec = specFor(skill, phase)!;
  return { id: `l${++n}`, week: 1, skill, phase, activityId: spec.activityIds[0]!, variation: spec.variation, foot: null, source: 'self-reported', attempts: values.map((value) => ({ value, ...(spec.kind === 'timed' ? { of: 5, seconds: 60, errors: 0 } : {}) })), at: n, confirmed: false, revision: 0, ...extra };
};

describe('home training phases', () => {
  it('defines five phases per skill with existing assignments', () => {
    for (const s of HOME_SKILLS) expect(HOME_PHASES[s].map((p) => p.phase)).toEqual([1, 2, 3, 4, 5]);
  });

  it('starts every skill at Phase 1 and advances independently after two qualifying sessions', () => {
    expect(HOME_SKILLS.map((s) => skillProgress([], s).phase)).toEqual([1, 1, 1]);
    const one = log('juggling', 1, [3, 4, 1]);
    expect(skillProgress([one], 'juggling')).toMatchObject({ phase: 1, qualifying: 1 });
    const two = log('juggling', 1, [3, 3, 0]);
    expect(skillProgress([one, two], 'juggling').phase).toBe(2);
    expect(skillProgress([one, two], 'firstTouch').phase).toBe(1);
  });

  it('needs 2 of 3 attempts; a correction edits one session and never counts twice; poor sessions keep the phase', () => {
    const a = log('passing', 1, [6, 5, 5]);
    expect(skillProgress([a], 'passing').qualifying).toBe(0);
    const fixed = { ...a, attempts: [6, 6, 5].map((value) => ({ value })), revision: 1 };
    expect(skillProgress([fixed], 'passing').qualifying).toBe(1);
    const b = log('passing', 1, [7, 7, 7]);
    const poor = log('passing', 2, [0, 0, 0]);
    expect(skillProgress([fixed, b, poor], 'passing').phase).toBe(2);
  });

  it('easier variations never satisfy a harder setup', () => {
    const easy = log('juggling', 3, [9, 9, 9], { variation: 'bounce-assisted' });
    expect(skillProgress([log('juggling', 1, [3, 3, 3]), log('juggling', 1, [3, 3, 3]), log('juggling', 2, [6, 6, 6]), log('juggling', 2, [6, 6, 6]), easy, { ...easy, id: 'x2', at: 999 }], 'juggling').phase).toBe(3);
  });

  it('accepts zero, rejects negatives, fractions and successes above attempts', () => {
    const reps = specFor('firstTouch', 1)!;
    const ok: Attempt[] = [{ value: 0 }, { value: 10 }, { value: 3 }];
    expect(attemptsError(reps, ok)).toBeNull();
    expect(attemptsError(reps, [{ value: -1 }, { value: 0 }, { value: 0 }])).not.toBeNull();
    expect(attemptsError(reps, [{ value: 1.5 }, { value: 0 }, { value: 0 }])).not.toBeNull();
    expect(attemptsError(reps, [{ value: 11 }, { value: 0 }, { value: 0 }])).not.toBeNull();
    expect(attemptsError(reps, ok.slice(0, 2))).not.toBeNull();
  });

  it('chooses feedback from the evidence: first, check, progress, personal best, persistence, needs work', () => {
    const first = log('juggling', 1, [1, 2, 1]);
    expect(feedbackFor([first], first)).toBe('first');
    const huge = log('juggling', 1, [55, 2, 1]);
    expect(surprising([first, huge], huge)).toBe(true);
    expect(feedbackFor([first, huge], huge)).toBe('check');
    expect(feedbackFor([first, { ...huge, confirmed: true }], { ...huge, confirmed: true })).not.toBe('check');
    expect(surprising([first, { ...huge, source: 'minigame' }], { ...huge, source: 'minigame' })).toBe(false);
    const better = log('juggling', 1, [2, 2, 1]);
    expect(feedbackFor([first, better], better)).toBe('progress');
    const pb = log('juggling', 1, [3, 1, 0]);
    expect(feedbackFor([first, better, pb], pb)).toBe('personalBest');
    const steady = log('juggling', 1, [1, 1, 0]);
    expect(feedbackFor([first, better, pb, steady], steady)).toBe('persistence');
    const second = log('firstTouch', 1, [5, 4, 3]);
    const flat = log('firstTouch', 1, [4, 4, 2]);
    expect(feedbackFor([second, flat], flat)).toBe('needsWork');
  });
});
