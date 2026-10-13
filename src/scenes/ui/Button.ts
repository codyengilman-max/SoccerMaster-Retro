import Phaser from 'phaser';
import { FONT_FAMILY, PALETTE, CSS, textResolution } from '../../render/theme';

export interface ButtonOptions {
  readonly name: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly fontSize: number;
  readonly onClick: () => void;
  readonly fill?: number;
  readonly fillPressed?: number;
}

/**
 * Rounded storybook button. Its pointer listeners live on the game object,
 * so they are removed when the owning scene shuts down and destroys it.
 */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly onClick: () => void;
  private readonly fill: number;
  private readonly fillPressed: number;
  private buttonWidth: number;
  private buttonHeight: number;
  private pressed = false;
  private hovered = false;

  constructor(scene: Phaser.Scene, x: number, y: number, options: ButtonOptions) {
    super(scene, x, y);
    this.onClick = options.onClick;
    this.fill = options.fill ?? PALETTE.mustard;
    this.fillPressed = options.fillPressed ?? PALETTE.mustardDark;
    this.buttonWidth = options.width;
    this.buttonHeight = options.height;
    this.setName(options.name);

    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, options.label, {
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        fontSize: `${options.fontSize}px`,
        color: CSS.ink,
        align: 'center',
      })
      .setOrigin(0.5)
      .setResolution(textResolution());
    this.add([this.bg, this.label]);

    this.setSize(this.buttonWidth, this.buttonHeight);
    this.setInteractive({ useHandCursor: true });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => this.setHover(true));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      this.pressed = false;
      this.setHover(false);
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.pressed = true;
      this.redraw();
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      const wasPressed = this.pressed;
      this.pressed = false;
      this.redraw();
      if (wasPressed) this.onClick();
    });

    scene.add.existing(this);
    this.redraw();
  }

  resize(width: number, height: number, fontSize: number): this {
    this.buttonWidth = width;
    this.buttonHeight = height;
    this.setSize(width, height);
    const hitArea = this.input?.hitArea as Phaser.Geom.Rectangle | undefined;
    hitArea?.setTo(0, 0, width, height);
    this.label.setFontSize(fontSize);
    this.redraw();
    return this;
  }

  /** Visual bounds in scene coordinates (a Container's own getBounds ignores Graphics). */
  getButtonBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.buttonWidth / 2,
      y: this.y - this.buttonHeight / 2,
      width: this.buttonWidth,
      height: this.buttonHeight,
    };
  }

  private setHover(hovered: boolean): void {
    this.hovered = hovered;
    this.redraw();
  }

  private redraw(): void {
    const w = this.buttonWidth;
    const h = this.buttonHeight;
    const radius = Math.min(h / 2, 18);
    const drop = Math.max(3, Math.round(h * 0.08));
    const offset = this.pressed ? drop : 0;
    const g = this.bg;
    g.clear();
    g.fillStyle(PALETTE.ink, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + drop, w, h, radius);
    g.fillStyle(this.pressed ? this.fillPressed : this.fill, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + offset, w, h, radius);
    if (this.hovered && !this.pressed) {
      g.fillStyle(PALETTE.cream, 0.25);
      g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h * 0.4, Math.max(2, radius - 4));
    }
    g.lineStyle(Math.max(3, Math.round(h * 0.06)), PALETTE.ink, 1);
    g.strokeRoundedRect(-w / 2, -h / 2 + offset, w, h, radius);
    this.label.setY(offset);
  }
}
