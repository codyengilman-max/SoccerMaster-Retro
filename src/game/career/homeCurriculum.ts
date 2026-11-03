/**
 * Home Training as two guided, sequential curricula (owner brief, 2026-11): Juggling and Ball Mastery. Players follow
 * the authored order; there is no chooser. Version 2 applies the owner's curriculum decisions (2026-11): a lesson is
 * passed only through an authored, coach-reviewed checkpoint (none is approved yet, so nothing passes); an 18-week
 * Ball Mastery core pathway comes first; unresolved duplicates and aliases stay out of the assigned sequence; lessons
 * the player's saved setup can't support are deferred, never passed. The sequence, checkpoints, duplicate decisions
 * and alternatives are PROPOSED for owner review (docs/training/home/CURRICULUM.md). Progress is derived from real
 * records only, so nothing is completed or credited by this module. Framework-free.
 */
import { activityById, HOME_ACTIVITIES } from './catalog';
import { sectionOf, type HomeSection } from './ballMastery';
import { HOME_PHASES, skillProgress, type HomeLog, type HomeSkillId, type Phase } from './homeMastery';
import { suitable, type PlannerInput } from './planner';
import type { Activity, SkillFamilyId } from './types';
import type { JournalEntry } from './state';
export const HOME_CURRICULUM_VERSION = 2;
/** 'proposed' until the owner agrees the sequence; then 'agreed'. */
export const HOME_CURRICULUM_STATUS: 'proposed' | 'agreed' = 'proposed';

export type Track = HomeSection;
export const TRACKS: readonly Track[] = ['juggling', 'ballMastery'];
export const PHASE_NAMES: Readonly<Record<Track, readonly string[]>> = {
  juggling: ['Basic control', 'Repeatable control', 'Linked actions', 'Variation and weaker foot', 'Applied challenge'],
  ballMastery: ['Foundations', 'Building control', 'Linking actions', 'Under pressure', 'Applied challenge'],
};

/**
 * The 18-week Ball Mastery core pathway (PROPOSED): one assigned lesson per week, Phase 1 foundations first, grouped
 * into teaching units. Each lesson is its own move; finishing one never completes another. Every entry fits the
 * minimum setup (small indoor space, ball only, no striking), so no core lesson is ever deferred.
 */
export const CORE_PATHWAY: readonly { readonly week: number; readonly unit: string; readonly lesson: string }[] = [
  { week: 1, unit: 'Sole and inside contacts', lesson: 'bmd-055' },
  { week: 2, unit: 'Sole and inside contacts', lesson: 'v11-BM01-L1' },
  { week: 3, unit: 'Sole and inside contacts', lesson: 'v11-BM03-L1' },
  { week: 4, unit: 'Sole and inside contacts', lesson: 'dr-inside' },
  { week: 5, unit: 'First touch', lesson: 'ft-soft-landing' },
  { week: 6, unit: 'First touch', lesson: 'ft-roll-collect' },
  { week: 7, unit: 'Passing', lesson: 'ps-wide-gate' },
  { week: 8, unit: 'Passing', lesson: 'v11-PA01-L1' },
  { week: 9, unit: 'Outside and inside-outside dribbling', lesson: 'dr-outside' },
  { week: 10, unit: 'Outside and inside-outside dribbling', lesson: 'v11-DR01-L1' },
  { week: 11, unit: 'Turns and cuts', lesson: 'v11-TR01-L1' },
  { week: 12, unit: 'Turns and cuts', lesson: 'dr-inside-cut' },
  { week: 13, unit: 'Turns and cuts', lesson: 'v11-TR02-L1' },
  { week: 14, unit: 'Placement, defending stance, awareness', lesson: 'fn-ground-placement' },
  { week: 15, unit: 'Placement, defending stance, awareness', lesson: 'df-balanced-set' },
  { week: 16, unit: 'Placement, defending stance, awareness', lesson: 'aw-eyes-up' },
  { week: 17, unit: 'Linking it together', lesson: 'v11-CO01-L1' },
  { week: 18, unit: 'Linking it together', lesson: 'ft-side-door' },
];

