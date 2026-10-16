/**
 * U11 local league (owner decision C, 2026-10-16): FC Batavia plus four clubs from club_world.json,
 * a single round robin (each club meets the others once; one bye per round), 3/1/0 points.
 * Next Horizon is NOT ENTERED (package §08). Batavia's fixtures are the story's weekly matches;
 * other fixtures are simulated from a seed and labelled as such. Framework-free and deterministic.
 */
import { createRng } from '../attack/rng';

export const LEAGUE_VERSION = 1;
export const LEAGUE_CLUBS = ['batavia', 'royal_salt', 'valley_rising', 'desert_tuzon', 'sol_vista'] as const;
export type LeagueClubId = (typeof LEAGUE_CLUBS)[number];
export const NOT_ENTERED = ['next_horizon'] as const;
export const HOME_CLUB: LeagueClubId = 'batavia';
export const ROUNDS = LEAGUE_CLUBS.length; // odd club count: 5 rounds, each club plays 4 and rests once
export const POINTS = { win: 3, draw: 1, loss: 0 } as const;

export interface Fixture {
  readonly id: string;
  readonly round: number;
  readonly home: LeagueClubId;
  readonly away: LeagueClubId;
}
export interface Result {
  readonly fixtureId: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
  /** 'played' = a real match the player finished; 'simulated' = a club fixture the player did not play. */
  readonly source: 'played' | 'simulated';
}
export interface LeagueState {
  readonly version: typeof LEAGUE_VERSION;
  readonly careerId: string;
  readonly seed: number;
  /** Results keyed by fixture id. A recorded result is never rewritten. */
  readonly results: Readonly<Record<string, Result>>;
  /** Highest round whose other fixtures were simulated. */
  readonly simulatedThrough: number;
}

/** Circle-method schedule with a bye slot; home/away alternates so it is stable and fair. */
export function fixtures(): readonly Fixture[] {
  const teams: (LeagueClubId | null)[] = [...LEAGUE_CLUBS, null];
  const n = teams.length;
  const out: Fixture[] = [];
  let order = teams.slice();
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = order[i]!;
      const b = order[n - 1 - i]!;
      if (a === null || b === null) continue;
      const [home, away] = (r + i) % 2 === 0 ? [a, b] : [b, a];
      out.push({ id: `r${r + 1}-${home}-${away}`, round: r + 1, home, away });
    }
    order = [order[0]!, order[n - 1]!, ...order.slice(1, n - 1)];
  }
  return out;
}
export const FIXTURES = fixtures();

/** Batavia's fixtures in round order (its bye round is skipped), used for story weeks 1–4. */
export function homeFixtures(): readonly Fixture[] {
  return FIXTURES.filter((f) => f.home === HOME_CLUB || f.away === HOME_CLUB).sort((a, b) => a.round - b.round);
}
/** Story week (1-based) → Batavia fixture, or null beyond the season. */
export const fixtureForWeek = (week: number): Fixture | null => homeFixtures()[week - 1] ?? null;

export function newLeague(careerId: string, seed: number): LeagueState {
  return { version: LEAGUE_VERSION, careerId, seed: seed >>> 0, results: {}, simulatedThrough: 0 };
}

const goalsOk = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 40;

/**
 * Records the player's finished match for a Batavia fixture once. Repeats with the same score are
 * no-ops; a different score for an already recorded fixture is rejected. Leaving early records nothing.
 */
