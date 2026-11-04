/**
 * Driveway Dribbling save records and the result reducer core (framework-free, pure).
 * One weekly ledger row per season week: completion, the week's best reward (quarters) and what it paid.
 */
import { DD_DIFFICULTIES, MEDALS, WEEKLY_CAP_QUARTERS, DRIVEWAY, type DdDifficulty, type Medal } from './config';
import { allocateQuarters, attemptQuarters, sumQuarters, weeklyPayout, type QuarterAlloc } from './reward';
import { medalFor } from './sim';
import type { AttributeId } from '../career/types';

export interface DrivewayBest { readonly difficulty: DdDifficulty; readonly score: number; readonly medal: Medal }
export interface DrivewayWeek {
  readonly week: number;
  /** Best reward any finished attempt this week qualified for (quarters, 0..8, shared by all difficulties). */
  readonly bestQuarters: number;
  /** Quarters paid per attribute (sums to bestQuarters). */
  readonly awarded: QuarterAlloc;
  /** Attribute points that actually converted after the Season 1 ceiling (may be below awarded/4). */
  readonly applied: Partial<Record<AttributeId, number>>;
  readonly bestScore: number;
  readonly bestMedal: Medal;
  readonly bestDifficulty: DdDifficulty;
  readonly attempts: number;
}
export interface DrivewaySave {
  /** Difficulties unlocked, 1 (Beginner) .. 4 (Expert). Kept across weeks. */
  readonly unlocked: number;
  readonly best: readonly DrivewayBest[];
  readonly weeks: readonly DrivewayWeek[];
  /** Recently saved round ids, so a duplicate submission never counts twice. */
  readonly runs: readonly string[];
  /** First season week the weekly requirement applies (new careers 1; older saves: the week they were loaded in). */
  readonly activeFrom: number;
}
export const DD_RUNS_KEPT = 60;
export const DD_WEEKS_KEPT = 120;
export const emptyDriveway = (activeFrom = 1): DrivewaySave => ({ unlocked: 1, best: [], weeks: [], runs: [], activeFrom });

export interface DrivewaySubmission {
  readonly runId: string;
  /** Season week the round started in; a round that outlives its week is not credited to the next one. */
  readonly week: number;
  readonly difficulty: DdDifficulty;
  readonly seed: number;
  readonly reason: 'time' | 'chances';
  readonly score: number;
  readonly dodges: number;
  readonly targets: number;
  readonly shots: number;
  readonly bestCombo: number;
  readonly survived: number;
  readonly collisions: number;
}

/** Whether `week` still needs a finished Driveway Dribbling round before it can close. */
export function drivewayDue(d: DrivewaySave, week: number): boolean {
  return week >= d.activeFrom && !d.weeks.some((w) => w.week === week);
}
export const drivewayWeek = (d: DrivewaySave, week: number): DrivewayWeek | undefined => d.weeks.find((w) => w.week === week);
export const isUnlocked = (d: DrivewaySave, diff: DdDifficulty): boolean => DD_DIFFICULTIES.indexOf(diff) < d.unlocked;

const intIn = (v: number, lo: number, hi: number) => Number.isSafeInteger(v) && v >= lo && v <= hi;

/** Rejects anything a real round could not produce; the medal is always recomputed, never trusted. */
export function submissionError(s: DrivewaySubmission): string | null {
  if (typeof s.runId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(s.runId)) return 'Bad round id.';
  if (!intIn(s.week, 1, 100000)) return 'Bad round week.';
  if (!DD_DIFFICULTIES.includes(s.difficulty)) return 'Unknown difficulty.';
  if (s.reason !== 'time' && s.reason !== 'chances') return 'A round only counts when the timer ends or all chances are used.';
  if (!intIn(s.seed, 0, 0xffffffff) || !intIn(s.dodges, 0, 2000) || !intIn(s.targets, 0, 2000) || !intIn(s.shots, 0, 2000) || !intIn(s.bestCombo, 0, 4000) || !intIn(s.collisions, 0, DRIVEWAY.chances)) return 'Round result out of range.';
  if (!Number.isFinite(s.survived) || s.survived < 0 || s.survived > DRIVEWAY.roundSeconds) return 'Round time out of range.';
  if (s.reason === 'time' && s.survived < DRIVEWAY.roundSeconds - 0.05) return 'The timer had not finished.';
  if (s.reason === 'chances' && s.collisions !== DRIVEWAY.chances) return 'Chances were not all used.';
  if (s.reason === 'time' && s.collisions >= DRIVEWAY.chances) return 'Round result out of range.';
  if (s.targets > s.shots || s.bestCombo > s.dodges + s.targets) return 'Round result out of range.';
  // Each event is worth at most the x3 target value.
  if (!intIn(s.score, 0, (s.dodges * DRIVEWAY.score.dodge + s.targets * DRIVEWAY.score.target) * 3)) return 'Score out of range.';
  if (s.score < s.dodges * DRIVEWAY.score.dodge + s.targets * DRIVEWAY.score.target) return 'Score out of range.';
  return null;
}

