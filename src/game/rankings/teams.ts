/**
 * Career-world team directory: exactly 1,000 U11 9v9 teams (the only age bracket) with permanent IDs.
 * Every fixture, bracket, result, profile and ranking refers to these IDs, never to display names. The
 * 120 version-1 teams keep their IDs, leagues and start ratings; version 2 adds the five owner-requested
 * Arizona clubs and fictional teams in all 50 states. Built by scripts/rankings/build-registry.py and
 * never regenerated at runtime.
 * Framework-free.
 */
import raw from './teams.json';

export type TeamOrigin = 'league' | 'out_of_league' | 'out_of_state' | 'fictional' | 'owner_az';
export type BadgeShape = 'shield' | 'circle' | 'diamond';
export interface WorldTeam {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly state: string;
  readonly region: string;
  readonly category: string;
  /** League ID: 'az_local' is Batavia's league; bg_* are simulated background leagues; null = no league. */
  readonly league: string | null;
  readonly colors: readonly [string, string];
  readonly badge: { readonly shape: BadgeShape; readonly initials: string };
  /** Football strength 1 (strongest) to 5. Drives background simulation only; never the rank. */
  readonly tier: 1 | 2 | 3 | 4 | 5;
  /** Initial ranking rating (Preseason), separate from the tier. */
  readonly rating0: number;
  readonly origin: TeamOrigin;
  /** Short name / abbreviation (e.g. NST). */
  readonly short: string;
  /** Club ID; a club with teams in several age brackets would share it (one bracket today, so it equals the team ID). */
  readonly club: string;
  /** Other spellings that resolve to this team (search only). */
  readonly aliases: readonly string[];
  /** Directory version that added the team. */
  readonly added: 1 | 2;
}

export const REGISTRY_VERSION = raw.version;
export const CATEGORY = raw.category;
export const CATEGORY_LABEL = 'U11 9v9';
export const TEAMS: readonly WorldTeam[] = Object.freeze(raw.teams as unknown as WorldTeam[]);
const BY_ID = new Map(TEAMS.map((t) => [t.id, t]));
export const teamById = (id: string): WorldTeam | undefined => BY_ID.get(id);
export const teamName = (id: string): string => BY_ID.get(id)?.name ?? id;
export const HOME_TEAM = 'batavia';
export const STATES: readonly string[] = Object.freeze([...new Set(TEAMS.map((t) => t.state))].sort());
export const STATE_NAMES: Readonly<Record<string, string>> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida',
  GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine',
  MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska',
  NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};
/** Teams in one background league, in registry order. */
export const leagueTeams = (league: string): readonly string[] => TEAMS.filter((t) => t.league === league).map((t) => t.id);
const norm = (x: string): string => x.toLowerCase().replace(/[^a-z0-9]/g, '');
const BY_NAME = new Map(TEAMS.flatMap((t) => [t.name, ...t.aliases].map((n) => [norm(n), t.id] as const)));
/** Resolves a display name or known alias (e.g. "Batavia", "Batavia FC") to its team ID. */
export const teamIdForName = (name: string): string | undefined => BY_NAME.get(norm(name));
export const BACKGROUND_LEAGUES: readonly string[] = Object.freeze([...new Set(TEAMS.map((t) => t.league).filter((l): l is string => !!l && l.startsWith('bg')))]);
/** Background leagues of directory version 1 (their fixtures and showcase pairings are unchanged by version 2). */
export const V1_LEAGUES: ReadonlySet<string> = new Set(TEAMS.filter((t) => t.added === 1).map((t) => t.league).filter((l): l is string => !!l && l.startsWith('bg_')));
