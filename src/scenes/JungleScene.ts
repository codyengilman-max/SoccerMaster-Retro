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
import { PLAYER_ART, PlayerArt } from '../render/art/playerArt';
import { sideLooks } from '../render/art/roster';
import { REFERENCE_KITS, dirFromScreen, type PoseKind, type SpriteLook } from '../render/art/spriteFactory';
import { artTextureKey, artUrl } from '../render/art/urls';
import { BALL_TEXTURE_SIZE, TEXTURES, ensurePlaceholderTextures } from '../render/textures';

export interface JungleData {
  readonly runId?: string;
  readonly returnTo?: 'story';
  readonly seed?: number;
  /** The career player's chosen look (story); free play from Start uses the boy reference. */
  readonly look?: 'boy' | 'girl';
}

/** What a finished or abandoned round leaves for the story to read (never match growth). */
export interface JungleRecord {
  readonly runId: string;
  readonly status: 'completed' | 'abandoned';
  readonly scores: Readonly<Record<CompetitorId, number>>;
  readonly place: number;
}

const NAMES: Record<CompetitorId, string> = { player: 'You', alex: 'Alex', blake: 'Blake', sam: 'Sam' };
const COLORS: Record<CompetitorId, number> = { player: 0xed813d, alex: 0x4d9de0, blake: 0xe15554, sam: 0x7768ae };
/** Bibs: the player wears reference kit 0; the others get their own colour so "everyone for themselves" reads at a glance. */
const KITS = {
  player: REFERENCE_KITS[0]!,
  alex: { shirt: '#4d9de0', shade: '#2f6fa8', light: '#7fbbee' },
  blake: { shirt: '#e15554', shade: '#a83a3a', light: '#f08080' },
  sam: { shirt: '#7768ae', shade: '#52487d', light: '#9d90cc' },
} as const;
const BG_ASSET = 'jungle-ball';
const MAX_CHARGE_MS = 900;
const HITSTOP_MS = 70;
const BIG_HITSTOP_MS = 140;

