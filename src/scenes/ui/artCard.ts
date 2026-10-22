import Phaser from 'phaser';
import { ART_SIZE, contains, fitArt, toScreen, type Fit, type NBox, type ScreenRect } from '../../render/devreport';
import { FONT_FAMILY, textResolution } from '../../render/theme';

interface Label { readonly text: Phaser.GameObjects.Text; box: NBox; readonly size: number; readonly align: 'left' | 'center' | 'right' }
interface Hit { readonly name: string; box: NBox; readonly onTap: () => void; enabled: boolean }

/** A tap must start and end on the same hit area and move less than this (so scrolling never presses). */
/** Phaser's advanced wrap throws below one character, so never wrap narrower than ~3 glyphs. */
export function wrapFloor(t: Phaser.GameObjects.Text): number {
  const px = Number.parseFloat(String(t.style.fontSize)) || 16;
  return Math.ceil(px * 3);
}

const TAP_SLOP = 12;

/**
 * The supplied painting as the background of a portrait card, with live text and invisible hit areas placed
 * by normalised painting boxes through one shared fit. Re-laid out on resize; pointer listeners are on the
 * scene's own input plugin, so they end with the scene.
 */
export class ArtCard {
  fit: Fit = { scale: 1, x: 0, y: 0 };
  private bg: Phaser.GameObjects.Image | null = null;
  private readonly labels: Label[] = [];
  readonly hits: Hit[] = [];
  private down: { x: number; y: number; hit: Hit | null } | null = null;
  private readonly onLayout: (() => void)[] = [];
  /** Last pointer decisions, for diagnostics. */
  readonly trace: string[] = [];

  constructor(private readonly scene: Phaser.Scene, key: string, url: string | undefined) {
    scene.add.rectangle(0, 0, 4000, 4000, 0x10141c).setOrigin(0, 0).setDepth(-2);
    const show = (): void => {
      if (!scene.sys.isActive() || this.bg || !scene.textures.exists(key)) return;
      this.bg = scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(-1);
      this.layout();
    };
    if (scene.textures.exists(key)) show();
    else if (url) {
      scene.load.image(key, url);
      scene.load.once(Phaser.Loader.Events.COMPLETE, show);
      scene.load.start();
    }
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      this.down = { x: p.x, y: p.y, hit: this.hitAt(p.x, p.y) };
      this.note(`down ${Math.round(p.x)},${Math.round(p.y)} ${this.down.hit?.name ?? '-'}`);
    });
    scene.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
      const d = this.down;
      this.down = null;
      this.note(`up ${Math.round(p.x)},${Math.round(p.y)} ${this.hitAt(p.x, p.y)?.name ?? '-'} from ${d?.hit?.name ?? 'none'}`);
      if (!d?.hit || Math.hypot(p.x - d.x, p.y - d.y) > TAP_SLOP) return;
      if (this.hitAt(p.x, p.y) === d.hit && d.hit.enabled) d.hit.onTap();
    });
  }

  private note(s: string): void {
    this.trace.push(s);
    if (this.trace.length > 8) this.trace.shift();
  }

  /** Safe area inside the canvas (the canvas already sits inside the iPhone safe area via the page CSS). */
  view(): ScreenRect {
    const { width, height } = this.scene.scale;
    return { x: 0, y: 0, width, height };
  }

  rect(box: NBox): ScreenRect {
    return toScreen(this.fit, box);
  }

  private hitAt(x: number, y: number): Hit | null {
    for (let i = this.hits.length - 1; i >= 0; i--) if (this.hits[i]!.enabled && contains(this.rect(this.hits[i]!.box), x, y)) return this.hits[i]!;
    return null;
  }

  /** Text that always fits its box: wrapped to the box width and shrunk until it fits the height. */
  label(box: NBox, text: string, size = 0.5, color = '#1b2a3a', align: 'left' | 'center' | 'right' = 'center', depth = 2): Phaser.GameObjects.Text {
    const t = this.scene.add.text(0, 0, text, { fontFamily: FONT_FAMILY, color, align, resolution: textResolution(), fontStyle: 'bold' }).setDepth(depth);
    this.labels.push({ text: t, box, size, align });
    this.place(this.labels[this.labels.length - 1]!);
    return t;
  }

  setText(t: Phaser.GameObjects.Text, text: string, box?: NBox): void {
    const l = this.labels.find((x) => x.text === t);
    t.setText(text);
    if (l) {
      if (box) l.box = box;
      this.place(l);
    }
  }

  removeLabel(t: Phaser.GameObjects.Text): void {
    const i = this.labels.findIndex((x) => x.text === t);
    if (i >= 0) this.labels.splice(i, 1);
    t.destroy();
  }

  hit(name: string, box: NBox, onTap: () => void): Hit {
    const h: Hit = { name, box, onTap, enabled: true };
    this.hits.push(h);
    return h;
  }

  afterLayout(fn: () => void): void {
    this.onLayout.push(fn);
  }

  private place(l: Label): void {
    const r = this.rect(l.box);
    let px = Math.max(8, Math.floor(r.height * l.size));
    l.text.setWordWrapWidth(Math.max(wrapFloor(l.text), r.width - 8), true);
    l.text.setFontSize(px);
    while (px > 8 && (l.text.width > r.width - 4 || l.text.height > r.height)) l.text.setFontSize(--px);
    const ox = l.align === 'left' ? 0 : l.align === 'right' ? 1 : 0.5;
    l.text.setOrigin(ox, 0.5).setPosition(r.x + (l.align === 'left' ? 4 : l.align === 'right' ? r.width - 4 : r.width / 2), r.y + r.height / 2);
  }

  layout(): void {
    this.fit = fitArt(this.view());
    this.bg?.setScale(this.fit.scale).setPosition(this.fit.x, this.fit.y);
    for (const l of this.labels) this.place(l);
    for (const fn of this.onLayout) fn();
  }

  artRect(): ScreenRect {
    return { x: this.fit.x, y: this.fit.y, width: ART_SIZE.w * this.fit.scale, height: ART_SIZE.h * this.fit.scale };
  }
}
