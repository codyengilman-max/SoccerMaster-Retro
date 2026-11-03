/**
 * Overall strength ranking (review-only default, owner rule pending): an Elo rating from every recorded
 * league and tournament result, in season order, so beating a stronger opponent gains more. Separate
 * from league position (State Cup qualification) and tournament points. Recomputed from saved results,
 * so it is idempotent and never stored. Framework-free and deterministic.
 */
import { leagueFormat, type LeagueFormat, type SeasonLeagueState } from './league';
import { TOURNAMENTS, allFixtures, finalWinner, type TournamentState } from './tournament';
import { weekOfLeagueGame, type TournamentId } from './calendar';

export const STRENGTH_START = 1500;
export const STRENGTH_K = 24;

export interface StrengthRow { readonly team: string; readonly rating: number; readonly rank: number; readonly played: number }

interface Game { readonly home: string; readonly away: string; readonly hs: number; readonly as: number; readonly winner?: string }

/** League round after which a tournament is played (the last league game before its week). */
function roundBefore(fmt: LeagueFormat, week: number): number {
  let round = 0;
  fmt.batavia.forEach((f, i) => {
    if ((weekOfLeagueGame(i + 1) ?? 99) < week) round = Math.max(round, f.round);
  });
  return round;
}

export function strengthTable(league: SeasonLeagueState, cups: Partial<Record<TournamentId, TournamentState>> = {}): readonly StrengthRow[] {
  const rating = new Map<string, number>();
  const played = new Map<string, number>();
  const fmt = leagueFormat(league);
  for (const f of fmt.fixtures) for (const t of [f.home, f.away]) rating.set(t, STRENGTH_START);
  for (const c of Object.values(TOURNAMENTS)) for (const t of c.groups.flat()) rating.set(t, STRENGTH_START);
  const apply = (g: Game): void => {
    const ra = rating.get(g.home)!;
    const rb = rating.get(g.away)!;
    const exp = 1 / (1 + 10 ** ((rb - ra) / 400));
    const score = g.hs > g.as ? 1 : g.hs < g.as ? 0 : 0.5; // a shoot-out counts as a draw
    rating.set(g.home, ra + STRENGTH_K * (score - exp));
    rating.set(g.away, rb - STRENGTH_K * (score - exp));
    for (const t of [g.home, g.away]) played.set(t, (played.get(t) ?? 0) + 1);
  };
  const cupAt = (Object.keys(TOURNAMENTS) as TournamentId[]).map((id) => ({ id, after: roundBefore(fmt, TOURNAMENTS[id].week) }));
  const playCup = (id: TournamentId): void => {
    const t = cups[id];
    if (!t) return;
    for (const f of allFixtures(t)) {
      const r = t.results[f.id];
      if (r) apply({ home: f.home, away: f.away, hs: r.homeGoals, as: r.awayGoals, ...(f.stage === 'final' ? { winner: finalWinner(f, r) } : {}) });
    }
  };
  const rounds = [...new Set(fmt.fixtures.map((f) => f.round))].sort((a, b) => a - b);
  for (const c of cupAt) if (c.after === 0) playCup(c.id);
  for (const round of rounds) {
    for (const f of fmt.fixtures) {
      if (f.round !== round) continue;
      const r = league.results[f.id];
      if (r) apply({ home: f.home, away: f.away, hs: r.homeGoals, as: r.awayGoals });
    }
    for (const c of cupAt) if (c.after === round) playCup(c.id);
  }
  return [...rating.entries()]
    .map(([team, r]) => ({ team, rating: Math.round(r * 10) / 10, played: played.get(team) ?? 0 }))
    .sort((x, y) => y.rating - x.rating || x.team.localeCompare(y.team))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
