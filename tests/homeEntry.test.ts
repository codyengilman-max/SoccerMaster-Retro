import { describe, expect, it } from 'vitest';
import { specFor } from '../src/game/career/homeMastery';
import { feedbackLine, masteryLines, parseAttempts } from '../src/game/career/homeEntry';
import { emptySave, reduce, type CareerSave } from '../src/game/career/state';

const jug1 = specFor('juggling', 1)!;
const ft1 = specFor('firstTouch', 1)!;
const circuit = specFor('passing', 5)!;

describe('home score entry', () => {
  it('accepts zero and whole numbers; rejects negative, fractional, malformed and too many successes', () => {
    expect(parseAttempts(jug1, '0 3 4')).toEqual([{ value: 0 }, { value: 3 }, { value: 4 }]);
    expect(parseAttempts(ft1, '6,7,5')).toEqual([{ value: 6, of: 10 }, { value: 7, of: 10 }, { value: 5, of: 10 }]);
    for (const bad of ['-1 2 3', '1.5 2 3', 'a b c', '1 2', '1 2 3 4', '']) expect(typeof parseAttempts(jug1, bad)).toBe('string');
    expect(parseAttempts(ft1, '11 2 3')).toBe('Successes cannot be more than attempts.');
    expect(parseAttempts(circuit, '3/40/1 0/30/0 4/35/2')).toEqual([{ value: 3, of: 4, seconds: 40, errors: 1 }, { value: 0, of: 1, seconds: 30, errors: 0 }, { value: 4, of: 6, seconds: 35, errors: 2 }]);
    expect(typeof parseAttempts(circuit, '3/40 1/2/3 4/4/4')).toBe('string');
  });
  it('shows phase, proposed target, best, consistency and what advances; feedback after logging', () => {
    let s: CareerSave = emptySave();
    const r0 = reduce(s, { type: 'createPlayer', id: 'p', name: 'Kid', position: 'MID' });
    if (!r0.ok) throw new Error(r0.error);
    s = r0.save;
    expect(masteryLines(s.homeLogs, 'juggling').lines[0]).toBe(`Phase 1 of 5: ${jug1.name}`);
    expect(masteryLines(s.homeLogs, 'juggling').lines[1]).toContain('proposed target, not an age standard');
    const attempts = parseAttempts(jug1, '3 4 2');
    if (typeof attempts === 'string') throw new Error(attempts);
    const r = reduce(s, { type: 'homeLog', log: { id: 'h1', week: 1, skill: 'juggling', phase: 1, activityId: jug1.activityIds[0]!, variation: jug1.variation, foot: null, source: 'self-reported', attempts, at: 1, confirmed: false, revision: 0 } });
    if (!r.ok) throw new Error(r.error);
    expect(feedbackLine(r.save.homeLogs, 'h1')).toEqual({ kind: 'first', text: expect.stringContaining('Recorded Juggling Phase 1: 3, 4, 2.') });
    expect(masteryLines(r.save.homeLogs, 'juggling').lines[3]).toBe('To advance: 1 more qualifying session at this phase.');
  });
});
