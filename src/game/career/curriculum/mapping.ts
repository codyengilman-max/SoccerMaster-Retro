/**
 * Curriculum organization for the 20 imported exercise families. Families map onto the seven existing
 * skill-area levels; they never create their own progression tracks. The mapping to the 92 existing
 * activities is a proposal (see research/training/README.md): a replacement only takes effect after
 * the new family is approved in the release manifest, and existing IDs, journal entries and credits
 * are never removed.
 */
import type { SkillFamilyId } from '../types';
import type { Category } from './manifest';

export const CATEGORY_SKILL_AREA: Readonly<Record<Category, SkillFamilyId>> = {
  ball_control: 'dribbling',
  dribbling: 'dribbling',
  turning: 'dribbling',
  passing: 'passing',
  first_touch: 'firstTouch',
  aerial_control: 'juggling',
  finishing: 'finishing',
};

export type MappingAction = 'replace' | 'add';
export interface FamilyMapping {
  readonly action: MappingAction;
  /** Existing activities this family would replace once approved. */
  readonly replaces: readonly string[];
  /** Existing activities that overlap but stay in the library. */
  readonly overlaps: readonly string[];
}

export const FAMILY_MAPPING: Readonly<Record<string, FamilyMapping>> = {
  BM01: { action: 'replace', replaces: ['dr-inside'], overlaps: [] },
  BM02: { action: 'replace', replaces: ['dr-sole'], overlaps: [] },
  BM03: { action: 'add', replaces: [], overlaps: ['dr-sole', 'dr-stop-start'] },
  DR01: { action: 'replace', replaces: ['dr-outside'], overlaps: ['dr-inside'] },
  DR02: { action: 'add', replaces: [], overlaps: ['dr-figure-eight'] },
  DR03: { action: 'replace', replaces: ['dr-stop-start'], overlaps: ['aw-eyes-up'] },
  TR01: { action: 'replace', replaces: ['dr-pullback'], overlaps: [] },
  TR02: { action: 'replace', replaces: ['dr-outside-cut'], overlaps: ['dr-inside-cut'] },
  TR03: { action: 'replace', replaces: ['dr-cruyff'], overlaps: [] },
  PA01: { action: 'replace', replaces: ['ps-wide-gate'], overlaps: ['ps-two-foot', 'fn-ground-placement'] },
  PA02: { action: 'add', replaces: [], overlaps: ['ft-rebound-angles', 'ps-pass-reposition'] },
  PA03: { action: 'replace', replaces: ['ps-one-touch-return'], overlaps: [] },
  RC01: { action: 'replace', replaces: ['ft-side-door'], overlaps: ['ft-called-exit', 'ft-outside-exit'] },
  RC02: { action: 'replace', replaces: ['ft-set-for-pass'], overlaps: ['ps-receive-set-pass'] },
  JU01: { action: 'replace', replaces: ['jg-1', 'jg-2'], overlaps: [] },
  JU02: { action: 'replace', replaces: ['jg-3'], overlaps: ['jg-4'] },
  JU03: { action: 'replace', replaces: ['ft-air-to-ground'], overlaps: ['jg-7', 'ft-bounce-settle'] },
  FI01: { action: 'replace', replaces: ['fn-inside-accuracy'], overlaps: ['fn-ground-placement', 'fn-called-corner'] },
  FI02: { action: 'add', replaces: [], overlaps: ['fn-set-strike'] },
  CO01: { action: 'replace', replaces: ['dr-sole-roll-combo'], overlaps: ['dr-choose-move'] },
};

export type ReviewDisposition = 'retain' | 'revise' | 'hold_demo';
/** Dispositions from v1.1/01_COACHING_REVIEW.md (AI-assisted, not certification). All stay open. */
export const COACHING_REVIEW: Readonly<Record<string, { readonly disposition: ReviewDisposition; readonly note: string }>> = {
  BM01: { disposition: 'retain', note: 'Explain support balance and transfer direction; label CO01 shared component.' },
  BM02: { disposition: 'retain', note: 'Show sole contact without loading body weight onto the ball.' },
  BM03: { disposition: 'retain', note: 'Resolve foot choice for the exit and keep reach comfortable.' },
  DR01: { disposition: 'retain', note: 'Low balanced posture and controlled contacts before increased pace.' },
  DR02: { disposition: 'retain', note: 'Label slalom as control practice, not beating a real defender.' },
  DR03: { disposition: 'retain', note: 'Route-checking foundation; narrow awareness claims.' },
  TR01: { disposition: 'revise', note: 'Revise geometric and foot-specific turn instructions before animation.' },
  TR02: { disposition: 'revise', note: 'Distinguish sideways cut from reversal/hook; document the exact variant.' },
  TR03: { disposition: 'retain', note: 'Resolve setup and exit; inspect video before final demo.' },
  PA01: { disposition: 'retain', note: 'Add passing-contact cues and individualized target distance.' },
  PA02: { disposition: 'revise', note: 'Specify receiving surface and intended first touch for each option.' },
  PA03: { disposition: 'retain', note: 'Preserve easier two-touch fallback and manageable rebound timing.' },
  RC01: { disposition: 'revise', note: 'Revise body orientation, receiving foot/surface and next action.' },
  RC02: { disposition: 'retain', note: 'Declared wall adaptation; clarify lateral roll and opposite-foot pass.' },
  JU01: { disposition: 'revise', note: 'Specify chosen juggling contact surface and exact bounce sequence.' },
  JU02: { disposition: 'revise', note: 'Identify shared beginner task; specify contact surface and height.' },
  JU03: { disposition: 'hold_demo', note: 'Hold final demo until one settling technique is selected and reviewed.' },
  FI01: { disposition: 'retain', note: 'Placement foundation; add contact cues; not full finishing decisions.' },
  FI02: { disposition: 'hold_demo', note: 'Hold final demo pending ground-contact mechanics review.' },
  CO01: { disposition: 'retain', note: 'Resolve every foot and transition explicitly.' },
};
