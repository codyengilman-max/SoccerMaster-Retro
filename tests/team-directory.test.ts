import { describe, expect, it } from 'vitest';
import { LEAGUE_CLUBS } from '../src/game/league/league';
import { TOURNAMENTS, bataviaFixture, newTournament, recordTournamentPlayed } from '../src/game/season/tournament';
import { LEAGUE_FORMATS, SEASON_LEAGUE_V1, leagueFormat, newSeasonLeague, seasonTable } from '../src/game/season/league';
import { STATE_CUP_INVITED } from '../src/game/season/stateCup';
import { CATEGORY, STATES, TEAMS, V1_LEAGUES, teamById, teamIdForName } from '../src/game/rankings/teams';
import { BG_FIXTURES } from '../src/game/rankings/background';
import {
  RANKINGS_VERSION, RANKINGS_VERSION_V1, latest, nationalTable, newRankings, parseRankings, rankIn, settleThrough, stateTable, type RankingsState, type StoryResults,
} from '../src/game/rankings/ratings';
import { searchRows } from '../src/game/rankings/views';

const ID = 'career-dir';
const SEED = 99;
const story = (over: Partial<StoryResults> = {}): StoryResults => ({ league: newSeasonLeague(ID, SEED), cups: {}, stateCup: null, ...over });
const stateOf = (id: string) => teamById(id)?.state;
const OWNER_AZ = [['westside_united', 'Westside United', 'Westside'], ['no_soccer_tuesday', 'No Soccer Tuesday', 'NST'], ['tumbleweed_fc', 'Tumbleweed FC', 'Tumbleweed'], ['dynamics_fc', 'Dynamics FC', 'Dynamics'], ['anthem_shockers', 'Anthem Shockers', 'Anthem']] as const;
const key = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, '');

/** A version-1 (120-team) save as an existing career would have stored it. */
function v1Save(s: RankingsState): unknown {
  const keep = new Set(TEAMS.filter((t) => t.added === 1).map((t) => t.id));
  return JSON.parse(JSON.stringify({ ...s, version: RANKINGS_VERSION_V1, snapshots: s.snapshots.map((sn) => ({ ...sn, ratings: Object.fromEntries(Object.entries(sn.ratings).filter(([id]) => keep.has(id))) })) }));
}

