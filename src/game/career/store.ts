import { exportSave, parseImport, parseSave } from './saveio';
import { emptySave, reduce, type Action, type CareerSave, type Outcome } from './state';

const STORE = 'career';
const KEY = 'main';

export type StoreStatus = { readonly kind: 'ok' } | { readonly kind: 'recovered'; readonly reason: string } | { readonly kind: 'unavailable'; readonly reason: string };

/**
 * Versioned career save in IndexedDB. Every change is read-validate-reduce-write inside ONE readwrite
 * transaction, so completion and credit are written together or not at all, and transactions from
 * other tabs on the same store are serialised by the browser. Nothing here uses localStorage.
 */
export class CareerStore {
  private listeners = new Set<(s: CareerSave) => void>();
  private channel: BroadcastChannel | null = null;
  private constructor(
    private readonly db: IDBDatabase | null,
    private memory: CareerSave,
    readonly status: StoreStatus,
  ) {
    const BC = (globalThis as { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel;
    if (db && BC) {
      this.channel = new BC('smr-career');
      this.channel.onmessage = () => void this.load().then((s) => this.notify(s));
    }
  }

  static async open(factory: IDBFactory | undefined = (globalThis as { indexedDB?: IDBFactory }).indexedDB, name = 'smr-career'): Promise<CareerStore> {
    if (!factory) return new CareerStore(null, emptySave(), { kind: 'unavailable', reason: 'This browser cannot save. Progress lasts until you close the page.' });
    let db: IDBDatabase;
    try {
      db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = factory.open(name, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('blocked'));
      });
    } catch {
      return new CareerStore(null, emptySave(), { kind: 'unavailable', reason: 'Saving is blocked (private mode or storage full). Progress lasts until you close the page.' });
    }
    const store = new CareerStore(db, emptySave(), { kind: 'ok' });
    const raw = await store.raw();
    if (raw !== undefined) {
      const r = parseSave(raw);
      if (!r.ok) {
        // Keep the unreadable save aside instead of overwriting it silently.
        await store.tx((st) => {
          st.put(raw, `broken-${Date.now()}`);
          st.delete(KEY);
        });
        return new CareerStore(db, emptySave(), { kind: 'recovered', reason: `The saved career could not be read (${r.error}). A copy was kept; starting fresh.` });
      }
    }
    return store;
  }

  private tx(fn: (st: IDBObjectStore) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const t = this.db!.transaction(STORE, 'readwrite');
      fn(t.objectStore(STORE));
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error ?? new Error('aborted'));
    });
  }

  private raw(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const req = this.db!.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async load(): Promise<CareerSave> {
    if (!this.db) return this.memory;
    const raw = await this.raw();
    if (raw === undefined) return emptySave();
    const r = parseSave(raw);
    return r.ok ? r.value : emptySave();
  }

  onChange(fn: (s: CareerSave) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(s: CareerSave): void {
    for (const fn of this.listeners) fn(s);
  }

  /** Atomic: read, validate, reduce and write in one transaction. Resolves after the commit. */
  dispatch(action: Action): Promise<Outcome> {
    if (!this.db) {
      const r = checked(reduce(this.memory, action));
      if (r.ok) this.memory = r.save;
      if (r.ok && r.changed) this.notify(r.save);
      return Promise.resolve(r);
    }
    return new Promise((resolve) => {
      let result: Outcome = { ok: false, error: 'Save failed. Nothing was changed; try again.' };
      let t: IDBTransaction;
      try {
        t = this.db!.transaction(STORE, 'readwrite');
      } catch {
        resolve(result);
        return;
      }
      const st = t.objectStore(STORE);
      const req = st.get(KEY);
      req.onsuccess = () => {
        const parsed = req.result === undefined ? { ok: true as const, value: emptySave() } : parseSave(req.result);
        if (!parsed.ok) {
          result = { ok: false, error: `Saved career is unreadable (${parsed.error}).` };
          t.abort();
          return;
        }
        const r = checked(reduce(parsed.value, action));
        result = r;
        if (r.ok && r.changed) st.put(r.save, KEY);
      };
      t.oncomplete = () => {
        if (result.ok && result.changed) {
          this.notify(result.save);
          this.channel?.postMessage(result.save.revision);
        }
        resolve(result);
      };
      t.onabort = t.onerror = () => resolve(result.ok ? { ok: false, error: 'Save failed. Nothing was changed; try again.' } : result);
    });
  }

  async exportText(): Promise<string> {
    return exportSave(await this.load());
  }

  /** Replaces the save only if the file is fully valid. */
  async importText(text: string): Promise<Outcome> {
    const r = parseImport(text);
    if (!r.ok) return { ok: false, error: `Import refused: ${r.error}.` };
    if (!this.db) {
      this.memory = r.value;
      this.notify(r.value);
      return { ok: true, save: r.value, message: 'Imported.', changed: true };
    }
    try {
      await this.tx((st) => st.put(r.value, KEY));
    } catch {
      return { ok: false, error: 'Save failed. Nothing was changed.' };
    }
    this.notify(r.value);
    this.channel?.postMessage(r.value.revision);
    return { ok: true, save: r.value, message: 'Imported.', changed: true };
  }

  close(): void {
    this.channel?.close();
    this.listeners.clear();
    this.db?.close();
  }
}

/** Never write a save that would fail validation on the next read. */
function checked(r: Outcome): Outcome {
  if (!r.ok || !r.changed) return r;
  const v = parseSave(JSON.parse(JSON.stringify(r.save)));
  return v.ok ? r : { ok: false, error: `That change was refused because it would make the save invalid (${v.error}). Nothing was changed.` };
}
