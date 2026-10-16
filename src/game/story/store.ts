import { STORY, nodeById, sceneById } from './content';
import { STORY_SCHEMA, migrateStory, newStory, reduceStory, type StoryCommand, type StoryOutcome, type StoryState } from './runtime';

const STORE = 'story';
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Structural check of a saved story state; anything unknown is kept aside, never silently rewritten. */
export function parseStoryState(raw: unknown): { ok: true; value: StoryState } | { ok: false; error: string } {
  if (!isObj(raw)) return { ok: false, error: 'not an object' };
  if (raw.schema !== STORY_SCHEMA) return { ok: false, error: `unknown story schema ${String(raw.schema)}` };
  if (typeof raw.careerId !== 'string' || typeof raw.sceneId !== 'string' || typeof raw.nodeId !== 'string') return { ok: false, error: 'missing cursor' };
  if (raw.contentVersion !== STORY.version) return { ok: false, error: `story content ${String(raw.contentVersion)} is not in this build` };
  const scene = sceneById(raw.sceneId);
  if (!scene || !nodeById(scene, raw.nodeId)) return { ok: false, error: `story position ${raw.sceneId}.${raw.nodeId} is missing` };
  for (const k of ['revision', 'lastSeq', 'openedBy']) if (!Number.isInteger(raw[k])) return { ok: false, error: `bad ${k}` };
  if (!isObj(raw.decisions) || !isObj(raw.runs) || !Array.isArray(raw.transcript) || !Array.isArray(raw.completedScenes)) return { ok: false, error: 'bad story fields' };
  return { ok: true, value: migrateStory(raw as unknown as StoryState) };
}

export interface StoryStoreOptions {
  /** Test-only fault injection: called after the reducer and before commit; throwing aborts the transaction. */
  readonly beforeCommit?: () => void;
}

/**
 * Story save in its own IndexedDB database (`smr-story`), keyed by career id, separate from the career save
 * so existing saves are untouched. Every command is read-validate-reduce-write in ONE readwrite transaction;
 * the browser serialises transactions from other tabs, so a stale tab's command fails on revision.
 */
export class StoryStore {
  private memory = new Map<string, unknown>();
  private constructor(private readonly db: IDBDatabase | null, private readonly opts: StoryStoreOptions) {}

  static async open(factory: IDBFactory | undefined = (globalThis as { indexedDB?: IDBFactory }).indexedDB, name = 'smr-story', opts: StoryStoreOptions = {}): Promise<StoryStore> {
    if (!factory) return new StoryStore(null, opts);
    try {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = factory.open(name, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('blocked'));
      });
      return new StoryStore(db, opts);
    } catch {
      return new StoryStore(null, opts);
    }
  }

  get persistent(): boolean {
    return this.db !== null;
  }

  private run<T>(fn: (st: IDBObjectStore, finish: (v: T) => void, abort: (v: T) => void) => void, fallback: T): Promise<T> {
    return new Promise((resolve) => {
      let result = fallback;
      let t: IDBTransaction;
      try {
        t = this.db!.transaction(STORE, 'readwrite');
      } catch {
        resolve(fallback);
        return;
      }
      fn(
        t.objectStore(STORE),
        (v) => (result = v),
        (v) => {
          result = v;
          try {
            t.abort();
          } catch {
            /* already finished */
          }
        },
      );
      t.oncomplete = () => resolve(result);
      t.onabort = () => resolve(result);
      t.onerror = () => resolve(result);
    });
  }

  /** Loads the career's story, creating it once (insert-if-absent) inside one transaction. */
  begin(careerId: string): Promise<{ ok: true; state: StoryState } | { ok: false; error: string }> {
    type R = { ok: true; state: StoryState } | { ok: false; error: string };
    if (!this.db) {
      const cur = this.memory.get(careerId);
      const p = cur === undefined ? { ok: true as const, value: newStory(careerId) } : parseStoryState(cur);
      if (!p.ok) return Promise.resolve({ ok: false, error: p.error });
      this.memory.set(careerId, p.value);
      return Promise.resolve({ ok: true, state: p.value });
    }
    return this.run<R>((st, finish) => {
      const req = st.get(careerId);
      req.onsuccess = () => {
        if (req.result === undefined) {
          const s = newStory(careerId);
          st.put(s, careerId);
          finish({ ok: true, state: s });
          return;
        }
        const p = parseStoryState(req.result);
        if (!p.ok) {
          // Keep the unreadable save aside for recovery; do not overwrite it.
          st.put(req.result, `broken-${careerId}-${Date.now()}`);
          finish({ ok: false, error: `Story save could not be resumed (${p.error}). A copy was kept.` });
          return;
        }
        finish({ ok: true, state: p.value });
      };
    }, { ok: false, error: 'Story save failed to open.' });
  }

  load(careerId: string): Promise<StoryState | null> {
    if (!this.db) {
      const v = this.memory.get(careerId);
      return Promise.resolve(v === undefined ? null : (v as StoryState));
    }
    return new Promise((resolve) => {
      const req = this.db!.transaction(STORE, 'readonly').objectStore(STORE).get(careerId);
      req.onsuccess = () => {
        const p = req.result === undefined ? null : parseStoryState(req.result);
        resolve(p && p.ok ? p.value : null);
      };
      req.onerror = () => resolve(null);
    });
  }

  /** Atomic command: nothing is written unless the reducer accepts it and the transaction commits. */
  dispatch(careerId: string, c: StoryCommand): Promise<StoryOutcome> {
    const failed: StoryOutcome = { ok: false, error: 'Save failed. Nothing was changed; try again.' };
    if (!this.db) {
      const cur = this.memory.get(careerId);
      if (cur === undefined) return Promise.resolve({ ok: false, error: 'no story for this career' });
      const r = reduceStory(cur as StoryState, c);
      if (r.ok && r.changed) {
        try {
          this.opts.beforeCommit?.();
        } catch {
          return Promise.resolve(failed);
        }
        this.memory.set(careerId, r.state);
      }
      return Promise.resolve(r);
    }
    return this.run<StoryOutcome>((st, finish, abort) => {
      const req = st.get(careerId);
      req.onsuccess = () => {
        const p = req.result === undefined ? null : parseStoryState(req.result);
        if (!p) return abort({ ok: false, error: 'no story for this career' });
        if (!p.ok) return abort({ ok: false, error: `Story save is unreadable (${p.error}).` });
        const r = reduceStory(p.value, c);
        if (!r.ok) return abort(r);
        if (!r.changed) return finish(r);
        try {
          this.opts.beforeCommit?.();
          st.put(r.state, careerId);
        } catch {
          return abort(failed);
        }
        finish(r);
      };
    }, failed).then((r) => r);
  }

  /** Small per-run scratch records (crossbar attempts) in the same database; never canonical story state. */
  getRecord(key: string): Promise<unknown> {
    if (!this.db) return Promise.resolve(this.memory.get(`rec:${key}`));
    return new Promise((resolve) => {
      const req = this.db!.transaction(STORE, 'readonly').objectStore(STORE).get(`rec:${key}`);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });
  }
  putRecord(key: string, value: unknown): Promise<boolean> {
    if (!this.db) {
      this.memory.set(`rec:${key}`, value);
      return Promise.resolve(true);
    }
    return this.run<boolean>((st, finish) => {
      st.put(value, `rec:${key}`);
      finish(true);
    }, false);
  }

  close(): void {
    this.db?.close();
  }
}
