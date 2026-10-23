import { describe, expect, it } from 'vitest';
import { SEASON_ONE } from '../src/game/story/content';
import { SEASON_RELEASED_WEEKS, currentNode, newSeasonStory, outcomeOf, reduceStory, setReleasedWeeks, type StoryCommand, type StoryState } from '../src/game/story/runtime';
import { SEASON_LENGTH, seasonWeek, slotIds } from '../src/game/season/calendar';
import { TOURNAMENTS, bataviaFinish, newTournament, nextBataviaFixture, finalFixture, recordTournamentPlayed, bataviaResult, type TournamentState } from '../src/game/season/tournament';
import { bataviaRecord, fixtureForSeasonWeek, newSeasonLeague, recordSeasonPlayed, simulateSeasonThrough, type SeasonLeagueState } from '../src/game/season/league';

type Score = { home: number; away: number };
interface Policy {
  pick?: (scene: string, key: string, ids: string[]) => string;
  score?: (scene: string) => Score | null; // null = skip / withdraw (declined)
  detail?: (adapter: string) => string | null;
}
const FACT_DEFAULTS: Record<string, string> = { home_learning: 'completed', training_log: 'within', school_reward: 'unconfigured' };

let seq = 0;
const uuid = (n: number | string) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const step = (s: StoryState, c: Record<string, unknown>): StoryState => {
  const r = reduceStory(s, { ...c, revision: s.revision } as StoryCommand);
  if (!r.ok) throw new Error(`${String(c.type)} at ${s.sceneId}.${s.nodeId}: ${r.error}`);
  return r.state;
};
const res = (x: Score) => (x.home > x.away ? 'WIN' : x.home < x.away ? 'LOSS' : 'DRAW');

/** Plays Season One through the same competition modules the story scene uses. */
function season(p: Policy = {}) {
  let s = newSeasonStory('t1');
  let league: SeasonLeagueState = newSeasonLeague('t1', 7);
  const cups: Record<string, TournamentState> = {};
  let runs = 0;
  const seen = new Set<string>();
  const text: string[] = [];
  for (let i = 0; i < 20000 && !s.complete; i++) {
    const n = currentNode(s)!;
    if (n.type === 'line' && !seen.has(`${s.sceneId}.${n.id}`)) { seen.add(`${s.sceneId}.${n.id}`); text.push(n.text); }
    if (n.type === 'line') s = step(s, { type: 'advance', seq: ++seq });
    else if (n.type === 'choice') {
      const ids = n.options.map((o) => o.id);
      s = step(s, { type: 'choose', seq: ++seq, choiceId: p.pick?.(s.sceneId, n.id, ids) ?? ids[0]! });
    } else if (n.type === 'activity_handoff') {
      const r = reduceStory(s, { type: 'launch', revision: s.revision, runId: uuid(++runs) });
      if (!r.ok && /declined/.test(r.error)) { s = step(s, { type: 'decline', seq: ++seq }); continue; }
      if (!r.ok) throw new Error(`${s.sceneId}: ${r.error}`);
      s = r.state;
      const week = Number(/^S1_W(\d\d)_/.exec(s.sceneId)?.[1] ?? 0);
      if (n.adapter === 'league_match' || n.adapter === 'tournament_match' || n.adapter === 'crossbar' || n.adapter === 'jungle') {
        const sc = p.score ? p.score(s.sceneId) : { home: 2, away: 1 };
        if (!sc) { s = step(s, { type: 'complete', runId: r.runId, outcome: 'declined' }); continue; }
        let detail: string | null = null;
        let nextFid: string | null = null;
        if (n.adapter === 'league_match') {
          const f = fixtureForSeasonWeek(week)!;
          const rec = recordSeasonPlayed(league, f.id, sc.home, sc.away);
          if (!rec.ok) throw new Error(rec.error);
          league = simulateSeasonThrough(rec.state, f.round);
        } else if (n.adapter === 'tournament_match') {
          const tid = seasonWeek(week)!.tournament!;
          const t = cups[tid] ?? newTournament(tid, 't1', 7);
          const f = nextBataviaFixture(t)!;
          nextFid = f.id;
          const rec = recordTournamentPlayed(t, f.id, sc.home, sc.away);
          if (!rec.ok) throw new Error(rec.error);
          cups[tid] = rec.state;
          const fin = finalFixture(rec.state);
          detail = bataviaFinish(rec.state) ?? (fin && (fin.home === 'batavia' || fin.away === 'batavia') ? 'final' : null);
        }
        const result = n.adapter === 'tournament_match' ? bataviaResult(cups[seasonWeek(week)!.tournament!]!, nextFid!) ?? res(sc) : res(sc);
        s = step(s, { type: 'complete', runId: r.runId, outcome: 'completed', result, detail });
      } else if (n.adapter === 'standings') {
        // Same rule as StoryScene.seasonComplete: all 12 league results and both cup placings.
        const done = bataviaRecord(league).pending === 0 && Object.keys(TOURNAMENTS).every((tid) => cups[tid] && bataviaFinish(cups[tid]!) !== null);
        s = step(s, { type: 'complete', runId: r.runId, outcome: 'completed', detail: done ? 'season_complete' : 'season_incomplete' });
      } else s = step(s, { type: 'complete', runId: r.runId, outcome: 'completed', detail: p.detail?.(n.adapter) ?? FACT_DEFAULTS[n.adapter] ?? null });
    }
  }
  return { s, league, cups, said: text.join('\n') };
}

