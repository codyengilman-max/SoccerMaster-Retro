import { describe, expect, it } from 'vitest';
import { HOME_CLUB, LEAGUE_CLUBS } from '../src/game/league/league';
import { SEASON_WEEKS, slotIds, weekOfLeagueGame } from '../src/game/season/calendar';
import { BATAVIA_FIXTURES, SEASON_FIXTURES, SEASON_ROUNDS, bataviaRecord, fixtureForSeasonWeek, newSeasonLeague, parseSeasonLeague, recordSeasonPlayed, seasonTable, simulateSeasonThrough } from '../src/game/season/league';
import { TOURNAMENTS, bataviaFinish, bataviaFixture, groupTable, newTournament, nextBataviaFixture, parseTournament, playoffs, recordTournamentPlayed, roundRobin, type TournamentState } from '../src/game/season/tournament';

describe('Season One calendar', () => {
  it('has 18 weeks: 12 league games in weeks 3–8 and 13–18, cups in weeks 9 and 11, none in 1, 2, 10, 12', () => {
    expect(SEASON_WEEKS).toHaveLength(18);
    expect(SEASON_WEEKS.filter((w) => w.leagueGame !== null).map((w) => w.week)).toEqual([3, 4, 5, 6, 7, 8, 13, 14, 15, 16, 17, 18]);
    expect(SEASON_WEEKS.filter((w) => w.tournament).map((w) => [w.week, w.tournament])).toEqual([[9, 'starter_cup'], [11, 'desert_lights']]);
    for (const w of [1, 2, 10, 12]) expect(fixtureForSeasonWeek(w)).toBeNull();
    for (let g = 1; g <= 12; g++) expect(weekOfLeagueGame(g)).not.toBeNull();
  });
  it('has 81 featured slots: 18 each of M, S, C, F and 9 parent scenes (week 1, then even weeks from 4; the owner rewrite of weeks 1-2 moved the week-2 talk to week 1)', () => {
    const all = SEASON_WEEKS.flatMap((w) => slotIds(w.week));
    expect(all).toHaveLength(81);
    expect(new Set(all).size).toBe(81);
    expect(all.filter((s) => s.endsWith('_P')).map((s) => Number(s.slice(4, 6)))).toEqual([1, 4, 6, 8, 10, 12, 14, 16, 18]);
  });
});

