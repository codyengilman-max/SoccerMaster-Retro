import type { AttributeId } from './types';

/**
 * Every M6 progression number in one place. Defaults are a first pass; see docs/TRAINING.md for
 * worked examples. Nothing here was balanced against real play yet.
 */
export const CAREER_CONFIG = {
  attributes: {
    /** Progression v2: attributes live on 0–100 with full precision (rounded only for display). */
    min: 0,
    max: 100,
    /** New-career value for every attribute (overall 50). */
    start: 50,
    /** Legacy per-attribute ceiling kept in saves; progression v2 uses the Season 1 overall maximum instead. */
    potential: 100,
  },
  home: {
    /** Scheduled sessions that can earn participation credit in one career week. */
    sessionsPerWeek: 3,
    creditPerSession: 1,
    minutesDefault: 10,
    minutesMin: 6,
    minutesMax: 20,
    /** Distinct scheduled sessions rated comfortable before the next level is suggested. */
    comfortableSessionsForSuggestion: 2,
  },
  growth: {
    /** Max points one attribute can gain in a week. */
    weeklyCapPerAttribute: 2,
    /** Max points across all attributes in a week. */
    weeklyCapTotal: 4,
    /** Weighted opportunities needed before any growth (fewer = "not enough opportunities"). */
    minOpportunities: 4,
    /** Weighted success rate needed. */
    minSuccessRate: 0.55,
    /** Weighted successes per growth point. */
    successesPerPoint: 3,
    /** k-th repeat of an equivalent situation counts repeatDecay^(k-1), never below repeatFloor. */
    repeatDecay: 0.5,
    repeatFloor: 0.125,
    /** Coach answers can supply at most this share of awareness successes ... */
    coachMaxShare: 0.5,
    /** ... and coach answers alone can never give more than this per week. */
    coachOnlyMaxGrowth: 1,
  },
  limits: {
    nameMax: 24,
    reflectionMax: 200,
    journalMax: 600,
    historyMax: 52,
    evidencePerWeekMax: 400,
    batchesPerWeekMax: 40,
    personalBestMax: 9999,
    importBytesMax: 400_000,
    weekMax: 9999,
  },
} as const;

export type CareerConfig = typeof CAREER_CONFIG;
export type GrowthConfig = { -readonly [K in keyof CareerConfig['growth']]: number };

/** What each attribute changes in play (bounded 0.8–1.2x around a 50 rating; docs/PROGRESSION.md). */
export const ATTRIBUTE_EFFECT: Readonly<Record<AttributeId, string>> = {
  firstTouch: 'In matches: how cleanly you control a pass when it arrives (once per reception).',
  passing: 'In matches: pass speed and delivery accuracy.',
  dribbling: 'In matches: carry speed with the ball between touches. It never changes the first touch.',
  finishing: 'In matches: shot placement for normal and quick shots. A goal is never guaranteed.',
  defending: 'In matches: standing-tackle execution. Tackle reach never grows.',
  awareness: 'In matches: how quickly teammates you are not controlling move back into team shape.',
  composure: 'In matches: how much a nearby opponent adds to shot and first-touch error.',
  strength: 'In matches: holding the ball when tackled. Possession is never guaranteed.',
  agility: 'In matches: acceleration and turning responsiveness.',
  pace: 'In matches: top running speed. There is no sprint button.',
};

export const ATTRIBUTE_EVIDENCE: Readonly<Record<AttributeId, string>> = {
  firstTouch: 'Receiving a pass in the sandbox and keeping the ball (no loss or deflection straight after).',
  passing: 'Your passes reaching a teammate.',
  dribbling: 'Carrying spells you start with a swipe or feint that end in a pass or shot, not a lost ball.',
  finishing: 'Shot choice (close enough, a sensible angle) and placement away from the keeper. Goals add nothing extra.',
  defending: 'Duels near the opponent carrier that end with your team winning the ball back.',
  awareness: 'Passing to an open teammate, and Coach Moment answers (capped).',
  composure: 'Passing, shooting and receiving cleanly while an opponent is close.',
  strength: 'Keeping or winning the ball in contested duels without a foul.',
  agility: 'Turning and changing pace with the ball and in recovery runs.',
  pace: 'Running in matches and training: carries, runs behind and recovery sprints.',
};
