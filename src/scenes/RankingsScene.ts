import Phaser from 'phaser';
import type { Rect } from '../game';
import { latest, movement, nationalTable, newRankings, performance, publishedWeek, rankIn, settleThrough, type RankRow, type RankingsState, type StoryResults } from '../game/rankings/ratings';
import { CATEGORY_LABEL, HOME_TEAM, TEAMS, teamById, teamName } from '../game/rankings/teams';
import { aroundStart, leagueStandings, nextOpponent, rankHistory, scopeTable, searchRows, stateCount, stateLabel, teamResults, upcoming } from '../game/rankings/views';
import { StoryStore } from '../game/story/store';
import { fixtureForGame, newSeasonLeague, recordSeasonPlayed, simulateSeasonThrough } from '../game/season/league';
import { orientationOf } from '../render/layout';
import { CSS, FONT_FAMILY, PALETTE } from '../render/theme';
import type { InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { settleRankings } from './rankingsData';
import { Button } from './ui/Button';

export interface RankingsData {
  readonly careerId?: string;
  /** Current story week; weeks before it are published. */
  readonly week?: number;
  readonly view?: View;
  readonly returnTo?: 'story' | 'start' | 'myPlayer';
  /** Review only: a made-up season held in memory; nothing is read from or written to the save. */
  readonly sample?: boolean;
}
type View = 'rankings' | 'profile' | 'standings' | 'compare';

const fmt = (n: number | null, d = 2): string => (n === null ? '—' : n.toFixed(d));
const move = (m: number | null): string => (m === null ? 'new' : m > 0 ? `up ${m}` : m < 0 ? `down ${-m}` : 'no change');

/** League, national/state rankings and team profiles. Everything shown is derived from saved results. */
export class RankingsScene extends Phaser.Scene implements InspectableScene {
  private careerId = '';
  private week = 1;
  private returnTo: 'story' | 'start' | 'myPlayer' = 'story';
  private view: View = 'rankings';
  private scope: 'national' | string = 'national';
  private stateFilter = 'AZ';
  private query = '';
  private start = 0;
  private team = HOME_TEAM;
  private compareWith: string | null = null;
  private rankings: RankingsState | null = null;
  private story: StoryResults | null = null;
  private status = 'loading';
  private layer!: Phaser.GameObjects.Container;
  private bg!: Phaser.GameObjects.Graphics;
  private elements: Record<string, Rect> = {};
  private visible: { team: string; rank: number }[] = [];
  private searchEl: HTMLInputElement | null = null;
  private store: StoryStore | null = null;
  private leaving = false;
  private sample = false;
  private centre = false;

  constructor() {
    super(SceneKeys.Rankings);
  }

  init(data: RankingsData): void {
    this.careerId = data?.careerId ?? '';
    this.week = Math.max(1, Math.floor(data?.week ?? 1));
    this.returnTo = data?.returnTo === 'start' || data?.returnTo === 'myPlayer' ? data.returnTo : 'story';
    this.view = data?.view ?? 'rankings';
    this.scope = 'national';
    this.query = '';
    this.start = 0;
    this.team = HOME_TEAM;
    this.compareWith = null;
    this.rankings = null;
    this.story = null;
    this.status = 'loading';
    this.leaving = false;
    this.sample = !!data?.sample;
    this.stateFilter = teamById(HOME_TEAM)!.state;
  }

  create(): void {
    this.bg = this.add.graphics();
    this.layer = this.add.container(0, 0);
    const onResize = () => this.render();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      this.closeSearch();
      this.store?.close();
      this.store = null;
    });
    this.render();
    void this.loadData();
  }

  private async loadData(): Promise<void> {
    if (this.sample) {
      const id = 'sample-career';
      let lg = newSeasonLeague(id, 7);
      const scores: [number, number][] = [[2, 1], [1, 1], [0, 2], [3, 0], [2, 2]];
      for (let g = 1; g <= scores.length; g++) {
        const r = recordSeasonPlayed(lg, fixtureForGame(g)!.id, scores[g - 1]![0], scores[g - 1]![1]);
        if (r.ok) lg = r.state;
      }
      lg = simulateSeasonThrough(lg, fixtureForGame(scores.length)!.round);
      this.story = { league: lg, cups: {}, stateCup: null };
      this.rankings = settleThrough(newRankings(id, 7), this.story, this.week - 1).state;
      this.status = 'ready';
      this.jumpToTeam();
      return this.render();
    }
    try {
      const store = await StoryStore.open();
      if (!this.sys.isActive()) return store.close();
      this.store = store;
      if (!this.careerId) {
        this.status = 'no-career';
        return this.render();
      }
      const r = await settleRankings(store, this.careerId, this.week - 1, this.week);
      this.rankings = r.state;
      this.story = r.story;
      this.status = 'ready';
      this.jumpToTeam();
    } catch {
      this.status = 'error';
    }
    this.render();
  }

  private rows(): readonly RankRow[] {
    if (!this.rankings) return [];
    return searchRows(scopeTable(this.rankings, this.scope), this.query);
  }
  private rowH(): number {
    return Math.max(40, Math.round(Math.min(this.scale.width, this.scale.height) * 0.07));
  }
  /** Centre the list on your team at the next draw, once the rows that fit are known. */
  private jumpToTeam(): void {
    this.centre = true;
  }

  private back(): void {
    if (this.leaving) return;
    if (this.view === 'profile' || this.view === 'compare') {
      this.view = this.compareWith && this.view === 'compare' ? 'profile' : 'rankings';
      this.compareWith = null;
      return this.render();
    }
    this.leaving = true;
    if (this.sample) return void this.scene.start(SceneKeys.Career, { open: 'reviewHub' });
    this.scene.start(this.returnTo === 'story' ? SceneKeys.Story : this.returnTo === 'myPlayer' ? SceneKeys.MyPlayer : SceneKeys.Start, this.returnTo === 'myPlayer' ? { resume: true } : undefined);
  }

  private openSearch(): void {
    if (this.searchEl) return;
    const canvas = this.game.canvas;
    const r = canvas.getBoundingClientRect();
    const el = document.createElement('input');
    el.type = 'search';
    el.placeholder = 'Search team, city or state';
    el.value = this.query;
    el.setAttribute('aria-label', 'Search teams');
    el.dataset.testid = 'rank-search';
    Object.assign(el.style, { position: 'fixed', left: `${r.left + 16}px`, top: `${r.top + 8}px`, width: `${Math.max(160, r.width - 32)}px`, height: '40px', fontSize: '16px', zIndex: '10', border: '3px solid #3b2314', borderRadius: '10px', padding: '0 10px', background: '#fff4dc', color: '#3b2314' });
    el.oninput = () => {
      this.query = el.value;
      this.start = 0;
      this.render();
    };
    el.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') this.closeSearch();
    };
    document.body.appendChild(el);
    el.focus();
    this.searchEl = el;
    this.render();
  }
  private closeSearch(): void {
    this.searchEl?.remove();
    this.searchEl = null;
    if (this.layer?.active) this.render();
  }

  // ---- drawing ----

  private base(): number {
    const w = this.scale.width;
    const h = this.scale.height;
    return Math.max(13, Math.min(orientationOf({ width: w, height: h }) === 'portrait' ? w * 0.038 : h * 0.04, 18));
  }
  /** Shorten a one-line label with an ellipsis until it fits, keeping its suffix (YOU / NEXT). */
  private fit(t: Phaser.GameObjects.Text, max: number, suffix: string, name: string): void {
    const full = t.text.slice(0, t.text.length - suffix.length);
    for (let n = full.length; t.displayWidth > max && n > 1; n--) t.setText(`${full.slice(0, n - 1).trimEnd()}…${suffix}`);
    this.elements[name] = { x: t.x, y: t.y, width: t.displayWidth, height: t.displayHeight };
  }

  private text(name: string, x: number, y: number, s: string, size: number, opts: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, s, { fontFamily: FONT_FAMILY, fontSize: `${Math.round(size)}px`, color: CSS.ink, ...opts });
    this.layer.add(t);
    this.elements[name] = { x: t.x, y: t.y, width: t.displayWidth, height: t.displayHeight };
    return t;
  }
  private button(name: string, x: number, y: number, w: number, h: number, label: string, onClick: () => void, on = false): void {
    const b = new Button(this, x + w / 2, y + h / 2, { name, label, width: w, height: h, fontSize: Math.round(this.base() * 0.95), onClick, ...(on ? { fill: PALETTE.mustard, fillPressed: PALETTE.mustardDark } : {}) });
    this.add.existing(b);
    this.layer.add(b);
    this.elements[name] = { x, y, width: w, height: h };
  }

  private render(): void {
    if (!this.layer?.active) return;
    this.layer.removeAll(true);
    this.elements = {};
    this.visible = [];
    const w = this.scale.width;
    const h = this.scale.height;
    const g = this.bg;
    g.clear();
    g.fillStyle(PALETTE.sand, 1).fillRect(0, 0, w, h);
    g.fillStyle(PALETTE.cream, 1).fillRoundedRect(6, 6, w - 12, h - 12, 14);
    g.lineStyle(4, PALETTE.ink, 1).strokeRoundedRect(6, 6, w - 12, h - 12, 14);
    const b = this.base();
    const top = this.searchEl ? 56 : 14;
    const navH = Math.max(44, Math.round(b * 2.6));
    this.button('rank-back', 14, top, Math.min(110, w * 0.26), navH, this.view === 'rankings' || this.view === 'standings' ? 'Back' : 'Rankings', () => this.back());
    const titles: Record<View, string> = { rankings: 'Rankings', profile: 'Team Profile', standings: 'League Table', compare: 'Compare Teams' };
    this.text('rank-title', 14 + Math.min(110, w * 0.26) + 12, top + 4, titles[this.view], b * 1.35, { fontStyle: 'bold' });
    if (this.status !== 'ready' || !this.rankings || !this.story) {
      const msg = this.status === 'loading' ? 'Loading saved results...' : this.status === 'no-career' ? 'Start the story first: rankings follow your career.' : 'Could not read the save. Nothing was changed.';
      this.text('rank-status', 20, top + navH + 20, msg, b, { wordWrap: { width: w - 40 } });
      return;
    }
    const s = this.rankings;
    const snap = latest(s);
    const label = `${this.sample ? 'SAMPLE SEASON (review only) · ' : ''}Simulated career-world rankings · ${CATEGORY_LABEL} · ${snap.week === 0 ? 'Preseason (no results counted yet)' : `after week ${snap.week}`}${snap.provisional ? ' · Provisional: not every team is linked by results yet' : ''}`;
    this.text('rank-label', 16, top + navH + 6, label, b * 0.8, { wordWrap: { width: w - 32 } });
    const y0 = top + navH + 6 + Math.ceil(this.elements['rank-label']!.height) + 8;
    if (this.view === 'rankings') this.drawRankings(y0);
    else if (this.view === 'standings') this.drawStandings(y0);
    else if (this.view === 'profile') this.drawProfile(y0, this.team);
    else this.drawCompare(y0);
  }

  private drawTabs(y: number, w = this.scale.width): number {
    const h = Math.max(44, Math.round(this.base() * 2.5));
    const tabs: [string, string, () => void, boolean][] = [
      ['tab-national', 'National', () => ((this.scope = 'national'), this.jumpToTeam(), this.render()), this.view === 'rankings' && this.scope === 'national'],
      ['tab-state', stateLabel(this.stateFilter), () => ((this.scope = this.stateFilter), this.jumpToTeam(), this.render()), this.view === 'rankings' && this.scope !== 'national'],
      ['tab-league', 'League', () => ((this.view = 'standings'), this.render()), this.view === 'standings'],
    ];
    const tw = (w - 28 - 8 * (tabs.length - 1)) / tabs.length;
    // w is the right edge of the tab strip (sideways the shortcuts share the row).
    tabs.forEach(([n, l, f, on], i) => this.button(n, 14 + i * (tw + 8), y, tw, h, l, f, on));
    return y + h + 8;
  }

  private drawRankings(y0: number): void {
    const s = this.rankings!;
    const w = this.scale.width;
    const b = this.base();
    const wide = orientationOf({ width: w, height: this.scale.height }) === 'landscape';
    const h = Math.max(44, Math.round(b * 2.5));
    let y = this.drawTabs(y0, wide ? w / 2 + 10 : w);
    const sx = wide ? w / 2 + 2 : 0;
    if (wide) y = y0;
    const sc: [string, string, () => void][] = [
      ['rank-my-team', 'My Team', () => ((this.query = ''), this.closeSearch(), this.openProfile(HOME_TEAM))],
      ['rank-around', 'Around Me', () => ((this.query = ''), this.jumpToTeam(), this.render())],
      ['rank-top25', 'Top 25', () => ((this.query = ''), (this.start = 0), this.render())],
      ['rank-search-btn', this.searchEl ? 'Done' : 'Search', () => (this.searchEl ? this.closeSearch() : this.openSearch())],
    ];
    const sw = (w - sx - 28 - 8 * 3) / 4;
    sc.forEach(([n, l, f], i) => this.button(n, sx + 14 + i * (sw + 8), y, sw, h, l, f));
    y += h + 6;
    const rows = this.rows();
    const rowH = this.rowH();
    const per = Math.max(1, Math.floor((this.scale.height - y - h - 18) / rowH));
    if (this.centre) this.start = aroundStart(rows, HOME_TEAM, per);
    this.centre = false;
    const total = this.scope === 'national' ? TEAMS.length : stateCount(this.scope);
    const next = nextOpponent(this.story!.league, this.week);
    if (this.query && !rows.length) this.text('rank-empty', 20, y + 8, `No team matches "${this.query}".`, b);
    this.start = Math.max(0, Math.min(this.start, Math.max(0, rows.length - per)));
    rows.slice(this.start, this.start + per).forEach((r, i) => {
      const t = teamById(r.team)!;
      const yy = y + i * rowH;
      const mine = r.team === HOME_TEAM;
      const g = this.add.graphics();
      g.fillStyle(mine ? PALETTE.mustard : i % 2 ? PALETTE.cream : PALETTE.sand, 1).fillRoundedRect(14, yy + 2, w - 28, rowH - 4, 8);
      if (mine) g.lineStyle(3, PALETTE.ink, 1).strokeRoundedRect(14, yy + 2, w - 28, rowH - 4, 8);
      g.fillStyle(Phaser.Display.Color.HexStringToColor(t.colors[0]).color, 1).fillCircle(30 + 56, yy + rowH / 2, rowH * 0.28);
      g.lineStyle(2, Phaser.Display.Color.HexStringToColor(t.colors[1]).color, 1).strokeCircle(30 + 56, yy + rowH / 2, rowH * 0.28);
      this.layer.add(g);
      const m = movement(s, r.team, (sn) => (this.scope === 'national' ? nationalTable(sn) : scopeTable({ ...s, snapshots: [sn] }, this.scope, 0)));
      const tag = mine ? ' (YOU)' : r.team === next ? ' (NEXT)' : '';
      this.text(`rank-row-${i}`, 22, yy + rowH / 2 - b * 0.6, `#${r.rank}`, b, { fontStyle: 'bold' });
      this.fit(this.text(`rank-name-${i}`, 30 + 56 + rowH * 0.4, yy + 4, `${t.name}${tag}`, b * 0.92, { fontStyle: mine ? 'bold' : 'normal' }), w - 28 - (30 + 56 + rowH * 0.4), tag, `rank-name-${i}`);
      this.text(`rank-sub-${i}`, 30 + 56 + rowH * 0.4, yy + rowH / 2 + 1, `${t.city}, ${t.state} · ${Math.round(latest(s).ratings[r.team]!)} · ${move(m)}`, b * 0.78);
      const hit = this.add.zone(14, yy + 2, w - 28, rowH - 4).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.openProfile(r.team));
      this.layer.add(hit);
      this.elements[`rank-hit-${r.team}`] = { x: 14, y: yy + 2, width: w - 28, height: rowH - 4 };
      this.visible.push({ team: r.team, rank: r.rank });
    });
    const by = y + per * rowH + 4;
    const pw = (w - 28 - 16) / 3;
    this.button('rank-prev', 14, by, pw, h, 'Up', () => ((this.start = Math.max(0, this.start - per)), this.render()));
    this.text('rank-count', 14 + pw + 8, by + h / 2 - b * 0.55, rows.length ? `${this.start + 1}–${Math.min(rows.length, this.start + per)} of ${rows.length}${this.query ? ` (of ${total})` : ''}` : '', b * 0.8, { fixedWidth: pw, align: 'center' });
    this.button('rank-next', 14 + 2 * (pw + 8), by, pw, h, 'Down', () => ((this.start = this.start + per), this.render()));
  }

  private openProfile(team: string): void {
    this.team = team;
    this.view = 'profile';
    this.render();
  }

  private drawStandings(y0: number): void {
    const b = this.base();
    const w = this.scale.width;
    let y = this.drawTabs(y0);
    const t = leagueStandings(this.story!.league);
    if (!t.started) this.text('league-empty', 20, y, 'Season not started: no league results yet.', b);
    else this.text('league-note', 20, y, 'Points 3 / 1 / 0. Order: points, goal difference, goals scored. Level teams share a position. Tournament games never give league points.', b * 0.78, { wordWrap: { width: w - 40 } });
    y += Math.ceil(this.elements[t.started ? 'league-note' : 'league-empty']!.height) + 8;
    const fs = b * 0.82;
    const col = Math.max(24, Math.round(fs * 1.9));
    const heads = ['P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'];
    const nameX = 20 + col * 1.1;
    const nameW = w - 20 - nameX - col * heads.length - 4;
    const colX = (j: number) => w - 20 - col * (heads.length - j);
    this.text('league-head-pos', 20, y, 'Pos', fs, { fontStyle: 'bold' });
    this.text('league-head-team', nameX, y, 'Team', fs, { fontStyle: 'bold' });
    heads.forEach((hd, j) => this.text(`league-head-${hd}`, colX(j), y, hd, fs, { fontStyle: 'bold', fixedWidth: col, align: 'right' }));
    y += fs * 1.6;
    const step = Math.max(fs * 1.5, Math.min(Math.max(b * 1.9, 30), (this.scale.height - y - 10) / Math.max(1, t.rows.length)));
    t.rows.forEach((r, i) => {
      const mine = r.club === HOME_TEAM;
      if (mine) {
        const g = this.add.graphics().fillStyle(PALETTE.mustard, 1).fillRoundedRect(14, y - 3, w - 28, step - 2, 6);
        this.layer.add(g);
      }
      const st = { fontStyle: mine ? 'bold' : 'normal' };
      this.text(`league-row-${i}`, 20, y, `${r.rank}.`, fs, st);
      this.fit(this.text(`league-name-${i}`, nameX, y, `${teamName(r.club)}${mine ? ' (YOU)' : ''}`, fs, st), nameW, mine ? ' (YOU)' : '', `league-name-${i}`);
      const vals = [r.played, r.won, r.drawn, r.lost, r.goalsFor, r.goalsAgainst, (r.goalDiff > 0 ? '+' : '') + r.goalDiff, r.points];
      vals.forEach((v, j) => this.text(`league-${heads[j]}-${i}`, colX(j), y, String(v), fs, { ...st, fixedWidth: col, align: 'right' }));
      const hit = this.add.zone(14, y - 3, w - 28, step - 2).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.openProfile(r.club));
      this.layer.add(hit);
      y += step;
    });
  }

  private profileLines(team: string): string[] {
    const s = this.rankings!;
    const t = teamById(team)!;
    const nat = rankIn(nationalTable(latest(s)), team);
    const st = rankIn(scopeTable(s, t.state), team);
    const p = performance(s, this.story!, team);
    const league = t.league === 'az_local' ? 'Arizona local league (your league)' : t.league ? 'Background league (simulated)' : 'Not in a league (tournaments by invitation)';
    return [
      `${t.city}, ${stateLabel(t.state)} · ${CATEGORY_LABEL} · ${league}`,
      `National: #${nat} of ${TEAMS.length} (${move(movement(s, team))})  ·  ${stateLabel(t.state)}: #${st} of ${stateCount(t.state)} teams`,
      `Rating ${Math.round(latest(s).ratings[team]!)} · ${p.matches} counted match${p.matches === 1 ? '' : 'es'}${p.limited && p.matches > 0 ? ' · Limited results' : ''}`,
      `Attack ${fmt(p.attack)} goals/match · Defense ${fmt(p.defense)} conceded/match (lower is better) · Schedule ${p.schedule === null ? '—' : Math.round(p.schedule)} avg opponent rating`,
    ];
  }

  private drawGraph(x: number, y: number, w: number, h: number, team: string): void {
    const s = this.rankings!;
    const hist = rankHistory(s, team, 'national');
    const g = this.add.graphics();
    this.layer.add(g);
    g.lineStyle(2, PALETTE.ink, 1).strokeRect(x, y, w, h);
    this.elements['profile-graph'] = { x, y, width: w, height: h };
    if (hist.length < 2) {
      this.text('profile-graph-note', x + 8, y + 8, hist.length ? `Only one published ranking so far (#${hist[0]!.rank}, ${hist[0]!.week === 0 ? 'Preseason' : `week ${hist[0]!.week}`}). The graph fills in week by week.` : 'No ranking history yet.', this.base() * 0.8, { wordWrap: { width: w - 16 } });
      return;
    }
    const n = TEAMS.length;
    const px = (i: number) => x + 10 + (i / (hist.length - 1)) * (w - 20);
    const py = (r: number) => y + 8 + ((r - 1) / (n - 1)) * (h - 16);
    g.lineStyle(3, PALETTE.tomato, 1).beginPath();
    hist.forEach((p, i) => (i ? g.lineTo(px(i), py(p.rank)) : g.moveTo(px(i), py(p.rank))));
    g.strokePath();
    hist.forEach((p, i) => g.fillStyle(PALETTE.ink, 1).fillRect(px(i) - 3, py(p.rank) - 3, 6, 6));
    this.text('profile-graph-top', x + 4, y + 2, '#1', this.base() * 0.7);
    this.text('profile-graph-bottom', x + 4, y + h - this.base() * 1.1, `#${n}`, this.base() * 0.7);
    this.text('profile-graph-span', x + w - 150, y + h - this.base() * 1.1, `Preseason → week ${publishedWeek(s)}`, this.base() * 0.7);
  }

  private drawProfile(y0: number, team: string): void {
    const t = teamById(team)!;
    const b = this.base();
    const w = this.scale.width;
    const h = this.scale.height;
    const portrait = orientationOf({ width: w, height: h }) === 'portrait';
    const s = this.rankings!;
    this.text('profile-name', 16, y0, `${t.name}${team === HOME_TEAM ? ' (YOU)' : ''}`, b * 1.2, { fontStyle: 'bold', wordWrap: { width: w - 32 } });
    let y = y0 + Math.ceil(this.elements['profile-name']!.height) + 4;
    this.text('profile-summary', 16, y, this.profileLines(team).join('\n'), b * 0.8, { wordWrap: { width: (portrait ? w : w / 2) - 32 }, lineSpacing: 3 });
    y += Math.ceil(this.elements['profile-summary']!.height) + 8;
    const gx = portrait ? 16 : w / 2 + 4;
    const gy = portrait ? y : y0;
    const gw = portrait ? w - 32 : w / 2 - 20;
    const gh = portrait ? Math.min(130, h * 0.16) : Math.min(140, h * 0.3);
    this.drawGraph(gx, gy, gw, gh, team);
    if (portrait) y += gh + 8;
    const res = teamResults(s, this.story!, team).slice(0, 4);
    const up = upcoming(s, this.story!, team, 2, this.week);
    const lines = [
      'RECENT RESULTS',
      ...(res.length ? res.map((r) => `Wk ${r.week} ${r.outcome} ${r.us}-${r.them} ${r.home ? 'v' : '@'} ${teamName(r.opponent)} · ${r.comp}${r.note ? ` (${r.note})` : ''}${r.counted ? '' : ' · not yet in rankings'}`) : ['No results yet.']),
      'UPCOMING',
      ...(up.length ? up.map((u) => `Wk ${u.week} ${u.home ? 'v' : '@'} ${teamName(u.opponent)} · ${u.comp}`) : ['No scheduled fixtures.']),
    ];
    const lx = portrait ? 16 : gx;
    const ly = portrait ? y : gy + gh + 8;
    this.text('profile-results', lx, ly, lines.join('\n'), b * 0.78, { wordWrap: { width: (portrait ? w : w / 2) - 32 }, lineSpacing: 2 });
    const bh = Math.max(44, Math.round(b * 2.5));
    if (team !== HOME_TEAM) this.button('profile-compare', 14, h - bh - 14, Math.min(220, w - 28), bh, `Compare with ${teamName(HOME_TEAM)}`, () => ((this.compareWith = team), (this.view = 'compare'), this.render()));
  }

  private drawCompare(y0: number): void {
    const a = HOME_TEAM;
    const bId = this.compareWith ?? HOME_TEAM;
    const w = this.scale.width;
    const b = this.base();
    const s = this.rankings!;
    const col = (id: string) => {
      const p = performance(s, this.story!, id);
      return [teamName(id), `National #${rankIn(nationalTable(latest(s)), id)}`, `Rating ${Math.round(latest(s).ratings[id]!)}`, `Attack ${fmt(p.attack)}`, `Defense ${fmt(p.defense)}`, `Schedule ${p.schedule === null ? '—' : Math.round(p.schedule)}`, `Matches ${p.matches}${p.limited && p.matches ? ' (limited)' : ''}`];
    };
    const meet = teamResults(s, this.story!, a).filter((r) => r.opponent === bId);
    this.text('compare-a', 16, y0, col(a).join('\n'), b * 0.85, { wordWrap: { width: w / 2 - 24 }, lineSpacing: 4 });
    this.text('compare-b', w / 2 + 4, y0, col(bId).join('\n'), b * 0.85, { wordWrap: { width: w / 2 - 24 }, lineSpacing: 4 });
    const y = y0 + Math.max(this.elements['compare-a']!.height, this.elements['compare-b']!.height) + 12;
    this.text('compare-h2h', 16, y, meet.length ? `Head to head: ${meet.map((r) => `Wk ${r.week} ${r.us}-${r.them} (${r.comp})`).join(', ')}` : 'Head to head: no meetings yet.', b * 0.8, { wordWrap: { width: w - 32 } });
  }

  describeLayout(): SceneLayoutReport {
    return { orientation: orientationOf({ width: this.scale.width, height: this.scale.height }), viewport: { width: this.scale.width, height: this.scale.height }, elements: this.elements };
  }
  describeGameplay(): unknown {
    return { status: this.status, sample: this.sample, view: this.view, scope: this.scope, query: this.query, team: this.team, visible: this.visible, published: this.rankings ? publishedWeek(this.rankings) : null, provisional: this.rankings ? latest(this.rankings).provisional : null };
  }
}
