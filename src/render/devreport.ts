/**
 * Shared layout for the two supplied report paintings (853×1844). Every overlay and hit area is a box in
 * normalised painting coordinates (0–1), mapped through the same uniform fit as the painting itself, so text
 * and buttons stay on the painted panels at any size or orientation. Pure math, unit tested.
 */
export const ART_SIZE = { w: 853, h: 1844 } as const;

export interface NBox { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }
export interface Fit { readonly scale: number; readonly x: number; readonly y: number }
export interface ScreenRect { readonly x: number; readonly y: number; readonly width: number; readonly height: number }

// Measured on a 725×1568 view of the paintings.
const b = (x0: number, y0: number, x1: number, y1: number): NBox => ({ x0: x0 / 725, y0: y0 / 1568, x1: x1 / 725, y1: y1 / 1568 });

export const MY_PLAYER = {
  banner: b(140, 150, 585, 235),
  back: b(55, 155, 132, 230),
  help: b(593, 155, 670, 230),
  portrait: b(60, 390, 314, 708),
  info: b(330, 392, 678, 598),
  form: b(335, 605, 500, 708),
  energy: b(516, 605, 676, 708),
  attrHeader: b(46, 755, 680, 803),
  attrRows: [831, 877, 923, 970, 1016, 1063].map((y) => b(50, y - 22, 680, y + 22)),
  /** The painted grey track in each row (label left of it, value right). */
  trackX: [239 / 725, 524 / 725] as const,
  weekHeader: b(46, 1132, 680, 1180),
  weekRows: [1210, 1263, 1318].map((y) => b(52, y - 25, 676, y + 25)),
  training: b(40, 1373, 688, 1442),
  history: b(40, 1458, 688, 1527),
} as const;

export const MATCH_REPORT = {
  banner: b(108, 95, 618, 170),
  homeTeam: b(50, 236, 272, 306),
  score: b(276, 232, 448, 306),
  awayTeam: b(452, 236, 676, 306),
  competition: b(258, 308, 468, 343),
  portrait: b(65, 432, 330, 657),
  info: b(345, 432, 672, 556),
  formBar: b(365, 563, 655, 603),
  stats: [b(56, 670, 357, 746), b(368, 670, 669, 746), b(56, 755, 357, 836), b(368, 755, 669, 836)],
  perfHeader: b(50, 868, 675, 905),
  perfRows: [b(62, 912, 664, 960), b(62, 962, 664, 1010)],
  perfTrack: b(75, 1023, 650, 1043),
  hlHeader: b(50, 1088, 675, 1125),
  hlRows: [1157, 1208, 1260].map((y) => b(62, y - 24, 664, y + 24)),
  coach: b(55, 1318, 167, 1408),
  speech: b(200, 1318, 676, 1406),
  cont: b(90, 1435, 635, 1508),
} as const;

/** Uniform fit (no stretching) of the painting into the view, centred; in landscape the portrait card is pillarboxed. */
export function fitArt(view: ScreenRect): Fit {
  const scale = Math.min(view.width / ART_SIZE.w, view.height / ART_SIZE.h);
  return { scale, x: view.x + (view.width - ART_SIZE.w * scale) / 2, y: view.y + (view.height - ART_SIZE.h * scale) / 2 };
}

export function toScreen(f: Fit, n: NBox): ScreenRect {
  const x = f.x + n.x0 * ART_SIZE.w * f.scale;
  const y = f.y + n.y0 * ART_SIZE.h * f.scale;
  return { x, y, width: (n.x1 - n.x0) * ART_SIZE.w * f.scale, height: (n.y1 - n.y0) * ART_SIZE.h * f.scale };
}

export const contains = (r: ScreenRect, px: number, py: number): boolean => px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;
