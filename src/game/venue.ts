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

export const VENUE_ASSIGNMENTS: readonly VenueAssignment[] = [
  { kind: 'league', side: 'home', id: 'pinnacle', source: 'venue-layouts.json: Pinnacle Park homeFor "FC Batavia"' },
];

export function isVenueId(v: unknown): v is VenueId {
  return typeof v === 'string' && (VENUE_IDS as readonly string[]).includes(v);
}

export function resolveVenue(q: VenueQuery): VenueResolution {
  const hit = VENUE_ASSIGNMENTS.find((a) => a.kind === q.kind && a.side === q.side);
  if (hit) return { id: hit.id, source: hit.source };
  return { id: null, missing: `${q.kind} ${q.side}${q.opponent ? ` vs ${q.opponent}` : ''}: no approved venue assignment` };
}
