/**
 * Arizona State Cup (owner storyboard 2026-10-21): four teams, the top three of the league plus Next
 * Horizon as the fourth team by special exemption (owner 2026-10-21). League position alone qualifies
 * Batavia; the strength ranking never
 * does. The semifinal draw is recorded once when the cup is created. Semifinals in week 17, final in
 * week 18. A level game goes to a seeded shoot-out (no playable shoot-out exists yet). Batavia's games
 * are played; others are simulated and labelled. Framework-free and deterministic.
 */
import { createRng } from '../rng';
import { simulatedScore } from '../league/league';
import { SEASON_FIXTURES, seasonTable, type SeasonLeagueState } from './league';

export const STATE_CUP_VERSION = 'sc1';
export const STATE_CUP_INVITED = 'next_horizon';
export const HOME = 'batavia';

export interface CupFixture { readonly id: string; readonly stage: 'semi' | 'final'; readonly home: string; readonly away: string }
export interface CupResult { readonly fixtureId: string; readonly homeGoals: number; readonly awayGoals: number; readonly source: 'played' | 'simulated'; readonly shootoutWinner?: string }
export interface StateCupState {
  readonly version: typeof STATE_CUP_VERSION;
  readonly careerId: string;
  readonly seed: number;
  /** League top three in order, then the invited club. */
  readonly entrants: readonly [string, string, string, string];
  /** Recorded draw: semis are draw[0] v draw[1] and draw[2] v draw[3]. */
  readonly draw: readonly [string, string, string, string];
  readonly results: Readonly<Record<string, CupResult>>;
}

const hash = (seed: number, s: string): number => {
  let h = seed >>> 0;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0;
  return h;
};

/** League top three once every league fixture has a result; null while the league is unfinished. */
export function leagueQualifiers(league: SeasonLeagueState): readonly [string, string, string] | null {
  if (!SEASON_FIXTURES.every((f) => league.results[f.id])) return null;
  const [a, b, c] = seasonTable(league).map((r) => r.club);
  return [a!, b!, c!];
}

export function newStateCup(league: SeasonLeagueState, careerId: string, seed: number): StateCupState | null {
  const q = leagueQualifiers(league);
  if (!q) return null;
  const entrants = [...q, STATE_CUP_INVITED] as [string, string, string, string];
  const rnd = createRng(hash(seed, 'state-cup-draw'));
  const draw = entrants.map((t) => [t, rnd()] as const).sort((x, y) => x[1] - y[1]).map(([t]) => t) as [string, string, string, string];
  return { version: STATE_CUP_VERSION, careerId, seed: seed >>> 0, entrants, draw, results: {} };
}

export const qualified = (s: StateCupState): boolean => s.entrants.includes(HOME);

export function semis(s: StateCupState): readonly [CupFixture, CupFixture] {
  const [a, b, c, d] = s.draw;
  return [{ id: `sc-semi-${a}-${b}`, stage: 'semi', home: a, away: b }, { id: `sc-semi-${c}-${d}`, stage: 'semi', home: c, away: d }];
}
export function winnerOf(f: CupFixture, r: CupResult): string {
  return r.homeGoals > r.awayGoals ? f.home : r.awayGoals > r.homeGoals ? f.away : r.shootoutWinner!;
}
export function cupFinal(s: StateCupState): CupFixture | null {
  const [x, y] = semis(s);
  const rx = s.results[x.id];
  const ry = s.results[y.id];
  if (!rx || !ry) return null;
  const home = winnerOf(x, rx);
  const away = winnerOf(y, ry);
  return { id: `sc-final-${home}-${away}`, stage: 'final', home, away };
}

function result(s: StateCupState, f: CupFixture, hg: number, ag: number, source: 'played' | 'simulated'): CupResult {
  return { fixtureId: f.id, homeGoals: hg, awayGoals: ag, source, ...(hg === ag ? { shootoutWinner: createRng(hash(s.seed, `${f.id}:shootout`))() < 0.5 ? f.home : f.away } : {}) };
}
const sim = (s: StateCupState, f: CupFixture): CupResult => {
  const g = simulatedScore(s.seed, f.id);
  return result(s, f, g.homeGoals, g.awayGoals, 'simulated');
};
const mine = (f: CupFixture | null): f is CupFixture => !!f && has(f);
const has = (f: CupFixture): boolean => f.home === HOME || f.away === HOME;

/** Batavia's next State Cup game, or null (not qualified, eliminated, or finished). */
export function nextCupFixture(s: StateCupState): CupFixture | null {
  const semi = semis(s).find(mine);
  if (!semi) return null;
  if (!s.results[semi.id]) return semi;
  const fin = cupFinal(s);
  return mine(fin) && !s.results[fin.id] ? fin : null;
}

