import { RETIRED_VERSIONS, SEASON_ONE, catalogFor, nodeById, sceneById } from './content';
import { STORY_SCHEMA, migrateStory, seasonWeek, newSeasonStory, reduceStory, type StoryCommand, type StoryOutcome, type StoryState } from './runtime';

const STORE = 'story';
const isRetired = (v: unknown): boolean => isObj(v) && typeof v.contentVersion === 'string' && RETIRED_VERSIONS.includes(v.contentVersion);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Structural check of a saved story state; anything unknown is kept aside, never silently rewritten. */
export function parseStoryState(input: unknown): { ok: true; value: StoryState } | { ok: false; error: string } {
  if (!isObj(input)) return { ok: false, error: 'not an object' };
  let raw: Record<string, unknown> = input;
  if (raw.schema !== STORY_SCHEMA) return { ok: false, error: `unknown story schema ${String(raw.schema)}` };
  if (typeof raw.careerId !== 'string' || typeof raw.sceneId !== 'string' || typeof raw.nodeId !== 'string') return { ok: false, error: 'missing cursor' };
  if (raw.contentVersion === SEASON_V1) {
    if (touchesOldWeeks(raw)) return { ok: false, error: UNMAPPABLE };
    raw = { ...raw, contentVersion: SEASON_ONE.version, runs: rekeyRuns(raw.runs) };
  }
  if (typeof raw.contentVersion !== 'string' || !catalogFor(raw.contentVersion)) return { ok: false, error: `story content ${String(raw.contentVersion)} is not in this build` };
  for (const k of ['revision', 'lastSeq', 'openedBy']) if (!Number.isInteger(raw[k])) return { ok: false, error: `bad ${k}` };
  if (!isObj(raw.decisions) || !isObj(raw.runs) || !Array.isArray(raw.transcript) || !Array.isArray(raw.completedScenes)) return { ok: false, error: 'bad story fields' };
  // Migrate first: a save resting on rewritten Season One text (an old node id, a retired scene) is moved
  // to a real position here; anything still unknown afterwards is kept aside as unreadable.
  const value = migrateStory(raw as unknown as StoryState);
  const scene = sceneById(value.sceneId);
  if (!scene || !nodeById(scene, value.nodeId)) return { ok: false, error: `story position ${raw.sceneId}.${raw.nodeId} is missing` };
  return { ok: true, value };
}

/** Weeks 1–2 runs carry over: re-index them under the new content version, keeping run ids and records. */
function rekeyRuns(runs: unknown): unknown {
  if (!isObj(runs)) return runs;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(runs)) {
    let key = k;
    try {
      const p: unknown = JSON.parse(k);
      if (Array.isArray(p) && p.length === 4 && p[2] === SEASON_V1) key = JSON.stringify([p[0], p[1], SEASON_ONE.version, p[3]]);
    } catch {
      /* not a run key; kept as is */
    }
    out[key] = v;
  }
  return out;
}

/** The first Season One text (weeks 1–18). Its weeks 1–2 are the owner rewrite and carry over unchanged. */
export const SEASON_V1 = 's1-v1.0';
export const UNMAPPABLE = 'progress from the earlier weeks 3–18 cannot be mapped to the new weeks 3–4';

/** True when a save has any trace (position, choice, run, completed scene, log line) of the replaced weeks 3+. */
function touchesOldWeeks(raw: Record<string, unknown>): boolean {
  const ids: unknown[] = [raw.sceneId, ...Object.keys(isObj(raw.decisions) ? raw.decisions : {})];
  if (isObj(raw.runs)) for (const r of Object.values(raw.runs)) ids.push(isObj(r) ? r.sceneId : null);
  if (Array.isArray(raw.completedScenes)) ids.push(...raw.completedScenes);
  if (Array.isArray(raw.transcript)) for (const t of raw.transcript) ids.push(isObj(t) ? t.sceneId : null);
  return ids.some((id) => typeof id === 'string' && seasonWeek(id) >= 3);
}

