/**
 * Choice revisions. Round 3 proposed neutral wording (`PROPOSED_R3`, kept for comparison); round 4 is the owner's
 * wording review (`OWNER_R4`, branch C of both versions). Package labels and grades stay unchanged as history;
 * wording approval establishes neither movement, contact nor grade approval.
 */
import type { ChoiceId, Metres } from '../all36/types';
import type { OutcomeDraft } from './outcomes';
import { FAMILIES } from './outcomesV2';
import type { MomentScene } from './schema';

export const CHOICES_SCHEMA = 'tactical-moments-choices.v2';
/** Generic default option; owner approved its removal in all 72 versions (round 4). */
export const GENERIC = /^Pause, scan and communicate before committing$/;
/** Words that reveal the judgment; judgments belong in Coach Code's feedback. */
export const REVEALING = /\b(blindly|unnecessarily|too early|too late|too far|early|isolated|identical|force|crowd(ed)?|duplicate|expose|abandon|passive|disconnected|dive in|stab|overrun|hide)\b/i;
/** Round 3 proposals, superseded by OWNER_R4; shown in the comparison only. */
export const PROPOSED_R3: Readonly<Record<string, string>> = {
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

/** The action a label asks for, compared with the movement family the v2 draft animates. */
export type Intent = 'pass' | 'carry' | 'shot' | 'close' | 'close-with-mate' | 'tackle' | 'overrun' | 'hold' | 'run-beyond' | 'run-same' | 'run-to-mate' | 'chase-wide' | 'follow';
export interface OwnerWording {
  readonly decision: 'approved' | 'replaced' | 'removed';
  readonly label: string | null;
  readonly reason: string;
  readonly intent: Intent | null;
  /** Why the owner wording may name a different action than the package label (null = same action). */
  readonly meaningChange: string | null;
  /** Another retained choice in the same scene that may read as the same action. */
  readonly overlap: string | null;
}
const ok = (label: string, intent: Intent, meaningChange: string | null = null, overlap: string | null = null): OwnerWording => ({ decision: 'approved', label, reason: 'Owner: neutral, understandable action; approval of the label does not confirm the grade.', intent, meaningChange, overlap });
const rep = (label: string, reason: string, intent: Intent, meaningChange: string | null = null, overlap: string | null = null): OwnerWording => ({ decision: 'replaced', label, reason: `Owner: ${reason}`, intent, meaningChange, overlap });
/** Owner wording review, round 4: branch C of the base and changed versions of each situation. */
export const OWNER_R4: Readonly<Record<string, OwnerWording>> = {
  D01: rep('Pass forward through this lane.', '"Through the defender" sounds physically impossible; identify the actual pass lane visually.', 'pass', 'The package option forces play through a defender; the owner wording is a pass through a lane.'),
  D04: ok('Play the pass past the screening defender.', 'pass'),
  D05: rep('Move toward the ball.', '"With everyone" gives away the crowding problem.', 'close', 'The package option is everyone going to the ball; the new wording names only the protagonist.'),
  D06: rep('Hold your current position.', '"Same line as a marker" is spatially ambiguous; the picture should show the marking relationship.', 'hold', 'The package option hides on a marker\'s line; the new wording holds the current spot, which the picture must show is that line.'),
  D07: ok('Dribble at the covering defender.', 'carry', 'Dribbling at a defender differs from dribbling into one (owner).', 'A "Carry to engage the defender"'),
  D08: ok('Play the forward pass between the defenders.', 'pass'),
  D09: rep('Run into the same space as your teammate.', '"Same run" lacks a clear reference.', 'run-same'),
  D10: rep('Pass across to the opposite side.', 'Describe the switch; let the player recognize the pressure.', 'pass'),
  D12: rep('Start your run beyond the defensive line now.', 'Avoid ambiguous "last defender" language.', 'run-beyond'),
  D13: rep('Start your run behind the defensive line now.', 'Preserve the timing decision without announcing the mistake.', 'run-beyond'),
  D14: rep('Hold the ball and wait.', '"Until defenders recover" states the consequence.', 'hold', 'The package option delays until recovery removes the advantage; "wait" does not say how long.'),
  D15: rep('Run into the striker’s lane.', 'Use a concrete movement instruction.', 'run-same'),
  D16: rep('Shoot now.', '"Shoot past the blocker" suggests successful avoidance and changes the original action.', 'shot', 'Shooting through a set blocker differs from shooting past one or through a blocked lane (owner).', 'B "Shoot through the open lane"'),
  D17: { decision: 'removed', label: null, reason: 'Owner: "Run behind the goal line now" is an exaggerated distractor, not a useful tactical alternative. Branch archived, not deleted.', intent: null, meaningChange: null, overlap: null },
  D19: ok('Lunge for the ball from here.', 'tackle', null, 'A "Contest the exposed ball"'),
  D20: rep('Move toward the ball with your teammate.', 'Clarifies the duplicated movement.', 'close-with-mate'),
  D21: ok('Keep chasing the ball.', 'close', null, 'B "Contest with cover"'),
  D22: ok('Press before the pass.', 'close', 'The package option also names the consequence (exposing inside), which the new wording drops.'),
  D23: ok('Stand on the touchline.', 'hold'),
  D24: rep('Approach the ball from the same side as the winger.', 'Makes "same approach" understandable.', 'run-same'),
  D25: ok('Tackle at full speed.', 'tackle', 'The package "dive in" names the tackle technique, which the new wording drops (owner).'),
  D27: rep('Move toward the receiver with your teammate.', 'Gives the protagonist an action instead of control over two players.', 'close-with-mate'),
  D28: ok('Chase the ball wide.', 'chase-wide', 'The package option also names the consequence (opening the centre), which the new wording drops.'),
  D29: ok('Follow the runner.', 'follow', 'The package option also names the consequence (exposing goal), which the new wording drops.'),
  D31: rep('Keep sprinting as you reach the ball carrier.', 'Full-speed approach alone does not establish an overrun; this preserves the braking decision.', 'overrun', 'The package option also names the consequence (exposing inside), which the new wording drops.', 'B "Contest a reachable loose touch"'),
  D32: ok('Tackle the ball now.', 'tackle', 'The package "stab at a protected ball" names the technique and the ball\'s protection, which the new wording drops (owner).', 'B "Contest the loose ball"'),
  D33: rep('Hold your current defensive line.', '"Old line" implies that the position is already wrong.', 'hold'),
  D35: rep('Drop deeper toward the goalkeeper.', 'Describes the movement without implying that any retreat is a mistake.', 'run-to-mate', 'The package "drop onto the goalkeeper" names excessive depth; "toward" does not (owner).'),
  D36: ok('Close out to the ball now.', 'close', 'The package option also names the timing and consequence (too late, abandoning inside), which the new wording drops.', 'A "Close to obstruct delivery"'),
};

/** Whether the v2 draft animates the action the shown wording names. Anything but MATCHES is flagged, never re-animated. */
export type MovementCheck = 'MATCHES' | 'MISMATCH' | 'STOPS_BEFORE_CONTACT' | 'NO_DRAFT_MOVEMENT' | 'NOT_CHECKED';
const d2 = (a: Metres, b: Metres): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
export function draftFamily(o: OutcomeDraft | undefined): string | null {
  if (!o || o.presentation === 'explanation' || !o.timeline) return null;
  if (o.category === 'hold-position' || o.category === 'scan') return 'hold';
  return FAMILIES.find(([re]) => re.test(o.packageLabel))?.[1] ?? null;
}
export function movementCheck(s: MomentScene, intent: Intent | null, o: OutcomeDraft | undefined): { check: MovementCheck; note: string } {
  if (!intent) return { check: 'NOT_CHECKED', note: '' };
  const fam = draftFamily(o);
  if (!fam) return { check: 'NO_DRAFT_MOVEMENT', note: 'The draft is a frozen explanation: no movement shows this action yet.' };
  if (intent === 'tackle') return fam === 'close' ? { check: 'STOPS_BEFORE_CONTACT', note: 'The draft closes to 0.8 m and stops; no tackle is attempted or resolved. A tackle needs tackle animation and contact metadata.' } : { check: 'MISMATCH', note: `The draft animates "${fam}", not a tackle.` };
  if (intent === 'overrun') return fam === 'close' ? { check: 'MISMATCH', note: 'The draft brakes and stops 0.8 m from the carrier; the wording says keep sprinting.' } : { check: 'MISMATCH', note: `The draft animates "${fam}".` };
  if (intent === 'close-with-mate') {
    if (fam !== 'close') return { check: 'MISMATCH', note: `The draft animates "${fam}".` };
    const P = s.protagonist.actorId;
    const me = s.actors.find((a) => a.id === P)!;
    const holder = s.ball.ownerAtDecision;
    const tgt = holder && holder !== P ? s.actors.find((a) => a.id === holder)!.decision : s.ball.decision;
    const mate = o!.timeline!.actors.find((tr) => {
      const a = s.actors.find((x) => x.id === tr.id);
      if (!a || tr.id === P || a.team !== me.team || a.role === 'GK') return false;
      return d2(tr.keys[0]!.at, tgt) - d2(tr.keys[tr.keys.length - 1]!.at, tgt) >= 0.5;
    });
    return mate ? { check: 'MATCHES', note: `${mate.id} also moves toward the ball.` } : { check: 'MISMATCH', note: 'Only the protagonist moves toward the ball in the draft; no teammate goes with them.' };
  }
  return fam === intent ? { check: 'MATCHES', note: '' } : { check: 'MISMATCH', note: `The draft animates "${fam}" (from the package label), not "${intent}".` };
}

export interface ChoiceRevision {
  readonly choice: ChoiceId;
  /** Package wording and grade: historical record, never edited. */
  readonly original: string;
  readonly grade: string;
  readonly proposedR3: string | null;
  /** What the review build shows; null = removed (archived). */
  readonly proposed: string | null;
  readonly change: 'unchanged' | 'reworded' | 'removed';
  readonly ownerDecision: 'approved' | 'replaced' | 'removed' | null;
  readonly reason: string | null;
  readonly intent: Intent | null;
  readonly meaning: 'same' | 'may-change' | null;
  readonly meaningWhy: string | null;
  readonly overlap: string | null;
  /** RECHECK = wording changed, so the package grade is not assumed correct for the new picture. */
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
  const own = OWNER_R4[s.library.situationId];
  const revisions = s.actions.map((a): ChoiceRevision => {
    const keep = { choice: a.id, original: a.label, grade: a.grade, proposedR3: PROPOSED_R3[a.label] ?? null };
    if (GENERIC.test(a.label)) return { ...keep, proposed: null, change: 'removed', ownerDecision: 'approved', reason: 'Owner approved removing the generic default option in all 72 versions; scanning and communication stay in the teaching and movement.', intent: null, meaning: null, meaningWhy: null, overlap: null, gradeStatus: 'PACKAGE' };
    if (a.id === 'C' && own) {
      if (own.decision === 'removed') return { ...keep, proposed: null, change: 'removed', ownerDecision: 'removed', reason: own.reason, intent: null, meaning: null, meaningWhy: null, overlap: null, gradeStatus: 'PACKAGE' };
      return { ...keep, proposed: own.label, change: 'reworded', ownerDecision: own.decision, reason: own.reason, intent: own.intent, meaning: own.meaningChange ? 'may-change' : 'same', meaningWhy: own.meaningChange, overlap: own.overlap, gradeStatus: 'RECHECK' };
    }
    return { ...keep, proposed: a.label, change: 'unchanged', ownerDecision: null, reason: null, intent: null, meaning: null, meaningWhy: null, overlap: null, gradeStatus: 'PACKAGE' };
  });
  const remaining = revisions.filter((r) => r.change !== 'removed').length;
  return { schema: CHOICES_SCHEMA, sceneId: s.sceneId, sceneVersion: s.version, revisions, remaining, needsReauthoring: remaining < 2, status: 'READY_FOR_REVIEW' };
}

/** Whether a choice is still offered (removed choices are archived: their branch stays in the scene, unused). */
export const keptChoice = (s: MomentScene, k: ChoiceId): boolean => reviseChoices(s).revisions.some((r) => r.choice === k && r.change !== 'removed');

export interface ShownChoice {
  readonly id: ChoiceId;
  readonly label: string;
  readonly original: string;
  /** Neutral numbered destination marker (ball target, or where the protagonist goes); never coloured by grade. */
  readonly marker: Metres | null;
}

/** Where an option goes, from the branch (or its draft) the screen would play: ball target first, else the protagonist's end point. */
function destination(s: MomentScene, k: ChoiceId, o: OutcomeDraft | undefined): Metres | null {
  if (s.actions.find((a) => a.id === k)!.marker) return s.actions.find((a) => a.id === k)!.marker;
  const tl = o?.timeline ?? s.branches[k].timeline;
  const pass = tl.ball.find((e) => e.kind === 'pass');
  if (pass && pass.kind === 'pass') return pass.to;
  const me = tl.actors.find((tr) => tr.id === s.protagonist.actorId);
  if (!me) return null;
  const end = me.keys[me.keys.length - 1]!.at;
  return d2(me.keys[0]!.at, end) > 1 ? end : null;
}

/**
 * Choices a screen shows. Original only: the package labels and markers. Otherwise the owner-reviewed set, each with
 * a destination marker where the option moves something; a reworded option whose draft does not animate its wording
 * gets no marker (the mismatch is flagged in CHOICE_REVISIONS.md instead of silently re-animated).
 */
export function shownChoices(s: MomentScene, original = false, outcomes: Partial<Record<ChoiceId, OutcomeDraft>> = {}): readonly ShownChoice[] {
  if (original) return s.actions.map((a) => ({ id: a.id, label: a.label, original: a.label, marker: a.marker }));
  return reviseChoices(s).revisions.flatMap((r) => {
    if (r.proposed === null) return [];
    const o = outcomes[r.choice];
    const usable = r.change !== 'reworded' || movementCheck(s, r.intent, o).check === 'MATCHES';
    return [{ id: r.choice, label: r.proposed, original: r.original, marker: usable ? destination(s, r.choice, o) : null }];
  });
}
