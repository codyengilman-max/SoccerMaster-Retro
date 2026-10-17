/**
 * Training library v1.1 options as Home Training activities. Owner decision (Cody, 2026-10-16): the drafts are
 * enabled in the game. They stay drafts: not coach-certified, no demo assets. They go through the normal
 * journal rules (one credit per scheduled session, at most three a week, never game attributes).
 */
import type { Activity } from '../types';
import { CURRICULUM, type CurriculumState } from './index';
import type { Category, Family, Level } from './manifest';
import { CATEGORY_SKILL_AREA } from './mapping';

export const DRAFT_STATUS = 'Enabled by owner, not coach-certified';
export const DRAFT_PREFIX = 'v11-';

const CATEGORY_FOCUS: Readonly<Record<Category, string>> = {
  ball_control: 'dr-close-control',
  dribbling: 'dr-close-control',
  turning: 'dr-change-direction',
  passing: 'ps-accuracy',
  first_touch: 'ft-cushion',
  aerial_control: 'jg-ladder',
  finishing: 'fn-placement',
};

export const draftActivityId = (levelId: string): string => `${DRAFT_PREFIX}${levelId}`;

function toActivity(f: Family, l: Level): Activity {
  const area = CATEGORY_SKILL_AREA[f.category];
  const steps = l.steps.length ? l.steps : [l.setup];
  const three: [string, string, string] = [steps[0]!, steps[1] ?? l.endingState, steps.slice(2).join(' ') || l.endingState];
  return {
    id: draftActivityId(l.id),
    version: 1,
    skillFamilyId: area,
    variantGroupId: `${DRAFT_PREFIX}${f.id}`,
    focusId: CATEGORY_FOCUS[f.category],
    title: `${f.title} (${l.id})`,
    objective: `${DRAFT_STATUS}. ${l.startingState}`,
    relatedAttribute: area === 'juggling' ? null : area,
    entryLevel: Math.min(5, Math.max(1, l.ordinal)) as Activity['entryLevel'],
    variants: [],
    equipment: { required: ['ball'], optional: [] },
    space: 'small',
    indoor: true,
    outdoor: true,
    strikingArea: f.category === 'finishing',
    steps: three,
    cue: f.qualityCheck,
    success: l.endingState,
    mistake: { mistake: 'Losing the quality check.', correction: f.correction },
    easier: 'Slow down and repeat the setup.',
    harder: 'Repeat at a steady pace with the other foot.',
    ballOnly: null,
    application: false,
    selfReport: ['completion', 'rating', 'foot', 'reflection'],
    personalBestLabel: null,
    limitations: [f.limitation, 'Draft from training library v1.1: no coach certification, no demo video.'],
    sources: [],
    sourceNote: `Training library v1.1 draft ${l.id} (AI-assisted, ${DRAFT_STATUS.toLowerCase()}).`,
    review: { schema: 'auto', editorial: 'pending', coaching: 'pending', notes: DRAFT_STATUS },
    demo: { kind: 'steps', frames: three.map((caption) => ({ caption, foot: 'either' as const, ball: 'front' as const })) },
  };
}

export function draftActivities(state: CurriculumState = CURRICULUM): Activity[] {
  if (!state.ok) return [];
  return state.manifest.families.flatMap((f) => f.levels.map((l) => toActivity(f, l)));
}

export const DRAFT_ACTIVITIES: readonly Activity[] = draftActivities();
