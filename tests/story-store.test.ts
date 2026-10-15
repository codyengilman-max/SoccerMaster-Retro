import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { StoryStore } from '../src/game/story/store';
import { currentNode, newStory } from '../src/game/story/runtime';

describe('story store (IndexedDB, one transaction per command)', () => {
  it('creates the story once and persists the cursor across reopen', async () => {
    const f = new IDBFactory();
    const a = await StoryStore.open(f, 'st');
    const s0 = await a.begin('c1');
    expect(s0.ok && s0.state.sceneId).toBe('INIT_IDENTITY');
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
});
