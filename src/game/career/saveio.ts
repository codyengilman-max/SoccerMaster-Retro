import { DEFENSE_UNITS } from '../report/assists';
import { BONUS_RULES, SPENDABLE, achievementOf, emptyBank, type BonusBank } from './bonus';
import { REPORTS_KEPT, type SavedReport } from '../report/report';
import { CARRY_MAX, zeroFractions, type Fractions, type WeekSettlement } from '../report/settlement';
import { CAREER_CONFIG } from './config';
import { FOCUSES, HOME_ACTIVITIES, activityById } from './catalog';
import type { PlannedItem, PlannedSession, PlannerInput, WeekPlan } from './planner';
import { cleanText, type CareerPlayer } from './player';
import type { AttributeOutcome, EvidenceItem } from './progression';
import { CLOUDY_RUNS_KEPT, SAVE_SCHEMA, emptySave, type CareerSave, type CloudyBest, type FamilyLevel, type JournalEntry, type TeamTrainingRecord, type Tt12Run, type WeekReview, TT12_SLOTS, CHOICE_IDS, HOME_LOGS_KEPT, type All36Run } from './state';
import { gradeWeekly, weeklyAssignment } from '../training12/all36/weekly';
import { HOME_SKILLS, attemptsError, specFor, type HomeLog } from './homeMastery';
import { DIFFICULTIES } from '../cloudy/sim';
import { TEAM_TRAINING_IDS, weekDelta } from './teamTraining';
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
    ...(o.settlement === undefined ? {} : { settlement: settlement(o.settlement) }),
  };
}

function fractions(v: unknown): Fractions {
  const out = zeroFractions();
  if (v === undefined) return out;
  const o = obj(v, 'devCarry');
  for (const a of ATTRIBUTES) {
    const x = o[a] ?? 0;
    if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > CARRY_MAX) throw new Invalid('development carry: out of range');
    out[a] = x;
  }
  return out;
}

function settlement(v: unknown): WeekSettlement {
  const o = obj(v, 'settlement');
  int(o.version, 'settlement version', 1, 1000);
  int(o.week, 'settlement week', 1, 1000);
  arr(o.sources, 'settlement sources', 4);
  const applied = obj(o.applied, 'settlement applied');
  for (const a of ATTRIBUTES) int(applied[a] ?? 0, 'settlement applied', 0, 99);
  fractions(o.carry);
  return o as unknown as WeekSettlement;
}

function teamTraining(v: unknown, week: number): TeamTrainingRecord {
  const o = obj(v, 'teamTraining');
  const A = CAREER_CONFIG.attributes;
  const scores = arr(o.scores, 'scores', 3).map((x) => {
    if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > 1) throw new Invalid('team training score: out of range');
    return x;
  });
  const delta = int(o.delta, 'delta', -1, 2);
  if (delta !== weekDelta(scores)) throw new Invalid('team training delta does not match scores');
  const missed = o.choiceMissed === undefined ? undefined : int(o.choiceMissed, 'choiceMissed', 0, scores.length);
  return {
    ...(missed === undefined ? {} : { choiceMissed: missed }),
    week: int(o.week, 'team training week', 1, week),
    situations: arr(o.situations, 'situations', 3).map((x) => oneOf(x, 'situation', TEAM_TRAINING_IDS)),
    scores,
    delta,
    changes: arr(o.changes, 'changes', 2).map((c) => {
      const x = obj(c, 'change');
      const from = int(x.from, 'change.from', A.min, A.max);
      const to = int(x.to, 'change.to', A.min, A.max);
      if (Math.abs(to - from) !== 1) throw new Invalid('team training change: out of range');
      return { attribute: oneOf(x.attribute, 'attribute', ATTRIBUTES), from, to };
    }),
  };
}

