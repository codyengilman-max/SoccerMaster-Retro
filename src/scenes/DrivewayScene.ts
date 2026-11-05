import Phaser from 'phaser';
import type { Rect } from '../game';
import { DD_DIFFICULTIES, DD_LABELS, DRIVEWAY, MEDAL_LABELS, quartersToPoints, type DdDifficulty } from '../game/driveway/config';
import { DrivewaySim, type DdEvent, type Obj, type ObjKind } from '../game/driveway/sim';
import { attemptQuarters } from '../game/driveway/reward';
import { drivewayDue, drivewayWeek, isUnlocked, type DrivewaySubmission } from '../game/driveway/save';
import type { CareerSave } from '../game/career/state';
import { CareerStore } from '../game/career/store';
import type { PadEvent } from '../input/joystickControls';
import { DD_ART_HEIGHT, DD_BG, DD_BG_KEY, DD_OBJ_KEY, ensureDrivewayArt, removeDrivewayArt } from '../render/art/drivewayArt';
import { applyJungle4, ballFrame, ensureJungle4, jungle4Key, removeJungle4, type Jungle4Set } from '../render/art/jungle4Art';
import { orientationOf } from '../render/layout';
import { CSS, FONT_FAMILY, textResolution } from '../render/theme';
import type { GameplayScene, InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';
import { PadHud } from './ui/PadHud';

export interface DrivewayInit {
  /** Where Return goes: the story's week screen, or back to Home Training (with its own init data). */
  readonly returnTo?: 'story' | 'career';
  readonly careerData?: object;
}

const ROLLERS: ReadonlySet<ObjKind> = new Set(['basketball', 'can', 'skateboard', 'scooter', 'tricycle']);
const BREAK_FRAME_SECONDS = 0.12;
/** Drawn object width relative to its collision diameter (art has a little transparent margin and a soft shadow). */
const ART_WIDTH = 1.25;
/** Far end of the driveway (garage base) as a fraction of the background art height, measured on the owner art. */
const GARAGE_BASE = DD_BG.garageBase;
const FAR_D = 1 / (1 + DRIVEWAY.spawnY / 20);

/**
 * Driveway Dribbling (weekly home mini-game). Draws `DrivewaySim` (src/game/driveway) and feeds it the league pad:
 * the same stick and the same SHOOT double-tap quick shot as matches. The scene owns no rules.
 */
export class DrivewayScene extends Phaser.Scene implements InspectableScene, GameplayScene {
  private returnTo: DrivewayInit['returnTo'];
  private careerData: object | undefined;
  private store: CareerStore | null = null;
  private save: CareerSave | null = null;
  private sim: DrivewaySim | null = null;
  private difficulty: DdDifficulty = 'beginner';
  private runId = '';
  private runWeek = 0;
  private paused = false;
  private leaving = false;
  private submitted = false;
  private outcomeText = '';
  private pad!: PadHud;
  private bg!: Phaser.GameObjects.Image;
  private g!: Phaser.GameObjects.Graphics;
  private fxG!: Phaser.GameObjects.Graphics;
  private objImgs = new Map<number, Phaser.GameObjects.Image>();
  private shotImgs: Phaser.GameObjects.Image[] = [];
  private rollImgs: Phaser.GameObjects.Image[] = [];
  private playerImg!: Phaser.GameObjects.Image;
  private ballImg!: Phaser.GameObjects.Image;
  private hud!: Phaser.GameObjects.Text;
  private hudRight!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private bannerUntil = 0;
  private panel!: Phaser.GameObjects.Text;
  private panelG!: Phaser.GameObjects.Graphics;
  private diffButtons: Button[] = [];
  private startButton!: Button;
  private replayButton!: Button;
  private returnButton!: Button;
  private pauseButton!: Button;
  private resumeButton!: Button;
  private leaveButton!: Button;
  private fx: { kind: 'impact' | 'break' | 'hit'; x: number; y: number; t0: number }[] = [];
  private kickT = -1;
  private warnUntil: { side: 'left' | 'right'; until: number } | null = null;
  private keys = new Set<string>();
  private phaseView: 'select' | 'play' | 'results' = 'select';
  private cast: Jungle4Set = 'jungle4-boy';

  constructor() {
    super(SceneKeys.Driveway);
  }

  init(data: DrivewayInit = {}): void {
    this.returnTo = data.returnTo;
    this.careerData = data.careerData;
    this.store = null;
    this.save = null;
    this.sim = null;
    this.paused = false;
    this.leaving = false;
    this.submitted = false;
    this.outcomeText = '';
    this.objImgs = new Map();
    this.shotImgs = [];
    this.rollImgs = [];
    this.fx = [];
    this.keys = new Set();
    this.phaseView = 'select';
    this.diffButtons = [];
  }

  create(): void {
    ensureDrivewayArt(this);
    const text = (size: number, color: string = CSS.cream) =>
      this.add.text(0, 0, '', { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color, align: 'center', resolution: textResolution(), stroke: '#2a1405', strokeThickness: 4 }).setOrigin(0.5);
    this.bg = this.add.image(0, 0, '__WHITE').setOrigin(0.5, 1).setVisible(false);
    this.g = this.add.graphics().setDepth(1);
    this.playerImg = this.add.image(0, 0, '__WHITE').setVisible(false);
    this.ballImg = this.add.image(0, 0, '__WHITE').setVisible(false);
    this.fxG = this.add.graphics().setDepth(4000);
    this.hud = text(15).setOrigin(0, 0).setAlign('left').setDepth(5001);
    this.hudRight = text(15).setOrigin(1, 0).setAlign('right').setDepth(5001);
    this.banner = text(40, '#ffd23f').setDepth(6000).setVisible(false);
    this.panelG = this.add.graphics().setDepth(6500);
    this.panel = text(16).setDepth(6501).setWordWrapWidth(320);
    for (const d of DD_DIFFICULTIES) {
      this.diffButtons.push(new Button(this, 0, 0, { name: `dd-diff-${d}`, label: DD_LABELS[d], width: 150, height: 44, fontSize: 16, onClick: () => this.pick(d) }).setDepth(6502));
    }
    this.startButton = new Button(this, 0, 0, { name: 'dd-start', label: 'Play', width: 200, height: 52, fontSize: 18, onClick: () => this.begin() }).setDepth(6502);
    this.replayButton = new Button(this, 0, 0, { name: 'dd-replay', label: 'Replay', width: 150, height: 52, fontSize: 18, onClick: () => this.showSelect() }).setDepth(6502);
    this.returnButton = new Button(this, 0, 0, { name: 'dd-return', label: 'Return', width: 150, height: 52, fontSize: 18, onClick: () => this.exit() }).setDepth(6502);
    this.pauseButton = new Button(this, 0, 0, { name: 'dd-pause', label: 'II Pause', width: 110, height: 44, fontSize: 16, onClick: () => this.setPaused(true) }).setDepth(5003);
    this.resumeButton = new Button(this, 0, 0, { name: 'dd-resume', label: 'Resume', width: 200, height: 52, fontSize: 18, onClick: () => this.setPaused(false) }).setDepth(7002);
    this.leaveButton = new Button(this, 0, 0, { name: 'dd-leave', label: 'Quit (no credit)', width: 200, height: 52, fontSize: 18, onClick: () => this.exit() }).setDepth(7002);
    // League pad, SHOOT only: same stick, same quick-shot double tap. Pass / slide / tackle have no use here.
    this.pad = new PadHud(this, this.scale.width, this.scale.height, { hidden: ['pass', 'slide', 'tackle'] });
    this.input.addPointer(2);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.input.keyboard?.on('keydown', this.onKeyDown, this);
    this.input.keyboard?.on('keyup', this.onKeyUp, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.showSelect();
    void this.openStore();
  }

  private async openStore(): Promise<void> {
    try {
      this.store = await CareerStore.open();
      this.save = await this.store.load();
    } catch {
      this.save = null;
    }
    if (!this.sys.isActive()) return;
    this.cast = this.save?.player?.gender === 'girl' ? 'jungle4-girl' : 'jungle4-boy';
    ensureJungle4(this, [this.cast, 'jungle4-ball']);
    const d = this.save?.driveway;
    if (d) this.difficulty = [...DD_DIFFICULTIES].reverse().find((x) => isUnlocked(d, x)) ?? 'beginner';
    this.showSelect();
  }

  // ---- flow ----

  private pick(d: DdDifficulty): void {
    if (this.save && !isUnlocked(this.save.driveway, d)) return;
    this.difficulty = d;
    this.showSelect();
  }

  private showSelect(): void {
    this.phaseView = 'select';
    this.sim = null;
    this.submitted = false;
    this.clearObjects();
    this.setPaused(false);
    this.layout();
  }

  private begin(): void {
    if (!this.save?.player) return;
    if (!isUnlocked(this.save.driveway, this.difficulty)) return;
    const seed = (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
    this.runWeek = this.save.week;
    this.runId = `dd-${this.save.week}-${this.difficulty}-${seed.toString(36)}-${Date.now().toString(36)}`;
    this.sim = new DrivewaySim(this.difficulty, seed);
    this.sim.start();
    this.phaseView = 'play';
    this.submitted = false;
    this.outcomeText = '';
    this.handlePad(this.pad.controls.cancelAll('round start'));
    this.layout();
  }

  private async finish(): Promise<void> {
    const sim = this.sim;
    const r = sim?.result;
    if (!sim || !r || this.submitted) return;
    this.submitted = true;
    const sub: DrivewaySubmission = {
      runId: this.runId, week: this.runWeek, difficulty: r.difficulty, seed: r.seed, reason: r.reason, score: r.score, dodges: r.dodges,
      targets: r.targets, shots: r.shots, bestCombo: r.bestCombo, survived: r.survived, collisions: r.collisions,
    };
    const before = this.save;
    let line = 'Result not saved.';
    if (this.store) {
      const out = await this.store.dispatch({ type: 'drivewayResult', result: sub });
      this.save = await this.store.load();
      line = out.ok ? '' : `Not saved: ${out.error}`;
    }
    const prevBest = before?.driveway.best.find((b) => b.difficulty === r.difficulty)?.score ?? 0;
    const wk = this.save ? drivewayWeek(this.save.driveway, this.save.week) : undefined;
    const prevWeek = before ? drivewayWeek(before.driveway, before.week) : undefined;
    const earned = attemptQuarters(r.difficulty, r.medal);
    const paid = Math.max(0, (wk?.bestQuarters ?? 0) - (prevWeek?.bestQuarters ?? 0));
    const appliedNow = wk && prevWeek ? sumApplied(wk.applied) - sumApplied(prevWeek.applied) : wk ? sumApplied(wk.applied) : 0;
    const due = this.save ? drivewayDue(this.save.driveway, this.save.week) : true;
    this.outcomeText = [
      `${r.reason === 'time' ? 'TIME!' : 'OUT OF CHANCES'}  ·  ${DD_LABELS[r.difficulty]}`,
      `Score ${r.score}  ·  ${MEDAL_LABELS[r.medal]}${r.score > prevBest ? '  ·  NEW PERSONAL BEST' : ''}`,
      `Clean dodges ${r.dodges}  ·  Targets ${r.targets}  ·  Accuracy ${r.shots ? Math.round(r.accuracy * 100) : 0}%`,
      `Best combo ${r.bestCombo}  ·  Survived ${Math.floor(r.survived)} s`,
      `This attempt earns ${fmt(quartersToPoints(earned))} development points`,
      `Added this week: +${fmt(quartersToPoints(paid))} (week total ${fmt(quartersToPoints(wk?.bestQuarters ?? 0))} of 2.00)`,
      paid > 0 && appliedNow + 1e-9 < quartersToPoints(paid) ? `Season 1 maximum reached: +${appliedNow.toFixed(2)} actually applied` : '',
      due ? 'Weekly Driveway Dribbling: not complete' : 'Weekly Driveway Dribbling: complete ✓',
      line,
    ].filter(Boolean).join('\n');
    this.phaseView = 'results';
    this.layout();
  }

  private exit(): void {
    if (this.leaving) return;
    this.leaving = true;
    if (this.returnTo === 'story') this.scene.start(SceneKeys.Story, { resume: true });
    else if (this.returnTo === 'career') this.scene.start(SceneKeys.Career, this.careerData ?? {});
    else this.scene.start(SceneKeys.Start);
  }

  // ---- frame ----

  override update(_time: number, delta: number): void {
    const sim = this.sim;
    if (sim && this.phaseView === 'play' && !this.paused) {
      this.handlePad(this.pad.controls.setAvailable({ pass: false, shoot: sim.phase === 'playing', slide: false, tackle: false }));
      const rec = sim.ball.state === 'recovering' ? 1 - Math.max(0, sim.ball.recoverAt - sim.t) / DRIVEWAY.shot.recoverySeconds : 0;
      this.pad.setMeters({ shoot: { fill: rec, color: 0x4fc3f7 } });
      for (const e of sim.update(Math.min(delta, 100) / 1000)) this.onEvent(e);
      if (sim.phase === 'results' && !this.submitted) void this.finish();
    }
    this.draw();
  }

  private onEvent(e: DdEvent): void {
    const sim = this.sim!;
    if (e.type === 'shot') this.kickT = sim.t;
    else if (e.type === 'hit') this.flash(e.chancesLeft > 0 ? 'OUCH!' : 'OUT!', 600), this.fx.push({ kind: 'hit', x: sim.player.x, y: sim.player.y, t0: sim.t }), this.cameras.main.shake(140, 0.006);
    else if (e.type === 'break') {
      const o = sim.objects.find((x) => x.id === e.obj);
      if (o) this.fx.push({ kind: 'break', x: o.x, y: o.y, t0: sim.t });
    } else if (e.type === 'impact') this.fx.push({ kind: 'impact', x: e.x, y: e.y, t0: sim.t });
    else if (e.type === 'warn') this.warnUntil = { side: e.side, until: sim.t + DRIVEWAY.warnSeconds };
    else if (e.type === 'end') this.flash(e.reason === 'time' ? 'TIME!' : 'OUT!', 900);
  }

  private flash(s: string, ms: number): void {
    this.banner.setText(s).setVisible(true);
    this.bannerUntil = performance.now() + ms;
  }

  /** Screen projection: perspective up the driveway, garage base at the far end of the play lane. */
  private view() {
    const { width: w, height: h } = this.scale;
    const portrait = h > w;
    const sBg = Math.max(w / DD_BG.width, h / DD_BG.height);
    const bgTop = h - DD_BG.height * sBg;
    const farY = bgTop + GARAGE_BASE * DD_BG.height * sBg;
    const nearY = portrait ? h * 0.86 : h * 0.98;
    const unit = Math.min((w * 0.92) / DRIVEWAY.width, (nearY - farY) / 5.2);
    const proj = (x: number, y: number) => {
      const d = 1 / (1 + y / 20);
      return { x: w / 2 + (x - DRIVEWAY.width / 2) * unit * d, y: nearY - ((nearY - farY) * (1 - d)) / (1 - FAR_D), s: unit * d };
    };
    return { w, h, sBg, proj, unit, farY, nearY };
  }

  private draw(): void {
    const v = this.view();
    if (this.textures.exists(DD_BG_KEY)) this.bg.setTexture(DD_BG_KEY).setScale(v.sBg).setPosition(v.w / 2, v.h).setVisible(true);
    this.g.clear();
    if (!this.textures.exists(DD_BG_KEY)) this.g.fillStyle(0xe8a878).fillRect(0, 0, v.w, v.h);
    const sim = this.sim;
    const now = performance.now();
    this.banner.setVisible(now < this.bannerUntil);
    this.fxG.clear();
    if (this.phaseView === 'play') this.pad.draw();
    if (!sim) {
      this.playerImg.setVisible(false);
      this.ballImg.setVisible(false);
      this.hud.setText('');
      this.hudRight.setText('');
      return;
    }
    // Lane bounds the player can use (thin line on the concrete).
    const a = v.proj(DRIVEWAY.player.minX, DRIVEWAY.player.maxY), b = v.proj(DRIVEWAY.player.maxX, DRIVEWAY.player.minY);
    this.g.lineStyle(2, 0xfff3d6, 0.35).strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    const seen = new Set<number>();
    for (const o of sim.objects) {
      const img = this.objectImage(o, sim.t, v);
      if (img) seen.add(o.id);
    }
    for (const [id, img] of this.objImgs) if (!seen.has(id)) (img.destroy(), this.objImgs.delete(id));
    sim.projectiles.forEach((pr, i) => {
      const p = v.proj(pr.x, pr.y);
      this.ballSprite(this.shotImgs, i, p.x, p.y, DRIVEWAY.shot.radius * p.s, pr.y * 4);
    });
    for (let i = sim.projectiles.length; i < this.shotImgs.length; i++) this.shotImgs[i]!.setVisible(false);
    // Player + ball at the feet; touch frames alternate with the sim's foot.
    const pp = v.proj(sim.player.x, sim.player.y);
    const moving = Math.hypot(sim.player.vx, sim.player.vy) > 0.4;
    const kicking = this.kickT >= 0 && sim.t - this.kickT < 0.3;
    const name = kicking ? `shot-${3 + Math.min(2, Math.floor(((sim.t - this.kickT) / 0.3) * 3))}` : moving ? `run-${Math.floor(sim.t * 10) % 6}` : 'idle-n';
    const face = sim.player.facing < 0 && name !== 'idle-n' ? `${name}-w` : name;
    const protect = sim.t < sim.protectUntil && Math.floor(sim.t * 12) % 2 === 0;
    const shown = applyJungle4(this.playerImg, this.cast, face, pp.s * 1.7);
    this.playerImg.setPosition(pp.x, pp.y).setVisible(shown).setAlpha(protect ? 0.45 : 1).setDepth(100 + pp.y);
    if (!shown) this.g.fillStyle(0x1e88e5).fillCircle(pp.x, pp.y - pp.s * 0.6, pp.s * 0.4);
    const bp = v.proj(sim.ball.x, sim.ball.y);
    const br = DRIVEWAY.ball.radius * bp.s;
    if (sim.ball.state === 'held' && this.textures.exists(jungle4Key('jungle4-ball'))) {
      this.ballImg.setTexture(jungle4Key('jungle4-ball'), ballFrame(sim.player.x * 3 + sim.player.y * 3)).setDisplaySize(br * 2, br * 2).setPosition(bp.x, bp.y - br).setVisible(true).setDepth(this.playerImg.depth + 1);
    } else this.ballImg.setVisible(false);
    if (sim.ball.state === 'recovering') {
      const k = Math.max(0, sim.ball.recoverAt - sim.t) / DRIVEWAY.shot.recoverySeconds;
      const rp = v.proj(sim.ball.x + DRIVEWAY.shot.rollInFrom * k, sim.ball.y);
      this.ballSprite(this.rollImgs, 0, rp.x, rp.y, br, k * 12);
    } else this.rollImgs[0]?.setVisible(false);
    for (const f of this.fx) {
      const age = sim.t - f.t0;
      if (age > 0.5) continue;
      const p = v.proj(f.x, f.y);
      const c = f.kind === 'hit' ? 0xff5252 : f.kind === 'impact' ? 0xffffff : 0xffd23f;
      this.fxG.lineStyle(3, c, 1 - age * 2).strokeCircle(p.x, p.y - p.s * 0.3, p.s * (0.3 + age * 1.6));
    }
    this.fx = this.fx.filter((f) => sim.t - f.t0 <= 0.5);
    if (this.warnUntil && sim.t < this.warnUntil.until) {
      const x = this.warnUntil.side === 'left' ? 18 : v.w - 18;
      this.fxG.fillStyle(0xffd23f, 0.9).fillTriangle(x, v.nearY - 140, x + (this.warnUntil.side === 'left' ? 16 : -16), v.nearY - 128, x, v.nearY - 116);
    }
    const left = Math.max(0, DRIVEWAY.roundSeconds - sim.stats.survived);
    const mult = sim.stats.combo >= DRIVEWAY.score.x3At ? 3 : sim.stats.combo >= DRIVEWAY.score.x2At ? 2 : 1;
    this.hud.setText(`${DD_LABELS[sim.difficulty].toUpperCase()}\nTIME ${Math.ceil(left)}  ·  SCORE ${sim.stats.score}`);
    this.hudRight.setText(`${'●'.repeat(sim.chances)}${'○'.repeat(DRIVEWAY.chances - sim.chances)}\nCOMBO x${mult} (${sim.stats.combo})\n${sim.canShoot ? 'SHOT READY' : sim.phase === 'playing' ? 'BALL RECOVERING' : ''}`);
    if (sim.phase === 'countdown') this.banner.setText(String(Math.max(1, Math.ceil(DRIVEWAY.countdownSeconds - sim.t)))).setVisible(true);
  }

  private objectImage(o: Obj, t: number, v: ReturnType<DrivewayScene['view']>): Phaser.GameObjects.Image | null {
    const p = v.proj(o.x, o.y);
    if (p.y < v.farY - 4 || p.y > v.h + 200) return null;
    let frame = 0;
    if (o.state === 'broken' || o.state === 'retired') {
      const age = t - (o.endedAt ?? t);
      if (o.cat === 'breakable') {
        frame = Math.min(3, 1 + Math.floor(age / BREAK_FRAME_SECONDS));
        if (age > 0.9) return null;
      } else {
        frame = Math.min(3, 1 + Math.floor(age / BREAK_FRAME_SECONDS));
        if (age > 0.6) return null;
      }
    } else if (ROLLERS.has(o.kind)) frame = Math.floor(Math.abs(o.y * 2 + o.x * 2)) % 4;
    const wPx = o.r * 2 * p.s * ART_WIDTH;
    const h = wPx * DD_ART_HEIGHT[o.kind] * 0.5;
    if (!this.textures.exists(DD_OBJ_KEY)) {
      this.g.fillStyle(o.cat === 'breakable' ? 0xc58a4a : 0xff7a1a).fillCircle(p.x, p.y - h / 3, o.r * p.s);
      return null;
    }
    let img = this.objImgs.get(o.id);
    if (!img) (img = this.add.image(0, 0, DD_OBJ_KEY, `${o.kind}-0`).setOrigin(0.5, 0.92)), this.objImgs.set(o.id, img);
    const tex = this.textures.get(DD_OBJ_KEY).get(`${o.kind}-${frame}`);
    img.setFrame(`${o.kind}-${frame}`).setScale(wPx / tex.width).setPosition(p.x, p.y).setDepth(100 + p.y).setAlpha(o.state === 'live' ? 1 : 0.85);
    return img;
  }

  /** Shots and the rolled-in replacement use the approved patterned ball (jungle4-ball), with a ground shadow. */
  private ballSprite(pool: Phaser.GameObjects.Image[], i: number, x: number, y: number, r: number, roll: number): void {
    const key = jungle4Key('jungle4-ball');
    this.fxG.fillStyle(0x000000, 0.25).fillEllipse(x, y, r * 2, r * 0.7);
    if (!this.textures.exists(key)) return void this.fxG.fillStyle(0xffffff, 1).fillCircle(x, y - r, r);
    const img = pool[i] ?? (pool[i] = this.add.image(0, 0, key, ballFrame(0)));
    img.setTexture(key, ballFrame(roll)).setDisplaySize(r * 2, r * 2).setPosition(x, y - r).setDepth(101 + y).setVisible(true);
  }

  private clearObjects(): void {
    for (const img of this.objImgs.values()) img.destroy();
    this.objImgs.clear();
  }

  // ---- layout ----

  private onResize(): void {
    this.layout();
  }

  private layout(): void {
    const { width: w, height: h } = this.scale;
    this.handlePad(this.pad.layout(w, h));
    const play = this.phaseView === 'play';
    this.pad.setVisible(play);
    this.hud.setPosition(12, 10).setVisible(play);
    this.hudRight.setPosition(w - 12, 10).setVisible(play);
    this.pauseButton.setPosition(w / 2, h > w ? 96 : 32).setVisible(play && !this.paused);
    this.banner.setPosition(w / 2, h * 0.32);
    const overlay = this.phaseView !== 'play';
    this.panelG.clear();
    const wide = w > h;
    const panelW = Math.min(wide ? 600 : 380, w - 16);
    if (overlay) this.panelG.fillStyle(0x1b0d04, 0.82).fillRoundedRect(w / 2 - panelW / 2, 12, panelW, h - 24, 14);
    this.panel.setWordWrapWidth(panelW - 30).setVisible(overlay);
    for (const b of this.diffButtons) b.setVisible(false);
    this.startButton.setVisible(false);
    this.replayButton.setVisible(false);
    this.returnButton.setVisible(false);
    if (this.phaseView === 'select') {
      const s = this.save;
      const due = s?.player ? drivewayDue(s.driveway, s.week) : false;
      const wk = s ? drivewayWeek(s.driveway, s.week) : undefined;
      const best = s?.driveway.best.find((b) => b.difficulty === this.difficulty);
      this.panel.setText([
        'DRIVEWAY DRIBBLING',
        s?.player ? `Week ${s.week}  ·  ${due ? 'Complete this week\'s Driveway Dribbling' : 'This week: complete ✓'}` : 'Loading your player…',
        'Dodge solid objects. Double-tap SHOOT (the league quick shot) to break boxes and targets.',
        `Development this week: ${fmt(quartersToPoints(wk?.bestQuarters ?? 0))} of 2.00`,
        best ? `Best on ${DD_LABELS[this.difficulty]}: ${best.score} (${MEDAL_LABELS[best.medal]})` : `No score yet on ${DD_LABELS[this.difficulty]}`,
      ].join('\n'));
      this.panel.setPosition(w / 2, wide ? Math.max(h * 0.22, 22 + this.panel.height / 2) : h * 0.24);
      // Landscape: one row of difficulties, then Play and Return side by side, so short phones (568x320) fit.
      const cols = wide || w >= 640 ? 4 : 2;
      const step = Math.min(160, (w - 32) / cols);
      const top = wide ? Math.max(h * 0.5, this.panel.y + this.panel.height / 2 + 34) : h * 0.46;
      DD_DIFFICULTIES.forEach((d, i) => {
        const b = this.diffButtons[i]!;
        const open = s ? isUnlocked(s.driveway, d) : d === 'beginner';
        const col = i % cols, row = Math.floor(i / cols);
        b.setLabel(`${d === this.difficulty ? '▸ ' : ''}${DD_LABELS[d]}${open ? '' : ' 🔒'}`);
        if (b.width !== Math.min(150, step - 10)) b.resize(Math.min(150, step - 10), 44, step < 140 ? 14 : 16);
        b.setPosition(w / 2 + (col - (cols - 1) / 2) * step, top + row * 54).setVisible(true).setAlpha(open ? 1 : 0.55);
      });
      const rows = Math.ceil(DD_DIFFICULTIES.length / cols);
      if (wide) {
        this.startButton.setPosition(w / 2 - 110, top + rows * 54 + 12).setVisible(true).setEnabled(!!s?.player);
        this.returnButton.setPosition(w / 2 + 110, top + rows * 54 + 12).setVisible(true);
      } else {
        this.startButton.setPosition(w / 2, top + rows * 54 + 20).setVisible(true).setEnabled(!!s?.player);
        this.returnButton.setPosition(w / 2, top + rows * 54 + 84).setVisible(true);
      }
    } else if (this.phaseView === 'results') {
      this.panel.setText(this.outcomeText).setPosition(w / 2, h * (h > w ? 0.34 : 0.4));
      this.replayButton.setPosition(w / 2 - 82, h - 60).setVisible(true);
      this.returnButton.setPosition(w / 2 + 82, h - 60).setVisible(true);
    }
    this.layoutPause();
  }

  private layoutPause(): void {
    const { width: w, height: h } = this.scale;
    const on = this.paused && this.phaseView === 'play';
    this.resumeButton.setPosition(w / 2, h / 2 - 20).setVisible(on);
    this.leaveButton.setPosition(w / 2, h / 2 + 48).setVisible(on);
    if (on) this.panelG.clear().fillStyle(0x000000, 0.6).fillRect(0, 0, w, h);
    if (on) this.panel.setText('PAUSED\nQuitting gives no weekly credit.').setPosition(w / 2, h / 2 - 100).setVisible(true);
  }

  private setPaused(on: boolean): void {
    if (this.leaving) return;
    const sim = this.sim;
    if (on && (!sim || this.phaseView !== 'play' || sim.phase === 'results')) return;
    this.paused = on;
    if (on) (this.onBlur(), sim?.pause());
    else sim?.resume();
    this.pauseButton.setVisible(!on && this.phaseView === 'play');
    if (!on && this.phaseView === 'play') this.panel.setVisible(false), this.panelG.clear();
    this.layoutPause();
  }

  // ---- input ----

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.phaseView === 'play' && !this.paused) this.handlePad(this.pad.controls.pointerDown(p.id, p.x, p.y));
  }
  private onMove(p: Phaser.Input.Pointer): void {
    if (p.isDown && this.phaseView === 'play' && !this.paused) this.handlePad(this.pad.controls.pointerMove(p.id, p.x, p.y));
  }
  private onUp(p: Phaser.Input.Pointer): void {
    this.handlePad(this.pad.controls.pointerUp(p.id));
  }
  /** Screen up = up the driveway (+y in the sim). */
  private handlePad(events: readonly PadEvent[]): void {
    const sim = this.sim;
    if (!sim) return;
    for (const e of events) {
      if (e.type === 'move') sim.setMove(e.x, -e.y);
      else if (e.action !== 'shoot') continue;
      else if (e.type === 'press') sim.press();
      else if (e.type === 'release') sim.release();
      else sim.cancelInputs();
    }
  }
  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Escape') return this.setPaused(!this.paused);
    if (this.paused || !this.sim || this.phaseView !== 'play') return;
    if (DIRS[e.code]) (this.keys.add(e.code), this.sendKeys());
    else if ((e.code === 'Space' || e.code === 'KeyK') && !e.repeat) this.sim.press();
  }
  private onKeyUp(e: KeyboardEvent): void {
    if (DIRS[e.code]) (this.keys.delete(e.code), this.sendKeys());
    else if (e.code === 'Space' || e.code === 'KeyK') this.sim?.release();
  }
  private sendKeys(): void {
    let x = 0, y = 0;
    for (const k of this.keys) (x += DIRS[k]?.[0] ?? 0), (y += DIRS[k]?.[1] ?? 0);
    const m = Math.hypot(x, y) || 1;
    this.sim?.setMove(x / m, y / m);
  }
  private onBlur(): void {
    this.keys.clear();
    this.sim?.cancelInputs();
    this.handlePad(this.pad.controls.cancelAll('blur'));
  }
  /** App switched away or screen locked: drop held controls and pause (round clock and cooldowns stop). */
  private onHidden(): void {
    this.onBlur();
    this.setPaused(true);
  }

  // ---- debug ----

  describeLayout(): SceneLayoutReport {
    const { width, height } = this.scale;
    const r = (o: { getBounds(): Phaser.Geom.Rectangle; visible: boolean }): Rect | null => {
      if (!o.visible) return null;
      const b = o.getBounds();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    };
    const elements: Record<string, Rect> = {};
    const add = (k: string, o: { getBounds(): Phaser.Geom.Rectangle; visible: boolean }) => {
      const b = r(o);
      if (b) elements[k] = b;
    };
    add('hud', this.hud);
    add('hudRight', this.hudRight);
    add('panel', this.panel);
    add('dd-start', this.startButton);
    add('dd-replay', this.replayButton);
    add('dd-return', this.returnButton);
    add('dd-pause', this.pauseButton);
    add('dd-resume', this.resumeButton);
    add('dd-leave', this.leaveButton);
    this.diffButtons.forEach((b, i) => add(`dd-diff-${DD_DIFFICULTIES[i]}`, b));
    for (const [k, c] of Object.entries(this.pad.controls.currentLayout.buttons)) if (k === 'shoot') elements['pad-shoot'] = { x: c.x - c.r, y: c.y - c.r, width: c.r * 2, height: c.r * 2 };
    const st = this.pad.controls.currentLayout.stick;
    elements['pad-stick'] = { x: st.x - st.r, y: st.y - st.r, width: st.r * 2, height: st.r * 2 };
    return { orientation: orientationOf({ width, height }), viewport: { width, height }, elements };
  }

  describeGameplay(): unknown {
    const s = this.sim;
    return {
      view: this.phaseView,
      paused: this.paused,
      difficulty: this.difficulty,
      art: { background: this.textures.exists(DD_BG_KEY), objects: this.textures.exists(DD_OBJ_KEY), player: this.textures.exists(jungle4Key(this.cast)), ball: this.textures.exists(jungle4Key('jungle4-ball')) },
      outcome: this.outcomeText,
      sim: s && {
        phase: s.phase, t: s.t, chances: s.chances, stats: { ...s.stats }, canShoot: s.canShoot,
        player: { x: s.player.x, y: s.player.y }, ball: { x: s.ball.x, y: s.ball.y, state: s.ball.state },
        objects: s.objects.filter((o) => o.state === 'live').map((o) => ({ id: o.id, kind: o.kind, cat: o.cat, x: o.x, y: o.y, r: o.r })),
        projectiles: s.projectiles.length, result: s.result,
      },
      save: this.save && { week: this.save.week, due: drivewayDue(this.save.driveway, this.save.week), week_row: drivewayWeek(this.save.driveway, this.save.week) ?? null, unlocked: this.save.driveway.unlocked },
    };
  }

  private onShutdown(): void {
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.input.keyboard?.off('keydown', this.onKeyDown, this);
    this.input.keyboard?.off('keyup', this.onKeyUp, this);
    this.pad.destroy();
    this.clearObjects();
    this.store?.close();
    removeDrivewayArt(this);
    removeJungle4(this, [this.cast]);
  }
}

const DIRS: Record<string, readonly [number, number]> = { ArrowUp: [0, 1], KeyW: [0, 1], ArrowDown: [0, -1], KeyS: [0, -1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
const fmt = (n: number): string => n.toFixed(2);
const sumApplied = (a: Partial<Record<string, number>>): number => Object.values(a).reduce<number>((s, x) => s + (x ?? 0), 0);
