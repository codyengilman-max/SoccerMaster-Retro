import type { AttributeId } from './types';

/**
 * Every M6 progression number in one place. Defaults are a first pass; see docs/TRAINING.md for
 * worked examples. Nothing here was balanced against real play yet.
 */
export const CAREER_CONFIG = {
  attributes: {
    min: 1,
    max: 99,
    start: 40,
    /** Default ceiling for a new player; growth never passes it. */
    potential: 70,
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

export const ATTRIBUTE_EVIDENCE: Readonly<Record<AttributeId, string>> = {
  firstTouch: 'Receiving a pass in the sandbox and keeping the ball (no loss or deflection straight after).',
  passing: 'Your passes reaching a teammate.',
  dribbling: 'Carrying spells you start with a swipe or feint that end in a pass or shot, not a lost ball.',
  finishing: 'Shot choice (close enough, a sensible angle) and placement away from the keeper. Goals add nothing extra.',
  defending: 'Duels near the opponent carrier that end with your team winning the ball back.',
  awareness: 'Passing to an open teammate, and Coach Moment answers (capped).',
};
