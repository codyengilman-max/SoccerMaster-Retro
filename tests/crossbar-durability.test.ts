import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { commitLaunch, commitResolve, idealPower, newContest, restoreContest, type Contest } from '../src/game/story/crossbar';
import { StoryStore } from '../src/game/story/store';

const kick = { dirX: 0, dirY: 1, power: idealPower() };
const launch = (s: StoryStore, key: string, seen: number) =>
  s.updateRecord(key, (cur) => {
    const c = commitLaunch(cur, seen, 'player', kick);
    return c ? { value: c, out: c } : null;
  });

describe('crossbar durability (X01–X04, compare-and-commit)', () => {
  it('X01 two tabs on the same open turn: exactly one launch commits; the stale tab launches nothing', async () => {
    const f = new IDBFactory();
    const a = await StoryStore.open(f, 'xb');
    const b = await StoryStore.open(f, 'xb');
    await a.putRecord('crossbar:r1', newContest('r1', false));
    const [ra, rb] = await Promise.all([launch(a, 'crossbar:r1', 0), launch(b, 'crossbar:r1', 0)]);
    expect([ra, rb].filter(Boolean)).toHaveLength(1);
    const stored = restoreContest(await a.getRecord('crossbar:r1'))!;
    expect(stored.attempts).toHaveLength(1);
    expect(stored.attempts[0]!.state).toBe('launched');
  });

  it('X02/X03 resolve is idempotent: a second resolve (other tab, reload, double tap) changes nothing', async () => {
    const s = await StoryStore.open(new IDBFactory(), 'xb2');
    await s.putRecord('crossbar:r2', newContest('r2', false));
    const l = (await launch(s, 'crossbar:r2', 0)) as Contest;
    const key = l.attempts[0]!.key;
    const resolve = () => s.updateRecord('crossbar:r2', (cur) => {
      const c = commitResolve(cur, key);
      return c ? { value: c, out: c } : null;
    });
    const first = await resolve();
    expect(first?.attempts[0]?.state).toBe('resolved');
    expect(first?.attempts[0]?.scored).toBe(true);
    expect(await resolve()).toBeNull();
    const stored = restoreContest(await s.getRecord('crossbar:r2'))!;
    expect(stored.attempts).toHaveLength(1);
    expect(stored).toEqual(first);
    // A delayed write from the earlier turn (seen = 0) can no longer launch over the newer state.
    expect(await launch(s, 'crossbar:r2', 0)).toBeNull();
  });

  it('X04 a failed or interrupted write launches nothing and the stored turn stays open', () => {
    const c = newContest('r3', false);
    expect(commitLaunch(undefined, 0, 'player', kick)).toBeNull();
    expect(commitLaunch({ ...c, status: 'abandoned' }, 0, 'player', kick)).toBeNull();
    expect(commitLaunch(c, 0, 'blake', kick)).toBeNull();
    expect(commitLaunch(c, 0, 'player', { dirX: 0, dirY: -1, power: 0.5 })).toBeNull();
    expect(commitLaunch(c, 0, 'player', kick)?.attempts).toHaveLength(1);
  });
});
