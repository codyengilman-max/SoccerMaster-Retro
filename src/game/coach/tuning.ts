/** Every Coach Moment number lives here (yards, sim seconds, degrees). */
export const COACH_TUNING = {
  /** A passing lane is open when no opponent is closer than this to the ball's path. */
  laneOpen: 2.2,
  /** A receiver is open when no opponent is within this distance of him. */
  receiverOpen: 3.5,
  pressureTight: 4,
  pressureLoose: 7,
  /** Free yards in front of the carrier (forward 50° cone) that count as space to carry into. */
  spaceAhead: 9,
  forwardConeDeg: 50,
  shotRange: 24,
  shotAngleMinDeg: 14,
  switchMinDistance: 18,
  nearBall: 12,
  centralBand: 12,
  touchlineBand: 7,
  /** Teammates at least this far beyond the ball (toward our own goal) count as caught upfield. */
  caughtUpfield: 4,
  maxPassDistance: 32,
  /** How long the carrier must have owned the ball before an on-ball moment may open. */
  settledSeconds: 0.4,
  /** Default session plan. */
  moments: { default: 5, min: 4, max: 6 },
  sessionSeconds: 300,
  minGapSeconds: 22,
  /** Observation period after Continue for the actual action and outcome. */
  observeSeconds: 6,
  cueSeconds: 3,
  intentSeconds: 4,
} as const;

type Widen<T> = { readonly [K in keyof T]: T[K] extends number ? number : Widen<T[K]> };
export type CoachTuning = Widen<typeof COACH_TUNING>;
