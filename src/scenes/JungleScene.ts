import Phaser from 'phaser';
import type { Rect } from '../game';
import { COMPETITORS, JUNGLE, abandon, canMove, command, drainEvents, newJungle, standings, step, type CompetitorId, type JungleState } from '../game/jungle/sim';
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
const HITSTOP_MS = 70;
const SKIN: Record<CompetitorId, number> = { player: 0xf1c27d, alex: 0xc68642, blake: 0xffdbac, sam: 0x8d5524 };
const HAIR: Record<CompetitorId, number> = { player: 0x3b2314, alex: 0x111111, blake: 0xe0b44c, sam: 0x2a1a0e };

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
  private banner!: Phaser.GameObjects.Text;
  private bannerUntil = 0;
  private freezeUntil = 0;
  private wasRestart = true;
  /** Stage geometry: floor band for the pitch's depth axis, the jungle wall above it. */
  private floorTop = 0;
  private kx = 1;
  private ky = 1;

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
    this.title = text(18).setText('JUNGLE BALL');
    this.banner = this.add
      .text(0, 0, '', { fontFamily: FONT_FAMILY, fontSize: '44px', fontStyle: 'bold', color: '#ffd23f', stroke: '#3a1300', strokeThickness: 8, align: 'center', resolution: textResolution() })
      .setOrigin(0.5)
      .setDepth(6000)
      .setVisible(false);
    this.bannerUntil = 0;
    this.freezeUntil = 0;
    this.wasRestart = true;
    this.hud = text(16);
    this.result = text(20).setVisible(false);
    for (const id of COMPETITORS) this.labels[id] = text(12).setText(NAMES[id]);
    this.backButton = new Button(this, 0, 0, { name: 'back-button', label: '‹ Leave', width: 110, height: 44, fontSize: 16, onClick: () => this.leave() });
    this.continueButton = new Button(this, 0, 0, { name: 'continue-button', label: this.returnTo ? 'Back to story' : 'Menu', width: 200, height: 52, fontSize: 18, onClick: () => this.exit() });
    this.continueButton.setVisible(false);
    this.pad = new PadHud(this, this.scale.width, this.scale.height, { labels: { slide: 'SLIDE', block: 'PUSH' }, hidden: ['pass'] });

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
    const now = performance.now();
    if (this.sim.phase !== 'ended' && now >= this.freezeUntil) {
      const me = this.sim.competitors.player;
      this.handlePad(this.pad.controls.setAvailable({ pass: false, shoot: this.sim.ball.owner === 'player', slide: canMove(this.sim, me, 'slide'), block: canMove(this.sim, me, 'push') }));
      step(this.sim, Math.min(delta, 100) / 1000);
      for (const e of drainEvents(this.sim)) {
        if (e.type === 'hit') {
          // Arcade hit-stop + shake; the sim itself is untouched (it just is not stepped for a few frames).
          this.freezeUntil = now + HITSTOP_MS;
          this.cameras.main.shake(110, 0.006);
          this.showBanner(e.kind === 'slide' ? 'SMASH!' : 'WHAM!', 450, 34);
        } else if (e.type === 'goal') this.showBanner(`GOAL!\n${NAMES[e.by].toUpperCase()}`, 1100);
        else if (e.type === 'save') this.showBanner('SAVED!', 600, 34);
      }
      const restart = (this.sim.phase as JungleState['phase']) === 'restart';
      if (this.wasRestart && !restart && this.sim.phase === 'live') this.showBanner('PLAY!', 600);
      this.wasRestart = restart;
      if ((this.sim.phase as JungleState['phase']) === 'ended') {
        this.showBanner('TIME!', 900);
        void this.finish('completed');
      }
    }
    if (this.sim.t < 0.05 && this.sim.phase === 'restart') this.showBanner('ROUND 1', 1000);
    this.banner.setVisible(now < this.bannerUntil);
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
        slide: { x: L.buttons.slide.x - L.buttons.slide.r, y: L.buttons.slide.y - L.buttons.slide.r, width: L.buttons.slide.r * 2, height: L.buttons.slide.r * 2 },
        push: { x: L.buttons.block.x - L.buttons.block.r, y: L.buttons.block.y - L.buttons.block.r, width: L.buttons.block.r * 2, height: L.buttons.block.r * 2 },
        title: bounds(this.title),
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
      hits: this.sim.competitors.player.lastMove,
      stunned: Object.fromEntries(COMPETITORS.map((id) => [id, s.t < s.competitors[id].stunUntil])),
      saved: this.saved,
      runId: this.runId,
    };
  }

  /** Pitch yards to the side-on stage: x runs across, the pitch's width becomes floor depth. */
  private toScreen(x: number, y: number): { x: number; y: number } {
    return { x: this.pen.x + x * this.kx, y: this.floorTop + y * this.ky };
  }

  private showBanner(text: string, ms: number, size = 44): void {
    this.banner.setText(text).setFontSize(Math.round(Math.min(size, this.scale.width * 0.11)));
    this.bannerUntil = performance.now() + ms;
  }

  private layout(width: number, height: number): void {
    const portrait = height > width;
    const top = 104;
    const bottom = portrait ? Math.max(210, height * 0.32) : 16;
    const side = portrait ? 8 : Math.max(150, width * 0.2);
    const w = Math.max(160, width - side * 2);
    const h = Math.max(120, height - top - bottom);
    this.pen = { x: (width - w) / 2, y: top, width: w, height: h };
    // Jungle wall takes the top of the stage; the floor (the pitch seen side-on) the rest.
    this.floorTop = top + h * 0.3;
    this.kx = w / JUNGLE.length;
    this.ky = (top + h - this.floorTop) / JUNGLE.width;
    this.scale1 = Math.min(this.kx, this.ky * 1.6);
    // Short title between Leave (left) and the screen edge, so nothing overlaps it in portrait.
    this.title.setFontSize(18).setPosition(width / 2 + 40, 26);
    this.hud.setVisible(false);
    this.backButton.setPosition(68, 26);
    this.banner.setPosition(width / 2, top + h * 0.45);
    // End screen: the button sits at the bottom and the standings stack above it.
    this.continueButton.setPosition(width / 2, height - 44);
    this.result.setOrigin(0.5, 1).setPosition(width / 2, height - 82).setWordWrapWidth(Math.min(width - 40, 420)).setDepth(6001);
    this.handlePad(this.pad.layout(width, height));
  }

  private drawBars(): void {
    const g = this.g;
    const s = this.sim;
    const W = this.scale.width;
    const lead = Math.max(3, ...COMPETITORS.map((id) => s.scores[id]));
    const timerW = 64;
    const barW = Math.max(60, (W - timerW - 40) / 4);
    const y = 58;
    const order: CompetitorId[] = ['player', 'alex', 'blake', 'sam'];
    order.forEach((id, i) => {
      const x = i < 2 ? 12 + i * (barW + 4) : W - 12 - (4 - i) * (barW + 4) + 4;
      g.fillStyle(0x1b1b1b, 1).fillRect(x - 2, y - 2, barW + 4, 18);
      g.fillStyle(0x8b1e1e, 1).fillRect(x, y, barW, 14);
      const k = s.scores[id] / lead;
      g.fillStyle(0xffd23f, 1).fillRect(i < 2 ? x : x + barW * (1 - k), y, barW * k, 14);
      g.fillStyle(COLORS[id], 1).fillRect(i < 2 ? x : x + barW - 8, y + 18, 8, 8);
      const lbl = this.labels[id];
      lbl?.setText(`${NAMES[id].toUpperCase()} ${s.scores[id]}`).setPosition(x + barW / 2, y + 30);
    });
    const left = Math.max(0, Math.ceil(JUNGLE.roundSeconds - s.t));
    g.fillStyle(0x1b1b1b, 1).fillRect(W / 2 - timerW / 2, y - 8, timerW, 36);
    g.lineStyle(3, 0xffd23f, 1).strokeRect(W / 2 - timerW / 2, y - 8, timerW, 36);
    this.hud.setVisible(true).setText(String(left)).setFontSize(26).setPosition(W / 2, y + 10);
  }

  /** Chunky upright pixel fighter standing on its floor point (feet), drawn back-to-front. */
  private drawFighter(id: CompetitorId): void {
    const g = this.g;
    const s = this.sim;
    const c = s.competitors[id];
    const f = this.toScreen(c.pos.x, c.pos.y);
    const depth = 0.85 + 0.3 * (c.pos.y / JUNGLE.width);
    const u = Math.max(2, this.scale1 * 0.42 * depth);
    const face = c.facing.x >= 0 ? 1 : -1;
    const stunned = s.t < c.stunUntil;
    const sliding = s.t < c.slideUntil || (s.t < c.lagUntil && c.lastMove?.kind === 'slide');
    const pushing = c.lastMove?.kind === 'push' && s.t - c.lastMove.t < 0.18;
    g.fillStyle(0x000000, 0.3).fillEllipse(f.x, f.y, u * 6, u * 1.6);
    if (sliding) {
      g.fillStyle(0x1b1b1b, 1).fillRect(f.x - u * 3.5, f.y - u * 2, u * 7, u * 2);
      g.fillStyle(COLORS[id], 1).fillRect(f.x - u * 3 * face - (face < 0 ? 0 : 0), f.y - u * 3, u * 4 * face, u * 2);
      g.fillStyle(SKIN[id], 1).fillRect(f.x - u * 3.5 * face - u, f.y - u * 4, u * 2, u * 2);
      return;
    }
    const run = Math.hypot(c.vel.x, c.vel.y) > 1 ? Math.sin(s.t * 18) : 0;
    g.fillStyle(0x1b1b1b, 1).fillRect(f.x - u * 1.6, f.y - u * 4 - run * u, u * 1.3, u * 4 + run * u).fillRect(f.x + u * 0.3, f.y - u * 4 + run * u, u * 1.3, u * 4 - run * u);
    g.fillStyle(COLORS[id], stunned ? 0.6 : 1).fillRect(f.x - u * 2, f.y - u * 8.5, u * 4, u * 4.5);
    g.fillStyle(SKIN[id], 1).fillRect(pushing ? f.x + face * u * 1.5 - (face < 0 ? u * 3.5 : 0) : f.x + face * u * 1.2 - u * 0.6, f.y - u * 7.8, pushing ? u * 3.5 : u * 1.2, u * 1.2);
    g.fillStyle(SKIN[id], 1).fillRect(f.x - u * 1.5, f.y - u * 11.5, u * 3, u * 3);
    g.fillStyle(HAIR[id], 1).fillRect(f.x - u * 1.6, f.y - u * 12, u * 3.2, u * 1.2);
    g.fillStyle(0x000000, 1).fillRect(f.x + face * u * 0.6 - u * 0.3, f.y - u * 10.6, u * 0.6, u * 0.6);
    if (id === 'player') g.fillStyle(0xffffff, 1).fillTriangle(f.x - u, f.y - u * 14, f.x + u, f.y - u * 14, f.x, f.y - u * 12.8);
    if (stunned) for (let i = 0; i < 3; i++) {
      const a = s.t * 9 + (i * Math.PI * 2) / 3;
      g.fillStyle(0xffd23f, 1).fillRect(f.x + Math.cos(a) * u * 2.4 - u * 0.4, f.y - u * 12.8 + Math.sin(a) * u * 0.6, u * 0.8, u * 0.8);
    } else if (s.t < c.protectedUntil) g.lineStyle(2, 0xb3e5fc, 0.8).strokeEllipse(f.x, f.y, u * 7, u * 2);
  }

  private draw(): void {
    const g = this.g;
    const s = this.sim;
    const p = this.pen;
    g.clear();
    // Jungle wall: sky strip, tree trunks, pixel leaves and hanging vines.
    g.fillStyle(0x0f2a1a, 1).fillRect(p.x, p.y, p.width, this.floorTop - p.y);
    for (let i = 0; i < 9; i++) {
      const tx = p.x + (p.width / 9) * (i + 0.5);
      g.fillStyle(0x4a2f1b, 1).fillRect(tx - 5, p.y + 8, 10, this.floorTop - p.y - 8);
      g.fillStyle(i % 2 ? 0x1e5631 : 0x2d6a3e, 1).fillRect(tx - 22, p.y, 44, 18);
      g.fillStyle(0x3f8f4f, 1).fillRect(tx + 6, p.y + 18, 3, ((i * 37) % 30) + 12);
    }
    // Floor: striped grass seen side-on, brown rail front and back.
    const fh = p.y + p.height - this.floorTop;
    for (let i = 0; i < 8; i++) g.fillStyle(i % 2 ? 0x338a38 : 0x2e7d32, 1).fillRect(p.x + (p.width / 8) * i, this.floorTop, p.width / 8, fh);
    g.fillStyle(0x6d4c2f, 1).fillRect(p.x, this.floorTop - 4, p.width, 4).fillRect(p.x, p.y + p.height, p.width, 6);
    // Goal on the right: posts, crossbar and net rising off the floor.
    const mid = JUNGLE.width / 2;
    const gb = this.toScreen(JUNGLE.goalX, mid - JUNGLE.goalHalfWidth);
    const gf = this.toScreen(JUNGLE.goalX, mid + JUNGLE.goalHalfWidth);
    const gh = this.scale1 * 4;
    g.fillStyle(0xffffff, 0.18).fillRect(gb.x - this.kx * 0.8, gb.y - gh, this.kx * 0.8, gf.y - gb.y + gh);
    g.lineStyle(4, 0xffffff, 1).lineBetween(gb.x, gb.y, gb.x, gb.y - gh).lineBetween(gf.x, gf.y, gf.x, gf.y - gh).lineBetween(gb.x, gb.y - gh, gf.x, gf.y - gh);
    const order = [...COMPETITORS].sort((a, b) => s.competitors[a].pos.y - s.competitors[b].pos.y);
    // Neutral keeper (grey) in front of the line.
    const kp = this.toScreen(JUNGLE.goalX - 0.6, s.keeper.y);
    const ku = this.scale1 * 0.42;
    g.fillStyle(0x9e9e9e, 1).fillRect(kp.x - ku * 2, kp.y - ku * 9, ku * 4, ku * 9);
    g.fillStyle(0xd7ccc8, 1).fillRect(kp.x - ku * 1.5, kp.y - ku * 12, ku * 3, ku * 3);
    let ballDrawn = false;
    const ball = (): void => {
      const b = this.toScreen(s.ball.pos.x, s.ball.pos.y);
      const r = Math.max(4, JUNGLE.ballRadius * this.scale1 * 1.8);
      g.fillStyle(0x000000, 0.3).fillEllipse(b.x, b.y, r * 2.2, r * 0.8);
      g.fillStyle(0xffffff, 1).fillCircle(b.x, b.y - r, r);
      g.lineStyle(2, 0x1b1b1b, 1).strokeCircle(b.x, b.y - r, r);
      ballDrawn = true;
    };
    for (const id of order) {
      if (!ballDrawn && s.ball.pos.y < s.competitors[id].pos.y) ball();
      this.drawFighter(id);
    }
    if (!ballDrawn) ball();
    if (this.chargeStart !== null) {
      const k = Math.min(1, (performance.now() - this.chargeStart) / MAX_CHARGE_MS);
      const me = this.toScreen(s.competitors.player.pos.x, s.competitors.player.pos.y);
      g.fillStyle(0x000000, 0.5).fillRect(me.x - 20, me.y + 8, 40, 6);
      g.fillStyle(0xf2c14e, 1).fillRect(me.x - 20, me.y + 8, 40 * k, 6);
    }
    this.drawBars();
    if (s.phase === 'ended') g.fillStyle(0x000000, 0.55).fillRect(0, 0, this.scale.width, this.scale.height);
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
      else if (e.type === 'press' && e.action === 'slide') command(this.sim, { type: 'slide' });
      else if (e.type === 'press' && e.action === 'block') command(this.sim, { type: 'push' });
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
    } else if (e.code === 'KeyJ' && !e.repeat) command(this.sim, { type: 'push' });
    else if (e.code === 'KeyL' && !e.repeat) command(this.sim, { type: 'slide' });
    else if ((e.code === 'Space' || e.code === 'KeyK') && !e.repeat && this.sim.ball.owner === 'player') this.chargeStart = performance.now();
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
      this.result.setText(`Final whistle!\n${lines.join('\n')}\nJust for fun: never counts as match growth.`).setVisible(true);
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
