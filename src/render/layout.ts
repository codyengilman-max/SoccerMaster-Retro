// Pure viewport math for drawing the pitch. No Phaser imports so it can be unit tested.
import type { Rect, Vec2 } from '../game';

export type Orientation = 'portrait' | 'landscape';

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Maps pitch yards to screen pixels. In landscape the pitch length runs
 * left-to-right; in portrait it runs bottom-to-top so it fills a tall phone.
 */
export interface PitchLayout {
  readonly orientation: Orientation;
  readonly scale: number;
  readonly originX: number;
  readonly originY: number;
  readonly pitchLength: number;
  readonly pitchWidth: number;
}

export function orientationOf(viewport: Viewport): Orientation {
  return viewport.height > viewport.width ? 'portrait' : 'landscape';
}

/**
 * Fits a pitch (plus `marginYards` of run-off on every side, which must hold
 * the goals) inside the viewport minus `insets`, centred in the remaining area.
 */
export function fitPitch(
  viewport: Viewport,
  pitchLength: number,
  pitchWidth: number,
  insets: Insets = NO_INSETS,
  marginYards = 4,
): PitchLayout {
  const orientation = orientationOf(viewport);
  const regionX = insets.left;
  const regionY = insets.top;
  const regionW = Math.max(1, viewport.width - insets.left - insets.right);
  const regionH = Math.max(1, viewport.height - insets.top - insets.bottom);

  const longExtent = pitchLength + marginYards * 2;
  const shortExtent = pitchWidth + marginYards * 2;
  const extentW = orientation === 'landscape' ? longExtent : shortExtent;
  const extentH = orientation === 'landscape' ? shortExtent : longExtent;

  const scale = Math.min(regionW / extentW, regionH / extentH);
  const drawnW = extentW * scale;
  const drawnH = extentH * scale;
  const originX = regionX + (regionW - drawnW) / 2 + marginYards * scale;
  const originY = regionY + (regionH - drawnH) / 2 + marginYards * scale;

  return { orientation, scale, originX, originY, pitchLength, pitchWidth };
}

export function toScreen(layout: PitchLayout, point: Vec2): Vec2 {
  const s = layout.scale;
  if (layout.orientation === 'landscape') {
    return { x: layout.originX + point.x * s, y: layout.originY + point.y * s };
  }
  return { x: layout.originX + point.y * s, y: layout.originY + (layout.pitchLength - point.x) * s };
}

export function rectToScreen(layout: PitchLayout, rect: Rect): Rect {
  const a = toScreen(layout, { x: rect.x, y: rect.y });
  const b = toScreen(layout, { x: rect.x + rect.width, y: rect.y + rect.height });
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
}

/** Points along a circular arc in pitch space (angles in radians). */
export function arcPoints(center: Vec2, radius: number, startAngle: number, endAngle: number, segments = 12): Vec2[] {
  const points: Vec2[] = [];
  const steps = Math.max(1, Math.floor(segments));
  for (let i = 0; i <= steps; i++) {
    const t = startAngle + ((endAngle - startAngle) * i) / steps;
    points.push({ x: center.x + Math.cos(t) * radius, y: center.y + Math.sin(t) * radius });
  }
  return points;
}

export function rectWithin(inner: Rect, outer: Rect, tolerance = 0.5): boolean {
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    inner.x + inner.width <= outer.x + outer.width + tolerance &&
    inner.y + inner.height <= outer.y + outer.height + tolerance
  );
}
