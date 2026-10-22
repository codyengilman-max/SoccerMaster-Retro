import Phaser from 'phaser';
import type { Rect } from '../game';
import { CareerStore } from '../game/career/store';
import type { CareerSave, Tt12Slot } from '../game/career/state';
import type { Position } from '../game/career/types';
import type { RoleId } from '../game/training12/ref/catalog.mjs';
import { planFor, sessionId, TrainingSession, TIMED_DECISION_SECONDS } from '../game/training12/session';
import type { DrillActor } from '../game/training12/drill';
import { PlayerArt } from '../render/art/playerArt';
import { sideLooks, type ProtagonistLook, type RosterLook } from '../render/art/roster';
import { dirFromScreen } from '../render/art/spriteFactory';
import { orientationOf, type Insets } from '../render/layout';
import { CSS, FONT_FAMILY, PALETTE, textResolution } from '../render/theme';
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

type Screen = 'loading' | 'unavailable' | 'role' | 'brief' | 'play' | 'reflection' | 'saving' | 'done';

/**
 * Team Training v1.2: a fixed straight-down camera over one whole half, the coached Observe -> Decide ->
 * Play it out -> Why -> Retry loop, and a coaching panel. Rules live in src/game/training12; this scene draws.
 */
export class TacticalTrainingScene extends Phaser.Scene implements InspectableScene, GameplayScene {
  private store: CareerStore | null = null;
  private save: CareerSave | null = null;
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
  private panelG!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private buttons: Button[] = [];
  private tokenText: Phaser.GameObjects.Text[] = [];
  private art!: PlayerArt;
  private look: RosterLook | null = null;
  private lookName: ProtagonistLook | null = null;
  private me!: Phaser.GameObjects.Image;
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
    this.buttonKey = '';
    const params = new URLSearchParams(window.location.search);
    const sp = Number(params.get('ttSpeed'));
    this.speed = shouldExposeDebug(window.location) && Number.isFinite(sp) && sp >= 1 && sp <= 8 ? sp : 1;
    this.cameras.main.setBackgroundColor('#5d7d2e');
    this.g = this.add.graphics().setDepth(1);
    this.panelG = this.add.graphics().setDepth(2000);
    const style = { fontFamily: FONT_FAMILY, color: CSS.ink, wordWrap: { width: 300, useAdvancedWrap: true } };
    this.title = this.add.text(0, 0, '', { ...style, fontStyle: 'bold', fontSize: '16px' }).setDepth(2001).setResolution(textResolution());
    this.body = this.add.text(0, 0, '', { ...style, fontSize: '13px', lineSpacing: 2 }).setDepth(2001).setResolution(textResolution());
    this.art = new PlayerArt(this);
    this.me = this.add.image(-100, -100, '__DEFAULT').setVisible(false).setDepth(900);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onBlur, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.layout();
    void CareerStore.open().then(async (store) => {
      if (!this.sys.isActive()) return store.close();
      this.store = store;
      const save = await store.load();
      if (!this.sys.isActive()) return;
      this.save = save;
      if (!save.player) return this.setScreen('unavailable', 'Create your player first.');
      const g = save.player.gender;
      this.lookName = g === 'boy' || g === 'girl' ? g : null;
      if (this.lookName) {
        this.look = sideLooks('home', { slot: 1, look: this.lookName }, { club: 'batavia', kit: 'training' })[1]!;
        this.art.ensure([this.look.set]);
      }
      this.role = ROLE_CHOICES[save.player.position][0]!;
      const plan = planFor(sessionId(1, save.week, this.slot), this.role);
      if (plan.status !== 'selected') return this.setScreen('unavailable', `Session ${sessionId(1, save.week, this.slot)} is not available yet. Its scenes have not passed testing, so nothing here is counted. Your weekly Team Training is still on the Team Training page.`);
      this.setScreen('role', '');
    }).catch(() => this.setScreen('unavailable', 'Your career save could not be opened.'));
  }

  private get id(): string { return this.save ? sessionId(1, this.save.week, this.slot) : ''; }

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
      if (s.status === 'playing') s.update(Math.min(deltaMs / 1000, 0.1) * this.speed);
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
    if (live && !this.leaveArmed) {
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
    this.setScreen('saving', 'Saving…');
    const qs = s.attempts.map((a) => a.decision?.quality ?? 0);
    const score = qs.length ? qs.reduce((a, b) => a + b, 0) / qs.length : 0;
    const out = await this.store.dispatch({ type: 'tt12Run', week: this.save.week, slot: this.slot, runId: c.runId, score, creditEligible: c.creditEligible });
    if (!this.sys.isActive() || this.session !== s) return;
    this.saved = out.ok ? out.message : out.error;
    this.setScreen('done', '');
  }

  // ---- panel ---------------------------------------------------------------------------------------

  private panelUpdate(): void {
    const s = this.session;
    const d = s?.drill ?? null;
    const lines: string[] = [];
    let title = 'Team Training';
    const buttons: { name: string; label: string; onClick: () => void; fill?: number }[] = [];
    const round = s ? `Round ${s.roundNumber} of 3 · ${s.guided ? 'Guided' : s.timed ? 'Game speed' : 'Your read'}` : '';
    switch (this.screen) {
      case 'loading':
      case 'unavailable':
        lines.push(this.message);
        break;
      case 'role': {
        title = `${this.id} · choose your role`;
        lines.push(`Week ${this.save?.week} session ${this.slot}. Pick where you play today.`);
        for (const r of ROLE_CHOICES[this.save!.player!.position]) {
          const ok = planFor(this.id, r).status === 'selected';
          buttons.push({ name: `role-${r}`, label: ok ? ROLE_LABEL[r] : `${ROLE_LABEL[r]} (not available yet)`, onClick: () => { if (!ok) return; this.role = r; this.begin(); } });
        }
        break;
      }
      case 'brief': {
        title = `${this.id} · ${s!.plan.practice.name}`;
        lines.push(round, '', s!.plan.practice.objective);
        lines.push('', s!.guided ? 'Watch the play. When it stops, choose what you do. Then see why it worked or not.'
          : s!.timed ? `No pauses to think: you have ${TIMED_DECISION_SECONDS} seconds to choose each time.` : 'No hints this round. Read it yourself.');
        buttons.push({ name: 'tt-start', label: 'Start round', onClick: () => this.startRound() });
        break;
      }
      case 'play': {
        title = `${ROLE_LABEL[this.role]} · ${round}`;
        if (s!.status === 'paused') {
          lines.push('Paused.');
          buttons.push({ name: 'tt-resume', label: 'Resume', onClick: () => this.togglePause() });
          break;
        }
        if (d?.phase === 'observe') {
          lines.push(s!.timed ? `Choose now: ${Math.ceil(s!.decideSecondsLeft)} s` : 'What do you do?');
          const cs = s!.choices();
          cs.forEach((c, i) => {
            if (s!.guided && i === 0) lines.push(`Look at: ${cueFor(cs.map((x) => x.assessment.reasons).flat())}`);
            buttons.push({ name: `opt-${c.option.id}`, label: `${i + 1}. ${c.option.label}`, onClick: () => this.decide(c.option.id) });
          });
        } else if (d?.phase === 'explain') {
          const a = s!.attempts.at(-1);
          lines.push(a?.outcome || d.outcome?.text || '');
          if (a?.decision) {
            lines.push(`Your choice: ${a.decision.good ? 'a good read' : 'there was a better option'} (${Math.round(a.decision.quality * 100)}%).`);
            if (!s!.timed) lines.push(...a.decision.reasons.slice(0, 3).map((r) => `• ${r}`));
            if (!a.decision.good) lines.push(`Better here: ${a.best.map((id) => labelOf(s!, id)).join(' or ')}`);
          }
          buttons.push({ name: 'tt-next', label: 'Next situation', onClick: () => this.next() });
        } else {
          lines.push(d?.phase === 'execute' ? 'Playing it out…' : 'Watch the play…');
        }
        lines.push('', `Your active play: ${Math.floor(s!.activeSeconds)} s (30 s needed to count)`);
        buttons.push({ name: 'tt-pause', label: 'II Pause', onClick: () => this.togglePause(), fill: PALETTE.sand });
        break;
      }
      case 'reflection': {
        title = `Round ${s!.roundNumber} done`;
        const mine = s!.attempts.filter((a) => a.round === s!.run.round);
        const good = mine.filter((a) => a.decision?.good).length;
        lines.push(`${good} of ${mine.length} decisions were good reads.`, ...summary(mine));
        buttons.push({ name: 'tt-continue', label: s!.run.round >= 2 ? 'Finish session' : 'Next round', onClick: () => this.continueRound() });
        break;
      }
      case 'saving':
        lines.push('Saving…');
        break;
      case 'done': {
        title = `${this.id} complete`;
        const c = s?.completion;
        const qs = s?.attempts.filter((a) => a.decision) ?? [];
        lines.push(`${qs.filter((a) => a.decision!.good).length} of ${s?.attempts.length ?? 0} decisions were good reads.`);
        lines.push(c?.creditEligible ? 'Your play was observed: this session can count.' : 'Not enough of your own play to count this session.');
        lines.push('', this.saved);
        buttons.push({ name: 'tt-back', label: 'Back to Team Training', onClick: () => this.leave() });
        break;
      }
    }
    if (this.screen !== 'done' && this.screen !== 'saving') {
      buttons.push({ name: 'tt-leave', label: this.leaveArmed ? 'Tap again to leave (nothing counts)' : 'Leave', onClick: () => this.leave(), fill: PALETTE.sand });
    }
    this.title.setText(title);
    this.body.setText(lines.join('\n'));
    const key = `${this.screen}|${s?.status}|${s?.drill?.phase}|${s?.attempts.length}|${this.leaveArmed}|${buttons.map((b) => b.name + b.label).join(',')}|${this.panel.width}x${this.panel.height}`;
    if (key === this.buttonKey) return;
    this.buttonKey = key;
    for (const b of this.buttons) b.destroy();
    this.buttons = [];
    const P = this.panel;
    const pad = 10;
    const bh = 34;
    const cols = P.width > 420 ? 2 : 1;
    const bw = (P.width - pad * (cols + 1)) / cols;
    const rows = Math.ceil(buttons.length / cols);
    const top = P.y + P.height - pad - rows * (bh + 6);
    this.elements = { field: this.field, panel: this.panel };
    buttons.forEach((b, i) => {
      const x = P.x + pad + (i % cols) * (bw + pad) + bw / 2;
      const y = top + Math.floor(i / cols) * (bh + 6) + bh / 2;
      const btn = new Button(this, x, y, { name: b.name, label: b.label, width: bw, height: bh, fontSize: 13, onClick: b.onClick, ...(b.fill ? { fill: b.fill } : {}) });
      this.add.existing(btn.setDepth(2002));
      this.buttons.push(btn);
      this.elements[b.name] = { x: x - bw / 2, y: y - bh / 2, width: bw, height: bh };
    });
    this.body.setWordWrapWidth(P.width - 2 * pad);
    this.title.setWordWrapWidth(P.width - 2 * pad);
    this.body.setPosition(P.x + pad, P.y + pad + this.title.height + 4);
    this.body.setFixedSize(0, 0);
    const maxH = top - this.body.y - 4;
    this.body.setCrop(0, 0, P.width, Math.max(0, maxH));
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
    if (portrait) {
      const panelH = Math.max(200, Math.round(usable.height * 0.4));
      this.panel = { x: usable.x, y: usable.y + usable.height - panelH, width: usable.width, height: panelH };
      this.field = { x: usable.x, y: usable.y, width: usable.width, height: usable.height - panelH };
    } else {
      const panelW = Math.max(240, Math.round(usable.width * 0.38));
      this.panel = { x: usable.x + usable.width - panelW, y: usable.y, width: panelW, height: usable.height };
      this.field = { x: usable.x, y: usable.y, width: usable.width - panelW, height: usable.height };
    }
    this.px = Math.min(this.field.width / ext.w, this.field.height / ext.h);
    this.title.setPosition(this.panel.x + 10, this.panel.y + 10);
    this.panelG.clear().fillStyle(PALETTE.cream, 0.96).fillRect(this.panel.x, this.panel.y, this.panel.width, this.panel.height);
    this.panelG.lineStyle(2, PALETTE.ink, 0.6).strokeRect(this.panel.x + 1, this.panel.y + 1, this.panel.width - 2, this.panel.height - 2);
    this.buttonKey = '';
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
    if (!d) return void this.me.setVisible(false);
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
    if (d.phase === 'observe' && s!.status === 'playing') {
      const me = d.actors.find((x) => x.human)!;
      const from = this.actorScreen(me);
      s!.choices().forEach((ch, i) => {
        const hp = this.drillToHalf(ch.option.point);
        const to = this.toScreen(hp.x, hp.y);
        g.lineStyle(2, PALETTE.mustard, 0.95).lineBetween(from.x, from.y, to.x, to.y);
        g.fillStyle(PALETTE.mustard, 1).fillCircle(to.x, to.y, Math.max(8, k * 0.6));
        this.label(`opt${i}`, String(i + 1), to.x, to.y);
      });
    }
    const r = Math.max(6, k * 0.55);
    for (const a of d.actors) {
      const p = this.actorScreen(a);
      const team = a.side.startsWith('GK') ? (a.side.endsWith('B') ? 'B' : 'A') : a.side;
      const fill = team === 'A' ? PALETTE.blue : team === 'B' ? PALETTE.tomato : PALETTE.mustard;
      g.fillStyle(PALETTE.shadow, 0.25).fillEllipse(p.x, p.y + r * 0.6, r * 2, r);
      g.fillStyle(fill, 1).fillCircle(p.x, p.y, r);
      if (a.side.startsWith('GK')) g.lineStyle(2, 0x2c2c2c, 1).strokeCircle(p.x, p.y, r);
      if (a.human) g.lineStyle(3, PALETTE.sun, 1).strokeCircle(p.x, p.y, r + 4);
    }
    const me = d.actors.find((x) => x.human)!;
    const mp = this.actorScreen(me);
    if (this.look) {
      const moving = Math.hypot(me.vel.x, me.vel.y) > 0.4;
      const dir = moving ? dirFromScreen(me.vel.y, -me.vel.x) : 2;
      this.art.apply(this.me, this.look, moving ? 'run' : 'idle', dir, Math.floor(this.walk * 8) % 6, Math.max(26, k * 2.6)).setPosition(mp.x, mp.y).setVisible(true);
    } else this.me.setVisible(false);
    const bp = this.drillToHalf(d.ball.pos);
    const bs = this.toScreen(bp.x, bp.y);
    g.fillStyle(0xffffff, 1).fillCircle(bs.x, bs.y, Math.max(4, k * 0.3));
    g.lineStyle(1.5, PALETTE.ink, 1).strokeCircle(bs.x, bs.y, Math.max(4, k * 0.3));
  }

  private actorScreen(a: DrillActor): { x: number; y: number } {
    const h = this.drillToHalf(a.pos);
    return this.toScreen(h.x, h.y);
  }

  private label(key: string, text: string, x: number, y: number): void {
    const i = Number(key.slice(3));
    let t = this.tokenText[i];
    if (!t) {
      t = this.add.text(0, 0, '', { fontFamily: FONT_FAMILY, fontStyle: 'bold', fontSize: '12px', color: CSS.ink }).setOrigin(0.5).setDepth(950).setResolution(textResolution());
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
      status: s?.status ?? null,
      round: s?.run.round ?? null,
      phase: d?.phase ?? null,
      options: d?.phase === 'observe' && s?.status === 'playing' ? s.choices().map((c) => ({ id: c.option.id, good: c.assessment.good, quality: c.assessment.quality })) : [],
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

function labelOf(s: TrainingSession, id: string): string {
  return s.drill ? (s.choices().find((c) => c.option.id === id)?.option.label ?? id) : id;
}

/** First distinct reason, phrased as a cue for round 1. */
function cueFor(reasons: readonly string[]): string {
  return reasons[0] ?? 'where the space and the pressure are.';
}

function summary(attempts: readonly { decision: { good: boolean } | null; kind: string | null }[]): string[] {
  const missed = attempts.filter((a) => !a.decision).length;
  return missed ? [`${missed} moment${missed === 1 ? '' : 's'} passed without a decision.`] : [];
}
