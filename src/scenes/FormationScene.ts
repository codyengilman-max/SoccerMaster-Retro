import Phaser from 'phaser';
import { match, type Rect } from '../game';
import { orientationOf } from '../render/layout';
import { CSS, FONT_FAMILY, PALETTE, textResolution } from '../render/theme';
import type { InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';

const { FORMATION_IDS, FORMATIONS, DEFAULT_FORMATION, MATCH_TUNING } = match;
type FormationId = match.FormationId;

const BLURB: Record<FormationId, string> = {
  '1-3-2-3': 'Balanced: three at the back, two in midfield, wide forwards for width.',
  '1-3-3-2': 'Midfield control: three central helpers behind two strikers.',
  '1-2-4-2': 'Wide midfield: two centre-backs, four across midfield, two strikers.',
};

/** Pre-sandbox formation picker. Passes the choice to the match scene as scene data. */
export class FormationScene extends Phaser.Scene implements InspectableScene {
  private selected: FormationId = DEFAULT_FORMATION;
  private navigating = false;
  private career = false;
  private returnTo: 'story' | undefined;
  private resultKey: string | undefined;
  private opponent: string | undefined;
  private background!: Phaser.GameObjects.Graphics;
  private diagram!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private blurb!: Phaser.GameObjects.Text;
  private picks!: Record<FormationId, Button>;
  private kickoffButton!: Button;
  private backButton!: Button;
  private diagramRect: Rect = { x: 0, y: 0, width: 0, height: 0 };

  constructor() {
    super(SceneKeys.Formation);
  }

  create(data: { career?: boolean; returnTo?: 'story'; resultKey?: string; opponent?: string } = {}): void {
    this.returnTo = data.returnTo === 'story' ? 'story' : undefined;
    this.resultKey = this.returnTo && typeof data.resultKey === 'string' ? data.resultKey : undefined;
    this.opponent = this.returnTo && typeof data.opponent === 'string' ? data.opponent : undefined;
    this.navigating = false;
    this.career = data.career === true;
    this.selected = DEFAULT_FORMATION;
    const resolution = textResolution();
    this.background = this.add.graphics();
    this.diagram = this.add.graphics();
    this.title = this.add
      .text(0, 0, 'Choose your formation', { fontFamily: FONT_FAMILY, fontStyle: 'bold', color: CSS.cream, stroke: CSS.ink, strokeThickness: 5, align: 'center' })
      .setOrigin(0.5)
      .setResolution(resolution);
    this.blurb = this.add
      .text(0, 0, '', { fontFamily: FONT_FAMILY, fontStyle: 'bold', color: CSS.ink, align: 'center' })
      .setOrigin(0.5, 0)
      .setResolution(resolution);
    this.picks = Object.fromEntries(
      FORMATION_IDS.map((id) => [
        id,
        new Button(this, 0, 0, { name: `pick-${id}`, label: id, width: 120, height: 52, fontSize: 20, fill: PALETTE.cream, fillPressed: PALETTE.sand, onClick: () => this.select(id) }),
      ]),
    ) as Record<FormationId, Button>;
    this.kickoffButton = new Button(this, 0, 0, { name: 'kickoff-button', label: 'Kick Off ›', width: 200, height: 56, fontSize: 22, onClick: () => this.kickOff() });
    this.backButton = new Button(this, 0, 0, {
      name: 'back-button',
      label: '‹ Back',
      width: 96,
      height: 44,
      fontSize: 18,
      fill: PALETTE.cream,
      fillPressed: PALETTE.sand,
      onClick: () => this.goBack(),
    });

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.input.keyboard?.on('keydown', this.onKeyDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.select(this.selected);
  }

  describeLayout(): SceneLayoutReport {
    const { width, height } = this.scale;
    const elements: Record<string, Rect> = {
      title: boundsOf(this.title),
      blurb: boundsOf(this.blurb),
      diagram: this.diagramRect,
      'kickoff-button': this.kickoffButton.getButtonBounds(),
      'back-button': this.backButton.getButtonBounds(),
    };
    for (const id of FORMATION_IDS) elements[`pick-${id}`] = this.picks[id].getButtonBounds();
    return { orientation: orientationOf({ width, height }), viewport: { width, height }, elements };
  }

  /** Small read-only report so browser tests can see the current choice. */
  describeGameplay(): { selected: FormationId } {
    return { selected: this.selected };
  }

  private select(id: FormationId): void {
    this.selected = id;
    for (const f of FORMATION_IDS) {
      const on = f === id;
      this.picks[f].setFill(on ? PALETTE.mustard : PALETTE.cream, on ? PALETTE.mustardDark : PALETTE.sand).setLabel(on ? `● ${f}` : f);
    }
    this.blurb.setText(`${BLURB[id]}\nDefault: ${DEFAULT_FORMATION}. You can change it any time while paused.`);
    this.layout(this.scale.width, this.scale.height);
  }

  private kickOff(): void {
    if (this.navigating) return;
    this.navigating = true;
    this.scene.start(SceneKeys.Match, { formation: this.selected, career: this.career, returnTo: this.returnTo, ...(this.resultKey ? { resultKey: this.resultKey } : {}), ...(this.opponent ? { opponent: this.opponent } : {}) });
  }

  private goBack(): void {
    if (this.navigating) return;
    this.navigating = true;
    this.scene.start(SceneKeys.Start);
  }

  private onKeyDown(event: KeyboardEvent): void {
    const index = ['Digit1', 'Digit2', 'Digit3'].indexOf(event.code);
    const id = FORMATION_IDS[index];
    if (id) this.select(id);
    else if (event.code === 'Enter' || event.code === 'Space') this.kickOff();
    else if (event.code === 'Escape' || event.code === 'Backspace') this.goBack();
    else return;
    event.preventDefault();
  }

  private handleResize(size: Phaser.Structs.Size): void {
    this.layout(size.width, size.height);
  }

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.input.keyboard?.off('keydown', this.onKeyDown, this);
  }

  private layout(width: number, height: number): void {
    const portrait = orientationOf({ width, height }) === 'portrait';
    const g = this.background;
    g.clear();
    g.fillStyle(PALETTE.skyBottom, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(PALETTE.hillNear, 1);
    g.fillRect(0, height * 0.86, width, height * 0.14);

    this.backButton.setPosition(10 + 48, 10 + 22);
    const titleSize = Math.round(Math.max(20, Math.min(width * (portrait ? 0.075 : 0.045), 40)));
    this.title.setFontSize(titleSize).setPosition(width / 2, portrait ? 92 : 32);
    if (!portrait && this.title.x - this.title.displayWidth / 2 < 116) this.title.setX(116 + this.title.displayWidth / 2);

    const pickW = Math.round(Math.min(portrait ? (width - 40) / 3 : (width * 0.5 - 32) / 3, 160));
    const pickH = 52;
    const pickFont = Math.max(15, Math.min(20, Math.round(pickW * 0.14)));
    const rowY = portrait ? 92 + titleSize + 34 : 32 + titleSize + 26;
    FORMATION_IDS.forEach((id, i) => {
      const x = portrait ? width / 2 + (i - 1) * (pickW + 8) : width * 0.25 + (i - 1) * (pickW + 8);
      this.picks[id].resize(pickW, pickH, pickFont).setPosition(x, rowY);
    });
    const textW = portrait ? width - 32 : width * 0.46;
    this.blurb.setFontSize(Math.max(12, Math.min(16, Math.round(width * 0.035)))).setWordWrapWidth(textW, true);
    this.blurb.setPosition(portrait ? width / 2 : width * 0.25, rowY + pickH / 2 + 14);
    const kickY = portrait ? height - 70 : height - 46;
    this.kickoffButton.resize(Math.min(240, width - 40), 56, 22).setPosition(portrait ? width / 2 : width * 0.25, kickY);

    // Diagram of the selected formation (home attacks upward in portrait, rightward in landscape).
    const top = portrait ? this.blurb.y + this.blurb.height + 16 : rowY - pickH / 2;
    const bottom = portrait ? kickY - 40 : height - 16;
    const left = portrait ? 16 : width * 0.52;
    const right = width - 16;
    const L = MATCH_TUNING.pitch.length;
    const W = MATCH_TUNING.pitch.width;
    const availW = right - left;
    const availH = Math.max(40, bottom - top);
    const along = portrait ? availH : availW;
    const across = portrait ? availW : availH;
    const k = Math.min(along / L, across / W);
    const dw = (portrait ? W : L) * k;
    const dh = (portrait ? L : W) * k;
    const ox = left + (availW - dw) / 2;
    const oy = top + (availH - dh) / 2;
    this.diagramRect = { x: ox, y: oy, width: dw, height: dh };
    const at = (p: { x: number; y: number }): { x: number; y: number } =>
      portrait ? { x: ox + p.y * k, y: oy + (L - p.x) * k } : { x: ox + p.x * k, y: oy + p.y * k };
    const d = this.diagram;
    d.clear();
    d.fillStyle(PALETTE.grassLight, 1);
    d.fillRect(ox, oy, dw, dh);
    d.lineStyle(3, PALETTE.ink, 1);
    d.strokeRect(ox, oy, dw, dh);
    d.lineStyle(2, PALETTE.line, 1);
    const h1 = at({ x: L / 2, y: 0 });
    const h2 = at({ x: L / 2, y: W });
    d.lineBetween(h1.x, h1.y, h2.x, h2.y);
    const f = FORMATIONS[this.selected];
    const r = Math.max(5, k * 1.6);
    for (const role of f.roles) {
      const p = at(role.base);
      d.fillStyle(PALETTE.ink, 1);
      d.fillCircle(p.x, p.y + 2, r);
      d.fillStyle(role.id === 'GK' ? PALETTE.purple : PALETTE.tomato, 1);
      d.fillCircle(p.x, p.y, r);
      d.lineStyle(2, PALETTE.ink, 1);
      d.strokeCircle(p.x, p.y, r);
    }
  }
}

function boundsOf(object: { getBounds(): Phaser.Geom.Rectangle }): Rect {
  const b = object.getBounds();
  return { x: b.x, y: b.y, width: b.width, height: b.height };
}