function savedReport(v: unknown): SavedReport {
  const o = obj(v, 'report');
  str(o.matchId, 'report match', 64);
  int(o.week, 'report week', 1, 1000);
  for (const k of ['competition', 'home', 'away', 'playerName', 'position'] as const) str(o[k], `report ${k}`, 80);
  const sc = obj(o.score, 'report score');
  int(sc.home, 'report score', 0, 99);
  int(sc.away, 'report score', 0, 99);
  int(o.minutes, 'report minutes', 0, 200);
  obj(o.stats, 'report stats');
  obj(o.rating, 'report rating');
  obj(o.versions, 'report versions');
  arr(o.highlights, 'report highlights', 3);
  if (o.contribution !== undefined) {
    const c = obj(o.contribution, 'report contribution');
    int(c.version, 'contribution version', 1, 1000);
    const m = obj(c.mine, 'contribution mine');
    const n = (k: string) => int(m[k], `contribution ${k}`, 0, 999);
    if (n('defenseUnits') !== n('slideWon') * DEFENSE_UNITS.slide + n('standingWon') * DEFENSE_UNITS.standing + n('interceptions') * DEFENSE_UNITS.interception) throw new Invalid('contribution: defensive points do not match the events');
    n('assists');
    const by = obj(c.assistsBy, 'contribution assists');
    if (Object.keys(by).length > 18) throw new Invalid('contribution assists: too many players');
    for (const [id, v] of Object.entries(by)) {
      if (!/^[HA][1-9]$/.test(id)) throw new Invalid('contribution assists: unknown player');
      int(v, 'contribution assists', 1, 99);
    }
  }
  return o as unknown as SavedReport;
}

function bonusBank(v: unknown, week: number): BonusBank {
  const o = obj(v, 'bonus');
  const awards = arr(o.awards, 'bonus awards', BONUS_RULES.awardsKept).map((k) => {
    const key = str(k, 'bonus award', 80);
    if (!achievementOf(key) || !key.includes(':')) throw new Invalid('bonus award: unknown achievement');
    return key;
  });
  if (new Set(awards).size !== awards.length) throw new Invalid('bonus award paid twice');
  const spends = arr(o.spends, 'bonus spends', BONUS_RULES.awardsKept).map((x) => {
    const s = obj(x, 'bonus spend');
    return { id: str(s.id, 'bonus spend id', 64), attribute: oneOf(s.attribute, 'bonus attribute', SPENDABLE), week: int(s.week, 'bonus spend week', 1, week) };
  });
  if (new Set(spends.map((s) => s.id)).size !== spends.length) throw new Invalid('bonus point spent twice');
  if (spends.length > awards.length) throw new Invalid('more bonus points spent than earned');
  const perfectWeeks = arr(o.perfectWeeks, 'bonus perfect weeks', 60).map((w) => int(w, 'bonus perfect week', 1, week));
  return { awards, spends, perfectWeeks, pairedThrough: int(o.pairedThrough, 'bonus paired', 0, week) };
}

function cloudyBest(v: unknown): CloudyBest {
  const o = obj(v, 'cloudy');
  const stars = int(o.bestStars, 'cloudy stars', 1, 3) as 1 | 2 | 3;
  return { difficulty: oneOf(o.difficulty, 'cloudy difficulty', DIFFICULTIES), bestScore: int(o.bestScore, 'cloudy score', 0, 100_000), bestStars: stars };
}

function tt12Run(v: unknown, week: number): Tt12Run {
  const o = obj(v, 'tt12');
  if (typeof o.score !== 'number' || !Number.isFinite(o.score) || o.score < 0 || o.score > 1) throw new Invalid('tt12 score: out of range');
  if (typeof o.credited !== 'boolean') throw new Invalid('tt12 credited: not a boolean');
  return { week: int(o.week, 'tt12 week', 1, week), slot: oneOf(o.slot, 'tt12 slot', TT12_SLOTS), runId: str(o.runId, 'tt12 runId', 64), score: o.score, credited: o.credited, ...(o.decisions === undefined ? {} : { decisions: tt12Decisions(o.decisions) }), ...(o.model === undefined ? {} : { model: oneOf(o.model, 'tt12 model', ['ts-1'] as const) }) };
}

/** A stored run must still be the approved assignment for its week and category, with the package's own grade. */
function all36Run(v: unknown, week: number): All36Run {
  const o = obj(v, 'all36');
  const w = int(o.week, 'all36 week', 1, week);
  const a = weeklyAssignment(w, o.category);
  if (!a || o.situationId !== a.situationId) throw new Invalid('all36: not the approved assignment');
  const choice = o.choice === null ? null : oneOf(o.choice, 'all36 choice', CHOICE_IDS);
  const g = gradeWeekly(a, choice);
  if (!g || o.grade !== g.grade || o.band !== g.band || o.score !== g.score) throw new Invalid('all36: grade does not match the package');
  if (typeof o.credited !== 'boolean') throw new Invalid('all36 credited: not a boolean');
  return { week: w, category: a.category, situationId: a.situationId, runId: str(o.runId, 'all36 runId', 64), at: int(o.at, 'all36 at', 0, Number.MAX_SAFE_INTEGER), choice, grade: g.grade, band: g.band, score: g.score, rationale: g.rationale, credited: o.credited };
}

