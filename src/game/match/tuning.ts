import { ATTACK_TUNING } from './baseTuning';

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
  match: { halfSeconds: 165, displayHalfMinutes: 25, minHalfSeconds: 10, maxHalfSeconds: 1800 },
  /** User carrier movement from the joystick: speed, acceleration and turning are bounded. */
  carrier: {
    speed: D.dribble.speed,
    /** Dribbling back toward the user's own goal is slower. */
    backSpeedFactor: 0.75,
    /**
     * yd/s^2 cap on velocity change. The carrier steers straight at the stick direction; a cut or reversal costs
     * time only through this cap (a 90 deg cut from full speed takes about 0.37 s), never a separate turn-rate brake.
     */
    accel: 20,
  },
  /**
   * One ground kick for passes and shots (user and AI). Power (0..1) sets the roll distance in yards, and launch
   * speed (yd/s) is sqrt(2 * ball.friction * distance), so the ball stops where the guide says. Roll grows linearly
   * from minSpeed's roll (about 4 yd) to passRoll yd over power 0..passPower (the everyday passing range), then
   * eases up to maxSpeed's roll for long balls and shots, with no kink in slope at passPower.
   */
  kick: { minSpeed: 5.3, maxSpeed: D.shot.maxSpeed, passRoll: 34, passPower: 0.7 },
  /** A team must hold the ball this long (sim seconds) before it counts as an established possession spell. */
  possessionEstablishSeconds: 0.6,
  /**
   * Off the ball the user controls one home outfielder: the presser when the opponent has it, the
   * loose-ball chaser otherwise (stable during a friendly pass).
   */
  offBall: {
    minHoldSeconds: 0.6,
    /** Switching back to the player control just left needs this long on the new one (no A-B-A flicker). */
    returnHoldSeconds: 1.5,
  },
  /** Temporary sandbox resets (not formal restarts). */
  stoppage: { goalSeconds: 1.6, outSeconds: 1.2 },
  dribble: D.dribble,
  control: D.control,
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
  /**
   * Shared team shape (shape.ts): one line height, midfield and front unit per team, which every role's anchor is
   * placed from. Yards on the 75 x 50 pitch, team frame (own goal x = 0). Provisional playtest values, not coaching
   * measurements: organised gaps of about 9-14 yd between units and a 22-32 yd settled block.
   */
  teamShape: {
    /** Keeper on the ball: back line height, and how far the outside backs split. */
    gkLine: 14,
    widthGk: 1.5,
    /**
     * In possession the line sits behindBall yards behind the ball, narrowing to behindBallHigh as the ball goes
     * from rampFromX to rampToX, so sustained attacks bring it to halfway; clamped to minLineIn..maxLineIn (halfway 37.5).
     */
    behindBall: 22,
    behindBallHigh: 16,
    rampFromX: 40,
    rampToX: 60,
    minLineIn: 12,
    maxLineIn: 38,
    /** In possession the line stays within this distance ahead of their most advanced outfielder. */
    restAhead: 10,
    /** Seconds of unpressured control to reach full possession confidence; a loose ball caps it here. */
    confidenceSeconds: 1.2,
    looseConfidence: 0.3,
    transitionSeconds: 1.5,
    /** Out of possession: line depth behind the ball when organised, stepping up, or protecting depth. */
    blockGap: 15,
    stepGap: 10,
    dangerGap: 19,
    minLineOut: 7,
    maxLineOut: 36,
    minBehindBall: 3,
    /** An opponent this close in front of the line (or behind it) is a runner the line must respect. */
    runnerNear: 6,
    /** Space behind the line (beyond the keeper's sweep) that makes a forward pass credible. */
    spaceBehind: 8,
    keeperSweep: 4,
    /** Their loose pass moving toward their own goal faster than this is a backward pass (step up). */
    backPassSpeed: 3,
    stepHoldSeconds: 1.5,
    recoverHoldSeconds: 1.2,
    /** Effective pressure: within pressTight, or within pressReach, goal-side and closing faster than pressClosing. */
    pressTight: 2.2,
    pressReach: 5,
    pressClosing: 1.2,
    /** Carrier speed toward/away from our goal that counts as facing forward/backward (yd/s). */
    facingSpeed: 0.8,
    /** How fast the shared line height can move (yd/s): it drops faster than it climbs. */
    lineUpSpeed: 4.5,
    lineDropSpeed: 7,
    unitGapMin: 9,
    unitGapMax: 13,
    unitGapMaxIn: 16,
    maxSpan: 30,
    maxSpanIn: 34,
    widthIn: 1.15,
    widthOut: 0.8,
    shiftIn: 0.25,
    shiftOut: 0.45,
    /** A defender tracks a runner moving toward goal faster than runSpeed within this distance in front of the line. */
    trackAhead: 8,
    runSpeed: 2,
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
    /** Presser reaction lag (s): he closes on the carrier as read this long ago, so a well-timed cut can beat him. */
    readSeconds: 0.25,
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
  /**
   * Passing and shooting accuracy (brief v1.1, `kicking.ts`). Yards, seconds, radians. Provisional playtest values
   * calibrated against this engine's constant ground deceleration (ball.friction 3.5 yd/s^2), not proven optimal.
   */
  kicking: {
    passAimCone: 0.349,
    passMinRange: 3,
    collinearAngle: 0.07,
    switchAngle: 0.105,
    arrivalSpeed: 8,
    firmnessTap: 1,
    firmnessFull: 1.25,
    passMaxSpeed: 18,
    passMinSpeed: 5.3,
    directionalMin: 8,
    directionalMax: 22,
    leadHorizon: 0.35,
    leadMaxDistance: 3,
    leadIterations: 3,
    contactMaxCorrection: 0.07,
    contactMaxShift: 1.5,
    shotAssistMax: 0.0524,
    shotPostInset: 0.4,
    shotErrorBase: 0.05,
    shotErrorPressure: 0.06,
    shotErrorMisalign: 0.05,
    shotErrorEffort: 0.03,
    shotErrorMax: 0.14,
    touchCleanSpeed: 13,
    touchHardSpeed: 22,
    touchBehindPenalty: 0.3,
    touchPressurePenalty: 0.2,
    secureQuality: 0.5,
    deflectQuality: 0.15,
    heavyTouchSpeed: 5,
    touchCushion: 0.5,
    heavyTouchIgnoreSeconds: 0.15,
  },
  /**
   * Joystick + four-button controls (controls brief §15). Provisional playtest values, not proven optimal.
   * Charge times are sim seconds; speeds yd/s; angles radians.
   */
  pad: {
    deadZone: 0.12,
    passChargeSeconds: 0.65,
    shotChargeSeconds: 0.85,
    passPower: { min: 0.12, max: 0.85 },
    shotPower: { min: 0.6, max: 1 },
    prepSeconds: 0.08,
    recoverySeconds: 0.22,
    /** Ball must be this close to the kicker at contact. */
    contactReach: 1.6,
    /** FIFA-style search cone half-angle along the stick (30°). */
    receiverCone: 0.5236,
    receiverMinRange: 3,
    /** Yards from the stick's line that count as one unit of receiver score. */
    receiverLineYards: 4,
    receiverMaxRange: 34,
    /** A highlighted receiver is kept unless another scores better by this margin. */
    receiverStickiness: 0.25,
    /** Max lead correction toward the locked receiver at contact. */
    leadMaxAngle: 0.14,
    /** With a selected receiver the pass may bend up to this much to meet the receiver's run (intercept solve). */
    leadLockAngle: 0.5236,
    leadSeconds: 0.45,
    shotErrorMax: 0.12,
    pressureRadius: 3.5,
    blockSpeedFactor: 0.55,
    blockTurnRate: 5,
    /** BLOCK held near an opponent carrier: FIFA-style jockey (goal-side, lateral mirror, speed matched to the carrier). */
    jockey: {
      radius: 7,
      /** Yards kept between defender and carrier, on the carrier-to-own-goal line. */
      gap: 1.8,
      /** Seconds of carrier velocity the defender mirrors ahead. */
      lookahead: 0.25,
      /** Yards the stick can shade the defender off that line (left/right of the carrier). */
      stickShade: 1.2,
      gain: 3,
      /** Speed floor so a stationary carrier can still be closed down slowly. */
      minSpeed: 1.5,
    },
    blockHalfWidth: 1.1,
    blockDepth: 0.6,
    blockRestitution: 0.45,
    /** Ball radius allowance when sweeping the ball path against the stance line. */
    blockBallRadius: 0.3,
    /** Incoming ball faster than this rebounds off the block and cannot be taken by the blocker straight away. */
    blockHardSpeed: 12,
    blockIgnoreSeconds: 0.35,
    agilityTurnPenalty: 0.5,
    /** FIFA-style stick magnitude bands: light push = close control (tight turns), full push = running (momentum). */
    locomotion: {
      closeControlMax: 0.5,
      runMin: 0.8,
      /** Turn penalty multiplier at close control and at full running (blended between the bands). */
      closeTurnFactor: 0.2,
      runTurnFactor: 1.8,
      /** A reversal sharper than this (cosine) at speed brakes first, then re-accelerates. */
      brakeCos: -0.3,
      brakeMinSpeedFrac: 0.5,
      brakeDoneFrac: 0.15,
      brakeAccel: 7,
    },
    attrRange: { min: 0.8, max: 1.2 },
    slide: {
      startSeconds: 0.12,
      activeSeconds: 0.35,
      recoverySeconds: 0.7,
      cooldownSeconds: 0.3,
      /** Capped at the player's running top speed in sim: a slide is never a speed burst. */
      speed: 6.2,
      steerRate: 1.2,
      ballReach: 0.9,
      bodyReach: 0.75,
      pokeSpeed: 7,
      /** Body contact later than this after the ball touch is still a foul. */
      cleanWindow: 0.25,
      sliderIgnoreSeconds: 0.5,
    },
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
