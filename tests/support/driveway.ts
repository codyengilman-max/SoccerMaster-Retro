import { reduce, type CareerSave } from '../../src/game/career/state';
import type { DrivewaySubmission } from '../../src/game/driveway/save';

/** The weakest finished round a player can play: Beginner, all three chances lost, no score. */
export const plainRound = (week: number, runId = `test-w${week}`): DrivewaySubmission => ({
  runId, difficulty: 'beginner', seed: 1, reason: 'chances', score: 0, dodges: 0, targets: 0, shots: 0, bestCombo: 0, survived: 4, collisions: 3,
});

/** Plays this week's required Driveway Dribbling round (tests about other systems that close weeks). */
export function dd(save: CareerSave): CareerSave {
  if (!save.player) return save;
  const r = reduce(save, { type: 'drivewayResult', result: plainRound(save.week) });
  if (!r.ok) throw new Error(r.error);
  return r.save;
}