describe('directory', () => {
  it('has exactly 1,000 teams in the only bracket, with every required field', () => {
    expect(TEAMS).toHaveLength(1000);
    expect(new Set(TEAMS.map((t) => t.category))).toEqual(new Set([CATEGORY]));
    expect(new Set(TEAMS.map((t) => t.id)).size).toBe(1000);
    expect(new Set(TEAMS.map((t) => t.club)).size).toBe(1000);
    for (const t of TEAMS) {
      for (const f of [t.id, t.name, t.short, t.city, t.state, t.region, t.club]) expect(typeof f === 'string' && f.length > 0, t.id).toBe(true);
      expect(Number.isInteger(t.rating0), t.id).toBe(true);
    }
  });
  it('covers all 50 states, weighted to the larger markets', () => {
    expect(STATES).toHaveLength(50);
    const n = (s: string) => TEAMS.filter((t) => t.state === s).length;
    expect(n('CA')).toBeGreaterThan(n('OR'));
    expect(n('TX')).toBeGreaterThan(n('OK'));
    expect(Math.min(...STATES.map(n))).toBeGreaterThanOrEqual(4);
  });
  it('keeps the 120 version-1 teams and their fixtures unchanged', () => {
    expect(TEAMS.filter((t) => t.added === 1)).toHaveLength(120);
    expect(teamById('batavia')!.rating0).toBe(1492);
    const v1 = BG_FIXTURES.filter((f) => (f.league ? V1_LEAGUES.has(f.league) : f.id.includes('-sc')));
    expect(v1).toHaveLength(942);
    for (const f of v1) expect([teamById(f.home)!.added, teamById(f.away)!.added]).toEqual([1, 1]);
  });
  it('one spelling resolves to one team: names and aliases never collide', () => {
    const seen = new Map<string, string>();
    for (const t of TEAMS) for (const n of [t.name, ...t.aliases]) {
      expect(seen.get(key(n)) ?? t.id, n).toBe(t.id);
      seen.set(key(n), t.id);
    }
    for (const n of ['Batavia', 'FC Batavia', 'Batavia FC', 'F.C. Batavia', 'fc batavia']) expect(teamIdForName(n), n).toBe('batavia');
    expect(TEAMS.filter((t) => /batavia/i.test(t.name))).toHaveLength(1);
    expect(TEAMS.some((t) => /next.?level/i.test(t.id + t.name + t.aliases.join()))).toBe(false);
    expect(teamIdForName('Next Horizon')).toBe('next_horizon');
  });
  it('adds the five owner Arizona clubs; four join new leagues, none enter background, tournament or older-league fixtures', () => {
    const scheduled = new Set([...BG_FIXTURES.flatMap((f) => [f.home, f.away]), ...LEAGUE_FORMATS[SEASON_LEAGUE_V1].clubs, ...Object.values(TOURNAMENTS).flatMap((t) => t.groups.flat()), ...STATE_CUP_INVITED]);
    const league9 = leagueFormat(newSeasonLeague(ID, SEED)).clubs;
    for (const [id, name, short] of OWNER_AZ) {
      const t = teamById(id)!;
      expect([t.name, t.short, t.state, t.league]).toEqual([name, short, 'AZ', null]);
      expect(scheduled.has(id), id).toBe(false);
      expect(league9.includes(id), id).toBe(id !== 'anthem_shockers');
    }
    expect(league9).toEqual([...LEAGUE_CLUBS, 'westside_united', 'no_soccer_tuesday', 'tumbleweed_fc', 'dynamics_fc']);
    expect(searchRows(nationalTable(latest(newRankings(ID, SEED))), 'NST').map((r) => r.team)).toContain('no_soccer_tuesday');
  });
});

describe('new career start', () => {
  const s = newRankings(ID, SEED);
  const pre = latest(s);
  it('Batavia is 67th in Arizona by the real ranking rules: 66 above, some below', () => {
    const az = stateTable(pre, 'AZ', stateOf);
    expect(rankIn(az, 'batavia')).toBe(67);
    expect(az.filter((r) => r.rank < 67)).toHaveLength(66);
    expect(az.filter((r) => r.rank > 67).length).toBeGreaterThanOrEqual(1);
    expect(az.filter((r) => r.rating === pre.ratings.batavia!)).toHaveLength(1);
  });
  it('Batavia is in the bottom two of its starting league by strength, in the new 9-club and the saved 5-club format', () => {
    for (const clubs of [leagueFormat(null).clubs, LEAGUE_FORMATS[SEASON_LEAGUE_V1].clubs]) {
      expect(clubs.filter((c) => pre.ratings[c]! < pre.ratings.batavia!)).toEqual(['desert_tuzon']);
      expect(clubs.filter((c) => pre.ratings[c]! > pre.ratings.batavia!)).toHaveLength(clubs.length - 2);
    }
    expect(leagueFormat(null).clubs).toHaveLength(9);
  });
  it('national rank comes from the same ratings and shares ranks on equal ratings', () => {
    const nat = nationalTable(pre);
    expect(nat).toHaveLength(1000);
    expect(rankIn(nat, 'batavia')).toBe(nat.filter((r) => r.rating > pre.ratings.batavia!).length + 1);
    const tie = nationalTable({ ...pre, ratings: { a: 1500, b: 1500, c: 1400 } });
    expect(tie.map((r) => r.rank)).toEqual([1, 1, 3]);
  });
  it('the start is saved once: weeks, reloads and re-settling never reset it', () => {
    const later = settleThrough(s, story(), 6).state;
    expect(later.snapshots[0]).toEqual(pre);
    const reloaded = parseRankings(JSON.parse(JSON.stringify(later)), ID);
    expect(reloaded.ok && reloaded.value).toEqual(later);
    expect(reloaded.ok && reloaded.migrated).toBe(false);
    expect(settleThrough(later, story(), 6).changed).toBe(false);
  });
  it('tournament results move strength ratings but never league points', () => {
    const t = newTournament('az_showcase', ID, SEED);
    const f = bataviaFixture(t, 1)!;
    const r = recordTournamentPlayed(t, f.id, 3, 0);
    expect(r.ok).toBe(true);
    const st = story({ cups: { az_showcase: (r as { ok: true; state: typeof t }).state } });
    const a = settleThrough(newRankings(ID, SEED), story(), 9).state;
    const b = settleThrough(newRankings(ID, SEED), st, 9).state;
    expect(latest(b).ratings.batavia).toBeGreaterThan(latest(a).ratings.batavia!);
    expect(seasonTable(st.league!)).toEqual(seasonTable(story().league!));
  });
});

