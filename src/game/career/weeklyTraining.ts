/** This week's All36 Team Training status, read from the save only (framework-free). */
import { weeklyAssignment, type WeeklyAssignment } from '../training12/all36/weekly';
import type { All36Run, CareerSave, TeamTrainingRecord } from './state';

export interface WeeklyProgress {
  readonly assignment: WeeklyAssignment | null;
  /** At least one run of this week's scenario is saved. */
  readonly completed: boolean;
  /** This week's credit was paid by a weekly All36 run. */
  readonly credited: boolean;
  /** The week was already counted by an older Team Training route, so weekly runs are practice. */
  readonly countedElsewhere: boolean;
  readonly best: All36Run | null;
  readonly runs: number;
  readonly record: TeamTrainingRecord | null;
}

const rank = (r: All36Run): number => (r.band === 'no-decision' ? -1 : r.score);

export function weeklyProgress(save: CareerSave): WeeklyProgress {
  const p = save.player;
  const assignment = p ? weeklyAssignment(save.week, p.position) : null;
  // Only runs of the current assignment count toward this week's status (a changed position never borrows them).
  const runs = assignment ? save.all36.filter((r) => r.week === save.week && r.category === assignment.category && r.situationId === assignment.situationId) : [];
  const best = runs.reduce<All36Run | null>((b, r) => (!b || rank(r) > rank(b) ? r : b), null);
  const credited = save.all36.some((r) => r.week === save.week && r.credited);
  const record = save.teamTraining.find((r) => r.week === save.week) ?? null;
  return { assignment, completed: runs.length > 0, credited, countedElsewhere: !!record && !credited, best, runs: runs.length, record };
}

/** The story's Team Training step: what it says and that it can always be skipped (training is optional). */
export function teamTrainingHandoff(save: CareerSave | null): { readonly body: string; readonly playable: boolean; readonly skipLabel: string } {
  const week = save?.week ?? 1;
  const p = save ? weeklyProgress(save) : null;
  const a = p?.assignment ?? null;
  if (!a) return { body: `This week's Team Training (career week ${week}) has no approved scenario for your position, so nothing can be played or counted.`, playable: false, skipLabel: 'Continue story · not counted' };
  return {
    body: `This week's Team Training (career week ${week}): one coach-approved scenario, ${a.topic}, as ${a.role}. Finishing it once counts the week, whatever your answer. It's optional: the story goes on either way.`,
    playable: true,
    skipLabel: 'Not this week',
  };
}