describe('Season One league', () => {
  it('is a triple round robin: each pair meets three times, Batavia plays exactly 12 league games', () => {
    expect(SEASON_FIXTURES).toHaveLength(30);
    for (const a of LEAGUE_CLUBS) for (const b of LEAGUE_CLUBS) if (a < b) expect(SEASON_FIXTURES.filter((f) => [f.home, f.away].sort().join() === [a, b].sort().join())).toHaveLength(3);
    expect(BATAVIA_FIXTURES).toHaveLength(12);
    const ids = SEASON_WEEKS.filter((w) => w.leagueGame).map((w) => fixtureForSeasonWeek(w.week)!.id);
    expect(new Set(ids).size).toBe(12);
    for (let r = 1; r <= SEASON_ROUNDS; r++) expect(SEASON_FIXTURES.filter((f) => f.round === r)).toHaveLength(2);
  });
  it('records a played game once, never simulates Batavia and treats pending games as pending, not losses', () => {
    let s = newSeasonLeague('c', 7);
    const f = fixtureForSeasonWeek(3)!;
    const r = recordSeasonPlayed(s, f.id, 2, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    expect(recordSeasonPlayed(s, f.id, 2, 1)).toMatchObject({ ok: true, changed: false });
    expect(recordSeasonPlayed(s, f.id, 0, 1)).toMatchObject({ ok: false });
    s = simulateSeasonThrough(s, SEASON_ROUNDS);
    for (const b of BATAVIA_FIXTURES) if (b.id !== f.id) expect(s.results[b.id]).toBeUndefined();
    expect(bataviaRecord(s)).toEqual({ played: 1, won: 1, drawn: 0, lost: 0, pending: 11 });
    const row = seasonTable(s).find((x) => x.club === HOME_CLUB)!;
    expect(row).toMatchObject({ played: 1, points: 3 });
    expect(simulateSeasonThrough(newSeasonLeague('c', 7), SEASON_ROUNDS).results).toEqual(simulateSeasonThrough(newSeasonLeague('c', 7), SEASON_ROUNDS).results);
    expect(parseSeasonLeague(s).ok).toBe(true);
    expect(parseSeasonLeague({ ...s, results: { ...s.results, [BATAVIA_FIXTURES[1]!.id]: { fixtureId: BATAVIA_FIXTURES[1]!.id, homeGoals: 1, awayGoals: 0, source: 'simulated' } } }).ok).toBe(false);
  });
  it('table points add up over a full season of all wins, all draws or all losses', () => {
    for (const [us, them, pts] of [[2, 0, 36], [1, 1, 12], [0, 3, 0]] as const) {
      let s = newSeasonLeague('c', 3);
      for (const f of BATAVIA_FIXTURES) {
        const r = recordSeasonPlayed(s, f.id, us, them);
        if (r.ok) s = r.state;
      }
      s = simulateSeasonThrough(s, SEASON_ROUNDS);
      expect(seasonTable(s).find((x) => x.club === HOME_CLUB)!.points).toBe(pts);
      expect(Object.keys(s.results)).toHaveLength(30);
    }
  });
});

const play = (s: TournamentState, us: number, them: number): TournamentState => {
  const f = nextBataviaFixture(s)!;
  const r = recordTournamentPlayed(s, f.id, us, them);
  if (!r.ok) throw new Error(r.error);
  return r.state;
};

describe('Season One tournaments', () => {
  it('each cup has four entrants, three round-robin games each, and Batavia in every round', () => {
    for (const id of ['starter_cup', 'desert_lights'] as const) {
      const rr = roundRobin(id);
      expect(rr).toHaveLength(6);
      expect(new Set(TOURNAMENTS[id].entrants).size).toBe(4);
      for (const t of TOURNAMENTS[id].entrants) expect(rr.filter((f) => f.home === t || f.away === t)).toHaveLength(3);
      for (const st of ['rr1', 'rr2', 'rr3']) expect(rr.filter((f) => f.stage === st && (f.home === 'batavia' || f.away === 'batavia'))).toHaveLength(1);
      for (const t of TOURNAMENTS[id].entrants) expect(LEAGUE_CLUBS as readonly string[]).not.toContain(t === 'batavia' ? 'x' : t);
    }
  });
  it('the playoff is undecided until all group games have results; winning every game leads to the championship', () => {
    let s = newTournament('starter_cup', 'c', 11);
    expect(playoffs(s)).toBeNull();
    expect(bataviaFixture(s, 4)).toBeNull();
    s = play(s, 3, 0);
    s = play(s, 3, 0);
    expect(playoffs(s)).toBeNull();
    s = play(s, 3, 0);
    expect(groupTable(s).complete).toBe(true);
    expect(groupTable(s).rows[0]!.team).toBe('batavia');
    expect(bataviaFixture(s, 4)!.stage).toBe('final');
    expect(bataviaFinish(s)).toBeNull();
    s = play(s, 1, 1);
    expect(bataviaFinish(s)).toBe('shared_champion');
    expect(nextBataviaFixture(s)).toBeNull();
    expect(Object.keys(s.results)).toHaveLength(8);
    expect(parseTournament(s, 'starter_cup').ok).toBe(true);
  });
  it('losing every group game leads to the placement game, and results cannot be rewritten or played out of order', () => {
    let s = newTournament('desert_lights', 'c', 5);
    const late = roundRobin('desert_lights').find((f) => f.stage === 'rr3' && (f.home === 'batavia' || f.away === 'batavia'))!;
    expect(recordTournamentPlayed(s, late.id, 1, 0)).toMatchObject({ ok: false });
    s = play(s, 0, 4);
    const first = Object.values(s.results).find((r) => r.source === 'played')!;
    expect(recordTournamentPlayed(s, first.fixtureId, 2, 0)).toMatchObject({ ok: false });
    s = play(s, 0, 4);
    s = play(s, 0, 4);
    expect(groupTable(s).rows[3]!.team).toBe('batavia');
    expect(bataviaFixture(s, 4)!.stage).toBe('placement');
    s = play(s, 2, 1);
    expect(bataviaFinish(s)).toBe('third');
    expect(parseTournament({ ...s, results: { ...s.results, 'desert_lights-final-x-y': { fixtureId: 'desert_lights-final-x-y', homeGoals: 1, awayGoals: 0, source: 'simulated' } } }, 'desert_lights').ok).toBe(false);
  });
  it('tournament results never change the league table', () => {
    const league = simulateSeasonThrough(newSeasonLeague('c', 1), 5);
    const before = seasonTable(league);
    let t = newTournament('starter_cup', 'c', 1);
    for (let i = 0; i < 4; i++) t = play(t, 2, 0);
    expect(seasonTable(league)).toEqual(before);
  });
});
