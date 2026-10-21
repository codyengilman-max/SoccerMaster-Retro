/**
 * Season One local tournaments (owner storyboard 2026-10-21): eight teams in two groups of four, three
 * group games each (two Saturday, one Sunday), group winners meet in the final. Ten-point system:
 * win 6, draw 3, loss 0, +1 per goal up to three, +1 clean sheet (max 10 a match). Group tiebreakers:
 * points, wins, head-to-head (two-team tie only), goal difference capped at ±3 a match, fewest goals
 * conceded, then the drawing of lots recorded when the tournament is created. A tie is broken criterion
 * by criterion and never restarts after a partial separation. A tied final goes to a seeded shoot-out
 * (no playable shoot-out exists yet). Batavia's games are played; all others are simulated from the
 * seed and labelled. Results never touch the league. Framework-free and deterministic.
 *
 * Entrants: Batavia's group has Batavia, one league club and two out-of-state clubs. Next Horizon
 * (not in the league; owner: special exemption into tournaments) enters the other group with one
 * league club and two out-of-state clubs. Out-of-state names and colours are random fictional
 * working names (owner, 2026-10-21).
 */
import { createRng } from '../rng';
import { simulatedScore } from '../league/league';
import type { TournamentId } from './calendar';

export const TOURNAMENT_VERSION = 's1-t2';
export const HOME = 'batavia';

export interface TeamInfo { readonly name: string; readonly outOfState: boolean; readonly colors: readonly [string, string] | null }
export interface TournamentConfig {
  readonly id: TournamentId;
  readonly name: string;
  readonly week: number;
  /** groups[0] holds Batavia. */
  readonly groups: readonly [readonly [string, string, string, string], readonly [string, string, string, string]];
  readonly teams: Readonly<Record<string, TeamInfo>>;
  readonly nameStatus: 'working_fictional_name';
}

const LEAGUE = (name: string): TeamInfo => ({ name, outOfState: false, colors: null });
const OOS = (name: string, a: string, b: string): TeamInfo => ({ name, outOfState: true, colors: [a, b] });
export const TOURNAMENTS: Readonly<Record<TournamentId, TournamentConfig>> = Object.freeze({
  az_showcase: {
    id: 'az_showcase',
    name: 'AZ Showcase',
    week: 9,
    groups: [
      ['batavia', 'royal_salt', 'silver_state', 'pacific_crest'],
      ['valley_rising', 'next_horizon', 'wasatch_peak', 'rio_grande'],
    ],
    teams: {
      batavia: LEAGUE('FC Batavia'),
      royal_salt: LEAGUE('Royal Salt Academy'),
      valley_rising: LEAGUE('Valley Rising'),
      next_horizon: LEAGUE('Next Horizon'),
      silver_state: OOS('Silver State SC (NV)', '#2e7d32', '#ffffff'),
      pacific_crest: OOS('Pacific Crest FC (CA)', '#f9a825', '#1a237e'),
      wasatch_peak: OOS('Wasatch Peak United (UT)', '#6d4c41', '#ffcc80'),
      rio_grande: OOS('Rio Grande Rapids (NM)', '#00838f', '#212121'),
    },
    nameStatus: 'working_fictional_name',
  },
  holiday_classic: {
    id: 'holiday_classic',
    name: 'Holiday Classic',
    week: 12,
    groups: [
      ['batavia', 'desert_tuzon', 'front_range', 'cascade_city'],
      ['sol_vista', 'next_horizon', 'bayou_star', 'high_plains'],
    ],
    teams: {
      batavia: LEAGUE('FC Batavia'),
      desert_tuzon: LEAGUE('Desert Tuzon'),
      sol_vista: LEAGUE('Sol Vista'),
      next_horizon: LEAGUE('Next Horizon'),
      front_range: OOS('Front Range FC (CO)', '#c62828', '#eeeeee'),
      cascade_city: OOS('Cascade City SC (OR)', '#1b5e20', '#fdd835'),
      bayou_star: OOS('Bayou Star FC (LA)', '#4a148c', '#ffd54f'),
      high_plains: OOS('High Plains United (TX)', '#ef6c00', '#263238'),
    },
    nameStatus: 'working_fictional_name',
  },
});

