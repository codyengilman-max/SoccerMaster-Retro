/**
 * Ball Mastery demonstration designs v1.0, loaded from the unchanged package in research/.
 * Owner-approved as Ball Mastery lessons (D68): see `DESIGN_ACTIVITIES`. Credit and growth follow the normal journal rules.
 * Matches to existing lessons link designs and their sources to those lessons; they never replace them.
 */
import designsRaw from '../../../research/training/ball-mastery-designs-v1.0/designs.json?raw';
import sourcesRaw from '../../../research/training/ball-mastery-designs-v1.0/sources.json?raw';
import type { Activity, SkillFamilyId } from './types';

export type DesignContact = string;
export interface DesignPhase {
  readonly title: string;
  readonly contact: DesignContact;
  readonly ballAction: string;
}
export interface BallMasteryDesign {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly evidence: string;
  readonly sourceIds: readonly string[];
  readonly frameReviewed: boolean;
  readonly coachApproval: unknown;
  readonly publication: boolean;
  readonly cue: string;
  readonly reviewQuestion: string;
  readonly phases: readonly DesignPhase[];
  readonly mirrorRule: string;
}
export interface DesignSource {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly support: string;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function parseDesigns(raw: string): BallMasteryDesign[] {
  const d = JSON.parse(raw) as { lessons?: unknown };
  if (!Array.isArray(d.lessons)) return [];
  return d.lessons.map((x: Record<string, unknown>) => ({
    id: str(x.lesson_id),
    title: str(x.title),
    status: str(x.status),
    evidence: str(x.evidence_status),
    sourceIds: Array.isArray(x.source_ids) ? x.source_ids.map(str) : [],
    frameReviewed: x.source_media_frame_reviewed === true,
    coachApproval: x.coach_approval ?? null,
    publication: x.runtime_publication_enabled === true,
    cue: str(x.cue),
    reviewQuestion: str(x.review_question),
    phases: Array.isArray(x.phases)
      ? x.phases.map((p: Record<string, unknown>) => ({ title: str(p.title), contact: str(p.contact), ballAction: str(p.note) }))
      : [],
    mirrorRule: typeof x.mirror_rule === 'string' ? x.mirror_rule : JSON.stringify(x.mirror_rule ?? ''),
  }));
}

export const BALL_MASTERY_DESIGNS: readonly BallMasteryDesign[] = parseDesigns(designsRaw);
export const DESIGN_SOURCES: Readonly<Record<string, DesignSource>> = Object.fromEntries(
  Object.entries(JSON.parse(sourcesRaw) as Record<string, Record<string, unknown>>).map(([id, s]) => [id, { id, title: str(s.title), url: str(s.url), support: str(s.support) }])
);

/**
 * Owner decision (Cody, 2026-11, D68): the designs are regular Ball Mastery lessons. The one confirmed equivalent
 * (BM-002 = Inside-Cut Escape) is already that lesson, so it is not added twice.
 */
export function designAssignable(d: BallMasteryDesign): boolean {
  return DESIGN_MATCHES[d.id]?.verdict !== 'equivalent';
}

export type MatchVerdict = 'equivalent' | 'ambiguous' | 'new';
export interface DesignMatch {
  readonly verdict: MatchVerdict;
  /** Existing approved-catalog activities the design is linked to (never replaced). */
  readonly activities: readonly string[];
  /** Overlapping v1.1 draft families (review-only themselves). */
  readonly draftFamilies: readonly string[];
  readonly note: string;
}

/** Owner-reviewable match of each design against existing lessons; see docs/training/home/BALL_MASTERY.md. */
export const DESIGN_MATCHES: Readonly<Record<string, DesignMatch>> = {
  'BM-002': { verdict: 'equivalent', activities: ['dr-inside-cut'], draftFamilies: [], note: 'Same move: inside of the foot redirects the ball across the body, then go the new way.' },
  'BM-003': { verdict: 'ambiguous', activities: ['dr-outside-cut'], draftFamilies: ['TR02'], note: 'Same name; the package marks the outside-cut mechanics for review.' },
  'BM-012': { verdict: 'ambiguous', activities: ['dr-cruyff'], draftFamilies: ['TR03'], note: 'A hook turn and a Cruyff turn are not confirmed to be the same move.' },
  'BM-017': { verdict: 'ambiguous', activities: ['dr-stop-start'], draftFamilies: ['DR03'], note: 'The package marks the sole stop/start mapping for review.' },
  'BM-053': { verdict: 'ambiguous', activities: ['dr-pullback'], draftFamilies: ['TR01'], note: 'The research leaves the V pull-and-exit mapping unresolved.' },
  'BM-071': { verdict: 'ambiguous', activities: ['dr-sole'], draftFamilies: ['BM02'], note: 'The package marks the lateral sole roll mapping for review; Sole Explorer also rolls forward and back.' },
  'BM-056': { verdict: 'ambiguous', activities: ['dr-inside'], draftFamilies: ['BM01'], note: 'Inside Foundations travels forward; shuffles are on the spot. Similar, not confirmed.' },
  'BM-029': { verdict: 'ambiguous', activities: ['dr-body-feint'], draftFamilies: [], note: 'Both fake one way and exit the other; the shoulder dip vs side step is not confirmed equivalent.' },
  'BM-055': { verdict: 'new', activities: [], draftFamilies: [], note: 'No existing lesson.' },
  'BM-081': { verdict: 'new', activities: [], draftFamilies: [], note: 'No existing lesson.' },
  'BM-082': { verdict: 'new', activities: [], draftFamilies: [], note: 'No existing lesson.' },
  'BM-083': { verdict: 'new', activities: [], draftFamilies: [], note: 'No existing lesson.' },
  'BM-009': { verdict: 'new', activities: [], draftFamilies: [], note: 'No existing lesson; the package marks the mechanics for review.' },
  'BM-018': { verdict: 'new', activities: [], draftFamilies: [], note: 'No existing lesson; the package marks the mechanics for review.' },
};

export const designById = (id: string): BallMasteryDesign | undefined => BALL_MASTERY_DESIGNS.find((d) => d.id === id);

/** Designs linked to an existing activity, with their match verdicts. */
export function designsFor(activityId: string): { design: BallMasteryDesign; match: DesignMatch }[] {
  return BALL_MASTERY_DESIGNS.flatMap((design) => {
    const match = DESIGN_MATCHES[design.id];
    return match && match.activities.includes(activityId) ? [{ design, match }] : [];
  });
}

/** Home Training presentation: exactly two sections. Every existing home family sits in one. */
export type HomeSection = 'juggling' | 'ballMastery';
export const HOME_SECTIONS: Readonly<Record<HomeSection, readonly SkillFamilyId[]>> = {
  juggling: ['juggling'],
  ballMastery: ['firstTouch', 'passing', 'dribbling', 'finishing', 'defending', 'awareness'],
};
export const HOME_SECTION_LABELS: Readonly<Record<HomeSection, string>> = { juggling: 'Juggling', ballMastery: 'Ball Mastery' };

export function sectionOf(a: Pick<Activity, 'skillFamilyId'>): HomeSection | null {
  for (const s of Object.keys(HOME_SECTIONS) as HomeSection[]) if ((HOME_SECTIONS[s] as readonly string[]).includes(a.skillFamilyId)) return s;
  return null;
}

export const DESIGN_PREFIX = 'bmd-';
export const designActivityId = (designId: string): string => `${DESIGN_PREFIX}${designId.replace(/^BM-/, '')}`;
const TURNS = new Set(['BM-003', 'BM-009', 'BM-012', 'BM-017', 'BM-029', 'BM-053']);
const footOf = (c: string): 'left' | 'right' | 'either' => (c.startsWith('L ') ? 'left' : c.startsWith('R ') ? 'right' : 'either');
const ballOf = (c: string): 'inside' | 'outside' | 'sole' | 'front' => (c.endsWith('inside') ? 'inside' : c.endsWith('outside') ? 'outside' : c.endsWith('sole') ? 'sole' : 'front');

function designActivity(d: BallMasteryDesign): Activity {
  const ph = d.phases.map((p) => `${p.title}: ${p.ballAction || p.title}.`);
  const steps: [string, string, string] = [ph[0] ?? d.cue, ph[1] ?? d.cue, ph.slice(2).join(' ') || d.cue];
  return {
    id: designActivityId(d.id),
    version: 1,
    skillFamilyId: 'dribbling',
    variantGroupId: designActivityId(d.id),
    focusId: TURNS.has(d.id) ? 'dr-change-direction' : 'dr-close-control',
    title: d.title,
    objective: d.cue,
    relatedAttribute: 'dribbling',
    entryLevel: 1,
    variants: [],
    equipment: { required: ['ball'], optional: [] },
    space: 'small',
    indoor: true,
    outdoor: true,
    strikingArea: false,
    steps,
    cue: d.cue,
    success: `You can repeat it with the ball under control: ${d.cue}`,
    mistake: { mistake: 'Rushing the contacts and losing the ball.', correction: 'Slow down; make each step clean, then build speed.' },
    easier: 'Go slower and pause between steps.',
    harder: 'Repeat at a steady pace with the other foot.',
    ballOnly: null,
    application: false,
    selfReport: ['completion', 'rating', 'foot', 'reflection'],
    personalBestLabel: null,
    limitations: [d.reviewQuestion],
    sources: [],
    sourceNote: `Ball Mastery design ${d.id} v1.0 (approved by owner). Sources: ${d.sourceIds.map((id) => DESIGN_SOURCES[id]?.title ?? id).join('; ')}.`,
    review: { schema: 'auto', editorial: 'pending', coaching: 'pending', notes: 'Approved by owner' },
    demo: { kind: 'steps', frames: d.phases.map((p) => ({ caption: p.title, foot: footOf(p.contact), ball: ballOf(p.contact) })) },
  };
}

/** The approved designs as Ball Mastery > Dribbling lessons. */
export const DESIGN_ACTIVITIES: readonly Activity[] = BALL_MASTERY_DESIGNS.filter(designAssignable).map(designActivity);

export const ASSIGNABLE_DESIGNS: readonly string[] = BALL_MASTERY_DESIGNS.filter(designAssignable).map((d) => d.id);
