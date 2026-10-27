import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { StoryStore, legacyKey } from '../src/game/story/store';
import { currentNode, newSeasonStory, newStory } from '../src/game/story/runtime';
import { sceneById } from '../src/game/story/content';

describe('story store (IndexedDB, one transaction per command)', () => {
  it('creates the story once and persists the cursor across reopen', async () => {
    const f = new IDBFactory();
    const a = await StoryStore.open(f, 'st');
    const s0 = await a.begin('c1');
    // Season One supersedes the older slice: new careers start at the Season One prologue.
    expect(s0.ok && s0.state.sceneId).toBe('S1_PRO_IDENTITY');
    const r = await a.dispatch('c1', { type: 'advance', revision: 0, seq: 1 });
    expect(r.ok).toBe(true);
    a.close();
    const b = await StoryStore.open(f, 'st');
    const s1 = await b.begin('c1');
    expect(s1.ok && s1.state.revision).toBe(1);
    expect(s1.ok && s1.state.revealed).toBe(true);
  });
  it('two tabs: the stale tab loses and writes nothing', async () => {
    const f = new IDBFactory();
    const a = await StoryStore.open(f, 'st');
    const b = await StoryStore.open(f, 'st');
    await a.begin('c1');
    const [x, y] = await Promise.all([a.dispatch('c1', { type: 'advance', revision: 0, seq: 1 }), b.dispatch('c1', { type: 'advance', revision: 0, seq: 2 })]);
    expect([x.ok, y.ok].filter(Boolean)).toHaveLength(1);
    expect((await a.load('c1'))!.revision).toBe(1);
  });
  it('a failure between reduce and commit leaves the save unchanged', async () => {
    const f = new IDBFactory();
    let fail = false;
    const a = await StoryStore.open(f, 'st', { beforeCommit: () => { if (fail) throw new Error('injected'); } });
    await a.begin('c1');
    fail = true;
    const r = await a.dispatch('c1', { type: 'advance', revision: 0, seq: 1 });
    expect(r.ok).toBe(false);
    expect((await a.load('c1'))!.revision).toBe(0);
    fail = false;
    expect((await a.dispatch('c1', { type: 'advance', revision: 0, seq: 1 })).ok).toBe(true);
  });
  it('an unreadable or missing-node save is kept aside, not overwritten', async () => {
    const f = new IDBFactory();
    const a = await StoryStore.open(f, 'st');
    await a.begin('c1');
    await a.putRecord('x', 1);
    // Simulate a save from content where the node no longer exists.
    const bad = { ...newStory('c2'), nodeId: 'deleted_node' };
    const db = await new Promise<IDBDatabase>((res) => { const q = f.open('st', 1); q.onsuccess = () => res(q.result); });
    await new Promise<void>((res) => { const t = db.transaction('story', 'readwrite'); t.objectStore('story').put(bad, 'c2'); t.oncomplete = () => res(); });
    const r = await a.begin('c2');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/missing/);
    const keys = await new Promise<IDBValidKey[]>((res) => { const q = db.transaction('story').objectStore('story').getAllKeys(); q.onsuccess = () => res(q.result); });
    expect(keys.some((k) => String(k).startsWith('broken-c2-'))).toBe(true);
    expect(keys).toContain('c2');
    expect(currentNode(newStory('z'))!.type).toBe('line');
  });
  it('an older four-week story is archived unchanged and the career starts Season One once', async () => {
    const f = new IDBFactory();
    const a = await StoryStore.open(f, 'st');
    const old = { ...newStory('c3'), contentVersion: '0.7', sceneId: 'W1_MONDAY_01', nodeId: 'n1', decisions: { W1_MONDAY_01: { feeling: 'nervous' } }, revision: 7 };
    const db = await new Promise<IDBDatabase>((res) => { const q = f.open('st', 1); q.onsuccess = () => res(q.result); });
    await new Promise<void>((res) => { const t = db.transaction('story', 'readwrite'); t.objectStore('story').put(old, 'c3'); t.oncomplete = () => res(); });
    const r = await a.begin('c3');
    expect(r.ok && r.state.sceneId).toBe('S1_PRO_IDENTITY');
    expect(r.ok && r.state.contentVersion).toBe('s1-v2.0');
    expect(await a.loadLegacy('c3')).toEqual(old);
    const again = await a.begin('c3');
    expect(again.ok && again.state).toEqual(r.ok && r.state);
    const keys = await new Promise<IDBValidKey[]>((res) => { const q = db.transaction('story').objectStore('story').getAllKeys(); q.onsuccess = () => res(q.result); });
    expect(keys.filter((k) => String(k) === legacyKey('c3'))).toHaveLength(1);
  });
});

