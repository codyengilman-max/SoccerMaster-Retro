import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALL_FIXTURES, ROLE_POOLS, SEED_FAMILIES, fixtureById, routePlan, sideText } from '../src/game/training12/situations/index';
import { mappingMarkdown } from '../src/game/training12/situations/mappingDoc';
import { sessions } from '../src/game/training12/ref/seasons.mjs';

const catalog = JSON.parse(readFileSync('research/logic/v0.5/data/scenario_catalog.json', 'utf8')) as { scenarios: { id: string }[] };
const ROLES = ['GK', 'CB', 'LB', 'RB', '6', '8', '9', 'LW', 'RW'] as const;

describe('tactical situation library', () => {
  it('authors exactly one fixture for every catalog v0.5 seed', () => {
    const ids = catalog.scenarios.map((s) => s.id).sort();
    expect(ids).toHaveLength(40);
    expect(ALL_FIXTURES.map((f) => f.seed).sort()).toEqual(ids);
    expect(Object.keys(SEED_FAMILIES).sort()).toEqual(ids);
    expect(new Set(ALL_FIXTURES.map((f) => f.id)).size).toBe(40);
  });

  it('every pool entry is a real fixture whose user plays that role once reflected', () => {
    for (const role of ROLES) {
      for (const e of ROLE_POOLS[role]) {
        const f = fixtureById(e.id)!;
        expect(f, e.id).toBeTruthy();
        expect(sideText(f.focal, e.mirrored), `${role} ${e.id}`).toBe(role);
      }
    }
  });

  it('maps all 108 sessions x 9 roles to three distinct moments', () => {
    let n = 0;
    for (const s of sessions) {
      for (const role of ROLES) {
        const plan = routePlan(s.id, role)!;
        expect(plan, `${s.id} ${role}`).toBeTruthy();
        expect(plan.moments).toHaveLength(3);
        expect(new Set(plan.moments.map((m) => m.fixtureId)).size).toBe(3);
        n++;
      }
    }
    expect(sessions).toHaveLength(108);
    expect(n).toBe(972);
  });

  it('the committed mapping document matches the code', () => {
    const md = mappingMarkdown();
    if (process.env.UPDATE_MAPPING) writeFileSync('docs/training/TACTICAL_SITUATIONS_MAPPING.md', md);
    expect(readFileSync('docs/training/TACTICAL_SITUATIONS_MAPPING.md', 'utf8')).toBe(md);
  });

  it('reflects left/right words only when mirrored', () => {
    expect(sideText('Our LB is on the left', true)).toBe('Our RB is on the right');
    expect(sideText('Our LB is on the left', false)).toBe('Our LB is on the left');
  });
});