describe('existing careers (version-1 saves)', () => {
  const earned = settleThrough(newRankings(ID, SEED), story(), 4).state;
  it('migrates by adding the new teams at their seeded rating, keeping every earned rating and result', () => {
    const p = parseRankings(v1Save(earned), ID);
    expect(p.ok && p.migrated).toBe(true);
    if (!p.ok) return;
    expect(p.value.version).toBe(RANKINGS_VERSION);
    expect(p.value.applied).toEqual(earned.applied);
    expect(p.value.background).toEqual(earned.background);
    for (const [i, sn] of p.value.snapshots.entries())
      for (const t of TEAMS) expect(sn.ratings[t.id], `${i}:${t.id}`).toBe(t.added === 1 ? earned.snapshots[i]!.ratings[t.id] : t.rating0);
  });
  it('migration is repeatable: a migrated save parses unchanged', () => {
    const p = parseRankings(v1Save(earned), ID);
    if (!p.ok) throw new Error(p.error);
    const again = parseRankings(JSON.parse(JSON.stringify(p.value)), ID);
    expect(again.ok && again.migrated).toBe(false);
    expect(again.ok && again.value).toEqual(p.value);
  });
  it('a damaged version-1 save is rejected, not rebuilt', () => {
    const bad = v1Save(earned) as RankingsState;
    delete (bad.snapshots[2]!.ratings as Record<string, number>).royal_salt;
    expect(parseRankings(bad, ID).ok).toBe(false);
  });
});

describe('saved rankings record', () => {
  it('a version-1 record is migrated and written back once; a damaged one stays exactly as saved', async () => {
    const { IDBFactory } = await import('fake-indexeddb');
    const { StoryStore } = await import('../src/game/story/store');
    const { rankingsKey, settleRankings, RankingsSaveError } = await import('../src/scenes/rankingsData');
    const st = await StoryStore.open(new IDBFactory(), 's');
    const cid = 'main';
    const old = v1Save(settleThrough(newRankings(cid, SEED), { league: newSeasonLeague(cid, SEED), cups: {}, stateCup: null }, 0).state);
    await st.putRecord(rankingsKey(cid), old);
    const a = await settleRankings(st, cid, 0, 1);
    expect(a.state.version).toBe(RANKINGS_VERSION);
    expect(Object.keys(latest(a.state).ratings)).toHaveLength(1000);
    const saved = await st.getRecord(rankingsKey(cid));
    expect((saved as RankingsState).version).toBe(RANKINGS_VERSION);
    const b = await settleRankings(st, cid, 0, 1);
    expect(b.state).toEqual(a.state);
    const damaged = { ...(saved as RankingsState), snapshots: [] };
    await st.putRecord(rankingsKey(cid), damaged);
    await expect(settleRankings(st, cid, 0, 1)).rejects.toBeInstanceOf(RankingsSaveError);
    expect(await st.getRecord(rankingsKey(cid))).toEqual(damaged);
    await st.putRecord(rankingsKey(cid), null);
    await expect(settleRankings(st, cid, 0, 1)).rejects.toBeInstanceOf(RankingsSaveError);
    expect(await st.getRecord(rankingsKey(cid))).toBeNull();
    st.close();
  });
});
