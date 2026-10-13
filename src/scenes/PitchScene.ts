import Phaser from 'phaser';
import { createTrainingGroundState, pitchMarkings, type PitchMarkings, type Rect, type TrainingGroundState, type Vec2 } from '../game';
import {
  arcPoints,
  fitPitch,
  orientationOf,
  rectToScreen,
  toScreen,
  type Insets,
  type PitchLayout,
} from '../render/layout';
import {
  BALL_TEXTURE_SIZE,
  PLAYER_TEXTURE_SIZE,
  TEXTURES,
  ensurePlaceholderTextures,
} from '../render/textures';
import { CSS, FONT_FAMILY, PALETTE, textResolution } from '../render/theme';
import type { InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';

const PITCH_MARGIN_YARDS = 4;
const PORTRAIT_TOP_BAND = 72;
const LANDSCAPE_LEFT_BAND = 120;
const EDGE = 12;

/** Static Milestone 1 pitch. Draws the training-ground state; no gameplay. */
export class PitchScene extends Phaser.Scene implements InspectableScene {
  private state!: TrainingGroundState;
  private markings!: PitchMarkings;
  private pitchLayout!: PitchLayout;
  private field!: Phaser.GameObjects.Graphics;
  private player!: Phaser.GameObjects.Image;
  private ball!: Phaser.GameObjects.Image;
  private heading!: Phaser.GameObjects.Text;
  private note!: Phaser.GameObjects.Text;
  private backButton!: Button;
  private navigating = false;

  constructor() {
    super(SceneKeys.Pitch);
  }

  create(): void {
    this.navigating = false;
    this.state = createTrainingGroundState();
    this.markings = pitchMarkings(this.state.pitch);
    ensurePlaceholderTextures(this);

    const resolution = textResolution();
    this.field = this.add.graphics();
    this.ball = this.add.image(0, 0, TEXTURES.ball).setName('ball');
    this.player = this.add.image(0, 0, TEXTURES.player).setOrigin(0.5, 0.95).setName('player');
    this.heading = this.add
      .text(0, 0, 'Training Ground', {
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        color: CSS.cream,
        stroke: CSS.ink,
        strokeThickness: 5,
        align: 'center',
      })
      .setResolution(resolution);
    this.note = this.add
      .text(0, 0, 'Static preview', {
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        color: CSS.cream,
        align: 'center',
      })
      .setAlpha(0.85)
      .setResolution(resolution);
    this.backButton = new Button(this, 0, 0, {
      name: 'back-button',
      label: '‹ Back',
      width: 104,
      height: 48,
      fontSize: 20,
      fill: PALETTE.cream,
      fillPressed: PALETTE.sand,
      onClick: () => this.goBack(),
    });

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.input.keyboard?.on('keydown-ESC', this.goBack, this);
    this.input.keyboard?.on('keydown-BACKSPACE', this.goBack, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.layout(this.scale.width, this.scale.height);
  }

  describeLayout(): SceneLayoutReport {
    const { width, height } = this.scale;
    const pitch = rectToScreen(this.pitchLayout, this.markings.boundary);
    const [leftGoal, rightGoal] = this.markings.goals;
    return {
      orientation: this.pitchLayout.orientation,
      viewport: { width, height },
      elements: {
        pitch,
        goalA: rectToScreen(this.pitchLayout, leftGoal),
        goalB: rectToScreen(this.pitchLayout, rightGoal),
        player: boundsOf(this.player),
        ball: boundsOf(this.ball),
        heading: boundsOf(this.heading),
        'back-button': this.backButton.getButtonBounds(),
      },
    };
  }

  private goBack(): void {
    if (this.navigating) return;
    this.navigating = true;
    this.scene.start(SceneKeys.Start);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.layout(gameSize.width, gameSize.height);
  }

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.input.keyboard?.off('keydown-ESC', this.goBack, this);
    this.input.keyboard?.off('keydown-BACKSPACE', this.goBack, this);
  }

  private layout(width: number, height: number): void {
    const portrait = orientationOf({ width, height }) === 'portrait';
    const insets: Insets = portrait
      ? { top: PORTRAIT_TOP_BAND, right: EDGE, bottom: EDGE, left: EDGE }
      : { top: EDGE, right: EDGE, bottom: EDGE, left: LANDSCAPE_LEFT_BAND };
    this.pitchLayout = fitPitch({ width, height }, this.state.pitch.length, this.state.pitch.width, insets, PITCH_MARGIN_YARDS);

    this.drawField(width, height);
    this.placeEntities();

    this.backButton.resize(96, 48, 20).setPosition(EDGE + 48, EDGE + 24);
    if (portrait) {
      this.heading.setFontSize(22).setOrigin(1, 0.5).setPosition(width - EDGE, EDGE + 14);
      this.note.setFontSize(13).setOrigin(1, 0.5).setPosition(width - EDGE, EDGE + 40);
    } else {
      this.heading.setFontSize(18).setOrigin(0.5, 0).setPosition(EDGE + 48, EDGE + 60);
      this.heading.setText('Training\nGround');
      this.note.setFontSize(12).setOrigin(0.5, 0).setPosition(EDGE + 48, this.heading.y + this.heading.displayHeight + 6);
      this.note.setText('Static\npreview');
      return;
    }
    this.heading.setText('Training Ground');
    this.note.setText('Static preview');
  }

  private placeEntities(): void {
    const s = this.pitchLayout.scale;
    const playerHeight = Phaser.Math.Clamp(s * 4.2, 34, 110);
    this.player.setScale(playerHeight / PLAYER_TEXTURE_SIZE.height);
    const p = toScreen(this.pitchLayout, this.state.player.position);
    this.player.setPosition(p.x, p.y);

    const ballSize = Phaser.Math.Clamp(s * 1.4, 12, 34);
    this.ball.setScale(ballSize / BALL_TEXTURE_SIZE.width);
    const b = toScreen(this.pitchLayout, this.state.ball.position);
    this.ball.setPosition(b.x, b.y);
  }

  private drawField(width: number, height: number): void {
    const g = this.field;
    const L = this.pitchLayout;
    const m = this.markings;
    const s = L.scale;
    g.clear();

    // Surround and running track
    g.fillStyle(PALETTE.track, 1);
    g.fillRect(0, 0, width, height);
    const surround = rectToScreen(L, {
      x: -PITCH_MARGIN_YARDS,
      y: -PITCH_MARGIN_YARDS,
      width: L.pitchLength + PITCH_MARGIN_YARDS * 2,
      height: L.pitchWidth + PITCH_MARGIN_YARDS * 2,
    });
    g.fillStyle(PALETTE.surround, 1);
    g.fillRoundedRect(surround.x, surround.y, surround.width, surround.height, Math.min(16, s * 2));
    g.lineStyle(4, PALETTE.ink, 1);
    g.strokeRoundedRect(surround.x, surround.y, surround.width, surround.height, Math.min(16, s * 2));

    // Mowing stripes across the length
    const stripes = 10;
    const stripeLength = L.pitchLength / stripes;
    for (let i = 0; i < stripes; i++) {
      const r = rectToScreen(L, { x: i * stripeLength, y: 0, width: stripeLength, height: L.pitchWidth });
      g.fillStyle(i % 2 === 0 ? PALETTE.grassLight : PALETTE.grassDark, 1);
      g.fillRect(r.x, r.y, r.width, r.height);
    }

    const lineWidth = Math.max(2, s * 0.3);
    const strokeRect = (rect: Rect): void => {
      const r = rectToScreen(L, rect);
      g.strokeRect(r.x, r.y, r.width, r.height);
    };
    const strokePolyline = (points: readonly Vec2[]): void => {
      const screen = points.map((pt) => toScreen(L, pt));
      g.strokePoints(screen, false);
    };
    const dot = (pt: Vec2, radius: number): void => {
      const sp = toScreen(L, pt);
      g.fillCircle(sp.x, sp.y, radius);
    };

    // Ink outline under cream lines for the clear storybook outline look.
    for (const [color, widthPx] of [
      [PALETTE.ink, lineWidth + 2],
      [PALETTE.line, lineWidth],
    ] as const) {
      g.lineStyle(widthPx, color, 1);
      strokeRect(m.boundary);
      strokePolyline([
        { x: m.halfwayX, y: 0 },
        { x: m.halfwayX, y: L.pitchWidth },
      ]);
      const c = toScreen(L, m.centerSpot);
      g.strokeCircle(c.x, c.y, m.centerCircleRadius * s);
      for (const box of m.penaltyAreas) strokeRect(box);
      for (const box of m.goalAreas) strokeRect(box);
      const cornerAngles: readonly (readonly [number, number])[] = [
        [0, Math.PI / 2],
        [Math.PI / 2, Math.PI],
        [Math.PI, Math.PI * 1.5],
        [Math.PI * 1.5, Math.PI * 2],
      ];
      m.corners.forEach((corner, i) => {
        const [a0, a1] = cornerAngles[i] ?? [0, 0];
        strokePolyline(arcPoints(corner, m.cornerArcRadius, a0, a1, 6));
      });
    }

    g.fillStyle(PALETTE.line, 1);
    dot(m.centerSpot, Math.max(2.5, s * 0.35));
    for (const mark of m.penaltyMarks) dot(mark, Math.max(2, s * 0.3));

    // Goals behind each goal line: net hatch + thick posts.
    for (const goal of m.goals) {
      const r = rectToScreen(L, goal);
      g.fillStyle(PALETTE.net, 0.35);
      g.fillRect(r.x, r.y, r.width, r.height);
      g.lineStyle(1, PALETTE.ink, 0.45);
      const step = Math.max(4, s * 0.8);
      for (let x = r.x + step; x < r.x + r.width; x += step) g.lineBetween(x, r.y, x, r.y + r.height);
      for (let y = r.y + step; y < r.y + r.height; y += step) g.lineBetween(r.x, y, r.x + r.width, y);
      g.lineStyle(lineWidth + 3, PALETTE.ink, 1);
      g.strokeRect(r.x, r.y, r.width, r.height);
      g.lineStyle(lineWidth + 1, PALETTE.cream, 1);
      g.strokeRect(r.x, r.y, r.width, r.height);
    }

    // Soft shadows beneath the static player and ball.
    const p = toScreen(L, this.state.player.position);
    const b = toScreen(L, this.state.ball.position);
    g.fillStyle(PALETTE.shadow, 0.3);
    g.fillEllipse(p.x, p.y, Math.max(18, s * 2.2), Math.max(6, s * 0.7));
    g.fillEllipse(b.x + 2, b.y + Math.max(5, s * 0.6), Math.max(10, s * 1.3), Math.max(4, s * 0.45));
  }
}

function boundsOf(object: { getBounds(): Phaser.Geom.Rectangle }): Rect {
  const b = object.getBounds();
  return { x: b.x, y: b.y, width: b.width, height: b.height };
}
