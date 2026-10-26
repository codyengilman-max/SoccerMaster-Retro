/**
 * Review state for Team Training content. Fails closed: anything without a current sign-off is held out of scored
 * training, and nothing here generates a replacement. Framework-free.
 */
import type { Fixture } from '../situations/types';
import { LIBRARY_V1, LIBRARY_V1_BRIEFS } from './tacticalLibraryV1.generated';
import type { LibraryBrief, Review, Signoff } from './types';

/** Executable scenes built from a library brief, keyed by brief id. None are validated yet. */
export const LIBRARY_SCENES: Readonly<Record<string, Fixture>> = {};

/** Coach Cody's sign-offs. Empty: nothing in the library or the earlier proposals has been approved. */
export const SIGNOFFS: readonly Signoff[] = [];

/** Deterministic content hash (FNV-1a 32-bit over the JSON) pinning a sign-off to one exact scene. Not cryptographic. */
export function contentHash(value: unknown): string {
  const s = JSON.stringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `fnv1a32:${h.toString(16).padStart(8, '0')}`;
}

export function briefById(id: string, briefs: readonly LibraryBrief[] = LIBRARY_V1_BRIEFS): LibraryBrief | null {
  return briefs.find((b) => b.id === id) ?? null;
}

export function briefReview(
  id: string,
  opts: { briefs?: readonly LibraryBrief[]; scenes?: Readonly<Record<string, Fixture>>; signoffs?: readonly Signoff[] } = {},
): Review {
  const brief = briefById(id, opts.briefs);
  if (!brief) return { status: 'NEEDS_TACTICAL_AUTHORING_REVIEW', blockers: [`No brief "${id}" in ${LIBRARY_V1.file}.`] };
  const scene = (opts.scenes ?? LIBRARY_SCENES)[id];
  const signs = (opts.signoffs ?? SIGNOFFS).filter((s) => s.briefId === id);
  const blockers: string[] = [];
  if (!scene) blockers.push(`${id}: no executable scene has been built and validated from this brief.`);
  if (signs.length === 0) blockers.push(`${id}: no Coach Cody sign-off.`);
  const current = signs.find((s) => s.briefSha256 === brief.briefSha256 && !!scene && s.sceneId === scene.id && s.sceneHash === contentHash(scene));
  if (current) return { status: 'APPROVED', blockers: [] };
  if (signs.length > 0) {
    if (signs.every((s) => s.briefSha256 !== brief.briefSha256)) blockers.push(`${id}: library text changed after sign-off; re-review required.`);
    else blockers.push(`${id}: scene changed after sign-off; re-review required.`);
    return { status: 'APPROVAL_STALE', blockers };
  }
  return { status: 'SOURCE_INFORMED_DRAFT', blockers };
}

/** The 40 earlier ts-1 fixtures: v0.5 draft seed text plus Devin-authored setup, answers and feedback. */
export const LEGACY_PROPOSAL_REVIEW: Review = {
  status: 'NEEDS_TACTICAL_AUTHORING_REVIEW',
  blockers: [
    'Earlier ts-1 situations come from v0.5 draft seeds (runtime_ready: false); their positions, choices, grades, outcomes and Coach Code feedback were written by Devin and are not in any library.',
  ],
};
