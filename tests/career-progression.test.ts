import { describe, expect, it } from 'vitest';
import { CAREER_CONFIG } from '../src/game/career/config';
import { createPlayer } from '../src/game/career/player';
import { applyGrowth, computeGrowth, type EvidenceItem } from '../src/game/career/progression';

const P = createPlayer('p1', 'Sam', 'MID');
const ev = (attribute: EvidenceItem['attribute'], n: number, success: 0 | 0.5 | 1, situation = (i: number) => `s${i}`, source: EvidenceItem['source'] = 'match'): EvidenceItem[] =>
  Array.from({ length: n }, (_, i) => ({ attribute, source, situation: situation(i), success, note: '' }));
const get = (o: ReturnType<typeof computeGrowth>, a: string) => o.find((x) => x.attribute === a)!;

describe('M6 growth from game evidence (worked examples in docs/TRAINING.md)', () => {
  it('Example A: 8 distinct successful passes, 2 failed -> +2 passing (weekly cap)', () => {
    const o = computeGrowth(P, [...ev('passing', 8, 1), ...ev('passing', 2, 0, (i) => `f${i}`)]);
    expect(get(o, 'passing').to).toBe(42);
  });

  it('Example B: no opportunities is not a failure and gives no change', () => {
    const o = computeGrowth(P, []);
    for (const x of o) expect(x.to).toBe(x.from);
    expect(get(o, 'defending').reason).toMatch(/not a failure/);
  });

  it('Example C: farming one equivalent situation hits diminishing returns', () => {
    const farm = computeGrowth(P, ev('dribbling', 40, 1, () => 'same'));
    // 1 + .5 + .25 + .125*37 = 6.375 weighted successes -> 2 points at most, not 13.
    expect(get(farm, 'dribbling').weightedSuccesses).toBeCloseTo(6.38, 1);
    const fewDistinct = computeGrowth(P, ev('dribbling', 4, 1, () => 'same'));
    expect(get(fewDistinct, 'dribbling').to).toBe(40);
  });

  it('Example D: Coach answers alone give at most coachOnlyMaxGrowth', () => {
    const o = computeGrowth(P, ev('awareness', 30, 1, (i) => `t${i}`, 'coach'));
    expect(get(o, 'awareness').to).toBe(40 + CAREER_CONFIG.growth.coachOnlyMaxGrowth);
    expect(get(o, 'awareness').reason).toMatch(/Coach answers only/);
  });

  it('Coach answers are capped to half the counted successes when mixed with play', () => {
    const o = computeGrowth(P, [...ev('awareness', 3, 1), ...ev('awareness', 20, 1, (i) => `t${i}`, 'coach')]);
    expect(get(o, 'awareness').weightedSuccesses).toBe(6);
  });

  it('respects potential, the per-attribute cap and the weekly total cap', () => {
    const near = { ...P, attributes: { ...P.attributes, passing: 69 } };
    expect(get(computeGrowth(near, ev('passing', 30, 1)), 'passing').to).toBe(70);
    const all = computeGrowth(P, (['firstTouch', 'passing', 'dribbling', 'finishing', 'defending', 'awareness'] as const).flatMap((a) => ev(a, 12, 1)));
    expect(all.reduce((s, x) => s + x.to - x.from, 0)).toBe(CAREER_CONFIG.growth.weeklyCapTotal);
    for (const x of all) expect(x.to - x.from).toBeLessThanOrEqual(CAREER_CONFIG.growth.weeklyCapPerAttribute);
  });

  it('low success rate gives no growth; applyGrowth is exact', () => {
    const o = computeGrowth(P, [...ev('finishing', 3, 1), ...ev('finishing', 7, 0, (i) => `m${i}`)]);
    expect(get(o, 'finishing').to).toBe(40);
    const grown = applyGrowth(P, computeGrowth(P, ev('passing', 6, 1)));
    expect(grown.attributes.passing).toBe(42);
    expect(grown.attributes.finishing).toBe(40);
  });
});
