import { CAREER_CONFIG } from './config';
import { FOCUSES, HOME_ACTIVITIES, activityById } from './catalog';
import type { PlannedItem, PlannedSession, PlannerInput, WeekPlan } from './planner';
import { cleanText, type CareerPlayer } from './player';
import type { AttributeOutcome, EvidenceItem } from './progression';
import { SAVE_SCHEMA, emptySave, type CareerSave, type FamilyLevel, type JournalEntry, type WeekReview } from './state';
import { ATTRIBUTES, LEVELS, POSITIONS, RATINGS, SKILL_FAMILIES, type AttributeId, type Level, type SkillFamilyId } from './types';

type R<T> = { ok: true; value: T } | { ok: false; error: string };
class Invalid extends Error {}
const L = CAREER_CONFIG.limits;

const obj = (v: unknown, what: string): Record<string, unknown> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Invalid(`${what}: expected an object`);
  return v as Record<string, unknown>;
};
const arr = (v: unknown, what: string, max: number): unknown[] => {
  if (!Array.isArray(v)) throw new Invalid(`${what}: expected a list`);
  if (v.length > max) throw new Invalid(`${what}: too many entries`);
  return v;
};
const int = (v: unknown, what: string, min: number, max: number): number => {
  if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v) || v < min || v > max) throw new Invalid(`${what}: out of range`);
  return v;
};
const oneOf = <T extends string>(v: unknown, what: string, list: readonly T[]): T => {
  if (typeof v !== 'string' || !list.includes(v as T)) throw new Invalid(`${what}: not allowed`);
  return v as T;
};
const nullable = <T>(v: unknown, f: (x: unknown) => T): T | null => (v === null || v === undefined ? null : f(v));
const str = (v: unknown, what: string, max: number): string => {
  if (typeof v !== 'string' || v.length > max * 4) throw new Invalid(`${what}: bad text`);
  return cleanText(v, max);
};
const bool = (v: unknown, what: string): boolean => {
  if (typeof v !== 'boolean') throw new Invalid(`${what}: expected true/false`);
  return v;
};
const ACTIVITY_IDS = HOME_ACTIVITIES.map((a) => a.id);
const FOCUS_IDS = FOCUSES.map((f) => f.id);
const level = (v: unknown, what: string) => int(v, what, 1, 5) as Level;

function player(v: unknown): CareerPlayer {
  const o = obj(v, 'player');
  const A = CAREER_CONFIG.attributes;
  const attrs = obj(o.attributes, 'attributes');
  const pot = obj(o.potential, 'potential');
  const attributes = {} as Record<AttributeId, number>;
  const potential = {} as Record<AttributeId, number>;
  for (const a of ATTRIBUTES) {
    potential[a] = int(pot[a], `potential.${a}`, A.min, A.max);
    attributes[a] = int(attrs[a], `attributes.${a}`, A.min, potential[a]);
  }
  const name = str(o.name, 'name', L.nameMax);
  if (!name) throw new Invalid('name: empty');
  const base = { id: str(o.id, 'id', 40), name, position: oneOf(o.position, 'position', POSITIONS), attributes, potential };
  return o.gender === undefined ? base : { ...base, gender: oneOf(o.gender, 'gender', ['boy', 'girl'] as const) };
}

function input(v: unknown): PlannerInput {
  const o = obj(v, 'input');
  return {
    equipment: oneOf(o.equipment, 'equipment', ['ballOnly', 'optional'] as const),
    space: oneOf(o.space, 'space', ['small', 'medium'] as const),
    setting: oneOf(o.setting, 'setting', ['indoor', 'outdoor'] as const),
    striking: bool(o.striking, 'striking'),
    minutes: int(o.minutes, 'minutes', CAREER_CONFIG.home.minutesMin, CAREER_CONFIG.home.minutesMax),
  };
}

