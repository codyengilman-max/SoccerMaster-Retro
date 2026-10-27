import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { StoryStore, parseStoryState } from '../src/game/story/store';
import { SEASON_ONE, crossbarRules, sceneById, trainingDetail } from '../src/game/story/content';
import { contestResult, idealPower, launchAttempt, newContest, nextSlot, resolveAttempt, type Contest, type Participant } from '../src/game/story/crossbar';
import { SEASON_RELEASED_WEEKS, awaitingRelease, currentNode, migrateStory, setReleasedWeeks, newSeasonStory, reduceStory, type StoryCommand, type StoryState } from '../src/game/story/runtime';
import { slotIds } from '../src/game/season/calendar';

// Owner rewrite of Season One weeks 1-2 (2026-10-20): Sam's park Crossbar, Code's first session,
// Friday Mom, Blake's Crossbar with a real refusal path, the classroom board and Thursday Cloudy.

let seq = 0;
const step = (s: StoryState, c: Record<string, unknown>): StoryState => {
  const r = reduceStory(s, { ...c, revision: s.revision } as StoryCommand);
  if (!r.ok) throw new Error(`${String(c.type)} at ${s.sceneId}.${s.nodeId}: ${r.error}`);
  return r.state;
};

interface Plan {
  picks?: Record<string, string>; // "SCENE.key" -> option id
  crossbar?: Record<string, 'WIN' | 'DRAW' | 'LOSS'>;
  training?: Record<string, string>; // scene -> detail
}
/** Plays from the start until `stop` is reached (default: the end of the released weeks); returns the state there and every line shown. */
function play(plan: Plan, stop: string | null = null) {
  let s = newSeasonStory('w12');
  const text: string[] = [];
  let runs = 0;
  for (let i = 0; i < 4000 && (stop === null ? !s.complete : s.sceneId !== stop); i++) {
    const n = currentNode(s)!;
    if (n.type === 'line') { text.push(n.text); s = step(s, { type: 'advance', seq: ++seq }); }
    else if (n.type === 'choice') s = step(s, { type: 'choose', seq: ++seq, choiceId: plan.picks?.[`${s.sceneId}.${n.id}`] ?? n.options[0]!.id });
    else if (n.type === 'activity_handoff') {
      const runId = `00000000-0000-4000-8000-${String(++runs).padStart(12, '0')}`;
      const r = reduceStory(s, { type: 'launch', revision: s.revision, runId });
      if (!r.ok && /declined/.test(r.error)) { s = step(s, { type: 'decline', seq: ++seq }); continue; }
      if (!r.ok) throw new Error(`${s.sceneId}: ${r.error}`);
      s = r.state;
      const result = ['crossbar', 'jungle', 'league_match', 'tournament_match'].includes(n.adapter) ? plan.crossbar?.[s.sceneId] ?? 'WIN' : null;
      const detail = n.adapter === 'team_training' ? plan.training?.[s.sceneId] ?? null : n.adapter === 'home_learning' ? 'completed' : n.adapter === 'training_log' ? 'within' : n.adapter === 'school_reward' ? 'unconfigured' : null;
      s = step(s, { type: 'complete', runId, outcome: 'completed', result, detail });
    } else if (n.type === 'end') s = step(s, { type: 'advance', seq: ++seq });
  }
  expect(stop === null ? [s.sceneId, s.complete] : s.sceneId).toEqual(stop === null ? ['S1_W10_E', true] : stop);
  return { s, text: text.join('\n') };
}

function shoot(c: Contest, who: Participant, scores: boolean): Contest {
  const l = launchAttempt(c, who, { dirX: 0, dirY: 1, power: scores ? idealPower() : 0.05 });
  if (!l.ok) throw new Error(l.error);
  const r = resolveAttempt(l.contest);
  if (!r.ok) throw new Error(r.error);
  return r.contest;
}
function contest(sudden: boolean, player: boolean[], opp: boolean[]): Contest {
  let c = newContest('c', false, sudden);
  for (let i = 0; i < 3; i++) { c = shoot(c, 'player', player[i]!); c = shoot(c, 'blake', opp[i]!); }
  return c;
}

