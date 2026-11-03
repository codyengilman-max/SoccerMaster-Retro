import { describe, expect, it } from 'vitest';
import { applyProposal, bonusFits, DEV_CONFIG, overallOf, proposeWeek, sourceShares, type SourceWeek } from '../src/game/career/development';
import { ATTRIBUTES, type AttributeId } from '../src/game/career/types';

const flat = (v: number) => Object.fromEntries(ATTRIBUTES.map((a) => [a, v])) as Record<AttributeId, number>;
const full: SourceWeek[] = [
  { source: 'home', status: 'done', score: 0.8, allocation: { firstTouch: 0.5, dribbling: 0.5 }, activities: ['juggling'] },
  { source: 'team', status: 'done', score: 0.6, allocation: { awareness: 1 }, activities: ['D07'] },
  { source: 'match', status: 'done', score: 0.5, allocation: { passing: 0.4, defending: 0.6 }, activities: ['m1'] },
];

describe('shared development engine', () => {
  it('earned growth is exactly 2x opponent and 1.7x teammate before caps', () => {
    const me = proposeWeek(flat(50), full, 'protagonist', null);
    const tm = proposeWeek(flat(50), full, 'teammate', null);
    const op = proposeWeek(flat(50), full, 'opponent', null);
    for (const a of ATTRIBUTES) {
      expect(me.proposed[a]).toBeCloseTo(op.proposed[a] * 2, 12);
      expect(me.proposed[a]).toBeCloseTo(tm.proposed[a] * 1.7, 12);
    }
  });
  it('applies one multiplier to growth only, never to the existing rating', () => {
    const lo = proposeWeek(flat(40), full, 'protagonist', null);
    const hi = proposeWeek(flat(60), full, 'protagonist', null);
    expect(lo.proposed).toEqual(hi.proposed);
    const total = ATTRIBUTES.reduce((s, a) => s + lo.proposed[a], 0);
    expect(total).toBeCloseTo(DEV_CONFIG.weeklyBudget * lo.evidence * 2, 12);
  });
  it('allocation weights split a source, never award it to every attribute', () => {
    const p = proposeWeek(flat(50), [full[0]!], 'opponent', null);
    expect(p.proposed.firstTouch + p.proposed.dribbling).toBeCloseTo(DEV_CONFIG.weeklyBudget * 0.8, 12);
    expect(p.proposed.passing).toBe(0);
  });
  it('no scheduled opportunity is not a failure; a skipped one scores zero', () => {
    const none = proposeWeek(flat(50), [full[0]!, { ...full[1]!, status: 'none' }, full[2]!], 'opponent', null);
    const skip = proposeWeek(flat(50), [full[0]!, { ...full[1]!, status: 'skipped' }, full[2]!], 'opponent', null);
    expect(sourceShares([full[0]!, { ...full[1]!, status: 'none' }]).home).toBeCloseTo(1, 12);
    expect(none.evidence).toBeGreaterThan(skip.evidence);
    expect(skip.proposed.awareness).toBe(0);
    expect(proposeWeek(flat(50), [], 'protagonist', 64).overallAfter).toBe(50);
  });
  it('a duplicate source entry cannot add a second credit', () => {
    expect(proposeWeek(flat(50), [...full, full[0]!], 'protagonist', null).proposed).toEqual(proposeWeek(flat(50), full, 'protagonist', null).proposed);
  });
  it('weekly growth never takes the unrounded overall past the ceiling; gains scale together', () => {
    const a = flat(63.9);
    const p = proposeWeek(a, full.map((w) => ({ ...w, score: 1 })), 'protagonist', 64);
    expect(p.capped).toBe(true);
    expect(overallOf(applyProposal(a, p))).toBeLessThanOrEqual(64 + 1e-9);
    expect(overallOf(applyProposal(a, p))).toBeCloseTo(64, 9);
    for (const k of ATTRIBUTES) expect(p.applied[k]).toBeCloseTo(p.proposed[k] * p.capScale, 12);
    expect(proposeWeek(flat(64), full, 'protagonist', 64).applied).toEqual(flat(0));
  });
  it('the opponent and teammate engines are not capped at 64', () => {
    const p = proposeWeek(flat(70), full, 'opponent', null);
    expect(p.overallAfter).toBeGreaterThan(70);
  });
  it('a bonus point fits whole or stays banked', () => {
    expect(bonusFits(flat(50), 'pace', 64)).toEqual({ ok: true });
    const a = { ...flat(64), pace: 63.95 };
    expect(bonusFits(a, 'pace', 64).ok).toBe(false);
    expect(bonusFits({ ...flat(50), pace: 100 }, 'pace', null).ok).toBe(false);
  });
});
