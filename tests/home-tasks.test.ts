import { describe, expect, it } from 'vitest';
import { ALL_ACTIVITIES, CORE_ACTIVITIES, JUGGLING_LADDER } from '../src/game/career/catalog';
import { HOME_SECTIONS, sectionOf } from '../src/game/career/ballMastery';
import { CAREER_CONFIG } from '../src/game/career/config';
import { DRAFT_ACTIVITIES } from '../src/game/career/curriculum/drafts';
import { DESIGN_ACTIVITIES } from '../src/game/career/ballMastery';
import { emptySave, reduce, type CareerSave, type JournalEntry } from '../src/game/career/state';
import { homeBoard, homeTasks, weekAssignments, weekCompetition } from '../src/game/story/facts';

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

describe('Home Training consolidation: two sections, migration and home learning without the focus plan', () => {
  const per = CAREER_CONFIG.home.sessionsPerWeek;
  const skipped = (activityId: string): JournalEntry => ({ ...entry(activityId), completion: 'skipped' }) as JournalEntry;
  const lastWeek = (activityId: string): JournalEntry => ({ ...entry(activityId), week: 4 }) as JournalEntry;
  const learning = (s: CareerSave) => homeTasks(weekAssignments(s, 6)).find((t) => t.key === 'learning')!;

  it('every existing home activity sits in exactly one of the two sections, ids unchanged', () => {
    const all = [...ALL_ACTIVITIES, ...DRAFT_ACTIVITIES, ...DESIGN_ACTIVITIES];
    expect(new Set(all.map((a) => a.id)).size).toBe(all.length);
    for (const a of all) expect(['juggling', 'ballMastery'], a.id).toContain(sectionOf(a));
    expect(ALL_ACTIVITIES.filter((a) => sectionOf(a) === 'juggling').map((a) => a.id)).toEqual(JUGGLING_LADDER.map((a) => a.id));
    expect(ALL_ACTIVITIES.filter((a) => sectionOf(a) === 'ballMastery')).toHaveLength(ALL_ACTIVITIES.length - JUGGLING_LADDER.length);
    expect(Object.keys(HOME_SECTIONS)).toEqual(['juggling', 'ballMastery']);
  });
  it('a new player has nothing ticked; Home learning needs real logs this week', () => {
    expect(learning(save([])).done).toBe(false);
    expect(learning(save([entry(jug), entry(fam('firstTouch'))])).done).toBe(false);
    expect(learning(save([entry(jug), entry(fam('firstTouch')), skipped(fam('passing')), lastWeek(fam('passing'))])).done).toBe(false);
    const three = save([entry(jug), entry(fam('firstTouch')), entry(fam('dribbling'))]);
    expect(learning(three)).toMatchObject({ done: true, label: `Home learning (log ${per} practices this week, ${per} of ${per})` });
    expect(weekAssignments(three, 6).complete).toBe(true);
  });
  it('an existing save that finished its planned sessions keeps Home learning done; nothing is reset', () => {
    const old = save([], { focusId: 'ft-1', completedSessions: ['w5-s1', 'w5-s2', 'w5-s3'], credit: per });
    expect(learning(old).done).toBe(true);
    expect(old).toMatchObject({ focusId: 'ft-1', credit: per, completedSessions: ['w5-s1', 'w5-s2', 'w5-s3'] });
    // Partly done plans are not completed for the player.
    expect(learning(save([], { completedSessions: ['w5-s1'] })).done).toBe(false);
  });
  it('logging practice outside a plan adds journal entries only: no credit, no attributes, no duplicate on retry', () => {
    const step = (from: CareerSave, action: Parameters<typeof reduce>[1]): CareerSave => {
      const o = reduce(from, action);
      if (!o.ok) throw new Error(o.error);
      return o.save;
    };
    let s: CareerSave = { ...emptySave(), week: 5 };
    s = step(s, { type: 'createPlayer', id: 'p', name: 'Robin', position: 'MID', gender: 'girl' });
    const attrs = { ...s.player!.attributes };
    const ids = [jug, fam('firstTouch'), fam('dribbling')];
    for (const [i, id] of ids.entries()) {
      const a = ALL_ACTIVITIES.find((x) => x.id === id)!;
      const e = { id: `log${i}`, sessionId: null, activityId: id, variantId: null, contentVersion: a.version, completion: 'done' as const, rating: null, foot: null, personalBest: null, reflection: '', easier: false };
      s = step(s, { type: 'log', entry: e });
      s = step(s, { type: 'log', entry: e }); // same log twice
    }
    expect(s.journal).toHaveLength(3);
    expect(s.credit).toBe(0);
    expect(s.completedSessions).toEqual([]);
    expect(s.player!.attributes).toEqual(attrs);
    expect(learning(s).done).toBe(true);
  });
});

