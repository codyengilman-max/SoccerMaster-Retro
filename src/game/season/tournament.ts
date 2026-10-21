/**
 * Season One tournaments (story package v1.0 working format): four entered teams, a single round robin
 * (three games each), then a championship game for the top two and a placement game for the other two.
 * Batavia's four games are played by the player; the other games are simulated from the seed and
 * labelled. Results never touch the league. Framework-free and deterministic.
 *
 * Configured here because the story leaves them open (owner decisions pending, documented in
 * docs/story/season-one/REQUIREMENTS_MAP.md):
 * - Entrants: FC Batavia plus three fictional U11 clubs with working names.
 * - Table ties: points, head-to-head points, goal difference, goals for, then a seeded drawing of lots.
 * - Playoff pairing only once all six round-robin results exist; a missing result leaves it undecided.
 * - Rest: one game per story step; the player continues between games, never several at once.
 * - A drawn championship or placement game is a shared result (no shoot-out engine exists).
 */
import { createRng } from '../rng';
import { simulatedScore } from '../league/league';
import type { TournamentId } from './calendar';

export const TOURNAMENT_VERSION = 's1-t1';
export const HOME = 'batavia';

export interface TournamentConfig {
  readonly id: TournamentId;
  readonly name: string;
  readonly week: number;
  readonly entrants: readonly [string, string, string, string];
  readonly names: Readonly<Record<string, string>>;
  readonly tieRule: readonly ('points' | 'head_to_head' | 'goal_difference' | 'goals_for' | 'lots')[];
  readonly drawnPlayoff: 'shared';
  readonly nameStatus: 'working_fictional_name';
}
const TIE_RULE = ['points', 'head_to_head', 'goal_difference', 'goals_for', 'lots'] as const;
export const TOURNAMENTS: Readonly<Record<TournamentId, TournamentConfig>> = Object.freeze({
  az_showcase: {
    id: 'az_showcase',
    name: 'AZ Showcase',
    week: 9,
    entrants: ['batavia', 'saguaro_hills', 'red_rock_rovers', 'canyon_breeze'],
    names: { batavia: 'FC Batavia', saguaro_hills: 'Saguaro Hills FC', red_rock_rovers: 'Red Rock Rovers', canyon_breeze: 'Canyon Breeze SC' },
    tieRule: TIE_RULE,
    drawnPlayoff: 'shared',
    nameStatus: 'working_fictional_name',
  },
  holiday_classic: {
    id: 'holiday_classic',
    name: 'Holiday Classic',
    week: 12,
    entrants: ['batavia', 'mirage_valley', 'copper_trail', 'sunset_mesa'],
    names: { batavia: 'FC Batavia', mirage_valley: 'Mirage Valley FC', copper_trail: 'Copper Trail SC', sunset_mesa: 'Sunset Mesa United' },
    tieRule: TIE_RULE,
    drawnPlayoff: 'shared',
    nameStatus: 'working_fictional_name',
  },
});

export type Stage = 'rr1' | 'rr2' | 'rr3' | 'final' | 'placement';
export interface TFixture { readonly id: string; readonly stage: Stage; readonly home: string; readonly away: string }
export interface TResult { readonly fixtureId: string; readonly homeGoals: number; readonly awayGoals: number; readonly source: 'played' | 'simulated' }
export interface TournamentState {
  readonly version: typeof TOURNAMENT_VERSION;
  readonly id: TournamentId;
  readonly careerId: string;
  readonly seed: number;
  readonly results: Readonly<Record<string, TResult>>;
}

/** Round robin for four teams (circle method): three rounds of two games, Batavia in each round. */
export function roundRobin(id: TournamentId): readonly TFixture[] {
  const [a, b, c, d] = TOURNAMENTS[id].entrants;
  const pairs: [Stage, string, string][] = [
    ['rr1', a, d], ['rr1', b, c],
    ['rr2', c, a], ['rr2', d, b],
    ['rr3', a, b], ['rr3', c, d],
  ];
  return pairs.map(([stage, home, away]) => ({ id: `${id}-${stage}-${home}-${away}`, stage, home, away }));
}

export function newTournament(id: TournamentId, careerId: string, seed: number): TournamentState {
  return { version: TOURNAMENT_VERSION, id, careerId, seed: seed >>> 0, results: {} };
}

