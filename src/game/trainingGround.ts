import { U11_9V9_PITCH, type PitchSpec } from './pitch';
import type { Vec2 } from './vec';

export interface PlaceholderPlayer {
  readonly id: string;
  readonly shirtNumber: number;
  readonly position: Vec2;
}

export interface PlaceholderBall {
  readonly position: Vec2;
}

/**
 * Static state for the Milestone 1 training ground. Positions are in pitch
 * yards; the renderer only draws what this state says. No movement or rules.
 */
export interface TrainingGroundState {
  readonly pitch: PitchSpec;
  readonly player: PlaceholderPlayer;
  readonly ball: PlaceholderBall;
}

export function createTrainingGroundState(pitch: PitchSpec = U11_9V9_PITCH): TrainingGroundState {
  const center: Vec2 = { x: pitch.length / 2, y: pitch.width / 2 };
  return {
    pitch,
    player: { id: 'placeholder-7', shirtNumber: 7, position: { x: center.x - 2.5, y: center.y + 3 } },
    ball: { position: center },
  };
}
