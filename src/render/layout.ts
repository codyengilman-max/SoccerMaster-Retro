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
  /** Pixels per yard along the pitch length. */
  readonly scale: number;
  /** Pixels per yard across the pitch; smaller than `scale` for the elevated sideline view. */
  readonly crossScale: number;
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

  return { orientation, scale, crossScale: scale, originX, originY, pitchLength, pitchWidth };
}

/**
 * Fits a pitch region (e.g. the attacking half) with `marginYards` around it. In landscape the
 * across-pitch axis is compressed by `squash` to suggest an elevated sideline camera.
 * Portrait keeps the top-down mapping with the region's far end (x = region.x + width) at the top.
 */
export function fitRegion(viewport: Viewport, region: Rect, insets: Insets = NO_INSETS, marginYards = 2, squash = 1): PitchLayout {
  const orientation = orientationOf(viewport);
  const regionW = Math.max(1, viewport.width - insets.left - insets.right);
  const regionH = Math.max(1, viewport.height - insets.top - insets.bottom);
  const longExtent = region.width + marginYards * 2;
  const shortExtent = region.height + marginYards * 2;
  const pitchLength = region.x + region.width;
  if (orientation === 'landscape') {
    const scale = Math.min(regionW / longExtent, regionH / (shortExtent * squash));
    const crossScale = scale * squash;
    const originX = insets.left + (regionW - longExtent * scale) / 2 + (marginYards - region.x) * scale;
    const originY = insets.top + (regionH - shortExtent * crossScale) / 2 + (marginYards - region.y) * crossScale;
    return { orientation, scale, crossScale, originX, originY, pitchLength, pitchWidth: region.height };
  }
  const scale = Math.min(regionW / shortExtent, regionH / longExtent);
  const originX = insets.left + (regionW - shortExtent * scale) / 2 + (marginYards - region.y) * scale;
  const originY = insets.top + (regionH - longExtent * scale) / 2 + marginYards * scale;
  return { orientation, scale, crossScale: scale, originX, originY, pitchLength, pitchWidth: region.height };
}

export function toScreen(layout: PitchLayout, point: Vec2): Vec2 {
  if (layout.orientation === 'landscape') {
    return { x: layout.originX + point.x * layout.scale, y: layout.originY + point.y * layout.crossScale };
  }
  return { x: layout.originX + point.y * layout.crossScale, y: layout.originY + (layout.pitchLength - point.x) * layout.scale };
}

export function fromScreen(layout: PitchLayout, point: Vec2): Vec2 {
  if (layout.orientation === 'landscape') {
    return { x: (point.x - layout.originX) / layout.scale, y: (point.y - layout.originY) / layout.crossScale };
  }
  return { x: layout.pitchLength - (point.y - layout.originY) / layout.scale, y: (point.x - layout.originX) / layout.crossScale };
}

/** Converts a screen-space direction/offset (pixels) into pitch yards. */
export function screenVectorToPitch(layout: PitchLayout, v: Vec2): Vec2 {
  if (layout.orientation === 'landscape') return { x: v.x / layout.scale, y: v.y / layout.crossScale };
  return { x: -v.y / layout.scale, y: v.x / layout.crossScale };
}

export function pitchVectorToScreen(layout: PitchLayout, v: Vec2): Vec2 {
  if (layout.orientation === 'landscape') return { x: v.x * layout.scale, y: v.y * layout.crossScale };
  return { x: v.y * layout.crossScale, y: -v.x * layout.scale };
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
