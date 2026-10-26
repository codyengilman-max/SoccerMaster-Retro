/** Types for the owner's 9v9 Audited Library v1.2 import and the scene sign-off gate. Framework-free. */
import type { RoleId } from '../ref/catalog.mjs';
import type { Fixture } from '../situations/types';

export type LibraryStatus = 'DRAFT_BLOCKED_FOR_PLAYER_TRAINING';

export interface LibraryMeta {
  readonly file: string;
  readonly path: string;
  readonly version: string;
  readonly kind: string;
  readonly sha256: string;
  readonly packageFiles: Readonly<Record<string, string>>;
  readonly uploadZip: string;
  readonly uploadZipSha256: string;
  readonly status: LibraryStatus;
  readonly supersedes: string;
  /** SHA-256 of the pitch proposal + rosters: the rules profile every sign-off is scoped to. */
  readonly rulesSha256: string;
}

export interface LibrarySource {
  readonly id: string;
  readonly url: string;
  readonly origin: string;
  readonly section: string;
  readonly supports: string;
  readonly limitations: string;
  readonly accessed: string;
  readonly verification: string;
}

export interface LibraryRosterActor { readonly id: string; readonly role: string; readonly team: 'H' | 'A' }

export interface LibraryPitch {
  readonly length_yards: number;
  readonly width_yards: number;
  readonly length_m: number;
  readonly width_m: number;
  readonly local_rules_verified: boolean;
}

/** One card exactly as in scenarios.json, plus gameRole and cardSha256 added by the importer. */
export interface LibraryCard {
  readonly id: string;
  readonly title: string;
  readonly role: string;
  readonly phase: string;
  readonly home_formation: string;
  readonly opponent_formation: string;
  readonly protagonist: string;
  readonly ball_owner_at_freeze: string;
  readonly required_visible_actor_ids: readonly string[];
  readonly coordination: string;
  readonly source_ids: readonly string[];
  readonly format_source_ids: readonly string[];
  readonly source_sections: Readonly<Record<string, string>>;
  readonly cue: string;
  readonly preferred_decision: string;
  readonly acceptable_alternative: string;
  readonly misconception: string;
  readonly coach_feedback: string;
  readonly changed_cue_test: string;
  readonly correction: string;
  readonly adaptation_type: string;
  readonly review: {
    readonly structural_desk_review: string;
    readonly independent_coach_approval: string | null;
    readonly geometry_validated: boolean;
    readonly runtime_tested: boolean;
    readonly source_exact: boolean;
  };
  readonly release_status: LibraryStatus;
  readonly required_tests: readonly string[];
  readonly numeric_scene: null;
  readonly gameRole: RoleId;
  readonly cardSha256: string;
}

export interface V { readonly x: number; readonly y: number }

/**
 * A reviewed numeric scene built from one card, in metres on the library's pitch profile (H attacks +y).
 * Every actor is one of the 18 roster actors; every roster actor not shown is listed in omitted with the reason it
 * cannot change the decision. fixture is the presentation the Team Training scene plays; the hash covers both.
 */
export interface NumericScene {
  readonly units: 'm';
  readonly pitch: { readonly length_m: number; readonly width_m: number };
  readonly view: { readonly kind: 'full' | 'half' | 'area'; readonly min: V; readonly max: V };
  readonly actors: readonly { readonly id: string; readonly pos: V; readonly vel: V; readonly facingDeg: number }[];
  readonly omitted: readonly { readonly id: string; readonly reason: string }[];
  readonly ball: { readonly pos: V; readonly vel: V; readonly owner: string | null };
  readonly events: readonly { readonly t: number; readonly kind: string; readonly actor: string }[];
  readonly localRules: string;
}

export interface LibraryScene {
  readonly cardId: string;
  readonly sceneId: string;
  readonly numeric: NumericScene;
  readonly fixture: Fixture;
}

export type ReviewStatus =
  | 'DRAFT_BLOCKED_FOR_PLAYER_TRAINING'
  | 'APPROVED'
  | 'APPROVAL_STALE'
  | 'RETIRED'
  | 'NEEDS_TACTICAL_AUTHORING_REVIEW';

/** Coach Cody's sign-off, scoped to the exact card text, rules profile and scene. */
export interface Signoff {
  readonly cardId: string;
  readonly cardSha256: string;
  readonly rulesSha256: string;
  readonly sceneId: string;
  readonly sceneSha256: string;
  readonly reviewer: string;
  readonly date: string;
  readonly note: string;
}

export interface Review {
  readonly status: ReviewStatus;
  readonly blockers: readonly string[];
}
