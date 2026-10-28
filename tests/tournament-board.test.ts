import { describe, expect, it } from 'vitest';
import { HOME, TOURNAMENTS, bataviaFinish, nextBataviaFixture, newTournament, recordTournamentPlayed, type TournamentState } from '../src/game/season/tournament';
import { outcomeOf, tournamentBoard } from '../src/game/season/tournamentBoard';

const play = (s: TournamentState, us: number, them: number): TournamentState => {
  const f = nextBataviaFixture(s)!;
  const r = recordTournamentPlayed(s, f.id, us, them);
  if (!r.ok) throw new Error(r.error);
  return r.state;
};

describe('tournament results board', () => {
  it('a fresh tournament is pending with no invented result', () => {
    const b = tournamentBoard(newTournament('az_showcase', 'c1', 7));
    expect(b.outcome).toBe('pending');
    expect(b.lastResult).toBeNull();
    expect(b.next?.stage).toBe('Group game 1');
    expect(b.groups[0].rows.every((r) => r.played === 0 && r.points === 0)).toBe(true);
    expect(b.groups[0].rows.some((r) => r.home)).toBe(true);
  });

  it('names and scores come from the recorded state', () => {
    const s = play(newTournament('holiday_classic', 'c1', 3), 2, 1);
    const b = tournamentBoard(s);
    const names = Object.values(TOURNAMENTS.holiday_classic.teams).map((t) => t.name);
    for (const g of b.groups) for (const r of g.rows) expect(names).toContain(r.name);
    expect(b.lastResult).not.toBeNull();
    const ours = b.lastResult!.homeName === TOURNAMENTS.holiday_classic.teams[HOME]!.name ? [b.lastResult!.homeGoals, b.lastResult!.awayGoals] : [b.lastResult!.awayGoals, b.lastResult!.homeGoals];
    expect(ours).toEqual([2, 1]);
    expect(b.outcome).toBe('pending');
  });

  it('three heavy wins reach the final, then a win is champion', () => {
    let s = newTournament('az_showcase', 'c1', 11);
    for (let i = 0; i < 3; i++) s = play(s, 9, 0);
    expect(outcomeOf(s)).toBe('in_final');
    expect(tournamentBoard(s).next?.stage).toBe('Final');
    s = play(s, 3, 0);
    expect(bataviaFinish(s)).toBe('champion');
    expect(tournamentBoard(s).headline).toBe('Champions');
    expect(tournamentBoard(s).next).toBeNull();
  });

  it('a level final shows who won the shoot-out, matching the outcome', () => {
    let s = newTournament('az_showcase', 'c1', 11);
    for (let i = 0; i < 3; i++) s = play(s, 9, 0);
    s = play(s, 1, 1);
    const b = tournamentBoard(s);
    expect([b.lastResult?.homeGoals, b.lastResult?.awayGoals]).toEqual([1, 1]);
    expect(b.lastResult?.shootoutWinner).toEqual(bataviaFinish(s) === 'champion' ? TOURNAMENTS.az_showcase.teams[HOME]!.name : expect.not.stringContaining('Batavia'));
    expect(b.outcome === 'champion' || b.outcome === 'runner_up').toBe(true);
    let g = newTournament('az_showcase', 'c2', 11);
    g = play(g, 1, 1);
    expect(tournamentBoard(g).lastResult?.shootoutWinner).toBeUndefined();
  });

  it('losing the final is runner-up, and three heavy losses are out', () => {
    let s = newTournament('az_showcase', 'c1', 11);
    for (let i = 0; i < 3; i++) s = play(s, 9, 0);
    expect(outcomeOf(play(s, 0, 2))).toBe('runner_up');
    let t = newTournament('holiday_classic', 'c2', 5);
    for (let i = 0; i < 3; i++) t = play(t, 0, 9);
    expect(outcomeOf(t)).toBe('eliminated');
    expect(tournamentBoard(t).next).toBeNull();
  });

  it('long club names are passed through unchanged', () => {
    const b = tournamentBoard(newTournament('holiday_classic', 'c1', 1));
    const longest = Math.max(...b.groups.flatMap((g) => g.rows.map((r) => r.name.length)));
    expect(longest).toBeGreaterThan(15);
  });
});
