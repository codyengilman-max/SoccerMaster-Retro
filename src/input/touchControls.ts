/**
 * Touch/mouse control state machine for the 9v9 sandbox (screen pixels, milliseconds). No Phaser or DOM.
 *
 *   idle --down--> pending --moves past swipe threshold--> dribble (one 'dribble' action, then spent)
 *                  pending --still for holdMs, near carrier--> aiming --release--> 'kick' | 'aimCancel'
 *                  pending --quick release--> tap; a second tap on the same carrier in time -> 'feint'
 *
 * One gameplay pointer is captured at a time; other pointers are ignored. Each press produces at most
 * one gameplay action. All distances scale with the viewport's short side, clamped to [min, max] px.
 */
export interface ScaledPx {
  /** Fraction of the viewport's short side. */
  readonly frac: number;
  readonly min: number;
  readonly max: number;
}

export interface TouchControlTuning {
  /** Movement beyond this before hold activation commits the press to dribbling. */
  readonly swipeCommit: ScaledPx;
  /** A dribble needs at least this much movement when released before reaching swipeCommit. */
  readonly swipeMin: ScaledPx;
  /** Staying within this of the press point counts as holding still / tapping. */
  readonly holdSlop: ScaledPx;
  /** Press must start this close to the controlled player to aim or tap it. */
  readonly carrierRadius: ScaledPx;
  /** Releasing an aim within this of the press point cancels it. Power starts at its edge. */
  readonly cancelRadius: ScaledPx;
  /** Pull length (from the press point) that reaches full power; longer pulls stay capped. */
  readonly maxPull: ScaledPx;
  /** Two taps must start within this of each other. */
  readonly doubleTapDistance: ScaledPx;
  readonly holdMs: number;
  /** A tap is released within this long. */
  readonly tapMaxMs: number;
  /** Second tap must go down within this long after the first one was released. */
  readonly doubleTapGapMs: number;
}

export const TOUCH_TUNING: TouchControlTuning = {
  swipeCommit: { frac: 0.07, min: 26, max: 64 },
  swipeMin: { frac: 0.045, min: 18, max: 40 },
  holdSlop: { frac: 0.028, min: 9, max: 20 },
  carrierRadius: { frac: 0.13, min: 46, max: 110 },
  cancelRadius: { frac: 0.05, min: 18, max: 40 },
  maxPull: { frac: 0.32, min: 100, max: 240 },
  doubleTapDistance: { frac: 0.09, min: 32, max: 80 },
  holdMs: 180,
  tapMaxMs: 240,
  doubleTapGapMs: 320,
};

export interface Thresholds {
  readonly swipeCommit: number;
  readonly swipeMin: number;
  readonly holdSlop: number;
  readonly carrierRadius: number;
  readonly cancelRadius: number;
  readonly maxPull: number;
  readonly doubleTapDistance: number;
}

const finite = (n: number): boolean => Number.isFinite(n);
const px = (s: ScaledPx, shortSide: number): number => Math.min(s.max, Math.max(s.min, s.frac * (finite(shortSide) && shortSide > 0 ? shortSide : 0)));

export function thresholdsFor(shortSidePx: number, t: TouchControlTuning = TOUCH_TUNING): Thresholds {
  return {
    swipeCommit: px(t.swipeCommit, shortSidePx),
    swipeMin: px(t.swipeMin, shortSidePx),
    holdSlop: px(t.holdSlop, shortSidePx),
    carrierRadius: px(t.carrierRadius, shortSidePx),
    cancelRadius: px(t.cancelRadius, shortSidePx),
    maxPull: px(t.maxPull, shortSidePx),
    doubleTapDistance: px(t.doubleTapDistance, shortSidePx),
  };
}

export interface Pull {
  /** Kick direction in screen space (opposite the drag), unit length; null inside the cancel circle. */
  readonly dirX: number;
  readonly dirY: number;
  /** 0..1: grows from the cancel-circle edge to maxPull, capped. */
  readonly power: number;
  readonly inCancel: boolean;
  readonly pullPx: number;
}

export function pullFor(dragX: number, dragY: number, th: Thresholds): Pull {
  const x = finite(dragX) ? dragX : 0;
  const y = finite(dragY) ? dragY : 0;
  const len = Math.hypot(x, y);
  const inCancel = len < th.cancelRadius;
  const span = Math.max(1, th.maxPull - th.cancelRadius);
  const power = inCancel ? 0 : Math.min(1, Math.max(0, (len - th.cancelRadius) / span));
  return { dirX: inCancel ? 0 : -x / len, dirY: inCancel ? 0 : -y / len, power, inCancel, pullPx: len };
}

export type ControlAction =
  | { readonly type: 'dribble'; readonly dx: number; readonly dy: number }
  | { readonly type: 'aimStart'; readonly originX: number; readonly originY: number }
  | ({ readonly type: 'aimMove' } & Pull)
  | ({ readonly type: 'kick' } & Pull)
  | { readonly type: 'aimCancel'; readonly reason: string }
  | { readonly type: 'feint' };

export type ControlState = 'idle' | 'pending' | 'dribble' | 'aiming' | 'spent';

