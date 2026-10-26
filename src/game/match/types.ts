import type { RestartKind } from './referee';
import type { Vec2 } from '../vec';
import type { MutableVec2 } from '../math';
import type { FormationId, RoleId } from './formations';

export type TeamId = 'home' | 'away';
export const TEAM_IDS: readonly TeamId[] = ['home', 'away'];
export const otherTeam = (t: TeamId): TeamId => (t === 'home' ? 'away' : 'home');

/** Home = user team (H1..H9, attacks toward x = 75). Away = AI team (A1..A9, attacks toward x = 0). Slot 1 is the keeper. */
export const HOME_IDS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9'] as const;
export const AWAY_IDS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'] as const;
export type MatchPlayerId = (typeof HOME_IDS)[number] | (typeof AWAY_IDS)[number];
export const MATCH_PLAYER_IDS: readonly MatchPlayerId[] = [...HOME_IDS, ...AWAY_IDS];
export const TEAM_PLAYER_IDS: Readonly<Record<TeamId, readonly MatchPlayerId[]>> = { home: HOME_IDS, away: AWAY_IDS };

export type Intent =
  | 'carry'
  | 'receive'
  | 'chase'
  | 'support'
  | 'width'
  | 'depth'
  | 'run'
  | 'giveAndGo'
  | 'weakSide'
  | 'balance'
  | 'press'
  | 'cover'
  | 'protect'
  | 'track'
  | 'hold'
  | 'recover'
  | 'keeper'
  | 'distribute';

export interface MatchPlayer {
  readonly id: MatchPlayerId;
  readonly team: TeamId;
  /** Formation slot (0 = keeper). Stable for the whole sandbox; formation changes remap slot -> role. */
  readonly slot: number;
  role: RoleId;
  readonly isKeeper: boolean;
  pos: MutableVec2;
  vel: MutableVec2;
  intent: Intent;
  /** Where the AI wants this player to go (world yards). */
  target: MutableVec2;
  /** Formation anchor after shifting with the ball (world yards); a guide, not a pin. */
  anchor: MutableVec2;
  /** Sim time a committed intent (run, give-and-go) lasts until. */
  intentUntil: number;
  /** Speed cap for the current intent. */
  speed: number;
  /** Movement attributes as multipliers (1 = squad average). */
  attrs: PlayerAttrs;
}

export interface PlayerAttrs {
  readonly pace: number;
  readonly accel: number;
  readonly agility: number;
  readonly control: number;
  /** Pass speed cap (career passing); 1 when unknown. */
  readonly passing: number;
  /** Shot execution precision (career finishing); 1 when unknown. */
  readonly finishing: number;
}

export type PadAction = 'pass' | 'shoot' | 'slide' | 'block';
export type PadPhase =
  | 'ready'
  | 'chargingPass'
  | 'chargingShoot'
  | 'kickPrep'
  | 'kickRecovery'
  | 'blocking'
  | 'slideStart'
  | 'slideActive'
  | 'slideRecovery';

/** Joystick + four-button control state (controls=pad). */
/** Immutable snapshot of a released kick: what was asked for, locked until contact (or cancellation). */
export interface PadLock {
  readonly kind: 'pass' | 'shot';
  /** Intended (assisted) direction; execution error is applied once at contact. */
  readonly dir: Vec2;
  readonly power: number;
  readonly receiver: MatchPlayerId | null;
  /** 0..1 charge fraction, launch speed (yd/s), receiving point or goal-plane hit. */
  readonly charge: number;
  readonly speed: number;
  readonly target: Vec2 | null;
  /** Command id of the release and its sim time. */
  readonly id: number;
  readonly at: number;
  /** Raw requested aim before assistance. */
  readonly aim: Vec2;
  readonly fallback: boolean;
}

export interface PadState {
  /** Pitch-space stick vector, length 0..1. */
  stick: MutableVec2;
  /** Controlled player's body facing (unit). */
  facing: MutableVec2;
  phase: PadPhase;
  /** Mid-reversal brake at running pace (FIFA-style momentum); cleared when slow enough or the turn eases. */
  braking: boolean;
  /** BLOCK held near an opponent carrier: auto-tracking goal-side of them. */
  jockeying: boolean;
  actor: MatchPlayerId | null;
  since: number;
  /** controlEpoch and ownedSince when the action began: any change invalidates a kick. */
  epoch: number;
  ownedSince: number;
  chargeStart: number;
  receiver: MatchPlayerId | null;
  /** Last meaningful (outside the dead zone) stick direction during the current charge. */
  aim: MutableVec2;
  aimSet: boolean;
  locked: PadLock | null;
  slideDir: MutableVec2 | null;
  ballTouchedAt: number | null;
  bodyResolved: boolean;
  lastCmdId: number;
  readyAt: number;
}

