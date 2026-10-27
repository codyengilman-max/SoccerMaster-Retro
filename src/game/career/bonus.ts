/**
 * Bonus Attribute Points (owner spec 2026-10-27). Framework-free and pure.
 * Each achievement pays one spendable point, once per key: a match id, a story week, or a pair of Team Training weeks.
 * Rewards only come from events the reducer records after this feature exists; nothing is inferred from history.
 */
import type { SavedReport } from '../report/report';
import { DEFENSE_UNITS } from '../report/assists';
import { ATTRIBUTES, type AttributeId } from './types';

export type AchievementId = 'hatTrick' | 'playmaker' | 'ballWinner' | 'cloudyChampion' | 'trainingPerfection';

export const ACHIEVEMENTS: Readonly<Record<AchievementId, { readonly title: string; readonly rule: string }>> = {
  hatTrick: { title: 'Hat Trick', rule: 'Score 3 goals in one official match.' },
  playmaker: { title: 'Playmaker', rule: 'Record 3 assists in one official match.' },
  ballWinner: { title: 'Ball Winner', rule: 'Earn 10 defensive points in one official match (slide tackle 1, standing tackle 0.5, interception 1.5).' },
  cloudyChampion: { title: 'Cloudy Champion', rule: "Earn 3 stars in Cloudy's Feeding Frenzy (once per story week)." },
  trainingPerfection: { title: 'Training Perfection', rule: 'Best answer on your first try in two weekly Team Training scenarios in a row.' },
};

export const BONUS_RULES = { hatTrickGoals: 3, playmakerAssists: 3, ballWinnerUnits: DEFENSE_UNITS.threshold, cloudyStars: 3, awardsKept: 400 } as const;

/** Attributes a point can raise: the six permanent player attributes (no energy, form, overall or currency). */
export const SPENDABLE: readonly AttributeId[] = ATTRIBUTES;

export interface BonusSpend {
  readonly id: string;
  readonly attribute: AttributeId;
  readonly week: number;
}

export interface BonusBank {
  /** Award keys paid so far, e.g. "hatTrick:S1-L3", "cloudyChampion:w5", "trainingPerfection:w3-w4". */
  readonly awards: readonly string[];
  readonly spends: readonly BonusSpend[];
  /** Weeks whose first graded Team Training answer was the best answer, recorded as they happen. */
  readonly perfectWeeks: readonly number[];
  /** Last week used in a Training Perfection pair (pairs never overlap). */
  readonly pairedThrough: number;
}

export const emptyBank = (): BonusBank => ({ awards: [], spends: [], perfectWeeks: [], pairedThrough: 0 });
export const balance = (b: BonusBank): number => b.awards.length - b.spends.length;
export const achievementOf = (key: string): AchievementId | null => {
  const id = key.split(':')[0] as AchievementId;
  return id in ACHIEVEMENTS ? id : null;
};

/** Match achievements from the saved, finalized report only. Friendlies are not official. */
export function matchAwardKeys(r: SavedReport): string[] {
  if (r.competition === 'Friendly') return [];
  const out: string[] = [];
  if (r.stats.goals >= BONUS_RULES.hatTrickGoals) out.push(`hatTrick:${r.matchId}`);
  const c = r.contribution;
  if (c && c.mine.assists >= BONUS_RULES.playmakerAssists) out.push(`playmaker:${r.matchId}`);
  if (c && c.mine.defenseUnits >= BONUS_RULES.ballWinnerUnits) out.push(`ballWinner:${r.matchId}`);
  return out;
}

/** Pays each key not already paid. Returns the new bank and the keys actually paid. */
export function grant(b: BonusBank, keys: readonly string[]): { bank: BonusBank; paid: string[] } {
  const paid = keys.filter((k, i) => !b.awards.includes(k) && keys.indexOf(k) === i);
  if (!paid.length) return { bank: b, paid };
  if (b.awards.length + paid.length > BONUS_RULES.awardsKept) return { bank: b, paid: [] };
  return { bank: { ...b, awards: [...b.awards, ...paid] }, paid };
}

/**
 * A credited (first) weekly Team Training result. A perfect week next to an unpaired perfect previous week pays one
 * point and consumes both weeks: 2 in a row pay 1, 3 pay 1, 4 pay 2. Every week of the season has a scheduled
 * scenario, so a skipped or imperfect week leaves a gap and breaks the run.
 */
export function teamTrainingResult(b: BonusBank, week: number, perfect: boolean): { bank: BonusBank; paid: string[] } {
  if (!perfect || b.perfectWeeks.includes(week)) return { bank: b, paid: [] };
  const next: BonusBank = { ...b, perfectWeeks: [...b.perfectWeeks, week].slice(-60) };
  if (!b.perfectWeeks.includes(week - 1) || b.pairedThrough >= week - 1) return { bank: next, paid: [] };
  const g = grant({ ...next, pairedThrough: week }, [`trainingPerfection:w${week - 1}-w${week}`]);
  return g.paid.length ? g : { bank: next, paid: [] };
}

export const awardTitle = (key: string): string => ACHIEVEMENTS[achievementOf(key) ?? 'hatTrick'].title;
