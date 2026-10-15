import type { Vec2 } from '../vec';
import type { MutableVec2 } from '../attack/math';
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
export type MatchPhase = 'kickoff' | 'live' | 'aiming' | 'stopped' | 'halftime' | 'fulltime';

/** Formal match clock. Counts sim seconds, so user pauses, backgrounding and Coach Moments stop it. */
export interface MatchClock {
  half: 1 | 2;
  /** Sim seconds played in the current half. */
  elapsed: number;
  readonly halfSeconds: number;
}

export interface Stoppage {
  readonly reason: 'goal' | 'out';
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

export interface TeamRun {
  runnerId: MatchPlayerId | null;
  until: number;
  cooldownUntil: number;
}

export interface FeintState {
  readonly by: MatchPlayerId;
  readonly start: number;
  readonly until: number;
  /** Side of the shoulder drop (+1/-1 across the carrier's heading). */
  readonly side: number;
  /** Exit direction chosen by a swipe during the feint (world unit vector). */
  exitDir: Vec2 | null;
}

export type MatchEventType =
  | 'kickoff'
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
  | 'feint'
  | 'quickShot'
  | 'rejected'
  | 'swipeRejected'
  | 'aimStart'
  | 'aimCancel'
  | 'paused'
  | 'resumed'
  | 'formation'
  | 'reset'
  | 'slowMoSpent'
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
  /** Off-ball steer from a swipe (world unit vector) until sim time `until`; null = AI movement. */
  userSteer: { dir: Vec2; until: number; epoch: number } | null;
  /** Stable team-possession sequence: bumps only when a team establishes possession. */
  possessionSeq: number;
  /** Team whose current spell is established (see aimAllowance.establishSeconds), or null. */
  establishedTeam: TeamId | null;
  /** Bumped whenever user control changes hands; an aim started under an older epoch is void. */
  controlEpoch: number;
  aim: { direction: Vec2 | null; power: number; epoch: number } | null;
  /** Real seconds of aiming slow motion left for each team's current possession spell. */
  aimAllowance: Record<TeamId, number>;
  /** Set when the opponent secured the ball; the next recovery refills this team's aim allowance. */
  allowanceRefillPending: Record<TeamId, boolean>;
  control: number;
  swipeCooldown: number;
  /** Direction (world unit vector) the user's carrier keeps dribbling in until redirected. */
  dribbleDir: MutableVec2;
  feint: FeintState | null;
  /** Sim time a new feint may start. */
  feintReadyAt: number;
  /** A defender who bit on the feint drifts the wrong way until `until`. */
  feintBought: { id: MatchPlayerId; until: number; dir: Vec2 } | null;
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
  runs: Record<TeamId, TeamRun>;
  /** AI carrier's next decision time. */
  nextDecisionAt: number;
  keeperDiving: Record<TeamId, boolean>;
  score: Record<TeamId, number>;
  stoppage: Stoppage | null;
  /** Two-half match clock, or null in the open-ended sandbox. */
  clock: MatchClock | null;
  stats: { passes: Record<TeamId, number>; shots: Record<TeamId, number>; saves: Record<TeamId, number>; turnovers: number };
  events: MatchEvent[];
}
