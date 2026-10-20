import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SEASON_ONE } from '../src/game/story/content';
import { SEASON_RELEASED_WEEKS, currentNode, newSeasonStory, outcomeOf, reduceStory, setReleasedWeeks, type StoryCommand, type StoryState } from '../src/game/story/runtime';
import { SEASON_LENGTH, seasonWeek, slotIds } from '../src/game/season/calendar';
import { TOURNAMENTS, bataviaFinish, newTournament, nextBataviaFixture, playoffs, recordTournamentPlayed, type TournamentState } from '../src/game/season/tournament';
import { bataviaRecord, fixtureForSeasonWeek, newSeasonLeague, recordSeasonPlayed, simulateSeasonThrough, type SeasonLeagueState } from '../src/game/season/league';

type Score = { home: number; away: number };
interface Policy {
  pick?: (scene: string, key: string, ids: string[]) => string;
  score?: (scene: string) => Score | null; // null = skip / withdraw (declined)
}

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
      if (n.adapter === 'league_match' || n.adapter === 'tournament_match' || n.adapter === 'crossbar') {
        const sc = p.score ? p.score(s.sceneId) : { home: 2, away: 1 };
        if (!sc) { s = step(s, { type: 'complete', runId: r.runId, outcome: 'declined' }); continue; }
        let detail: string | null = null;
        if (n.adapter === 'league_match') {
          const f = fixtureForSeasonWeek(week)!;
          const rec = recordSeasonPlayed(league, f.id, sc.home, sc.away);
          if (!rec.ok) throw new Error(rec.error);
          league = simulateSeasonThrough(rec.state, f.round);
        } else if (n.adapter === 'tournament_match') {
          const tid = seasonWeek(week)!.tournament!;
          const t = cups[tid] ?? newTournament(tid, 't1', 7);
          const f = nextBataviaFixture(t)!;
          const rec = recordTournamentPlayed(t, f.id, sc.home, sc.away);
          if (!rec.ok) throw new Error(rec.error);
          cups[tid] = rec.state;
          const po = playoffs(rec.state);
          detail = bataviaFinish(rec.state) ?? (po ? (po.final.home === 'batavia' || po.final.away === 'batavia' ? 'final' : 'placement') : null);
        }
        s = step(s, { type: 'complete', runId: r.runId, outcome: 'completed', result: res(sc), detail });
      } else if (n.adapter === 'standings') {
        // Same rule as StoryScene.seasonComplete: all 12 league results and both cup placings.
        const done = bataviaRecord(league).pending === 0 && Object.keys(TOURNAMENTS).every((tid) => cups[tid] && bataviaFinish(cups[tid]!) !== null);
        s = step(s, { type: 'complete', runId: r.runId, outcome: 'completed', detail: done ? 'season_complete' : 'season_incomplete' });
      } else s = step(s, { type: 'complete', runId: r.runId, outcome: 'completed' });
    }
  }
  return { s, league, cups, said: text.join('\n') };
}

