import Phaser from 'phaser';
import type { Rect } from '../game';
import { ATTRIBUTE_EVIDENCE, CAREER_CONFIG } from '../game/career/config';
import { CareerStore } from '../game/career/store';
import { SPENDABLE, awardTitle, balance } from '../game/career/bonus';
import { HOME_SKILLS, specFor, type HomeSkillId } from '../game/career/homeMastery';
import { SKILL_LABEL, entryHint, feedbackLine, masteryLines, parseAttempts } from '../game/career/homeEntry';
import type { CareerSave } from '../game/career/state';
import { ATTRIBUTES, ATTRIBUTE_LABELS, type AttributeId } from '../game/career/types';
import { NOT_TRACKED } from '../game/report/registry';
import { homeTasks, weekAssignments, type HomeTask } from '../game/story/facts';
import { StoryStore, STORY_CAREER_ID } from '../game/story/store';
import type { SavedReport } from '../game/report/report';
import { seasonTotals } from '../game/report/contributionText';
import { artTextureKey, artUrl } from '../render/art/urls';
import { orientationOf } from '../render/layout';
import type { InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { safeInsets } from './ui/PadHud';

export interface MyPlayerData {
  readonly view?: 'player' | 'history';
  readonly returnTo?: 'story' | 'start';
  /** Story week, when the story opens My Player; otherwise the career week is used. */
  readonly week?: number;
  /** Returning from a screen My Player opened (Rankings): keep the saved back route and week. */
  readonly resume?: boolean;
}

const INK = '#2a1d14';
const BG = 0xf3dfb4;
const CARD = 0xfff6e2;
const EDGE = 0x2a1d14;
const ORANGE = 0xf2a03d;
const BLUE = 0x3a6fc4;
const TRACK = 0xd8cdb8;
const FONT = 'Trebuchet MS, Verdana, sans-serif';
const ROWS = 6;

interface Row { readonly label: string; readonly value: number | null; readonly carry: number | null; readonly detail: string }

/** All attribute rows: the six the game tracks, then the requested ones it does not (never invented). */
export function attributeRows(save: CareerSave): Row[] {
  const p = save.player;
  const tracked: Row[] = ATTRIBUTES.map((a) => {
    const c = save.devCarry[a];
    const toward = c > 0 ? ` Toward the next point: ${Math.round(c * 100)}% (applied at a weekly review).` : '';
    return { label: ATTRIBUTE_LABELS[a], value: p ? p.attributes[a] : null, carry: p ? c : null, detail: `${ATTRIBUTE_LABELS[a]}: ${ATTRIBUTE_EVIDENCE[a]}${toward}` };
  });
  return [...tracked, ...NOT_TRACKED.map((n) => ({ label: n, value: null, carry: null, detail: `${n}: not tracked by this game yet. Nothing is counted or invented for it.` }))];
}

export const overall = (save: CareerSave): number | null => (save.player ? Math.round(ATTRIBUTES.reduce((a, k) => a + save.player!.attributes[k], 0) / ATTRIBUTES.length) : null);

/** THIS WEEK, from the save only. */
export function weekLines(save: CareerSave): string[] {
  const home = `Home skills: ${save.completedSessions.length}/${CAREER_CONFIG.home.sessionsPerWeek} sessions`;
  const tt = save.teamTraining.some((t) => t.week === save.week) || save.tt12.filter((t) => t.week === save.week && t.credited).length >= 3;
  const team = `Team training: ${tt ? 'done' : 'not done yet'}`;
  const m = save.reports.filter((r) => r.week === save.week);
  const match = m.length ? `Match: ${m.map((r) => `${r.score.home}-${r.score.away} v ${r.away}`).join(', ')} (pending weekly review)` : 'Match: not played yet';
  return [home, team, match];
}

export function recentLines(save: CareerSave): string[] {
  const last = save.history.at(-1);
  if (!last) return ['No weekly review yet.', 'Gains are applied once, at the weekly review.', ''];
  const ups = last.outcomes.filter((o) => o.to !== o.from).map((o) => `${ATTRIBUTE_LABELS[o.attribute]} ${o.from}->${o.to}`);
  return [`Week ${last.week} review:`, ups.length ? ups.join(', ') : 'No attribute changes', `Evidence counted: ${last.evidenceCount}`];
}

interface Hit { readonly name: string; readonly rect: Rect; readonly on: () => void }

export class MyPlayerScene extends Phaser.Scene implements InspectableScene {
  private view: 'player' | 'history' | 'mastery' = 'player';
  private returnTo: 'story' | 'start' = 'start';
  private storyWeek: number | null = null;
  private save: CareerSave | null = null;
  private page = 0;
  private expanded = false;
  private detail: string | null = null;
  private status = 'loading';
  private leaving = false;
  /** Coming back from a screen My Player opened: keep the saved back route and story week. */
  private resume = false;
  private root!: Phaser.GameObjects.Container;
  private hits: Hit[] = [];
  private contentH = 0;
  private drag: { y: number; scroll: number; moved: boolean } | null = null;
  private portraitKey: string | null = null;
  private taps: string[] = [];

  constructor() {
    super(SceneKeys.MyPlayer);
  }

  init(data: MyPlayerData): void {
    this.view = data?.view === 'history' ? 'history' : 'player';
    this.resume = this.view === 'history' || data?.resume === true;
    this.returnTo = data?.returnTo === 'story' ? 'story' : 'start';
    this.storyWeek = typeof data?.week === 'number' ? data.week : null;
    this.save = null;
    this.page = 0;
    this.expanded = false;
    this.detail = null;
    this.status = 'loading';
    this.leaving = false;
    this.hits = [];
    this.taps = [];
    this.drag = null;
    this.portraitKey = null;
  }

  create(): void {
    if (this.resume) this.registry.set('myPlayerReturn', this.registry.get('myPlayerReturn') ?? 'start');
    else this.registry.set('myPlayerReturn', this.returnTo);
    this.returnTo = this.registry.get('myPlayerReturn') === 'story' ? 'story' : 'start';
    if (this.storyWeek !== null) this.registry.set('myPlayerWeek', this.storyWeek);
    else if (this.returnTo === 'story' && typeof this.registry.get('myPlayerWeek') === 'number') this.storyWeek = this.registry.get('myPlayerWeek') as number;
    this.cameras.main.setBackgroundColor(BG);
    this.root = this.add.container(0, 0);
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('wheel', this.onWheel, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.build();
    void CareerStore.open().then(async (store) => {
      try {
        if (!this.sys.isActive()) return;
        const save = await store.load();
        if (!this.sys.isActive()) return;
        this.save = save;
        this.status = save.player ? 'ready' : 'no-player';
        this.loadPortrait(save.player?.gender);
        this.build();
      } finally {
        store.close();
      }
    });
  }

  private week(): number {
    return this.storyWeek ?? this.save?.week ?? 1;
  }

  /** This week's required home tasks: from week 2 (owner rule), juggling first. */
  tasks(): readonly HomeTask[] {
    if (!this.save?.player || this.week() < 2) return [];
    return homeTasks(weekAssignments(this.save, this.week()));
  }

  private teamStatus(): string {
    const s = this.save;
    if (!s) return '';
    if (s.teamTraining.some((t) => t.week === s.week)) return 'Done';
    return 'Not started';
  }

  private list(): (Row | SavedReport)[] {
    if (!this.save) return [];
    return this.view === 'history' ? [...this.save.reports].reverse() : attributeRows(this.save);
  }

  private pages(): number {
    return Math.max(1, Math.ceil(this.list().length / ROWS));
  }

  private pageItems(): (Row | SavedReport)[] {
    return this.list().slice(this.page * ROWS, this.page * ROWS + ROWS);
  }

  private rowText(it: Row | SavedReport | undefined): [string, string] {
    if (!it) return ['', ''];
    if ('matchId' in it) return [`Wk ${it.week} v ${it.away}`, `${it.score.home}-${it.score.away} >`];
    return [it.label, it.value === null ? '-' : it.carry ? `${it.value} +.${String(Math.round(it.carry * 100)).padStart(2, '0')}` : `${it.value}`];
  }

  // ---------- drawing ----------
  private build(): void {
    this.root.removeAll(true);
    this.hits = [];
    const { width, height } = this.scale;
    const ins = safeInsets();
    const landscape = width > height;
    const pad = Math.max(12, Math.round(Math.min(width, height) * 0.03));
    const left = ins.left + pad;
    const usable = width - ins.left - ins.right - pad * 2;
    const fs = Phaser.Math.Clamp(Math.round(Math.min(width, height) / 26), 13, 20);
    const colW = landscape ? Math.min(560, (usable - pad) / 2) : Math.min(620, usable);
    const x0 = landscape ? left + (usable - colW * 2 - pad) / 2 : left + (usable - colW) / 2;
    let y = ins.top + pad;
    y = this.text(x0 + (landscape ? colW + pad / 2 : colW / 2), y, 'MY PLAYER', fs * 1.9, 0.5, true) + 2;
    y = this.text(x0 + (landscape ? colW + pad / 2 : colW / 2), y, `Week ${this.week()}`, fs, 0.5, true) + pad;
    const top = y;
    let col1 = top;
    let col2 = top;
    if (this.view === 'mastery') {
      const fw = landscape ? colW * 2 + pad : colW;
      col1 = this.masteryCard(x0, col1, fw, fs, pad) + pad;
      col1 = this.nav(x0, col1, fw, fs, pad);
      this.contentH = col1 + ins.bottom + pad;
      this.clampScroll();
      return;
    }
    if (this.view === 'history') {
      col1 = this.historyCard(x0, col1, landscape ? colW * 2 + pad : colW, fs, pad);
      col1 = this.nav(x0, col1 + pad, landscape ? colW * 2 + pad : colW, fs, pad);
      this.contentH = col1 + ins.bottom + pad;
      this.clampScroll();
      return;
    }
    col1 = this.playerCard(x0, col1, colW, fs, pad) + pad;
    col1 = this.homeCard(x0, col1, colW, fs, pad) + pad;
    col1 = this.teamCard(x0, col1, colW, fs, pad) + pad;
    const x2 = landscape ? x0 + colW + pad : x0;
    if (!landscape) col2 = col1;
    col2 = this.devCard(x2, col2, colW, fs, pad) + pad;
    col2 = this.bonusCard(x2, col2, colW, fs, pad) + pad;
    col2 = this.secondary(x2, col2, colW, fs, pad) + pad;
    col2 = this.nav(x2, col2, colW, fs, pad);
    this.contentH = Math.max(col1, col2) + ins.bottom + pad;
    this.clampScroll();
  }

  private text(x: number, y: number, s: string, size: number, ox = 0, bold = false, color = INK, wrap = 0): number {
    const t = this.add.text(x, y, s, { fontFamily: FONT, fontSize: `${Math.round(size)}px`, color, fontStyle: bold ? 'bold' : 'normal', ...(wrap ? { wordWrap: { width: wrap } } : {}) }).setOrigin(ox, 0);
    this.root.add(t);
    return y + t.height;
  }

  private box(x: number, y: number, w: number, h: number, fill = CARD, r = 14): void {
    const g = this.add.graphics();
    g.fillStyle(fill, 1).fillRoundedRect(x, y, w, h, r).lineStyle(3, EDGE, 1).strokeRoundedRect(x, y, w, h, r);
    this.root.add(g);
  }

  private card(x: number, y: number, w: number, pad: number, draw: (cy: number) => number): number {
    const g = this.add.graphics();
    this.root.add(g);
    const end = draw(y + pad);
    const h = end - y + pad * 0.8;
    g.fillStyle(CARD, 1).fillRoundedRect(x, y, w, h, 16).lineStyle(3, EDGE, 1).strokeRoundedRect(x, y, w, h, 16);
    return y + h;
  }

  private button(name: string, x: number, y: number, w: number, h: number, label: string, fs: number, fill: number, on: () => void, color = '#ffffff'): number {
    this.box(x, y, w, h, fill, Math.min(18, h / 2));
    const t = this.add.text(x + w / 2, y + h / 2, label, { fontFamily: FONT, fontSize: `${Math.round(fs)}px`, color, fontStyle: 'bold' }).setOrigin(0.5);
    this.root.add(t);
    this.hits.push({ name, rect: { x, y, width: w, height: h }, on });
    return y + h;
  }

  private bar(x: number, y: number, w: number, h: number, frac: number): void {
    const g = this.add.graphics();
    g.fillStyle(TRACK, 1).fillRoundedRect(x, y, w, h, h / 2);
    if (frac > 0) g.fillStyle(ORANGE, 1).fillRoundedRect(x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    g.lineStyle(2, EDGE, 1).strokeRoundedRect(x, y, w, h, h / 2);
    this.root.add(g);
  }

  private playerCard(x: number, y: number, w: number, fs: number, pad: number): number {
    const p = this.save?.player;
    return this.card(x, y, w, pad, (cy) => {
      const ph = fs * 5.2;
      const pw = ph * 0.8;
      this.box(x + pad, cy, pw, ph, 0x3a6fc4, 12);
      if (this.portraitKey && this.textures.exists(this.portraitKey)) {
        const img = this.add.image(0, 0, this.portraitKey);
        const k = Math.max(pw / img.width, ph / img.height);
        const cw = pw / k;
        img.setScale(k).setOrigin(0, 0).setCrop((img.width - cw) / 2, 0, cw, ph / k).setPosition(x + pad - ((img.width - cw) / 2) * k, cy);
        this.root.add(img);
      }
      const tx = x + pad * 2 + pw;
      let ty = this.text(tx, cy, p ? p.name : this.status === 'loading' ? 'Loading…' : 'No career player yet.', fs * 1.5, 0, true);
      if (p) {
        ty = this.text(tx, ty + 2, p.position, fs);
        ty = this.text(tx, ty, 'FC Batavia', fs);
        ty = this.text(tx, ty, `Overall ${overall(this.save!)}/100`, fs * 0.85);
      }
      return Math.max(cy + ph, ty);
    });
  }

  private homeCard(x: number, y: number, w: number, fs: number, pad: number): number {
    const tasks = this.tasks();
    return this.card(x, y, w, pad, (cy) => {
      const inner = w - pad * 2;
      cy = this.text(x + pad, cy, "THIS WEEK'S HOME TRAINING", fs * 1.15, 0, true, INK, inner * 0.7);
      if (tasks.length) {
        this.box(x + w - pad - fs * 6.4, y + pad * 0.6, fs * 6.4, fs * 1.8, ORANGE, fs * 0.9);
        this.root.add(this.add.text(x + w - pad - fs * 3.2, y + pad * 0.6 + fs * 0.9, 'REQUIRED', { fontFamily: FONT, fontSize: `${Math.round(fs * 0.8)}px`, color: INK, fontStyle: 'bold' }).setOrigin(0.5));
      }
      if (!this.save?.player) return this.text(x + pad, cy + 4, this.status === 'loading' ? 'Loading…' : 'Create your player in Home Training first.', fs, 0, false, INK, inner);
      if (!tasks.length) {
        cy = this.text(x + pad, cy + 4, 'No required home training this week.', fs, 0, false, INK, inner);
      } else {
        const done = tasks.filter((t) => t.done).length;
        cy = this.text(x + pad, cy + 4, `Complete all ${tasks.length} to finish this week's required work.`, fs * 0.9, 0, false, INK, inner) + 6;
        this.bar(x + pad, cy + 2, inner * 0.62, fs * 1.1, done / tasks.length);
        this.text(x + pad + inner * 0.62 + 8, cy, `${done} of ${tasks.length} complete`, fs * 0.9);
        cy += fs * 1.6;
        const rowH = Math.max(46, fs * 2.6);
        tasks.forEach((t, i) => {
          const ry = cy + i * (rowH + 6);
          const hl = t.key === 'juggling';
          this.box(x + pad, ry, inner, rowH, hl ? 0xffe7bf : CARD, 10);
          const g = this.add.graphics();
          g.fillStyle(t.done ? ORANGE : TRACK, 1).fillCircle(x + pad + rowH / 2, ry + rowH / 2, rowH * 0.28).lineStyle(2, EDGE, 1).strokeCircle(x + pad + rowH / 2, ry + rowH / 2, rowH * 0.28);
          this.root.add(g);
          this.root.add(this.add.text(x + pad + rowH, ry + rowH / 2, `${t.done ? '✓ ' : ''}${t.short}${hl ? '  (every week)' : ''}`, { fontFamily: FONT, fontSize: `${fs}px`, color: INK, fontStyle: 'bold' }).setOrigin(0, 0.5));
          this.root.add(this.add.text(x + pad + inner - 12, ry + rowH / 2, '›', { fontFamily: FONT, fontSize: `${fs * 1.4}px`, color: INK }).setOrigin(1, 0.5));
          this.hits.push({ name: `my-player-task-${t.key}`, rect: { x: x + pad, y: ry, width: inner, height: rowH }, on: () => this.openTask(t) });
        });
        cy += tasks.length * (rowH + 6) + 4;
        const next = tasks.find((t) => !t.done);
        cy = this.button('my-player-start-next', x + pad, cy, inner, Math.max(52, fs * 2.8), next ? 'START NEXT SESSION' : 'ALL DONE THIS WEEK', fs * 1.15, next ? ORANGE : TRACK, () => next && this.openTask(next), INK);
        cy = this.text(x + w / 2, cy + 4, next ? `Next: ${next.short}` : 'Every required task is logged for this week.', fs * 0.85, 0.5);
      }
      cy += 8;
      cy = this.button('my-player-extra', x + pad, cy, inner, Math.max(44, fs * 2.4), 'Extra practice (optional)', fs * 0.95, CARD, () => this.openCareer({}), INK);
      return cy;
    });
  }

  private teamCard(x: number, y: number, w: number, fs: number, pad: number): number {
    return this.card(x, y, w, pad, (cy) => {
      const inner = w - pad * 2;
      const st = this.teamStatus();
      const top = cy;
      cy = this.text(x + pad, cy, 'TEAM TRAINING', fs * 1.15, 0, true);
      if (st) this.text(x + w - pad, top, st, fs * 0.85, 1);
      cy = this.text(x + pad, cy + 4, 'Sessions A, B and C with the club this week.', fs * 0.9, 0, false, INK, inner * 0.55);
      const bw = Math.min(inner * 0.45, fs * 11);
      this.button('my-player-team', x + w - pad - bw, top + fs * 1.6, bw, Math.max(48, fs * 2.6), 'Open session', fs, BLUE, () => this.openCareer({ open: 'team' }));
      return Math.max(cy, top + fs * 1.6 + Math.max(48, fs * 2.6));
    });
  }

  private devCard(x: number, y: number, w: number, fs: number, pad: number): number {
    const rows = this.save ? attributeRows(this.save) : [];
    return this.card(x, y, w, pad, (cy) => {
      const inner = w - pad * 2;
      cy = this.text(x + pad, cy, 'MY DEVELOPMENT', fs * 1.15, 0, true) + 6;
      const show = this.expanded ? this.pageItems() : rows.filter((r) => r.value !== null);
      const rh = Math.max(this.expanded ? 44 : 30, fs * (this.expanded ? 2.4 : 1.7));
      show.forEach((it, i) => {
        const [label, value] = this.rowText(it);
        const ry = cy + i * rh;
        const lt = this.add.text(x + pad, ry + rh / 2, label, { fontFamily: FONT, fontSize: `${fs * 0.95}px`, color: INK }).setOrigin(0, 0.5);
        const room = inner * 0.34;
        if (!this.expanded && lt.width > room) lt.setScale(room / lt.width);
        this.root.add(lt);
        if (!('matchId' in it) && it.value !== null) this.bar(x + pad + inner * 0.36, ry + rh / 2 - fs * 0.5, inner * 0.46, fs, it.value / 100);
        this.root.add(this.add.text(x + w - pad, ry + rh / 2, value, { fontFamily: FONT, fontSize: `${fs * 0.95}px`, color: INK }).setOrigin(1, 0.5));
        if (this.expanded) this.hits.push({ name: `my-player-row-${i}`, rect: { x: x + pad, y: ry, width: inner, height: rh }, on: () => this.tapRow(i) });
      });
      cy += show.length * rh + 6;
      if (this.expanded) {
        cy = this.button('my-player-page', x + pad, cy, inner, 44, `Page ${this.page + 1} of ${this.pages()}  ›`, fs * 0.9, CARD, () => this.nextPage(), INK) + 6;
        const d = this.detail ?? 'Tap an attribute for what it does. Attributes rise only at the weekly review, from match, team-training and home evidence.';
        cy = this.text(x + pad, cy, d, fs * 0.85, 0, false, INK, inner) + 6;
      }
      return this.button('my-player-attrs', x + pad, cy, inner, 44, this.expanded ? 'Hide details' : 'View all attributes  ›', fs * 0.95, CARD, () => ((this.expanded = !this.expanded), (this.detail = null), this.build()), '#2a56a8');
    });
  }

  /** Last saved practice entry and its Coach Code feedback (a "check" entry offers correct or confirm). */
  private homeNote: { id: string; kind: string; text: string } | null = null;

  private masteryCard(x: number, y: number, w: number, fs: number, pad: number): number {
    const s = this.save;
    return this.card(x, y, w, pad, (cy) => {
      const inner = w - pad * 2;
      cy = this.text(x + pad, cy, 'HOME TRAINING MASTERY', fs * 1.15, 0, true) + 4;
      if (!s?.player) return this.text(x + pad, cy, 'Create your player first.', fs, 0, false, INK, inner);
      const tasks = this.tasks();
      const weekly = tasks.length ? `This week's required home training: ${tasks.filter((t) => t.done).length} of ${tasks.length} complete (separate from mastery).` : 'No required home training this week. Extra practice still builds mastery.';
      cy = this.text(x + pad, cy, weekly, fs * 0.85, 0, false, INK, inner) + 8;
      if (this.homeNote) {
        cy = this.text(x + pad, cy, this.homeNote.text, fs * 0.9, 0, true, INK, inner) + 6;
        if (this.homeNote.kind === 'check') {
          const bw = (inner - pad * 0.5) / 2;
          const id = this.homeNote.id;
          this.button('home-correct', x + pad, cy, bw, 44, 'Correct my score', fs * 0.85, BLUE, () => void this.logHome(null, id));
          cy = this.button('home-confirm', x + pad + bw + pad * 0.5, cy, bw, 44, 'My score is right', fs * 0.85, CARD, () => void this.confirmHome(id), INK) + 8;
        }
      }
      for (const skill of HOME_SKILLS) {
        const m = masteryLines(s.homeLogs, skill);
        cy = this.text(x + pad, cy, SKILL_LABEL[skill].toUpperCase(), fs, 0, true) + 2;
        this.bar(x + pad, cy + 2, inner * 0.6, fs * 0.9, (m.progress.phase - 1 + m.progress.qualifying / 2) / 5);
        cy += fs * 1.4;
        for (const l of m.lines) cy = this.text(x + pad, cy, l, fs * 0.82, 0, false, INK, inner) + 2;
        const task = tasks.find((t) => t.key === skill);
        const bw = task ? (inner - pad * 0.5) / 2 : inner;
        if (task) this.button(`home-demo-${skill}`, x + pad, cy + 4, bw, 44, 'Watch demo', fs * 0.85, CARD, () => this.openTask(task), INK);
        cy = this.button(`home-log-${skill}`, x + pad + (task ? bw + pad * 0.5 : 0), cy + 4, bw, 44, 'Log scores', fs * 0.85, BLUE, () => void this.logHome(skill)) + 10;
      }
      return cy;
    });
  }

  private async withStore<T>(fn: (store: CareerStore) => Promise<T>): Promise<T | null> {
    if (this.spending) return null;
    this.spending = true;
    const store = await CareerStore.open();
    try {
      return await fn(store);
    } finally {
      this.spending = false;
      store.close();
    }
  }

  /** New entry for `skill`, or a correction of entry `fixId` (same session, never a second one). */
  private async logHome(skill: HomeSkillId | null, fixId?: string): Promise<void> {
    const s = this.save;
    if (!s?.player) return;
    const old = fixId ? s.homeLogs.find((l) => l.id === fixId) : undefined;
    const sk = old?.skill ?? skill;
    if (!sk) return;
    const prog = masteryLines(s.homeLogs, sk).progress;
    const spec = old ? specFor(old.skill, old.phase) : prog.spec;
    if (!spec) return;
    const typed = window.prompt(`${SKILL_LABEL[sk]} Phase ${old?.phase ?? prog.phase}: ${spec.record}. ${entryHint(spec)}`, '');
    if (typed === null) return;
    const attempts = parseAttempts(spec, typed);
    if (typeof attempts === 'string') {
      this.homeNote = { id: '', kind: 'error', text: `${attempts} Nothing was saved.` };
      this.build();
      return;
    }
    const id = old?.id ?? `home-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const r = await this.withStore((store) =>
      store.dispatch(old ? { type: 'homeCorrect', id, attempts } : { type: 'homeLog', log: { id, week: s.week, skill: sk, phase: prog.phase, activityId: spec.activityIds[0]!, variation: spec.variation, foot: null, source: 'self-reported', attempts, at: Date.now(), confirmed: false, revision: 0 } }),
    );
    if (!r || !this.sys.isActive()) return;
    if (r.ok) this.save = r.save;
    const f = r.ok ? feedbackLine(r.save.homeLogs, id) : null;
    this.homeNote = r.ok ? { id, kind: f?.kind ?? 'first', text: f?.text ?? r.message } : { id: '', kind: 'error', text: r.error };
    this.build();
  }

  private async confirmHome(id: string): Promise<void> {
    const r = await this.withStore((store) => store.dispatch({ type: 'homeConfirm', id }));
    if (!r || !this.sys.isActive()) return;
    if (r.ok) this.save = r.save;
    const f = r.ok ? feedbackLine(r.save.homeLogs, id) : null;
    this.homeNote = r.ok ? { id, kind: f?.kind ?? 'first', text: `Score kept as you reported it. ${f?.text ?? ''}` } : { id: '', kind: 'error', text: r.error };
    this.build();
  }

  private bonusNote: string | null = null;
  private spending = false;

  /** Bonus Attribute Points: earned from achievements, spent here on a permanent +1 (never past potential). */
  private bonusCard(x: number, y: number, w: number, fs: number, pad: number): number {
    const s = this.save;
    if (!s?.player) return y - pad;
    const pts = balance(s.bonus);
    return this.card(x, y, w, pad, (cy) => {
      const inner = w - pad * 2;
      cy = this.text(x + pad, cy, `BONUS POINTS: ${pts}`, fs * 1.15, 0, true) + 4;
      const recent = s.bonus.awards.slice(-3).reverse().map(awardTitle);
      cy = this.text(x + pad, cy, recent.length ? `Earned: ${recent.join(', ')}${s.bonus.awards.length > 3 ? ` (+${s.bonus.awards.length - 3} more)` : ''}` : 'Earn points: Hat Trick, Playmaker, Ball Winner, Cloudy Champion, Training Perfection.', fs * 0.85, 0, false, INK, inner) + 6;
      if (this.bonusNote) cy = this.text(x + pad, cy, this.bonusNote, fs * 0.85, 0, true, INK, inner) + 6;
      if (pts < 1) return cy;
      const bw = (inner - pad * 0.5) / 2;
      const bh = Math.max(44, fs * 2.3);
      SPENDABLE.forEach((a, i) => {
        const p = s.player!;
        const full = p.attributes[a] + 1 > p.potential[a];
        const bx = x + pad + (i % 2) * (bw + pad * 0.5);
        const by = cy + Math.floor(i / 2) * (bh + 6);
        this.button(`my-player-spend-${a}`, bx, by, bw, bh, full ? `${ATTRIBUTE_LABELS[a]} (max)` : `+1 ${ATTRIBUTE_LABELS[a]}`, fs * 0.85, full ? CARD : BLUE, () => void this.spend(a), full ? INK : '#ffffff');
      });
      return cy + Math.ceil(SPENDABLE.length / 2) * (bh + 6);
    });
  }

  private async spend(attribute: AttributeId): Promise<void> {
    const p = this.save?.player;
    if (this.spending || !p) return;
    if (p.attributes[attribute] + 1 > p.potential[attribute]) {
      this.bonusNote = `${ATTRIBUTE_LABELS[attribute]} is at its potential (${p.potential[attribute]}). Your point is still saved.`;
      this.build();
      return;
    }
    this.spending = true;
    const store = await CareerStore.open();
    try {
      const r = await store.dispatch({ type: 'bonusSpend', id: `spend-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, attribute });
      if (!this.sys.isActive()) return;
      if (r.ok) this.save = r.save;
      this.bonusNote = r.ok ? `${r.message} ${ATTRIBUTE_LABELS[attribute]} is now ${r.save.player!.attributes[attribute]}.` : r.error;
      this.build();
    } finally {
      this.spending = false;
      store.close();
    }
  }

  private secondary(x: number, y: number, w: number, fs: number, pad: number): number {
    const bw = (w - pad) / 2;
    const h = Math.max(50, fs * 2.7);
    this.button('my-player-rankings', x, y, bw, h, 'Rankings', fs, BLUE, () => void this.openRankings());
    this.button('my-player-review', x + bw + pad, y, bw, h, 'Weekly review', fs, BLUE, () => this.openCareer({ open: 'review' }));
    const hy = this.button('my-player-history', x, y + h + pad * 0.6, w, Math.max(44, fs * 2.4), 'Match history', fs * 0.95, CARD, () => ((this.view = 'history'), (this.page = 0), this.build()), INK);
    return this.button('my-player-mastery', x, hy + pad * 0.6, w, Math.max(44, fs * 2.4), 'Home Training mastery  ›', fs * 0.95, CARD, () => ((this.view = 'mastery'), (this.cameras.main.scrollY = 0), this.build()), INK);
  }

  private historyCard(x: number, y: number, w: number, fs: number, pad: number): number {
    return this.card(x, y, w, pad, (cy) => {
      const inner = w - pad * 2;
      cy = this.text(x + pad, cy, 'MATCH HISTORY', fs * 1.15, 0, true) + 4;
      if (this.save) cy = this.text(x + pad, cy, seasonTotals(this.save), fs * 0.85, 0, false, INK, inner) + 6;
      const items = this.pageItems();
      if (!items.length) cy = this.text(x + pad, cy, 'No matches yet', fs);
      const rh = Math.max(46, fs * 2.5);
      items.forEach((it, i) => {
        const [label, value] = this.rowText(it);
        this.button(`my-player-row-${i}`, x + pad, cy + i * (rh + 6), inner, rh, '', fs, CARD, () => this.tapRow(i));
        this.root.add(this.add.text(x + pad * 1.6, cy + i * (rh + 6) + rh / 2, label, { fontFamily: FONT, fontSize: `${fs}px`, color: INK }).setOrigin(0, 0.5));
        this.root.add(this.add.text(x + w - pad * 1.6, cy + i * (rh + 6) + rh / 2, value, { fontFamily: FONT, fontSize: `${fs}px`, color: INK }).setOrigin(1, 0.5));
      });
      cy += items.length * (rh + 6);
      return this.button('my-player-page', x + pad, cy, inner, 44, `Page ${this.page + 1} of ${this.pages()}  ›`, fs * 0.9, CARD, () => this.nextPage(), INK);
    });
  }

  /** The one way out: back to the player view from history, otherwise back where My Player was opened from. */
  private nav(x: number, y: number, w: number, fs: number, _pad: number): number {
    const label = this.view !== 'player' ? 'Back to My Player' : this.returnTo === 'story' ? 'Back to story' : 'Back to menu';
    return this.button('my-player-back', x, y, w, Math.max(50, fs * 2.7), label, fs, CARD, () => this.back(), '#2a56a8');
  }

  // ---------- actions ----------
  private openCareer(extra: { open?: string; task?: string }): void {
    const data = { ...(this.returnTo === 'story' ? { returnTo: 'story' as const } : {}), week: this.week(), ...extra };
    this.go(() => this.scene.start(SceneKeys.Career, data));
  }

  /** Rankings for the story career: its saved season week (or the story week My Player was opened with); no story → Rankings' own no-career state. */
  private async openRankings(): Promise<void> {
    if (this.leaving) return;
    this.leaving = true;
    let careerId = '';
    let week = this.storyWeek ?? 1;
    const store = await StoryStore.open().catch(() => null);
    if (store) {
      const st = await store.load(STORY_CAREER_ID).catch(() => null);
      store.close();
      if (st) {
        careerId = st.careerId;
        const m = /^S1_W(\d\d)_/.exec(st.sceneId);
        if (this.storyWeek === null && m) week = Number(m[1]);
      }
    }
    if (!this.sys.isActive()) return;
    this.scene.start(SceneKeys.Rankings, { careerId, week, returnTo: 'myPlayer' });
  }

  private openTask(t: HomeTask): void {
    this.openCareer({ task: t.key });
  }

  private nextPage(): void {
    this.page = (this.page + 1) % this.pages();
    this.build();
  }

  private tapRow(i: number): void {
    const item = this.pageItems()[i];
    if (!item) return;
    if ('matchId' in item) this.go(() => this.scene.start(SceneKeys.Report, { matchId: item.matchId, next: 'history' }));
    else ((this.detail = item.detail), this.build());
  }

  private go(fn: () => void): void {
    if (this.leaving) return;
    this.leaving = true;
    fn();
  }

  private back(): void {
    if (this.view !== 'player') {
      this.view = 'player';
      this.page = 0;
      this.build();
      return;
    }
    this.go(() => (this.returnTo === 'story' ? this.scene.start(SceneKeys.Story, { resume: true }) : this.scene.start(SceneKeys.Start)));
  }

  private loadPortrait(gender: string | undefined): void {
    const id = gender === 'boy' ? 'boy-home' : gender === 'girl' ? 'girl-home' : '';
    const url = id ? artUrl(id) : null;
    if (!url) return;
    const key = artTextureKey(id);
    this.portraitKey = key;
    if (this.textures.exists(key)) return;
    this.load.image(key, url);
    this.load.once(`filecomplete-image-${key}`, () => this.sys.isActive() && this.build());
    this.load.start();
  }

  // ---------- scrolling and input ----------
  private clampScroll(): void {
    const cam = this.cameras.main;
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, Math.max(0, this.contentH - this.scale.height));
  }

  private onDown(p: Phaser.Input.Pointer): void {
    this.drag = { y: p.y, scroll: this.cameras.main.scrollY, moved: false };
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.drag || !p.isDown) return;
    if (Math.abs(p.y - this.drag.y) > 10) this.drag.moved = true;
    if (this.drag.moved) {
      this.cameras.main.scrollY = this.drag.scroll - (p.y - this.drag.y);
      this.clampScroll();
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    this.drag = null;
    if (!d || d.moved || this.leaving) return;
    const wy = p.y + this.cameras.main.scrollY;
    const h = this.hits.find((x) => p.x >= x.rect.x && p.x <= x.rect.x + x.rect.width && wy >= x.rect.y && wy <= x.rect.y + x.rect.height);
    if (!h) return;
    this.taps.push(h.name);
    h.on();
  }

  private onWheel(_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number): void {
    this.cameras.main.scrollY += dy;
    this.clampScroll();
  }

  private onResize(): void {
    this.build();
  }

  private onShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.input.off('pointerdown', this.onDown, this);
    this.input.off('pointermove', this.onMove, this);
    this.input.off('pointerup', this.onUp, this);
    this.input.off('wheel', this.onWheel, this);
  }

  /** Hit areas in screen coordinates (after scrolling). */
  describeLayout(): SceneLayoutReport {
    const { width, height } = this.scale;
    const sy = this.cameras.main.scrollY;
    const el: Record<string, Rect> = {};
    for (const h of this.hits) el[h.name] = { ...h.rect, y: h.rect.y - sy };
    return { orientation: orientationOf({ width, height }), viewport: { width, height }, elements: el };
  }

  describeGameplay(): unknown {
    const items = this.pageItems().map((it) => this.rowText(it));
    const tasks = this.tasks();
    return {
      taps: this.taps, status: this.status, view: this.view, page: this.page, pages: this.pages(), expanded: this.expanded,
      rows: items.map((r) => r[0]), values: items.map((r) => r[1]), week: this.save ? weekLines(this.save) : [], storyWeek: this.week(),
      tasks: tasks.map((t) => ({ key: t.key, done: t.done })), next: tasks.find((t) => !t.done)?.key ?? null, team: this.teamStatus(),
      contentHeight: this.contentH, scrollY: this.cameras.main.scrollY,
      bonus: this.save ? { points: balance(this.save.bonus), awards: [...this.save.bonus.awards] } : null,
      attributes: this.save?.player ? { ...this.save.player.attributes } : null, bonusNote: this.bonusNote,
      homeNote: this.homeNote, homeLogs: this.save?.homeLogs.length ?? 0,
      mastery: this.save ? HOME_SKILLS.map((k) => masteryLines(this.save!.homeLogs, k).progress).map((g) => ({ skill: g.skill, phase: g.phase, qualifying: g.qualifying, best: g.personalBest })) : [],
    };
  }
}
