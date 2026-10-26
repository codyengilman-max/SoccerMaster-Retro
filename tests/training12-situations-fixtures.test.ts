import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALL_FIXTURES } from '../src/game/training12/situations/index';
import { createSituation, playOut, toDecision } from '../src/game/training12/situations/sim';
import { GOAL_W, HALF_L, HALF_W } from '../src/game/training12/situations/types';

const inHalf = (p: { x: number; y: number }): boolean => p.x >= 0 && p.x <= HALF_W && p.y >= 0 && p.y <= HALF_L;

describe('authored tactical situation fixtures (prototype, uncalibrated)', () => {
  it('every option plays out to its authored outcome, cue and counter, plain and reflected', () => {
    const bad: string[] = [];
    let n = 0;
    for (const f of ALL_FIXTURES) for (const v of ['cue', 'counter'] as const) for (const m of [false, true]) for (const o of f.options) {
      const want = f[v].grades[o.id]!.expect;
      const got = playOut(createSituation(f, v, m), o.id).outcome!.kind;
      n++;
      if (want !== got) bad.push(`${f.id} ${v} ${m ? 'mirrored' : ''} ${o.id}: want ${want} got ${got}`);
    }
    expect(bad).toEqual([]);
    expect(n).toBe(532);
  });

  it('every player, ball and option point is on the visible half; one user; the moment needs no off-screen player', () => {
    for (const f of ALL_FIXTURES) {
      expect(f.actors.filter((a) => a.slot === f.human), f.id).toHaveLength(1);
      expect(f.actors.length, f.id).toBeLessThanOrEqual(18);
      for (const a of f.actors) expect(inHalf(a.at), `${f.id} ${a.slot}`).toBe(true);
      for (const o of f.options) {
        // A shot aims inside the regulation goal; a clearance has no receiver and may land beyond halfway; every other point is on the half.
        if (o.kind === 'shoot') expect(Math.abs(o.point.x - HALF_W / 2) < GOAL_W / 2 && o.point.y >= HALF_L - 1, `${f.id} ${o.id}`).toBe(true);
        else if (o.kind === 'clear') expect(o.point.x >= 0 && o.point.x <= HALF_W && !o.toSlot, `${f.id} ${o.id}`).toBe(true);
        else expect(inHalf(o.point), `${f.id} ${o.id}`).toBe(true);
        if (o.toSlot) expect(f.actors.some((a) => a.slot === o.toSlot), `${f.id} ${o.id} -> ${o.toSlot}`).toBe(true);
      }
      for (const v of ['cue', 'counter'] as const) {
        const s = toDecision(createSituation(f, v));
        expect(s.phase, `${f.id} ${v}`).toBe('observe');
        // The far keeper of the 18 stands beyond halfway in the other half (drawn as an edge marker); everyone else is on this half.
        for (const a of s.actors) expect(a.offHalf ? a.side.startsWith('GK') && a.pos.y < 0 : inHalf(a.pos), `${f.id} ${v} ${a.slot} at freeze`).toBe(true);
        expect(inHalf(s.ball.pos), `${f.id} ${v} ball`).toBe(true);
        const verdicts = f.options.map((o) => f[v].grades[o.id]!.verdict);
        expect(verdicts, `${f.id} ${v}`).toContain('good');
        expect(f.options.length).toBeGreaterThanOrEqual(2);
        expect(f.options.length).toBeLessThanOrEqual(4);
      }
    }
  });

  it('participant counts follow the moment, not a fixed format', () => {
    const counts = new Set(ALL_FIXTURES.map((f) => f.actors.length));
    expect(counts.size).toBeGreaterThan(4);
    expect(ALL_FIXTURES.some((f) => f.actors.length === 18)).toBe(false);
  });

  it('keeps no small-sided semantics: no drill engine, boxes, mini-goals, gates, end zones or first-to-score', () => {
    const dir = 'src/game/training12/situations';
    const files = [...readdirSync(dir).map((x) => `${dir}/${x}`), ...readdirSync(`${dir}/fixtures`).map((x) => `${dir}/fixtures/${x}`)].filter((x) => x.endsWith('.ts'));
    for (const file of files) {
      const code = readFileSync(file, 'utf8');
      expect(code, file).not.toMatch(/from '\.\.\/drill'|from '\.\/drill'/);
      expect(code, file).not.toMatch(/mini-?goal|end ?zone|first to score|gateReach|execLimit|controlledIn/i);
    }
    expect(GOAL_W).toBeCloseTo(6.4);
  });
});