describe('Season One story: approved weeks 1–4 only (owner directive, 2026-10-20)', () => {
  it('keeps 18 ordered weeks; only the prologue and weeks 1–7 have scenes, weeks 8–18 and the epilogue are empty', () => {
    expect(SEASON_LENGTH).toBe(18);
    expect(SEASON_RELEASED_WEEKS).toBe(7);
    expect(SEASON_ONE.entry).toBe('S1_PRO_IDENTITY');
    for (let w = 1; w <= 7; w++) expect(SEASON_ONE.order.some((id) => id.startsWith(`S1_W0${w}_`)), `week ${w}`).toBe(true);
    for (const id of SEASON_ONE.order) expect(id.startsWith('S1_PRO') || /^S1_W0[1-7]_/.test(id), id).toBe(true);
    for (let w = 1; w <= 18; w++) expect(seasonWeek(w), `week ${w}`).toBeTruthy();
    for (let w = 8; w <= 18; w++) expect(slotIds(w).filter((id) => SEASON_ONE.order.includes(id)), `week ${w}`).toEqual([]);
  });

  it('releasing more weeks still stops after week 7: no empty week 8 and no legacy fallback is launched', () => {
    setReleasedWeeks(99);
    try {
      const { s } = season();
      expect(s.complete).toBe(true);
      expect(s.completedScenes.at(-1)).toBe('S1_W07_E');
    } finally {
      setReleasedWeeks(SEASON_RELEASED_WEEKS);
    }
  });

  for (const [name, sc, rec] of [['all-win', { home: 3, away: 0 }, 'won'], ['all-draw', { home: 1, away: 1 }, 'drawn'], ['all-loss', { home: 0, away: 2 }, 'lost']] as const) {
    it(`${name}: weeks 3–7 play League Games One to Five once each and record the real results`, () => {
      const { s, league } = season({ score: () => sc });
      expect(s.complete).toBe(true);
      expect(s.completedScenes.at(-1)).toBe('S1_W07_E');
      expect(new Set(s.completedScenes).size).toBe(s.completedScenes.length);
      const leagueRuns = Object.values(s.runs).filter((x) => x.adapter === 'league_match' && x.outcome === 'completed');
      expect(leagueRuns.map((x) => x.sceneId)).toEqual(['S1_W03_G', 'S1_W04_G', 'S1_W05_G', 'S1_W06_G', 'S1_W07_G']);
      expect(leagueRuns.every((x) => x.result === res(sc))).toBe(true);
      expect(bataviaRecord(league)).toMatchObject({ [rec]: 5, played: 5 });
      expect(outcomeOf(s, 'S1_W03_S')).toMatchObject({ outcome: 'completed', result: res(sc) });
      expect(Object.values(s.runs).some((x) => x.adapter === 'tournament_match')).toBe(false);
    });
  }

  it('skipping both league games leaves them unplayed (never losses) and the story still ends at week 7', () => {
    const { s, league } = season({ score: () => null });
    expect(s.complete).toBe(true);
    expect(s.completedScenes.at(-1)).toBe('S1_W07_E');
    expect(bataviaRecord(league)).toMatchObject({ played: 0, lost: 0 });
  });

  for (const pick of ['crossbar', 'jungle'] as const) {
    it(`week 4 school activity: choosing ${pick} launches only ${pick}, once`, () => {
      const { s } = season({ pick: (scene, k, ids) => (scene === 'S1_W04_S' && k === 'activity' ? pick : ids[0]!) });
      const runs = Object.values(s.runs).filter((x) => x.sceneId === 'S1_W04_S');
      // The unchosen activity is recorded as declined by its predicate and never gets a run id.
      expect(runs.filter((x) => x.runId !== '').map((x) => x.adapter)).toEqual([pick]);
      expect(runs.filter((x) => x.runId === '').every((x) => x.outcome === 'declined' && x.adapter !== pick)).toBe(true);
      const reward = Object.values(s.runs).filter((x) => x.adapter === 'school_reward');
      expect(reward).toHaveLength(1);
      expect(reward[0]!.detail).toBe('unconfigured');
    });
  }

  it("Mom's week 4 talk follows the real training log, and each log state reads differently", () => {
    const said: string[] = [];
    for (const d of ['above', 'below', 'within', 'unknown']) {
      const r = season({ detail: (a) => (a === 'training_log' ? d : null) });
      expect(Object.values(r.s.runs).find((x) => x.adapter === 'training_log')!.detail).toBe(d);
      said.push(r.said);
    }
    expect(new Set(said).size).toBe(4);
  });

  it("Coach Code's home-learning follow-up follows the real record in weeks 3 and 4", () => {
    const said: string[] = [];
    for (const d of ['completed', 'partial', 'none', 'unknown']) {
      const r = season({ detail: (a) => (a === 'home_learning' ? d : null) });
      expect(Object.values(r.s.runs).filter((x) => x.adapter === 'home_learning').map((x) => x.detail)).toEqual([d, d]);
      said.push(r.said);
    }
    expect(new Set(said).size).toBe(4);
  });

  it('a completed run cannot be completed again or re-launched (no duplicate results or rewards)', () => {
    let s = newSeasonStory('d1');
    for (let i = 0; i < 2000; i++) {
      const n = currentNode(s)!;
      if (n.type === 'activity_handoff' && n.adapter === 'league_match') break;
      if (n.type === 'line') s = step(s, { type: 'advance', seq: ++seq });
      else if (n.type === 'choice') s = step(s, { type: 'choose', seq: ++seq, choiceId: n.options[0]!.id });
      else if (n.type === 'activity_handoff') {
        const r = reduceStory(s, { type: 'launch', revision: s.revision, runId: uuid(100000 + i) });
        if (!r.ok) { s = step(s, { type: 'decline', seq: ++seq }); continue; }
        s = step(r.state, { type: 'complete', runId: r.runId, outcome: 'completed', result: n.adapter === 'crossbar' || n.adapter === 'jungle' ? 'WIN' : null, detail: FACT_DEFAULTS[n.adapter] ?? null });
      }
    }
    const r = reduceStory(s, { type: 'launch', revision: s.revision, runId: uuid(900001) });
    expect(r.ok).toBe(true);
    const done = step((r as { state: StoryState }).state, { type: 'complete', runId: uuid(900001), outcome: 'completed', result: 'WIN' });
    const again = reduceStory(done, { type: 'complete', revision: done.revision, runId: uuid(900001), outcome: 'completed', result: 'LOSS' });
    expect(again.ok && again.changed).toBeFalsy();
    expect(outcomeOf(again.ok ? again.state : done, 'S1_W03_G')!.result).toBe('WIN');
    const r2 = reduceStory(s, { type: 'launch', revision: s.revision, runId: uuid(900002) });
    const bad = reduceStory((r2 as { state: StoryState }).state, { type: 'complete', revision: (r2 as { state: StoryState }).state.revision, runId: uuid(900002), outcome: 'completed', result: null });
    expect(bad.ok).toBe(false);
  });
});