export interface MatchKick {
  readonly by: MatchPlayerId;
  readonly team: TeamId;
  readonly kind: 'pass' | 'shot' | 'touch' | 'clearance';
  readonly at: number;
  readonly target: Vec2 | null;
  readonly receiver: MatchPlayerId | null;
}

export interface MatchBall {
  pos: MutableVec2;
  vel: MutableVec2;
  owner: MatchPlayerId | null;
  kick: MatchKick | null;
  ignore: { id: MatchPlayerId; until: number }[];
  /** Team that last touched the ball (decides out-of-play restarts). */
  lastTouch: TeamId;
}

/** `halftime` and `fulltime` exist only in a timed match (M4); the open-ended sandbox never reaches them. */
export type MatchPhase = 'kickoff' | 'live' | 'stopped' | 'halftime' | 'fulltime';

/** Formal match clock. Counts sim seconds, so user pauses, backgrounding and Coach Moments stop it. */
export interface MatchClock {
  half: 1 | 2;
  /** Sim seconds played in the current half. */
  elapsed: number;
  readonly halfSeconds: number;
}

export interface Stoppage {
  readonly reason: 'goal' | 'out' | 'foul' | 'offside';
  /** Formal restart the referee awarded (see referee.ts). */
  readonly restart: RestartKind;
  /** Named taker (the fouled player for a penalty), else the referee picks the nearest player. */
  readonly taker: MatchPlayerId | null;
  readonly scorer: TeamId | null;
  readonly detail: string;
  /** Team that restarts after the sandbox reset. */
  readonly restartTeam: TeamId;
  readonly spot: Vec2;
  readonly until: number;
}

export interface DefenseAssignment {
  presserId: MatchPlayerId | null;
  coverId: MatchPlayerId | null;
  until: number;
}

export type ShapePhase =
  | 'gkBuild'
  | 'build'
  | 'advance'
  | 'attack'
  | 'transitionWon'
  | 'transitionLost'
  | 'press'
  | 'midBlock'
  | 'lowBlock'
  | 'recover';

/** One team's shared shape (shape.ts), team frame (own goal x = 0). Mutated in place every plan. */
export interface TeamShape {
  phase: ShapePhase;
  phaseSince: number;
  possessionSince: number;
  hadPossession: boolean;
  /** 0..1: how secure our possession is (0 out of possession). */
  confidence: number;
  /** 0..1 pressure on the current carrier from the team without the ball; effective = true pressure. */
  pressure: number;
  effectivePressure: boolean;
  /** Their carrier is facing our goal with time (out of possession only). */
  carrierForward: boolean;
  /** Desired back-line height this step, and the smoothed height the anchors use. */
  lineDesired: number;
  lineX: number;
  /** Actual height of our deepest back-line player. */
  lineActual: number;
  midX: number;
  frontX: number;
  shiftY: number;
  width: number;
  /** Their outfielder nearest our goal. */
  threatX: number;
  /** Actual offside boundary we hold: second-last of our players, the ball or halfway (whichever is nearest our goal). */
  offsideX: number;
  stepUntil: number;
  recoverUntil: number;
  lastTime: number;
  reason: string;
  /** Movement reason for each of our outfielders this step (debug overlay and tests). */
  why: Partial<Record<MatchPlayerId, string>>;
}

export interface TeamRun {
  runnerId: MatchPlayerId | null;
  until: number;
  cooldownUntil: number;
}


export type MatchEventType =
  | 'kickoff'
  | 'padPress'
  | 'padRelease'
  | 'padCancel'
  | 'slide'
  | 'block'
  | 'deflect'
  | 'foul'
  | 'offside'
  | 'live'
  | 'pass'
  | 'shot'
  | 'received'
  | 'intercepted'
  | 'tackle'
  | 'deflected'
  | 'saved'
  | 'parried'
  | 'distributed'
  | 'possession'
  | 'control'
  | 'goal'
  | 'out'
  | 'restart'
  | 'dribble'
  | 'quickShot'
  | 'rejected'
  | 'swipeRejected'
  | 'paused'
  | 'resumed'
  | 'formation'
  | 'reset'
  | 'coachHold'
  | 'coachRelease'
  | 'coachIntent'
  | 'coachIntentEnd'
  | 'halftime'
  | 'secondHalf'
  | 'fulltime';

