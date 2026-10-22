/**
 * Read-only view of a saved tournament for the results screen: every name, score, point and
 * outcome comes from the recorded TournamentState. Nothing here decides or invents a result.
 */
import { HOME, TOURNAMENTS, allFixtures, bataviaFinish, finalFixture, groupTable, nextBataviaFixture, type Finish, type TournamentState } from './tournament';

export type BoardOutcome = 'pending' | 'in_final' | 'champion' | 'runner_up' | 'eliminated';
export interface BoardRow { readonly position: number; readonly team: string; readonly name: string; readonly played: number; readonly won: number; readonly drawn: number; readonly lost: number; readonly points: number; readonly home: boolean }
export interface BoardGroup { readonly label: string; readonly rows: readonly BoardRow[]; readonly complete: boolean }
export interface BoardResult { readonly stage: string; readonly homeName: string; readonly awayName: string; readonly homeGoals: number; readonly awayGoals: number; /** Name of the shoot-out winner when a final ended level. */ readonly shootoutWinner?: string }
export interface TournamentBoard {
  readonly id: TournamentState['id'];
  readonly name: string;
  readonly groups: readonly [BoardGroup, BoardGroup];
  readonly lastResult: BoardResult | null;
  readonly next: { readonly stage: string; readonly opponent: string } | null;
  readonly outcome: BoardOutcome;
  readonly headline: string;
}

const STAGE: Readonly<Record<string, string>> = { g1: 'Group game 1', g2: 'Group game 2', g3: 'Group game 3', final: 'Final' };
const HEADLINE: Readonly<Record<BoardOutcome, string>> = {
  pending: 'Group stage in progress',
  in_final: 'Through to the final',
  champion: 'Champions',
  runner_up: 'Runners-up',
  eliminated: 'Out at the group stage',
};

export function outcomeOf(s: TournamentState): BoardOutcome {
  const finish: Finish | null = bataviaFinish(s);
  if (finish === 'champion' || finish === 'runner_up') return finish;
  if (finish) return 'eliminated';
  const f = finalFixture(s);
  return f && (f.home === HOME || f.away === HOME) ? 'in_final' : 'pending';
}

export function tournamentBoard(s: TournamentState): TournamentBoard {
  const cfg = TOURNAMENTS[s.id];
  const name = (id: string): string => cfg.teams[id]?.name ?? id;
  const group = (g: 0 | 1): BoardGroup => {
    const t = groupTable(s, g);
    return { label: `Group ${g === 0 ? 'A' : 'B'}`, complete: t.complete, rows: t.rows.map((r) => ({ position: r.position, team: r.team, name: name(r.team), played: r.played, won: r.won, drawn: r.drawn, lost: r.lost, points: r.points, home: r.team === HOME })) };
  };
  let lastResult: BoardResult | null = null;
  for (const f of allFixtures(s)) {
    const r = s.results[f.id];
    if (r && (f.home === HOME || f.away === HOME)) lastResult = { stage: STAGE[f.stage] ?? f.stage, homeName: name(f.home), awayName: name(f.away), homeGoals: r.homeGoals, awayGoals: r.awayGoals, ...(r.shootoutWinner ? { shootoutWinner: name(r.shootoutWinner) } : {}) };
  }
  const n = nextBataviaFixture(s);
  const outcome = outcomeOf(s);
  return {
    id: s.id,
    name: cfg.name,
    groups: [group(0), group(1)],
    lastResult,
    next: n ? { stage: STAGE[n.stage] ?? n.stage, opponent: name(n.home === HOME ? n.away : n.home) } : null,
    outcome,
    headline: HEADLINE[outcome],
  };
}
