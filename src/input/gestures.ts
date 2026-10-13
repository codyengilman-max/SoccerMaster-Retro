/**
 * Pure pointer-gesture recognizer (screen pixels, milliseconds). No Phaser or DOM.
 *
 * - Swipe: a fast stroke (>= swipeMinPx within swipeMaxMs). Fires as soon as it passes
 *   swipeCommitPx, or on release.
 * - Hold-to-aim: the pointer stays within holdSlopPx for holdMs, starting near the
 *   controlled player. Dragging then aims (slingshot: the kick goes opposite the drag).
 *   Release kicks; a drag shorter than aimMinDragPx cancels.
 * A stroke that moves before holdMs can never become an aim, so a quick swipe is never a pass.
 */
export interface GestureTuning {
  readonly swipeMinPx: number;
  readonly swipeCommitPx: number;
  readonly swipeMaxMs: number;
  readonly holdMs: number;
  readonly holdSlopPx: number;
  /** Press must start this close to the controlled player (scaled up on big screens by the scene). */
  readonly holdRadiusPx: number;
  readonly aimMinDragPx: number;
  readonly aimMaxDragPx: number;
}

export const GESTURE_TUNING: GestureTuning = {
  swipeMinPx: 30,
  swipeCommitPx: 48,
  swipeMaxMs: 300,
  holdMs: 160,
  holdSlopPx: 12,
  holdRadiusPx: 80,
  aimMinDragPx: 18,
  aimMaxDragPx: 150,
};

export interface AimDrag {
  readonly dragX: number;
  readonly dragY: number;
  /** 0..1 from drag length between aimMinDragPx and aimMaxDragPx. */
  readonly power: number;
  /** False when the drag is too short to mean anything (release then cancels). */
  readonly valid: boolean;
}

export type Gesture =
  | { readonly type: 'swipe'; readonly dx: number; readonly dy: number }
  | { readonly type: 'aimStart'; readonly x: number; readonly y: number }
  | ({ readonly type: 'aimMove' } & AimDrag)
  | ({ readonly type: 'aimRelease' } & AimDrag)
  | { readonly type: 'aimCancel'; readonly reason: string }
  | { readonly type: 'holdTooFar' };

export type RecognizerState = 'idle' | 'pending' | 'moving' | 'aiming' | 'spent';

export function aimDrag(dragX: number, dragY: number, tuning: GestureTuning = GESTURE_TUNING): AimDrag {
  const len = Math.hypot(dragX, dragY);
  const span = Math.max(1, tuning.aimMaxDragPx - tuning.aimMinDragPx);
  const power = Math.min(1, Math.max(0, (len - tuning.aimMinDragPx) / span));
  return { dragX, dragY, power, valid: len >= tuning.aimMinDragPx };
}

export class GestureRecognizer {
  private current: RecognizerState = 'idle';
  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private startT = 0;
  private lastX = 0;
  private lastY = 0;
  private nearCarrier = false;

  constructor(readonly tuning: GestureTuning = GESTURE_TUNING) {}

  get state(): RecognizerState {
    return this.current;
  }

  get pressPoint(): { x: number; y: number } | null {
    return this.pointerId === null ? null : { x: this.startX, y: this.startY };
  }

  get pointerPoint(): { x: number; y: number } | null {
    return this.pointerId === null ? null : { x: this.lastX, y: this.lastY };
  }

  /** `nearCarrier`: whether the press started within holdRadiusPx of the controlled player. */
  pointerDown(id: number, x: number, y: number, t: number, nearCarrier: boolean): Gesture[] {
    if (this.current !== 'idle') return [];
    this.pointerId = id;
    this.startX = this.lastX = x;
    this.startY = this.lastY = y;
    this.startT = t;
    this.nearCarrier = nearCarrier;
    this.current = 'pending';
    return [];
  }

  pointerMove(id: number, x: number, y: number, t: number): Gesture[] {
    if (id !== this.pointerId) return [];
    const out = this.update(t);
    this.lastX = x;
    this.lastY = y;
    const dx = x - this.startX;
    const dy = y - this.startY;
    const moved = Math.hypot(dx, dy);
    if (this.current === 'aiming') {
      out.push({ type: 'aimMove', ...aimDrag(dx, dy, this.tuning) });
      return out;
    }
    if (this.current === 'pending' && moved > this.tuning.holdSlopPx) this.current = 'moving';
    if (this.current === 'moving' && moved >= this.tuning.swipeCommitPx && t - this.startT <= this.tuning.swipeMaxMs) {
      out.push({ type: 'swipe', dx, dy });
      this.current = 'spent';
    }
    return out;
  }

  pointerUp(id: number, x: number, y: number, t: number): Gesture[] {
    if (id !== this.pointerId) return [];
    const out = this.update(t);
    const dx = x - this.startX;
    const dy = y - this.startY;
    if (this.current === 'aiming') {
      out.push({ type: 'aimRelease', ...aimDrag(dx, dy, this.tuning) });
    } else if (
      (this.current === 'pending' || this.current === 'moving') &&
      Math.hypot(dx, dy) >= this.tuning.swipeMinPx &&
      t - this.startT <= this.tuning.swipeMaxMs
    ) {
      out.push({ type: 'swipe', dx, dy });
    }
    this.clear();
    return out;
  }

  /** Call every frame: promotes a still press to an aim once holdMs has passed. */
  update(t: number): Gesture[] {
    if (this.current !== 'pending' || t - this.startT < this.tuning.holdMs) return [];
    if (!this.nearCarrier) {
      this.current = 'spent';
      return [{ type: 'holdTooFar' }];
    }
    this.current = 'aiming';
    return [{ type: 'aimStart', x: this.startX, y: this.startY }];
  }

  /** Pointer cancel, app backgrounding, orientation change, navigation. Always leaves the recognizer idle. */
  cancel(reason: string): Gesture[] {
    const wasAiming = this.current === 'aiming';
    this.clear();
    return wasAiming ? [{ type: 'aimCancel', reason }] : [];
  }

  private clear(): void {
    this.current = 'idle';
    this.pointerId = null;
  }
}
