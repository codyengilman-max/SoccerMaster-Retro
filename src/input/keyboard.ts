/** Desktop key bindings (KeyboardEvent.code) mapped to the same intents touch gestures produce. */
export type KeyIntent =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'aim'
  | 'toggleAction'
  | 'selectPass'
  | 'selectShoot'
  | 'retry'
  | 'back';

export const KEY_BINDINGS: Readonly<Record<string, KeyIntent>> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'aim',
  Tab: 'toggleAction',
  KeyQ: 'toggleAction',
  Digit1: 'selectPass',
  Digit2: 'selectShoot',
  KeyR: 'retry',
  Enter: 'retry',
  Escape: 'back',
  Backspace: 'back',
};

/** Screen-space unit vectors for arrow/WASD "swipes" (y grows downward). */
export const SCREEN_DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
} as const;

export interface HeldKeys {
  readonly left: boolean;
  readonly right: boolean;
  readonly up: boolean;
  readonly down: boolean;
}

export const KEYBOARD_AIM_TUNING = {
  /** Radians per real second while Left/Right is held. */
  turnRate: 2.2,
  /** Power per real second while Up/Down is held. */
  powerRate: 0.8,
  defaultPower: 0.55,
} as const;

/** Keyboard aiming while Space is held: Left/Right turn the aim, Up/Down change power. */
export class KeyboardAim {
  angle: number;
  power: number;

  constructor(angle: number, power: number = KEYBOARD_AIM_TUNING.defaultPower) {
    this.angle = angle;
    this.power = power;
  }

  update(realSeconds: number, held: HeldKeys): void {
    const turn = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    const push = (held.up ? 1 : 0) - (held.down ? 1 : 0);
    this.angle += turn * KEYBOARD_AIM_TUNING.turnRate * realSeconds;
    this.power = Math.min(1, Math.max(0, this.power + push * KEYBOARD_AIM_TUNING.powerRate * realSeconds));
  }

  /** Screen-space unit vector of the aim. */
  get direction(): { x: number; y: number } {
    return { x: Math.cos(this.angle), y: Math.sin(this.angle) };
  }
}