export type Stage = 'g1' | 'g2' | 'g3' | 'final';
export const GROUP_STAGES: readonly Stage[] = ['g1', 'g2', 'g3'];
export interface TFixture { readonly id: string; readonly stage: Stage; readonly group: 0 | 1 | null; readonly home: string; readonly away: string }
export interface TResult {
  readonly fixtureId: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly source: 'played' | 'simulated';
  /** Final only, when level: the shoot-out winner (seeded, labelled simulated). */
  readonly shootoutWinner?: string;
}
export interface TournamentState {
  readonly version: typeof TOURNAMENT_VERSION;
  readonly id: TournamentId;
  readonly careerId: string;
  readonly seed: number;
  /** Drawing of lots, recorded once at creation: earlier = higher. */
  readonly lots: readonly string[];
  readonly results: Readonly<Record<string, TResult>>;
}

/** Per group: three rounds of two games (circle method); the first team plays in every round. */
export function groupFixtures(id: TournamentId): readonly TFixture[] {
  const out: TFixture[] = [];
  TOURNAMENTS[id].groups.forEach(([a, b, c, d], gi) => {
    const pairs: [Stage, string, string][] = [['g1', a, d], ['g1', b, c], ['g2', c, a], ['g2', d, b], ['g3', a, b], ['g3', c, d]];
    for (const [stage, home, away] of pairs) out.push({ id: `${id}-${stage}-${home}-${away}`, stage, group: gi as 0 | 1, home, away });
  });
  return out;
}

function hash(seed: number, s: string): number {
  let h = seed >>> 0;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0;
  return h;
}

export function newTournament(id: TournamentId, careerId: string, seed: number): TournamentState {
  const rnd = createRng(hash(seed, `${id}:lots`));
  const all = TOURNAMENTS[id].groups.flat();
  const keyed = all.map((t) => [t, rnd()] as const).sort((x, y) => x[1] - y[1]);
  return { version: TOURNAMENT_VERSION, id, careerId, seed: seed >>> 0, lots: keyed.map(([t]) => t), results: {} };
}

/** Ten-point system for one side of one match. */
export function matchPoints(us: number, them: number): number {
  return (us > them ? 6 : us === them ? 3 : 0) + Math.min(us, 3) + (them === 0 ? 1 : 0);
}

export interface TRow { readonly team: string; readonly played: number; readonly won: number; readonly drawn: number; readonly lost: number; readonly goalsFor: number; readonly goalsAgainst: number; readonly cappedGd: number; readonly points: number; readonly position: number }

/** One group's table from recorded results only; `complete` once all six games have results. */
export function groupTable(s: TournamentState, group: 0 | 1): { rows: readonly TRow[]; complete: boolean } {
  const fx = groupFixtures(s.id).filter((f) => f.group === group);
  const rows = new Map(TOURNAMENTS[s.id].groups[group].map((t) => [t, { team: t, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, cappedGd: 0, points: 0 }]));
  for (const f of fx) {
    const r = s.results[f.id];
    if (!r) continue;
    for (const [t, us, them] of [[f.home, r.homeGoals, r.awayGoals], [f.away, r.awayGoals, r.homeGoals]] as const) {
      const row = rows.get(t)!;
      row.played++;
      row.goalsFor += us;
      row.goalsAgainst += them;
      row.cappedGd += Math.max(-3, Math.min(3, us - them));
      row.points += matchPoints(us, them);
      if (us > them) row.won++;
      else if (us === them) row.drawn++;
      else row.lost++;
    }
  }
  const h2h = (x: string, y: string): number => {
    const f = fx.find((g) => (g.home === x && g.away === y) || (g.home === y && g.away === x));
    const r = f && s.results[f.id];
    if (!f || !r) return 0;
    const us = f.home === x ? r.homeGoals : r.awayGoals;
    const them = f.home === x ? r.awayGoals : r.homeGoals;
    return matchPoints(us, them);
  };
  type Row = (typeof rows extends Map<string, infer R> ? R : never);
  const criteria: ((t: Row, cluster: readonly Row[]) => number)[] = [
    (t) => t.points,
    (t) => t.won,
    // Head-to-head only when exactly two teams were level on points (multi-team ties skip it).
    (t, c) => (c.length === 2 && [...rows.values()].filter((o) => o.points === t.points).length === 2 ? h2h(t.team, c.find((o) => o !== t)!.team) : 0),
    (t) => t.cappedGd,
    (t) => -t.goalsAgainst,
    (t) => -s.lots.indexOf(t.team),
  ];
  // Split each tied cluster by the next criterion only; separated sub-clusters never restart at points.
  const rank = (cluster: readonly Row[], k: number): Row[] => {
    if (cluster.length <= 1 || k >= criteria.length) return [...cluster];
    const val = new Map(cluster.map((t) => [t, criteria[k]!(t, cluster)]));
    const levels = [...new Set(val.values())].sort((a, b) => b - a);
    return levels.flatMap((v) => rank(cluster.filter((t) => val.get(t) === v), k + 1));
  };
  const sorted = rank([...rows.values()], 0);
  return { rows: sorted.map((r, i) => ({ ...r, position: i + 1 })), complete: fx.every((f) => s.results[f.id] !== undefined) };
}

