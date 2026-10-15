/**
 * Six original, code-drawn demo PROTOTYPES (package order BM01, DR01, TR01, PA02, JU01, FI01).
 * Review-only: none is a reviewed asset, none is in the release manifest, and each lists the
 * coaching findings and unresolved claims that must be closed before it can be finalized.
 * Coordinates: a 10 x 6 close view, x to the right. Authored for the right foot; the left-foot
 * version mirrors limb and direction but never the contact surface.
 */
import { mirror, type Surface } from './approval';

export type Phase = 'setup' | 'preparation' | 'contact' | 'release' | 'exit' | 'reset';
export type DemoSurface = Surface | 'unspecified';
export interface Point { readonly x: number; readonly y: number }
export interface DemoStep {
  readonly phase: Phase;
  readonly caption: string;
  readonly seconds: number;
  readonly ballFrom: Point;
  readonly ballTo: Point;
  /** Ball height above the floor during the step (0 = rolling on the ground). */
  readonly air: 0 | 1;
  readonly bounce?: true;
  readonly contact?: { readonly foot: 'working' | 'support'; readonly surface: DemoSurface };
  readonly working: Point;
  readonly support: Point;
  readonly hands?: true;
}
export interface DemoPrototype {
  readonly levelId: string;
  readonly view: 'close' | 'overhead';
  readonly steps: readonly DemoStep[];
  readonly expected: { readonly contacts: number; readonly bounces: number };
  readonly blockers: readonly string[];
}
export interface ResolvedStep extends Omit<DemoStep, 'contact'> {
  readonly contact?: { readonly side: 'left' | 'right'; readonly foot: 'working' | 'support'; readonly surface: DemoSurface };
}

const P = (x: number, y: number): Point => ({ x, y });
const ALL_VARIANTS = 'Coaching review (medium): starting/ending text must be resolved for this variant.';

