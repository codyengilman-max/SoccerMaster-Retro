import { describe, expect, it } from 'vitest';
import { planFor, presented, TrainingSession, MAX_CHOICES } from '../src/game/training12/session';
import { situationCues } from '../src/game/training12/cues';
import { emptySave, reduce, type CareerSave, type Action } from '../src/game/career/state';
import { exportSave, parseImport, parseSave } from '../src/game/career/saveio';

const mk = (id = 'S1-W01-A', role: Parameters<typeof planFor>[1] = '8', seed = 42) => new TrainingSession(planFor(id, role), 'career-1', `run-${id}-${role}-${seed}`, seed);
function toDecision(s: TrainingSession): void {
  if (s.status === 'ready') s.startRound();
  for (let i = 0; i < 4000 && !(s.drill?.phase === 'observe' && s.choices().length); i++) s.update(0.1);
  expect(s.drill?.phase).toBe('observe');
}
const playOut = (s: TrainingSession): void => {
  for (let i = 0; i < 4000 && s.drill?.phase !== 'explain'; i++) s.update(0.1);
};
const best = (s: TrainingSession) => [...s.choices()].sort((a, b) => b.assessment.quality - a.assessment.quality)[0]!.option.id;

describe('Team Training learning loop', () => {
  it('shows at most four choices, always including a good read, in a seeded order that does not sort the best first', () => {
    let bestFirst = 0;
    let n = 0;
    const orders = new Set<string>();
    for (const [id, role] of [['S1-W01-A', '8'], ['S1-W01-C', 'CB'], ['S1-W02-A', 'LW'], ['S1-W05-B', '6'], ['S2-W03-A', '9'], ['S2-W10-C', 'RB']] as const) {
      for (let seed = 1; seed <= 6; seed++) {
        const s = mk(id, role, seed);
        toDecision(s);
        const c = s.choices();
        expect(c.length).toBeGreaterThanOrEqual(2);
        expect(c.length).toBeLessThanOrEqual(MAX_CHOICES);
        expect(c.some((x) => x.assessment.good), `${id} ${role} offers a good read`).toBe(true);
        expect(new Set(c.map((x) => x.option.id)).size).toBe(c.length);
        expect(s.choices().map((x) => x.option.id), 'stable while frozen').toEqual(c.map((x) => x.option.id));
        const top = Math.max(...c.map((x) => x.assessment.quality));
        if (c[0]!.assessment.quality === top) bestFirst++;
        orders.add(c.map((x) => x.option.kind).join());
        n++;
      }
    }
    expect(bestFirst / n, 'the best choice is not always in slot A').toBeLessThan(0.75);
    expect(orders.size).toBeGreaterThan(3);
  });

  it('presented() never changes what an option is, only its position', () => {
    const assessed = new Map([
      ['pass-a', { good: true, quality: 0.9 }], ['pass-b', { good: false, quality: 0.4 }], ['carry', { good: true, quality: 0.8 }],
      ['shoot', { good: false, quality: 0.2 }], ['protect', { good: false, quality: 0.3 }], ['pass-c', { good: false, quality: 0.1 }],
    ] as const) as unknown as Parameters<typeof presented>[0];
    const a = presented(assessed, 1);
    const b = presented(assessed, 2);
    expect(a.length).toBe(4);
    expect([...a].sort()).toEqual([...b].sort());
    expect(a).toContain('pass-a');
    expect(a).toContain('carry');
    expect(presented(assessed, 1)).toEqual(a);
  });

  it('decide freezes the moment: the drill does not advance while waiting, and the frozen snapshot is the state at choice time', () => {
    const s = mk();
    toDecision(s);
    const before = JSON.stringify(s.drill!.actors.map((a) => a.pos));
    const active = s.activeSeconds;
    for (let i = 0; i < 50; i++) s.update(0.1);
    expect(JSON.stringify(s.drill!.actors.map((a) => a.pos))).toBe(before);
    expect(s.activeSeconds, 'waiting at a decision is not movement time').toBe(active);
    const id = best(s);
    expect(s.decide(id)).toBe(true);
    const at = s.attempts.at(-1)!;
    expect(JSON.stringify(at.frozen.actors.map((a) => a.pos))).toBe(before);
    expect(at.frozen.good.length).toBeGreaterThan(0);
    expect(at.frozen.chosen).not.toBeNull();
  });

  it('a hint is recorded as help: the decision counts as assisted and earns half', () => {
    const s = mk();
    toDecision(s);
    expect(s.hintAvailable).toBe(true);
    expect(s.hint(s.generation + 1), 'stale generation').toBe(false);
    expect(s.hinted).toBe(false);
    expect(s.hint()).toBe(true);
    expect(situationCues(s.drill!).lines.length).toBeGreaterThan(0);
    s.decide(best(s));
    expect(s.attempts.at(-1)!.hinted).toBe(true);
    expect(s.decisionCounts).toEqual({ independent: 0, assisted: 1 });
    const q = s.attempts.at(-1)!.decision!.quality;
    expect(s.score).toBeCloseTo(q * 0.5, 6);
  });

  it('cue lines never name or rank a choice', () => {
    const s = mk('S1-W01-C', 'CB');
    toDecision(s);
    const text = situationCues(s.drill!).lines.join(' ').toLowerCase();
    for (const c of s.choices()) expect(text).not.toContain(c.option.label.toLowerCase());
    expect(text).not.toMatch(/best|correct|should|right answer/);
  });

  it('replay rewinds the same situation, counts nothing, and the next attempt is a varied situation', () => {
    const s = mk();
    toDecision(s);
    const first = JSON.stringify(s.drill!.actors.map((a) => a.pos));
    s.decide(best(s));
    playOut(s);
    const counts = s.decisionCounts;
    const score = s.score;
    const active = s.activeSeconds;
    expect(s.replay(s.generation + 1)).toBe(false);
    expect(s.replay()).toBe(true);
    expect(s.replaying).toBe(true);
    toDecision(s);
    expect(JSON.stringify(s.drill!.actors.map((a) => a.pos)), 'replay is the same situation').toBe(first);
    s.decide(s.choices()[0]!.option.id);
    playOut(s);
    expect(s.attempts.at(-1)!.replay).toBe(true);
    expect(s.decisionCounts).toEqual(counts);
    expect(s.score).toBeCloseTo(score, 9);
    expect(s.activeSeconds, 'replayed play is not participation').toBe(active);
    s.next();
    expect(s.replaying).toBe(false);
    toDecision(s);
    expect(JSON.stringify(s.drill!.actors.map((a) => a.pos)), 'next attempt varies').not.toBe(first);
  });

  it('timed round: no hint and no replay', () => {
    const s = mk('S1-W01-B', '6', 3);
    for (let i = 0; i < 20000 && !(s.timed && s.drill?.phase === 'observe' && s.choices().length); i++) {
      if (s.status === 'ready') s.startRound();
      else if (s.status === 'reflection') s.continueRound();
      else if (s.drill?.phase === 'observe' && s.choices().length) s.decide(best(s));
      else if (s.drill?.phase === 'explain') s.next();
      else s.update(0.1);
    }
    expect(s.timed).toBe(true);
    expect(s.hintAvailable).toBe(false);
    expect(s.hint()).toBe(false);
    s.decide(best(s));
    playOut(s);
    expect(s.replay()).toBe(false);
  });
});