/** Group winners meet in the final, or null until both groups are complete. */
export function finalFixture(s: TournamentState): TFixture | null {
  const a = groupTable(s, 0);
  const b = groupTable(s, 1);
  if (!a.complete || !b.complete) return null;
  const home = a.rows[0]!.team;
  const away = b.rows[0]!.team;
  return { id: `${s.id}-final-${home}-${away}`, stage: 'final', group: null, home, away };
}

export function allFixtures(s: TournamentState): readonly TFixture[] {
  const f = finalFixture(s);
  return [...groupFixtures(s.id), ...(f ? [f] : [])];
}

const isHome = (f: TFixture): boolean => f.home === HOME || f.away === HOME;
/** Batavia's next game: its first group game without a result, then the final if it won the group. */
export function nextBataviaFixture(s: TournamentState): TFixture | null {
  for (const st of GROUP_STAGES) {
    const f = groupFixtures(s.id).find((x) => x.stage === st && isHome(x))!;
    if (!s.results[f.id]) return f;
  }
  const f = finalFixture(s);
  return f && isHome(f) && !s.results[f.id] ? f : null;
}
/** Batavia's fixture for game n (1–3 group, 4 = final), or null if not determined or not qualified. */
export function bataviaFixture(s: TournamentState, n: number): TFixture | null {
  if (n >= 1 && n <= 3) return groupFixtures(s.id).find((x) => x.stage === GROUP_STAGES[n - 1] && isHome(x)) ?? null;
  const f = n === 4 ? finalFixture(s) : null;
  return f && isHome(f) ? f : null;
}

function shootout(seed: number, f: TFixture): string {
  return createRng(hash(seed, `${f.id}:shootout`))() < 0.5 ? f.home : f.away;
}
function simulate(s: TournamentState, f: TFixture): TResult {
  const sc = simulatedScore(s.seed, f.id);
  return { fixtureId: f.id, ...sc, source: 'simulated', ...(f.stage === 'final' && sc.homeGoals === sc.awayGoals ? { shootoutWinner: shootout(s.seed, f) } : {}) };
}

const goalsOk = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 40;

/**
 * Records Batavia's finished game once and simulates the other games of that stage. Once both groups
 * are complete and Batavia is not in the final, the final is simulated. A repeat with the same score is
 * a no-op; a different score is refused; a fixture not yet due is refused.
 */
export function recordTournamentPlayed(s: TournamentState, fixtureId: string, batavia: number, opponent: number): { ok: true; state: TournamentState; changed: boolean } | { ok: false; error: string } {
  if (!goalsOk(batavia) || !goalsOk(opponent)) return { ok: false, error: 'bad score' };
  const f = allFixtures(s).find((x) => x.id === fixtureId);
  if (!f || !isHome(f)) return { ok: false, error: 'not a Batavia tournament fixture' };
  const homeGoals = f.home === HOME ? batavia : opponent;
  const awayGoals = f.home === HOME ? opponent : batavia;
  const prior = s.results[fixtureId];
  if (prior) return prior.homeGoals === homeGoals && prior.awayGoals === awayGoals ? { ok: true, state: s, changed: false } : { ok: false, error: 'result already recorded' };
  if (nextBataviaFixture(s)?.id !== fixtureId) return { ok: false, error: 'fixture is not due yet' };
  const results: Record<string, TResult> = { ...s.results, [fixtureId]: { fixtureId, homeGoals, awayGoals, source: 'played', ...(f.stage === 'final' && homeGoals === awayGoals ? { shootoutWinner: shootout(s.seed, f) } : {}) } };
  if (f.stage !== 'final') for (const o of groupFixtures(s.id)) if (o.stage === f.stage && !results[o.id]) results[o.id] = simulate(s, o);
  let next: TournamentState = { ...s, results };
  const fin = finalFixture(next);
  if (fin && !isHome(fin) && !next.results[fin.id]) next = { ...next, results: { ...next.results, [fin.id]: simulate(next, fin) } };
  return { ok: true, state: next, changed: true };
}