/**
 * Simulates every game Batavia is not in: both semis if it did not qualify, the other semi alongside
 * its own, and the final once Batavia is out. Idempotent.
 */
function fillSimulated(s: StateCupState): StateCupState {
  const results = { ...s.results };
  const [x, y] = semis(s);
  const ownSemi = semis(s).find(mine);
  for (const f of [x, y]) if (!results[f.id] && !has(f) && (!ownSemi || results[ownSemi.id])) results[f.id] = sim(s, f);
  let next = { ...s, results };
  const fin = cupFinal(next);
  if (fin && !has(fin) && !results[fin.id]) next = { ...next, results: { ...results, [fin.id]: sim(next, fin) } };
  return next;
}

/** A non-qualified Batavia: the cup proceeds without an invented berth. */
export function simulateWithoutBatavia(s: StateCupState): StateCupState {
  return qualified(s) ? s : fillSimulated(s);
}

const goalsOk = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 40;

export function recordCupPlayed(s: StateCupState, fixtureId: string, batavia: number, opponent: number): { ok: true; state: StateCupState; changed: boolean } | { ok: false; error: string } {
  if (!goalsOk(batavia) || !goalsOk(opponent)) return { ok: false, error: 'bad score' };
  const f = [...semis(s), cupFinal(s)].find((x) => x?.id === fixtureId) ?? null;
  if (!mine(f)) return { ok: false, error: 'not a Batavia State Cup fixture' };
  const hg = f.home === HOME ? batavia : opponent;
  const ag = f.home === HOME ? opponent : batavia;
  const prior = s.results[fixtureId];
  if (prior) return prior.homeGoals === hg && prior.awayGoals === ag ? { ok: true, state: s, changed: false } : { ok: false, error: 'result already recorded' };
  if (nextCupFixture(s)?.id !== fixtureId) return { ok: false, error: 'fixture is not due yet' };
  return { ok: true, state: fillSimulated({ ...s, results: { ...s.results, [fixtureId]: result(s, f, hg, ag, 'played') } }), changed: true };
}

export type CupFinish = 'champion' | 'runner_up' | 'semifinal' | 'not_qualified';
export function cupFinish(s: StateCupState): CupFinish | null {
  if (!qualified(s)) return 'not_qualified';
  const semi = semis(s).find(mine)!;
  const r = s.results[semi.id];
  if (!r) return null;
  if (winnerOf(semi, r) !== HOME) return 'semifinal';
  const fin = cupFinal(s);
  const rf = fin && s.results[fin.id];
  return fin && rf ? (winnerOf(fin, rf) === HOME ? 'champion' : 'runner_up') : null;
}

export function parseStateCup(raw: unknown, league: SeasonLeagueState): { ok: true; value: StateCupState } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'not an object' };
  const o = raw as Record<string, unknown>;
  if (o.version !== STATE_CUP_VERSION || typeof o.careerId !== 'string' || !Number.isInteger(o.seed)) return { ok: false, error: 'unknown state cup save' };
  const q = leagueQualifiers(league);
  const ents = o.entrants as unknown[];
  if (!q || !Array.isArray(ents) || ents.length !== 4 || ents[0] !== q[0] || ents[1] !== q[1] || ents[2] !== q[2] || ents[3] !== STATE_CUP_INVITED) return { ok: false, error: 'entrants do not match the league' };
  const draw = o.draw as unknown[];
  if (!Array.isArray(draw) || draw.length !== 4 || !ents.every((t) => draw.includes(t))) return { ok: false, error: 'bad draw' };
  if (typeof o.results !== 'object' || o.results === null || Array.isArray(o.results)) return { ok: false, error: 'bad results' };
  const value = raw as StateCupState;
  // Semis first, so the final is only resolved from validated semifinal winners.
  const check = (f: CupFixture, r: CupResult | undefined): string | null => {
    if (!r) return null;
    if (r.fixtureId !== f.id || !goalsOk(r.homeGoals) || !goalsOk(r.awayGoals) || (r.source !== 'played' && r.source !== 'simulated')) return `bad result ${f.id}`;
    if (r.homeGoals === r.awayGoals ? r.shootoutWinner !== f.home && r.shootoutWinner !== f.away : r.shootoutWinner !== undefined) return `bad shoot-out winner ${f.id}`;
    return null;
  };
  for (const f of semis(value)) {
    const e = check(f, value.results[f.id]);
    if (e) return { ok: false, error: e };
  }
  const fin = cupFinal(value);
  const known = new Set([...semis(value).map((f) => f.id), ...(fin ? [fin.id] : [])]);
  for (const k of Object.keys(value.results)) if (!known.has(k)) return { ok: false, error: `bad result ${k}` };
  const e = fin ? check(fin, value.results[fin.id]) : null;
  if (e) return { ok: false, error: e };
  return { ok: true, value };
}
