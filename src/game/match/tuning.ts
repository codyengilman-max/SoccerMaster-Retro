import { ATTACK_TUNING } from '../attack/tuning';

const D = ATTACK_TUNING;

/**
 * Every 9v9 sandbox number, in yards and seconds. Ball, kick, receive, intercept, tackle, dribble,
 * swipe, aim and keeper-save values are the M2 drill's (one set of ball rules for both modes);
 * the rest tune team movement and AI decisions.
 */
export const MATCH_TUNING = {
  stepSeconds: D.stepSeconds,
  maxFrameSeconds: D.maxFrameSeconds,
  pitch: {
    length: 75,
    width: 50,
    goalCenterY: D.area.goalCenterY,
    goalHalfWidth: D.area.goalHalfWidth,
    ballRadius: D.area.ballRadius,
    /** Penalty-area depth/half-width; keepers only handle the ball inside it. */
    boxDepth: 13,
    boxHalfWidth: 13,
    laneMargin: D.area.laneMargin,
  },
  kickoff: { countdownSeconds: 0.8 },
  /**
   * Timed 9v9 match (M4): two halves of `halfSeconds` sim seconds, shown on a 25-minute U11 half
   * clock. Provisional: a short phone-sized match, not real-time youth match length.
   */
  match: { halfSeconds: 240, displayHalfMinutes: 25, minHalfSeconds: 10, maxHalfSeconds: 1800 },
  /** User carrier directional dribbling: swipes set a direction; speed, acceleration and turning are bounded. */
  carrier: {
    speed: D.dribble.speed,
    /** Dribbling back toward the user's own goal is slower. */
    backSpeedFactor: 0.75,
    accel: 9,
    /** Max heading change (rad/s); a reversal slows the carrier before it turns. */
    turnRate: 5,
    /** Speed fraction kept while the heading is still far from the requested direction. */
    minTurnSpeedFactor: 0.3,
    /** Minimum sim time between accepted redirects (spam guard; redirects never add speed). */
    redirectSeconds: 0.12,
  },
  /** One ground kick for passes and shots (user and AI): speed = lerp(minSpeed, maxSpeed, power). */
  kick: { minSpeed: 8, maxSpeed: D.shot.maxSpeed },
  /** Aiming slow motion: real seconds per team possession spell; refills only after the opponent had the ball. */
  aimAllowance: {
    seconds: 2.4,
    /** The opponent must hold the ball this long (sim seconds) before it counts as their possession spell (refill). */
    establishSeconds: 0.6,
  },
  /**
   * Off the ball the user controls one home outfielder: the presser when the opponent has it, the
   * loose-ball chaser otherwise (stable during a friendly pass). A swipe steers him for steerSeconds.
   */
  offBall: {
    steerSeconds: 1.1,
    /** Steered speed is the normal chase speed: no boost for being user-controlled. */
    minHoldSeconds: 0.6,
  },
  feint: {
    seconds: 0.45,
    cooldownSeconds: 1.6,
    /** Carrier speed fraction during the shoulder drop. */
    speedFactor: 0.45,
    /** Exit burst after a chosen exit direction: speed multiplier for exitSeconds (bounded by carrier.speed * this). */
    exitSpeedFactor: 1.25,
    exitSeconds: 0.4,
    /** Defender within this range may bite (seeded chance), drifting the wrong way for biteSeconds. */
    biteRange: 4.5,
    biteChance: 0.55,
    biteSeconds: 0.35,
  },
  /** Temporary sandbox resets (not formal restarts). */
  stoppage: { goalSeconds: 1.6, outSeconds: 1.2 },
  dribble: D.dribble,
  swipe: D.swipe,
  cut: D.cut,
  burst: D.burst,
  check: D.check,
  control: D.control,
  aim: D.aim,
  pass: D.pass,
  shot: D.shot,
  ball: D.ball,
  receive: D.receive,
  intercept: D.intercept,
  tackle: {
    ...D.tackle,
    /** A new carrier cannot be tackled straight back for this long. */
    protectSeconds: 0.7,
    /** ...and the player who lost it cannot tackle straight back for this long. */
    loserBanSeconds: 1.5,
    /** ...and is off balance (cannot intercept or pick up the loose ball) for this long. */
    beatenSeconds: 0.9,
  },
  keeper: {
    ...D.keeper,
    /** Keeper holds a caught ball this long, then distributes automatically (both teams). */
    holdSeconds: 1.1,
    maxHoldSeconds: 2.4,
  },
  coach: {
    /** Longest a Coach Moment intention may steer a player (sim seconds). */
    maxIntentSeconds: 6,
  },
  movement: {
    shapeSpeed: 4.6,
    supportSpeed: 5.6,
    runSpeed: 6.6,
    pressSpeed: 5.4,
    coverSpeed: 5.4,
    chaseSpeed: 6.2,
    recoverSpeed: 6.0,
    trackSpeed: 5.8,
    accel: 16,
    sprintAccel: 20,
    /** AI carrier (opponent) dribble speed; matches the user's automatic dribble. */
    carrySpeed: D.dribble.speed,
  },
  shape: {
    /** How far the block slides with the ball (fraction of the ball's offset from the centre spot). */
    shiftX: 0.55,
    shiftY: 0.3,
    widthShiftY: 0.12,
    /** In possession the block pushes up; out of possession it drops. */
    pushUp: 5,
    dropOff: 4,
    /** Two support targets closer than this are pushed apart. */
    minSpacing: 6,
    /** Attackers stay this far inside the opponent goal line. */
    maxAttackX: 66,
  },
  support: {
    lateral: 9,
    depth: 3,
    laneClearance: 1.8,
    /** Ball-side wide player narrows inside when the ball is this close to its touchline. */
    crowdDistance: 8,
  },
  run: {
    seconds: 2.2,
    cooldownSeconds: 2.6,
    beyondLine: 6,
    /** A run starts only if the carrier has this much room from the nearest opponent. */
    carrierRoom: 3.5,
    /** ...and the gap behind the opposing back line is at least this deep. */
    spaceBehind: 8,
  },
  giveAndGo: { seconds: 1.6, ahead: 6, lateral: 5, blockedRadius: 3 },
  weakSide: { finalThirdX: 50, narrowY: 7 },
  balance: { behindBall: 8, minBehind: 2 },
  defense: {
    goalSideOffset: D.defense.goalSideOffset,
    /** Cover stands this fraction of the way from the ball toward the goal/most dangerous runner. */
    coverFraction: 0.4,
    coverDepth: 5,
    /** Presser/cover stay assigned at least this long (no jitter) unless beaten by switchMargin seconds. */
    commitSeconds: 0.9,
    switchMarginSeconds: 0.6,
    /** Arrival-time penalties by role context (seconds). */
    defenderHighPenalty: 0.6,
    forwardDeepPenalty: 0.6,
    keeperExcluded: true,
    trackRadius: 9,
    protectFraction: 0.45,
    /** Players caught on the wrong side of the ball by this much sprint back. */
    recoverBeyond: 3,
  },
  ai: {
    /** The AI carrier re-evaluates this often, and not sooner than reactionSeconds after receiving. */
    decisionSeconds: 0.3,
    reactionSeconds: 0.4,
    shootRange: 21,
    shotLaneClearance: 1.2,
    passMin: 6,
    passMax: 26,
    passLaneClearance: 1.6,
    leadSeconds: 0.5,
    pressureRadius: 5,
    /** Seeded execution error on AI kicks. */
    aimNoise: 0.06,
    powerNoise: 0.06,
    carryAhead: 6,
    /** Keeps the AI from passing every decision: a pass must beat carrying by this score. */
    passThreshold: 0.3,
    switchBonus: 1.0,
  },
} as const;

type Widen<T> = T extends number ? number : T extends boolean ? boolean : { readonly [K in keyof T]: Widen<T[K]> };
export type MatchTuning = Widen<typeof MATCH_TUNING>;
