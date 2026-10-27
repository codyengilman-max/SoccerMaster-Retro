import Phaser from 'phaser';
import type { Rect } from '../game';
import { CareerStore } from '../game/career/store';
import type { CareerSave } from '../game/career/state';
import { ATTRIBUTE_LABELS } from '../game/career/types';
import { MAPPING } from '../game/report/registry';
import { coachFeedback, type SavedReport } from '../game/report/report';
import { contributionLines } from '../game/report/contributionText';
import { ratioLabel } from '../game/report/stats';
import { artTextureKey, artUrl } from '../render/art/urls';
import { MATCH_REPORT as M, type NBox } from '../render/devreport';
import { orientationOf } from '../render/layout';
import { FONT_FAMILY, textResolution } from '../render/theme';
import type { InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { StoryStore } from '../game/story/store';
import { parseRankings } from '../game/rankings/ratings';
import { parseKickoff, teamImpact } from '../game/rankings/views';
import { kickoffKey, rankingsKey, storyResults } from './rankingsData';
import { ArtCard, wrapFloor } from './ui/artCard';

const images = import.meta.glob('../assets/art/devreport/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const devreportUrl = (name: string): string | undefined => Object.entries(images).find(([p]) => p.endsWith(`/${name}.webp`))?.[1];

export type ReportNext = 'story' | 'start' | 'history';
export interface MatchReportData {
  readonly matchId?: string;
  /** After a match: back to the story or Start. From Match History: back to the list. */
  readonly next?: ReportNext;
}

const NAVY = '#f4ead2';
const INK = '#1b2a3a';

/** Development status line: before the week's review the gains are only earned, not applied. */
export function developmentStatus(r: SavedReport, save: Pick<CareerSave, 'week' | 'history'>): string {
  if (r.week >= save.week) return 'Development earned - pending weekly review';
  const review = save.history.find((h) => h.week === r.week);
  if (!review) return `Week ${r.week} reviewed`;
  const gains = review.outcomes.filter((o) => o.to > o.from).map((o) => `${ATTRIBUTE_LABELS[o.attribute]} +${o.to - o.from}`);
  return `Applied at Week ${r.week} review: ${gains.length ? gains.join(', ') : 'no attribute changes'}`;
}

/** Attributes this match fed, from the registry and the counted actions only. */
export function contributions(r: SavedReport): string {
  const s = r.stats;
  const used: string[] = [];
  const add = (event: string, n: number) => {
    if (n <= 0) return;
    for (const a of MAPPING.find((m) => m.event === event)?.attributes ?? []) if (!used.includes(ATTRIBUTE_LABELS[a])) used.push(ATTRIBUTE_LABELS[a]);
  };
  add('pass', s.passes.den);
  add('pass choice', s.passes.den);
  add('received', s.involvements);
  add('shot', s.shotsOnTarget.den);
  add('tackle / intercepted', s.recoveries);
  add('slide', s.slides.den);
  return used.length ? `Evidence for: ${used.join(', ')}` : 'No development evidence this match';
}

export class MatchReportScene extends Phaser.Scene implements InspectableScene {
  private card!: ArtCard;
  private next: ReportNext = 'start';
  private matchId = '';
  private storyStore: StoryStore | null = null;
  private impact: string[] | null = null;
  private report: SavedReport | null = null;
  private status = 'loading';
  private overall = 0;
  private track!: Phaser.GameObjects.Graphics;
  private portrait: Phaser.GameObjects.Image | null = null;
  private coach: Phaser.GameObjects.Image | null = null;
  private full: { bg: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; mask: Phaser.Display.Masks.GeometryMask; maskG: Phaser.GameObjects.Graphics; offset: number } | null = null;
  private store: CareerStore | null = null;
  private leaving = false;

  constructor() {
    super(SceneKeys.Report);
  }

  init(data: MatchReportData): void {
    this.impact = null;
    this.storyStore = null;
    this.next = data?.next === 'story' || data?.next === 'history' ? data.next : 'start';
    this.matchId = typeof data?.matchId === 'string' ? data.matchId : '';
    this.report = null;
    this.status = 'loading';
    this.portrait = this.coach = null;
    this.full = null;
    this.leaving = false;
  }

  create(): void {
    this.card = new ArtCard(this, 'devreport:match-report-sunset', devreportUrl('match-report-sunset'));
    this.track = this.add.graphics().setDepth(1);
    this.card.label(M.banner, 'MATCH REPORT', 0.55, INK);
    this.card.label(M.cont, 'CONTINUE', 0.45, INK);
    this.card.hit('report-continue', M.cont, () => this.leave());
    this.card.afterLayout(() => this.drawDynamic());
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.card.layout();
    void CareerStore.open().then(async (store) => {
      if (!this.sys.isActive()) return store.close();
      this.store = store;
      const save = await store.load();
      if (!this.sys.isActive()) return;
      const r = save.reports.find((x) => x.matchId === this.matchId) ?? null;
      this.report = r;
      this.status = r ? 'ready' : 'missing';
      if (r) this.fill(r, save);
      if (r) void this.loadImpact(r);
      else this.card.label(M.info, 'Report not found for this match.', 0.25, INK);
    });
  }

  private fill(r: SavedReport, save: CareerSave): void {
    const c = this.card;
    const s = r.stats;
    c.label(M.homeTeam, r.home, 0.32, INK);
    c.label(M.score, `${r.score.home} - ${r.score.away}`, 0.5, NAVY);
    c.label(M.awayTeam, r.away, 0.32, INK);
    c.label(M.competition, `${r.competition} - Week ${r.week}`, 0.5, NAVY);
    const rating = r.rating.overall === null ? '-' : `${r.rating.overall}`;
    c.label(M.info, `${r.playerName}\n${r.position} - ${r.minutes} min\nRating ${rating}/100`, 0.22, INK, 'left');
    c.label(M.formBar, `Form: not tracked - Evidence: ${r.rating.confidence === 'none' ? 'not enough' : r.rating.confidence}`, 0.42, INK);
    const box = (b: NBox, title: string, value: string) => c.label(b, `${title}\n${value}`, 0.26, INK);
    box(M.stats[0]!, 'Controlled involvements (i)', `${s.involvements}`);
    box(M.stats[1]!, 'Passing', ratioLabel(s.passes));
    box(M.stats[2]!, 'Shots on target', ratioLabel(s.shotsOnTarget));
    box(M.stats[3]!, 'Recoveries', `${s.recoveries}`);
    c.hit('report-involvements-info', M.stats[0]!, () => this.openFull('Controlled involvements: receptions, interceptions and tackles where you took control of the ball. Dribble touches are not counted one by one yet, so this is not a true touch count.'));
    c.label(M.perfHeader, 'PERFORMANCE   Full stats >', 0.6, NAVY, 'left');
    c.hit('report-full-stats', M.perfHeader, () => this.openFull(this.fullStats(r)));
    const cat = (i: number) => r.rating.categories[i]!;
    const score = (i: number) => (cat(i).score === null ? '-' : `${cat(i).score}`);
    c.label(M.perfRows[0]!, `Decision quality ${score(0)}   Execution ${score(1)}`, 0.42, INK, 'left');
    c.label(M.perfRows[1]!, `Positioning ${score(2)}   Defending ${score(3)}`, 0.42, INK, 'left');
    this.overall = r.rating.overall ?? 0;
    c.label(M.hlHeader, 'HIGHLIGHTS & DEVELOPMENT', 0.6, NAVY, 'left');
    const hl = r.highlights.slice(0, 2).map((h) => h.text);
    c.label(M.hlRows[0]!, hl[0] ?? 'No highlights recorded', 0.42, INK, 'left');
    c.label(M.hlRows[1]!, hl[1] ?? contributions(r), 0.42, INK, 'left');
    c.label(M.hlRows[2]!, developmentStatus(r, save), 0.4, INK, 'left');
    const fb = coachFeedback(r);
    c.label(M.speech, `Coach Code: ${fb.strength} ${fb.improve}`, 0.2, INK, 'left');
    this.loadPortraits(save.player?.gender ?? (r as { gender?: string }).gender);
    this.drawDynamic();
  }

  private fullStats(r: SavedReport): string {
    const s = r.stats;
    return [
      `Passes (ground): ${ratioLabel(s.groundPasses)}`,
      `Chipped passes: ${ratioLabel(s.chips)} (no chip in 9v9 matches)`,
      `All passes = ground + chips: ${ratioLabel(s.passes)}`,
      `Shots on target: ${ratioLabel(s.shotsOnTarget)}`,
      `Goal conversion: ${ratioLabel(s.goalConversion)}`,
      `Goals: ${s.goals}`,
      `Possessions: ${s.possessions}   Possession losses: ${s.possessionLosses}`,
      `Recoveries: ${s.recoveries} (interceptions ${s.interceptions})`,
      `Slide challenges won: ${ratioLabel(s.slides)}`,
      `Fouls committed: ${s.fouls}`,
      ...contributionLines(r),
      `Not tracked: ${s.unavailable.join(', ')}`,
      ...r.rating.categories.map((c) => `${c.label}: ${c.score ?? '-'} - ${c.why}`),
      `Rules: ledger v${r.versions.ledger}, registry v${r.versions.registry}, rating v${r.versions.rating}`,
      '',
      'Tap outside this panel to close. Drag to scroll.',
    ].join('\n');
  }

  /** Scrollable detail panel over the card; drags scroll it, a tap outside closes it. */
  private openFull(text: string): void {
    this.closeFull();
    const bg = this.add.graphics().setDepth(10);
    const t = this.add.text(0, 0, text, { fontFamily: FONT_FAMILY, color: INK, resolution: textResolution(), lineSpacing: 4 }).setDepth(11);
    const maskG = this.make.graphics({}, false);
    const mask = maskG.createGeometryMask();
    t.setMask(mask);
    this.full = { bg, text: t, mask, maskG, offset: 0 };
    const closer = this.card.hit('report-full-close', { x0: 0, y0: 0, x1: 1, y1: 1 }, () => this.closeFull());
    const inPanel = this.card.hit('report-full-panel', { x0: 0.06, y0: 0.26, x1: 0.94, y1: 0.83 }, () => undefined);
    (this.full as unknown as { hits: unknown[] }).hits = [closer, inPanel];
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onDrag, this);
    this.drawDynamic();
  }

  private onDrag(p: Phaser.Input.Pointer): void {
    if (!this.full || !p.isDown) return;
    this.full.offset += p.y - p.prevPosition.y;
    this.drawDynamic();
  }

  private closeFull(): void {
    if (!this.full) return;
    const hits = (this.full as unknown as { hits?: unknown[] }).hits ?? [];
    for (const h of hits) this.card.hits.splice(this.card.hits.indexOf(h as (typeof this.card.hits)[number]), 1);
    this.full.bg.destroy();
    this.full.text.destroy();
    this.full.maskG.destroy();
    this.full = null;
    this.input.off(Phaser.Input.Events.POINTER_MOVE, this.onDrag, this);
  }

  private loadPortraits(gender: string | undefined): void {
    const want: [string, 'portrait' | 'coach'][] = [[gender === 'boy' ? 'boy-match' : gender === 'girl' ? 'girl-match' : '', 'portrait'], ['coach-club', 'coach']];
    for (const [id, slot] of want) {
      const url = id ? artUrl(id) : null;
      if (!url) continue;
      const key = artTextureKey(id);
      const place = () => {
        if (!this.sys.isActive() || !this.textures.exists(key)) return;
        const img = this.add.image(0, 0, key).setDepth(1);
        if (slot === 'portrait') this.portrait = img;
        else this.coach = img;
        this.drawDynamic();
      };
      if (this.textures.exists(key)) place();
      else {
        this.load.image(key, url);
        this.load.once(`filecomplete-image-${key}`, place);
        this.load.start();
      }
    }
  }

  /** Contain an image inside a painted box without stretching; cropped to the box. */
  private fitImage(img: Phaser.GameObjects.Image | null, box: NBox): void {
    if (!img) return;
    const r = this.card.rect(box);
    const k = Math.max(r.width / img.width, r.height / img.height);
    img.setScale(k).setPosition(r.x + r.width / 2, r.y + r.height / 2);
    img.setCrop((img.width - r.width / k) / 2, 0, r.width / k, r.height / k);
    img.setOrigin(0.5, 0.5 + (img.height - r.height / k) / (2 * img.height));
  }

  private drawDynamic(): void {
    this.fitImage(this.portrait, M.portrait);
    this.fitImage(this.coach, M.coach);
    const tr = this.card.rect(M.perfTrack);
    this.track.clear();
    if (this.report?.rating.overall !== null && this.report) {
      this.track.fillStyle(0xe8a33a, 1).fillRoundedRect(tr.x, tr.y, (tr.width * this.overall) / 100, tr.height, Math.min(6, tr.height / 2));
    }
    const f = this.full;
    if (f) {
      const r = this.card.rect({ x0: 0.06, y0: 0.26, x1: 0.94, y1: 0.83 });
      f.bg.clear().fillStyle(0xfbf3df, 0.98).fillRoundedRect(r.x, r.y, r.width, r.height, 10).lineStyle(3, 0x14394f, 1).strokeRoundedRect(r.x, r.y, r.width, r.height, 10);
      f.text.setFontSize(Math.max(11, Math.round(r.width / 26)));
      f.text.setWordWrapWidth(Math.max(wrapFloor(f.text), r.width - 24), true);
      const min = Math.min(0, r.height - 24 - f.text.height);
      f.offset = Math.max(min, Math.min(0, f.offset));
      f.text.setPosition(r.x + 12, r.y + 12 + f.offset);
      f.maskG.clear().fillStyle(0xffffff).fillRect(r.x, r.y + 6, r.width, r.height - 12);
    }
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    // Opening or leaving a report never changes the save: no rewards, no schedule step.
    if (this.next === 'story') this.scene.start(SceneKeys.Story, { resume: true });
    else if (this.next === 'history') this.scene.start(SceneKeys.MyPlayer, { view: 'history' });
    else this.scene.start(SceneKeys.Start);
  }

  private onResize(): void {
    this.card.layout();
  }

  /** TEAM IMPACT, only for story league/cup matches that saved kickoff ranks. */
  private async loadImpact(r: SavedReport): Promise<void> {
    const story = await StoryStore.open().catch(() => null);
    if (!story) return;
    if (!this.sys.isActive()) return story.close();
    this.storyStore = story;
    const k = parseKickoff(await story.getRecord(kickoffKey(this.matchId)));
    if (!k || !this.sys.isActive()) return;
    const rk = parseRankings(await story.getRecord(rankingsKey(k.careerId)), k.careerId);
    const results = await storyResults(story, k.careerId);
    if (!rk.ok || !this.sys.isActive()) return;
    const ft = (await story.getRecord(`matchresult:${this.matchId}`)) as { home?: unknown; away?: unknown } | undefined;
    if (!this.sys.isActive()) return;
    const fullTime = ft && Number.isInteger(ft.home) && Number.isInteger(ft.away) ? { us: ft.home as number, them: ft.away as number } : null;
    this.impact = teamImpact(k, rk.value, results, fullTime);
    this.card.label(M.competition, `${r.competition} - Week ${r.week} · TEAM IMPACT >`, 0.5, NAVY);
    this.card.hit('report-team-impact', M.competition, () => this.openFull(`TEAM IMPACT\n${this.impact!.join('\n')}`));
  }

  private onShutdown(): void {
    this.storyStore?.close();
    this.storyStore = null;
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.input.off(Phaser.Input.Events.POINTER_MOVE, this.onDrag, this);
    this.store?.close();
    this.store = null;
  }

  describeLayout(): SceneLayoutReport {
    const { width, height } = this.scale;
    const el: Record<string, Rect> = { painting: this.card.artRect(), status: { x: 0, y: 0, width: this.status === 'ready' ? 1 : 0, height: 0 } };
    for (const h of this.card.hits) el[h.name] = this.card.rect(h.box);
    return { orientation: orientationOf({ width, height }), viewport: { width, height }, elements: el };
  }

  describeGameplay(): unknown {
    return { taps: this.card?.trace ?? [], status: this.status, matchId: this.matchId, next: this.next, report: this.report, fullOpen: this.full !== null };
  }
}
