import Phaser from 'phaser';
import { coach, match, pitchMarkings, U11_9V9_PITCH, type PitchMarkings, type Rect, type Vec2 } from '../game';
import { ACTION_BUTTONS, type ActionButton, type PadEvent } from '../input/joystickControls';
import { PadHud } from './ui/PadHud';
import { KEY_BINDINGS } from '../input';
import {
  arcPoints,
  fitRegion,
  orientationOf,
  pitchVectorToScreen,
  rectToScreen,
  screenVectorToPitch,
  depthScaleAt,
  fromScreen,
  quadToScreen,
  toScreen,
  withPerspective,
  type Insets,
  type PitchLayout,
} from '../render/layout';
import { shouldExposeDebug } from '../debug/diagnostics';
import {
  CameraController,
  clampFocus,
  CAMERA_VIEW,
  viewSpan,
  type CameraBounds,
  type CameraMode,
} from '../render/camera';
import { BALL_TEXTURE_SIZE, TEXTURES, ensurePlaceholderTextures } from '../render/textures';
import { CSS, FONT_FAMILY, PALETTE, textResolution } from '../render/theme';
import type { InspectableScene, SceneLayoutReport } from './inspectable';
import type { MatchReport } from './matchReport';
import { EvidenceCollector, coachEvidence } from '../game/career/evidence';
import type { EvidenceItem } from '../game/career/progression';
import { matchAttrsFromCareer } from '../game/career/player';
import { CareerStore } from '../game/career/store';
import { MatchLedger } from '../game/report/ledger';
import { buildReport, clubDisplayName, matchContribution, type SavedReport } from '../game/report/report';
import { ContributionTracker } from '../game/report/assists';
import { TOURNAMENTS } from '../game/season/tournament';
import { SituationObserver, selectSituations, type SituationResult, type TeamTrainingSituation } from '../game/career/teamTraining';
import type { Position } from '../game/career/types';
import { MATCH_TUNING } from '../game/match/tuning';
import { roleDef } from '../game/match/formations';

/** Sandbox slot the career player occupies (shown in the HUD). */
const CAREER_SLOT: Readonly<Record<Position, 'H3' | 'H5' | 'H8'>> = { DEF: 'H3', MID: 'H5', FWD: 'H8' };
const CAREER_FLUSH_SECONDS = 30;
import { SceneKeys } from './keys';
import { artTextureKey, artUrl } from '../render/art/urls';
import { OffsidePopup } from '../render/offsidePopup';

