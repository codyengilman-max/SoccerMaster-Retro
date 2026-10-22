import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { currentNode, newStory, outcomeOf, reduceStory, type StoryCommand, type StoryState } from '../src/game/story/runtime';

let seq = 0;
const step = (s: StoryState, c: Omit<StoryCommand, 'revision'> & Record<string, unknown>): StoryState => {
  const r = reduceStory(s, { ...c, revision: s.revision } as StoryCommand);
  if (!r.ok) throw new Error(`${c.type} at ${s.sceneId}.${s.nodeId}: ${r.error}`);
  return r.state;
};
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
type Done = { outcome: 'completed' | 'declined' | 'abandoned'; result?: 'WIN' | 'DRAW' | 'LOSS' | null; detail?: string | null };
interface Opts {
  pick?: (scene: string, node: string, ids: string[]) => string | undefined;
  done?: (scene: string, adapter: string, n: number) => Done | undefined;
}
/** Plays the whole released story, recording every line shown. Defaults: first option, DRAW, hub "trained". */
function play(opts: Opts = {}): { s: StoryState; lines: string[] } {
  let s = newStory('w5');
  let runs = 0;
  const lines: string[] = [];
  const hubs: Record<string, number> = {};
  for (let i = 0; i < 4000 && !s.complete; i++) {
    const n = currentNode(s)!;
    if (n.type === 'line') {
      lines.push(`${s.sceneId}|${(n as unknown as { text: string }).text}`);
      s = step(s, { type: 'advance', seq: ++seq });
    } else if (n.type === 'choice') {
      const ids = n.options.map((o) => o.id);
      s = step(s, { type: 'choose', seq: ++seq, choiceId: opts.pick?.(s.sceneId, n.id, ids) ?? ids[0]! });
    } else if (n.type === 'activity_handoff') {
      const k = `${s.sceneId}|${n.adapter}`;
      hubs[k] = (hubs[k] ?? 0) + 1;
      const r = reduceStory(s, { type: 'launch', revision: s.revision, runId: uuid(++runs) });
      if (!r.ok && /declined/.test(r.error)) {
        s = step(s, { type: 'decline', seq: ++seq });
        continue;
      }
      if (!r.ok) throw new Error(r.error);
      s = r.state;
      const fallback: Done = ['crossbar', 'jungle', 'league_match', 'tournament_match'].includes(n.adapter)
        ? { outcome: 'completed', result: 'DRAW' }
        : { outcome: 'completed', detail: n.adapter === 'home_hub' ? 'trained' : null };
      const d = opts.done?.(s.sceneId, n.adapter, hubs[k]!) ?? fallback;
      s = step(s, { type: 'complete', runId: r.runId!, outcome: d.outcome, result: d.outcome === 'completed' ? (d.result ?? null) : null, detail: d.detail ?? null });
    }
  }
  return { s, lines };
}
const w5 = (lines: string[], scene: string) => lines.filter((l) => l.startsWith(`${scene}|`)).map((l) => l.slice(scene.length + 1));

