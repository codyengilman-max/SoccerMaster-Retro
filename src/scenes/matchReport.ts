import type { match } from '../game';
import type { RecognizerState } from '../input';
import type { PitchLayout } from '../render/layout';

export interface MatchPlayerReport {
  readonly team: match.TeamId;
  readonly role: match.RoleId;
  readonly intent: match.Intent;
  readonly keeper: boolean;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly tx: number;
  readonly ty: number;
  /** Screen position of the feet. */
  readonly sx: number;
  readonly sy: number;
}

/** Plain-data snapshot of the 9v9 sandbox exposed through `window.__SMR__` (debug builds only). */
export interface MatchReport {
  readonly phase: match.MatchPhase;
  readonly paused: boolean;
  readonly simTime: number;
  readonly timeScale: number;
  readonly formations: Readonly<Record<match.TeamId, match.FormationId>>;
  readonly possession: match.TeamId;
  readonly controlledId: match.MatchPlayerId;
  readonly owner: match.MatchPlayerId | null;
  readonly userHasBall: boolean;
  readonly action: 'pass' | 'shoot';
  readonly score: Readonly<Record<match.TeamId, number>>;
  readonly stoppage: { readonly reason: string; readonly scorer: match.TeamId | null; readonly restartTeam: match.TeamId } | null;
  readonly defense: Readonly<Record<match.TeamId, { presserId: string | null; coverId: string | null }>>;
  readonly stats: match.MatchState['stats'];
  readonly events: readonly { readonly seq: number; readonly type: match.MatchEventType; readonly by: string | null; readonly detail: string; readonly at: number }[];
  readonly players: Readonly<Record<match.MatchPlayerId, MatchPlayerReport>>;
  readonly ball: { x: number; y: number; vx: number; vy: number; sx: number; sy: number };
  readonly layout: PitchLayout;
  readonly input: RecognizerState;
  readonly aimSource: 'pointer' | 'keyboard' | null;
  readonly holdRadiusPx: number;
  readonly pass: { readonly minDistance: number; readonly maxDistance: number };
  readonly overlay: boolean;
  readonly banner: string;
  readonly toast: string;
  readonly fps: number;
}
