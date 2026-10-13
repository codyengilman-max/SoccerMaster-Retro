import type { Rect, Vec2 } from './vec';

/**
 * Pitch geometry in yards. Origin is the corner of the left goal line;
 * x runs along the length (goal to goal), y runs across the width.
 *
 * Values are placeholder U11 9v9 dimensions for the foundation milestone,
 * not an approved rules decision.
 */
export interface PitchSpec {
  readonly length: number;
  readonly width: number;
  readonly penaltyAreaDepth: number;
  readonly penaltyAreaWidth: number;
  readonly goalAreaDepth: number;
  readonly goalAreaWidth: number;
  readonly goalWidth: number;
  readonly goalDepth: number;
  readonly centerCircleRadius: number;
  readonly penaltyMarkDistance: number;
  readonly cornerArcRadius: number;
}

export const U11_9V9_PITCH: PitchSpec = {
  length: 75,
  width: 50,
  penaltyAreaDepth: 14,
  penaltyAreaWidth: 36,
  goalAreaDepth: 5,
  goalAreaWidth: 18,
  goalWidth: 7,
  goalDepth: 2,
  centerCircleRadius: 8,
  penaltyMarkDistance: 10,
  cornerArcRadius: 1,
};

export interface PitchMarkings {
  readonly boundary: Rect;
  readonly halfwayX: number;
  readonly centerSpot: Vec2;
  readonly centerCircleRadius: number;
  readonly penaltyAreas: readonly [Rect, Rect];
  readonly goalAreas: readonly [Rect, Rect];
  readonly penaltyMarks: readonly [Vec2, Vec2];
  /** Goal frames sit outside the boundary, behind each goal line. */
  readonly goals: readonly [Rect, Rect];
  readonly corners: readonly [Vec2, Vec2, Vec2, Vec2];
  readonly cornerArcRadius: number;
}

function boxAtGoalLine(spec: PitchSpec, depth: number, span: number, side: 'left' | 'right'): Rect {
  const y = (spec.width - span) / 2;
  const x = side === 'left' ? 0 : spec.length - depth;
  return { x, y, width: depth, height: span };
}

export function validatePitchSpec(spec: PitchSpec): string[] {
  const errors: string[] = [];
  const positive: (keyof PitchSpec)[] = [
    'length',
    'width',
    'penaltyAreaDepth',
    'penaltyAreaWidth',
    'goalAreaDepth',
    'goalAreaWidth',
    'goalWidth',
    'goalDepth',
    'centerCircleRadius',
    'penaltyMarkDistance',
    'cornerArcRadius',
  ];
  for (const key of positive) {
    if (!(spec[key] > 0)) errors.push(`${key} must be positive`);
  }
  if (spec.length <= spec.width) errors.push('length must exceed width');
  if (spec.penaltyAreaWidth >= spec.width) errors.push('penalty area must be narrower than the pitch');
  if (spec.goalAreaWidth >= spec.penaltyAreaWidth) errors.push('goal area must be narrower than the penalty area');
  if (spec.goalWidth >= spec.goalAreaWidth) errors.push('goal must be narrower than the goal area');
  if (spec.goalAreaDepth >= spec.penaltyAreaDepth) errors.push('goal area must be shallower than the penalty area');
  if (spec.penaltyMarkDistance >= spec.penaltyAreaDepth) errors.push('penalty mark must lie inside the penalty area');
  if (spec.penaltyAreaDepth * 2 + spec.centerCircleRadius * 2 >= spec.length) {
    errors.push('penalty areas and centre circle must not overlap');
  }
  return errors;
}

export function pitchMarkings(spec: PitchSpec): PitchMarkings {
  const errors = validatePitchSpec(spec);
  if (errors.length > 0) throw new Error(`Invalid pitch spec: ${errors.join('; ')}`);

  const midY = spec.width / 2;
  const goalY = midY - spec.goalWidth / 2;
  return {
    boundary: { x: 0, y: 0, width: spec.length, height: spec.width },
    halfwayX: spec.length / 2,
    centerSpot: { x: spec.length / 2, y: midY },
    centerCircleRadius: spec.centerCircleRadius,
    penaltyAreas: [
      boxAtGoalLine(spec, spec.penaltyAreaDepth, spec.penaltyAreaWidth, 'left'),
      boxAtGoalLine(spec, spec.penaltyAreaDepth, spec.penaltyAreaWidth, 'right'),
    ],
    goalAreas: [
      boxAtGoalLine(spec, spec.goalAreaDepth, spec.goalAreaWidth, 'left'),
      boxAtGoalLine(spec, spec.goalAreaDepth, spec.goalAreaWidth, 'right'),
    ],
    penaltyMarks: [
      { x: spec.penaltyMarkDistance, y: midY },
      { x: spec.length - spec.penaltyMarkDistance, y: midY },
    ],
    goals: [
      { x: -spec.goalDepth, y: goalY, width: spec.goalDepth, height: spec.goalWidth },
      { x: spec.length, y: goalY, width: spec.goalDepth, height: spec.goalWidth },
    ],
    corners: [
      { x: 0, y: 0 },
      { x: spec.length, y: 0 },
      { x: spec.length, y: spec.width },
      { x: 0, y: spec.width },
    ],
    cornerArcRadius: spec.cornerArcRadius,
  };
}
