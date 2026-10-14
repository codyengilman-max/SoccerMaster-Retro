import Phaser from 'phaser';
import { match, type Rect } from '../game';
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
  private background!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private note!: Phaser.GameObjects.Text;
  private picks!: Record<LabScenarioId, Button>;
  private aimButton!: Button;
  private backButton!: Button;

  constructor() {
    super(SceneKeys.Lab);
  }

  create(data: { aim?: AimMode } = {}): void {
    this.navigating = false;
    this.aim = data.aim === 'normal' ? 'normal' : 'slow';
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
    this.aimButton = new Button(this, 0, 0, { name: 'lab-aim', label: '', width: 220, height: 44, fontSize: 15, onClick: () => this.toggleAim() });
    this.backButton = new Button(this, 0, 0, { name: 'back-button', label: '‹ Back', width: 96, height: 44, fontSize: 18, fill: PALETTE.cream, fillPressed: PALETTE.sand, onClick: () => this.goBack() });
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.toggleAim(this.aim);
  }

  describeLayout(): SceneLayoutReport {
    const { width, height } = this.scale;
    const elements: Record<string, Rect> = { 'lab-aim': this.aimButton.getButtonBounds(), 'back-button': this.backButton.getButtonBounds() };
    for (const id of match.LAB_SCENARIO_IDS) elements[`lab-${id}`] = this.picks[id].getButtonBounds();
    return { orientation: orientationOf({ width, height }), viewport: { width, height }, elements };
  }

  describeGameplay(): { aim: AimMode } {
    return { aim: this.aim };
  }

  private toggleAim(set?: AimMode): void {
    this.aim = set ?? (this.aim === 'slow' ? 'normal' : 'slow');
    this.aimButton.setLabel(this.aim === 'slow' ? 'Aim: short slow motion' : 'Aim: normal speed');
    this.layout(this.scale.width, this.scale.height);
  }

  private open(id: LabScenarioId): void {
    if (this.navigating) return;
    this.navigating = true;
    this.scene.start(SceneKeys.Match, { lab: id, aim: this.aim });
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
    this.note.setFontSize(12).setWordWrapWidth(width - 40, true).setPosition(width / 2, portrait ? 104 : 50);
    const cols = portrait ? 1 : 2;
    const top = portrait ? 150 : 96;
    const rows = Math.ceil(match.LAB_SCENARIO_IDS.length / cols);
    const gap = 6;
    const bh = Math.max(30, Math.min(44, (height - top - 70) / rows - gap));
    const bw = Math.min(portrait ? width - 40 : (width - 60) / 2, 300);
    match.LAB_SCENARIO_IDS.forEach((id, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = cols === 1 ? width / 2 : width / 2 + (c === 0 ? -1 : 1) * (bw / 2 + 6);
      this.picks[id].resize(bw, bh, 14).setPosition(x, top + r * (bh + gap) + bh / 2);
    });
    this.aimButton.resize(Math.min(260, width - 40), 44, 15).setPosition(width / 2, height - 34);
  }
}
