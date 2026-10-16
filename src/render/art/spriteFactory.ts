/**
 * Port of the owner-approved Graphics v1 gameplay renderer (docs/art/graphics-v1/code/sprite-factory.mjs).
 * Drawing geometry is unchanged; the only additions are parameters for the real kit colours and shirt
 * number (the reference hard-codes team 0/1/2 palettes and the numbers 10/6/1). Canvas2D only: no
 * Phaser, physics, input or save access, and no caching (the Phaser adapter owns a bounded cache).
 */
export const SPRITE_FRAME = Object.freeze({ width: 96, height: 96, anchorX: 48, anchorY: 68, scaleX: 1.5, scaleY: 1.65 });
export const HAIR_STYLES = Object.freeze(['short', 'curly', 'afro', 'mohawk', 'long', 'ponytail', 'shaggy'] as const);
export const HAIR_COLORS = Object.freeze(['#211d25', '#65402c', '#b04d2f', '#e6b94f', '#f6df99'] as const);
export const POSE_KINDS = Object.freeze(['run', 'idle', 'kick', 'slide', 'dive'] as const);
export type PoseKind = (typeof POSE_KINDS)[number];

export interface SpriteKit {
  readonly shirt: string;
  /** Shirt fold shadow and highlight strokes. */
  readonly shade: string;
  readonly light: string;
}
/** Reference kit groups 0/1/2 exactly as drawn by the approved factory (match sides, not clubs). */
export const REFERENCE_KITS: readonly SpriteKit[] = Object.freeze([
  { shirt: '#ed813d', shade: '#ba582c', light: '#ffa75f' },
  { shirt: '#233f59', shade: '#172e43', light: '#47647d' },
  { shirt: '#69ac91', shade: '#172e43', light: '#47647d' },
]);
export const REFERENCE_NUMBERS = Object.freeze(['10', '6', '1']);

export interface SpriteLook {
  readonly kit: SpriteKit;
  /** Shirt number text, 1-2 digits. */
  readonly number: string;
  readonly girl: boolean;
  readonly hairIndex: number;
  readonly hairStyle: number;
}

const SKIN = '#e9bc94';
type Ctx = CanvasRenderingContext2D;
function ellipse(g: Ctx, x: number, y: number, rx: number, ry: number, color: string): void {
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}
function stroke(g: Ctx, points: readonly (readonly [number, number])[], color: string, width: number): void {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
}

