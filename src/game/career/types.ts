/** M6 career-player and home-training types. Framework-free. */

export const ATTRIBUTES = ['firstTouch', 'passing', 'dribbling', 'finishing', 'defending', 'awareness'] as const;
export type AttributeId = (typeof ATTRIBUTES)[number];

export const ATTRIBUTE_LABELS: Readonly<Record<AttributeId, string>> = {
  firstTouch: 'First touch',
  passing: 'Passing',
  dribbling: 'Dribbling',
  finishing: 'Finishing',
  defending: 'Defending',
  awareness: 'Tactical awareness',
};

/** Practice areas. Levels are kept per area. Juggling is a ladder of its own and grows no attribute. */
export const SKILL_FAMILIES = ['firstTouch', 'passing', 'dribbling', 'finishing', 'defending', 'awareness', 'juggling'] as const;
export type SkillFamilyId = (typeof SKILL_FAMILIES)[number];

export const SKILL_FAMILY_LABELS: Readonly<Record<SkillFamilyId, string>> = {
  firstTouch: 'First touch',
  passing: 'Passing',
  dribbling: 'Dribbling',
  finishing: 'Finishing foundations',
  defending: 'Defending foundations',
  awareness: 'Awareness foundations',
  juggling: 'Juggling ladder',
};

export type Level = 1 | 2 | 3 | 4 | 5;
export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5];
export const LEVEL_NAMES: Readonly<Record<Level, string>> = { 1: 'Discover', 2: 'Control', 3: 'Connect', 4: 'Adapt', 5: 'Challenge' };
export const LEVEL_HINTS: Readonly<Record<Level, string>> = {
  1: 'One action, comfortable pace, generous targets.',
  2: 'Repeat consistently and explore both feet.',
  3: 'Combine actions.',
  4: 'Vary angles, service, targets or cues.',
  5: 'Keep control through varied sequences.',
};

/** Ball is the only required item. Everything else is optional and has a ball-only adaptation. */
export type Equipment = 'ball' | 'markers' | 'wall' | 'target' | 'audio';
/** small: about 2 x 3 m clear floor. medium: about 4 x 6 m (yard, park corner, large room). */
export type SpaceNeed = 'small' | 'medium';
export type Position = 'DEF' | 'MID' | 'FWD';
export const POSITIONS: readonly Position[] = ['DEF', 'MID', 'FWD'];

export type SelfReportField = 'completion' | 'rating' | 'foot' | 'personalBest' | 'reflection';
export type Rating = 'learning' | 'improving' | 'comfortable';
export const RATINGS: readonly Rating[] = ['learning', 'improving', 'comfortable'];
export type Foot = 'left' | 'right' | 'both';

export type SourceId = 'fifa-first-touch' | 'fifa-passing-receiving' | 'fifa-ball-control' | 'ef-1v1-defending' | 'ef-take-a-picture';

export interface SourceRef {
  readonly id: SourceId;
  /** How the original home adaptation relates to the source. Never "official drill". */
  readonly relation: 'principle' | 'adapted-from';
}

export interface ActivityVariant {
  readonly id: string;
  readonly level: Level;
  /** Exactly one difficulty factor changes from the base version. */
  readonly factor: 'distance' | 'target' | 'foot' | 'angle' | 'service' | 'tempo' | 'cue' | 'sequence' | 'surface';
  readonly change: string;
}

/** Demonstration: a ground-path animation where it is honest, otherwise still step illustrations. */
export type DemoSpec =
  | {
      readonly kind: 'path';
      /** Positions in a 10 x 6 practice area (metres-ish), x right, y down. */
      readonly markers: readonly { readonly x: number; readonly y: number; readonly kind: 'cone' | 'wall' | 'target' | 'zone' }[];
      readonly ball: readonly { readonly t: number; readonly x: number; readonly y: number }[];
      readonly player: readonly { readonly t: number; readonly x: number; readonly y: number }[];
      readonly seconds: number;
    }
  | { readonly kind: 'steps'; readonly frames: readonly { readonly caption: string; readonly foot: 'left' | 'right' | 'either'; readonly ball: 'inside' | 'outside' | 'sole' | 'front' | 'air' | 'away' }[] };

export interface Activity {
  readonly id: string;
  readonly version: number;
  readonly skillFamilyId: SkillFamilyId;
  /** Equivalent activities share a group and one reward allowance; groups are the distinct exercise families. */
  readonly variantGroupId: string;
  /** Specific weekly focus this activity serves. */
  readonly focusId: string;
  readonly title: string;
  readonly objective: string;
  readonly relatedAttribute: AttributeId | null;
  readonly entryLevel: Level;
  readonly variants: readonly ActivityVariant[];
  readonly equipment: { readonly required: readonly Equipment[]; readonly optional: readonly Equipment[] };
  readonly space: SpaceNeed;
  readonly indoor: boolean;
  readonly outdoor: boolean;
  /** Needs a safe place to strike the ball firmly (net, fence, garage door away from windows). */
  readonly strikingArea: boolean;
  readonly steps: readonly [string, string, string];
  readonly cue: string;
  readonly success: string;
  readonly mistake: { readonly mistake: string; readonly correction: string };
  readonly easier: string;
  readonly harder: string;
  /** Honest ball-only adaptation when optional equipment is missing; its objective is stated separately. */
  readonly ballOnly: { readonly objective: string; readonly steps: string } | null;
  /** Combines several actions; used as the linked application piece of a session. */
  readonly application: boolean;
  readonly selfReport: readonly SelfReportField[];
  readonly personalBestLabel: string | null;
  readonly limitations: readonly string[];
  readonly sources: readonly SourceRef[];
  /** Required when there is no verified source. */
  readonly sourceNote: string;
  readonly review: { readonly schema: 'auto'; readonly editorial: 'checked' | 'pending'; readonly coaching: 'pending' | 'approved'; readonly notes: string };
  readonly demo: DemoSpec;
}

export interface FocusDef {
  readonly id: string;
  readonly family: SkillFamilyId;
  readonly label: string;
  readonly why: string;
}
