/**
 * Background schedule for the career-world teams the player never meets: one simulated fixture list,
 * built once from the registry and the season calendar (no randomness in the schedule itself).
 * - Each background league (12 regional of 9, one Arizona of 6) plays one round in each of the
 *   12 league weeks (circle method, cycled with venues flipped).
 * - In the two tournament weeks (9, 12) every background team not entered in that week's story
 *   tournament plays three cross-region showcase games, which links the regional populations.
 * Every fixture here is owned by the simulation; story fixtures (Batavia's league, cups, State Cup)
 * are never in this list. Scores come from football strength (tier) plus a seeded draw per fixture,
 * never from rank. Framework-free and deterministic.
 */
import { createRng } from '../rng';
import { SEASON_WEEKS } from '../season/calendar';
import { TOURNAMENTS } from '../season/tournament';
import { BACKGROUND_LEAGUES, leagueTeams, teamById } from './teams';

export const BACKGROUND_VERSION = 'bg1';
export type BgCompetition = 'bg_league' | 'bg_showcase';
export interface BgFixture {
  readonly id: string;
  readonly week: number;
  /** Kickoff order within the week (stable chronological ordering with the fixture id). */
  readonly slot: number;
  readonly competition: BgCompetition;
  readonly league: string | null;
  readonly home: string;
  readonly away: string;
}
export interface BgResult { readonly fixtureId: string; readonly homeGoals: number; readonly awayGoals: number; readonly source: 'simulated' }

export const LEAGUE_WEEKS: readonly number[] = SEASON_WEEKS.filter((w) => w.kind === 'league').map((w) => w.week);
export const SHOWCASE_WEEKS: readonly number[] = SEASON_WEEKS.filter((w) => w.kind === 'tournament').map((w) => w.week);

/** Circle-method rounds (a bye slot for odd counts); round k of an endless cycle, venues flipped each cycle. */
function circleRound(teams: readonly string[], k: number): [string, string][] {
  const list: (string | null)[] = teams.length % 2 ? [...teams, null] : [...teams];
  const n = list.length;
  const base = k % (n - 1);
  const flip = Math.floor(k / (n - 1)) % 2 === 1;
  let order = list.slice();
  for (let r = 0; r < base; r++) order = [order[0]!, order[n - 1]!, ...order.slice(1, n - 1)];
  const out: [string, string][] = [];
  for (let i = 0; i < n / 2; i++) {
    const a = order[i]!;
    const b = order[n - 1 - i]!;
    if (a === null || b === null) continue;
    const homeFirst = (base + i) % 2 === 0;
    out.push(homeFirst !== flip ? [a, b] : [b, a]);
  }
  return out;
}

function build(): readonly BgFixture[] {
  const out: BgFixture[] = [];
  const leagues = BACKGROUND_LEAGUES;
  LEAGUE_WEEKS.forEach((week, k) => {
    for (const lg of leagues) for (const [home, away] of circleRound(leagueTeams(lg), k)) out.push({ id: `bg-w${week}-${lg}-${home}-${away}`, week, slot: 0, competition: 'bg_league', league: lg, home, away });
  });
  for (const week of SHOWCASE_WEEKS) {
    const cup = Object.values(TOURNAMENTS).find((t) => t.week === week);
    const entered = new Set(cup ? cup.groups.flat() : []);
    // Interleave leagues (1st of each league, then 2nd, ...) so circle rounds pair different regions.
    const lists = leagues.map((lg) => leagueTeams(lg).filter((t) => !entered.has(t)));
    const longest = Math.max(...lists.map((l) => l.length));
    const pool: string[] = [];
    for (let i = 0; i < longest; i++) for (const l of lists) if (l[i]) pool.push(l[i]!);
    for (let r = 0; r < 3; r++) for (const [home, away] of circleRound(pool, r * 7 + 1)) out.push({ id: `bg-w${week}-sc${r + 1}-${home}-${away}`, week, slot: r, competition: 'bg_showcase', league: null, home, away });
  }
  return out;
}
export const BG_FIXTURES: readonly BgFixture[] = Object.freeze(build());
const BY_ID = new Map(BG_FIXTURES.map((f) => [f.id, f]));
export const bgFixture = (id: string): BgFixture | undefined => BY_ID.get(id);
export const bgFixturesInWeek = (week: number): readonly BgFixture[] => BG_FIXTURES.filter((f) => f.week === week);

const hash = (seed: number, s: string): number => {
  let h = seed >>> 0;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0;
  return h;
};
export const BASE_GOALS = 1.6;
export const TIER_STEP = 1.3;
export const HOME_EDGE = 1.05;
const poisson = (rnd: () => number, lambda: number): number => {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = rnd();
  while (p > l && k < 8) (k++, (p *= rnd()));
  return k;
};
/** Score from both tiers and a per-fixture seeded draw; the same seed and fixture always give the same score. */
export function simulateBackground(seed: number, f: BgFixture): BgResult {
  const th = teamById(f.home)!.tier;
  const ta = teamById(f.away)!.tier;
  const rnd = createRng(hash(seed, `bg:${f.id}`));
  const homeGoals = poisson(rnd, BASE_GOALS * HOME_EDGE * TIER_STEP ** (ta - th));
  const awayGoals = poisson(rnd, BASE_GOALS * TIER_STEP ** (th - ta));
  return { fixtureId: f.id, homeGoals, awayGoals, source: 'simulated' };
}
