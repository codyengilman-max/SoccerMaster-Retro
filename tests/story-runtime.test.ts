import { describe, expect, it } from 'vitest';
import { createSession, currentNode, newStory, outcomeOf, reduceStory, runKey, type StoryCommand, type StoryState } from '../src/game/story/runtime';

let seq = 0;
const step = (s: StoryState, c: Omit<StoryCommand, 'revision'> & Record<string, unknown>): StoryState => {
  const r = reduceStory(s, { ...c, revision: s.revision } as StoryCommand);
  if (!r.ok) throw new Error(`${c.type} at ${s.sceneId}.${s.nodeId}: ${r.error}`);
  return r.state;
};
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
/** Plays forward choosing `pick` at choices and `outcome` at handoffs until `stopAt` scene or the end. */
function play(s: StoryState, opts: { pick?: (scene: string, node: string, ids: string[]) => string; stopAt?: string; outcome?: (scene: string, node: string) => 'completed' | 'declined' | 'abandoned' } = {}): StoryState {
  let runs = 0;
  for (let i = 0; i < 3000 && !s.complete && s.sceneId !== opts.stopAt; i++) {
    const n = currentNode(s)!;
    if (n.type === 'line') s = step(s, { type: 'advance', seq: ++seq });
    else if (n.type === 'choice') {
      const ids = n.options.map((o) => o.id);
      s = step(s, { type: 'choose', seq: ++seq, choiceId: opts.pick ? opts.pick(s.sceneId, n.id, ids) : ids[0]! });
    } else if (n.type === 'activity_handoff') {
      const r = reduceStory(s, { type: 'launch', revision: s.revision, runId: uuid(++runs) });
      if (!r.ok && /declined/.test(r.error)) s = step(s, { type: 'decline', seq: ++seq });
      else {
        if (!r.ok) throw new Error(r.error);
        s = r.state;
        const outcome = opts.outcome?.(s.sceneId, n.id) ?? 'completed';
        s = step(s, { type: 'complete', runId: r.runId!, outcome, result: ['crossbar', 'jungle', 'league_match'].includes(n.adapter) && outcome === 'completed' ? 'DRAW' : null });
      }
    }
  }
  return s;
}

describe('story runtime', () => {
  it('plays the approved weeks 1–5 once in order and stops at the week 5 close', () => {
    const s = play(newStory('c1'));
    expect(s.complete).toBe(true);
    expect(s.completedScenes.at(-1)).toBe('S1_W05_E');
    expect(new Set(s.completedScenes).size).toBe(s.completedScenes.length);
    expect(outcomeOf(s, 'S1_W01_S')).toMatchObject({ outcome: 'completed', result: 'DRAW' });
    expect(reduceStory(s, { type: 'advance', revision: s.revision, seq: ++seq }).ok).toBe(false);
  });
  it('declining Jungle Ball in week 3 records DECLINED once with no result', () => {
    const s = play(newStory('c2'), { outcome: (sc) => (sc === 'S1_W03_S' ? 'declined' : 'completed'), stopAt: 'S1_W03_S2' });
    expect(outcomeOf(s, 'S1_W03_S')).toMatchObject({ outcome: 'declined', result: null });
  });
  it('rejects forged, stale, duplicate and same-gesture choices without writing', () => {
    let s = play(newStory('c3'), { stopAt: 'S1_W03_M' });
    while (currentNode(s)!.type !== 'choice') s = step(s, { type: 'advance', seq: ++seq });
    const before = s;
    expect(reduceStory(s, { type: 'choose', revision: s.revision, seq: ++seq, choiceId: 'win_everything' })).toEqual({ ok: false, error: 'invalid choice' });
    expect(reduceStory(s, { type: 'choose', revision: s.revision - 1, seq: ++seq, choiceId: 'meet' })).toEqual({ ok: false, error: 'stale revision' });
    expect(reduceStory(s, { type: 'choose', revision: s.revision, seq: s.openedBy, choiceId: 'meet' })).toEqual({ ok: false, error: 'stale input' });
    expect(s).toBe(before);
    const a = step(s, { type: 'choose', seq: ++seq, choiceId: 'meet' });
    expect(reduceStory(s, { type: 'choose', revision: s.revision, seq: ++seq, choiceId: 'boundary' }).ok).toBe(true);
    expect(reduceStory(a, { type: 'choose', revision: s.revision, seq: ++seq, choiceId: 'boundary' })).toEqual({ ok: false, error: 'stale revision' });
    expect(a.decisions.S1_W03_M).toEqual({ challenge: 'meet' });
  });
  it('launch is idempotent and completion must match the owned run', () => {
    let s = play(newStory('c4'), { stopAt: 'S1_W03_S' });
    for (let n = currentNode(s)!; n.type !== 'activity_handoff'; n = currentNode(s)!)
      s = n.type === 'choice' ? step(s, { type: 'choose', seq: ++seq, choiceId: n.options[0]!.id }) : step(s, { type: 'advance', seq: ++seq });
    const r1 = reduceStory(s, { type: 'launch', revision: s.revision, runId: uuid(901) });
    expect(r1.ok && r1.runId).toBe(uuid(901));
    const s1 = (r1 as { state: StoryState }).state;
    const r2 = reduceStory(s1, { type: 'launch', revision: s1.revision, runId: uuid(902) });
    expect(r2).toMatchObject({ ok: true, changed: false, runId: uuid(901) });
    expect(reduceStory(s1, { type: 'complete', revision: s1.revision, runId: uuid(902), outcome: 'completed', result: 'WIN' }).ok).toBe(false);
    expect(reduceStory(s1, { type: 'complete', revision: s1.revision, runId: uuid(901), outcome: 'completed' }).ok).toBe(false);
    const s2 = step(s1, { type: 'complete', runId: uuid(901), outcome: 'abandoned' });
    expect(outcomeOf(s2, 'S1_W03_S')).toMatchObject({ outcome: 'abandoned', result: null });
    expect(reduceStory(s2, { type: 'complete', revision: s2.revision, runId: uuid(901), outcome: 'completed', result: 'WIN' }).ok).toBe(false);
    expect(runKey(s1, 'S1_W03_S', 'handoff')).not.toBe(runKey({ ...s1, careerId: 'other' }, 'S1_W03_S', 'handoff'));
  });
  it('replay sessions deny every write', async () => {
    let writes = 0;
    const replay = createSession('replay', async () => {
      writes++;
      return { ok: false, error: 'x' };
    });
    for (const c of [{ type: 'advance', revision: 0, seq: 1 }, { type: 'choose', revision: 0, seq: 1, choiceId: 'a' }, { type: 'launch', revision: 0, runId: uuid(1) }, { type: 'complete', revision: 0, runId: uuid(1), outcome: 'completed' }, { type: 'decline', revision: 0, seq: 1 }] as StoryCommand[]) {
      expect(await replay.dispatch(c)).toEqual({ ok: false, error: 'Replay is read-only.' });
    }
    expect(writes).toBe(0);
    expect(Object.isFrozen(replay)).toBe(true);
  });
});
