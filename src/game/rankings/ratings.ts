/**
 * Simulated career-world national rankings: one Elo rating per team, published once per in-game
 * matchweek as an immutable snapshot. Inputs are canonical finalized results only (story league,
 * the two tournaments, the State Cup and the simulated background fixtures); standings and ranks are
 * always derived, never incremented. Framework-free and deterministic.
 *
 * Rules: Expected = 1 / (1 + 10^((opp - own) / 400)); Change = K x (actual - expected), K = 24, both
 * sides from pre-match ratings (equal and opposite), full precision stored, rounding for display only,
 * no goal-margin multiplier. A level match decided by shoot-out is a draw for the rating; the
 * tournament keeps its shoot-out winner. Results are processed by week, kickoff slot, then fixture ID.
 * A result finalized after its week was published counts in the next published week.
 */
import { SEASON_FIXTURES, type SeasonLeagueState } from '../season/league';
import { LEAGUE_GAMES, fixtureForGame } from '../season/league';
import { SEASON_WEEKS, weekOfLeagueGame, type TournamentId } from '../season/calendar';
import { TOURNAMENTS, allFixtures, type TournamentState } from '../season/tournament';
import { cupFinal, semis, type StateCupState } from '../season/stateCup';
import { BG_FIXTURES, simulateBackground, type BgResult } from './background';
import { TEAMS } from './teams';

export const RANKINGS_VERSION = 'r1';
export const ELO_K = 24;
export const PRESEASON_ID = 's1-pre';
export const snapshotId = (week: number): string => `s1-w${week}`;

export type Competition = 'league' | 'tournament' | 'state_cup' | 'bg_league' | 'bg_showcase';
export interface WorldResult {
  readonly id: string;
  readonly week: number;
  readonly slot: number;
  readonly competition: Competition;
  readonly home: string;
  readonly away: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly shootoutWinner?: string;
  readonly source: 'played' | 'simulated';
}
export interface Snapshot {
  readonly id: string;
  /** 0 = Preseason. */
  readonly week: number;
  readonly ratings: Readonly<Record<string, number>>;
  /** True while some teams have no result path to the others (cross-region comparisons are rough). */
  readonly provisional: boolean;
}
/** Ratings of both teams immediately before a counted result (for schedule strength). */
export interface Applied { readonly id: string; readonly snapshot: string; readonly pre: readonly [number, number] }
export interface RankingsState {
  readonly version: typeof RANKINGS_VERSION;
  readonly careerId: string;
  readonly seed: number;
  /** First week whose background fixtures are simulated. A save that predates rankings starts at the week it was migrated: earlier background games are never invented. */
  readonly startWeek: number;
  readonly snapshots: readonly Snapshot[];
  readonly background: Readonly<Record<string, BgResult>>;
  readonly applied: readonly Applied[];
}

export interface StoryResults {
  readonly league: SeasonLeagueState | null;
  readonly cups: Partial<Record<TournamentId, TournamentState>>;
  readonly stateCup: StateCupState | null;
}

const STATE_CUP_WEEKS = SEASON_WEEKS.filter((w) => w.kind === 'state_cup').map((w) => w.week);
/** Week each league round is played: a Batavia round in its game's week; a Batavia bye round with the next Batavia round (it is simulated then). */
export const ROUND_WEEK: ReadonlyMap<number, number> = (() => {
  const batavia: [number, number][] = [];
  for (let g = 1; g <= LEAGUE_GAMES; g++) batavia.push([fixtureForGame(g)!.round, weekOfLeagueGame(g)!]);
  batavia.sort((a, b) => a[0] - b[0]);
  const m = new Map<number, number>();
  for (const f of SEASON_FIXTURES) m.set(f.round, (batavia.find(([r]) => r >= f.round) ?? batavia[batavia.length - 1]!)[1]);
  return m;
})();

