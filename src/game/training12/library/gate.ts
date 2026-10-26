/**
 * Scored Team Training gate. A session route plays only approved library scenes; otherwise it reports the exact
 * blockers and nothing can be credited. No fallback to the earlier proposals or to generated drills. Framework-free.
 */
import type { RoleId } from '../ref/catalog.mjs';
import { sessions } from '../ref/seasons.mjs';
import type { Moment, RoutePlan } from '../situations';
import type { Fixture } from '../situations/types';
import { MOMENTS_PER_ROUND } from '../situations/session';
import { LIBRARY } from './tacticalLibrary.generated';
import { cardById, cardReview, LIBRARY_SCENES, type ReviewOpts } from './review';

/**
 * Approved session -> card assignments. Empty: v1.2 states the 108-session assignment is a separate curriculum task,
 * and none is approved, so none is invented here.
 */
export const SESSION_CARDS: Readonly<Record<string, Partial<Record<RoleId, readonly string[]>>>> = {};

export type Gate =
  | { readonly ok: true; readonly plan: RoutePlan; readonly scenes: readonly Fixture[] }
  | { readonly ok: false; readonly blockers: readonly string[] };

export interface GateOpts extends ReviewOpts {
  readonly mapping?: Readonly<Record<string, Partial<Record<RoleId, readonly string[]>>>>;
}

export function scoredSession(sessionId: string, role: RoleId, opts: GateOpts = {}): Gate {
  const s = sessions.find((x) => x.id === sessionId);
  if (!s) return { ok: false, blockers: [`Session ${sessionId} is not in the schedule.`] };
  const route = s.roleRoutes[role];
  if (!route) return { ok: false, blockers: [`Session ${sessionId} has no ${role} route.`] };
  if (role === 'GK') return { ok: false, blockers: [`${LIBRARY.file} v${LIBRARY.version} has no goalkeeper decision sessions (GK01–GK03 retired).`] };
  const ids = (opts.mapping ?? SESSION_CARDS)[sessionId]?.[role];
  if (!ids || ids.length === 0)
    return { ok: false, blockers: [`No approved situation is mapped to ${sessionId} for ${role}. ${LIBRARY.file} v${LIBRARY.version} has no session assignment and none of its cards is approved yet.`] };
  const blockers: string[] = [];
  if (ids.length !== MOMENTS_PER_ROUND) blockers.push(`${sessionId} ${role} maps ${ids.length} card(s); a round needs exactly ${MOMENTS_PER_ROUND} approved moments.`);
  const scenes: Fixture[] = [];
  for (const id of ids) {
    const card = cardById(id, opts.cards);
    if (card && card.gameRole !== role) blockers.push(`${id} is a ${card.gameRole} card, not ${role}.`);
    const r = cardReview(id, opts);
    if (r.status !== 'APPROVED') blockers.push(...r.blockers);
    else scenes.push((opts.scenes ?? LIBRARY_SCENES)[id]!.fixture);
  }
  if (blockers.length > 0) return { ok: false, blockers };
  const moments: Moment[] = scenes.map((f) => ({ fixtureId: f.id, mirrored: false, fit: 'family' }));
  return { ok: true, scenes, plan: { sessionId, role, family: route.family, moments, fit: 'direct' } };
}
