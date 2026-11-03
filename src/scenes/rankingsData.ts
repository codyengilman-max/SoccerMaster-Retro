import { parseSeasonLeague } from '../game/season/league';
import { parseTournament, type TournamentState } from '../game/season/tournament';
import type { TournamentId } from '../game/season/calendar';
import { TOURNAMENTS } from '../game/season/tournament';
import { newRankings, parseRankings, settleThrough, type RankingsState, type StoryResults } from '../game/rankings/ratings';
import type { StoryStore } from '../game/story/store';

export class RankingsSaveError extends Error {
  constructor(readonly reason: string) {
    super(`saved rankings could not be read (${reason}); nothing was changed`);
  }
}
export const rankingsKey = (careerId: string): string => `rankings-s1:${careerId}`;
/** Keyed like the saved match report (MatchScene caps report IDs at 64 characters). */
export const kickoffKey = (run: string): string => `kickoff:${run.slice(0, 64)}`;

/** Same seed the story uses for its season records. */
export function seasonSeed(careerId: string): number {
  let seed = 0;
  for (const ch of careerId) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0;
  return seed;
}

/** Canonical saved story results (never story text). Missing records are simply absent. */
export async function storyResults(store: StoryStore, careerId: string): Promise<StoryResults> {
  const lg = parseSeasonLeague(await store.getRecord(`league-s1:${careerId}`));
  const cups: Partial<Record<TournamentId, TournamentState>> = {};
  for (const id of Object.keys(TOURNAMENTS) as TournamentId[]) {
    const t = parseTournament(await store.getRecord(`tourney-s1:${careerId}:${id}`), id);
    if (t.ok) cups[id] = t.value;
  }
  return { league: lg.ok ? lg.value : null, cups, stateCup: null };
}

/**
 * Publishes every unpublished week up to `throughWeek` inside one IndexedDB read-modify-write, so two
 * tabs or a repeated Continue cannot settle a week twice. A save with no rankings record yet starts at
 * `currentWeek`: background games before it are never simulated after the fact.
 */
export async function settleRankings(store: StoryStore, careerId: string, throughWeek: number, currentWeek: number): Promise<{ state: RankingsState; story: StoryResults }> {
  const story = await storyResults(store, careerId);
  let out: RankingsState | null = null;
  let bad: string | null = null;
  await store.updateRecord(rankingsKey(careerId), (cur) => {
    const parsed = parseRankings(cur, careerId);
    // An unreadable record is left exactly as saved (recoverable): only a missing one starts fresh.
    if (!parsed.ok && parsed.error !== 'missing') return ((bad = parsed.error), null);
    const base = parsed.ok ? parsed.value : newRankings(careerId, seasonSeed(careerId), currentWeek <= 1 ? 0 : currentWeek);
    const r = settleThrough(base, story, Math.max(0, throughWeek));
    out = r.state;
    return parsed.ok && !parsed.migrated && !r.changed ? null : { value: r.state, out: true };
  });
  if (bad !== null) throw new RankingsSaveError(bad);
  return { state: out ?? newRankings(careerId, seasonSeed(careerId)), story };
}