/** A stored practice entry must still be well formed for its phase (zero allowed, successes <= attempts). */
function homeLog(v: unknown, week: number): HomeLog {
  const o = obj(v, 'homeLog');
  const skill = oneOf(o.skill, 'home skill', HOME_SKILLS);
  const spec = specFor(skill, int(o.phase, 'home phase', 1, 5));
  if (!spec || !spec.activityIds.includes(o.activityId as string)) throw new Invalid('homeLog: unknown assignment');
  const attempts = Array.isArray(o.attempts) ? (o.attempts as Record<string, unknown>[]).map((a) => ({ value: a.value as number, ...(a.of === undefined ? {} : { of: a.of as number }), ...(a.seconds === undefined ? {} : { seconds: a.seconds as number }), ...(a.errors === undefined ? {} : { errors: a.errors as number }) })) : [];
  if (attemptsError(spec, attempts)) throw new Invalid('homeLog: malformed attempts');
  if (typeof o.confirmed !== 'boolean') throw new Invalid('homeLog confirmed: not a boolean');
  return { id: str(o.id, 'home id', 64), week: int(o.week, 'home week', 1, week), skill, phase: spec.phase, activityId: o.activityId as string, variation: oneOf(o.variation, 'home variation', ['touch-and-catch', 'bounce-assisted', 'continuous', 'standard', 'weaker-foot', 'timed'] as const), foot: o.foot === null || o.foot === undefined ? null : oneOf(o.foot, 'home foot', ['left', 'right', 'both'] as const), source: oneOf(o.source, 'home source', ['self-reported', 'minigame'] as const), attempts, at: int(o.at, 'home at', 0, Number.MAX_SAFE_INTEGER), confirmed: o.confirmed, revision: int(o.revision, 'home revision', 0, 1e6) };
}

function tt12Decisions(v: unknown): { independent: number; assisted: number } {
  const o = obj(v, 'tt12 decisions');
  return { independent: int(o.independent, 'tt12 independent', 0, 500), assisted: int(o.assisted, 'tt12 assisted', 0, 500) };
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
      teamTraining: arr(o.teamTraining ?? [], 'teamTraining', L.historyMax).map((t) => teamTraining(t, week)),
      tt12: arr(o.tt12 ?? [], 'tt12', L.historyMax * 4).map((t) => tt12Run(t, week)),
      all36: arr(o.all36 ?? [], 'all36', L.historyMax * 4).map((t) => all36Run(t, week)),
      homeLogs: arr(o.homeLogs ?? [], 'homeLogs', HOME_LOGS_KEPT).map((t) => homeLog(t, week)),
      cloudy: arr(o.cloudy ?? [], 'cloudy', DIFFICULTIES.length).map(cloudyBest),
      cloudyRuns: arr(o.cloudyRuns ?? [], 'cloudyRuns', CLOUDY_RUNS_KEPT).map((r) => str(r, 'cloudy run', 64)),
      reports: arr(o.reports ?? [], 'reports', REPORTS_KEPT).map(savedReport),
      devCarry: fractions(o.devCarry),
      bonus: o.bonus === undefined ? emptyBank() : bonusBank(o.bonus, week),
    };
    if (new Set(save.reports.map((r) => r.matchId)).size !== save.reports.length) throw new Invalid('match report saved twice');
    if (new Set(save.teamTraining.map((t) => t.week)).size !== save.teamTraining.length) throw new Invalid('team training counted twice for a week');
    if (new Set(save.cloudy.map((c) => c.difficulty)).size !== save.cloudy.length) throw new Invalid('cloudy best saved twice');
    if (new Set(save.tt12.map((t) => t.runId)).size !== save.tt12.length) throw new Invalid('team training run saved twice');
    if (new Set(save.homeLogs.map((t) => t.id)).size !== save.homeLogs.length) throw new Invalid('practice entry saved twice');
    if (new Set(save.all36.map((t) => t.runId)).size !== save.all36.length) throw new Invalid('team training run saved twice');
    const weeks36 = save.all36.filter((t) => t.credited).map((t) => t.week);
    if (new Set(weeks36).size !== weeks36.length) throw new Invalid('weekly team training counted twice');
    const credited = save.tt12.filter((t) => t.credited).map((t) => `${t.week}${t.slot}`);
    if (new Set(credited).size !== credited.length) throw new Invalid('team training session counted twice');
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
