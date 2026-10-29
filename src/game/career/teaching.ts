/**
 * Ball Mastery teaching pages (art v1 vertical slice). Framework-free: one timeline drives the full player, the
 * foot inset, the ball and the caption, so they can never drift apart. Mechanics come from the reviewed activity
 * in the catalog (steps, cue, mistake); this file only times them and names the contact-study pose that shows each.
 *
 * Poses are the owner's contact studies (docs/art/ball-mastery-v1): the figure faces the viewer, so the character's
 * RIGHT foot is on the image LEFT. Each foot has its own drawn pose; nothing is mirrored.
 */
import { activityById } from './catalog';
import type { Activity } from './types';

export type Foot = 'right' | 'left';
export type Surface = 'inside' | 'none';
export type PoseId = 'P1' | 'P2' | 'P3' | 'P4' | 'P9' | 'P10';

/** Which drawn boot (0 = image left, 1 = image right) is the working foot in each pose (read from the drawings). */
export const WORKING_BOOT: Readonly<Record<PoseId, 0 | 1>> = { P4: 0, P9: 1, P1: 0, P3: 1, P10: 0, P2: 1 };

export interface TeachingPhase {
  /** Index into the activity's three reviewed steps (a step may span a contact beat and its follow-through). */
  readonly step: 0 | 1 | 2;
  readonly seconds: number;
  readonly pose: Readonly<Record<Foot, PoseId>>;
  /** Contact surface while this phase is on screen; 'none' = foot not touching the ball. */
  readonly contact: Surface;
  /** Ball x at the start and end of the phase, in body heights, image-right positive, for the RIGHT-foot version. */
  readonly ball: readonly [number, number];
  /** Player shift (same units) over the phase. */
  readonly body: readonly [number, number];
}

export interface TeachingLesson {
  readonly activityId: string;
  readonly phases: readonly TeachingPhase[];
}

/**
 * Inside-Cut Escape (dr-inside-cut; BM-002 confirmed equivalent). Right foot: load the right foot (P4), the right leg
 * crosses in front and the inside of the right foot carries the ball across the body (P9), push away the new way
 * off the left foot (P1). Left foot: the drawn mirror poses P3 / P10 / P2.
 * The ball waits in front of the support foot, so the crossing boot meets it on its inside edge and pushes it away
 * the way the inside faces (P9 shows the follow-through; the sheets have no contact-start pose).
 */
export const TEACHING: readonly TeachingLesson[] = [
  {
    activityId: 'dr-inside-cut',
    phases: [
      { step: 0, seconds: 1.4, pose: { right: 'P4', left: 'P3' }, contact: 'none', ball: [0.2, 0.2], body: [0, 0] },
      { step: 1, seconds: 0.4, pose: { right: 'P9', left: 'P10' }, contact: 'inside', ball: [0.2, 0.26], body: [0, 0] },
      { step: 1, seconds: 0.5, pose: { right: 'P9', left: 'P10' }, contact: 'none', ball: [0.26, 0.5], body: [0, 0] },
      { step: 2, seconds: 1.4, pose: { right: 'P1', left: 'P2' }, contact: 'none', ball: [0.5, 0.9], body: [0, 0.4] },
    ],
  },
];

export const teachingFor = (activityId: string): TeachingLesson | undefined => TEACHING.find((l) => l.activityId === activityId);
export const lessonLength = (l: TeachingLesson): number => l.phases.reduce((t, p) => t + p.seconds, 0);
/** Phase start times; Step jumps between these. */
export const phaseStarts = (l: TeachingLesson): number[] => l.phases.map((_, i) => l.phases.slice(0, i).reduce((t, p) => t + p.seconds, 0));

export interface TeachingFrame {
  readonly phase: number;
  readonly step: 0 | 1 | 2;
  readonly pose: PoseId;
  readonly foot: Foot;
  readonly contact: Surface;
  /** Ball and body x in body heights, image-right positive (already mirrored for the left foot). */
  readonly ballX: number;
  readonly bodyX: number;
  readonly caption: string;
}

/** The single source of truth for a moment of the demo. Slow motion and pause only change `t`. The demo plays once
 * and holds its last frame (the trajectory does not loop back), so `t` is clamped to the lesson. */
export function teachingFrame(l: TeachingLesson, t: number, foot: Foot): TeachingFrame {
  const len = lessonLength(l);
  let at = Math.min(len, Math.max(0, t));
  let i = 0;
  // Phase starts are sums of decimals; the epsilon keeps a Step that lands exactly on a start in the new phase.
  while (i < l.phases.length - 1 && at >= l.phases[i]!.seconds - 1e-9) at -= l.phases[i++]!.seconds;
  const p = l.phases[i]!;
  const f = Math.min(1, Math.max(0, at / p.seconds));
  const ease = f * f * (3 - 2 * f);
  const side = foot === 'right' ? 1 : -1;
  const a: Activity | undefined = activityById(l.activityId);
  const text = a?.steps[p.step] ?? '';
  return {
    phase: i,
    step: p.step,
    pose: p.pose[foot],
    foot,
    contact: p.contact,
    ballX: side * (p.ball[0] + (p.ball[1] - p.ball[0]) * ease),
    bodyX: side * (p.body[0] + (p.body[1] - p.body[0]) * ease),
    caption: `${p.step + 1}. ${text}`,
  };
}
