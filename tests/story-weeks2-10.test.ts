import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SEASON_ONE, sceneById } from '../src/game/story/content';
import { currentNode, migrateStory, newSeasonStory, outcomeOf, reduceStory, type StoryCommand, type StoryState } from '../src/game/story/runtime';
import { seasonWeek } from '../src/game/season/calendar';

// Owner rewrite of Season One weeks 2–10 (2026-10-27): authoritative text, real handoffs, Blake to Next Horizon,
// the AZ Showcase in week 9. Week 1 is untouched and weeks 11–18 keep their calendar positions.

let seq = 0;
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const step = (s: StoryState, c: Record<string, unknown>): StoryState => {
  const r = reduceStory(s, { ...c, revision: s.revision } as StoryCommand);
  if (!r.ok) throw new Error(`${String(c.type)} at ${s.sceneId}.${s.nodeId}: ${r.error}`);
  return r.state;
};
interface Plan {
  result?: (scene: string, adapter: string) => 'WIN' | 'DRAW' | 'LOSS' | null;
  detail?: (scene: string, adapter: string) => string | null;
  pick?: Record<string, string>;
}
function play(plan: Plan = {}) {
  let s = newSeasonStory('w210');
  let runs = 0;
  const lines: { scene: string; speaker: string; text: string }[] = [];
  for (let i = 0; i < 6000 && !s.complete; i++) {
    const n = currentNode(s)!;
    if (n.type === 'line') { lines.push({ scene: s.sceneId, speaker: n.speaker, text: n.text }); s = step(s, { type: 'advance', seq: ++seq }); }
    else if (n.type === 'choice') s = step(s, { type: 'choose', seq: ++seq, choiceId: plan.pick?.[`${s.sceneId}.${n.id}`] ?? n.options[0]!.id });
    else if (n.type === 'activity_handoff') {
      const r = reduceStory(s, { type: 'launch', revision: s.revision, runId: uuid(++runs) });
      if (!r.ok && /declined/.test(r.error)) { s = step(s, { type: 'decline', seq: ++seq }); continue; }
      if (!r.ok) throw new Error(`${s.sceneId}: ${r.error}`);
      s = r.state;
      const needs = ['crossbar', 'jungle', 'league_match', 'tournament_match'].includes(n.adapter);
      const result = needs ? plan.result?.(s.sceneId, n.adapter) ?? 'DRAW' : null;
      s = step(s, { type: 'complete', runId: r.runId, outcome: 'completed', result, detail: plan.detail?.(s.sceneId, n.adapter) ?? null });
    } else s = step(s, { type: 'advance', seq: ++seq });
  }
  return { s, lines, said: (scene: string) => lines.filter((l) => l.scene === scene).map((l) => l.text).join('\n') };
}
const week = (w: number) => SEASON_ONE.order.filter((id) => id.startsWith(`S1_W${String(w).padStart(2, '0')}_`));
const adapters = (id: string) => sceneById(id)!.nodes.flatMap((n) => (n.type === 'activity_handoff' ? [n.adapter] : []));

