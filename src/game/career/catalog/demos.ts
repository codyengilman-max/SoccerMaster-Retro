import type { DemoSpec } from '../types';

type P = { x: number; y: number };
const kf = (pts: readonly P[], seconds: number) => pts.map((p, i) => ({ t: (i / Math.max(1, pts.length - 1)) * seconds, x: p.x, y: p.y }));

/** Ball and player move together through the given points over a practice area of 10 x 6. */
type Marker = { x: number; y: number; kind: 'cone' | 'wall' | 'target' | 'zone' };
export function path(markers: Marker[], ball: P[], player: P[], seconds = 4): DemoSpec {
  return { kind: 'path', markers, ball: kf(ball, seconds), player: kf(player, seconds), seconds };
}

const cone = (x: number, y: number) => ({ x, y, kind: 'cone' as const });

/** Self-roll or serve, then a directional touch out through a two-cone gate. */
export function gate(side: 'left' | 'right' = 'right'): DemoSpec {
  const gy = side === 'right' ? 1.5 : 4.5;
  return path([cone(7, gy - 0.6), cone(7, gy + 0.6)], [{ x: 3, y: 3 }, { x: 4.6, y: 3 }, { x: 5.2, y: 3 }, { x: 7.6, y: gy }], [{ x: 4, y: 3.4 }, { x: 4.8, y: 3.4 }, { x: 5.4, y: 3.3 }, { x: 7.2, y: gy + 0.3 }]);
}

/** Pass to a wall and receive the return. */
export function wall(): DemoSpec {
  return path([{ x: 9.5, y: 3, kind: 'wall' }], [{ x: 4, y: 3 }, { x: 9.3, y: 3 }, { x: 4.4, y: 3.2 }, { x: 5.4, y: 2 }], [{ x: 3.5, y: 3.3 }, { x: 3.5, y: 3.3 }, { x: 4, y: 3.4 }, { x: 5, y: 2.3 }]);
}

/** Pass into a marked zone or gate and stop the ball there. */
export function zone(): DemoSpec {
  return path([{ x: 7.5, y: 3, kind: 'zone' }], [{ x: 2, y: 3 }, { x: 7.4, y: 3 }, { x: 7.5, y: 3 }], [{ x: 1.6, y: 3.3 }, { x: 1.8, y: 3.3 }, { x: 1.8, y: 3.3 }]);
}

/** Carry through a cone course. */
export function course(): DemoSpec {
  const cones = [cone(3, 2), cone(5, 4), cone(7, 2)];
  const route = [{ x: 1, y: 3 }, { x: 3, y: 3.2 }, { x: 4.2, y: 2.4 }, { x: 5.6, y: 3.2 }, { x: 7, y: 3 }, { x: 9, y: 3 }];
  return path(cones, route, route.map((p) => ({ x: p.x - 0.4, y: p.y + 0.3 })), 6);
}

/** Strike along the ground at a target. */
export function target(): DemoSpec {
  return path([{ x: 9.5, y: 1.4, kind: 'target' }, { x: 9.5, y: 4.6, kind: 'target' }], [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 9.3, y: 1.5 }], [{ x: 2.4, y: 3.4 }, { x: 3.6, y: 3.3 }, { x: 3.8, y: 3.3 }]);
}

/** Recovery run: turn, sprint back inside a cone, then reset. */
export function recover(): DemoSpec {
  return path([cone(2, 3), cone(8, 3)], [{ x: 8.5, y: 3 }, { x: 8.5, y: 3 }], [{ x: 6, y: 3 }, { x: 7.5, y: 3 }, { x: 4, y: 2.6 }, { x: 2.4, y: 3 }], 4);
}

/** Still frames for footwork that an animation would misrepresent. */
export function steps(frames: { caption: string; foot: 'left' | 'right' | 'either'; ball: 'inside' | 'outside' | 'sole' | 'front' | 'air' | 'away' }[]): DemoSpec {
  return { kind: 'steps', frames };
}
