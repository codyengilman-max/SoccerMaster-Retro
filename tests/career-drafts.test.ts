import { describe, expect, it } from 'vitest';
import { activityById } from '../src/game/career/catalog';
import { CURRICULUM } from '../src/game/career/curriculum';
import { DRAFT_ACTIVITIES, DRAFT_STATUS, draftActivityId } from '../src/game/career/curriculum/drafts';
import { substitutes } from '../src/game/career/planner';
import { exportSave, parseImport } from '../src/game/career/saveio';
import { emptySave, reduce, type Action, type CareerSave, type JournalEntry } from '../src/game/career/state';
import { SKILL_FAMILIES } from '../src/game/career/types';

function run(save: CareerSave, ...actions: Action[]): CareerSave {
  for (const a of actions) {
    const r = reduce(save, a);
    if (!r.ok) throw new Error(r.error);
    save = r.save;
  }
  return save;
}
let n = 0;
const log = (activityId: string, sessionId: string | null): Omit<JournalEntry, 'credited' | 'week'> => ({
  id: `d${++n}`, sessionId, activityId, variantId: null, contentVersion: activityById(activityId)!.version,
  completion: 'done', rating: 'improving', foot: 'both', personalBest: null, reflection: '', easier: false,
});
const start = (focusId = 'dr-close-control') =>
  run(emptySave(), { type: 'createPlayer', id: 'p1', name: 'Sam', position: 'MID' }, { type: 'chooseFocus', focusId });

describe('training library v1.1 drafts in Home Training', () => {
  it('turns all 100 draft options into activities, each in an existing skill area and labelled honestly', () => {
    expect(CURRICULUM.ok).toBe(true);
    expect(DRAFT_ACTIVITIES).toHaveLength(100);
    for (const a of DRAFT_ACTIVITIES) {
      expect(SKILL_FAMILIES).toContain(a.skillFamilyId);
      expect(activityById(a.id)).toBe(a);
      expect(a.review.coaching).toBe('pending');
      expect(a.review.notes).toBe(DRAFT_STATUS);
    }
  });

  it('logging a draft as extra practice saves it with no credit and no attribute change', () => {
    const s0 = start();
    const s1 = run(s0, { type: 'log', entry: log(draftActivityId('BM01-L1'), null) });
    expect(s1.journal.at(-1)!.credited).toBe(false);
    expect(s1.credit).toBe(0);
    expect(s1.player!.attributes).toEqual(s0.player!.attributes);
  });

  it('a draft swapped into a scheduled session earns that session one credit, once', () => {
    let s = start();
    const ses = s.plan!.sessions[0]!;
    const alt = substitutes(s.plan!, ses.id, 0).find((a) => a.id.startsWith('v11-'));
    expect(alt).toBeDefined();
    s = run(s, { type: 'substitute', sessionId: ses.id, index: 0, activityId: alt!.id });
    s = run(s, { type: 'log', entry: log(alt!.id, ses.id) }, { type: 'log', entry: log(alt!.id, ses.id) });
    expect(s.credit).toBe(1);
    expect(s.journal.filter((j) => j.credited)).toHaveLength(1);
    const back = parseImport(exportSave(s));
    expect(back.ok && back.value.plan!.sessions[0]!.items[0]!.activityId).toBe(alt!.id);
    expect(back.ok && back.value.journal.at(-1)!.activityId).toBe(alt!.id);
  });
});