export function recordPlayed(s: LeagueState, fixtureId: string, batavia: number, opponent: number): { ok: true; state: LeagueState; changed: boolean } | { ok: false; error: string } {
  const f = FIXTURES.find((x) => x.id === fixtureId);
  if (!f || (f.home !== HOME_CLUB && f.away !== HOME_CLUB)) return { ok: false, error: 'not a Batavia fixture' };
  if (!goalsOk(batavia) || !goalsOk(opponent)) return { ok: false, error: 'bad score' };
  const homeGoals = f.home === HOME_CLUB ? batavia : opponent;
  const awayGoals = f.home === HOME_CLUB ? opponent : batavia;
  const prior = s.results[fixtureId];
  if (prior) {
    return prior.homeGoals === homeGoals && prior.awayGoals === awayGoals && prior.source === 'played'
      ? { ok: true, state: s, changed: false }
      : { ok: false, error: 'result already recorded' };
  }
  return { ok: true, state: { ...s, results: { ...s.results, [fixtureId]: { fixtureId, homeGoals, awayGoals, source: 'played' } } }, changed: true };
}

/** Deterministic score for a fixture the player did not play (seed + fixture id; order independent). */
export function simulatedScore(seed: number, fixtureId: string): { homeGoals: number; awayGoals: number } {
  let h = seed >>> 0;
  for (let i = 0; i < fixtureId.length; i++) h = Math.imul(h ^ fixtureId.charCodeAt(i), 2654435761) >>> 0;
  const rnd = createRng(h);
  const goals = (): number => {
    const r = rnd();
    return r < 0.22 ? 0 : r < 0.5 ? 1 : r < 0.75 ? 2 : r < 0.9 ? 3 : r < 0.97 ? 4 : 5;
  };
  return { homeGoals: goals(), awayGoals: goals() };
}

/** Simulates every non-Batavia fixture up to `round` that has no result yet. Batavia fixtures are never simulated. */
export function simulateThrough(s: LeagueState, round: number): LeagueState {
  const upto = Math.max(0, Math.min(ROUNDS, Math.floor(round)));
  if (upto <= s.simulatedThrough) return s;
  const results = { ...s.results };
  for (const f of FIXTURES) {
    if (f.round > upto || results[f.id] || f.home === HOME_CLUB || f.away === HOME_CLUB) continue;
    results[f.id] = { fixtureId: f.id, ...simulatedScore(s.seed, f.id), source: 'simulated' };
  }
  return { ...s, results, simulatedThrough: upto };
}

export interface TableRow {
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

/** Standings from recorded results only: a fixture with no result is not a loss. Ties: points, GD, GF, name. */
export function table(s: LeagueState, names: Readonly<Record<string, string>> = {}): readonly TableRow[] {
  const rows = new Map<LeagueClubId, { club: LeagueClubId; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number }>();
  for (const c of LEAGUE_CLUBS) rows.set(c, { club: c, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
  for (const f of FIXTURES) {
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
  const sorted = [...rows.values()].sort(
    (x, y) => y.points - x.points || y.goalsFor - y.goalsAgainst - (x.goalsFor - x.goalsAgainst) || y.goalsFor - x.goalsFor || name(x.club).localeCompare(name(y.club)),
  );
  return sorted.map((r, i) => ({ ...r, position: i + 1 }));
}

/** Strict structural check of a saved league; unknown fixture ids or bad scores reject the save. */
export function parseLeague(raw: unknown): { ok: true; value: LeagueState } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'not an object' };
  const o = raw as Record<string, unknown>;
  if (o.version !== LEAGUE_VERSION) return { ok: false, error: `unknown league version ${String(o.version)}` };
  if (typeof o.careerId !== 'string' || !Number.isInteger(o.seed) || !Number.isInteger(o.simulatedThrough)) return { ok: false, error: 'bad fields' };
  if (typeof o.results !== 'object' || o.results === null || Array.isArray(o.results)) return { ok: false, error: 'bad results' };
  for (const [k, v] of Object.entries(o.results as Record<string, unknown>)) {
    const r = v as Record<string, unknown>;
    if (!FIXTURES.some((f) => f.id === k) || r?.fixtureId !== k || !goalsOk(r.homeGoals) || !goalsOk(r.awayGoals) || (r.source !== 'played' && r.source !== 'simulated')) return { ok: false, error: `bad result ${k}` };
  }
  return { ok: true, value: raw as LeagueState };
}