/**
 * Lesson checkpoint: correct technique, control and repeatability, both feet where applicable, and a lesson-specific
 * target. `awaiting-review` until a coach approves it; until then the lesson records practice but cannot be passed.
 * A met checkpoint at home is "Player-reported completion", never verified mastery; coach verification is separate.
 */
export interface Checkpoint {
  readonly status: 'awaiting-review' | 'approved';
  readonly technique: string;
  readonly control: string;
  readonly bothFeet: 'required' | 'confirm';
  /** The existing authored, lesson-specific target, or null when none exists yet. */
  readonly target: string | null;
  readonly missing: readonly string[];
}

/** Proposed decisions for the 13 disputed design-to-lesson pairs (7 designs). Nothing transfers between them. */
export type DuplicateDecision = 'same' | 'variation' | 'unresolved';
export interface DuplicatePair {
  readonly design: string;
  readonly other: string;
  readonly decision: DuplicateDecision;
  /** same: the curriculum entry the design is an alias of. variation: the foundation taught first. */
  readonly entry: string | null;
  readonly reason: string;
}
export const DUPLICATE_REVIEW: readonly DuplicatePair[] = [
  { design: 'bmd-003', other: 'dr-outside-cut', decision: 'unresolved', entry: null, reason: 'Same surface, cut and exit, but the package says the turn angle and body rotation are not specified yet.' },
  { design: 'bmd-003', other: 'v11-TR02', decision: 'unresolved', entry: null, reason: 'Same as above: the design motion is not specified, so it cannot be compared yet.' },
  { design: 'bmd-012', other: 'dr-cruyff', decision: 'unresolved', entry: null, reason: 'Both guide the ball behind the support leg with the inside, but the design has no fake and exits with the other foot; Hook vs Cruyff naming is unconfirmed.' },
  { design: 'bmd-012', other: 'v11-TR03', decision: 'unresolved', entry: null, reason: 'TR03 rehearses a fake kick; the hook has none. Naming is unconfirmed.' },
  { design: 'bmd-017', other: 'dr-stop-start', decision: 'variation', entry: 'dr-stop-start', reason: 'Same sole stop; the design adds a released pause sold by the body and an outside-foot restart (still a proposal).' },
  { design: 'bmd-017', other: 'v11-DR03', decision: 'variation', entry: 'dr-stop-start', reason: 'DR03 adds a look for the route; the design adds the body sell and outside exit.' },
  { design: 'bmd-053', other: 'dr-pullback', decision: 'variation', entry: 'dr-pullback', reason: 'Same sole pull; the design exits diagonally with the same foot\'s inside (V), the pullback turns and goes.' },
  { design: 'bmd-053', other: 'v11-TR01', decision: 'variation', entry: 'v11-TR01-L1', reason: 'TR01 draws back, releases and turns; the design adds the diagonal inside exit.' },
  { design: 'bmd-071', other: 'v11-BM02', decision: 'same', entry: 'v11-BM02-L1', reason: 'Same sole, same roll across the body, same lateral path, settle with no exit.' },
  { design: 'bmd-071', other: 'dr-sole', decision: 'variation', entry: 'v11-BM02-L1', reason: 'Sole Explorer also rolls forward and back and swaps feet.' },
  { design: 'bmd-056', other: 'v11-BM01', decision: 'same', entry: 'v11-BM01-L2', reason: 'Same inside-edge transfers between the feet on the spot, alternating, with a reset.' },
  { design: 'bmd-056', other: 'dr-inside', decision: 'variation', entry: 'v11-BM01-L2', reason: 'Inside Foundations travels forward; the shuffles stay on the spot.' },
  { design: 'bmd-029', other: 'dr-body-feint', decision: 'unresolved', entry: null, reason: 'Side step vs shoulder dip is unconfirmed, and the design\'s outside-foot exit is an original proposal.' },
];
/** Designs kept out of the assigned sequence: unresolved, or an alias of another entry. Their IDs and records stay. */
export const HELD_OUT: ReadonlySet<string> = new Set(DUPLICATE_REVIEW.filter((d) => d.decision !== 'variation').map((d) => d.design));

