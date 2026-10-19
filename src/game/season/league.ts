/**
 * Season One league: the same five local clubs as the U11 league, met three times each (triple round
 * robin, 15 rounds, one bye per round), so FC Batavia plays exactly 12 league games. Batavia's games
 * are the story's league weeks; other clubs' fixtures are simulated from the seed and labelled.
 * Tournament fixtures never enter this table. Framework-free and deterministic.
 */
import { HOME_CLUB, LEAGUE_CLUBS, POINTS, simulatedScore, type LeagueClubId } from '../league/league';
import { weekOfLeagueGame } from './calendar';

export const SEASON_LEAGUE_VERSION = 's1-1';
export const CYCLES = 3;
export const BASE_ROUNDS = LEAGUE_CLUBS.length;
export const SEASON_ROUNDS = BASE_ROUNDS * CYCLES;
export const LEAGUE_GAMES = 12;

export interface SeasonFixture {
  readonly id: string;
  readonly round: number;
  readonly cycle: number;
  readonly home: LeagueClubId;
  readonly away: LeagueClubId;
}
export interface SeasonResult {
  readonly fixtureId: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly source: 'played' | 'simulated';
}
export interface SeasonLeagueState {
  readonly version: typeof SEASON_LEAGUE_VERSION;
  readonly careerId: string;
  readonly seed: number;
  readonly results: Readonly<Record<string, SeasonResult>>;
  readonly simulatedThrough: number;
}

function buildFixtures(): readonly SeasonFixture[] {
  const teams: (LeagueClubId | null)[] = [...LEAGUE_CLUBS, null];
  const n = teams.length;
  const base: { round: number; a: LeagueClubId; b: LeagueClubId; homeFirst: boolean }[] = [];
  let order = teams.slice();
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = order[i]!;
      const b = order[n - 1 - i]!;
      if (a !== null && b !== null) base.push({ round: r + 1, a, b, homeFirst: (r + i) % 2 === 0 });
    }
    order = [order[0]!, order[n - 1]!, ...order.slice(1, n - 1)];
  }
  const out: SeasonFixture[] = [];
  for (let c = 0; c < CYCLES; c++) {
    for (const f of base) {
      // Venues alternate by cycle so each pair meets home, away, home.
      const flip = c % 2 === 1;
      const [home, away] = f.homeFirst !== flip ? [f.a, f.b] : [f.b, f.a];
      const round = c * BASE_ROUNDS + f.round;
      out.push({ id: `s1-r${round}-${home}-${away}`, round, cycle: c + 1, home, away });
    }
  }
  return out;
}
export const SEASON_FIXTURES: readonly SeasonFixture[] = buildFixtures();
const BY_ID = new Map(SEASON_FIXTURES.map((f) => [f.id, f]));
export const isBatavia = (f: SeasonFixture): boolean => f.home === HOME_CLUB || f.away === HOME_CLUB;
/** Batavia's twelve league fixtures in round order. */
export const BATAVIA_FIXTURES: readonly SeasonFixture[] = SEASON_FIXTURES.filter(isBatavia).sort((a, b) => a.round - b.round);
export const fixtureForGame = (game: number): SeasonFixture | null => BATAVIA_FIXTURES[game - 1] ?? null;
export function fixtureForSeasonWeek(week: number): SeasonFixture | null {
  for (let g = 1; g <= LEAGUE_GAMES; g++) if (weekOfLeagueGame(g) === week) return fixtureForGame(g);
  return null;
}
export const opponentOf = (f: SeasonFixture): LeagueClubId => (f.home === HOME_CLUB ? f.away : f.home);

export function newSeasonLeague(careerId: string, seed: number): SeasonLeagueState {
  return { version: SEASON_LEAGUE_VERSION, careerId, seed: seed >>> 0, results: {}, simulatedThrough: 0 };
}
const goalsOk = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 40;

/** Records Batavia's finished match once. Same score again is a no-op; a different score is refused. */
export function recordSeasonPlayed(s: SeasonLeagueState, fixtureId: string, batavia: number, opponent: number): { ok: true; state: SeasonLeagueState; changed: boolean } | { ok: false; error: string } {
  const f = BY_ID.get(fixtureId);
  if (!f || !isBatavia(f)) return { ok: false, error: 'not a Batavia league fixture' };
  if (!goalsOk(batavia) || !goalsOk(opponent)) return { ok: false, error: 'bad score' };
  const homeGoals = f.home === HOME_CLUB ? batavia : opponent;
  const awayGoals = f.home === HOME_CLUB ? opponent : batavia;
  const prior = s.results[fixtureId];
  if (prior) {
    return prior.homeGoals === homeGoals && prior.awayGoals === awayGoals && prior.source === 'played' ? { ok: true, state: s, changed: false } : { ok: false, error: 'result already recorded' };
  }
  return { ok: true, state: { ...s, results: { ...s.results, [fixtureId]: { fixtureId, homeGoals, awayGoals, source: 'played' } } }, changed: true };
}