describe('Season One story', () => {
  // These routes cover the authored later weeks, which the game hides until they are released.
  beforeAll(() => setReleasedWeeks(99));
  afterAll(() => setReleasedWeeks(SEASON_RELEASED_WEEKS));
  it('a skipped league game keeps the season ending neutral instead of calling the season complete', () => {
    const { s, league, said } = season({ score: (id) => (id.startsWith('S1_W05_') ? null : { home: 2, away: 1 }) });
    expect(s.complete).toBe(true);
    expect(bataviaRecord(league).pending).toBe(1);
    expect(outcomeOf(s, 'S1_END_FIELD')!.detail).toBe('season_incomplete');
    expect(said).toMatch(/season is incomplete/);
    expect(said).not.toMatch(/Twelve league games, two tournaments/);
  });

  it('contains the prologue, all 81 featured weekly slots and the epilogue', () => {
    const ids = new Set(SEASON_ONE.order);
    let featured = 0;
    for (let w = 1; w <= SEASON_LENGTH; w++) for (const id of slotIds(w)) { expect(ids.has(id), id).toBe(true); featured++; }
    expect(featured).toBe(81);
    expect(SEASON_ONE.entry).toBe('S1_PRO_IDENTITY');
    expect(ids.has('S1_END_FIELD') && ids.has('S1_END_AQUARIUM')).toBe(true);
    expect([...ids].every((id) => id.startsWith('S1_'))).toBe(true);
  });

  for (const [name, sc, rec] of [['all-win', { home: 3, away: 0 }, 'won'], ['all-draw', { home: 1, away: 1 }, 'drawn'], ['all-loss', { home: 0, away: 2 }, 'lost']] as const) {
    it(`${name}: the season completes once with 12 real league results and both tournaments placed`, () => {
      const { s, league, cups, said } = season({ score: () => sc });
      expect(s.complete).toBe(true);
      expect(s.completedScenes.at(-1)).toBe('S1_END_AQUARIUM');
      expect(new Set(s.completedScenes).size).toBe(s.completedScenes.length);
      const r = bataviaRecord(league);
      expect(r[rec]).toBe(12);
      expect(r.pending).toBe(0);
      for (const tid of ['starter_cup', 'desert_lights']) expect(bataviaFinish(cups[tid]!)).not.toBeNull();
      const leagueRuns = Object.values(s.runs).filter((x) => x.adapter === 'league_match' && x.outcome === 'completed');
      expect(leagueRuns).toHaveLength(12);
      expect(leagueRuns.every((x) => x.result === res(sc))).toBe(true);
      expect(Object.values(s.runs).filter((x) => x.adapter === 'tournament_match' && x.outcome === 'completed')).toHaveLength(8);
      if (name === 'all-win') expect(outcomeOf(s, 'S1_W09_G4')!.detail).toBe('champion');
      if (name === 'all-loss') expect(outcomeOf(s, 'S1_W09_G4')!.detail).toBe('fourth');
      if (name === 'all-draw') expect(said).toMatch(/shared/);
      expect(said).toMatch(/Twelve league games, two tournaments/);
    });
  }

  it('skipping every match leaves games unplayed (never losses) and the season is labelled incomplete', () => {
    const { s, league, said } = season({ score: () => null });
    expect(s.complete).toBe(true);
    expect(bataviaRecord(league)).toMatchObject({ played: 0, lost: 0, pending: 12 });
    expect(said).toMatch(/stays pending, not lost/);
    expect(said).toMatch(/season is incomplete/);
    expect(said).not.toMatch(/We lost this one/);
    // a withdrawn first tournament game ends the cup unfinished; later games are not offered
    expect(outcomeOf(s, 'S1_W09_G2')!.outcome).toBe('declined');
  });

  it('friendship-only Riley never shows crush lines; an explicitly enabled crush does', () => {
    const friend = (season({ pick: (_s, k, ids) => (k === 'riley_route' ? 'friendship' : ids[0]!) })).said;
    const crush = (season({ pick: (_s, k, ids) => (k === 'riley_route' ? 'crush' : ids[0]!) })).said;
    for (const l of ['Your face feels warm', 'I like spending time with you']) {
      expect(friend).not.toContain(l);
      expect(crush).toContain(l);
    }
  });

  it('remembers choices weeks later (Jordan project, Casey exclusion and repair)', () => {
    const t = (season({ pick: (_scene, k, ids) => (k === 'project_check' ? 'cancel' : k === 'casey' ? 'nothing' : k === 'casey_repair' ? 'invite' : ids[0]!) })).said;
    expect(t).toContain("The captions didn't get done");
    expect(t).toContain("That's what happened to you");
    expect(t).toContain('Thanks for asking me last week');
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
        s = step(r.state, { type: 'complete', runId: r.runId, outcome: 'completed', result: n.adapter === 'crossbar' ? 'WIN' : null });
      }
    }
    const r = reduceStory(s, { type: 'launch', revision: s.revision, runId: uuid(900001) });
    expect(r.ok).toBe(true);
    const done = step((r as { state: StoryState }).state, { type: 'complete', runId: uuid(900001), outcome: 'completed', result: 'WIN' });
    const again = reduceStory(done, { type: 'complete', revision: done.revision, runId: uuid(900001), outcome: 'completed', result: 'LOSS' });
    expect(again.ok && again.changed).toBeFalsy();
    expect(outcomeOf(again.ok ? again.state : done, 'S1_W03_G')!.result).toBe('WIN');
    // result-bearing season matches require a result
    const r2 = reduceStory(s, { type: 'launch', revision: s.revision, runId: uuid(900002) });
    const bad = reduceStory((r2 as { state: StoryState }).state, { type: 'complete', revision: (r2 as { state: StoryState }).state.revision, runId: uuid(900002), outcome: 'completed', result: null });
    expect(bad.ok).toBe(false);
  });
});