/** Lessons whose steps need a rebound wall although their data lists a ball only: treated as needing a wall. */
const needsWall = (a: Activity): boolean => a.steps.join(' ').toLowerCase().includes('wall');
const setupNeeds = (a: Activity): Activity => (needsWall(a) && !a.equipment.optional.includes('wall') ? { ...a, equipment: { ...a.equipment, optional: [...a.equipment.optional, 'wall'] }, ballOnly: null } : a);
/** Can the player's saved setup support this lesson safely? Unknown setup means the minimum (small, indoor, ball only). */
export const setupFits = (a: Activity, input: PlannerInput | undefined): boolean =>
  suitable(setupNeeds(a), input ?? { equipment: 'ballOnly', space: 'small', setting: 'indoor', striking: false, minutes: 10 });

export interface CurriculumLesson {
  readonly id: string;
  readonly track: Track;
  readonly phase: Phase;
  /** 1-based position in the whole track. */
  readonly order: number;
  /** The lesson before it in the track (null for the first). */
  readonly prerequisite: string | null;
  readonly practice: string;
  readonly checkpoint: Checkpoint;
  /** Existing performance ladder phase linked to this lesson (shown as progress, never a pass by itself). */
  readonly ladder: { readonly skill: HomeSkillId; readonly phase: Phase } | null;
  /** Core pathway week (Ball Mastery), or null. */
  readonly coreWeek: number | null;
  readonly heldOut: boolean;
  /** Open questions for the owner (disputed equivalence, setup needs, shared targets). */
  readonly flags: readonly string[];
}

export interface CurriculumPhase {
  readonly phase: Phase;
  readonly name: string;
  readonly lessons: readonly string[];
}

export interface HomeCurriculum {
  readonly version: number;
  readonly status: 'proposed' | 'agreed';
  readonly tracks: Readonly<Record<Track, readonly CurriculumPhase[]>>;
  readonly lessons: readonly CurriculumLesson[];
}

/** Coach-approved checkpoints by lesson ID. Empty until the owner approves the review sheet. */
export const APPROVED_CHECKPOINTS: ReadonlySet<string> = new Set();

const BM_FAMILIES: readonly SkillFamilyId[] = ['firstTouch', 'dribbling', 'passing', 'finishing', 'defending', 'awareness'];
const source = (a: Activity): number => (a.id.startsWith('v11-') ? 1 : a.id.startsWith('bmd-') ? 2 : 0);

const targetFor = (id: string) => {
  for (const skill of Object.keys(HOME_PHASES) as HomeSkillId[])
    for (const spec of HOME_PHASES[skill]) if (spec.activityIds.includes(id)) return { skill, spec, shared: spec.activityIds.filter((x) => x !== id) };
  return null;
};

const NUMBER = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty)\b/i;
const BOTH_FEET = /both feet|either foot|swap feet|other foot|weaker foot|less-preferred|each foot|left and right|alternat/i;

export function checkpointFor(a: Activity): Checkpoint {
  const t = targetFor(a.id);
  const text = [...a.steps, a.success, a.harder, ...a.variants.map((v) => v.change)].join(' ');
  const bothFeet = BOTH_FEET.test(text) || a.variants.some((v) => v.factor === 'foot') ? 'required' : 'confirm';
  const target = t ? `${t.spec.success}: ${t.spec.kind === 'reps' ? `${t.spec.target} of ${t.spec.of}` : t.spec.target}, in 2 of 3 attempts in 2 sessions` : NUMBER.test(a.success) ? a.success : null;
  const missing = ['Coach review of the whole checkpoint'];
  if (!target) missing.push('Lesson-specific target');
  if (bothFeet === 'confirm') missing.push('Whether both feet are required');
  return { status: APPROVED_CHECKPOINTS.has(a.id) ? 'approved' : 'awaiting-review', technique: a.cue, control: a.success, bothFeet, target, missing };
}

