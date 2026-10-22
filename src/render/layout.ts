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
  /**
   * Optional low-camera perspective (1/px): a screen-space homography about (anchorX, anchorY), so
   * straight pitch lines stay straight but converge toward the top of the screen and the far side is
   * drawn smaller. Identity (and unit Jacobian) at the anchor.
   */
  readonly persp?: number;
  readonly anchorX?: number;
  readonly anchorY?: number;
}

/** Adds the low-camera perspective to a flat layout, anchored at a screen point (usually the ball). */
export function withPerspective(layout: PitchLayout, anchor: Vec2, persp: number): PitchLayout {
  return { ...layout, persp, anchorX: anchor.x, anchorY: anchor.y };
}

/** Size multiplier for something drawn at screen row `y` (1 at the anchor, <1 far, >1 near). */
export function depthScaleAt(layout: PitchLayout, y: number): number {
  if (!layout.persp) return 1;
  return Math.max(0.2, 1 + layout.persp * (y - (layout.anchorY ?? 0)));
}

function project(layout: PitchLayout, x: number, y: number): Vec2 {
  if (!layout.persp) return { x, y };
  const ax = layout.anchorX ?? 0;
  const ay = layout.anchorY ?? 0;
  const d = y - ay;
  // Keep the denominator positive so points far below the screen never flip over the horizon.
  const k = 1 / Math.max(0.15, 1 - layout.persp * d);
  return { x: ax + (x - ax) * k, y: ay + d * k };
}

function unproject(layout: PitchLayout, x: number, y: number): Vec2 {
  if (!layout.persp) return { x, y };
  const ax = layout.anchorX ?? 0;
  const ay = layout.anchorY ?? 0;
  const k = Math.max(0.15, 1 + layout.persp * (y - ay));
  return { x: ax + (x - ax) / k, y: ay + (y - ay) / k };
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
    return project(layout, layout.originX + point.x * layout.scale, layout.originY + point.y * layout.crossScale);
  }
  return project(layout, layout.originX + point.y * layout.crossScale, layout.originY + (layout.pitchLength - point.x) * layout.scale);
}

export function fromScreen(layout: PitchLayout, screen: Vec2): Vec2 {
  const point = unproject(layout, screen.x, screen.y);
  if (layout.orientation === 'landscape') {
    return { x: (point.x - layout.originX) / layout.scale, y: (point.y - layout.originY) / layout.crossScale };
  }
  return { x: layout.pitchLength - (point.y - layout.originY) / layout.scale, y: (point.x - layout.originX) / layout.crossScale };
}

/** The four screen corners of a pitch rectangle (a trapezoid under perspective). */
export function quadToScreen(layout: PitchLayout, rect: Rect): Vec2[] {
  return [
    toScreen(layout, { x: rect.x, y: rect.y }),
    toScreen(layout, { x: rect.x + rect.width, y: rect.y }),
    toScreen(layout, { x: rect.x + rect.width, y: rect.y + rect.height }),
    toScreen(layout, { x: rect.x, y: rect.y + rect.height }),
  ];
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

/** Screen bounding box of a pitch rectangle. */
export function rectToScreen(layout: PitchLayout, rect: Rect): Rect {
  const q = quadToScreen(layout, rect);
  const xs = q.map((p) => p.x);
  const ys = q.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
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

/** Fractional region of an image (0..1) that a cover fit should keep in view when it can. */
export interface FocusBox {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/**
 * Cover-fits an image over [0,width]x[0,height] (never leaving gaps), then shifts it so the focus
 * box is centred in the free band [top,height] as far as the cover allows. Returns the image centre.
 */
export function coverWithFocus(
  imageW: number,
  imageH: number,
  width: number,
  height: number,
  top: number,
  focus: FocusBox,
): { x: number; y: number; scale: number } {
  const scale = Math.max(width / imageW, height / imageH);
  const w = imageW * scale;
  const h = imageH * scale;
  const fx = ((focus.x0 + focus.x1) / 2) * w;
  const fy = ((focus.y0 + focus.y1) / 2) * h;
  const left = Math.min(0, Math.max(width - w, width / 2 - fx));
  const topEdge = Math.min(0, Math.max(height - h, (Math.min(top, height) + height) / 2 - fy));
  return { x: left + w / 2, y: topEdge + h / 2, scale };
}
