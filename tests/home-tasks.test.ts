import { describe, expect, it } from 'vitest';
import { CORE_ACTIVITIES, JUGGLING_LADDER } from '../src/game/career/catalog';
import { emptySave, type CareerSave, type JournalEntry } from '../src/game/career/state';
import { homeTasks, weekAssignments } from '../src/game/story/facts';

const jug = JUGGLING_LADDER[0]!.id;
const fam = (f: string) => CORE_ACTIVITIES.find((a) => a.skillFamilyId === f)!.id;
let n = 0;
const entry = (activityId: string): JournalEntry =>
  ({ id: `j${++n}`, week: 5, sessionId: null, activityId, variantId: null, contentVersion: 1, completion: 'done', rating: null, foot: null, personalBest: null, reflection: '', easier: false, credited: false }) as JournalEntry;
const save = (journal: JournalEntry[], extra: Partial<CareerSave> = {}): CareerSave => ({ ...emptySave(), week: 5, journal, ...extra }) as CareerSave;

describe('home tasks: the story home menu and Home Training list the same required work', () => {
  it('week 5 lists juggling and first touch, ticked from logged extra practice', () => {
    expect(homeTasks(weekAssignments(save([]), 5)).map((t) => [t.key, t.done])).toEqual([['juggling', false], ['firstTouch', false]]);
    const done = weekAssignments(save([entry(jug), entry(fam('firstTouch'))]), 5);
    expect(homeTasks(done).every((t) => t.done)).toBe(true);
    expect(done.complete).toBe(true);
  });
  it('required home training starts in week 2: juggling and first touch, no home-sessions task yet', () => {
    for (const wk of [2, 3, 4]) expect(homeTasks(weekAssignments(save([]), wk)).map((t) => t.key)).toEqual(['juggling', 'firstTouch']);
  });
  it('week 6 adds home sessions; week 7 swaps first touch for passing', () => {
    expect(homeTasks(weekAssignments(save([]), 6)).map((t) => t.key)).toEqual(['juggling', 'firstTouch', 'learning']);
    expect(homeTasks(weekAssignments(save([]), 7)).map((t) => t.key)).toEqual(['juggling', 'passing', 'learning']);
  });
  it('every task matches a Training Library family, so its button opens a non-empty list', () => {
    for (const wk of [5, 6, 7])
      for (const t of homeTasks(weekAssignments(save([]), wk)))
        if (t.key !== 'learning') expect([...JUGGLING_LADDER, ...CORE_ACTIVITIES].some((a) => a.skillFamilyId === t.key)).toBe(true);
  });
});
