import { CAREER_CONFIG } from './config';
import { FOCUSES, activityById, focusById } from './catalog';
import { DEFAULT_INPUT, normalizeInput, planWeek, substitute, workableFocuses, type PlannerInput, type WeekPlan } from './planner';
import { cleanName, cleanText, createPlayer, type CareerPlayer } from './player';
import { applyGrowth, computeGrowth, type AttributeOutcome, type EvidenceItem } from './progression';
import { selectSituations, teamTrainingChanges, describeChanges, weekDelta, type AttributeChange, type SituationResult } from './teamTraining';
import { SKILL_FAMILIES, type AttributeId, type Foot, type Level, type Position, type Rating, type SkillFamilyId } from './types';

export const SAVE_SCHEMA = 2;

export type Completion = 'done' | 'partly' | 'skipped';

export interface JournalEntry {
  /** Unique per completion (generated once per Complete form); repeats are ignored. */
  readonly id: string;
  readonly week: number;
  /** Scheduled session, or null for extra practice. */
  readonly sessionId: string | null;
  readonly activityId: string;
  readonly variantId: string | null;
  readonly contentVersion: number;
  readonly completion: Completion;
  readonly rating: Rating | null;
  readonly foot: Foot | null;
  readonly personalBest: number | null;
  readonly reflection: string;
  readonly easier: boolean;
  readonly credited: boolean;
}

export interface FamilyLevel {
  readonly level: Level;
  /** Distinct scheduled sessions rated comfortable at this level. */
  readonly comfortable: readonly string[];
}

export interface WeekReview {
  readonly week: number;
  readonly focusId: string | null;
  readonly sessionsCompleted: number;
  readonly credit: number;
  readonly extraLogged: number;
  readonly ratings: Readonly<Record<Rating, number>>;
  readonly evidenceCount: number;
  readonly missedEvents: number;
  readonly outcomes: readonly AttributeOutcome[];
  readonly suggestedFocus: string | null;
}

/** One week's Team Training, counted once. */
export interface TeamTrainingRecord {
  readonly week: number;
  readonly situations: readonly string[];
  readonly scores: readonly number[];
  readonly delta: number;
  readonly changes: readonly AttributeChange[];
}

export interface CareerSave {
  readonly schema: typeof SAVE_SCHEMA;
  readonly revision: number;
  readonly player: CareerPlayer | null;
  readonly week: number;
  readonly focusId: string | null;
  readonly levels: Readonly<Record<SkillFamilyId, FamilyLevel>>;
  readonly input: PlannerInput;
  readonly plan: WeekPlan | null;
  readonly journal: readonly JournalEntry[];
  readonly credit: number;
  readonly completedSessions: readonly string[];
  readonly evidence: readonly EvidenceItem[];
  readonly batches: readonly string[];
  readonly missedEvents: number;
  readonly history: readonly WeekReview[];
  /** Weekly Team Training results; at most one per week (older saves: empty). */
  readonly teamTraining: readonly TeamTrainingRecord[];
  /** Team Training v1.2 runs that finished all three rounds (older saves: empty). */
  readonly tt12: readonly Tt12Run[];
}

export type Tt12Slot = 'A' | 'B' | 'C';
export const TT12_SLOTS: readonly Tt12Slot[] = ['A', 'B', 'C'];

/** One completed v1.2 scheduled session. Only credited runs count toward the week. */
export interface Tt12Run {
  readonly week: number;
  readonly slot: Tt12Slot;
  readonly runId: string;
  /** Mean decision quality (0-1) over the run's assessed decisions. */
  readonly score: number;
  readonly credited: boolean;
}

export type Action =
  | { readonly type: 'createPlayer'; readonly id: string; readonly name: string; readonly position: Position; readonly gender?: 'boy' | 'girl' }
  | { readonly type: 'setIdentity'; readonly name: string; readonly gender: 'boy' | 'girl' }
  | { readonly type: 'setInput'; readonly input: PlannerInput }
  | { readonly type: 'chooseFocus'; readonly focusId: string }
  | { readonly type: 'substitute'; readonly sessionId: string; readonly index: number; readonly activityId: string }
  | { readonly type: 'log'; readonly entry: Omit<JournalEntry, 'credited' | 'week'> }
  | { readonly type: 'evidence'; readonly batchId: string; readonly items: readonly EvidenceItem[]; readonly missed: number }
  | { readonly type: 'acceptLevel'; readonly family: SkillFamilyId }
  | { readonly type: 'teamTraining'; readonly week: number; readonly results: readonly SituationResult[] }
  | { readonly type: 'tt12Run'; readonly week: number; readonly slot: Tt12Slot; readonly runId: string; readonly score: number; readonly creditEligible: boolean }
  | { readonly type: 'endWeek' };