describe('guided curricula: the old skill task cannot block the story', () => {
  it('the assigned Ball Mastery lesson meets the week 5 first-touch and week 7 passing task', async () => {
    const { trackStatus } = await import('../src/game/career/homeCurriculum');
    const id = trackStatus('ballMastery', { journal: [], homeLogs: [] }).current!.lesson.id;
    for (const wk of [5, 7]) expect(weekAssignments(save([entry(jug), entry(id)]), wk).skillDone).toBe(true);
  });
  it('a skipped, last-week or juggling log never meets it, and nothing is ticked without a log', () => {
    const d = fam('dribbling');
    expect(weekAssignments(save([]), 5).skillDone).toBe(false);
    expect(weekAssignments(save([{ ...entry(d), completion: 'skipped' } as JournalEntry]), 5).skillDone).toBe(false);
    expect(weekAssignments(save([{ ...entry(d), week: 4 } as JournalEntry]), 5).skillDone).toBe(false);
    expect(weekAssignments(save([entry(jug)]), 5).skillDone).toBe(false);
  });
});

describe('weekly home screen: next step, competition, player and team in one place', () => {
  it('names the next required task first and the week\'s competition from the calendar', () => {
    const tasks = homeTasks(weekAssignments(save([entry(jug)]), 5));
    const text = homeBoard({ week: 5, tasks, season: 'THIS SEASON\nLeague: 2nd of 10 · 6 pts (W2 D0 L0)\nNext league game: Dell', competition: weekCompetition(5), overall: 51.25 });
    const lines = text.split('\n');
    expect(lines[0]).toBe('WEEK 5 · HOME');
    expect(lines[1]).toBe('NEXT: Control and first-touch work');
    expect(text).toContain('HOME TRAINING: ✓ Juggling · ○ First touch');
    expect(text).toContain('THIS WEEK: League game 3 of 12 this week');
    expect(text).toContain('MY PLAYER: overall 51.3 (Season 1 maximum 64)');
    expect(text).toContain('TEAM: League: 2nd of 10');
    expect(text).not.toContain('THIS SEASON');
  });
  it('tournament week says the tournament, never league points', () => {
    expect(weekCompetition(9)).toMatch(/^AZ Showcase tournament this week \(league points unchanged\)$/);
  });
  it('a finished week points at Continue Week', () => {
    const tasks = homeTasks({ juggling: true, skill: 'firstTouch', skillDone: true, learning: null, practices: 2, complete: true });
    expect(homeBoard({ week: 5, tasks, season: '', competition: 'x', overall: null }).split('\n')[1]).toBe('NEXT: home training done. Tap Continue Week.');
  });
  it('compact board (short landscape) keeps every part in four lines', () => {
    const text = homeBoard({ week: 6, tasks: homeTasks(weekAssignments(save([]), 6)), season: 'THIS SEASON\nLeague: 8th of 9 · 1 pts (W0 D1 L0)\nNational #612 of 1000 · Arizona #67 of 120\nNext: Batavia vs Scottsdale', competition: weekCompetition(6), overall: 50.5, compact: true });
    const lines = text.split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe('WEEK 6 · NEXT: Juggling task');
    expect(lines[1]).toContain('○ Home learning');
    expect(lines[2]).toBe('THIS WEEK: League game 4 of 12 this week · MY PLAYER: 50.5 of 64 max');
    expect(lines[3]).toContain('National #612');
    expect(lines[3]).not.toContain('Scottsdale');
  });
});
