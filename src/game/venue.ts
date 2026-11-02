/**
 * Regular-match venue assignment (Moving Camera Venues v2 package, docs/art/venues). Only owner-approved assignments resolve;
 * every other location + game type reports itself as missing instead of guessing from kits or chance.
 */
export const VENUE_IDS = ['pinnacle', 'bell94', 'scottsdale', 'westside'] as const;
export type VenueId = (typeof VENUE_IDS)[number];
/** Player-facing names (package revision 2); the ids above stay the saved/internal keys. */
export const VENUE_NAMES: Readonly<Record<VenueId, string>> = {
  pinnacle: 'Pinnacle Park',
  bell94: 'Dell 94',
  scottsdale: 'Scott\u2019s Complex',
  westside: 'Westside Grounds',
};

export type MatchKind = 'league' | 'tournament' | 'exhibition';
export type VenueSide = 'home' | 'away';

export interface VenueQuery {
  readonly kind: MatchKind;
  /** Batavia's side of the fixture. */
  readonly side: VenueSide;
  readonly opponent?: string;
}

export interface VenueAssignment {
  readonly kind: MatchKind;
  readonly side: VenueSide;
  readonly id: VenueId;
  readonly source: string;
}

export type VenueResolution =
  | { readonly id: VenueId; readonly source: string }
  | { readonly id: null; readonly missing: string };

/** Owner venue rules (final): tournament games first, then Batavia's home league games, then the away rotation. */
export const VENUE_ASSIGNMENTS: readonly VenueAssignment[] = [
  { kind: 'tournament', side: 'home', id: 'scottsdale', source: 'owner rule: every tournament match at Scott\u2019s Complex' },
  { kind: 'tournament', side: 'away', id: 'scottsdale', source: 'owner rule: every tournament match at Scott\u2019s Complex' },
  { kind: 'league', side: 'home', id: 'pinnacle', source: 'owner rule: FC Batavia home league matches at Pinnacle Park' },
];
export const TOURNAMENT_VENUE: VenueId = 'scottsdale';
/** Batavia's away league games cycle through these in fixture order, so each venue gets an equal share. */
export const AWAY_LEAGUE_ROTATION: readonly VenueId[] = ['bell94', 'westside', 'scottsdale'];

export function isVenueId(v: unknown): v is VenueId {
  return typeof v === 'string' && (VENUE_IDS as readonly string[]).includes(v);
}

/**
 * Venue ids for Batavia's league fixtures, given in round order: home games at Pinnacle Park, away games through the
 * rotation. Deterministic (no seed), so the same fixture always gets the same venue.
 */
export function assignLeagueVenues(fixtures: readonly { readonly id: string; readonly bataviaHome: boolean }[]): Record<string, VenueId> {
  const out: Record<string, VenueId> = {};
  let away = 0;
  for (const f of fixtures) out[f.id] = f.bataviaHome ? 'pinnacle' : AWAY_LEAGUE_ROTATION[away++ % AWAY_LEAGUE_ROTATION.length]!;
  return out;
}

/** Tournament rule wins over a saved or home venue; otherwise the fixture's saved venue, then the fixed rules. */
export function resolveVenue(q: VenueQuery & { readonly saved?: unknown }): VenueResolution {
  if (q.kind === 'tournament') return { id: TOURNAMENT_VENUE, source: VENUE_ASSIGNMENTS[0]!.source };
  if (q.kind === 'league' && isVenueId(q.saved)) return { id: q.saved, source: 'saved fixture venue' };
  const hit = VENUE_ASSIGNMENTS.find((a) => a.kind === q.kind && a.side === q.side);
  if (hit) return { id: hit.id, source: hit.source };
  return { id: null, missing: `${q.kind} ${q.side}${q.opponent ? ` vs ${q.opponent}` : ''}: no approved venue assignment` };
}
