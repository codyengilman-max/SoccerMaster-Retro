/**
 * Touch/mouse control state machine for the 9v9 match (screen pixels, real milliseconds). No Phaser or DOM.
 * Presses may start anywhere on the pitch; the scene keeps UI presses and safe margins out.
 *
 * With the ball (`possessionKey` set):
 *   idle --down--> pending --travels swipeCommit before aimDelayMs--> 'dribble' (once), then spent
 *                  pending --aimDelayMs passes first (held or slow drag)--> aiming
 *   aiming --release outside the cancel circle--> one 'kick' (direction opposite the drag)
 *   aiming --release inside the cancel circle--> 'aimCancel' (never a tap or a shot)
 *   a quick still press is a tap (an aim it opened is cancelled quietly); a second tap -> 'quickShot'
 * Without the ball every press is movement: travelling swipeMin steers the controlled player.
 *
 * Classification is final: a dribble never becomes an aim or a kick and vice versa. Timing uses the
 * event timestamps (real time), so frame rate and slow motion never change what a gesture means.
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
  /** With the ball: travelling this far before aimDelayMs commits the press to dribbling. */
  readonly swipeCommit: ScaledPx;
  /** A dribble needs at least this much movement when released before reaching swipeCommit. */
  readonly swipeMin: ScaledPx;
  /** Staying within this of the press point counts as holding still / tapping. */
  readonly holdSlop: ScaledPx;
  /** Releasing an aim within this of the press point cancels it. Power starts at its edge. */
  readonly cancelRadius: ScaledPx;
  /** Pull length (from the press point) that reaches full power; longer pulls stay capped. */
  readonly maxPull: ScaledPx;
  /** Presses starting this close to a viewport edge are left to the browser/OS (iOS edge swipes, home bar). */
  readonly edgeMargin: ScaledPx;
  /** Two taps must start within this of each other. */
  readonly doubleTapDistance: ScaledPx;
  /**
   * With the ball, a press that has not travelled swipeCommit by this time is an aim. Tradeoff:
   * shorter makes aiming quicker to start but needs faster swipes to dribble; longer the reverse.
   */
  readonly aimDelayMs: number;
  /** A tap is released within this long. */
  readonly tapMaxMs: number;
  /** Second tap must go down within this long after the first one was released. */
  readonly doubleTapGapMs: number;
}

export const TOUCH_TUNING: TouchControlTuning = {
  swipeCommit: { frac: 0.07, min: 26, max: 64 },
  swipeMin: { frac: 0.045, min: 18, max: 40 },
  holdSlop: { frac: 0.028, min: 9, max: 20 },
  cancelRadius: { frac: 0.05, min: 18, max: 40 },
  maxPull: { frac: 0.32, min: 100, max: 240 },
  edgeMargin: { frac: 0.02, min: 8, max: 18 },
  doubleTapDistance: { frac: 0.09, min: 32, max: 80 },
  aimDelayMs: 110,
  tapMaxMs: 200,
  doubleTapGapMs: 320,
};

export interface Thresholds {
  readonly swipeCommit: number;
  readonly swipeMin: number;
  readonly holdSlop: number;
  readonly cancelRadius: number;
  readonly maxPull: number;
  readonly edgeMargin: number;
  readonly doubleTapDistance: number;
}

const finite = (n: number): boolean => Number.isFinite(n);
const px = (s: ScaledPx, shortSide: number): number => Math.min(s.max, Math.max(s.min, s.frac * (finite(shortSide) && shortSide > 0 ? shortSide : 0)));

export function thresholdsFor(shortSidePx: number, t: TouchControlTuning = TOUCH_TUNING): Thresholds {
  return {
    swipeCommit: px(t.swipeCommit, shortSidePx),
    swipeMin: px(t.swipeMin, shortSidePx),
    holdSlop: px(t.holdSlop, shortSidePx),
    cancelRadius: px(t.cancelRadius, shortSidePx),
    maxPull: px(t.maxPull, shortSidePx),
    edgeMargin: px(t.edgeMargin, shortSidePx),
    doubleTapDistance: px(t.doubleTapDistance, shortSidePx),
  };
}

