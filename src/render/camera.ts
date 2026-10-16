import type { Rect } from '../game/vec';

export interface CamPoint {
  readonly x: number;
  readonly y: number;
}

/** Selectable gameplay zoom multipliers (owner picks after the iPhone test). Project tuning, not a measurement. */
export const ZOOM_CHOICES = [1.4, 1.5, 1.6] as const;
export type ZoomChoice = (typeof ZOOM_CHOICES)[number];
export const DEFAULT_ZOOM: ZoomChoice = 1.5;

/**
 * Baseline framing (zoom 1x): the follow camera before the closer-camera revision. Landscape shows
 * 40 yards of pitch length; portrait shows 28 yards across. Every zoom is derived from these constants,
 * never from the previous zoom, so resizes, resets and scene entries cannot compound it.
 */
export const BASELINE_VIEW = {
  landscapeLength: 40,
  portraitCross: 28,
} as const;

/** Accepts only the listed multipliers (number or URL string); anything else is the default. */
export function parseZoom(raw: unknown): ZoomChoice {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : Number.NaN;
  if (!Number.isFinite(n)) return DEFAULT_ZOOM;
  return ZOOM_CHOICES.find((z) => Math.abs(z - n) < 1e-9) ?? DEFAULT_ZOOM;
}

export function nextZoom(z: ZoomChoice): ZoomChoice {
  const i = ZOOM_CHOICES.indexOf(z);
  return ZOOM_CHOICES[(i + 1) % ZOOM_CHOICES.length] ?? DEFAULT_ZOOM;
}

/** Visible span in yards: pitch length in landscape, pitch width (across) in portrait. */
export function viewSpan(orientation: 'landscape' | 'portrait', zoom: unknown): number {
  const z = parseZoom(zoom);
  return (orientation === 'landscape' ? BASELINE_VIEW.landscapeLength : BASELINE_VIEW.portraitCross) / z;
}

/**
 * Camera priority for this frame. `hold`: paused or a tactical/break card — the camera does not move.
 * `aiming`: zoom and focus held at the aim start. `travel`: free ball moving — follow the ball and its
 * path (never a predicted receiver). `loose`: slow free ball. `possession`: follow the carrier.
 */
export type CameraMode = 'possession' | 'aiming' | 'travel' | 'loose' | 'hold';

export interface CameraInput {
  readonly mode: CameraMode;
  readonly ball: CamPoint;
  readonly ballVel: CamPoint;
  /** Carrier position in possession; ignored otherwise. */
  readonly carrier: CamPoint | null;
  /** +1 when the team in possession attacks +x, -1 for -x. */
  readonly attackDir: 1 | -1;
}

export interface CameraBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export const CAMERA_TUNING = {
  /** Yards of look-ahead toward the attacking direction. */
  lookAhead: 6,
  /** Look-ahead eases at this rate (1/s); slow, so a turnover or contested ball cannot swing the view. */
  lookRate: 1.1,
  /** Position smoothing rates (1/s) along and across the pitch. */
  followRate: 2.8,
  crossRate: 2.2,
  /** While the ball travels, aim this many seconds of ball travel ahead of it, capped. */
  travelLead: 0.4,
  travelLeadMax: 7,
  /** A change of attacking direction must last this long (s) before the look-ahead turns: no flip-flop on contested balls. */
  turnHold: 0.45,
  /** Longest frame step the camera integrates; a hitch cannot jump or overshoot. */
  maxDt: 0.1,
} as const;

const finite = (p: CamPoint | null): p is CamPoint => p !== null && Number.isFinite(p.x) && Number.isFinite(p.y);
const clamp = (v: number, lo: number, hi: number): number => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

/** One follow camera for the 9v9 match: pure, frame-rate independent (exponential smoothing). */
export class CameraController {
  x: number;
  y: number;
  look = 0;
  mode: CameraMode = 'possession';
  private aimFocus: CamPoint | null = null;
  /** Attacking direction the look-ahead currently follows, and how long a different one has persisted. */
  private dir: 1 | -1 = 1;
  private otherFor = 0;

  constructor(
    start: CamPoint,
    readonly tuning: typeof CAMERA_TUNING = CAMERA_TUNING,
  ) {
    this.x = start.x;
    this.y = start.y;
  }