/** Key of the archived pre-season story for a career (kept read-only, never deleted). */
/** The single story career slot used by Story, My Player and Rankings. */
export const STORY_CAREER_ID = 'main';

export const legacyKey = (careerId: string): string => `legacy-story-${careerId}`;

/**
 * Season One supersedes the older four-week slice: a valid older story is archived unchanged under
 * `legacyKey` and the career starts Season One at the prologue. Player identity, levels and training
 * live in the career save and are untouched; the old four-week ending can no longer be reached.
 */
function toSeason(careerId: string, p: StoryState, raw: unknown): { state: StoryState; archive: unknown } {
  // The archive is the record exactly as stored, never the in-memory migrated copy.
  return p.contentVersion === SEASON_ONE.version ? { state: p, archive: null } : { state: newSeasonStory(careerId), archive: raw };
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
      let aborted = false;
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
          aborted = true;
          try {
            t.abort();
          } catch {
            /* already finished */
          }
        },
      );
      t.oncomplete = () => resolve(result);
      // A transaction that failed on its own never reports the success value it had prepared.
      t.onabort = () => resolve(aborted ? result : fallback);
      t.onerror = () => resolve(aborted ? result : fallback);
    });
  }

  /** Loads the career's story, creating it once (insert-if-absent) inside one transaction. */
  begin(careerId: string): Promise<{ ok: true; state: StoryState } | { ok: false; error: string }> {
    type R = { ok: true; state: StoryState } | { ok: false; error: string };
    if (!this.db) {
      const cur = this.memory.get(careerId);
      if (isRetired(cur)) {
        const fresh = newSeasonStory(careerId);
        this.memory.set(legacyKey(careerId), cur);
        this.memory.set(careerId, fresh);
        return Promise.resolve({ ok: true, state: fresh });
      }
      const p = cur === undefined ? { ok: true as const, value: newSeasonStory(careerId) } : parseStoryState(cur);
      if (!p.ok) return Promise.resolve({ ok: false, error: p.error });
      const m = toSeason(careerId, p.value, cur);
      if (m.archive) this.memory.set(legacyKey(careerId), m.archive);
      this.memory.set(careerId, m.state);
      return Promise.resolve({ ok: true, state: m.state });
    }
    return this.run<R>((st, finish) => {
      const req = st.get(careerId);
      req.onsuccess = () => {
        if (req.result === undefined) {
          const s = newSeasonStory(careerId);
          st.put(s, careerId);
          finish({ ok: true, state: s });
          return;
        }
        if (isRetired(req.result)) {
          // An older story package (v0.7 week one, weeks 2–4 draft): archived unchanged, Season One starts.
          const fresh = newSeasonStory(careerId);
          st.put(req.result, legacyKey(careerId));
          st.put(fresh, careerId);
          finish({ ok: true, state: fresh });
          return;
        }
        const p = parseStoryState(req.result);
        if (!p.ok) {
          // Keep the unreadable save aside for recovery; do not overwrite it.
          st.put(req.result, `broken-${careerId}-${Date.now()}`);
          finish({ ok: false, error: `Story save could not be resumed (${p.error}). A copy was kept.` });
          return;
        }
        const m = toSeason(careerId, p.value, req.result);
        if (m.archive) {
          // Archive and switch in the same transaction: either both are written or neither.
          st.put(m.archive, legacyKey(careerId));
          st.put(m.state, careerId);
        }
        finish({ ok: true, state: m.state });
      };
    }, { ok: false, error: 'Story save failed to open.' });
  }

  /**
   * Story-only restart, offered when old progress cannot be mapped. In one transaction: the stored story and
   * this career's Season One league record are copied aside (never deleted) and the story starts again at the
   * prologue. The career save (player, attributes, training) lives elsewhere and is not touched.
   */
  restartStory(careerId: string): Promise<boolean> {
    const at = Date.now();
    const league = `rec:league-s1:${careerId}`;
    const rankings = `rec:rankings-s1:${careerId}`;
    const fresh = newSeasonStory(careerId);
    if (!this.db) {
      const cur = this.memory.get(careerId);
      if (cur !== undefined) this.memory.set(`restart-${careerId}-${at}`, cur);
      const lg = this.memory.get(league);
      if (lg !== undefined) { this.memory.set(`rec:league-s1-archive:${careerId}:${at}`, lg); this.memory.delete(league); }
      const rk = this.memory.get(rankings);
      if (rk !== undefined) { this.memory.set(`rec:rankings-s1-archive:${careerId}:${at}`, rk); this.memory.delete(rankings); }
      this.memory.set(careerId, fresh);
      return Promise.resolve(true);
    }
    return this.run<boolean>((st, finish) => {
      const a = st.get(careerId);
      a.onsuccess = () => {
        if (a.result !== undefined) st.put(a.result, `restart-${careerId}-${at}`);
        const b = st.get(league);
        b.onsuccess = () => {
          if (b.result !== undefined) { st.put(b.result, `rec:league-s1-archive:${careerId}:${at}`); st.delete(league); }
          const c = st.get(rankings);
          c.onsuccess = () => {
            if (c.result !== undefined) { st.put(c.result, `rec:rankings-s1-archive:${careerId}:${at}`); st.delete(rankings); }
            st.put(fresh, careerId);
            finish(true);
          };
        };
      };
    }, false);
  }

  /**
   * New game: restarts the story (archiving it and the league record, as `restartStory`) and also copies
   * this career's tournament records aside, so nothing from the old season carries over.
   */
  async newGame(careerId: string): Promise<boolean> {
    if (!(await this.restartStory(careerId))) return false;
    const at = Date.now();
    for (const tid of ['az_showcase', 'holiday_classic']) {
      const key = `tourney-s1:${careerId}:${tid}`;
      const cur = await this.getRecord(key);
      if (cur === undefined) continue;
      const moved = await this.run<boolean>((st, finish) => {
        st.put(cur, `rec:tourney-s1-archive:${careerId}:${tid}:${at}`);
        st.delete(`rec:${key}`);
        finish(true);
      }, false).catch(() => false);
      if (!this.db) {
        this.memory.set(`rec:tourney-s1-archive:${careerId}:${tid}:${at}`, cur);
        this.memory.delete(`rec:${key}`);
      } else if (!moved) return false;
    }
    return true;
  }

  /** The archived older story for this career, if Season One replaced one (read-only). */
  loadLegacy(careerId: string): Promise<StoryState | null> {
    if (!this.db) return Promise.resolve((this.memory.get(legacyKey(careerId)) as StoryState | undefined) ?? null);
    return new Promise((resolve) => {
      const req = this.db!.transaction(STORE, 'readonly').objectStore(STORE).get(legacyKey(careerId));
      req.onsuccess = () => resolve((req.result as StoryState | undefined) ?? null);
      req.onerror = () => resolve(null);
    });
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

  /**
   * Read-modify-write of one record in a single transaction, so two tabs cannot interleave: `fn` sees the
   * stored value and returns the new value plus a result, or null to leave the record untouched.
   */
  updateRecord<T>(key: string, fn: (cur: unknown) => { value: unknown; out: T } | null): Promise<T | null> {
    if (!this.db) {
      const r = fn(this.memory.get(`rec:${key}`));
      if (r) this.memory.set(`rec:${key}`, r.value);
      return Promise.resolve(r ? r.out : null);
    }
    return this.run<T | null>((st, finish) => {
      const req = st.get(`rec:${key}`);
      req.onsuccess = () => {
        const r = fn(req.result);
        if (!r) return finish(null);
        st.put(r.value, `rec:${key}`);
        finish(r.out);
      };
    }, null);
  }

  close(): void {
    this.db?.close();
  }
}