/** Whether a press at (x, y) may start a gameplay gesture: finite and outside the reserved edge margin. */
export function inGestureArea(x: number, y: number, width: number, height: number, th: Thresholds): boolean {
  if (!finite(x) || !finite(y) || !finite(width) || !finite(height)) return false;
  const m = th.edgeMargin;
  return x >= m && y >= m && x <= width - m && y <= height - m;
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

/** Pull-to-power exponent (see pullFor). Linear: the sim's kick curve already maps power to roll distance evenly. */
export const POWER_CURVE = 1;

export function pullFor(dragX: number, dragY: number, th: Thresholds): Pull {
  const x = finite(dragX) ? dragX : 0;
  const y = finite(dragY) ? dragY : 0;
  const len = Math.hypot(x, y);
  const inCancel = len < th.cancelRadius;
  const span = Math.max(1, th.maxPull - th.cancelRadius);
  // Power is the pull fraction from the cancel-circle edge to maxPull; the sim turns it into roll distance (tuning.kick).
  const power = inCancel ? 0 : Math.pow(Math.min(1, Math.max(0, (len - th.cancelRadius) / span)), POWER_CURVE);
  return { dirX: inCancel ? 0 : -x / len, dirY: inCancel ? 0 : -y / len, power, inCancel, pullPx: len };
}

export type ControlAction =
  | { readonly type: 'dribble'; readonly dx: number; readonly dy: number }
  | { readonly type: 'aimStart'; readonly originX: number; readonly originY: number }
  | ({ readonly type: 'aimMove' } & Pull)
  | ({ readonly type: 'kick' } & Pull)
  | { readonly type: 'aimCancel'; readonly reason: string }
  | { readonly type: 'quickShot' };

export type ControlState = 'idle' | 'pending' | 'dribble' | 'aiming' | 'spent';

export class TouchControls {
  private current: ControlState = 'idle';
  private pointerId: number | null = null;
  private ox = 0;
  private oy = 0;
  private t0 = 0;
  private lx = 0;
  private ly = 0;
  /** Farthest the pointer has been from the press point during this press. */
  private maxDist = 0;
  private possessionKey: string | null = null;
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
   * `possessionKey`: identity of the user's carrier when the user has the ball and may kick (e.g.
   * `H7#3` with the control epoch), else null (the press can only move the controlled player).
   */
  pointerDown(id: number, x: number, y: number, t: number, possessionKey: string | null): ControlAction[] {
    if (this.current !== 'idle' || !finite(x) || !finite(y) || !finite(t)) return [];
    this.pointerId = id;
    this.ox = this.lx = x;
    this.oy = this.ly = y;
    this.t0 = t;
    this.maxDist = 0;
    this.possessionKey = possessionKey;
    if (possessionKey === null) this.lastTap = null;
    this.current = 'pending';
    return [];
  }

  pointerMove(id: number, x: number, y: number, t: number): ControlAction[] {
    if (id !== this.pointerId || !finite(x) || !finite(y)) return [];
    // Time first: a late move event after aimDelayMs still means "aim", whatever the frame rate.
    const out = this.update(t);
    this.lx = x;
    this.ly = y;
    const dx = x - this.ox;
    const dy = y - this.oy;
    const dist = Math.hypot(dx, dy);
    this.maxDist = Math.max(this.maxDist, dist);
    if (this.current === 'aiming') {
      out.push({ type: 'aimMove', ...pullFor(dx, dy, this.th) });
    } else if (this.current === 'pending') {
      if (dist > this.th.holdSlop) this.lastTap = null;
      const commit = this.possessionKey === null ? this.th.swipeMin : this.th.swipeCommit;
      if (dist >= commit) {
        out.push({ type: 'dribble', dx, dy });
        this.current = 'spent';
      }
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
    this.maxDist = Math.max(this.maxDist, moved);
    const quickStill = finite(t) && t - this.t0 <= this.tuning.tapMaxMs && this.maxDist <= this.th.holdSlop;
    if (this.current === 'aiming') {
      if (quickStill) {
        out.push({ type: 'aimCancel', reason: 'tap' });
        out.push(...this.tap(t));
      } else {
        const pull = pullFor(dx, dy, this.th);
        out.push(pull.inCancel ? { type: 'aimCancel', reason: 'released in cancel circle' } : { type: 'kick', ...pull });
        this.lastTap = null;
      }
    } else if (this.current === 'pending') {
      if (quickStill) out.push(...this.tap(t));
      else if (moved >= this.th.swipeMin) {
        out.push({ type: 'dribble', dx, dy });
        this.lastTap = null;
      } else this.lastTap = null;
    }
    this.release();
    return out;
  }

  /** Call every frame (and on every event): a press with the ball becomes an aim after aimDelayMs. */
  update(t: number): ControlAction[] {
    if (this.current !== 'pending' || this.possessionKey === null || !finite(t) || t - this.t0 < this.tuning.aimDelayMs) return [];
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
    const key = this.possessionKey;
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
      return [{ type: 'quickShot' }];
    }
    this.lastTap = { x: this.ox, y: this.oy, t, key };
    return [];
  }

  private release(): void {
    this.current = 'idle';
    this.pointerId = null;
    this.possessionKey = null;
    this.maxDist = 0;
  }
}
