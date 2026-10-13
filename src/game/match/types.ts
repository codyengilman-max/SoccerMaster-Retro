import type { Vec2 } from '../vec';
import type { MutableVec2 } from '../attack/math';
import type { ActionMode, SwipeKind } from '../attack/sim';
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

export type MatchPhase = 'kickoff' | 'live' | 'aiming' | 'stopped';

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

export interface CarrierMoveState {
  kind: SwipeKind;
  remaining: number;
  sign: number;
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
  | 'swipe'
  | 'swipeRejected'
  | 'aimStart'
  | 'aimCancel'
  | 'paused'
  | 'resumed'
  | 'formation'
  | 'reset'
  | 'slowMoSpent';

export interface MatchEvent {
  readonly seq: number;
  readonly type: MatchEventType;
  readonly at: number;
  readonly by: MatchPlayerId | null;
  readonly detail: string;
}

export interface MatchState {
  phase: MatchPhase;
  paused: boolean;
  simTime: number;
  realTime: number;
  phaseTime: number;
  timeScale: number;
  players: Record<MatchPlayerId, MatchPlayer>;
  ball: MatchBall;
  formations: Record<TeamId, FormationId>;
  /** Team with controlled possession, or the team that played the loose ball last. */
  possession: TeamId;
  /** Home player the user controls. Only meaningful while a home outfield player owns the ball. */
  controlledId: MatchPlayerId;
  /** Bumped whenever user control changes hands; an aim started under an older epoch is void. */
  controlEpoch: number;
  action: ActionMode;
  aim: { direction: Vec2 | null; power: number; epoch: number } | null;
  slowMoBudget: number;
  control: number;
  swipeCooldown: number;
  move: CarrierMoveState | null;
  laneY: number;
  touchPhase: number;
  /** New carrier is safe from tackles until this sim time. */
  protectUntil: number;
  /** Sim time the current owner got the ball. */
  ownedSince: number;
  contact: Record<MatchPlayerId, number>;
  /** A player who just lost a tackle cannot tackle back until this sim time. */
  tackleBan: Partial<Record<MatchPlayerId, number>>;
  defense: Record<TeamId, DefenseAssignment>;
  chaser: Record<TeamId, { id: MatchPlayerId | null; until: number }>;
  runs: Record<TeamId, TeamRun>;
  /** AI carrier's next decision time. */
  nextDecisionAt: number;
  keeperDiving: Record<TeamId, boolean>;
  score: Record<TeamId, number>;
  stoppage: Stoppage | null;
  stats: { passes: Record<TeamId, number>; shots: Record<TeamId, number>; saves: Record<TeamId, number>; turnovers: number };
  events: MatchEvent[];
}
