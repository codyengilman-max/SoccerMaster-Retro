/**
 * Home Training as two guided, sequential curricula (owner brief, 2026-11): Juggling and Ball Mastery. Players follow
 * the authored order; there is no chooser. Version 1 is a PROPOSED sequence for owner review, generated from the
 * existing approved library without inventing, merging or dropping lessons (docs/training/home/CURRICULUM.md).
 * Progress is derived from real records only, so nothing is completed or credited by this module. Framework-free.
 */
import { activityById, HOME_ACTIVITIES } from './catalog';
import { DESIGN_MATCHES, sectionOf, type HomeSection } from './ballMastery';
import { HOME_PHASES, skillProgress, type HomeLog, type HomeSkillId, type Phase } from './homeMastery';
import type { Activity, SkillFamilyId } from './types';
import type { JournalEntry } from './state';

export const HOME_CURRICULUM_VERSION = 1;
/** 'proposed' until the owner agrees the sequence; then 'agreed'. */
export const HOME_CURRICULUM_STATUS: 'proposed' | 'agreed' = 'proposed';

export type Track = HomeSection;
export const TRACKS: readonly Track[] = ['juggling', 'ballMastery'];
export const PHASE_NAMES: Readonly<Record<Track, readonly string[]>> = {
  juggling: ['Basic control', 'Repeatable control', 'Linked actions', 'Variation and weaker foot', 'Applied challenge'],
  ballMastery: ['Foundations', 'Building control', 'Linking actions', 'Under pressure', 'Applied challenge'],
};

/**
 * How a lesson is passed. `target`: the existing performance ladder phase (logged scores, 2 of 3 attempts in 2
 * sessions) plus one reported practice of this lesson. `practice`: reported practices only; the count is a proposal,
 * not an owner-set criterion, and it proves practice, not mastery.
 */
export type Advance =
  | { readonly kind: 'target'; readonly skill: HomeSkillId; readonly phase: Phase; readonly practices: number }
  | { readonly kind: 'practice'; readonly practices: number; readonly proposed: true };

