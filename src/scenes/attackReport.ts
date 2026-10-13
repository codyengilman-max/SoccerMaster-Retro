import type { attack } from '../game';
import type { GestureTuning, RecognizerState } from '../input';
import type { PitchLayout } from '../render/layout';

/** Plain-data gameplay snapshot exposed through `window.__SMR__` for browser tests and debugging. */
export interface AttackReport {
  readonly phase: attack.Phase;
  readonly outcome: attack.Outcome | null;
  readonly outcomeBy: attack.PlayerId | null;
  readonly attempt: number;
  readonly controlledId: attack.PlayerId;
  readonly owner: attack.PlayerId | null;
  readonly action: attack.ActionMode;
  readonly timeScale: number;
  readonly slowMoBudget: number;
  readonly control: number;
  readonly swipeCooldown: number;
  readonly runnerId: attack.PlayerId | null;
  readonly coverMarkId: attack.PlayerId | null;
  readonly resolutions: number;
  readonly aim: { readonly direction: { x: number; y: number } | null; readonly power: number } | null;
  readonly events: readonly { readonly type: attack.SimEventType; readonly by: attack.PlayerId | null; readonly detail: string }[];
  readonly players: Readonly<
    Record<attack.PlayerId, { x: number; y: number; vx: number; vy: number; role: attack.Role; sx: number; sy: number }>
  >;
  readonly ball: { x: number; y: number; vx: number; vy: number; sx: number; sy: number };
  readonly layout: PitchLayout;
  readonly input: RecognizerState;
  readonly aimSource: 'pointer' | 'keyboard' | null;
  readonly gesture: GestureTuning;
  readonly holdRadiusPx: number;
  readonly pass: { readonly minDistance: number; readonly maxDistance: number };
  readonly shot: { readonly minSpeed: number; readonly maxSpeed: number };
  readonly toast: string;
}