export const DEMO_PROTOTYPES: readonly DemoPrototype[] = [
  {
    levelId: 'BM01-L1',
    view: 'close',
    expected: { contacts: 1, bounces: 0 },
    blockers: ['Claim BM01-TECH is unresolved.', 'Coaching review: explain support balance and transfer direction.', ALL_VARIANTS],
    steps: [
      { phase: 'setup', caption: 'Ball still between your feet', seconds: 1.2, ballFrom: P(5, 3), ballTo: P(5, 3), air: 0, working: P(6.2, 3), support: P(3.8, 3) },
      { phase: 'preparation', caption: 'Support foot grounded, balanced', seconds: 0.8, ballFrom: P(5, 3), ballTo: P(5, 3), air: 0, working: P(5.9, 3), support: P(3.8, 3) },
      { phase: 'contact', caption: 'Inside of the foot touches the ball', seconds: 0.9, ballFrom: P(5, 3), ballTo: P(5, 3), air: 0, contact: { foot: 'working', surface: 'inside' }, working: P(5.5, 3), support: P(3.8, 3) },
      { phase: 'release', caption: 'Ball rolls across to the other foot', seconds: 1.0, ballFrom: P(5, 3), ballTo: P(4.4, 3), air: 0, working: P(5.6, 3), support: P(3.8, 3) },
      { phase: 'exit', caption: 'Stop', seconds: 0.8, ballFrom: P(4.4, 3), ballTo: P(4.4, 3), air: 0, working: P(6.2, 3), support: P(3.8, 3) },
      { phase: 'reset', caption: 'Reset the ball between your feet', seconds: 1.0, ballFrom: P(4.4, 3), ballTo: P(5, 3), air: 0, working: P(6.2, 3), support: P(3.8, 3), hands: true },
    ],
  },
  {
    levelId: 'DR01-L1',
    view: 'close',
    expected: { contacts: 2, bounces: 0 },
    blockers: ['Coaching review: low balanced posture and controlled contacts before pace.', ALL_VARIANTS],
    steps: [
      { phase: 'setup', caption: 'Stand beside a still ball', seconds: 1.0, ballFrom: P(5, 3), ballTo: P(5, 3), air: 0, working: P(6.1, 3.2), support: P(4.2, 3.6) },
      { phase: 'contact', caption: 'Inside of the foot nudges it in', seconds: 0.9, ballFrom: P(5, 3), ballTo: P(5, 3), air: 0, contact: { foot: 'working', surface: 'inside' }, working: P(5.5, 3), support: P(4.2, 3.6) },
      { phase: 'release', caption: 'Small roll inward, no travelling', seconds: 0.8, ballFrom: P(5, 3), ballTo: P(4.5, 2.8), air: 0, working: P(5.5, 3), support: P(4.2, 3.6) },
      { phase: 'contact', caption: 'Outside of the same foot redirects it', seconds: 0.9, ballFrom: P(4.5, 2.8), ballTo: P(4.5, 2.8), air: 0, contact: { foot: 'working', surface: 'outside' }, working: P(4.1, 2.8), support: P(4.2, 3.6) },
      { phase: 'exit', caption: 'Small roll back out; stop', seconds: 0.9, ballFrom: P(4.5, 2.8), ballTo: P(5.1, 2.9), air: 0, working: P(4.1, 2.8), support: P(4.2, 3.6) },
      { phase: 'reset', caption: 'Reset beside the ball', seconds: 0.8, ballFrom: P(5.1, 2.9), ballTo: P(5, 3), air: 0, working: P(6.1, 3.2), support: P(4.2, 3.6) },
    ],
  },
  {
    levelId: 'TR01-L1',
    view: 'close',
    expected: { contacts: 1, bounces: 0 },
    blockers: ['Coaching review (high): pull-back direction and foot-specific geometry must be revised before animation.', ALL_VARIANTS],
    steps: [
      { phase: 'setup', caption: 'Still ball in front of you', seconds: 1.0, ballFrom: P(5, 2.2), ballTo: P(5, 2.2), air: 0, working: P(5.6, 3.6), support: P(4.4, 3.8) },
      { phase: 'contact', caption: 'Sole rests lightly on top of the ball', seconds: 0.9, ballFrom: P(5, 2.2), ballTo: P(5, 2.2), air: 0, contact: { foot: 'working', surface: 'sole' }, working: P(5, 2.2), support: P(4.4, 3.8) },
      { phase: 'release', caption: 'Draw it back a short distance', seconds: 1.0, ballFrom: P(5, 2.2), ballTo: P(5, 3.0), air: 0, working: P(5, 3.0), support: P(4.4, 3.8) },
      { phase: 'exit', caption: 'Set the foot down and stop', seconds: 0.9, ballFrom: P(5, 3.0), ballTo: P(5, 3.0), air: 0, working: P(5.6, 3.6), support: P(4.4, 3.8) },
      { phase: 'reset', caption: 'Reset the ball in front', seconds: 0.9, ballFrom: P(5, 3.0), ballTo: P(5, 2.2), air: 0, working: P(5.6, 3.6), support: P(4.4, 3.8), hands: true },
    ],
  },
  {
    levelId: 'PA02-L1',
    view: 'overhead',
    expected: { contacts: 2, bounces: 0 },
    blockers: ['Coaching review (high): the receiving surface for stopping the return is unspecified.', 'Coaching review (medium): define the body/foot relationship to the next action.', ALL_VARIANTS],
    steps: [
      { phase: 'setup', caption: 'Comfortable distance from a permitted wall', seconds: 1.0, ballFrom: P(3, 3), ballTo: P(3, 3), air: 0, working: P(2.6, 3.3), support: P(2.3, 2.8) },
      { phase: 'contact', caption: 'Gentle inside-foot pass', seconds: 0.7, ballFrom: P(3, 3), ballTo: P(3, 3), air: 0, contact: { foot: 'working', surface: 'inside' }, working: P(2.8, 3.1), support: P(2.3, 2.8) },
      { phase: 'release', caption: 'Ball rolls to the wall', seconds: 1.0, ballFrom: P(3, 3), ballTo: P(9.2, 3), air: 0, working: P(2.8, 3.1), support: P(2.3, 2.8) },
      { phase: 'release', caption: 'Rebound rolls back', seconds: 1.0, ballFrom: P(9.2, 3), ballTo: P(3.1, 3), air: 0, working: P(2.6, 3.3), support: P(2.3, 2.8) },
      { phase: 'contact', caption: 'Stop the return (surface to be specified)', seconds: 0.9, ballFrom: P(3.1, 3), ballTo: P(3.1, 3), air: 0, contact: { foot: 'working', surface: 'unspecified' }, working: P(3.1, 3), support: P(2.3, 2.8) },
      { phase: 'reset', caption: 'Reset, no immediate second pass', seconds: 1.0, ballFrom: P(3.1, 3), ballTo: P(3, 3), air: 0, working: P(2.6, 3.3), support: P(2.3, 2.8) },
    ],
  },
  {
    levelId: 'JU01-L1',
    view: 'close',
    expected: { contacts: 1, bounces: 1 },
    blockers: ['Claim JU01-TECH is unresolved.', 'Coaching review (high): juggling contact surface and exact bounce sequence must be specified.', ALL_VARIANTS],
    steps: [
      { phase: 'setup', caption: 'Hold the ball low; clear overhead', seconds: 1.0, ballFrom: P(5, 1.6), ballTo: P(5, 1.6), air: 1, working: P(5.6, 4.6), support: P(4.4, 4.6), hands: true },
      { phase: 'preparation', caption: 'Drop it', seconds: 0.6, ballFrom: P(5, 1.6), ballTo: P(5, 4.8), air: 1, working: P(5.6, 4.6), support: P(4.4, 4.6) },
      { phase: 'release', caption: 'One bounce', seconds: 0.6, ballFrom: P(5, 4.8), ballTo: P(5, 3.4), air: 1, bounce: true, working: P(5.6, 4.6), support: P(4.4, 4.6) },
      { phase: 'contact', caption: 'One gentle upward foot touch (surface to be specified)', seconds: 0.9, ballFrom: P(5, 3.4), ballTo: P(5, 3.4), air: 1, contact: { foot: 'working', surface: 'unspecified' }, working: P(5.2, 3.8), support: P(4.4, 4.6) },
      { phase: 'exit', caption: 'Catch', seconds: 0.8, ballFrom: P(5, 3.4), ballTo: P(5, 1.8), air: 1, working: P(5.6, 4.6), support: P(4.4, 4.6), hands: true },
      { phase: 'reset', caption: 'Reset', seconds: 0.8, ballFrom: P(5, 1.8), ballTo: P(5, 1.6), air: 1, working: P(5.6, 4.6), support: P(4.4, 4.6), hands: true },
    ],
  },
  {
    levelId: 'FI01-L1',
    view: 'overhead',
    expected: { contacts: 1, bounces: 0 },
    blockers: ['Claim FI01-TECH is unresolved.', 'Coaching review (high): add support-foot position and contact cues for a ground trajectory.', ALL_VARIANTS],
    steps: [
      { phase: 'setup', caption: 'Beside a still ball, facing a wide ground target', seconds: 1.0, ballFrom: P(2.5, 3), ballTo: P(2.5, 3), air: 0, working: P(1.9, 3.5), support: P(2.3, 2.5) },
      { phase: 'contact', caption: 'Gentle inside-foot strike', seconds: 0.8, ballFrom: P(2.5, 3), ballTo: P(2.5, 3), air: 0, contact: { foot: 'working', surface: 'inside' }, working: P(2.3, 3.1), support: P(2.3, 2.5) },
      { phase: 'release', caption: 'Ball rolls along the ground to the target', seconds: 1.3, ballFrom: P(2.5, 3), ballTo: P(9, 3), air: 0, working: P(2.4, 3.1), support: P(2.3, 2.5) },
      { phase: 'reset', caption: 'Retrieve calmly and reset', seconds: 1.4, ballFrom: P(9, 3), ballTo: P(2.5, 3), air: 0, working: P(1.9, 3.5), support: P(2.3, 2.5), hands: true },
    ],
  },
];

