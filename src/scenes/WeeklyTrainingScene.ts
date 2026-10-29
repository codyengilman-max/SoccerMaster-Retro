import Phaser from 'phaser';
import type { Rect } from '../game';
import { CareerStore } from '../game/career/store';
import type { CareerSave } from '../game/career/state';
import { describeChanges } from '../game/career/teamTraining';
import { weeklyProgress } from '../game/career/weeklyTraining';
import { episodeById } from '../game/training12/all36/package';
import type { ChoiceId, PackageEpisode, PackageVariant } from '../game/training12/all36/types';
import { gradeWeekly, weeklyAssignment, type WeeklyAssignment, type WeeklyVerdict } from '../game/training12/all36/weekly';
import { ensureTtArt, ttKey } from '../render/art/teamTrainingArt';
import { stillCast, stillPose, targetBody, TT_ART, ttScale, type StillActor, type StillPose, type TtSheet } from '../render/art/teamTrainingFrames';
import { orientationOf } from '../render/layout';
import { BALL_TEXTURE_SIZE, TEXTURES, ensurePlaceholderTextures } from '../render/textures';
import { CSS, FONT_FAMILY, PALETTE, textResolution } from '../render/theme';
import type { GameplayScene, InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';

export interface WeeklyTrainingData {
  readonly returnTo?: 'story';
}

type Screen = 'loading' | 'unavailable' | 'observe' | 'saving' | 'result' | 'saveFailed';

export const ROLE_NAME: Readonly<Record<string, string>> = { LB: 'Left back (3)', RB: 'Right back (2)', CB: 'Centre back (4/5)', '6': 'Holding midfielder (6)', '8': 'Central midfielder (8)', LW: 'Left winger (11)', RW: 'Right winger (7)', '9': 'Striker (9)' };
const GRADE_TEXT: Readonly<Record<string, string>> = { preferred: 'best', acceptable: 'acceptable', misread: 'wrong read' };
const GOLD = 0xf2c14e;
const GOAL_WIDTH = 6.4;

/** The coach-approved scenario, drawn from the package geometry; credit is decided by the career reducer. */
export function verdictLines(v: WeeklyVerdict): string[] {
  return [
    `Your answer: ${v.answer}`,
    v.grade ? `Coach classification: ${GRADE_TEXT[v.grade]} · ${v.band}` : 'Coach classification: no decision',
    `Why: ${v.rationale}`,
    ...(v.better ? [`Better option: ${v.better}`] : []),
  ];
}

/**
 * Weekly Team Training (current release): one coach-approved All36 scenario. OBSERVE the approved scene and its
 * cues, DECIDE with A–D, then LEARN: answer, coach classification, display band, rationale and the better option.
 * Movement demonstrations wait for authored continuations; nothing is animated or invented here. Decisions are
 * untimed in this release, so `no-decision` (choice null) is a stored state the reducer supports, not a screen path.
 */
export class WeeklyTrainingScene extends Phaser.Scene implements InspectableScene, GameplayScene {
  private store: CareerStore | null = null;
  private save: CareerSave | null = null;
  private entry = 0;
  private screen: Screen = 'loading';
  private returnTo: 'story' | null = null;
  private assignment: WeeklyAssignment | null = null;
  private episode: PackageEpisode | null = null;
  private variant: PackageVariant | null = null;
  private verdict: WeeklyVerdict | null = null;
  private runId = '';
  private choice: ChoiceId | null = null;
  private message = '';
  private saved = '';
  private g!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private sub!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private tags: Phaser.GameObjects.Text[] = [];
  /** Field sprites (package art), the separate ball, and the LEARN lanes above the bodies; all clipped to the pitch. */
  private sprites = new Map<string, Phaser.GameObjects.Image>();
  private ballImg!: Phaser.GameObjects.Image;
  private lanes!: Phaser.GameObjects.Graphics;
  private clip!: Phaser.GameObjects.Graphics;
  private look: 'boy' | 'girl' = 'boy';
  private cast: ReadonlyMap<string, TtSheet> | null = null;
  private poses: (StillPose & { id: string; team: 'H' | 'A'; role: string; at: readonly [number, number]; feet: { x: number; y: number }; drawn: 'sprite' | 'loading' })[] = [];
  private ballAt: { x: number; y: number; size: number } | null = null;
  private buttons: Button[] = [];
  private buttonKey = '';
  private field: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private panel: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private elements: Record<string, Rect> = {};

  constructor() {
    super(SceneKeys.Weekly);
  }

  create(data: WeeklyTrainingData = {}): void {
    this.returnTo = data.returnTo === 'story' ? 'story' : null;
    this.screen = 'loading';
    this.save = null;
    this.assignment = null;
    this.episode = null;
    this.variant = null;
    this.verdict = null;
    this.choice = null;
    this.saved = '';
    this.message = 'Loading Team Training…';
    this.buttons = [];
    this.tags = [];
    this.sprites = new Map();
    this.cast = null;
    this.poses = [];
    this.ballAt = null;
    this.look = 'boy';
    this.buttonKey = '';
    this.cameras.main.setBackgroundColor('#0d1630');
    const res = textResolution();
    this.g = this.add.graphics();
    ensurePlaceholderTextures(this);
    this.clip = this.make.graphics({}, false);
    const mask = this.clip.createGeometryMask();
    this.lanes = this.add.graphics().setDepth(4.6).setMask(mask);
    this.ballImg = this.add.image(-100, -100, TEXTURES.ball).setDepth(4.5).setVisible(false).setMask(mask);
    this.title = this.add.text(0, 0, 'WEEKLY TEAM TRAINING', { fontFamily: FONT_FAMILY, color: '#f2c14e', fontStyle: 'bold', fontSize: '15px' }).setResolution(res).setDepth(10);
    this.sub = this.add.text(0, 0, '', { fontFamily: FONT_FAMILY, color: CSS.cream, fontSize: '12px', wordWrap: { width: 300, useAdvancedWrap: true } }).setResolution(res).setDepth(10);
    this.body = this.add.text(0, 0, '', { fontFamily: FONT_FAMILY, color: CSS.cream, fontSize: '13px', lineSpacing: 2, wordWrap: { width: 300, useAdvancedWrap: true } }).setResolution(res).setDepth(10);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.layout();
    const entry = ++this.entry;
    const stale = (): boolean => entry !== this.entry || !this.sys.isActive();
    void CareerStore.open()
      .then(async (store) => {
        if (stale()) return store.close();
        this.store = store;
        const save = await store.load();
        if (stale()) return store.close();
        this.save = save;
        if (!save.player) return this.setScreen('unavailable', 'Create your player first.');
        const a = weeklyAssignment(save.week, save.player.position);
        const e = a ? episodeById(a.situationId) : undefined;
        const v = e?.variants.find((x) => x.id === a?.variant);
        if (!a || !e || !v) return this.setScreen('unavailable', `Week ${save.week} has no approved Team Training scenario for ${save.player.position}. Nothing can be played or counted.`);
        this.assignment = a;
        this.episode = e;
        this.variant = v;
        this.look = save.player.gender === 'girl' ? 'girl' : 'boy';
        if (!ensureTtArt(this)) this.load.once(Phaser.Loader.Events.COMPLETE, () => this.sys.isActive() && this.layout());
        this.begin();
      })
      .catch(() => this.setScreen('unavailable', 'Your career save could not be opened.'));
  }

  private begin(): void {
    this.verdict = null;
    this.choice = null;
    this.saved = '';
    this.runId = `w36-${this.save!.week}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
    this.setScreen('observe', '');
  }

  private setScreen(s: Screen, message: string): void {
    this.screen = s;
    this.message = message;
    this.buttonKey = '';
    this.layout();
  }

  private decide(choice: ChoiceId): void {
    if (this.screen !== 'observe' || !this.assignment) return;
    const v = gradeWeekly(this.assignment, choice);
    if (!v) return this.setScreen('unavailable', 'That scenario is not approved, so nothing was recorded.');
    this.choice = choice;
    this.verdict = v;
    void this.record();
  }

  /** Save once; the same runId is idempotent in the reducer, so a failed save can be retried. */
  private async record(): Promise<void> {
    const a = this.assignment;
    if (!a || !this.store || !this.save || this.screen === 'saving') return;
    this.setScreen('saving', 'Saving…');
    let out: { ok: true; message: string; save: CareerSave } | { ok: false; error: string };
    try {
      const r = await this.store.dispatch({ type: 'all36Weekly', week: this.save.week, situationId: a.situationId, runId: this.runId, at: Date.now(), choice: this.choice });
      out = r.ok ? { ok: true, message: r.message, save: r.save } : { ok: false, error: r.error };
    } catch (e) {
      out = { ok: false, error: e instanceof Error ? e.message : 'The save could not be written.' };
    }
    if (!this.sys.isActive()) return;
    if (out.ok) this.save = out.save;
    this.saved = out.ok ? out.message : out.error;
    this.setScreen(out.ok ? 'result' : 'saveFailed', '');
  }

  private leave(): void {
    if (this.screen === 'saving') return;
    this.scene.start(SceneKeys.Career, { open: 'team', ...(this.returnTo ? { returnTo: this.returnTo } : {}) });
  }

  private statusLines(): string[] {
    if (!this.save) return [];
    const p = weeklyProgress(this.save);
    const credit = p.credited && p.record ? `Earned credit: ${describeChanges(p.record.changes)}` : p.countedElsewhere ? 'Earned credit: this week was already counted; runs are practice.' : 'Earned credit: none yet';
    return [`Status: ${p.completed ? 'complete' : 'not started'} · Best mastery: ${p.best ? p.best.band : '—'}`, credit];
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
    const pad = 10;
    const a = this.assignment;
    this.title.setPosition(pad, pad);
    this.sub.setPosition(pad, pad + 20).setWordWrapWidth(w - 2 * pad);
    this.sub.setText(a && this.save ? `Week ${a.week} · ${a.topic} · ${ROLE_NAME[a.role] ?? a.role}${a.reinforces ? ` · reinforcement of week ${a.reinforces}` : ''}` : '');
    const top = this.sub.y + Math.max(16, this.sub.height) + 6;
    this.field = portrait ? { x: pad, y: top, width: w - 2 * pad, height: Math.max(120, (h - top) * 0.48) } : { x: pad, y: top, width: Math.max(160, w * 0.5), height: h - top - pad };
    this.panel = portrait
      ? { x: pad, y: this.field.y + this.field.height + 8, width: w - 2 * pad, height: h - (this.field.y + this.field.height + 8) - pad }
      : { x: this.field.x + this.field.width + 10, y: top, width: w - (this.field.x + this.field.width + 10) - pad, height: h - top - pad };
    this.drawField();
    this.drawPanel();
  }

  /** Metres to screen: the package camera bounds fitted into the field box, home attacking up the screen (+y). */
  private view(): { s: number; ox: number; oy: number; b: readonly [number, number, number, number]; head: number } {
    const b = this.episode?.camera_bounds_m ?? [0, 0, 45.72, 68.58];
    const bw = b[2] - b[0];
    const bh = b[3] - b[1];
    const { width: fw, height: fh } = this.field;
    // Headroom above the far edge for a body whose feet stand near it (a keeper on the goal line), kept inside the
    // field box: the picture shrinks uniformly only when the centred letterbox can't fit that head.
    const e = this.episode;
    const v = this.variant;
    const ys = e ? e.actors.map((a) => (v?.actor_overrides[a.id] ?? a.position_m)[1]) : [];
    const headAt = (k: number) => Math.max(0, ...ys.map((y) => targetBody(k) + 2 - (b[3] - y) * k));
    let s = Math.min(fw / bw, fh / bh);
    let head = headAt(s);
    if (head > (fh - bh * s) / 2) {
      // Each pass shrinks the scale, which shrinks the needed headroom; keep the headroom the final scale was fitted to.
      for (let i = 0; i < 3; i++) {
        s = Math.min(fw / bw, (fh - head) / bh);
        if (i < 2) head = Math.max(headAt(s), 0);
      }
    }
    const ox = this.field.x + (fw - bw * s) / 2;
    const slack = (fh - bh * s) / 2;
    const oy = this.field.y + (head > slack ? head + (fh - head - bh * s) / 2 : slack);
    return { s, ox, oy, b, head };
  }

  private toScreen(p: readonly [number, number]): { x: number; y: number } {
    const { s, ox, oy, b } = this.view();
    return { x: ox + (p[0] - b[0]) * s, y: oy + (b[3] - p[1]) * s };
  }

  private drawField(): void {
    const g = this.g;
    g.clear();
    for (const t of this.tags) t.destroy();
    this.tags = [];
    const e = this.episode;
    const v = this.variant;
    if (!e || !v) return;
    const { s, b } = this.view();
    const L = e.field.length_m;
    const W = e.field.width_m;
    const tl = this.toScreen([b[0], b[3]]);
    g.fillStyle(0x3f7d3a, 1).fillRect(tl.x, tl.y, (b[2] - b[0]) * s, (b[3] - b[1]) * s);
    // Pitch lines inside the camera window only: touchlines, goal lines, halfway line and the goals.
    g.lineStyle(2, 0xffffff, 0.85);
    const seg = (p: [number, number], q: [number, number]) => {
      const A = this.toScreen(p);
      const B = this.toScreen(q);
      g.lineBetween(A.x, A.y, B.x, B.y);
    };
    const cx = (x: number) => Math.min(Math.max(x, b[0]), b[2]);
    const cy = (y: number) => Math.min(Math.max(y, b[1]), b[3]);
    if (b[0] <= 0) seg([0, cy(0)], [0, cy(L)]);
    if (b[2] >= W) seg([W, cy(0)], [W, cy(L)]);
    for (const y of [0, L / 2, L]) if (y >= b[1] && y <= b[3]) seg([cx(0), y], [cx(W), y]);
    g.lineStyle(4, 0xffffff, 1);
    for (const y of [0, L]) if (y >= b[1] && y <= b[3]) seg([W / 2 - GOAL_WIDTH / 2, y], [W / 2 + GOAL_WIDTH / 2, y]);
    const at = (id: string): readonly [number, number] => v.actor_overrides[id] ?? e.actors.find((x) => x.id === id)!.position_m;
    const { head } = this.view();
    this.clip.clear().fillStyle(0xffffff, 1).fillRect(tl.x, tl.y - head, (b[2] - b[0]) * s, (b[3] - b[1]) * s + head);
    // LEARN: the chosen and the best option's ball targets from the package branches (static, not a demonstration).
    // Drawn above the bodies so the lanes stay readable.
    const lanes = this.lanes.clear();
    if (this.verdict && this.choice) {
      const ball = this.toScreen(v.ball_position_m);
      const best = (Object.keys(v.grades) as ChoiceId[]).find((k) => v.grades[k] === 'preferred')!;
      for (const [k, col] of [[this.choice, 0xffffff], ...(best !== this.choice ? [[best, GOLD]] : [])] as [ChoiceId, number][]) {
        const t = this.toScreen(v.branches[k].ball_target);
        lanes.lineStyle(3, col, 0.9).lineBetween(ball.x, ball.y, t.x, t.y);
        lanes.fillStyle(col, 1).fillCircle(t.x, t.y, 4);
        this.tag(k, t.x + 6, t.y - 8, col === GOLD ? '#f2c14e' : '#ffffff');
      }
    }
    // Players: the package sheets anchored at the feet on each actor's approved coordinate, the approved
    // 1.2075x visible-body scale applied once, frozen poses (the scenario never moves before or after the answer).
    const actors: StillActor[] = e.actors.map((a) => ({ id: a.id, team: a.team, role: a.role, at: at(a.id) }));
    this.cast ??= stillCast(this.look, actors, e.protagonist_id);
    const owner = actors.find((a) => a.id === v.ball_owner) ?? null;
    const sc = ttScale(s);
    const body = targetBody(s);
    const r = body * 0.24;
    this.poses = [];
    for (const a of actors) {
      const p = this.toScreen(a.at);
      const sheet = this.cast.get(a.id)!;
      const pose = stillPose(a, sheet, v.ball_position_m, owner, W);
      const me = a.id === e.protagonist_id;
      g.fillStyle(0x000000, 0.28).fillEllipse(p.x, p.y, r * 2, r * 0.7);
      // The protagonist's marker is a subtle ground ring; their only body highlight is the outline drawn into the sheet.
      if (me) g.lineStyle(2, GOLD, 0.9).strokeEllipse(p.x, p.y, r * 2.8, r * 1.05);
      let im = this.sprites.get(a.id);
      const ready = this.textures.exists(ttKey(sheet));
      if (ready) {
        im ??= this.add.image(p.x, p.y, ttKey(sheet)).setMask(this.lanes.mask!);
        this.sprites.set(a.id, im);
        im.setTexture(ttKey(sheet), pose.frame)
          .setOrigin(TT_ART.anchor.x / TT_ART.cell.w, TT_ART.anchor.y / TT_ART.cell.h)
          .setScale(sc)
          .setFlipX(pose.flip)
          .setPosition(p.x, p.y)
          .setDepth(3 + p.y / 10000 + (me ? 0.00001 : 0))
          .setVisible(true);
      } else {
        im?.setVisible(false);
        // Package sheets still loading: a neutral marker at the feet until they arrive (never other art).
        g.fillStyle(a.team === 'H' ? 0xf07a1a : 0x3fae49, 1).fillCircle(p.x, p.y - r, r);
      }
      this.poses.push({ ...pose, id: a.id, team: a.team, role: a.role, at: a.at, feet: p, drawn: ready ? 'sprite' : 'loading' });
      if (me) this.tag('YOU', p.x, Math.max(tl.y + 13, p.y - body - 3), '#f2c14e', true);
    }
    // The ball is its own object on the package ball coordinate, above every body so it is never hidden.
    const ball = this.toScreen(v.ball_position_m);
    const size = Math.max(7, s * 0.75);
    this.ballImg.setScale(size / BALL_TEXTURE_SIZE.width).setPosition(ball.x, ball.y - size * 0.45).setVisible(true);
    this.ballAt = { x: ball.x, y: ball.y, size };
  }

  private tag(text: string, x: number, y: number, color: string, above = false): void {
    const t = this.add.text(x, y, text, { fontFamily: FONT_FAMILY, color, fontStyle: 'bold', fontSize: '11px' }).setResolution(textResolution()).setDepth(5);
    if (above) t.setOrigin(0.5, 1).setStroke('#0d1630', 3);
    this.tags.push(t);
  }

  private drawPanel(): void {
    const P = this.panel;
    const v = this.variant;
    const e = this.episode;
    let lines: string[];
    let acts: { name: string; label: string; onClick: () => void }[] = [];
    switch (this.screen) {
      case 'loading':
      case 'unavailable':
        lines = [this.message];
        acts = [{ name: 'tt-back', label: 'Back', onClick: () => this.leave() }];
        break;
      case 'saving':
        lines = ['Saving…'];
        break;
      case 'observe':
        lines = [...this.statusLines(), '', 'OBSERVE', ...(v?.visible_cues ?? []), '', 'DECIDE: what do you do?'];
        acts = [...(e?.choices ?? []).map((c) => ({ name: `opt-${c.id}`, label: `${c.id}. ${c.label}`, onClick: () => this.decide(c.id) })), { name: 'tt-leave', label: 'Leave · nothing saved', onClick: () => this.leave() }];
        break;
      case 'result':
      case 'saveFailed':
        lines = ['LEARN', ...(this.verdict ? verdictLines(this.verdict) : []), '', this.saved, ...this.statusLines()];
        acts =
          this.screen === 'saveFailed'
            ? [{ name: 'tt-retry-save', label: 'Try saving again', onClick: () => void this.record() }, { name: 'tt-done', label: 'Back to Team Training', onClick: () => this.leave() }]
            : [{ name: 'tt-replay', label: 'Play again (practice)', onClick: () => this.begin() }, { name: 'tt-done', label: 'Back to Team Training', onClick: () => this.leave() }];
        break;
    }
    // Fit the text above the buttons: shrink the font first, then put the answers in two columns.
    const fits = (cols: number, btnH: number): boolean => {
      const rows = Math.ceil(acts.length / cols);
      const area = rows * (btnH + 6);
      for (const size of [13, 12, 11]) {
        this.body.setFontSize(size).setText(lines.join('\n'));
        if (this.body.height <= P.height - area - 16) return true;
      }
      return false;
    };
    this.body.setPosition(P.x + 8, P.y + 8).setWordWrapWidth(P.width - 16);
    const plan = [[1, 34], [1, 30], [2, 34], [2, 30]].find(([c, h]) => fits(c!, h!)) ?? [2, 28];
    if (plan[1] === 28) {
      for (const size of [11, 10, 9]) {
        this.body.setFontSize(size).setText(lines.join('\n'));
        if (this.body.height <= P.height - Math.ceil(acts.length / 2) * 34 - 16) break;
      }
    }
    const [cols, btnH] = plan as [number, number];
    const gap = 6;
    const rows = Math.ceil(acts.length / cols);
    const btnArea = rows * (btnH + gap);
    const bw = (P.width - 16 - gap * (cols - 1)) / cols;
    this.g.fillStyle(0x14213d, 0.95).fillRoundedRect(P.x, P.y, P.width, P.height, 8);
    const key = `${this.screen}|${acts.map((a) => a.name).join(',')}|${P.x},${P.y},${P.width},${P.height}|${cols},${btnH}`;
    if (key !== this.buttonKey) {
      for (const b of this.buttons) b.destroy();
      this.buttons = acts.map((a, i) => {
        // The last odd button (Leave / Back) spans the full width.
        const full = cols > 1 && i === acts.length - 1 && acts.length % cols === 1;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const w = full ? P.width - 16 : bw;
        const x = full ? P.x + P.width / 2 : P.x + 8 + col * (bw + gap) + bw / 2;
        const b = new Button(this, x, P.y + P.height - btnArea + row * (btnH + gap) + btnH / 2, { name: a.name, label: a.label, width: w, height: btnH, fontSize: 12, onClick: a.onClick, fill: PALETTE.mustard, fillPressed: PALETTE.mustardDark });
        this.add.existing(b);
        b.setDepth(20);
        return b;
      });
      this.buttonKey = key;
    }
    this.elements = { field: { ...this.field }, panel: { ...this.panel }, body: { x: this.body.x, y: this.body.y, width: this.body.width, height: this.body.height } };
    for (const b of this.buttons) this.elements[b.name] = b.getButtonBounds();
  }

  // ---- diagnostics --------------------------------------------------------------------------------

  describeLayout(): SceneLayoutReport {
    return { orientation: orientationOf({ width: this.scale.width, height: this.scale.height }), viewport: { width: this.scale.width, height: this.scale.height }, elements: { ...this.elements } };
  }

  describeGameplay(): unknown {
    const a = this.assignment;
    const v = this.variant;
    const p = this.save ? weeklyProgress(this.save) : null;
    return {
      screen: this.screen,
      model: 'all36-weekly',
      assignment: a ? { week: a.week, category: a.category, situationId: a.situationId, variant: a.variant, role: a.role, topic: a.topic, reinforces: a.reinforces } : null,
      options: this.screen === 'observe' && v ? (Object.keys(v.grades) as ChoiceId[]).map((id) => ({ id, grade: v.grades[id] })) : [],
      verdict: this.verdict,
      progress: p ? { completed: p.completed, credited: p.credited, countedElsewhere: p.countedElsewhere, best: p.best?.band ?? null, runs: p.runs } : null,
      saved: this.saved,
      message: this.message,
      bodyText: this.body.text,
      bodyBottom: this.body.y + this.body.height,
      art: this.episode
        ? {
            set: 'team-training-v1',
            look: this.look,
            field: { ...this.field },
            camera: this.episode.camera_bounds_m,
            view: (({ s, ox, oy, head }) => ({ s, ox, oy, head }))(this.view()),
            scale: ttScale(this.view().s),
            bodyPx: targetBody(this.view().s),
            actors: this.poses.map((q) => ({ id: q.id, team: q.team, role: q.role, at: q.at, sheet: q.sheet, frame: q.frame, flip: q.flip, action: q.action, drawn: q.drawn, feet: q.feet, me: q.id === this.episode!.protagonist_id })),
            ball: this.ballAt ? { at: this.variant!.ball_position_m, ...this.ballAt } : null,
            you: this.tags.find((t) => t.text === 'YOU')?.getBounds() ?? null,
          }
        : null,
      buttonsTop: this.buttons.length ? Math.min(...this.buttons.map((b) => b.getButtonBounds().y)) : null,
    };
  }

  private onShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.store?.close();
    this.store = null;
  }
}