export interface TRow { readonly team: string; readonly played: number; readonly won: number; readonly drawn: number; readonly lost: number; readonly goalsFor: number; readonly goalsAgainst: number; readonly points: number; readonly position: number }

function lots(seed: number, id: string, team: string): number {
  let h = seed >>> 0;
  for (const ch of `${id}:${team}`) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0;
  return createRng(h)();
}

/** Round-robin table from recorded results only. `complete` is true when all six games have results. */
export function groupTable(s: TournamentState): { rows: readonly TRow[]; complete: boolean } {
  const rr = roundRobin(s.id);
  const rows = new Map(TOURNAMENTS[s.id].entrants.map((t) => [t, { team: t, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }]));
  for (const f of rr) {
    const r = s.results[f.id];
    if (!r) continue;
    const h = rows.get(f.home)!;
    const a = rows.get(f.away)!;
    h.played++, a.played++;
    h.goalsFor += r.homeGoals, h.goalsAgainst += r.awayGoals;
    a.goalsFor += r.awayGoals, a.goalsAgainst += r.homeGoals;
    if (r.homeGoals > r.awayGoals) (h.won++, a.lost++, (h.points += 3));
    else if (r.homeGoals < r.awayGoals) (a.won++, h.lost++, (a.points += 3));
    else (h.drawn++, a.drawn++, h.points++, a.points++);
  }
  const h2h = (x: string, group: readonly string[]): number => {
    let p = 0;
    for (const f of rr) {
      const r = s.results[f.id];
      if (!r || !group.includes(f.home) || !group.includes(f.away) || (f.home !== x && f.away !== x)) continue;
      const us = f.home === x ? r.homeGoals : r.awayGoals;
      const them = f.home === x ? r.awayGoals : r.homeGoals;
      p += us > them ? 3 : us === them ? 1 : 0;
    }
    return p;
  };
  const list = [...rows.values()];
  const samePoints = (t: { points: number }): string[] => list.filter((o) => o.points === t.points).map((o) => o.team);
  list.sort(
    (x, y) =>
      y.points - x.points ||
      h2h(y.team, samePoints(y)) - h2h(x.team, samePoints(x)) ||
      y.goalsFor - y.goalsAgainst - (x.goalsFor - x.goalsAgainst) ||
      y.goalsFor - x.goalsFor ||
      lots(s.seed, s.id, y.team) - lots(s.seed, s.id, x.team),
  );
  return { rows: list.map((r, i) => ({ ...r, position: i + 1 })), complete: rr.every((f) => s.results[f.id] !== undefined) };
}

/** Championship (1 v 2) and placement (3 v 4) fixtures, or null until the group is complete. */
export function playoffs(s: TournamentState): { final: TFixture; placement: TFixture } | null {
  const g = groupTable(s);
  if (!g.complete) return null;
  const [p1, p2, p3, p4] = g.rows.map((r) => r.team) as [string, string, string, string];
  return {
    final: { id: `${s.id}-final-${p1}-${p2}`, stage: 'final', home: p1, away: p2 },
    placement: { id: `${s.id}-placement-${p3}-${p4}`, stage: 'placement', home: p3, away: p4 },
  };
}

export function allFixtures(s: TournamentState): readonly TFixture[] {
  const po = playoffs(s);
  return [...roundRobin(s.id), ...(po ? [po.final, po.placement] : [])];
}

const ORDER: readonly Stage[] = ['rr1', 'rr2', 'rr3'];
/** Batavia's next fixture to play: the first round-robin game without a result, then its playoff. */
export function nextBataviaFixture(s: TournamentState): TFixture | null {
  for (const st of ORDER) {
    const f = roundRobin(s.id).find((x) => x.stage === st && (x.home === HOME || x.away === HOME))!;
    if (!s.results[f.id]) return f;
  }
  const po = playoffs(s);
  if (!po) return null;
  const mine = [po.final, po.placement].find((f) => f.home === HOME || f.away === HOME)!;
  return s.results[mine.id] ? null : mine;
}
/** Batavia's fixture for game n (1–4), or null if not yet determined. */
export function bataviaFixture(s: TournamentState, n: number): TFixture | null {
  if (n >= 1 && n <= 3) return roundRobin(s.id).find((x) => x.stage === ORDER[n - 1] && (x.home === HOME || x.away === HOME)) ?? null;
  if (n !== 4) return null;
  const po = playoffs(s);
  return po ? ([po.final, po.placement].find((f) => f.home === HOME || f.away === HOME) ?? null) : null;
}

