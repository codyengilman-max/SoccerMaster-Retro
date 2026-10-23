/**
 * Career-world team registry: exactly 120 U11 9v9 teams with permanent IDs. Every fixture, bracket,
 * result, profile and ranking refers to these IDs, never to display names. The 14 established teams
 * (5 local league clubs, Next Horizon, 8 out-of-state tournament visitors) keep their existing IDs;
 * the other 106 are fictional working names. Built by scripts/rankings/build-registry.py.
 * Framework-free.
 */
import raw from './teams.json';

export type TeamOrigin = 'league' | 'out_of_league' | 'out_of_state' | 'fictional';
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
  AL: 'Alabama', AZ: 'Arizona', CA: 'California', CO: 'Colorado', FL: 'Florida', GA: 'Georgia', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana',
  LA: 'Louisiana', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MT: 'Montana', NC: 'North Carolina', NJ: 'New Jersey',
  NM: 'New Mexico', NV: 'Nevada', NY: 'New York', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', WA: 'Washington', WI: 'Wisconsin', WY: 'Wyoming',
};
/** Teams in one background league, in registry order. */
export const leagueTeams = (league: string): readonly string[] => TEAMS.filter((t) => t.league === league).map((t) => t.id);
export const BACKGROUND_LEAGUES: readonly string[] = Object.freeze([...new Set(TEAMS.map((t) => t.league).filter((l): l is string => !!l && l.startsWith('bg_')))]);
