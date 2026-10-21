import { describe, expect, it } from 'vitest';
import { LEAGUE_CLUBS } from '../src/game/league/league';
import { BATAVIA_FIXTURES, SEASON_ROUNDS, newSeasonLeague, recordSeasonPlayed, seasonTable, simulateSeasonThrough, type SeasonLeagueState } from '../src/game/season/league';
import { STATE_CUP_INVITED, cupFinal, cupFinish, leagueQualifiers, newStateCup, nextCupFixture, parseStateCup, qualified, recordCupPlayed, semis, simulateWithoutBatavia } from '../src/game/season/stateCup';
import { strengthTable } from '../src/game/season/strength';
import { newTournament, nextBataviaFixture, recordTournamentPlayed, type TournamentState } from '../src/game/season/tournament';

/** A full league where Batavia scores `us`-`them` every game. */
function fullLeague(us: number, them: number, seed = 3): SeasonLeagueState {
  let s = newSeasonLeague('c', seed);
  for (const f of BATAVIA_FIXTURES) {
    s = simulateSeasonThrough(s, f.round - 1);
    const r = recordSeasonPlayed(s, f.id, us, them);
    if (!r.ok) throw new Error(r.error);
    s = r.state;
  }
  return simulateSeasonThrough(s, SEASON_ROUNDS);
}
const playCup = (t: TournamentState, us: number, them: number): TournamentState => {
  const f = nextBataviaFixture(t)!;
  const r = recordTournamentPlayed(t, f.id, us, them);
  if (!r.ok) throw new Error(r.error);
  return r.state;
};

describe('Arizona State Cup', () => {
  it('waits for the whole league, then takes the top three plus the invited club (not a league club); the draw is recorded once', () => {
    expect(leagueQualifiers(newSeasonLeague('c', 1))).toBeNull();
    expect(newStateCup(newSeasonLeague('c', 1), 'c', 1)).toBeNull();
    const league = fullLeague(3, 0);
    const top = seasonTable(league).slice(0, 3).map((r) => r.club);
    const cup = newStateCup(league, 'c', 9)!;
    expect(cup.entrants).toEqual([...top, STATE_CUP_INVITED]);
    expect(LEAGUE_CLUBS as readonly string[]).not.toContain(STATE_CUP_INVITED);
    expect(qualified(cup)).toBe(true);
    expect(newStateCup(league, 'c', 9)!.draw).toEqual(cup.draw);
    expect([...cup.draw].sort()).toEqual([...cup.entrants].sort());
    expect(parseStateCup({ ...cup, draw: ['batavia', 'batavia', 'x', 'y'] }, league).ok).toBe(false);
  });
  it('semifinal then final; level games have a shoot-out winner; results cannot be rewritten', () => {
    const league = fullLeague(3, 0);
    let cup = newStateCup(league, 'c', 4)!;
    expect(cupFinal(cup)).toBeNull();
    const semi = nextCupFixture(cup)!;
    expect(semi.stage).toBe('semi');
    let r = recordCupPlayed(cup, semi.id, 2, 2);
    if (!r.ok) throw new Error(r.error);
    cup = r.state;
    expect(recordCupPlayed(cup, semi.id, 3, 0)).toMatchObject({ ok: false });
    const other = semis(cup).find((f) => f.id !== semi.id)!;
    expect(cup.results[other.id]!.source).toBe('simulated');
    expect(cup.results[semi.id]!.shootoutWinner).toMatch(new RegExp(`^(${semi.home}|${semi.away})$`));
    const fin = cupFinal(cup)!;
    if (cup.results[semi.id]!.shootoutWinner === 'batavia') {
      expect(nextCupFixture(cup)!.id).toBe(fin.id);
      expect(cupFinish(cup)).toBeNull();
      r = recordCupPlayed(cup, fin.id, 1, 0);
      if (!r.ok) throw new Error(r.error);
      cup = r.state;
      expect(cupFinish(cup)).toBe('champion');
    } else {
      expect(cupFinish(cup)).toBe('semifinal');
      expect(cup.results[fin.id]!.source).toBe('simulated');
    }
    expect(nextCupFixture(cup)).toBeNull();
    expect(parseStateCup(cup, league).ok).toBe(true);
    // A level semifinal's shoot-out winner must be one of its two clubs; a decided game carries none.
    const tied = cup.results[semi.id]!;
    expect(parseStateCup({ ...cup, results: { ...cup.results, [semi.id]: { ...tied, shootoutWinner: 'unknown_club' } } }, league).ok).toBe(false);
    expect(parseStateCup({ ...cup, results: { ...cup.results, [other.id]: { ...cup.results[other.id]!, homeGoals: 3, awayGoals: 0, shootoutWinner: other.home } } }, league).ok).toBe(false);
  });
  it('a Batavia outside the top three is not entered; the cup still finishes without an invented berth', () => {
    const league = fullLeague(0, 5);
    const cup = newStateCup(league, 'c', 2)!;
    expect(qualified(cup)).toBe(false);
    expect(cup.entrants).not.toContain('batavia');
    expect(cupFinish(cup)).toBe('not_qualified');
    expect(nextCupFixture(cup)).toBeNull();
    const done = simulateWithoutBatavia(cup);
    expect(Object.keys(done.results)).toHaveLength(3);
    expect(Object.values(done.results).every((x) => x.source === 'simulated')).toBe(true);
    expect(parseStateCup(done, league).ok).toBe(true);
  });
});

describe('Overall strength ranking', () => {
  it('starts level, is recomputed from results only, and covers league, Next Horizon and out-of-state clubs', () => {
    const empty = strengthTable(newSeasonLeague('c', 1));
    expect(new Set(empty.map((r) => r.rating))).toEqual(new Set([1500]));
    expect(empty.map((r) => r.team)).toEqual(expect.arrayContaining(['batavia', 'next_horizon', 'silver_state', 'high_plains']));
    const league = fullLeague(2, 0);
    expect(strengthTable(league)).toEqual(strengthTable(league));
    expect(strengthTable(league)[0]!.team).toBe('batavia');
  });
  it('tournaments move the strength rating but never league position', () => {
    const league = fullLeague(1, 1);
    const before = seasonTable(league);
    let cup = newTournament('az_showcase', 'c', 1);
    for (let i = 0; i < 4; i++) if (nextBataviaFixture(cup)) cup = playCup(cup, 3, 0);
    const withCup = strengthTable(league, { az_showcase: cup });
    expect(seasonTable(league)).toEqual(before);
    const r = (t: ReturnType<typeof strengthTable>, id: string) => t.find((x) => x.team === id)!.rating;
    expect(r(withCup, 'batavia')).toBeGreaterThan(r(strengthTable(league), 'batavia'));
  });
});
