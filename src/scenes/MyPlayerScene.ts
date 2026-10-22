import Phaser from 'phaser';
import type { Rect } from '../game';
import { ATTRIBUTE_EVIDENCE, CAREER_CONFIG } from '../game/career/config';
import { CareerStore } from '../game/career/store';
import type { CareerSave } from '../game/career/state';
import { ATTRIBUTES, ATTRIBUTE_LABELS } from '../game/career/types';
import { NOT_TRACKED } from '../game/report/registry';
import type { SavedReport } from '../game/report/report';
import { artTextureKey, artUrl } from '../render/art/urls';
import { MY_PLAYER as P, type NBox } from '../render/devreport';
import { orientationOf } from '../render/layout';
import type { InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { devreportUrl } from './MatchReportScene';
import { ArtCard } from './ui/artCard';

export interface MyPlayerData {
  readonly view?: 'player' | 'history';
  readonly returnTo?: 'story' | 'start';
}

const INK = '#1b2a3a';
const CREAM = '#f4ead2';
const ROWS = 6;

interface Row { readonly label: string; readonly value: number | null; readonly detail: string }

/** All attribute rows: the six the game tracks, then the requested ones it does not (never invented). */
export function attributeRows(save: CareerSave): Row[] {
  const p = save.player;
  const tracked: Row[] = ATTRIBUTES.map((a) => ({ label: ATTRIBUTE_LABELS[a], value: p ? p.attributes[a] : null, detail: `${ATTRIBUTE_LABELS[a]}: ${ATTRIBUTE_EVIDENCE[a]}` }));
  return [...tracked, ...NOT_TRACKED.map((n) => ({ label: n, value: null, detail: `${n}: not tracked by this game yet. Nothing is counted or invented for it.` }))];
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

export class MyPlayerScene extends Phaser.Scene implements InspectableScene {
  private card!: ArtCard;
  private view: 'player' | 'history' = 'player';
  private returnTo: 'story' | 'start' = 'start';
  private save: CareerSave | null = null;
  private page = 0;
  private recent = false;
  private detail: string | null = null;
  private rows: Phaser.GameObjects.Text[] = [];
  private values: Phaser.GameObjects.Text[] = [];
  private weekTexts: Phaser.GameObjects.Text[] = [];
  private header!: Phaser.GameObjects.Text;
  private weekHeader!: Phaser.GameObjects.Text;
  private bars!: Phaser.GameObjects.Graphics;
  private portrait: Phaser.GameObjects.Image | null = null;
  private status = 'loading';
  private leaving = false;

  constructor() {
    super(SceneKeys.MyPlayer);
  }

  init(data: MyPlayerData): void {
    this.view = data?.view === 'history' ? 'history' : 'player';
    this.returnTo = data?.returnTo === 'story' ? 'story' : 'start';
    this.save = null;
    this.page = 0;
    this.recent = false;
    this.detail = null;
    this.rows = [];
    this.values = [];
    this.weekTexts = [];
    this.portrait = null;
    this.status = 'loading';
    this.leaving = false;
  }

  create(): void {
    if (this.view === 'history') this.registry.set('myPlayerReturn', this.registry.get('myPlayerReturn') ?? 'start');
    else this.registry.set('myPlayerReturn', this.returnTo);
    this.returnTo = this.registry.get('myPlayerReturn') === 'story' ? 'story' : 'start';
    this.card = new ArtCard(this, 'devreport:my-player-bedroom', devreportUrl('my-player-bedroom'));
    this.bars = this.add.graphics().setDepth(1);
    const c = this.card;
    c.label(P.banner, 'MY PLAYER', 0.5, INK);
    c.label(P.back, '<', 0.6, INK);
    c.label(P.help, '?', 0.6, INK);
    c.hit('my-player-back', P.back, () => this.back());
    c.hit('my-player-help', P.help, () => this.showDetail('Attributes rise only at the weekly review, from match, team-training and home evidence. Tap an attribute for what it does. Form and Energy are not tracked yet.'));
    this.header = c.label(P.attrHeader, '', 0.5, CREAM, 'left');
    c.hit('my-player-page', P.attrHeader, () => this.nextPage());
    for (let i = 0; i < ROWS; i++) {
      this.rows.push(c.label(this.labelBox(P.attrRows[i]!), '', 0.42, INK, 'left'));
      this.values.push(c.label(this.valueBox(P.attrRows[i]!), '', 0.42, INK, 'right'));
      c.hit(`my-player-row-${i}`, P.attrRows[i]!, () => this.tapRow(i));
    }
    this.weekHeader = c.label(P.weekHeader, '', 0.5, CREAM, 'left');
    c.hit('my-player-week-toggle', P.weekHeader, () => ((this.recent = !this.recent), (this.detail = null), this.refresh()));
    for (let i = 0; i < 3; i++) this.weekTexts.push(c.label(P.weekRows[i]!, '', 0.36, INK, 'left'));
    c.label(P.training, 'HOME TRAINING', 0.42, INK);
    c.label(P.history, 'MATCH HISTORY', 0.42, INK);
    c.hit('my-player-training', P.training, () => this.go(() => this.scene.start(SceneKeys.Career, this.returnTo === 'story' ? { returnTo: 'story' as const } : {})));
    c.hit('my-player-history', P.history, () => ((this.view = this.view === 'history' ? 'player' : 'history'), (this.page = 0), (this.detail = null), this.refresh()));
    c.afterLayout(() => this.drawBars());
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    c.layout();
    void CareerStore.open().then(async (store) => {
      try {
        if (!this.sys.isActive()) return;
        const save = await store.load();
        if (!this.sys.isActive()) return;
        this.save = save;
        this.status = save.player ? 'ready' : 'no-player';
        const p = save.player;
        c.label(P.info, p ? `${p.name}\nFC Batavia - ${p.position}\nOverall ${overall(save)}/100` : 'No career player yet.', 0.2, INK, 'left');
        c.label(P.form, 'Form\nnot tracked', 0.24, INK);
        c.label(P.energy, 'Energy\nnot tracked', 0.24, INK);
        this.loadPortrait(p?.gender);
        this.refresh();
      } finally {
        store.close();
      }
    });
  }

  private labelBox(r: NBox): NBox {
    return { x0: r.x0, y0: r.y0, x1: P.trackX[0] - 0.01, y1: r.y1 };
  }

  private valueBox(r: NBox): NBox {
    return { x0: P.trackX[1] + 0.01, y0: r.y0, x1: r.x1, y1: r.y1 };
  }

  private list(): (Row | SavedReport)[] {
    if (!this.save) return [];
    return this.view === 'history' ? [...this.save.reports].reverse() : attributeRows(this.save);
  }

  private pages(): number {
    return Math.max(1, Math.ceil(this.list().length / ROWS));
  }

  private nextPage(): void {
    this.page = (this.page + 1) % this.pages();
    this.refresh();
  }

  private tapRow(i: number): void {
    const item = this.list()[this.page * ROWS + i];
    if (!item) return;
    if ('matchId' in item) this.go(() => this.scene.start(SceneKeys.Report, { matchId: item.matchId, next: 'history' }));
    else this.showDetail(item.detail);
  }

  private showDetail(text: string): void {
    this.detail = text;
    this.refresh();
  }

  private refresh(): void {
    if (!this.save) return;
    const items = this.list().slice(this.page * ROWS, this.page * ROWS + ROWS);
    const title = this.view === 'history' ? 'MATCH HISTORY' : 'ATTRIBUTES';
    this.card.setText(this.header, `${title}   Page ${this.page + 1}/${this.pages()}  Next >`);
    for (let i = 0; i < ROWS; i++) {
      const it = items[i];
      let label = '';
      let value = '';
      if (it && 'matchId' in it) {
        label = `Wk ${it.week} v ${it.away}`;
        value = `${it.score.home}-${it.score.away} >`;
      } else if (it) {
        label = it.label;
        value = it.value === null ? '-' : `${it.value}`;
      }
      if (i === 0 && !it && this.view === 'history') label = 'No matches yet';
      this.card.setText(this.rows[i]!, label);
      this.card.setText(this.values[i]!, value);
    }
    const lines = this.detail ? this.wrap3(this.detail) : this.recent ? recentLines(this.save) : weekLines(this.save);
    this.card.setText(this.weekHeader, this.detail ? 'DETAILS   (tap to close)' : this.recent ? 'RECENT DEVELOPMENT   This week >' : 'THIS WEEK   Recent >');
    lines.forEach((l, i) => this.card.setText(this.weekTexts[i]!, l));
    this.drawBars();
  }

  private wrap3(text: string): string[] {
    const words = text.split(' ');
    const per = Math.ceil(words.length / 3);
    return [0, 1, 2].map((i) => words.slice(i * per, (i + 1) * per).join(' '));
  }

  private drawBars(): void {
    this.bars.clear();
    this.fitImage();
    if (!this.save || this.view === 'history') return;
    const items = attributeRows(this.save).slice(this.page * ROWS, this.page * ROWS + ROWS);
    items.forEach((it, i) => {
      if (it.value === null) return;
      const r = this.card.rect(P.attrRows[i]!);
      const x0 = this.card.rect({ ...P.attrRows[i]!, x0: P.trackX[0], x1: P.trackX[1] });
      const h = r.height * 0.42;
      this.bars.fillStyle(0xf2a531, 1).fillRect(x0.x + 2, r.y + (r.height - h) / 2, Math.max(0, (x0.width - 4) * Math.min(1, it.value / 100)), h);
    });
  }

  private loadPortrait(gender: string | undefined): void {
    const id = gender === 'boy' ? 'boy-home' : gender === 'girl' ? 'girl-home' : '';
    const url = id ? artUrl(id) : null;
    if (!url) return;
    const key = artTextureKey(id);
    const place = () => {
      if (!this.sys.isActive() || !this.textures.exists(key)) return;
      this.portrait = this.add.image(0, 0, key).setDepth(1);
      this.drawBars();
    };
    if (this.textures.exists(key)) place();
    else {
      this.load.image(key, url);
      this.load.once(`filecomplete-image-${key}`, place);
      this.load.start();
    }
  }

  private fitImage(): void {
    const img = this.portrait;
    if (!img) return;
    const r = this.card.rect(P.portrait);
    const k = Math.max(r.width / img.width, r.height / img.height);
    const cw = r.width / k;
    const ch = r.height / k;
    img.setScale(k).setOrigin(0, 0).setCrop((img.width - cw) / 2, 0, cw, ch).setPosition(r.x - ((img.width - cw) / 2) * k, r.y);
  }

  private go(fn: () => void): void {
    if (this.leaving) return;
    this.leaving = true;
    fn();
  }

  private back(): void {
    if (this.view === 'history') {
      this.view = 'player';
      this.page = 0;
      this.refresh();
      return;
    }
    this.go(() => (this.returnTo === 'story' ? this.scene.start(SceneKeys.Story, { resume: true }) : this.scene.start(SceneKeys.Start)));
  }

  private onResize(): void {
    this.card.layout();
  }

  private onShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
  }

  describeLayout(): SceneLayoutReport {
    const { width, height } = this.scale;
    const el: Record<string, Rect> = { painting: this.card.artRect() };
    for (const h of this.card.hits) el[h.name] = this.card.rect(h.box);
    return { orientation: orientationOf({ width, height }), viewport: { width, height }, elements: el };
  }

  describeGameplay(): unknown {
    return { status: this.status, view: this.view, page: this.page, pages: this.pages(), rows: this.rows.map((t) => t.text), values: this.values.map((t) => t.text), week: this.weekTexts.map((t) => t.text), header: this.header?.text, gender: this.save?.player?.gender ?? null, portrait: this.portrait !== null };
  }
}
