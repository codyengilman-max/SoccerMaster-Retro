/**
 * Tactical Moments scene schema (v1). A scene is a versioned, reviewable movement definition stored alongside, never
 * over, one All36 library record (situation + variant). World space: metres on the package field (x across from the
 * left touchline, y up the pitch from the home goal line, home attacking +y); time in seconds. Framework-free.
 */
import type { ChoiceId, Metres, PackageGrade, PackageRole, VariantId } from '../all36/types';

export const MOMENTS_SCHEMA = 'tactical-moments.v1';

/** Review workflow (owner brief §8). Only the owner moves a version to APPROVED, through an approval record. */
export type ReviewStatus = 'DRAFT' | 'READY_FOR_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED';

/** Supplied sheet actions only (team-training-v1): no tackle, dive, header or front/back facings exist. */
export type MoveAction = 'stand' | 'run' | 'shuffle' | 'pass' | 'receive' | 'keeper-ready';
/** Anatomical contact foot. 'unverified' until the sheet's contact metadata is owner-reviewed (never inferred from facing). */
export type Foot = 'right' | 'left' | 'unverified';

/** One timed waypoint. Between keys the actor moves in a straight line at constant speed (no teleport: keys are continuous). */
export interface ActorKey {
  readonly t: number;
  readonly at: Metres;
  /** What the body does while travelling from the previous key to this one (or holds at the first key). */
  readonly action: MoveAction;
  /** Where the body looks at this key: a point in metres (the sheets face right three-quarter and are mirrored). */
  readonly look: Metres;
}
export interface ActorTrack {
  readonly id: string;
  readonly purpose: string;
  readonly keys: readonly ActorKey[];
}

/** Ball events on the shared clock. A `pass`/`shot` contact time is when the striking foot meets the ball. */
export type BallEvent =
  | { readonly kind: 'held'; readonly t: number; readonly by: string }
  | { readonly kind: 'carry'; readonly t0: number; readonly t1: number; readonly by: string; readonly touches: readonly { readonly t: number; readonly foot: Foot }[] }
  | { readonly kind: 'pass'; readonly t: number; readonly by: string; readonly foot: Foot; readonly to: Metres; readonly arrive: number; readonly receiver: string | null }
  | { readonly kind: 'receive'; readonly t: number; readonly by: string; readonly foot: Foot }
  | { readonly kind: 'roll'; readonly t0: number; readonly t1: number; readonly from: Metres; readonly to: Metres }
  | { readonly kind: 'loose'; readonly t: number; readonly at: Metres };

export interface Timeline {
  readonly duration: number;
  readonly actors: readonly ActorTrack[];
  readonly ball: readonly BallEvent[];
}

export interface Annotation {
  readonly kind: 'arrow' | 'space';
  readonly from?: Metres;
  readonly to?: Metres;
  readonly at?: Metres;
  readonly radius?: number;
  readonly note: string;
  /** Which reviewed field supports it (cue text or branch target); unsupported annotations are not drawn. */
  readonly support: string;
}

export interface MomentAction {
  readonly id: ChoiceId;
  readonly label: string;
  /** Decision quality from the approved package (never from the outcome). */
  readonly grade: PackageGrade;
  readonly rubric: string;
  /** Optional numbered field marker matching the button, placed on the option's target. */
  readonly marker: Metres | null;
}

export interface OutcomeBranch {
  readonly choice: ChoiceId;
  /** Kind of consequence the package endpoint describes. */
  readonly kind: 'pass' | 'carry' | 'collect' | 'hold' | 'off-ball' | 'turnover' | 'loose';
  readonly timeline: Timeline;
  /** The package branch this demonstrates (endpoints must equal it). */
  readonly packageTarget: { readonly ball: Metres; readonly ownerAfter: string | null; readonly actors: Readonly<Record<string, Metres>> };
  readonly whatChanged: string;
  readonly feedback: string;
  readonly consequence: string;
  readonly stop: string;
  readonly annotations: readonly Annotation[];
}

export interface Gap {
  readonly actor: string | null;
  readonly phase: 'watch' | 'branch';
  readonly choice?: ChoiceId;
  readonly need: string;
  readonly blocksRelease: boolean;
}

export interface MomentScene {
  readonly schema: typeof MOMENTS_SCHEMA;
  readonly sceneId: string;
  readonly version: number;
  readonly library: { readonly situationId: string; readonly variant: VariantId; readonly libraryVersion: string; readonly archiveSha256: string; readonly familyId: string; readonly title: string };
  readonly sources: readonly string[];
  readonly objective: string;
  readonly brief: string;
  readonly protagonist: { readonly actorId: string; readonly role: PackageRole };
  readonly formation: '1-3-2-3';
  readonly attack: '+y';
  readonly field: { readonly width: number; readonly length: number; readonly convention: string };
  readonly camera: readonly [number, number, number, number];
  readonly actors: readonly { readonly id: string; readonly team: 'H' | 'A'; readonly role: PackageRole; readonly start: Metres; readonly decision: Metres }[];
  readonly ball: { readonly start: Metres; readonly decision: Metres; readonly ownerAtDecision: string | null };
  readonly cues: readonly string[];
  readonly watch: Timeline;
  readonly slow: { readonly from: number; readonly rate: number; readonly cue: string };
  readonly decision: { readonly t: number; readonly freeze: string; readonly pause: 'full' };
  readonly actions: readonly MomentAction[];
  readonly branches: Readonly<Record<ChoiceId, OutcomeBranch>>;
  readonly reason: string;
  readonly variations: readonly string[];
  readonly assets: { readonly required: readonly string[]; readonly gaps: readonly Gap[] };
  /** Version notes, newest last. */
  readonly history: readonly string[];
  readonly review: { readonly status: ReviewStatus; readonly assumptions: readonly string[]; readonly conflicts: readonly string[]; readonly author: string };
}

/** Owner approval of one exact scene version (content hash). Material changes produce a new hash and void it. */
export interface ApprovalRecord {
  readonly sceneId: string;
  readonly version: number;
  readonly hash: string;
  readonly status: 'APPROVED' | 'CHANGES_REQUESTED';
  readonly reviewer: string;
  readonly date: string;
  readonly note: string;
}
