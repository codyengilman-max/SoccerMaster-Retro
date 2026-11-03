/**
 * Season One league, two saved formats (Batavia plays exactly 12 league games in both; other clubs are
 * simulated from the seed and labelled; tournament fixtures never enter this table):
 * - s1-1 (careers whose league was created before D72): the five local clubs, triple round robin, 15 rounds.
 * - s1-2 (new leagues, owner 2026-10-29): nine Arizona clubs, every pair once (9 rounds, one bye each),
 *   then 4 rematch rounds (home and away flipped) from the second cycle where Batavia plays, 13 rounds.
 * A saved league keeps its own format forever. Framework-free and deterministic.
 */
import { HOME_CLUB, LEAGUE_CLUBS, POINTS, simulatedScore } from '../league/league';
import { weekOfLeagueGame } from './calendar';
import { assignLeagueVenues, isVenueId, type VenueId } from '../venue';

export const SEASON_LEAGUE_V1 = 's1-1';
export const SEASON_LEAGUE_VERSION = 's1-2';
export type SeasonLeagueVersion = typeof SEASON_LEAGUE_V1 | typeof SEASON_LEAGUE_VERSION;
export const LEAGUE_GAMES = 12;
/** Owner-named Arizona clubs added to the league (Anthem Shockers stays out, owner 2026-10-29). */
export const LEAGUE_CLUBS_9 = Object.freeze([...LEAGUE_CLUBS, 'westside_united', 'no_soccer_tuesday', 'tumbleweed_fc', 'dynamics_fc'] as const);
export const REMATCH_ROUNDS = 4;

export interface SeasonFixture {
  readonly id: string;
  readonly round: number;
  readonly cycle: number;
  readonly home: string;
  readonly away: string;
}
export interface SeasonResult {
  readonly fixtureId: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly source: 'played' | 'simulated';
}
export interface SeasonLeagueState {
  readonly version: SeasonLeagueVersion;
  readonly careerId: string;
  readonly seed: number;
  readonly results: Readonly<Record<string, SeasonResult>>;
  readonly simulatedThrough: number;
  /** Batavia fixture id -> venue, set when the season's fixtures are created (older saves get it once, unplayed only). */
  readonly venues?: Readonly<Record<string, VenueId>>;
}
export interface LeagueFormat {
  readonly version: SeasonLeagueVersion;
  readonly clubs: readonly string[];
  readonly rounds: number;
  readonly fixtures: readonly SeasonFixture[];
  /** Batavia's twelve league fixtures in round order. */
  readonly batavia: readonly SeasonFixture[];
  readonly venues: Readonly<Record<string, VenueId>>;
  /** Week each round is played: a Batavia round in its game's week; a Batavia bye round with the next Batavia round. */
  readonly roundWeek: ReadonlyMap<number, number>;
  readonly byId: ReadonlyMap<string, SeasonFixture>;
}

/** Circle-method single round robin with a bye slot; home/away alternates so it is stable and fair. */
function circle(clubs: readonly string[]): { round: number; a: string; b: string; homeFirst: boolean }[] {
  const teams: (string | null)[] = [...clubs, ...(clubs.length % 2 ? [null] : [])];
  const n = teams.length;
  const base: { round: number; a: string; b: string; homeFirst: boolean }[] = [];
  let order = teams.slice();
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = order[i]!;
      const b = order[n - 1 - i]!;
      if (a !== null && b !== null) base.push({ round: r + 1, a, b, homeFirst: (r + i) % 2 === 0 });
    }
    order = [order[0]!, order[n - 1]!, ...order.slice(1, n - 1)];
  }
  return base;
}
const has = (f: { a: string; b: string }, t: string): boolean => f.a === t || f.b === t;

function v1Fixtures(): SeasonFixture[] {
  const base = circle(LEAGUE_CLUBS);
  const out: SeasonFixture[] = [];
  for (let c = 0; c < 3; c++) {
    for (const f of base) {
      // Venues alternate by cycle so each pair meets home, away, home.
      const [home, away] = f.homeFirst !== (c % 2 === 1) ? [f.a, f.b] : [f.b, f.a];
      const round = c * LEAGUE_CLUBS.length + f.round;
      out.push({ id: `s1-r${round}-${home}-${away}`, round, cycle: c + 1, home, away });
    }
  }
  return out;
}
function v2Fixtures(): SeasonFixture[] {
  const base = circle(LEAGUE_CLUBS_9);
  const first = Math.max(...base.map((f) => f.round));
  const out: SeasonFixture[] = base.map((f) => {
    const [home, away] = f.homeFirst ? [f.a, f.b] : [f.b, f.a];
    return { id: `s1n-r${f.round}-${home}-${away}`, round: f.round, cycle: 1, home, away };
  });
  const rematch = [...new Set(base.filter((f) => has(f, HOME_CLUB)).map((f) => f.round))].sort((a, b) => a - b).slice(0, REMATCH_ROUNDS);
  rematch.forEach((r, i) => {
    for (const f of base.filter((x) => x.round === r)) {
      const [home, away] = f.homeFirst ? [f.b, f.a] : [f.a, f.b];
      const round = first + i + 1;
      out.push({ id: `s1n-r${round}-${home}-${away}`, round, cycle: 2, home, away });
    }
  });
  return out;
}

