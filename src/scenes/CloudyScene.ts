import Phaser from 'phaser';
import type { Rect } from '../game';
import { CLOUDY, DIFFICULTIES, dash, drainEvents, fitBackground, goalTarget, multiplierFor, newRound, resultOf, setPaused, setTarget, start, step, tilt, toPainting, toScreen, type CloudyState, type Difficulty, type Fit } from '../game/cloudy/sim';
import type { CloudyBest } from '../game/career/state';
import { CareerStore } from '../game/career/store';
import { shouldExposeDebug } from '../debug/diagnostics';
import { orientationOf } from '../render/layout';
import { CSS, FONT_FAMILY, textResolution } from '../render/theme';
import { BALL_TEXTURE_SIZE, TEXTURES, ensurePlaceholderTextures } from '../render/textures';
import type { GameplayScene, InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';

const images = import.meta.glob('../assets/art/cloudy/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const atlasJson = import.meta.glob('../assets/art/cloudy/cloudy.json', { eager: true, import: 'default' }) as Record<string, object>;
const urlOf = (name: string): string | undefined => Object.entries(images).find(([p]) => p.endsWith(`/${name}.webp`))?.[1];
const BG_KEY = 'cloudy:aquarium';
const ATLAS_KEY = 'cloudy:fish';
/** Cloudy's drawn width in painting pixels (the sheet cell is 200 px wide). */
const FISH_W = 190;
const LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export interface CloudyData {
  /** Where Back goes: the story (resume), the home hub (future), or Start. */
  readonly returnTo?: 'story' | 'start';
}

type Screen = 'menu' | 'game' | 'results';

/**
 * Cloudy's Feeding Frenzy: draws `CloudyState` over the supplied aquarium painting and turns drag + DASH
 * into sim calls. The painting, the physics and the goal trigger share one fit transform; no goal is drawn.
 * Best scores are saved once per round through the career reducer (no growth, no match statistics).
 */
export class CloudyScene extends Phaser.Scene implements InspectableScene, GameplayScene {
  private sim!: CloudyState;
  private screen: Screen = 'menu';
  private returnTo: 'story' | 'start' = 'start';
  private fit: Fit = { scale: 1, x: 0, y: 0 };
  private area: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private bg: Phaser.GameObjects.Image | null = null;
  private fish!: Phaser.GameObjects.Image;
  private ballImg!: Phaser.GameObjects.Image;
  private g!: Phaser.GameObjects.Graphics;
  private hudG!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private title!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private bannerUntil = 0;
  private popups: { x: number; y: number; text: Phaser.GameObjects.Text; until: number }[] = [];
  private diffButtons: Partial<Record<Difficulty, Button>> = {};
  private backButton!: Button;
  private pauseButton!: Button;
  private resumeButton!: Button;
  private leaveButton!: Button;
  private replayButton!: Button;
  private doneButton!: Button;
  private pauseG!: Phaser.GameObjects.Graphics;
  private dashC = { x: 0, y: 0, r: 44 };
  private dashText!: Phaser.GameObjects.Text;
  private swimId: number | null = null;
  private dashId: number | null = null;
  private dashFlash = 0;
  private best: readonly CloudyBest[] = [];
  private saved = false;
  private savedMessage = '';
  private saving = false;
  private pending: { readonly runId: string; readonly difficulty: Difficulty; readonly score: number; readonly stars: 1 | 2 | 3 } | null = null;
  private retryButton!: Button;
  private runId = '';
  private leaving = false;
  private speed = 1;
  private animT = 0;
  private dragTarget: { x: number; y: number } | null = null;

  constructor() {
    super(SceneKeys.Cloudy);
  }

  create(data: CloudyData = {}): void {
    this.returnTo = data.returnTo === 'story' ? 'story' : 'start';
    this.screen = 'menu';
    this.sim = newRound('easy', 1);
    this.saved = false;
    this.savedMessage = '';
    this.leaving = false;
    this.swimId = this.dashId = null;
    this.dragTarget = null;
    this.popups = [];
    this.bannerUntil = 0;
    this.animT = 0;
    this.bg = null;
    const q = new URLSearchParams(window.location.search);
    const sp = Number(q.get('cloudySpeed'));
    this.speed = shouldExposeDebug(window.location) && sp >= 1 && sp <= 8 ? sp : 1;
    this.cameras.main.setBackgroundColor('#0d2c3f');
    ensurePlaceholderTextures(this);
    this.g = this.add.graphics().setDepth(10);
    this.fish = this.add.image(0, 0, TEXTURES.ball).setVisible(false).setDepth(20);
    this.ballImg = this.add.image(0, 0, TEXTURES.ball).setVisible(false).setDepth(19);
    this.hudG = this.add.graphics().setDepth(100);
    const text = (size: number, color = CSS.cream): Phaser.GameObjects.Text =>
      this.add.text(0, 0, '', { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color, align: 'center', resolution: textResolution() }).setOrigin(0.5).setDepth(101);
    this.title = text(20).setText("CLOUDY'S FEEDING FRENZY");
    this.hud = text(16);
    this.info = text(16);
    this.banner = this.add.text(0, 0, '', { fontFamily: FONT_FAMILY, fontSize: '40px', fontStyle: 'bold', color: '#ffd23f', stroke: '#06233a', strokeThickness: 7, align: 'center', resolution: textResolution() }).setOrigin(0.5).setDepth(150).setVisible(false);
    this.dashText = text(16).setText('DASH').setDepth(102);
    this.diffButtons = {};
    for (const d of DIFFICULTIES) this.diffButtons[d] = new Button(this, 0, 0, { name: `cloudy-${d}-button`, label: LABEL[d], width: 200, height: 52, fontSize: 18, onClick: () => this.startRound(d) }).setDepth(110);
    this.backButton = new Button(this, 0, 0, { name: 'back-button', label: this.returnTo === 'story' ? 'Back' : 'Menu', width: 110, height: 44, fontSize: 16, onClick: () => this.exit() }).setDepth(110);
    this.pauseButton = new Button(this, 0, 0, { name: 'pause-button', label: 'II Pause', width: 110, height: 44, fontSize: 16, onClick: () => this.pause(true) }).setDepth(110);
    this.pauseG = this.add.graphics().setDepth(200).setVisible(false);
    this.resumeButton = new Button(this, 0, 0, { name: 'resume-button', label: 'Resume', width: 200, height: 52, fontSize: 18, onClick: () => this.pause(false) }).setDepth(201);
    this.leaveButton = new Button(this, 0, 0, { name: 'leave-confirm-button', label: 'Leave round', width: 200, height: 52, fontSize: 18, onClick: () => this.leaveRound() }).setDepth(201);
    this.replayButton = new Button(this, 0, 0, { name: 'replay-button', label: 'Play again', width: 200, height: 52, fontSize: 18, onClick: () => this.startRound(this.sim.difficulty) }).setDepth(110);
    this.doneButton = new Button(this, 0, 0, { name: 'done-button', label: 'Choose level', width: 200, height: 52, fontSize: 18, onClick: () => this.showMenu() }).setDepth(110);
    this.retryButton = new Button(this, 0, 0, { name: 'retry-save-button', label: 'Retry save', width: 200, height: 52, fontSize: 18, onClick: () => void this.persist() }).setDepth(110);
    this.loadArt();
    void this.loadBest();

    this.input.addPointer(2);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    this.input.on(Phaser.Input.Events.GAME_OUT, this.onGameOut, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.input.keyboard?.on('keydown', this.onKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.applyScreen();
    this.layout(this.scale.width, this.scale.height);
  }

  override update(_time: number, delta: number): void {
    const now = performance.now();
    const s = this.sim;
    if (this.screen === 'game') {
      const before = s.phase;
      step(s, (Math.min(delta, 100) / 1000) * this.speed);
      if (before === 'countdown' && (s.phase as string) === 'playing' && this.dragTarget) setTarget(s, this.dragTarget);
      for (const e of drainEvents(s)) {
        const p = toScreen(this.fit, e.type === 'catch' || e.type === 'goal' ? e : { x: s.fish.x, y: s.fish.y });
        if (e.type === 'catch') this.popup(p.x, p.y, `+${e.points}${e.multiplier > 1 ? ` x${e.multiplier}` : ''}`);
        else if (e.type === 'goal') (this.showBanner('GOAL! +50', 1200), this.popup(p.x, p.y, '+50'));
        else if (e.type === 'ball') this.showBanner('BALL! Push it in the goal', 1300, 24);
        else if (e.type === 'current') this.showBanner(e.dir > 0 ? 'CURRENT →' : '← CURRENT', 1100, 28);
        else if (e.type === 'go') this.showBanner('GO!', 600);
        else if (e.type === 'dash') this.dashFlash = now + 200;
        else if (e.type === 'end') this.finish();
      }
      if (s.phase === 'results' && !this.saved) this.finish();
    }
    this.animT += Math.min(delta, 100) / 1000;
    this.banner.setVisible(now < this.bannerUntil);
    this.popups = this.popups.filter((p) => {
      if (now < p.until) {
        const k = 1 - (p.until - now) / 700;
        p.text.setPosition(p.x, p.y - 30 - k * 30).setAlpha(1 - k * 0.8);
        return true;
      }
      p.text.destroy();
      return false;
    });
    this.draw(now);
  }

  describeLayout(): SceneLayoutReport {
    const { width, height } = this.scale;
    const t = (o: Phaser.GameObjects.Text): Rect => {
      const b = o.getBounds();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    };
    const el: Record<string, Rect> = { painting: this.paintingRect(), goal: this.goalRect(), title: t(this.title) };
    if (this.screen === 'menu') {
      for (const d of DIFFICULTIES) el[`cloudy-${d}-button`] = this.diffButtons[d]!.getButtonBounds();
      el['back-button'] = this.backButton.getButtonBounds();
      el.info = t(this.info);
    } else if (this.screen === 'game') {
      el['pause-button'] = this.pauseButton.getButtonBounds();
      el.dash = { x: this.dashC.x - this.dashC.r, y: this.dashC.y - this.dashC.r, width: this.dashC.r * 2, height: this.dashC.r * 2 };
      el.hud = t(this.hud);
      if (this.sim.paused) (el['resume-button'] = this.resumeButton.getButtonBounds()), (el['leave-confirm-button'] = this.leaveButton.getButtonBounds());
    } else {
      el['replay-button'] = this.replayButton.getButtonBounds();
      el['done-button'] = this.doneButton.getButtonBounds();
      if (this.retryButton.visible) el['retry-save-button'] = this.retryButton.getButtonBounds();
      el['back-button'] = this.backButton.getButtonBounds();
      el.info = t(this.info);
    }
    return { orientation: orientationOf({ width, height }), viewport: { width, height }, elements: el };
  }

  describeGameplay(): unknown {
    const s = this.sim;
    const fishScreen = toScreen(this.fit, s.fish);
    return {
      screen: this.screen,
      phase: s.phase,
      paused: s.paused,
      difficulty: s.difficulty,
      t: s.t,
      countdown: s.countdown,
      score: s.score,
      caught: s.caught,
      missed: s.missed,
      total: s.total,
      combo: s.combo,
      multiplier: multiplierFor(s.combo),
      goals: s.goals,
      pellets: s.pellets.map((p) => ({ ...p, screen: toScreen(this.fit, p) })),
      ball: s.ball ? { x: s.ball.x, y: s.ball.y, screen: toScreen(this.fit, s.ball) } : null,
      fish: { x: s.fish.x, y: s.fish.y, vx: s.fish.vx, vy: s.fish.vy, dashLeft: s.fish.dashLeft, cooldown: s.fish.cooldown, screen: fishScreen },
      target: s.target,
      swimId: this.swimId,
      fit: this.fit,
      saved: this.saved,
      savedMessage: this.savedMessage,
      saving: this.saving,
      unsaved: this.pending !== null,
      best: this.best,
      art: { background: this.bg !== null, fish: this.textures.exists(ATLAS_KEY) },
      runId: this.runId,
    };
  }

  // ---- flow ----

  private startRound(d: Difficulty): void {
    if (this.leaving) return;
    this.sim = newRound(d, Math.floor(Math.random() * 1e9));
    this.runId = `cloudy-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
    this.saved = false;
    this.savedMessage = '';
    this.swimId = this.dashId = null;
    this.dragTarget = null;
    start(this.sim);
    this.screen = 'game';
    this.showBanner('3… 2… 1…', 2800, 34);
    this.applyScreen();
    this.layout(this.scale.width, this.scale.height);
  }

  private showMenu(): void {
    this.screen = 'menu';
    this.sim = newRound('easy', 1);
    this.bannerUntil = 0;
    this.applyScreen();
    this.layout(this.scale.width, this.scale.height);
  }

  private pause(on: boolean): void {
    if (this.screen !== 'game' || this.sim.phase === 'results') return;
    setPaused(this.sim, on);
    this.swimId = this.dashId = null;
    this.dragTarget = null;
    this.applyScreen();
    this.layoutPause();
  }

  /** Leaving mid-round discards it: nothing is saved and it never counts as a best. */
  private leaveRound(): void {
    this.showMenu();
  }

  private finish(): void {
    if (this.saved) return;
    this.saved = true;
    this.swimId = this.dashId = null;
    const r = resultOf(this.sim);
    // Captured now: a new round may replace `this.sim` before the save completes.
    this.pending = { runId: this.runId, difficulty: this.sim.difficulty, score: r.score, stars: r.stars };
    this.screen = 'results';
    this.applyScreen();
    this.layout(this.scale.width, this.scale.height);
    this.showBanner(r.stars === 3 ? 'FEEDING FRENZY!' : "TIME'S UP!", 1200, 34);
    void this.persist();
  }

  /** Saves the finished round once; a failed write keeps it for Retry (the reducer ignores a repeated run ID). */
  private async persist(): Promise<void> {
    const p = this.pending;
    if (!p || this.saving) return;
    this.saving = true;
    this.savedMessage = '';
    let store: CareerStore | null = null;
    try {
      store = await CareerStore.open();
      const out = await store.dispatch({ type: 'cloudyResult', ...p });
      if (out.ok) {
        if (this.pending === p) this.pending = null;
        this.best = out.save.cloudy;
      }
      this.savedMessage = out.ok ? out.message : `Not saved: ${out.error}`;
    } catch {
      this.savedMessage = 'Not saved: this browser could not save the score.';
    } finally {
      store?.close();
      this.saving = false;
    }
    if (this.sys.isActive() && this.screen === 'results') this.applyScreen();
  }

  private async loadBest(): Promise<void> {
    let store: CareerStore | null = null;
    try {
      store = await CareerStore.open();
      this.best = (await store.load()).cloudy;
    } catch {
      this.best = [];
    } finally {
      store?.close();
    }
    if (this.sys.isActive()) this.applyScreen();
  }

  private exit(): void {
    if (this.leaving) return;
    this.leaving = true;
    if (this.returnTo === 'story') this.scene.start(SceneKeys.Story, { resume: true });
    else this.scene.start(SceneKeys.Start);
  }

  /** Show only the controls of the current screen and refresh its text. */
  private applyScreen(): void {
    const menu = this.screen === 'menu';
    const game = this.screen === 'game';
    const res = this.screen === 'results';
    const paused = game && this.sim.paused;
    for (const d of DIFFICULTIES) {
      const b = this.best.find((x) => x.difficulty === d);
      this.diffButtons[d]!.setVisible(menu).setLabel(b ? `${LABEL[d]}  ★${b.bestStars}  ${b.bestScore}` : LABEL[d]);
    }
    this.backButton.setVisible(menu || res);
    this.pauseButton.setVisible(game && !paused);
    this.pauseG.setVisible(paused);
    this.resumeButton.setVisible(paused);
    this.leaveButton.setVisible(paused);
    const retry = res && this.pending !== null && !this.saving && this.savedMessage !== '';
    this.replayButton.setVisible(res && !retry);
    this.doneButton.setVisible(res);
    this.retryButton.setVisible(retry);
    this.dashText.setVisible(game);
    this.hud.setVisible(game);
    this.title.setVisible(!game);
    this.info.setVisible(menu || res || paused);
    if (menu) {
      this.info.setText('Drag to swim. Catch food before it sinks.\nCatch in a row for x2 and x3.\nDASH for a burst. Push the ball into the goal for +50.\nJust for fun: no soccer stats or attributes.');
    } else if (res) {
      const r = resultOf(this.sim);
      const b = this.best.find((x) => x.difficulty === this.sim.difficulty);
      this.info.setText(
        `${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}\nScore ${r.score}\nFood ${r.caught}/${r.total} · best combo ${r.bestCombo} · goals ${r.goals}\n${this.savedMessage || 'Saving…'}${b ? `\nBest on ${LABEL[this.sim.difficulty]}: ${b.bestScore}` : ''}`,
      );
    } else if (paused) this.info.setText('PAUSED');
  }

  // ---- input ----

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.screen !== 'game' || this.sim.paused) return;
    if (Math.hypot(p.x - this.dashC.x, p.y - this.dashC.y) <= this.dashC.r + 8) {
      this.dashId = p.id;
      dash(this.sim);
      return;
    }
    const pb = this.pauseButton.getButtonBounds();
    if (p.x >= pb.x && p.x <= pb.x + pb.width && p.y >= pb.y && p.y <= pb.y + pb.height) return;
    if (this.swimId !== null && this.swimId !== p.id) return;
    this.swimId = p.id;
    this.aim(p.x, p.y);
  }
  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id === this.swimId && p.isDown && !this.sim.paused) this.aim(p.x, p.y);
  }
  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.dashId) this.dashId = null;
    if (p.id === this.swimId) this.release();
  }
  private aim(x: number, y: number): void {
    this.dragTarget = toPainting(this.fit, { x, y });
    setTarget(this.sim, this.dragTarget);
  }
  private release(): void {
    this.swimId = null;
    this.dragTarget = null;
    setTarget(this.sim, null);
  }
  private onGameOut(): void {
    this.release();
    this.dashId = null;
  }
  private onBlur(): void {
    this.onGameOut();
  }
  /** App switched away or screen locked: drop held input and pause the round (its clock stops). */
  private onHidden(): void {
    this.onBlur();
    if (this.screen === 'game' && this.sim.phase !== 'results') this.pause(true);
  }
  private onKey(e: KeyboardEvent): void {
    if (this.screen !== 'game') return;
    if (e.code === 'Escape' || e.code === 'KeyP') this.pause(!this.sim.paused);
    else if ((e.code === 'Space' || e.code === 'KeyD') && !e.repeat) dash(this.sim);
  }
  private onResize(size: Phaser.Structs.Size): void {
    // The painting moves under a held finger: keep the target in painting space, re-aim on the next move.
    this.layout(size.width, size.height);
  }

  // ---- layout and drawing ----

  private layout(width: number, height: number): void {
    const portrait = height > width;
    const game = this.screen === 'game';
    const top = portrait && !game ? 96 : 58;
    const menuH = game ? (portrait ? 130 : 0) : portrait ? Math.min(height * 0.45, 330) : 0;
    const side = !game && !portrait ? Math.min(width * 0.4, 300) : 0;
    this.area = { x: side, y: top, width: Math.max(80, width - side), height: Math.max(80, height - top - menuH - 8) };
    this.fit = fitBackground(this.area);
    if (this.bg) this.bg.setScale(this.fit.scale).setPosition(this.fit.x, this.fit.y);
    this.title.setFontSize(Math.round(Math.max(15, Math.min(22, width * 0.05)))).setPosition(portrait ? width / 2 : width / 2 + 40, portrait ? 76 : 28);
    this.backButton.setPosition(66, 28);
    this.pauseButton.setPosition(66, 28);
    this.hud.setFontSize(16).setPosition(width / 2 + 50, 28);
    // DASH sits in the larger margin beside or under the painting so it never covers the goal.
    const pr = this.paintingRect();
    const r = Math.round(Math.max(36, Math.min(54, Math.min(width, height) * 0.11)));
    const leftM = pr.x;
    const below = height - (pr.y + pr.height);
    if (portrait || below >= 2 * r + 16) this.dashC = { x: width - r - 24, y: Math.min(height - r - 16, pr.y + pr.height + 12 + r), r };
    else if (leftM >= 2 * r + 12) this.dashC = { x: leftM / 2, y: height - r - 20, r };
    else this.dashC = { x: r + 16, y: height - r - 16, r };
    this.dashText.setPosition(this.dashC.x, this.dashC.y);
    const bw = Math.min(portrait ? width * 0.8 : side - 24 || 260, 300);
    if (this.screen === 'menu') {
      const x0 = portrait ? width / 2 : side / 2;
      const y0 = portrait ? pr.y + pr.height + 24 : top + 16;
      this.info.setFontSize(portrait ? 14 : 13).setWordWrapWidth(portrait ? width - 32 : side - 16).setOrigin(0.5, 0).setPosition(x0, y0);
      const ib = this.info.getBounds();
      DIFFICULTIES.forEach((d, i) => this.diffButtons[d]!.resize(bw, 48, 17).setPosition(x0, ib.bottom + 34 + i * 58));
    } else if (this.screen === 'results') {
      const x0 = portrait ? width / 2 : side / 2;
      const y0 = portrait ? pr.y + pr.height + 16 : top + 12;
      this.info.setFontSize(portrait ? 15 : 13).setWordWrapWidth(portrait ? width - 32 : side - 16).setOrigin(0.5, 0).setPosition(x0, y0);
      const ib = this.info.getBounds();
      this.replayButton.resize(bw, 48, 17).setPosition(x0, ib.bottom + 34);
      this.doneButton.resize(bw, 48, 17).setPosition(x0, ib.bottom + 92);
      // A failed save takes Play again's slot until it is retried, so the finished round is not replaced.
      this.retryButton.resize(bw, 48, 17).setPosition(x0, ib.bottom + 34);
    }
    this.banner.setPosition(pr.x + pr.width / 2, pr.y + pr.height * 0.4);
    this.layoutPause();
  }

  private layoutPause(): void {
    const { width, height } = this.scale;
    this.pauseG.clear().fillStyle(0x000000, 0.6).fillRect(0, 0, width, height);
    if (this.screen === 'game' && this.sim.paused) this.info.setFontSize(28).setOrigin(0.5).setPosition(width / 2, height / 2 - 90).setDepth(202);
    else this.info.setDepth(101);
    this.resumeButton.setPosition(width / 2, height / 2 - 20);
    this.leaveButton.setPosition(width / 2, height / 2 + 48);
  }

  private paintingRect(): Rect {
    return { x: this.fit.x, y: this.fit.y, width: CLOUDY.bg.w * this.fit.scale, height: CLOUDY.bg.h * this.fit.scale };
  }
  /** Screen box of the goal opening painted in the background (the trigger is this, inset by the ball radius). */
  private goalRect(): Rect {
    const gt = goalTarget(0);
    const a = toScreen(this.fit, { x: gt.x0, y: gt.y0 });
    const b = toScreen(this.fit, { x: gt.x1, y: gt.y1 });
    return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
  }

  private draw(now: number): void {
    const g = this.g.clear();
    const h = this.hudG.clear();
    const s = this.sim;
    const k = this.fit.scale;
    const pr = this.paintingRect();
    if (!this.bg) g.fillStyle(0x1f6f8b, 1).fillRect(pr.x, pr.y, pr.width, pr.height);
    const game = this.screen === 'game' || this.screen === 'results';
    // Current: soft streaks across the water while it pushes (warned by a banner first).
    if (game && s.current !== 0) for (let i = 0; i < 6; i++) {
      const y = pr.y + pr.height * (0.25 + i * 0.1);
      const x = pr.x + ((((this.animT * Math.sign(s.current) * 0.3 + i * 0.17) % 1) + 1) % 1) * pr.width;
      g.lineStyle(3, 0xffffff, 0.35).lineBetween(x, y, x + 50 * k * 3 * Math.sign(s.current), y);
    }
    if (game) for (const p of s.pellets) {
      const q = toScreen(this.fit, p);
      g.fillStyle(0x8a5a2b, 1).fillCircle(q.x, q.y, Math.max(4, CLOUDY.food.radius * k * 1.2));
      g.fillStyle(0xd8a35c, 1).fillCircle(q.x - 1, q.y - 1, Math.max(2, CLOUDY.food.radius * k * 0.6));
    }
    if (game && s.ball) {
      const q = toScreen(this.fit, s.ball);
      const life = Math.max(0, s.ball.until - s.t);
      const d = CLOUDY.ball.radius * 2 * k;
      this.ballImg.setVisible(life > 2 || Math.floor(now / 150) % 2 === 0).setPosition(q.x, q.y).setScale(d / BALL_TEXTURE_SIZE.width).setRotation(s.ball.x / 40);
    } else this.ballImg.setVisible(false);
    this.drawFish(game);
    if (this.screen === 'game') {
      const left = s.phase === 'countdown' ? CLOUDY.roundSeconds : Math.max(0, Math.ceil(CLOUDY.roundSeconds - s.t));
      const m = multiplierFor(s.combo);
      this.hud.setText(`${s.phase === 'countdown' ? Math.ceil(s.countdown) : left}s   ${s.score} pts${m > 1 ? `   x${m}` : ''}   ${s.caught}/${s.total}`);
      const b = this.hud.getBounds();
      h.fillStyle(0x06233a, 0.75).fillRoundedRect(b.x - 10, b.y - 4, b.width + 20, b.height + 8, 8);
      const c = this.dashC;
      const cd = s.fish.cooldown / CLOUDY.fish.dashCooldown;
      const ready = cd <= 0 && s.phase === 'playing';
      h.fillStyle(now < this.dashFlash ? 0xffffff : ready ? 0x2bb3c0 : 0x3a4f5c, 0.9).fillCircle(c.x, c.y, c.r);
      h.lineStyle(4, 0x06233a, 1).strokeCircle(c.x, c.y, c.r);
      if (cd > 0) h.lineStyle(6, 0xffd23f, 1).beginPath().arc(c.x, c.y, c.r - 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cd)).strokePath();
      this.dashText.setAlpha(ready ? 1 : 0.6);
    }
  }

  private drawFish(game: boolean): void {
    if (!this.textures.exists(ATLAS_KEY)) return void this.fish.setVisible(false);
    const s = this.sim;
    const f = s.fish;
    let frame = 'idle';
    if (!game) frame = `swim-${Math.floor(this.animT * 6) % 4}`;
    else if (f.celebrateLeft > 0) frame = 'celebrate';
    else if (f.dashLeft > 0) frame = `dash-${Math.floor(this.animT * 12) % 2}`;
    else if (f.eatLeft > 0) frame = `eat-${Math.min(3, Math.floor((1 - f.eatLeft / CLOUDY.fish.eatSeconds) * 4))}`;
    else if (Math.hypot(f.vx, f.vy) > 40) frame = `swim-${Math.floor(this.animT * 8) % 4}`;
    const q = toScreen(this.fit, f);
    const w = FISH_W * this.fit.scale;
    const bob = !game || Math.hypot(f.vx, f.vy) < 40 ? Math.sin(this.animT * 2.4) * 4 * this.fit.scale : 0;
    const left = f.facing < 0;
    this.fish
      .setVisible(true)
      .setTexture(ATLAS_KEY, frame)
      .setScale(w / 200)
      .setFlipX(left)
      .setAngle(left ? -tilt(s) : tilt(s))
      .setPosition(q.x, q.y + bob);
  }

  private showBanner(text: string, ms: number, size = 40): void {
    this.banner.setText(text).setFontSize(Math.round(Math.min(size, this.scale.width * 0.09)));
    this.bannerUntil = performance.now() + ms;
  }
  private popup(x: number, y: number, text: string): void {
    const t = this.add.text(x, y, text, { fontFamily: FONT_FAMILY, fontSize: '20px', fontStyle: 'bold', color: '#ffd23f', stroke: '#06233a', strokeThickness: 4, resolution: textResolution() }).setOrigin(0.5).setDepth(140);
    this.popups.push({ x, y, text: t, until: performance.now() + 700 });
  }

  /** The supplied painting and Cloudy's atlas; a plain water fill stands in until they load. */
  private loadArt(): void {
    const show = (): void => {
      if (!this.sys.isActive() || this.bg || !this.textures.exists(BG_KEY)) return;
      this.bg = this.add.image(0, 0, BG_KEY).setOrigin(0, 0).setDepth(0);
      this.layout(this.scale.width, this.scale.height);
    };
    let queued = false;
    if (!this.textures.exists(BG_KEY)) {
      const url = urlOf('aquarium');
      if (url) (this.load.image(BG_KEY, url), (queued = true));
    }
    if (!this.textures.exists(ATLAS_KEY)) {
      const url = urlOf('cloudy');
      const json = Object.values(atlasJson)[0];
      if (url && json) (this.load.atlas(ATLAS_KEY, url, json), (queued = true));
    }
    this.load.on(Phaser.Loader.Events.COMPLETE, show, this);
    if (queued && !this.load.isLoading()) this.load.start();
    show();
  }

  private onShutdown(): void {
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    this.input.off(Phaser.Input.Events.GAME_OUT, this.onGameOut, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.input.keyboard?.off('keydown', this.onKey, this);
    this.load.off(Phaser.Loader.Events.COMPLETE);
    for (const p of this.popups) p.text.destroy();
    this.popups = [];
  }
}
