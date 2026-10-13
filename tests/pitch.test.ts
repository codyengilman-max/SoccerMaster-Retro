import { describe, expect, it } from 'vitest';
import { U11_9V9_PITCH, createTrainingGroundState, pitchMarkings, validatePitchSpec } from '../src/game';

describe('U11 9v9 pitch geometry', () => {
  it('default spec is internally consistent', () => {
    expect(validatePitchSpec(U11_9V9_PITCH)).toEqual([]);
  });

  it('derives symmetric markings centred on the pitch', () => {
    const m = pitchMarkings(U11_9V9_PITCH);
    expect(m.halfwayX).toBe(U11_9V9_PITCH.length / 2);
    expect(m.centerSpot).toEqual({ x: 37.5, y: 25 });

    const [leftBox, rightBox] = m.penaltyAreas;
    expect(leftBox.x).toBe(0);
    expect(rightBox.x + rightBox.width).toBe(U11_9V9_PITCH.length);
    expect(leftBox.y + leftBox.height / 2).toBe(U11_9V9_PITCH.width / 2);
    expect(rightBox.y).toBe(leftBox.y);

    const [leftGoal, rightGoal] = m.goals;
    expect(leftGoal.x + leftGoal.width).toBe(0);
    expect(rightGoal.x).toBe(U11_9V9_PITCH.length);
    expect(leftGoal.height).toBe(U11_9V9_PITCH.goalWidth);
  });

  it('rejects impossible specs', () => {
    expect(() => pitchMarkings({ ...U11_9V9_PITCH, goalWidth: 40 })).toThrow(/Invalid pitch spec/);
    expect(validatePitchSpec({ ...U11_9V9_PITCH, length: 40 })).toContain('length must exceed width');
  });

  it('places the static player and ball on the pitch', () => {
    const state = createTrainingGroundState();
    for (const p of [state.player.position, state.ball.position]) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(state.pitch.length);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(state.pitch.width);
    }
    expect(state.ball.position).toEqual(pitchMarkings(state.pitch).centerSpot);
  });
});
