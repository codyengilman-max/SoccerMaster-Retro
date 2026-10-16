/**
 * Week-one story runtime (package v0.7 §1–5). Pure reducer: the store runs it inside one IndexedDB
 * transaction, so cursor, decision, run and revision are written together or not at all.
 * The UI sends only a requested choice id, expected revision and input sequence number.
 */
import { STORY, nodeById, sceneById, type AdapterKind, type Outcome, type StoryNode } from './content';

export const STORY_SCHEMA = 1;
export type CrossbarResult = 'WIN' | 'LOSS' | 'DRAW';

export interface ActivityRun {
  readonly runId: string;
  readonly adapter: AdapterKind;
  readonly sceneId: string;
  readonly nodeId: string;
  readonly state: 'launched' | 'resolved';
  readonly outcome: Outcome | null;
  readonly result: CrossbarResult | null;
}

export interface StoryState {
  readonly schema: typeof STORY_SCHEMA;
  readonly careerId: string;
  readonly contentVersion: string;
  readonly sceneId: string;
  readonly nodeId: string;
  readonly revealed: boolean;
  readonly revision: number;
  /** Highest input sequence consumed; a new gesture must exceed it. */
  readonly lastSeq: number;
  /** Sequence of the gesture that opened the current node; a choice needs a later, fresh gesture. */
  readonly openedBy: number;
  readonly decisions: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** Keyed by the structured entitlement key JSON [careerId, sceneId, contentVersion, nodeId]. */
  readonly runs: Readonly<Record<string, ActivityRun>>;
  /** Revealed lines in order, for the read-only transcript (never unvisited branches). */
  readonly transcript: readonly { readonly sceneId: string; readonly nodeId: string }[];
  readonly completedScenes: readonly string[];
  readonly complete: boolean;
}

export type StoryCommand =
  | { readonly type: 'advance'; readonly revision: number; readonly seq: number }
  | { readonly type: 'choose'; readonly revision: number; readonly seq: number; readonly choiceId: string }
  | { readonly type: 'launch'; readonly revision: number; readonly runId: string }
  | { readonly type: 'complete'; readonly revision: number; readonly runId: string; readonly outcome: Outcome; readonly result?: CrossbarResult | null }
  | { readonly type: 'decline'; readonly revision: number; readonly seq: number };

export type StoryOutcome =
  | { readonly ok: true; readonly state: StoryState; readonly changed: boolean; readonly runId?: string }
  | { readonly ok: false; readonly error: string };

export const runKey = (s: Pick<StoryState, 'careerId' | 'contentVersion'>, sceneId: string, nodeId: string): string => JSON.stringify([s.careerId, sceneId, s.contentVersion, nodeId]);

export function newStory(careerId: string): StoryState {
  const scene = sceneById(STORY.entry)!;
  return { schema: STORY_SCHEMA, careerId, contentVersion: STORY.version, sceneId: scene.id, nodeId: scene.entry, revealed: false, revision: 0, lastSeq: 0, openedBy: 0, decisions: {}, runs: {}, transcript: [{ sceneId: scene.id, nodeId: scene.entry }], completedScenes: [], complete: false };
}

/**
 * Saves that finished the old week-one slice (complete at the final callback) continue into week 2.
 * Pure and deterministic; nothing already decided is touched.
 */
export function migrateStory(s: StoryState): StoryState {
  if (!s.complete) return s;
  const scene = sceneById(s.sceneId);
  const node = scene ? nodeById(scene, s.nodeId) : undefined;
  if (node?.type !== 'end' || node.next_scene === null) return s;
  const next = sceneById(node.next_scene)!;
  return enter({ ...s, complete: false }, next.id, next.entry, s.lastSeq);
}

export function currentNode(s: StoryState): StoryNode | null {
  const scene = sceneById(s.sceneId);
  return scene ? (nodeById(scene, s.nodeId) ?? null) : null;
}

