import { describe, expect, it } from 'vitest';
import { emptySave, reduce, type CareerSave, type Action } from '../src/game/career/state';
import { exportSave, parseImport, parseSave } from '../src/game/career/saveio';
import { weekDelta } from '../src/game/career/teamTraining';

function withPlayer(): CareerSave {
  const r = reduce(emptySave(), { type: 'createPlayer', id: 'p1', name: 'Kid', position: 'MID' });
  if (!r.ok) throw new Error(r.error);
  return r.save;
}
const act = (save: CareerSave, a: Action): CareerSave => {
  const r = reduce(save, a);
  if (!r.ok) throw new Error(r.error);
  return r.save;
};
const run = (slot: 'A' | 'B' | 'C', runId: string, score = 0.9, creditEligible = true): Action => ({ type: 'tt12Run', week: 1, slot, runId, score, creditEligible });
const total = (s: CareerSave) => Object.values(s.player!.attributes).reduce((a, b) => a + b, 0);

describe('Team Training v1.2 progression adapter', () => {
  it('grades the week once, through the existing weekly economy, after all three sessions are credited', () => {
    let s = withPlayer();
    const start = total(s);
    s = act(s, run('A', 'r1'));
    s = act(s, run('B', 'r2'));
    expect(s.teamTraining).toHaveLength(0);
    expect(total(s)).toBe(start);
    s = act(s, run('C', 'r3', 0.6));
    expect(s.teamTraining).toHaveLength(1);
    expect(s.teamTraining[0]!.scores).toEqual([0.9, 0.9, 0.6]);
    expect(s.teamTraining[0]!.delta).toBe(weekDelta([0.9, 0.9, 0.6]));
    expect(total(s)).toBe(start + s.teamTraining[0]!.delta);
  });

  it('replayed completions and repeat sessions change nothing (no duplicate rewards)', () => {
    let s = withPlayer();
    for (const [slot, id] of [['A', 'r1'], ['B', 'r2'], ['C', 'r3']] as const) s = act(s, run(slot, id));
    const after = total(s);
    const replay = reduce(s, run('C', 'r3'));
    expect(replay.ok && !replay.changed).toBe(true);
    const again = reduce(s, run('A', 'r9', 1));
    expect(again.ok && !again.changed).toBe(true);
    expect(total(again.ok ? again.save : s)).toBe(after);
  });

  it('attendance without enough observed play is saved but never counted', () => {
    let s = withPlayer();
    s = act(s, run('A', 'r1', 1, false));
    s = act(s, run('B', 'r2'));
    s = act(s, run('C', 'r3'));
    expect(s.teamTraining).toHaveLength(0);
    expect(s.tt12.filter((r) => r.credited)).toHaveLength(2);
    s = act(s, run('A', 'r4'));
    expect(s.teamTraining).toHaveLength(1);
  });

  it('rejects other weeks, bad slots and out-of-range scores', () => {
    const s = withPlayer();
    expect(reduce(s, { ...run('A', 'x'), week: 2 } as Action).ok).toBe(false);
    expect(reduce(s, { ...run('A', 'x'), slot: 'D' } as unknown as Action).ok).toBe(false);
    expect(reduce(s, run('A', 'x', 1.5)).ok).toBe(false);
    expect(reduce(emptySave(), run('A', 'x')).ok).toBe(false);
  });

  it('survives save/reload; a tampered save counting a session twice is refused', () => {
    let s = withPlayer();
    s = act(s, run('A', 'r1'));
    const back = parseImport(exportSave(s));
    expect(back.ok && back.value.tt12).toEqual(s.tt12);
    const raw = JSON.parse(JSON.stringify(s)) as { tt12: unknown[] };
    raw.tt12.push({ ...(raw.tt12[0] as object), runId: 'r2' });
    expect(parseSave(raw).ok).toBe(false);
    const legacy = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    delete legacy.tt12;
    const old = parseSave(legacy);
    expect(old.ok && old.value.tt12).toEqual([]);
  });
});
