import { describe, expect, it } from 'vitest';
import { createSession, currentNode, migrateStory, newStory, outcomeOf, reduceStory, runKey, type StoryCommand, type StoryState } from '../src/game/story/runtime';

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
        s = step(s, { type: 'complete', runId: r.runId!, outcome, result: n.adapter === 'crossbar' && outcome === 'completed' ? 'DRAW' : null });
      }
    }
  }
  return s;
}

describe('story runtime', () => {
  it('plays the whole week-one slice once in authoritative order', () => {
    const s = play(newStory('c1'));
    expect(s.complete).toBe(true);
    expect(s.completedScenes.slice(0, 18).at(-1)).toBe('W2_SCHOOL_CALLBACK');
    expect(s.completedScenes.at(-1)).toBe('W4_BEDROOM');
    expect(s.completedScenes).toHaveLength(43);
    expect(outcomeOf(s, 'W1_CROSSBAR')).toMatchObject({ outcome: 'completed', result: 'DRAW' });
    expect(reduceStory(s, { type: 'advance', revision: s.revision, seq: ++seq }).ok).toBe(false);
  });
  it('declining the invitation records DECLINED once and never launches the crossbar', () => {
    const s = play(newStory('c2'), { pick: (sc, _n, ids) => (sc === 'W1_SCHOOL_02' ? 'decline' : ids[0]!), stopAt: 'W1_CROSSBAR_REACTION' });
    expect(outcomeOf(s, 'W1_CROSSBAR')).toMatchObject({ outcome: 'declined', runId: '' });
  });
  it('rejects forged, stale, duplicate and same-gesture choices without writing', () => {
    let s = play(newStory('c3'), { stopAt: 'W1_SCHOOL_02' });
    while (currentNode(s)!.type !== 'choice') s = step(s, { type: 'advance', seq: ++seq });
    const before = s;
    expect(reduceStory(s, { type: 'choose', revision: s.revision, seq: ++seq, choiceId: 'win_everything' })).toEqual({ ok: false, error: 'invalid choice' });
    expect(reduceStory(s, { type: 'choose', revision: s.revision - 1, seq: ++seq, choiceId: 'accept' })).toEqual({ ok: false, error: 'stale revision' });
    expect(reduceStory(s, { type: 'choose', revision: s.revision, seq: s.openedBy, choiceId: 'accept' })).toEqual({ ok: false, error: 'stale input' });
    expect(s).toBe(before);
    const a = step(s, { type: 'choose', seq: ++seq, choiceId: 'accept' });
    // Two tabs: the second submission on the old revision loses; one decision only.
    expect(reduceStory(s, { type: 'choose', revision: s.revision, seq: ++seq, choiceId: 'decline' }).ok).toBe(true);
    expect(reduceStory(a, { type: 'choose', revision: s.revision, seq: ++seq, choiceId: 'decline' })).toEqual({ ok: false, error: 'stale revision' });
    expect(a.decisions.W1_SCHOOL_02).toEqual({ invitation: 'accept' });
  });
  it('launch is idempotent and completion must match the owned run', () => {
    let s = play(newStory('c4'), { stopAt: 'W1_CROSSBAR' });
    while (currentNode(s)!.type !== 'activity_handoff') s = step(s, { type: 'advance', seq: ++seq });
    const r1 = reduceStory(s, { type: 'launch', revision: s.revision, runId: uuid(901) });
    expect(r1.ok && r1.runId).toBe(uuid(901));
    const s1 = (r1 as { state: StoryState }).state;
    const r2 = reduceStory(s1, { type: 'launch', revision: s1.revision, runId: uuid(902) });
    expect(r2).toMatchObject({ ok: true, changed: false, runId: uuid(901) });
    expect(reduceStory(s1, { type: 'complete', revision: s1.revision, runId: uuid(902), outcome: 'completed', result: 'WIN' }).ok).toBe(false);
    expect(reduceStory(s1, { type: 'complete', revision: s1.revision, runId: uuid(901), outcome: 'completed' }).ok).toBe(false);
    const s2 = step(s1, { type: 'complete', runId: uuid(901), outcome: 'abandoned' });
    expect(outcomeOf(s2, 'W1_CROSSBAR')).toMatchObject({ outcome: 'abandoned', result: null });
    expect(reduceStory(s2, { type: 'complete', revision: s2.revision, runId: uuid(901), outcome: 'completed', result: 'WIN' }).ok).toBe(false);
    expect(runKey(s1, 'W1_CROSSBAR', 'handoff')).not.toBe(runKey({ ...s1, careerId: 'other' }, 'W1_CROSSBAR', 'handoff'));
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

  describe('weeks 2–4 draft chapter', () => {
    const alexLine = (s: StoryState): string | undefined => s.transcript.filter((t) => t.sceneId === 'W4_TOUCHLINE').map((t) => t.nodeId).find((n) => n !== 'alex');
    const pickWith = (map: Record<string, string>) => (sc: string, node: string, ids: string[]) => map[`${sc}.${node}`] ?? ids[0]!;

    it('keeping the promised session leads to the kept touchline line; no other promise path fires', () => {
      const s = play(newStory('k1'), { pick: pickWith({ 'W2_ALEX_LATE.offer': 'agree', 'W3_COMMITMENT.commit': 'keep' }) });
      expect(s.complete).toBe(true);
      expect(alexLine(s)).toBe('kept');
      expect(s.transcript.some((t) => t.sceneId === 'W3_REPAIR' && t.nodeId === 'quiet')).toBe(true);
      expect(s.transcript.some((t) => t.sceneId === 'W3_REPAIR' && t.nodeId === 'alex_msg')).toBe(false);
    });
    it('a missed session offers one repair; a completed repair shows the repaired line', () => {
      const s = play(newStory('m1'), {
        pick: pickWith({ 'W2_ALEX_LATE.offer': 'other_slot', 'W3_COMMITMENT.commit': 'keep', 'W3_REPAIR.answer': 'propose_repair' }),
        outcome: (sc, n) => (sc === 'W3_COMMITMENT' && n === 'bound' ? 'declined' : 'completed'),
      });
      expect(s.transcript.some((t) => t.sceneId === 'W3_COMMITMENT' && t.nodeId === 'missed')).toBe(true);
      expect(alexLine(s)).toBe('repaired');
    });
    it('a missed session with no repair stays unresolved at the touchline', () => {
      const s = play(newStory('m2'), {
        pick: pickWith({ 'W2_ALEX_LATE.offer': 'agree', 'W3_COMMITMENT.commit': 'keep', 'W3_REPAIR.answer': 'acknowledge' }),
        outcome: (sc, n) => (sc === 'W3_COMMITMENT' && n === 'bound' ? 'abandoned' : 'completed'),
      });
      expect(alexLine(s)).toBe('unresolved');
    });
    it('cancelling with notice is not a broken promise, and declining the offer creates no promise', () => {
      const c = play(newStory('c1x'), { pick: pickWith({ 'W2_ALEX_LATE.offer': 'agree', 'W3_COMMITMENT.commit': 'cancel' }) });
      expect(alexLine(c)).toBe('cancelled');
      expect(c.transcript.some((t) => t.sceneId === 'W3_REPAIR' && t.nodeId === 'alex_msg')).toBe(false);
      const d = play(newStory('d1x'), { pick: pickWith({ 'W2_ALEX_LATE.offer': 'decline' }) });
      expect(d.transcript.some((t) => t.sceneId === 'W3_COMMITMENT' && t.nodeId === 'no_promise')).toBe(true);
      expect(alexLine(d)).toBe('none');
    });
    it('watching Jungle Ball declines it once without launching a run', () => {
      const s = play(newStory('j1'), { pick: pickWith({ 'W2_JUNGLE.invite': 'watch' }), stopAt: 'W2_PRACTICE' });
      expect(outcomeOf(s, 'W2_JUNGLE')).toMatchObject({ outcome: 'declined', runId: '' });
    });
    it('an old save that finished week one continues into week 2 without changing anything already decided', () => {
      const full = play(newStory('old1'), { stopAt: 'W2_ROLE_BOARD' });
      // What the previous build saved: complete at the callback's end node.
      const old: StoryState = { ...full, sceneId: 'W2_SCHOOL_CALLBACK', nodeId: 'end', complete: true, transcript: full.transcript.filter((t) => t.sceneId !== 'W2_ROLE_BOARD') };
      const m = migrateStory(old);
      expect(m.complete).toBe(false);
      expect(m.sceneId).toBe('W2_ROLE_BOARD');
      expect(m.decisions).toBe(old.decisions);
      expect(m.runs).toBe(old.runs);
      expect(m.completedScenes).toEqual(old.completedScenes);
      expect(migrateStory(m)).toBe(m);
      const done = play(newStory('old2'));
      expect(migrateStory(done)).toBe(done);
    });
  });
});