/** Every finalized result, canonical order. Unplayed fixtures are absent, never draws. */
export function worldResults(story: StoryResults, background: Readonly<Record<string, BgResult>>): readonly WorldResult[] {
  const out: WorldResult[] = [];
  if (story.league) for (const f of SEASON_FIXTURES) {
    const r = story.league.results[f.id];
    if (r) out.push({ id: `lg:${f.id}`, week: ROUND_WEEK.get(f.round)!, slot: f.round, competition: 'league', home: f.home, away: f.away, homeGoals: r.homeGoals, awayGoals: r.awayGoals, source: r.source });
  }
  for (const id of Object.keys(TOURNAMENTS) as TournamentId[]) {
    const t = story.cups[id];
    if (!t) continue;
    for (const f of allFixtures(t)) {
      const r = t.results[f.id];
      if (!r) continue;
      const slot = f.stage === 'final' ? 3 : Number(f.stage.slice(1)) - 1;
      out.push({ id: `${id}:${f.id}`, week: TOURNAMENTS[id].week, slot, competition: 'tournament', home: f.home, away: f.away, homeGoals: r.homeGoals, awayGoals: r.awayGoals, source: r.source, ...(r.shootoutWinner ? { shootoutWinner: r.shootoutWinner } : {}) });
    }
  }
  if (story.stateCup) {
    const fs = [...semis(story.stateCup), cupFinal(story.stateCup)].filter((f) => f !== null);
    for (const f of fs) {
      const r = story.stateCup.results[f.id];
      if (r) out.push({ id: `sc:${f.id}`, week: f.stage === 'semi' ? STATE_CUP_WEEKS[0]! : STATE_CUP_WEEKS[1]!, slot: 0, competition: 'state_cup', home: f.home, away: f.away, homeGoals: r.homeGoals, awayGoals: r.awayGoals, source: r.source, ...(r.shootoutWinner ? { shootoutWinner: r.shootoutWinner } : {}) });
    }
  }
  for (const f of BG_FIXTURES) {
    const r = background[f.id];
    if (r) out.push({ id: f.id, week: f.week, slot: f.slot, competition: f.competition, home: f.home, away: f.away, homeGoals: r.homeGoals, awayGoals: r.awayGoals, source: 'simulated' });
  }
  return out.sort(chrono);
}
export const chrono = (a: WorldResult, b: WorldResult): number => a.week - b.week || a.slot - b.slot || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export const expected = (own: number, opp: number): number => 1 / (1 + 10 ** ((opp - own) / 400));
/** Home rating change for one result (the away change is its negative). */
export function eloChange(home: number, away: number, homeGoals: number, awayGoals: number, k = ELO_K): number {
  const actual = homeGoals > awayGoals ? 1 : homeGoals < awayGoals ? 0 : 0.5;
  return k * (actual - expected(home, away));
}

export function preseason(): Snapshot {
  const ratings: Record<string, number> = {};
  for (const t of TEAMS) ratings[t.id] = t.rating0;
  return { id: PRESEASON_ID, week: 0, ratings, provisional: true };
}
export function newRankings(careerId: string, seed: number, startWeek = 0): RankingsState {
  return { version: RANKINGS_VERSION, careerId, seed, startWeek, snapshots: [preseason()], background: {}, applied: [] };
}
export const latest = (s: RankingsState): Snapshot => s.snapshots[s.snapshots.length - 1]!;
export const publishedWeek = (s: RankingsState): number => latest(s).week;

function connected(results: readonly WorldResult[]): boolean {
  const parent = new Map<string, string>(TEAMS.map((t) => [t.id, t.id]));
  const find = (x: string): string => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x)!)), parent.get(x)!));
  for (const r of results) parent.set(find(r.home), find(r.away));
  const root = find(TEAMS[0]!.id);
  return TEAMS.every((t) => find(t.id) === root);
}

/**
 * Publish every week up to `week` that is not yet published (idempotent: an already published week
 * is never recomputed). Background games of each new week are simulated once and stored.
 */
export function settleThrough(s: RankingsState, story: StoryResults, week: number): { state: RankingsState; changed: boolean } {
  let state = s;
  for (let w = publishedWeek(s) + 1; w <= week; w++) {
    const background: Record<string, BgResult> = { ...state.background };
    if (w >= state.startWeek) for (const f of BG_FIXTURES) if (f.week === w && !background[f.id]) background[f.id] = simulateBackground(state.seed, f);
    const all = worldResults(story, background);
    const done = new Set(state.applied.map((a) => a.id));
    const due = all.filter((r) => r.week <= w && !done.has(r.id));
    const prev = latest(state);
    const ratings: Record<string, number> = { ...prev.ratings };
    const id = snapshotId(w);
    const applied: Applied[] = [];
    for (const r of due) {
      const pre: [number, number] = [ratings[r.home]!, ratings[r.away]!];
      const d = eloChange(pre[0], pre[1], r.homeGoals, r.awayGoals);
      ratings[r.home] = pre[0] + d;
      ratings[r.away] = pre[1] - d;
      applied.push({ id: r.id, snapshot: id, pre });
    }
    const counted = new Set([...done, ...applied.map((a) => a.id)]);
    const snap: Snapshot = { id, week: w, ratings, provisional: !connected(all.filter((r) => counted.has(r.id))) };
    state = { ...state, background, snapshots: [...state.snapshots, snap], applied: [...state.applied, ...applied] };
  }
  return { state, changed: state !== s };
}

