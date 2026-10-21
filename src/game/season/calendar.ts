/**
 * Season One calendar (owner storyboard "A Place on the Field", 2026-10-21): 18 relative game weeks.
 * Weeks 1–2 arrival/preseason, league games 1–6 in weeks 3–8, AZ Showcase in week 9, league games 7–8
 * in weeks 10–11, Holiday Classic in week 12, league games 9–12 in weeks 13–16, Arizona State Cup
 * semifinals in week 17 and final in week 18. Mom's deeper talks: weeks 1, 4, 7, 9, 12, 16, then the
 * week 18 family decision. Week 14 adds a non-league friendly against Next Horizon (Blake's new club).
 */
export type WeekKind = 'arrival' | 'preseason' | 'league' | 'tournament' | 'state_cup';
export type TournamentId = 'az_showcase' | 'holiday_classic';

export interface SeasonWeek {
  readonly week: number;
  readonly title: string;
  readonly kind: WeekKind;
  /** League game number 1–12, or null. */
  readonly leagueGame: number | null;
  readonly tournament: TournamentId | null;
  /** Extra non-league match that week (week 14: Blake's new club, owner 2026-10-21). Never league points. */
  readonly friendly: 'next_horizon' | null;
  readonly parent: boolean;
}

/** Mom's deeper conversations (storyboard), followed by the week 18 family decision. */
export const PARENT_WEEKS: readonly number[] = Object.freeze([1, 4, 7, 9, 12, 16, 18]);
function parentWeek(week: number): boolean {
  return PARENT_WEEKS.includes(week);
}

/** Week 14: a "friendly" that's not really friendly against Next Horizon, alongside league game 10. */
const FRIENDLIES: Readonly<Record<number, 'next_horizon'>> = { 14: 'next_horizon' };

const RAW: readonly [string, WeekKind, number | null, TournamentId | null][] = [
  ["You Don't Know Anybody Yet", 'arrival', null, null],
  ['Nobody Saved You a Spot', 'preseason', null, null],
  ['When It Counts', 'league', 1, null],
  ['Everybody Wants Something', 'league', 2, null],
  ['Starting to Believe', 'league', 3, null],
  ['People Notice', 'league', 4, null],
  ['Whose Side?', 'league', 5, null],
  ['Losing the Room', 'league', 6, null],
  ['Bigger Names', 'tournament', null, 'az_showcase'],
  ['New Badge, Same Blake', 'league', 7, null],
  ['Who Am I Doing This For?', 'league', 8, null],
  ['What We Can Afford', 'tournament', null, 'holiday_classic'],
  ['Questions Worth Asking', 'league', 9, null],
  ['Next Horizon', 'league', 10, null],
  ['Monday Still Comes', 'league', 11, null],
  ['Finish What You Started', 'league', 12, null],
  ['Four Teams Left', 'state_cup', null, null],
  ['What Comes Next', 'state_cup', null, null],
];

export const SEASON_WEEKS: readonly SeasonWeek[] = Object.freeze(
  RAW.map(([title, kind, leagueGame, tournament], i) => Object.freeze({ week: i + 1, title, kind, leagueGame, tournament, friendly: FRIENDLIES[i + 1] ?? null, parent: parentWeek(i + 1) })),
);
export const SEASON_LENGTH = SEASON_WEEKS.length;
export const seasonWeek = (week: number): SeasonWeek | null => SEASON_WEEKS[week - 1] ?? null;
/** Week of a league game number (1–12). */
export const weekOfLeagueGame = (game: number): number | null => SEASON_WEEKS.find((w) => w.leagueGame === game)?.week ?? null;
/** Stable featured scene-slot IDs for a week: M, S, C, F, and P in parent weeks (79 across the season). */

export function slotIds(week: number): readonly string[] {
  const w = seasonWeek(week);
  if (!w) return [];
  const p = `S1_W${String(week).padStart(2, '0')}_`;
  return [`${p}M`, `${p}S`, `${p}C`, `${p}F`, ...(w.parent ? [`${p}P`] : [])];
}
