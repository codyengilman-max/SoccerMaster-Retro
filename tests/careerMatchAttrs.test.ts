import { describe, expect, it } from 'vitest';
import { matchAttrsFromCareer } from '../src/game/career/player';
import { ATTRIBUTES, type AttributeId } from '../src/game/career/types';

const all = (v: number) => Object.fromEntries(ATTRIBUTES.map((a) => [a, v])) as Record<AttributeId, number>;

describe('career ratings to match multipliers', () => {
  it('a starting player is neutral; the ceiling and floor map to the edges', () => {
    expect(matchAttrsFromCareer(all(40))).toEqual({ control: 1, agility: 1, passing: 1, finishing: 1 });
    expect(matchAttrsFromCareer(all(99))).toEqual({ control: 1.2, agility: 1.2, passing: 1.2, finishing: 1.2 });
    expect(matchAttrsFromCareer(all(1))).toEqual({ control: 0.8, agility: 0.8, passing: 0.8, finishing: 0.8 });
  });

  it('growth in dribbling raises agility and control; there is no pace rating to map', () => {
    const m = matchAttrsFromCareer({ ...all(40), dribbling: 60 });
    expect(m.agility).toBeGreaterThan(1);
    expect(m.control).toBeGreaterThan(1);
    expect('pace' in m).toBe(false);
  });

  it('garbage ratings fall back to neutral', () => {
    expect(matchAttrsFromCareer({ ...all(40), dribbling: Number.NaN, firstTouch: Number.NaN })).toEqual({ control: 1, agility: 1, passing: 1, finishing: 1 });
  });
});