export class TouchControls {
  private current: ControlState = 'idle';
  private pointerId: number | null = null;
  private ox = 0;
  private oy = 0;
  private t0 = 0;
  private lx = 0;
  private ly = 0;
  private nearCarrier = false;
  private carrierKey: string | null = null;
  private lastTap: { x: number; y: number; t: number; key: string } | null = null;
  private th: Thresholds;

  constructor(
    shortSidePx: number,
    readonly tuning: TouchControlTuning = TOUCH_TUNING,
  ) {
    this.th = thresholdsFor(shortSidePx, tuning);
  }

  get state(): ControlState {
    return this.current;
  }

  get thresholds(): Thresholds {
    return this.th;
  }

  /** Stable screen-space gesture origin (press point) while a pointer is captured. */
  get origin(): { x: number; y: number } | null {
    return this.pointerId === null ? null : { x: this.ox, y: this.oy };
  }

  get pointer(): { x: number; y: number } | null {
    return this.pointerId === null ? null : { x: this.lx, y: this.ly };
  }

  get activePointer(): number | null {
    return this.pointerId;
  }

  /** Viewport change: recompute thresholds. Any gesture in progress is cancelled. */
  resize(shortSidePx: number): ControlAction[] {
    const out = this.cancel('resized');
    this.th = thresholdsFor(shortSidePx, this.tuning);
    return out;
  }

  /**
   * `carrierKey`: identity of the controlled player when the press starts within carrierRadius of
   * them (e.g. `H7#3` with the control epoch), else null.
   */
  pointerDown(id: number, x: number, y: number, t: number, carrierKey: string | null): ControlAction[] {
    if (this.current !== 'idle' || !finite(x) || !finite(y) || !finite(t)) return [];
    this.pointerId = id;
    this.ox = this.lx = x;
    this.oy = this.ly = y;
    this.t0 = t;
    this.carrierKey = carrierKey;
    this.nearCarrier = carrierKey !== null;
    this.current = 'pending';
    return [];
  }

  pointerMove(id: number, x: number, y: number, t: number): ControlAction[] {
    if (id !== this.pointerId || !finite(x) || !finite(y)) return [];
    const out = this.update(t);
    this.lx = x;
    this.ly = y;
    const dx = x - this.ox;
    const dy = y - this.oy;
    if (this.current === 'aiming') {
      out.push({ type: 'aimMove', ...pullFor(dx, dy, this.th) });
    } else if (this.current === 'pending' && Math.hypot(dx, dy) > this.th.holdSlop) {
      this.current = 'dribble';
      this.lastTap = null;
    }
    if (this.current === 'dribble' && Math.hypot(dx, dy) >= this.th.swipeCommit) {
      out.push({ type: 'dribble', dx, dy });
      this.current = 'spent';
    }
    return out;
  }

  pointerUp(id: number, x: number, y: number, t: number): ControlAction[] {
    if (id !== this.pointerId) return [];
    const ux = finite(x) ? x : this.lx;
    const uy = finite(y) ? y : this.ly;
    const out = finite(t) ? this.update(t) : [];
    const dx = ux - this.ox;
    const dy = uy - this.oy;
    const moved = Math.hypot(dx, dy);
    if (this.current === 'aiming') {
      const pull = pullFor(dx, dy, this.th);
      out.push(pull.inCancel ? { type: 'aimCancel', reason: 'released in cancel circle' } : { type: 'kick', ...pull });
    } else if (this.current === 'dribble' && moved >= this.th.swipeMin) {
      out.push({ type: 'dribble', dx, dy });
    } else if (this.current === 'pending' && moved <= this.th.holdSlop && t - this.t0 <= this.tuning.tapMaxMs) {
      out.push(...this.tap(t));
    }
    this.release();
    return out;
  }

  /** Call every frame: a still press becomes an aim after holdMs (only near the carrier). */
  update(t: number): ControlAction[] {
    if (this.current !== 'pending' || !finite(t) || t - this.t0 < this.tuning.holdMs) return [];
    this.lastTap = null;
    // Away from the carrier a hold never aims; the press stays pending so a slow drag still dribbles.
    if (!this.nearCarrier) return [];
    this.current = 'aiming';
    return [{ type: 'aimStart', originX: this.ox, originY: this.oy }];
  }

  /** Pointer cancel, lost capture, blur, background, pause, reset, orientation, possession loss. */
  cancel(reason: string): ControlAction[] {
    const wasAiming = this.current === 'aiming';
    this.release();
    this.lastTap = null;
    return wasAiming ? [{ type: 'aimCancel', reason }] : [];
  }

  private tap(t: number): ControlAction[] {
    const key = this.carrierKey;
    if (key === null) {
      this.lastTap = null;
      return [];
    }
    const prev = this.lastTap;
    if (
      prev &&
      prev.key === key &&
      this.t0 - prev.t <= this.tuning.doubleTapGapMs &&
      Math.hypot(this.ox - prev.x, this.oy - prev.y) <= this.th.doubleTapDistance
    ) {
      this.lastTap = null;
      return [{ type: 'feint' }];
    }
    this.lastTap = { x: this.ox, y: this.oy, t, key };
    return [];
  }

  private release(): void {
    this.current = 'idle';
    this.pointerId = null;
    this.carrierKey = null;
    this.nearCarrier = false;
  }
}
