import { describe, expect, it } from 'vitest';
import { HOME_CLUB, LEAGUE_CLUBS } from '../src/game/league/league';
import { SEASON_WEEKS, slotIds, weekOfLeagueGame } from '../src/game/season/calendar';
import { BATAVIA_FIXTURES, SEASON_FIXTURES, SEASON_ROUNDS, bataviaRecord, fixtureForSeasonWeek, newSeasonLeague, parseSeasonLeague, recordSeasonPlayed, seasonTable, simulateSeasonThrough } from '../src/game/season/league';
import { TOURNAMENTS, bataviaFinish, bataviaFixture, groupTable, newTournament, nextBataviaFixture, parseTournament, playoffs, recordTournamentPlayed, roundRobin, type TournamentState } from '../src/game/season/tournament';

describe('Season One calendar', () => {
  it('follows the storyboard: 12 league games in weeks 3–8, 10–11 and 13–16, AZ Showcase week 9, Holiday Classic week 12, State Cup weeks 17–18', () => {
    expect(SEASON_WEEKS).toHaveLength(18);
    expect(SEASON_WEEKS.filter((w) => w.leagueGame !== null).map((w) => w.week)).toEqual([3, 4, 5, 6, 7, 8, 10, 11, 13, 14, 15, 16]);
    expect(SEASON_WEEKS.filter((w) => w.leagueGame !== null).map((w) => w.leagueGame)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(SEASON_WEEKS.filter((w) => w.tournament).map((w) => [w.week, w.tournament])).toEqual([[9, 'az_showcase'], [12, 'holiday_classic']]);
    expect(SEASON_WEEKS.filter((w) => w.kind === 'state_cup').map((w) => w.week)).toEqual([17, 18]);
    expect(SEASON_WEEKS.map((w) => w.title)).toEqual([
      "You Don't Know Anybody Yet", 'Nobody Saved You a Spot', 'When It Counts', 'Everybody Wants Something', 'Starting to Believe', 'People Notice',
      'Whose Side?', 'Losing the Room', 'Bigger Names', 'New Badge, Same Blake', 'Who Am I Doing This For?', 'What We Can Afford',
      'Questions Worth Asking', 'Next Horizon', 'Monday Still Comes', 'Finish What You Started', 'Four Teams Left', 'What Comes Next',
    ]);
    // Three weeks apart, two league weekends between them.
    expect(TOURNAMENTS.holiday_classic.week - TOURNAMENTS.az_showcase.week).toBe(3);
    for (const w of [1, 2, 9, 12, 17, 18]) expect(fixtureForSeasonWeek(w)).toBeNull();
    for (let g = 1; g <= 12; g++) expect(weekOfLeagueGame(g)).not.toBeNull();
  });
  it('has 79 featured slots: 18 each of M, S, C, F and Mom in weeks 1, 4, 7, 9, 12, 16 plus the week 18 family decision', () => {
    const all = SEASON_WEEKS.flatMap((w) => slotIds(w.week));
    expect(all).toHaveLength(79);
    expect(new Set(all).size).toBe(79);
    expect(all.filter((s) => s.endsWith('_P')).map((s) => Number(s.slice(4, 6)))).toEqual([1, 4, 7, 9, 12, 16, 18]);
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
    for (const id of ['az_showcase', 'holiday_classic'] as const) {
      const rr = roundRobin(id);
      expect(rr).toHaveLength(6);
      expect(new Set(TOURNAMENTS[id].entrants).size).toBe(4);
      for (const t of TOURNAMENTS[id].entrants) expect(rr.filter((f) => f.home === t || f.away === t)).toHaveLength(3);
      for (const st of ['rr1', 'rr2', 'rr3']) expect(rr.filter((f) => f.stage === st && (f.home === 'batavia' || f.away === 'batavia'))).toHaveLength(1);
      for (const t of TOURNAMENTS[id].entrants) expect(LEAGUE_CLUBS as readonly string[]).not.toContain(t === 'batavia' ? 'x' : t);
    }
  });
  it('the playoff is undecided until all group games have results; winning every game leads to the championship', () => {
    let s = newTournament('az_showcase', 'c', 11);
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
    expect(parseTournament(s, 'az_showcase').ok).toBe(true);
  });
  it('losing every group game leads to the placement game, and results cannot be rewritten or played out of order', () => {
    let s = newTournament('holiday_classic', 'c', 5);
    const late = roundRobin('holiday_classic').find((f) => f.stage === 'rr3' && (f.home === 'batavia' || f.away === 'batavia'))!;
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
    expect(parseTournament({ ...s, results: { ...s.results, 'holiday_classic-final-x-y': { fixtureId: 'holiday_classic-final-x-y', homeGoals: 1, awayGoals: 0, source: 'simulated' } } }, 'holiday_classic').ok).toBe(false);
  });
  it('tournament results never change the league table', () => {
    const league = simulateSeasonThrough(newSeasonLeague('c', 1), 5);
    const before = seasonTable(league);
    let t = newTournament('az_showcase', 'c', 1);
    for (let i = 0; i < 4; i++) t = play(t, 2, 0);
    expect(seasonTable(league)).toEqual(before);
  });
});
