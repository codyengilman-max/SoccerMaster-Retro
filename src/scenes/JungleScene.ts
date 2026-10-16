import Phaser from 'phaser';
import type { Rect } from '../game';
import { COMPETITORS, JUNGLE, abandon, command, drainEvents, newJungle, standings, step, type CompetitorId, type JungleState } from '../game/jungle/sim';
import type { PadEvent } from '../input/joystickControls';
import { orientationOf } from '../render/layout';
import { CSS, FONT_FAMILY, textResolution } from '../render/theme';
import type { GameplayScene, InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';
import { PadHud } from './ui/PadHud';

export interface JungleData {
  readonly runId?: string;
  readonly returnTo?: 'story';
  readonly seed?: number;
}

/** What a finished or abandoned round leaves for the story to read (never match growth). */
export interface JungleRecord {
  readonly runId: string;
  readonly status: 'completed' | 'abandoned';
  readonly scores: Readonly<Record<CompetitorId, number>>;
  readonly place: number;
}

const NAMES: Record<CompetitorId, string> = { player: 'You', alex: 'Alex', blake: 'Blake', sam: 'Sam' };
const COLORS: Record<CompetitorId, number> = { player: 0xf2c14e, alex: 0x4d9de0, blake: 0xe15554, sam: 0x7768ae };
const MAX_CHARGE_MS = 900;

/**
 * Jungle Ball mini-game: one shared goal, a neutral keeper, the player and three AI competitors.
 * The scene only draws `JungleState` and turns the joystick + SHOOT button into sim commands.
 */
export class JungleScene extends Phaser.Scene implements InspectableScene, GameplayScene {
  private sim!: JungleState;
  private runId = '';
  private returnTo: 'story' | null = null;
  private g!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private title!: Phaser.GameObjects.Text;
  private result!: Phaser.GameObjects.Text;
  private labels: Partial<Record<CompetitorId, Phaser.GameObjects.Text>> = {};
  private backButton!: Button;
  private continueButton!: Button;
  private pad!: PadHud;
  private pen: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private scale1 = 1;
  private chargeStart: number | null = null;
  private keys = new Set<string>();
  private saved = false;
  private leaving = false;

  constructor() {
    super(SceneKeys.Jungle);
  }

  create(data: JungleData = {}): void {
    this.runId = typeof data.runId === 'string' ? data.runId : '';
    this.returnTo = data.returnTo === 'story' ? 'story' : null;
    this.sim = newJungle(Number.isInteger(data.seed) ? (data.seed as number) : Math.floor(Math.random() * 1e9));
    this.saved = false;
    this.leaving = false;
    this.chargeStart = null;
    this.keys.clear();
    this.labels = {};
    this.cameras.main.setBackgroundColor('#1f3d2b');
    this.g = this.add.graphics();
    const text = (size: number, color = CSS.cream): Phaser.GameObjects.Text =>
      this.add.text(0, 0, '', { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color, align: 'center', resolution: textResolution() }).setOrigin(0.5);
    this.title = text(18).setText('Jungle Ball — one goal, everyone for themselves');
    this.hud = text(16);
    this.result = text(20).setVisible(false);
    for (const id of COMPETITORS) this.labels[id] = text(12).setText(NAMES[id]);
    this.backButton = new Button(this, 0, 0, { name: 'back-button', label: '‹ Leave', width: 110, height: 44, fontSize: 16, onClick: () => this.leave() });
    this.continueButton = new Button(this, 0, 0, { name: 'continue-button', label: this.returnTo ? 'Back to story' : 'Menu', width: 200, height: 52, fontSize: 18, onClick: () => this.exit() });
    this.continueButton.setVisible(false);
    this.pad = new PadHud(this, this.scale.width, this.scale.height);

    this.input.addPointer(2);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.input.keyboard?.on('keydown', this.onKeyDown, this);
    this.input.keyboard?.on('keyup', this.onKeyUp, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.layout(this.scale.width, this.scale.height);
  }

  override update(_time: number, delta: number): void {
    if (this.sim.phase !== 'ended') {
      this.handlePad(this.pad.controls.setAvailable({ pass: false, shoot: this.sim.ball.owner === 'player', slide: false, block: false }));
      step(this.sim, Math.min(delta, 100) / 1000);
      drainEvents(this.sim);
      if ((this.sim.phase as JungleState['phase']) === 'ended') void this.finish('completed');
    }
    this.draw();
  }

  describeLayout(): SceneLayoutReport {
    const { width, height } = this.scale;
    const bounds = (t: Phaser.GameObjects.Text): Rect => {
      const b = t.getBounds();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    };
    const L = this.pad.controls.currentLayout;
    return {
      orientation: orientationOf({ width, height }),
      viewport: { width, height },
      elements: {
        pen: this.pen,
        hud: bounds(this.hud),
        'back-button': this.backButton.getButtonBounds(),
        stick: { x: L.stick.x - L.stick.r, y: L.stick.y - L.stick.r, width: L.stick.r * 2, height: L.stick.r * 2 },
        shoot: { x: L.buttons.shoot.x - L.buttons.shoot.r, y: L.buttons.shoot.y - L.buttons.shoot.r, width: L.buttons.shoot.r * 2, height: L.buttons.shoot.r * 2 },
        ...(this.continueButton.visible ? { 'continue-button': this.continueButton.getButtonBounds() } : {}),
      },
    };
  }

  describeGameplay(): unknown {
    const s = this.sim;
    return {
      phase: s.phase,
      t: s.t,
      owner: s.ball.owner,
      ball: { ...s.ball.pos },
      player: { ...s.competitors.player.pos },
      scores: { ...s.scores },
      charging: this.chargeStart !== null,
      saved: this.saved,
      runId: this.runId,
    };
  }

  private toScreen(x: number, y: number): { x: number; y: number } {
    return { x: this.pen.x + x * this.scale1, y: this.pen.y + y * this.scale1 };
  }

  private layout(width: number, height: number): void {
    const portrait = height > width;
    const top = 70;
    const bottom = portrait ? Math.max(200, height * 0.3) : 24;
    const side = portrait ? 12 : Math.max(150, width * 0.2);
    const k = Math.min((width - side * 2) / JUNGLE.length, (height - top - bottom) / JUNGLE.width);
    this.scale1 = Math.max(4, k);
    const w = JUNGLE.length * this.scale1;
    const h = JUNGLE.width * this.scale1;
    this.pen = { x: (width - w) / 2, y: top + (height - top - bottom - h) / 2, width: w, height: h };
    this.title.setFontSize(Math.round(Math.max(13, Math.min(width * 0.035, 20)))).setPosition(width / 2, 16).setWordWrapWidth(width - 140);
    this.hud.setPosition(width / 2, 46);
    this.backButton.setPosition(68, 26);
    this.result.setPosition(width / 2, height / 2 - 40).setWordWrapWidth(Math.min(width - 40, 420));
    this.continueButton.setPosition(width / 2, height / 2 + 70);
    this.handlePad(this.pad.layout(width, height));
  }

  private draw(): void {
    const g = this.g;
    const s = this.sim;
    const p = this.pen;
    g.clear();
    g.fillStyle(0x2e7d32, 1).fillRect(p.x, p.y, p.width, p.height);
    for (let i = 0; i < 8; i++) if (i % 2 === 0) g.fillStyle(0x338a38, 1).fillRect(p.x + (p.width / 8) * i, p.y, p.width / 8, p.height);
    g.lineStyle(Math.max(3, this.scale1 * 0.25), 0x6d4c2f, 1).strokeRect(p.x, p.y, p.width, p.height);
    for (let i = 0; i <= 10; i++) g.fillStyle(0x4caf50, 1).fillCircle(p.x + (p.width / 10) * i, p.y, this.scale1 * 0.45).fillCircle(p.x + (p.width / 10) * i, p.y + p.height, this.scale1 * 0.45);
    const mid = JUNGLE.width / 2;
    const g1 = this.toScreen(JUNGLE.goalX, mid - JUNGLE.goalHalfWidth);
    const g2 = this.toScreen(JUNGLE.goalX, mid + JUNGLE.goalHalfWidth);
    g.fillStyle(0xf5f5f5, 0.35).fillRect(g1.x - 2, g1.y, this.scale1 * 1.2, g2.y - g1.y);
    g.lineStyle(4, 0xffffff, 1).lineBetween(g1.x, g1.y, g2.x, g2.y);
    const kp = this.toScreen(JUNGLE.goalX - 0.6, s.keeper.y);
    g.fillStyle(0x9e9e9e, 1).fillRect(kp.x - this.scale1 * 0.4, kp.y - this.scale1 * JUNGLE.keeperReach, this.scale1 * 0.8, this.scale1 * JUNGLE.keeperReach * 2);
    for (const id of COMPETITORS) {
      const c = s.competitors[id];
      const q = this.toScreen(c.pos.x, c.pos.y);
      const r = JUNGLE.playerRadius * this.scale1 * 1.2;
      const stunned = s.t < c.stunUntil;
      g.fillStyle(0x000000, 0.25).fillEllipse(q.x, q.y + r * 0.6, r * 2, r * 0.8);
      g.fillStyle(COLORS[id], stunned ? 0.5 : 1).fillCircle(q.x, q.y, r);
      g.lineStyle(id === 'player' ? 3 : 2, id === 'player' ? 0xffffff : 0x1b1b1b, 1).strokeCircle(q.x, q.y, r);
      if (s.t < c.protectedUntil && !stunned) g.lineStyle(2, 0xb3e5fc, 0.8).strokeCircle(q.x, q.y, r + 4);
      this.labels[id]?.setPosition(q.x, q.y - r - 9);
    }
    const b = this.toScreen(s.ball.pos.x, s.ball.pos.y);
    g.fillStyle(0xffffff, 1).fillCircle(b.x, b.y, Math.max(4, JUNGLE.ballRadius * this.scale1 * 1.6));
    g.lineStyle(2, 0x1b1b1b, 1).strokeCircle(b.x, b.y, Math.max(4, JUNGLE.ballRadius * this.scale1 * 1.6));
    if (this.chargeStart !== null) {
      const k = Math.min(1, (performance.now() - this.chargeStart) / MAX_CHARGE_MS);
      const me = this.toScreen(s.competitors.player.pos.x, s.competitors.player.pos.y);
      g.fillStyle(0x000000, 0.5).fillRect(me.x - 20, me.y + 16, 40, 6);
      g.fillStyle(0xf2c14e, 1).fillRect(me.x - 20, me.y + 16, 40 * k, 6);
    }
    const left = Math.max(0, Math.ceil(JUNGLE.roundSeconds - s.t));
    this.hud.setText(`${left}s   ${COMPETITORS.map((id) => `${NAMES[id]} ${s.scores[id]}`).join('  ·  ')}`);
    this.pad.setVisible(s.phase !== 'ended');
    this.pad.draw();
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.sim.phase !== 'ended') this.handlePad(this.pad.controls.pointerDown(p.id, p.x, p.y));
  }
  private onMove(p: Phaser.Input.Pointer): void {
    if (p.isDown) this.handlePad(this.pad.controls.pointerMove(p.id, p.x, p.y));
  }
  private onUp(p: Phaser.Input.Pointer): void {
    this.handlePad(this.pad.controls.pointerUp(p.id));
  }

  private handlePad(events: readonly PadEvent[]): void {
    for (const e of events) {
      if (e.type === 'move') command(this.sim, { type: 'move', x: e.x, y: e.y });
      else if (e.action !== 'shoot') continue;
      else if (e.type === 'press') this.chargeStart = performance.now();
      else if (e.type === 'release') this.releaseShot();
      else this.chargeStart = null;
    }
  }

  /** Aim at the goal; the stick's vertical part steers toward a post. Power grows with the hold. */
  private releaseShot(): void {
    if (this.chargeStart === null) return;
    const held = performance.now() - this.chargeStart;
    this.chargeStart = null;
    const me = this.sim.competitors.player.pos;
    const aimY = JUNGLE.width / 2 + this.sim.stick.y * (JUNGLE.goalHalfWidth - 0.4);
    command(this.sim, { type: 'kick', x: JUNGLE.goalX - me.x, y: aimY - me.y, power: 0.3 + 0.7 * Math.min(1, held / MAX_CHARGE_MS) });
  }

  private onKeyDown(e: KeyboardEvent): void {
    const dirs: Record<string, readonly [number, number]> = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
    if (e.code === 'Escape') return this.leave();
    if (dirs[e.code]) {
      this.keys.add(e.code);
      this.sendKeys(dirs);
    } else if ((e.code === 'Space' || e.code === 'KeyK') && !e.repeat && this.sim.ball.owner === 'player') this.chargeStart = performance.now();
  }
  private onKeyUp(e: KeyboardEvent): void {
    const dirs: Record<string, readonly [number, number]> = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
    if (dirs[e.code]) {
      this.keys.delete(e.code);
      this.sendKeys(dirs);
    } else if (e.code === 'Space' || e.code === 'KeyK') this.releaseShot();
  }
  private sendKeys(dirs: Record<string, readonly [number, number]>): void {
    let x = 0;
    let y = 0;
    for (const k of this.keys) (x += dirs[k]?.[0] ?? 0), (y += dirs[k]?.[1] ?? 0);
    const m = Math.hypot(x, y) || 1;
    command(this.sim, { type: 'move', x: x / m, y: y / m });
  }

  private onBlur(): void {
    this.chargeStart = null;
    this.keys.clear();
    command(this.sim, { type: 'move', x: 0, y: 0 });
    this.handlePad(this.pad.controls.cancelAll('blur'));
  }
  private onResize(size: Phaser.Structs.Size): void {
    this.chargeStart = null;
    this.layout(size.width, size.height);
  }

  /** Leaving early keeps the goals so far and records no defeat. */
  private leave(): void {
    if (this.leaving) return;
    if (this.sim.phase !== 'ended') {
      abandon(this.sim);
      void this.finish('abandoned').then(() => this.exit());
      return;
    }
    this.exit();
  }

  private async finish(status: JungleRecord['status']): Promise<void> {
    if (this.saved) return;
    this.saved = true;
    const rows = standings(this.sim);
    const place = rows.find((r) => r.id === 'player')!.place;
    if (this.runId) {
      const { StoryStore } = await import('../game/story/store');
      const store = await StoryStore.open();
      const rec: JungleRecord = { runId: this.runId, status, scores: { ...this.sim.scores }, place };
      // First write wins: a finished round is never rewritten by a later visit.
      if ((await store.getRecord(`jungle:${this.runId}`)) === undefined) await store.putRecord(`jungle:${this.runId}`, rec);
      store.close();
    }
    if (status === 'completed' && this.scene.isActive()) {
      const lines = rows.map((r) => `${r.place}. ${NAMES[r.id]} — ${r.score}`);
      this.result.setText(`Final whistle!\n${lines.join('\n')}\n\nJust for fun: Jungle Ball scores never count as match growth.`).setVisible(true);
      this.continueButton.setVisible(true);
    }
  }

  private exit(): void {
    if (this.leaving) return;
    this.leaving = true;
    if (this.returnTo === 'story') this.scene.start(SceneKeys.Story, { resume: true });
    else this.scene.start(SceneKeys.Start);
  }

  private onShutdown(): void {
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.input.keyboard?.off('keydown', this.onKeyDown, this);
    this.input.keyboard?.off('keyup', this.onKeyUp, this);
    this.pad.destroy();
  }
}
