import type { Vec2 } from './vec';

export interface MutableVec2 {
  x: number;
  y: number;
}

export const vec = (x: number, y: number): MutableVec2 => ({ x, y });
export const copy = (a: Vec2): MutableVec2 => ({ x: a.x, y: a.y });
export const add = (a: Vec2, b: Vec2): MutableVec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): MutableVec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, k: number): MutableVec2 => ({ x: a.x * k, y: a.y * k });
export const length = (a: Vec2): number => Math.hypot(a.x, a.y);
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerpVec = (a: Vec2, b: Vec2, t: number): MutableVec2 => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

export function normalize(a: Vec2): MutableVec2 {
  const l = length(a);
  return l > 1e-9 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
}

export function rotate(a: Vec2, radians: number): MutableVec2 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}

export function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = sub(b, a);
  const lenSq = dot(ab, ab);
  if (lenSq < 1e-12) return distance(p, a);
  const t = clamp(dot(sub(p, a), ab) / lenSq, 0, 1);
  return distance(p, { x: a.x + ab.x * t, y: a.y + ab.y * t });
}

/** Moves `current` toward `target` by at most `maxDelta` (vector length). */
export function approach(current: Vec2, target: Vec2, maxDelta: number): MutableVec2 {
  const d = sub(target, current);
  const l = length(d);
  if (l <= maxDelta || l < 1e-9) return copy(target);
  return add(current, scale(d, maxDelta / l));
}

/** Velocity that heads to `to` at `maxSpeed`, easing off inside `slowRadius`. */
export function seek(from: Vec2, to: Vec2, maxSpeed: number, slowRadius = 1.5): MutableVec2 {
  const d = sub(to, from);
  const l = length(d);
  if (l < 0.05) return vec(0, 0);
  const speed = maxSpeed * Math.min(1, l / slowRadius);
  return scale(d, speed / l);
}
