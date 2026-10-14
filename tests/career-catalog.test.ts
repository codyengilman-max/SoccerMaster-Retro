import { describe, expect, it } from 'vitest';
import { ALL_ACTIVITIES, CORE_ACTIVITIES, FOCUSES, JUGGLING_LADDER, SOURCES, distinctGroups } from '../src/game/career/catalog';
import { validateActivity, validateCatalog } from '../src/game/career/validate';
import { SKILL_FAMILIES } from '../src/game/career/types';

describe('M6 training catalog', () => {
  it('has 84 core records, 14 per family, plus an 8-step juggling ladder', () => {
    expect(CORE_ACTIVITIES).toHaveLength(84);
    for (const f of SKILL_FAMILIES.filter((x) => x !== 'juggling')) {
      expect(CORE_ACTIVITIES.filter((a) => a.skillFamilyId === f), f).toHaveLength(14);
    }
    expect(JUGGLING_LADDER).toHaveLength(8);
    expect(JUGGLING_LADDER.every((a) => a.relatedAttribute === null)).toBe(true);
  });

  it('every record passes schema validation', () => {
    expect(validateCatalog(ALL_ACTIVITIES)).toEqual([]);
  });

  it('discloses the distinct exercise-family count after grouping equivalents', () => {
    const groups = distinctGroups(CORE_ACTIVITIES);
    expect(groups).toBe(78);
    const shared = new Map<string, string[]>();
    for (const a of CORE_ACTIVITIES) shared.set(a.variantGroupId, [...(shared.get(a.variantGroupId) ?? []), a.id]);
    const multi = [...shared.values()].filter((v) => v.length > 1);
    expect(multi.map((v) => v.length).reduce((s, n) => s + n - 1, 0)).toBe(84 - groups);
  });

  it('every focus has activities and every source is used', () => {
    for (const f of FOCUSES) expect(ALL_ACTIVITIES.some((a) => a.focusId === f.id), f.id).toBe(true);
    const used = new Set(ALL_ACTIVITIES.flatMap((a) => a.sources.map((s) => s.id)));
    for (const id of Object.keys(SOURCES)) expect(used.has(id as never), id).toBe(true);
  });

  it('keeps editorial/coaching review separate from schema validation', () => {
    expect(ALL_ACTIVITIES.every((a) => a.review.schema === 'auto' && a.review.coaching === 'pending')).toBe(true);
  });

  it('validator rejects excluded content and required extras', () => {
    const base = CORE_ACTIVITIES[0]!;
    expect(validateActivity({ ...base, steps: ['Head the ball.', 'b', 'c'] }).join()).toMatch(/excluded/);
    expect(validateActivity({ ...base, equipment: { required: ['ball', 'wall'], optional: [] } }).join()).toMatch(/only a ball/);
    expect(validateActivity({ ...base, strikingArea: true, indoor: true }).join()).toMatch(/indoors/);
    expect(validateActivity({ ...base, optional: undefined, equipment: { required: ['ball'], optional: ['markers'] }, ballOnly: null } as never).join()).toMatch(/ball-only/);
  });

  it('self-roll, solo-defending, audio and target-striking records state their limits', () => {
    for (const a of ALL_ACTIVITIES) {
      const lim = a.limitations.join(' ');
      if (a.skillFamilyId === 'defending') expect(lim, a.id).toMatch(/not live tackling/);
      if (a.skillFamilyId === 'finishing') expect(lim, a.id).toMatch(/not finishing against a goalkeeper/);
      if (a.equipment.optional.includes('audio')) expect(lim, a.id).toMatch(/does not show tactical reading/);
    }
  });
});