describe('Team Training decision evidence in the save', () => {
  const base = (): CareerSave => {
    const r = reduce(emptySave(), { type: 'createPlayer', id: 'p1', name: 'Kid', position: 'MID' });
    if (!r.ok) throw new Error(r.error);
    return r.save;
  };
  const run = (decisions?: { independent: number; assisted: number }): Action => ({ type: 'tt12Run', week: 1, slot: 'A', runId: 'r1', score: 0.8, creditEligible: true, ...(decisions ? { decisions } : {}) });

  it('stores independent/assisted counts, survives export/import and reload, and rejects bad counts', () => {
    const r = reduce(base(), run({ independent: 5, assisted: 2 }));
    expect(r.ok).toBe(true);
    const s = (r as { save: CareerSave }).save;
    expect(s.tt12[0]!.decisions).toEqual({ independent: 5, assisted: 2 });
    const back = parseImport(exportSave(s));
    expect(back.ok && back.value.tt12[0]!.decisions).toEqual({ independent: 5, assisted: 2 });
    const re = parseSave(JSON.parse(JSON.stringify(s)));
    expect(re.ok && re.value.tt12[0]!.decisions).toEqual({ independent: 5, assisted: 2 });
    for (const bad of [{ independent: -1, assisted: 0 }, { independent: 1.5, assisted: 0 }, { independent: 0, assisted: 9999 }]) {
      expect(reduce(base(), run(bad)).ok).toBe(false);
    }
    const raw = JSON.parse(JSON.stringify(s));
    raw.tt12[0].decisions = { independent: 'x', assisted: 0 };
    expect(parseSave(raw).ok).toBe(false);
  });

  it('legacy runs without counts load unchanged; nothing is invented', () => {
    const s = (reduce(base(), run()) as { save: CareerSave }).save;
    expect('decisions' in s.tt12[0]!).toBe(false);
    const re = parseSave(JSON.parse(JSON.stringify(s)));
    expect(re.ok && 'decisions' in re.value.tt12[0]!).toBe(false);
  });

  it('the same run id twice changes nothing', () => {
    const s = (reduce(base(), run({ independent: 3, assisted: 0 })) as { save: CareerSave }).save;
    const again = reduce(s, run({ independent: 9, assisted: 9 }));
    expect(again.ok && !again.changed).toBe(true);
  });

  it('shows every good read when up to four qualify (review: good reads were capped at two)', () => {
    const a = (quality: number, good: boolean) => ({ quality, good }) as never;
    const m = new Map([['pass-a', a(0.9, true)], ['pass-b', a(0.85, true)], ['carry', a(0.8, true)], ['shoot', a(0.3, false)], ['set', a(0.2, false)]]);
    for (let seed = 1; seed < 20; seed++) {
      const p = presented(m, seed);
      expect(p.length).toBe(MAX_CHOICES);
      for (const id of ['pass-a', 'pass-b', 'carry']) expect(p).toContain(id);
    }
  });

  it('a replay never uses up round time (review: replays ticked the bout clock)', () => {
    const s = mk('S1-W01-A', '8', 3);
    toDecision(s);
    s.decide(s.choices()[0]!.option.id);
    for (let i = 0; i < 800 && s.drill!.phase !== 'explain'; i++) s.update(0.05);
    expect(s.drill!.phase).toBe('explain');
    const t = s.run.elapsed;
    const active = s.activeSeconds;
    expect(s.replay()).toBe(true);
    for (let i = 0; i < 800 && s.drill!.phase !== 'observe'; i++) s.update(0.05);
    s.decide(s.choices()[0]!.option.id);
    for (let i = 0; i < 800 && s.drill!.phase !== 'explain'; i++) s.update(0.05);
    expect(s.drill!.phase).toBe('explain');
    expect(s.run.elapsed).toBe(t);
    expect(s.activeSeconds).toBe(active);
    expect(s.run.status).toBe('playing');
  });
});
