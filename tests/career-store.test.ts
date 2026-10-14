import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { activityById } from '../src/game/career/catalog';
import { CAREER_CONFIG } from '../src/game/career/config';
import { exportSave, parseImport, parseSave } from '../src/game/career/saveio';
import { emptySave, reduce, type CareerSave } from '../src/game/career/state';
import { CareerStore } from '../src/game/career/store';

async function ready(factory = new IDBFactory()) {
  const s = await CareerStore.open(factory, 'test');
  await s.dispatch({ type: 'createPlayer', id: 'p1', name: 'Sam', position: 'MID' });
  await s.dispatch({ type: 'chooseFocus', focusId: 'ft-cushion' });
  return { s, factory };
}
function entryFor(save: CareerSave, i: number, id: string) {
  const it = save.plan!.sessions[i]!.items[0]!;
  return { id, sessionId: save.plan!.sessions[i]!.id, activityId: it.activityId, variantId: null, contentVersion: activityById(it.activityId)!.version, completion: 'done' as const, rating: 'improving' as const, foot: null, personalBest: null, reflection: '', easier: false };
}

describe('M6 career store (IndexedDB)', () => {
  it('rapid duplicate Complete taps write once', async () => {
    const { s } = await ready();
    const save = await s.load();
    const e = entryFor(save, 0, 'tap-1');
    const results = await Promise.all(Array.from({ length: 5 }, () => s.dispatch({ type: 'log', entry: e })));
    expect(results.filter((r) => r.ok && r.changed)).toHaveLength(1);
    const after = await s.load();
    expect(after.journal).toHaveLength(1);
    expect(after.credit).toBe(1);
  });

  it('two tabs completing the same session at once credit it once', async () => {
    const factory = new IDBFactory();
    const { s: tabA } = await ready(factory);
    const tabB = await CareerStore.open(factory, 'test');
    const save = await tabA.load();
    await Promise.all([tabA.dispatch({ type: 'log', entry: entryFor(save, 0, 'a-1') }), tabB.dispatch({ type: 'log', entry: entryFor(save, 0, 'b-1') })]);
    const after = await tabB.load();
    expect(after.journal).toHaveLength(2);
    expect(after.credit).toBe(1);
    expect(after.journal.filter((j) => j.credited)).toHaveLength(1);
  });

  it('a failed (aborted) save changes nothing and reports the failure', async () => {
    const { s } = await ready();
    const before = await s.load();
    const db = (s as unknown as { db: IDBDatabase }).db;
    const orig = db.transaction.bind(db);
    (db as { transaction: unknown }).transaction = (...a: Parameters<IDBDatabase['transaction']>) => {
      const t = orig(...a);
      if (a[1] === 'readwrite') queueMicrotask(() => t.abort());
      return t;
    };
    const r = await s.dispatch({ type: 'log', entry: entryFor(before, 0, 'crash-1') });
    expect(r.ok).toBe(false);
    (db as { transaction: unknown }).transaction = orig;
    const after = await s.load();
    expect(after.journal).toHaveLength(0);
    expect(after.credit).toBe(0);
  });

  it('reload keeps the career; an unreadable stored save is kept aside, not overwritten silently', async () => {
    const { s, factory } = await ready();
    s.close();
    const again = await CareerStore.open(factory, 'test');
    expect((await again.load()).player!.name).toBe('Sam');
    const db = (again as unknown as { db: IDBDatabase }).db;
    await new Promise<void>((res) => {
      const t = db.transaction('career', 'readwrite');
      t.objectStore('career').put({ schema: 2, week: Number.NaN }, 'main');
      t.oncomplete = () => res();
    });
    again.close();
    const third = await CareerStore.open(factory, 'test');
    expect(third.status.kind).toBe('recovered');
    expect((await third.load()).player).toBeNull();
  });

  it('exports and imports round-trip; malformed, oversized, non-finite and HTML-like data is handled', async () => {
    const { s } = await ready();
    const text = await s.exportText();
    expect(parseImport(text).ok).toBe(true);
    expect(parseImport('{').ok).toBe(false);
    expect(parseImport('x'.repeat(CAREER_CONFIG.limits.importBytesMax + 1)).ok).toBe(false);
    expect(parseImport(JSON.stringify({ kind: 'other' })).ok).toBe(false);
    const good = JSON.parse(text);
    const bad = (mut: (o: any) => void) => {
      const o = structuredClone(good);
      mut(o.save);
      return parseImport(JSON.stringify(o));
    };
    expect(bad((o) => (o.player.attributes.passing = 1e309)).ok).toBe(false);
    expect(bad((o) => (o.player.attributes.passing = 120)).ok).toBe(false);
    expect(bad((o) => (o.player.attributes.passing = 75)).ok).toBe(false);
    expect(bad((o) => (o.week = -1)).ok).toBe(false);
    expect(bad((o) => (o.credit = 3)).ok).toBe(false);
    expect(bad((o) => (o.journal = Array(10000).fill({}))).ok).toBe(false);
    expect(bad((o) => (o.schema = 99)).ok).toBe(false);
    const html = bad((o) => (o.player.name = '<b onclick=x>Al</b>'));
    expect(html.ok && html.value.player!.name).toBe('<b onclick=x>Al</b>');
    const proto = parseImport(text.replace('"kind":"smr-career"', '"kind":"smr-career","__proto__":{"polluted":1}'));
    expect(proto.ok).toBe(true);
    expect(({} as { polluted?: number }).polluted).toBeUndefined();
    const refused = await s.importText('{"kind":"smr-career","save":{"schema":2}}');
    expect(refused.ok).toBe(false);
    expect((await s.load()).player!.name).toBe('Sam');
  });

  it('migrates a schema 1 save', () => {
    const v2 = reduce(emptySave(), { type: 'createPlayer', id: 'p', name: 'Kai', position: 'DEF' });
    if (!v2.ok) throw new Error();
    const v1: Record<string, unknown> = { ...JSON.parse(exportSave(v2.save)).save, schema: 1, levels: { firstTouch: 2, passing: 1, dribbling: 1, finishing: 1, defending: 1, awareness: 1, juggling: 1 } };
    delete v1.missedEvents;
    const r = parseSave(v1);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.schema).toBe(2);
      expect(r.value.levels.firstTouch.level).toBe(2);
      expect(r.value.player!.name).toBe('Kai');
    }
  });

  it('without IndexedDB the store works in memory and says so', async () => {
    const s = await CareerStore.open(undefined as never);
    expect(s.status.kind).toBe('unavailable');
    expect((await s.dispatch({ type: 'createPlayer', id: 'p', name: 'Mo', position: 'FWD' })).ok).toBe(true);
  });
});
