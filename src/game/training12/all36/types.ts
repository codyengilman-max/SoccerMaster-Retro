/**
 * Runtime schema for the coach-approved All36 Team Training package (PR C). The package files are kept unchanged in
 * docs/training/all36/package; these types describe them as read, plus the fields PR C adds on top. Framework-free.
 */
import type { RoleId } from '../ref/catalog.mjs';
import type { Position } from '../../career/types';

/** Metres, package field 45.72 x 68.58 with the home team attacking +y. */
export type Metres = readonly [number, number];
export type PackageRole = 'GK' | 'CB' | 'LB' | 'RB' | 'DM' | 'CM' | 'LW' | 'RW' | 'ST';
export type PackageGrade = 'preferred' | 'acceptable' | 'misread';
export type ChoiceId = 'A' | 'B' | 'C' | 'D';
export type VariantId = 'base' | 'changed';

export interface PackageActor { readonly id: string; readonly team: 'H' | 'A'; readonly role: PackageRole; readonly position_m: Metres }
export interface PackageBranch {
  readonly label: string;
  readonly actor_targets: Readonly<Record<string, Metres>>;
  readonly ball_target: Metres;
  readonly owner_after: string | null;
  readonly feedback: string;
  readonly consequence: string;
}
export interface PackageVariant {
  readonly id: VariantId;
  readonly ball_owner: string;
  readonly ball_position_m: Metres;
  readonly actor_overrides: Readonly<Record<string, Metres>>;
  readonly visible_cues: readonly string[];
  readonly grades: Readonly<Record<ChoiceId, PackageGrade>>;
  readonly branches: Readonly<Record<ChoiceId, PackageBranch>>;
  readonly reason: string;
}
export interface PackageEpisode {
  readonly id: string;
  readonly decision_id: string;
  readonly family_id: string;
  readonly title: string;
  readonly source_ids: readonly string[];
  readonly protagonist_id: string;
  readonly actors: readonly PackageActor[];
  readonly camera_bounds_m: readonly [number, number, number, number];
  readonly field: { readonly width_m: number; readonly length_m: number; readonly home_attack: '+y' };
  readonly geometry_provenance: string;
  readonly status: string;
  readonly approval: { readonly reviewer_name: string; readonly date: string; readonly record: string; readonly basis: string; readonly scope: string; readonly runtime_validation: string };
  readonly variants: readonly PackageVariant[];
  readonly choices: readonly { readonly id: ChoiceId; readonly label: string }[];
}
export interface PackageCurriculumSession { readonly slot: 'A' | 'B' | 'C'; readonly purpose: string; readonly decision_ids: readonly string[]; readonly variant_to_author: string; readonly runtime_ready: boolean }
export interface PackageCurriculumRow { readonly season: 1 | 2; readonly week: number; readonly theme: string; readonly mode: string; readonly status: string; readonly sessions: readonly PackageCurriculumSession[] }

/** Owner decision (PR C answer 1): display bands. Strong and Forced stay unused unless a scenario defines them. */
export type DisplayBand = 'Elite' | 'Strong' | 'Playable' | 'Low-value' | 'Forced';
/** A timeout or a technical failure is recorded as this, never as a band. */
export type NoDecision = 'no-decision';

/** Owner decision (PR C answer 6): broad career category to narrow soccer roles. No goalkeeper. */
export type Category = Position;

/** Structured facing added by PR C (answer 2): a target point the player looks toward, or a unit direction. */
export type Facing = { readonly kind: 'point'; readonly at: Metres } | { readonly kind: 'direction'; readonly dir: Metres };

/** One authored movement sample for an actor or the ball (answer 3). Time in seconds from the decision. */
export interface PathKey { readonly t: number; readonly at: Metres; readonly facing?: Facing }
/** Authored continuation for one choice of one variant; endpoints must equal the package branch targets. */
export interface AuthoredContinuation {
  readonly situationId: string;
  readonly variant: VariantId;
  readonly choice: ChoiceId;
  readonly duration: number;
  readonly actors: Readonly<Record<string, readonly PathKey[]>>;
  readonly ball: readonly PathKey[];
  readonly lesson: string;
}

/** One situation assigned to a learner in a session. */
export interface AssignedSituation {
  readonly situationId: string;
  readonly variant: VariantId;
  readonly packageRole: PackageRole;
  readonly role: RoleId;
  readonly family: string;
}
/** Runtime row for one session and one career category. */
export interface ScheduleRoute {
  readonly sessionId: string;
  readonly season: 1 | 2;
  readonly week: number;
  readonly slot: 'A' | 'B' | 'C';
  readonly category: Category;
  readonly topic: string;
  readonly purpose: string;
  /** Curriculum mode, with its 1-based rank in the package's progression. */
  readonly difficulty: { readonly mode: string; readonly level: number };
  /** Every situation the curriculum lists for the session, in order (the source for the assignment). */
  readonly listed: readonly string[];
  readonly assigned: readonly AssignedSituation[];
  /** Existing game rule: a session opens in its own career week; A, B and C may be played in any order. */
  readonly prerequisite: { readonly careerWeek: number };
  readonly completionKey: string;
  /** Existing credit record: the tt12 run for this week and slot (career/state.ts `tt12Run`). */
  readonly creditKey: string;
  readonly status: 'mapped' | 'blocked';
  readonly blockers: readonly string[];
}
