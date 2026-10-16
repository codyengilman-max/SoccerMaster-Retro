import Phaser from 'phaser';
import { match, type Rect } from '../game';
import { DEFAULT_ZOOM, nextZoom, parseZoom, type ZoomChoice } from '../render/camera';
import { orientationOf } from '../render/layout';
import { CSS, FONT_FAMILY, PALETTE, textResolution } from '../render/theme';
import type { InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';

type LabScenarioId = match.LabScenarioId;
type AimMode = 'slow' | 'normal';

/** Gameplay Lab picker (lab builds only): scenario + aim mode, then the real 9v9 MatchScene. */
export class LabScene extends Phaser.Scene implements InspectableScene {
  private navigating = false;
  private aim: AimMode = 'slow';
  private zoom: ZoomChoice = DEFAULT_ZOOM;
  private background!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private note!: Phaser.GameObjects.Text;
  private picks!: Record<LabScenarioId, Button>;
  private aimButton!: Button;
  private zoomButton!: Button;
  private backButton!: Button;

  constructor() {
    super(SceneKeys.Lab);
  }

  create(data: { aim?: AimMode; zoom?: number } = {}): void {
    this.navigating = false;
    this.aim = data.aim === 'normal' ? 'normal' : 'slow';
    this.zoom = parseZoom(data.zoom);
    const resolution = textResolution();
    this.background = this.add.graphics();
    this.title = this.add
      .text(0, 0, 'Gameplay Lab', { fontFamily: FONT_FAMILY, fontStyle: 'bold', color: CSS.cream, stroke: CSS.ink, strokeThickness: 5 })
      .setOrigin(0.5)
      .setResolution(resolution);
    this.note = this.add
      .text(0, 0, 'Practice only: no career credit, no saves. Reset (in Pause) restarts a scenario.', { fontFamily: FONT_FAMILY, fontStyle: 'bold', color: CSS.ink, align: 'center' })
      .setOrigin(0.5, 0)
      .setResolution(resolution);
    this.picks = Object.fromEntries(
      match.LAB_SCENARIO_IDS.map((id) => [
        id,
        new Button(this, 0, 0, {
          name: `lab-${id}`,
          label: match.LAB_SCENARIOS[id].title,
          width: 200,
          height: 40,
          fontSize: 14,
          fill: PALETTE.cream,
          fillPressed: PALETTE.sand,
          onClick: () => this.open(id),
        }),
      ]),
    ) as Record<LabScenarioId, Button>;
    this.aimButton = new Button(this, 0, 0, {
      name: 'lab-aim',
      label: '',
      width: 220,
      height: 44,
      fontSize: 15,
      onClick: () => this.toggleAim(),
    });
    this.zoomButton = new Button(this, 0, 0, {
      name: 'lab-zoom',
      label: '',
      width: 140,
      height: 44,
      fontSize: 15,
      onClick: () => this.toggleZoom(),
    });
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.toggleAim(this.aim);
  }

  describeLayout(): SceneLayoutReport {
    const { width, height } = this.scale;
    const elements: Record<string, Rect> = {
      'lab-aim': this.aimButton.getButtonBounds(),
      'lab-zoom': this.zoomButton.getButtonBounds(),
      'back-button': this.backButton.getButtonBounds(),
    };
    for (const id of match.LAB_SCENARIO_IDS) elements[`lab-${id}`] = this.picks[id].getButtonBounds();
    return {
      orientation: orientationOf({ width, height }),
      viewport: { width, height },
      elements,
    };
  }

  describeGameplay(): { aim: AimMode; zoom: ZoomChoice } {
    return { aim: this.aim, zoom: this.zoom };
  }

  private toggleAim(set?: AimMode): void {
    this.aim = set ?? (this.aim === 'slow' ? 'normal' : 'slow');
    this.layout(this.scale.width, this.scale.height);
  }

  /** Cycles the gameplay zoom comparison: 1.4x, 1.5x (default), 1.6x. */
  private toggleZoom(): void {
    this.zoom = nextZoom(this.zoom);
    this.layout(this.scale.width, this.scale.height);
  }

  private open(id: LabScenarioId): void {
    if (this.navigating) return;
    this.navigating = true;
    this.scene.start(SceneKeys.Match, {
      lab: id,
      aim: this.aim,
      zoom: this.zoom,
    });
  }

  private goBack(): void {
    if (this.navigating) return;
    this.navigating = true;
    this.scene.start(SceneKeys.Start);
  }

  private handleResize(size: Phaser.Structs.Size): void {
    this.layout(size.width, size.height);
  }

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
  }

  private layout(width: number, height: number): void {
    const portrait = orientationOf({ width, height }) === 'portrait';
    this.background.clear().fillStyle(PALETTE.skyBottom, 1).fillRect(0, 0, width, height);
    this.backButton.setPosition(10 + 48, 10 + 22);
    this.title.setFontSize(portrait ? 26 : 22).setPosition(width / 2, portrait ? 80 : 30);
    this.note.setFontSize(12).setWordWrapWidth(width - 40, true).setPosition(width / 2, portrait ? (height < 640 ? 100 : 104) : 50);
    const cols = portrait ? 1 : 2;
    // Short portrait screens (320x568) need the list to start higher and pack tighter to fit 14 rows.
    const tight = portrait && height < 640;
    const top = portrait ? (tight ? 128 : 150) : height < 360 ? 74 : 96;
    const rows = Math.ceil(match.LAB_SCENARIO_IDS.length / cols);
    const gap = tight ? 4 : 6;
    // Rows share what is left above the aim toggle (44 px plus margins), so they never overlap it.
    const bh = Math.max(22, Math.min(44, (height - top - 44 - 24) / rows - gap));
    const bw = Math.min(portrait ? width - 40 : (width - 60) / 2, 300);
    match.LAB_SCENARIO_IDS.forEach((id, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = cols === 1 ? width / 2 : width / 2 + (c === 0 ? -1 : 1) * (bw / 2 + 6);
      this.picks[id].resize(bw, bh, 14).setPosition(x, top + r * (bh + gap) + bh / 2);
    });
    // Bottom row: aim mode and zoom side by side; narrow screens get the short aim label.
    const zw = Math.min(150, Math.max(110, (width - 50) * 0.42));
    const aw = Math.min(260, width - 50 - zw);
    const narrow = aw < 200;
    this.aimButton.setLabel(this.aim === 'slow' ? (narrow ? 'Aim: slow-mo' : 'Aim: short slow motion') : narrow ? 'Aim: normal' : 'Aim: normal speed');
    this.zoomButton.setLabel(`Zoom ${this.zoom}×`);
    const left = (width - aw - zw - 10) / 2;
    this.aimButton.resize(aw, 44, 15).setPosition(left + aw / 2, height - 34);
    this.zoomButton.resize(zw, 44, 15).setPosition(left + aw + 10 + zw / 2, height - 34);
  }
}