export type Finish = 'champion' | 'runner_up' | 'group_2' | 'group_3' | 'group_4';
/** Batavia's finish, or null while undecided (never a fabricated placing). */
export function bataviaFinish(s: TournamentState): Finish | null {
  const g = groupTable(s, 0);
  if (!g.complete) return null;
  const pos = g.rows.find((r) => r.team === HOME)!.position;
  if (pos > 1) return `group_${pos}` as Finish;
  const f = finalFixture(s)!;
  const r = s.results[f.id];
  if (!r) return null;
  return finalWinner(f, r) === HOME ? 'champion' : 'runner_up';
}
/** Batavia's story result for a recorded game: a level final is decided by its shoot-out; a level group game stays a draw. */
export function bataviaResult(s: TournamentState, fixtureId: string): 'WIN' | 'DRAW' | 'LOSS' | null {
  const f = allFixtures(s).find((x) => x.id === fixtureId);
  const r = f && s.results[fixtureId];
  if (!f || !r || !isHome(f)) return null;
  const us = f.home === HOME ? r.homeGoals : r.awayGoals;
  const them = f.home === HOME ? r.awayGoals : r.homeGoals;
  if (us !== them) return us > them ? 'WIN' : 'LOSS';
  return f.stage === 'final' ? (r.shootoutWinner === HOME ? 'WIN' : 'LOSS') : 'DRAW';
}
export function finalWinner(f: TFixture, r: TResult): string {
  return r.homeGoals > r.awayGoals ? f.home : r.awayGoals > r.homeGoals ? f.away : r.shootoutWinner!;
}

export function parseTournament(raw: unknown, id: TournamentId): { ok: true; value: TournamentState } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'not an object' };
  const o = raw as Record<string, unknown>;
  if (o.version !== TOURNAMENT_VERSION || o.id !== id) return { ok: false, error: 'unknown tournament save' };
  if (typeof o.careerId !== 'string' || !Number.isInteger(o.seed) || typeof o.results !== 'object' || o.results === null || Array.isArray(o.results)) return { ok: false, error: 'bad fields' };
  const teams = TOURNAMENTS[id].groups.flat();
  if (!Array.isArray(o.lots) || o.lots.length !== teams.length || !teams.every((t) => (o.lots as unknown[]).includes(t))) return { ok: false, error: 'bad lots' };
  const known = new Set(groupFixtures(id).map((f) => f.id));
  for (const [k, v] of Object.entries(o.results as Record<string, unknown>)) {
    const r = v as Record<string, unknown>;
    if (r?.fixtureId !== k || !goalsOk(r.homeGoals) || !goalsOk(r.awayGoals) || (r.source !== 'played' && r.source !== 'simulated')) return { ok: false, error: `bad result ${k}` };
    if (!known.has(k) && !k.startsWith(`${id}-final-`)) return { ok: false, error: `unknown fixture ${k}` };
  }
  const value = raw as TournamentState;
  const fin = finalFixture(value);
  for (const [k, r] of Object.entries(value.results)) {
    if (known.has(k)) {
      if (r.shootoutWinner !== undefined) return { ok: false, error: `group game with a shoot-out ${k}` };
      continue;
    }
    if (!fin || k !== fin.id) return { ok: false, error: `unreachable fixture ${k}` };
    if (r.homeGoals === r.awayGoals ? r.shootoutWinner !== fin.home && r.shootoutWinner !== fin.away : r.shootoutWinner !== undefined) return { ok: false, error: 'bad shoot-out winner on the final' };
  }
  return { ok: true, value };
}
