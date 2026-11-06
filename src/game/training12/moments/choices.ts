/**
 * Choice revisions (owner decision 2026-11, round 3): neutral candidate wording shown beside the package originals.
 * Grades are never changed here; the package label and grade stay authoritative until the owner approves a revision.
 */
import type { ChoiceId } from '../all36/types';
import type { MomentScene } from './schema';

export const CHOICES_SCHEMA = 'tactical-moments-choices.v1';
/** Generic default option the owner asked to remove. */
export const GENERIC = /^Pause, scan and communicate before committing$/;
/** Words that reveal the judgment; judgments belong in Coach Code's feedback. */
export const REVEALING = /\b(blindly|unnecessarily|too early|too late|too far|early|isolated|identical|force|crowd(ed)?|duplicate|expose|abandon|passive|disconnected|dive in|stab|overrun|hide)\b/i;
export const NEUTRAL: Readonly<Record<string, string>> = {
  'Arrive behind the goal line early.': 'Run behind the goal line now.',
  'Both pursue the same receiver.': 'Both go to the receiver.',
  'Chase the same ball unnecessarily.': 'Chase the same ball.',
  'Continue an isolated chase.': 'Keep chasing the ball.',
  'Crowd the striker’s route.': 'Move into the striker’s route.',
  'Dive in at full speed.': 'Tackle at full speed.',
  'Dribble into the covering defender.': 'Dribble at the covering defender.',
  'Drop onto the goalkeeper.': 'Drop back toward the goalkeeper.',
  'Duplicate the winger’s approach.': 'Make the same approach as the winger.',
  'Follow blindly and expose goal.': 'Follow the runner.',
  'Follow everyone to the ball.': 'Go to the ball with everyone.',
  'Force a crowded forward pass.': 'Play the forward pass between the defenders.',
  'Force play through defender.': 'Play through the defender.',
  'Force the screened pass.': 'Play the pass past the screening defender.',
  'Hide on the same line as a marker.': 'Stay on the same line as a marker.',
  'Lunge from too far away.': 'Lunge for the ball from here.',
  'Make the identical run.': 'Make the same run.',
  'Open the center by chasing wide.': 'Chase the ball wide.',
  'Overrun and expose inside.': 'Close at full speed.',
  'Press before the pass and expose inside.': 'Press before the pass.',
  'Run behind the last defender too early.': 'Run behind the last defender now.',
  'Run early into offside position.': 'Run past the last defender now.',
  'Rush out too late and abandon inside.': 'Close out to the ball now.',
  'Shoot through the set blocker.': 'Shoot past the blocker.',
  'Stab at a protected ball.': 'Tackle the ball now.',
  'Stand disconnected on touchline.': 'Stand on the touchline.',
  'Stay passive on the old line.': 'Stay on the old line.',
  'Switch blindly through pressure.': 'Switch play through the pressure.',
  'Delay until recovery removes advantage.': 'Delay until defenders recover.',
};
/** Rewordings that also drop a tactical fact (timing or the space left behind), so the action itself may differ. */
export const MEANING_MAY_CHANGE: ReadonlySet<string> = new Set(['Overrun and expose inside.', 'Rush out too late and abandon inside.', 'Press before the pass and expose inside.', 'Follow blindly and expose goal.']);

export interface ChoiceRevision {
  readonly choice: ChoiceId;
  readonly original: string;
  readonly grade: string;
  readonly proposed: string | null;
  readonly change: 'unchanged' | 'reworded' | 'removed';
  readonly reason: string | null;
  /** Reworded only: whether the proposed text names the same action. Every reworded grade still needs owner confirmation. */
  readonly meaning: 'same' | 'may-change' | null;
  readonly gradeStatus: 'PACKAGE' | 'RECHECK';
}
export interface SceneChoices {
  readonly schema: typeof CHOICES_SCHEMA;
  readonly sceneId: string;
  readonly sceneVersion: number;
  readonly revisions: readonly ChoiceRevision[];
  readonly remaining: number;
  readonly needsReauthoring: boolean;
  readonly status: 'READY_FOR_REVIEW';
}

export function reviseChoices(s: MomentScene): SceneChoices {
  const revisions = s.actions.map((a): ChoiceRevision => {
    if (GENERIC.test(a.label)) return { choice: a.id, original: a.label, grade: a.grade, proposed: null, change: 'removed', reason: 'Generic default option (owner: remove as a default fourth option).', meaning: null, gradeStatus: 'PACKAGE' };
    const n = NEUTRAL[a.label];
    if (n) return { choice: a.id, original: a.label, grade: a.grade, proposed: n, change: 'reworded', reason: 'Wording revealed the judgment; the judgment stays in Coach Code feedback.', meaning: MEANING_MAY_CHANGE.has(a.label) ? 'may-change' : 'same', gradeStatus: 'RECHECK' };
    return { choice: a.id, original: a.label, grade: a.grade, proposed: a.label, change: 'unchanged', reason: null, meaning: null, gradeStatus: 'PACKAGE' };
  });
  const remaining = revisions.filter((r) => r.change !== 'removed').length;
  return { schema: CHOICES_SCHEMA, sceneId: s.sceneId, sceneVersion: s.version, revisions, remaining, needsReauthoring: remaining < 2, status: 'READY_FOR_REVIEW' };
}

export interface ShownChoice {
  readonly id: ChoiceId;
  readonly label: string;
  readonly original: string;
}

/** Choices a screen shows: the revised (neutral, generic removed) set, or the package originals. IDs never change. */
export function shownChoices(s: MomentScene, original = false): readonly ShownChoice[] {
  if (original) return s.actions.map((a) => ({ id: a.id, label: a.label, original: a.label }));
  return reviseChoices(s).revisions.flatMap((r) => (r.proposed === null ? [] : [{ id: r.choice, label: r.proposed, original: r.original }]));
}
