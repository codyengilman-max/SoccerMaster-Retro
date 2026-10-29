import type { Rect } from '../game/vec';

export interface CamPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Fixed framing for the ball-focused dribbling camera (owner request 2026-10-17, FIFA "Dynamic" reference):
 * short range, low viewing angle with real perspective, close zoom. Landscape shows this many yards of pitch length; portrait this many
 * across. `tilt` foreshortens the depth axis on screen to suggest a low camera height.
 */
export const CAMERA_VIEW = {
  landscapeLength: 32,
  portraitCross: 22,
  landscapeTilt: 0.5,
  /** Perspective strength: the far screen edge is drawn at about 1 / (1 + perspective) of the anchor size. */
  perspective: 0.3,
} as const;

/**
 * Regular-match elevated sideline broadcast view (owner spec 2026-10-29): pitch length horizontal, camera always on
 * the same touchline, higher than the close ball camera so passing lanes and defensive spacing read, fixed zoom.
 * Training, Jungle Ball and other modes keep CAMERA_VIEW.
 */
export const SIDELINE_VIEW = {
  landscapeLength: 44,
  /** Depth foreshortening (screen yards per world yard across); higher = more elevated. */
  landscapeTilt: 0.62,
  perspective: 0.16,
  /** Yards past each goal line the view may reach, so the whole goal and its depth stay framed. */
  goalRunoff: 4,
} as const;

/** Sideline camera tuning: a small central dead zone, modest slow look-ahead, gentle follow (no snapping). */
export const SIDELINE_TUNING = {
  lookAhead: 4,
  lookRate: 0.9,
  followRate: 3.2,
  crossRate: 2.6,
  ballLead: 0.3,
  ballLeadMax: 4,
  turnHold: 0.5,
  maxDt: 0.1,
  deadZoneX: 2,
  deadZoneY: 1.5,
} as const;

/** Visible span in yards: pitch length in landscape, pitch width (across) in portrait. */
export function viewSpan(orientation: 'landscape' | 'portrait'): number {
  return orientation === 'landscape' ? CAMERA_VIEW.landscapeLength : CAMERA_VIEW.portraitCross;
}

/**
 * Camera priority for this frame. `hold`: paused or a tactical/break card — the camera does not move.
 * `travel`: free ball moving — follow the ball and its
 * path (never a predicted receiver). `loose`: slow free ball. `possession`: follow the carrier.
 */
export type CameraMode = 'possession' | 'travel' | 'loose' | 'hold';

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
  /** Small yards of look-ahead toward the attacking direction while the ball is carried. */
  lookAhead: 2.5,
  lookRate: 1.6,
  /** Position smoothing rates (1/s): tight, so the ball stays near the centre of a close view. */
  followRate: 6,
  crossRate: 5.5,
  /** Aim this many seconds of ball travel ahead of the ball (dribbled or free), capped in yards. */
  ballLead: 0.35,
  ballLeadMax: 4,
  /** A change of attacking direction must last this long (s) before the look-ahead turns: no flip-flop on contested balls. */
  turnHold: 0.35,
  /** Longest frame step the camera integrates; a hitch cannot jump or overshoot. */
  maxDt: 0.1,
} as const;

const finite = (p: CamPoint | null): p is CamPoint => p !== null && Number.isFinite(p.x) && Number.isFinite(p.y);
const clamp = (v: number, lo: number, hi: number): number => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

/** Ball-focused dribbling camera for the 9v9 match: pure, frame-rate independent (exponential smoothing). */
export type CameraTuning = { readonly [K in keyof typeof CAMERA_TUNING]: number } & { readonly deadZoneX?: number; readonly deadZoneY?: number };

export class CameraController {
  x: number;
  y: number;
  look = 0;
  mode: CameraMode = 'possession';
  /** Attacking direction the look-ahead currently follows, and how long a different one has persisted. */
  private dir: 1 | -1 = 1;
  private otherFor = 0;

  constructor(
    start: CamPoint,
    readonly tuning: CameraTuning = CAMERA_TUNING,
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
    this.x = focus.x + this.look;
    this.y = focus.y;
    if (bounds) this.clampTo(bounds);
  }

  /** Focus this frame wants, before smoothing: always the ball, led along its motion. */
  target(input: CameraInput): CamPoint {
    const T = this.tuning;
    const base = finite(input.ball) ? input.ball : input.mode === 'possession' && finite(input.carrier) ? input.carrier : null;
    if (!base) return { x: this.x, y: this.y };
    const vx = Number.isFinite(input.ballVel.x) ? input.ballVel.x : 0;
    const vy = Number.isFinite(input.ballVel.y) ? input.ballVel.y : 0;
    const look = input.mode === 'possession' ? this.look : 0;
    return {
      x: base.x + clamp(vx * T.ballLead + look, -T.ballLeadMax, T.ballLeadMax),
      y: base.y + clamp(vy * T.ballLead, -T.ballLeadMax, T.ballLeadMax),
    };
  }

  update(input: CameraInput, dtRaw: number, bounds?: CameraBounds): CamPoint {
    const T = this.tuning;
    const dt = Number.isFinite(dtRaw) ? Math.min(T.maxDt, Math.max(0, dtRaw)) : 0;
    this.mode = input.mode;
    if (input.mode === 'hold' || dt === 0) return { x: this.x, y: this.y };
    if (input.mode !== 'loose') {
      this.otherFor = input.attackDir === this.dir ? 0 : this.otherFor + dt;
      if (this.otherFor >= T.turnHold) {
        this.dir = input.attackDir;
        this.otherFor = 0;
      }
      this.look += (this.dir * T.lookAhead - this.look) * (1 - Math.exp(-T.lookRate * dt));
    }
    let t = this.target(input);
    if (bounds)
      t = {
        x: clamp(t.x, bounds.minX, bounds.maxX),
        y: clamp(t.y, bounds.minY, bounds.maxY),
      };
    // Dead zone: small offsets inside it leave the camera still; beyond it only the excess is followed.
    const dz = (d: number, z: number | undefined): number => (!z ? d : Math.abs(d) <= z ? 0 : d - Math.sign(d) * z);
    this.x += dz(t.x - this.x, T.deadZoneX) * (1 - Math.exp(-T.followRate * dt));
    this.y += dz(t.y - this.y, T.deadZoneY) * (1 - Math.exp(-T.crossRate * dt));
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
