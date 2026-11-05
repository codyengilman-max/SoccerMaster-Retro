import Phaser from 'phaser';
import type { Rect } from '../game';
import { CareerStore } from '../game/career/store';
import type { CareerSave } from '../game/career/state';
import type { ChoiceId, Metres, VariantId } from '../game/training12/all36/types';
import { MomentDirector, explain, mirrorScene, type Stage } from '../game/training12/moments/director';
import { effectiveStatus, momentScene, outcomesFor, playerMoment, sceneHash } from '../game/training12/moments/index';
import type { MomentScene } from '../game/training12/moments/schema';
import { contacts, type ActorSample, type Frame } from '../game/training12/moments/timeline';
import { releaseBlockers } from '../game/training12/moments/validate';
import { ballFrame, ensureJungle4, jungle4Key } from '../render/art/jungle4Art';
import { ensureTtArt, ttKey } from '../render/art/teamTrainingArt';
import { PASS_CONTACT_FRAME, stillCast, targetBody, TT_ART, ttFrame, ttScale, type TtSheet } from '../render/art/teamTrainingFrames';
import { artTextureKey, artUrl } from '../render/art/urls';
import { orientationOf } from '../render/layout';
import { FONT_FAMILY, textResolution } from '../render/theme';
import type { GameplayScene, InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';

export interface TacticalMomentsData {
  readonly situationId?: string;
  readonly variant?: VariantId;
  /** Owner review mode (`?dev` only): drafts, scrubber, every branch, coordinates. Never credits. */
  readonly review?: boolean;
  readonly mirror?: boolean;
  readonly originalOnly?: boolean;
  readonly look?: 'boy' | 'girl';
  readonly returnTo?: 'story';
}

/** Mockup palette: cream panels, navy stage labels, amber controls, restrained dark borders. */
const TM = { cream: 0xfff4dc, navy: 0x14213d, amber: 0xf2a93b, amberDown: 0xd98e1f, border: 0x2a2a2a, grass: 0x3f7d3a, grass2: 0x47883f, line: 0xffffff, ink: '#14213d', creamCss: '#fff4dc' } as const;
const STAGE_LABEL: Readonly<Record<Stage, string>> = { brief: 'BRIEF', watch: 'WATCH', slow: 'SLOW', decide: 'DECIDE', result: 'RESULT', learn: 'LEARN', done: 'DONE' };
const COACH_ART = 'coach-club';
const GOAL_WIDTH = 6.4;
const CHOICE_IDS: readonly ChoiceId[] = ['A', 'B', 'C', 'D'];

/**
 * Tactical Moments: one reviewed All36 movement scene on a fixed true-overhead pitch. Brief → Watch → Slow → Decide →
 * Result → Learn → Retry/Continue, driven by the framework-free MomentDirector; this scene only draws its frames.
 * Players reach it only for an owner-approved scene version; `?dev` review mode shows drafts and never saves.
 */
export class TacticalMomentsScene extends Phaser.Scene implements InspectableScene, GameplayScene {
  private director: MomentDirector | null = null;
  private moment: MomentScene | null = null;
  private review = false;
  private mirrored = false;
  /** Review: show the package's original frozen explanations instead of the outcome drafts. */
  private originalOnly = false;
  private returnTo: 'story' | null = null;
  private look: 'boy' | 'girl' = 'boy';
  private cast: ReadonlyMap<string, TtSheet> = new Map();
  private store: CareerStore | null = null;
  private save: CareerSave | null = null;
  private runId = '';
  private saved = '';
  private creditChoice: ChoiceId | null = null;
  private saveState: 'idle' | 'saving' | 'saved' | 'failed' = 'idle';
  private message = '';
  private entry = 0;
  private g!: Phaser.GameObjects.Graphics;
  private over!: Phaser.GameObjects.Graphics;
  private ui!: Phaser.GameObjects.Graphics;
  private clip!: Phaser.GameObjects.Graphics;
  private header!: Phaser.GameObjects.Text;
  private stageText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private coachText!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;
  private coach: Phaser.GameObjects.Image | null = null;
  private sprites = new Map<string, Phaser.GameObjects.Image>();
  private ballImg!: Phaser.GameObjects.Image;
  private tags: Phaser.GameObjects.Text[] = [];
  private buttons: Button[] = [];
  private buttonKey = '';
  private pitch: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private panel: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private scrub: Rect | null = null;
  private elements: Record<string, Rect> = {};
  private drawn: { id: string; sheet: TtSheet; frame: number; flip: boolean; action: string; since: number; at: Metres; feet: { x: number; y: number }; me: boolean; sprite: boolean }[] = [];
  private ballDrawn: { at: Metres; x: number; y: number; size: number; texture: string; frame: string; state: string } | null = null;

  constructor() {
    super(SceneKeys.Moments);
  }

  create(data: TacticalMomentsData = {}): void {
    this.review = !!data.review && new URLSearchParams(window.location.search).has('dev');
    this.mirrored = this.review && !!data.mirror;
    this.originalOnly = this.review && !!data.originalOnly;
    this.returnTo = data.returnTo === 'story' ? 'story' : null;
    this.look = data.look === 'girl' ? 'girl' : 'boy';
    this.director = null;
    this.moment = null;
    this.save = null;
    this.saved = '';
    this.creditChoice = null;
    this.saveState = 'idle';
    this.message = '';
    this.sprites = new Map();
    this.tags = [];
    this.buttons = [];
    this.buttonKey = '';
    this.coach = null;
    this.drawn = [];
    this.ballDrawn = null;
    this.cameras.main.setBackgroundColor('#0d1630');
    const res = textResolution();
    this.g = this.add.graphics().setDepth(1);
    this.clip = this.make.graphics({}, false);
    const mask = this.clip.createGeometryMask();
    this.over = this.add.graphics().setDepth(6).setMask(mask);
    this.ui = this.add.graphics().setDepth(9);
    this.ballImg = this.add.image(-100, -100, '__DEFAULT').setDepth(5.5).setVisible(false).setMask(mask);
    const txt = (size: number, color: string, bold = false) => this.add.text(0, 0, '', { fontFamily: FONT_FAMILY, color, fontSize: `${size}px`, ...(bold ? { fontStyle: 'bold' } : {}), wordWrap: { width: 300, useAdvancedWrap: true } }).setResolution(res).setDepth(10);
    this.header = txt(11, '#f2c14e', true);
    this.stageText = txt(13, TM.creamCss, true);
    this.speedText = txt(11, TM.creamCss, true);
    this.coachText = txt(13, TM.ink);
    this.info = txt(10, TM.creamCss);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointer, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointer, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    ensureJungle4(this, ['jungle4-ball']);
    this.loadCoach();
    const entry = ++this.entry;
    if (this.review) {
      const s = momentScene(data.situationId ?? 'D01', data.variant ?? 'base');
      if (!s) return this.unavailable('No draft scene for that situation.');
      return this.begin(this.mirrored ? mirrorScene(s) : s);
    }
    // Player-facing: only an approved scene version for the saved week's assignment.
    void CareerStore.open()
      .then(async (store) => {
        if (entry !== this.entry || !this.sys.isActive()) return store.close();
        this.store = store;
        const save = await store.load();
        if (entry !== this.entry || !this.sys.isActive()) return;
        this.save = save;
        this.look = save.player?.gender === 'girl' ? 'girl' : 'boy';
        const s = data.situationId && data.variant ? playerMoment(data.situationId, data.variant) : null;
        if (!s) return this.unavailable('This Tactical Moment is not approved yet. Nothing was recorded.');
        this.runId = `tm-${save.week}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
        this.begin(s);
      })
      .catch(() => this.unavailable('Your career save could not be opened.'));
  }

  private unavailable(message: string): void {
    this.message = message;
    this.layout();
  }

  private begin(s: MomentScene): void {
    this.moment = s;
    this.director = new MomentDirector(s, undefined, this.review && !this.originalOnly ? outcomesFor(s, true) : outcomesFor(s, false));
    const actors = s.actors.map((a) => ({ id: a.id, team: a.team, role: a.role, at: a.decision }));
    this.cast = stillCast(this.look, actors, s.protagonist.actorId);
    if (!ensureTtArt(this, [...new Set(this.cast.values())])) this.load.once(Phaser.Loader.Events.COMPLETE, () => this.sys.isActive() && this.layout());
    this.layout();
  }

  override update(_time: number, deltaMs: number): void {
    const d = this.director;
    if (!d) return;
    const before = d.stage;
    // The director samples by scene time and crosses stage edges inside one tick, so no elapsed time is dropped.
    d.tick(deltaMs / 1000);
    if (d.stage !== before) this.buttonKey = '';
    this.drawFrame();
    this.drawChrome();
  }

  // ---- actions ------------------------------------------------------------------------------------

  private onHidden(): void {
    this.director?.pause();
    this.buttonKey = '';
  }

  private choose(k: ChoiceId): void {
    const d = this.director;
    if (!d) return;
    const first = d.attempts.length === 0;
    if (!d.choose(k)) return;
    this.buttonKey = '';
    // Credit: only the first unassisted answer of a player-facing session goes to the existing weekly reducer,
    // whose runId makes refreshes and repeated submissions idempotent. Retries, hints and replays never credit.
    if (!this.review && first && !d.assisted && this.store && this.save && this.moment) {
      this.creditChoice = k;
      void this.record();
    }
  }

  /** Saves the first eligible answer under its own runId; a failed write keeps that answer and can be retried as-is. */
  private async record(): Promise<void> {
    const k = this.creditChoice;
    if (!k || !this.store || !this.save || !this.moment || this.saveState === 'saving') return;
    this.saveState = 'saving';
    this.buttonKey = '';
    try {
      const r = await this.store.dispatch({ type: 'all36Weekly', week: this.save.week, situationId: this.moment.library.situationId, runId: this.runId, at: Date.now(), choice: k });
      this.saved = r.ok ? r.message : r.error;
      if (r.ok) this.save = r.save;
      this.saveState = r.ok ? 'saved' : 'failed';
    } catch (e) {
      this.saved = e instanceof Error ? e.message : 'The save could not be written.';
      this.saveState = 'failed';
    }
    this.buttonKey = '';
  }

  private leave(): void {
    if (this.saveState === 'saving') return;
    if (this.review) return void this.scene.start(SceneKeys.MomentsReview, { situationId: this.moment?.library.situationId });
    this.scene.start(SceneKeys.Career, { open: 'team', ...(this.returnTo ? { returnTo: this.returnTo } : {}) });
  }

  private reopen(patch: Partial<TacticalMomentsData>): void {
    const s = this.moment;
    this.scene.restart({ review: true, situationId: s?.library.situationId, variant: s?.library.variant, look: this.look, mirror: this.mirrored, originalOnly: this.originalOnly, ...patch });
  }

  private onPointer(p: Phaser.Input.Pointer): void {
    const r = this.scrub;
    const d = this.director;
    if (!this.review || !r || !d || !p.isDown) return;
    if (p.x < r.x || p.x > r.x + r.width || p.y < r.y - 8 || p.y > r.y + r.height + 8) return;
    const dur = this.timelineDuration();
    d.pause();
    d.seek(((p.x - r.x) / r.width) * dur);
    this.buttonKey = '';
  }

  private timelineDuration(): number {
    const d = this.director;
    if (!d || !this.moment) return 1;
    return d.resultTimeline && (d.stage === 'result' || d.stage === 'learn') ? d.resultTimeline.duration : this.moment.decision.t;
  }

  // ---- layout -------------------------------------------------------------------------------------

  private onResize(): void {
    this.buttonKey = '';
    this.layout();
  }

  private layout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const portrait = h >= w;
    const pad = 8;
    const headH = 24;
    this.header.setPosition(pad, pad + 2).setFontSize(w < 420 ? 10 : 11);
    const top = pad + headH;
    const cam = this.moment?.camera ?? [0, 0, 45.72, 38];
    const aspect = (cam[3] - cam[1]) / (cam[2] - cam[0]);
    const extra = 26 + (this.review ? 26 : 0);
    if (portrait) {
      // The pitch takes the width at the camera's aspect (it dominates); Coach Code and the controls get the rest.
      const minPanel = this.review ? 250 : 170;
      const pitchH = Math.min(h - top - minPanel - pad * 2, (w - 2 * pad) * aspect + extra);
      const panelH = h - top - pitchH - pad * 2;
      this.pitch = { x: pad, y: top, width: w - 2 * pad, height: pitchH };
      this.panel = { x: pad, y: this.pitch.y + this.pitch.height + pad, width: w - 2 * pad, height: panelH };
    } else {
      const panelW = Math.max(220, Math.min(w * 0.36, 360));
      this.pitch = { x: pad, y: top, width: w - panelW - pad * 3, height: h - top - pad };
      this.panel = { x: this.pitch.x + this.pitch.width + pad, y: top, width: panelW, height: h - top - pad };
    }
    this.buttonKey = '';
    this.drawFrame();
    this.drawChrome();
  }

  /** Metres to screen: the scene camera window fitted into the pitch box, home attacking up the screen. */
  private view(): { s: number; ox: number; oy: number; b: readonly [number, number, number, number] } {
    const b = this.moment?.camera ?? [0, 0, 45.72, 38];
    const bw = b[2] - b[0];
    const bh = b[3] - b[1];
    const head = 26;
    const foot = this.review ? 26 : 0;
    const s = Math.min(this.pitch.width / bw, (this.pitch.height - head - foot) / bh);
    return { s, ox: this.pitch.x + (this.pitch.width - bw * s) / 2, oy: this.pitch.y + head + (this.pitch.height - head - foot - bh * s) / 2, b };
  }

  private toScreen(p: Metres): { x: number; y: number } {
    const { s, ox, oy, b } = this.view();
    return { x: ox + (p[0] - b[0]) * s, y: oy + (b[3] - p[1]) * s };
  }

  // ---- drawing ------------------------------------------------------------------------------------

  private frameFor(a: ActorSample, keeper: boolean): number {
    if (!keeper && a.action === 'pass' && a.since < 0) return a.since < -0.18 ? PASS_CONTACT_FRAME - 2 : PASS_CONTACT_FRAME - 1;
    return ttFrame(keeper, a.action, a.phase, a.since);
  }

  private drawFrame(): void {
    const g = this.g.clear();
    const over = this.over.clear();
    for (const t of this.tags) t.destroy();
    this.tags = [];
    const s = this.moment;
    const d = this.director;
    if (!s || !d) {
      for (const im of this.sprites.values()) im.setVisible(false);
      this.ballImg.setVisible(false);
      return;
    }
    const { s: k, b } = this.view();
    const tl = this.toScreen([b[0], b[3]]);
    const W = s.field.width;
    const L = s.field.length;
    const pw = (b[2] - b[0]) * k;
    const ph = (b[3] - b[1]) * k;
    // Mown stripes across the pitch (parallel to the goal lines), then touchlines, halfway, boxes and goals.
    for (let y = 0, i = 0; y < L; y += 5, i++) {
      const y0 = Math.max(y, b[1]);
      const y1 = Math.min(y + 5, b[3]);
      if (y1 <= y0) continue;
      const p0 = this.toScreen([b[0], y1]);
      g.fillStyle(i % 2 ? TM.grass2 : TM.grass, 1).fillRect(p0.x, p0.y, pw, (y1 - y0) * k);
    }
    g.lineStyle(2, TM.line, 0.9);
    const seg = (p: Metres, q: Metres) => {
      const A = this.toScreen(p);
      const B = this.toScreen(q);
      g.lineBetween(A.x, A.y, B.x, B.y);
    };
    const cy = (y: number) => Math.min(Math.max(y, b[1]), b[3]);
    const cx = (x: number) => Math.min(Math.max(x, b[0]), b[2]);
    if (b[0] <= 0) seg([0, cy(0)], [0, cy(L)]);
    if (b[2] >= W) seg([W, cy(0)], [W, cy(L)]);
    for (const y of [0, L / 2, L]) if (y >= b[1] && y <= b[3]) seg([cx(0), y], [cx(W), y]);
    // 9v9 penalty areas (16.5 m x 40.3 m scaled to the 45.72 m width: 12.8 m deep, 32 m wide) where visible.
    const box = (y0: number, dir: 1 | -1) => {
      const y1 = y0 + dir * 12.8;
      const xa = W / 2 - 16;
      const xb = W / 2 + 16;
      if (Math.min(y0, y1) > b[3] || Math.max(y0, y1) < b[1]) return;
      seg([xa, cy(y0)], [xa, cy(y1)]);
      seg([xb, cy(y0)], [xb, cy(y1)]);
      if (y1 >= b[1] && y1 <= b[3]) seg([xa, y1], [xb, y1]);
    };
    box(0, 1);
    box(L, -1);
    g.lineStyle(4, TM.line, 1);
    for (const y of [0, L]) if (y >= b[1] && y <= b[3]) seg([W / 2 - GOAL_WIDTH / 2, y], [W / 2 + GOAL_WIDTH / 2, y]);
    g.lineStyle(2, TM.border, 1).strokeRect(tl.x, tl.y, pw, ph);
    this.clip.clear().fillStyle(0xffffff, 1).fillRect(tl.x, tl.y - 26, pw, ph + 26);
    this.elements.pitch = { x: tl.x, y: tl.y, width: pw, height: ph };

    const f: Frame = d.frame();
    // Learn: teaching arrows and shaded space, only those the reviewed branch defines (chosen, plus the best read).
    if (d.stage === 'learn' || (d.stage === 'done' && d.choice)) {
      const best = s.actions.filter((a) => a.grade === 'preferred').map((a) => a.id);
      for (const ck of [d.choice!, ...best.filter((x) => x !== d.choice)]) {
        for (const n of s.branches[ck].annotations) {
          const col = ck === d.choice ? 0xffffff : 0xf2c14e;
          if (n.kind === 'space' && n.at && n.radius) {
            const c = this.toScreen(n.at);
            over.fillStyle(0xf2c14e, 0.22).fillCircle(c.x, c.y, n.radius * k);
          } else if (n.kind === 'arrow' && n.from && n.to) this.arrow(over, this.toScreen(n.from), this.toScreen(n.to), col);
        }
      }
    }
    // Decide: neutral numbered markers on the options that move the ball (never coloured by grade).
    if (d.stage === 'decide' || (this.review && d.stage === 'brief')) {
      for (const a of s.actions) {
        if (!a.marker) continue;
        const c = this.toScreen(a.marker);
        over.fillStyle(TM.navy, 0.9).fillCircle(c.x, c.y, 9).lineStyle(2, TM.cream, 1).strokeCircle(c.x, c.y, 9);
        this.tag(a.id, c.x, c.y - 7, TM.creamCss, 11, true);
      }
    }
    const sc = ttScale(k);
    const body = targetBody(k);
    const r = body * 0.24;
    this.drawn = [];
    for (const a of f.actors) {
      const meta = s.actors.find((x) => x.id === a.id)!;
      const keeper = meta.role === 'GK';
      const sheet = this.cast.get(a.id)!;
      const p = this.toScreen(a.at);
      const me = a.id === s.protagonist.actorId;
      g.fillStyle(0x000000, 0.28).fillEllipse(p.x, p.y, r * 2, r * 0.7);
      // Subtle protagonist identifier: a ground ring only; the sheet's own outline is the body highlight (no extra scale).
      if (me) g.lineStyle(2, 0xf2c14e, 0.9).strokeEllipse(p.x, p.y, r * 2.8, r * 1.05);
      const frame = this.frameFor(a, keeper);
      const flip = a.look[0] < a.at[0] - 0.25;
      const ready = this.textures.exists(ttKey(sheet));
      let im = this.sprites.get(a.id);
      if (ready) {
        im ??= this.add.image(p.x, p.y, ttKey(sheet)).setMask(this.over.mask!);
        this.sprites.set(a.id, im);
        im.setTexture(ttKey(sheet), frame).setOrigin(TT_ART.anchor.x / TT_ART.cell.w, TT_ART.anchor.y / TT_ART.cell.h).setScale(sc).setFlipX(flip).setPosition(p.x, p.y).setDepth(3 + p.y / 10000).setVisible(true);
      } else im?.setVisible(false);
      this.drawn.push({ id: a.id, sheet, frame, flip, action: a.action, since: a.since, at: a.at, feet: p, me, sprite: ready });
      if (me) this.tag('YOU', p.x, Math.max(tl.y - 12, p.y - body - 14), '#f2c14e', 10, true);
      if (this.review) this.tag(a.id.replace(/^[HA]_/, ''), p.x, p.y + 2, a.id.startsWith('H') ? '#ffd9b0' : '#d6ffd0', 9, false);
    }
    // The approved patterned ball, its own object above every body, spinning with distance rolled.
    const bp = this.toScreen(f.ball.at);
    const size = Math.max(7, k * 0.75);
    const key = jungle4Key('jungle4-ball');
    g.fillStyle(0x000000, 0.3).fillEllipse(bp.x, bp.y, size, size * 0.4);
    const fr = ballFrame(f.ball.roll);
    if (this.textures.exists(key)) this.ballImg.setTexture(key, fr).setDisplaySize(size, size).setPosition(bp.x, bp.y - size * 0.5).setDepth(5.5).setVisible(true);
    else this.ballImg.setVisible(false);
    this.ballDrawn = { at: f.ball.at, x: bp.x, y: bp.y, size, texture: this.textures.exists(key) ? key : 'loading', frame: fr, state: f.ball.state.mode === 'held' ? `held:${f.ball.state.by}` : f.ball.state.mode };
  }

  private arrow(gr: Phaser.GameObjects.Graphics, a: { x: number; y: number }, b: { x: number; y: number }, col: number): void {
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    gr.lineStyle(3, col, 0.95).lineBetween(a.x, a.y, b.x - Math.cos(ang) * 6, b.y - Math.sin(ang) * 6);
    gr.fillStyle(col, 0.95).fillTriangle(b.x, b.y, b.x - Math.cos(ang - 0.45) * 11, b.y - Math.sin(ang - 0.45) * 11, b.x - Math.cos(ang + 0.45) * 11, b.y - Math.sin(ang + 0.45) * 11);
  }

  private tag(text: string, x: number, y: number, color: string, size: number, bold: boolean): void {
    const t = this.add.text(x, y, text, { fontFamily: FONT_FAMILY, color, fontSize: `${size}px`, ...(bold ? { fontStyle: 'bold' } : {}) }).setResolution(textResolution()).setOrigin(0.5, 0).setDepth(7);
    this.tags.push(t);
  }

  private coachLine(): string {
    const s = this.moment;
    const d = this.director;
    if (!s || !d) return this.message || 'Loading Tactical Moment…';
    switch (d.stage) {
      case 'brief':
        return s.brief;
      case 'watch':
        return 'Watch the picture develop.';
      case 'slow':
        return 'Slow motion. What is changing?';
      case 'decide':
        return d.assisted ? `What do you do? Look at this: ${s.cues[0] ?? s.objective}` : 'Frozen. What do you do?';
      case 'result':
        return `You chose ${d.choice}: ${s.actions.find((a) => a.id === d.choice)?.label ?? ''}`;
      case 'learn':
      case 'done': {
        const x = explain(s, d.evaluation!, d.choice ? d.outcomes[d.choice] : undefined);
        return `${x.mattered}\nYou: ${x.chose}\n${x.changed}\n${x.next}${this.saved ? `\n${this.saved}` : ''}`;
      }
    }
  }

  private drawChrome(): void {
    const w = this.scale.width;
    const d = this.director;
    const s = this.moment;
    const ui = this.ui.clear();
    const small = this.scale.width < 520 || this.scale.height < 500;
    this.header.setText(`TEAM TRAINING${small ? '' : ' · TACTICAL MOMENTS'}${s ? ` · ${s.library.situationId} ${s.library.variant}${this.mirrored ? ' mirror' : ''}` : ''}${this.review && s ? ` · ${effectiveStatus(s)}` : ''}`);
    // Stage label (navy chip) and playback speed, separate.
    const stage = d ? (d.stage === 'result' && d.presentation === 'explanation' ? 'EXPLANATION' : STAGE_LABEL[d.stage]) : '';
    this.stageText.setText(stage);
    const chipW = this.stageText.width + 16;
    const chip = { x: this.pitch.x + 6, y: this.pitch.y + 2, width: chipW, height: 20 };
    ui.fillStyle(TM.navy, 1).fillRoundedRect(chip.x, chip.y, chip.width, chip.height, 5).lineStyle(1, TM.cream, 0.8).strokeRoundedRect(chip.x, chip.y, chip.width, chip.height, 5);
    this.stageText.setPosition(chip.x + 8, chip.y + 2);
    this.elements.stage = chip;
    const speed = !d ? '' : d.paused ? 'PAUSED' : d.rate > 0 ? `${Number(d.rate.toFixed(2))}×` : '';
    this.speedText.setText(speed).setPosition(chip.x + chip.width + 8, chip.y + 4);
    // Coach Code panel below (portrait) or beside (landscape) the pitch.
    const P = this.panel;
    ui.fillStyle(TM.cream, 1).fillRoundedRect(P.x, P.y, P.width, P.height, 8).lineStyle(2, TM.border, 1).strokeRoundedRect(P.x, P.y, P.width, P.height, 8);
    const portraitW = Math.min(64, P.width * 0.2);
    // Coach Code's approved portrait, cropped to head and shoulders (texture px 150..380 x 0..230).
    if (this.coach) {
      const cs = portraitW / 230;
      this.coach.setScale(cs).setPosition(P.x + 8 - 150 * cs, P.y + 8).setVisible(true);
    }
    this.coachText.setPosition(P.x + 16 + portraitW, P.y + 8).setWordWrapWidth(P.width - portraitW - 26).setFontSize(P.width < 300 ? 12 : 13).setText(`Coach Code: ${this.coachLine()}`);
    this.elements.panel = P;
    this.layoutButtons(Math.min(P.y + P.height - 8, Math.max(P.y + 8 + portraitW, this.coachText.y + this.coachText.height) + 8));
    if (this.review && d && s) this.drawReview(ui);
    else this.info.setText('');
    void w;
  }

  private layoutButtons(top: number): void {
    const d = this.director;
    const P = this.panel;
    const key = `${this.saveState}|${d?.stage}|${d?.paused}|${d?.replaying}|${d?.assisted}|${P.width}|${P.height}|${top}|${this.review}|${this.look}|${this.mirrored}|${this.originalOnly}|${this.moment?.sceneId ?? this.message}`;
    if (key === this.buttonKey) return;
    this.buttonKey = key;
    for (const b of this.buttons) b.destroy();
    this.buttons = [];
    const defs: { name: string; label: string; on: () => void; wide?: boolean }[] = [];
    const s = this.moment;
    if (!d || !s) defs.push({ name: 'tm-leave', label: 'Back', on: () => this.leave() });
    else {
      const pr = { name: 'tm-pause', label: d.paused ? 'Resume' : 'Pause', on: () => (d.paused ? d.resume() : d.pause(), (this.buttonKey = '')) };
      switch (d.stage) {
        case 'brief':
          defs.push({ name: 'tm-start', label: 'Start', on: () => (d.start(), (this.buttonKey = '')) }, { name: 'tm-leave', label: 'Leave', on: () => this.leave() });
          break;
        case 'watch':
        case 'slow':
          defs.push(pr, { name: 'tm-replay', label: 'Replay', on: () => (d.replay(), (this.buttonKey = '')) });
          break;
        case 'decide':
          for (const a of s.actions) defs.push({ name: `tm-choice-${a.id}`, label: `${a.id}  ${a.label}`, on: () => this.choose(a.id), wide: true });
          defs.push({ name: 'tm-replay', label: 'Replay', on: () => (d.replay(), (this.buttonKey = '')) });
          if (!d.assisted) defs.push({ name: 'tm-hint', label: 'Hint', on: () => (d.hint(), (this.buttonKey = '')) });
          break;
        case 'result':
          defs.push(pr);
          break;
        case 'learn':
        case 'done':
          if (this.saveState === 'failed') defs.push({ name: 'tm-retry-save', label: 'Retry save', on: () => void this.record(), wide: true });
          defs.push({ name: 'tm-replay', label: 'Replay', on: () => (d.replay(), (this.buttonKey = '')) }, pr, { name: 'tm-retry', label: 'Retry', on: () => (d.retry(), (this.buttonKey = '')) });
          if (this.saveState !== 'saving') defs.push({ name: 'tm-continue', label: 'Continue', on: () => (d.finish(), this.leave()) });
          break;
      }
    }
    if (this.review && s && d) {
      defs.push({ name: 'tm-step-back', label: '◀ 0.05s', on: () => (d.pause(), d.seek(d.t - 0.05), (this.buttonKey = '')) }, { name: 'tm-step', label: '0.05s ▶', on: () => (d.pause(), d.seek(d.t + 0.05), (this.buttonKey = '')) });
      defs.push({ name: 'tm-variant', label: s.library.variant === 'base' ? 'Changed cue' : 'Base cue', on: () => this.reopen({ variant: s.library.variant === 'base' ? 'changed' : 'base' }) });
      defs.push({ name: 'tm-look', label: this.look === 'boy' ? 'Girl' : 'Boy', on: () => this.reopen({ look: this.look === 'boy' ? 'girl' : 'boy' }) });
      defs.push({ name: 'tm-outcomes', label: this.originalOnly ? 'Drafts on' : 'Original only', on: () => this.reopen({ originalOnly: !this.originalOnly }) });
      defs.push({ name: 'tm-mirror', label: this.mirrored ? 'Unmirror' : 'Mirror', on: () => this.reopen({ mirror: !this.mirrored }) });
      defs.push({ name: 'tm-list', label: 'All scenes', on: () => this.leave() });
    }
    const P2 = { x: P.x + 8, w: P.width - 16, bottom: P.y + P.height - 6 };
    const gap = 6;
    const wide = defs.filter((x) => x.wide);
    const small = defs.filter((x) => !x.wide);
    const rowsWide = wide.length;
    const avail = P2.bottom - top;
    const minH = this.review ? 14 : 24;
    const fitH = (rows: number) => (avail - gap * (rows - 1)) / Math.max(1, rows);
    // Review mode carries extra tools; on the smallest phones it packs more per row rather than leave the panel.
    let perRow = this.review ? (P2.w < 300 ? 4 : 5) : P2.w < 300 ? 3 : 4;
    while (this.review && perRow < small.length && fitH(rowsWide + Math.ceil(small.length / perRow)) < minH) perRow++;
    const rowsSmall = Math.ceil(small.length / perRow);
    const h = Math.max(minH, Math.min(40, fitH(rowsWide + rowsSmall)));
    let y = top;
    for (const def of wide) {
      this.buttons.push(this.makeButton(def.name, def.label, P2.x + P2.w / 2, y + h / 2, P2.w, h, def.on));
      y += h + gap;
    }
    for (let i = 0; i < small.length; i += perRow) {
      const row = small.slice(i, i + perRow);
      const bw = (P2.w - gap * (row.length - 1)) / row.length;
      row.forEach((def, j) => this.buttons.push(this.makeButton(def.name, def.label, P2.x + bw / 2 + j * (bw + gap), y + h / 2, bw, h, def.on)));
      y += h + gap;
    }
  }

  private makeButton(name: string, label: string, x: number, y: number, w: number, h: number, on: () => void): Button {
    const fit = label.length * 7 > w ? Math.max(10, Math.floor(w / (label.length * 0.62))) : 14;
    const b = new Button(this, x, y, { name, label, width: w, height: h, fontSize: Math.min(14, fit, Math.floor(h * 0.45)), onClick: on, fill: TM.amber, fillPressed: TM.amberDown });
    b.setDepth(11);
    this.elements[name] = b.getButtonBounds();
    return b;
  }

  /** Review overlay: scrubbable timeline with contact ticks, cue/possession state, coordinates and gaps. */
  private drawReview(ui: Phaser.GameObjects.Graphics): void {
    const d = this.director!;
    const s = this.moment!;
    const pe = this.elements.pitch!;
    const bar = { x: pe.x + 8, y: pe.y + pe.height - 14, width: pe.width - 16, height: 6 };
    this.scrub = bar;
    const dur = this.timelineDuration();
    ui.fillStyle(TM.navy, 0.85).fillRect(bar.x, bar.y, bar.width, bar.height);
    const onBranch = !!d.branch && (d.stage === 'result' || d.stage === 'learn');
    if (!onBranch) ui.fillStyle(0xf2c14e, 0.5).fillRect(bar.x + (s.slow.from / dur) * bar.width, bar.y, ((s.decision.t - s.slow.from) / dur) * bar.width, bar.height);
    for (const c of contacts(onBranch ? d.resultTimeline! : s.watch)) ui.fillStyle(c.kind === 'touch' ? 0xffffff : 0xff5050, 1).fillRect(bar.x + (c.t / dur) * bar.width - 1, bar.y - 3, 2, bar.height + 6);
    ui.fillStyle(TM.cream, 1).fillCircle(bar.x + (Math.min(d.t, dur) / dur) * bar.width, bar.y + 3, 6);
    this.elements.scrub = bar;
    const f = d.frame();
    const ball = f.ball.state.mode === 'held' ? `held by ${f.ball.state.by}` : f.ball.state.mode;
    const cue = !onBranch ? (d.t >= s.slow.from ? 'cue window (slow)' : 'lead-in') : `branch ${d.choice} (${d.branch!.kind}${d.outcomes[d.choice!] ? `; outcome draft: ${d.outcomes[d.choice!]!.category}` : ''})`;
    const gaps = releaseBlockers(s).length;
    this.info.setText(`t ${d.t.toFixed(2)}s · ${cue} · ball ${ball} @ ${f.ball.at.map((n) => n.toFixed(1)).join(',')} · release blockers ${gaps} · hash ${sceneHash(s)}`).setPosition(pe.x + 4, pe.y + pe.height + 1).setWordWrapWidth(pe.width).setDepth(12);
  }

  private loadCoach(): void {
    const url = artUrl(COACH_ART);
    if (!url) return;
    const key = artTextureKey(COACH_ART);
    const place = (): void => {
      if (!this.sys.isActive() || !this.textures.exists(key) || this.coach) return;
      this.coach = this.add.image(0, 0, key).setDepth(10).setCrop(150, 0, 230, 230).setOrigin(0, 0);
      this.drawChrome();
    };
    if (this.textures.exists(key)) this.time.delayedCall(0, place);
    else {
      this.load.image(key, url);
      this.load.once(`filecomplete-image-${key}`, place);
      this.load.start();
    }
  }

  // ---- diagnostics --------------------------------------------------------------------------------

  describeLayout(): SceneLayoutReport {
    return { orientation: orientationOf({ width: this.scale.width, height: this.scale.height }), viewport: { width: this.scale.width, height: this.scale.height }, elements: { ...this.elements } };
  }

  describeGameplay(): unknown {
    const d = this.director;
    const s = this.moment;
    return {
      mode: this.review ? 'review' : 'player',
      message: this.message,
      sceneId: s?.sceneId ?? null,
      status: s ? effectiveStatus(s) : null,
      look: this.look,
      mirrored: this.mirrored,
      stage: d?.stage ?? null,
      stageLabel: this.stageText?.text ?? '',
      presentation: d?.presentation ?? null,
      outcomeDraft: d?.choice ? (d.outcomes[d.choice]?.branchId ?? null) : null,
      speedLabel: this.speedText?.text ?? '',
      paused: d?.paused ?? false,
      rate: d?.rate ?? 0,
      t: d?.t ?? 0,
      choice: d?.choice ?? null,
      evaluation: d?.evaluation ?? null,
      attempts: d?.attempts ?? [],
      replays: d?.replays ?? [],
      choices: s && d?.stage === 'decide' ? s.actions.map((a) => a.id) : [],
      coach: this.coachText?.text ?? '',
      saved: this.saved,
      saveState: this.saveState,
      actors: this.drawn,
      ball: this.ballDrawn,
      coachArt: !!this.coach,
      choiceIds: CHOICE_IDS,
    };
  }

  private onShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointer, this);
    this.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointer, this);
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.entry++;
    void this.store?.close();
    this.store = null;
  }
}
