import { describe, expect, it } from 'vitest';
import { ALL_FIXTURES } from '../src/game/training12/situations/index';
import { createSituation, playOut, teamOf, toDecision } from '../src/game/training12/situations/sim';
import { HALF_W } from '../src/game/training12/situations/types';
import { SQUAD_ROLES } from '../src/game/training12/situations/squad';

const VARIANTS = ['cue', 'counter'] as const;
const each = (fn: (f: (typeof ALL_FIXTURES)[number], v: (typeof VARIANTS)[number], m: boolean) => void): void => {
  for (const f of ALL_FIXTURES) for (const v of VARIANTS) for (const m of [false, true]) fn(f, v, m);
};

describe('Team Training situations are complete 9v9 pictures (exactly 18)', () => {
  it('every fixture, cue and counter, plain and reflected: 18 players, 9 a side, one keeper each, one user, unique slots and full 1-3-2-3 roles', () => {
    let n = 0;
    each((f, v, m) => {
      const s = createSituation(f, v, m);
      const tag = `${f.id} ${v}${m ? ' mirrored' : ''}`;
      expect(s.actors, tag).toHaveLength(18);
      expect(new Set(s.actors.map((a) => a.slot)).size, tag).toBe(18);
      expect(s.actors.filter((a) => a.human), tag).toHaveLength(1);
      for (const t of ['A', 'B'] as const) {
        const mine = s.actors.filter((a) => teamOf(a.side) === t);
        expect(mine, `${tag} ${t}`).toHaveLength(9);
        expect(mine.filter((a) => a.side.startsWith('GK')), `${tag} ${t} keeper`).toHaveLength(1);
        const added = mine.filter((a) => a.filler).map((a) => a.role);
        // Added roles are the 1-3-2-3 roles the authored moment lacks, each once.
        expect(new Set(added).size, `${tag} ${t} added roles`).toBe(added.length);
        for (const r of added) expect(SQUAD_ROLES.includes(r) && !mine.some((a) => !a.filler && a.role === r), `${tag} ${t} ${r}`).toBe(true);
      }
      expect(s.actors.filter((a) => a.offHalf).length, tag).toBeLessThanOrEqual(1);
      n++;
    });
    expect(n).toBe(ALL_FIXTURES.length * 4);
  });

  it('added players keep clear of the decision: never touch the ball, never decide an outcome, and every authored outcome still plays out', () => {
    each((f, v, m) => {
      for (const o of f.options) {
        const s = playOut(createSituation(f, v, m), o.id);
        expect(s.events.filter((e) => e.includes('sq-')), `${f.id} ${v} ${o.id}`).toEqual([]);
        expect(s.ball.owner?.startsWith('sq-') ?? false).toBe(false);
      }
    });
  });

  it('nobody stacks: on the half, no two players start within 1.5 m, and each team spreads across the width', () => {
    const tight: string[] = [];
    each((f, v, m) => {
      const s = toDecision(createSituation(f, v, m));
      const on = s.actors.filter((a) => !a.offHalf);
      for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++) {
        const a = on[i]!, b = on[j]!;
        if ((a.filler || b.filler) && Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y) < 1.5) tight.push(`${f.id} ${v} ${a.slot}/${b.slot}`);
      }
      for (const t of ['A', 'B'] as const) {
        const xs = on.filter((a) => teamOf(a.side) === t && !a.side.startsWith('GK')).map((a) => a.pos.x);
        expect(Math.max(...xs) - Math.min(...xs), `${f.id} ${v} ${t} width`).toBeGreaterThan(HALF_W * 0.4);
      }
    });
    expect(tight).toEqual([]);
  });

  it('both teams react in the demonstration: added players of each team move with the ball', () => {
    let both = 0, total = 0;
    each((f, v, m) => {
      const o = f.options.find((x) => x.kind === 'pass') ?? f.options[0]!;
      const s0 = toDecision(createSituation(f, v, m));
      const before = new Map(s0.actors.map((a) => [a.slot, { ...a.pos }]));
      const s = playOut(createSituation(f, v, m), o.id);
      const moved = (t: 'A' | 'B') => s.actors.some((a) => a.filler && !a.offHalf && teamOf(a.side) === t && Math.hypot(a.pos.x - before.get(a.slot)!.x, a.pos.y - before.get(a.slot)!.y) > 0.5);
      total++;
      if (moved('A') && moved('B')) both++;
    });
    expect(both / total).toBeGreaterThan(0.8);
  });
});