export type Outcome = { readonly ok: true; readonly save: CareerSave; readonly message: string; readonly changed: boolean } | { readonly ok: false; readonly error: string };

export function emptySave(): CareerSave {
  return {
    schema: SAVE_SCHEMA,
    revision: 0,
    player: null,
    week: 1,
    focusId: null,
    levels: Object.fromEntries(SKILL_FAMILIES.map((f) => [f, { level: 1, comfortable: [] }])) as unknown as Record<SkillFamilyId, FamilyLevel>,
    input: DEFAULT_INPUT,
    plan: null,
    journal: [],
    credit: 0,
    completedSessions: [],
    evidence: [],
    batches: [],
    missedEvents: 0,
    history: [],
    teamTraining: [],
    tt12: [],
  };
}

const ok = (save: CareerSave, message: string): Outcome => ({ ok: true, save: { ...save, revision: save.revision + 1 }, message, changed: true });
const same = (save: CareerSave, message: string): Outcome => ({ ok: true, save, message, changed: false });
const fail = (error: string): Outcome => ({ ok: false, error });

export function levelSuggestion(save: CareerSave, family: SkillFamilyId): Level | null {
  const l = save.levels[family];
  return l.comfortable.length >= CAREER_CONFIG.home.comfortableSessionsForSuggestion && l.level < 5 ? ((l.level + 1) as Level) : null;
}

function replan(save: CareerSave, focusId: string): CareerSave | string {
  const focus = focusById(focusId);
  if (!focus) return 'Unknown focus.';
  const prevLast = save.plan && save.plan.week < save.week ? (save.plan.sessions.at(-1) ?? null) : null;
  const r = planWeek(save.week, focusId, save.levels[focus.family].level, save.input, prevLast);
  if (!r.ok) return r.reason;
  return { ...save, focusId, plan: r.plan };
}

function suggestFocus(save: CareerSave, outcomes: readonly AttributeOutcome[]): string | null {
  const level = (f: string) => save.levels[focusById(f)!.family].level;
  const workable = (f: string) => workableFocuses(level(f), save.input).includes(f);
  const tried = outcomes.filter((o) => o.weightedOpportunities > 0).sort((a, b) => a.weightedSuccesses / a.weightedOpportunities - b.weightedSuccesses / b.weightedOpportunities);
  const weakest: AttributeId | undefined = tried[0]?.attribute;
  const pool = FOCUSES.filter((f) => f.family !== 'juggling' && (weakest ? f.family === weakest : true) && f.id !== save.focusId);
  return pool.find((f) => workable(f.id))?.id ?? FOCUSES.find((f) => f.id !== save.focusId && f.family !== 'juggling' && workable(f.id))?.id ?? null;
}