export function validLook(l: SpriteLook): boolean {
  return (
    Number.isInteger(l.hairIndex) && l.hairIndex >= 0 && l.hairIndex <= 4 &&
    Number.isInteger(l.hairStyle) && l.hairStyle >= 0 && l.hairStyle <= 6 &&
    typeof l.girl === 'boolean' && /^[0-9]{1,2}$/.test(l.number) &&
    [l.kit.shirt, l.kit.shade, l.kit.light].every((c) => /^#[0-9a-f]{6}$/i.test(c))
  );
}

/** Draw one 96x96 padded frame (foot anchor 48,68). Throws on unsupported parameters, like the reference. */
export function drawSprite(g: Ctx, look: SpriteLook, dir: number, frame: number, kind: PoseKind): void {
  if (!validLook(look) || !Number.isInteger(dir) || dir < 0 || dir > 7 || !Number.isInteger(frame) || frame < 0 || frame > 5 || !POSE_KINDS.includes(kind)) {
    throw new RangeError('Unsupported cosmetic sprite parameters');
  }
  const a = (dir * Math.PI) / 4, dx = Math.cos(a), dy = Math.sin(a), s = Math.sin((frame / 6) * Math.PI * 2);
  const kit = look.kit.shirt, skin = SKIN;
  g.save();
  g.translate(48, 68);
  if (kind === 'slide' || kind === 'dive') {
    g.rotate((dx < 0 ? -1 : 1) * 1.05);
    g.translate(0, 8);
  }
  const step = kind === 'run' ? s * 5 : 0, foot = kind === 'kick' ? 10 : 0;
  stroke(g, [[-5, -13], [-5 + dx * step, -6], [-5 + dx * (step + foot), 0 + dy * step]], '#152b3e', 7);
  stroke(g, [[5, -13], [5 - dx * step, -6], [5 - dx * step, 0 - dy * step]], '#152b3e', 7);
  stroke(g, [[-5 + dx * step, -5], [-5 + dx * (step + foot), dy * step]], kit, 4);
  stroke(g, [[5 - dx * step, -5], [5 - dx * step, -dy * step]], kit, 4);
  ellipse(g, -4 + dx * (step + foot), 1 + dy * step, 4, 2, '#142332');
  ellipse(g, 6 - dx * step, 1 - dy * step, 4, 2, '#142332');
  stroke(g, [[-9, -28], [-13 - dx * step, -22], [-13 - dx * step, -17]], skin, 4);
  stroke(g, [[9, -28], [13 + dx * step, -22], [13 + dx * step, -17]], skin, 4);
  g.fillStyle = '#102e42';
  g.fillRect(-8, -17, 16, 7);
  g.fillStyle = kit;
  g.beginPath();
  g.moveTo(-8, -33);
  g.lineTo(8, -33);
  g.lineTo(11, -18);
  g.lineTo(-11, -18);
  g.closePath();
  g.fill();
  stroke(g, [[-8, -31], [-10, -25]], '#f6e5bd', 2);
  stroke(g, [[8, -31], [10, -25]], '#f6e5bd', 2);
  stroke(g, [[-3, -32], [0, -29], [3, -32]], '#f6e5bd', 2);
  stroke(g, [[6, -28], [8, -20]], look.kit.shade, 2);
  stroke(g, [[-5, -28], [-4, -23]], look.kit.light, 2);
  g.fillStyle = '#f5e8cc';
  g.font = 'bold 8px sans-serif';
  g.textAlign = 'center';
  g.fillText(look.number, 0, -20);
  stroke(g, [[0, -34], [0, -31]], skin, 4);
  ellipse(g, dx * 1.5, -39, 6.2, 7.3, skin);
  const hc = look.girl ? '#f6df99' : HAIR_COLORS[look.hairIndex % 5]!;
  const hs = look.girl ? 5 : look.hairStyle;
  if (hs === 0) ellipse(g, dx, -44, 7.5, 4.5, hc);
  if (hs === 1) for (let h = 0; h < 7; h++) ellipse(g, dx - 7 + h * 2.4, -44 - Math.sin((h / 6) * Math.PI) * 3, 3.3, 3.5, hc);
  if (hs === 2) {
    ellipse(g, dx, -42, 11, 9, hc);
    for (let h = 0; h < 9; h++) {
      const ha = Math.PI + (h / 8) * Math.PI;
      ellipse(g, dx + Math.cos(ha) * 9, -41 + Math.sin(ha) * 8, 3, 3, hc);
    }
    ellipse(g, dx * 2, -37, 4.5, 3.8, skin);
  }
  if (hs === 3) {
    ellipse(g, dx, -44, 6.5, 3, hc);
    g.fillStyle = hc;
    g.beginPath();
    g.moveTo(dx - 2, -44);
    g.lineTo(dx - 3, -50);
    g.lineTo(dx + 1, -51);
    g.lineTo(dx + 4, -49);
    g.lineTo(dx + 3, -41);
    g.fill();
  }
  if (hs === 4) {
    ellipse(g, dx, -43, 8, 5, hc);
    stroke(g, [[-7, -42], [-9, -34], [-7 + Math.sin(frame) * 2, -23]], hc, 5);
    stroke(g, [[7, -42], [9, -34], [7 + Math.sin(frame) * 2, -23]], hc, 5);
  }
  if (hs === 5) {
    ellipse(g, dx, -43, 8, 5, hc);
    stroke(g, [[-dx * 6, -42], [-dx * 11, -35], [-dx * 10 + Math.sin(frame) * 3, -23]], hc, 6);
    ellipse(g, -dx * 8, -39, 2, 2, '#f38756');
  }
  if (hs === 6) {
    ellipse(g, dx, -44, 9, 6, hc);
    stroke(g, [[-7, -43], [-9, -36]], hc, 4);
    stroke(g, [[7, -43], [9, -37]], hc, 4);
  }
  if (dy >= 0) {
    g.fillStyle = '#22333c';
    g.fillRect(dx * 3 - 2, -39, 1.4, 1.4);
    g.fillRect(dx * 3 + 2, -39, 1.4, 1.4);
  }
  g.restore();
}

/** Screen-space heading → one of the reference's eight directions (0 = east, 2 = south/down-screen). */
export function dirFromScreen(x: number, y: number): number {
  return (((Math.round(Math.atan2(y, x) / (Math.PI / 4)) % 8) + 8) % 8);
}
