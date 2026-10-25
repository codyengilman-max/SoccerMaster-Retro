import Phaser from 'phaser';
import type { Rect } from '../game';
import { CareerStore } from '../game/career/store';
import type { CareerSave, Tt12Slot } from '../game/career/state';
import type { Position } from '../game/career/types';
import type { RoleId } from '../game/training12/ref/catalog.mjs';
import { planFor, sessionId, TrainingSession, TIMED_DECISION_SECONDS, type Attempt } from '../game/training12/session';
import type { DrillActor } from '../game/training12/drill';
import { situationCues } from '../game/training12/cues';
import { sessions } from '../game/training12/ref/seasons.mjs';
import { artTextureKey, artUrl } from '../render/art/urls';
import { PlayerArt } from '../render/art/playerArt';
import { sideLooks, type ProtagonistLook, type RosterLook } from '../render/art/roster';
import { dirFromScreen } from '../render/art/spriteFactory';
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
  private session: TrainingSession | null = null;
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
  private stageIdx = -1;
  private title!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private buttons: Button[] = [];
  private tokenText: Phaser.GameObjects.Text[] = [];
  private art!: PlayerArt;
  private look: RosterLook | null = null;
  private lookName: ProtagonistLook | null = null;
  private me!: Phaser.GameObjects.Image;
  private sprites: Phaser.GameObjects.Image[] = [];
  private kits: { A: RosterLook[]; B: RosterLook[]; N: RosterLook[] } | null = null;
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
    this.kits = null;
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
    this.body = this.add.text(0, 0, '', { ...style, fontSize: '13px', lineSpacing: 2 }).setDepth(2001).setResolution(textResolution());
    this.hTitle = this.add.text(0, 0, 'TEAM TRAINING', { fontFamily: FONT_FAMILY, color: UI_CSS.gold, fontStyle: 'bold', fontSize: '16px' }).setDepth(2001).setResolution(textResolution());
    this.hSub = this.add.text(0, 0, '', { fontFamily: FONT_FAMILY, color: UI_CSS.cream, fontSize: '12px' }).setDepth(2001).setResolution(textResolution());
    this.hObj = this.add.text(0, 0, '', { ...style, fontSize: '12px' }).setDepth(2001).setResolution(textResolution());
    for (const st of STAGES) this.stageText.push(this.add.text(0, 0, st, { fontFamily: FONT_FAMILY, color: UI_CSS.cream, fontStyle: 'bold', fontSize: '12px' }).setOrigin(0.5).setDepth(2002).setResolution(textResolution()));
    this.loadCoach();
    this.art = new PlayerArt(this);
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
      const home = sideLooks('home', this.lookName ? { slot: 1, look: this.lookName } : null, { club: 'batavia', kit: 'training' });
      this.kits = {
        A: home,
        B: sideLooks('away', null, { club: 'batavia', kit: 'match' }),
        N: sideLooks('away', null, { club: 'sol_vista', kit: 'match' }),
      };
      if (this.lookName) this.look = home[1]!;
      this.art.ensure([...new Set([...this.kits.A, ...this.kits.B, ...this.kits.N].map((l) => l.set))]);
      this.role = ROLE_CHOICES[save.player.position][0]!;
      const plan = planFor(sessionId(1, save.week, this.slot), this.role);
      if (plan.status !== 'selected') return this.setScreen('unavailable', `Session ${sessionId(1, save.week, this.slot)} is not available yet. Its scenes have not passed testing, so nothing here is counted. Your weekly Team Training is still on the Team Training page.`);
      this.setScreen('role', '');
    }).catch(() => this.setScreen('unavailable', 'Your career save could not be opened.'));
  }

  private get id(): string { return this.save ? sessionId(1, this.save.week, this.slot) : ''; }

  /** Coach Code's approved portrait, cropped to his head and shoulders for the coaching panel. */
  private loadCoach(): void {
    const url = artUrl(COACH_ART);
    if (!url) return;
    const key = artTextureKey(COACH_ART);
    const place = (): void => {
      if (!this.sys.isActive() || !this.textures.exists(key) || this.coach) return;
      this.coach = this.add.image(0, 0, key).setDepth(2001).setCrop(150, 0, 230, 230).setOrigin(0, 0);
      this.layout();
    };
    if (this.textures.exists(key)) place();
    else {
      this.load.image(key, url);
      this.load.once(`filecomplete-image-${key}`, place);
      this.load.start();
    }
  }

  /** Review-only roles (the keeper; the career has no keeper position) never count toward the week. */
  private get reviewRole(): boolean {
    const pos = this.save?.player?.position;
    return !pos || !ROLE_CHOICES[pos].includes(this.role);
  }

  /** OBSERVE / DECIDE / PLAY / LEARN for the live drill, or -1 off the pitch loop. */
  private stage(): number {
    const d = this.session?.drill;
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
    const plan = planFor(this.id, this.role);
    if (plan.status !== 'selected') return this.setScreen('unavailable', `${ROLE_LABEL[this.role]} is not available for ${this.id} yet.`);
    const rand = Math.floor(Math.random() * 0x7fffffff);
    this.session = new TrainingSession(plan, save.player.id, `tt-${Date.now().toString(36)}-${rand.toString(36)}`, rand);
    this.setScreen('brief', '');
  }

  override update(_t: number, deltaMs: number): void {
    const s = this.session;
    if (s && this.screen === 'play') {
      // ?ttSpeed (debug) speeds up play only; the timed decision window always runs in real seconds.
      if (s.status === 'playing') s.update(Math.min(deltaMs / 1000, 0.1) * (s.drill?.phase === 'observe' ? 1 : this.speed));
      if (s.status === 'reflection') this.setScreen('reflection', '');
    }
    this.walk += deltaMs / 1000;
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

  /** Save the finished run once. The completion request comes from the reference engine; the score from assessed decisions. */
  private async finish(): Promise<void> {
    const s = this.session;
    const c = s?.completion;
    if (!s || !c || !this.store || !this.save) return;
    if (this.screen === 'saving') return;
    this.leaveArmed = false;
    this.setScreen('saving', 'Saving…');
    const score = s.score;
    // The same runId is idempotent in the reducer, so a failed save can be retried safely.
    let out: { ok: true; message: string } | { ok: false; error: string };
    try {
      const r = await this.store.dispatch({ type: 'tt12Run', week: this.save.week, slot: this.slot, runId: c.runId, score, creditEligible: c.creditEligible && !this.reviewRole, decisions: s.decisionCounts });
      out = r.ok ? { ok: true, message: r.message } : { ok: false, error: r.error };
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
    const d = s?.drill ?? null;
    const lines: string[] = [];
    let title = 'COACH CODE';
    type B = { name: string; label: string; onClick: () => void; fill?: number; small?: boolean };
    const buttons: B[] = [];
    const util = (b: Omit<B, 'small'>): void => void buttons.push({ ...b, small: true });
    const roundTxt = s ? `Round ${s.roundNumber} of 3 · ${s.guided ? 'Guided' : s.timed ? 'Game speed' : 'Your read'}` : '';
    const sess = sessions.find((x) => x.id === this.id);
    this.setSub([this.save ? `Season 1 · Week ${this.save.week} · Session ${this.slot}` : '', roundTxt, this.screen === 'play' || this.screen === 'brief' ? ROLE_LABEL[this.role] : ''].filter(Boolean));
    this.setObjective(s ? s.plan.definition.objective : (sess?.objective ?? ''));
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
          const ok = planFor(this.id, r).status === 'selected';
          const review = !ROLE_CHOICES[this.save!.player!.position].includes(r);
          buttons.push({ name: `role-${r}`, label: `${ROLE_LABEL[r]}${review ? ' (review, not counted)' : ''}${ok ? '' : ' (not available yet)'}`, onClick: () => { if (!ok) return; this.role = r; this.begin(); } });
        }
        break;
      }
      case 'brief': {
        title = `COACH CODE · ${s!.plan.practice.name}`;
        lines.push(roundTxt, '');
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
          title = 'PLAY PAUSED · YOUR DECISION';
          lines.push(s!.timed ? `Choose now: ${Math.ceil(s!.decideSecondsLeft)} s` : 'What do you do?');
          if (s!.hinted) lines.push(...situationCues(d).lines);
          else if (s!.guided) lines.push('Stuck? Hint shows what to look at (it counts as help).');
          s!.choices().forEach((c, i) => buttons.push({ name: `opt-${c.option.id}`, label: `${LETTERS[i]}  ${c.option.label}`, onClick: () => this.decide(c.option.id), fill: PALETTE.cream }));
          if (s!.hintAvailable) util({ name: 'tt-hint', label: s!.hinted ? 'Hint used' : 'Hint', onClick: () => this.hint(), fill: PALETTE.sand });
        } else if (d?.phase === 'explain') {
          title = 'COACH CODE · LEARN';
          const a = s!.attempts.at(-1);
          lines.push(...learnLines(a, d.outcome?.text ?? '', s!.timed));
          if (!s!.timed) buttons.push({ name: 'tt-replay', label: 'Replay this one', onClick: () => this.replay() });
          buttons.push({ name: 'tt-next', label: 'Next situation', onClick: () => this.next() });
        } else {
          title = d?.phase === 'execute' ? 'COACH CODE · PLAY' : 'COACH CODE · OBSERVE';
          lines.push(d?.phase === 'execute' ? 'Playing it out from where you paused…' : 'Watch: the pressure, the movement, the lanes and the space.');
          if (s!.replaying) lines.push('Replay: practice only, not counted.');
        }
        lines.push('', `Your active play: ${Math.floor(s!.activeSeconds)} s (30 s needed to count)`);
        util({ name: 'tt-pause', label: 'II Pause', onClick: () => this.togglePause(), fill: PALETTE.sand });
        break;
      }
      case 'reflection': {
        title = `COACH CODE · Round ${s!.roundNumber} done`;
        const mine = s!.attempts.filter((a) => a.round === s!.run.round && !a.replay);
        const good = mine.filter((a) => a.decision?.good).length;
        const helped = mine.filter((a) => a.hinted).length;
        lines.push(`${good} of ${mine.length} decisions were good reads.`, ...summary(mine));
        if (helped) lines.push(`${helped} used the hint: those count as help, not your own read.`);
        buttons.push({ name: 'tt-continue', label: s!.run.round >= 2 ? 'Finish session' : 'Next round', onClick: () => this.continueRound() });
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
        lines.push(`${real.filter((a) => a.decision?.good).length} of ${real.length} decisions were good reads (${dc.independent} on your own, ${dc.assisted} with the hint).`);
        lines.push(this.reviewRole ? 'Review route: not counted.' : c?.creditEligible ? 'Your play was observed: this session can count.' : 'Not enough of your own play to count this session.');
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
    const key = `${this.screen}|${s?.status}|${s?.drill?.phase}|${s?.attempts.length}|${this.leaveArmed}|${buttons.map((b) => b.name + b.label).join(',')}|${this.panel.width}x${this.panel.height}`;
    if (key === this.buttonKey) return this.fitBody(lines);
    this.buttonKey = key;
    for (const b of this.buttons) b.destroy();
    this.buttons = [];
    const P = this.panel;
    const pad = 8;
    const main = buttons.filter((b) => !b.small);
    const small = buttons.filter((b) => b.small);
    const sh = 34;
    const cols = main.length >= 2 && P.width >= 300 ? 2 : 1;
    const rows = Math.ceil(main.length / cols);
    const coachH = this.portraitBox.height + pad * 2;
    const room = P.height - coachH - (small.length ? sh + 6 : 0) - pad;
    const bh = rows ? Math.max(30, Math.min(44, Math.floor(room / rows) - 6)) : 0;
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
    main.forEach((b, i) => place(b, P.x + pad + (i % cols) * (bw + pad), top + Math.floor(i / cols) * (bh + 6), bw, bh, 14));
    const sw = (P.width - pad * (small.length + 1)) / Math.max(1, small.length);
    small.forEach((b, i) => place(b, P.x + pad + i * (sw + pad), smallTop, sw, sh, 13));
    const textX = this.portraitBox.x + this.portraitBox.width + pad;
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
    if (this.hObj.text === text || this.hObj.getData('full') === text) return;
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
    while (all.length > 1 && this.body.height > this.bodyMax) {
      all.pop();
      this.body.setText(all.join('\n'));
    }
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
    const ext = { w: HALF.width + HALF.margin * 2, h: HALF.length + HALF.margin * 2 + 2 };
    const usable = { x: ins.left, y: ins.top, width: w - ins.left - ins.right, height: h - ins.top - ins.bottom };
    const hdrH = portrait ? 64 : 44;
    const ftrH = portrait ? 28 : 24;
    this.header = { x: usable.x, y: usable.y, width: usable.width, height: hdrH };
    this.footer = { x: usable.x, y: usable.y + usable.height - ftrH, width: usable.width, height: ftrH };
    const midY = usable.y + hdrH;
    const midH = usable.height - hdrH - ftrH;
    if (portrait) {
      const panelH = Math.max(230, Math.round(midH * 0.42));
      this.panel = { x: usable.x, y: midY + midH - panelH, width: usable.width, height: panelH };
      this.field = { x: usable.x, y: midY, width: usable.width, height: midH - panelH };
    } else {
      const panelW = Math.max(260, Math.round(usable.width * 0.4));
      this.panel = { x: usable.x + usable.width - panelW, y: midY, width: panelW, height: midH };
      this.field = { x: usable.x, y: midY, width: usable.width - panelW, height: midH };
    }
    this.px = Math.min(this.field.width / ext.w, this.field.height / ext.h);
    const pb = portrait ? 64 : 56;
    this.portraitBox = { x: this.panel.x + 8, y: this.panel.y + 8, width: pb, height: pb };
    if (this.coach) this.coach.setScale(pb / 230).setPosition(this.portraitBox.x - 150 * (pb / 230), this.portraitBox.y);
    this.hTitle.setPosition(this.header.x + 10, this.header.y + 6);
    if (portrait) this.hSub.setPosition(this.header.x + 10, this.header.y + 26);
    else this.hSub.setPosition(this.hTitle.x + this.hTitle.width + 12, this.header.y + 8);
    this.hObj.setPosition(this.header.x + 10, this.header.y + (portrait ? 42 : 26)).setWordWrapWidth(this.header.width - 20);
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
    pg.fillStyle(UI.navyDeep, 1).fillRect(pbx.x, pbx.y, pbx.width, pbx.height);
    pg.lineStyle(2, UI.gold, 1).strokeRect(pbx.x, pbx.y, pbx.width, pbx.height);
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

  /** Restrained Bell94 / Scottsdale surroundings, outside the playing area only. */
  private drawScenery(): void {
    const g = this.bgG.clear();
    const f = this.field;
    const k = this.px;
    g.fillStyle(UI.desert, 1).fillRect(f.x, f.y, f.width, f.height);
    const tl = this.toScreen(-HALF.margin, HALF.length + HALF.margin + 1);
    const br = this.toScreen(HALF.width + HALF.margin, -HALF.margin);
    g.fillStyle(UI.path, 1).fillRect(tl.x - k * 0.8, tl.y - k * 0.8, br.x - tl.x + k * 1.6, br.y - tl.y + k * 1.6);
    g.fillStyle(PALETTE.surround, 1).fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    // Desert planting and floodlights in the corners of the frame, outside the path.
    const spots = [[f.x + 10, f.y + 12], [f.x + f.width - 12, f.y + 14], [f.x + 14, f.y + f.height - 12], [f.x + f.width - 10, f.y + f.height - 14]];
    for (const [x, y] of spots) {
      if (x! > tl.x - k && x! < br.x + k && y! > tl.y - k && y! < br.y + k) continue;
      g.fillStyle(UI.shrub, 1).fillCircle(x!, y!, 5).fillCircle(x! + 6, y! + 2, 4);
    }
    for (const [x, y] of [[tl.x - k * 0.4, tl.y - k * 0.4], [br.x + k * 0.4, tl.y - k * 0.4], [tl.x - k * 0.4, br.y + k * 0.4], [br.x + k * 0.4, br.y + k * 0.4]]) {
      g.fillStyle(0x5b5b66, 1).fillRect(x! - 1.5, y! - 1.5, 3, 3);
      g.fillStyle(0xfff6c8, 0.9).fillCircle(x!, y!, 2);
    }
  }

  /** Half-field metres (x across from the left touchline, y from the halfway line toward goal) to screen. */
  private toScreen(x: number, y: number): { x: number; y: number } {
    const k = this.px;
    const cx = this.field.x + this.field.width / 2;
    const cy = this.field.y + this.field.height / 2;
    return { x: cx + (x - HALF.width / 2) * k, y: cy + (HALF.length / 2 - y) * k + k };
  }

  /** Drill-area metres to half-field metres: the area is centred across and sits mid-half. */
  private drillToHalf(p: { x: number; y: number }): { x: number; y: number } {
    const d = this.session?.drill;
    if (!d) return p;
    return { x: (HALF.width - d.W) / 2 + p.y, y: (HALF.length - d.L) / 2 + p.x };
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
    g.fillStyle(PALETTE.net, 0.35).fillRect(ga.x, ga.y - 1.6 * k, HALF.goalWidth * k, 1.6 * k);
    g.lineStyle(Math.max(2, k * 0.2), 0xffffff, 1).strokeRect(ga.x, ga.y - 1.6 * k, HALF.goalWidth * k, 1.6 * k);
    const s = this.session;
    const d = s?.drill;
    for (const t of this.tokenText) t.setVisible(false);
    if (!d) {
      for (const im of this.sprites) im.setVisible(false);
      return void this.me.setVisible(false);
    }
    const a0 = this.toScreen(this.drillToHalf({ x: 0, y: 0 }).x, this.drillToHalf({ x: 0, y: 0 }).y);
    const a1 = this.toScreen(this.drillToHalf({ x: d.L, y: d.W }).x, this.drillToHalf({ x: d.L, y: d.W }).y);
    g.fillStyle(0xffffff, 0.08).fillRect(Math.min(a0.x, a1.x), Math.min(a0.y, a1.y), Math.abs(a1.x - a0.x), Math.abs(a1.y - a0.y));
    g.lineStyle(2, PALETTE.mustard, 0.9).strokeRect(Math.min(a0.x, a1.x), Math.min(a0.y, a1.y), Math.abs(a1.x - a0.x), Math.abs(a1.y - a0.y));
    for (const t of d.targets) {
      const p = this.drillToHalf({ x: t.cx, y: t.cy - t.half });
      const q = this.drillToHalf({ x: t.cx, y: t.cy + t.half });
      const sp = this.toScreen(p.x, p.y);
      const sq = this.toScreen(q.x, q.y);
      g.lineStyle(Math.max(3, k * 0.35), t.scoresFor === 'A' ? PALETTE.blue : t.scoresFor === 'B' ? PALETTE.tomato : PALETTE.cream, 1).lineBetween(sp.x, sp.y, sq.x, sq.y);
    }
    this.drawTactical(s!, k);
    const r = Math.max(6, k * 0.55);
    const h = Math.max(26, k * 2.6);
    const pose = Math.floor(this.walk * 8) % 6;
    const used = { A: 0, B: 0, N: 0 };
    d.actors.forEach((a, i) => {
      const p = this.actorScreen(a);
      const keeper = a.side.startsWith('GK');
      const team = keeper ? (a.side.endsWith('B') ? 'B' : 'A') : a.side === 'A' || a.side === 'B' ? a.side : 'N';
      const moving = Math.hypot(a.vel.x, a.vel.y) > 0.4;
      const dir = moving ? dirFromScreen(a.vel.y, -a.vel.x) : 2;
      g.fillStyle(PALETTE.shadow, 0.25).fillEllipse(p.x, p.y + r * 0.2, r * 2.2, r);
      if (a.human) g.lineStyle(3, PALETTE.sun, 1).strokeEllipse(p.x, p.y + r * 0.2, r * 3, r * 1.4);
      const im = (this.sprites[i] ??= this.add.image(-100, -100, '__DEFAULT').setDepth(900));
      if (a.human) {
        im.setVisible(false);
        return;
      }
      const kit = this.kits?.[team];
      // Home slot 1 is the protagonist's sheet, so home teammates use slots 2-8.
      const look = kit ? (keeper ? kit[0]! : team === 'A' ? kit[2 + (used.A++ % 7)]! : kit[1 + (used[team]++ % 8)]!) : null;
      if (!look) {
        im.setVisible(false);
        g.fillStyle(team === 'A' ? PALETTE.blue : team === 'B' ? PALETTE.tomato : PALETTE.mustard, 1).fillCircle(p.x, p.y, r);
        return;
      }
      im.setDepth(900 + p.y / 10000);
      this.art.apply(im, look, moving ? 'run' : 'idle', dir, pose, h).setPosition(p.x, p.y).setVisible(true);
    });
    for (let i = d.actors.length; i < this.sprites.length; i++) this.sprites[i]!.setVisible(false);
    const me = d.actors.find((x) => x.human)!;
    const mp = this.actorScreen(me);
    const mine = this.look ?? this.kits?.A[1] ?? null;
    if (mine) {
      const moving = Math.hypot(me.vel.x, me.vel.y) > 0.4;
      const dir = moving ? dirFromScreen(me.vel.y, -me.vel.x) : 2;
      this.art.apply(this.me, mine, moving ? 'run' : 'idle', dir, pose, h).setPosition(mp.x, mp.y).setDepth(901).setVisible(true);
    } else this.me.setVisible(false);
    const bp = this.drillToHalf(d.ball.pos);
    const bs = this.toScreen(bp.x, bp.y);
    this.ballG.fillStyle(0xffffff, 1).fillCircle(bs.x, bs.y, Math.max(4, k * 0.3));
    this.ballG.lineStyle(1.5, PALETTE.ink, 1).strokeCircle(bs.x, bs.y, Math.max(4, k * 0.3));
  }

  private drillScreen(p: { x: number; y: number }): { x: number; y: number } {
    const h = this.drillToHalf(p);
    return this.toScreen(h.x, h.y);
  }

  /**
   * Tactical overlay. DECIDE: a same-style letter tag where each choice goes (no arrows, no colour for the best one);
   * the hint adds cyan pressure rings and pass lanes. LEARN: the frozen moment, your choice in gold, good reads in cyan.
   */
  private drawTactical(s: TrainingSession, k: number): void {
    const d = s.drill!;
    const t = this.tacG;
    const tagR = Math.max(9, k * 0.65);
    if (d.phase === 'observe' && s.status === 'playing') {
      if (s.hinted) {
        const cues = situationCues(d);
        const holder = d.actors.find((a) => a.slot === d.ball.owner);
        for (const l of cues.lanes) {
          const to = d.actors.find((a) => a.slot === l.to);
          if (!holder || !to) continue;
          const a = this.actorScreen(holder);
          const b = this.actorScreen(to);
          t.lineStyle(2, UI.cyan, l.open ? 0.9 : 0.25).lineBetween(a.x, a.y, b.x, b.y);
        }
        for (const slot of cues.pressure) {
          const o = d.actors.find((a) => a.slot === slot);
          if (o) { const p = this.actorScreen(o); t.lineStyle(2, UI.cyan, 0.9).strokeCircle(p.x, p.y, Math.max(10, k * 1.2)); }
        }
      }
      s.choices().forEach((ch, i) => {
        const to = this.drillScreen(ch.option.point);
        t.fillStyle(UI.cream, 1).fillCircle(to.x, to.y, tagR);
        t.lineStyle(2, UI.navy, 1).strokeCircle(to.x, to.y, tagR);
        this.label(`opt${i}`, LETTERS[i]!, to.x, to.y);
      });
      return;
    }
    const a = s.attempts.at(-1);
    if (d.phase !== 'explain' || !a) return;
    const fz = a.frozen;
    for (const x of fz.actors) {
      const p = this.drillScreen(x.pos);
      t.fillStyle(x.human ? UI.gold : 0xffffff, 0.35).fillCircle(p.x, p.y, Math.max(4, k * 0.4));
    }
    const me = fz.actors.find((x) => x.human);
    if (!me) return;
    const from = this.drillScreen(me.pos);
    for (const g of fz.good) {
      const to = this.drillScreen(g.point);
      t.lineStyle(2, UI.cyan, 0.95).lineBetween(from.x, from.y, to.x, to.y);
      t.fillStyle(UI.cyan, 1).fillCircle(to.x, to.y, Math.max(5, k * 0.4));
    }
    if (fz.chosen) {
      const to = this.drillScreen(fz.chosen);
      t.lineStyle(3, UI.gold, 1).lineBetween(from.x, from.y, to.x, to.y);
      t.lineStyle(3, UI.gold, 1).strokeCircle(to.x, to.y, Math.max(7, k * 0.6));
    }
  }

  private actorScreen(a: DrillActor): { x: number; y: number } {
    const h = this.drillToHalf(a.pos);
    return this.toScreen(h.x, h.y);
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
    const tl = this.toScreen(-HALF.margin, HALF.length + 2);
    const br = this.toScreen(HALF.width + HALF.margin, -HALF.margin);
    return {
      orientation: orientationOf({ width: w, height: h }),
      viewport: { width: w, height: h },
      elements: { ...this.elements, half: { x: tl.x, y: tl.y, width: br.x - tl.x, height: br.y - tl.y } },
    };
  }

  describeGameplay(): unknown {
    const s = this.session;
    const d = s?.drill;
    return {
      screen: this.screen,
      sessionId: this.id,
      slot: this.slot,
      role: this.role,
      look: this.lookName,
      sprite: this.me.visible ? (this.look?.set ?? null) : null,
      squadSprites: this.sprites.filter((im) => im.visible).map((im) => im.texture.key),
      bodyBottom: this.body.y + this.body.height,
      titleBottom: this.title.y + this.title.height,
      buttonsTop: Math.min(...this.buttons.map((b) => b.y - b.height / 2)),
      status: s?.status ?? null,
      round: s?.run.round ?? null,
      phase: d?.phase ?? null,
      options: d?.phase === 'observe' && s?.status === 'playing' ? s.choices().map((c, i) => ({ id: c.option.id, letter: LETTERS[i], label: c.option.label, kind: c.option.kind, good: c.assessment.good, quality: c.assessment.quality })) : [],
      stage: STAGES[this.stage()] ?? null,
      hinted: s?.hinted ?? false,
      hintAvailable: s?.hintAvailable ?? false,
      replaying: s?.replaying ?? false,
      reviewRole: this.save ? this.reviewRole : null,
      decisions: s?.decisionCounts ?? null,
      header: { title: this.hTitle.text, sub: this.hSub.text, objective: this.hObj.getData('full') as string | null, objectiveShown: this.hObj.text },
      choiceTagsVisible: this.tokenText.filter((t) => t.visible).length,
      coachPortrait: this.coach?.visible ?? false,
      lastAttempt: s?.attempts.at(-1) ? { optionId: s.attempts.at(-1)!.optionId, hinted: s.attempts.at(-1)!.hinted, replay: s.attempts.at(-1)!.replay, good: s.attempts.at(-1)!.decision?.good ?? null, goodIds: s.attempts.at(-1)!.frozen.good.map((g) => g.id) } : null,
      textBottoms: { header: this.hObj.y + this.hObj.height, headerBottom: this.header.y + this.header.height },
      attempts: s?.attempts.length ?? 0,
      activeSeconds: s?.activeSeconds ?? 0,
      rejected: s?.rejected ?? 0,
      generation: s?.generation ?? null,
      completion: s?.completion ? { creditEligible: s.completion.creditEligible, masteryGranted: s.completion.masteryGranted, runId: s.completion.runId } : null,
      saved: this.saved,
      message: this.message,
      pxPerMetre: this.px,
    };
  }

  private onShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.onBlur, this);
    this.art.destroy();
    this.store?.close();
    this.store = null;
    this.session = null;
  }
}

/** LEARN text: the decision verdict, then the result, kept apart; reasons read from the frozen moment. */
export function learnLines(a: Attempt | undefined, fallback: string, timed: boolean): string[] {
  if (!a) return [fallback];
  const out: string[] = [];
  if (a.replay) out.push('Replay: practice only, not counted.');
  if (a.decision) {
    out.push(`Decision: ${a.decision.good ? 'a good read' : 'another option was stronger here'}${a.hinted ? ' (with the hint)' : ''}.`);
    out.push(...a.decision.reasons.slice(0, timed ? 1 : 2).map((r) => `• ${r}`));
    const others = a.frozen.good.filter((g) => g.id !== a.optionId).map((g) => g.label);
    if (others.length) out.push(`${a.decision.good ? 'Also a good read' : 'Stronger here'}: ${others.join(' or ')} (cyan).`);
  }
  out.push(`Result: ${a.outcome || fallback}`);
  return out;
}

function summary(attempts: readonly { decision: { good: boolean } | null; kind: string | null }[]): string[] {
  const missed = attempts.filter((a) => !a.decision).length;
  return missed ? [`${missed} moment${missed === 1 ? '' : 's'} passed without a decision.`] : [];
}
