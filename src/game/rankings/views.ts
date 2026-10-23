/** Read-only view models for the rankings screens: derived from saved state, never stored. Framework-free. */
import { HOME_CLUB } from '../league/league';
import { SEASON_FIXTURES, opponentOf, seasonTable, type SeasonFixture, type SeasonLeagueState } from '../season/league';
import { BG_FIXTURES } from './background';
import { ROUND_WEEK, nationalTable, stateTable, worldResults, type RankRow, type RankingsState, type StoryResults, type WorldResult } from './ratings';
import { STATE_NAMES, TEAMS, teamById } from './teams';

export interface StandingRow {
  readonly rank: number;
  readonly club: string;
  readonly played: number; readonly won: number; readonly drawn: number; readonly lost: number;
  readonly goalsFor: number; readonly goalsAgainst: number; readonly goalDiff: number; readonly points: number;
}
/** League table, 3/1/0, ordered by points, goal difference, goals scored. Teams level on all three share a rank (the existing name order only fixes display). */
export function leagueStandings(lg: SeasonLeagueState | null): { started: boolean; rows: readonly StandingRow[] } {
  const base = lg ? seasonTable(lg) : [];
  const started = base.some((r) => r.played > 0);
  let rank = 0;
  const rows = base.map((r, i, all) => {
    const p = all[i - 1];
    const tied = !!p && p.points === r.points && p.goalsFor - p.goalsAgainst === r.goalsFor - r.goalsAgainst && p.goalsFor === r.goalsFor;
    rank = tied ? rank : i + 1;
    return { rank, club: r.club, played: r.played, won: r.won, drawn: r.drawn, lost: r.lost, goalsFor: r.goalsFor, goalsAgainst: r.goalsAgainst, goalDiff: r.goalsFor - r.goalsAgainst, points: r.points };
  });
  return { started, rows };
}

const stateOf = (id: string): string | undefined => teamById(id)?.state;
export const scopeTable = (s: RankingsState, scope: 'national' | string, snapIndex = s.snapshots.length - 1): readonly RankRow[] =>
  scope === 'national' ? nationalTable(s.snapshots[snapIndex]!) : stateTable(s.snapshots[snapIndex]!, scope, stateOf);
export const stateCount = (state: string): number => TEAMS.filter((t) => t.state === state).length;
export const stateLabel = (state: string): string => STATE_NAMES[state] ?? state;

/** Search filters rows but keeps each row's real rank. */
export function searchRows(rows: readonly RankRow[], query: string): readonly RankRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => {
    const t = teamById(r.team);
    return !!t && [t.name, t.city, t.state, stateLabel(t.state)].some((x) => x.toLowerCase().includes(q));
  });
}
/** Index of the first row to show so that `team` sits in the middle of a page of `n`. */
export function aroundStart(rows: readonly RankRow[], team: string, n: number): number {
  const i = rows.findIndex((r) => r.team === team);
  return i < 0 ? 0 : Math.max(0, Math.min(rows.length - n, i - Math.floor(n / 2)));
}

/** Rank in every published snapshot (index 0 = Preseason). */
export function rankHistory(s: RankingsState, team: string, scope: 'national' | string): readonly { readonly week: number; readonly rank: number }[] {
  return s.snapshots.map((sn, i) => ({ week: sn.week, rank: scopeTable(s, scope, i).find((r) => r.team === team)?.rank ?? 0 })).filter((x) => x.rank > 0);
}

/** Batavia's next league opponent: its earliest fixture without a saved result. */
export function nextLeagueFixture(lg: SeasonLeagueState | null): SeasonFixture | null {
  return SEASON_FIXTURES.filter((f) => f.home === HOME_CLUB || f.away === HOME_CLUB).find((f) => !lg?.results[f.id]) ?? null;
}
export const nextOpponent = (lg: SeasonLeagueState | null): string | null => {
  const f = nextLeagueFixture(lg);
  return f ? opponentOf(f) : null;
};

export const COMP_LABEL: Readonly<Record<WorldResult['competition'], string>> = { league: 'League', tournament: 'Tournament', state_cup: 'State Cup', bg_league: 'League (simulated)', bg_showcase: 'Showcase (simulated)' };
export interface ResultLine { readonly week: number; readonly comp: string; readonly opponent: string; readonly home: boolean; readonly us: number; readonly them: number; readonly outcome: 'W' | 'D' | 'L'; readonly note: string; readonly counted: boolean }
/** Saved results for one team, newest first; a shoot-out is shown but the result is a draw for ratings. */
export function teamResults(s: RankingsState, story: StoryResults, team: string): readonly ResultLine[] {
  const counted = new Set(s.applied.map((a) => a.id));
  return worldResults(story, s.background).filter((r) => r.home === team || r.away === team).map((r) => {
    const home = r.home === team;
    const us = home ? r.homeGoals : r.awayGoals;
    const them = home ? r.awayGoals : r.homeGoals;
    return { week: r.week, comp: COMP_LABEL[r.competition], opponent: home ? r.away : r.home, home, us, them, outcome: us > them ? 'W' : us < them ? 'L' : 'D', note: r.shootoutWinner ? (r.shootoutWinner === team ? 'won shoot-out' : 'lost shoot-out') : '', counted: counted.has(r.id) } as ResultLine;
  }).reverse();
}
export interface UpcomingLine { readonly week: number; readonly comp: string; readonly opponent: string; readonly home: boolean }
/** Scheduled fixtures with no saved result yet. */
export function upcoming(s: RankingsState, story: StoryResults, team: string, limit = 3): readonly UpcomingLine[] {
  const out: UpcomingLine[] = [];
  for (const f of SEASON_FIXTURES) if ((f.home === team || f.away === team) && !story.league?.results[f.id]) out.push({ week: ROUND_WEEK.get(f.round)!, comp: 'League', opponent: f.home === team ? f.away : f.home, home: f.home === team });
  for (const f of BG_FIXTURES) if ((f.home === team || f.away === team) && !s.background[f.id] && f.week >= s.startWeek) out.push({ week: f.week, comp: COMP_LABEL[f.competition], opponent: f.home === team ? f.away : f.home, home: f.home === team });
  return out.sort((a, b) => a.week - b.week).slice(0, limit);
}
