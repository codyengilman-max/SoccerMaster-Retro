import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { CareerStore } from '../src/game/career/store';
import { StoryStore } from '../src/game/story/store';

describe('New game', () => {
  it('archives the career and starts an empty save at week 1', async () => {
    const f = new IDBFactory();
    const s = await CareerStore.open(f, 'c');
    await s.dispatch({ type: 'createPlayer', id: 'p1', name: 'Ava', position: 'MID', gender: 'girl' });
    for (let i = 0; i < 3; i++) await s.dispatch({ type: 'endWeek' });
    const before = await s.load();
    expect(before.week).toBeGreaterThan(1);
    expect(await s.startOver()).toBe(true);
    const after = await s.load();
    expect(after.player).toBeNull();
    expect(after.week).toBe(1);
    // The old career is kept aside, not deleted.
    const db = await new Promise<IDBDatabase>((res) => { const r = f.open('c', 1); r.onsuccess = () => res(r.result); });
    const keys = await new Promise<IDBValidKey[]>((res) => { const r = db.transaction('career').objectStore('career').getAllKeys(); r.onsuccess = () => res(r.result); });
    expect(keys.some((k) => String(k).startsWith('archive-'))).toBe(true);
    db.close();
  });
  it('restarts the story and moves league and cup records aside', async () => {
    const f = new IDBFactory();
    const st = await StoryStore.open(f, 's');
    await st.begin('main');
    await st.putRecord('league-s1:main', { x: 1 });
    await st.putRecord('tourney-s1:main:az_showcase', { y: 2 });
    await st.putRecord('rankings-s1:main', { z: 3 });
    expect(await st.newGame('main')).toBe(true);
    expect(await st.getRecord('league-s1:main')).toBeUndefined();
    // Old rankings would carry published weeks into the new story; they are moved aside too.
    expect(await st.getRecord('rankings-s1:main')).toBeUndefined();
    expect(await st.getRecord('tourney-s1:main:az_showcase')).toBeUndefined();
    const b = await st.begin('main');
    const fresh = await (await StoryStore.open(new IDBFactory(), 'fresh')).begin('main');
    expect(b.ok && fresh.ok && b.state.sceneId === fresh.state.sceneId && b.state.nodeId === fresh.state.nodeId).toBe(true);
  });
});
