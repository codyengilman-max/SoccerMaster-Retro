import { describe, expect, it } from 'vitest';
import { DEV_WEIGHTS, MAPPING, matchShare, weekBudget } from '../src/game/report/registry';

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);
describe('development weights', () => {
  it('are 35/30/30/5 and sum to 1', () => {
    expect(DEV_WEIGHTS).toEqual({ home: 0.35, team: 0.3, match: 0.3, recess: 0.05 });
    expect(sum(weekBudget(true))).toBeCloseTo(1);
  });
  it('unscheduled recess is shared between home and team; matches stay at 30%', () => {
    const b = weekBudget(false);
    expect(b.recess).toBe(0);
    expect(b.match).toBe(0.3);
    expect(b.home / b.team).toBeCloseTo(35 / 30);
    expect(sum(b)).toBeCloseTo(1);
  });
  it('several tournament matches share one match budget', () => {
    const one = matchShare([{ factor: 1, opportunities: 10 }]);
    const four = matchShare([1, 2, 3, 4].map(() => ({ factor: 1, opportunities: 10 })));
    expect(one).toBeCloseTo(0.3);
    expect(four).toBeCloseTo(0.3);
    expect(matchShare([])).toBe(0);
  });
  it('a goal is a summary statistic with no extra reward', () => {
    expect(MAPPING.find((m) => m.event === 'goal')!.attributes).toEqual([]);
    expect(MAPPING.find((m) => m.event === 'foul')!.attributes).toEqual([]);
  });
});
