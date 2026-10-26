/** Records for the owner-supplied 9v9 Tactical Situation Library v1. Framework-free. */

export interface LibraryMeta {
  readonly file: string;
  readonly path: string;
  readonly version: string;
  /** SHA-256 of the committed library markdown. */
  readonly sha256: string;
  readonly uploadZip: string;
  readonly uploadZipSha256: string;
  readonly status: 'SOURCE_INFORMED_DRAFT';
  readonly adaptationType: 'authored_9v9_brief';
}

export interface LibrarySourceRef {
  readonly id: string;
  readonly citation: string;
  readonly supports: string;
  readonly url: string;
}

/** One brief, field text verbatim from the library. */
export interface LibraryBrief {
  readonly id: string;
  readonly title: string;
  /** Squad role id ('6' for DM, '8' for CM, '9' for ST). */
  readonly role: string;
  readonly sourceIds: readonly string[];
  /** The whole brief paragraph, verbatim. */
  readonly text: string;
  readonly setup: string;
  readonly preferredCondition: string;
  readonly acceptableAlternative: string;
  readonly misconception: string;
  readonly teamResponse: string;
  readonly coachFeedback: string;
  readonly counterfactualTest: string;
  readonly mirrorOf: string | null;
  /** SHA-256 of `text`; any source edit changes it and voids sign-offs. */
  readonly briefSha256: string;
}

/**
 * SOURCE_INFORMED_DRAFT: library text only, no validated scene, no sign-off.
 * APPROVED: Coach Cody signed off this brief text and this exact scene.
 * APPROVAL_STALE: a sign-off exists but the brief or scene changed since.
 * NEEDS_TACTICAL_AUTHORING_REVIEW: content not established by any library source.
 */
export type ReviewStatus = 'SOURCE_INFORMED_DRAFT' | 'APPROVED' | 'APPROVAL_STALE' | 'NEEDS_TACTICAL_AUTHORING_REVIEW';

/** Coach Cody's sign-off on one brief and one executable scene, pinned to both hashes. */
export interface Signoff {
  readonly briefId: string;
  readonly briefSha256: string;
  readonly sceneId: string;
  readonly sceneHash: string;
  readonly reviewer: string;
  readonly date: string;
  readonly note: string;
}

export interface Review {
  readonly status: ReviewStatus;
  /** Exact reasons the content cannot be scored. Empty only when APPROVED. */
  readonly blockers: readonly string[];
}
