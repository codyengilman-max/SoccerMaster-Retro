import { describe, expect, it } from 'vitest';
import { sessions, scenarioDefinition } from '../src/game/training12/ref/seasons.mjs';
import type { RoleId } from '../src/game/training12/ref/catalog.mjs';
import { choose, createDrill, human, options, settle, step, teamOf, type DrillState } from '../src/game/training12/drill';
import { emptySave, reduce, type Action, type CareerSave } from '../src/game/career/state';
import { selectSituations } from '../src/game/career/teamTraining';

const ROLES: RoleId[] = ['CB', 'LB', 'RB', '6', '8', 'LW', 'RW', '9'];
const early = sessions.filter((s) => s.season === 1 && s.week <= 4);

/** A live attempt on the first S1 week 1-4 route whose targets match, with the human on team A. */
function live(match: (types: string[]) => boolean): DrillState {
  for (const s of early) for (const r of ROLES) {
    const def = scenarioDefinition(s.id, r, 1, 'youth');
    if (!match(def.targets.map((t) => t.type))) continue;
    const d = createDrill(def, 3, 0);
    if (teamOf(human(d).side) !== 'A') continue;
    settle(d);
    expect(choose(d, options(d)[0]!.id)).toBe(true);
    return d;
  }
  throw new Error('no route with those targets');
}
const run = (d: DrillState) => { for (let i = 0; i < 2000 && d.phase === 'execute'; i++) step(d); };
const mateA = (d: DrillState) => d.actors.find((a) => !a.human && a.side === 'A')!;

describe('PR #32 review fixes', () => {
  it('a loose ball through an exit gate does not score (B1/K1 need a controlled reception)', () => {
    const d = live((t) => t.includes('gate'));
    const g = d.targets.find((t) => t.type === 'gate' && t.scoresFor === 'A')!;
    for (const a of d.actors) if (!a.human) a.pos = { x: 1, y: 1 };
    Object.assign(d.ball, { owner: null, lastTeam: 'A', target: null, pos: { x: g.cx - 2, y: g.cy }, vel: { x: Math.sign(g.cx - d.L / 2) * 14, y: 0 } });
    run(d);
    expect(d.outcome?.kind).not.toBe('scored');
  });

  it('a teammate controlling the ball at an exit gate scores', () => {
    const d = live((t) => t.includes('gate'));
    const g = d.targets.find((t) => t.type === 'gate' && t.scoresFor === 'A')!;
    const m = mateA(d);
    m.pos = { x: g.cx - Math.sign(g.cx - d.L / 2) * 0.5, y: g.cy };
    Object.assign(d.ball, { owner: m.slot, lastTeam: 'A', pos: { ...m.pos }, vel: { x: 0, y: 0 } });
    step(d);
    expect(d.outcome?.kind).toBe('scored');
  });

  it('a controlled reception in the far end zone scores (C1)', () => {
    const d = live((t) => t.includes('end-zone'));
    const z = d.targets.find((t) => t.type === 'end-zone' && t.scoresFor === 'A')!;
    const m = mateA(d);
    m.pos = { x: z.cx > d.L / 2 ? d.L - 1 : 1, y: d.W / 2 };
    Object.assign(d.ball, { owner: m.slot, lastTeam: 'A', pos: { ...m.pos }, vel: { x: 0, y: 0 } });
    step(d);
    expect(d.outcome?.kind).toBe('scored');
  });

  it('a turnover keeps play live for the counter instead of ending the attempt (D1/T1)', () => {
    const d = live((t) => t.includes('mini-goal'));
    const b = d.actors.find((a) => a.side === 'B')!;
    b.pos = { x: d.L / 2, y: d.W / 2 };
    Object.assign(d.ball, { owner: b.slot, lastTeam: 'B', pos: { ...b.pos }, vel: { x: 0, y: 0 } });
    d.startTeam = 'A';
    d.execT = 3;
    step(d);
    expect(d.phase).toBe('execute');
    expect(d.turnover).toBe(true);
    expect(d.execLimit).toBeGreaterThan(3.2);
    run(d);
    expect(d.outcome).not.toBeNull();
  });

  it('v1.2 runs after the legacy weekly grade are saved as practice, not counted', () => {
    const act = (s: CareerSave, a: Action): CareerSave => { const r = reduce(s, a); if (!r.ok) throw new Error(r.error); return r.save; };
    let s = act(emptySave(), { type: 'createPlayer', id: 'p1', name: 'Kid', position: 'MID' });
    s = act(s, { type: 'teamTraining', week: 1, results: selectSituations('MID', 1).map((x) => ({ id: x.id, score: 1, notes: [] })) });
    const r = reduce(s, { type: 'tt12Run', week: 1, slot: 'A', runId: 'after-legacy', score: 1, creditEligible: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.message).toMatch(/practice only/);
    expect(r.save.tt12.at(-1)).toMatchObject({ runId: 'after-legacy', credited: false });
    expect(r.save.player!.attributes).toEqual(s.player!.attributes);
  });
});
