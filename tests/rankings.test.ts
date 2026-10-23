import { describe, expect, it } from 'vitest';
import { CLUB_WORLD } from '../src/game/story/clubs';
import { LEAGUE_CLUBS } from '../src/game/league/league';
import { TOURNAMENTS, bataviaFixture, newTournament, recordTournamentPlayed } from '../src/game/season/tournament';
import { fixtureForGame, newSeasonLeague, recordSeasonPlayed, seasonTable, simulateSeasonThrough } from '../src/game/season/league';
import { STATE_CUP_INVITED } from '../src/game/season/stateCup';
import { CATEGORY, TEAMS, teamById } from '../src/game/rankings/teams';
import { BG_FIXTURES, simulateBackground } from '../src/game/rankings/background';
import {
  ELO_K, eloChange, expected, latest, movement, nationalTable, newRankings, parseRankings, performance, settleThrough, stateTable, worldResults, type StoryResults,
} from '../src/game/rankings/ratings';

const ID = 'career-r';
const SEED = 4242;
const story = (over: Partial<StoryResults> = {}): StoryResults => ({ league: newSeasonLeague(ID, SEED), cups: {}, stateCup: null, ...over });
const stateOf = (id: string) => teamById(id)?.state;

describe('registry', () => {
  it('has exactly 120 unique eligible teams in one category', () => {
    expect(TEAMS).toHaveLength(120);
    expect(new Set(TEAMS.map((t) => t.id)).size).toBe(120);
    expect(new Set(TEAMS.map((t) => t.name)).size).toBe(120);
    expect(new Set(TEAMS.map((t) => t.category))).toEqual(new Set([CATEGORY]));
  });
  it('contains every established opponent under its existing ID and name', () => {
    for (const c of CLUB_WORLD.clubs) expect(teamById(c.id)?.name, c.id).toBe(c.displayName);
    for (const id of LEAGUE_CLUBS) expect(teamById(id)?.league).toBe('az_local');
    expect(teamById(STATE_CUP_INVITED)?.league).toBeNull();
    for (const t of Object.values(TOURNAMENTS)) for (const id of t.groups.flat()) {
      expect(teamById(id), id).toBeDefined();
      if (t.teams[id]?.outOfState) expect(teamById(id)!.name).toBe(t.teams[id]!.name);
    }
    expect(TEAMS.some((t) => /next.?level/i.test(t.id + t.name))).toBe(false);
  });
  it('keeps initial rating separate from tier and integer-seeded', () => {
    for (const t of TEAMS) expect(Math.abs(t.rating0 - (1500 + { 1: 150, 2: 75, 3: 0, 4: -75, 5: -150 }[t.tier]))).toBeLessThanOrEqual(20);
  });
});

describe('background schedule', () => {
  it('never schedules a team twice in one kickoff slot and never owns a story fixture', () => {
    const seen = new Set<string>();
    const storyTeams = new Set(TEAMS.filter((t) => t.league === 'az_local' || t.league === null).map((t) => t.id));
    for (const f of BG_FIXTURES) for (const t of [f.home, f.away]) {
      const k = `${t}:${f.week}:${f.slot}`;
      expect(seen.has(k), k).toBe(false);
      seen.add(k);
      expect(storyTeams.has(t)).toBe(false);
    }
    expect(new Set(BG_FIXTURES.map((f) => f.id)).size).toBe(BG_FIXTURES.length);
  });
  it('simulates the same score for the same seed', () => {
    const f = BG_FIXTURES[17]!;
    expect(simulateBackground(SEED, f)).toEqual(simulateBackground(SEED, f));
  });
});