function plan(v: unknown, week: number): WeekPlan {
  const o = obj(v, 'plan');
  const w = int(o.week, 'plan.week', 1, week);
  const sessions = arr(o.sessions, 'sessions', CAREER_CONFIG.home.sessionsPerWeek).map((sv, index): PlannedSession => {
    const s = obj(sv, 'session');
    if (s.id !== `w${w}-s${index + 1}`) throw new Invalid('session id mismatch');
    const items = arr(s.items, 'items', 6).map((iv): PlannedItem => {
      const i = obj(iv, 'item');
      const activityId = oneOf(i.activityId, 'activity', ACTIVITY_IDS);
      const a = activityById(activityId)!;
      const variantId = nullable(i.variantId, (x) => oneOf(x, 'variant', a.variants.map((vv) => vv.id)));
      const sub = nullable(i.substitutedFrom, (x) => oneOf(x, 'substitutedFrom', ACTIVITY_IDS));
      return {
        activityId,
        version: int(i.version, 'version', 1, 1000),
        variantId,
        role: oneOf(i.role, 'role', ['familiar', 'variation', 'challenge', 'application'] as const),
        ballOnly: bool(i.ballOnly, 'ballOnly'),
        minutes: int(i.minutes, 'minutes', 1, 60),
        ...(sub ? { substitutedFrom: sub } : {}),
      };
    });
    return { id: s.id as string, week: w, index, focusId: oneOf(s.focusId, 'focus', FOCUS_IDS), minutes: int(s.minutes, 'minutes', 1, 60), items };
  });
  return { week: w, focusId: oneOf(o.focusId, 'focus', FOCUS_IDS), level: level(o.level, 'plan.level'), input: input(o.input), sessions };
}

function journal(v: unknown, week: number): JournalEntry {
  const o = obj(v, 'journal entry');
  const activityId = oneOf(o.activityId, 'activity', ACTIVITY_IDS);
  const a = activityById(activityId)!;
  return {
    id: str(o.id, 'entry id', 64),
    week: int(o.week, 'entry week', 1, week),
    sessionId: nullable(o.sessionId, (x) => str(x, 'session', 16)),
    activityId,
    variantId: nullable(o.variantId, (x) => oneOf(x, 'variant', a.variants.map((vv) => vv.id))),
    contentVersion: int(o.contentVersion, 'contentVersion', 1, 1000),
    completion: oneOf(o.completion, 'completion', ['done', 'partly', 'skipped'] as const),
    rating: nullable(o.rating, (x) => oneOf(x, 'rating', RATINGS)),
    foot: nullable(o.foot, (x) => oneOf(x, 'foot', ['left', 'right', 'both'] as const)),
    personalBest: nullable(o.personalBest, (x) => int(x, 'personalBest', 0, L.personalBestMax)),
    reflection: str(o.reflection ?? '', 'reflection', L.reflectionMax),
    easier: bool(o.easier, 'easier'),
    credited: bool(o.credited, 'credited'),
  };
}

function evidence(v: unknown): EvidenceItem {
  const o = obj(v, 'evidence');
  const success = o.success;
  if (success !== 0 && success !== 0.5 && success !== 1) throw new Invalid('evidence success: out of range');
  return { attribute: oneOf(o.attribute, 'attribute', ATTRIBUTES), source: oneOf(o.source, 'source', ['match', 'coach'] as const), situation: str(o.situation, 'situation', 40), success, note: str(o.note ?? '', 'note', 80) };
}

function outcome(v: unknown): AttributeOutcome {
  const o = obj(v, 'outcome');
  const num = (x: unknown, w: string) => {
    if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > 100000) throw new Invalid(`${w}: out of range`);
    return x;
  };
  return { attribute: oneOf(o.attribute, 'attribute', ATTRIBUTES), opportunities: int(o.opportunities, 'opportunities', 0, L.evidencePerWeekMax), weightedOpportunities: num(o.weightedOpportunities, 'wOpp'), weightedSuccesses: num(o.weightedSuccesses, 'wSucc'), from: int(o.from, 'from', 1, 99), to: int(o.to, 'to', 1, 99), reason: str(o.reason, 'reason', 200) };
}

