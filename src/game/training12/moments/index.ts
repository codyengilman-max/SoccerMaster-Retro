/**
 * Library adapter and approval gate for Tactical Moments. Scenes are read from the stored drafts; only a scene version
 * with a matching owner approval record (same id, version and content hash), no validation errors and no release
 * blocker can reach player-facing training. Framework-free.
 */
import scenes from '../../../../docs/training/moments/scenes.v2.json';
import approvals from '../../../../docs/training/moments/approvals.json';
import type { VariantId } from '../all36/types';
import type { ApprovalRecord, MomentScene, ReviewStatus } from './schema';
import { releaseBlockers } from './validate';

export const MOMENT_SCENES = scenes as unknown as readonly MomentScene[];
export const MOMENT_APPROVALS = approvals as unknown as readonly ApprovalRecord[];

/** FNV-1a over the scene with its review status removed: approving or flagging a version never changes its hash. */
export function sceneHash(s: MomentScene): string {
  const text = JSON.stringify({ ...s, review: { ...s.review, status: null } });
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

export function momentScene(situationId: string, variant: VariantId): MomentScene | undefined {
  return MOMENT_SCENES.find((s) => s.library.situationId === situationId && s.library.variant === variant);
}

export function approvalFor(s: MomentScene, records: readonly ApprovalRecord[] = MOMENT_APPROVALS): ApprovalRecord | null {
  // The newest record for this exact content wins; a record for older content only reports that it is stale.
  const mine = records.filter((r) => r.sceneId === s.sceneId && r.version === s.version);
  const h = sceneHash(s);
  return [...mine].reverse().find((r) => r.hash === h) ?? mine[mine.length - 1] ?? null;
}

/** The effective review status: the stored draft status, overridden only by an approval record for this exact hash. */
export function effectiveStatus(s: MomentScene, records: readonly ApprovalRecord[] = MOMENT_APPROVALS): ReviewStatus {
  const r = approvalFor(s, records);
  if (!r) return s.review.status === 'APPROVED' ? 'DRAFT' : s.review.status;
  if (r.hash !== sceneHash(s)) return 'CHANGES_REQUESTED';
  return r.status;
}

export function playerFacing(s: MomentScene, records: readonly ApprovalRecord[] = MOMENT_APPROVALS): boolean {
  return effectiveStatus(s, records) === 'APPROVED' && releaseBlockers(s).length === 0;
}

/** The scene a player may see for a weekly assignment, or null (the existing static Weekly Team Training stays). */
export function playerMoment(situationId: string, variant: VariantId, records: readonly ApprovalRecord[] = MOMENT_APPROVALS): MomentScene | null {
  const s = momentScene(situationId, variant);
  return s && playerFacing(s, records) ? s : null;
}
