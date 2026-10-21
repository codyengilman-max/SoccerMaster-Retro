/**
 * Story facts read from real records only (owner directive, 2026-10-20). Choices and intentions never
 * count as completed training, and missing records are never treated as proof of inactivity.
 */
import { CAREER_CONFIG } from '../career/config';
import type { CareerSave } from '../career/state';
import type { CompetitorId } from '../jungle/sim';

export type HomeLearningDetail = 'completed' | 'partial' | 'none' | 'unknown';
export type TrainingLogDetail = 'above' | 'below' | 'within' | 'unknown';

/** Last week's home learning, from its saved week review: planned sessions actually completed. */
export function homeLearningDetail(save: CareerSave): HomeLearningDetail {
  const h = save.history.find((r) => r.week === save.week - 1);
  if (!h) return 'unknown';
  if (h.sessionsCompleted >= CAREER_CONFIG.home.sessionsPerWeek) return 'completed';
  if (h.sessionsCompleted > 0) return 'partial';
  // Zero completions only counts as "not done" when a focus (an assignment) was actually set that week.
  return h.focusId !== null ? 'none' : 'unknown';
}

/** This week's training log against the plan: extra practice on top of the planned sessions is "above". */
export function trainingLogDetail(save: CareerSave): TrainingLogDetail {
  const planned = save.completedSessions.length;
  // Uncredited, not skipped: extra practice (including a repeat of a session that already counted).
  const extra = save.journal.filter((j) => j.week === save.week && !j.credited && j.completion !== 'skipped').length;
  if (planned === 0 && extra === 0) return 'unknown';
  if (planned < CAREER_CONFIG.home.sessionsPerWeek) return 'below';
  return extra > 0 ? 'above' : 'within';
}

/** Jungle Ball as a story result: the player's own score against Blake's, from the saved round. */
export function jungleResult(scores: Readonly<Record<CompetitorId, number>> | undefined): 'WIN' | 'DRAW' | 'LOSS' | null {
  if (!scores || !Number.isInteger(scores.player) || !Number.isInteger(scores.blake)) return null;
  return scores.player > scores.blake ? 'WIN' : scores.player < scores.blake ? 'LOSS' : 'DRAW';
}

/**
 * Week 4's school-activity +1/−1 "overall attribute point". The game has no overall rating and neither
 * minigame defines strong/poor bands, so the rule stays unconfigured (owner decision pending) and the
 * activity records 'unconfigured' with no attribute change.
 */
export const SCHOOL_REWARD_RULE: null = null;
export const schoolRewardDetail = (): 'unconfigured' => 'unconfigured';