/** Code-owned predicate registry. `null` means the evidence is missing: recovery, never false. */
export function evaluatePredicate(s: StoryState, predicate: string): boolean | null {
  if (predicate === 'always') return true;
  const run = (sceneId: string, nodeId: string): ActivityRun | undefined => Object.values(s.runs).find((r) => r.sceneId === sceneId && r.nodeId === nodeId && r.state === 'resolved');
  if (predicate === 'jungle_accepted') {
    const v = s.decisions.W2_JUNGLE?.invite;
    return v === undefined ? null : v === 'play';
  }
  if (predicate === 'promise_made') {
    const v = s.decisions.W2_ALEX_LATE?.offer;
    return v === undefined ? null : v === 'agree' || v === 'other_slot';
  }
  if (predicate === 'promise_cancelled') return s.decisions.W3_COMMITMENT?.commit === 'cancel';
  if (predicate === 'promise_kept') return run('W3_COMMITMENT', 'bound')?.outcome === 'completed';
  if (predicate === 'promise_missed') {
    const r = run('W3_COMMITMENT', 'bound');
    return r !== undefined && r.outcome !== 'completed';
  }
  if (predicate === 'promise_repaired') return run('W3_REPAIR', 'repair')?.outcome === 'completed';
  if (predicate === 'crossbar_accepted') {
    const v = s.decisions.W1_SCHOOL_02?.invitation;
    if (v === undefined) return null;
    return v === 'accept' || v === 'equal_attempts' || v === 'shared_warmup';
  }
  return null;
}

const MAX_TRANSCRIPT = 400;
const fail = (error: string): StoryOutcome => ({ ok: false, error });
const done = (state: StoryState, extra: { runId?: string } = {}): StoryOutcome => ({ ok: true, state: { ...state, revision: state.revision + 1 }, changed: true, ...extra });

/** Moves the cursor to a node; arriving at an end node commits scene completion and the next scene at once. */
function goTo(s: StoryState, nodeId: string, seq: number): StoryState {
  const scene = sceneById(s.sceneId)!;
  const node = nodeById(scene, nodeId)!;
  if (node.type === 'end') {
    const completedScenes = s.completedScenes.includes(s.sceneId) ? s.completedScenes : [...s.completedScenes, s.sceneId];
    if (node.next_scene === null) return { ...s, nodeId, revealed: true, openedBy: seq, completedScenes, complete: true };
    const next = sceneById(node.next_scene)!;
    return enter({ ...s, completedScenes }, next.id, next.entry, seq);
  }
  return enter(s, s.sceneId, nodeId, seq);
}
function enter(s: StoryState, sceneId: string, nodeId: string, seq: number): StoryState {
  const n = nodeById(sceneById(sceneId)!, nodeId);
  // Branch nodes are code-resolved on arrival from committed facts; missing evidence takes the default.
  if (n?.type === 'branch') return enter(s, sceneId, n.cases.find((c) => evaluatePredicate({ ...s, sceneId }, c.predicate) === true)?.next ?? n.default, seq);
  const transcript = [...s.transcript, { sceneId, nodeId }].slice(-MAX_TRANSCRIPT);
  return { ...s, sceneId, nodeId, revealed: false, openedBy: seq, transcript };
}