function flagsFor(a: Activity): string[] {
  const f: string[] = [];
  for (const d of DUPLICATE_REVIEW) if (d.design === a.id || d.other === a.id || (d.other.startsWith('v11-') && a.id.startsWith(`${d.other}-`))) f.push(`Duplicate review with ${d.design === a.id ? d.other : d.design}: ${d.decision} (proposed)`);
  if (a.strikingArea) f.push('Needs a safe striking area');
  if (a.space !== 'small') f.push(`Needs ${a.space} space`);
  if (needsWall(a) && !a.equipment.optional.includes('wall')) f.push('Steps need a rebound wall, but the lesson data lists a ball only');
  if (a.equipment.required.some((e) => e !== 'ball')) f.push(`Needs ${a.equipment.required.filter((e) => e !== 'ball').join(', ')}`);
  const t = targetFor(a.id);
  if (t?.shared.length) f.push(`Shares its ladder target with ${t.shared.join(', ')}`);
  return f;
}

/** Ball Mastery phase order: families take turns (first touch, dribbling, passing, ...), originals before v1.1 and designs. */
function orderBallMastery(list: readonly Activity[]): Activity[] {
  const queues = BM_FAMILIES.map((fam) => list.filter((a) => a.skillFamilyId === fam).sort((x, y) => source(x) - source(y)));
  const out: Activity[] = [];
  for (let i = 0; out.length < list.length; i++) for (const q of queues) if (q[i]) out.push(q[i]!);
  return out;
}

const coreWeek = (id: string): number | null => CORE_PATHWAY.find((c) => c.lesson === id)?.week ?? null;

/** Track order: Ball Mastery's 18 core lessons first, then the rest of the library by phase (later phases and seasons). */
export function buildCurriculum(activities: readonly Activity[] = HOME_ACTIVITIES): HomeCurriculum {
  const lessons: CurriculumLesson[] = [];
  const tracks = {} as Record<Track, CurriculumPhase[]>;
  for (const track of TRACKS) {
    const byPhase = ([1, 2, 3, 4, 5] as const).map((phase) => {
      const inPhase = activities.filter((a) => sectionOf(a) === track && a.entryLevel === phase);
      return { phase, list: track === 'ballMastery' ? orderBallMastery(inPhase) : [...inPhase].sort((x, y) => source(x) - source(y)) };
    });
    const core = track === 'ballMastery' ? CORE_PATHWAY.map((c) => activities.find((a) => a.id === c.lesson)!) : [];
    const rest = byPhase.flatMap((p) => p.list).filter((a) => !core.includes(a));
    let prev: string | null = null;
    for (const a of [...core, ...rest]) {
      const t = targetFor(a.id);
      const held = HELD_OUT.has(a.id);
      lessons.push({
        id: a.id,
        track,
        phase: a.entryLevel as Phase,
        order: lessons.filter((l) => l.track === track).length + 1,
        prerequisite: held ? null : prev,
        practice: a.objective,
        checkpoint: checkpointFor(a),
        ladder: t ? { skill: t.skill, phase: t.spec.phase } : null,
        coreWeek: coreWeek(a.id),
        heldOut: held,
        flags: flagsFor(a),
      });
      if (!held) prev = a.id;
    }
    tracks[track] = byPhase.map((p) => ({ phase: p.phase, name: PHASE_NAMES[track][p.phase - 1]!, lessons: p.list.map((a) => a.id) }));
  }
  return { version: HOME_CURRICULUM_VERSION, status: HOME_CURRICULUM_STATUS, tracks, lessons };
}