describe('Season One weeks 2–10 (owner rewrite)', () => {
  it('runs weeks 2–10 in the authored order with only the new scenes', () => {
    expect([2, 3, 4, 5, 6, 7, 8, 9, 10].map(week)).toEqual([
      ['S1_W02_T', 'S1_W02_H', 'S1_W02_E'],
      ['S1_W03_S', 'S1_W03_T', 'S1_W03_H', 'S1_W03_G', 'S1_W03_E'],
      ['S1_W04_T', 'S1_W04_S', 'S1_W04_H', 'S1_W04_G', 'S1_W04_E'],
      ['S1_W05_M', 'S1_W05_S', 'S1_W05_T', 'S1_W05_H', 'S1_W05_G', 'S1_W05_E'],
      ['S1_W06_T', 'S1_W06_A', 'S1_W06_S', 'S1_W06_H', 'S1_W06_G', 'S1_W06_D', 'S1_W06_E'],
      ['S1_W07_M', 'S1_W07_S', 'S1_W07_T', 'S1_W07_H', 'S1_W07_G', 'S1_W07_E'],
      ['S1_W08_T', 'S1_W08_S', 'S1_W08_H', 'S1_W08_G', 'S1_W08_B', 'S1_W08_E'],
      ['S1_W09_M', 'S1_W09_T', 'S1_W09_S', 'S1_W09_H', 'S1_W09_ARRIVE', 'S1_W09_G1', 'S1_W09_G2', 'S1_W09_G3', 'S1_W09_G4', 'S1_W09_E'],
      ['S1_W10_T', 'S1_W10_S', 'S1_W10_H', 'S1_W10_G', 'S1_W10_E'],
    ]);
    const { s } = play();
    const order = s.completedScenes.filter((id) => /^S1_W(0[2-9]|10)_/.test(id));
    expect(order).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap(week).filter((id) => order.includes(id)));
    expect(s.complete && s.sceneId).toBe('S1_W10_E');
  });

  it('no superseded characters or Cloudy dialogue remain in weeks 2–10; Blake goes to Next Horizon, never Next Level', () => {
    const ids = [2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap(week);
    const speakers = new Set(ids.flatMap((id) => sceneById(id)!.nodes.flatMap((n) => (n.type === 'line' ? [n.speaker] : []))));
    for (const gone of ['Cloudy', 'Riley', 'Jordan', 'Alex']) expect(speakers.has(gone), gone).toBe(false);
    const all = ids.flatMap((id) => sceneById(id)!.nodes.flatMap((n) => (n.type === 'line' ? [n.text] : []))).join('\n');
    expect(all).toContain("I'm moving to Next Horizon.");
    expect(all).not.toContain('Next Level');
  });

  it('school scenes only in weeks 3, 5, 7 and 9; every week from 2 has the home menu and a required Team Training', () => {
    const school = SEASON_ONE.order.filter((id) => /^S1_W(0[2-9]|10)_/.test(id) && sceneById(id)!.background === 'neutral_school');
    expect(school).toEqual(['S1_W05_M', 'S1_W07_M', 'S1_W09_M']);
    expect(sceneById('S1_W03_S')!.background).toBe('recess');
    for (let w = 2; w <= 10; w++) {
      const acts = week(w).flatMap(adapters);
      expect(acts, `week ${w}`).toContain('home_hub');
      expect(acts, `week ${w}`).toContain('team_training');
    }
  });

  it('calendar: League Games 1–6 in weeks 3–8, AZ Showcase week 9, League Game 7 week 10; weeks 11–18 unchanged', () => {
    expect([3, 4, 5, 6, 7, 8, 10].map((w) => seasonWeek(w)!.leagueGame)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(seasonWeek(9)).toMatchObject({ kind: 'tournament', tournament: 'az_showcase', leagueGame: null });
    expect(seasonWeek(2)).toMatchObject({ kind: 'preseason', leagueGame: null });
    expect([11, 12, 13, 14, 15, 16, 17, 18].map((w) => seasonWeek(w)!.title)).toEqual([
      'Who Am I Doing This For?', 'What We Can Afford', 'Questions Worth Asking', 'Next Horizon', 'Monday Still Comes', 'Finish What You Started', 'Four Teams Left', 'What Comes Next',
    ]);
    const leagues = [3, 4, 5, 6, 7, 8, 10].map((w) => week(w).filter((id) => adapters(id).includes('league_match')));
    expect(leagues).toEqual([['S1_W03_G'], ['S1_W04_G'], ['S1_W05_G'], ['S1_W06_G'], ['S1_W07_G'], ['S1_W08_G'], ['S1_W10_G']]);
    expect(week(9).filter((id) => adapters(id).includes('league_match'))).toEqual([]);
  });

  it('Team Training feedback follows the recorded detail; missing data says nothing invented', () => {
    const at = (d: string | null) => play({ detail: (sc, a) => (sc === 'S1_W03_T' && a === 'team_training' ? d : null) }).said('S1_W03_T');
    const said = ['strong', 'pass_weight', 'struggled'].map(at);
    expect(new Set(said).size).toBe(3);
    const none = at(null);
    for (const s of said) expect(s.length).toBeGreaterThan(none.length);
  });

  it('match lines follow the real result, including losses', () => {
    const lines = (['WIN', 'DRAW', 'LOSS'] as const).map((r) => play({ result: (sc) => (sc === 'S1_W09_G1' ? r : 'DRAW') }).said('S1_W09_G1'));
    expect(lines[0]).toContain('Good result.');
    expect(lines[1]).toContain('Look at what they took away.');
    expect(lines[2]).toContain('Find one thing we can change.');
  });

  it('AZ Showcase: the final plays only for a group winner; a non-winner finish (digits in the detail) is accepted', () => {
    const won = play({ detail: (sc, a) => (sc === 'S1_W09_G3' && a === 'tournament_match' ? 'final' : null) }).s;
    expect(outcomeOf(won, 'S1_W09_G4')).toMatchObject({ outcome: 'completed' });
    const out = play({ detail: (sc, a) => (sc === 'S1_W09_G3' && a === 'tournament_match' ? 'group_2' : null) });
    expect(outcomeOf(out.s, 'S1_W09_G3')).toMatchObject({ outcome: 'completed', detail: 'group_2' });
    expect(outcomeOf(out.s, 'S1_W09_G4')?.outcome ?? 'declined').toBe('declined');
    // Without a final there is no "next game" line after group game 3.
    expect(out.said('S1_W09_G3')).not.toContain('next game');
    expect(out.s.complete && out.s.sceneId).toBe('S1_W10_E');
  });

  it('Blake is absent from week 8 training, present for League Game 6, and transfers once after it', () => {
    expect(adapters('S1_W08_T')).toContain('team_training');
    const w8t = sceneById('S1_W08_T')!.nodes.filter((n) => n.type === 'line');
    expect(w8t.some((n) => n.type === 'line' && n.speaker === 'Blake')).toBe(false);
    expect(w8t.map((n) => (n.type === 'line' ? n.text : '')).join('\n')).toContain("Blake's spot stays empty.");
    expect(SEASON_ONE.order.indexOf('S1_W08_B')).toBeGreaterThan(SEASON_ONE.order.indexOf('S1_W08_G'));
    expect(adapters('S1_W08_B')).toEqual(['blake_transfer']);
    const { s } = play({ detail: (_sc, a) => (a === 'blake_transfer' ? 'next_horizon' : null) });
    const moves = Object.values(s.runs).filter((r) => r.adapter === 'blake_transfer' && r.outcome === 'completed');
    expect(moves.map((r) => [r.sceneId, r.detail])).toEqual([['S1_W08_B', 'next_horizon']]);
    // Reloading the finished save changes nothing (no second transfer, no replayed rewards).
    expect(migrateStory(s)).toBe(s);
  });

  it('dialogue choices record priorities only; Cloudy feeding is never a required step', () => {
    const { s } = play({ pick: {} });
    expect(Object.keys(s.decisions.S1_W02_T ?? {})).toEqual(['priority']);
    for (let w = 2; w <= 10; w++) expect(week(w).flatMap(adapters), `week ${w}`).not.toContain('cloudy');
  });

  it('saves resting in removed week 2–7 scenes continue in the same week; rewritten scenes restart', () => {
    const base = newSeasonStory('mig');
    for (const [old, to] of [['S1_W02_M', 'S1_W02_T'], ['S1_W02_F', 'S1_W02_H'], ['S1_W03_S2', 'S1_W03_T'], ['S1_W04_P', 'S1_W04_H'], ['S1_W05_A', 'S1_W05_H'], ['S1_W06_L', 'S1_W06_H'], ['S1_W07_A', 'S1_W07_H']] as const) {
      const m = migrateStory({ ...base, sceneId: old, nodeId: 'v2n3' });
      expect([m.sceneId, m.nodeId], old).toEqual([to, sceneById(to)!.entry]);
    }
    const r = migrateStory({ ...base, sceneId: 'S1_W06_G', nodeId: 'v2n12', decisions: { S1_W06_G: { old: 'x' } } });
    expect([r.sceneId, r.nodeId, r.decisions.S1_W06_G]).toEqual(['S1_W06_G', sceneById('S1_W06_G')!.entry, undefined]);
  });
});

describe('Season One registered source hashes', () => {
  // Prologue and week 1 are byte-identical to the approved text; weeks 2–10 are the owner rewrite of 2026-10-27.
  const PINNED: Record<string, string> = {
    'docs/story/season-one/src/00_prologue.story': '806cae9dcd70f697dd89c829fffb174247739cc695b7e00fe2a344786418c672',
    'docs/story/season-one/src/01_week01.story': '88f7533af27970dd2745bd8dff35d27afaf349e72ac15e86e749f45398b20b6e',
    'docs/story/season-one/src/02_week02.story': '6558cd649d865aa9ee71fd34c60b9190902fcdbcbc2646ab274f2592cafbcef9',
    'docs/story/season-one/src/03_week03.story': 'bfe959b925531d1bc7491382050ef494c8648e7eeb5e9a11afc37a29114336a3',
    'docs/story/season-one/src/04_week04.story': '0482bb87c8d167a4020fd47c73799fed768dba0cfd5e14fda94b19dc327e8286',
    'docs/story/season-one/src/05_week05.story': '96354f1e436ce7efae28e432585ac4b0093b2f0af830052a76b7cf397892bd0e',
    'docs/story/season-one/src/06_week06.story': '2b9fb1cd206ceb93dcdb120966b4fc7df6eb491c496c62e1d6bce0c6f6b14125',
    'docs/story/season-one/src/07_week07.story': '395c25537ce143d0ef7fd58854b14142f70a8c73b234433874a4c23a85874f27',
    'docs/story/season-one/src/08_week08.story': 'b84eaa5b8f546b073823ded19a11686557be608c7a4bc74829cf934746441a8d',
    'docs/story/season-one/src/09_week09.story': 'd687ce8f982143defc4dbfc0c43c374c4900e7610b95b8597692a9aecafbdbd8',
    'docs/story/season-one/src/10_week10.story': '66e226d4ad310efde13335abada7325555ddcdc26b1796ced1202f42fdc28447',
  };
  it.each(Object.entries(PINNED))('%s', (file, sha) => {
    expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(sha);
  });
});
