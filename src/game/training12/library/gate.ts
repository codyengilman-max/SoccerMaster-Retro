/**
 * Scored Team Training gate. A session route plays only approved library scenes; otherwise it reports the exact
 * blockers and nothing can be credited. No fallback to the earlier proposals or to generated drills. Framework-free.
 */
import type { RoleId } from '../ref/catalog.mjs';
import { sessions } from '../ref/seasons.mjs';
import type { Moment, RoutePlan } from '../situations';
import type { Fixture } from '../situations/types';
import { LIBRARY_V1 } from './tacticalLibraryV1.generated';
import { briefReview, LIBRARY_SCENES, SIGNOFFS } from './review';
import type { LibraryBrief, Signoff } from './types';

/**
 * Approved session-to-brief mapping (sessionId → role → brief ids). Empty: the library is "not a full 108-session
 * mapping", and no mapping has been approved.
 */
export const SESSION_BRIEFS: Readonly<Record<string, Partial<Record<RoleId, readonly string[]>>>> = {};

export type Gate =
  | { readonly ok: true; readonly plan: RoutePlan; readonly scenes: readonly Fixture[] }
  | { readonly ok: false; readonly blockers: readonly string[] };

export interface GateOpts {
  readonly mapping?: Readonly<Record<string, Partial<Record<RoleId, readonly string[]>>>>;
  readonly briefs?: readonly LibraryBrief[];
  readonly scenes?: Readonly<Record<string, Fixture>>;
  readonly signoffs?: readonly Signoff[];
}

export function scoredSession(sessionId: string, role: RoleId, opts: GateOpts = {}): Gate {
  const s = sessions.find((x) => x.id === sessionId);
  if (!s) return { ok: false, blockers: [`Session ${sessionId} is not in the schedule.`] };
  const route = s.roleRoutes[role];
  if (!route) return { ok: false, blockers: [`Session ${sessionId} has no ${role} route.`] };
  const ids = (opts.mapping ?? SESSION_BRIEFS)[sessionId]?.[role];
  if (!ids || ids.length === 0) {
    return { ok: false, blockers: [`No approved situation is mapped to ${sessionId} for ${role}. ${LIBRARY_V1.file} v${LIBRARY_V1.version} has no session mapping and none of its briefs is approved yet.`] };
  }
  const blockers: string[] = [];
  const scenes: Fixture[] = [];
  for (const id of ids) {
    const r = briefReview(id, opts);
    if (r.status !== 'APPROVED') blockers.push(...r.blockers);
    else scenes.push((opts.scenes ?? LIBRARY_SCENES)[id]!);
  }
  if (blockers.length > 0) return { ok: false, blockers };
  const moments: Moment[] = scenes.map((f) => ({ fixtureId: f.id, mirrored: false, fit: 'family' }));
  return { ok: true, scenes, plan: { sessionId, role, family: route.family, moments, fit: 'direct' } };
}

export { SIGNOFFS };
