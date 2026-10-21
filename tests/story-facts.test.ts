import { describe, expect, it } from 'vitest';
import { CAREER_CONFIG } from '../src/game/career/config';
import { emptySave, type CareerSave, type WeekReview } from '../src/game/career/state';
import { SCHOOL_REWARD_RULE, homeLearningDetail, jungleResult, schoolRewardDetail, trainingLogDetail } from '../src/game/story/facts';

const per = CAREER_CONFIG.home.sessionsPerWeek;
const review = (week: number, sessionsCompleted: number, focusId: string | null): WeekReview =>
  ({ week, focusId, sessionsCompleted, credit: 0, extraLogged: 0, ratings: { learning: 0, improving: 0, comfortable: 0 }, evidenceCount: 0, missedEvents: 0, outcomes: [], suggestedFocus: null });
const at = (patch: Partial<CareerSave>): CareerSave => ({ ...emptySave(), week: 3, ...patch });
const journal = (n: number, credited: boolean, week = 3) => Array.from({ length: n }, (_, i) => ({ week, credited, id: `j${credited}${i}` })) as unknown as CareerSave['journal'];

describe('story facts come only from saved records', () => {
  it('home learning reads last week\'s review; no review is unknown, never "not done"', () => {
    expect(homeLearningDetail(at({ history: [] }))).toBe('unknown');
    expect(homeLearningDetail(at({ history: [review(2, per, 'f')] }))).toBe('completed');
    expect(homeLearningDetail(at({ history: [review(2, 1, 'f')] }))).toBe('partial');
    expect(homeLearningDetail(at({ history: [review(2, 0, 'f')] }))).toBe('none');
    expect(homeLearningDetail(at({ history: [review(2, 0, null)] }))).toBe('unknown');
    expect(homeLearningDetail(at({ history: [review(1, per, 'f')] }))).toBe('unknown');
  });
  it('the training log: extra practice on top of the plan is above, fewer planned sessions is below, no log is unknown', () => {
    const done = Array.from({ length: per }, (_, i) => `s${i}`);
    expect(trainingLogDetail(at({ completedSessions: [], journal: [] }))).toBe('unknown');
    expect(trainingLogDetail(at({ completedSessions: done, journal: journal(per, true) }))).toBe('within');
    expect(trainingLogDetail(at({ completedSessions: done, journal: [...journal(per, true), ...journal(2, false)] }))).toBe('above');
    expect(trainingLogDetail(at({ completedSessions: done.slice(0, 1), journal: journal(1, true) }))).toBe('below');
    // last week's extra practice does not count this week
    expect(trainingLogDetail(at({ completedSessions: done, journal: journal(2, false, 2) }))).toBe('within');
  });
  it('Jungle Ball result is the player against Blake from the saved scores; malformed scores give no result', () => {
    expect(jungleResult({ player: 3, alex: 9, blake: 2, sam: 0 })).toBe('WIN');
    expect(jungleResult({ player: 2, alex: 0, blake: 2, sam: 5 })).toBe('DRAW');
    expect(jungleResult({ player: 1, alex: 0, blake: 4, sam: 0 })).toBe('LOSS');
    expect(jungleResult(undefined)).toBeNull();
    expect(jungleResult({ player: 1.5, alex: 0, blake: 1, sam: 0 })).toBeNull();
  });
  it('the week 4 school-activity attribute change stays unconfigured until the owner defines it', () => {
    expect(SCHOOL_REWARD_RULE).toBeNull();
    expect(schoolRewardDetail()).toBe('unconfigured');
  });
});
