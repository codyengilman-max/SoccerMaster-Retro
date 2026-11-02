/**
 * Ball Mastery side-view contact lessons. Framework-free: one timeline gives the pose, the working and supporting
 * foot, the contact surface and the caption for any moment, so the character, ball, foot inset and caption share
 * one state. Feet are anatomical: the figure faces east, the right leg is the near leg; a left-foot contact uses the
 * left (far) leg's own pose, never a mirror. Pose ids name derived side-view frames (scripts/art/build-side-contact.py).
 */
export type Foot = 'right' | 'left';
export type SidePose = 'stand' | 'right-lift' | 'right-tap' | 'left-lift' | 'left-tap';
export type ContactSurface = 'sole' | 'none';
export type ContactPhase = 'pre' | 'contact' | 'post' | 'rest';

export interface SideBeat {
  /** Index into the lesson's design phases (caption title). */
  readonly step: number;
  readonly seconds: number;
  /** Pose for the RIGHT-foot-first version; the left-first version swaps the working leg (each leg has its own pose). */
  readonly pose: SidePose;
  readonly phase: ContactPhase;
}

export interface SideLesson {
  readonly activityId: string;
  readonly titles: readonly string[];
  readonly beats: readonly SideBeat[];
  /** The ball does not travel in this lesson (light top contacts). */
  readonly ballStill: true;
}

/** BM-055 Sole taps: Settle, Tap (R sole), Recover, Alternate (L sole). Ball stays still between contacts. */
export const SIDE_LESSONS: readonly SideLesson[] = [
  {
    activityId: 'bmd-055',
    titles: ['Settle', 'Tap', 'Recover', 'Alternate'],
    ballStill: true,
    beats: [
      { step: 0, seconds: 0.9, pose: 'stand', phase: 'rest' },
      { step: 1, seconds: 0.4, pose: 'right-lift', phase: 'pre' },
      { step: 1, seconds: 0.5, pose: 'right-tap', phase: 'contact' },
      { step: 2, seconds: 0.4, pose: 'right-lift', phase: 'post' },
      { step: 2, seconds: 0.5, pose: 'stand', phase: 'rest' },
      { step: 3, seconds: 0.4, pose: 'left-lift', phase: 'pre' },
      { step: 3, seconds: 0.5, pose: 'left-tap', phase: 'contact' },
      { step: 3, seconds: 0.4, pose: 'left-lift', phase: 'post' },
      { step: 3, seconds: 0.6, pose: 'stand', phase: 'rest' },
    ],
  },
];

export const sideLessonFor = (activityId: string): SideLesson | undefined => SIDE_LESSONS.find((l) => l.activityId === activityId);
export const sideLength = (l: SideLesson): number => Math.round(l.beats.reduce((t, b) => t + b.seconds, 0) * 1000) / 1000;
/** Beat start times; Step visits every beat, so each pre-contact, contact and post-contact pose can be held. */
export const sideStarts = (l: SideLesson): number[] => l.beats.map((_, i) => Math.round(l.beats.slice(0, i).reduce((t, b) => t + b.seconds, 0) * 1000) / 1000);

const swap = (p: SidePose): SidePose => (p.startsWith('right') ? (p.replace('right', 'left') as SidePose) : p.startsWith('left') ? (p.replace('left', 'right') as SidePose) : p);
const other = (f: Foot): Foot => (f === 'right' ? 'left' : 'right');

export interface SideFrame {
  readonly beat: number;
  readonly step: number;
  readonly pose: SidePose;
  readonly phase: ContactPhase;
  /** Working foot (null while both feet rest), supporting foot, and the surface touching the ball right now. */
  readonly working: Foot | null;
  readonly support: Foot | null;
  readonly surface: ContactSurface;
  readonly caption: string;
  readonly inset: string;
}

/** The single state for time t (clamped; the demo plays once and holds its last frame). `lead` = foot that taps first. */
export function sideFrame(l: SideLesson, t: number, lead: Foot): SideFrame {
  let at = Math.min(sideLength(l), Math.max(0, t));
  let i = 0;
  while (i < l.beats.length - 1 && at >= l.beats[i]!.seconds - 1e-9) at -= l.beats[i++]!.seconds;
  const b = l.beats[i]!;
  const pose = lead === 'right' ? b.pose : swap(b.pose);
  const working: Foot | null = pose === 'stand' ? null : pose.startsWith('right') ? 'right' : 'left';
  const surface: ContactSurface = b.phase === 'contact' ? 'sole' : 'none';
  const Name = (f: Foot): string => (f === 'right' ? 'Right' : 'Left');
  const what =
    working === null ? 'both feet down, ball still'
    : b.phase === 'pre' ? `${Name(working)} sole lifts over the ball`
    : b.phase === 'contact' ? `${Name(working)} sole taps the top of the ball`
    : `${Name(working)} foot comes back down`;
  return {
    beat: i, step: b.step, pose, phase: b.phase, working, support: working ? other(working) : null, surface,
    caption: `${b.step + 1}. ${l.titles[b.step]}: ${what}.`,
    inset: working === null ? 'No contact\nboth feet down' : surface === 'sole' ? `${Name(working)} foot\nsole on top of ball` : `${Name(working)} foot\nno contact`,
  };
}
