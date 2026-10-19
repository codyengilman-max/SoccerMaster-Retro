/**
 * Season One calendar (story package v1.0): 18 relative game weeks. Weeks 1–2 arrival/preseason,
 * league games 1–6 in weeks 3–8, Scottsdale Starter Cup in week 9, recovery in week 10, Desert Lights
 * Cup in week 11, reset in week 12, league games 7–12 in weeks 13–18. Parent scenes in even weeks.
 */
export type WeekKind = 'arrival' | 'preseason' | 'league' | 'tournament' | 'recovery' | 'reset';
export type TournamentId = 'starter_cup' | 'desert_lights';

export interface SeasonWeek {
  readonly week: number;
  readonly title: string;
  readonly kind: WeekKind;
  /** League game number 1–12, or null. */
  readonly leagueGame: number | null;
  readonly tournament: TournamentId | null;
  readonly parent: boolean;
}

const RAW: readonly [string, WeekKind, number | null, TournamentId | null][] = [
  ['Nobody Knows You Here', 'arrival', null, null],
  ['No Borrowed Reputation', 'preseason', null, null],
  ['The First Receipt', 'league', 1, null],
  ['A Seat at the Table', 'league', 2, null],
  ['The Work Nobody Sees', 'league', 3, null],
  ['Two Names, One Opportunity', 'league', 4, null],
  ['Who Gets the Credit?', 'league', 5, null],
  ['The Cost of Being Seen', 'league', 6, null],
  ['Everybody Has a Badge', 'tournament', null, 'starter_cup'],
  ['When the Noise Stops', 'recovery', null, null],
  ['The Second Test', 'tournament', null, 'desert_lights'],
  ['The Choice Behind the Choice', 'reset', null, null],
  ['They Know Your Name Now', 'league', 7, null],
  ['Say It to My Face', 'league', 8, null],
  ['Make Room', 'league', 9, null],
  ['The Honest Conversation', 'league', 10, null],
  ['One More Week', 'league', 11, null],
  ['A Place You Earn', 'league', 12, null],
];

export const SEASON_WEEKS: readonly SeasonWeek[] = Object.freeze(
  RAW.map(([title, kind, leagueGame, tournament], i) => Object.freeze({ week: i + 1, title, kind, leagueGame, tournament, parent: (i + 1) % 2 === 0 })),
);
export const SEASON_LENGTH = SEASON_WEEKS.length;
export const seasonWeek = (week: number): SeasonWeek | null => SEASON_WEEKS[week - 1] ?? null;
/** Week of a league game number (1–12). */
export const weekOfLeagueGame = (game: number): number | null => SEASON_WEEKS.find((w) => w.leagueGame === game)?.week ?? null;
/** Stable featured scene-slot IDs for a week: M, S, C, F, and P on even weeks (81 across the season). */
export function slotIds(week: number): readonly string[] {
  const w = seasonWeek(week);
  if (!w) return [];
  const p = `S1_W${String(week).padStart(2, '0')}_`;
  return [`${p}M`, `${p}S`, `${p}C`, `${p}F`, ...(w.parent ? [`${p}P`] : [])];
}