export interface RankRow { readonly team: string; readonly rating: number; readonly rank: number }
/** National order of one snapshot: rating, highest first. Exactly equal ratings share a rank; the ID only fixes display order. */
export function nationalTable(snap: Snapshot): readonly RankRow[] {
  const rows = Object.entries(snap.ratings).map(([team, rating]) => ({ team, rating })).sort((a, b) => b.rating - a.rating || (a.team < b.team ? -1 : 1));
  let rank = 0;
  return rows.map((r, i) => ({ ...r, rank: i > 0 && rows[i - 1]!.rating === r.rating ? rank : (rank = i + 1) }));
}
/** State order uses the same national ratings: the national table filtered, then renumbered within the state. */
export function stateTable(snap: Snapshot, state: string, stateOf: (id: string) => string | undefined): readonly RankRow[] {
  const rows = nationalTable(snap).filter((r) => stateOf(r.team) === state);
  let rank = 0;
  return rows.map((r, i) => ({ ...r, rank: i > 0 && rows[i - 1]!.rating === r.rating ? rank : (rank = i + 1) }));
}
export const rankIn = (rows: readonly RankRow[], team: string): number | null => rows.find((r) => r.team === team)?.rank ?? null;
/** Weekly movement: positive = moved up. Null when the team has no earlier published snapshot. */
export function movement(s: RankingsState, team: string, scope: (snap: Snapshot) => readonly RankRow[] = nationalTable): number | null {
  if (s.snapshots.length < 2) return null;
  const now = rankIn(scope(latest(s)), team);
  const before = rankIn(scope(s.snapshots[s.snapshots.length - 2]!), team);
  return now === null || before === null ? null : before - now;
}

export interface Performance { readonly matches: number; readonly goalsFor: number; readonly goalsAgainst: number; readonly attack: number | null; readonly defense: number | null; readonly schedule: number | null; readonly limited: boolean }
export const LIMITED_RESULTS = 5;
/** Per-match rates over counted results only (denominator = counted matches; unplayed never count). */
export function performance(s: RankingsState, story: StoryResults, team: string): Performance {
  const pre = new Map(s.applied.map((a) => [a.id, a.pre]));
  const rs = worldResults(story, s.background).filter((r) => pre.has(r.id) && (r.home === team || r.away === team));
  let gf = 0, ga = 0, opp = 0;
  for (const r of rs) {
    const home = r.home === team;
    gf += home ? r.homeGoals : r.awayGoals;
    ga += home ? r.awayGoals : r.homeGoals;
    opp += pre.get(r.id)![home ? 1 : 0];
  }
  const n = rs.length;
  return { matches: n, goalsFor: gf, goalsAgainst: ga, attack: n ? gf / n : null, defense: n ? ga / n : null, schedule: n ? opp / n : null, limited: n < LIMITED_RESULTS };
}

export function parseRankings(raw: unknown, careerId: string): { ok: true; value: RankingsState } | { ok: false; error: string } {
  const r = raw as Partial<RankingsState> | null;
  if (!r || typeof r !== 'object') return { ok: false, error: 'missing' };
  if (r.version !== RANKINGS_VERSION) return { ok: false, error: 'version' };
  if (r.careerId !== careerId) return { ok: false, error: 'careerId' };
  if (typeof r.seed !== 'number' || typeof r.startWeek !== 'number' || !Array.isArray(r.snapshots) || !r.snapshots.length || !Array.isArray(r.applied) || !r.background || typeof r.background !== 'object') return { ok: false, error: 'shape' };
  for (let i = 0; i < r.snapshots.length; i++) {
    const sn = r.snapshots[i]!;
    if (sn.week !== i || sn.id !== (i === 0 ? PRESEASON_ID : snapshotId(i)) || TEAMS.some((t) => !Number.isFinite(sn.ratings?.[t.id]))) return { ok: false, error: `snapshot ${i}` };
  }
  return { ok: true, value: r as RankingsState };
}
