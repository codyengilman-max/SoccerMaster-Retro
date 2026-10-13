import Phaser from 'phaser';
import { attack, pitchMarkings, U11_9V9_PITCH, type PitchMarkings, type Rect, type Vec2 } from '../game';
import {
  GESTURE_TUNING,
  GestureRecognizer,
  KEY_BINDINGS,
  KeyboardAim,
  SCREEN_DIRECTIONS,
  type AimDrag,
  type Gesture,
} from '../input';
import {
  arcPoints,
  fitRegion,
  orientationOf,
  pitchVectorToScreen,
  rectToScreen,
  screenVectorToPitch,
  toScreen,
  type Insets,
  type PitchLayout,
} from '../render/layout';
import { BALL_TEXTURE_SIZE, PLAYER_TEXTURE_SIZE, TEXTURES, ensurePlaceholderTextures } from '../render/textures';
import { CSS, FONT_FAMILY, PALETTE, textResolution } from '../render/theme';
import type { AttackReport } from './attackReport';
import type { InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';

const { AttackSim, ATTACK_TUNING, PLAYER_IDS, distance, lerp, normalize, sub } = attack;
type PlayerId = attack.PlayerId;
type SimEvent = attack.SimEvent;

/** Visible slice of the pitch: the training area plus the goal behind the line. */
const VIEW: Rect = { x: 31, y: 0, width: 47, height: 50 };
const TRAINING_AREA: Rect = {
  x: ATTACK_TUNING.area.minX,
  y: 0,
  width: ATTACK_TUNING.area.maxX - ATTACK_TUNING.area.minX,
  height: ATTACK_TUNING.area.width,
};
/** Elevated sideline camera: across-pitch distances look shorter than along-pitch ones. */
const SIDELINE_SQUASH = 0.55;
const EDGE = 10;
const HUD_HEIGHT = 44;

const HELP_TOUCH = 'Swipe ↑↓ cut · → push · ← check   |   Hold your player, drag back, release to kick';
const HELP_KEYS = 'Keys: arrows/WASD move · hold Space to aim (←→ turn, ↑↓ power) · Tab pass/shoot · R retry · Esc back';

const OUTCOME_TEXT: Record<attack.Outcome, { title: string; color: string; tip: string }> = {
  goal: { title: 'GOAL!', color: CSS.tomato, tip: 'Great finish. Try a different route next time.' },
  saved: { title: 'Saved', color: CSS.blue, tip: 'Aim for the far side of the goal, away from the keeper.' },
  intercepted: { title: 'Intercepted', color: CSS.blue, tip: 'Pass to the teammate the cover defender is not blocking.' },
  tackled: { title: 'Tackled', color: CSS.blue, tip: 'Swipe up or down to cut away before the defender arrives.' },
  out: { title: 'Out of play', color: CSS.ink, tip: 'Keep passes and touches inside the training area.' },
};

const REJECT_TEXT: Record<string, string> = {
  cooldown: 'Too soon — wait a moment between moves',
  control: 'Not enough ball control — let it recover',
  'no ball': 'You need the ball to do that',
};

/** Milestone 2 training attack: 3 attackers vs 2 defenders + keeper. Rendering + input only; rules live in AttackSim. */
export class AttackScene extends Phaser.Scene implements InspectableScene {
  private sim!: InstanceType<typeof AttackSim>;
  private markings!: PitchMarkings;
  private pitchLayout!: PitchLayout;
  private recognizer!: GestureRecognizer;
  private keyAim: KeyboardAim | null = null;
  private aimSource: 'pointer' | 'keyboard' | null = null;
  private held = { left: false, right: false, up: false, down: false };
  private lastSeq = 0;
  private navigating = false;
  private ballTrail: Vec2[] = [];
  private toastMessage = '';
  private toastUntil = 0;

  private field!: Phaser.GameObjects.Graphics;
  private under!: Phaser.GameObjects.Graphics;
  private over!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  private sprites!: Record<PlayerId, Phaser.GameObjects.Image>;
  private ball!: Phaser.GameObjects.Image;
  private backButton!: Button;
  private passButton!: Button;
  private shootButton!: Button;
  private retryButton!: Button;
  private statusText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private rotateHint!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private bannerText!: Phaser.GameObjects.Text;
  private aimLabel!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Graphics;
  private outcomeTitle!: Phaser.GameObjects.Text;
  private outcomeDetail!: Phaser.GameObjects.Text;
  private panelRect: Rect = { x: 0, y: 0, width: 0, height: 0 };
  private meterRect: Rect = { x: 0, y: 0, width: 0, height: 0 };

  constructor() {
    super(SceneKeys.Attack);
  }

  create(): void {
    this.navigating = false;
    this.keyAim = null;
    this.aimSource = null;
    this.held = { left: false, right: false, up: false, down: false };
    this.ballTrail = [];
    this.toastMessage = '';
    this.toastUntil = 0;
    const seed = Number(new URLSearchParams(window.location.search).get('seed') ?? '1') || 1;
    this.sim = new AttackSim({ seed });
    this.lastSeq = 0;
    this.recognizer = new GestureRecognizer(GESTURE_TUNING);
    this.markings = pitchMarkings(U11_9V9_PITCH);
    ensurePlaceholderTextures(this);

    const resolution = textResolution();
    const text = (size: number, color: string = CSS.cream, stroke = true): Phaser.GameObjects.Text =>
      this.add
        .text(0, 0, '', {
          fontFamily: FONT_FAMILY,
          fontStyle: 'bold',
          fontSize: `${size}px`,
          color,
          align: 'center',
          ...(stroke ? { stroke: CSS.ink, strokeThickness: 4 } : {}),
        })
        .setResolution(resolution);

    this.field = this.add.graphics().setDepth(0);
    this.under = this.add.graphics().setDepth(1);
    const kit = (id: PlayerId): string => (id === 'GK' ? TEXTURES.keeper : id.startsWith('A') ? TEXTURES.attacker : TEXTURES.defender);
    this.sprites = Object.fromEntries(
      PLAYER_IDS.map((id) => [id, this.add.image(0, 0, kit(id)).setOrigin(0.5, 0.95).setName(id)]),
    ) as Record<PlayerId, Phaser.GameObjects.Image>;
    this.ball = this.add.image(0, 0, TEXTURES.ball).setName('ball');
    this.over = this.add.graphics().setDepth(5000);
    this.aimLabel = text(14).setOrigin(0.5, 1).setDepth(5001);
    this.hud = this.add.graphics().setDepth(6000);
    this.statusText = text(14).setOrigin(0.5, 0.5).setDepth(6001);
    this.helpText = text(12, CSS.ink, false).setOrigin(0.5, 1).setDepth(6001).setAlpha(0.9);
    this.rotateHint = text(14, CSS.ink, false).setOrigin(0.5, 0.5).setDepth(6001);
    this.rotateHint.setText('↻ Rotate to landscape for the best view');
    this.toastText = text(16).setOrigin(0.5, 0.5).setDepth(6002);
    this.bannerText = text(34).setOrigin(0.5, 0.5).setDepth(6002);

    this.backButton = new Button(this, 0, 0, {
      name: 'back-button',
      label: '‹ Back',
      width: 96,
      height: HUD_HEIGHT,
      fontSize: 18,
      fill: PALETTE.cream,
      fillPressed: PALETTE.sand,
      onClick: () => this.goBack(),
    }).setDepth(6003);
    this.passButton = new Button(this, 0, 0, {
      name: 'pass-toggle',
      label: 'PASS',
      width: 96,
      height: HUD_HEIGHT,
      fontSize: 18,
      onClick: () => this.sim.command({ type: 'setAction', action: 'pass' }),
    }).setDepth(6003);
    this.shootButton = new Button(this, 0, 0, {
      name: 'shoot-toggle',
      label: 'SHOOT',
      width: 96,
      height: HUD_HEIGHT,
      fontSize: 18,
      onClick: () => this.sim.command({ type: 'setAction', action: 'shoot' }),
    }).setDepth(6003);

    this.panel = this.add.graphics().setDepth(7000);
    this.outcomeTitle = text(40).setOrigin(0.5, 0.5).setDepth(7001);
    this.outcomeDetail = text(15, CSS.ink, false).setOrigin(0.5, 0).setDepth(7001);
    this.outcomeDetail.setWordWrapWidth(300, true);
    this.retryButton = new Button(this, 0, 0, {
      name: 'retry-button',
      label: 'Retry',
      width: 160,
      height: 52,
      fontSize: 22,
      onClick: () => this.retry(),
    }).setDepth(7002);
    this.showOutcome(false);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
    this.input.keyboard?.on('keydown', this.onKeyDown, this);
    this.input.keyboard?.on('keyup', this.onKeyUp, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBackground, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onBackground, this);
    this.game.canvas.addEventListener('pointercancel', this.onDomCancel);
    this.game.canvas.addEventListener('touchcancel', this.onDomCancel);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.layout(this.scale.width, this.scale.height);
    this.consumeEvents();
    this.renderFrame();
  }

  override update(_time: number, delta: number): void {
    this.handleGestures(this.recognizer.update(performance.now()));
    if (this.keyAim) {
      this.keyAim.update(delta / 1000, this.held);
      this.sendKeyboardAim();
    }
    this.sim.step(delta / 1000);
    this.consumeEvents();
    this.renderFrame();
  }

  describeLayout(): SceneLayoutReport {
    const { width, height } = this.scale;
    const elements: Record<string, Rect> = {
      pitch: rectToScreen(this.pitchLayout, TRAINING_AREA),
      goal: rectToScreen(this.pitchLayout, this.attackingGoal()),
      'back-button': this.backButton.getButtonBounds(),
      'pass-toggle': this.passButton.getButtonBounds(),
      'shoot-toggle': this.shootButton.getButtonBounds(),
      status: boundsOf(this.statusText),
      meters: this.meterRect,
      help: boundsOf(this.helpText),
    };
    if (this.retryButton.visible) {
      elements['retry-button'] = this.retryButton.getButtonBounds();
      elements['outcome-panel'] = this.panelRect;
    }
    if (this.rotateHint.visible) elements['rotate-hint'] = boundsOf(this.rotateHint);
    for (const id of PLAYER_IDS) elements[id] = boundsOf(this.sprites[id]);
    elements.ball = boundsOf(this.ball);
    return { orientation: this.pitchLayout.orientation, viewport: { width, height }, elements };
  }

  describeGameplay(): AttackReport {
    const s = this.sim.state;
    const L = this.pitchLayout;
    const players = Object.fromEntries(
      PLAYER_IDS.map((id) => {
        const p = s.players[id];
        const sp = toScreen(L, p.pos);
        return [id, { x: p.pos.x, y: p.pos.y, vx: p.vel.x, vy: p.vel.y, role: p.role, sx: sp.x, sy: sp.y }];
      }),
    ) as AttackReport['players'];
    const bs = toScreen(L, s.ball.pos);
    return {
      phase: s.phase,
      outcome: s.outcome,
      outcomeBy: s.outcomeBy,
      attempt: s.attempt,
      controlledId: s.controlledId,
      owner: s.ball.owner,
      action: s.action,
      timeScale: s.timeScale,
      slowMoBudget: s.slowMoBudget,
      control: s.control,
      swipeCooldown: s.swipeCooldown,
      runnerId: s.runnerId,
      coverMarkId: s.coverMarkId,
      resolutions: s.resolutions,
      aim: s.aim ? { direction: s.aim.direction ? { ...s.aim.direction } : null, power: s.aim.power } : null,
      events: s.events.map((e) => ({ type: e.type, by: e.by, detail: e.detail })),
      players,
      ball: { x: s.ball.pos.x, y: s.ball.pos.y, vx: s.ball.vel.x, vy: s.ball.vel.y, sx: bs.x, sy: bs.y },
      layout: { ...L },
      input: this.recognizer.state,
      aimSource: this.aimSource,
      gesture: GESTURE_TUNING,
      holdRadiusPx: this.holdRadius(),
      pass: { minDistance: this.sim.tuning.pass.minDistance, maxDistance: this.sim.tuning.pass.maxDistance },
      shot: { minSpeed: this.sim.tuning.shot.minSpeed, maxSpeed: this.sim.tuning.shot.maxSpeed },
      toast: this.toastUntil > performance.now() ? this.toastMessage : '',
    };
  }

  // ---- input ---------------------------------------------------------------------------------

  private onPointerDown(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (over.length > 0 || this.navigating) return;
    if (this.sim.state.phase === 'ended' || this.keyAim) return;
    const near = this.distanceToCarrier(pointer.x, pointer.y) <= this.holdRadius();
    this.handleGestures(this.recognizer.pointerDown(pointer.id, pointer.x, pointer.y, performance.now(), near));
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    this.handleGestures(this.recognizer.pointerMove(pointer.id, pointer.x, pointer.y, performance.now()));
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    this.handleGestures(this.recognizer.pointerUp(pointer.id, pointer.x, pointer.y, performance.now()));
  }

  private readonly onDomCancel = (): void => this.cancelInput('pointer cancelled');

  private onBackground(): void {
    this.cancelInput('app in background');
  }

  private handleGestures(gestures: readonly Gesture[]): void {
    for (const g of gestures) {
      switch (g.type) {
        case 'swipe':
          this.sim.command({ type: 'swipe', direction: screenVectorToPitch(this.pitchLayout, { x: g.dx, y: g.dy }) });
          break;
        case 'aimStart':
          if (this.sim.command({ type: 'aimStart' })) this.aimSource = 'pointer';
          else this.recognizer.cancel('aim not allowed');
          break;
        case 'aimMove':
          this.sendPointerAim(g);
          break;
        case 'aimRelease':
          this.sendPointerAim(g);
          if (g.valid) this.sim.command({ type: 'aimRelease' });
          else {
            this.sim.command({ type: 'aimCancel', reason: 'short drag' });
            this.toast('Drag back further, then release to kick');
          }
          this.aimSource = null;
          break;
        case 'aimCancel':
          this.sim.command({ type: 'aimCancel', reason: g.reason });
          this.aimSource = null;
          break;
        case 'holdTooFar':
          this.toast('Hold near your player to aim');
          break;
      }
    }
  }

  private sendPointerAim(drag: AimDrag): void {
    if (this.aimSource !== 'pointer') return;
    const direction = drag.valid ? screenVectorToPitch(this.pitchLayout, { x: -drag.dragX, y: -drag.dragY }) : null;
    this.sim.command({ type: 'aimUpdate', direction, power: drag.power });
  }

  private onKeyDown(event: KeyboardEvent): void {
    const intent = KEY_BINDINGS[event.code];
    if (!intent) return;
    event.preventDefault();
    if (intent === 'up' || intent === 'down' || intent === 'left' || intent === 'right') {
      if (event.repeat) return;
      this.held[intent] = true;
      if (!this.keyAim) {
        this.sim.command({ type: 'swipe', direction: screenVectorToPitch(this.pitchLayout, SCREEN_DIRECTIONS[intent]) });
      }
      return;
    }
    if (event.repeat) return;
    switch (intent) {
      case 'aim':
        this.startKeyboardAim();
        break;
      case 'toggleAction':
        this.sim.command({ type: 'toggleAction' });
        break;
      case 'selectPass':
        this.sim.command({ type: 'setAction', action: 'pass' });
        break;
      case 'selectShoot':
        this.sim.command({ type: 'setAction', action: 'shoot' });
        break;
      case 'retry':
        this.retry();
        break;
      case 'back':
        if (this.sim.state.phase === 'aiming') this.cancelInput('cancelled');
        else this.goBack();
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    const intent = KEY_BINDINGS[event.code];
    if (intent === 'up' || intent === 'down' || intent === 'left' || intent === 'right') this.held[intent] = false;
    if (intent === 'aim' && this.keyAim) {
      this.sendKeyboardAim();
      this.keyAim = null;
      this.aimSource = null;
      this.sim.command({ type: 'aimRelease' });
    }
  }

  private startKeyboardAim(): void {
    if (this.keyAim || this.recognizer.state !== 'idle') return;
    if (!this.sim.command({ type: 'aimStart' })) return;
    const s = this.sim.state;
    const ball = s.ball.pos;
    let target: Vec2;
    let power: number;
    if (s.action === 'shoot') {
      const gk = s.players.GK.pos.y;
      target = { x: ATTACK_TUNING.area.maxX, y: ATTACK_TUNING.area.goalCenterY + (gk <= ATTACK_TUNING.area.goalCenterY ? 2.5 : -2.5) };
      power = 0.85;
    } else {
      const mate = this.bestPassTarget();
      target = mate;
      const T = this.sim.tuning.pass;
      power = Phaser.Math.Clamp((distance(mate, ball) - T.minDistance) / (T.maxDistance - T.minDistance), 0, 1);
    }
    const screenDir = pitchVectorToScreen(this.pitchLayout, sub(target, ball));
    this.keyAim = new KeyboardAim(Math.atan2(screenDir.y, screenDir.x), power);
    this.aimSource = 'keyboard';
    this.sendKeyboardAim();
  }

  private sendKeyboardAim(): void {
    if (!this.keyAim) return;
    const direction = screenVectorToPitch(this.pitchLayout, this.keyAim.direction);
    this.sim.command({ type: 'aimUpdate', direction, power: this.keyAim.power });
  }

  /** Default keyboard pass target: lead the runner, else the teammate the cover defender is not marking. */
  private bestPassTarget(): Vec2 {
    const s = this.sim.state;
    const mates = attack.ATTACKER_IDS.filter((id) => id !== s.controlledId);
    const pick = (s.runnerId && mates.includes(s.runnerId) ? s.runnerId : mates.find((id) => id !== s.coverMarkId)) ?? mates[0];
    const p = s.players[pick ?? 'A2'];
    return { x: p.pos.x + p.vel.x * 0.6, y: p.pos.y + p.vel.y * 0.6 };
  }

  /** Drops any half-finished aim or gesture (pointer cancel, backgrounding, rotation, navigation). */
  private cancelInput(reason: string): void {
    this.handleGestures(this.recognizer.cancel(reason));
    this.keyAim = null;
    this.aimSource = null;
    this.held = { left: false, right: false, up: false, down: false };
    if (this.sim.state.phase === 'aiming') this.sim.command({ type: 'aimCancel', reason });
  }

  private retry(): void {
    if (!this.sim.command({ type: 'retry' })) return;
    this.cancelInput('retry');
    this.ballTrail = [];
    this.showOutcome(false);
  }

  private goBack(): void {
    if (this.navigating) return;
    this.navigating = true;
    this.cancelInput('navigation');
    this.scene.start(SceneKeys.Start);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.cancelInput('orientation change');
    this.layout(gameSize.width, gameSize.height);
    this.renderFrame();
  }

  private handleShutdown(): void {
    this.cancelInput('navigation');
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
    this.input.keyboard?.off('keydown', this.onKeyDown, this);
    this.input.keyboard?.off('keyup', this.onKeyUp, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.onBackground, this);
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.onBackground, this);
    this.game.canvas.removeEventListener('pointercancel', this.onDomCancel);
    this.game.canvas.removeEventListener('touchcancel', this.onDomCancel);
  }

  // ---- sim events ----------------------------------------------------------------------------

  private consumeEvents(): void {
    for (const e of this.sim.state.events) {
      if (e.seq <= this.lastSeq) continue;
      this.lastSeq = e.seq;
      this.onSimEvent(e);
    }
  }

  private onSimEvent(e: SimEvent): void {
    switch (e.type) {
      case 'swipeRejected':
        this.toast(REJECT_TEXT[e.detail] ?? 'Move not allowed');
        break;
      case 'deflected':
        this.toast(e.detail === 'too fast to control' ? 'Too hot to control!' : 'Deflected!');
        break;
      case 'parried':
        this.toast('Parried by the keeper!');
        break;
      case 'slowMoSpent':
        this.toast('Slow motion used up — release!');
        break;
      case 'received':
        if (e.by) this.toast(`${e.by} has it — you control ${e.by}`);
        break;
      case 'live':
        this.toast('Go!');
        break;
      case 'ended':
        this.showOutcome(true);
        break;
      default:
        break;
    }
  }

  private toast(message: string): void {
    this.toastMessage = message;
    this.toastUntil = performance.now() + 1600;
  }

  private showOutcome(visible: boolean): void {
    const s = this.sim.state;
    this.panel.setVisible(visible);
    this.outcomeTitle.setVisible(visible);
    this.outcomeDetail.setVisible(visible);
    this.retryButton.setEnabled(visible);
    if (!visible || !s.outcome) return;
    const info = OUTCOME_TEXT[s.outcome];
    this.outcomeTitle.setText(info.title).setColor(info.color);
    this.outcomeDetail.setText(`${capitalize(s.outcomeDetail)}.\n${info.tip}`);
    this.layoutPanel();
  }

  // ---- layout + drawing -----------------------------------------------------------------------

  private layout(width: number, height: number): void {
    const portrait = orientationOf({ width, height }) === 'portrait';
    const insets: Insets = portrait
      ? { top: EDGE + HUD_HEIGHT + 64, right: EDGE, bottom: 64, left: EDGE }
      : { top: EDGE + HUD_HEIGHT + 6, right: EDGE, bottom: 30, left: EDGE };
    this.pitchLayout = fitRegion({ width, height }, VIEW, insets, 1, portrait ? 1 : SIDELINE_SQUASH);

    const compact = width < 400;
    const buttonW = compact ? 80 : 96;
    this.backButton.resize(compact ? 76 : 96, HUD_HEIGHT, 17).setPosition(EDGE + (compact ? 38 : 48), EDGE + HUD_HEIGHT / 2);
    this.shootButton.resize(buttonW, HUD_HEIGHT, 17).setPosition(width - EDGE - buttonW / 2, EDGE + HUD_HEIGHT / 2);
    this.passButton.resize(buttonW, HUD_HEIGHT, 17).setPosition(width - EDGE - buttonW * 1.5 - 6, EDGE + HUD_HEIGHT / 2);

    const backW = compact ? 76 : 96;
    const statusX = portrait ? EDGE + 4 : EDGE + backW + 14;
    const statusY = portrait ? EDGE + HUD_HEIGHT + 18 : EDGE + HUD_HEIGHT / 2;
    this.statusText.setOrigin(0, 0.5).setFontSize(compact ? 12 : 14).setPosition(statusX, statusY);
    this.rotateHint.setVisible(portrait).setPosition(width / 2, EDGE + HUD_HEIGHT + 48);
    this.rotateHint.setFontSize(compact ? 12 : 14);

    const helpWidth = width - EDGE * 2;
    const touchFirst = this.sys.game.device.input.touch;
    this.helpText
      .setText(portrait ? `${HELP_TOUCH.replace('   |   ', '\n')}${touchFirst ? '' : `\n${HELP_KEYS}`}` : touchFirst ? HELP_TOUCH : `${HELP_TOUCH}\n${HELP_KEYS}`)
      .setFontSize(compact ? 10 : 12)
      .setWordWrapWidth(helpWidth, true)
      .setPosition(width / 2, height - 6);
    this.toastText.setFontSize(compact ? 14 : 16);
    this.bannerText.setPosition(width / 2, height / 2);
    this.outcomeDetail.setWordWrapWidth(Math.min(320, width - 60), true);

    this.drawField(width, height);
    this.layoutPanel();
  }

  private layoutPanel(): void {
    const { width, height } = this.scale;
    const w = Math.min(360, width - 32);
    const detailH = this.outcomeDetail.height;
    const h = Math.max(180, 72 + detailH + 76);
    const x = (width - w) / 2;
    const y = Math.max(8, (height - h) / 2);
    this.panelRect = { x, y, width: w, height: h };
    const g = this.panel;
    g.clear();
    g.fillStyle(PALETTE.ink, 0.35);
    g.fillRect(0, 0, width, height);
    g.fillStyle(PALETTE.ink, 1);
    g.fillRoundedRect(x, y + 6, w, h, 18);
    g.fillStyle(PALETTE.cream, 1);
    g.fillRoundedRect(x, y, w, h, 18);
    g.lineStyle(4, PALETTE.ink, 1);
    g.strokeRoundedRect(x, y, w, h, 18);
    this.outcomeTitle.setPosition(width / 2, y + 36);
    this.outcomeDetail.setPosition(width / 2, y + 66);
    this.retryButton.setPosition(width / 2, y + h - 40);
  }

  private attackingGoal(): Rect {
    return this.markings.goals.find((g) => g.x >= this.markings.halfwayX) ?? this.markings.goals[1];
  }

  private drawField(width: number, height: number): void {
    const g = this.field;
    const L = this.pitchLayout;
    const m = this.markings;
    const right = <T extends Rect>(rects: readonly T[]): T | undefined => rects.find((r) => r.x >= m.halfwayX);
    g.clear();
    g.fillStyle(PALETTE.track, 1);
    g.fillRect(0, 0, width, height);
    const view = rectToScreen(L, { x: VIEW.x - 1, y: -1.5, width: VIEW.width + 2, height: VIEW.height + 3 });
    g.fillStyle(PALETTE.surround, 1);
    g.fillRoundedRect(view.x, view.y, view.width, view.height, 12);
    g.lineStyle(3, PALETTE.ink, 1);
    g.strokeRoundedRect(view.x, view.y, view.width, view.height, 12);

    const stripes = 10;
    const len = U11_9V9_PITCH.length - VIEW.x;
    for (let i = 0; i < stripes; i++) {
      const r = rectToScreen(L, { x: VIEW.x + (i * len) / stripes, y: 0, width: len / stripes, height: U11_9V9_PITCH.width });
      g.fillStyle(i % 2 === 0 ? PALETTE.grassLight : PALETTE.grassDark, 1);
      g.fillRect(r.x, r.y, r.width, r.height);
    }
    // Outside the drill (behind the training line) is shaded.
    const outside = rectToScreen(L, { x: VIEW.x, y: 0, width: TRAINING_AREA.x - VIEW.x, height: U11_9V9_PITCH.width });
    g.fillStyle(PALETTE.ink, 0.18);
    g.fillRect(outside.x, outside.y, outside.width, outside.height);

    const lw = Math.max(2, L.scale * 0.22);
    const line = (points: readonly Vec2[]): void => {
      g.strokePoints(points.map((p) => toScreen(L, p)), false);
    };
    const box = (r: Rect): void =>
      line([
        { x: r.x, y: r.y },
        { x: r.x + r.width, y: r.y },
        { x: r.x + r.width, y: r.y + r.height },
        { x: r.x, y: r.y + r.height },
        { x: r.x, y: r.y },
      ]);
    const end = U11_9V9_PITCH.length;
    const w = U11_9V9_PITCH.width;
    for (const [color, width2] of [
      [PALETTE.ink, lw + 2],
      [PALETTE.line, lw],
    ] as const) {
      g.lineStyle(width2, color, 1);
      line([{ x: VIEW.x, y: 0 }, { x: end, y: 0 }, { x: end, y: w }, { x: VIEW.x, y: w }]);
      line([{ x: m.halfwayX, y: 0 }, { x: m.halfwayX, y: w }]);
      line(arcPoints(m.centerSpot, m.centerCircleRadius, -Math.PI / 2, Math.PI / 2, 24));
      const pa = right(m.penaltyAreas);
      const ga = right(m.goalAreas);
      if (pa) box(pa);
      if (ga) box(ga);
      line(arcPoints({ x: end, y: 0 }, m.cornerArcRadius, Math.PI / 2, Math.PI, 6));
      line(arcPoints({ x: end, y: w }, m.cornerArcRadius, Math.PI, Math.PI * 1.5, 6));
    }
    // Dashed training-area line.
    g.lineStyle(Math.max(1.5, lw * 0.7), PALETTE.cream, 0.8);
    for (let y = 0; y < w; y += 3) {
      const a = toScreen(L, { x: TRAINING_AREA.x, y });
      const b = toScreen(L, { x: TRAINING_AREA.x, y: Math.min(w, y + 1.6) });
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    const mark = m.penaltyMarks.find((p) => p.x > m.halfwayX);
    g.fillStyle(PALETTE.line, 1);
    if (mark) {
      const p = toScreen(L, mark);
      g.fillCircle(p.x, p.y, Math.max(2, L.scale * 0.25));
    }
    const c = toScreen(L, m.centerSpot);
    g.fillCircle(c.x, c.y, Math.max(2, L.scale * 0.25));

    const goal = rectToScreen(L, this.attackingGoal());
    g.fillStyle(PALETTE.net, 0.4);
    g.fillRect(goal.x, goal.y, goal.width, goal.height);
    g.lineStyle(1, PALETTE.ink, 0.45);
    const step = Math.max(4, L.scale * 0.6);
    for (let x = goal.x + step; x < goal.x + goal.width; x += step) g.lineBetween(x, goal.y, x, goal.y + goal.height);
    for (let y = goal.y + step; y < goal.y + goal.height; y += step) g.lineBetween(goal.x, y, goal.x + goal.width, y);
    g.lineStyle(lw + 3, PALETTE.ink, 1);
    g.strokeRect(goal.x, goal.y, goal.width, goal.height);
    g.lineStyle(lw + 1, PALETTE.cream, 1);
    g.strokeRect(goal.x, goal.y, goal.width, goal.height);
  }

  private renderFrame(): void {
    const L = this.pitchLayout;
    const s = this.sim.state;
    const u = this.under;
    const o = this.over;
    u.clear();
    o.clear();
    const playerH = Phaser.Math.Clamp(L.scale * 2.9, 26, 84);
    const ballSize = Phaser.Math.Clamp(L.scale * 0.85, 9, 26);
    const ellipse = (center: Vec2, rx: number): { x: number; y: number; w: number; h: number } => {
      const sp = toScreen(L, center);
      const v = pitchVectorToScreen(L, { x: rx, y: rx });
      return { x: sp.x, y: sp.y, w: Math.abs(v.x) * 2, h: Math.abs(v.y) * 2 };
    };

    for (const id of PLAYER_IDS) {
      const p = s.players[id];
      const sp = toScreen(L, p.pos);
      const img = this.sprites[id];
      img.setScale(playerH / PLAYER_TEXTURE_SIZE.height).setPosition(sp.x, sp.y).setDepth(100 + sp.y);
      const e = ellipse(p.pos, 0.9);
      u.fillStyle(PALETTE.shadow, 0.3);
      u.fillEllipse(e.x, e.y, e.w, e.h);
    }

    // Controlled player: ring under the feet and a marker above the head.
    const ctrl = s.players[s.controlledId];
    const ring = ellipse(ctrl.pos, 1.5);
    u.lineStyle(5, PALETTE.ink, 1);
    u.strokeEllipse(ring.x, ring.y, ring.w, ring.h);
    u.lineStyle(3, PALETTE.mustard, 1);
    u.strokeEllipse(ring.x, ring.y, ring.w, ring.h);
    const head = toScreen(L, ctrl.pos);
    const top = head.y - playerH - 6;
    const tri = Math.max(7, playerH * 0.18);
    o.fillStyle(PALETTE.mustard, 1);
    o.lineStyle(2, PALETTE.ink, 1);
    o.fillTriangle(head.x - tri, top - tri * 1.2, head.x + tri, top - tri * 1.2, head.x, top);
    o.strokeTriangle(head.x - tri, top - tri * 1.2, head.x + tri, top - tri * 1.2, head.x, top);

    // Ball, shadow and a short trail while it travels.
    const bp = toScreen(L, s.ball.pos);
    const speed = Math.hypot(s.ball.vel.x, s.ball.vel.y);
    if (!s.ball.owner && speed > 4) {
      this.ballTrail.push({ ...s.ball.pos });
      if (this.ballTrail.length > 10) this.ballTrail.shift();
    } else if (this.ballTrail.length) this.ballTrail.shift();
    this.ballTrail.forEach((p, i) => {
      const t = toScreen(L, p);
      u.fillStyle(PALETTE.cream, (0.45 * (i + 1)) / this.ballTrail.length);
      u.fillCircle(t.x, t.y - ballSize * 0.45, ballSize * 0.32);
    });
    const be = ellipse(s.ball.pos, 0.45);
    u.fillStyle(PALETTE.shadow, 0.35);
    u.fillEllipse(be.x, be.y, be.w, be.h);
    this.ball.setScale(ballSize / BALL_TEXTURE_SIZE.width).setPosition(bp.x, bp.y - ballSize * 0.45).setDepth(100 + bp.y + 0.5);

    this.drawAimGuide(playerH);
    this.drawHud();
  }

  private drawAimGuide(playerH: number): void {
    const s = this.sim.state;
    const L = this.pitchLayout;
    const o = this.over;
    this.aimLabel.setVisible(s.phase === 'aiming');
    if (s.phase !== 'aiming') return;
    const ctrl = toScreen(L, s.players[s.controlledId].pos);
    const shooting = s.action === 'shoot';
    this.aimLabel
      .setText(shooting ? 'SHOOT' : 'PASS')
      .setColor(shooting ? CSS.tomato : CSS.cream)
      .setPosition(ctrl.x, ctrl.y - playerH - 30);

    const press = this.recognizer.pressPoint;
    const pointer = this.recognizer.pointerPoint;
    if (this.aimSource === 'pointer' && press && pointer) {
      o.lineStyle(3, PALETTE.ink, 0.55);
      o.lineBetween(press.x, press.y, pointer.x, pointer.y);
      o.fillStyle(PALETTE.ink, 0.5);
      o.fillCircle(pointer.x, pointer.y, 7);
    }
    const aim = s.aim;
    if (!aim?.direction) return;
    const from = s.ball.pos;
    const dir = normalize(aim.direction);
    const T = this.sim.tuning;
    let to: Vec2;
    if (shooting) {
      const reach = dir.x > 0.05 ? (T.area.maxX + 1 - from.x) / dir.x : 30;
      to = { x: from.x + dir.x * Math.min(reach, 45), y: from.y + dir.y * Math.min(reach, 45) };
    } else {
      const d = lerp(T.pass.minDistance, T.pass.maxDistance, aim.power);
      to = { x: from.x + dir.x * d, y: from.y + dir.y * d };
    }
    const a = toScreen(L, from);
    const b = toScreen(L, to);
    const color = shooting ? PALETTE.tomato : PALETTE.cream;
    const dashes = 18;
    for (let i = 0; i < dashes; i += 2) {
      const t0 = i / dashes;
      const t1 = (i + 1) / dashes;
      o.lineStyle(7, PALETTE.ink, 0.9);
      o.lineBetween(lerp(a.x, b.x, t0), lerp(a.y, b.y, t0), lerp(a.x, b.x, t1), lerp(a.y, b.y, t1));
      o.lineStyle(4, color, 1);
      o.lineBetween(lerp(a.x, b.x, t0), lerp(a.y, b.y, t0), lerp(a.x, b.x, t1), lerp(a.y, b.y, t1));
    }
    if (!shooting) {
      const v = pitchVectorToScreen(L, { x: 1.4, y: 1.4 });
      o.lineStyle(5, PALETTE.ink, 1);
      o.strokeEllipse(b.x, b.y, Math.abs(v.x) * 2, Math.abs(v.y) * 2);
      o.lineStyle(3, PALETTE.cream, 1);
      o.strokeEllipse(b.x, b.y, Math.abs(v.x) * 2, Math.abs(v.y) * 2);
    }
    // Power meter beside the player.
    const mw = 10;
    const mh = Math.max(36, playerH * 0.9);
    const mx = ctrl.x + playerH * 0.45;
    const my = ctrl.y - mh;
    o.fillStyle(PALETTE.ink, 1);
    o.fillRoundedRect(mx - 2, my - 2, mw + 4, mh + 4, 4);
    o.fillStyle(PALETTE.cream, 1);
    o.fillRect(mx, my, mw, mh);
    o.fillStyle(color === PALETTE.cream ? PALETTE.mustard : PALETTE.tomato, 1);
    o.fillRect(mx, my + mh * (1 - aim.power), mw, mh * aim.power);
  }

  private drawHud(): void {
    const s = this.sim.state;
    const { width, height } = this.scale;
    const g = this.hud;
    g.clear();

    const passOn = s.action === 'pass';
    this.passButton.setFill(passOn ? PALETTE.mustard : PALETTE.cream, passOn ? PALETTE.mustardDark : PALETTE.sand).setLabel(passOn ? '● PASS' : 'PASS');
    this.shootButton
      .setFill(passOn ? PALETTE.cream : PALETTE.tomato, passOn ? PALETTE.sand : PALETTE.tomatoDark)
      .setLabel(passOn ? 'SHOOT' : '● SHOOT');

    // Slow-motion frame while aiming.
    if (s.timeScale < 1) {
      g.lineStyle(10, PALETTE.cream, 0.55);
      g.strokeRect(5, 5, width - 10, height - 10);
    }

    // Status: attempt, ball control and slow-motion budget meters.
    const portrait = height > width;
    const T = this.sim.tuning;
    this.statusText.setText(`Attempt ${s.attempt}`);
    const barW = Math.min(110, width * 0.18);
    const bx = this.statusText.x + this.statusText.displayWidth + 12;
    const by = this.statusText.y - 9;
    const bar = (y: number, value: number, color: number): void => {
      g.fillStyle(PALETTE.ink, 1);
      g.fillRoundedRect(bx - 2, y - 2, barW + 4, 10, 4);
      g.fillStyle(PALETTE.sand, 1);
      g.fillRect(bx, y, barW, 6);
      g.fillStyle(color, 1);
      g.fillRect(bx, y, barW * Phaser.Math.Clamp(value, 0, 1), 6);
    };
    bar(by, s.control / T.control.max, PALETTE.mustard);
    bar(by + 12, s.slowMoBudget / T.aim.slowMoBudgetSeconds, PALETTE.cream);
    this.meterRect = { x: bx - 2, y: by - 2, width: barW + 4, height: 22 };

    const toastOn = this.toastUntil > performance.now();
    this.toastText.setVisible(toastOn && s.phase !== 'ended');
    if (toastOn) {
      this.toastText.setText(this.toastMessage);
      const pitch = rectToScreen(this.pitchLayout, TRAINING_AREA);
      this.toastText.setPosition(width / 2, Math.max(pitch.y + 18, portrait ? EDGE + HUD_HEIGHT + 76 : EDGE + HUD_HEIGHT + 22));
    }

    if (s.phase === 'reset') {
      this.bannerText.setVisible(true).setText(`Attempt ${s.attempt} — Ready…`);
    } else {
      this.bannerText.setVisible(false);
    }
  }

  private distanceToCarrier(x: number, y: number): number {
    const s = this.sim.state;
    const feet = toScreen(this.pitchLayout, s.players[s.controlledId].pos);
    const playerH = Phaser.Math.Clamp(this.pitchLayout.scale * 2.9, 26, 84);
    return Math.min(Math.hypot(x - feet.x, y - feet.y), Math.hypot(x - feet.x, y - (feet.y - playerH / 2)));
  }

  private holdRadius(): number {
    return Math.max(GESTURE_TUNING.holdRadiusPx, this.pitchLayout.scale * 4);
  }
}

function boundsOf(object: { getBounds(): Phaser.Geom.Rectangle }): Rect {
  const b = object.getBounds();
  return { x: b.x, y: b.y, width: b.width, height: b.height };
}

function capitalize(text: string): string {
  return text.length ? text[0]?.toUpperCase() + text.slice(1) : text;
}