  /** Jump straight to a framing (scene entry, Lab reset, kick-off): no blend from a stale position. */
  snap(focus: CamPoint, attackDir: 1 | -1, bounds?: CameraBounds): void {
    if (!finite(focus)) return;
    this.look = attackDir * this.tuning.lookAhead;
    this.dir = attackDir;
    this.otherFor = 0;
    this.aimFocus = null;
    this.x = focus.x + this.look;
    this.y = focus.y;
    if (bounds) this.clampTo(bounds);
  }

  /** Focus this frame wants, before smoothing. */
  target(input: CameraInput): CamPoint {
    const T = this.tuning;
    if (input.mode === 'aiming' && this.aimFocus) return this.aimFocus;
    if (input.mode === 'possession' && finite(input.carrier)) return { x: input.carrier.x + this.look, y: input.carrier.y };
    if (input.mode === 'travel' && finite(input.ball)) {
      const vx = Number.isFinite(input.ballVel.x) ? input.ballVel.x : 0;
      const vy = Number.isFinite(input.ballVel.y) ? input.ballVel.y : 0;
      const lx = clamp(vx * T.travelLead, -T.travelLeadMax, T.travelLeadMax);
      const ly = clamp(vy * T.travelLead, -T.travelLeadMax, T.travelLeadMax);
      return { x: input.ball.x + lx, y: input.ball.y + ly };
    }
    if (finite(input.ball)) return { x: input.ball.x + this.look * 0.5, y: input.ball.y };
    return { x: this.x, y: this.y };
  }

  update(input: CameraInput, dtRaw: number, bounds?: CameraBounds): CamPoint {
    const T = this.tuning;
    const dt = Number.isFinite(dtRaw) ? Math.min(T.maxDt, Math.max(0, dtRaw)) : 0;
    const entering = input.mode !== this.mode;
    this.mode = input.mode;
    if (input.mode === 'hold' || dt === 0) return { x: this.x, y: this.y };
    if (input.mode === 'aiming') {
      // Freeze exactly where the camera is at aim start (no residual easing); look-ahead stays as it was.
      if (entering || !this.aimFocus) this.aimFocus = { x: this.x, y: this.y };
      return { x: this.x, y: this.y };
    } else {
      this.aimFocus = null;
      if (input.mode !== 'loose') {
        this.otherFor = input.attackDir === this.dir ? 0 : this.otherFor + dt;
        if (this.otherFor >= T.turnHold) {
          this.dir = input.attackDir;
          this.otherFor = 0;
        }
        this.look += (this.dir * T.lookAhead - this.look) * (1 - Math.exp(-T.lookRate * dt));
      }
    }
    let t = this.target(input);
    if (bounds)
      t = {
        x: clamp(t.x, bounds.minX, bounds.maxX),
        y: clamp(t.y, bounds.minY, bounds.maxY),
      };
    this.x += (t.x - this.x) * (1 - Math.exp(-T.followRate * dt));
    this.y += (t.y - this.y) * (1 - Math.exp(-T.crossRate * dt));
    if (bounds) this.clampTo(bounds);
    return { x: this.x, y: this.y };
  }

  private clampTo(b: CameraBounds): void {
    this.x = clamp(this.x, b.minX, b.maxX);
    this.y = clamp(this.y, b.minY, b.maxY);
  }
}

/**
 * Clips the segment a->b to `rect`. When b lies outside, returns the point where the segment leaves the
 * rect so the guide can show an honest edge arrow instead of a false endpoint on screen.
 */
export function clipToRect(a: CamPoint, b: CamPoint, rect: Rect): { readonly end: CamPoint; readonly clipped: boolean } {
  const inside = (p: CamPoint): boolean => p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height;
  if (inside(b)) return { end: b, clipped: false };
  if (!inside(a)) return { end: a, clipped: true };
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t = 1;
  if (dx > 0) t = Math.min(t, (rect.x + rect.width - a.x) / dx);
  if (dx < 0) t = Math.min(t, (rect.x - a.x) / dx);
  if (dy > 0) t = Math.min(t, (rect.y + rect.height - a.y) / dy);
  if (dy < 0) t = Math.min(t, (rect.y - a.y) / dy);
  t = Math.max(0, t);
  return { end: { x: a.x + dx * t, y: a.y + dy * t }, clipped: true };
}

/** Keeps a camera focus inside its limits (midpoint when the view is wider than the limits). */
export function clampFocus(p: CamPoint, b: CameraBounds): CamPoint {
  return { x: clamp(p.x, b.minX, b.maxX), y: clamp(p.y, b.minY, b.maxY) };
}
