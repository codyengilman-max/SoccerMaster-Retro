/**
 * Owner-controlled release manifest: the ONLY place a curriculum level can be approved for players.
 * It lives in the repository (protected by review), never in imported content or saves.
 * Empty until a qualified coach and QA have reviewed a level's exact content and demo assets.
 */
export interface SideApproval { readonly assetHash: string; readonly captionHash: string }
export interface ReleaseApproval {
  readonly levelId: string;
  readonly contentHash: string;
  readonly coachReviewer: string;
  readonly coachReviewDate: string;
  readonly qaReviewer: string;
  readonly qaReviewDate: string;
  readonly evidenceReviewed: boolean;
  readonly rightsReviewed: boolean;
  readonly revoked: boolean;
  readonly approvedRevision: string;
  readonly sides: { readonly left: SideApproval; readonly right: SideApproval };
}

export const RELEASE_APPROVALS: readonly ReleaseApproval[] = [];