/**
 * Jungle Ball mini-game: one shared goal, a neutral keeper, the player and three AI competitors.
 * The scene only draws `JungleState` and turns the joystick + TURBO / SHOOT / SLIDE / PUSH into sim commands.
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
  private hudG!: Phaser.GameObjects.Graphics;
  private art!: PlayerArt;
  private looks!: Record<CompetitorId | 'keeper', SpriteLook>;
  private sprites: Partial<Record<CompetitorId | 'keeper', Phaser.GameObjects.Image>> = {};
  private artDir: Record<CompetitorId, number> = { player: 0, alex: 4, blake: 4, sam: 4 };
  private artDist: Record<CompetitorId, number> = { player: 0, alex: 0, blake: 0, sam: 0 };
  private lastT = 0;
  private ballImg!: Phaser.GameObjects.Image;
  private bg: Phaser.GameObjects.Image | null = null;
  private ownBg = false;
  private kickedAt: Partial<Record<CompetitorId, number>> = {};
  private savedAt: number | null = null;
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
    this.g = this.add.graphics().setDepth(1);
    this.hudG = this.add.graphics().setDepth(5000);
    ensurePlaceholderTextures(this);
    this.art = new PlayerArt(this);
    // Graphics v1 factory sprites. Alex, Blake and Sam have no supplied gameplay sheet, so they use reference roster hair (gap noted in STATUS).
    const look = data.look === 'girl' ? 'girl' : 'boy';
    const home = sideLooks('home', { slot: 1, look });
    const away = sideLooks('away');
    this.looks = {
      player: { ...home[1]!, kit: KITS.player, number: '10' },
      alex: { ...away[3]!, kit: KITS.alex, number: '7' },
      blake: { ...away[2]!, kit: KITS.blake, number: '9' },
      sam: { ...away[5]!, kit: KITS.sam, number: '4' },
      keeper: home[0]!,
    };
    this.sprites = {};
    for (const id of [...COMPETITORS, 'keeper'] as const) this.sprites[id] = this.add.image(0, 0, TEXTURES.ball).setOrigin(48 / 96, 68 / 96);
    this.ballImg = this.add.image(0, 0, TEXTURES.ball);
    this.artDir = { player: 0, alex: 4, blake: 4, sam: 4 };
    this.artDist = { player: 0, alex: 0, blake: 0, sam: 0 };
    this.lastT = 0;
    this.bg = null;
    this.ownBg = false;
    this.kickedAt = {};
    this.savedAt = null;
    this.loadBackground();
    const text = (size: number, color = CSS.cream): Phaser.GameObjects.Text =>
      this.add.text(0, 0, '', { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color, align: 'center', resolution: textResolution() }).setOrigin(0.5);
    this.title = text(18).setText('JUNGLE BALL').setDepth(5001);
    this.banner = this.add
      .text(0, 0, '', { fontFamily: FONT_FAMILY, fontSize: '44px', fontStyle: 'bold', color: '#ffd23f', stroke: '#3a1300', strokeThickness: 8, align: 'center', resolution: textResolution() })
      .setOrigin(0.5)
      .setDepth(6000)
      .setVisible(false);
    this.bannerUntil = 0;
    this.freezeUntil = 0;
    this.wasRestart = true;
    this.hud = text(16).setDepth(5001);
    this.result = text(20).setVisible(false).setDepth(5002);
    for (const id of COMPETITORS) this.labels[id] = text(12).setText(NAMES[id]).setDepth(5001);
    this.backButton = new Button(this, 0, 0, { name: 'back-button', label: '‹ Leave', width: 110, height: 44, fontSize: 16, onClick: () => this.leave() });
    this.continueButton = new Button(this, 0, 0, { name: 'continue-button', label: this.returnTo ? 'Back to story' : 'Menu', width: 200, height: 52, fontSize: 18, onClick: () => this.exit() });
    this.continueButton.setVisible(false);
    this.backButton.setDepth(5003);
    this.continueButton.setDepth(5003);
    this.pad = new PadHud(this, this.scale.width, this.scale.height, { labels: { pass: 'TURBO', slide: 'SLIDE', block: 'PUSH' } });
    // TURBO is held with another finger on SHOOT / SLIDE / PUSH, so it gets its own touch slot.
    this.pad.controls.setModifier('pass');

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
      this.handlePad(this.pad.controls.setAvailable({ pass: true, shoot: this.sim.ball.owner === 'player', slide: canMove(this.sim, me, 'slide'), block: canMove(this.sim, me, 'push') }));
      step(this.sim, Math.min(delta, 100) / 1000);
      for (const e of drainEvents(this.sim)) {
        if (e.type === 'hit') {
          // Arcade hit-stop + shake; the sim itself is untouched (it just is not stepped for a few frames).
          this.freezeUntil = now + (e.big ? BIG_HITSTOP_MS : HITSTOP_MS);
          this.cameras.main.shake(e.big ? 220 : 110, e.big ? 0.014 : 0.006);
          const word = e.carrier && e.kind === 'push' ? 'STIFF ARM!' : e.big ? (e.kind === 'slide' ? 'CRUSHED!' : 'BOOM!') : e.kind === 'slide' ? 'SMASH!' : 'WHAM!';
          this.showBanner(word, e.big ? 650 : 450, e.big ? 40 : 34);
        } else if (e.type === 'fire') this.showBanner(e.on ? `${NAMES[e.by].toUpperCase()}\n${e.by === 'player' ? 'ARE' : 'IS'} ON FIRE!` : 'FIRE OUT!', e.on ? 1400 : 700, e.on ? 40 : 30);
        else if (e.type === 'shot') this.kickedAt[e.by] = this.sim.t;
        else if (e.type === 'goal') this.showBanner(`GOAL!\n${NAMES[e.by].toUpperCase()}`, 1100);
        else if (e.type === 'save') (this.savedAt = this.sim.t), this.showBanner('SAVED!', 600, 34);
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
        turbo: { x: L.buttons.pass.x - L.buttons.pass.r, y: L.buttons.pass.y - L.buttons.pass.r, width: L.buttons.pass.r * 2, height: L.buttons.pass.r * 2 },
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
      turbo: { held: s.turbo, meter: s.competitors.player.turbo },
      fire: s.fire,
      down: Object.fromEntries(COMPETITORS.map((id) => [id, s.t < s.competitors[id].downUntil])),
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
    this.floorTop = top + h * 0.42;
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
    this.fitBackground();
    this.handlePad(this.pad.layout(width, height));
  }

  private drawBars(): void {
    const g = this.hudG;
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
      // Turbo meter under each score bar (gold while ON FIRE).
      const tw = barW - 12;
      const tx = i < 2 ? x + 10 : x;
      g.fillStyle(0x1b1b1b, 1).fillRect(tx, y + 19, tw, 6);
      g.fillStyle(s.fire === id ? 0xff7a1a : 0x4fc3f7, 1).fillRect(tx, y + 19, tw * s.competitors[id].turbo, 6);
      const lbl = this.labels[id];
      lbl?.setText(`${NAMES[id].toUpperCase()} ${s.scores[id]}`).setPosition(x + barW / 2, y + 30);
    });
    const left = Math.max(0, Math.ceil(JUNGLE.roundSeconds - s.t));
    g.fillStyle(0x1b1b1b, 1).fillRect(W / 2 - timerW / 2, y - 8, timerW, 36);
    g.lineStyle(3, 0xffd23f, 1).strokeRect(W / 2 - timerW / 2, y - 8, timerW, 36);
    this.hud.setVisible(true).setText(String(left)).setFontSize(26).setPosition(W / 2, y + 10);
  }

  /** Supplied school courtyard (Graphics v1) behind the play area; a plain fill stands in until it loads. */
  private loadBackground(): void {
    const key = artTextureKey(BG_ASSET);
    const show = (): void => {
      if (!this.sys.isActive() && !this.sys.isPaused()) return;
      this.bg?.destroy();
      this.bg = this.add.image(0, 0, key).setDepth(0);
      this.fitBackground();
    };
    if (this.textures.exists(key)) return show();
    const url = artUrl(BG_ASSET);
    if (!url) return;
    this.ownBg = true;
    this.load.image(key, url);
    this.load.once(`filecomplete-image-${key}`, show);
    if (!this.load.isLoading()) this.load.start();
  }

  /** Cover-fit the courtyard into the stage: the paved ground sits under the floor band. */
  private fitBackground(): void {
    if (!this.bg) return;
    const p = this.pen;
    const k = Math.max(p.width / this.bg.width, p.height / this.bg.height);
    this.bg.setScale(k).setPosition(p.x + p.width / 2, p.y + p.height - (this.bg.height * k) / 2);
    this.bg.setCrop((this.bg.width - p.width / k) / 2, (this.bg.height - p.height / k), p.width / k, p.height / k);
  }

  /** Factory frame from what the sim says each competitor is doing (read-only). */
  private frameFor(id: CompetitorId, dt: number): string {
    const s = this.sim;
    const c = s.competitors[id];
    const speed = Math.hypot(c.vel.x, c.vel.y);
    let kind: PoseKind = speed > 0.6 ? 'run' : 'idle';
    if (s.t < c.downUntil || s.t < c.slideUntil || (s.t < c.lagUntil && c.lastMove?.kind === 'slide')) kind = 'slide';
    else if (c.lastMove?.kind === 'push' && s.t - c.lastMove.t < 0.2) kind = 'kick';
    else if (this.kickedAt[id] !== undefined && s.t - this.kickedAt[id]! < 0.25) kind = 'kick';
    if (Math.hypot(c.facing.x, c.facing.y) > 1e-6) this.artDir[id] = dirFromScreen(c.facing.x * this.kx, c.facing.y * this.ky);
    this.artDist[id] = (this.artDist[id] + speed * dt) % 1000;
    return this.art.frame(this.looks[id], kind, this.artDir[id], Math.floor(this.artDist[id] / 0.55));
  }

  private draw(): void {
    const g = this.g;
    const h = this.hudG;
    const s = this.sim;
    const p = this.pen;
    g.clear();
    h.clear();
    const dt = Math.min(0.1, Math.max(0, s.t - this.lastT));
    this.lastT = s.t;
    if (!this.bg) g.fillStyle(0xd9a86c, 1).fillRect(p.x, p.y, p.width, p.height);
    // Play area chalked onto the courtyard paving.
    const fh = p.y + p.height - this.floorTop;
    g.fillStyle(0x2e7d32, 0.18).fillRect(p.x, this.floorTop, p.width, fh);
    g.lineStyle(3, 0xffffff, 0.75).strokeRect(p.x + 2, this.floorTop, p.width - 4, fh - 2);
    const mid = JUNGLE.width / 2;
    const gb = this.toScreen(JUNGLE.goalX, mid - JUNGLE.goalHalfWidth);
    const gf = this.toScreen(JUNGLE.goalX, mid + JUNGLE.goalHalfWidth);
    const gh = this.scale1 * 4;
    g.fillStyle(0xffffff, 0.25).fillRect(gb.x - this.kx * 0.8, gb.y - gh, this.kx * 0.8, gf.y - gb.y + gh);
    for (let i = 1; i < 6; i++) g.lineStyle(1, 0xffffff, 0.5).lineBetween(gb.x - this.kx * 0.8, gb.y - gh + (gh * i) / 6, gf.x - this.kx * 0.8, gf.y - gh + (gh * i) / 6);
    g.lineStyle(5, 0xffffff, 1).lineBetween(gb.x, gb.y, gb.x, gb.y - gh).lineBetween(gf.x, gf.y, gf.x, gf.y - gh).lineBetween(gb.x, gb.y - gh, gf.x, gf.y - gh);
    // Oversized arcade fighters (art only; physics radii are unchanged).
    const bodyH = (y: number): number => this.scale1 * 3.6 * (0.85 + 0.3 * (y / JUNGLE.width));
    for (const id of COMPETITORS) {
      const c = s.competitors[id];
      const f = this.toScreen(c.pos.x, c.pos.y);
      const ph = bodyH(c.pos.y);
      g.fillStyle(0x000000, 0.3).fillEllipse(f.x, f.y, ph * 0.9, ph * 0.25);
      if (s.fire === id) for (let i = 0; i < 5; i++) {
        const a = s.t * 7 + i * 1.3;
        g.fillStyle(i % 2 ? 0xffd23f : 0xff5a1a, 0.75).fillTriangle(f.x - ph * 0.3 + i * ph * 0.15 - 5, f.y, f.x - ph * 0.3 + i * ph * 0.15 + 5, f.y, f.x - ph * 0.3 + i * ph * 0.15, f.y - ph * (0.25 + 0.12 * Math.sin(a)));
      }
      else if (c.turboOn && Math.hypot(c.vel.x, c.vel.y) > JUNGLE.runSpeed * 0.9) for (let i = 1; i <= 3; i++) g.lineStyle(2, 0xffffff, 0.5 - i * 0.12).lineBetween(f.x - c.vel.x * this.kx * 0.04 * i - 8, f.y - ph * 0.3 * i, f.x - c.vel.x * this.kx * 0.04 * i + 8, f.y - ph * 0.3 * i);
      const sc = PlayerArt.scaleFor(ph);
      this.sprites[id]!.setTexture(this.frameFor(id, dt)).setScale(sc.x, sc.y).setPosition(f.x, f.y).setDepth(100 + f.y).setAlpha(s.t < c.stunUntil ? 0.75 : 1);
      const top = f.y - ph * PLAYER_ART.bodyScale - 4;
      if (s.t < c.stunUntil) for (let i = 0; i < 3; i++) {
        const a = s.t * 9 + (i * Math.PI * 2) / 3;
        h.fillStyle(0xffd23f, 1).fillRect(f.x + Math.cos(a) * ph * 0.35 - 3, top + Math.sin(a) * ph * 0.08, 6, 6);
      } else if (s.t < c.protectedUntil) g.lineStyle(2, 0xb3e5fc, 0.9).strokeEllipse(f.x, f.y, ph * 1.1, ph * 0.32);
      if (id === 'player') h.fillStyle(0xffd23f, 1).lineStyle(2, 0x1b1b1b, 1).fillTriangle(f.x - 7, top - 12, f.x + 7, top - 12, f.x, top - 2).strokeTriangle(f.x - 7, top - 12, f.x + 7, top - 12, f.x, top - 2);
    }
    // Neutral keeper: reference keeper kit, diving briefly after a save.
    const kp = this.toScreen(JUNGLE.goalX - 0.6, s.keeper.y);
    const kh = bodyH(s.keeper.y);
    const ksc = PlayerArt.scaleFor(kh);
    this.sprites.keeper!.setTexture(this.art.frame(this.looks.keeper, this.savedAt !== null && s.t - this.savedAt < 0.4 ? 'dive' : 'idle', 4, 0)).setScale(ksc.x, ksc.y).setPosition(kp.x, kp.y).setDepth(100 + kp.y);
    const b = this.toScreen(s.ball.pos.x, s.ball.pos.y);
    const br = Math.max(9, this.scale1 * 0.55);
    g.fillStyle(0x000000, 0.3).fillEllipse(b.x, b.y, br * 1.2, br * 0.4);
    // ON FIRE: the ball trails flame while the burning competitor has it or just shot it.
    if (s.fire && s.ball.lastTouch === s.fire) for (let i = 1; i <= 4; i++) g.fillStyle(i % 2 ? 0xff7a1a : 0xffd23f, 0.6 - i * 0.12).fillCircle(b.x - s.ball.vel.x * this.kx * 0.02 * i, b.y - br * 0.45 - s.ball.vel.y * this.ky * 0.02 * i, br * (1 - i * 0.15));
    this.ballImg.setScale(br / BALL_TEXTURE_SIZE.width).setPosition(b.x, b.y - br * 0.45).setDepth(100 + b.y + 0.5);
    if (this.chargeStart !== null) {
      const k = Math.min(1, (performance.now() - this.chargeStart) / MAX_CHARGE_MS);
      const me = this.toScreen(s.competitors.player.pos.x, s.competitors.player.pos.y);
      h.fillStyle(0x000000, 0.5).fillRect(me.x - 20, me.y + 8, 40, 6);
      h.fillStyle(0xf2c14e, 1).fillRect(me.x - 20, me.y + 8, 40 * k, 6);
    }
    this.drawBars();
    if (s.phase === 'ended') h.fillStyle(0x000000, 0.55).fillRect(0, 0, this.scale.width, this.scale.height);
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
      else if (e.action === 'pass') command(this.sim, { type: 'turbo', on: e.type === 'press' });
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
    } else if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyI') && !e.repeat) command(this.sim, { type: 'turbo', on: true });
    else if (e.code === 'KeyJ' && !e.repeat) command(this.sim, { type: 'push' });
    else if (e.code === 'KeyL' && !e.repeat) command(this.sim, { type: 'slide' });
    else if ((e.code === 'Space' || e.code === 'KeyK') && !e.repeat && this.sim.ball.owner === 'player') this.chargeStart = performance.now();
  }
  private onKeyUp(e: KeyboardEvent): void {
    const dirs: Record<string, readonly [number, number]> = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
    if (dirs[e.code]) {
      this.keys.delete(e.code);
      this.sendKeys(dirs);
    } else if (e.code === 'Space' || e.code === 'KeyK') this.releaseShot();
    else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyI') command(this.sim, { type: 'turbo', on: false });
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
    command(this.sim, { type: 'turbo', on: false });
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
      this.result.setText(`Final whistle!\n${lines.join('\n')}\nJust for fun: never counts as match growth.`);
      // TIME! gets its moment first; the standings then replace it so the banner never covers names or scores.
      this.time.delayedCall(Math.max(0, this.bannerUntil - performance.now()), () => {
        this.bannerUntil = 0;
        this.banner.setVisible(false);
        this.result.setVisible(true);
        this.continueButton.setVisible(true);
      });
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
    this.art.destroy();
    this.load.off(`filecomplete-image-${artTextureKey(BG_ASSET)}`);
    // The courtyard texture is released only if this scene loaded it (the story may own it otherwise).
    if (this.ownBg && this.textures.exists(artTextureKey(BG_ASSET))) this.textures.remove(artTextureKey(BG_ASSET));
  }
}
