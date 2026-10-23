import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { rileyLine, weekAssignments } from '../src/game/story/facts';
import { decisionDetail, trainingDetail } from '../src/game/story/content';
import { parseSave } from '../src/game/career/saveio';
import { emptySave, reduce, type CareerSave, type JournalEntry } from '../src/game/career/state';
import { selectSituations } from '../src/game/career/teamTraining';
import { CORE_ACTIVITIES, JUGGLING_LADDER } from '../src/game/career/catalog';
import { currentNode, newStory, reduceStory, type StoryCommand, type StoryState } from '../src/game/story/runtime';

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
  let s = newStory('w67');
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


const RES = ['WIN', 'DRAW', 'LOSS'] as const;

describe('Weeks 6–7 (owner scripts): order, branches and saved choices', () => {
  it('week 6 follows week 5 with no school scene, then week 7, and the story stops at the week 7 close', () => {
    const { s } = play();
    expect(s.complete).toBe(true);
    expect(s.completedScenes.filter((id) => /^S1_W0[67]_/.test(id))).toEqual(['S1_W06_S', 'S1_W06_T', 'S1_W06_L', 'S1_W06_H', 'S1_W06_G', 'S1_W06_E', 'S1_W07_M', 'S1_W07_S', 'S1_W07_T', 'S1_W07_A', 'S1_W07_H', 'S1_W07_G', 'S1_W07_E']);
    expect(s.completedScenes.indexOf('S1_W06_S')).toBe(s.completedScenes.indexOf('S1_W05_E') + 1);
    expect(s.completedScenes.some((id) => /^S1_W0[6]_M/.test(id))).toBe(false);
    expect(s.sceneId).toBe('S1_W07_E');
  });

  it("Coach Code's lines are word for word from the owner text", () => {
    const owner = readFileSync('docs/story/season-one/owner/WEEK_06_OWNER.txt', 'utf8') + readFileSync('docs/story/season-one/owner/WEEK_07_OWNER.txt', 'utf8');
    const norm = (t: string) => t.replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
    const src = readFileSync('docs/story/season-one/src/06_week06.story', 'utf8') + readFileSync('docs/story/season-one/src/07_week07.story', 'utf8');
    const code = src.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('Coach Code: ')).map((l) => l.slice(12));
    expect(code.length).toBeGreaterThanOrEqual(30);
    for (const c of code) expect(norm(owner).includes(`"${c}"`) || norm(owner).includes(`: ${c}`), c).toBe(true);
  });

  for (const res of RES) {
    it(`recess and league lines follow the real result (${res}) in both weeks`, () => {
      const { lines } = play({ done: (sc, a) => (['crossbar', 'jungle', 'league_match'].includes(a) && /^S1_W0[67]_/.test(sc) ? { outcome: 'completed', result: res } : undefined) });
      const r6 = w5(lines, 'S1_W06_S').join('\n');
      expect(r6.includes('Recruiting you was a mistake.')).toBe(res === 'WIN');
      expect(r6.includes("We're blaming the sun.")).toBe(res === 'LOSS');
      expect(r6.includes('Rematch next week.')).toBe(res === 'DRAW');
      const r7 = w5(lines, 'S1_W07_S').join('\n');
      expect(r7.includes("Please don't start giving speeches.")).toBe(res === 'WIN');
      expect(r7.includes("We're keeping that between us.")).toBe(res === 'LOSS');
      expect(r7.includes("Lunch? Something I'm good at.")).toBe(res === 'DRAW');
      const g6 = w5(lines, 'S1_W06_G').join('\n');
      expect(g6.includes('Good afternoon. Better if there are snacks.')).toBe(res === 'WIN');
      expect(g6.includes('Feels unfinished.')).toBe(res === 'DRAW');
      expect(g6.includes('Talk later?')).toBe(res === 'LOSS');
      const g7 = w5(lines, 'S1_W07_G').join('\n');
      expect(g7.includes('We should do that more.')).toBe(res === 'WIN');
      expect(g7.includes("Another one for the 'almost' collection.")).toBe(res === 'DRAW');
      expect(g7.includes('Walk with me?')).toBe(res === 'LOSS');
      // No recorded learning/support moment: Code never praises one.
      expect(g6).toContain("We'll find a useful moment to review. There's always something.");
      expect(g6).not.toContain('That moment we flagged');
      expect(g7).toContain("Next session, we'll look at where we gave each other options—and where we didn't.");
      expect(g7).not.toContain('That support movement mattered.');
      expect(g7).toContain('Blake taps the heart.');
      expect(w5(lines, 'S1_W06_G').join('\n')).toContain('Finally. Someone who might answer.');
    });
  }

  it('a skipped league match shows no result line and no Code review, never a loss', () => {
    const { lines, s } = play({ done: (sc, a) => (a === 'league_match' && /^S1_W0[67]_/.test(sc) ? { outcome: 'declined' } : undefined) });
    const g = [...w5(lines, 'S1_W06_G'), ...w5(lines, 'S1_W07_G')].join('\n');
    for (const t of ['Talk later?', 'Walk with me?', 'Feels unfinished.', 'We should do that more.', 'useful moment', 'Next session']) expect(g).not.toContain(t);
    expect(s.complete).toBe(true);
  });

  it('every choice is saved and shows its own reply', () => {
    const picks: Record<string, string> = { question: 'changes', park: 'not_this_time', plans: 'full_name', clips: 'follow', riley: 'show_time', plan: 'help' };
    const { s, lines } = play({ pick: (sc, _n, ids) => (/^S1_W0[67]_/.test(sc) ? ids.find((i) => Object.values(picks).includes(i)) ?? ids[ids.length - 1] : undefined) });
    expect(s.decisions['S1_W06_T']).toMatchObject({ question: 'changes' });
    expect(s.decisions['S1_W06_H']).toMatchObject({ park: 'not_this_time' });
    expect(s.decisions['S1_W06_G']).toMatchObject({ plans: 'full_name' });
    expect(s.decisions['S1_W07_M']).toMatchObject({ clips: 'follow', riley: 'show_time' });
    expect(s.decisions['S1_W07_H']).toMatchObject({ plan: 'help' });
    expect(w5(lines, 'S1_W06_T').join('\n')).toContain("Then update the picture. One look isn't a lifetime subscription.");
    expect(w5(lines, 'S1_W06_T').join('\n')).not.toContain('Pressure. Teammates. Space.');
    expect(w5(lines, 'S1_W07_M').join('\n')).toContain('Since they started playing decent soccer.');
    expect(w5(lines, 'S1_W07_H').join('\n')).toContain("Yep. Show me what's required first.");
  });

  for (const [detail, line] of [['strong', 'THERE! You already knew your next option.'], ['execution', 'You saw the right option. Now tidy up the execution.'], ['poor_decision', 'Stop. What changed while the ball was travelling?']] as const) {
    it(`week 6 Team Training reaction "${detail}" shows only its line`, () => {
      const { lines } = play({ done: (sc) => (sc === 'S1_W06_T' ? { outcome: 'completed', detail } : undefined) });
      const t = w5(lines, 'S1_W06_T').join('\n');
      expect(t).toContain(line);
      for (const other of ['THERE! You already', 'Now tidy up the execution.', 'Stop. What changed']) if (!line.startsWith(other) && !line.includes(other)) expect(t).not.toContain(other);
    });
  }

  it('the optional Cloudy talk shows its lines and still needs the required training to continue', () => {
    const { lines } = play({ done: (sc, a, n) => (a === 'home_hub' && /^S1_W0[67]_H/.test(sc) && n === 1 ? { outcome: 'completed', detail: 'talk' } : undefined) });
    expect(w5(lines, 'S1_W06_H').join('\n')).toContain('Finally. Security.');
    expect(w5(lines, 'S1_W07_H').join('\n')).toContain('And somehow still underappreciated.');
  });
});

