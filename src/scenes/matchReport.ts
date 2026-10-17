import type { coach, match } from '../game';
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
  /** Career Team Training progress, or null outside Team Training. */
  readonly teamTraining?: { readonly phase: string; readonly week: number; readonly index: number; readonly ids: readonly string[]; readonly scores: readonly number[]; readonly message: string } | null;
  /** M6: career evidence recording for the career player's slot, or null outside career play. */
  readonly career?: { readonly slot: string; readonly pending: number; readonly batches: number; readonly recorded: number; readonly missed: number } | null;
  readonly phase: match.MatchPhase;
  /** M4 timed match clock; null in the open-ended sandbox (`?sandbox`). */
  readonly clock: { readonly half: 1 | 2; readonly elapsed: number; readonly halfSeconds: number; readonly label: string } | null;
  readonly result: match.MatchResult | null;
  /** Half-time or full-time card on screen. */
  readonly breakPanel: 'halftime' | 'fulltime' | null;
  readonly paused: boolean;
  readonly simTime: number;
  readonly timeScale: number;
  readonly formations: Readonly<Record<match.TeamId, match.FormationId>>;
  readonly possession: match.TeamId;
  readonly controlledId: match.MatchPlayerId;
  readonly owner: match.MatchPlayerId | null;
  readonly userHasBall: boolean;
  readonly dribbleDir: { readonly x: number; readonly y: number };
  readonly score: Readonly<Record<match.TeamId, number>>;
  readonly stoppage: { readonly reason: string; readonly scorer: match.TeamId | null; readonly restartTeam: match.TeamId } | null;
  readonly defense: Readonly<Record<match.TeamId, { presserId: string | null; coverId: string | null }>>;
  readonly stats: match.MatchState['stats'];
  readonly events: readonly { readonly seq: number; readonly type: match.MatchEventType; readonly by: string | null; readonly detail: string; readonly at: number }[];
  readonly players: Readonly<Record<match.MatchPlayerId, MatchPlayerReport>>;
  readonly ball: { x: number; y: number; vx: number; vy: number; sx: number; sy: number };
  readonly layout: PitchLayout;
  /** Ball camera: visible span (yards), controller mode and focus. */
  readonly camera: {
    readonly viewLength: number;
    readonly viewCross: number;
    readonly mode: 'possession' | 'travel' | 'loose' | 'hold';
    readonly x: number;
    readonly y: number;
    readonly look: number;
    readonly guideOffscreen: boolean;
  };
  readonly controlScheme: 'pad';
  readonly pad: {
    readonly phase: string;
    readonly actor: string | null;
    readonly receiver: string | null;
    readonly stick: { readonly x: number; readonly y: number };
    readonly available: Readonly<Record<'pass' | 'shoot' | 'slide' | 'block', boolean>> | null;
    readonly pressed: 'pass' | 'shoot' | 'slide' | 'block' | null;
  };
  readonly inputLog: readonly string[];
  readonly pass: { readonly minDistance: number; readonly maxDistance: number };
  readonly overlay: boolean;
  readonly banner: string;
  readonly toast: string;
  readonly fps: number;
  readonly pauseReasons: { readonly user: boolean; readonly coach: boolean };
  readonly coachIntent: match.CoachIntent | null;
  readonly coach: CoachReport | null;
}

export interface CoachReport {
  readonly sessionId: string;
  readonly phase: coach.CoachPhase;
  readonly overlay: 'hidden' | 'question' | 'feedback' | 'summary';
  readonly target: number;
  readonly sessionSeconds: number;
  readonly view: {
    readonly momentId: string;
    readonly templateId: string;
    readonly topic: coach.Topic;
    readonly question: string;
    readonly options: readonly { readonly id: string; readonly text: string; readonly grade: coach.Grade; readonly intention: coach.Intention['kind'] }[];
    readonly highlights: readonly coach.Highlight['kind'][];
  } | null;
  readonly selected: string | null;
  readonly cue: coach.CoachCue | null;
  readonly entries: readonly Omit<coach.LearningEntry, 'sessionId' | 'facts' | 'options' | 'intention'>[];
  readonly summary: coach.CoachSummary | null;
}
