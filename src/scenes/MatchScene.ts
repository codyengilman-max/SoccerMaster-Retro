import Phaser from 'phaser';
import { match, pitchMarkings, U11_9V9_PITCH, type PitchMarkings, type Rect, type Vec2 } from '../game';
import { KEY_BINDINGS, KeyboardAim, TouchControls, type ControlAction, type Pull } from '../input';
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
import { shouldExposeDebug } from '../debug/diagnostics';
import { BALL_TEXTURE_SIZE, PLAYER_TEXTURE_SIZE, TEXTURES, ensurePlaceholderTextures } from '../render/textures';
import { CSS, FONT_FAMILY, PALETTE, textResolution } from '../render/theme';
import type { InspectableScene, SceneLayoutReport } from './inspectable';
import type { MatchReport } from './matchReport';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';

const { MatchSim, MATCH_PLAYER_IDS, HOME_IDS, FORMATION_IDS, DEFAULT_FORMATION } = match;
type Id = match.MatchPlayerId;
type FormationId = match.FormationId;

const EDGE = 8;
const HUD_HEIGHT = 40;
const SIDELINE_SQUASH = 0.55;
const VIEW_LENGTH = { landscape: 48, portrait: 40 } as const;
const HELP_TOUCH = 'Swipe any way to dribble · double-tap your player to feint  |  Hold your player, pull back, release to kick (back in the circle cancels)';
const HELP_KEYS = 'Arrows/WASD dribble · F feint · hold Space aim (arrows adjust) · P/Esc pause · R reset · O overlay · M menu';
/** Short interactive tutorial: each step advances when the player does it. */
const TUTORIAL = [
  'Try it 1/4: swipe the pitch in any direction — your player dribbles that way until you swipe again',
  'Try it 2/4: hold still on your player until the circle appears, then pull back — the arrow shows the kick',
  'Try it 3/4: release to kick (pass or shot, same move). Slide back inside the circle and release to cancel',
  'Try it 4/4: double-tap your player for a body feint, then swipe to choose the way out',
] as const;

export interface MatchSceneData {
  readonly formation?: FormationId;
}

/** 9v9 team-play sandbox. Reads `MatchSim` state and draws it; owns no soccer rules. */
export class MatchScene extends Phaser.Scene implements InspectableScene {
  private sim!: InstanceType<typeof MatchSim>;
  private markings!: PitchMarkings;
  private pitchLayout!: PitchLayout;
  private controls!: TouchControls;
  private lastPull: Pull | null = null;
  private lastEpoch = 0;
  private tutorialStep = 0;
  private keyAim: KeyboardAim | null = null;
  private aimSource: 'pointer' | 'keyboard' | null = null;
  private held = { left: false, right: false, up: false, down: false };
  private navigating = false;
  private overlayOn = false;
  private lastSeq = 0;
  private camX = 37.5;
  /** Visible pitch length in yards; grown until the view fills the screen along the pitch axis. */
  private viewLen = 0;
  /** Field graphics are rebuilt only when the camera/layout changes. */
  private fieldKey = '';
  private fps = 0;
  private toastMessage = '';
  private toastUntil = 0;
  private bannerMessage = '';
  private field!: Phaser.GameObjects.Graphics;
  private under!: Phaser.GameObjects.Graphics;
  private over!: Phaser.GameObjects.Graphics;
  private dev!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  private sprites!: Record<Id, Phaser.GameObjects.Image>;
  private devLabels!: Record<Id, Phaser.GameObjects.Text>;
  private ball!: Phaser.GameObjects.Image;
  private menuButton!: Button;
  private pauseButton!: Button;
  private helpButton!: Button;
  private scoreText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private bannerText!: Phaser.GameObjects.Text;
  private devText!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Graphics;
  private panelTitle!: Phaser.GameObjects.Text;
  private panelNote!: Phaser.GameObjects.Text;
  private resumeButton!: Button;
  private resetButton!: Button;
  private panelMenuButton!: Button;
  private overlayButton!: Button;
  private formationButtons!: Record<FormationId, Button>;
  private panelRect: Rect = { x: 0, y: 0, width: 0, height: 0 };

  constructor() {
    super(SceneKeys.Match);
  }

