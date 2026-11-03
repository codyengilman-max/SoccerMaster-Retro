import { describe, expect, it } from 'vitest';
import { matchAttrsFromCareer } from '../src/game/career/player';
import { ATTRIBUTES, type AttributeId } from '../src/game/career/types';

const all = (v: number) => Object.fromEntries(ATTRIBUTES.map((a) => [a, v])) as Record<AttributeId, number>;
const KEYS = ['control', 'dribbling', 'passing', 'finishing', 'defending', 'awareness', 'composure', 'strength', 'agility', 'accel', 'pace'];
const flat = (v: number) => Object.fromEntries(KEYS.map((k) => [k, v]));

describe('career ratings to match multipliers (progression v2)', () => {
  it('a starting player (50) is neutral; 100 and 0 map to the 0.8–1.2 edges', () => {
    expect(matchAttrsFromCareer(all(50))).toEqual(flat(1));
    expect(matchAttrsFromCareer(all(100))).toEqual(flat(1.2));
    expect(matchAttrsFromCareer(all(0))).toEqual(flat(0.8));
  });

  it('each attribute drives only its own parameters', () => {
    const only: Record<AttributeId, string[]> = {
      firstTouch: ['control'], dribbling: ['dribbling'], passing: ['passing'], finishing: ['finishing'], defending: ['defending'],
      awareness: ['awareness'], composure: ['composure'], strength: ['strength'], agility: ['agility', 'accel'], pace: ['pace'],
    };
    for (const a of ATTRIBUTES) {
      const m = matchAttrsFromCareer({ ...all(50), [a]: 75 }) as Record<string, number>;
      for (const k of KEYS) expect(m[k], `${a} -> ${k}`).toBeCloseTo(only[a].includes(k) ? 1.1 : 1, 10);
    }
  });

  it('garbage ratings fall back to neutral', () => {
    expect(matchAttrsFromCareer({ ...all(50), dribbling: Number.NaN, firstTouch: Number.NaN })).toEqual(flat(1));
  });
});
