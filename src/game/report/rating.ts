import type { LedgerEvent } from './ledger';
import type { MatchStats } from './stats';

export const RATING_VERSION = 1;
/** Initial outfield weights; unavailable categories are dropped and the rest renormalised. */
export const RATING_WEIGHTS = { decision: 0.35, execution: 0.25, positioning: 0.25, defending: 0.15 } as const;
/** Fewer counted opportunities than this and a category is "not enough evidence", not a low score. */
export const MIN_OPPORTUNITIES = 3;

export type CategoryId = keyof typeof RATING_WEIGHTS;
export interface Category {
  readonly id: CategoryId;
  readonly label: string;
  /** 0–100, or null when unavailable. */
  readonly score: number | null;
  readonly opportunities: number;
  readonly why: string;
}
export interface MatchRating {
  readonly version: number;
  readonly overall: number | null;
  readonly confidence: 'low' | 'medium' | 'high' | 'none';
  readonly categories: readonly Category[];
}

const cat = (id: CategoryId, label: string, good: number, opp: number, what: string): Category =>
  opp < MIN_OPPORTUNITIES
    ? { id, label, score: null, opportunities: opp, why: opp === 0 ? `No ${what} this match.` : `Only ${opp} ${what} (need ${MIN_OPPORTUNITIES}).` }
    : { id, label, score: Math.round((100 * good) / opp), opportunities: opp, why: `${good} of ${opp} ${what} went well.` };

/**
 * Role-agnostic outfield rating from recorded events only. Decision quality reads the situation at the
 * moment of the pass (receiver open or covered), never whether it was completed. Positioning has no
 * trustworthy off-ball telemetry yet, so it is always unavailable.
 */
export function rateMatch(ev: readonly LedgerEvent[], s: MatchStats): MatchRating {
  const passes = ev.filter((e) => e.kind === 'pass');
  const decision = cat('decision', 'Decision quality', passes.filter((e) => e.open).length, passes.length, 'pass choices');
  const execGood = s.passes.num + s.shotsOnTarget.num + Math.max(0, s.possessions - s.possessionLosses);
  const execOpp = s.passes.den + s.shotsOnTarget.den + s.possessions;
  const execution = cat('execution', 'Technical execution', execGood, execOpp, 'passes, shots and possessions');
  const positioning: Category = { id: 'positioning', label: 'Positioning and support', score: null, opportunities: 0, why: 'Not measured yet: the game has no off-ball positioning evaluator.' };
  const defending = cat('defending', 'Transitions and defending', s.recoveries + s.slides.num, s.recoveries + s.slides.den + s.fouls, 'defensive actions');
  const categories = [decision, execution, positioning, defending];
  const avail = categories.filter((c) => c.score !== null);
  const w = avail.reduce((a, c) => a + RATING_WEIGHTS[c.id], 0);
  const overall = avail.length === 0 ? null : Math.round(avail.reduce((a, c) => a + RATING_WEIGHTS[c.id] * c.score!, 0) / w);
  const opp = avail.reduce((a, c) => a + c.opportunities, 0);
  const confidence = avail.length === 0 ? 'none' : avail.length >= 3 && opp >= 15 ? 'high' : opp >= 8 ? 'medium' : 'low';
  return { version: RATING_VERSION, overall, confidence, categories };
}
