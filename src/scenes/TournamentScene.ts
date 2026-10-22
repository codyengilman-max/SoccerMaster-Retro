import Phaser from 'phaser';
import type { Rect } from '../game';
import { TOURNAMENTS, newTournament, nextBataviaFixture, recordTournamentPlayed, type TournamentState } from '../game/season/tournament';
import { tournamentBoard, type BoardGroup, type TournamentBoard } from '../game/season/tournamentBoard';
import { orientationOf } from '../render/layout';
import { FONT_FAMILY, textResolution } from '../render/theme';
import type { InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';

const files = import.meta.glob('../assets/art/tournament/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const tournamentArtUrl = (name: string): string | undefined => Object.entries(files).find(([p]) => p.endsWith(`/${name}.webp`))?.[1];
const key = (name: string): string => `tourney:${name}`;

type TId = TournamentState['id'];
const ART: Readonly<Record<TId, string>> = { az_showcase: 'az-showcase', holiday_classic: 'holiday-classic' };
const PANELS = ['title', 'group-a', 'group-b', 'match-result', 'outcome', 'continue'] as const;
type Panel = (typeof PANELS)[number];

/** Review samples are real tournaments played through the tournament rules with fixed scores. */
export type ReviewSample = 'pending' | 'in_final' | 'champion' | 'runner_up' | 'eliminated';
const SAMPLE_SCORES: Readonly<Record<ReviewSample, readonly (readonly [number, number])[]>> = {
  pending: [[2, 1]],
  in_final: [[9, 0], [9, 0], [9, 0]],
  champion: [[9, 0], [9, 0], [9, 0], [3, 1]],
  runner_up: [[9, 0], [9, 0], [9, 0], [0, 2]],
  eliminated: [[0, 9], [0, 9], [0, 9]],
};
export function reviewSample(id: TId, sample: ReviewSample): TournamentState {
  let s = newTournament(id, 'review', 20261013);
  for (const [us, them] of SAMPLE_SCORES[sample]) {
    const f = nextBataviaFixture(s);
    if (!f) break;
    const r = recordTournamentPlayed(s, f.id, us, them);
    if (r.ok) s = r.state;
  }
  return s;
}

export interface TournamentSceneData {
  readonly tournament?: TId;
  /** A saved tournament to show; without one the scene is the owner-review preview with samples. */
  readonly state?: TournamentState;
  readonly sample?: ReviewSample;
  readonly next?: 'story' | 'review';
}

const INK = '#1b2a3a';
const CREAM = '#f7eedb';

export class TournamentScene extends Phaser.Scene implements InspectableScene {
  private tid: TId = 'az_showcase';
  private state!: TournamentState;
  private review = true;
  private sample: ReviewSample = 'pending';
  private next: 'story' | 'review' = 'review';
  private board!: TournamentBoard;
  private bg: Phaser.GameObjects.Image | null = null;
  private shade!: Phaser.GameObjects.Rectangle;
  private logo: Phaser.GameObjects.Image | null = null;
  private prize: Phaser.GameObjects.Image | null = null;
  private panels = new Map<Panel, Phaser.GameObjects.NineSlice | Phaser.GameObjects.Image>();
  private texts = new Map<string, Phaser.GameObjects.Text>();
  private rects: Record<string, Rect> = {};
  private sampleButtons: Button[] = [];
  private switchButton: Button | null = null;
  private leaving = false;

  constructor() {
    super(SceneKeys.Tournament);
  }

  init(data: TournamentSceneData): void {
    this.tid = data?.tournament === 'holiday_classic' || data?.state?.id === 'holiday_classic' ? 'holiday_classic' : 'az_showcase';
    this.review = !data?.state;
    this.sample = data?.sample ?? 'pending';
    this.state = data?.state ?? reviewSample(this.tid, this.sample);
    this.next = data?.next === 'story' ? 'story' : 'review';
    this.board = tournamentBoard(this.state);
    this.bg = this.logo = this.prize = null;
    this.panels = new Map();
    this.texts = new Map();
    this.sampleButtons = [];
    this.switchButton = null;
    this.leaving = false;
  }

  preload(): void {
    const a = ART[this.tid];
    const want = [`${a}-background`, `${a}-assets-logo`, `${a}-assets-trophy`, `${a}-assets-medal`, ...PANELS.map((p) => `tournament-results-components-${p}`)];
    for (const n of want) {
      const url = tournamentArtUrl(n);
      if (url && !this.textures.exists(key(n))) this.load.image(key(n), url);
    }
  }

  create(): void {
    const a = ART[this.tid];
    this.add.rectangle(0, 0, 4000, 4000, 0x10141c).setOrigin(0, 0).setDepth(-3);
    if (this.textures.exists(key(`${a}-background`))) this.bg = this.add.image(0, 0, key(`${a}-background`)).setDepth(-2);
    this.shade = this.add.rectangle(0, 0, 10, 10, 0x0b1320, 0.35).setOrigin(0, 0).setDepth(-1);
    if (this.textures.exists(key(`${a}-assets-logo`))) this.logo = this.add.image(0, 0, key(`${a}-assets-logo`)).setDepth(3);
    const won = this.board.outcome === 'champion' ? 'trophy' : this.board.outcome === 'runner_up' ? 'medal' : null;
    if (won && this.textures.exists(key(`${a}-assets-${won}`))) this.prize = this.add.image(0, 0, key(`${a}-assets-${won}`)).setDepth(3);
    for (const p of PANELS) {
      const k = key(`tournament-results-components-${p}`);
      if (!this.textures.exists(k)) continue;
      const src = this.textures.get(k).getSourceImage() as { width: number; height: number };
      const c = Math.round(Math.min(src.width, src.height) * 0.18);
      this.panels.set(p, this.add.nineslice(0, 0, k, undefined, src.width, src.height, c, c, c, c).setOrigin(0, 0).setDepth(1));
    }
    this.fillText();
    this.panelHit('continue', () => this.leave());
    if (this.review) {
      const samples: ReviewSample[] = ['pending', 'in_final', 'champion', 'runner_up', 'eliminated'];
      const label: Record<ReviewSample, string> = { pending: 'Group', in_final: 'Final due', champion: 'Won', runner_up: 'Lost final', eliminated: 'Out' };
      this.sampleButtons = samples.map((s) => new Button(this, 0, 0, { name: `sample-${s}`, label: label[s], width: 80, height: 30, fontSize: 12, onClick: () => this.scene.restart({ tournament: this.tid, sample: s }) }).setDepth(4));
      const other: TId = this.tid === 'az_showcase' ? 'holiday_classic' : 'az_showcase';
      this.switchButton = new Button(this, 0, 0, { name: 'sample-switch', label: TOURNAMENTS[other].name, width: 120, height: 30, fontSize: 12, onClick: () => this.scene.restart({ tournament: other, sample: this.sample }) }).setDepth(4);
    }
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.layout();
  }

  private text(name: string, value: string, color = INK, align: 'left' | 'center' = 'center'): void {
    this.texts.set(name, this.add.text(0, 0, value, { fontFamily: FONT_FAMILY, color, align, fontStyle: 'bold', resolution: textResolution() }).setDepth(2));
  }

  private groupText(g: BoardGroup): string {
    return g.rows.map((r) => `${r.position}. ${r.home ? '> ' : ''}${r.name}  P${r.played} W${r.won} D${r.drawn} L${r.lost}  ${r.points} pts`).join('\n');
  }

  private fillText(): void {
    const b = this.board;
    const r = b.lastResult;
    this.text('title', b.name, CREAM);
    this.text('group-a-head', b.groups[0].label, CREAM);
    this.text('group-a', this.groupText(b.groups[0]), INK, 'left');
    this.text('group-b-head', b.groups[1].label, CREAM);
    this.text('group-b', this.groupText(b.groups[1]), INK, 'left');
    this.text('match-result', r ? `${r.stage}\n${r.homeName} ${r.homeGoals} - ${r.awayGoals} ${r.awayName}` : 'No game played yet');
    this.text('outcome', `${b.headline}${b.next ? `\nNext: ${b.next.stage} vs ${b.next.opponent}` : ''}\nTournament points never count in the league.`);
    this.text('continue', 'CONTINUE', CREAM);
    if (this.review) this.text('review-note', 'Owner review: sample results played through the real tournament rules. Not your save.', CREAM);
  }

  private panelHit(p: Panel, fn: () => void): void {
    const o = this.panels.get(p);
    const t = this.texts.get(p);
    for (const g of [o, t]) g?.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, fn);
  }

  /** Cover the screen with the arrival painting, then place the panels: stacked upright, groups side by side sideways. */
  private layout(): void {
    const { width: w, height: h } = this.scale;
    if (this.bg) this.bg.setScale(Math.max(w / this.bg.width, h / this.bg.height)).setPosition(w / 2, h / 2);
    this.shade.setSize(w, h);
    const land = w > h;
    const pad = Math.max(6, Math.round(Math.min(w, h) * 0.02));
    const reviewH = this.review ? Math.round(Math.max(28, Math.min(36, h * 0.06))) : 0;
    const R: Record<string, Rect> = {};
    const titleH = Math.round(h * (land ? 0.14 : 0.09));
    R.title = { x: w * (land ? 0.25 : 0.2), y: pad, width: w * (land ? 0.5 : 0.6), height: titleH };
    R.logo = { x: pad, y: pad, width: titleH * 1.1, height: titleH };
    const contH = Math.round(Math.max(36, h * (land ? 0.11 : 0.06)));
    const bottom = h - pad - reviewH - (this.review ? pad : 0);
    R.continue = { x: w / 2 - Math.min(180, w * 0.4) / 2, y: bottom - contH, width: Math.min(180, w * 0.4), height: contH };
    const top = pad * 2 + titleH;
    const avail = R.continue.y - pad - top;
    if (land) {
      const gh = avail * 0.62;
      const cw = (w - pad * 3) / 2;
      R['group-a'] = { x: pad, y: top, width: cw, height: gh };
      R['group-b'] = { x: pad * 2 + cw, y: top, width: cw, height: gh };
      R['match-result'] = { x: pad, y: top + gh + pad, width: cw, height: avail - gh - pad };
      R.outcome = { x: pad * 2 + cw, y: top + gh + pad, width: cw, height: avail - gh - pad };
    } else {
      const gh = (avail - pad * 2) * 0.33;
      const fw = w - pad * 2;
      R['group-a'] = { x: pad, y: top, width: fw, height: gh };
      R['group-b'] = { x: pad, y: top + gh + pad, width: fw, height: gh };
      const lh = avail - gh * 2 - pad * 2;
      const hw = (fw - pad) / 2;
      R['match-result'] = { x: pad, y: top + (gh + pad) * 2, width: hw, height: lh };
      R.outcome = { x: pad * 2 + hw, y: top + (gh + pad) * 2, width: hw, height: lh };
    }
    for (const p of PANELS) {
      const o = this.panels.get(p);
      const r = R[p]!;
      if (o instanceof Phaser.GameObjects.NineSlice) o.setPosition(r.x, r.y).setSize(r.width, r.height);
    }
    const inner = (r: Rect, top = 0.06, side = 0.06): Rect => ({ x: r.x + r.width * side, y: r.y + r.height * top, width: r.width * (1 - side * 2), height: r.height * (1 - top - 0.06) });
    const head = (r: Rect): Rect => ({ x: r.x, y: r.y + r.height * 0.02, width: r.width, height: r.height * 0.16 });
    this.place('title', inner(R.title, 0.12, 0.08), 0.42);
    this.place('group-a-head', head(R['group-a']!), 0.7);
    this.place('group-a', inner(R['group-a']!, 0.22), 0.2);
    this.place('group-b-head', head(R['group-b']!), 0.7);
    this.place('group-b', inner(R['group-b']!, 0.22), 0.2);
    this.place('match-result', inner(R['match-result']!, 0.14, 0.08), 0.22);
    const out = R.outcome!;
    const prizeW = this.prize ? out.height * 0.55 : 0;
    this.place('outcome', inner({ ...out, width: out.width - prizeW }, 0.14, 0.08), 0.18);
    this.place('continue', R.continue, 0.45);
    this.contain(this.logo, R.logo);
    if (this.prize) this.contain(this.prize, (R.prize = { x: out.x + out.width - prizeW - pad, y: out.y + out.height * 0.15, width: prizeW, height: out.height * 0.7 }));
    if (this.review) {
      R['review-note'] = { x: pad, y: h - pad - reviewH, width: w * 0.3 - pad, height: reviewH };
      this.place('review-note', R['review-note'], 0.3);
      const bs = [...this.sampleButtons, ...(this.switchButton ? [this.switchButton] : [])];
      const bw = (w * 0.7 - pad * (bs.length + 1)) / bs.length;
      bs.forEach((b, i) => {
        b.resize(bw, reviewH, Math.max(9, Math.min(14, Math.round(bw / 7)))).setPosition(w * 0.3 + pad + i * (bw + pad) + bw / 2, h - pad - reviewH / 2);
        R[b.name] = b.getButtonBounds();
      });
    }
    this.rects = R;
  }

  private contain(img: Phaser.GameObjects.Image | null, r: Rect): void {
    img?.setScale(Math.min(r.width / img.width, r.height / img.height)).setPosition(r.x + r.width / 2, r.y + r.height / 2);
  }

  /** Text wrapped to its box and shrunk until it fits. */
  private place(name: string, r: Rect, size: number): void {
    const t = this.texts.get(name);
    if (!t) return;
    let px = Math.max(8, Math.floor(Math.min(r.height * size, 28)));
    t.setWordWrapWidth(Math.max(20, r.width - 4), true).setFontSize(px);
    while (px > 7 && (t.width > r.width || t.height > r.height)) t.setFontSize(--px);
    const left = t.style.align === 'left';
    t.setOrigin(left ? 0 : 0.5, 0.5).setPosition(left ? r.x : r.x + r.width / 2, r.y + r.height / 2);
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    // Viewing results never changes the save.
    if (this.next === 'story') this.scene.start(SceneKeys.Story, { resume: true });
    else this.scene.start(SceneKeys.Career, { open: 'reviewHub' });
  }

  private onShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
  }

  describeLayout(): SceneLayoutReport {
    const { width, height } = this.scale;
    const el: Record<string, Rect> = { ...this.rects };
    for (const [n, t] of this.texts) {
      const b = t.getBounds();
      el[`text-${n}`] = { x: b.x, y: b.y, width: b.width, height: b.height };
    }
    return { orientation: orientationOf({ width, height }), viewport: { width, height }, elements: el };
  }

  describeGameplay(): unknown {
    return { tournament: this.tid, review: this.review, sample: this.review ? this.sample : null, board: this.board, prize: this.prize ? (this.board.outcome === 'champion' ? 'trophy' : 'medal') : null, texts: Object.fromEntries([...this.texts].map(([n, t]) => [n, t.text])) };
  }
}