describe('Season One weeks 1-2 rewrite', () => {
  it('week 1 carries the Mom talk and week 2 has none; every slot exists', () => {
    expect(slotIds(1)).toContain('S1_W01_P');
    expect(slotIds(2).some((x) => x.endsWith('_P'))).toBe(false);
    expect(SEASON_ONE.order.filter((id) => id.startsWith('S1_W02_'))).toEqual(['S1_W02_T', 'S1_W02_H', 'S1_W02_E']);
    for (const id of slotIds(1)) expect(sceneById(id), id).toBeDefined();
    expect(SEASON_ONE.order.slice(0, 10)).toEqual(['S1_PRO_IDENTITY', 'S1_PRO_DEPART', 'S1_PRO_ARRIVE', 'S1_PRO_ROOM', 'S1_W01_M', 'S1_W01_S', 'S1_W01_C', 'S1_W01_F', 'S1_W01_P', 'S1_W01_E']);
    expect(sceneById('S1_W02_P')).toBeUndefined();
  });

  it('Sam is the week 1 opponent with equal warm-ups; neither replacement crossbar plays sudden death', () => {
    expect(crossbarRules('S1_W01_S')).toEqual({ opponent: 'Sam', warmup: 'always', sudden: false });
    expect(crossbarRules('S1_W02_S')).toMatchObject({ opponent: 'Blake', sudden: false });
    expect(crossbarRules('S1_W13_S').sudden).toBe(true);
  });

  it('a tie after three counted shots stays a draw; the older contests still go to sudden death', () => {
    const tie = contest(false, [true, false, true], [false, true, true]);
    expect(nextSlot(tie)).toBeNull();
    expect(contestResult(tie)).toBe('DRAW');
    const legacy = contest(true, [true, false, true], [false, true, true]);
    expect(nextSlot(legacy)).toMatchObject({ round: 'sudden', participant: 'player' });
    expect(contestResult(legacy)).toBeNull();
    expect(contestResult(contest(false, [true, true, false], [false, false, false]))).toBe('WIN');
  });

  it('the real week 1 crossbar result drives Sam and Cloudy', () => {
    const lost = play({ crossbar: { S1_W01_S: 'LOSS' } }).text;
    expect(lost).toContain('thank the crossbar for finally cooperating');
    expect(lost).toContain('Sam beat me at crossbar');
    const won = play({ crossbar: { S1_W01_S: 'WIN' } }).text;
    expect(won).toContain('third-best crossbar player in my house');
  });

  it("Code's reply follows the real Team Training grade", () => {
    expect([2, 1, 0, -1].map(trainingDetail)).toEqual(['strong', 'steady', 'struggled', 'struggled']);
    const good = play({ training: { S1_W01_C: 'strong' } }).text;
    expect(good).toContain('notice when the easy option closes');
    const hard = play({ training: { S1_W01_C: 'struggled' } }).text;
    expect(hard).toContain('trying to fix three things at once');
  });

  it('remembers the phone, invitation and Mom support', () => {
    const { s } = play({ picks: { 'S1_PRO_DEPART.phone': 'photo', 'S1_W01_S.invite': 'ask_mom', 'S1_W01_P.support': 'minute' } });
    expect(s.decisions.S1_PRO_DEPART?.phone).toBe('photo');
    expect(s.decisions.S1_W01_S?.invite).toBe('ask_mom');
    expect(s.decisions.S1_W01_P?.support).toBe('minute');
  });

  it('a save resting on old text restarts only that scene; the retired week 2 parent scene continues to the weekend', () => {
    const { s } = play({ picks: { 'S1_PRO_DEPART.phone': 'save_spot' } }, 'S1_W01_M');
    const old: StoryState = { ...s, nodeId: 'n7', decisions: { ...s.decisions, S1_W01_M: { feeling: 'nervous' } } };
    const m = migrateStory(old);
    expect(m.sceneId).toBe('S1_W01_M');
    expect(m.nodeId).toBe(sceneById('S1_W01_M')!.entry);
    expect(m.decisions.S1_W01_M).toBeUndefined();
    expect(m.decisions.S1_PRO_DEPART?.phone).toBe('save_spot');
    expect(migrateStory(m)).toBe(m);
    const parent = migrateStory({ ...s, sceneId: 'S1_W02_P', nodeId: 'n4' });
    expect(parent.sceneId).toBe('S1_W02_E');
  });

  it('the store resumes a save on an old node or the retired parent scene instead of calling it unreadable', async () => {
    const { s } = play({}, 'S1_W01_C');
    const oldNode = { ...s, nodeId: 'n10', decisions: { ...s.decisions, S1_W01_C: { code: 'listen' } } };
    const p = parseStoryState(oldNode);
    expect(p.ok && [p.value.sceneId, p.value.nodeId]).toEqual(['S1_W01_C', sceneById('S1_W01_C')!.entry]);
    const parent = parseStoryState({ ...s, sceneId: 'S1_W02_P', nodeId: 'n4' });
    expect(parent.ok && parent.value.sceneId).toBe('S1_W02_E');
    expect(parseStoryState({ ...s, sceneId: 'S1_NOPE', nodeId: 'n1' }).ok).toBe(false);
    // Unknown positions outside the rewrite are not silently restarted.
    // A week 2–10 scene rewritten by the owner (revision v3) restarts; its retired siblings continue in the same week.
    const w3 = parseStoryState({ ...s, sceneId: 'S1_W03_S', nodeId: 'v2n999' });
    expect(w3.ok && [w3.value.sceneId, w3.value.nodeId]).toEqual(['S1_W03_S', sceneById('S1_W03_S')!.entry]);
    const gone = parseStoryState({ ...s, sceneId: 'S1_W03_M', nodeId: 'v2n4' });
    expect(gone.ok && gone.value.sceneId).toBe('S1_W03_S');
    expect(parseStoryState({ ...s, nodeId: 'unknown_node' }).ok).toBe(false);
    for (const raw of [oldNode, { ...s, sceneId: 'S1_W02_P', nodeId: 'n4' }]) {
      const f = new IDBFactory();
      (await StoryStore.open(f, 'st')).close();
      await new Promise<void>((done, fail) => {
        const req = f.open('st', 1);
        req.onsuccess = () => {
          const tx = req.result.transaction('story', 'readwrite');
          tx.objectStore('story').put(raw, 'w12');
          tx.oncomplete = () => { req.result.close(); done(); };
          tx.onerror = () => fail(tx.error);
        };
        req.onerror = () => fail(req.error);
      });
      const store = await StoryStore.open(f, 'st');
      const b = await store.begin('w12');
      expect(b.ok, JSON.stringify(b)).toBe(true);
      if (!b.ok) continue;
      expect(currentNode(b.state)).toBeDefined();
      const r = await store.dispatch('w12', { type: 'advance', revision: b.state.revision, seq: b.state.lastSeq + 1 });
      expect(r.ok, JSON.stringify(r.ok ? '' : r.error)).toBe(true);
      store.close();
    }
  });
});

describe('Season One stops after the released weeks 1–10 (owner rewrite, 2026-10-27)', () => {
  it('the story ends at the week 10 close and never launches an empty week', () => {
    const { s } = play({});
    expect(s.complete && s.sceneId).toBe('S1_W10_E');
    expect(awaitingRelease(s)).toBe(true);
    expect(migrateStory(s)).toBe(s);
    setReleasedWeeks(99);
    try { expect(migrateStory(s)).toEqual(s); } finally { setReleasedWeeks(SEASON_RELEASED_WEEKS); }
  });

  it('weeks 11–18 and the epilogue hold no scenes', () => {
    for (let w = 11; w <= 18; w++) expect(SEASON_ONE.order.some((id) => id.startsWith(`S1_W${String(w).padStart(2, '0')}_`))).toBe(false);
    expect(SEASON_ONE.order.some((id) => id.startsWith('S1_END'))).toBe(false);
  });
});