export const isBatavia = (f: SeasonFixture): boolean => f.home === HOME_CLUB || f.away === HOME_CLUB;
function format(version: SeasonLeagueVersion, clubs: readonly string[], fixtures: readonly SeasonFixture[]): LeagueFormat {
  const batavia = fixtures.filter(isBatavia).sort((a, b) => a.round - b.round);
  if (batavia.length !== LEAGUE_GAMES) throw new Error(`${version}: Batavia must play ${LEAGUE_GAMES} league games`);
  const games: [number, number][] = batavia.map((f, i) => [f.round, weekOfLeagueGame(i + 1)!]);
  const roundWeek = new Map<number, number>();
  for (const f of fixtures) roundWeek.set(f.round, (games.find(([r]) => r >= f.round) ?? games[games.length - 1]!)[1]);
  const venues = Object.freeze(assignLeagueVenues(batavia.map((f) => ({ id: f.id, bataviaHome: f.home === HOME_CLUB }))));
  return Object.freeze({ version, clubs, rounds: Math.max(...fixtures.map((f) => f.round)), fixtures, batavia, venues, roundWeek, byId: new Map(fixtures.map((f) => [f.id, f])) });
}
export const LEAGUE_FORMATS: Readonly<Record<SeasonLeagueVersion, LeagueFormat>> = Object.freeze({
  [SEASON_LEAGUE_V1]: format(SEASON_LEAGUE_V1, LEAGUE_CLUBS, v1Fixtures()),
  [SEASON_LEAGUE_VERSION]: format(SEASON_LEAGUE_VERSION, LEAGUE_CLUBS_9, v2Fixtures()),
});
/** The saved league's own format; with no league saved yet, the format a new league gets. */
export const leagueFormat = (s: { readonly version: SeasonLeagueVersion } | null | undefined): LeagueFormat => LEAGUE_FORMATS[s?.version ?? SEASON_LEAGUE_VERSION];

export const fixtureForGame = (game: number, s?: SeasonLeagueState | null): SeasonFixture | null => leagueFormat(s).batavia[game - 1] ?? null;
export function fixtureForSeasonWeek(week: number, s?: SeasonLeagueState | null): SeasonFixture | null {
  for (let g = 1; g <= LEAGUE_GAMES; g++) if (weekOfLeagueGame(g) === week) return fixtureForGame(g, s);
  return null;
}
export const opponentOf = (f: SeasonFixture): string => (f.home === HOME_CLUB ? f.away : f.home);


export function newSeasonLeague(careerId: string, seed: number): SeasonLeagueState {
  return { version: SEASON_LEAGUE_VERSION, careerId, seed: seed >>> 0, results: {}, simulatedThrough: 0, venues: { ...LEAGUE_FORMATS[SEASON_LEAGUE_VERSION].venues } };
}

/**
 * One-time venue migration for saves made before venues were stored: every Batavia fixture without a result gets its
 * rule venue; played fixtures stay exactly as recorded. A save that already has venues is returned unchanged.
 */
export function withLeagueVenues(s: SeasonLeagueState): { state: SeasonLeagueState; changed: boolean } {
  if (s.venues) return { state: s, changed: false };
  const venues: Record<string, VenueId> = {};
  for (const [id, v] of Object.entries(leagueFormat(s).venues)) if (!s.results[id]) venues[id] = v;
  return { state: { ...s, venues }, changed: true };
}
export const leagueVenue = (s: SeasonLeagueState, fixtureId: string): VenueId | null => s.venues?.[fixtureId] ?? null;
const goalsOk = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 40;

/** Records Batavia's finished match once. Same score again is a no-op; a different score is refused. */
export function recordSeasonPlayed(s: SeasonLeagueState, fixtureId: string, batavia: number, opponent: number): { ok: true; state: SeasonLeagueState; changed: boolean } | { ok: false; error: string } {
  const f = leagueFormat(s).byId.get(fixtureId);
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
  const fmt = leagueFormat(s);
  const upto = Math.max(0, Math.min(fmt.rounds, Math.floor(round)));
  if (upto <= s.simulatedThrough) return s;
  const results = { ...s.results };
  for (const f of fmt.fixtures) {
    if (f.round > upto || results[f.id] || isBatavia(f)) continue;
    results[f.id] = { fixtureId: f.id, ...simulatedScore(s.seed, f.id), source: 'simulated' };
  }
  return { ...s, results, simulatedThrough: upto };
}

export interface SeasonRow {
  readonly club: string;
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
  const fmt = leagueFormat(s);
  const rows = new Map(fmt.clubs.map((c) => [c, { club: c, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }]));
  for (const f of fmt.fixtures) {
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
  for (const f of leagueFormat(s).batavia) {
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
  if (o.version !== SEASON_LEAGUE_VERSION && o.version !== SEASON_LEAGUE_V1) return { ok: false, error: `unknown season league version ${String(o.version)}` };
  const byId = LEAGUE_FORMATS[o.version].byId;
  if (typeof o.careerId !== 'string' || !Number.isInteger(o.seed) || !Number.isInteger(o.simulatedThrough)) return { ok: false, error: 'bad fields' };
  if (typeof o.results !== 'object' || o.results === null || Array.isArray(o.results)) return { ok: false, error: 'bad results' };
  for (const [k, v] of Object.entries(o.results as Record<string, unknown>)) {
    const r = v as Record<string, unknown>;
    const f = byId.get(k);
    if (!f || r?.fixtureId !== k || !goalsOk(r.homeGoals) || !goalsOk(r.awayGoals) || (r.source !== 'played' && r.source !== 'simulated')) return { ok: false, error: `bad result ${k}` };
    if ((r.source === 'simulated') === isBatavia(f)) return { ok: false, error: `bad source ${k}` };
  }
  if (o.venues !== undefined) {
    if (typeof o.venues !== 'object' || o.venues === null || Array.isArray(o.venues)) return { ok: false, error: 'bad venues' };
    for (const [k, v] of Object.entries(o.venues as Record<string, unknown>)) {
      const f = byId.get(k);
      if (!f || !isBatavia(f) || !isVenueId(v)) return { ok: false, error: `bad venue ${k}` };
    }
  }
  return { ok: true, value: raw as SeasonLeagueState };
}