describe('Weeks 6–7 facts from real records only', () => {
  it('decisionDetail: strong week, then the evaluator evidence, then a poor week; old records never claim execution', () => {
    expect(decisionDetail({ delta: 2, choiceMissed: 1 })).toBe('strong');
    expect(decisionDetail({ delta: 1, choiceMissed: 1 })).toBe('execution');
    expect(decisionDetail({ delta: 0, choiceMissed: 2 })).toBe('execution');
    expect(decisionDetail({ delta: 0 })).toBe('poor_decision');
    expect(decisionDetail({ delta: -1, choiceMissed: 0 })).toBe('poor_decision');
    expect(decisionDetail({ delta: 1 })).toBe('steady');
    expect(trainingDetail(1)).toBe('steady');
  });

  const jug = JUGGLING_LADDER[0]!.id;
  const touch = CORE_ACTIVITIES.find((a) => a.skillFamilyId === 'firstTouch')!.id;
  const pass = CORE_ACTIVITIES.find((a) => a.skillFamilyId === 'passing')!.id;
  const entry = (activityId: string, o: Partial<JournalEntry> = {}): JournalEntry =>
    ({ id: `j-${activityId}-${Math.random()}`, week: 6, sessionId: null, activityId, variantId: null, completion: 'done', credited: false, ...o }) as unknown as JournalEntry;
  const save = (journal: JournalEntry[], o: Partial<CareerSave> = {}): CareerSave => ({ ...emptySave(), week: 6, journal, ...o }) as CareerSave;

  it('week 6 needs juggling, first touch and the planned home sessions; week 7 swaps in passing', () => {
    const all = ['a', 'b', 'c'];
    expect(weekAssignments(save([entry(jug), entry(touch)]), 6)).toMatchObject({ skill: 'firstTouch', learning: false, complete: false });
    expect(weekAssignments(save([entry(jug), entry(touch)], { completedSessions: all }), 6).complete).toBe(true);
    expect(weekAssignments(save([entry(jug), entry(touch)], { completedSessions: all }), 7).complete).toBe(false);
    expect(weekAssignments(save([entry(jug), entry(pass)], { completedSessions: all }), 7)).toMatchObject({ skill: 'passing', complete: true });
    expect(weekAssignments(save([entry(jug), entry(pass, { completion: 'partly' })], { completedSessions: all }), 7).complete).toBe(false);
    expect(weekAssignments(save([entry(jug), entry(touch)]), 5)).toMatchObject({ learning: null, complete: true });
  });

  it("Riley's request is availability only and no time is invented", () => {
    expect(rileyLine(7, 'check_training')).toContain("Riley hasn't sent the time yet");
    expect(rileyLine(7, 'show_time')).toContain('nothing is confirmed');
    expect(rileyLine(7, 'cant')).toBe('');
    expect(rileyLine(6, 'show_time')).toBe('');
    expect(rileyLine(7, 'show_time')).not.toMatch(/\d{1,2}:\d\d|\b\d{1,2} ?(am|pm)\b/i);
  });

  it('saved Team Training evidence survives reload; older records without it still load', () => {
    const made = reduce(emptySave(), { type: 'createPlayer', id: 'p', name: 'A', position: 'MID' });
    if (!made.ok) throw new Error(made.error);
    const base = made.save;
    const results = selectSituations('MID', base.week).map((x, i) => ({ id: x.id, score: 0.4, notes: [], choiceMissed: i === 0 }));
    const r = reduce(base, { type: 'teamTraining', week: base.week, results });
    if (!r.ok) throw new Error(r.error);
    const rec = r.save.teamTraining.at(-1)!;
    expect(rec.choiceMissed).toBe(1);
    const round = parseSave(JSON.parse(JSON.stringify(r.save)));
    expect(round.ok && round.value.teamTraining.at(-1)).toEqual(rec);
    expect(decisionDetail(rec)).toBe('execution');
    const old = JSON.parse(JSON.stringify(r.save));
    delete old.teamTraining.at(-1).choiceMissed;
    const oldRound = parseSave(old);
    expect(oldRound.ok && oldRound.value.teamTraining.at(-1)!.choiceMissed).toBe(undefined);
    const bad = JSON.parse(JSON.stringify(r.save));
    bad.teamTraining.at(-1).choiceMissed = 9;
    expect(parseSave(bad).ok).toBe(false);
  });
});
