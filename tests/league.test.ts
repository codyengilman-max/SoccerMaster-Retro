import { describe, expect, it } from 'vitest';
import { FIXTURES, HOME_CLUB, LEAGUE_CLUBS, NOT_ENTERED, ROUNDS, fixtureForWeek, homeFixtures, newLeague, parseLeague, recordPlayed, simulateThrough, simulatedScore, table } from '../src/game/league/league';
import { CLUB_WORLD } from '../src/game/story/clubs';

describe('U11 local league', () => {
  it('is a single round robin of five clubs: 10 fixtures, everyone meets once, one bye per round', () => {
    expect(FIXTURES).toHaveLength(10);
    const pairs = new Set(FIXTURES.map((f) => [f.home, f.away].sort().join('|')));
    expect(pairs.size).toBe(10);
    for (let r = 1; r <= ROUNDS; r++) {
      const inRound = FIXTURES.filter((f) => f.round === r).flatMap((f) => [f.home, f.away]);
      expect(inRound).toHaveLength(4);
      expect(new Set(inRound).size).toBe(4);
    }
    for (const c of LEAGUE_CLUBS) expect(FIXTURES.filter((f) => f.home === c || f.away === c)).toHaveLength(4);
  });

  it('uses club_world clubs, keeps Next Horizon out, and Batavia plays one fixture per story week 1–4', () => {
    const ids = CLUB_WORLD.clubs.map((c) => c.id);
    for (const c of LEAGUE_CLUBS) expect(ids).toContain(c);
    for (const c of NOT_ENTERED) expect(LEAGUE_CLUBS as readonly string[]).not.toContain(c);
    expect(homeFixtures()).toHaveLength(4);
    for (let w = 1; w <= 4; w++) expect(fixtureForWeek(w)).not.toBeNull();
    expect(fixtureForWeek(5)).toBeNull();
    const rounds = homeFixtures().map((f) => f.round);
    expect([...rounds].sort((a, b) => a - b)).toEqual(rounds);
  });

  it('a played result is recorded once; repeats are no-ops and a different score is refused', () => {
    const f = fixtureForWeek(1)!;
    let s = newLeague('c1', 42);
    const a = recordPlayed(s, f.id, 2, 1);
    expect(a.ok && a.changed).toBe(true);
    s = (a as { state: typeof s }).state;
    const again = recordPlayed(s, f.id, 2, 1);
    expect(again.ok && !again.changed).toBe(true);
    expect(recordPlayed(s, f.id, 0, 3).ok).toBe(false);
    const other = FIXTURES.find((x) => x.home !== HOME_CLUB && x.away !== HOME_CLUB)!;
    expect(recordPlayed(s, other.id, 1, 0).ok).toBe(false);
    expect(recordPlayed(s, f.id, -1, 0).ok).toBe(false);
    const row = table(s).find((r) => r.club === HOME_CLUB)!;
    expect(row).toMatchObject({ played: 1, won: 1, points: 3, goalsFor: 2, goalsAgainst: 1 });
  });

  it('missing results are never losses; simulation never touches Batavia fixtures and is deterministic', () => {
    const empty = table(newLeague('c1', 1));
    for (const r of empty) expect(r).toMatchObject({ played: 0, lost: 0, points: 0 });
    const s = simulateThrough(newLeague('c1', 7), 5);
    for (const f of FIXTURES) {
      const r = s.results[f.id];
      if (f.home === HOME_CLUB || f.away === HOME_CLUB) expect(r).toBeUndefined();
      else expect(r?.source).toBe('simulated');
    }
    expect(simulateThrough(newLeague('c1', 7), 5)).toEqual(s);
    expect(simulatedScore(7, 'x')).toEqual(simulatedScore(7, 'x'));
    // Simulating later rounds never rewrites a recorded result.
    const s2 = simulateThrough(simulateThrough(newLeague('c1', 7), 2), 5);
    expect(s2.results).toEqual(s.results);
  });

  it('table points add up and sorts by points, goal difference, goals for', () => {
    const s = simulateThrough(newLeague('c1', 99), 5);
    const t = table(s);
    expect(t.map((r) => r.position)).toEqual([1, 2, 3, 4, 5]);
    for (let i = 1; i < t.length; i++) {
      const a = t[i - 1]!;
      const b = t[i]!;
      expect(a.points > b.points || (a.points === b.points && a.goalsFor - a.goalsAgainst >= b.goalsFor - b.goalsAgainst)).toBe(true);
    }
    for (const r of t) expect(r.points).toBe(r.won * 3 + r.drawn);
  });

  it('rejects malformed saved leagues', () => {
    expect(parseLeague(null).ok).toBe(false);
    expect(parseLeague({ ...newLeague('c', 1), version: 9 }).ok).toBe(false);
    expect(parseLeague({ ...newLeague('c', 1), results: { bogus: { fixtureId: 'bogus', homeGoals: 1, awayGoals: 0, source: 'played' } } }).ok).toBe(false);
    expect(parseLeague(simulateThrough(newLeague('c', 1), 3)).ok).toBe(true);
  });
});
