import { describe, expect, it } from 'vitest';
import { ALL_ACTIVITIES, FOCUSES, activityById } from '../src/game/career/catalog';
import { CATEGORY_SKILL_AREA, COACHING_REVIEW, CURRICULUM, FAMILY_MAPPING, recommend } from '../src/game/career/curriculum';
import type { Manifest } from '../src/game/career/curriculum/manifest';
import { planWeek, substitutes, type PlannerInput } from '../src/game/career/planner';
import { emptySave, reduce, type Action, type CareerSave } from '../src/game/career/state';
import { SKILL_FAMILIES } from '../src/game/career/types';

// Owner decisions of 2026-10-15 (research/training/README.md) deliberately override the package's
// P-001 journal-stamp proposal. These tests assert Retro's behaviour; the package's own reference
// tests stay unchanged and still assert P-001 against the Python model.
const m = (CURRICULUM as { ok: true; manifest: Manifest }).manifest;
const levelIds = new Set(m.families.flatMap((f) => f.levels.map((l) => l.id)));
const familyIds = new Set(m.families.map((f) => f.id));

function run(save: CareerSave, ...actions: Action[]): CareerSave {
  for (const a of actions) {
    const r = reduce(save, a);
    if (!r.ok) throw new Error(r.error);
    save = r.save;
  }
  return save;
}

describe('owner override of P-001: Retro keeps one credit per scheduled session', () => {
  it('the package still proposes week-slot journal stamps (recorded, not adopted)', () => {
    expect(m.rewardPolicy.reward).toBe('local_journal_stamp');
    expect(m.rewardPolicy.entitlementFields).toEqual(['careerId', 'careerWeekId', 'slotIndex']);
  });

  it('a substitution, a catalog-version change and a replay never issue another credit', () => {
    let s = run(
      emptySave(),
      { type: 'createPlayer', id: 'p1', name: 'Sam', position: 'MID' },
      { type: 'setInput', input: { equipment: 'optional', space: 'medium', setting: 'outdoor', striking: false, minutes: 10 } },
      { type: 'chooseFocus', focusId: 'dr-close-control' },
    );
    const session = s.plan!.sessions[0]!;
    const entryFor = (id: string, activityId: string, variantId: string | null, contentVersion: number) => ({
      id, sessionId: session.id, activityId, variantId, contentVersion,
      completion: 'done' as const, rating: 'improving' as const, foot: 'right' as const, personalBest: null, reflection: '', easier: false,
    });
    const alt = substitutes(s.plan!, session.id, 0)[0]!;
    s = run(s, { type: 'substitute', sessionId: session.id, index: 0, activityId: alt.id });
    expect(s.plan!.sessions[0]!.id).toBe(session.id);
    const first = entryFor('e1', alt.id, s.plan!.sessions[0]!.items[0]!.variantId, alt.version);
    s = run(s, { type: 'log', entry: first });
    expect(s.credit).toBe(1);
    s = run(s, { type: 'log', entry: entryFor('e2', alt.id, first.variantId, alt.version) });
    expect(s.credit).toBe(1);
    const updated = reduce(s, { type: 'log', entry: entryFor('e3', alt.id, first.variantId, alt.version + 1) });
    expect(!updated.ok || updated.save.credit === 1).toBe(true);
    const next = substitutes(s.plan!, session.id, 1)[0];
    if (next) expect(reduce(s, { type: 'substitute', sessionId: session.id, index: 1, activityId: next.id }).ok).toBe(false);
    const replay = reduce(s, { type: 'log', entry: first });
    expect(replay.ok && replay.changed).toBe(false);
    expect(s.credit).toBe(1);
    expect(s.completedSessions).toEqual([session.id]);
  });

  it('save state has no second reward system or per-family progression tracks', () => {
    const s = emptySave() as unknown as Record<string, unknown>;
    for (const k of ['stamps', 'journalStamps', 'claims', 'slotClaims', 'familyLevels', 'curriculum']) expect(s).not.toHaveProperty(k);
    expect(Object.keys((emptySave() as CareerSave).levels).sort()).toEqual([...SKILL_FAMILIES].sort());
  });
});

describe('draft curriculum stays out of player recommendations', () => {
  const setups: PlannerInput[] = [];
  for (const equipment of ['ballOnly', 'optional'] as const)
    for (const space of ['small', 'medium'] as const)
      for (const setting of ['indoor', 'outdoor'] as const)
        for (const striking of [false, true]) setups.push({ equipment, space, setting, striking, minutes: 15 });

  it('no weekly plan for any focus, level or setup contains a curriculum ID', () => {
    for (const input of setups)
      for (const f of FOCUSES)
        for (const level of [1, 3, 5] as const) {
          const r = planWeek(1, f.id, level, input);
          if (!r.ok) continue;
          for (const s of r.plan.sessions) for (const it of s.items) {
            expect(levelIds.has(it.activityId)).toBe(false);
            expect(activityById(it.activityId)).toBeDefined();
          }
        }
  });

  it('every family recommends the empty state while nothing is approved', () => {
    const comfortable = levelIds;
    for (const input of setups) for (const id of familyIds) expect(recommend(id, input, comfortable).levelId).toBeNull();
  });
});

describe('curriculum organization and mapping', () => {
  it('maps every family to one of the seven existing skill areas', () => {
    for (const f of m.families) expect(SKILL_FAMILIES).toContain(CATEGORY_SKILL_AREA[f.category]);
  });
  it('covers each family exactly once with a coaching disposition', () => {
    expect(new Set(Object.keys(FAMILY_MAPPING))).toEqual(familyIds);
    expect(new Set(Object.keys(COACHING_REVIEW))).toEqual(familyIds);
  });
  it('references only existing activity IDs, replaces each at most once and retires none', () => {
    const existing = new Set(ALL_ACTIVITIES.map((a) => a.id));
    const replaced = Object.values(FAMILY_MAPPING).flatMap((x) => x.replaces);
    for (const id of [...replaced, ...Object.values(FAMILY_MAPPING).flatMap((x) => x.overlaps)]) expect(existing.has(id)).toBe(true);
    expect(new Set(replaced).size).toBe(replaced.length);
    expect(replaced).toHaveLength(17);
    expect(Object.values(FAMILY_MAPPING).filter((x) => x.action === 'add')).toHaveLength(4);
    expect(ALL_ACTIVITIES).toHaveLength(92);
  });
  it('the five options in a family are alternatives, not a difficulty ladder', () => {
    // Prerequisites only gate suitability: some later options have none, so ordinal is not difficulty.
    const later = m.families.flatMap((f) => f.levels.slice(1)).filter((l) => l.prerequisites.length === 0);
    expect(later.length).toBeGreaterThan(0);
  });
});