/** Juggling/Referee pack: assistant referee for confirmed offside calls (art review build, not shipping approved). */
const REFEREE_URL = Object.values(import.meta.glob('../assets/art/referee-v1/offside_referee.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)[0];
const REFEREE_KEY = 'ref1:offside';
const rectOf = (r: Phaser.Geom.Rectangle) => ({ x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) });
import { Button } from './ui/Button';
import { COACH_OVERLAY_DEPTH, CoachOverlay } from './ui/CoachOverlay';
import { PLAYER_ART, PlayerArt, atlasKey } from '../render/art/playerArt';
import { COACH_POSE, SPRITE_CELL, isSpriteClub, type SpriteClub } from '../render/art/spriteSets';
import { sideLooks, type ProtagonistLook, type RosterLook } from '../render/art/roster';
import { SPRITE_FRAME, dirFromScreen, type PoseKind } from '../render/art/spriteFactory';

const COACH_HUD_DEPTH = COACH_OVERLAY_DEPTH + 10;

const { MatchSim, MATCH_PLAYER_IDS, HOME_IDS, FORMATION_IDS, DEFAULT_FORMATION } = match;
type Id = match.MatchPlayerId;
type FormationId = match.FormationId;

const EDGE = 8;
const HUD_HEIGHT = 40;
const SIDELINE_SQUASH = CAMERA_VIEW.landscapeTilt;
/** Mouse presses this soon after a touch are browser compatibility events, not a second input. */
const COMPAT_MOUSE_MS = 800;
const HELP_PAD = 'Left stick: move  |  PASS / SHOOT: hold, release to kick  |  SHOOT twice: quick shot  |  SLIDE / TACKLE: tap (hold TACKLE to jockey)';

export interface MatchSceneData {
  readonly formation?: FormationId;
  /** M6: record the career player's actions as game evidence. */
  readonly career?: boolean;
  /** Gameplay Lab scenario (lab builds only): untimed, no Coach, no career evidence. */
  readonly lab?: string;
  /** Career Team Training: this week's three logic-catalog situations, counted once on completion. */
  readonly teamTraining?: boolean;
  /** Story handoff: Menu returns to the story instead of the start screen. */
  readonly returnTo?: 'story';
  /** Story run id: the full-time score is kept once under `matchresult:<key>` for the league table. */
  readonly resultKey?: string;
  /** Story fixture opponent (club id): which club sheet the away side wears. Cosmetic only. */
  readonly opponent?: string;
  /** Story fixture venue for Batavia and its competition, for the Match Report only. */
  readonly venue?: 'home' | 'away';
  readonly competition?: 'League' | 'Tournament';
}

/** Team Training camera magnification over the match view (brief: 1.25–1.40×). */
export const TEAM_TRAINING_ZOOM = 1.3;

/** 9v9 team-play sandbox. Reads `MatchSim` state and draws it; owns no soccer rules. */
/** Referee call banner (the call itself comes from the sim's referee). */
function restartBanner(reason: string, restart: match.RestartKind, side: string): string {
  if (reason === 'offside') return `OFFSIDE! Indirect free kick — ${side}`;
  switch (restart) {
    case 'throwIn': return `THROW-IN — ${side}`;
    case 'goalKick': return `GOAL KICK — ${side}`;
    case 'corner': return `CORNER — ${side}`;
    case 'penalty': return `FOUL! PENALTY — ${side}`;
    case 'freeKick': return `FOUL! Free kick — ${side}`;
    case 'indirectFreeKick': return `Indirect free kick — ${side}`;
    default: return `Restart — ${side}`;
  }
}

export class MatchScene extends Phaser.Scene implements InspectableScene {
  private sim!: InstanceType<typeof MatchSim>;
  private markings!: PitchMarkings;
  private pitchLayout!: PitchLayout;
  /** Joystick + four buttons; null only after shutdown. */
  private pad: PadHud | null = null;
  private padIds = 0;
  private padPrefButtons: Button[] = [];
  private readonly padKeys = new Set<string>();
  /** Which input began the held action (touch or a key code); only that input may release it. */
  private padSource: 'touch' | { key: string } | null = null;
  /** Debug trail of recent pointer decisions and control actions. */
  private inputLog: string[] = [];
  private lastEpoch = 0;
  private lastTouchAt = Number.NEGATIVE_INFINITY;
  private navigating = false;
  private overlayOn = false;
  private lastSeq = 0;
  private camX = 37.5;
  private camY = 25;
  private camera = new CameraController({ x: 37.5, y: 25 });
  /** Visible pitch length/width in yards for the current viewport (fixed close ball camera). */
  private viewLen = 0;
  private viewCross = 0;
  /** The aim guide's rest point is off screen: an edge arrow is drawn instead of an endpoint. */
  private guideOffscreen = false;
  /** Field graphics are rebuilt only when the camera/layout changes. */
  private fieldKey = '';
  private fps = 0;
  private toastMessage = '';
  /** Team Training feedback is not replaced by routine notices ("You control …") until it expires. */
  private toastPriorityUntil = 0;
  private toastUntil = 0;
  private bannerMessage = '';
  private field!: Phaser.GameObjects.Graphics;
  private under!: Phaser.GameObjects.Graphics;
  private over!: Phaser.GameObjects.Graphics;
  private dev!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  private rotateText!: Phaser.GameObjects.Text;
  private sprites!: Record<Id, Phaser.GameObjects.Image>;
  private art!: PlayerArt;
  private looks!: Record<Id, RosterLook>;
  /** Cosmetic animation memory only (last screen heading, distance for the run cycle). Never read by the sim. */
  private artDir!: Record<Id, number>;
  private artDist!: Record<Id, number>;
  private artSimTime = 0;
  private devLabels!: Record<Id, Phaser.GameObjects.Text>;
  private ball!: Phaser.GameObjects.Image;
  private menuButton!: Button;
  private pauseButton!: Button;
  private helpButton!: Button;
  private scoreText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  /** Coach Code beside Team Training cards (sprites v2); the pose follows the card's beat. Cosmetic only. */
  private coachImg!: Phaser.GameObjects.Image;
  private coachPose: string = COACH_POSE.idle;
  private bannerText!: Phaser.GameObjects.Text;
  private eventArt: Phaser.GameObjects.Image | null = null;
  private eventArtFor: unknown = null;
  private eventArtShown = { goal: 0, foul: 0 };
  private readonly offsidePopup = new OffsidePopup();
  private refImg: Phaser.GameObjects.Image | null = null;
  private refCaption: Phaser.GameObjects.Text | null = null;
  private reducedMotion = false;
  /** Debug-only staging that needs live play (offside calls). */
  private debugStage: 'offside' | 'offside-position' | null = null;
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
  private breakPanel!: Phaser.GameObjects.Graphics;
  private breakTitle!: Phaser.GameObjects.Text;
  private breakNote!: Phaser.GameObjects.Text;
  private secondHalfButton!: Button;
  private playAgainButton!: Button;
  private breakMenuButton!: Button;
  private breakKey = '';
  private breakMode: '' | 'halftime' | 'fulltime' = '';
  private breakRect: Rect = { x: 0, y: 0, width: 0, height: 0 };
  /** Coach Moments (`?coach`, M5 development flag). Null when the flag is off. */
  private coachDirector: coach.CoachDirector | null = null;
  private careerStore: CareerStore | null = null;
  private returnTo: 'story' | null = null;
  private resultKey: string | null = null;
  /** Away side's club sheet; matches outside the story show Royal Salt. Cosmetic only. */
  private opponent: SpriteClub = 'royal_salt';
  private collector: EvidenceCollector | null = null;
  /** Career player's own actions for the Match Report; read-only, beside the evidence collector. */
  private ledger: MatchLedger | null = null;
  /** Assists and defensive points for all 18 players, from the same event log as the ledger. */
  private contrib: ContributionTracker | null = null;
  private reportMeta: { name: string; position: string; week: number } | null = null;
  private reportMatchId: string | null = null;
  private reportSaving: Promise<boolean> | null = null;
  private reportPending: SavedReport | null = null;
  private careerMatch = false;
  private venue: 'home' | 'away' = 'home';
  private competition: 'League' | 'Tournament' = 'League';
  private careerItems: EvidenceItem[] = [];
  private careerSession = '';
  private careerBatch = 0;
  private careerRecorded = 0;
  private careerMissedSent = 0;
  private careerFlushAt = 0;
  private careerCoachSent = false;
  private coachConfig: coach.CoachConfig | null = null;
  private coachOverlay!: CoachOverlay;
  private coachRun = 0;

  constructor() {
    super(SceneKeys.Match);
  }

  create(data: MatchSceneData = {}): void {
    this.returnTo = data.returnTo === 'story' ? 'story' : null;
    this.resultKey = this.returnTo && typeof data.resultKey === 'string' ? data.resultKey : null;
    this.venue = data.venue === 'away' ? 'away' : 'home';
    this.competition = data.competition === 'Tournament' ? 'Tournament' : 'League';
    this.opponent = isSpriteClub(data.opponent) && data.opponent !== 'batavia' ? data.opponent : 'royal_salt';
    this.navigating = false;
    this.overlayOn = false;
    this.fieldKey = '';
    this.viewLen = 0;
    this.toastMessage = '';
    this.toastPriorityUntil = 0;
    this.toastUntil = 0;
    const params = new URLSearchParams(window.location.search);
    const seed = Number(params.get('seed') ?? '1') || 1;
    this.labSeed = seed;
    const fromUrl = params.get('formation') as FormationId | null;
    const formation = data.formation ?? (fromUrl && FORMATION_IDS.includes(fromUrl) ? fromUrl : DEFAULT_FORMATION);
    // A timed two-half match by default; `?sandbox` keeps the open-ended M3 sandbox. Debug builds may shorten halves.
    const halfParam = Number(params.get('halfSeconds'));
    // Only the Lab picker launches a scenario; `?lab` itself just opens the picker.
    const labId = __LAB__ ? data.lab : null;
    this.labId = match.isLabScenarioId(labId) ? labId : null;
    // Weekly Team Training is the tactical Sessions A-C only (TacticalTrainingScene); this legacy match route is never started.
    const teamTraining = false;
    const halfSeconds = params.has('sandbox') || this.labId || teamTraining
      ? null
      : shouldExposeDebug(window.location) && Number.isFinite(halfParam) && halfParam > 0
        ? halfParam
        : MATCH_TUNING.match.halfSeconds;
    this.breakKey = '';
    this.breakMode = '';
    const tacticsParam = params.get('tactics');
    const tactics = tacticsParam === 'v05' || tacticsParam === 'classic' ? tacticsParam : undefined;
    // `?kick=classic` restores the previous passing/shooting model (rollback switch; no save changes).
    const kicking = params.get('kick') === 'classic' ? 'classic' : 'v11';
    // Debug builds may lengthen the dead-ball pause (`deadBall` seconds) so browser tests can inspect a stoppage.
    const deadBall = Number(params.get('deadBall'));
    const tuning = shouldExposeDebug(window.location) && Number.isFinite(deadBall) && deadBall > 0
      ? { ...MATCH_TUNING, stoppage: { ...MATCH_TUNING.stoppage, outSeconds: deadBall } }
      : undefined;
    this.sim = new MatchSim({ seed, homeFormation: formation, halfSeconds, kicking, ...(tactics ? { tactics } : {}), ...(tuning ? { tuning } : {}) });
    this.stageLab();
    if (shouldExposeDebug(window.location)) this.applyDebugSetup(params.get('setup'));
    this.passLog = shouldExposeDebug(window.location) && params.has('passlog');
    this.passLogKey = '';
    this.coachConfig = this.labId || teamTraining ? null : this.readCoachConfig(params, seed);
    this.coachRun = 0;
    this.coachDirector = this.coachConfig ? new coach.CoachDirector(this.coachConfig) : null;
    this.lastSeq = 0;
    this.startCareer(data.career === true && !this.labId && !teamTraining);
    this.startTeamTraining(teamTraining, params);
    this.camera = new CameraController(this.sim.state.ball.pos);
    this.snapCamera();
    this.pad = new PadHud(this, this.scale.width, this.scale.height);
    this.padIds = 0;
    this.padKeys.clear();
    this.padSource = null;
    this.lastEpoch = this.sim.state.controlEpoch;
    this.markings = pitchMarkings(U11_9V9_PITCH);
    ensurePlaceholderTextures(this);

    const resolution = textResolution();
    const text = (size: number, color: string = CSS.cream, stroke = true): Phaser.GameObjects.Text =>
      this.add
        .text(0, 0, '', { fontFamily: FONT_FAMILY, fontStyle: 'bold', fontSize: `${size}px`, color, align: 'center', ...(stroke ? { stroke: CSS.ink, strokeThickness: 4 } : {}) })
        .setResolution(resolution);

    this.field = this.add.graphics().setDepth(0);
    this.under = this.add.graphics().setDepth(1);
    this.art = new PlayerArt(this);
    // Team Training is set up before the art exists; queue Coach Code now.
    if (this.team) this.art.ensure(['coach-code']);
    this.artSimTime = 0;
    this.setRosterLooks(null);
    this.artDir = Object.fromEntries(MATCH_PLAYER_IDS.map((id) => [id, id.startsWith('H') ? 0 : 4])) as Record<Id, number>;
    this.artDist = Object.fromEntries(MATCH_PLAYER_IDS.map((id) => [id, 0])) as Record<Id, number>;
    this.sprites = Object.fromEntries(
      MATCH_PLAYER_IDS.map((id) => [id, this.add.image(0, 0, this.art.frame(this.looks[id], 'idle', this.artDir[id], 0)).setOrigin(0.5, SPRITE_FRAME.anchorY / SPRITE_FRAME.height).setName(id)]),
    ) as Record<Id, Phaser.GameObjects.Image>;
    // Away keeper wears a tinted keeper kit so the two keepers are distinguishable.
    this.sprites.A1.setTint(0xb7d3ff);
    this.ball = this.add.image(0, 0, TEXTURES.ball).setName('ball');
    this.over = this.add.graphics().setDepth(5000);
    this.dev = this.add.graphics().setDepth(5500);
    this.devLabels = Object.fromEntries(
      MATCH_PLAYER_IDS.map((id) => [id, text(10, CSS.cream).setOrigin(0.5, 0).setDepth(5501).setVisible(false)]),
    ) as Record<Id, Phaser.GameObjects.Text>;
    // Top of the pitch, on a dark backing, so it never sits over the touch pads at the bottom.
    this.devText = text(11, CSS.cream).setOrigin(0, 0).setDepth(5502).setVisible(false).setBackgroundColor('#000000aa').setPadding(4, 3, 4, 3);
    this.hud = this.add.graphics().setDepth(6000);
    this.scoreText = text(15).setOrigin(0.5, 0.5).setDepth(6001);
    this.helpText = text(11, CSS.ink, false).setOrigin(0.5, 1).setDepth(6001).setAlpha(0.9);
    this.toastText = text(15).setOrigin(0.5, 0.5).setDepth(6002);
    this.coachImg = this.add.image(0, 0, '__DEFAULT').setOrigin(SPRITE_CELL.anchorX / SPRITE_CELL.width, SPRITE_CELL.anchorY / SPRITE_CELL.height).setDepth(6002).setVisible(false);
    this.rotateText = text(11, CSS.cream).setOrigin(0, 0.5).setDepth(6001).setText('Turn sideways for\na closer view');
    this.bannerText = text(24).setOrigin(0.5, 0.5).setDepth(6002);
    this.eventArt = null;
    this.eventArtFor = null;
    this.eventArtShown = { goal: 0, foul: 0 };
    this.offsidePopup.reset();
    this.refImg = null;
    this.refCaption = null;
    this.reducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    if (this.team) this.menuButton.setLabel('‹ Back');
    this.helpButton = hudButton('help-button', '? Help', () => this.showHelp(), true);
    // Menu and Pause stay usable above the Coach Moment touch blocker (the card never covers the top-left HUD row).
    this.menuButton.setDepth(COACH_HUD_DEPTH);
    this.pauseButton.setDepth(COACH_HUD_DEPTH);

    this.panel = this.add.graphics().setDepth(7000);
    this.panelTitle = text(26).setOrigin(0.5, 0.5).setDepth(7001);
    this.panelNote = text(12, CSS.ink, false).setOrigin(0.5, 0).setDepth(7001);
    const panelButton = (name: string, label: string, onClick: () => void, cream = false): Button =>
      new Button(this, 0, 0, { name, label, width: 140, height: 46, fontSize: 17, ...(cream ? { fill: PALETTE.cream, fillPressed: PALETTE.sand } : {}), onClick }).setDepth(7002);
    this.resumeButton = panelButton('resume-button', 'Resume ▶', () => this.togglePause());
    this.resetButton = panelButton('reset-button', params.has('sandbox') || this.labId ? 'Reset' : 'New match', () => this.reset(), true);
    this.panelMenuButton = panelButton('panel-menu-button', 'Menu', () => this.goToMenu(), true);
    this.ttButtons = [
      panelButton('tt-retry', 'Retry', () => this.retryTeamAttempt(), true),
      panelButton('tt-continue', 'Continue', () => this.continueTeamTraining()),
    ];
    for (const b of this.ttButtons) b.setVisible(false).setEnabled(false).setDepth(7003);
    this.overlayButton = panelButton('overlay-button', 'Dev overlay: off', () => this.toggleOverlay(), true);
    this.formationButtons = Object.fromEntries(
      FORMATION_IDS.map((id) => [id, panelButton(`formation-${id}`, id, () => this.changeFormation(id), true)]),
    ) as Record<FormationId, Button>;
    this.padPrefButtons = this.pad
      ? [
          panelButton('controls-size', 'Size', () => this.cyclePadPref('size'), true),
          panelButton('controls-opacity', 'Opacity', () => this.cyclePadPref('opacity'), true),
          panelButton('controls-reset', 'Reset controls', () => this.resetPadPrefs(), true),
        ]
      : [];
    this.breakPanel = this.add.graphics().setDepth(6900);
    this.breakTitle = text(26).setOrigin(0.5, 0.5).setDepth(6901);
    this.breakNote = text(13, CSS.ink, false).setOrigin(0.5, 0).setDepth(6901);
    const breakButton = (name: string, label: string, onClick: () => void, cream = false): Button => panelButton(name, label, onClick, cream).setDepth(6902);
    this.secondHalfButton = breakButton('second-half-button', 'Start 2nd half ▶', () => this.startSecondHalf());
    this.playAgainButton = breakButton('play-again-button', 'Play again', () => this.reset());
    this.breakMenuButton = breakButton('break-menu-button', 'Menu', () => this.goToMenu(), true);
    this.coachOverlay = new CoachOverlay(this, {
      onAnswer: (id) => this.coachAnswer(id),
      onContinue: () => this.coachContinue(),
      onAgain: () => this.coachAgain(),
      onMenu: () => this.goToMenu(),
    });

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
    this.game.canvas.addEventListener('pointerdown', this.onDomPointerDown);
    this.game.canvas.addEventListener('pointerup', this.onDomPointerUp);
    this.game.canvas.addEventListener('lostpointercapture', this.onLostCapture);
    window.addEventListener('blur', this.onWindowBlur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.layout(this.scale.width, this.scale.height);
    this.consumeEvents();
    this.renderFrame(0);
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    if (dt > 0) this.fps = this.fps ? this.fps * 0.95 + (1 / dt) * 0.05 : 1 / dt;
    if (this.sim.state.controlEpoch !== this.lastEpoch) this.lastEpoch = this.sim.state.controlEpoch;
    // Availability comes from the authoritative sim; a held button that loses it goes inert.
    if (this.pad) this.handlePad(this.pad.controls.setAvailable(this.sim.padAvailability()));
    if (this.debugStage && this.sim.state.phase === 'live') this.stageOffside(this.debugStage);
    this.sim.step(dt);
    this.consumeEvents();
    this.observeCareer();
    this.updateTeamTraining();
    this.updateCoach();
    this.updateBreak();
    this.renderFrame(dt);
  }

  // ---- Coach Moments ---------------------------------------------------------------------------

  /** `?coach` (5 moments) or `?coach=4..6`. Debug builds may shorten the session with `coachSeconds`. */
  private readCoachConfig(params: URLSearchParams, seed: number): coach.CoachConfig | null {
    if (!params.has('coach')) return null;
    const raw = params.get('coach');
    const moments = raw ? Number(raw) : undefined;
    const names: Partial<Record<Id, string>> = {};
    for (const pair of (params.get('names') ?? '').split(',').slice(0, MATCH_PLAYER_IDS.length)) {
      const [id, ...rest] = pair.split(':');
      if (id && (HOME_IDS as readonly string[]).includes(id)) names[id as Id] = rest.join(':');
    }
    const secs = Number(params.get('coachSeconds'));
    const debugShort = shouldExposeDebug(window.location) && Number.isFinite(secs) && secs >= 20 && secs < coach.COACH_TUNING.sessionSeconds;
    const base = { sessionId: `s${seed}-${Date.now().toString(36)}`, seed, names, ...(moments !== undefined && Number.isFinite(moments) ? { moments } : {}) };
    const clock = this.sim.state.clock;
    if (!debugShort) return clock ? { ...base, sessionSeconds: clock.halfSeconds * 2 } : base;
    const target = Math.min(6, Math.max(4, Math.round(moments ?? 5)));
    return { ...base, sessionSeconds: secs, tuning: { ...coach.COACH_TUNING, minGapSeconds: Math.min(coach.COACH_TUNING.minGapSeconds, (secs / target) * 0.5) } };
  }

  private updateCoach(): void {
    const d = this.coachDirector;
    if (!d) return;
    const view = d.update(this.sim, { gestureActive: this.padSource !== null || this.sim.state.pad.phase !== 'ready', overlayOpen: this.sim.state.pauseReasons.user || this.navigating });
    if (view) {
      // Frozen: nothing half-done may act when play resumes.
      this.cancelInput('coach moment');
      this.coachOverlay.showQuestion(view, d.entries.length, d.target);
    }
    if (d.phase === 'summary' && this.coachOverlay.state !== 'summary') {
      this.cancelInput('coach summary');
      this.coachOverlay.showSummary(d.summary());
    }
    this.helpText.setVisible(!this.coachOverlay.visible && !this.team);
  }

  private coachAnswer(id: string): void {
    const d = this.coachDirector;
    if (!d || this.sim.state.pauseReasons.user || !d.answer(id) || !d.view || !d.selected) return;
    this.coachOverlay.showFeedback(d.view, d.selected);
  }

  private coachContinue(): void {
    const d = this.coachDirector;
    if (!d || this.sim.state.pauseReasons.user) return;
    const picked = d.selected;
    if (!d.continueMoment(this.sim)) return;
    this.cancelInput('coach continue');
    this.coachOverlay.hide();
    if (picked?.intention.kind === 'onBall' && this.sim.userHasBall()) this.toast(`Your move: ${picked.text.toLowerCase()}`);
  }

  private coachAgain(): void {
    if (this.navigating) return;
    this.navigating = true;
    this.cancelInput('navigation');
    this.scene.restart({ formation: this.sim.state.formations.home });
  }

  private newCoachSession(): void {
    if (!this.coachConfig) return;
    this.coachDirector?.abandon(null);
    this.coachRun += 1;
    this.coachDirector = new coach.CoachDirector({ ...this.coachConfig, sessionId: `${this.coachConfig.sessionId}.${this.coachRun}` });
    this.coachOverlay.hide();
  }

  private coachKey(event: KeyboardEvent): boolean {
    const d = this.coachDirector;
    if (!d || !this.coachOverlay.visible || event.code === 'KeyP' || event.code === 'Escape' || event.code === 'KeyM') return false;
    event.preventDefault();
    if (event.repeat) return true;
    const n = /^(?:Digit|Numpad)([1-4])$/.exec(event.code);
    if (n && d.phase === 'question' && d.view) {
      const o = d.view.options[Number(n[1]) - 1];
      if (o) this.coachAnswer(o.id);
    } else if ((event.code === 'Enter' || event.code === 'Space') && d.phase === 'feedback') this.coachContinue();
    return true;
  }

  private drawCoach(playerH: number): void {
    const d = this.coachDirector;
    if (!d) return;
    const s = this.sim.state;
    const L = this.pitchLayout;
    const o = this.over;
    const ring = (id: Id, color: number): void => {
      const p = s.players[id];
      if (!p) return;
      const sp = toScreen(L, p.pos);
      const v = pitchVectorToScreen(L, { x: 1.9, y: 1.9 });
      o.lineStyle(4, PALETTE.ink, 0.9);
      o.strokeEllipse(sp.x, sp.y, Math.abs(v.x) * 2, Math.abs(v.y) * 2);
      o.lineStyle(3, color, 1);
      o.strokeEllipse(sp.x, sp.y, Math.abs(v.x) * 2, Math.abs(v.y) * 2);
    };
    const showing = d.view && !s.pauseReasons.user;
    if (showing) {
      for (const h of d.view!.highlights) {
        if (h.kind === 'player') ring(h.id, h.tone === 'focus' ? PALETTE.mustard : h.tone === 'mate' ? PALETTE.cream : PALETTE.tomato);
        else if (h.kind === 'lane') {
          const a = toScreen(L, s.players[h.from].pos);
          const b = toScreen(L, s.players[h.to].pos);
          o.lineStyle(5, PALETTE.ink, 0.6);
          o.lineBetween(a.x, a.y, b.x, b.y);
          o.lineStyle(3, h.open ? PALETTE.cream : PALETTE.tomato, 0.95);
          o.lineBetween(a.x, a.y, b.x, b.y);
        } else if (h.kind === 'space') {
          const c = toScreen(L, h.at);
          const v = pitchVectorToScreen(L, { x: h.radius, y: h.radius });
          o.fillStyle(PALETTE.sun, 0.22);
          o.fillEllipse(c.x, c.y, Math.abs(v.x) * 2, Math.abs(v.y) * 2);
          o.lineStyle(2, PALETTE.sun, 0.9);
          o.strokeEllipse(c.x, c.y, Math.abs(v.x) * 2, Math.abs(v.y) * 2);
        } else {
          const P = U11_9V9_PITCH;
          const r = rectToScreen(L, { x: P.length - 1.5, y: P.width / 2 - P.goalWidth / 2 - 1, width: 3, height: P.goalWidth + 2 });
          o.lineStyle(4, PALETTE.sun, 1);
          o.strokeRect(r.x, r.y, r.width, r.height);
        }
      }
    }
    // After Continue: the on-ball cue points at the choice; the user still has to make the play.
    const cue = d.cue;
    if (cue && cue.carrierId && !s.paused) {
      ring(cue.carrierId, PALETTE.mustard);
      if (cue.targetId) {
        const a = toScreen(L, s.players[cue.carrierId].pos);
        const b = toScreen(L, s.players[cue.targetId].pos);
        o.lineStyle(3, PALETTE.cream, 0.8);
        o.lineBetween(a.x, a.y - playerH * 0.2, b.x, b.y - playerH * 0.2);
      }
    }
    const it = s.coachIntent;
    if (it) {
      const t = toScreen(L, it.target);
      o.fillStyle(PALETTE.cream, 0.9);
      o.lineStyle(2, PALETTE.ink, 1);
      o.fillCircle(t.x, t.y, 5);
      o.strokeCircle(t.x, t.y, 5);
      ring(it.playerId, PALETTE.cream);
    }
  }

  describeLayout(): SceneLayoutReport {
    const { width, height } = this.scale;
    const elements: Record<string, Rect> = {
      pitch: this.viewRect(),
      'menu-button': this.menuButton.getButtonBounds(),
      'pause-button': this.pauseButton.getButtonBounds(),
      ...Object.fromEntries(this.ttButtons.filter((b) => b.visible).map((b) => [b.name, b.getButtonBounds()])),
      'help-button': this.helpButton.getButtonBounds(),
      score: boundsOf(this.scoreText),
      help: boundsOf(this.helpText),
      minimap: this.minimapRect(),
    };
    Object.assign(elements, this.coachOverlay.bounds());
    if (this.refImg?.visible) elements['offside-referee'] = rectOf(this.refImg.getBounds());
    if (this.pad) {
      const PL = this.pad.controls.currentLayout;
      const box = (c: { x: number; y: number; r: number }): Rect => ({ x: c.x - c.r, y: c.y - c.r, width: c.r * 2, height: c.r * 2 });
      elements['pad-stick'] = box(PL.stick);
      for (const a of ACTION_BUTTONS) elements[`pad-${a}`] = box(PL.buttons[a]);
    }
    if (this.sim.state.pauseReasons.user) {
      elements['pause-panel'] = this.panelRect;
      elements['resume-button'] = this.resumeButton.getButtonBounds();
      elements['reset-button'] = this.resetButton.getButtonBounds();
      elements['panel-menu-button'] = this.panelMenuButton.getButtonBounds();
      elements['overlay-button'] = this.overlayButton.getButtonBounds();
      for (const id of FORMATION_IDS) elements[`formation-${id}`] = this.formationButtons[id].getButtonBounds();
      ['controls-size', 'controls-opacity', 'controls-reset'].forEach((n, i) => {
        const b = this.padPrefButtons[i];
        if (b) elements[n] = b.getButtonBounds();
      });
    }
    if (this.breakMode) {
      elements['break-panel'] = this.breakRect;
      elements['break-menu-button'] = this.breakMenuButton.getButtonBounds();
      elements[this.breakMode === 'halftime' ? 'second-half-button' : 'play-again-button'] = (this.breakMode === 'halftime' ? this.secondHalfButton : this.playAgainButton).getButtonBounds();
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
      kick: {
        mode: this.sim.kickingMode,
        preview: this.sim.aimPreview(),
        last: this.sim.kickLog.at(-1) ?? null,
        kicks: this.sim.kickLog.length,
        touch: this.sim.lastTouch ? { ...this.sim.lastTouch } : null,
        targetSwitches: this.sim.targetSwitches,
      },
      phase: s.phase,
      clock: s.clock ? { half: s.clock.half, elapsed: s.clock.elapsed, halfSeconds: s.clock.halfSeconds, label: match.clockLabel(s.clock) } : null,
      result: s.phase === 'fulltime' ? match.matchResult(s) : null,
      breakPanel: this.breakMode || null,
      paused: s.paused,
      simTime: s.simTime,
      timeScale: s.timeScale,
      formations: { ...s.formations },
      possession: s.possession,
      controlledId: s.controlledId,
      owner: s.ball.owner,
      userHasBall: this.sim.userHasBall(),
      dribbleDir: { x: s.dribbleDir.x, y: s.dribbleDir.y },
      score: { ...s.score },
      stoppage: s.stoppage ? { reason: s.stoppage.reason, scorer: s.stoppage.scorer, restartTeam: s.stoppage.restartTeam, restart: s.stoppage.restart } : null,
      eventArt: { ...this.eventArtShown, visible: this.eventArt?.visible ?? false },
      offsidePopup: { shown: this.offsidePopup.shown, visible: !!this.refImg?.visible, bounds: this.refImg?.visible ? rectOf(this.refImg.getBounds()) : null, caption: this.refCaption?.visible ? rectOf(this.refCaption.getBounds()) : null, alpha: this.refImg?.alpha ?? 0 },
      defense: {
        home: { presserId: s.defense.home.presserId, coverId: s.defense.home.coverId },
        away: { presserId: s.defense.away.presserId, coverId: s.defense.away.coverId },
      },
      stats: structuredClone(s.stats),
      events: s.events.map((e) => ({ seq: e.seq, type: e.type, by: e.by, detail: e.detail, at: e.at })),
      players,
      ball: { x: s.ball.pos.x, y: s.ball.pos.y, vx: s.ball.vel.x, vy: s.ball.vel.y, sx: bs.x, sy: bs.y },
      layout: { ...L },
      camera: {
        viewLength: this.viewLen,
        viewCross: this.viewCross,
        mode: this.camera.mode,
        x: this.camX,
        y: this.camY,
        look: this.camera.look,
        guideOffscreen: this.guideOffscreen,
      },
      controlScheme: 'pad',
      pad: {
        phase: s.pad.phase,
        actor: s.pad.actor,
        receiver: s.pad.receiver,
        stick: { x: s.pad.stick.x, y: s.pad.stick.y },
        available: this.pad ? { ...this.pad.controls.available } : null,
        pressed: this.pad?.controls.pressed ?? null,
      },
      inputLog: [...this.inputLog],
      pass: { minDistance: this.sim.tuning.pass.minDistance, maxDistance: this.sim.tuning.pass.maxDistance },
      overlay: this.overlayOn,
      banner: this.bannerText.visible ? this.bannerMessage : '',
      toast: this.toastUntil > performance.now() ? this.toastMessage : '',
      fps: Math.round(this.fps),
      pauseReasons: { ...s.pauseReasons },
      coachIntent: s.coachIntent ? { ...s.coachIntent, target: { ...s.coachIntent.target } } : null,
      coach: this.coachReport(),
      teamTraining: this.team
        ? { phase: this.team.phase, week: this.team.week, protagonist: this.team.look ? { id: this.sim.state.controlledId, set: this.looks[this.sim.state.controlledId]?.set ?? null } : null, index: this.team.index, ids: this.team.situations.map((x) => x.id), scores: this.team.results.map((r) => r.score), message: this.team.message, hud: this.scoreText.text, half: this.team.half, zoom: TEAM_TRAINING_ZOOM, viewLen: this.viewLen, viewCross: this.viewCross }
        : null,
      report: { id: this.reportMatchId, saving: this.reportSaving !== null, ledger: this.ledger !== null, meta: this.reportMeta !== null, store: this.careerStore !== null },
      career: this.collector ? { slot: this.collector.careerId, pending: this.careerItems.length, batches: this.careerBatch, recorded: this.careerRecorded, missed: this.collector.missed } : null,
    };
  }

  private coachReport(): MatchReport['coach'] {
    const d = this.coachDirector;
    if (!d) return null;
    const v = d.view;
    return {
      sessionId: d.id,
      phase: d.phase,
      overlay: this.coachOverlay.visible ? this.coachOverlay.state : 'hidden',
      target: d.target,
      sessionSeconds: d.sessionSeconds,
      view: v ? { momentId: v.momentId, templateId: v.templateId, topic: v.topic, question: v.question, options: v.options.map((o) => ({ id: o.id, text: o.text, grade: o.grade, intention: o.intention.kind })), highlights: v.highlights.map((h) => h.kind) } : null,
      selected: d.selected?.id ?? null,
      cue: d.cue ? { ...d.cue } : null,
      entries: d.entries.map((e) => ({ momentId: e.momentId, templateId: e.templateId, templateVersion: e.templateVersion, topic: e.topic, openedAt: e.openedAt, selectedOptionId: e.selectedOptionId, selectedGrade: e.selectedGrade, intentionStatus: e.intentionStatus, observed: e.observed ? { ...e.observed } : null })),
      summary: d.phase === 'summary' ? { ...d.summary(), entries: [] } : null,
    };
  }

  /** Debug-only staged scenarios for browser tests (`?debug&setup=...`). Clearly not normal play. */
  private labId: match.LabScenarioId | null = null;
  private labSeed = 1;

  /** Lab: stage the scenario on the fresh sim (create and every reset). */
  private stageLab(): void {
    const id = this.labId;
    if (!id) return;
    this.sim.arrange((s) => match.stageLabScenario(s, id, MATCH_TUNING.pitch));
    this.toast(`You control ${this.sim.state.controlledId}`);
  }

  /** Frame the carrier (or ball) immediately: scene entry and resets never blend from a stale view. */
  private snapCamera(): void {
    const s = this.sim.state;
    const owner = s.ball.owner;
    const focus = owner ? s.players[owner].pos : s.ball.pos;
    this.camera.snap(focus, (owner ? s.players[owner].team : s.possession) === 'home' ? 1 : -1, this.frame().bounds);
    this.camX = this.camera.x;
    this.camY = this.camera.y;
  }

  private applyDebugSetup(setup: string | null): void {
    if (setup === 'offside' || setup === 'offside-position') {
      this.debugStage = setup;
      return;
    }
    if (setup === 'tackle') {
      // 'tackle': the user's H8 squared up to A7, who carries the ball toward the home goal, for TACKLE tests.
      this.sim.arrange((s) => {
        const c = s.players.A7;
        c.pos = { x: 40, y: 25 };
        c.vel = { x: 0, y: 0 };
        s.ball.owner = 'A7';
        s.ball.pos = { x: 39.4, y: 25 };
        s.ball.vel = { x: 0, y: 0 };
        s.ball.kick = null;
        s.possession = 'away';
        s.players.H8.pos = { x: 38.3, y: 25 };
        s.players.H8.vel = { x: 0, y: 0 };
        s.protectUntil = s.simTime;
        s.controlledId = 'H8';
        s.controlSince = s.simTime;
        s.controlEpoch += 1;
      });
      return;
    }
    if (setup !== 'pass' && setup !== 'final-third' && setup !== 'space') return;
    // 'space': H8 in their own half with every away outfielder 45+ yd upfield, for control tests that need seconds on the ball.
    const carrierX = setup === 'pass' ? 30 : setup === 'space' ? 10 : 52;
    const gap = setup === 'space' ? 45 : 16;
    this.sim.arrange((s) => {
      const c = s.players.H8;
      c.pos = { x: carrierX, y: 25 };
      s.ball.owner = 'H8';
      s.ball.pos = { x: carrierX + 0.6, y: 25 };
      for (const id of match.AWAY_IDS) if (id !== 'A1') s.players[id].pos = { x: Math.max(s.players[id].pos.x, carrierX + gap), y: s.players[id].pos.y };
    });
  }

  // ---- input ---------------------------------------------------------------------------------

  private onPointerDown(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    // UI presses never reach gameplay.
    if (over.length > 0 || this.navigating || this.sim.state.paused) {
      this.logInput(over.length > 0 ? `down:ui(${over.map((o) => o.name || o.type).join('+')})` : 'down:ignored');
      return;
    }
    const now = performance.now();
    if (pointer.wasTouch) this.lastTouchAt = now;
    // Compatibility mouse events that follow a touch would otherwise count as a second tap.
    else if (now - this.lastTouchAt < COMPAT_MOUSE_MS) {
      this.logInput('down:compat-mouse');
      return;
    }
    if (!this.pad) return;
    this.logInput(`down:pad:${pointer.id}`);
    this.handlePad(this.pad.controls.pointerDown(pointer.id, pointer.x, pointer.y));
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.pad) this.handlePad(this.pad.controls.pointerMove(pointer.id, pointer.x, pointer.y));
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    this.logInput(`up:${pointer.id}:pad`);
    if (this.pad) this.handlePad(this.pad.controls.pointerUp(pointer.id));
  }

  private readonly onWindowBlur = (): void => this.cancelInput('window blur');

  /**
   * Chrome releases a touch's implicit capture right after pointerup, before Phaser sees touchend,
   * so only a capture lost while the finger is still down is an interruption.
   */
  private readonly releasedPointers = new Set<number>();
  private readonly onDomPointerDown = (e: PointerEvent): void => {
    if (this.releasedPointers.size > 32) this.releasedPointers.clear();
    this.releasedPointers.delete(e.pointerId);
  };
  private readonly onDomPointerUp = (e: PointerEvent): void => {
    this.releasedPointers.add(e.pointerId);
  };
  private readonly onLostCapture = (e: PointerEvent): void => {
    if (!this.releasedPointers.has(e.pointerId)) this.cancelInput('lost pointer capture');
  };

  private readonly onDomCancel = (): void => this.cancelInput('pointer cancelled');

  private onBlur(): void {
    this.cancelInput('app in background');
  }

  private onHidden(): void {
    this.cancelInput('app in background');
    // A background pause is the user's pause reason, kept even if a Coach Moment is also holding play.
    if (!this.sim.state.pauseReasons.user) this.togglePause();
  }

  private logInput(entry: string): void {
    this.inputLog.push(entry);
    if (this.inputLog.length > 12) this.inputLog.shift();
  }




  private showHelp(): void {
    this.layout(this.scale.width, this.scale.height);
  }


  private onKeyDown(event: KeyboardEvent): void {
    const s = this.sim.state;
    if (this.coachKey(event)) return;
    if (this.padKey(event, true)) return;
    if (event.code === 'KeyP' || event.code === 'KeyO' || event.code === 'KeyM' || (s.paused && event.code === 'Digit3')) {
      event.preventDefault();
      if (event.repeat) return;
      if (event.code === 'KeyP') this.togglePause();
      else if (event.code === 'KeyO') this.toggleOverlay();
      else if (event.code === 'KeyM') this.goToMenu();
      else this.changeFormation(FORMATION_IDS[2] ?? DEFAULT_FORMATION);
      return;
    }
    const intent = KEY_BINDINGS[event.code];
    if (!intent) return;
    event.preventDefault();
    if (event.repeat) return;
    switch (intent) {
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
        this.togglePause();
        break;
      default:
        break;
    }
  }



  private onKeyUp(event: KeyboardEvent): void {
    this.padKey(event, false);
  }





  private handlePad(events: readonly PadEvent[]): void {
    for (const e of events) {
      if (e.type === 'move') {
        this.sendPadMove(e.x, e.y);
        continue;
      }
      this.logInput(`pad:${e.type}:${e.action}`);
      if (e.type === 'press') {
        if (this.padSource !== null) continue;
        this.padSource = 'touch';
        this.sim.command({ type: 'padPress', id: ++this.padIds, action: e.action });
      } else if (e.type === 'release') {
        if (this.padSource !== 'touch') continue;
        this.padSource = null;
        this.sim.command({ type: 'padRelease', id: ++this.padIds, action: e.action });
      } else {
        if (this.padSource === 'touch') this.padSource = null;
        this.sim.command({ type: 'padCancel', id: ++this.padIds, reason: e.reason });
      }
    }
  }

  /** Screen-space stick (length 0..1) to a pitch direction with the same length. */
  private sendPadMove(x: number, y: number): void {
    const m = Math.hypot(x, y);
    if (m < 1e-6) {
      this.sim.command({ type: 'padMove', x: 0, y: 0 });
      return;
    }
    const v = screenVectorToPitch(this.pitchLayout, { x: x / m, y: y / m });
    const l = Math.hypot(v.x, v.y) || 1;
    this.sim.command({ type: 'padMove', x: (v.x / l) * m, y: (v.y / l) * m });
  }

  /** Desktop keys for the pad scheme: arrows/WASD move; Space or J pass, K shoot, L slide tackle, I standing tackle. */
  private padKey(e: KeyboardEvent, down: boolean): boolean {
    const dirs: Record<string, readonly [number, number]> = {
      ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
    };
    const actions: Record<string, ActionButton> = { Space: 'pass', KeyJ: 'pass', KeyK: 'shoot', KeyL: 'slide', KeyI: 'tackle' };
    if (e.code === 'KeyF') return true;
    const d = dirs[e.code];
    if (d) {
      e.preventDefault();
      if (down && !this.sim.state.paused) this.padKeys.add(e.code);
      else this.padKeys.delete(e.code);
      let x = 0;
      let y = 0;
      for (const k of this.padKeys) {
        x += dirs[k]?.[0] ?? 0;
        y += dirs[k]?.[1] ?? 0;
      }
      const m = Math.hypot(x, y) || 1;
      this.sendPadMove(x / m, y / m);
      return true;
    }
    const a = actions[e.code];
    if (!a) return false;
    e.preventDefault();
    if (e.repeat || (down && this.sim.state.paused)) return true;
    const src = this.padSource;
    if (down) {
      if (src !== null) return true;
      this.padSource = { key: e.code };
    } else {
      if (src === null || src === 'touch' || src.key !== e.code) return true;
      this.padSource = null;
    }
    this.sim.command({ type: down ? 'padPress' : 'padRelease', id: ++this.padIds, action: a });
    return true;
  }

  private cancelInput(reason: string): void {
    if (!this.pad) return;
    this.handlePad(this.pad.controls.cancelAll(reason));
    if (this.padSource !== null) this.sim.command({ type: 'padCancel', id: ++this.padIds, reason });
    this.padSource = null;
    this.padKeys.clear();
    this.sim.command({ type: 'padMove', x: 0, y: 0 });
  }


  private togglePause(): void {
    if (this.navigating) return;
    if (this.team && this.team.phase !== 'playing') return;
    if (this.sim.state.pauseReasons.user) {
      this.sim.command({ type: 'resume' });
    } else {
      this.cancelInput('paused');
      this.sim.command({ type: 'pause' });
    }
    const user = this.sim.state.pauseReasons.user;
    this.coachOverlay.setSuspended(user);
    this.showPanel(user);
  }

  private changeFormation(id: FormationId): void {
    if (!this.sim.state.pauseReasons.user) return;
    if (this.sim.command({ type: 'setFormation', team: 'home', formation: id })) this.toast(`Formation ${id}: players walk to their new roles on resume`);
    this.showPanel(true);
  }

  private reset(): void {
    // A career fixture is played once: its report, result and evidence belong to that one game.
    if (this.careerMatch) {
      this.toast('Career matches count once and cannot be restarted');
      return;
    }
    this.cancelInput('reset');
    // A Lab reset replays the scenario exactly: same seed, same staging.
    this.sim.command(this.labId ? { type: 'reset', seed: this.labSeed } : { type: 'reset' });
    this.stageLab();
    this.stageTeamSituation();
    this.snapCamera();
    this.lastSeq = 0;
    this.newCoachSession();
    this.coachOverlay.setSuspended(false);
    this.showPanel(false);
    this.breakKey = '';
    this.toast(this.labId ? `Lab: ${match.LAB_SCENARIOS[this.labId].title}` : this.sim.state.clock ? 'New match — kick-off' : 'Sandbox reset');
  }

  private startSecondHalf(): void {
    if (this.navigating) return;
    this.cancelInput('second half');
    this.sim.command({ type: 'startSecondHalf' });
  }

  /** Half-time and full-time cards. Hidden under the pause panel and while the Coach summary is the full-time screen. */
  private updateBreak(): void {
    const s = this.sim.state;
    const coachSummary = this.coachOverlay.state === 'summary';
    const mode: '' | 'halftime' | 'fulltime' = s.pauseReasons.user ? '' : s.phase === 'halftime' ? 'halftime' : s.phase === 'fulltime' && !coachSummary ? 'fulltime' : '';
    const { width, height } = this.scale;
    const key = `${mode}:${width}x${height}:${s.score.home}-${s.score.away}`;
    if (key === this.breakKey) return;
    this.breakKey = key;
    this.breakMode = mode;
    const on = mode !== '';
    this.breakPanel.setVisible(on);
    this.breakTitle.setVisible(on);
    this.breakNote.setVisible(on);
    this.secondHalfButton.setEnabled(mode === 'halftime');
    this.playAgainButton.setEnabled(mode === 'fulltime' && !this.careerMatch);
    this.breakMenuButton.setEnabled(on);
    if (!on) return;
    const st = s.stats;
    const result = match.matchResult(s);
    const title = mode === 'halftime' ? 'Half-time' : result === 'win' ? 'Full-time — you win!' : result === 'draw' ? 'Full-time — a draw' : 'Full-time — you lose';
    const lines = [
      `Home ${s.score.home} – ${s.score.away} Away`,
      `Shots ${st.shots.home}–${st.shots.away} · Passes ${st.passes.home}–${st.passes.away} · Saves ${st.saves.home}–${st.saves.away}`,
      mode === 'halftime'
        ? 'Away kicks off the second half. Teams keep the same ends.'
        : this.collector
          ? 'Your game moments from this match are saved to Home Training.'
          : 'Play again for a new match, or go back to the menu.',
    ];
    const short = height < 360;
    const w = Math.min(width - 24, 460);
    this.breakTitle.setText(title).setFontSize(short ? 20 : 26);
    this.breakNote.setText(lines.join('\n')).setFontSize(short ? 11 : 13).setWordWrapWidth(w - 32, true);
    const titleH = short ? 30 : 40;
    const bh = short ? 38 : 44;
    const h = titleH + this.breakNote.height + bh + 34;
    const x = (width - w) / 2;
    const y = Math.max(EDGE, (height - h) / 2);
    this.breakRect = { x, y, width: w, height: h };
    const g = this.breakPanel;
    g.clear();
    g.fillStyle(PALETTE.ink, 0.35);
    g.fillRect(0, 0, width, height);
    g.fillStyle(PALETTE.ink, 1);
    g.fillRoundedRect(x, y + 5, w, h, 16);
    g.fillStyle(PALETTE.cream, 1);
    g.fillRoundedRect(x, y, w, h, 16);
    g.lineStyle(4, PALETTE.ink, 1);
    g.strokeRoundedRect(x, y, w, h, 16);
    this.breakTitle.setPosition(width / 2, y + titleH / 2 + 6);
    this.breakNote.setPosition(width / 2, y + titleH + 4);
    const bw = Math.min(180, Math.floor((w - 48) / 2));
    const by = y + titleH + this.breakNote.height + 14 + bh / 2;
    const primary = mode === 'halftime' ? this.secondHalfButton : this.playAgainButton;
    primary.resize(bw, bh, bw < 150 ? 14 : 17).setPosition(width / 2 - bw / 2 - 6, by);
    this.breakMenuButton.resize(bw, bh, bw < 150 ? 14 : 17).setPosition(width / 2 + bw / 2 + 6, by);
  }

  private toggleOverlay(): void {
    this.overlayOn = !this.overlayOn;
    this.overlayButton.setLabel(`Dev overlay: ${this.overlayOn ? 'on' : 'off'}`);
  }

  private goToMenu(): void {
    if (this.navigating) return;
    this.navigating = true;
    this.cancelInput('navigation');
    this.coachDirector?.abandon(this.sim);
    if (this.team) {
      this.scene.start(SceneKeys.Career, { open: 'team', ...(this.returnTo === 'story' ? { returnTo: 'story' as const } : {}) });
      return;
    }
    const reportId = this.reportMatchId;
    if (reportId && this.reportSaving) {
      const next = this.returnTo === 'story' ? 'story' : 'start';
      void this.reportSaving.then((saved) => {
        if (saved) {
          this.scene.start(SceneKeys.Report, { matchId: reportId, next });
          return;
        }
        // Keep the finished report and let the player retry; never leave without it.
        this.navigating = false;
        this.commitReport();
        this.toast('Could not save the match report. Tap Menu to try again.');
      });
      return;
    }
    this.scene.start(this.returnTo === 'story' ? SceneKeys.Story : SceneKeys.Start, this.returnTo === 'story' ? { resume: true } : undefined);
  }

  /** Builds the Match Report once at full time from the ledger and saves it (idempotent by match id). */
  private saveReport(): void {
    const ledger = this.ledger;
    const meta = this.reportMeta;
    const store = this.careerStore;
    if (!ledger || !meta || !store || this.reportSaving) return;
    const s = this.sim.state;
    const names: Record<string, string> = {};
    for (const t of Object.values(TOURNAMENTS)) for (const [id, info] of Object.entries(t.teams)) names[id] = info.name;
    const matchId = this.resultKey ?? this.careerSession;
    // The sim always plays Batavia on its home side; the report shows the fixture's real venue.
    const away = this.returnTo === 'story' && this.venue === 'away';
    const report = buildReport(
      {
        matchId: matchId.slice(0, 64),
        week: meta.week,
        competition: this.returnTo === 'story' ? this.competition : 'Friendly',
        home: clubDisplayName(away ? this.opponent : 'batavia', names),
        away: clubDisplayName(away ? 'batavia' : this.opponent, names),
        score: away ? { home: s.score.away, away: s.score.home } : { home: s.score.home, away: s.score.away },
        playerName: meta.name,
        position: meta.position,
        minutes: MATCH_TUNING.match.displayHalfMinutes * 2,
      },
      ledger.finish(),
      this.finalContribution(ledger.playerId),
    );
    this.reportMatchId = report.matchId;
    this.reportPending = report;
    this.commitReport();
  }

  /** Full-time contribution; left out (shown as not tracked) if any event left the log unread. */
  private finalContribution(me: Id) {
    const c = this.contrib;
    if (!c) return undefined;
    const s = this.sim.state;
    c.observe(s, s.events);
    if (c.missed > 0) return undefined;
    return matchContribution(c.of(me), c.table(MATCH_PLAYER_IDS));
  }

  /** Saves the finished report; resolves false on a failed commit so Menu can retry instead of losing it. */
  private commitReport(): void {
    const store = this.careerStore;
    const report = this.reportPending;
    if (!store || !report) return;
    this.reportSaving = store.dispatch({ type: 'matchReport', report }).then((out) => out.ok, () => false);
  }

  private handleResize(size: Phaser.Structs.Size): void {
    this.cancelInput('orientation change');
    this.layout(size.width, size.height);
    if (this.pad) this.handlePad(this.pad.layout(size.width, size.height));
    if (this.team) this.showTeamButtons();
    this.renderFrame(0);
  }

  // ---- Team Training ---------------------------------------------------------------------------

  private team: {
    week: number;
    look: ProtagonistLook | null;
    situations: TeamTrainingSituation[];
    index: number;
    results: SituationResult[];
    observer: SituationObserver | null;
    store: CareerStore | null;
    attrs: ReturnType<typeof matchAttrsFromCareer>;
    phase: 'loading' | 'playing' | 'review' | 'saving' | 'done';
    message: string;
    half: 'own' | 'attack';
    last: SituationResult | null;
  } | null = null;
  private ttButtons: Button[] = [];

  private startTeamTraining(on: boolean, params: URLSearchParams): void {
    this.team = null;
    if (!on) return;
    const debugSecs = Number(params.get('ttSeconds'));
    const shorten = shouldExposeDebug(window.location) && Number.isFinite(debugSecs) && debugSecs >= 1;
    const team = { week: 0, look: null as ProtagonistLook | null, situations: [] as TeamTrainingSituation[], index: 0, results: [] as SituationResult[], observer: null, store: null as CareerStore | null, attrs: {}, phase: 'loading' as 'loading' | 'playing' | 'review' | 'saving' | 'done', half: 'attack' as 'own' | 'attack', last: null as SituationResult | null, message: '' };
    this.team = team;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => team.store?.close());
    this.coachPose = COACH_POSE.walk;
    this.toast('Loading Team Training…');
    void CareerStore.open().then(async (store) => {
      if (!this.sys.isActive() || this.team !== team) {
        store.close();
        return;
      }
      team.store = store;
      const save = await store.load();
      if (!this.sys.isActive() || this.team !== team) return;
      if (!save.player) {
        team.phase = 'done';
        team.message = 'Create your player first.';
        this.toast(team.message, 60_000, true);
        return;
      }
      team.week = save.week;
      team.attrs = matchAttrsFromCareer(save.player.attributes);
      team.situations = selectSituations(save.player.position, save.week).map((x) => (shorten ? { ...x, seconds: Math.min(x.seconds, debugSecs) } : x));
      if (save.teamTraining.some((r) => r.week === save.week)) team.message = `Week ${save.week} is already counted; this is practice only.`;
      const gender = save.player.gender;
      team.look = gender === 'boy' || gender === 'girl' ? gender : null;
      this.stageTeamSituation();
    });
  }

  /** Stage the current situation from scratch (also on Reset, which replays it without a result). */
  private stageTeamSituation(prefix = ''): void {
    const t = this.team;
    if (!t || t.phase === 'done' || t.phase === 'saving') return;
    const sit = t.situations[t.index];
    if (!sit) return;
    t.phase = 'playing';
    t.last = null;
    const fx = sit.fixture;
    const x0 = (fx.carrier ? fx.place[fx.carrier]?.[0] : fx.ball?.[0]) ?? MATCH_TUNING.pitch.length / 2;
    t.half = x0 < MATCH_TUNING.pitch.length / 2 ? 'own' : 'attack';
    if (this.sim.state.pauseReasons.user) this.sim.command({ type: 'resume' });
    this.showTeamButtons();
    this.cancelInput('team training');
    this.sim.command({ type: 'reset', seed: 11 + t.index });
    this.sim.arrange((s) => match.stageFixture(s, sit.fixture, MATCH_TUNING.pitch));
    // The saved boy/girl is the player this drill puts you in control of, not a fixed formation slot.
    if (t.look && this.sim.state.players[this.sim.state.controlledId].team === 'home') this.setRosterLooks({ id: this.sim.state.controlledId, look: t.look });
    this.sim.setPlayerAttrs(this.sim.state.controlledId, t.attrs);
    t.observer = new SituationObserver(sit, this.sim.state);
    this.snapCamera();
    this.lastSeq = 0;
    this.coachPose = COACH_POSE.instruct;
    this.toast(`${prefix}Attempt ${t.index + 1}/${t.situations.length}: ${sit.title}. ${sit.goal}`, 4500, true);
  }

  private updateTeamTraining(): void {
    const t = this.team;
    if (!t || t.phase !== 'playing' || !t.observer) return;
    // The drill area is one half: play that leaves it ends the attempt (out of the drill area).
    const half = MATCH_TUNING.pitch.length / 2;
    const bx = this.sim.state.ball.pos.x;
    const left = t.half === 'own' ? bx > half + 1 : bx < half - 1;
    if (!t.observer.step(this.sim.state) && !left) return;
    const r = t.observer.result();
    const sit = t.situations[t.index]!;
    t.observer = null;
    t.last = r;
    // The attempt is over: hold play, show one observed point and one cue, and let the player choose.
    t.phase = 'review';
    this.cancelInput('team training result');
    if (!this.sim.state.pauseReasons.user) this.sim.command({ type: 'pause' });
    this.coachPose = r.score >= 0.7 ? COACH_POSE.encourage : r.score < 0.4 ? COACH_POSE.correct : COACH_POSE.observe;
    this.toast(`Attempt ${t.index + 1}/${t.situations.length} · ${Math.round(r.score * 100)}%\n${r.notes[0] ?? 'Attempt finished.'}\nNext: ${sit.goal}`, 600_000, true);
    this.showTeamButtons();
  }

  /** Retry replays the same attempt; its earlier result is dropped, never added. */
  private retryTeamAttempt(): void {
    const t = this.team;
    if (!t || t.phase !== 'review') return;
    this.stageTeamSituation('Retry. ');
  }

  private continueTeamTraining(): void {
    const t = this.team;
    if (!t) return;
    if (t.phase === 'done') return this.goToMenu();
    if (t.phase !== 'review' || !t.last) return;
    t.results.push(t.last);
    t.last = null;
    t.index += 1;
    if (t.index < t.situations.length) return this.stageTeamSituation();
    t.phase = 'saving';
    this.showTeamButtons();
    this.coachPose = COACH_POSE.clipboard;
    this.toast('Saving Team Training…', 60_000, true);
    const store = t.store;
    if (!store) return;
    // One transaction commits completion and credit together; "Complete" is shown only after it resolves.
    void store.dispatch({ type: 'teamTraining', week: t.week, results: t.results }).then((out) => {
      if (this.team !== t || !this.sys.isActive()) return;
      if (!out.ok) {
        // Keep the three results: Finish tries the same save again.
        t.last = t.results.pop() ?? null;
        t.index -= 1;
        t.phase = 'review';
        t.message = out.error;
        this.toast(`${out.error} Tap Finish to try saving again.`, 600_000, true);
        return this.showTeamButtons();
      }
      t.phase = 'done';
      t.message = out.message;
      this.coachPose = out.ok ? COACH_POSE.point : COACH_POSE.clipboard;
      this.toast(`${out.ok ? 'Complete. ' : ''}${t.message}`, 600_000, true);
      this.showTeamButtons();
    });
  }

  private showTeamButtons(): void {
    const t = this.team;
    const [retry, cont] = this.ttButtons;
    if (!retry || !cont) return;
    const review = t?.phase === 'review';
    const done = t?.phase === 'done';
    retry.setVisible(review).setEnabled(review);
    cont.setVisible(review || done).setEnabled(review || done);
    cont.setLabel(done ? 'Finish' : t && t.index + 1 >= t.situations.length ? 'Finish' : 'Continue');
    const { width, height } = this.scale;
    const y = Math.round(height * 0.68);
    retry.setPosition(width / 2 - 78, y);
    cont.setPosition(done ? width / 2 : width / 2 + 78, y);
  }

  private startCareer(on: boolean): void {
    this.collector = null;
    this.careerItems = [];
    this.careerBatch = 0;
    this.careerRecorded = 0;
    this.careerMissedSent = 0;
    this.careerCoachSent = false;
    this.careerStore = null;
    this.ledger = null;
    this.contrib = null;
    this.reportMeta = null;
    this.reportMatchId = null;
    this.reportSaving = null;
    this.reportPending = null;
    this.careerMatch = on;
    if (!on) return;
    this.careerSession = `m-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
    void CareerStore.open().then(async (store) => {
      if (!this.sys.isActive()) {
        store.close();
        return;
      }
      const save = await store.load();
      if (!save.player || !this.sys.isActive()) {
        store.close();
        return;
      }
      this.careerStore = store;
      this.sim.setPlayerAttrs(CAREER_SLOT[save.player.position], matchAttrsFromCareer(save.player.attributes));
      const gender = save.player.gender;
      if (gender === 'boy' || gender === 'girl') this.setRosterLooks({ id: CAREER_SLOT[save.player.position], look: gender });
      this.collector = new EvidenceCollector(CAREER_SLOT[save.player.position], MATCH_TUNING.pitch);
      this.ledger = new MatchLedger(CAREER_SLOT[save.player.position]);
      this.contrib = new ContributionTracker();
      this.reportMeta = { name: save.player.name, position: save.player.position, week: save.week };
      this.careerFlushAt = this.sim.state.simTime + CAREER_FLUSH_SECONDS;
    });
  }

  private observeCareer(): void {
    const c = this.collector;
    if (!c) return;
    const s = this.sim.state;
    this.ledger?.observe(s, s.events);
    this.contrib?.observe(s, s.events);
    this.careerItems.push(...c.observe(s, s.events));
    if (s.simTime >= this.careerFlushAt) {
      this.careerFlushAt = s.simTime + CAREER_FLUSH_SECONDS;
      void this.flushCareer(false);
    }
  }

  /** Sends pending evidence as one idempotent batch. On leaving, adds the Coach answers once. */
  private flushCareer(final: boolean): Promise<void> {
    const store = this.careerStore;
    const c = this.collector;
    if (!store || !c) return Promise.resolve();
    const items = this.careerItems;
    this.careerItems = [];
    if (final && !this.careerCoachSent && this.coachDirector) {
      this.careerCoachSent = true;
      items.push(...coachEvidence(this.coachDirector.entries));
    }
    const missed = c.missed - this.careerMissedSent;
    this.careerMissedSent = c.missed;
    if (items.length === 0 && missed === 0) return Promise.resolve();
    this.careerRecorded += items.length;
    return store.dispatch({ type: 'evidence', batchId: `${this.careerSession}-${++this.careerBatch}`, items, missed }).then(() => undefined);
  }

  /** Cosmetic roster looks (stable per side + slot); the career player shows the chosen boy/girl presentation. */
  private setRosterLooks(protagonist: { id: Id; look: ProtagonistLook } | null): void {
    const slot = protagonist ? this.sim.state.players[protagonist.id].slot : -1;
    // Team Training: Batavia's blue training kit against teammates in the orange match kit.
    const training = this.team !== null;
    const home = sideLooks('home', protagonist ? { slot, look: protagonist.look } : null, { club: 'batavia', kit: training ? 'training' : 'match' });
    const away = sideLooks('away', null, { club: training ? 'batavia' : this.opponent, kit: 'match' });
    this.looks = Object.fromEntries(MATCH_PLAYER_IDS.map((id) => {
      const p = this.sim.state.players[id];
      return [id, (p.team === 'home' ? home : away)[p.slot]!];
    })) as Record<Id, RosterLook>;
    this.art?.ensure(Object.values(this.looks).map((l) => l.set));
  }

  /** Pick a frame from what the sim says the player is doing. Read-only: the sim never sees art state. */
  private artFrame(id: Id, L: PitchLayout, simDt: number): readonly [PoseKind, number, number] {
    const s = this.sim.state;
    const p = s.players[id];
    const speed = Math.hypot(p.vel.x, p.vel.y);
    const pad = s.pad;
    let kind: PoseKind = speed > 0.6 ? 'run' : 'idle';
    let heading: Vec2 | null = speed > 0.6 ? p.vel : id === s.controlledId && pad.actor === id ? pad.facing : null;
    if (pad.actor === id && (pad.phase === 'slideStart' || pad.phase === 'slideActive' || pad.phase === 'slideRecovery')) {
      kind = 'slide';
      heading = pad.slideDir ?? heading;
    } else if (pad.actor === id && (pad.phase === 'tackleStart' || pad.phase === 'tackleActive')) {
      // A standing tackle is a step-in poke on the feet: the kick pose, along the tackle.
      kind = 'kick';
      heading = pad.slideDir ?? heading;
    } else {
      for (let i = s.events.length - 1; i >= 0; i--) {
        const e = s.events[i]!;
        if (s.simTime - e.at > 0.5) break;
        if (e.by !== id) continue;
        if (p.isKeeper && (e.type === 'saved' || e.type === 'parried')) { kind = 'dive'; break; }
        if (s.simTime - e.at <= 0.25 && (e.type === 'pass' || e.type === 'shot' || e.type === 'distributed' || e.type === 'slide')) {
          kind = e.type === 'slide' ? 'slide' : 'kick';
          break;
        }
      }
    }
    if (heading && Math.hypot(heading.x, heading.y) > 1e-6) {
      const v = pitchVectorToScreen(L, heading);
      this.artDir[id] = dirFromScreen(v.x, v.y);
    }
    this.artDist[id] = (this.artDist[id] + speed * simDt) % 1000;
    return [kind, this.artDir[id], Math.floor(this.artDist[id] / 0.55)];
  }

  private handleShutdown(): void {
    for (const id of ['goal-banner', 'referee-foul']) if (this.textures.exists(artTextureKey(id))) this.textures.remove(artTextureKey(id));
    this.eventArt = null;
    if (this.textures.exists(REFEREE_KEY)) this.textures.remove(REFEREE_KEY);
    this.offsidePopup.reset();
    this.refImg = null;
    this.refCaption = null;
    this.debugStage = null;
    this.art?.destroy();
    const store = this.careerStore;
    const saving = this.reportSaving ?? Promise.resolve();
    void Promise.all([this.flushCareer(true), saving]).finally(() => store?.close());
    this.careerStore = null;
    this.collector = null;
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
    this.game.canvas.removeEventListener('pointerdown', this.onDomPointerDown);
    this.game.canvas.removeEventListener('pointerup', this.onDomPointerUp);
    this.game.canvas.removeEventListener('lostpointercapture', this.onLostCapture);
    window.removeEventListener('blur', this.onWindowBlur);
    this.pad?.destroy();
    this.pad = null;
  }

  /**
   * Goal banner / referee art bound to the sim's own stoppage: shown only for a confirmed goal or a
   * foul decision, counted once per stoppage object, hidden when play restarts. Presentation only.
   */
  /**
   * `offside`: H6 has just passed to H9, who received it beyond the second-last defender (the rules engine makes the
   * call). `offside-position`: H9 stands in the same place but the user-controlled H8 keeps the ball, so no call.
   */
  private stageOffside(setup: 'offside' | 'offside-position'): void {
    this.debugStage = null;
    this.sim.arrange((s) => {
      const put = (id: match.MatchPlayerId, x: number, y: number) => {
        s.players[id].pos = { x, y };
        s.players[id].vel = { x: 0, y: 0 };
      };
      for (const id of match.AWAY_IDS) put(id, 50, 10);
      put('A1', 74, 25);
      put('A2', 60, 10);
      put('H9', 66, 25);
      if (setup === 'offside') {
        put('H6', 45, 25);
        this.sim.referee.notePass(s.players.H6, s.players, { x: 45, y: 25 });
        s.ball.owner = null;
        s.ball.pos = { x: 65, y: 25 };
        s.ball.vel = { x: 1.5, y: 0 };
        s.ball.lastTouch = 'home';
        s.ball.kick = { by: 'H6', team: 'home', kind: 'pass', at: s.simTime - 1, target: { x: 66, y: 25 }, receiver: 'H9' };
      } else {
        put('H8', 30, 25);
        s.ball.owner = 'H8';
        s.ball.pos = { x: 30.6, y: 25 };
        s.ball.vel = { x: 0, y: 0 };
      }
    });
  }

  /** Assistant-referee popup for a confirmed offside call: above play, below HUD/pads/dialogue; tap to dismiss. */
  private showOffsidePopup(st: match.Stoppage | null, active: boolean, width: number, height: number): void {
    const f = this.offsidePopup.update(st, !!st, this.sim.state.phaseTime * 1000, this.reducedMotion);
    const hide = () => {
      this.refImg?.setVisible(false);
      this.refCaption?.setVisible(false);
    };
    if (!f.visible || !active || !REFEREE_URL) return hide();
    if (!this.textures.exists(REFEREE_KEY)) {
      if (!this.load.isLoading()) {
        this.load.image(REFEREE_KEY, REFEREE_URL);
        this.load.start();
      }
      return hide();
    }
    if (!this.refImg) {
      this.refImg = this.add.image(0, 0, REFEREE_KEY).setOrigin(0.5, 0).setDepth(6001).setName('offside-referee').setInteractive({ useHandCursor: true });
      this.refImg.on('pointerdown', () => {
        this.offsidePopup.dismiss();
        hide();
      });
    }
    if (!this.refCaption)
      this.refCaption = this.add.text(0, 0, 'OFFSIDE!', { fontFamily: FONT_FAMILY, color: CSS.cream, fontStyle: 'bold' }).setOrigin(0.5, 0).setDepth(6001).setStroke(CSS.ink, 4).setResolution(textResolution()).setName('offside-caption');
    // Box: under the HUD row and the minimap, above the centre restart banner, clear of the corner pads.
    const portrait = orientationOf({ width, height }) === 'portrait';
    const mm = this.minimapRect();
    const top = Math.max(EDGE + HUD_HEIGHT + 8, portrait ? mm.y + mm.height + 8 : EDGE + HUD_HEIGHT + 8);
    const captionH = 22;
    // Portrait: stop above the centre restart banner. Landscape: the left column runs down to the joystick.
    const stick = this.pad?.controls.currentLayout.stick;
    const bottom = portrait ? height / 2 - 26 : (stick ? stick.y - stick.r : height - 48) - 8;
    const boxH = Math.max(40, Math.min(bottom - top - captionH, height * (portrait ? 0.3 : 0.55)));
    const left = portrait ? EDGE : EDGE;
    const right = portrait ? width - EDGE : mm.x - 8;
    const boxW = Math.max(40, Math.min(right - left, width * (portrait ? 0.5 : 0.3)));
    const k = Math.min(boxW / this.refImg.width, boxH / this.refImg.height);
    const w = this.refImg.width * k;
    const cx = portrait ? width - EDGE - w / 2 : left + 4 + w / 2;
    const dir = portrait ? 1 : -1;
    const x = cx + dir * f.slide * (w + EDGE * 2);
    this.refImg.setScale(k).setPosition(x, top).setAlpha(f.alpha).setVisible(true);
    this.refCaption.setFontSize(Math.round(Math.max(13, Math.min(18, w * 0.14)))).setPosition(x, top + this.refImg.height * k + 2).setAlpha(f.alpha).setVisible(true);
  }

  private showEventArt(st: { reason: string } | null, width: number, height: number): void {
    if (!st) {
      this.eventArt?.setVisible(false);
      return;
    }
    const id = st.reason === 'goal' ? 'goal-banner' : 'referee-foul';
    if (this.eventArtFor !== st) {
      this.eventArtFor = st;
      this.eventArtShown[st.reason === 'goal' ? 'goal' : 'foul']++;
    }
    const key = artTextureKey(id);
    if (!this.textures.exists(key)) {
      const url = artUrl(id);
      if (url && !this.load.isLoading()) {
        this.load.image(key, url);
        this.load.start();
      }
      this.eventArt?.setVisible(false);
      return;
    }
    if (!this.eventArt) this.eventArt = this.add.image(0, 0, key).setDepth(6001);
    if (this.eventArt.texture.key !== key) this.eventArt.setTexture(key);
    const box = id === 'goal-banner' ? { w: width * 0.7, h: height * 0.32 } : { w: width * 0.32, h: height * 0.38 };
    const k = Math.min(box.w / this.eventArt.width, box.h / this.eventArt.height);
    const y = id === 'goal-banner' ? height / 2 - (this.eventArt.height * k) / 2 - 18 : height / 2 - (this.eventArt.height * k) / 2 - 22;
    this.eventArt.setScale(k).setPosition(width / 2, Math.max(this.eventArt.height * k * 0.5 + 4, y)).setVisible(true);
  }

  // ---- sim events ----------------------------------------------------------------------------

  private consumeEvents(): void {
    for (const e of this.sim.state.events) {
      if (e.seq <= this.lastSeq) continue;
      this.lastSeq = e.seq;
      switch (e.type) {
        case 'pass':
          break;
        case 'shot':
          if (e.detail.startsWith('quick')) this.toast('Quick shot!');
          break;
        case 'standing':
          if (e.by === this.sim.state.controlledId && e.detail.startsWith('won')) this.toast('Tackle won — get on it!');
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
        case 'control':
          // A stale switch (e.g. kickoff before Lab staging) must not name a player the user no longer controls.
          if (e.by && e.by === this.sim.state.controlledId) this.toast(`You control ${e.by}`);
          break;
        case 'formation':
          break;
        case 'halftime':
          this.cancelInput('half-time');
          break;
        case 'fulltime':
          this.cancelInput('full-time');
          if (this.collector) void this.flushCareer(false);
          // The report takes the fixture key before recordResult() consumes it.
          this.saveReport();
          void this.recordResult();
          break;
        case 'secondHalf':
          this.toast('Second half — away kick off');
          break;
        default:
          break;
      }
    }
  }

  /** Full-time score for a story league fixture, written once (first write wins). Leaving early writes nothing. */
  private async recordResult(): Promise<void> {
    const key = this.resultKey;
    if (!key) return;
    this.resultKey = null;
    const { home, away } = this.sim.state.score;
    const { StoryStore } = await import('../game/story/store');
    const store = await StoryStore.open();
    if ((await store.getRecord(`matchresult:${key}`)) === undefined) await store.putRecord(`matchresult:${key}`, { home, away });
    store.close();
  }

  private toast(message: string, ms = 1500, priority = false): void {
    const now = performance.now();
    if (!priority && this.toastPriorityUntil > now) return;
    if (priority) this.toastPriorityUntil = now + ms;
    this.toastMessage = message;
    this.toastUntil = performance.now() + ms;
  }

  // ---- layout + drawing -----------------------------------------------------------------------

  private insets(width: number, height: number): Insets {
    const portrait = orientationOf({ width, height }) === 'portrait';
    return portrait
      ? { top: EDGE + HUD_HEIGHT * 2 + 16, right: EDGE, bottom: 48, left: EDGE }
      : // Landscape: the follow camera fills the screen; the compact HUD floats over the pitch.
        { top: 0, right: 0, bottom: 0, left: 0 };
  }

  /**
   * Visible region (yards) and camera-centre limits for this viewport. The span comes from the fixed
   * fixed close ball-camera view (CAMERA_VIEW), so it never compounds. Limits keep goals and a run-off margin
   * in view; physics boundaries are separate and unaffected.
   */
  /** Team Training: a closer camera held on the drill's half; world sizes, speeds and collision are unchanged. */
  private frame(): ReturnType<MatchScene['frameFull']> {
    const f = this.frameFull();
    const t = this.team;
    if (!t) return f;
    const half = U11_9V9_PITCH.length / 2;
    const [h0, h1] = t.half === 'own' ? [-3, half + 3] : [half - 3, U11_9V9_PITCH.length + 3];
    let minX = Math.max(f.bounds.minX, h0 + f.len / 2);
    let maxX = Math.min(f.bounds.maxX, h1 - f.len / 2);
    if (minX > maxX) minX = maxX = (h0 + h1) / 2;
    return { ...f, bounds: { ...f.bounds, minX, maxX } };
  }

  private frameFull(): {
    portrait: boolean;
    insets: Insets;
    len: number;
    cross: number;
    bounds: CameraBounds;
  } {
    const { width, height } = this.scale;
    const portrait = orientationOf({ width, height }) === 'portrait';
    const insets = this.insets(width, height);
    const P = U11_9V9_PITCH;
    if (!portrait) {
      // Landscape: an angled follow camera; the compact HUD floats over the pitch.
      const available = Math.max(1, width - insets.left - insets.right);
      const len = viewSpan('landscape') / (this.team ? TEAM_TRAINING_ZOOM : 1);
      const availH = Math.max(1, height - insets.top - insets.bottom);
      const hv = Math.min(P.width + 6, (len * availH) / (available * SIDELINE_SQUASH));
      // Run-off margins keep a touchline player clear of the floating HUD (top) and the tip line (bottom).
      const yardsPerPx = hv / availH;
      const top = Math.max(3, (HUD_HEIGHT + EDGE + 12) * yardsPerPx);
      const bottom = Math.max(3, 34 * yardsPerPx);
      const fullY = hv >= P.width + top + bottom - 1e-6;
      return {
        portrait,
        insets,
        len,
        cross: hv,
        bounds: {
          minX: len / 2 - 3,
          maxX: P.length + 3 - len / 2,
          minY: fullY ? P.width / 2 : hv / 2 - top,
          maxY: fullY ? P.width / 2 : P.width + bottom - hv / 2,
        },
      };
    }
    // Portrait: the close ball-camera width across the pitch; the visible length fills the height.
    const available = Math.max(1, height - insets.top - insets.bottom);
    const availW = Math.max(1, width - insets.left - insets.right);
    const cross = Math.min(P.width + 4, viewSpan('portrait') / (this.team ? TEAM_TRAINING_ZOOM : 1));
    const len = Math.min(P.length + 6, (cross * available) / availW);
    const fullX = len >= P.length + 6 - 1e-6;
    return {
      portrait,
      insets,
      len,
      cross,
      bounds: {
        minX: fullX ? P.length / 2 : len / 2 - 3,
        maxX: fullX ? P.length / 2 : P.length + 3 - len / 2,
        minY: cross / 2 - 2,
        maxY: P.width + 2 - cross / 2,
      },
    };
  }

  private computeLayout(): void {
    const { width, height } = this.scale;
    const f = this.frame();
    const c = clampFocus({ x: this.camX, y: this.camY }, f.bounds);
    this.viewLen = f.len;
    this.viewCross = f.cross;
    this.pitchLayout = fitRegion(
      { width, height },
      {
        x: c.x - f.len / 2,
        y: c.y - f.cross / 2,
        width: f.len,
        height: f.cross,
      },
      f.insets,
      0,
      f.portrait ? 1 : SIDELINE_SQUASH,
    );
    // Low camera: perspective anchored on the camera focus (the ball), scaled to the view height.
    const availH = Math.max(1, height - f.insets.top - f.insets.bottom);
    this.pitchLayout = withPerspective(this.pitchLayout, toScreen(this.pitchLayout, c), CAMERA_VIEW.perspective / (availH / 2));
  }

  /** On-screen part of the pitch (the follow camera crops it). */
  private viewRect(): Rect {
    const { width, height } = this.scale;
    const r = rectToScreen(this.pitchLayout, { x: 0, y: 0, width: U11_9V9_PITCH.length, height: U11_9V9_PITCH.width });
    const x0 = Math.max(0, r.x);
    const y0 = Math.max(0, r.y);
    const x1 = Math.min(width, r.x + r.width);
    const y1 = Math.min(height, r.y + r.height);
    return { x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) };
  }

  /** Small whole-pitch overview: corner of the screen, oriented like the main view. */
  private minimapRect(): Rect {
    const { width, height } = this.scale;
    const portrait = orientationOf({ width, height }) === 'portrait';
    const P = U11_9V9_PITCH;
    if (portrait) {
      const h = HUD_HEIGHT + 4;
      return { x: EDGE, y: EDGE + HUD_HEIGHT + 8, width: (h * P.width) / P.length, height: h };
    }
    const w = Phaser.Math.Clamp(width * 0.13, 72, 120);
    const h = (w * P.width) / P.length;
    // The four-button cluster owns the bottom-right corner, so the minimap moves under the HUD row.
    if (this.pad) return { x: width - EDGE - w, y: EDGE + HUD_HEIGHT + 8, width: w, height: h };
    return { x: width - EDGE - w, y: height - EDGE - h - 14, width: w, height: h };
  }

  private drawMinimap(g: Phaser.GameObjects.Graphics): void {
    const s = this.sim.state;
    const P = U11_9V9_PITCH;
    const m = this.minimapRect();
    const portrait = m.height > m.width;
    const at = (p: Vec2): Vec2 =>
      portrait
        ? { x: m.x + (p.y / P.width) * m.width, y: m.y + (1 - p.x / P.length) * m.height }
        : { x: m.x + (p.x / P.length) * m.width, y: m.y + (p.y / P.width) * m.height };
    g.fillStyle(PALETTE.grassDark, 0.85).fillRect(m.x, m.y, m.width, m.height);
    g.lineStyle(1, PALETTE.line, 0.9).strokeRect(m.x, m.y, m.width, m.height);
    const h0 = at({ x: P.length / 2, y: 0 });
    const h1 = at({ x: P.length / 2, y: P.width });
    g.lineBetween(h0.x, h0.y, h1.x, h1.y);
    const { width, height } = this.scale;
    const c0 = fromScreen(this.pitchLayout, { x: 0, y: 0 });
    const c1 = fromScreen(this.pitchLayout, { x: width, y: height });
    const v0 = at({ x: Phaser.Math.Clamp(Math.min(c0.x, c1.x), 0, P.length), y: Phaser.Math.Clamp(Math.min(c0.y, c1.y), 0, P.width) });
    const v1 = at({ x: Phaser.Math.Clamp(Math.max(c0.x, c1.x), 0, P.length), y: Phaser.Math.Clamp(Math.max(c0.y, c1.y), 0, P.width) });
    g.lineStyle(1, PALETTE.mustard, 1).strokeRect(Math.min(v0.x, v1.x), Math.min(v0.y, v1.y), Math.abs(v1.x - v0.x), Math.abs(v1.y - v0.y));
    for (const id of MATCH_PLAYER_IDS) {
      const p = s.players[id];
      const q = at(p.pos);
      g.fillStyle(p.team === 'home' ? PALETTE.tomato : PALETTE.blue, 1).fillCircle(q.x, q.y, id === s.controlledId ? 2.6 : 1.8);
    }
    const b = at(s.ball.pos);
    g.fillStyle(PALETTE.cream, 1).fillCircle(b.x, b.y, 2.2);
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
    // Two-line score + Coach counter is centred on the HUD row; keep landscape Coach cards below it.
    this.coachOverlay?.setTopInset(Math.ceil(y1 + Math.max(HUD_HEIGHT / 2, 20) + 6));
    this.scoreText.setFontSize(compact ? 13 : 15).setPosition(portrait ? width - EDGE - (width - EDGE * 2 - bw * 2 - 6) / 2 + 0 : width / 2, y1);
    if (portrait) this.scoreText.setOrigin(1, 0.5).setPosition(width - EDGE, y1);
    else this.scoreText.setOrigin(0.5, 0.5);
    // Team Training: the objective wraps in the space right of Back/Pause, never under them.
    this.scoreText.setWordWrapWidth(this.team ? (portrait ? Math.max(120, width - EDGE * 3 - bw * 2) : Math.max(160, width - EDGE * 4 - bw * 4)) : 10_000, true);
    const help = portrait ? HELP_PAD.replaceAll('  |  ', '\n') : HELP_PAD;
    // Landscape keeps the tip line clear of the bottom-right minimap.
    const mmLeft = orientationOf({ width, height }) === 'portrait' ? width : this.minimapRect().x;
    const tipW = Math.max(120, mmLeft - EDGE * 2);
    this.helpText.setText(help).setFontSize(compact ? 10 : 11).setWordWrapWidth(tipW, true).setPosition(EDGE + tipW / 2, height - 4);
    if (this.team) this.helpText.setVisible(false);
    this.bannerText.setFontSize(compact ? 18 : 24).setWordWrapWidth(width - 40, true);
    this.panelNote.setWordWrapWidth(Math.min(380, width - 60), true);
    this.computeLayout();
    this.showPanel(this.sim.state.pauseReasons.user && (!this.team || this.team.phase === 'playing'));
    this.coachOverlay.setSuspended(this.sim.state.pauseReasons.user);
  }

  private showPanel(visible: boolean): void {
    const items = [this.resumeButton, this.resetButton, this.panelMenuButton, this.overlayButton, ...FORMATION_IDS.map((id) => this.formationButtons[id]), ...this.padPrefButtons];
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
    this.panelTitle.setText(this.sim.state.clock ? `Paused — ${match.clockLabel(this.sim.state.clock)}` : 'Paused — Sandbox').setFontSize(height < 360 ? 20 : 26);
    this.panelNote.setText(`Home formation: ${cur}. Changes keep every player where he is; they move to new roles when you resume. Opponent: ${this.sim.state.formations.away}.`).setFontSize(height < 360 ? 11 : 12);
    const titleH = height < 360 ? 30 : 40;
    const noteH = this.panelNote.height;
    const h = titleH + noteH + (this.padPrefButtons.length ? 4 : 3) * (bh + 10) + 26;
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
    const P = this.pad?.preferences;
    this.padPrefButtons.forEach((b, i) => b.resize(bw - 8, bh, font).setPosition(col(i), row(3)));
    if (P) {
      this.padPrefButtons[0]?.setLabel(`Size ${Math.round(P.size * 100)}%`);
      this.padPrefButtons[1]?.setLabel(`Opacity ${Math.round(P.opacity * 100)}%`);
    }
  }

  private cyclePadPref(kind: 'size' | 'opacity'): void {
    if (!this.pad) return;
    const P = this.pad.preferences;
    const steps = kind === 'size' ? [0.85, 1, 1.15, 1.3] : [0.35, 0.55, 0.75, 0.9];
    const next = steps[(steps.findIndex((v) => Math.abs(v - P[kind]) < 1e-3) + 1) % steps.length] ?? 1;
    this.handlePad(this.pad.setPrefs({ ...P, [kind]: next }, this.scale.width, this.scale.height));
    this.showPanel(true);
    this.pad.draw();
  }

  /** Accessible reset: restores default size, opacity and dead zone; career saves are untouched. */
  private resetPadPrefs(): void {
    if (!this.pad) return;
    this.handlePad(this.pad.setPrefs(null, this.scale.width, this.scale.height));
    this.showPanel(true);
    this.pad.draw();
    this.toast('Controls reset to defaults');
  }

  private drawField(): void {
    const { width, height } = this.scale;
    const g = this.field;
    const L = this.pitchLayout;
    const m = this.markings;
    const P = U11_9V9_PITCH;
    const key = `${this.team ? 'tt:' : ''}${width}x${height}:${L.orientation}:${L.originX.toFixed(2)},${L.originY.toFixed(2)},${L.scale.toFixed(4)},${L.crossScale.toFixed(4)},${L.pitchLength.toFixed(3)},${(L.persp ?? 0).toFixed(6)},${(L.anchorX ?? 0).toFixed(2)},${(L.anchorY ?? 0).toFixed(2)},${L.pitchWidth.toFixed(3)}`;
    if (key === this.fieldKey) return;
    this.fieldKey = key;
    g.clear();
    g.fillStyle(PALETTE.track, 1);
    g.fillRect(0, 0, width, height);
    if (this.team) this.drawTrainingVenue(g, L, P);
    g.fillStyle(PALETTE.surround, 1);
    g.fillPoints(quadToScreen(L, { x: -3, y: -2, width: P.length + 6, height: P.width + 4 }), true);
    const stripes = 15;
    for (let i = 0; i < stripes; i++) {
      g.fillStyle(i % 2 === 0 ? PALETTE.grassLight : PALETTE.grassDark, 1);
      g.fillPoints(quadToScreen(L, { x: (i * P.length) / stripes, y: 0, width: P.length / stripes, height: P.width }), true);
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
      g.fillCircle(sp.x, sp.y, Math.max(2, L.scale * 0.22 * depthScaleAt(L, sp.y)));
    }
    for (const goal of m.goals) {
      const q = quadToScreen(L, goal);
      g.fillStyle(PALETTE.net, 0.45);
      g.fillPoints(q, true);
      g.lineStyle(lw + 3, PALETTE.ink, 1);
      g.strokePoints(q, true);
      g.lineStyle(lw + 1, PALETTE.cream, 1);
      g.strokePoints(q, true);
    }
  }

  /** Bell94-style park around the training pitch (desert edge, path, shade trees, light poles), never under play. */
  private drawTrainingVenue(g: Phaser.GameObjects.Graphics, L: PitchLayout, P: { length: number; width: number }): void {
    g.fillStyle(PALETTE.sand, 1);
    g.fillPoints(quadToScreen(L, { x: -40, y: -40, width: P.length + 80, height: 30 }), true);
    g.fillPoints(quadToScreen(L, { x: -40, y: P.width + 10, width: P.length + 80, height: 30 }), true);
    g.fillStyle(PALETTE.cream, 0.55);
    g.fillPoints(quadToScreen(L, { x: -40, y: -7, width: P.length + 80, height: 1.6 }), true);
    g.fillPoints(quadToScreen(L, { x: -40, y: P.width + 5.4, width: P.length + 80, height: 1.6 }), true);
    for (let x = -6; x <= P.length + 6; x += 12) {
      for (const y of [-9, P.width + 9]) {
        const c = toScreen(L, { x, y });
        const k = depthScaleAt(L, c.y);
        g.fillStyle(PALETTE.shadow, 0.3).fillEllipse(c.x, c.y + 2, L.scale * 3.4 * k, L.scale * 1.2 * k);
        g.fillStyle(PALETTE.grassDark, 1).fillCircle(c.x, c.y - L.scale * 0.8 * k, L.scale * 1.5 * k);
      }
    }
    for (const x of [-2, P.length / 2, P.length + 2]) {
      for (const y of [-4.5, P.width + 4.5]) {
        const b = toScreen(L, { x, y });
        const h = L.scale * 6 * depthScaleAt(L, b.y);
        g.lineStyle(Math.max(2, L.scale * 0.25), PALETTE.ink, 1).lineBetween(b.x, b.y, b.x, b.y - h);
        g.fillStyle(PALETTE.cream, 1).fillRect(b.x - L.scale * 0.7, b.y - h - L.scale * 0.5, L.scale * 1.4, L.scale * 0.6);
      }
    }
  }

  private renderFrame(dt: number): void {
    const s = this.sim.state;
    this.pad?.draw();
    // One camera controller: carrier in possession, held while aiming, the ball in travel, frozen when paused.
    const owner = s.ball.owner;
    const mode: CameraMode =
      s.paused || s.phase === 'halftime' || s.phase === 'fulltime'
        ? 'hold'
        : owner
            ? 'possession'
            : Math.hypot(s.ball.vel.x, s.ball.vel.y) > 3
              ? 'travel'
              : 'loose';
    const attackDir = (owner ? s.players[owner].team : s.possession) === 'home' ? 1 : -1;
    const focus = this.camera.update(
      {
        mode,
        ball: s.ball.pos,
        ballVel: s.ball.vel,
        carrier: owner ? s.players[owner].pos : null,
        attackDir,
      },
      dt,
      this.frame().bounds,
    );
    this.camX = focus.x;
    this.camY = focus.y;
    this.computeLayout();
    this.drawField();

    const L = this.pitchLayout;
    const u = this.under;
    const o = this.over;
    u.clear();
    o.clear();
    // Ball camera: players smaller relative to the pitch than the old close framing (FIFA Dynamic reference).
    const playerH = Phaser.Math.Clamp(L.scale * 2.1, 22, 100);
    const ballSize = Phaser.Math.Clamp(L.scale * 0.85, 9, 32);
    const ellipse = (center: Vec2, r: number): { x: number; y: number; w: number; h: number } => {
      const sp = toScreen(L, center);
      const v = pitchVectorToScreen(L, { x: r, y: r });
      const k = depthScaleAt(L, sp.y);
      return { x: sp.x, y: sp.y, w: Math.abs(v.x) * 2 * k, h: Math.abs(v.y) * 2 * k };
    };
    // Run cycle advances with sim time, so pauses, Coach cards and slow motion freeze/slow it with play.
    const simDt = Phaser.Math.Clamp(s.simTime - this.artSimTime, 0, 0.1);
    this.artSimTime = s.simTime;
    for (const id of MATCH_PLAYER_IDS) {
      const p = s.players[id];
      const sp = toScreen(L, p.pos);
      const img = this.sprites[id];
      const k = depthScaleAt(L, sp.y);
      const [kind, dir, pose] = this.artFrame(id, L, simDt);
      this.art.apply(img, this.looks[id], kind, dir, pose, playerH, k).setPosition(sp.x, sp.y).setDepth(100 + sp.y).setAngle(0);
      // The away keeper tint only distinguishes the drawn placeholder keepers; owner art has its own kit.
      if (id === 'A1') {
        if (img.texture.key.startsWith('spr2:')) img.clearTint();
        else img.setTint(0xb7d3ff);
      }
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
    // Above the oversized sprite's visible head, not the old placeholder height.
    const headK = depthScaleAt(L, head.y);
    const top = head.y - playerH * headK * PLAYER_ART.bodyScale - 5;
    const tri = Math.max(6, playerH * headK * 0.16);
    o.fillStyle(PALETTE.mustard, hasBall ? 1 : 0.5);
    o.lineStyle(2, PALETTE.ink, 1);
    o.fillTriangle(head.x - tri, top - tri * 1.2, head.x + tri, top - tri * 1.2, head.x, top);
    o.strokeTriangle(head.x - tri, top - tri * 1.2, head.x + tri, top - tri * 1.2, head.x, top);

    const bp = toScreen(L, s.ball.pos);
    const be = ellipse(s.ball.pos, 0.45);
    u.fillStyle(PALETTE.shadow, 0.35);
    u.fillEllipse(be.x, be.y, be.w, be.h);
    const bk = depthScaleAt(L, bp.y);
    this.ball.setScale((ballSize * bk) / BALL_TEXTURE_SIZE.width).setPosition(bp.x, bp.y - ballSize * bk * 0.45).setDepth(100 + bp.y + 0.5);

    this.drawAimGuide(playerH);
    this.drawCoach(playerH);
    this.drawDevOverlay(playerH);
    this.drawHud();
  }

  /** Direction arrow from the live ball, cancellation circle at the fixed gesture origin, compact power meter. */
  /** ?debug&passlog: draw the assisted-pass search cone and log each new target search to the console. */
  private passLog = false;
  private passLogKey = '';

  private drawPassScan(): void {
    const s = this.sim.state;
    const scan = this.sim.passScan;
    if (s.pad.phase !== 'chargingPass' || !s.pad.actor) {
      // Each new charge logs its first search, even with the same target and aim as the last one.
      this.passLogKey = '';
      return;
    }
    const T = match.MATCH_TUNING.pad;
    const L = this.pitchLayout;
    const b = s.ball.pos;
    const o = this.over;
    const from = toScreen(L, b);
    o.lineStyle(1, PALETTE.cream, 0.7);
    for (const side of [-1, 1]) {
      const a = Math.atan2(scan.aimY, scan.aimX) + side * T.receiverCone;
      const to = toScreen(L, { x: b.x + Math.cos(a) * T.receiverMaxRange, y: b.y + Math.sin(a) * T.receiverMaxRange });
      o.lineBetween(from.x, from.y, to.x, to.y);
    }
    const key = `${scan.chosen}|${scan.aimX.toFixed(1)},${scan.aimY.toFixed(1)}`;
    if (key === this.passLogKey) return;
    this.passLogKey = key;
    const rows = scan.entries.slice(0, scan.count).map((e) => ({
      id: e.id,
      inCone: e.inCone,
      deg: Math.round((e.angle * 180) / Math.PI),
      lineYd: Number(e.perp.toFixed(1)),
      distYd: Number(e.dist.toFixed(1)),
      score: Number(e.score.toFixed(3)),
    }));
    console.log(`[passlog] t=${s.simTime.toFixed(2)} aim=(${scan.aimX.toFixed(2)},${scan.aimY.toFixed(2)}) chosen=${scan.chosen ?? 'none'}`, rows);
  }

  /** Pad scheme: highlighted receiver ring and a charge meter above the kicker. */
  private drawPadGuide(playerH: number): void {
    const s = this.sim.state;
    const L = this.pitchLayout;
    const o = this.over;
    const pad = s.pad;
    if (this.passLog) this.drawPassScan();
    if (pad.receiver) {
      const r = toScreen(L, s.players[pad.receiver].pos);
      o.lineStyle(3, PALETTE.mustard, 1);
      o.strokeCircle(r.x, r.y, playerH * 0.75);
    }
    const charging = pad.phase === 'chargingPass' || pad.phase === 'chargingShoot';
    if (!charging || !pad.actor) return;
    const T = match.MATCH_TUNING.pad;
    const full = pad.phase === 'chargingPass' ? T.passChargeSeconds : T.shotChargeSeconds;
    const f = Phaser.Math.Clamp((s.simTime - pad.chargeStart) / full, 0, 1);
    const p = toScreen(L, s.players[pad.actor].pos);
    const w = playerH * 2.2;
    const y = p.y - playerH * 1.6;
    o.fillStyle(PALETTE.ink, 0.6).fillRect(p.x - w / 2, y, w, 6);
    o.fillStyle(pad.phase === 'chargingPass' ? PALETTE.grassLight : PALETTE.tomato, 1).fillRect(p.x - w / 2, y, w * f, 6);
    this.drawKickPreview(playerH);
  }

  /** v1.1 pre-release feedback, drawn only from the sim's own preview: pass line to the receiving point, shot aim line and goal-line marker. */
  private drawKickPreview(playerH: number): void {
    const pv = this.sim.aimPreview();
    if (!pv) return;
    const L = this.pitchLayout;
    const o = this.over;
    const from = toScreen(L, pv.origin);
    if (pv.kind === 'pass') {
      const t = toScreen(L, pv.plan.target);
      o.lineStyle(2, PALETTE.cream, 0.55);
      o.lineBetween(from.x, from.y, t.x, t.y);
      o.fillStyle(pv.plan.capped ? PALETTE.tomato : PALETTE.cream, 0.9);
      o.fillCircle(t.x, t.y, Math.max(3, playerH * 0.12));
      return;
    }
    const sh = pv.shot;
    const reach = 7;
    const end = toScreen(L, { x: pv.origin.x + sh.dir.x * reach, y: pv.origin.y + sh.dir.y * reach });
    o.lineStyle(3, PALETTE.tomato, 0.85);
    o.lineBetween(from.x, from.y, end.x, end.y);
    if (!sh.hit) return;
    const m = toScreen(L, sh.hit);
    const W = this.scale.width;
    const H = this.scale.height;
    const r = Math.max(4, playerH * 0.18);
    const inside = m.x >= 0 && m.x <= W && m.y >= 0 && m.y <= H;
    if (inside) {
      o.lineStyle(3, sh.onTarget ? PALETTE.mustard : PALETTE.tomato, 1);
      o.lineBetween(m.x - r, m.y - r, m.x + r, m.y + r);
      o.lineBetween(m.x - r, m.y + r, m.x + r, m.y - r);
      return;
    }
    // Marker off-screen: a chevron on the screen edge, pointing the way the goal-line hit lies.
    this.guideOffscreen = true;
    const ex = Phaser.Math.Clamp(m.x, r * 2, W - r * 2);
    const ey = Phaser.Math.Clamp(m.y, r * 2, H - r * 2);
    const a = Math.atan2(m.y - ey, m.x - ex);
    o.fillStyle(sh.onTarget ? PALETTE.mustard : PALETTE.tomato, 1);
    o.fillTriangle(
      ex + Math.cos(a) * r * 1.6, ey + Math.sin(a) * r * 1.6,
      ex + Math.cos(a + 2.4) * r, ey + Math.sin(a + 2.4) * r,
      ex + Math.cos(a - 2.4) * r, ey + Math.sin(a - 2.4) * r,
    );
  }

  private drawAimGuide(playerH: number): void {
    this.guideOffscreen = false;
    this.drawPadGuide(playerH);
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
      // Movement reasons only for back-line players (the shape under review), kept short so labels stay readable.
      const back = !p.isKeeper && roleDef(s.formations[p.team], p.slot).line === 'defence';
      const why = back ? s.shape[p.team].why[id] ?? '' : '';
      this.devLabels[id].setText(`${p.role} ${p.intent}${why ? `\n${why.length > 18 ? `${why.slice(0, 17)}…` : why}` : ''}`).setPosition(sp.x, sp.y + 2);
    }
    // Shared team shape: actual back line (solid), desired line (thin), midfield line, and the actual offside boundary.
    const P = this.sim.tuning.pitch;
    const vline = (team: 'home' | 'away', xT: number, color: number, width: number, alpha: number, dashed = false): void => {
      const x = team === 'home' ? xT : P.length - xT;
      const a = toScreen(L, { x, y: 0 });
      const b = toScreen(L, { x, y: P.width });
      g.lineStyle(width, color, alpha);
      if (!dashed) {
        g.lineBetween(a.x, a.y, b.x, b.y);
        return;
      }
      const n = 16;
      for (let i = 0; i < n; i += 2) g.lineBetween(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n, a.x + ((b.x - a.x) * (i + 1)) / n, a.y + ((b.y - a.y) * (i + 1)) / n);
    };
    for (const team of ['home', 'away'] as const) {
      const sh = s.shape[team];
      const c = team === 'home' ? PALETTE.tomato : PALETTE.blue;
      vline(team, sh.lineActual, c, 2.5, 0.9);
      vline(team, sh.lineDesired, c, 1, 0.9, true);
      vline(team, sh.midX, PALETTE.sun, 1, 0.6, true);
      vline(team, sh.offsideX, PALETTE.cream, 1.5, 0.7, true);
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
    this.devText.setWordWrapWidth(Math.max(160, this.scale.width - 2 * EDGE - 12), true);
    this.devText
      .setText(
        `phase ${s.phase}${s.paused ? ' (paused)' : ''} · owner ${owner ?? 'loose'} · possession ${s.possession}\n` +
          `home press ${s.defense.home.presserId ?? '-'} cover ${s.defense.home.coverId ?? '-'} · away press ${s.defense.away.presserId ?? '-'} cover ${s.defense.away.coverId ?? '-'}\n` +
          `t ${s.simTime.toFixed(1)}s · ${Math.round(this.fps)} fps · passes ${s.stats.passes.home}/${s.stats.passes.away} shots ${s.stats.shots.home}/${s.stats.shots.away}` +
          (['home', 'away'] as const)
            .map((t) => {
              const sh = s.shape[t];
              return `\n${t === 'home' ? 'H' : 'A'} ${sh.phase} L${sh.lineActual.toFixed(0)}→${sh.lineDesired.toFixed(0)} M${sh.midX.toFixed(0)} F${sh.frontX.toFixed(0)} gap ${(sh.midX - sh.lineX).toFixed(0)}/${(sh.frontX - sh.midX).toFixed(0)} off ${sh.offsideX.toFixed(0)}: ${sh.reason}`;
            })
            .join(''),
      )
      .setPosition(EDGE, Math.max(this.viewRect().y, this.minimapRect().y + this.minimapRect().height) + 8);
  }

  private drawHud(): void {
    const s = this.sim.state;
    const { width, height } = this.scale;
    const g = this.hud;
    g.clear();
    const d = this.coachDirector;
    const left = d ? Math.ceil(d.timeLeft(s)) : 0;
    // Coach mode puts its counter on a second line so the HUD never runs into the buttons.
    const careerTag = this.collector ? ` · YOU ${this.collector.careerId}` : '';
    const c = s.clock;
    const clockTag = !c ? '' : s.phase === 'halftime' ? 'HALF-TIME' : s.phase === 'fulltime' ? 'FULL-TIME' : match.clockLabel(c);
    const coachCount = d ? `COACH ${d.entries.length}/${d.target}` : '';
    let tags: string;
    if (c) tags = `\n${[clockTag, careerTag.replace(' · ', ''), coachCount].filter(Boolean).join(' · ')}`;
    else tags = d ? `${careerTag}\n${coachCount} · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : `${careerTag || (this.labId ? ' · LAB' : ' · SANDBOX')}`;
    this.scoreText.setAlign(this.scoreText.originX === 1 ? 'right' : 'center');
    const t = this.team;
    if (t) {
      const sit = t.situations[Math.min(t.index, t.situations.length - 1)];
      const left = t.observer ? Math.ceil(t.observer.remaining(s)) : null;
      const n = t.situations.length;
      this.scoreText.setText(`Team Training\n${sit ? sit.title : 'Loading…'}${n ? `${this.scale.height > this.scale.width ? '\n' : ' · '}Attempt ${Math.min(t.index + 1, n)}/${n}` : ''}${left !== null ? ` · 0:${String(left).padStart(2, '0')}` : ''}`);
    } else this.scoreText.setText(`Home ${s.score.home} – ${s.score.away} Away${tags}`);
    if (s.timeScale < 1 && s.timeScale > 0) {
      g.lineStyle(8, PALETTE.cream, 0.55);
      g.strokeRect(4, 4, width - 8, height - 8);
    }
    const st = s.stoppage;
    let banner = '';
    if (s.phase === 'stopped' && st) {
      banner =
        st.reason === 'goal'
          ? `GOAL! ${st.scorer === 'home' ? 'Home' : 'Away'} scores — ${s.clock ? `kick-off to ${st.restartTeam === 'home' ? 'Home' : 'Away'}` : 'sandbox restart'}`
          : restartBanner(st.reason, st.restart, st.restartTeam === 'home' ? 'Home' : 'Away');
    } else if (s.phase === 'kickoff') {
      const kickoffs = s.clock ? ['Kick-off…', 'Second-half kick-off…', 'Restart…'] : ['Sandbox kick-off…', 'Sandbox kick-off…', 'Sandbox restart…'];
      const second = s.clock?.half === 2 && s.clock.elapsed === 0;
      banner = s.simTime < 0.01 ? kickoffs[0]! : second ? kickoffs[1]! : kickoffs[2]!;
    }
    // Team Training has its own attempt cards; no match/sandbox restart banners.
    if (this.team) banner = '';
    this.showEventArt(s.phase === 'stopped' && st && (st.reason === 'goal' || st.reason === 'foul') ? st : null, width, height);
    this.showOffsidePopup(s.phase === 'stopped' && !this.team ? st : null, !s.paused && !this.navigating, width, height);
    this.bannerMessage = banner;
    this.bannerText.setVisible(banner !== '' && !s.paused).setText(banner).setPosition(width / 2, height / 2);
    const toastOn = this.toastUntil > performance.now() && (!s.paused || (this.team !== null && this.team.phase !== 'playing'));
    this.toastText.setVisible(toastOn);
    if (toastOn) {
      // Long Team Training feedback wraps inside the screen instead of running off both edges.
      const coachKey = atlasKey('coach-code');
      const coachOn = this.team !== null && this.textures.exists(coachKey) && this.textures.get(coachKey).has(this.coachPose);
      const coachW = coachOn ? 64 : 0;
      this.toastText.setWordWrapWidth(Math.max(120, width - 32 - coachW), true).setAlign('center').setText(this.toastMessage);
      const top = Math.max(this.viewRect().y, this.minimapRect().y + this.minimapRect().height) + 8;
      this.toastText.setPosition(width / 2 + coachW / 2, top + this.toastText.height / 2);
      if (coachOn) {
        const h = Math.max(56, this.toastText.height);
        const x = Math.max(16 + coachW / 2, width / 2 + coachW / 2 - this.toastText.width / 2 - coachW / 2);
        this.coachImg.setTexture(coachKey, this.coachPose).setScale(h / SPRITE_CELL.bodyHeight).setPosition(x, top + h);
      }
      this.coachImg.setVisible(coachOn);
    } else this.coachImg.setVisible(false);
    this.drawMinimap(g);
    const portrait = orientationOf({ width, height }) === 'portrait';
    const mm = this.minimapRect();
    this.rotateText.setVisible(portrait && !s.paused && !this.team).setPosition(mm.x + mm.width + 8, mm.y + mm.height / 2);
  }
}


function boundsOf(object: { getBounds(): Phaser.Geom.Rectangle }): Rect {
  const b = object.getBounds();
  return { x: b.x, y: b.y, width: b.width, height: b.height };
}