export function prototypeFor(levelId: string): DemoPrototype | undefined {
  return DEMO_PROTOTYPES.find((d) => d.levelId === levelId);
}

/** The steps for one side. Left mirrors x and the limb; contact surfaces are unchanged. */
export function resolveSteps(d: DemoPrototype, side: 'left' | 'right'): ResolvedStep[] {
  const fx = (p: Point): Point => (side === 'right' ? p : { x: 10 - p.x, y: p.y });
  return d.steps.map(({ contact, ...s }) => {
    const base = { ...s, ballFrom: fx(s.ballFrom), ballTo: fx(s.ballTo), working: fx(s.working), support: fx(s.support) };
    if (!contact) return base;
    const other = mirror(side, 'inside')[0];
    const surface: DemoSurface = contact.surface === 'unspecified' ? 'unspecified' : mirror(other, contact.surface)[1];
    return { ...base, contact: { side: contact.foot === 'working' ? side : other, foot: contact.foot, surface } };
  });
}

export function demoDuration(d: DemoPrototype): number {
  return d.steps.reduce((t, s) => t + s.seconds, 0);
}

/** Step index and 0..1 progress at time t (seconds), looping. */
export function stepAt(d: DemoPrototype, t: number): { index: number; f: number } {
  const total = demoDuration(d);
  let r = ((t % total) + total) % total;
  for (let i = 0; i < d.steps.length; i++) {
    const s = d.steps[i]!.seconds;
    if (r < s) return { index: i, f: r / s };
    r -= s;
  }
  return { index: d.steps.length - 1, f: 1 };
}
