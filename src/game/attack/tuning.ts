/**
 * Every gameplay number for the training attack, in yards and seconds.
 * Pitch x runs from our half toward the attacking goal at x = 75; y is across (0..50).
 */
export const ATTACK_TUNING = {
  /** Fixed simulation step (sim seconds) and the longest real frame we accept. */
  stepSeconds: 1 / 120,
  maxFrameSeconds: 0.1,

  area: {
    /** Ball crossing x <= minX leaves the training area. */
    minX: 33,
    maxX: 75,
    width: 50,
    goalCenterY: 25,
    goalHalfWidth: 3.5,
    ballRadius: 0.2,
    /** Lateral cuts and support positions keep this far from the touchlines. */
    laneMargin: 3,
  },

  setup: {
    /** Seeded +/- jitter (yards) on defender start positions per attempt. */
    jitter: 1,
  },

  reset: { countdownSeconds: 0.8 },

  dribble: {
    speed: 5.2,
    accel: 22,
    /** One touch cycle: ball pushed out to maxLead, then the carrier catches up to minLead. */
    touchSeconds: 0.45,
    minLead: 0.6,
    maxLead: 1.5,
    /** Forward speed fades to zero this far before (maxX - stopShort). */
    slowZone: 8,
    stopShort: 3,
  },

  swipe: {
    /** Minimum sim time between accepted swipes. */
    cooldownSeconds: 0.5,
  },
  cut: { distance: 6, lateralSpeed: 6.8, forwardSpeed: 3.2, seconds: 0.55, controlCost: 0.3 },
  burst: { ballSpeed: 10.5, runSpeed: 7, seconds: 0.6, controlCost: 0.4 },
  check: { backSpeed: 1.6, seconds: 0.45, controlCost: 0.15 },
  control: { max: 1, regenPerSecond: 0.35 },

  aim: {
    /** Sim-time multiplier while aiming. */
    slowMoScale: 0.3,
    /** Real seconds of slow motion available; refills only while not aiming. */
    slowMoBudgetSeconds: 1.6,
    budgetRegenPerSecond: 0.4,
  },

  pass: { minDistance: 4, maxDistance: 30, arriveSpeed: 8, maxSpeed: 18 },
  shot: { minSpeed: 14, maxSpeed: 27 },
  ball: {
    /** Rolling deceleration (yd/s^2). */
    friction: 3.5,
    /** The kicker cannot touch the ball again for this long. */
    kickerIgnoreSeconds: 0.3,
  },

  receive: { radius: 1.3, maxSpeed: 17, hotTouchFactor: 0.6, meetDistance: 1.5 },
  intercept: {
    radius: 1.1,
    /** Faster balls cannot be secured, only deflected. */
    maxSpeed: 13,
    deflectRadius: 0.9,
    deflectSpeedFactor: 0.45,
    deflectAngle: 0.6,
    ignoreSeconds: 0.3,
  },
  tackle: { radius: 1.2, contactSeconds: 0.3 },

  support: { speed: 5.6, accel: 18, width: 8, depth: 2, insideOffset: 11, crowdDistance: 9 },
  run: {
    speed: 6.6,
    seconds: 2.4,
    cooldownSeconds: 2.5,
    firstDelaySeconds: 0.5,
    /** Run target sits this far beyond the deepest outfield defender. */
    beyondDefence: 7,
    maxX: 66,
    laneClearance: 2,
  },
  chase: { speed: 6.2, accel: 20 },

  defense: {
    pressSpeed: 5,
    coverSpeed: 5.4,
    chaseSpeed: 5.6,
    accel: 16,
    goalSideOffset: 0.8,
    /** Cover defender stands this fraction of the way from the ball to the marked attacker. */
    coverFraction: 0.45,
    swapMargin: 2,
    swapSeconds: 0.4,
  },

  keeper: {
    speed: 3.6,
    /** Dive speed and reach leave roughly the outer 1.5 yd of each post beatable by a hard shot. */
    diveSpeed: 3.4,
    accel: 30,
    reach: 0.9,
    diveReach: 1.25,
    /** Slower balls in reach are caught (attempt ends); faster ones are parried. */
    catchSpeed: 15,
    reactionSeconds: 0.25,
    depth: 1.5,
    /** How far the keeper shades toward the ball's side (0 = stays central, 1 = full). */
    shade: 0.35,
    ignoreSeconds: 0.4,
    parryFactor: 0.35,
  },
} as const;

type Widen<T> = T extends number ? number : { readonly [K in keyof T]: Widen<T[K]> };
export type AttackTuning = Widen<typeof ATTACK_TUNING>;