  create(data: MatchSceneData = {}): void {
    this.navigating = false;
    this.overlayOn = false;
    this.fieldKey = '';
    this.viewLen = 0;
    this.keyAim = null;
    this.aimSource = null;
    this.held = { left: false, right: false, up: false, down: false };
    this.toastMessage = '';
    this.toastUntil = 0;
    const params = new URLSearchParams(window.location.search);
    const seed = Number(params.get('seed') ?? '1') || 1;
    const fromUrl = params.get('formation') as FormationId | null;
    const formation = data.formation ?? (fromUrl && FORMATION_IDS.includes(fromUrl) ? fromUrl : DEFAULT_FORMATION);
    this.sim = new MatchSim({ seed, homeFormation: formation });
    if (shouldExposeDebug(window.location)) this.applyDebugSetup(params.get('setup'));
    this.lastSeq = 0;
    this.camX = this.sim.state.ball.pos.x;
    this.controls = new TouchControls(Math.min(this.scale.width, this.scale.height));
    this.lastPull = null;
    this.lastEpoch = this.sim.state.controlEpoch;
    this.tutorialStep = 0;
    this.markings = pitchMarkings(U11_9V9_PITCH);
    ensurePlaceholderTextures(this);

    const resolution = textResolution();
    const text = (size: number, color: string = CSS.cream, stroke = true): Phaser.GameObjects.Text =>
      this.add
        .text(0, 0, '', { fontFamily: FONT_FAMILY, fontStyle: 'bold', fontSize: `${size}px`, color, align: 'center', ...(stroke ? { stroke: CSS.ink, strokeThickness: 4 } : {}) })
        .setResolution(resolution);

    this.field = this.add.graphics().setDepth(0);
    this.under = this.add.graphics().setDepth(1);
    const kit = (id: Id): string => (id === 'H1' || id === 'A1' ? TEXTURES.keeper : id.startsWith('H') ? TEXTURES.attacker : TEXTURES.defender);
    this.sprites = Object.fromEntries(MATCH_PLAYER_IDS.map((id) => [id, this.add.image(0, 0, kit(id)).setOrigin(0.5, 0.95).setName(id)])) as Record<Id, Phaser.GameObjects.Image>;
    // Away keeper wears a tinted keeper kit so the two keepers are distinguishable.
    this.sprites.A1.setTint(0xb7d3ff);
    this.ball = this.add.image(0, 0, TEXTURES.ball).setName('ball');
    this.over = this.add.graphics().setDepth(5000);
    this.dev = this.add.graphics().setDepth(5500);
    this.devLabels = Object.fromEntries(
      MATCH_PLAYER_IDS.map((id) => [id, text(10, CSS.cream).setOrigin(0.5, 0).setDepth(5501).setVisible(false)]),
    ) as Record<Id, Phaser.GameObjects.Text>;
    this.devText = text(11, CSS.cream).setOrigin(0, 0).setDepth(5502).setVisible(false);
    this.hud = this.add.graphics().setDepth(6000);
    this.scoreText = text(15).setOrigin(0.5, 0.5).setDepth(6001);
    this.helpText = text(11, CSS.ink, false).setOrigin(0.5, 1).setDepth(6001).setAlpha(0.9);
    this.toastText = text(15).setOrigin(0.5, 0.5).setDepth(6002);
    this.bannerText = text(24).setOrigin(0.5, 0.5).setDepth(6002);

    const hudButton = (name: string, label: string, onClick: () => void, cream = false): Button =>
      new Button(this, 0, 0, {
        name,
        label,
        width: 88,
        height: HUD_HEIGHT,
        fontSize: 16,
        ...(cream ? { fill: PALETTE.cream, fillPressed: PALETTE.sand } : {}),
        onClick,
      }).setDepth(6003);
    this.menuButton = hudButton('menu-button', '‹ Menu', () => this.goToMenu(), true);
    this.pauseButton = hudButton('pause-button', 'Pause', () => this.togglePause(), true);
    this.helpButton = hudButton('help-button', '? Help', () => this.restartTutorial(), true);

    this.panel = this.add.graphics().setDepth(7000);
    this.panelTitle = text(26).setOrigin(0.5, 0.5).setDepth(7001);
    this.panelNote = text(12, CSS.ink, false).setOrigin(0.5, 0).setDepth(7001);
    const panelButton = (name: string, label: string, onClick: () => void, cream = false): Button =>
      new Button(this, 0, 0, { name, label, width: 140, height: 46, fontSize: 17, ...(cream ? { fill: PALETTE.cream, fillPressed: PALETTE.sand } : {}), onClick }).setDepth(7002);
    this.resumeButton = panelButton('resume-button', 'Resume ▶', () => this.togglePause());
    this.resetButton = panelButton('reset-button', 'Reset', () => this.reset(), true);
    this.panelMenuButton = panelButton('panel-menu-button', 'Menu', () => this.goToMenu(), true);
    this.overlayButton = panelButton('overlay-button', 'Dev overlay: off', () => this.toggleOverlay(), true);
    this.formationButtons = Object.fromEntries(
      FORMATION_IDS.map((id) => [id, panelButton(`formation-${id}`, id, () => this.changeFormation(id), true)]),
    ) as Record<FormationId, Button>;

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
    this.input.keyboard?.on('keydown', this.onKeyDown, this);
    this.input.keyboard?.on('keyup', this.onKeyUp, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.game.canvas.addEventListener('pointercancel', this.onDomCancel);
    this.game.canvas.addEventListener('touchcancel', this.onDomCancel);
    this.game.canvas.addEventListener('lostpointercapture', this.onDomCancel);
    window.addEventListener('blur', this.onWindowBlur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.layout(this.scale.width, this.scale.height);
    this.consumeEvents();
    this.renderFrame(0);
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    if (dt > 0) this.fps = this.fps ? this.fps * 0.95 + (1 / dt) * 0.05 : 1 / dt;
    this.handleControls(this.controls.update(performance.now()));
    if (this.sim.state.controlEpoch !== this.lastEpoch) {
      // Possession loss or control transfer: nothing half-done may act for the next carrier.
      this.lastEpoch = this.sim.state.controlEpoch;
      this.handleControls(this.controls.cancel('control changed'));
      this.keyAim = null;
      this.aimSource = null;
    }
    if (this.keyAim) {
      this.keyAim.update(dt, this.held);
      this.sendKeyboardAim();
    }
    this.sim.step(dt);
    this.consumeEvents();
    this.renderFrame(dt);
  }

  describeLayout(): SceneLayoutReport {
    const { width, height } = this.scale;
    const elements: Record<string, Rect> = {
      pitch: this.viewRect(),
      'menu-button': this.menuButton.getButtonBounds(),
      'pause-button': this.pauseButton.getButtonBounds(),
      'help-button': this.helpButton.getButtonBounds(),
      score: boundsOf(this.scoreText),
      help: boundsOf(this.helpText),
    };
    if (this.sim.state.paused) {
      elements['pause-panel'] = this.panelRect;
      elements['resume-button'] = this.resumeButton.getButtonBounds();
      elements['reset-button'] = this.resetButton.getButtonBounds();
      elements['panel-menu-button'] = this.panelMenuButton.getButtonBounds();
      elements['overlay-button'] = this.overlayButton.getButtonBounds();
      for (const id of FORMATION_IDS) elements[`formation-${id}`] = this.formationButtons[id].getButtonBounds();
    }
    return { orientation: this.pitchLayout.orientation, viewport: { width, height }, elements };
  }

  describeGameplay(): MatchReport {
    const s = this.sim.state;
    const L = this.pitchLayout;
    const players = Object.fromEntries(
      MATCH_PLAYER_IDS.map((id) => {
        const p = s.players[id];
        const sp = toScreen(L, p.pos);
        return [
          id,
          { team: p.team, role: p.role, intent: p.intent, keeper: p.isKeeper, x: p.pos.x, y: p.pos.y, vx: p.vel.x, vy: p.vel.y, tx: p.target.x, ty: p.target.y, sx: sp.x, sy: sp.y },
        ];
      }),
    ) as MatchReport['players'];
    const bs = toScreen(L, s.ball.pos);
    return {
      phase: s.phase,
      paused: s.paused,
      simTime: s.simTime,
      timeScale: s.timeScale,
      formations: { ...s.formations },
      possession: s.possession,
      controlledId: s.controlledId,
      owner: s.ball.owner,
      userHasBall: this.sim.userHasBall(),
      dribbleDir: { x: s.dribbleDir.x, y: s.dribbleDir.y },
      feint: s.feint ? { by: s.feint.by, start: s.feint.start, until: s.feint.until, exit: s.feint.exitDir !== null } : null,
      feintReadyAt: s.feintReadyAt,
      aimAllowance: { ...s.aimAllowance },
      aim: s.aim?.direction ? { dx: s.aim.direction.x, dy: s.aim.direction.y, power: s.aim.power } : null,
      score: { ...s.score },
      stoppage: s.stoppage ? { reason: s.stoppage.reason, scorer: s.stoppage.scorer, restartTeam: s.stoppage.restartTeam } : null,
      defense: {
        home: { presserId: s.defense.home.presserId, coverId: s.defense.home.coverId },
        away: { presserId: s.defense.away.presserId, coverId: s.defense.away.coverId },
      },
      stats: structuredClone(s.stats),
      events: s.events.map((e) => ({ seq: e.seq, type: e.type, by: e.by, detail: e.detail, at: e.at })),
      players,
      ball: { x: s.ball.pos.x, y: s.ball.pos.y, vx: s.ball.vel.x, vy: s.ball.vel.y, sx: bs.x, sy: bs.y },
      layout: { ...L },
      input: this.controls.state,
      gestureOrigin: this.controls.origin,
      thresholds: { ...this.controls.thresholds },
      tutorialStep: this.tutorialStep,
      aimSource: this.aimSource,
      holdRadiusPx: this.holdRadius(),
      pass: { minDistance: this.sim.tuning.pass.minDistance, maxDistance: this.sim.tuning.pass.maxDistance },
      overlay: this.overlayOn,
      banner: this.bannerText.visible ? this.bannerMessage : '',
      toast: this.toastUntil > performance.now() ? this.toastMessage : '',
      fps: Math.round(this.fps),
    };
  }

  /** Debug-only staged scenarios for browser tests (`?debug&setup=...`). Clearly not normal play. */
  private applyDebugSetup(setup: string | null): void {
    if (setup !== 'pass' && setup !== 'final-third') return;
    const carrierX = setup === 'pass' ? 30 : 52;
    this.sim.arrange((s) => {
      const c = s.players.H8;
      c.pos = { x: carrierX, y: 25 };
      s.ball.owner = 'H8';
      s.ball.pos = { x: carrierX + 0.6, y: 25 };
      for (const id of match.AWAY_IDS) if (id !== 'A1') s.players[id].pos = { x: Math.max(s.players[id].pos.x, carrierX + 16), y: s.players[id].pos.y };
    });
  }

  // ---- input ---------------------------------------------------------------------------------

  private onPointerDown(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    // UI presses never reach gameplay.
    if (over.length > 0 || this.navigating || this.sim.state.paused || this.keyAim) return;
    const s = this.sim.state;
    const near = this.sim.userHasBall() && this.distanceToCarrier(pointer.x, pointer.y) <= this.holdRadius();
    this.handleControls(this.controls.pointerDown(pointer.id, pointer.x, pointer.y, performance.now(), near ? `${s.controlledId}#${s.controlEpoch}` : null));
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    this.handleControls(this.controls.pointerMove(pointer.id, pointer.x, pointer.y, performance.now()));
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    this.handleControls(this.controls.pointerUp(pointer.id, pointer.x, pointer.y, performance.now()));
  }

  private readonly onWindowBlur = (): void => this.cancelInput('window blur');

  private readonly onDomCancel = (): void => this.cancelInput('pointer cancelled');

  private onBlur(): void {
    this.cancelInput('app in background');
  }

  private onHidden(): void {
    this.cancelInput('app in background');
    if (!this.sim.state.paused) this.togglePause();
  }

  private handleControls(actions: readonly ControlAction[]): void {
    for (const a of actions) {
      switch (a.type) {
        case 'dribble':
          if (this.sim.command({ type: 'dribble', direction: screenVectorToPitch(this.pitchLayout, { x: a.dx, y: a.dy }) })) this.advanceTutorial(0);
          break;
        case 'aimStart':
          if (this.sim.command({ type: 'aimStart' })) this.aimSource = 'pointer';
          else this.controls.cancel('aim not allowed');
          this.lastPull = null;
          break;
        case 'aimMove':
          this.lastPull = a;
          this.sendPointerAim(a);
          break;
        case 'kick':
          this.sendPointerAim(a);
          this.sim.command({ type: 'aimRelease' });
          this.aimSource = null;
          this.lastPull = null;
          break;
        case 'aimCancel':
          if (this.sim.command({ type: 'aimCancel', reason: a.reason }) && a.reason === 'released in cancel circle') {
            this.toast('Kick cancelled');
            this.advanceTutorial(2);
          }
          this.aimSource = null;
          this.lastPull = null;
          break;
        case 'feint':
          if (this.sim.command({ type: 'feint' })) this.advanceTutorial(3);
          break;
      }
    }
  }

  private sendPointerAim(pull: Pull): void {
    if (this.aimSource !== 'pointer') return;
    const direction = pull.inCancel ? null : screenVectorToPitch(this.pitchLayout, { x: pull.dirX, y: pull.dirY });
    this.sim.command({ type: 'aimUpdate', direction, power: pull.power });
  }

  private advanceTutorial(step: number): void {
    if (this.tutorialStep === step) {
      this.tutorialStep += 1;
      this.layout(this.scale.width, this.scale.height);
    }
  }

  private restartTutorial(): void {
    this.tutorialStep = 0;
    this.layout(this.scale.width, this.scale.height);
  }

  private onKeyDown(event: KeyboardEvent): void {
    const s = this.sim.state;
    if (event.code === 'KeyP' || event.code === 'KeyO' || event.code === 'KeyM' || event.code === 'KeyF' || (s.paused && event.code === 'Digit3')) {
      event.preventDefault();
      if (event.repeat) return;
      if (event.code === 'KeyF') {
        if (!s.paused && !this.keyAim && this.sim.command({ type: 'feint' })) this.advanceTutorial(3);
      } else if (event.code === 'KeyP') this.togglePause();
      else if (event.code === 'KeyO') this.toggleOverlay();
      else if (event.code === 'KeyM') this.goToMenu();
      else this.changeFormation(FORMATION_IDS[2] ?? DEFAULT_FORMATION);
      return;
    }
    const intent = KEY_BINDINGS[event.code];
    if (!intent) return;
    event.preventDefault();
    if (intent === 'up' || intent === 'down' || intent === 'left' || intent === 'right') {
      if (event.repeat) return;
      this.held[intent] = true;
      if (!this.keyAim && !s.paused) this.keyboardDribble();
      return;
    }
    if (event.repeat) return;
    switch (intent) {
      case 'aim':
        this.startKeyboardAim();
        break;
      case 'toggleAction':
        // No pass/shoot selector in the sandbox: one kick does both.
        break;
      case 'selectPass':
        if (s.paused) this.changeFormation(FORMATION_IDS[0] ?? DEFAULT_FORMATION);
        break;
      case 'selectShoot':
        if (s.paused) this.changeFormation(FORMATION_IDS[1] ?? DEFAULT_FORMATION);
        break;
      case 'retry':
        this.reset();
        break;
      case 'back':
        if (s.phase === 'aiming') this.cancelInput('cancelled');
        else this.togglePause();
        break;
    }
  }

  /** Held arrows combine into one of eight screen directions (diagonals included). */
  private keyboardDribble(): void {
    const h = this.held;
    const x = (h.right ? 1 : 0) - (h.left ? 1 : 0);
    const y = (h.down ? 1 : 0) - (h.up ? 1 : 0);
    if (x === 0 && y === 0) return;
    if (this.sim.command({ type: 'dribble', direction: screenVectorToPitch(this.pitchLayout, { x, y }) })) this.advanceTutorial(0);
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
    if (this.keyAim || this.controls.state !== 'idle') return;
    if (!this.sim.command({ type: 'aimStart' })) return;
    const s = this.sim.state;
    const ball = s.ball.pos;
    const P = this.sim.tuning.pitch;
    let target: Vec2;
    let power: number;
    // Same kick as touch: the default aim is the goal when in range, else the best pass; arrows adjust both.
    const T = this.sim.tuning;
    if (P.length - ball.x <= T.ai.shootRange) {
      target = { x: P.length, y: P.goalCenterY + (s.players.A1.pos.y <= P.goalCenterY ? 2.5 : -2.5) };
      power = 0.9;
    } else {
      target = this.bestPassTarget();
      const d = Math.hypot(target.x - ball.x, target.y - ball.y);
      power = match.powerForSpeed(Math.sqrt(T.pass.arriveSpeed ** 2 + 2 * T.ball.friction * d), T);
    }
    const screenDir = pitchVectorToScreen(this.pitchLayout, { x: target.x - ball.x, y: target.y - ball.y });
    this.keyAim = new KeyboardAim(Math.atan2(screenDir.y, screenDir.x), power);
    this.aimSource = 'keyboard';
    this.sendKeyboardAim();
  }

  private sendKeyboardAim(): void {
    if (!this.keyAim) return;
    this.sim.command({ type: 'aimUpdate', direction: screenVectorToPitch(this.pitchLayout, this.keyAim.direction), power: this.keyAim.power });
  }

  /** Default keyboard pass target: the most forward teammate in range, led by his run (arrow keys adjust). */
  private bestPassTarget(): Vec2 {
    const s = this.sim.state;
    const ball = s.ball.pos;
    let best: Vec2 = { x: ball.x + 10, y: ball.y };
    let bestScore = -Infinity;
    for (const id of HOME_IDS) {
      const p = s.players[id];
      if (p.isKeeper || id === s.controlledId) continue;
      const lead = { x: p.pos.x + p.vel.x * 0.5, y: p.pos.y + p.vel.y * 0.5 };
      const d = Math.hypot(lead.x - ball.x, lead.y - ball.y);
      if (d < 6 || d > 24) continue;
      const score = lead.x - ball.x - d * 0.2;
      if (score > bestScore) {
        bestScore = score;
        best = lead;
      }
    }
    return best;
  }

  private cancelInput(reason: string): void {
    this.handleControls(this.controls.cancel(reason));
    this.lastPull = null;
    this.keyAim = null;
    this.aimSource = null;
    this.held = { left: false, right: false, up: false, down: false };
    if (this.sim.state.phase === 'aiming') this.sim.command({ type: 'aimCancel', reason });
  }

  private togglePause(): void {
    if (this.navigating) return;
    if (this.sim.state.paused) {
      this.sim.command({ type: 'resume' });
    } else {
      this.cancelInput('paused');
      this.sim.command({ type: 'pause' });
    }
    this.showPanel(this.sim.state.paused);
  }

  private changeFormation(id: FormationId): void {
    if (!this.sim.state.paused) return;
    if (this.sim.command({ type: 'setFormation', team: 'home', formation: id })) this.toast(`Formation ${id}: players walk to their new roles on resume`);
    this.showPanel(true);
  }

  private reset(): void {
    this.cancelInput('reset');
    this.sim.command({ type: 'reset' });
    this.lastSeq = 0;
    this.showPanel(false);
    this.toast('Sandbox reset');
  }

  private toggleOverlay(): void {
    this.overlayOn = !this.overlayOn;
    this.overlayButton.setLabel(`Dev overlay: ${this.overlayOn ? 'on' : 'off'}`);
  }

  private goToMenu(): void {
    if (this.navigating) return;
    this.navigating = true;
    this.cancelInput('navigation');
    this.scene.start(SceneKeys.Start);
  }

  private handleResize(size: Phaser.Structs.Size): void {
    this.cancelInput('orientation change');
    this.handleControls(this.controls.resize(Math.min(size.width, size.height)));
    this.layout(size.width, size.height);
    this.renderFrame(0);
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
    this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.game.canvas.removeEventListener('pointercancel', this.onDomCancel);
    this.game.canvas.removeEventListener('touchcancel', this.onDomCancel);
    this.game.canvas.removeEventListener('lostpointercapture', this.onDomCancel);
    window.removeEventListener('blur', this.onWindowBlur);
  }

  // ---- sim events ----------------------------------------------------------------------------

  private consumeEvents(): void {
    for (const e of this.sim.state.events) {
      if (e.seq <= this.lastSeq) continue;
      this.lastSeq = e.seq;
      switch (e.type) {
        case 'rejected':
          if (e.detail === 'feint: cooldown') this.toast('Feint not ready yet');
          else if (e.detail.endsWith('no ball')) this.toast('You need the ball for that');
          break;
        case 'feint':
          this.toast(e.detail.startsWith('bit') ? 'Feint — he bit!' : 'Feint!');
          break;
        case 'pass':
        case 'shot':
          if (e.by?.startsWith('H')) this.advanceTutorial(2);
          break;
        case 'aimStart':
          this.advanceTutorial(1);
          break;
        case 'tackle':
          this.toast(e.by?.startsWith('A') ? 'Tackled — win it back!' : `${e.by} won the ball`);
          break;
        case 'intercepted':
          this.toast(e.by?.startsWith('A') ? 'Intercepted!' : `${e.by} intercepted`);
          break;
        case 'parried':
          this.toast('Parried!');
          break;
        case 'saved':
          this.toast(`Saved by ${e.by}`);
          break;
        case 'slowMoSpent':
          this.toast('Slow motion used up — normal speed');
          break;
        case 'control':
          if (e.by) this.toast(`You control ${e.by}`);
          break;
        case 'formation':
          break;
        default:
          break;
      }
    }
  }

  private toast(message: string): void {
    this.toastMessage = message;
    this.toastUntil = performance.now() + 1500;
  }

  // ---- layout + drawing -----------------------------------------------------------------------

  private insets(width: number, height: number): Insets {
    const portrait = orientationOf({ width, height }) === 'portrait';
    return portrait
      ? { top: EDGE + HUD_HEIGHT * 2 + 16, right: EDGE, bottom: 48, left: EDGE }
      : { top: EDGE + HUD_HEIGHT + 6, right: EDGE, bottom: 26, left: EDGE };
  }

  private viewLength(): number {
    return this.viewLen || VIEW_LENGTH[orientationOf({ width: this.scale.width, height: this.scale.height })];
  }

  private computeLayout(): void {
    const { width, height } = this.scale;
    const portrait = orientationOf({ width, height }) === 'portrait';
    const insets = this.insets(width, height);
    const available = portrait ? height - insets.top - insets.bottom : width - insets.left - insets.right;
    // Landscape always shows the whole pitch (both goals); portrait grows the view to fill the screen.
    let len: number = portrait ? VIEW_LENGTH.portrait : U11_9V9_PITCH.length + 6;
    for (let pass = 0; pass < 3; pass++) {
      this.viewLen = len;
      const lo = len / 2 - 3;
      const hi = U11_9V9_PITCH.length + 3 - len / 2;
      const cx = lo >= hi ? U11_9V9_PITCH.length / 2 : Phaser.Math.Clamp(this.camX, lo, hi);
      this.pitchLayout = fitRegion({ width, height }, { x: cx - len / 2, y: 0, width: len, height: U11_9V9_PITCH.width }, insets, 2, portrait ? 1 : SIDELINE_SQUASH);
      const r = this.viewRect(cx);
      const shown = portrait ? r.height : r.width;
      const next = Phaser.Math.Clamp(len * (available / Math.max(1, shown)), 24, U11_9V9_PITCH.length + 6);
      if (!portrait || Math.abs(next - len) < 0.05) break;
      len = next;
    }
  }

  private viewRect(cx = this.viewCenter()): Rect {
    const len = this.viewLength();
    return rectToScreen(this.pitchLayout, { x: cx - len / 2, y: 0, width: len, height: U11_9V9_PITCH.width });
  }

  private viewCenter(): number {
    const len = this.viewLength();
    const lo = len / 2 - 3;
    const hi = U11_9V9_PITCH.length + 3 - len / 2;
    return lo >= hi ? U11_9V9_PITCH.length / 2 : Phaser.Math.Clamp(this.camX, lo, hi);
  }

  private layout(width: number, height: number): void {
    const portrait = orientationOf({ width, height }) === 'portrait';
    const compact = width < 600;
    const bw = compact ? 74 : 88;
    const font = compact ? 14 : 16;
    const y1 = EDGE + HUD_HEIGHT / 2;
    this.menuButton.resize(bw, HUD_HEIGHT, font).setPosition(EDGE + bw / 2, y1);
    this.pauseButton.resize(bw, HUD_HEIGHT, font).setPosition(EDGE + bw * 1.5 + 6, y1);
    this.helpButton.resize(bw, HUD_HEIGHT, font).setPosition(width - EDGE - bw / 2, portrait ? y1 + HUD_HEIGHT + 8 : y1);
    this.scoreText.setFontSize(compact ? 13 : 15).setPosition(portrait ? width - EDGE - (width - EDGE * 2 - bw * 2 - 6) / 2 + 0 : width / 2, y1);
    if (portrait) this.scoreText.setOrigin(1, 0.5).setPosition(width - EDGE, y1);
    else this.scoreText.setOrigin(0.5, 0.5);
    const touchFirst = this.sys.game.device.input.touch;
    const base = portrait ? HELP_TOUCH.replace('  |  ', '\n') : touchFirst ? HELP_TOUCH : `${HELP_TOUCH}\n${HELP_KEYS}`;
    const help = TUTORIAL[this.tutorialStep] ?? base;
    this.helpText.setText(help).setFontSize(compact ? 10 : 11).setWordWrapWidth(width - EDGE * 2, true).setPosition(width / 2, height - 4);
    this.bannerText.setFontSize(compact ? 18 : 24).setWordWrapWidth(width - 40, true);
    this.panelNote.setWordWrapWidth(Math.min(380, width - 60), true);
    this.computeLayout();
    this.showPanel(this.sim.state.paused);
  }

  private showPanel(visible: boolean): void {
    const items = [this.resumeButton, this.resetButton, this.panelMenuButton, this.overlayButton, ...FORMATION_IDS.map((id) => this.formationButtons[id])];
    this.panel.setVisible(visible);
    this.panelTitle.setVisible(visible);
    this.panelNote.setVisible(visible);
    for (const b of items) b.setEnabled(visible);
    this.pauseButton.setLabel(visible ? 'Resume' : 'Pause');
    if (!visible) return;
    const { width, height } = this.scale;
    const portrait = height > width;
    const w = Math.min(portrait ? width - 24 : 520, width - 24);
    const bw = Math.floor((w - 40) / 3);
    const bh = height < 360 ? 38 : 44;
    const font = bw < 110 ? 14 : 17;
    const cur = this.sim.state.formations.home;
    this.panelTitle.setText('Paused — Sandbox').setFontSize(height < 360 ? 20 : 26);
    this.panelNote.setText(`Home formation: ${cur}. Changes keep every player where he is; they move to new roles when you resume. Opponent: ${this.sim.state.formations.away}.`).setFontSize(height < 360 ? 11 : 12);
    const titleH = height < 360 ? 30 : 40;
    const noteH = this.panelNote.height;
    const h = titleH + noteH + 3 * (bh + 10) + 26;
    const x = (width - w) / 2;
    const y = Math.max(EDGE, (height - h) / 2);
    this.panelRect = { x, y, width: w, height: h };
    const g = this.panel;
    g.clear();
    g.fillStyle(PALETTE.ink, 0.35);
    g.fillRect(0, 0, width, height);
    g.fillStyle(PALETTE.ink, 1);
    g.fillRoundedRect(x, y + 5, w, h, 16);
    g.fillStyle(PALETTE.cream, 1);
    g.fillRoundedRect(x, y, w, h, 16);
    g.lineStyle(4, PALETTE.ink, 1);
    g.strokeRoundedRect(x, y, w, h, 16);
    this.panelTitle.setPosition(width / 2, y + titleH / 2 + 6);
    this.panelNote.setPosition(width / 2, y + titleH + 4);
    const col = (i: number): number => x + 20 + bw / 2 + i * (bw + 0);
    const row = (r: number): number => y + titleH + noteH + 14 + bh / 2 + r * (bh + 10);
    [this.resumeButton, this.resetButton, this.panelMenuButton].forEach((b, i) => b.resize(bw - 8, bh, font).setPosition(col(i), row(0)));
    FORMATION_IDS.forEach((id, i) => {
      const on = id === cur;
      this.formationButtons[id]
        .resize(bw - 8, bh, font)
        .setPosition(col(i), row(1))
        .setLabel(on ? `● ${id}` : id)
        .setFill(on ? PALETTE.mustard : PALETTE.cream, on ? PALETTE.mustardDark : PALETTE.sand);
    });
    this.overlayButton.resize(Math.min(w - 40, 260), bh, font).setPosition(width / 2, row(2));
  }

  private drawField(): void {
    const { width, height } = this.scale;
    const g = this.field;
    const L = this.pitchLayout;
    const m = this.markings;
    const P = U11_9V9_PITCH;
    const key = `${width}x${height}:${L.orientation}:${L.originX.toFixed(2)},${L.originY.toFixed(2)},${L.scale.toFixed(4)},${L.crossScale.toFixed(4)},${L.pitchLength.toFixed(3)},${L.pitchWidth.toFixed(3)}`;
    if (key === this.fieldKey) return;
    this.fieldKey = key;
    g.clear();
    g.fillStyle(PALETTE.track, 1);
    g.fillRect(0, 0, width, height);
    const surround = rectToScreen(L, { x: -3, y: -2, width: P.length + 6, height: P.width + 4 });
    g.fillStyle(PALETTE.surround, 1);
    g.fillRect(surround.x, surround.y, surround.width, surround.height);
    const stripes = 15;
    for (let i = 0; i < stripes; i++) {
      const r = rectToScreen(L, { x: (i * P.length) / stripes, y: 0, width: P.length / stripes, height: P.width });
      g.fillStyle(i % 2 === 0 ? PALETTE.grassLight : PALETTE.grassDark, 1);
      g.fillRect(r.x, r.y, r.width, r.height);
    }
    const lw = Math.max(2, L.scale * 0.2);
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
    for (const [color, w2] of [
      [PALETTE.ink, lw + 2],
      [PALETTE.line, lw],
    ] as const) {
      g.lineStyle(w2, color, 1);
      box({ x: 0, y: 0, width: P.length, height: P.width });
      line([{ x: m.halfwayX, y: 0 }, { x: m.halfwayX, y: P.width }]);
      line(arcPoints(m.centerSpot, m.centerCircleRadius, 0, Math.PI * 2, 32));
      for (const r of m.penaltyAreas) box(r);
      for (const r of m.goalAreas) box(r);
    }
    g.fillStyle(PALETTE.line, 1);
    for (const p of [...m.penaltyMarks, m.centerSpot]) {
      const sp = toScreen(L, p);
      g.fillCircle(sp.x, sp.y, Math.max(2, L.scale * 0.22));
    }
    for (const goal of m.goals) {
      const r = rectToScreen(L, goal);
      g.fillStyle(PALETTE.net, 0.45);
      g.fillRect(r.x, r.y, r.width, r.height);
      g.lineStyle(lw + 3, PALETTE.ink, 1);
      g.strokeRect(r.x, r.y, r.width, r.height);
      g.lineStyle(lw + 1, PALETTE.cream, 1);
      g.strokeRect(r.x, r.y, r.width, r.height);
    }
  }

  private renderFrame(dt: number): void {
    const s = this.sim.state;
    // Camera: follows the ball with a little look-ahead toward the attacking direction, eased.
    const len = this.viewLength();
    const ahead = s.possession === 'home' ? 5 : -5;
    const goalX = len / 2 - 3 >= U11_9V9_PITCH.length - len / 2 + 3 ? U11_9V9_PITCH.length / 2 : Phaser.Math.Clamp(s.ball.pos.x + ahead, len / 2 - 3, U11_9V9_PITCH.length - len / 2 + 3);
    this.camX = dt > 0 ? this.camX + (goalX - this.camX) * Math.min(1, dt * 2.5) : goalX;
    this.computeLayout();
    this.drawField();

    const L = this.pitchLayout;
    const u = this.under;
    const o = this.over;
    u.clear();
    o.clear();
    const playerH = Phaser.Math.Clamp(L.scale * 2.7, 24, 80);
    const ballSize = Phaser.Math.Clamp(L.scale * 0.85, 9, 24);
    const ellipse = (center: Vec2, r: number): { x: number; y: number; w: number; h: number } => {
      const sp = toScreen(L, center);
      const v = pitchVectorToScreen(L, { x: r, y: r });
      return { x: sp.x, y: sp.y, w: Math.abs(v.x) * 2, h: Math.abs(v.y) * 2 };
    };
    for (const id of MATCH_PLAYER_IDS) {
      const p = s.players[id];
      const sp = toScreen(L, p.pos);
      const img = this.sprites[id];
      const f = s.feint;
      let sway = 0;
      if (f && f.by === id && s.simTime < f.until) {
        const t = (s.simTime - f.start) / (f.until - f.start);
        sway = Math.sin(t * Math.PI) * f.side * playerH * 0.22;
      }
      img.setScale(playerH / PLAYER_TEXTURE_SIZE.height).setPosition(sp.x + sway, sp.y).setDepth(100 + sp.y).setAngle(sway * 0.6);
      img.setFlipX(p.team === 'away' && L.orientation === 'landscape');
      const e = ellipse(p.pos, 0.85);
      u.fillStyle(PALETTE.shadow, 0.3);
      u.fillEllipse(e.x, e.y, e.w, e.h);
    }
    // The user's player: ring (bright while he has the ball) and a marker over the head.
    const ctrl = s.players[s.controlledId];
    const ring = ellipse(ctrl.pos, 1.4);
    const hasBall = this.sim.userHasBall();
    u.lineStyle(5, PALETTE.ink, hasBall ? 1 : 0.5);
    u.strokeEllipse(ring.x, ring.y, ring.w, ring.h);
    u.lineStyle(3, PALETTE.mustard, hasBall ? 1 : 0.5);
    u.strokeEllipse(ring.x, ring.y, ring.w, ring.h);
    const head = toScreen(L, ctrl.pos);
    const top = head.y - playerH - 5;
    const tri = Math.max(6, playerH * 0.16);
    o.fillStyle(PALETTE.mustard, hasBall ? 1 : 0.5);
    o.lineStyle(2, PALETTE.ink, 1);
    o.fillTriangle(head.x - tri, top - tri * 1.2, head.x + tri, top - tri * 1.2, head.x, top);
    o.strokeTriangle(head.x - tri, top - tri * 1.2, head.x + tri, top - tri * 1.2, head.x, top);

    const bp = toScreen(L, s.ball.pos);
    const be = ellipse(s.ball.pos, 0.45);
    u.fillStyle(PALETTE.shadow, 0.35);
    u.fillEllipse(be.x, be.y, be.w, be.h);
    this.ball.setScale(ballSize / BALL_TEXTURE_SIZE.width).setPosition(bp.x, bp.y - ballSize * 0.45).setDepth(100 + bp.y + 0.5);

    this.drawAimGuide(playerH);
    this.drawDevOverlay(playerH);
    this.drawHud();
  }

  /** Direction arrow from the live ball, cancellation circle at the fixed gesture origin, compact power meter. */
  private drawAimGuide(playerH: number): void {
    const s = this.sim.state;
    const L = this.pitchLayout;
    const o = this.over;
    if (s.phase !== 'aiming') return;
    const origin = this.controls.origin;
    const inCancel = this.aimSource === 'pointer' && (this.lastPull?.inCancel ?? true);
    if (origin && this.aimSource === 'pointer') {
      const r = this.controls.thresholds.cancelRadius;
      o.fillStyle(inCancel ? PALETTE.tomato : PALETTE.ink, inCancel ? 0.35 : 0.18);
      o.fillCircle(origin.x, origin.y, r);
      o.lineStyle(3, inCancel ? PALETTE.tomato : PALETTE.cream, 1);
      o.strokeCircle(origin.x, origin.y, r);
      o.lineStyle(2, PALETTE.ink, 1);
      o.lineBetween(origin.x - r * 0.4, origin.y - r * 0.4, origin.x + r * 0.4, origin.y + r * 0.4);
      o.lineBetween(origin.x - r * 0.4, origin.y + r * 0.4, origin.x + r * 0.4, origin.y - r * 0.4);
      const ptr = this.controls.pointer;
      if (ptr) {
        o.lineStyle(2, PALETTE.cream, 0.7);
        o.lineBetween(origin.x, origin.y, ptr.x, ptr.y);
      }
    }
    const ctrl = toScreen(L, s.players[s.controlledId].pos);
    const mh = Math.max(32, playerH * 0.9);
    const mx = ctrl.x + playerH * 0.45;
    const my = ctrl.y - mh;
    const power = s.aim?.direction ? s.aim.power : 0;
    const slow = s.aimAllowance.home > 0;
    o.fillStyle(PALETTE.ink, 1);
    o.fillRoundedRect(mx - 2, my - 2, 14, mh + 4, 4);
    o.fillStyle(PALETTE.cream, 1);
    o.fillRect(mx, my, 10, mh);
    o.fillStyle(power > 0.85 ? PALETTE.tomato : PALETTE.mustard, 1);
    o.fillRect(mx, my + mh * (1 - power), 10, mh * power);
    // Slow-motion allowance strip beside the meter (empty = aiming at normal speed).
    const frac = Math.min(1, s.aimAllowance.home / this.sim.tuning.aimAllowance.seconds);
    o.fillStyle(PALETTE.ink, 1);
    o.fillRect(mx + 13, my - 2, 6, mh + 4);
    o.fillStyle(slow ? PALETTE.blue : PALETTE.tomato, 1);
    o.fillRect(mx + 14, my + mh * (1 - frac), 4, Math.max(slow ? 0 : 2, mh * frac));
    if (!s.aim?.direction) return;
    const from = s.ball.pos;
    const dir = s.aim.direction;
    const T = this.sim.tuning;
    const speed = match.kickSpeed(s.aim.power, T);
    const d = Phaser.Math.Clamp((speed * speed - T.pass.arriveSpeed ** 2) / (2 * T.ball.friction), 3, 40);
    const a = toScreen(L, from);
    const b = toScreen(L, { x: from.x + dir.x * d, y: from.y + dir.y * d });
    const dashes = 18;
    for (let k = 0; k < dashes; k += 2) {
      const t0 = k / dashes;
      const t1 = (k + 1) / dashes;
      o.lineStyle(7, PALETTE.ink, 0.9);
      o.lineBetween(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
      o.lineStyle(4, PALETTE.cream, 1);
      o.lineBetween(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
    }
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const head = Math.max(9, playerH * 0.28);
    const p1 = { x: b.x - Math.cos(ang - 0.5) * head, y: b.y - Math.sin(ang - 0.5) * head };
    const p2 = { x: b.x - Math.cos(ang + 0.5) * head, y: b.y - Math.sin(ang + 0.5) * head };
    o.fillStyle(PALETTE.cream, 1);
    o.lineStyle(2, PALETTE.ink, 1);
    o.fillTriangle(b.x, b.y, p1.x, p1.y, p2.x, p2.y);
    o.strokeTriangle(b.x, b.y, p1.x, p1.y, p2.x, p2.y);
  }

  /** Hidden by default: IDs, roles, intents, movement targets, formation anchors, presser/cover, owner. */
  private drawDevOverlay(playerH: number): void {
    const g = this.dev;
    g.clear();
    for (const id of MATCH_PLAYER_IDS) this.devLabels[id].setVisible(this.overlayOn);
    this.devText.setVisible(this.overlayOn);
    if (!this.overlayOn) return;
    const s = this.sim.state;
    const L = this.pitchLayout;
    for (const id of MATCH_PLAYER_IDS) {
      const p = s.players[id];
      const sp = toScreen(L, p.pos);
      const tp = toScreen(L, p.target);
      const ap = toScreen(L, p.anchor);
      const color = p.team === 'home' ? PALETTE.tomato : PALETTE.blue;
      g.lineStyle(1.5, color, 0.9);
      g.lineBetween(sp.x, sp.y, tp.x, tp.y);
      g.strokeCircle(tp.x, tp.y, 3);
      g.lineStyle(1.5, PALETTE.cream, 0.8);
      g.lineBetween(ap.x - 4, ap.y - 4, ap.x + 4, ap.y + 4);
      g.lineBetween(ap.x - 4, ap.y + 4, ap.x + 4, ap.y - 4);
      this.devLabels[id].setText(`${id} ${p.role}\n${p.intent}`).setPosition(sp.x, sp.y + 2);
    }
    for (const team of ['home', 'away'] as const) {
      const d = s.defense[team];
      for (const [pid, color] of [
        [d.presserId, PALETTE.tomato],
        [d.coverId, PALETTE.sun],
      ] as const) {
        if (!pid) continue;
        const sp = toScreen(L, s.players[pid].pos);
        g.lineStyle(3, color, 1);
        g.strokeCircle(sp.x, sp.y - playerH / 2, playerH * 0.6);
      }
    }
    const owner = s.ball.owner;
    this.devText
      .setText(
        `phase ${s.phase}${s.paused ? ' (paused)' : ''} · owner ${owner ?? 'loose'} · possession ${s.possession}\n` +
          `home press ${s.defense.home.presserId ?? '-'} cover ${s.defense.home.coverId ?? '-'} · away press ${s.defense.away.presserId ?? '-'} cover ${s.defense.away.coverId ?? '-'}\n` +
          `t ${s.simTime.toFixed(1)}s · ${Math.round(this.fps)} fps · passes ${s.stats.passes.home}/${s.stats.passes.away} shots ${s.stats.shots.home}/${s.stats.shots.away}`,
      )
      .setPosition(EDGE, Math.min(this.scale.height - 120, this.viewRect().y + this.viewRect().height - 52));
  }

  private drawHud(): void {
    const s = this.sim.state;
    const { width, height } = this.scale;
    const g = this.hud;
    g.clear();
    this.scoreText.setText(`Home ${s.score.home} – ${s.score.away} Away · SANDBOX`);
    if (s.timeScale < 1 && s.timeScale > 0) {
      g.lineStyle(8, PALETTE.cream, 0.55);
      g.strokeRect(4, 4, width - 8, height - 8);
    }
    const st = s.stoppage;
    let banner = '';
    if (s.phase === 'stopped' && st) {
      banner =
        st.reason === 'goal'
          ? `GOAL! ${st.scorer === 'home' ? 'Home' : 'Away'} scores — sandbox restart`
          : `Out of play — sandbox restart (${st.restartTeam === 'home' ? 'Home' : 'Away'} ball)`;
    } else if (s.phase === 'kickoff') {
      banner = s.simTime < 0.01 ? 'Sandbox kick-off…' : 'Sandbox restart…';
    }
    this.bannerMessage = banner;
    this.bannerText.setVisible(banner !== '' && !s.paused).setText(banner).setPosition(width / 2, height / 2);
    const toastOn = this.toastUntil > performance.now() && !s.paused;
    this.toastText.setVisible(toastOn);
    if (toastOn) this.toastText.setText(this.toastMessage).setPosition(width / 2, this.viewRect().y + 18);
  }

  private distanceToCarrier(x: number, y: number): number {
    const s = this.sim.state;
    const feet = toScreen(this.pitchLayout, s.players[s.controlledId].pos);
    const playerH = Phaser.Math.Clamp(this.pitchLayout.scale * 2.7, 24, 80);
    return Math.min(Math.hypot(x - feet.x, y - feet.y), Math.hypot(x - feet.x, y - (feet.y - playerH / 2)));
  }

  private holdRadius(): number {
    return Math.max(this.controls.thresholds.carrierRadius, this.pitchLayout.scale * 4);
  }
}

function boundsOf(object: { getBounds(): Phaser.Geom.Rectangle }): Rect {
  const b = object.getBounds();
  return { x: b.x, y: b.y, width: b.width, height: b.height };
}