describe('V3 week 5 (approved): order, branches and persisted choices', () => {
  it('follows week 4 in the approved scene order and stops at the week 5 close', () => {
    const { s } = play();
    expect(s.complete).toBe(true);
    const order = s.completedScenes.filter((id) => id.startsWith('S1_W05_'));
    expect(order).toEqual(['S1_W05_M', 'S1_W05_S', 'S1_W05_T', 'S1_W05_A', 'S1_W05_H', 'S1_W05_G', 'S1_W05_E']);
    expect(s.completedScenes.indexOf('S1_W05_M')).toBe(s.completedScenes.indexOf('S1_W04_E') + 1);
    expect(s.completedScenes.some((id) => /^S1_W(0[6-9]|1\d)_/.test(id))).toBe(false);
  });

  it('records the ambition and the park intention as story decisions only', () => {
    const { s } = play({ pick: (sc, node, ids) => (sc === 'S1_W05_A' ? 'team_reliable' : sc === 'S1_W05_G' && node === 'park' ? 'rest' : ids[0]) });
    expect(s.decisions['S1_W05_A']).toMatchObject({ ambition: 'team_reliable' });
    expect(s.decisions['S1_W05_G']).toMatchObject({ park: 'rest' });
  });

  it.each(['WIN', 'DRAW', 'LOSS'] as const)('recess reaction follows the actual %s', (res) => {
    const { lines } = play({ done: (sc) => (sc === 'S1_W05_S' ? { outcome: 'completed', result: res } : undefined) });
    const said = w5(lines, 'S1_W05_S').join('\n');
    expect(said.includes('Been practicing?')).toBe(res === 'WIN');
    expect(said.includes("We're not discussing that.")).toBe(res === 'LOSS');
    expect(said.includes('Rematch next week.')).toBe(res === 'DRAW');
  });

  it('Team Training feedback is driven by the recorded evidence, never the conversation', () => {
    const texts = (['strong', 'steady', 'struggled'] as const).map((d) => w5(play({ done: (sc) => (sc === 'S1_W05_T' ? { outcome: 'completed', detail: d } : undefined) }).lines, 'S1_W05_T').join('\n'));
    expect(new Set(texts).size).toBe(3);
  });

  it('home hub: Continue skips Cloudy; Talk opens Cloudy, gates the ambition on "share", then returns to the hub', () => {
    const plain = play();
    expect(plain.s.decisions['S1_W05_H']?.cloudy).toBeUndefined();
    const talk = (pick: 'share' | 'check') =>
      play({
        pick: (sc, node, ids) => (sc === 'S1_W05_A' ? 'state_best' : sc === 'S1_W05_H' && node === 'cloudy' ? pick : ids[0]),
        done: (_sc, a, n) => (a === 'home_hub' ? { outcome: 'completed', detail: n === 1 ? 'talk' : 'trained' } : undefined),
      });
    const shared = talk('share');
    const checked = talk('check');
    expect(shared.s.decisions['S1_W05_H']).toMatchObject({ cloudy: 'share' });
    expect(checked.s.decisions['S1_W05_H']).toMatchObject({ cloudy: 'check' });
    const hubRuns = (st: StoryState) => Object.values(st.runs).filter((r) => r.sceneId === 'S1_W05_H');
    expect(hubRuns(shared.s).map((r) => r.detail)).toEqual(['talk', 'trained']);
    expect(w5(shared.lines, 'S1_W05_H').length).toBeGreaterThan(w5(checked.lines, 'S1_W05_H').length);
    expect(shared.s.complete).toBe(true);
  });

  it.each(['WIN', 'DRAW', 'LOSS'] as const)('league game 3 aftermath follows the actual %s', (res) => {
    const others = (['WIN', 'DRAW', 'LOSS'] as const).filter((r) => r !== res);
    const mine = w5(play({ done: (sc, a) => (a === 'league_match' && sc === 'S1_W05_G' ? { outcome: 'completed', result: res } : undefined) }).lines, 'S1_W05_G');
    for (const o of others) {
      const theirs = w5(play({ done: (sc, a) => (a === 'league_match' && sc === 'S1_W05_G' ? { outcome: 'completed', result: o } : undefined) }).lines, 'S1_W05_G');
      expect(mine).not.toEqual(theirs);
    }
    expect(outcomeOf(play({ done: (sc, a) => (a === 'league_match' && sc === 'S1_W05_G' ? { outcome: 'completed', result: res } : undefined) }).s, 'S1_W05_G')).toMatchObject({ result: res });
  });

  it('an unknown league result is rejected, never saved as a loss', () => {
    let s = newStory('w5u');
    let runs = 0;
    for (let i = 0; i < 4000 && s.sceneId !== 'S1_W05_G'; i++) {
      const n = currentNode(s)!;
      if (n.type === 'line') s = step(s, { type: 'advance', seq: ++seq });
      else if (n.type === 'choice') s = step(s, { type: 'choose', seq: ++seq, choiceId: n.options[0]!.id });
      else if (n.type === 'activity_handoff') {
        const r = reduceStory(s, { type: 'launch', revision: s.revision, runId: uuid(++runs) });
        if (!r.ok) s = step(s, { type: 'decline', seq: ++seq });
        else s = step(r.state, { type: 'complete', runId: r.runId!, outcome: 'completed', result: ['crossbar', 'jungle', 'league_match'].includes(n.adapter) ? 'DRAW' : null, detail: n.adapter === 'home_hub' ? 'trained' : null });
      }
    }
    while (currentNode(s)!.type !== 'activity_handoff') s = step(s, { type: 'advance', seq: ++seq });
    const r = reduceStory(s, { type: 'launch', revision: s.revision, runId: uuid(9999) });
    if (!r.ok) throw new Error(r.error);
    const bad = reduceStory(r.state, { type: 'complete', revision: r.state.revision, runId: r.runId!, outcome: 'completed', result: null });
    expect(bad.ok).toBe(false);
    expect(outcomeOf(r.state, 'S1_W05_G')?.result ?? null).toBeNull();
    expect(Object.values(r.state.runs).some((x) => x.sceneId === 'S1_W05_G' && x.result === 'LOSS')).toBe(false);
  });
});

describe('V3 week 5: registered source hashes', () => {
  // Weeks 1–4 are byte-identical to the approved text; week 5 is the reviewed V3 compile; the package copy is unchanged.
  const PINNED: Record<string, string> = {
    'docs/story/season-one/src/00_prologue.story': '806cae9dcd70f697dd89c829fffb174247739cc695b7e00fe2a344786418c672',
    'docs/story/season-one/src/01_week01.story': '88f7533af27970dd2745bd8dff35d27afaf349e72ac15e86e749f45398b20b6e',
    'docs/story/season-one/src/02_week02.story': '7ee40088e17e37cd12c899c9ec71ec2d6b505ca5d296dc94253971bd88a5380b',
    'docs/story/season-one/src/03_week03.story': '2b6fb5ad4375713451e463324fd4e19b74883e17ed687847750e8d42c50ebccd',
    'docs/story/season-one/src/04_week04.story': '0b9ebf92fc78931d47c35d512dea6fbd770b8c58d3e249a442409626272d165b',
    'docs/story/season-one/src/05_week05.story': 'b400eedacecd94e7c93358b10eabe1b6d52b7b2da72f198439d1d3829d646cd3',
    'docs/story/v3/WEEK_05_APPROVED.md': 'e0200f3acd9ade1102943f45a10fa868a2ad99df7f93c7d89386f098d3c091c1',
  };
  it.each(Object.entries(PINNED))('%s', (file, sha) => {
    expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(sha);
  });
});
