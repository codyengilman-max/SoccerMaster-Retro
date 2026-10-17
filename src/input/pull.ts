/** Pull-back aim math for the story crossbar challenge (screen pixels). No Phaser or DOM. */
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