const goalsOk = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 40;

/**
 * Records Batavia's finished game once and simulates the other game of the same stage. A repeat with
 * the same score is a no-op; a different score is refused; a fixture not yet due is refused.
 */
export function recordTournamentPlayed(s: TournamentState, fixtureId: string, batavia: number, opponent: number): { ok: true; state: TournamentState; changed: boolean } | { ok: false; error: string } {
  if (!goalsOk(batavia) || !goalsOk(opponent)) return { ok: false, error: 'bad score' };
  const f = allFixtures(s).find((x) => x.id === fixtureId);
  if (!f || (f.home !== HOME && f.away !== HOME)) return { ok: false, error: 'not a Batavia tournament fixture' };
  const homeGoals = f.home === HOME ? batavia : opponent;
  const awayGoals = f.home === HOME ? opponent : batavia;
  const prior = s.results[fixtureId];
  if (prior) return prior.homeGoals === homeGoals && prior.awayGoals === awayGoals ? { ok: true, state: s, changed: false } : { ok: false, error: 'result already recorded' };
  if (nextBataviaFixture(s)?.id !== fixtureId) return { ok: false, error: 'fixture is not due yet' };
  const results: Record<string, TResult> = { ...s.results, [fixtureId]: { fixtureId, homeGoals, awayGoals, source: 'played' } };
  const playoff = f.stage === 'final' || f.stage === 'placement';
  const other = allFixtures(s).find((x) => x.id !== f.id && (playoff ? x.stage === 'final' || x.stage === 'placement' : x.stage === f.stage));
  if (other && !results[other.id]) results[other.id] = { fixtureId: other.id, ...simulatedScore(s.seed, other.id), source: 'simulated' };
  return { ok: true, state: { ...s, results }, changed: true };
}

export type Finish = 'champion' | 'shared_champion' | 'runner_up' | 'third' | 'shared_third' | 'fourth';
/** Batavia's finish, or null while its playoff has no result (never a fabricated placing). */
export function bataviaFinish(s: TournamentState): Finish | null {
  const po = playoffs(s);
  if (!po) return null;
  const f = [po.final, po.placement].find((x) => x.home === HOME || x.away === HOME)!;
  const r = s.results[f.id];
  if (!r) return null;
  const us = f.home === HOME ? r.homeGoals : r.awayGoals;
  const them = f.home === HOME ? r.awayGoals : r.homeGoals;
  if (f.stage === 'final') return us > them ? 'champion' : us === them ? 'shared_champion' : 'runner_up';
  return us > them ? 'third' : us === them ? 'shared_third' : 'fourth';
}

export function parseTournament(raw: unknown, id: TournamentId): { ok: true; value: TournamentState } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'not an object' };
  const o = raw as Record<string, unknown>;
  if (o.version !== TOURNAMENT_VERSION || o.id !== id) return { ok: false, error: 'unknown tournament save' };
  if (typeof o.careerId !== 'string' || !Number.isInteger(o.seed) || typeof o.results !== 'object' || o.results === null || Array.isArray(o.results)) return { ok: false, error: 'bad fields' };
  // Replay the results in order so only reachable fixtures with valid scores are accepted.
  const known = new Set([...roundRobin(id).map((f) => f.id)]);
  for (const [k, v] of Object.entries(o.results as Record<string, unknown>)) {
    const r = v as Record<string, unknown>;
    if (r?.fixtureId !== k || !goalsOk(r.homeGoals) || !goalsOk(r.awayGoals) || (r.source !== 'played' && r.source !== 'simulated')) return { ok: false, error: `bad result ${k}` };
    if (!known.has(k) && !/^(az_showcase|holiday_classic)-(final|placement)-[a-z_]+-[a-z_]+$/.test(k)) return { ok: false, error: `unknown fixture ${k}` };
  }
  const value = raw as TournamentState;
  const po = playoffs(value);
  for (const k of Object.keys(value.results)) if (!known.has(k) && (!po || (k !== po.final.id && k !== po.placement.id))) return { ok: false, error: `unreachable fixture ${k}` };
  return { ok: true, value };
}