describe('story store: Season One review fixes', () => {
  it('archives a finished legacy save exactly as stored, not its migrated cursor', async () => {
    const f = new IDBFactory();
    const a = await StoryStore.open(f, 'st2');
    const old = { ...newStory('c5'), contentVersion: 'w24-draft-1', sceneId: 'W2_ROLE_BOARD', nodeId: 'end', complete: true };
    const db = await new Promise<IDBDatabase>((res) => { const q = f.open('st2', 1); q.onsuccess = () => res(q.result); });
    await new Promise<void>((res) => { const t = db.transaction('story', 'readwrite'); t.objectStore('story').put(old, 'c5'); t.oncomplete = () => res(); });
    const r = await a.begin('c5');
    expect(r.ok && r.state.sceneId).toBe('S1_PRO_IDENTITY');
    expect(await a.loadLegacy('c5')).toEqual(old);
  });

  it('updateRecord reads, checks and writes in one transaction and leaves the record alone on refusal', async () => {
    const a = await StoryStore.open(new IDBFactory(), 'st3');
    expect(await a.updateRecord('k', (cur) => (cur === undefined ? { value: { goals: 2 }, out: 'first' } : null))).toBe('first');
    expect(await a.updateRecord('k', (cur) => (cur === undefined ? { value: { goals: 0 }, out: 'second' } : null))).toBeNull();
    expect(await a.getRecord('k')).toEqual({ goals: 2 });
  });
});

describe('story store: weeks 3–4 replacement migration (s1-v1.0 -> s1-v2.0)', () => {
  const put = async (f: IDBFactory, name: string, key: string, v: unknown) => {
    const db = await new Promise<IDBDatabase>((res) => { const q = f.open(name, 1); q.onsuccess = () => res(q.result); });
    await new Promise<void>((res) => { const t = db.transaction('story', 'readwrite'); t.objectStore('story').put(v, key); t.oncomplete = () => res(); });
    return db;
  };
  const allKeys = (db: IDBDatabase) => new Promise<IDBValidKey[]>((res) => { const q = db.transaction('story').objectStore('story').getAllKeys(); q.onsuccess = () => res(q.result); });
  it('a weeks 1–2 save from the previous release resumes in place on the new content version', async () => {
    const f = new IDBFactory();
    const a = await StoryStore.open(f, 'm1');
    const sc = sceneById('S1_W02_T')!;
    await put(f, 'm1', 'c6', { ...newSeasonStory('c6'), contentVersion: 's1-v1.0', sceneId: sc.id, nodeId: sc.entry, completedScenes: ['S1_PRO_IDENTITY'] });
    const r = await a.begin('c6');
    expect(r.ok && r.state).toMatchObject({ contentVersion: 's1-v2.0', sceneId: 'S1_W02_T' });
  });
  it('a launched weeks 1–2 run keeps resolving after the version change (re-keyed, same run id)', async () => {
    const f = new IDBFactory();
    const a = await StoryStore.open(f, 'm3');
    const sc = sceneById('S1_W02_T')!;
    const oldKey = JSON.stringify(['c8', 'S1_W02_T', 's1-v1.0', 'x1']);
    const run = { runId: 'r-1', adapter: 'crossbar', sceneId: 'S1_W02_T', nodeId: 'x1', state: 'launched', outcome: null, result: null };
    await put(f, 'm3', 'c8', { ...newSeasonStory('c8'), contentVersion: 's1-v1.0', sceneId: sc.id, nodeId: sc.entry, runs: { [oldKey]: run } });
    const r = await a.begin('c8');
    expect(r.ok && r.state.runs).toEqual({ [JSON.stringify(['c8', 'S1_W02_T', 's1-v2.0', 'x1'])]: run });
  });
  it('a save with old weeks 3–18 progress is not mapped onto the new script: kept, reported, and restartable on request only', async () => {
    const f = new IDBFactory();
    const a = await StoryStore.open(f, 'm2');
    const old = { ...newSeasonStory('c7'), contentVersion: 's1-v1.0', sceneId: 'S1_W02_E', completedScenes: ['S1_PRO_IDENTITY', 'S1_W03_M'] };
    const db = await put(f, 'm2', 'c7', old);
    await a.putRecord('league-s1:c7', { fake: 'league' });
    const r = await a.begin('c7');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/cannot be mapped/);
    // Nothing is wiped by the failed begin.
    expect(await a.getRecord('league-s1:c7')).toEqual({ fake: 'league' });
    expect(await a.restartStory('c7')).toBe(true);
    const keys = (await allKeys(db)).map(String);
    expect(keys.some((k) => k.startsWith('restart-c7-'))).toBe(true);
    expect(keys.some((k) => k.startsWith('rec:league-s1-archive:c7:'))).toBe(true);
    expect(await a.getRecord('league-s1:c7')).toBeUndefined();
    const again = await a.begin('c7');
    expect(again.ok && again.state).toMatchObject({ contentVersion: 's1-v2.0', sceneId: 'S1_PRO_IDENTITY', completedScenes: [] });
  });
});
