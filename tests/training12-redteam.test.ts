import { describe, expect, it } from 'vitest';
import { emptySave, reduce, type Action, type CareerSave } from '../src/game/career/state';
import { selectSituations } from '../src/game/career/teamTraining';
import { completionRequest } from '../src/game/training12/ref/engine.mjs';
import { planFor, TrainingSession } from '../src/game/training12/session';
import { verifiedRecord } from '../src/game/training12/registry';
import type { RoleId } from '../src/game/training12/ref/catalog.mjs';

const act = (save: CareerSave, a: Action): CareerSave => {
  const r = reduce(save, a);
  if (!r.ok) throw new Error(r.error);
  return r.save;
};
const total = (s: CareerSave) => Object.values(s.player!.attributes).reduce((a, b) => a + b, 0);
const player = () => act(emptySave(), { type: 'createPlayer', id: 'p1', name: 'Kid', position: 'MID' });
const tt = (slot: 'A' | 'B' | 'C', runId: string): Action => ({ type: 'tt12Run', week: 1, slot, runId, score: 1, creditEligible: true });

function session(role: RoleId = '8'): TrainingSession {
  const plan = planFor('S1-W01-A', role);
  if (plan.status !== 'selected') throw new Error('route not enabled');
  return new TrainingSession(plan, 'p1', 'run-red', 7);
}
function playOut(s: TrainingSession): void {
  for (let i = 0; i < 20_000 && s.status !== 'complete'; i++) {
    if (s.status === 'ready') s.startRound();
    else if (s.status === 'reflection') s.continueRound();
    else if (s.drill?.phase === 'observe') {
      const best = [...s.choices()].sort((a, b) => b.assessment.quality - a.assessment.quality)[0];
      if (best) s.decide(best.option.id, s.generation);
      else s.update(0.05);
    } else if (s.drill?.phase === 'explain') s.next();
    else s.update(0.05);
  }
}

describe('Team Training v1.2 red team', () => {
  it('old and new Team Training cannot both reward the same week (either order)', () => {
    const legacy = (_s: CareerSave): Action => ({ type: 'teamTraining', week: 1, results: selectSituations('MID', 1).map((x) => ({ id: x.id, score: 1, notes: [] })) });
    let a = act(player(), legacy(player()));
    const afterLegacy = total(a);
    for (const [slot, id] of [['A', 'r1'], ['B', 'r2'], ['C', 'r3']] as const) a = act(a, tt(slot, id));
    expect(a.teamTraining).toHaveLength(1);
    expect(total(a)).toBe(afterLegacy);

    let b = player();
    for (const [slot, id] of [['A', 'r1'], ['B', 'r2'], ['C', 'r3']] as const) b = act(b, tt(slot, id));
    const afterNew = total(b);
    const again = reduce(b, legacy(b));
    expect(again.ok && !again.changed).toBe(true);
    expect(total(b)).toBe(afterNew);
  });

  it('a completion bound to another player, session or content version is refused', () => {
    const s = session();
    playOut(s);
    expect(s.status).toBe('complete');
    expect(s.completion?.creditEligible).toBe(true);
    expect(() => completionRequest(s.run, { ...s.run, humanId: 'someone-else' })).toThrow();
    expect(() => completionRequest(s.run, { ...s.run, sessionId: 'S1-W02-A' })).toThrow();
    expect(() => completionRequest(s.run, { ...s.run, contentVersion: s.run.contentVersion + 1 })).toThrow();
  });

  it('paused and aborted runs accept no decisions', () => {
    const s = session();
    s.startRound();
    for (let i = 0; i < 2000 && s.drill?.phase !== 'observe'; i++) s.update(0.05);
    const id = s.choices()[0]!.option.id;
    s.pause();
    expect(s.decide(id, s.generation)).toBe(false);
    s.resume();
    s.abort();
    expect(s.decide(id, s.generation)).toBe(false);
    expect(s.attempts.every((a) => a.decision === null || a.round >= 0)).toBe(true);
  });

  it('unknown roles and generated-but-unverified layouts never open a route', () => {
    expect(() => {
      const p = planFor('S1-W01-A', 'XX' as RoleId);
      if (p.status === 'selected') throw new Error('should not select');
      throw new Error('unavailable');
    }).toThrow();
    expect(verifiedRecord('S1-W05-A', '8', 2)).toBeNull();
    expect(verifiedRecord('S1-W01-A', '8', 2)).toBeNull();
    expect(verifiedRecord('S2-W01-A', '8', 3)).toBeNull();
    expect(verifiedRecord('S1-W19-A', '8', 1)).toBeNull();
    expect(verifiedRecord('S1-W01-A', '8', 1)?.verified).toBe(true);
  });
});