export function reduceStory(s: StoryState, c: StoryCommand): StoryOutcome {
  if (s.contentVersion !== STORY.version) return fail(`Story content ${s.contentVersion} is not supported by this build.`);
  if (s.complete) return fail('This story slice is complete.');
  if (c.revision !== s.revision) return fail('stale revision');
  const node = currentNode(s);
  if (!node) return fail('Story position is missing from this version.');
  switch (c.type) {
    case 'advance': {
      if (!Number.isInteger(c.seq) || c.seq <= s.lastSeq) return fail('stale input');
      if (node.type !== 'line') return fail('nothing to advance');
      if (!s.revealed) return done({ ...s, revealed: true, lastSeq: c.seq });
      return done({ ...goTo(s, node.next, c.seq), lastSeq: c.seq });
    }
    case 'choose': {
      if (node.type !== 'choice') return fail('no choice is open');
      if (!Number.isInteger(c.seq) || c.seq <= s.lastSeq || c.seq <= s.openedBy) return fail('stale input');
      const opt = node.options.find((o) => o.id === c.choiceId);
      if (!opt || evaluatePredicate(s, opt.predicate) !== true) return fail('invalid choice');
      const prior = s.decisions[s.sceneId] ?? {};
      if (prior[node.id] !== undefined) return fail('already chosen');
      const decisions = { ...s.decisions, [s.sceneId]: { ...prior, ...Object.fromEntries(opt.effects.map((e) => [e.key, e.value])) } };
      return done({ ...goTo({ ...s, decisions }, opt.next, c.seq), lastSeq: c.seq });
    }
    case 'launch': {
      if (node.type !== 'activity_handoff') return fail('no activity here');
      const key = runKey(s, s.sceneId, node.id);
      const existing = s.runs[key];
      // Reload/retry returns the same run; a render or retry never creates a second canonical run.
      if (existing) return { ok: true, state: s, changed: false, runId: existing.runId };
      const allowed = evaluatePredicate(s, node.predicate);
      if (allowed === null) return fail('Required earlier choice is missing; story needs recovery.');
      if (!allowed) return fail('This activity was declined.');
      if (!/^[0-9a-f-]{16,64}$/.test(c.runId) || Object.values(s.runs).some((r) => r.runId === c.runId)) return fail('bad run id');
      const run: ActivityRun = { runId: c.runId, adapter: node.adapter, sceneId: s.sceneId, nodeId: node.id, state: 'launched', outcome: null, result: null };
      return done({ ...s, runs: { ...s.runs, [key]: run } }, { runId: c.runId });
    }
    case 'complete': {
      if (node.type !== 'activity_handoff') return fail('no activity here');
      const key = runKey(s, s.sceneId, node.id);
      const run = s.runs[key];
      if (!run || run.runId !== c.runId) return fail('activity run does not belong to this step');
      const target = node.outcomes[c.outcome];
      if (!target) return fail('outcome not allowed here');
      const result = node.adapter === 'crossbar' && c.outcome === 'completed' ? (c.result ?? null) : null;
      if (node.adapter === 'crossbar' && c.outcome === 'completed' && result === null) return fail('crossbar completion needs a result');
      const resolved: ActivityRun = { ...run, state: 'resolved', outcome: c.outcome, result };
      return done(goTo({ ...s, runs: { ...s.runs, [key]: resolved } }, target, s.lastSeq));
    }
    case 'decline': {
      // Predicate false (e.g. crossbar declined at the invitation) records DECLINED once and moves on.
      if (node.type !== 'activity_handoff') return fail('no activity here');
      if (!Number.isInteger(c.seq) || c.seq <= s.lastSeq) return fail('stale input');
      const allowed = evaluatePredicate(s, node.predicate);
      if (allowed === null) return fail('Required earlier choice is missing; story needs recovery.');
      if (allowed) return fail('This activity was not declined.');
      const key = runKey(s, s.sceneId, node.id);
      const run: ActivityRun = { runId: '', adapter: node.adapter, sceneId: s.sceneId, nodeId: node.id, state: 'resolved', outcome: 'declined', result: null };
      return done({ ...goTo({ ...s, runs: { ...s.runs, [key]: run } }, node.on_false, c.seq), lastSeq: c.seq });
    }
  }
}

/** Committed activity outcome for a scene's handoff, read by later scenes (e.g. the crossbar reaction). */
export function outcomeOf(s: StoryState, sceneId: string): ActivityRun | null {
  return Object.values(s.runs).find((r) => r.sceneId === sceneId && r.state === 'resolved') ?? null;
}

export type SessionMode = 'live' | 'replay';
export interface StorySession {
  readonly mode: SessionMode;
  dispatch(c: StoryCommand): Promise<StoryOutcome>;
}
/** Mode is fixed for the session's lifetime; replay sessions deny every write at this boundary. */
export function createSession(mode: SessionMode, write: (c: StoryCommand) => Promise<StoryOutcome>): StorySession {
  const fixed = mode;
  return Object.freeze({
    mode: fixed,
    dispatch: (c: StoryCommand) => (fixed === 'live' ? write(c) : Promise.resolve<StoryOutcome>({ ok: false, error: 'Replay is read-only.' })),
  });
}
