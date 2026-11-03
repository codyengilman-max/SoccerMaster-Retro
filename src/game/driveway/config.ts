/**
 * Driveway Dribbling: every tunable number in one place (framework-free). See docs/training/DRIVEWAY.md.
 * World units are yards on the driveway: x across (0..WIDTH), y up the driveway (0 = the player's end).
 */
import { MATCH_TUNING } from '../match/tuning';
import type { AttributeId } from '../career/types';

export const DRIVEWAY_VERSION = 1;

export const DD_DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export type DdDifficulty = (typeof DD_DIFFICULTIES)[number];
export const DD_LABELS: Readonly<Record<DdDifficulty, string>> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', expert: 'Expert' };

export const MEDALS = ['completed', 'bronze', 'silver', 'gold'] as const;
export type Medal = (typeof MEDALS)[number];
export const MEDAL_LABELS: Readonly<Record<Medal, string>> = { completed: 'Completed', bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };

export const DRIVEWAY = {
  roundSeconds: 60,
  chances: 3,
  countdownSeconds: 3,
  width: 8,
  /** Objects appear this far up the driveway; the camera shows all of it. */
  spawnY: 20,
  /** The player's movement box (the lower part of the driveway). */
  player: { minX: 0.6, maxX: 7.4, minY: 1.2, maxY: 4.8, startX: 4, startY: 2.2, radius: 0.35, speed: 6.2, accel: 30 },
  /** A collision: one chance, combo reset, slowed for slowSeconds, then a protection interval. */
  hit: { slowSeconds: 0.6, slowFactor: 0.45, protectSeconds: 1.4 },
  /** Ball carried just ahead of the stronger foot; touches alternate feet at this cadence (s) while moving. */
  ball: { radius: 0.18, ahead: 0.45, touchSeconds: 0.32 },
  shot: { speed: 19, lifetime: 1.1, radius: 0.18, recoverySeconds: 0.6, rollInFrom: 2.4 },
  /** League double-tap SHOOT, same timings as matches (src/game/match/tuning.ts pad.quickShot). */
  quickShot: MATCH_TUNING.pad.quickShot,
  /** Validation: the player is assumed to react this late and to move at this share of top speed. */
  validate: { reactionSeconds: 0.45, speedShare: 0.75, margin: 0.15 },
  /** Lateral hazards are signalled at the edge this long before they cross the player's lane. */
  warnSeconds: 1.1,
  /** Scoring. A new multiplier applies from the event after the streak reaches it. */
  score: { dodge: 10, target: 20, x2At: 5, x3At: 10 },
};

export interface DifficultyTuning {
  /** Approach speed (yd/s) of objects coming down the driveway. */
  readonly approach: number;
  /** Seconds between rows; the first `easyStartSeconds` use `easyStartFactor` × this. */
  readonly rowGap: number;
  /** Narrowest free gap (yd, centre-line clearance) a row may leave. */
  readonly minGap: number;
  readonly maxSolids: number;
  readonly breakableChance: number;
  readonly crossingChance: number;
  readonly crossSpeed: number;
  /** Share of dodge development that goes to movement speed rather than control. */
  readonly speedShare: number;
}

export const DIFFICULTY: Readonly<Record<DdDifficulty, DifficultyTuning>> = {
  beginner: { approach: 4.6, rowGap: 1.7, minGap: 3.0, maxSolids: 1, breakableChance: 0.3, crossingChance: 0, crossSpeed: 0, speedShare: 0 },
  intermediate: { approach: 6.0, rowGap: 1.4, minGap: 2.5, maxSolids: 2, breakableChance: 0.35, crossingChance: 0.12, crossSpeed: 2.2, speedShare: 0.25 },
  advanced: { approach: 7.4, rowGap: 1.15, minGap: 2.1, maxSolids: 3, breakableChance: 0.4, crossingChance: 0.2, crossSpeed: 2.8, speedShare: 0.5 },
  expert: { approach: 8.6, rowGap: 0.95, minGap: 1.85, maxSolids: 3, breakableChance: 0.45, crossingChance: 0.3, crossSpeed: 3.4, speedShare: 0.75 },
};
export const EASY_START = { seconds: 8, factor: 1.4 } as const;

/**
 * Medal thresholds per difficulty (tuned from seeded DrivewayBot runs, 40 seeds per skill level; see docs/training/DRIVEWAY.md).
 * Silver needs `minSurvived` seconds and Gold the full round plus `goldAccuracy`, so early failure or
 * shot spam cannot qualify.
 */
export const THRESHOLDS: Readonly<Record<DdDifficulty, { readonly bronze: number; readonly silver: number; readonly gold: number }>> = {
  beginner: { bronze: 400, silver: 750, gold: 950 },
  intermediate: { bronze: 700, silver: 1350, gold: 1750 },
  advanced: { bronze: 900, silver: 1800, gold: 2400 },
  expert: { bronze: 1100, silver: 2300, gold: 3100 },
};
export const MEDAL_RULES = { silverMinSurvived: 40, goldAccuracy: 0.5 } as const;

/**
 * Attribute-development reward in integer quarter points (owner table, 2026-11): 1 = 0.25 development points.
 * These are final points: the progression multiplier is already inside them, so a week can never pay above the cap.
 */
export const REWARD_QUARTERS: Readonly<Record<DdDifficulty, Readonly<Record<Medal, number>>>> = {
  beginner: { completed: 1, bronze: 2, silver: 3, gold: 4 },
  intermediate: { completed: 2, bronze: 3, silver: 4, gold: 5 },
  advanced: { completed: 3, bronze: 4, silver: 5, gold: 6 },
  expert: { completed: 4, bronze: 5, silver: 6, gold: 8 },
};
/** Weekly maximum per player: 8 quarters = 2.00 development points, shared by every difficulty and replay. */
export const WEEKLY_CAP_QUARTERS = 8;
export const quartersToPoints = (q: number): number => q / 4;

/** Attributes this mini-game develops (canonical ids only). */
export const DD_ATTRIBUTES: readonly AttributeId[] = ['firstTouch', 'finishing', 'agility', 'pace'];