export interface DrivewayOutcome {
  readonly driveway: DrivewaySave;
  readonly medal: Medal;
  /** Quarters this attempt qualified for and quarters newly paid after the weekly ledger. */
  readonly earned: number;
  readonly paid: number;
  readonly alloc: QuarterAlloc;
  readonly personalBest: boolean;
  readonly unlockedNext: DdDifficulty | null;
}

/** Applies one finished round to the Driveway record (attribute conversion is done by the caller with `alloc`). */
export function recordRound(d: DrivewaySave, week: number, s: DrivewaySubmission, applied: Partial<Record<AttributeId, number>>): DrivewayOutcome {
  const accuracy = s.shots ? s.targets / s.shots : 0;
  const medal = medalFor(s.difficulty, { score: s.score, survived: s.survived, accuracy, reason: s.reason });
  const prev = drivewayWeek(d, week);
  const earned = attemptQuarters(s.difficulty, medal);
  const { pay, best } = weeklyPayout(prev?.bestQuarters ?? 0, earned);
  const alloc = allocateQuarters(pay, s.difficulty, s);
  const merged: Record<string, number> = { ...(prev?.awarded ?? {}) };
  for (const [k, v] of Object.entries(alloc)) merged[k] = (merged[k] ?? 0) + (v ?? 0);
  const appliedAll: Record<string, number> = { ...(prev?.applied ?? {}) };
  for (const [k, v] of Object.entries(applied)) if ((v ?? 0) > 0) appliedAll[k] = (appliedAll[k] ?? 0) + (v ?? 0);
  const better = !prev || s.score > prev.bestScore;
  const row: DrivewayWeek = {
    week,
    bestQuarters: best,
    awarded: merged,
    applied: appliedAll,
    bestScore: better ? s.score : prev!.bestScore,
    bestMedal: !prev || MEDALS.indexOf(medal) > MEDALS.indexOf(prev.bestMedal) ? medal : prev.bestMedal,
    bestDifficulty: better ? s.difficulty : prev!.bestDifficulty,
    attempts: (prev?.attempts ?? 0) + 1,
  };
  const pb = d.best.find((b) => b.difficulty === s.difficulty);
  const personalBest = !pb || s.score > pb.score;
  const bestRow: DrivewayBest = { difficulty: s.difficulty, score: Math.max(pb?.score ?? 0, s.score), medal: !pb || MEDALS.indexOf(medal) > MEDALS.indexOf(pb.medal) ? medal : pb.medal };
  const idx = DD_DIFFICULTIES.indexOf(s.difficulty);
  const unlocks = idx === d.unlocked - 1 && (medal === 'silver' || medal === 'gold') && d.unlocked < DD_DIFFICULTIES.length;
  return {
    driveway: {
      ...d,
      unlocked: unlocks ? d.unlocked + 1 : d.unlocked,
      best: [...d.best.filter((b) => b.difficulty !== s.difficulty), bestRow],
      weeks: [...d.weeks.filter((w) => w.week !== week), row].sort((a, b) => a.week - b.week).slice(-DD_WEEKS_KEPT),
      runs: [...d.runs, s.runId].slice(-DD_RUNS_KEPT),
    },
    medal,
    earned,
    paid: pay,
    alloc,
    personalBest,
    unlockedNext: unlocks ? DD_DIFFICULTIES[idx + 1]! : null,
  };
}

export const ledgerConsistent = (w: DrivewayWeek): boolean => sumQuarters(w.awarded) === w.bestQuarters && w.bestQuarters <= WEEKLY_CAP_QUARTERS;
