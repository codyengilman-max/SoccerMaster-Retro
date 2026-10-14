import { describe, expect, it } from 'vitest';
import { CAREER_CONFIG } from '../src/game/career/config';
import { activityById } from '../src/game/career/catalog';
import { cleanName } from '../src/game/career/player';
import { substitutes } from '../src/game/career/planner';
import { emptySave, levelSuggestion, reduce, type Action, type CareerSave, type JournalEntry } from '../src/game/career/state';

function run(save: CareerSave, ...actions: Action[]): CareerSave {
  for (const a of actions) {
    const r = reduce(save, a);
    if (!r.ok) throw new Error(r.error);
    save = r.save;
  }
  return save;
}
const start = () => run(emptySave(), { type: 'createPlayer', id: 'p1', name: 'Sam', position: 'MID' }, { type: 'chooseFocus', focusId: 'ft-cushion' });
let n = 0;
function entry(save: CareerSave, s: number, over: Partial<JournalEntry> = {}): Omit<JournalEntry, 'credited' | 'week'> {
  const session = save.plan!.sessions[s]!;
  const it = session.items[0]!;
  return { id: `c${++n}`, sessionId: session.id, activityId: it.activityId, variantId: it.variantId, contentVersion: activityById(it.activityId)!.version, completion: 'done', rating: 'improving', foot: 'right', personalBest: null, reflection: '', easier: false, ...over };
}

describe('M6 journal, credit and weeks', () => {
  it('duplicate Complete taps are idempotent', () => {
    const s0 = start();
    const e = entry(s0, 0);
    const s1 = run(s0, { type: 'log', entry: e });
    const again = reduce(s1, { type: 'log', entry: e });
    expect(again.ok && again.changed).toBe(false);
    expect(s1.credit).toBe(1);
    expect(s1.journal).toHaveLength(1);
  });

  it('a session only credits once; extra practice earns nothing; max three per week', () => {
    let s = start();
    s = run(s, { type: 'log', entry: entry(s, 0) }, { type: 'log', entry: entry(s, 0) });
    expect(s.credit).toBe(1);
    s = run(s, { type: 'log', entry: { ...entry(s, 1), sessionId: null } });
    expect(s.credit).toBe(1);
    s = run(s, { type: 'log', entry: entry(s, 1) }, { type: 'log', entry: entry(s, 2) });
    expect(s.credit).toBe(CAREER_CONFIG.home.sessionsPerWeek);
    expect(s.player!.attributes).toEqual(start().player!.attributes);
  });

  it('skipped sessions carry no penalty and no credit', () => {
    let s = start();
    const r = reduce(s, { type: 'log', entry: entry(s, 0, { completion: 'skipped' }) });
    expect(r.ok && r.message).toMatch(/no penalty/);
    s = run(s, { type: 'log', entry: entry(s, 0, { completion: 'skipped' }) });
    expect(s.credit).toBe(0);
  });

  it('substitution keeps the session and its single credit', () => {
    let s = run(emptySave(), { type: 'createPlayer', id: 'p1', name: 'Sam', position: 'MID' }, { type: 'setInput', input: { equipment: 'optional', space: 'medium', setting: 'outdoor', striking: false, minutes: 10 } }, { type: 'chooseFocus', focusId: 'dr-close-control' });
    const sid = s.plan!.sessions[0]!.id;
    const before = s.plan!.sessions[0]!.items[0]!.activityId;
    const alt = substitutes(s.plan!, sid, 0)[0]!.id;
    s = run(s, { type: 'substitute', sessionId: sid, index: 0, activityId: alt });
    expect(s.plan!.sessions[0]!.items[0]!.activityId).toBe(alt);
    expect(reduce(s, { type: 'log', entry: { ...entry(s, 0), activityId: before, contentVersion: 1 } }).ok).toBe(false);
    s = run(s, { type: 'log', entry: entry(s, 0) }, { type: 'log', entry: entry(s, 0) });
    expect(s.credit).toBe(1);
  });

  it('two distinct comfortable sessions suggest the next level; repeats and easier ones do not', () => {
    let s = start();
    s = run(s, { type: 'log', entry: entry(s, 0, { rating: 'comfortable' }) }, { type: 'log', entry: entry(s, 0, { rating: 'comfortable' }) });
    expect(levelSuggestion(s, 'firstTouch')).toBeNull();
    s = run(s, { type: 'log', entry: entry(s, 1, { rating: 'comfortable', easier: true }) });
    expect(levelSuggestion(s, 'firstTouch')).toBeNull();
    s = run(s, { type: 'log', entry: entry(s, 2, { rating: 'comfortable' }) });
    expect(levelSuggestion(s, 'firstTouch')).toBe(2);
    const attrs = s.player!.attributes;
    s = run(s, { type: 'acceptLevel', family: 'firstTouch' });
    expect(s.levels.firstTouch.level).toBe(2);
    expect(s.player!.attributes).toEqual(attrs);
  });

  it('weeks advance only by action (never by device clock) and old-week sessions are rejected', () => {
    let s = start();
    const old = entry(s, 0);
    s = run(s, { type: 'endWeek' });
    expect(s.week).toBe(2);
    expect(s.plan!.week).toBe(2);
    expect(s.credit).toBe(0);
    expect(reduce(s, { type: 'log', entry: old }).ok).toBe(false);
    expect(s.history[0]!.week).toBe(1);
  });

  it('game evidence, not home credit, changes attributes; evidence batches are idempotent and bounded', () => {
    let s = start();
    for (let i = 0; i < 3; i++) s = run(s, { type: 'log', entry: entry(s, i, { rating: 'comfortable' }) });
    let grown = run(s, { type: 'endWeek' });
    expect(grown.player!.attributes).toEqual(s.player!.attributes);
    const items = Array.from({ length: 8 }, (_, i) => ({ attribute: 'passing' as const, source: 'match' as const, situation: `z${i}`, success: 1 as const, note: '' }));
    s = run(s, { type: 'evidence', batchId: 'b1', items, missed: 0 }, { type: 'evidence', batchId: 'b1', items, missed: 0 });
    expect(s.evidence).toHaveLength(8);
    grown = run(s, { type: 'endWeek' });
    expect(grown.player!.attributes.passing).toBe(42);
    expect(grown.history.at(-1)!.outcomes.find((o) => o.attribute === 'passing')!.reason).toMatch(/\+2/);
    const many = Array.from({ length: 1000 }, (_, i) => ({ ...items[0]!, situation: `m${i}` }));
    s = run(s, { type: 'evidence', batchId: 'b2', items: many, missed: 0 });
    expect(s.evidence.length).toBe(CAREER_CONFIG.limits.evidencePerWeekMax);
  });

  it('names and notes are kept as bounded plain text', () => {
    expect(cleanName('<img src=x onerror=alert(1)>\u202eSam')).toBe('<img src=x onerror=alert(1)> Sam'.slice(0, CAREER_CONFIG.limits.nameMax));
    let s = start();
    s = run(s, { type: 'log', entry: entry(s, 0, { reflection: `<script>x</script>${'a'.repeat(500)}` }) });
    expect(s.journal[0]!.reflection.length).toBe(CAREER_CONFIG.limits.reflectionMax);
  });

  it('a focus that cannot be done in the space is refused with a reason', () => {
    const r = reduce(run(emptySave(), { type: 'createPlayer', id: 'p', name: 'A', position: 'FWD' }), { type: 'chooseFocus', focusId: 'fn-angles' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/can't be practised honestly/);
  });
});