/** Pure, synchronous state transition. The store runs it inside one IndexedDB transaction. */
export function reduce(save: CareerSave, action: Action): Outcome {
  const L = CAREER_CONFIG.limits;
  switch (action.type) {
    case 'createPlayer': {
      if (save.player) return fail('A career player already exists.');
      const p = createPlayer(cleanText(action.id, 40) || 'career', action.name, action.position, action.gender);
      return ok({ ...save, player: p }, `Welcome, ${p.name}.`);
    }
    case 'setIdentity': {
      // Display name and presentation are editable; the canonical player id and soccer attributes never change.
      if (!save.player) return fail('Create a player first.');
      if (action.gender !== 'boy' && action.gender !== 'girl') return fail('Choose boy or girl.');
      const name = cleanName(action.name);
      if (!name) return fail('Enter a name.');
      if (save.player.name === name && save.player.gender === action.gender) return same(save, 'Identity unchanged.');
      return ok({ ...save, player: { ...save.player, name, gender: action.gender } }, `Saved: ${name}.`);
    }
    case 'setInput': {
      const input = normalizeInput(action.input);
      const next = { ...save, input };
      if (!save.focusId) return ok(next, 'Setup saved.');
      const r = replan(next, save.focusId);
      if (typeof r === 'string') return ok({ ...next, plan: null }, r);
      if (save.completedSessions.length > 0) return ok(next, 'Setup saved. It applies to next week; this week\'s sessions stay as planned.');
      return ok(r, 'Setup saved and sessions updated.');
    }
    case 'chooseFocus': {
      if (save.completedSessions.length > 0 && save.focusId) return fail('This week already has completed sessions. Pick a new focus at the end of the week.');
      const r = replan(save, action.focusId);
      return typeof r === 'string' ? fail(r) : ok(r, 'Weekly focus set. Three optional sessions are ready.');
    }
    case 'substitute': {
      if (!save.plan || save.plan.week !== save.week) return fail('No plan for this week.');
      if (save.completedSessions.includes(action.sessionId)) return fail('That session is already complete.');
      const plan = substitute(save.plan, action.sessionId, action.index, action.activityId);
      return plan ? ok({ ...save, plan }, 'Swapped. The session still counts the same.') : fail('That swap is not available.');
    }
    case 'log': {
      const e = action.entry;
      if (!save.player) return fail('Create your player first.');
      if (save.journal.some((j) => j.id === e.id)) return same(save, 'Already saved.');
      const a = activityById(e.activityId);
      if (!a) return fail('Unknown activity.');
      if (e.contentVersion !== a.version) return fail('This activity changed since the form opened. Reopen it.');
      if (e.variantId !== null && !a.variants.some((v) => v.id === e.variantId)) return fail('Unknown variant.');
      let credited = false;
      let message = 'Extra practice saved. Extra practice is welcome but earns no extra credit.';
      let next: CareerSave = save;
      if (e.sessionId !== null) {
        const s = save.plan && save.plan.week === save.week ? save.plan.sessions.find((x) => x.id === e.sessionId) : undefined;
        if (!s) return fail('That session is not in this week\'s plan.');
        if (!s.items.some((i) => i.activityId === e.activityId)) return fail('That activity is not in this session.');
        if (save.completedSessions.includes(s.id)) message = 'This session already counted this week; saved as extra practice.';
        else if (e.completion === 'skipped') message = 'Saved. Skipping is fine: no penalty.';
        else if (save.credit < CAREER_CONFIG.home.sessionsPerWeek) {
          credited = true;
          next = { ...next, credit: save.credit + CAREER_CONFIG.home.creditPerSession, completedSessions: [...save.completedSessions, s.id] };
          message = 'Session complete. Participation credit added (it does not change game attributes).';
        }
        const fam = a.skillFamilyId;
        const lvl = save.levels[fam];
        if (e.rating === 'comfortable' && !e.easier && e.completion !== 'skipped' && save.plan!.level >= lvl.level && !lvl.comfortable.includes(s.id)) {
          next = { ...next, levels: { ...next.levels, [fam]: { ...lvl, comfortable: [...lvl.comfortable, s.id] } } };
        }
      }
      const entry: JournalEntry = { ...e, reflection: cleanText(e.reflection, L.reflectionMax), week: save.week, credited };
      const journal = [...next.journal, entry];
      while (journal.length > L.journalMax && journal[0]!.week < save.week) journal.shift();
      if (journal.length > L.journalMax) return fail('Journal is full for this week.');
      return ok({ ...next, journal }, message);
    }
    case 'evidence': {
      if (!save.player) return fail('No career player.');
      if (save.batches.includes(action.batchId)) return same(save, 'Already counted.');
      if (save.batches.length >= L.batchesPerWeekMax) return same(save, 'Weekly evidence limit reached.');
      const room = L.evidencePerWeekMax - save.evidence.length;
      const items = action.items.slice(0, Math.max(0, room));
      return ok(
        { ...save, evidence: [...save.evidence, ...items], batches: [...save.batches, action.batchId], missedEvents: save.missedEvents + Math.max(0, Math.floor(action.missed)) },
        `${items.length} game moments recorded.`,
      );
    }
    case 'acceptLevel': {
      const sug = levelSuggestion(save, action.family);
      if (!sug) return fail('No level change suggested.');
      const next = { ...save, levels: { ...save.levels, [action.family]: { level: sug, comfortable: [] } } };
      return ok(next, 'Level up for next week\'s plan. Game attributes are unchanged.');
    }
    case 'teamTraining': {
      if (!save.player) return fail('No career player.');
      if (action.week !== save.week) return fail('That Team Training belongs to another week.');
      if (save.teamTraining.some((r) => r.week === save.week)) return same(save, `Team Training for week ${save.week} is already counted.`);
      const counted = countTeamWeek(save, action.results);
      return 'error' in counted ? fail(counted.error) : ok(counted.save, counted.message);
    }
    case 'tt12Run': {
      if (!save.player) return fail('No career player.');
      if (action.week !== save.week) return fail('That Team Training belongs to another week.');
      if (!TT12_SLOTS.includes(action.slot)) return fail('Unknown Team Training session.');
      if (typeof action.runId !== 'string' || action.runId.length < 1 || action.runId.length > 64) return fail('Invalid Team Training run.');
      if (typeof action.score !== 'number' || !Number.isFinite(action.score) || action.score < 0 || action.score > 1) return fail('Team Training score out of range.');
      // A replayed completion (same run) or a second run of an already credited session changes nothing.
      if (save.tt12.some((r) => r.runId === action.runId)) return same(save, 'This session is already saved.');
      if (save.tt12.some((r) => r.week === save.week && r.slot === action.slot && r.credited)) return same(save, `Session ${action.slot} for week ${save.week} is already counted; this was practice only.`);
      const credited = action.creditEligible === true;
      const runs = [...save.tt12, { week: save.week, slot: action.slot, runId: action.runId, score: action.score, credited }].slice(-L.historyMax * 4);
      let next: CareerSave = { ...save, tt12: runs };
      if (!credited) return ok(next, 'Session saved, but not counted: it needs at least 30 seconds of your own play.');
      const week = TT12_SLOTS.map((slot) => runs.find((r) => r.week === save.week && r.slot === slot && r.credited));
      if (week.some((r) => !r) || save.teamTraining.some((r) => r.week === save.week)) {
        return ok(next, `Session ${action.slot} counted (${week.filter(Boolean).length} of 3 this week).`);
      }
      // All three sessions credited: the week is graded once through the existing Team Training economy.
      const results = selectSituations(save.player.position, save.week).map((x, i) => ({ id: x.id, score: week[i]!.score, notes: [] }));
      const counted = countTeamWeek(next, results);
      if ('error' in counted) return fail(counted.error);
      next = counted.save;
      return ok(next, `All three sessions counted. ${counted.message}`);
    }
    case 'endWeek': {
      if (!save.player) return fail('No career player.');
      if (save.week >= L.weekMax) return fail('Last week reached.');
      const outcomes = computeGrowth(save.player, save.evidence);
      const thisWeek = save.journal.filter((j) => j.week === save.week);
      const ratings = { learning: 0, improving: 0, comfortable: 0 };
      for (const j of thisWeek) if (j.rating) ratings[j.rating] += 1;
      const review: WeekReview = {
        week: save.week,
        focusId: save.focusId,
        sessionsCompleted: save.completedSessions.length,
        credit: save.credit,
        extraLogged: thisWeek.filter((j) => !j.credited).length,
        ratings,
        evidenceCount: save.evidence.length,
        missedEvents: save.missedEvents,
        outcomes,
        suggestedFocus: suggestFocus(save, outcomes),
      };
      let next: CareerSave = {
        ...save,
        player: applyGrowth(save.player, outcomes),
        week: save.week + 1,
        credit: 0,
        completedSessions: [],
        evidence: [],
        batches: [],
        missedEvents: 0,
        history: [...save.history, review].slice(-L.historyMax),
      };
      if (save.focusId) {
        const r = replan(next, save.focusId);
        next = typeof r === 'string' ? { ...next, plan: null } : r;
      }
      return ok(next, `Week ${save.week} reviewed. Week ${save.week + 1} starts now.`);
    }
  }
}

/** Grade one week of Team Training through the shared weekly economy (one record per week). */
function countTeamWeek(save: CareerSave, results: readonly SituationResult[]): { save: CareerSave; message: string } | { error: string } {
  const player = save.player!;
  const expected = selectSituations(player.position, save.week).map((x) => x.id);
  if (results.length !== expected.length || results.some((r, i) => r.id !== expected[i])) return { error: 'Team Training results do not match this week.' };
  if (results.some((r) => typeof r.score !== 'number' || !Number.isFinite(r.score) || r.score < 0 || r.score > 1)) return { error: 'Team Training score out of range.' };
  const changes = teamTrainingChanges(player, results);
  const attributes = { ...player.attributes };
  for (const c of changes) attributes[c.attribute] = c.to;
  const record: TeamTrainingRecord = { week: save.week, situations: expected, scores: results.map((r) => r.score), delta: weekDelta(results.map((r) => r.score)), changes };
  return {
    save: { ...save, player: { ...player, attributes }, teamTraining: [...save.teamTraining, record].slice(-CAREER_CONFIG.limits.historyMax) },
    message: `Team Training week ${save.week}: ${describeChanges(changes)}`,
  };
}