/** Simulates non-Batavia fixtures through `round`; Batavia fixtures are never simulated. */
export function simulateSeasonThrough(s: SeasonLeagueState, round: number): SeasonLeagueState {
  const upto = Math.max(0, Math.min(SEASON_ROUNDS, Math.floor(round)));
  if (upto <= s.simulatedThrough) return s;
  const results = { ...s.results };
  for (const f of SEASON_FIXTURES) {
    if (f.round > upto || results[f.id] || isBatavia(f)) continue;
    results[f.id] = { fixtureId: f.id, ...simulatedScore(s.seed, f.id), source: 'simulated' };
  }
  return { ...s, results, simulatedThrough: upto };
}

export interface SeasonRow {
  readonly club: LeagueClubId;
  readonly played: number;
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly points: number;
  readonly position: number;
}
/** Standings from recorded results only (pending is never a loss). Ties: points, GD, GF, name. */
export function seasonTable(s: SeasonLeagueState, names: Readonly<Record<string, string>> = {}): readonly SeasonRow[] {
  const rows = new Map(LEAGUE_CLUBS.map((c) => [c, { club: c, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }]));
  for (const f of SEASON_FIXTURES) {
    const r = s.results[f.id];
    if (!r) continue;
    const h = rows.get(f.home)!;
    const a = rows.get(f.away)!;
    h.played++, a.played++;
    h.goalsFor += r.homeGoals, h.goalsAgainst += r.awayGoals;
    a.goalsFor += r.awayGoals, a.goalsAgainst += r.homeGoals;
    if (r.homeGoals > r.awayGoals) (h.won++, a.lost++, (h.points += POINTS.win));
    else if (r.homeGoals < r.awayGoals) (a.won++, h.lost++, (a.points += POINTS.win));
    else (h.drawn++, a.drawn++, (h.points += POINTS.draw), (a.points += POINTS.draw));
  }
  const name = (c: string): string => names[c] ?? c;
  return [...rows.values()]
    .sort((x, y) => y.points - x.points || y.goalsFor - y.goalsAgainst - (x.goalsFor - x.goalsAgainst) || y.goalsFor - x.goalsFor || name(x.club).localeCompare(name(y.club)))
    .map((r, i) => ({ ...r, position: i + 1 }));
}

/** Batavia's record from its played fixtures; `pending` counts league games with no result. */
export function bataviaRecord(s: SeasonLeagueState): { played: number; won: number; drawn: number; lost: number; pending: number } {
  let won = 0, drawn = 0, lost = 0;
  for (const f of BATAVIA_FIXTURES) {
    const r = s.results[f.id];
    if (!r) continue;
    const us = f.home === HOME_CLUB ? r.homeGoals : r.awayGoals;
    const them = f.home === HOME_CLUB ? r.awayGoals : r.homeGoals;
    if (us > them) won++;
    else if (us < them) lost++;
    else drawn++;
  }
  const played = won + drawn + lost;
  return { played, won, drawn, lost, pending: LEAGUE_GAMES - played };
}

export function parseSeasonLeague(raw: unknown): { ok: true; value: SeasonLeagueState } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'not an object' };
  const o = raw as Record<string, unknown>;
  if (o.version !== SEASON_LEAGUE_VERSION) return { ok: false, error: `unknown season league version ${String(o.version)}` };
  if (typeof o.careerId !== 'string' || !Number.isInteger(o.seed) || !Number.isInteger(o.simulatedThrough)) return { ok: false, error: 'bad fields' };
  if (typeof o.results !== 'object' || o.results === null || Array.isArray(o.results)) return { ok: false, error: 'bad results' };
  for (const [k, v] of Object.entries(o.results as Record<string, unknown>)) {
    const r = v as Record<string, unknown>;
    const f = BY_ID.get(k);
    if (!f || r?.fixtureId !== k || !goalsOk(r.homeGoals) || !goalsOk(r.awayGoals) || (r.source !== 'played' && r.source !== 'simulated')) return { ok: false, error: `bad result ${k}` };
    if ((r.source === 'simulated') === isBatavia(f)) return { ok: false, error: `bad source ${k}` };
  }
  return { ok: true, value: raw as SeasonLeagueState };
}