export const HOME_CURRICULUM: HomeCurriculum = buildCurriculum();

export interface LessonStatus {
  readonly lesson: CurriculumLesson;
  /** Practices reported for this lesson (done journal entries plus performance logs). Participation, not a pass. */
  readonly practices: number;
  /** Existing ladder phase passed from logged scores; null when the lesson has no ladder. Not a pass by itself. */
  readonly targetMet: boolean | null;
  /** Player-reported completion of an approved checkpoint. Always false while no checkpoint is approved. */
  readonly passed: boolean;
}

export interface TrackStatus {
  readonly track: Track;
  /** The assigned lesson: the first one not passed whose setup fits, or null when nothing is left. */
  readonly current: LessonStatus | null;
  /** A passed earlier lesson prescribed for review this week, or null. */
  readonly review: string | null;
  /** Lessons skipped for now because the saved setup can't support them (never passed). */
  readonly deferred: readonly string[];
  readonly phase: Phase;
  readonly phaseName: string;
  readonly passed: number;
  readonly total: number;
  /** Ball Mastery: position in the 18-week core pathway, or null after it. */
  readonly core: { readonly index: number; readonly of: number } | null;
}

interface Records {
  readonly journal: readonly Pick<JournalEntry, 'activityId' | 'completion'>[];
  readonly homeLogs: readonly HomeLog[];
  readonly input?: PlannerInput;
  readonly week?: number;
}

export function lessonStatus(l: CurriculumLesson, r: Records): LessonStatus {
  const practices = r.journal.filter((j) => j.activityId === l.id && j.completion === 'done').length + r.homeLogs.filter((h) => h.activityId === l.id).length;
  const targetMet = l.ladder ? skillProgress(r.homeLogs, l.ladder.skill).phase > l.ladder.phase : null;
  // Passing needs an approved checkpoint and a recorded player-reported completion; the save has no such record yet.
  return { lesson: l, practices, targetMet, passed: false };
}

/**
 * Sequential: the assigned lesson is the first one not passed, so a new story week never advances it and records of a
 * later lesson never skip it. Lessons the setup can't support are deferred along with later levels of the same
 * ladder, so a deferred prerequisite is never bypassed. Nothing here blocks the story.
 */
export function trackStatus(track: Track, r: Records, c: HomeCurriculum = HOME_CURRICULUM): TrackStatus {
  const list = c.lessons.filter((l) => l.track === track && !l.heldOut);
  const deferredGroups = new Set<string>();
  const deferred: string[] = [];
  const passedIds: string[] = [];
  let current: LessonStatus | null = null;
  for (const l of list) {
    const a = activityById(l.id)!;
    if (deferredGroups.has(a.variantGroupId) || !setupFits(a, r.input)) {
      deferredGroups.add(a.variantGroupId);
      deferred.push(l.id);
      continue;
    }
    const st = lessonStatus(l, r);
    if (st.passed) passedIds.push(l.id);
    else if (!current) current = st;
  }
  const phase = current?.lesson.phase ?? 5;
  const coreIds = CORE_PATHWAY.map((x) => x.lesson);
  const coreIndex = current && track === 'ballMastery' ? coreIds.indexOf(current.lesson.id) : -1;
  return {
    track,
    current,
    review: passedIds.length ? passedIds[(r.week ?? 1) % passedIds.length]! : null,
    deferred,
    phase,
    phaseName: PHASE_NAMES[track][phase - 1]!,
    passed: passedIds.length,
    total: list.length,
    core: coreIndex >= 0 ? { index: coreIndex + 1, of: coreIds.length } : null,
  };
}

export const curriculumLesson = (id: string, c: HomeCurriculum = HOME_CURRICULUM): CurriculumLesson | undefined => c.lessons.find((l) => l.id === id);
export const lessonActivity = (l: CurriculumLesson): Activity => activityById(l.id)!;
