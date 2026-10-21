import { describe, expect, it } from 'vitest';
import { HOME_CLUB, LEAGUE_CLUBS } from '../src/game/league/league';
import { SEASON_WEEKS, slotIds, weekOfLeagueGame } from '../src/game/season/calendar';
import { BATAVIA_FIXTURES, SEASON_FIXTURES, SEASON_ROUNDS, bataviaRecord, fixtureForSeasonWeek, newSeasonLeague, parseSeasonLeague, recordSeasonPlayed, seasonTable, simulateSeasonThrough } from '../src/game/season/league';
import { TOURNAMENTS, bataviaFinish, bataviaFixture, finalFixture, groupFixtures, groupTable, matchPoints, newTournament, nextBataviaFixture, parseTournament, recordTournamentPlayed, type TournamentState } from '../src/game/season/tournament';

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
    // Week 14: league game 10 plus a non-league friendly against Next Horizon; no other week has one.
    expect(SEASON_WEEKS.filter((w) => w.friendly).map((w) => [w.week, w.friendly, w.leagueGame])).toEqual([[14, 'next_horizon', 10]]);
    expect(LEAGUE_CLUBS as readonly string[]).not.toContain('next_horizon');
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
  it('eight teams in two groups of four: Batavia + one league club + two out-of-state; Next Horizon (not a league club) in the other group', () => {
    for (const id of ['az_showcase', 'holiday_classic'] as const) {
      const c = TOURNAMENTS[id];
      const all = c.groups.flat();
      expect(new Set(all).size).toBe(8);
      expect(c.groups[0][0]).toBe('batavia');
      const league = (g: readonly string[]) => g.filter((t) => (LEAGUE_CLUBS as readonly string[]).includes(t));
      expect(league(c.groups[0])).toHaveLength(2);
      expect(c.groups[0].filter((t) => c.teams[t]!.outOfState)).toHaveLength(2);
      expect(c.groups[1].filter((t) => c.teams[t]!.outOfState)).toHaveLength(2);
      expect(c.groups[1]).toContain('next_horizon');
      expect(LEAGUE_CLUBS as readonly string[]).not.toContain('next_horizon');
      const fx = groupFixtures(id);
      expect(fx).toHaveLength(12);
      for (const t of all) expect(fx.filter((f) => f.home === t || f.away === t)).toHaveLength(3);
      for (const st of ['g1', 'g2', 'g3']) expect(fx.filter((f) => f.stage === st && (f.home === 'batavia' || f.away === 'batavia'))).toHaveLength(1);
    }
    expect(new Set([...TOURNAMENTS.az_showcase.groups.flat(), ...TOURNAMENTS.holiday_classic.groups.flat()].filter((t) => TOURNAMENTS.az_showcase.teams[t]?.outOfState || TOURNAMENTS.holiday_classic.teams[t]?.outOfState)).size).toBe(8);
  });
  it('ten-point system: win 6, draw 3, +1 a goal up to three, +1 clean sheet, at most 10', () => {
    expect(matchPoints(0, 0)).toBe(4);
    expect(matchPoints(1, 0)).toBe(8);
    expect(matchPoints(5, 0)).toBe(10);
    expect(matchPoints(2, 2)).toBe(5);
    expect(matchPoints(1, 2)).toBe(1);
    expect(matchPoints(0, 3)).toBe(0);
    for (let a = 0; a <= 8; a++) for (let b = 0; b <= 8; b++) expect(matchPoints(a, b)).toBeLessThanOrEqual(10);
  });
  it('the final is undecided until both groups finish; winning the group reaches the final; a level final has a shoot-out winner', () => {
    let s = newTournament('az_showcase', 'c', 11);
    expect(finalFixture(s)).toBeNull();
    expect(bataviaFixture(s, 4)).toBeNull();
    s = play(s, 4, 0);
    s = play(s, 4, 0);
    expect(finalFixture(s)).toBeNull();
    s = play(s, 4, 0);
    expect(groupTable(s, 0).complete && groupTable(s, 1).complete).toBe(true);
    expect(groupTable(s, 0).rows[0]!.team).toBe('batavia');
    expect(groupTable(s, 0).rows[0]!.points).toBe(30);
    expect(bataviaFixture(s, 4)!.stage).toBe('final');
    expect(bataviaFinish(s)).toBeNull();
    s = play(s, 1, 1);
    const fin = finalFixture(s)!;
    expect(s.results[fin.id]!.shootoutWinner).toMatch(new RegExp(`^(${fin.home}|${fin.away})$`));
    expect(bataviaFinish(s)).toBe(s.results[fin.id]!.shootoutWinner === 'batavia' ? 'champion' : 'runner_up');
    expect(nextBataviaFixture(s)).toBeNull();
    expect(Object.keys(s.results)).toHaveLength(13);
    expect(parseTournament(s, 'az_showcase').ok).toBe(true);
    expect(parseTournament({ ...s, results: { ...s.results, [fin.id]: { ...s.results[fin.id]!, shootoutWinner: undefined } } }, 'az_showcase').ok).toBe(false);
  });
  it('losing every group game ends after three games with the final simulated; results cannot be rewritten or played out of order', () => {
    let s = newTournament('holiday_classic', 'c', 5);
    const late = groupFixtures('holiday_classic').find((f) => f.stage === 'g3' && (f.home === 'batavia' || f.away === 'batavia'))!;
    expect(recordTournamentPlayed(s, late.id, 1, 0)).toMatchObject({ ok: false });
    s = play(s, 0, 4);
    const first = Object.values(s.results).find((r) => r.source === 'played')!;
    expect(recordTournamentPlayed(s, first.fixtureId, 2, 0)).toMatchObject({ ok: false });
    expect(recordTournamentPlayed(s, first.fixtureId, first.fixtureId.includes('-batavia-') ? 0 : 4, 4)).toMatchObject({ ok: true });
    s = play(s, 0, 4);
    s = play(s, 0, 4);
    expect(groupTable(s, 0).rows[3]!.team).toBe('batavia');
    expect(bataviaFinish(s)).toBe('group_4');
    expect(bataviaFixture(s, 4)).toBeNull();
    expect(nextBataviaFixture(s)).toBeNull();
    const fin = finalFixture(s)!;
    expect(s.results[fin.id]!.source).toBe('simulated');
    expect(Object.keys(s.results)).toHaveLength(13);
    expect(parseTournament({ ...s, results: { ...s.results, 'holiday_classic-final-x-y': { fixtureId: 'holiday_classic-final-x-y', homeGoals: 1, awayGoals: 0, source: 'simulated' } } }, 'holiday_classic').ok).toBe(false);
  });
  it('tiebreakers: points, wins, head-to-head only for a two-team tie, capped goal difference, fewest conceded, then recorded lots; no restart after a partial split', () => {
    const base = newTournament('az_showcase', 'c', 3);
    const fx = groupFixtures('az_showcase').filter((f) => f.group === 0);
    const set = (scores: Record<string, [number, number]>, lots = base.lots): TournamentState => ({ ...base, lots, results: Object.fromEntries(fx.map((f) => [f.id, { fixtureId: f.id, homeGoals: scores[`${f.home}-${f.away}`]![0], awayGoals: scores[`${f.home}-${f.away}`]![1], source: 'simulated' as const }])) });
    const [a, b, c, d] = TOURNAMENTS.az_showcase.groups[0];
    const key = (x: string, y: string) => (fx.some((f) => f.home === x && f.away === y) ? `${x}-${y}` : `${y}-${x}`);
    const sc = (x: string, y: string, gx: number, gy: number): [string, [number, number]] => [key(x, y), fx.some((f) => f.home === x && f.away === y) ? [gx, gy] : [gy, gx]];
    // All six games 1-1: everyone level on points, wins, capped GD and conceded -> recorded lots decide.
    const level = set(Object.fromEntries([sc(a, b, 1, 1), sc(a, c, 1, 1), sc(a, d, 1, 1), sc(b, c, 1, 1), sc(b, d, 1, 1), sc(c, d, 1, 1)]));
    const order = base.lots.filter((t) => [a, b, c, d].includes(t));
    expect(groupTable(level, 0).rows.map((r) => r.team)).toEqual(order);
    // Capped goal difference: a 9-0 counts as +3.
    const capped = set(Object.fromEntries([sc(a, b, 9, 0), sc(a, c, 0, 1), sc(a, d, 1, 1), sc(b, c, 1, 1), sc(b, d, 1, 1), sc(c, d, 0, 0)])) ;
    expect(groupTable(capped, 0).rows.find((r) => r.team === a)!.cappedGd).toBe(2);
    // Two-team tie on points and wins: head-to-head decides even against better goal difference.
    const h2h = set(Object.fromEntries([sc(a, b, 1, 0), sc(a, c, 3, 3), sc(a, d, 2, 3), sc(b, c, 3, 0), sc(b, d, 3, 3), sc(c, d, 0, 0)]));
    const t = groupTable(h2h, 0).rows;
    const pa = t.find((r) => r.team === a)!, pb = t.find((r) => r.team === b)!;
    expect([pa.points, pa.won]).toEqual([16, 1]);
    expect([pb.points, pb.won]).toEqual([16, 1]);
    expect(pb.cappedGd).toBeGreaterThan(pa.cappedGd);
    expect(pa.position).toBeLessThan(pb.position);
    // Three-way points tie split by wins into 1 + 2: the remaining pair skips head-to-head and goes to capped GD.
    const multi = set(Object.fromEntries([sc(a, b, 0, 0), sc(a, c, 0, 0), sc(a, d, 0, 0), sc(b, c, 0, 1), sc(b, d, 1, 0), sc(c, d, 0, 2)]));
    const m = groupTable(multi, 0).rows;
    const at = (x: string) => m.find((r) => r.team === x)!;
    expect([at(a).points, at(b).points, at(c).points]).toEqual([12, 12, 12]);
    expect([at(a).won, at(b).won, at(c).won]).toEqual([0, 1, 1]);
    // c beat b head-to-head, but b's capped goal difference (0) beats c's (-1): b ranks above c.
    expect(at(b).position).toBeLessThan(at(c).position);
    expect(at(c).position).toBeLessThan(at(a).position);
  });
  it('tournament results never change the league table', () => {
    const league = simulateSeasonThrough(newSeasonLeague('c', 1), 5);
    const before = seasonTable(league);
    let t = newTournament('az_showcase', 'c', 1);
    for (let i = 0; i < 4; i++) t = play(t, 2, 0);
    expect(seasonTable(league)).toEqual(before);
  });
});
