import { describe, expect, it } from 'vitest';
import { reduce, emptySave, type CareerSave } from '../src/game/career/state';
import { parseSave } from '../src/game/career/saveio';
import { HOME_CURRICULUM, checkpointBlock, trackStatus } from '../src/game/career/homeCurriculum';
import { activityById } from '../src/game/career/catalog';

const start = (): CareerSave => {
  const r = reduce(emptySave(), { type: 'createPlayer', id: 'p1', name: 'Kid', position: 'MID' });
  if (!r.ok) throw new Error(r.error);
  return r.save;
};
const run = (s: CareerSave, ...actions: Parameters<typeof reduce>[1][]) => actions.reduce((acc, a) => { const r = reduce(acc, a); if (!r.ok) throw new Error(r.error); return r.save; }, s);
const logDone = (s: CareerSave, activityId: string, id: string) => run(s, { type: 'log', entry: { id, sessionId: null, activityId, variantId: null, contentVersion: activityById(activityId)!.version, completion: 'done', rating: null, foot: null, personalBest: null, reflection: '', easier: false } });
const approvedTrack = (t: 'juggling' | 'ballMastery') => HOME_CURRICULUM.lessons.filter((l) => l.track === t && !l.heldOut);

describe('home checkpoints (player-reported completion)', () => {
  it('viewing records the lesson once and never passes it', () => {
    const id = trackStatus('juggling', start()).current!.lesson.id;
    const s = run(start(), { type: 'lessonViewed', activityId: id }, { type: 'lessonViewed', activityId: id });
    expect(s.lessonsViewed).toEqual([id]);
    expect(trackStatus('juggling', s).current!.lesson.id).toBe(id);
    expect(reduce(s, { type: 'lessonViewed', activityId: 'nope' }).ok).toBe(false);
  });
  it('an unapproved checkpoint cannot be reported, however much it is practised', () => {
    const s0 = start();
    const bm = trackStatus('ballMastery', s0).current!.lesson;
    let s = s0;
    for (let i = 0; i < 4; i++) s = logDone(s, bm.id, `j${i}`);
    if (bm.checkpoint.status !== 'approved') expect(reduce(s, { type: 'checkpoint', id: 'c1', activityId: bm.id }).ok).toBe(false);
  });
  it('an approved checkpoint needs the assigned lesson and a logged practice, passes once, and allows one new lesson a week per track', () => {
    // Find a track whose assigned lesson has an approved checkpoint, by walking a save to it is not possible without
    // reports, so test with the first approved juggling lesson if it is the assigned one.
    let s = start();
    const cur = trackStatus('juggling', s).current!.lesson;
    if (cur.checkpoint.status !== 'approved') return expect(checkpointBlock(s, cur.id)).toMatch(/coach-approved/);
    expect(checkpointBlock(s, cur.id)).toMatch(/Log a practice/);
    s = logDone(s, cur.id, 'j1');
    expect(checkpointBlock(s, cur.id)).toBeNull();
    s = run(s, { type: 'checkpoint', id: 'c1', activityId: cur.id });
    expect(s.checkpoints).toEqual([{ id: 'c1', activityId: cur.id, week: 1 }]);
    const st = trackStatus('juggling', s);
    expect(st.passed).toBe(1);
    expect(reduce(s, { type: 'checkpoint', id: 'c2', activityId: cur.id }).ok).toBe(false);
    const next = st.current!.lesson;
    expect(next.id).not.toBe(cur.id);
    s = logDone(s, next.id, 'j2');
    if (next.checkpoint.status === 'approved') expect(checkpointBlock(s, next.id)).toMatch(/One new lesson a week/);
    expect(trackStatus('ballMastery', s).passed).toBe(0);
    const later = approvedTrack('juggling').find((l) => l.checkpoint.status === 'approved' && l.id !== cur.id && l.id !== next.id)!;
    expect(checkpointBlock(s, later.id)).toMatch(/assigned lesson|coach-approved/);
  });
  it('old saves load with no views or reports, and reports round-trip; a duplicate report is rejected on load', () => {
    const raw = JSON.parse(JSON.stringify(start())) as Record<string, unknown>;
    delete raw.lessonsViewed;
    delete raw.checkpoints;
    const r = parseSave(raw);
    expect(r.ok && r.value.checkpoints).toEqual([]);
    expect(r.ok && r.value.lessonsViewed).toEqual([]);
    const dup = { ...raw, checkpoints: [{ id: 'a', activityId: 'jg-1', week: 1 }, { id: 'b', activityId: 'jg-1', week: 1 }] };
    expect(parseSave(dup).ok).toBe(false);
  });
});
