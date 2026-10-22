import { describe, expect, it } from 'vitest';
import { sessions, scenarioDefinition } from '../src/game/training12/ref/seasons.mjs';
import type { RoleId } from '../src/game/training12/ref/catalog.mjs';
import { assessAll, choose, createDrill, human, options, settle, step } from '../src/game/training12/drill';

const ROLES: RoleId[] = ['GK', 'CB', 'LB', 'RB', '6', '8', 'LW', 'RW', '9'];
const early = sessions.filter((s) => s.season === 1 && s.week <= 4);

describe('training drill on every S1 week 1-4 route', () => {
  it.each(early.flatMap((s) => ROLES.map((r) => [s.id, r] as const)))('%s %s: real choices, a defensible answer, and play resolves', (id, role) => {
    const def = scenarioDefinition(id, role, 1, 'youth');
    for (const variation of [0, 1]) {
      const s = createDrill(def, 7, variation);
      settle(s);
      const opts = options(s);
      expect(opts.length, 'at least 2 plausible choices').toBeGreaterThanOrEqual(2);
      const a = assessAll(s);
      expect([...a.values()].some((x) => x.good), 'some choice is defensible').toBe(true);
      expect([...a.values()].some((x) => !x.good), 'not every choice is right').toBe(true);
      for (const o of opts) {
        const t = createDrill(def, 7, variation);
        settle(t);
        expect(choose(t, o.id)).toBe(true);
        for (let i = 0; i < 600 && t.phase === 'execute'; i++) step(t);
        expect(t.phase, o.id).toBe('explain');
        expect(t.outcome).not.toBeNull();
        for (const p of t.actors) {
          expect(Number.isFinite(p.pos.x) && Number.isFinite(p.pos.y)).toBe(true);
        }
      }
      expect(human(s).human).toBe(true);
    }
  });
});
