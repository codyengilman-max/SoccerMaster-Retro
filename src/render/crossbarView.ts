/**
 * Crossbar challenge view: one perspective transform shared by the backdrop, the goal frame, the
 * ball and the diagnostic hit band. Pure math (no Phaser), so tests can check that what is drawn
 * is exactly where the simulation's goal is. World units are the challenge's metres (CROSSBAR).
 */
import { CROSSBAR } from '../game/story/crossbar';

/** The challenge backdrop (schoolyard_crossbar_background_v2.png): measured fractions of its height. */
export const CROSSBAR_BACKDROP = { width: 1672, height: 941, grassLine: 0.453, roofLine: 0.26 } as const;

/** Camera: behind the spot and at a child's eye height. */
export const CROSSBAR_CAMERA = { back: 4, height: 1.4, horizonFrac: 0.36, bottomMarginFrac: 0.07, maxGoalWidthFrac: 0.92 } as const;

/** Net depth behind the goal line (presentation only; the net is never a scoring target). */
export const NET_DEPTH = { top: 0.8, ground: 1.4 } as const;

export interface Stage { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
export interface ScreenPt { readonly x: number; readonly y: number; readonly k: number }
export interface CrossbarView {
  readonly horizon: number;
  readonly focal: number;
  /** Backdrop placement: top-left corner and uniform scale (cover the stage, grass line on the horizon). */
  readonly backdrop: { readonly x: number; readonly y: number; readonly scale: number };
  readonly proj: (x: number, y: number, z: number) => ScreenPt;
}

/** `stage` is where the goal and spot must fit; `cover` (default: the stage) is the area the backdrop fills. */
export function crossbarView(stage: Stage, cover: Stage = stage): CrossbarView {
  const cam = CROSSBAR_CAMERA;
  const cx = stage.x + stage.width / 2;
  const hy = stage.y + stage.height * cam.horizonFrac;
  const bottom = stage.y + stage.height * (1 - cam.bottomMarginFrac);
  const far = CROSSBAR.spotDistance + cam.back;
  // g = screen drop from the horizon to the goal line; the spot sits far/back times lower.
  const g = Math.max(1, Math.min((bottom - hy) / (far / cam.back), (cam.maxGoalWidthFrac * stage.width) / (CROSSBAR.goalWidth / cam.height)));
  const focal = (g * far) / cam.height;
  const B = CROSSBAR_BACKDROP;
  const above = B.grassLine * B.height;
  const below = (1 - B.grassLine) * B.height;
  const scale = Math.max(cover.width / B.width, (hy - cover.y) / above, (cover.y + cover.height - hy) / below);
  const proj = (x: number, y: number, z: number): ScreenPt => {
    const d = Math.max(0.1, y + cam.back);
    return { x: cx + (x / d) * focal, y: hy + ((cam.height - z) / d) * focal, k: focal / d };
  };
  return { horizon: hy, focal, backdrop: { x: cover.x + cover.width / 2 - (B.width * scale) / 2, y: hy - above * scale, scale }, proj };
}

/** Screen geometry of the one goal, derived from the simulation's goal model. */
export function goalGeometry(v: CrossbarView) {
  const C = CROSSBAR;
  const h = C.goalWidth / 2;
  const gy = C.spotDistance;
  return {
    leftBase: v.proj(-h, gy, 0),
    rightBase: v.proj(h, gy, 0),
    leftTop: v.proj(-h, gy, C.barHeight),
    rightTop: v.proj(h, gy, C.barHeight),
    rearLeftTop: v.proj(-h, gy + NET_DEPTH.top, C.barHeight * 0.85),
    rearRightTop: v.proj(h, gy + NET_DEPTH.top, C.barHeight * 0.85),
    rearLeftBase: v.proj(-h, gy + NET_DEPTH.ground, 0),
    rearRightBase: v.proj(h, gy + NET_DEPTH.ground, 0),
    /** Scoring band: the bar centre line widened by bar + ball radius, exactly as simulateShot sweeps it. */
    barBand: { top: v.proj(0, gy, C.barHeight + C.barRadius + C.ballRadius).y, bottom: v.proj(0, gy, C.barHeight - C.barRadius - C.ballRadius).y },
    /** Drawn frame thickness at true scale, so a ball drawn touching the bar is a ball the simulation says hit it. */
    postWidth: Math.max(MIN_PX, 2 * C.postRadius * v.proj(0, gy, 0).k),
    barWidth: Math.max(MIN_PX, 2 * C.barRadius * v.proj(0, gy, C.barHeight).k),
    spot: v.proj(0, 0, 0),
  };
}

/** Smallest drawn ball radius / frame width; below the true size only at extreme distances. */
const MIN_PX = 1.5;

/**
 * Where and how big to draw the ball at world point `at`, at true scale. Behind the goal line the ball is
 * drawn before the front frame, so a shot that clears the bar and drops into the net passes behind it.
 */
export function ballSprite(v: CrossbarView, at: readonly [number, number, number]): { readonly x: number; readonly y: number; readonly r: number; readonly behindFrame: boolean } {
  const p = v.proj(at[0], at[1], at[2]);
  return { x: p.x, y: p.y, r: Math.max(MIN_PX, CROSSBAR.ballRadius * p.k), behindFrame: at[1] > CROSSBAR.spotDistance };
}