function review(v: unknown, week: number): WeekReview {
  const o = obj(v, 'review');
  const r = obj(o.ratings, 'ratings');
  return {
    week: int(o.week, 'review week', 1, week),
    focusId: nullable(o.focusId, (x) => oneOf(x, 'focus', FOCUS_IDS)),
    sessionsCompleted: int(o.sessionsCompleted, 'sessionsCompleted', 0, 3),
    credit: int(o.credit, 'credit', 0, 3),
    extraLogged: int(o.extraLogged, 'extraLogged', 0, L.journalMax),
    ratings: { learning: int(r.learning, 'learning', 0, L.journalMax), improving: int(r.improving, 'improving', 0, L.journalMax), comfortable: int(r.comfortable, 'comfortable', 0, L.journalMax) },
    evidenceCount: int(o.evidenceCount, 'evidenceCount', 0, L.evidencePerWeekMax),
    missedEvents: int(o.missedEvents ?? 0, 'missedEvents', 0, 1e9),
    outcomes: arr(o.outcomes, 'outcomes', ATTRIBUTES.length).map(outcome),
    suggestedFocus: nullable(o.suggestedFocus, (x) => oneOf(x, 'focus', FOCUS_IDS)),
  };
}

/** Schema 1 (pre-release M6 draft) had no missed-event counter and stored levels as plain numbers. */
function migrate(o: Record<string, unknown>): Record<string, unknown> {
  if (o.schema === 1) {
    const lv = obj(o.levels, 'levels');
    const levels = Object.fromEntries(SKILL_FAMILIES.map((f) => [f, { level: lv[f] ?? 1, comfortable: [] }]));
    return { ...o, schema: 2, levels, missedEvents: 0, batches: o.batches ?? [] };
  }
  return o;
}

/** Full validation of untrusted data (stored or imported). Builds a fresh object; never trusts the input's shape. */
export function parseSave(raw: unknown): R<CareerSave> {
  try {
    let o = obj(raw, 'save');
    if (typeof o.schema !== 'number' || o.schema > SAVE_SCHEMA) throw new Invalid('save is from a newer version of the game');
    o = migrate(o);
    if (o.schema !== SAVE_SCHEMA) throw new Invalid('unknown save version');
    const week = int(o.week, 'week', 1, L.weekMax);
    const lv = obj(o.levels, 'levels');
    const levels = {} as Record<SkillFamilyId, FamilyLevel>;
    for (const f of SKILL_FAMILIES) {
      const x = obj(lv[f], `levels.${f}`);
      levels[f] = { level: level(x.level, `levels.${f}`), comfortable: arr(x.comfortable, 'comfortable', 3).map((c) => str(c, 'session', 16)) };
    }
    const p = nullable(o.plan, (x) => plan(x, week));
    const completedSessions = arr(o.completedSessions, 'completedSessions', 3).map((c) => str(c, 'session', 16));
    const credit = int(o.credit, 'credit', 0, CAREER_CONFIG.home.sessionsPerWeek);
    if (credit !== completedSessions.length) throw new Invalid('credit does not match completed sessions');
    const save: CareerSave = {
      ...emptySave(),
      revision: int(o.revision, 'revision', 0, Number.MAX_SAFE_INTEGER),
      player: nullable(o.player, player),
      week,
      focusId: nullable(o.focusId, (x) => oneOf(x, 'focus', FOCUS_IDS)),
      levels,
      input: input(o.input),
      plan: p,
      journal: arr(o.journal, 'journal', L.journalMax).map((j) => journal(j, week)),
      credit,
      completedSessions,
      evidence: arr(o.evidence, 'evidence', L.evidencePerWeekMax).map(evidence),
      batches: arr(o.batches, 'batches', L.batchesPerWeekMax).map((b) => str(b, 'batch', 64)),
      missedEvents: int(o.missedEvents, 'missedEvents', 0, 1e9),
      history: arr(o.history, 'history', L.historyMax).map((h) => review(h, week)),
    };
    return { ok: true, value: save };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.message };
    return { ok: false, error: 'unreadable save' };
  }
}

export function parseImport(text: string): R<CareerSave> {
  if (typeof text !== 'string' || text.length > L.importBytesMax) return { ok: false, error: 'file is too large' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not a SoccerMaster Retro save file' };
  }
  const o = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : null;
  if (!o || o.kind !== 'smr-career') return { ok: false, error: 'not a SoccerMaster Retro save file' };
  return parseSave(o.save);
}

export function exportSave(save: CareerSave): string {
  return JSON.stringify({ kind: 'smr-career', exportedSchema: SAVE_SCHEMA, save });
}

export { LEVELS };
