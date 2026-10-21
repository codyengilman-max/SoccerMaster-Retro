import Phaser from 'phaser';
import { artTextureKey, artUrl } from '../render/art/urls';
import type { Rect } from '../game';
import { shouldExposeDevMenu } from '../debug/diagnostics';
import { orientationOf } from '../render/layout';
import { CSS, FONT_FAMILY, PALETTE, textResolution } from '../render/theme';
import type { InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';

export const GAME_TITLE = 'SoccerMaster Retro';

let labOpened = false;

export class StartScene extends Phaser.Scene implements InspectableScene {
  private background!: Phaser.GameObjects.Graphics;
  private homeArt: Phaser.GameObjects.Image | null = null;
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private footer!: Phaser.GameObjects.Text;
  private careerButton: Button | null = null;
  private sandboxButton: Button | null = null;
  private reviewButton: Button | null = null;
  private storyButton!: Button;
  private newGameButton: Button | null = null;
  private newGameArmed = 0;
  private jungleButton: Button | null = null;
  private dev = false;
  private navigating = false;

  constructor() {
    super(SceneKeys.Start);
  }

  create(): void {
    this.navigating = false;
    // Lab builds: `?lab&dev` opens the Gameplay Lab once per page load (story mode only without `?dev`).
    if (__LAB__ && !labOpened && shouldExposeDevMenu(window.location) && new URLSearchParams(window.location.search).get('lab') === '') {
      labOpened = true;
      this.navigating = true;
      this.time.delayedCall(0, () => this.scene.start(SceneKeys.Lab));
    }
    const resolution = textResolution();

    this.background = this.add.graphics();
    this.homeArt = null;
    this.loadHomeArt();
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
    this.dev = shouldExposeDevMenu(window.location);
    this.storyButton = new Button(this, 0, 0, {
      name: 'story-button',
      label: this.dev ? 'Story' : 'Play Story',
      width: 220,
      height: 48,
      fontSize: 18,
      onClick: () => this.openStory(),
    });

    this.newGameButton = null;
    this.newGameArmed = 0;
    if (!this.dev) {
      this.newGameButton = new Button(this, 0, 0, { name: 'newgame-button', label: 'New game', width: 220, height: 44, fontSize: 16, onClick: () => this.pressNewGame() });
    }
    // Story mode is the only way to play; developer and owner-review entries need `?dev`.
    this.careerButton = this.sandboxButton = this.reviewButton = this.jungleButton = null;
    if (this.dev) {
      this.sandboxButton = new Button(this, 0, 0, {
        name: 'sandbox-button',
        label: 'Play 9v9 Match',
        width: 280,
        height: 72,
        fontSize: 24,
        onClick: () => this.openSandbox(),
      });
      this.careerButton = new Button(this, 0, 0, {
        name: 'career-button',
        label: 'Home Training',
        width: 280,
        height: 72,
        fontSize: 24,
        onClick: () => this.openCareer(),
      });
      this.reviewButton = new Button(this, 0, 0, {
        name: 'review-button',
        label: 'Review & Lab',
        width: 220,
        height: 48,
        fontSize: 18,
        onClick: () => this.openReview(),
      });
      this.jungleButton = new Button(this, 0, 0, {
        name: 'jungle-button',
        label: 'Jungle Ball',
        width: 220,
        height: 48,
        fontSize: 18,
        onClick: () => this.openJungle(),
      });
    }

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    if (this.dev) this.input.keyboard?.on('keydown-T', this.openSandbox, this);
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
        'story-button': this.storyButton.getButtonBounds(),
        ...(this.newGameButton ? { 'newgame-button': this.newGameButton.getButtonBounds() } : {}),
        ...(this.careerButton ? { 'career-button': this.careerButton.getButtonBounds() } : {}),
        ...(this.sandboxButton ? { 'sandbox-button': this.sandboxButton.getButtonBounds() } : {}),
        ...(this.reviewButton ? { 'review-button': this.reviewButton.getButtonBounds() } : {}),
        ...(this.jungleButton ? { 'jungle-button': this.jungleButton.getButtonBounds() } : {}),
      },
    };
  }

  private openJungle(): void {
    if (this.navigating || !this.dev) return;
    this.navigating = true;
    this.scene.start(SceneKeys.Jungle);
  }

  private openCareer(): void {
    if (this.navigating || !this.dev) return;
    this.navigating = true;
    this.scene.start(SceneKeys.Career);
  }

  private openStory(): void {
    if (this.navigating) return;
    this.navigating = true;
    this.scene.start(SceneKeys.Story);
  }

  /** First tap arms (label asks to confirm); a second tap within 5 s starts over. The old save is archived, not deleted. */
  private pressNewGame(): void {
    if (this.navigating || !this.newGameButton) return;
    const now = performance.now();
    if (!this.newGameArmed || now - this.newGameArmed > 5000) {
      this.newGameArmed = now;
      this.newGameButton.setLabel('Tap again to start over');
      this.time.delayedCall(5000, () => {
        if (this.sys.isActive() && performance.now() - this.newGameArmed >= 4990) this.newGameButton?.setLabel('New game');
      });
      return;
    }
    this.navigating = true;
    this.scene.start(SceneKeys.Story, { newGame: true });
  }

  private openReview(): void {
    if (this.navigating || !this.dev) return;
    this.navigating = true;
    this.scene.start(SceneKeys.Career, { open: 'reviewHub' });
  }

  private openSandbox(): void {
    if (this.navigating || !this.dev) return;
    this.navigating = true;
    this.scene.start(SceneKeys.Formation);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.layout(gameSize.width, gameSize.height);
  }

  private handleShutdown(): void {
    this.homeArt?.destroy();
    this.homeArt = null;
    if (this.textures.exists(artTextureKey('home-screen'))) this.textures.remove(artTextureKey('home-screen'));
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.input.keyboard?.off('keydown-T', this.openSandbox, this);
  }

  private layout(width: number, height: number): void {
    const portrait = orientationOf({ width, height }) === 'portrait';
    this.drawBackground(width, height);
    this.fitHomeArt(width, height);

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

    if (!this.sandboxButton || !this.careerButton || !this.jungleButton || !this.reviewButton) {
      // Player build: one large Story button.
      const bw = Math.round(portrait ? Math.min(width * 0.8, 420) : Math.min(width * 0.42, 360));
      const bh = Math.round(Math.max(60, Math.min(height * (portrait ? 0.1 : 0.2), 96)));
      const font = Math.round(Math.max(18, Math.min(bw * 0.09, bh * 0.38, 32)));
      const y = portrait ? Math.min(height * 0.58, height - 48 - bh * 1.6 - 12) : Math.min(height * 0.58, height - 36 - bh * 1.6 - 12);
      this.storyButton.resize(bw, bh, font).setPosition(width / 2, y);
      this.newGameButton?.resize(Math.round(bw * 0.7), Math.max(44, Math.round(bh * 0.6)), Math.max(14, Math.round(font * 0.6))).setPosition(width / 2, y + bh / 2 + 12 + Math.max(44, Math.round(bh * 0.6)) / 2);
      this.footer.setFontSize(Math.max(11, Math.round(Math.min(width, height) * 0.032))).setPosition(width / 2, height - 10);
      return;
    }
    // Portrait stacks the buttons; landscape puts them side by side.
    const buttons = [this.sandboxButton, this.careerButton, this.jungleButton];
    const n = buttons.length;
    const buttonWidth = Math.round(portrait ? Math.min(width * 0.84, 460) : Math.min((width - 24 - 12 * n) / n, 300));
    const buttonHeight = Math.round(Math.max(56, Math.min(height * (portrait ? 0.085 : 0.2), 88)));
    const buttonFont = Math.round(Math.max(portrait ? 17 : 13, Math.min(buttonWidth * (portrait ? 0.075 : 0.085), buttonHeight * 0.34, 28)));
    for (const b of buttons) b.resize(buttonWidth, buttonHeight, buttonFont);
    if (portrait) {
      const gap = Math.max(10, height * 0.018);
      const reviewHeight = Math.round(buttonHeight * 0.8);
      const top = Math.min(height * 0.5, height - 40 - buttonHeight * n - gap * n - reviewHeight);
      buttons.forEach((b, i) => b.setPosition(width / 2, top + buttonHeight / 2 + i * (buttonHeight + gap)));
      const half = Math.round((buttonWidth - gap) / 2);
      const ry = top + n * (buttonHeight + gap) + reviewHeight / 2;
      this.storyButton.resize(half, reviewHeight, buttonFont).setPosition(width / 2 - (half + gap) / 2, ry);
      this.reviewButton.resize(half, reviewHeight, buttonFont).setPosition(width / 2 + (half + gap) / 2, ry);
    } else {
      const gap = 12;
      const y = height * 0.62;
      buttons.forEach((b, i) => b.setPosition(width / 2 + (i - (n - 1) / 2) * (buttonWidth + gap), y));
      const rh = Math.round(Math.max(44, Math.min(height * 0.13, 60)));
      const rw = Math.round(Math.min(width * 0.32, 260));
      const ry = y + buttonHeight / 2 + 10 + rh / 2;
      this.storyButton.resize(rw, rh, Math.round(Math.min(rh * 0.4, 22))).setPosition(width / 2 - (rw + gap) / 2, ry);
      this.reviewButton.resize(rw, rh, Math.round(Math.min(rh * 0.4, 22))).setPosition(width / 2 + (rw + gap) / 2, ry);
    }

    this.footer.setFontSize(Math.max(11, Math.round(Math.min(width, height) * 0.032))).setPosition(width / 2, height - 10);
  }

  /** Supplied home-screen illustration over the code-drawn sky; menu text stays live on top. */
  private loadHomeArt(): void {
    const key = artTextureKey('home-screen');
    const show = (): void => {
      if (!this.sys.isActive()) return;
      this.homeArt?.destroy();
      this.homeArt = this.add.image(0, 0, key).setDepth(-1);
      this.background.setDepth(-2);
      this.fitHomeArt(this.scale.width, this.scale.height);
    };
    if (this.textures.exists(key)) return show();
    const url = artUrl('home-screen');
    if (!url) return;
    this.load.image(key, url);
    this.load.once(`filecomplete-image-${key}`, show);
    if (!this.load.isLoading()) this.load.start();
  }

  private fitHomeArt(width: number, height: number): void {
    if (!this.homeArt) return;
    const k = Math.max(width / this.homeArt.width, height / this.homeArt.height);
    this.homeArt.setScale(k).setPosition(width / 2, height / 2);
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