export type CoachIntentKind = 'support' | 'run' | 'width' | 'press' | 'cover' | 'protect';

/** A bounded, temporary instruction for one home outfield player, applied through the normal AI movement. */
export interface CoachIntent {
  readonly playerId: MatchPlayerId;
  readonly kind: CoachIntentKind;
  /** World yards. Players still move with their normal speed caps and acceleration. */
  readonly target: Vec2;
  readonly until: number;
  /** Team in possession when issued; any change of possession ends the intent. */
  readonly possession: TeamId;
  readonly source: string;
}

export interface MatchEvent {
  readonly seq: number;
  readonly type: MatchEventType;
  readonly at: number;
  readonly by: MatchPlayerId | null;
  readonly detail: string;
}

export interface MatchState {
  phase: MatchPhase;
  /** True while any pause reason holds. */
  paused: boolean;
  /** Independent pause reasons: the user's pause (also used for backgrounding) and a Coach Moment hold. */
  pauseReasons: { user: boolean; coach: boolean };
  coachIntent: CoachIntent | null;
  simTime: number;
  realTime: number;
  phaseTime: number;
  timeScale: number;
  players: Record<MatchPlayerId, MatchPlayer>;
  ball: MatchBall;
  formations: Record<TeamId, FormationId>;
  /** Team with controlled possession, or the team that played the loose ball last. */
  possession: TeamId;
  /** Home outfielder the user controls: the carrier in possession, otherwise the selected defender/chaser. */
  controlledId: MatchPlayerId;
  /** Sim time control last moved to another player (off-ball selection hysteresis). */
  controlSince: number;
  /** A swipe made just before our pass arrives, applied to that receiver's first controlled touch only. */
  /** The player control last moved away from, so it cannot bounce straight back (offBall.returnHoldSeconds). */
  prevControlledId: MatchPlayerId | null;
  /** Stable team-possession sequence: bumps only when a team establishes possession. */
  possessionSeq: number;
  /** Team whose current spell is established (see aimAllowance.establishSeconds), or null. */
  establishedTeam: TeamId | null;
  /** Bumped whenever user control changes hands; an aim started under an older epoch is void. */
  controlEpoch: number;
  control: number;
  /** Direction (world unit vector) the user's carrier keeps dribbling in until redirected. */
  dribbleDir: MutableVec2;
  touchPhase: number;
  /** New carrier is safe from tackles until this sim time. */
  protectUntil: number;
  /** Sim time the current owner got the ball. */
  ownedSince: number;
  contact: Record<MatchPlayerId, number>;
  /** A player who just lost a tackle cannot tackle back until this sim time. */
  tackleBan: Partial<Record<MatchPlayerId, number>>;
  /** A player who just lost a tackle is off balance: no interceptions or loose-ball pickups until this sim time. */
  beatenUntil: Partial<Record<MatchPlayerId, number>>;
  defense: Record<TeamId, DefenseAssignment>;
  chaser: Record<TeamId, { id: MatchPlayerId | null; until: number }>;
  /** Where pressers think the ball is: the ball focus seen through a short reaction lag (defense.readSeconds). */
  pressRead: MutableVec2;
  runs: Record<TeamId, TeamRun>;
  /** Shared team shape per team (shape.ts). */
  shape: Record<TeamId, TeamShape>;
  /** AI carrier's next decision time. */
  nextDecisionAt: number;
  keeperDiving: Record<TeamId, boolean>;
  score: Record<TeamId, number>;
  stoppage: Stoppage | null;
  /** Throw-in or penalty waiting to be taken: the taker (and for a penalty everyone) is held until the ball is played. */
  setPiece: { readonly kind: RestartKind; readonly taker: MatchPlayerId; readonly since: number } | null;
  /** Two-half match clock, or null in the open-ended sandbox. */
  clock: MatchClock | null;
  stats: { passes: Record<TeamId, number>; shots: Record<TeamId, number>; saves: Record<TeamId, number>; turnovers: number };
  events: MatchEvent[];
  pad: PadState;
}

/** One teammate considered by the assisted-pass search (debug only). */
export interface PassScanEntry {
  id: MatchPlayerId;
  /** Radians off the stick direction. */
  angle: number;
  /** Yards from the stick's line. */
  perp: number;
  dist: number;
  /** Lower is better; only meaningful when inCone. */
  score: number;
  inCone: boolean;
}

export interface PassScan {
  aimX: number;
  aimY: number;
  count: number;
  chosen: MatchPlayerId | null;
  readonly entries: PassScanEntry[];
}
