import Phaser from 'phaser';
import type { Rect } from '../game';
import { CareerStore } from '../game/career/store';
import type { CareerSave, Tt12Slot } from '../game/career/state';
import type { Position } from '../game/career/types';
import type { RoleId } from '../game/training12/ref/catalog.mjs';
import { sessionId } from '../game/training12/session';
import { fixtureById, routePlan, sideText } from '../game/training12/situations/index';
import { SituationSession, TIMED_DECISION_SECONDS, type SitAttempt } from '../game/training12/situations/session';
import { laneGap, pressureOn, type SitActor } from '../game/training12/situations/sim';
import { sessions } from '../game/training12/ref/seasons.mjs';
import { artTextureKey, artUrl } from '../render/art/urls';
import type { ProtagonistLook } from '../render/art/roster';
import { ensureTtArt, ttKey } from '../render/art/teamTrainingArt';
import { baselineBody, targetBody, TT_ART, ttFrame, ttIdentities, ttScale, type TtAction, type TtSheet } from '../render/art/teamTrainingFrames';
import { orientationOf, type Insets } from '../render/layout';
import { FONT_FAMILY, PALETTE, textResolution } from '../render/theme';
import { shouldExposeDebug } from '../debug/diagnostics';
import type { GameplayScene, InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';
import { safeInsets } from './ui/PadHud';

export interface TacticalData {
  readonly slot?: Tt12Slot;
  readonly returnTo?: 'story';
}

/** One physical half of the 9v9 pitch, in metres (75 x 50 yd). */
export const HALF = { length: 75 * 0.9144 / 2, width: 50 * 0.9144, goalWidth: 6.4, margin: 2 } as const;

/** Career positions map to the v1.2 roles a player may train in. */
export const ROLE_CHOICES: Readonly<Record<Position, readonly RoleId[]>> = { DEF: ['CB', 'LB', 'RB'], MID: ['6', '8'], FWD: ['LW', 'RW', '9'] };
const ROLE_LABEL: Readonly<Record<RoleId, string>> = { GK: 'Keeper', CB: 'Centre back', LB: 'Left back', RB: 'Right back', '6': 'Holding mid (6)', '8': 'Box-to-box (8)', LW: 'Left wing', RW: 'Right wing', '9': 'Striker (9)' };

/** Team Training interface colours: navy panels, cream text, gold borders, cyan tactical highlights. */
const UI = { navy: 0x14213d, navyDeep: 0x0d1630, gold: 0xf2c14e, cyan: 0x4cc9f0, cream: 0xfff4dc, desert: 0xd9bb8c, path: 0xc9a46a, shrub: 0x6f8a4a } as const;
const UI_CSS = { cream: '#fff4dc', gold: '#f2c14e', navy: '#14213d' } as const;
export const STAGES = ['OBSERVE', 'DECIDE', 'PLAY', 'LEARN'] as const;
/** Metres framed around the half: a thin strip past each touchline and the halfway line, the goal's depth behind the goal line. */
const FRAME = { w: HALF.width + 1.2, h: HALF.length + 0.6 + 2.2 } as const;
/** Pixels of Bell94 scenery (fence, palms) allowed beyond the framed half. */
const SCENERY_BAND = 30;
const LETTERS = ['A', 'B', 'C', 'D'] as const;
const COACH_ART = 'coach-club';

type Screen = 'loading' | 'unavailable' | 'role' | 'brief' | 'play' | 'reflection' | 'saving' | 'saveFailed' | 'done';

/**
 * Team Training v1.2: a fixed straight-down camera over one whole half, the coached Observe -> Decide ->
 * Play it out -> Why -> Retry loop, and a coaching panel. Rules live in src/game/training12; this scene draws.
 */
export class TacticalTrainingScene extends Phaser.Scene implements InspectableScene, GameplayScene {
  private store: CareerStore | null = null;
  private save: CareerSave | null = null;
  private entry = 0;
  private bodyMax = Number.POSITIVE_INFINITY;
  private session: SituationSession | null = null;
  private screen: Screen = 'loading';
  private slot: Tt12Slot = 'A';
  private role: RoleId = '8';
  private returnTo: 'story' | null = null;
  private message = '';
  private saved = '';
  private leaveArmed = false;
  private speed = 1;
  private g!: Phaser.GameObjects.Graphics;
  private bgG!: Phaser.GameObjects.Graphics;
  private tacG!: Phaser.GameObjects.Graphics;
  private ballG!: Phaser.GameObjects.Graphics;
  private panelG!: Phaser.GameObjects.Graphics;
  private hTitle!: Phaser.GameObjects.Text;
  private hSub!: Phaser.GameObjects.Text;
  private hObj!: Phaser.GameObjects.Text;
  private stageText: Phaser.GameObjects.Text[] = [];
  private coach: Phaser.GameObjects.Image | null = null;
  private header: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private footer: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private portraitBox: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private portraitLayout = true;
  private bodyDropped = 0;
  /** Tight panel with long text (e.g. a landscape hint): the portrait steps aside so the text gets the full width. */
  private coachCompact = false;
  private stageIdx = -1;
  private title!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private buttons: Button[] = [];
  private tokenText: Phaser.GameObjects.Text[] = [];
  private lookName: ProtagonistLook | null = null;
  private me!: Phaser.GameObjects.Image;
  private sprites: Phaser.GameObjects.Image[] = [];
  /** Supplied sheet per slot for the current moment: stable through observe, decide, demonstrate, critique, retry and replay. */
  private ids: { key: string; map: ReadonlyMap<string, TtSheet> } | null = null;
  /** Per player: last position and distance run (drives the run cycle), and when they last took the ball. */
  private gait = new Map<string, { x: number; y: number; dist: number; got: number }>();
  private lastOwner: string | null = null;
  private frames: { slot: string; sheet: TtSheet; frame: number; flip: boolean; action: TtAction }[] = [];
  private field: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private panel: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private px = 1;
  private elements: Record<string, Rect> = {};
  private buttonKey = '';
  private walk = 0;

  constructor() {
    super(SceneKeys.Tactical);
  }

  create(data: TacticalData = {}): void {
    this.slot = data.slot === 'B' || data.slot === 'C' ? data.slot : 'A';
    this.returnTo = data.returnTo === 'story' ? 'story' : null;
    this.screen = 'loading';
    this.session = null;
    this.save = null;
    this.message = 'Loading Team Training…';
    this.saved = '';
    this.leaveArmed = false;
    this.buttons = [];
    this.tokenText = [];
    this.sprites = [];
    this.ids = null;
    this.gait.clear();
    this.lastOwner = null;
    this.frames = [];
    this.buttonKey = '';
    const params = new URLSearchParams(window.location.search);
    const sp = Number(params.get('ttSpeed'));
    this.speed = shouldExposeDebug(window.location) && Number.isFinite(sp) && sp >= 1 && sp <= 8 ? sp : 1;
    this.cameras.main.setBackgroundColor('#0d1630');
    this.stageText = [];
    this.coach = null;
    this.stageIdx = -1;
    // Layers: scenery + pitch, tactical overlay, sprites (900), ball, choice tags (950), interface (2000+).
    this.bgG = this.add.graphics().setDepth(0);
    this.g = this.add.graphics().setDepth(1);
    this.tacG = this.add.graphics().setDepth(899);
    this.ballG = this.add.graphics().setDepth(940);
    this.panelG = this.add.graphics().setDepth(2000);
    const style = { fontFamily: FONT_FAMILY, color: UI_CSS.cream, wordWrap: { width: 300, useAdvancedWrap: true } };
    this.title = this.add.text(0, 0, '', { ...style, color: UI_CSS.gold, fontStyle: 'bold', fontSize: '13px' }).setDepth(2001).setResolution(textResolution());
    this.body = this.add.text(0, 0, '', { ...style, fontSize: '14px', lineSpacing: 2 }).setDepth(2001).setResolution(textResolution());
    this.hTitle = this.add.text(0, 0, 'TEAM TRAINING', { fontFamily: FONT_FAMILY, color: UI_CSS.gold, fontStyle: 'bold', fontSize: '15px' }).setDepth(2001).setResolution(textResolution());
    this.hSub = this.add.text(0, 0, '', { fontFamily: FONT_FAMILY, color: UI_CSS.cream, fontSize: '12px' }).setDepth(2001).setResolution(textResolution());
    this.hObj = this.add.text(0, 0, '', { ...style, fontSize: '12px', wordWrap: { width: 300 } }).setDepth(2001).setResolution(textResolution());
    for (const st of STAGES) this.stageText.push(this.add.text(0, 0, st, { fontFamily: FONT_FAMILY, color: UI_CSS.cream, fontStyle: 'bold', fontSize: '11px' }).setOrigin(0.5).setDepth(2002).setResolution(textResolution()));
    this.loadCoach();
    this.me = this.add.image(-100, -100, '__DEFAULT').setVisible(false).setDepth(900);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onBlur, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.layout();
    const entry = ++this.entry;
    const stale = (): boolean => entry !== this.entry || !this.sys.isActive();
    void CareerStore.open().then(async (store) => {
      if (stale()) return store.close();
      this.store = store;
      const save = await store.load();
      if (stale()) return store.close();
      this.save = save;
      if (!save.player) return this.setScreen('unavailable', 'Create your player first.');
      const g = save.player.gender;
      this.lookName = g === 'boy' || g === 'girl' ? g : null;
      ensureTtArt(this);
      this.role = ROLE_CHOICES[save.player.position][0]!;
      const plan = routePlan(sessionId(1, save.week, this.slot), this.role);
      if (!plan) return this.setScreen('unavailable', `Session ${sessionId(1, save.week, this.slot)} is not available yet. Its scenes have not passed testing, so nothing here is counted. Your weekly Team Training is still on the Team Training page.`);
      this.setScreen('role', '');
    }).catch(() => this.setScreen('unavailable', 'Your career save could not be opened.'));
  }

  private get id(): string { return this.save ? sessionId(1, this.save.week, this.slot) : ''; }

  /** Coach Code's approved portrait, cropped to his head and shoulders for the coaching panel. */
  private loadCoach(): void {
    const url = artUrl(COACH_ART);
    if (!url) return;
    const key = artTextureKey(COACH_ART);
    // Synchronous on re-entry (texture cached): the scene is still CREATING, so only the async loader path checks isActive.
    const place = (sync = false): void => {
      if ((!sync && !this.sys.isActive()) || !this.textures.exists(key) || this.coach) return;
      this.coach = this.add.image(0, 0, key).setDepth(2001).setCrop(150, 0, 230, 230).setOrigin(0, 0).setVisible(!this.coachCompact);
      this.layout();
    };
    if (this.textures.exists(key)) place(true);
    else {
      this.load.image(key, url);
      this.load.once(`filecomplete-image-${key}`, () => place());
      this.load.start();
    }
  }

  /** Review-only roles (the keeper; the career has no keeper position) never count toward the week. */
  private get reviewRole(): boolean {
    const pos = this.save?.player?.position;
    return !pos || !ROLE_CHOICES[pos].includes(this.role);
  }

  /** OBSERVE / DECIDE / PLAY / LEARN for the live moment, or -1 off the pitch loop. */
  private stage(): number {
    const d = this.session?.sit;
    if (this.screen !== 'play' || !d) return -1;
    return d.phase === 'release' ? 0 : d.phase === 'observe' ? 1 : d.phase === 'execute' ? 2 : 3;
  }

  private setScreen(s: Screen, message: string): void {
    if (!this.sys.isActive()) return;
    this.screen = s;
    this.message = message;
    this.buttonKey = '';
  }

  private begin(): void {
    const save = this.save;
    if (!save?.player) return;
    const plan = routePlan(this.id, this.role);
    if (!plan) return this.setScreen('unavailable', `${ROLE_LABEL[this.role]} is not available for ${this.id} yet.`);
    const rand = Math.floor(Math.random() * 0x7fffffff);
    this.session = new SituationSession(plan, `ts-${Date.now().toString(36)}-${rand.toString(36)}`, rand);
    this.setScreen('brief', '');
  }

  override update(_t: number, deltaMs: number): void {
    const s = this.session;
    if (s && this.screen === 'play') {
      // ?ttSpeed (debug) speeds up play only; the timed decision window always runs in real seconds.
      if (s.status === 'playing') s.update(Math.min(deltaMs / 1000, 0.1) * (s.sit?.phase === 'observe' ? 1 : this.speed));
      if (s.status === 'reflection') this.setScreen('reflection', '');
    }
    // Poses only step while play runs, so Pause and the DECIDE freeze hold every player still.
    if (!s || s.status === 'playing') this.walk += deltaMs / 1000;
    this.draw();
    this.panelUpdate();
  }

  // ---- input -------------------------------------------------------------------------------------

  private decide(id: string): void {
    const s = this.session;
    if (!s || this.screen !== 'play') return;
    s.decide(id, s.generation);
  }

  private next(): void {
    this.session?.next();
  }

  private hint(): void {
    const s = this.session;
    if (!s || this.screen !== 'play') return;
    s.hint(s.generation);
    this.buttonKey = '';
  }

  private replay(): void {
    const s = this.session;
    if (!s || this.screen !== 'play') return;
    s.replay(s.generation);
  }

  private continueRound(): void {
    const s = this.session;
    if (!s || this.screen !== 'reflection') return;
    if (!s.continueRound()) return;
    if (s.status === 'complete') return void this.finish();
    this.setScreen('brief', '');
  }

  private startRound(): void {
    const s = this.session;
    if (!s || this.screen !== 'brief') return;
    if (s.status === 'ready' && !s.startRound()) return;
    this.setScreen('play', '');
  }

  private togglePause(): void {
    const s = this.session;
    if (!s) return;
    if (s.status === 'playing') s.pause();
    else if (s.status === 'paused') s.resume();
    this.buttonKey = '';
  }

  private onBlur(): void {
    if (this.session?.status === 'playing') this.session.pause();
    this.buttonKey = '';
  }

  private leave(): void {
    if (this.screen === 'saving') return;
    const live = this.session && ['ready', 'playing', 'paused', 'reflection'].includes(this.session.status);
    if ((live || this.screen === 'saveFailed') && !this.leaveArmed) {
      this.leaveArmed = true;
      this.buttonKey = '';
      return;
    }
    if (live) this.session!.abort();
    this.scene.start(SceneKeys.Career, { open: 'team', ...(this.returnTo ? { returnTo: this.returnTo } : {}) });
  }

  /** Save the finished run once (tactical-situation model ts-1). Credit and score come from the decisions, never from play time. */
  private async finish(): Promise<void> {
    const s = this.session;
    const c = s?.completion;
    if (!s || !c || !this.store || !this.save) return;
    if (this.screen === 'saving') return;
    this.leaveArmed = false;
    this.setScreen('saving', 'Saving…');
    // The same runId is idempotent in the reducer, so a failed save can be retried safely.
    let out: { ok: true; message: string } | { ok: false; error: string };
    try {
      const r = await this.store.dispatch({ type: 'tt12Run', week: this.save.week, slot: this.slot, runId: c.runId, score: c.score, creditEligible: c.creditEligible && !this.reviewRole, decisions: c.decisions, model: c.model });
      out = r.ok ? { ok: true, message: this.reviewRole ? 'Review route: saved as practice, never counted.' : r.message } : { ok: false, error: r.error };
    } catch (e) {
      out = { ok: false, error: e instanceof Error ? e.message : 'The save could not be written.' };
    }
    if (!this.sys.isActive() || this.session !== s) return;
    this.saved = out.ok ? out.message : out.error;
    this.setScreen(out.ok ? 'done' : 'saveFailed', '');
  }

  // ---- panel ---------------------------------------------------------------------------------------

  private panelUpdate(): void {
    const s = this.session;
    const d = s?.sit ?? null;
    const lines: string[] = [];
    let title = 'COACH CODE';
    type B = { name: string; label: string; onClick: () => void; fill?: number; small?: boolean };
    const buttons: B[] = [];
    const util = (b: Omit<B, 'small'>): void => void buttons.push({ ...b, small: true });
    const roundTxt = s ? `Round ${s.roundNumber} of 3 · ${s.guided ? 'Guided' : s.timed ? 'Game speed' : 'Your read'}` : '';
    const sess = sessions.find((x) => x.id === this.id);
    this.setSub([this.save ? `S1 · Week ${this.save.week} · Session ${this.slot}` : '', s ? `Round ${s.roundNumber}/3` : '', this.screen === 'play' || this.screen === 'brief' ? ROLE_LABEL[this.role] : ''].filter(Boolean));
    this.setObjective(s && d ? s.text(d.fixture.objective) : (sess?.objective ?? ''));
    switch (this.screen) {
      case 'loading':
      case 'unavailable':
        lines.push(this.message);
        break;
      case 'role': {
        title = `COACH CODE · ${this.id}`;
        lines.push(`Week ${this.save?.week} session ${this.slot}: ${sess?.theme ?? ''}`, '', 'Pick where you play today.');
        const roles: RoleId[] = [...ROLE_CHOICES[this.save!.player!.position]];
        if (shouldExposeDebug(window.location)) roles.push('GK');
        for (const r of roles) {
          const ok = routePlan(this.id, r) !== null;
          const review = !ROLE_CHOICES[this.save!.player!.position].includes(r);
          buttons.push({ name: `role-${r}`, label: `${ROLE_LABEL[r]}${review ? ' (review, not counted)' : ''}${ok ? '' : ' (not available yet)'}`, onClick: () => { if (!ok) return; this.role = r; this.begin(); } });
        }
        break;
      }
      case 'brief': {
        title = `COACH CODE · ${sess?.theme ?? this.id}`;
        lines.push(roundTxt, '', `Today's moments: ${s!.plan.moments.map((m) => sideText(fixtureById(m.fixtureId)!.title, m.mirrored)).join('; ')}.`, '');
        lines.push(s!.guided ? 'Watch the play. When it stops, choose what you do, then we play it out and talk about why.'
          : s!.timed ? `Game speed: no hints, and ${TIMED_DECISION_SECONDS} seconds to choose each time.` : 'Read it yourself this round. The hint is still there, but it counts as help.');
        if (this.reviewRole) lines.push('', 'Review route: this session is never counted.');
        buttons.push({ name: 'tt-start', label: 'Start round', onClick: () => this.startRound() });
        break;
      }
      case 'play': {
        if (s!.status === 'paused') {
          title = 'COACH CODE · PAUSED';
          lines.push('Paused. Everything is frozen.');
          buttons.push({ name: 'tt-resume', label: 'Resume', onClick: () => this.togglePause() });
          break;
        }
        if (d?.phase === 'observe') {
          title = s!.timed ? `COACH CODE · ${Math.ceil(s!.decideSecondsLeft)} s to choose` : 'COACH CODE · YOUR DECISION';
          lines.push(s!.text(d.spec.question));
          if (s!.hinted) lines.push(...d.spec.cues.map((c) => `• ${s!.text(c)}`));
          s!.choices().forEach((c, i) => buttons.push({ name: `opt-${c.option.id}`, label: `${LETTERS[i]}  ${c.label}`, onClick: () => this.decide(c.option.id), fill: PALETTE.cream }));
          if (s!.hintAvailable) util({ name: 'tt-hint', label: s!.hinted ? 'Hint used' : 'Hint', onClick: () => this.hint(), fill: PALETTE.sand });
        } else if (d?.phase === 'explain') {
          title = 'COACH CODE · LEARN';
          const a = s!.attempts.at(-1);
          lines.push(...learnLines(a, s!, d.outcome?.text ?? ''));
          if (!s!.timed) buttons.push({ name: 'tt-replay', label: 'Replay this one', onClick: () => this.replay() });
          buttons.push({ name: 'tt-next', label: 'Next situation', onClick: () => this.next() });
        } else {
          title = d?.phase === 'execute' ? 'COACH CODE · PLAY' : 'COACH CODE · OBSERVE';
          lines.push(d?.phase === 'execute' ? 'Playing it out from where you paused…' : `${d ? s!.text(d.fixture.title) : ''}. ${d?.fixture.goal === 'ours' ? 'We defend this goal.' : 'We attack this goal.'} Watch the pressure, the movement and the space.`);
          if (s!.replaying) lines.push('Replay: practice only, not counted.');
        }
        util({ name: 'tt-pause', label: 'II Pause', onClick: () => this.togglePause(), fill: PALETTE.sand });
        break;
      }
      case 'reflection': {
        title = `COACH CODE · Round ${s!.roundNumber} done`;
        const mine = s!.attempts.filter((a) => a.round === s!.round && !a.replay);
        const good = mine.filter((a) => a.verdict === 'good').length;
        const helped = mine.filter((a) => a.hinted).length;
        lines.push(`${good} of ${mine.length} decisions were good reads.`, ...summary(mine));
        if (helped) lines.push(`${helped} used the hint: those count as help, not your own read.`);
        buttons.push({ name: 'tt-continue', label: s!.round >= 2 ? 'Finish session' : 'Next round', onClick: () => this.continueRound() });
        break;
      }
      case 'saving':
        lines.push('Saving…');
        break;
      case 'saveFailed':
        title = 'Not saved yet';
        lines.push('Your finished session could not be saved:', this.saved, '', 'Try again; leaving now loses this session.');
        buttons.push({ name: 'tt-retry-save', label: 'Try saving again', onClick: () => void this.finish() });
        break;
      case 'done': {
        title = `COACH CODE · ${this.id} complete`;
        const c = s?.completion;
        const real = s?.attempts.filter((a) => !a.replay) ?? [];
        const dc = s?.decisionCounts ?? { independent: 0, assisted: 0 };
        lines.push(`${real.filter((a) => a.verdict === 'good').length} of ${real.length} decisions were good reads (${dc.independent} on your own, ${dc.assisted} with the hint).`);
        lines.push(this.reviewRole ? 'Review route: not counted.' : c?.creditEligible ? 'Enough of your own decisions: this session can count.' : 'Not enough decisions of your own to count this session.');
        lines.push('', this.saved);
        buttons.push({ name: 'tt-back', label: 'Back to Team Training', onClick: () => this.leave() });
        break;
      }
    }
    if (this.screen !== 'done' && this.screen !== 'saving') {
      util({ name: 'tt-leave', label: this.leaveArmed ? 'Tap again: leave' : 'Leave', onClick: () => this.leave(), fill: PALETTE.sand });
    }
    if (this.leaveArmed) lines.push('Leaving now counts nothing.');
    this.title.setText(title);
    const st = this.stage();
    if (st !== this.stageIdx) { this.stageIdx = st; this.drawChrome(); }
    const key = `${this.screen}|${s?.status}|${s?.sit?.phase}|${s?.moment}|${s?.hinted}|${s?.attempts.length}|${this.leaveArmed}|${buttons.map((b) => b.name + b.label).join(',')}|${this.panel.width}x${this.panel.height}`;
    if (key === this.buttonKey) return this.fitBody(lines);
    this.buttonKey = key;
    for (const b of this.buttons) b.destroy();
    this.buttons = [];
    const P = this.panel;
    const pad = 8;
    const main = buttons.filter((b) => !b.small);
    const small = buttons.filter((b) => b.small);
    const sh = 40;
    // The coaching text is sized first (hint cues and the LEARN result included); buttons take what is left, going to two
    // columns, then a smaller body font, then the text's full width without the portrait, before any text line is dropped.
    let room = 0;
    let cols = 1;
    let rows = 0;
    let compact = false;
    for (const [fs, full] of [[14, false], [13, false], [12, false], [12, true]] as const) {
      compact = full;
      const textW0 = full ? P.width - pad * 2 : P.x + P.width - pad - (this.portraitBox.x + this.portraitBox.width + pad);
      this.title.setText(title).setWordWrapWidth(textW0);
      this.body.setFontSize(fs).setWordWrapWidth(textW0).setText(lines.join('\n'));
      const coachH = Math.max(full ? 0 : this.portraitBox.height + pad * 2, pad + this.title.height + 4 + this.body.height + 6);
      room = P.height - coachH - (small.length ? sh + 6 : 0) - pad;
      // One answer per row (like the mockup) when they fit at a comfortable height, otherwise two columns.
      cols = main.length >= 2 && room < main.length * 46 && P.width >= 260 ? 2 : 1;
      rows = Math.ceil(main.length / cols);
      if (room >= rows * 42) break;
    }
    const bh = rows ? Math.max(36, Math.min(50, Math.floor(room / rows) - 6)) : 0;
    const smallTop = P.y + P.height - pad - (small.length ? sh : 0);
    const top = smallTop - (small.length ? 6 : 0) - rows * (bh + 6);
    this.elements = { field: this.field, panel: this.panel, header: this.header, footer: this.footer };
    const place = (b: B, x: number, y: number, w: number, h: number, fs: number): void => {
      const btn = new Button(this, x + w / 2, y + h / 2, { name: b.name, label: b.label, width: w, height: h, fontSize: fs, onClick: b.onClick, ...(b.fill ? { fill: b.fill } : {}) });
      this.add.existing(btn.setDepth(2002));
      this.buttons.push(btn);
      this.elements[b.name] = { x, y, width: w, height: h };
    };
    const bw = (P.width - pad * (cols + 1)) / cols;
    main.forEach((b, i) => place(b, P.x + pad + (i % cols) * (bw + pad), top + Math.floor(i / cols) * (bh + 6), bw, bh, 15));
    const sw = (P.width - pad * (small.length + 1)) / Math.max(1, small.length);
    small.forEach((b, i) => place(b, P.x + pad + i * (sw + pad), smallTop, sw, sh, 14));
    if (compact !== this.coachCompact) {
      this.coachCompact = compact;
      this.coach?.setVisible(!compact);
      this.drawChrome();
    }
    const textX = compact ? P.x + pad : this.portraitBox.x + this.portraitBox.width + pad;
    const textW = P.x + P.width - pad - textX;
    this.body.setWordWrapWidth(textW);
    this.title.setWordWrapWidth(textW);
    this.title.setPosition(textX, P.y + pad);
    this.body.setPosition(textX, P.y + pad + this.title.height + 4);
    this.bodyMax = top - this.body.y - 4;
    this.fitBody(lines);
  }

  /** Header detail line: drops trailing parts (role, then round) that would run past the header edge. */
  private setSub(parts: string[]): void {
    const full = parts.join(' · ');
    if (this.hSub.getData('full') === full) return;
    this.hSub.setData('full', full).setText(full);
    const right = this.header.x + this.header.width - 8;
    while (parts.length > 1 && this.hSub.x + this.hSub.width > right) {
      parts.pop();
      this.hSub.setText(parts.join(' · '));
    }
  }

  /** The session objective in the header, trimmed with an ellipsis to the lines that fit. */
  private setObjective(text: string): void {
    if (this.hObj.getData('full') === text) return;
    this.hObj.setData('full', text).setText(text);
    const max = this.header.y + this.header.height - 4 - this.hObj.y;
    const words = text.split(' ');
    while (words.length > 1 && this.hObj.height > max) {
      words.pop();
      this.hObj.setText(`${words.join(' ')}…`);
    }
  }

  /** Keep the text above the buttons: drop trailing lines that would run under them (every refresh, not just on relayout). */
  private fitBody(lines: string[]): void {
    const all = lines.join('\n').split('\n');
    this.body.setText(all.join('\n'));
    const wanted = all.length;
    while (all.length > 1 && this.body.height > this.bodyMax) {
      all.pop();
      this.body.setText(all.join('\n'));
    }
    this.bodyDropped = wanted - all.length;
  }

  // ---- layout + drawing -------------------------------------------------------------------------

  private onResize(): void {
    this.layout();
  }

  /** Fixed overhead framing: the whole half (both touchlines, halfway line, goal line and goal) plus a margin. */
  private layout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const ins: Insets = safeInsets();
    const portrait = orientationOf({ width: w, height: h }) === 'portrait';
    this.portraitLayout = portrait;
    const ext = FRAME;
    const usable = { x: ins.left, y: ins.top, width: w - ins.left - ins.right, height: h - ins.top - ins.bottom };
    const hdrH = portrait ? 70 : 40;
    const ftrH = portrait ? 24 : 22;
    this.header = { x: usable.x, y: usable.y, width: usable.width, height: hdrH };
    this.footer = { x: usable.x, y: usable.y + usable.height - ftrH, width: usable.width, height: ftrH };
    const midY = usable.y + hdrH;
    const midH = usable.height - hdrH - ftrH;
    // The pitch gets the space first: as large as the whole half allows at true proportions, plus at most a slim
    // band of scenery behind the goal. The panel takes the rest (never less than its minimum).
    if (portrait) {
      const minPanel = 250;
      const k = Math.min(usable.width / ext.w, (midH - minPanel) / ext.h);
      const fieldH = Math.min(midH - minPanel, Math.ceil(ext.h * k) + SCENERY_BAND);
      this.field = { x: usable.x, y: midY, width: usable.width, height: fieldH };
      this.panel = { x: usable.x, y: midY + fieldH, width: usable.width, height: midH - fieldH };
    } else {
      const minPanel = 280;
      const k = Math.min((usable.width - minPanel) / ext.w, midH / ext.h);
      const fieldW = Math.min(usable.width - minPanel, Math.ceil(ext.w * k) + SCENERY_BAND);
      this.field = { x: usable.x, y: midY, width: fieldW, height: midH };
      this.panel = { x: usable.x + fieldW, y: midY, width: usable.width - fieldW, height: midH };
    }
    this.px = Math.min(this.field.width / ext.w, this.field.height / ext.h);
    const pb = portrait ? 46 : 40;
    this.portraitBox = { x: this.panel.x + 8, y: this.panel.y + 8, width: pb, height: pb };
    if (this.coach) this.coach.setScale(pb / 230).setPosition(this.portraitBox.x - 150 * (pb / 230), this.portraitBox.y);
    this.hTitle.setPosition(this.header.x + 10, this.header.y + 6);
    if (portrait) this.hSub.setPosition(this.header.x + 10, this.header.y + 23);
    else this.hSub.setPosition(this.hTitle.x + this.hTitle.width + 12, this.header.y + 6);
    this.hObj.setPosition(this.header.x + 10, this.header.y + (portrait ? 38 : 22)).setWordWrapWidth(this.header.width - 20);
    this.hObj.setData('full', null);
    this.hSub.setData('full', null);
    this.drawChrome();
    this.drawScenery();
    this.buttonKey = '';
  }

  /** Header, coaching/decision panel and the OBSERVE > DECIDE > PLAY > LEARN footer with the current stage lit. */
  private drawChrome(): void {
    const pg = this.panelG.clear();
    for (const r of [this.header, this.panel, this.footer]) {
      pg.fillStyle(UI.navy, 0.97).fillRect(r.x, r.y, r.width, r.height);
      pg.lineStyle(2, UI.gold, 1).strokeRect(r.x + 1, r.y + 1, r.width - 2, r.height - 2);
    }
    const pbx = this.portraitBox;
    if (!this.coachCompact) {
      pg.fillStyle(UI.navyDeep, 1).fillRect(pbx.x, pbx.y, pbx.width, pbx.height);
      pg.lineStyle(2, UI.gold, 1).strokeRect(pbx.x, pbx.y, pbx.width, pbx.height);
    }
    const F = this.footer;
    const cell = F.width / STAGES.length;
    this.stageText.forEach((t, i) => {
      const cx = F.x + cell * i + cell / 2;
      const on = i === this.stageIdx;
      if (on) pg.fillStyle(UI.gold, 1).fillRect(F.x + cell * i + 4, F.y + 4, cell - 8, F.height - 8);
      if (i > 0) pg.fillStyle(UI.cyan, 0.9).fillTriangle(F.x + cell * i - 3, F.y + F.height / 2 - 4, F.x + cell * i - 3, F.y + F.height / 2 + 4, F.x + cell * i + 3, F.y + F.height / 2);
      t.setPosition(cx, F.y + F.height / 2).setColor(on ? UI_CSS.navy : UI_CSS.cream).setAlpha(on ? 1 : 0.75);
    });
  }

  /** Restrained Bell94 / Scottsdale surroundings, outside the playing area only: a slim path, then fence and palms. */
  private drawScenery(): void {
    const g = this.bgG.clear();
    const f = this.field;
    const k = this.px;
    g.fillStyle(UI.desert, 1).fillRect(f.x, f.y, f.width, f.height);
    const tl = this.toScreen(-0.6, HALF.length + 2.2);
    const br = this.toScreen(HALF.width + 0.6, -0.6);
    g.fillStyle(UI.path, 1).fillRect(tl.x - 3, tl.y - 3, br.x - tl.x + 6, br.y - tl.y + 6);
    g.fillStyle(PALETTE.surround, 1).fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    // Fence and planting only where there is room beyond the path; never over the pitch.
    const band = tl.y - 3 - f.y;
    if (band >= 12) {
      const fy = f.y + band * 0.62;
      g.lineStyle(1, 0x8a8f99, 0.9).lineBetween(f.x, fy, f.x + f.width, fy).lineBetween(f.x, fy - 7, f.x + f.width, fy - 7);
      for (let x = f.x + 4; x < f.x + f.width; x += 7) g.lineBetween(x, fy - 7, x + 3.5, fy);
      for (let x = f.x + 6; x < f.x + f.width; x += 22) g.fillStyle(0x6b6f78, 1).fillRect(x, fy - 9, 2, 11);
      const palm = (x: number): void => {
        g.fillStyle(0x8a5a2b, 1).fillRect(x - 1.5, fy - 18, 3, 18);
        g.fillStyle(UI.shrub, 1).fillTriangle(x, fy - 19, x - 9, fy - 14, x - 2, fy - 21).fillTriangle(x, fy - 19, x + 9, fy - 14, x + 2, fy - 21).fillTriangle(x, fy - 20, x - 5, fy - 25, x + 5, fy - 25);
      };
      for (const x of [f.x + 14, f.x + 40, f.x + f.width - 40, f.x + f.width - 14]) palm(x);
      for (const x of [f.x + f.width * 0.25, f.x + f.width * 0.75]) g.fillStyle(0x7a4a2a, 1).fillRect(x - 8, fy + 2, 16, 3);
      for (const x of [f.x + 4, f.x + f.width - 6]) {
        g.fillStyle(0x5b5b66, 1).fillRect(x, f.y + 2, 2, band - 4);
        g.fillStyle(0xfff6c8, 0.95).fillRect(x - 2, f.y + 2, 6, 3);
      }
    }
    for (const [x, y] of [[f.x + 6, br.y + 6], [f.x + f.width - 8, br.y + 6]]) if (y! < f.y + f.height - 4) g.fillStyle(UI.shrub, 1).fillCircle(x!, y!, 3.5);
    void k;
  }

  /** Half-field metres (x across from the left touchline, y from the halfway line toward goal) to screen. */
  private toScreen(x: number, y: number): { x: number; y: number } {
    const k = this.px;
    const cx = this.field.x + this.field.width / 2;
    const base = this.field.y + this.field.height - (this.field.height - FRAME.h * k) / 2 * (this.portraitLayout ? 0 : 1);
    return { x: cx + (x - HALF.width / 2) * k, y: base - (FRAME.h - HALF.length - 2.2 + y) * k };
  }

  private draw(): void {
    const g = this.g;
    g.clear();
    this.tacG.clear();
    this.ballG.clear();
    const k = this.px;
    const tl = this.toScreen(0, HALF.length);
    const br = this.toScreen(HALF.width, 0);
    g.fillStyle(PALETTE.grassLight, 1).fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    for (let i = 0; i < 6; i++) if (i % 2) g.fillStyle(PALETTE.grassDark, 1).fillRect(tl.x, tl.y + ((br.y - tl.y) / 6) * i, br.x - tl.x, (br.y - tl.y) / 6);
    g.lineStyle(Math.max(1.5, k * 0.12), PALETTE.line, 1).strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    const c = this.toScreen(HALF.width / 2, 0);
    g.beginPath().arc(c.x, c.y, 9.15 * k * 0.8, Math.PI, 2 * Math.PI).strokePath();
    const box = (wide: number, deep: number) => {
      const a = this.toScreen(HALF.width / 2 - wide / 2, HALF.length);
      g.strokeRect(a.x, a.y, wide * k, deep * k);
    };
    box(26, 11);
    box(12, 4);
    const ga = this.toScreen(HALF.width / 2 - HALF.goalWidth / 2, HALF.length);
    // The regulation 9v9 goal is the only target in a tactical moment: net behind the goal line, white posts and bar.
    g.fillStyle(PALETTE.net, 0.55).fillRect(ga.x, ga.y - 1.6 * k, HALF.goalWidth * k, 1.6 * k);
    g.lineStyle(1, 0xffffff, 0.5);
    for (let x = ga.x + 3; x < ga.x + HALF.goalWidth * k; x += 3) g.lineBetween(x, ga.y - 1.6 * k, x, ga.y);
    g.lineStyle(Math.max(2, k * 0.18), 0xffffff, 1).strokeRect(ga.x, ga.y - 1.6 * k, HALF.goalWidth * k, 1.6 * k);
    const spot = this.toScreen(HALF.width / 2, HALF.length - 8.2);
    g.fillStyle(PALETTE.line, 1).fillCircle(spot.x, spot.y, Math.max(1.5, k * 0.12));
    const s = this.session;
    const d = s?.sit;
    for (const t of this.tokenText) t.setVisible(false);
    if (!d) {
      for (const im of this.sprites) im?.setVisible(false);
      return void this.me.setVisible(false);
    }
    this.drawTactical(s!, k);
    const r = Math.max(6, k * 0.55);
    const sc = ttScale(k);
    const ids = this.identities(d);
    const ownerTeam = d.ball.owner ? d.actors.find((x) => x.slot === d.ball.owner)?.side : null;
    if (d.ball.owner !== this.lastOwner && d.ball.owner) this.gait.set(d.ball.owner, { ...(this.gait.get(d.ball.owner) ?? { x: 0, y: 0, dist: 0 }), got: d.t });
    this.lastOwner = d.ball.owner;
    this.frames = [];
    let mine = false;
    d.actors.forEach((a, i) => {
      const im = a.human ? this.me : (this.sprites[i] ??= this.add.image(-100, -100, '__DEFAULT').setDepth(900));
      const sheet = ids.get(a.slot);
      if (a.offHalf) {
        // The far keeper is one of the 18 but stands in the other half: an edge marker at halfway shows where.
        im.setVisible(false);
        const q = this.toScreen(a.pos.x, 0);
        g.fillStyle(a.side === 'GK_B' ? 0xe0558f : 0x2bb3a3, 1).fillTriangle(q.x - r * 0.7, q.y - r * 0.2, q.x + r * 0.7, q.y - r * 0.2, q.x, q.y + r * 0.8);
        g.lineStyle(1, 0xffffff, 0.9).strokeTriangle(q.x - r * 0.7, q.y - r * 0.2, q.x + r * 0.7, q.y - r * 0.2, q.x, q.y + r * 0.8);
        return;
      }
      const p = this.actorScreen(a);
      const keeper = a.side.startsWith('GK');
      const st = this.gait.get(a.slot) ?? { x: a.pos.x, y: a.pos.y, dist: 0, got: -9 };
      st.dist += Math.hypot(a.pos.x - st.x, a.pos.y - st.y);
      st.x = a.pos.x;
      st.y = a.pos.y;
      this.gait.set(a.slot, st);
      const speed = Math.hypot(a.vel.x, a.vel.y);
      const moving = speed > 0.4;
      const defending = !!ownerTeam && (ownerTeam === 'A' || ownerTeam === 'GK_A') !== (a.side === 'A' || a.side === 'GK_A');
      const passing = d.ball.owner === null && d.ball.passer === a.slot && d.ball.kickT < 0.3;
      const receiving = d.ball.owner === a.slot && d.t - st.got < 0.35;
      const nearBall = Math.hypot(a.pos.x - d.ball.pos.x, a.pos.y - d.ball.pos.y) < 9;
      const action: TtAction = passing ? 'pass' : receiving ? 'receive' : moving ? (defending && nearBall ? 'shuffle' : 'run') : keeper && defending ? 'keeper-ready' : 'stand';
      const frame = ttFrame(keeper, action, st.dist / 1.7, passing ? d.ball.kickT : d.t - st.got);
      // Sheets face right: flip toward where they run, or toward the ball when standing.
      const ahead = moving ? this.toScreen(a.pos.x + a.vel.x, a.pos.y + a.vel.y) : this.halfScreen(d.ball.pos);
      const flip = ahead.x < p.x - 0.5;
      // Grounding shadow at the feet; the protagonist's highlight is only the outline drawn into the supplied sheet.
      g.fillStyle(PALETTE.shadow, 0.3).fillEllipse(p.x, p.y, r * 1.9, r * 0.6);
      if (a.slot === d.ball.owner && !a.human) g.lineStyle(1, 0xffffff, 0.8).strokeEllipse(p.x, p.y, r * 2.2, r * 0.8);
      if (!sheet || !this.textures.exists(ttKey(sheet))) {
        im.setVisible(false);
        g.fillStyle(keeper ? 0x2bb3a3 : a.side === 'A' ? 0xf07a1a : 0x3fae49, 1).fillCircle(p.x, p.y - r, r);
        return;
      }
      if (a.human) mine = true;
      this.frames.push({ slot: a.slot, sheet, frame, flip, action });
      im.setTexture(ttKey(sheet), frame).setOrigin(TT_ART.anchor.x / TT_ART.cell.w, TT_ART.anchor.y / TT_ART.cell.h).setScale(sc).setFlipX(flip)
        .setPosition(p.x, p.y).setDepth(900 + p.y / 10000 + (a.human ? 0.00001 : 0)).setVisible(true);
    });
    for (let i = d.actors.length; i < this.sprites.length; i++) this.sprites[i]?.setVisible(false);
    for (const [i, a] of d.actors.entries()) if (a.human) this.sprites[i]?.setVisible(false);
    if (!mine) this.me.setVisible(false);
    const bs = this.toScreen(d.ball.pos.x, d.ball.pos.y);
    this.ballG.fillStyle(0xffffff, 1).fillCircle(bs.x, bs.y, Math.max(4, k * 0.3));
    this.ballG.lineStyle(1.5, PALETTE.ink, 1).strokeCircle(bs.x, bs.y, Math.max(4, k * 0.3));
  }

  /**
   * Tactical overlay. DECIDE: a same-style letter tag where each choice goes (no arrows, no colour for the best one);
   * the hint adds cyan pressure rings and pass lanes. LEARN: the frozen moment, your choice in gold, good reads in cyan.
   */
  private drawTactical(s: SituationSession, k: number): void {
    const d = s.sit!;
    const t = this.tacG;
    const tagR = Math.max(9, k * 0.65);
    if (d.phase === 'observe' && s.status === 'playing') {
      if (s.hinted) {
        // Hint only: the ball holder's pass lanes to teammates (faint when an opponent is in the lane) and who is pressing.
        const holder = d.actors.find((a) => a.slot === d.ball.owner);
        if (holder) {
          const team = holder.side === 'A' || holder.side === 'GK_A' ? 'A' : 'B';
          for (const to of d.actors) {
            if (to === holder || (to.side === 'A' || to.side === 'GK_A' ? 'A' : 'B') !== team) continue;
            const a = this.actorScreen(holder);
            const b = this.actorScreen(to);
            t.lineStyle(2, UI.cyan, laneGap(d, holder.pos, to.pos, team) > 2 ? 0.9 : 0.25).lineBetween(a.x, a.y, b.x, b.y);
          }
          for (const o of pressureOn(d, holder.slot)) { const p = this.actorScreen(o); t.lineStyle(2, UI.cyan, 0.9).strokeCircle(p.x, p.y, Math.max(10, k * 1.2)); }
        }
      }
      const bodies = [...d.actors.flatMap((a) => { const p = this.actorScreen(a); return [p, { x: p.x, y: p.y - spriteHeight(k) * 0.6 }]; }), this.halfScreen(d.ball.pos)];
      const placed: { x: number; y: number }[] = [];
      s.choices().forEach((ch, i) => {
        const at = this.halfScreen(ch.option.point);
        const tag = clearSpot(at, bodies, placed, tagR + spriteHeight(k) * 0.3, tagR * 2.1);
        placed.push(tag);
        if (tag.x !== at.x || tag.y !== at.y) {
          t.lineStyle(1.5, UI.cream, 0.9).lineBetween(at.x, at.y, tag.x, tag.y);
          t.fillStyle(UI.cream, 1).fillCircle(at.x, at.y, 2.5);
        }
        t.fillStyle(UI.cream, 1).fillCircle(tag.x, tag.y, tagR);
        t.lineStyle(2, UI.navy, 1).strokeCircle(tag.x, tag.y, tagR);
        this.label(`opt${i}`, LETTERS[i]!, tag.x, tag.y);
      });
      return;
    }
    const a = s.attempts.at(-1);
    if (d.phase !== 'explain' || !a) return;
    const fz = a.frozen;
    for (const x of fz.actors) {
      const p = this.halfScreen(x.pos);
      t.fillStyle(x.human ? UI.gold : 0xffffff, 0.35).fillCircle(p.x, p.y, Math.max(4, k * 0.4));
    }
    const me = fz.actors.find((x) => x.human);
    if (!me) return;
    const from = this.halfScreen(me.pos);
    for (const g of fz.good) {
      const to = this.halfScreen(g.point);
      t.lineStyle(2, UI.cyan, 0.95).lineBetween(from.x, from.y, to.x, to.y);
      t.fillStyle(UI.cyan, 1).fillCircle(to.x, to.y, Math.max(5, k * 0.4));
    }
    if (fz.chosen) {
      const to = this.halfScreen(fz.chosen);
      t.lineStyle(3, UI.gold, 1).lineBetween(from.x, from.y, to.x, to.y);
      t.lineStyle(3, UI.gold, 1).strokeCircle(to.x, to.y, Math.max(7, k * 0.6));
    }
  }

  /** Supplied sheets for this moment's 18: your saved boy or girl, the 7 teammates, the 8 opponents and both keepers. */
  private identities(d: { fixture: { id: string }; variant: string; actors: readonly SitActor[] }): ReadonlyMap<string, TtSheet> {
    const key = `${d.fixture.id}:${d.variant}`;
    if (this.ids?.key === key) return this.ids.map;
    const home = d.actors.filter((a) => a.side === 'A' || a.side === 'GK_A').map((a) => a.slot);
    const away = d.actors.filter((a) => a.side === 'B' || a.side === 'GK_B').map((a) => a.slot);
    const me = d.actors.find((a) => a.human)!.slot;
    const map = ttIdentities(this.lookName ?? 'boy', home, away, me, d.actors.find((a) => a.side === 'GK_A')?.slot ?? null, d.actors.find((a) => a.side === 'GK_B')?.slot ?? null);
    this.ids = { key, map };
    return map;
  }

  private actorScreen(a: SitActor): { x: number; y: number } {
    return this.toScreen(a.pos.x, a.pos.y);
  }

  private halfScreen(p: { x: number; y: number }): { x: number; y: number } {
    return this.toScreen(p.x, p.y);
  }

  private label(key: string, text: string, x: number, y: number): void {
    const i = Number(key.slice(3));
    let t = this.tokenText[i];
    if (!t) {
      t = this.add.text(0, 0, '', { fontFamily: FONT_FAMILY, fontStyle: 'bold', fontSize: '12px', color: UI_CSS.navy }).setOrigin(0.5).setDepth(950).setResolution(textResolution());
      this.tokenText[i] = t;
    }
    t.setText(text).setPosition(x, y).setVisible(true);
  }

  // ---- diagnostics --------------------------------------------------------------------------------

  describeLayout(): SceneLayoutReport {
    const w = this.scale.width;
    const h = this.scale.height;
    const tl = this.toScreen(-0.6, HALF.length + 2.2);
    const br = this.toScreen(HALF.width + 0.6, -0.6);
    return {
      orientation: orientationOf({ width: w, height: h }),
      viewport: { width: w, height: h },
      elements: { ...this.elements, half: { x: tl.x, y: tl.y, width: br.x - tl.x, height: br.y - tl.y }, panel: { ...this.panel }, header: { ...this.header } },
    };
  }

  describeGameplay(): unknown {
    const s = this.session;
    const d = s?.sit;
    const last = s?.attempts.at(-1);
    return {
      screen: this.screen,
      model: 'ts-1',
      fixture: d ? { id: d.fixture.id, key: `${d.fixture.id}@${d.fixture.version}`, variant: d.variant, mirrored: d.mirrored, goal: d.fixture.goal, players: d.actors.length, outcome: d.outcome?.kind ?? null } : null,
      moment: s?.moment ?? null,
      sessionId: this.id,
      slot: this.slot,
      role: this.role,
      look: this.lookName,
      sprite: this.me.visible ? this.me.texture.key : null,
      art: { set: 'team-training-v1', reviewBuild: true, bodyPx: d ? targetBody(this.px) : null, baselineBodyPx: d ? baselineBody(this.px) : null, scale: d ? ttScale(this.px) : null, frames: this.frames },
      squadSprites: [this.me, ...this.sprites].filter((im): im is Phaser.GameObjects.Image => !!im?.visible).map((im) => im.texture.key),
      fixturePlayers: d?.actors.length ?? null,
      bodyBottom: this.body.y + this.body.height,
      bodyText: this.body.text,
      bodyDropped: this.bodyDropped,
      pose: this.walk,
      titleBottom: this.title.y + this.title.height,
      buttonsTop: Math.min(...this.buttons.map((b) => b.y - b.height / 2)),
      status: s?.status ?? null,
      round: s?.round ?? null,
      phase: d?.phase ?? null,
      options: d?.phase === 'observe' && s?.status === 'playing' ? s.choices().map((c, i) => ({ id: c.option.id, letter: LETTERS[i], label: c.option.label, kind: c.option.kind, good: s.grade(c.option.id)?.verdict === 'good', verdict: s.grade(c.option.id)?.verdict ?? null, quality: s.grade(c.option.id)?.quality ?? 0 })) : [],
      stage: STAGES[this.stage()] ?? null,
      hinted: s?.hinted ?? false,
      hintAvailable: s?.hintAvailable ?? false,
      replaying: s?.replaying ?? false,
      reviewRole: this.save ? this.reviewRole : null,
      decisions: s?.decisionCounts ?? null,
      header: { title: this.hTitle.text, sub: this.hSub.text, objective: this.hObj.getData('full') as string | null, objectiveShown: this.hObj.text },
      choiceTagsVisible: this.tokenText.filter((t) => t.visible).length,
      coachPortrait: this.coach?.visible ?? false,
      lastAttempt: last ? { optionId: last.optionId, key: last.key, variant: last.variant, hinted: last.hinted, replay: last.replay, good: last.verdict === null ? null : last.verdict === 'good', verdict: last.verdict, outcome: last.outcome, goodIds: last.frozen.good.map((g) => g.id) } : null,
      textBottoms: { header: this.hObj.y + this.hObj.height, headerBottom: this.header.y + this.header.height, headerRight: Math.max(this.hSub.x + this.hSub.width, this.hObj.x + this.hObj.width), headerEdge: this.header.x + this.header.width },
      attempts: s?.attempts.length ?? 0,
      generation: s?.generation ?? null,
      completion: s?.completion ? { creditEligible: s.completion.creditEligible, runId: s.completion.runId, model: s.completion.model, moments: s.completion.moments, decided: s.completion.decided, score: s.completion.score } : null,
      smallSided: { area: false, miniGoals: 0, gates: 0, endZones: 0 },
      saved: this.saved,
      message: this.message,
      pxPerMetre: this.px,
    };
  }

  private onShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.onBlur, this);
    this.store?.close();
    this.store = null;
    this.session = null;
  }
}

