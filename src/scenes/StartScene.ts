import Phaser from 'phaser';
import type { Rect } from '../game';
import { orientationOf } from '../render/layout';
import { CSS, FONT_FAMILY, PALETTE, textResolution } from '../render/theme';
import type { InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';

export const GAME_TITLE = 'SoccerMaster Retro';

export class StartScene extends Phaser.Scene implements InspectableScene {
  private background!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private footer!: Phaser.GameObjects.Text;
  private enterButton!: Button;
  private playButton!: Button;
  private navigating = false;

  constructor() {
    super(SceneKeys.Start);
  }

  create(): void {
    this.navigating = false;
    const resolution = textResolution();

    this.background = this.add.graphics();
    this.title = this.add
      .text(0, 0, GAME_TITLE, {
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        color: CSS.cream,
        stroke: CSS.ink,
        align: 'center',
      })
      .setOrigin(0.5)
      .setShadow(0, 4, CSS.ink, 0, true, true)
      .setResolution(resolution);
    this.subtitle = this.add
      .text(0, 0, 'A storybook soccer adventure', {
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        color: CSS.ink,
        align: 'center',
      })
      .setOrigin(0.5)
      .setResolution(resolution);
    this.footer = this.add
      .text(0, 0, `v${__APP_VERSION__} · build ${__BUILD_SHA__.slice(0, 7)}`, {
        fontFamily: FONT_FAMILY,
        color: CSS.ink,
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setAlpha(0.7)
      .setResolution(resolution);
    this.playButton = new Button(this, 0, 0, {
      name: 'play-button',
      label: 'Play Attack Drill',
      width: 280,
      height: 72,
      fontSize: 24,
      onClick: () => this.playAttackDrill(),
    });
    this.enterButton = new Button(this, 0, 0, {
      name: 'enter-button',
      label: 'Enter Training Ground',
      width: 280,
      height: 72,
      fontSize: 24,
      onClick: () => this.enterTrainingGround(),
    });

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.input.keyboard?.on('keydown-ENTER', this.enterTrainingGround, this);
    this.input.keyboard?.on('keydown-SPACE', this.enterTrainingGround, this);
    this.input.keyboard?.on('keydown-P', this.playAttackDrill, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.layout(this.scale.width, this.scale.height);
  }

  describeLayout(): SceneLayoutReport {
    const { width, height } = this.scale;
    return {
      orientation: orientationOf({ width, height }),
      viewport: { width, height },
      elements: {
        title: boundsOf(this.title),
        subtitle: boundsOf(this.subtitle),
        footer: boundsOf(this.footer),
        'enter-button': this.enterButton.getButtonBounds(),
        'play-button': this.playButton.getButtonBounds(),
      },
    };
  }

  private enterTrainingGround(): void {
    if (this.navigating) return;
    this.navigating = true;
    this.scene.start(SceneKeys.Pitch);
  }

  private playAttackDrill(): void {
    if (this.navigating) return;
    this.navigating = true;
    this.scene.start(SceneKeys.Attack);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.layout(gameSize.width, gameSize.height);
  }

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.input.keyboard?.off('keydown-ENTER', this.enterTrainingGround, this);
    this.input.keyboard?.off('keydown-SPACE', this.enterTrainingGround, this);
    this.input.keyboard?.off('keydown-P', this.playAttackDrill, this);
  }

  private layout(width: number, height: number): void {
    const portrait = orientationOf({ width, height }) === 'portrait';
    this.drawBackground(width, height);

    const titleSize = Math.round(
      portrait ? Math.min(width * 0.13, height * 0.08, 76) : Math.min(width * 0.075, height * 0.16, 84),
    );
    this.title
      .setText(portrait ? 'SoccerMaster\nRetro' : GAME_TITLE)
      .setFontSize(titleSize)
      .setStroke(CSS.ink, Math.max(4, Math.round(titleSize * 0.14)))
      .setLineSpacing(-titleSize * 0.1)
      .setPosition(width / 2, height * (portrait ? 0.27 : 0.25));

    const subtitleSize = Math.round(Math.max(14, Math.min(titleSize * 0.36, 26)));
    this.subtitle
      .setFontSize(subtitleSize)
      .setPosition(width / 2, this.title.y + this.title.displayHeight / 2 + subtitleSize * 1.1);

    // Portrait stacks the two buttons; landscape puts them side by side.
    const buttonWidth = Math.round(portrait ? Math.min(width * 0.84, 460) : Math.min(width * 0.4, 360));
    const buttonHeight = Math.round(Math.max(60, Math.min(height * (portrait ? 0.09 : 0.2), 92)));
    const buttonFont = Math.round(Math.max(17, Math.min(buttonWidth * 0.075, buttonHeight * 0.34, 30)));
    this.playButton.resize(buttonWidth, buttonHeight, buttonFont);
    this.enterButton.resize(buttonWidth, buttonHeight, buttonFont);
    if (portrait) {
      const gap = Math.max(12, height * 0.02);
      this.playButton.setPosition(width / 2, height * 0.58);
      this.enterButton.setPosition(width / 2, height * 0.58 + buttonHeight + gap);
    } else {
      const gap = Math.max(16, width * 0.025);
      const y = height * 0.66;
      this.playButton.setPosition(width / 2 - (buttonWidth + gap) / 2, y);
      this.enterButton.setPosition(width / 2 + (buttonWidth + gap) / 2, y);
    }

    this.footer.setFontSize(Math.max(11, Math.round(Math.min(width, height) * 0.032))).setPosition(width / 2, height - 10);
  }

  private drawBackground(width: number, height: number): void {
    const g = this.background;
    g.clear();

    const bands = 12;
    for (let i = 0; i < bands; i++) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(PALETTE.skyTop),
        Phaser.Display.Color.ValueToColor(PALETTE.skyBottom),
        bands - 1,
        i,
      );
      g.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
      g.fillRect(0, (height * i) / bands, width, height / bands + 1);
    }

    const portrait = height > width;
    const sunRadius = Math.min(width, height) * (portrait ? 0.14 : 0.12);
    const sunX = width * (portrait ? 0.8 : 0.88);
    const sunY = height * (portrait ? 0.1 : 0.52);
    g.fillStyle(PALETTE.sun, 1);
    g.fillCircle(sunX, sunY, sunRadius);
    g.lineStyle(4, PALETTE.ink, 0.25);
    g.strokeCircle(sunX, sunY, sunRadius);

    const horizon = height * 0.74;
    g.fillStyle(PALETTE.hillFar, 1);
    g.fillEllipse(width * 0.2, horizon + height * 0.02, width * 0.9, height * 0.22);
    g.fillEllipse(width * 0.85, horizon + height * 0.03, width * 0.8, height * 0.2);
    g.fillStyle(PALETTE.hillNear, 1);
    g.fillRect(0, horizon + height * 0.06, width, height);
    g.lineStyle(4, PALETTE.ink, 1);
    g.lineBetween(0, horizon + height * 0.06, width, horizon + height * 0.06);

    // Little goal on the hill, drawn as a storybook doodle.
    const goalW = Math.min(width, height) * 0.22;
    const goalH = goalW * 0.42;
    const gx = width * 0.14;
    const gy = horizon + height * 0.06 - goalH;
    g.lineStyle(1.5, PALETTE.ink, 0.35);
    for (let i = 1; i < 6; i++) g.lineBetween(gx + (goalW * i) / 6, gy, gx + (goalW * i) / 6, gy + goalH);
    for (let i = 1; i < 3; i++) g.lineBetween(gx, gy + (goalH * i) / 3, gx + goalW, gy + (goalH * i) / 3);
    g.lineStyle(5, PALETTE.ink, 1);
    g.strokeRect(gx, gy, goalW, goalH + 2);
    g.lineStyle(3, PALETTE.cream, 1);
    g.strokeRect(gx, gy, goalW, goalH + 2);
  }
}

function boundsOf(object: { getBounds(): Phaser.Geom.Rectangle }): Rect {
  const b = object.getBounds();
  return { x: b.x, y: b.y, width: b.width, height: b.height };
}