export interface CurriculumLesson {
  readonly id: string;
  readonly track: Track;
  readonly phase: Phase;
  /** 1-based position in the whole track. */
  readonly order: number;
  /** The lesson before it in the track (null for the first). */
  readonly prerequisite: string | null;
  readonly practice: string;
  readonly advance: Advance;
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

/** Proposed reported practices for a lesson without a performance target (owner to set). */
export const PROPOSED_PRACTICES = 1;
const BM_FAMILIES: readonly SkillFamilyId[] = ['firstTouch', 'dribbling', 'passing', 'finishing', 'defending', 'awareness'];
const source = (a: Activity): number => (a.id.startsWith('v11-') ? 1 : a.id.startsWith('bmd-') ? 2 : 0);

const targetFor = (id: string): { skill: HomeSkillId; phase: Phase; shared: string[] } | null => {
  for (const skill of Object.keys(HOME_PHASES) as HomeSkillId[])
    for (const spec of HOME_PHASES[skill]) if (spec.activityIds.includes(id)) return { skill, phase: spec.phase, shared: spec.activityIds.filter((x) => x !== id) };
  return null;
};

function flagsFor(a: Activity): string[] {
  const f: string[] = [];
  const m = DESIGN_MATCHES[a.id.startsWith('bmd-') ? `BM-${a.id.slice(4)}` : ''];
  if (m?.verdict === 'ambiguous') f.push(`Possible duplicate of ${m.activities.join(', ')} (unresolved: ${m.note})`);
  for (const [design, dm] of Object.entries(DESIGN_MATCHES)) if (dm.verdict === 'ambiguous' && dm.activities.includes(a.id)) f.push(`Possible duplicate of ${design} (unresolved)`);
  if (a.strikingArea) f.push('Needs a safe striking area');
  if (a.space !== 'small') f.push(`Needs ${a.space} space`);
  if (a.equipment.required.some((e) => e !== 'ball')) f.push(`Needs ${a.equipment.required.filter((e) => e !== 'ball').join(', ')}`);
  const t = targetFor(a.id);
  if (t?.shared.length) f.push(`Shares its phase target with ${t.shared.join(', ')}`);
  if (!t) f.push('No performance target: practice reported only');
  return f;
}

/** Ball Mastery phase order: families take turns (first touch, dribbling, passing, ...), originals before v1.1 and designs. */
function orderBallMastery(list: readonly Activity[]): Activity[] {
  const queues = BM_FAMILIES.map((fam) => list.filter((a) => a.skillFamilyId === fam).sort((x, y) => source(x) - source(y)));
  const out: Activity[] = [];
  for (let i = 0; out.length < list.length; i++) for (const q of queues) if (q[i]) out.push(q[i]!);
  return out;
}

export function buildCurriculum(activities: readonly Activity[] = HOME_ACTIVITIES): HomeCurriculum {
  const lessons: CurriculumLesson[] = [];
  const tracks = {} as Record<Track, CurriculumPhase[]>;
  for (const track of TRACKS) {
    tracks[track] = [];
    let prev: string | null = null;
    for (const phase of [1, 2, 3, 4, 5] as const) {
      const inPhase = activities.filter((a) => sectionOf(a) === track && a.entryLevel === phase);
      const ordered = track === 'ballMastery' ? orderBallMastery(inPhase) : [...inPhase].sort((x, y) => source(x) - source(y));
      for (const a of ordered) {
        const t = targetFor(a.id);
        lessons.push({
          id: a.id,
          track,
          phase,
          order: lessons.filter((l) => l.track === track).length + 1,
          prerequisite: prev,
          practice: a.objective,
          advance: t ? { kind: 'target', skill: t.skill, phase: t.phase, practices: 1 } : { kind: 'practice', practices: PROPOSED_PRACTICES, proposed: true },
          flags: flagsFor(a),
        });
        prev = a.id;
      }
      tracks[track].push({ phase, name: PHASE_NAMES[track][phase - 1]!, lessons: ordered.map((a) => a.id) });
    }
  }
  return { version: HOME_CURRICULUM_VERSION, status: HOME_CURRICULUM_STATUS, tracks, lessons };
}

export const HOME_CURRICULUM: HomeCurriculum = buildCurriculum();

export interface LessonStatus {
  readonly lesson: CurriculumLesson;
  /** Practices reported for this lesson (done journal entries plus performance logs). */
  readonly practices: number;
  /** null when the lesson has no performance target. */
  readonly targetMet: boolean | null;
  readonly complete: boolean;
}

export interface TrackStatus {
  readonly track: Track;
  /** The assigned lesson: the first one not complete, or null when the track is finished. */
  readonly current: LessonStatus | null;
  readonly phase: Phase;
  readonly phaseName: string;
  readonly completed: number;
  readonly total: number;
  /** Position of the assigned lesson inside its phase. */
  readonly inPhase: { readonly index: number; readonly of: number };
}

interface Records {
  readonly journal: readonly Pick<JournalEntry, 'activityId' | 'completion'>[];
  readonly homeLogs: readonly HomeLog[];
}

export function lessonStatus(l: CurriculumLesson, r: Records): LessonStatus {
  const practices = r.journal.filter((j) => j.activityId === l.id && j.completion === 'done').length + r.homeLogs.filter((h) => h.activityId === l.id).length;
  const targetMet = l.advance.kind === 'target' ? skillProgress(r.homeLogs, l.advance.skill).phase > l.advance.phase : null;
  return { lesson: l, practices, targetMet, complete: practices >= l.advance.practices && targetMet !== false };
}

/** Sequential: lessons are taken in order, so a later lesson's records never skip an earlier one. */
export function trackStatus(track: Track, r: Records, c: HomeCurriculum = HOME_CURRICULUM): TrackStatus {
  const list = c.lessons.filter((l) => l.track === track);
  let completed = 0;
  let current: LessonStatus | null = null;
  for (const l of list) {
    const st = lessonStatus(l, r);
    if (!st.complete) {
      current = st;
      break;
    }
    completed++;
  }
  const phase = current?.lesson.phase ?? 5;
  const ph = c.tracks[track].find((p) => p.phase === phase)!;
  return {
    track,
    current,
    phase,
    phaseName: ph.name,
    completed,
    total: list.length,
    inPhase: { index: current ? ph.lessons.indexOf(current.lesson.id) + 1 : ph.lessons.length, of: ph.lessons.length },
  };
}

export const curriculumLesson = (id: string, c: HomeCurriculum = HOME_CURRICULUM): CurriculumLesson | undefined => c.lessons.find((l) => l.id === id);
export const lessonActivity = (l: CurriculumLesson): Activity => activityById(l.id)!;