describe('elo', () => {
  it('uses the specified formula, K = 24, equal and opposite', () => {
    expect(ELO_K).toBe(24);
    expect(expected(1500, 1500)).toBe(0.5);
    expect(eloChange(1500, 1500, 2, 1)).toBe(12);
    expect(eloChange(1600, 1400, 0, 0)).toBeCloseTo(24 * (0.5 - expected(1600, 1400)), 12);
    expect(eloChange(1500, 1500, 9, 0)).toBe(eloChange(1500, 1500, 1, 0)); // no goal-margin multiplier
  });

  it('publishes each week once; re-settling and settling in steps give identical snapshots', () => {
    let lg = newSeasonLeague(ID, SEED);
    const f1 = fixtureForGame(1)!;
    lg = simulateSeasonThrough((recordSeasonPlayed(lg, f1.id, 2, 1) as { ok: true; state: typeof lg }).state, f1.round);
    const st = story({ league: lg });
    const a = settleThrough(newRankings(ID, SEED), st, 5).state;
    expect(settleThrough(a, st, 5)).toEqual({ state: a, changed: false });
    const b = settleThrough(settleThrough(newRankings(ID, SEED), st, 3).state, st, 5).state;
    expect(b).toEqual(a);
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
    expect(parseRankings(JSON.parse(JSON.stringify(a)), ID).ok).toBe(true);
    expect(a.snapshots.map((s) => s.id)).toEqual(['s1-pre', 's1-w1', 's1-w2', 's1-w3', 's1-w4', 's1-w5']);
    // Batavia's played game counts once.
    expect(a.applied.filter((x) => x.id === `lg:${f1.id}`)).toHaveLength(1);
  });

  it('never treats an unplayed fixture as a draw and counts a late result in the next week', () => {
    const empty = settleThrough(newRankings(ID, SEED), story(), 3).state;
    expect(latest(empty).ratings.batavia).toBe(teamById('batavia')!.rating0);
    const f1 = fixtureForGame(1)!;
    const lg = (recordSeasonPlayed(newSeasonLeague(ID, SEED), f1.id, 3, 0) as { ok: true; state: ReturnType<typeof newSeasonLeague> }).state;
    const late = settleThrough(empty, story({ league: lg }), 4).state;
    expect(late.applied.find((x) => x.id === `lg:${f1.id}`)?.snapshot).toBe('s1-w4');
    expect(latest(late).ratings.batavia).toBeGreaterThan(teamById('batavia')!.rating0);
    expect(latest(late).provisional).toBe(true);
  });

  it('tournament games move ratings but award no league points; a shoot-out is a rating draw', () => {
    let t = newTournament('az_showcase', ID, SEED);
    const f = bataviaFixture(t, 1)!;
    const r = recordTournamentPlayed(t, f.id, 4, 0);
    if (!r.ok) throw new Error('record');
    t = r.state;
    const lg = newSeasonLeague(ID, SEED);
    const before = seasonTable(lg);
    const s = settleThrough(newRankings(ID, SEED), story({ league: lg, cups: { az_showcase: t } }), 9).state;
    expect(seasonTable(lg)).toEqual(before);
    expect(latest(s).ratings.batavia).toBeGreaterThan(teamById('batavia')!.rating0);
    const tie = worldResults(story({ cups: { az_showcase: t } }), {}).find((x) => x.shootoutWinner);
    expect(tie).toBeUndefined();
  });

  it('a migrated save never invents background games before its start week', () => {
    const s = settleThrough(newRankings(ID, SEED, 6), story(), 7).state;
    expect(Object.keys(s.background).every((id) => BG_FIXTURES.find((f) => f.id === id)!.week >= 6)).toBe(true);
    expect(Object.keys(s.background).length).toBeGreaterThan(0);
  });

  it('state order agrees with national ratings; ranks are out of the full population', () => {
    const s = settleThrough(newRankings(ID, SEED), story(), 12).state;
    const nat = nationalTable(latest(s));
    expect(nat).toHaveLength(120);
    const az = stateTable(latest(s), 'AZ', stateOf);
    expect(az.map((r) => r.team)).toEqual(nat.filter((r) => stateOf(r.team) === 'AZ').map((r) => r.team));
    expect(az).toHaveLength(TEAMS.filter((t) => t.state === 'AZ').length);
    expect(typeof movement(s, 'batavia')).toBe('number');
    // No story results here, so the Arizona league and Next Horizon have no path to the other teams.
    expect(latest(s).provisional).toBe(true);
  });

  it('performance uses counted matches as the denominator', () => {
    const s = settleThrough(newRankings(ID, SEED), story(), 4).state;
    const team = BG_FIXTURES.find((f) => f.week === 3)!.home;
    const p = performance(s, story(), team);
    const rs = worldResults(story(), s.background).filter((r) => r.home === team || r.away === team);
    expect(p.matches).toBe(rs.length);
    expect(p.attack).toBeCloseTo(p.goalsFor / rs.length, 12);
    expect(p.limited).toBe(true);
    expect(performance(s, story(), 'next_horizon')).toMatchObject({ matches: 0, attack: null, defense: null, schedule: null });
  });
});