/** LEARN text: the decision verdict, then the result, kept apart, then the authored reasons for this moment. */
export function learnLines(a: SitAttempt | undefined, s: Pick<SituationSession, 'text' | 'timed' | 'grade'>, fallback: string): string[] {
  if (!a) return [fallback];
  const out: string[] = [];
  if (a.replay) out.push('Replay: practice only, not counted.');
  const g = a.optionId ? s.grade(a.optionId) : null;
  if (!g) return [...out, 'No decision in time.', `Result: ${a.outcome || fallback}`];
  const verdict = g.verdict === 'good' ? 'a good read' : g.verdict === 'ok' ? 'defensible, but another option was stronger' : 'another option was stronger here';
  out.push(`Decision: ${verdict}${a.hinted ? ' (with the hint)' : ''}.`);
  out.push(`Result: ${a.outcome || fallback}`);
  out.push(...g.reasons.slice(0, s.timed ? 1 : 2).map((r) => `• ${s.text(r)}`));
  const others = a.frozen.good.filter((x) => x.id !== a.optionId).map((x) => x.label);
  if (others.length) out.push(`${g.verdict === 'good' ? 'Also a good read' : 'Stronger here'}: ${others.join(' or ')} (cyan).`);
  return out;
}

function summary(attempts: readonly SitAttempt[]): string[] {
  const missed = attempts.filter((a) => a.optionId === null).length;
  return missed ? [`${missed} moment${missed === 1 ? '' : 's'} passed without a decision.`] : [];
}

/** Sprite height on screen: about 2.6 m (readable at phone scale) without hiding lanes on a large pitch. */
function spriteHeight(k: number): number {
  return Math.max(22, Math.min(34, k * 2.6));
}

/**
 * Where to draw a choice tag: its true point if that is clear of players, the ball and other tags, else the nearest
 * clear spot on rings around it (a leader line joins it to the true point), so it never sits on a face or the ball.
 */
export function clearSpot(p: { x: number; y: number }, bodies: readonly { x: number; y: number }[], tags: readonly { x: number; y: number }[], gap: number, tagGap: number): { x: number; y: number } {
  const clear = (q: { x: number; y: number }): boolean =>
    bodies.every((b) => Math.hypot(b.x - q.x, b.y - q.y) >= gap) && tags.every((t) => Math.hypot(t.x - q.x, t.y - q.y) >= tagGap);
  if (clear(p)) return p;
  for (let ring = 1; ring <= 4; ring++) {
    for (let i = 0; i < 12; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 6;
      const q = { x: p.x + Math.cos(ang) * gap * ring * 0.8, y: p.y + Math.sin(ang) * gap * ring * 0.8 };
      if (clear(q)) return q;
    }
  }
  return p;
}
