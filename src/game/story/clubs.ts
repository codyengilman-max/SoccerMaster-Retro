/** Club world (story package v0.7, club_world.json): design configuration, NOT live league data. */
import raw from '../../../docs/story/v0.7/club_world.json';

export interface Club { readonly id: string; readonly displayName: string; readonly storyRole: string; readonly leagueParticipation: 'unconfigured' | 'not_entered'; readonly nameStatus: string }
export interface ClubEvent { readonly id: string; readonly displayName: string; readonly playableFromAgeBand: 'U12'; readonly standingInvitationClubIds: readonly string[]; readonly otherClubEntryPolicy: 'unconfigured' }
export interface ClubWorld { readonly status: string; readonly contentVersion: string; readonly clubs: readonly Club[]; readonly events: readonly ClubEvent[]; readonly startingClubId: string; readonly proposedAffiliations: Readonly<Record<string, string>> }

export class ClubContentError extends Error {}
const fail = (m: string): never => {
  throw new ClubContentError(m);
};
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 80 && !/[<>{}]/.test(v);

export function parseClubWorld(input: unknown): ClubWorld {
  const w = input as Record<string, unknown>;
  if (typeof w !== 'object' || w === null || w.schemaVersion !== 1) fail('club world: schemaVersion');
  if (w.status !== 'design_configuration_not_live_game_data') fail('club world: must be marked design configuration');
  if (!Array.isArray(w.clubs) || !Array.isArray(w.events)) fail('club world: lists');
  const clubs = (w.clubs as Record<string, unknown>[]).map((c, i) => {
    if (![c.id, c.displayName, c.storyRole, c.nameStatus].every(isStr)) fail(`club[${i}]: fields`);
    if (c.leagueParticipation !== 'unconfigured' && c.leagueParticipation !== 'not_entered') fail(`club[${i}]: league participation must not be invented`);
    return c as unknown as Club;
  });
  const ids = new Set(clubs.map((c) => c.id));
  if (ids.size !== clubs.length) fail('club world: duplicate club');
  const events = (w.events as Record<string, unknown>[]).map((e, i) => {
    if (![e.id, e.displayName].every(isStr) || e.playableFromAgeBand !== 'U12' || e.otherClubEntryPolicy !== 'unconfigured' || e.dates !== null || e.format !== null) fail(`event[${i}]: fields`);
    if (!Array.isArray(e.standingInvitationClubIds) || !e.standingInvitationClubIds.every((x) => ids.has(x as string))) fail(`event[${i}]: invitations`);
    return e as unknown as ClubEvent;
  });
  if (!isStr(w.startingClubId) || !ids.has(w.startingClubId as string)) fail('club world: starting club');
  const aff = (w.proposedAffiliations ?? {}) as Record<string, string>;
  for (const v of Object.values(aff)) if (!ids.has(v)) fail('club world: affiliation');
  return { status: w.status as string, contentVersion: w.contentVersion as string, clubs, events, startingClubId: w.startingClubId as string, proposedAffiliations: aff };
}

export const CLUB_WORLD: ClubWorld = parseClubWorld(raw);
export const clubById = (id: string): Club | undefined => CLUB_WORLD.clubs.find((c) => c.id === id);

/**
 * Entry for an invitational event. U11 may only reference the standing-invitation policy; other
 * routes stay unconfigured. An invitation is never registration or squad selection.
 */
export function eventEntry(eventId: string, clubId: string, ageBand: 'U11' | 'U12'): 'unknown_event' | 'not_until_U12' | 'standing_invitation' | 'unconfigured' {
  const e = CLUB_WORLD.events.find((x) => x.id === eventId);
  if (!e) return 'unknown_event';
  if (ageBand !== 'U12') return 'not_until_U12';
  return e.standingInvitationClubIds.includes(clubId) ? 'standing_invitation' : 'unconfigured';
}
