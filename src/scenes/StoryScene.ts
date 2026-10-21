import Phaser from 'phaser';
import { fixtureForWeek, newLeague, parseLeague, recordPlayed, simulateThrough } from '../game/league/league';
import { homeLearningDetail, jungleResult, schoolRewardDetail, trainingLogDetail } from '../game/story/facts';
import type { CompetitorId } from '../game/jungle/sim';
import { crossbarRules, sceneById, trainingDetail } from '../game/story/content';
import { seasonWeek, type TournamentId } from '../game/season/calendar';
import { bataviaRecord, fixtureForSeasonWeek, newSeasonLeague, opponentOf, parseSeasonLeague, recordSeasonPlayed, seasonTable, simulateSeasonThrough } from '../game/season/league';
import { TOURNAMENTS, allFixtures, bataviaFinish, groupTable, nextBataviaFixture, newTournament, parseTournament, finalFixture, recordTournamentPlayed, bataviaResult, type TournamentState } from '../game/season/tournament';
import { CLUB_WORLD } from '../game/story/clubs';
import type { Rect } from '../game';
import { POSITION_SLOT } from '../game/career/player';
import type { CareerSave } from '../game/career/state';
import { CareerStore } from '../game/career/store';
import type { Position } from '../game/career/types';
import { type Background, type StoryNode } from '../game/story/content';
import { attemptKey, commitLaunch, commitResolve, contestResult, CROSSBAR, describeShot, launchAttempt, newContest, nextSlot, opponentKick, points, resolveAttempt, restoreContest, simulateShot, type Contest, type KickInput, type Participant, type ShotOutcome } from '../game/story/crossbar';
import { PRONOUNS, renderText, validateName, type Gender } from '../game/story/identity';
import { SEASON_RELEASED_WEEKS, awaitingRelease, createSession, currentNode, evaluatePredicate, outcomeOf, type StoryCommand, type StoryOutcome, type StorySession, type StoryState } from '../game/story/runtime';
import { StoryStore } from '../game/story/store';
import { pullFor, thresholdsFor, type Pull } from '../input';
import { crossbarView, goalGeometry, type CrossbarView } from '../render/crossbarView';
import { orientationOf } from '../render/layout';
import { CSS, FONT_FAMILY, PALETTE, textResolution } from '../render/theme';
import type { GameplayScene, InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';
import { StoryArt } from './storyArt';

/** The career save has one slot ('main'); the story is keyed to it. */
const CAREER_ID = 'main';
const POSITION_LABEL: Record<Position, string> = { DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward' };
const SPEAKER_COLOR: Record<string, number> = { System: PALETTE.ink, Jordan: PALETTE.blue, Blake: PALETTE.tomato, Caregiver: PALETTE.purple, Coach: PALETTE.mustardDark };
const CAREER_ADAPTERS = ['training_arrangement', 'weekly_focus', 'practice', 'match', 'team_training', 'league_match', 'tournament_match'] as const;
const MATCH_ADAPTERS: readonly string[] = ['match', 'league_match', 'tournament_match'];
type CareerAdapter = (typeof CAREER_ADAPTERS)[number];
interface Snapshot { readonly revision: number; readonly sessions: number; readonly batches: number; readonly week: number }
const OUTCOME_WORD: Readonly<Record<ShotOutcome, string>> = { bar: 'Crossbar!', post: 'Off the post.', under: 'Under the bar.', short: 'Too short.', over: 'Over the bar.', wide: 'Wide.' };
const HIT_DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug') && new URLSearchParams(location.search).has('hitbox');

type Mode = 'loading' | 'error' | 'story' | 'crossbar' | 'transcript';
type Cmd = StoryCommand extends infer C ? (C extends StoryCommand ? Omit<C, 'revision'> : never) : never;
interface Action { readonly name: string; readonly label: string; readonly onClick: () => void }

let instantText = false;

const FINISH_LABEL: Record<string, string> = { champion: 'Champions', runner_up: 'Runners-up', group_2: 'Second in the group', group_3: 'Third in the group', group_4: 'Fourth in the group' };
const clubName = (id: string): string => CLUB_WORLD.clubs.find((c) => c.id === id)?.displayName ?? id;
const resultOf = (s: { home: number; away: number }): 'WIN' | 'DRAW' | 'LOSS' => (s.home > s.away ? 'WIN' : s.home < s.away ? 'LOSS' : 'DRAW');

function newRunId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Week-one story (package v0.7): visual-novel cutscenes, code-owned activity handoffs and the crossbar
 * challenge. All story rules live in src/game/story; this scene only draws state and sends commands.
 */
export class StoryScene extends Phaser.Scene implements InspectableScene, GameplayScene {
  private mode: Mode = 'loading';
  private art: StoryArt | null = null;
  private panelG!: Phaser.GameObjects.Graphics;
  private career: CareerStore | null = null;
  private save: CareerSave | null = null;
  private store: StoryStore | null = null;
  private session: StorySession | null = null;
  private state: StoryState | null = null;
  private busy = false;
  private actionsTop = 0;
  private navigating = false;
  private message = '';
  private nodeKey = '';
  private nodeShownAt = 0;
  private downAt = -1;
  private pointersDown = 0;
  private typed = 0;
  private gender: Gender | null = null;
  private position: Position = 'MID';
  private pendingName = '';
  private contest: Contest | null = null;
  private runId = '';
  private anim: { path: readonly (readonly [number, number, number])[]; start: number; dur: number; who: Participant; scored: boolean; outcome: ShotOutcome } | null = null;
  private lastShot: { who: Participant; outcome: ShotOutcome; scored: boolean } | null = null;
  private paused = false;
  private epoch = 0;
  private pauseBtn: Button | null = null;
  private xview: CrossbarView | null = null;
  private aimFrom: { x: number; y: number } | null = null;
  private pull: Pull | null = null;
  private crossbarSummary = '';
  private crossbarScore = '';
  private seasonSummary = '';
  private tournamentSummary = '';
  private bg!: Phaser.GameObjects.Graphics;
  private stage!: Phaser.GameObjects.Graphics;
  private speaker!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private top: Button[] = [];
  private actions: Button[] = [];
  private panel: Rect = { x: 0, y: 0, width: 0, height: 0 };
  private basePanel: Rect = { x: 0, y: 0, width: 0, height: 0 };

  constructor() {
    super(SceneKeys.Story);
  }

  private newGame = false;

  init(data?: { newGame?: boolean }): void {
    this.newGame = data?.newGame === true;
  }

  create(): void {
    this.mode = 'loading';
    this.busy = false;
    this.navigating = false;
    this.message = '';
    this.nodeKey = '';
    this.contest = null;
    this.anim = null;
    this.lastShot = null;
    this.paused = false;
    this.epoch++;
    this.aimFrom = null;
    this.pull = null;
    this.actions = [];
    const res = textResolution();
    const text = (color: string, bold = false) => this.add.text(0, 0, '', { fontFamily: FONT_FAMILY, color, fontStyle: bold ? 'bold' : 'normal' }).setResolution(res);
    this.bg = this.add.graphics().setDepth(-3);
    this.art?.destroy();
    this.art = new StoryArt(this, typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.art.onChange = () => this.drawStage();
    this.panelG = this.add.graphics();
    this.stage = this.add.graphics();
    this.speaker = text(CSS.cream, true);
    this.body = text(CSS.ink);
    this.info = text(CSS.ink, true);
    this.hint = text(CSS.ink).setAlpha(0.7);
    const topButton = (name: string, label: string, onClick: () => void) => new Button(this, 0, 0, { name, label, width: 90, height: 40, fontSize: 15, onClick });
    this.top = [
      topButton('story-menu', 'Menu', () => this.goStart()),
      topButton('story-log', 'Log', () => this.toggleTranscript()),
      topButton('story-skip', 'Skip ›', () => void this.fastForward()),
      topButton('story-speed', instantText ? 'Text: instant' : 'Text: normal', () => this.toggleSpeed()),
    ];
    this.pauseBtn = topButton('crossbar-pause', 'Pause', () => this.setPaused(!this.paused));
    this.pauseBtn.setEnabled(false);
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onBlur, this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.layout();
    void this.boot();
  }

  private restartable = false;

  private async boot(): Promise<void> {
    this.career = await CareerStore.open();
    this.store = await StoryStore.open();
    if (this.newGame) {
      // New game from Start: the old career, story, league and cups are archived, then everything starts at week 1.
      this.newGame = false;
      if (!(await this.career.startOver()) || !(await this.store.newGame(CAREER_ID))) return this.fail('A new game could not be started. Nothing was changed.');
    }
    this.save = await this.career.load();
    const begun = await this.store.begin(CAREER_ID);
    if (!begun.ok) return this.fail(begun.error);
    this.state = begun.state;
    this.session = createSession('live', (c) => this.store!.dispatch(CAREER_ID, c));
    this.gender = this.save.player?.gender ?? null;
    this.pendingName = this.save.player?.name ?? '';
    if (this.save.player) this.position = this.save.player.position;
    this.mode = 'story';
    await this.loadSummaries();
    await this.loadCrossbarScore();
    await this.resumeHandoff();
    this.render();
  }

  private async restartStory(): Promise<void> {
    if (!this.store) return;
    this.restartable = false;
    const r = await this.store.restartStory(CAREER_ID);
    if (!r) return this.fail('The story could not be restarted. Nothing was changed.');
    this.mode = 'loading';
    this.render();
    await this.boot();
  }

  private fail(error: string): void {
    this.restartable = /cannot be mapped/.test(error);
    this.mode = 'error';
    this.message = error;
    this.render();
  }

  private async send(c: Cmd): Promise<StoryOutcome> {
    if (!this.session || !this.state) return { ok: false, error: 'not ready' };
    const r = await this.session.dispatch({ ...c, revision: this.state.revision } as StoryCommand);
    if (r.ok) {
      this.state = r.state;
      if (r.state.sceneId === 'S1_W02_S2') await this.loadCrossbarScore();
    } else {
      // Another tab may have moved on: reload the canonical state rather than guessing.
      const fresh = await this.store!.load(CAREER_ID);
      if (fresh) this.state = fresh;
      this.message = r.error === 'stale revision' ? 'The story moved on in another tab; showing the latest step.' : r.error;
    }
    return r;
  }

  private seq(): number {
    return Math.max((this.state?.lastSeq ?? 0) + 1, Date.now());
  }

  private node(): StoryNode | null {
    return this.state ? currentNode(this.state) : null;
  }

  private name(): string {
    return this.save?.player?.name ?? 'Player';
  }

  // ---- input ----

  private onDown(p: Phaser.Input.Pointer): void {
    this.pointersDown++;
    this.downAt = this.time.now;
    if (this.pointersDown > 1) {
      this.aimFrom = null;
      this.pull = null;
      return;
    }
    if (this.mode === 'crossbar' && this.kickReady() && p.y > 60 && p.y < this.panel.y) this.aimFrom = { x: p.x, y: p.y };
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.aimFrom || !p.isDown) return;
    this.pull = pullFor(p.x - this.aimFrom.x, p.y - this.aimFrom.y, thresholdsFor(Math.min(this.scale.width, this.scale.height)));
    this.drawStage();
  }

  private onUp(p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    const multi = this.pointersDown > 1;
    this.pointersDown = Math.max(0, this.pointersDown - 1);
    if (this.mode === 'crossbar') {
      const from = this.aimFrom;
      this.aimFrom = null;
      const pull = from ? pullFor(p.x - from.x, p.y - from.y, thresholdsFor(Math.min(this.scale.width, this.scale.height))) : null;
      this.pull = null;
      if (multi || over.length > 0 || !pull || pull.inCancel || pull.dirY >= -0.2) {
        if (from && pull && !pull.inCancel) this.message = 'Pull back toward yourself to kick at the goal.';
        this.render();
        return;
      }
      void this.shoot('player', { dirX: pull.dirX, dirY: -pull.dirY, power: pull.power });
      return;
    }
    if (multi || over.length > 0 || this.mode !== 'story' || this.downAt < this.nodeShownAt) return;
    const n = this.node();
    if (n?.type === 'line') void this.advance();
  }

  private fresh(): boolean {
    return !this.busy && this.downAt >= this.nodeShownAt;
  }

  private async advance(): Promise<void> {
    if (this.busy || !this.state) return;
    this.busy = true;
    const wasRevealed = this.state.revealed;
    const r = await this.send({ type: 'advance', seq: this.seq() });
    // If the typewriter already finished locally, one tap both reveals and advances.
    if (r.ok && !wasRevealed && this.typed >= this.fullText().length && !instantText) await this.send({ type: 'advance', seq: this.seq() });
    else if (r.ok && !wasRevealed && instantText) await this.send({ type: 'advance', seq: this.seq() });
    this.busy = false;
    this.render();
  }

  /** Fast-forward stops at every choice, activity and the end; it never chooses or launches. */
  private async fastForward(): Promise<void> {
    if (this.busy || this.mode !== 'story') return;
    this.busy = true;
    for (let i = 0; i < 60 && this.node()?.type === 'line'; i++) {
      const r = await this.send({ type: 'advance', seq: this.seq() });
      if (!r.ok) break;
    }
    this.busy = false;
    this.render();
  }

  private toggleSpeed(): void {
    instantText = !instantText;
    this.top[3]!.setLabel(instantText ? 'Text: instant' : 'Text: normal');
    this.render();
  }

  /** Pause stops new kicks (and Blake's) and holds Help, the shot log, text speed and Leave. */
  private lastTick: number | null = null;

  private setPaused(on: boolean): void {
    if (this.mode !== 'crossbar') return;
    this.paused = on;
    this.aimFrom = null;
    this.pull = null;
    this.render();
    const slot = this.contest ? nextSlot(this.contest) : null;
    if (!on && slot?.participant === 'blake' && !this.anim && !this.busy) this.afterShot();
  }

  /** Losing focus drops any held pull, so a half-drawn kick never fires later; the challenge pauses. */
  private onBlur(): void {
    this.aimFrom = null;
    this.pull = null;
    this.pointersDown = 0;
    if (this.mode === 'crossbar' && !this.paused) this.setPaused(true);
  }

  private toggleTranscript(): void {
    if (this.mode === 'story') this.mode = 'transcript';
    else if (this.mode === 'transcript') this.mode = 'story';
    this.render();
  }

  // ---- adapters ----

  private async launch(): Promise<string | null> {
    const r = await this.send({ type: 'launch', runId: newRunId() });
    return r.ok && r.runId ? r.runId : null;
  }

  private async complete(runId: string, outcome: 'completed' | 'declined' | 'abandoned' | 'interrupted', result: 'WIN' | 'LOSS' | 'DRAW' | null = null, detail: string | null = null): Promise<void> {
    await this.send({ type: 'complete', runId, outcome, result, ...(detail ? { detail } : {}) });
    this.mode = 'story';
    this.contest = null;
    await this.loadSummaries();
  }

  private async choose(id: string): Promise<void> {
    if (!this.fresh()) return;
    this.busy = true;
    await this.send({ type: 'choose', seq: this.seq(), choiceId: id });
    this.busy = false;
    this.render();
  }

  private async decline(): Promise<void> {
    if (!this.fresh()) return;
    this.busy = true;
    await this.send({ type: 'decline', seq: this.seq() });
    this.busy = false;
    await this.loadSummaries();
    this.render();
  }

  private async confirmIdentity(): Promise<void> {
    if (!this.fresh() || !this.career) return;
    const v = validateName(this.pendingName);
    if (!v.ok) return void ((this.message = v.error), this.render());
    if (!this.gender) return void ((this.message = 'Choose boy or girl.'), this.render());
    this.busy = true;
    const r = this.save?.player
      ? await this.career.dispatch({ type: 'setIdentity', name: v.name, gender: this.gender })
      : await this.career.dispatch({ type: 'createPlayer', id: `career-${Date.now().toString(36)}`, name: v.name, position: this.position, gender: this.gender });
    if (!r.ok) {
      this.busy = false;
      this.message = r.error;
      return this.render();
    }
    this.save = r.save;
    const run = await this.launch();
    if (run) await this.complete(run, 'completed');
    this.busy = false;
    this.render();
  }

  private askName(): void {
    if (this.busy) return;
    const raw = window.prompt('Your name (plain text, up to 24 characters)', this.pendingName) ?? this.pendingName;
    const v = validateName(raw);
    this.message = v.ok ? '' : v.error;
    if (v.ok) this.pendingName = v.name;
    this.render();
  }

  private async openCareer(kind: CareerAdapter): Promise<void> {
    if (!this.fresh() || !this.store || !this.save) return;
    this.busy = true;
    const run = await this.launch();
    if (!run) return void ((this.busy = false), this.render());
    if (kind === 'tournament_match' && (await this.store.getRecord(`tfix:${run}`)) === undefined) {
      // The cup fixture is fixed when the run launches, so a second tab finishing the same run cannot move on to the next game.
      const t = await this.tournament();
      const f = t ? nextBataviaFixture(t) : null;
      if (!f || !(await this.store.putRecord(`tfix:${run}`, f.id))) return void ((this.busy = false), (this.message = 'This tournament game could not be prepared. Nothing was changed.'), this.render());
    }
    if ((await this.store.getRecord(`run:${run}`)) === undefined) {
      const s = this.save;
      const snap: Snapshot = { revision: s.revision, sessions: s.completedSessions.length, batches: s.batches.length, week: s.week };
      await this.store.putRecord(`run:${run}`, snap);
    }
    this.navigating = true;
    if (MATCH_ADAPTERS.includes(kind)) this.scene.start(SceneKeys.Formation, { career: true, returnTo: 'story', resultKey: run, ...(await this.matchOpponent(kind, run)) });
    else this.scene.start(SceneKeys.Career, { returnTo: 'story', ...(kind === 'team_training' ? { open: 'team' } : {}) });
  }

  private async openJungle(): Promise<void> {
    if (!this.fresh() || !this.store) return;
    this.busy = true;
    const run = await this.launch();
    if (!run) return void ((this.busy = false), this.render());
    this.navigating = true;
    this.scene.start(SceneKeys.Jungle, { runId: run, returnTo: 'story', look: this.save?.player?.gender === 'girl' ? 'girl' : 'boy' });
  }

  /** On return from Home Training or a match, decide the outcome only from what the career save shows. */
  private async resumeHandoff(): Promise<void> {
    const n = this.node();
    if (!n || n.type !== 'activity_handoff' || !this.state || !this.store || !this.career) return;
    const run = Object.values(this.state.runs).find((r) => r.sceneId === this.state!.sceneId && r.nodeId === n.id && r.state === 'launched');
    if (!run) return;
    if (n.adapter === 'crossbar') return this.enterCrossbar(run.runId);
    if (n.adapter === 'jungle') {
      const rec = (await this.store.getRecord(`jungle:${run.runId}`)) as { status?: string; scores?: Record<CompetitorId, number> } | undefined;
      const result = rec?.status === 'completed' ? jungleResult(rec.scores) : null;
      if (rec) await (result ? this.complete(run.runId, 'completed', result) : this.complete(run.runId, 'abandoned'));
      else this.message = 'Not finished yet. Nothing was recorded.';
      return;
    }
    if (!(CAREER_ADAPTERS as readonly string[]).includes(n.adapter)) return;
    const snap = (await this.store.getRecord(`run:${run.runId}`)) as Snapshot | undefined;
    const s = (this.save = await this.career.load());
    if (!snap) return;
    // A story match counts only once it reaches full time; growth evidence alone does not finish it.
    const isMatch = MATCH_ADAPTERS.includes(n.adapter);
    const full = isMatch ? await this.fullTimeScore(run.runId) : null;
    const done =
      n.adapter === 'training_arrangement' ? s.revision > snap.revision && s.player !== null
      : n.adapter === 'weekly_focus' ? s.focusId !== null
      : n.adapter === 'practice' ? s.completedSessions.length > snap.sessions
      : n.adapter === 'team_training' ? s.teamTraining.some((r) => r.week === snap.week)
      : full !== null;
    if (!done) {
      this.message = isMatch ? 'No full-time result yet, so nothing was recorded. Play the match again to finish it.' : 'Not finished yet. Nothing was recorded.';
      return;
    }
    if (n.adapter === 'match' && full) await this.recordLeague(full);
    if (n.adapter === 'league_match' && full) {
      if (!(await this.recordSeasonLeague(full))) return void (this.message = 'This league result could not be recorded. Nothing was changed.');
      return this.complete(run.runId, 'completed', resultOf(full));
    }
    if (n.adapter === 'tournament_match' && full) {
      const t = await this.recordTournament(run.runId, full);
      if (!t) return void (this.message = 'This tournament result could not be recorded. Nothing was changed.');
      // A level final is decided by its shoot-out, so the story result matches the tournament finish.
      return this.complete(run.runId, 'completed', t.result ?? resultOf(full), t.detail);
    }
    // Season One reads the week's real Team Training grade so Code's reply follows what happened.
    const rec = n.adapter === 'team_training' && this.state.sceneId.startsWith('S1_') ? s.teamTraining.find((r) => r.week === snap.week) : undefined;
    await this.complete(run.runId, 'completed', null, rec ? trainingDetail(rec.delta) : null);
  }

  /** The story week of the current match scene (W2_MATCH → 2), never the separately advancing career week. */
  private storyWeek(): number | null {
    const m = /^W(\d)_MATCH$/.exec(this.state?.sceneId ?? '');
    return m ? Number(m[1]) : null;
  }

  /** Season One calendar week of the current scene (S1_W09_G2 -> 9), never the career week. */
  private seasonWeekNo(): number | null {
    const m = /^S1_W(\d\d)_/.exec(this.state?.sceneId ?? '');
    return m ? Number(m[1]) : null;
  }

  private seasonSeed(): number {
    let seed = 0;
    for (const ch of this.state?.careerId ?? '') seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0;
    return seed;
  }

  private async seasonLeague() {
    const id = this.state!.careerId;
    const saved = parseSeasonLeague(await this.store!.getRecord(`league-s1:${id}`));
    return saved.ok ? saved.value : newSeasonLeague(id, this.seasonSeed());
  }

  /** Club the away side wears in this story match (art only; competitions are unchanged). */
  private async matchOpponent(kind: string, run: string): Promise<{ opponent?: string }> {
    if (kind === 'league_match') {
      const week = this.seasonWeekNo();
      const f = week === null ? null : fixtureForSeasonWeek(week);
      return f ? { opponent: opponentOf(f) } : {};
    }
    if (kind === 'tournament_match') {
      const id = await this.store?.getRecord(`tfix:${run}`);
      const t = await this.tournament();
      const f = t && typeof id === 'string' ? allFixtures(t).find((x) => x.id === id) : undefined;
      if (f) return { opponent: f.home === 'batavia' ? f.away : f.home };
    }
    return {};
  }

  /** This week's Batavia league fixture counts once; other clubs are simulated through its round. */
  private async recordSeasonLeague(score: { home: number; away: number }): Promise<boolean> {
    const week = this.seasonWeekNo();
    const f = week === null ? null : fixtureForSeasonWeek(week);
    if (!f || !this.store || !this.state) return false;
    const id = this.state.careerId;
    const seed = this.seasonSeed();
    const out = await this.store.updateRecord(`league-s1:${id}`, (cur) => {
      const saved = parseSeasonLeague(cur);
      const r = recordSeasonPlayed(saved.ok ? saved.value : newSeasonLeague(id, seed), f.id, score.home, score.away);
      return r.ok ? { value: simulateSeasonThrough(r.state, f.round), out: true } : null;
    });
    return out === true;
  }

  /** A skipped league game stays pending for Batavia; the other clubs still play their round. */
  private async skipSeasonLeague(): Promise<boolean> {
    const week = this.seasonWeekNo();
    const f = week === null ? null : fixtureForSeasonWeek(week);
    if (!f || !this.store || !this.state) return false;
    const id = this.state.careerId;
    const seed = this.seasonSeed();
    const out = await this.store.updateRecord(`league-s1:${id}`, (cur) => {
      const saved = parseSeasonLeague(cur);
      return { value: simulateSeasonThrough(saved.ok ? saved.value : newSeasonLeague(id, seed), f.round), out: true };
    });
    return out === true;
  }

  /** Every league game has a result and both cups have a final placing. */
  private async seasonComplete(): Promise<boolean> {
    if (!this.store || !this.state) return false;
    if (bataviaRecord(await this.seasonLeague()).pending > 0) return false;
    for (const tid of Object.keys(TOURNAMENTS) as TournamentId[]) {
      const t = parseTournament(await this.store.getRecord(`tourney-s1:${this.state.careerId}:${tid}`), tid);
      if (!t.ok || bataviaFinish(t.value) === null) return false;
    }
    return true;
  }

  private tournamentId(): TournamentId | null {
    const w = this.seasonWeekNo();
    return w === null ? null : seasonWeek(w)?.tournament ?? null;
  }

  private async tournament(): Promise<TournamentState | null> {
    const tid = this.tournamentId();
    if (!tid || !this.store || !this.state) return null;
    const saved = parseTournament(await this.store.getRecord(`tourney-s1:${this.state.careerId}:${tid}`), tid);
    return saved.ok ? saved.value : newTournament(tid, this.state.careerId, this.seasonSeed());
  }

  /** Batavia's next due tournament game counts once; detail = playoff assignment or final place. */
  private async recordTournament(runId: string, score: { home: number; away: number }): Promise<{ detail: string | null; result: 'WIN' | 'DRAW' | 'LOSS' | null } | null> {
    const tid = this.tournamentId();
    if (!tid || !this.store || !this.state) return null;
    const bound = await this.store.getRecord(`tfix:${runId}`);
    const id = this.state.careerId;
    const seed = this.seasonSeed();
    // Read, check and write in one transaction; a conflicting second result for the same fixture is refused.
    return this.store.updateRecord(`tourney-s1:${id}:${tid}`, (cur) => {
      const saved = parseTournament(cur, tid);
      const t = saved.ok ? saved.value : newTournament(tid, id, seed);
      const fid = typeof bound === 'string' ? bound : nextBataviaFixture(t)?.id;
      if (!fid) return null;
      const r = recordTournamentPlayed(t, fid, score.home, score.away);
      if (!r.ok) return null;
      const finish = bataviaFinish(r.state);
      const fin = finalFixture(r.state);
      return { value: r.state, out: { detail: finish ?? (fin && (fin.home === 'batavia' || fin.away === 'batavia') ? 'final' : null), result: bataviaResult(r.state, fid) } };
    });
  }

  private async fullTimeScore(runId: string): Promise<{ home: number; away: number } | null> {
    const res = (await this.store?.getRecord(`matchresult:${runId}`)) as { home?: unknown; away?: unknown } | undefined;
    return res && Number.isInteger(res.home) && Number.isInteger(res.away) ? { home: res.home as number, away: res.away as number } : null;
  }

  /** League table: a full-time score counts once for this story week's Batavia fixture (null = skipped: no Batavia result); other clubs are simulated through the round either way. */
  private async recordLeague(score: { home: number; away: number } | null): Promise<void> {
    const store = this.store;
    const week = this.storyWeek();
    const f = week === null ? null : fixtureForWeek(week);
    if (!store || !this.state || !f) return;
    const careerId = this.state.careerId;
    const saved = parseLeague(await store.getRecord(`league:${careerId}`));
    let seed = 0;
    for (const ch of careerId) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0;
    let league = saved.ok ? saved.value : newLeague(careerId, seed);
    if (score) {
      const r = recordPlayed(league, f.id, score.home, score.away);
      if (!r.ok) return;
      league = r.state;
    }
    await store.putRecord(`league:${careerId}`, simulateThrough(league, f.round));
  }

  private async closeWeek(): Promise<void> {
    if (!this.fresh() || !this.career) return;
    this.busy = true;
    const before = (await this.career.load()).week;
    const r = await this.career.dispatch({ type: 'endWeek' });
    this.save = await this.career.load();
    if (!r.ok || this.save.week <= before) {
      this.message = r.ok ? 'The week did not close.' : r.error;
    } else {
      const run = await this.launch();
      if (run) await this.complete(run, 'completed');
    }
    this.busy = false;
    this.render();
  }

  private async assignment(): Promise<void> {
    if (!this.fresh()) return;
    this.busy = true;
    const run = await this.launch();
    if (run) await this.complete(run, 'completed');
    this.busy = false;
    this.render();
  }

  // ---- crossbar ----

  private async startCrossbar(): Promise<void> {
    if (!this.fresh()) return;
    this.busy = true;
    const run = await this.launch();
    if (run) await this.enterCrossbar(run);
    this.busy = false;
    this.render();
  }

  /** Week one's invitation, or the Season One challenge answer in the current scene (only `warmup` adds one). */
  private crossbarWarmup(): boolean {
    const s = this.state;
    if (!s) return false;
    if (s.sceneId.startsWith('S1_')) {
      const d = s.decisions[s.sceneId];
      return crossbarRules(s.sceneId).warmup === 'always' || d?.warmup === 'yes' || d?.challenge === 'warmup';
    }
    const inv = s.decisions.W1_SCHOOL_02?.invitation;
    return inv === 'accept' || inv === 'shared_warmup';
  }

  /** The crossbar opponent's name for this scene (Sam in week 1, otherwise Blake). Same physics either way. */
  private opponent(): string {
    const id = this.state?.sceneId ?? '';
    return id.startsWith('S1_') ? crossbarRules(id).opponent : 'Blake';
  }

  /** Week 2's real Crossbar score for {crossbar.score} (the classroom board), read from the saved contest. */
  private async loadCrossbarScore(): Promise<void> {
    const run = this.state ? Object.values(this.state.runs).find((r) => r.sceneId === 'S1_W02_S' && r.state === 'resolved' && r.outcome === 'completed') : undefined;
    const c = run && this.store ? restoreContest(await this.store.getRecord(`crossbar:${run.runId}`)) : null;
    this.crossbarScore = c ? `BLAKE ${points(c, 'blake')}, ${this.name().toUpperCase()} ${points(c, 'player')}` : 'BLAKE WINS';
  }

  private say(text: string): string {
    return renderText(text, this.name()).split('{crossbar.score}').join(this.crossbarScore);
  }

  private async enterCrossbar(runId: string): Promise<void> {
    if (!this.store || !this.state) return;
    const epoch = this.epoch;
    this.runId = runId;
    const warm = this.crossbarWarmup();
    const sudden = this.state.sceneId.startsWith('S1_') ? crossbarRules(this.state.sceneId).sudden : true;
    // One read-modify-write: replay any launched attempt from its frozen input, never a reroll.
    const c = await this.store.updateRecord(`crossbar:${runId}`, (cur) => {
      let k = restoreContest(cur) ?? newContest(runId, warm, sudden);
      if (k.status === 'active' && k.attempts.some((a) => a.state === 'launched')) {
        const r = resolveAttempt(k);
        if (r.ok) k = r.contest;
      }
      return { value: k, out: k };
    });
    if (epoch !== this.epoch) return;
    if (!c) return this.fail('Could not open the crossbar challenge save. Nothing was counted; go back and try again.');
    if (c.status === 'interrupted') return this.complete(runId, 'interrupted');
    this.contest = c;
    this.mode = 'crossbar';
    this.paused = false;
    this.message = '';
    this.nodeShownAt = this.time.now;
    this.afterShot();
  }

  private playerTurn(): boolean {
    return !!this.contest && nextSlot(this.contest)?.participant === 'player';
  }

  private kickReady(): boolean {
    return this.mode === 'crossbar' && !this.paused && !this.busy && !this.anim && this.playerTurn();
  }

  private async shoot(who: Participant, input: KickInput): Promise<void> {
    if (!this.contest || !this.store || this.anim || this.busy || this.mode !== 'crossbar' || this.paused) return;
    if (!launchAttempt(this.contest, who, input).ok) return;
    const epoch = this.epoch;
    const runId = this.runId;
    const key = `crossbar:${runId}`;
    const seen = this.contest.attempts.length;
    this.busy = true;
    // Compare-and-commit the frozen launch before any flight is shown; a stale tab or failed save launches nothing.
    const launched = await this.store.updateRecord(key, (cur) => {
      const c = commitLaunch(cur, seen, who, input);
      return c ? { value: c, out: c } : null;
    });
    if (epoch !== this.epoch || runId !== this.runId || this.mode !== 'crossbar') return;
    if (!launched) {
      this.busy = false;
      const fresh = restoreContest(await this.store.getRecord(key));
      if (epoch !== this.epoch) return;
      if (fresh && fresh.attempts.length !== seen) {
        await this.enterCrossbar(runId);
        this.message = 'This challenge moved on in another tab; showing the latest shot.';
        return this.render();
      }
      this.message = 'Save failed; that kick did not count.';
      return this.render();
    }
    const att = launched.attempts[launched.attempts.length - 1]!;
    const r = resolveAttempt(launched);
    if (!r.ok) return void (this.busy = false);
    // Start the flight before the turn passes, so the next kicker never sees a turn that is not open yet.
    const shot = simulateShot(att.input);
    this.anim = { path: shot.path, start: this.time.now, dur: Math.max(400, shot.time * 1000), who, scored: shot.scored, outcome: describeShot(shot) };
    this.lastShot = null;
    this.contest = r.contest;
    this.message = '';
    this.render();
    // The launch record already makes a reload replay this exact attempt if this write is lost.
    // The turn (and any final story result) waits for a durable result; a failed write is retried, then held for reload.
    for (let i = 0; i < 3; i++) {
      const ok = await this.store.updateRecord(key, (cur) => {
        const c = commitResolve(cur, att.key);
        return c ? { value: c, out: true } : null;
      });
      if (epoch !== this.epoch) return;
      const stored = ok ? null : restoreContest(await this.store.getRecord(key));
      if (epoch !== this.epoch) return;
      if (ok || stored?.attempts.find((x) => x.key === att.key)?.state === 'resolved') {
        this.busy = false;
        return this.render();
      }
      await new Promise((res) => setTimeout(res, 300));
      if (epoch !== this.epoch) return;
    }
    this.anim = null;
    this.message = 'Could not save that shot. Leave and come back; it will be replayed exactly.';
    this.render();
  }

  private afterShot(): void {
    const c = this.contest;
    if (!c) return;
    const result = contestResult(c);
    if (result) {
      const runId = this.runId;
      // Pause holds the final result screen until Resume.
      const finish = (): void => {
        if (runId !== this.runId || this.mode !== 'crossbar') return;
        if (this.paused) return void this.time.delayedCall(200, finish);
        void this.complete(runId, 'completed', result).then(() => this.render());
      };
      this.time.delayedCall(900, finish);
      return;
    }
    const slot = nextSlot(c);
    if (slot?.participant === 'blake') {
      this.time.delayedCall(700, () => void this.shoot('blake', opponentKick(attemptKey(c.contestId, slot.round, 'blake', slot.index))));
    }
    this.render();
  }

  private async leaveCrossbar(): Promise<void> {
    if (this.busy || this.anim) return;
    this.paused = false;
    // Leaving before a result is ABANDONED: never a loss, and it cannot be replaced by a reward-bearing retry.
    await this.complete(this.runId, 'abandoned');
    this.render();
  }

  private async loadSummaries(): Promise<void> {
    if (!this.state || !this.store) return;
    if (this.state.contentVersion !== 'w24-draft-1' && this.state.sceneId.startsWith('S1_')) await this.loadSeasonSummaries();
    const run = outcomeOf(this.state, 'W1_CROSSBAR');
    if (!run) return void (this.crossbarSummary = '');
    if (run.outcome === 'completed' && run.runId) {
      const c = restoreContest(await this.store.getRecord(`crossbar:${run.runId}`));
      const p = c ? points(c, 'player') : 0;
      const b = c ? points(c, 'blake') : 0;
      this.crossbarSummary = `Crossbar result: ${this.name()} ${p}, Blake ${b} (${run.result === 'WIN' ? 'you won' : run.result === 'LOSS' ? 'Blake won' : 'a draw'}).`;
    } else this.crossbarSummary = `Crossbar challenge: ${run.outcome === 'declined' ? 'you declined; no score' : run.outcome === 'abandoned' ? 'left before the end; no result' : 'interrupted; no result'}.`;
  }

  /** Live standings text from the season league and the current week's tournament (never from story text). */
  private async loadSeasonSummaries(): Promise<void> {
    const lg = await this.seasonLeague();
    const rec = bataviaRecord(lg);
    const rows = seasonTable(lg).map((r) => `${r.position}. ${clubName(r.club)}  P${r.played} W${r.won} D${r.drawn} L${r.lost} ${r.points} pts`);
    const pending = rec.pending > 0 ? ` · ${rec.pending} unplayed` : '';
    const lines = [`League (Batavia W${rec.won} D${rec.drawn} L${rec.lost}${pending}):`, ...rows];
    const t = await this.tournament();
    this.tournamentSummary = '';
    if (t) {
      const next = nextBataviaFixture(t);
      const finish = bataviaFinish(t);
      const tname = (id: string): string => TOURNAMENTS[t.id].teams[id]?.name ?? id;
      for (const gi of [0, 1] as const) lines.push('', `${TOURNAMENTS[t.id].name} group ${gi === 0 ? 'A' : 'B'} (tournament points):`, ...groupTable(t, gi).rows.map((r) => `${r.position}. ${tname(r.team)}  P${r.played} W${r.won} ${r.points} pts`));
      if (finish) lines.push(`Finish: ${FINISH_LABEL[finish]}`);
      if (next) this.tournamentSummary = `${next.stage === 'final' ? 'Final' : `Group game ${next.stage.slice(1)}`} vs ${tname(next.home === 'batavia' ? next.away : next.home)}.`;
      lines.push('Tournament points never become league points.');
    }
    this.seasonSummary = lines.join('\n');
  }

  /** Factual recap from committed evidence only (shown on result scenes). */
  private recap(): string {
    const s = this.state;
    if (!s) return '';
    if (s.sceneId === 'S1_W02_S2') return this.crossbarSummary;
    if (s.sceneId === 'S1_W03_E' || s.sceneId === 'S1_W04_E') return this.seasonSummary;
    return '';
  }

  // ---- rendering ----

  private fullText(): string {
    const n = this.node();
    return n?.type === 'line' ? this.say(n.text) : '';
  }

  override update(time: number): void {
    if (this.mode === 'story' && this.state && !this.state.revealed && !instantText) {
      const full = this.fullText();
      if (this.typed < full.length) {
        this.typed = Math.min(full.length, Math.floor((time - this.nodeShownAt) / 22));
        this.body.setText(full.slice(0, this.typed));
      }
    }
    if (this.anim && this.paused) this.anim.start += time - (this.lastTick ?? time);
    this.lastTick = time;
    if (this.anim) {
      this.drawStage();
      if (time - this.anim.start >= this.anim.dur + 500 && !this.busy) {
        this.lastShot = { who: this.anim.who, outcome: this.anim.outcome, scored: this.anim.scored };
        this.anim = null;
        this.afterShot();
      }
    }
  }

  private clearActions(): void {
    for (const b of this.actions) b.destroy();
    this.actions = [];
  }

  private setActions(list: readonly Action[]): void {
    this.clearActions();
    const portrait = orientationOf(this.scale) === 'portrait';
    const cols = portrait ? (list.length < 3 ? 1 : 2) : Math.min(list.length >= 5 ? 3 : 2, list.length);
    const pad = 12;
    const bw = Math.round(Math.min((this.panel.width - pad * (cols + 1)) / cols, 420));
    const bh = Math.round(Math.max(48, Math.min(this.scale.height * (portrait ? 0.065 : 0.12), 60)));
    const fs = Math.round(Math.max(15, Math.min(bh * 0.36, 20)));
    const rows = Math.ceil(list.length / cols);
    const bottom = this.panel.y + this.panel.height - pad;
    this.actionsTop = list.length ? bottom - rows * (bh + 8) + 8 : this.panel.y + this.panel.height;
    list.forEach((a, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = this.panel.x + pad + bw / 2 + col * (bw + pad) + Math.max(0, (this.panel.width - pad * (cols + 1) - cols * bw) / 2);
      const y = bottom - (rows - row) * (bh + 8) + bh / 2 + 8;
      this.actions.push(new Button(this, x, y, { name: a.name, label: a.label, width: bw, height: bh, fontSize: fs, onClick: a.onClick }));
    });
  }

  private render(): void {
    if (!this.bg) return;
    this.panel = { ...this.basePanel };
    const xbar = this.mode === 'crossbar';
    for (const b of this.top) b.setEnabled(!xbar);
    this.pauseBtn?.setEnabled(xbar).setLabel(this.paused ? 'Return' : 'Pause');
    if (xbar && !this.paused) {
      // A one-row HUD leaves the goal and the kicking spot a clear stage under the top bar.
      const h = Math.round(Math.min(this.basePanel.height, Math.max(84, this.scale.height * 0.15)));
      this.panel = { ...this.panel, y: this.basePanel.y + this.basePanel.height - h, height: h };
    }
    const n = this.node();
    const key = `${this.state?.sceneId}.${this.state?.nodeId}.${this.mode}`;
    if (key !== this.nodeKey) {
      this.nodeKey = key;
      this.nodeShownAt = this.time.now;
      this.typed = 0;
      if (this.mode === 'story') this.message = n?.type === 'activity_handoff' ? this.message : '';
    }
    this.drawStage();
    const acts: Action[] = [];
    let log: string[] | null = null;
    this.speaker.setText('');
    let body = '';
    let hint = '';
    if (this.mode === 'loading') body = 'Loading story…';
    else if (this.mode === 'error') {
      body = this.message;
      if (this.restartable) {
        body += '\nRestarting starts the story again at the prologue. Your player, attributes and training are kept; a copy of the old story is saved.';
        acts.push({ name: 'story-restart', label: 'Restart story', onClick: () => void this.restartStory() });
      }
      acts.push({ name: 'story-back', label: 'Back to menu', onClick: () => this.goStart() });
    } else if (this.mode === 'transcript') {
      log = (this.state?.transcript ?? []).map((t) => this.lineFor(t.sceneId, t.nodeId)).filter(Boolean).slice(-8);
      body = log.join('\n');
      acts.push({ name: 'story-log-close', label: 'Close log', onClick: () => this.toggleTranscript() });
    } else if (this.mode === 'crossbar' && this.contest && this.paused) {
      body = `Paused\n${this.shotLog()}`;
      hint = 'Pull back from the ball and let go to kick. Only hitting the crossbar scores; under it, the post, over or wide score nothing.';
      acts.push({ name: 'crossbar-resume', label: 'Return', onClick: () => this.setPaused(false) });
      acts.push({ name: 'crossbar-text', label: instantText ? 'Text: instant' : 'Text: normal', onClick: () => this.toggleSpeed() });
      if (this.busy || this.anim) hint += '\nWait for the ball to land before leaving.';
      else acts.push({ name: 'crossbar-leave', label: 'Leave (no result)', onClick: () => void this.leaveCrossbar() });
    } else if (this.mode === 'crossbar' && this.contest) {
      const c = this.contest;
      const slot = nextSlot(c);
      const main = c.attempts.filter((a) => a.round === 'main' && a.participant === 'player').length;
      const turn = slot?.round === 'warmup' ? 'Warm-up (does not count)' : slot?.round === 'sudden' ? 'Sudden death' : `Shot ${Math.min(3, main + 1)} of 3`;
      body = `${this.name()} ${points(c, 'player')} · ${this.opponent()} ${points(c, 'blake')} · ${turn}`;
      const last = this.lastShot;
      const said = last ? `${last.who === 'blake' ? `${this.opponent()}: ` : ''}${OUTCOME_WORD[last.outcome]}${last.scored ? ' One point.' : ''}` : '';
      hint = this.anim ? '…' : slot?.participant === 'player' ? `${said ? `${said} ` : ''}Your kick: press, pull back, let go.` : slot ? `${said ? `${said} ` : ''}${this.opponent()} is shooting…` : said || 'Done.';
    } else if (n && this.state) {
      if (this.state.complete) {
        body = awaitingRelease(this.state) ? `Weeks 1–${SEASON_RELEASED_WEEKS} complete. More weeks are coming soon. ${this.recap()}` : `Chapter complete (weeks 1–4). ${this.recap()}`;
        acts.push({ name: 'story-done', label: 'Back to menu', onClick: () => this.goStart() });
      } else if (n.type === 'line') {
        this.speaker.setText(n.speaker === 'System' ? '' : n.speaker === 'Player' ? this.name() : n.speaker);
        const full = this.fullText();
        body = this.state.revealed || instantText ? full : full.slice(0, this.typed);
        if (this.state.revealed || instantText) this.typed = full.length;
        hint = 'Tap to continue';
      } else if (n.type === 'choice') {
        body = 'What do you do?';
        for (const o of n.options) acts.push({ name: `choice-${o.id}`, label: o.label, onClick: () => void this.choose(o.id) });
      } else if (n.type === 'activity_handoff') {
        this.handoffUi(n, acts, (t) => (body = t));
      }
      const r = this.recap();
      if (r && !this.state.complete) hint = hint ? `${r}\n${hint}` : r;
    }
    this.body.setText(this.mode === 'story' && n?.type === 'line' && !(this.state?.revealed || instantText) ? body : body);
    this.info.setText(this.message);
    this.hint.setText(hint);
    this.setActions(acts);
    // The log keeps its newest lines when the oldest ones would run under the buttons.
    while (!this.layoutText() && log && log.length > 1) {
      log.shift();
      this.body.setText(log.join('\n'));
    }
  }

  private shotLog(): string {
    const c = this.contest;
    if (!c) return '';
    const done = c.attempts.filter((a) => a.state === 'resolved').slice(-6);
    if (!done.length) return 'No shots yet.';
    return done.map((a) => `${a.participant === 'player' ? this.name() : this.opponent()}${a.round === 'warmup' ? ' (warm-up)' : ''}: ${OUTCOME_WORD[describeShot(simulateShot(a.input))]}`).join('\n');
  }

  private handoffUi(n: Extract<StoryNode, { type: 'activity_handoff' }>, acts: Action[], setBody: (t: string) => void): void {
    const s = this.state!;
    const p = this.save?.player ?? null;
    switch (n.adapter) {
      case 'identity': {
        const g = this.gender ? `${this.gender === 'boy' ? 'Boy' : 'Girl'} (${PRONOUNS[this.gender].subject}/${PRONOUNS[this.gender].object})` : 'not chosen';
        setBody(`Name: ${this.pendingName || '—'}\nCharacter: ${g}${p ? '' : `\nPosition: ${POSITION_LABEL[this.position]}`}\nThis never changes your soccer skills.`);
        acts.push({ name: 'id-boy', label: 'Boy', onClick: () => ((this.gender = 'boy'), this.render()) }, { name: 'id-girl', label: 'Girl', onClick: () => ((this.gender = 'girl'), this.render()) });
        acts.push({ name: 'id-name', label: 'Enter name', onClick: () => this.askName() });
        if (!p) acts.push({ name: 'id-position', label: `Position: ${POSITION_LABEL[this.position]}`, onClick: () => ((this.position = this.position === 'DEF' ? 'MID' : this.position === 'MID' ? 'FWD' : 'DEF'), this.render()) });
        acts.push({ name: 'id-confirm', label: 'Confirm', onClick: () => void this.confirmIdentity() });
        return;
      }
      case 'crossbar': {
        const declined = s.sceneId.startsWith('S1_') ? evaluatePredicate(s, n.predicate) === false : s.decisions.W1_SCHOOL_02?.invitation === 'decline';
        if (declined) {
          setBody(s.sceneId === 'S1_W04_S' ? 'You picked Jungle Ball instead. No Crossbar score is recorded.' : this.state?.sceneId.startsWith('S1_') ? 'You walk away from the goal. No score is recorded.' : 'You head back with Jordan. No score is recorded.');
          acts.push({ name: 'handoff-continue', label: 'Continue', onClick: () => void this.decline() });
        } else {
          setBody(`Three counted shots each from the same spot.${this.crossbarWarmup() ? ' One warm-up shot each first (does not count).' : ''} Hit the crossbar to score.`);
          acts.push({ name: 'crossbar-start', label: 'Play crossbar challenge', onClick: () => void this.startCrossbar() });
        }
        return;
      }
      case 'training_arrangement':
        setBody('Set up home training: your space, equipment and time. (Home Training opens; come back with Back to story.)');
        acts.push({ name: 'handoff-career', label: 'Open Home Training setup', onClick: () => void this.openCareer('training_arrangement') });
        return;
      case 'weekly_focus':
        setBody(this.save?.focusId ? 'Your weekly focus is chosen in Home Training.' : 'Choose this week\'s learning focus in Home Training.');
        acts.push({ name: 'handoff-career', label: 'Choose weekly focus', onClick: () => void this.openCareer('weekly_focus') });
        return;
      case 'practice':
        setBody('Do one scheduled session from your plan and log it in Home Training. Credit follows the usual rule: one per scheduled session.');
        acts.push({ name: 'handoff-career', label: 'Open my training plan', onClick: () => void this.openCareer('practice') });
        acts.push({ name: 'handoff-skip', label: 'Not this week', onClick: () => void this.skipRun('declined') });
        return;
      case 'assignment':
        setBody(p ? `Coach Code: "You'll start as ${POSITION_LABEL[p.position]} (${POSITION_SLOT[p.position]} in the 1-3-2-3). Ask if anything is unclear."` : 'Create your player first.');
        acts.push({ name: 'handoff-continue', label: 'Got it', onClick: () => void this.assignment() });
        return;
      case 'match':
        {
          const week = this.storyWeek() ?? this.save?.week ?? 1;
          const f = fixtureForWeek(week);
          const club = (id: string): string => CLUB_WORLD.clubs.find((c) => c.id === id)?.displayName ?? id;
          setBody(`${f ? `Week ${week} league match: ${club(f.home)} vs ${club(f.away)}.` : `Week ${week} match.`} A full 9v9 game with your usual controls. Your play becomes evidence for growth, as always.`);
        }
        acts.push({ name: 'handoff-match', label: 'Play the match', onClick: () => void this.openCareer('match') });
        acts.push({ name: 'handoff-skip', label: 'Skip the match', onClick: () => void this.skipRun('declined') });
        return;
      case 'team_training':
        setBody(`This week's Team Training (career week ${this.save?.week ?? 1}): three situations from the team's logic catalog. Same rules as always: up to +2 attribute points for a good week, one per week.`);
        acts.push({ name: 'handoff-career', label: 'Open Team Training', onClick: () => void this.openCareer('team_training') });
        acts.push({ name: 'handoff-skip', label: 'Not this week', onClick: () => void this.skipRun('declined') });
        return;
      case 'league_match': {
        const week = this.seasonWeekNo() ?? 0;
        const f = fixtureForSeasonWeek(week);
        const game = seasonWeek(week)?.leagueGame ?? 0;
        setBody(`${f ? `League game ${game} of 12: Batavia vs ${clubName(opponentOf(f))} (${f.home === 'batavia' ? 'home' : 'away'}).` : 'League match.'} A full 9v9 game with your usual controls. Skipping leaves the game unplayed, never a loss.`);
        acts.push({ name: 'handoff-match', label: 'Play the match', onClick: () => void this.openCareer('league_match') });
        acts.push({ name: 'handoff-skip', label: 'Skip the match', onClick: () => void this.skipRun('declined') });
        return;
      }
      case 'tournament_match': {
        const tid = this.tournamentId();
        setBody(`${tid ? TOURNAMENTS[tid].name : 'Tournament'}: ${this.tournamentSummary || 'next game'}\nA full 9v9 game. Tournament results never count in the league table.`);
        acts.push({ name: 'handoff-match', label: 'Play the game', onClick: () => void this.openCareer('tournament_match') });
        acts.push({ name: 'handoff-skip', label: 'Withdraw', onClick: () => void this.skipRun('declined') });
        return;
      }
      case 'standings':
        setBody(this.standingsText());
        acts.push({ name: 'handoff-continue', label: 'Continue', onClick: () => void this.finishStandings() });
        return;
      case 'jungle':
        // A Season One Jungle Ball the player did not pick (week 4 school choice) is recorded as declined; never offered.
        if (s.sceneId.startsWith('S1_') && evaluatePredicate(s, n.predicate) === false) {
          setBody('You picked the Crossbar Challenge instead. No Jungle Ball score is recorded.');
          acts.push({ name: 'handoff-continue', label: 'Continue', onClick: () => void this.decline() });
          return;
        }
        setBody('Jungle Ball at lunch: one goal, a neutral keeper, you against Alex, Blake and Sam. Just for fun: scores never count as match growth.');
        acts.push({ name: 'handoff-jungle', label: 'Play Jungle Ball', onClick: () => void this.openJungle() });
        acts.push({ name: 'handoff-skip', label: 'Not today', onClick: () => void this.skipRun('declined') });
        return;
      case 'home_learning':
        setBody("Coach Code checks last week's home learning against your saved training record.");
        acts.push({ name: 'handoff-continue', label: 'Continue', onClick: () => void this.finishFact(this.save ? homeLearningDetail(this.save) : 'unknown') });
        return;
      case 'training_log':
        setBody("Mom looks at this week's training log.");
        acts.push({ name: 'handoff-continue', label: 'Continue', onClick: () => void this.finishFact(this.save ? trainingLogDetail(this.save) : 'unknown') });
        return;
      case 'school_reward':
        setBody('School activity attribute change: not configured yet (owner decision pending). No attribute changes.');
        acts.push({ name: 'handoff-continue', label: 'Continue', onClick: () => void this.finishFact(schoolRewardDetail()) });
        return;
      case 'week_close':
        setBody((this.save?.week ?? 1) >= SEASON_RELEASED_WEEKS
          ? `Finish week ${this.save?.week ?? 1}: your week review is saved. More weeks are coming soon.`
          : `Finish week ${this.save?.week ?? 1}: your week review is saved and week ${(this.save?.week ?? 1) + 1} opens.`);
        acts.push({ name: 'handoff-week', label: `Finish week ${this.save?.week ?? 1}`, onClick: () => void this.closeWeek() });
        return;
    }
  }

  /** Records a fact read from saved records (never from choices) and moves on. */
  private async finishFact(detail: string): Promise<void> {
    if (!this.fresh()) return;
    this.busy = true;
    const run = await this.launch();
    if (run) await this.complete(run, 'completed', null, detail);
    this.busy = false;
    this.render();
  }

  private async finishStandings(): Promise<void> {
    if (!this.fresh()) return;
    this.busy = true;
    const run = await this.launch();
    // The season ending reads this detail, so "complete" always means all 12 league results and both cup placings.
    const detail = run && this.state?.sceneId.startsWith('S1_') ? ((await this.seasonComplete()) ? 'season_complete' : 'season_incomplete') : null;
    if (run) await this.complete(run, 'completed', null, detail);
    this.busy = false;
    this.render();
  }

  private standingsText(): string {
    return this.seasonSummary || 'No league result recorded yet.';
  }

  private async skipRun(outcome: 'declined'): Promise<void> {
    if (!this.fresh()) return;
    this.busy = true;
    const run = await this.launch();
    const adapter = this.node()?.type === 'activity_handoff' ? (this.node() as { adapter?: string }).adapter : undefined;
    if (run && adapter === 'match') await this.recordLeague(null);
    if (run && adapter === 'league_match' && !(await this.skipSeasonLeague())) {
      this.message = 'The league table could not be saved. Nothing was changed.';
      this.busy = false;
      return this.render();
    }
    if (run) await this.complete(run, outcome);
    this.busy = false;
    this.render();
  }

  private lineFor(sceneId: string, nodeId: string): string {
    const s = this.state && sceneId ? this.sceneNode(sceneId, nodeId) : null;
    if (!s || s.type !== 'line') return '';
    return `${s.speaker === 'System' ? '' : `${s.speaker === 'Player' ? this.name() : s.speaker}: `}${this.say(s.text)}`;
  }

  private sceneNode(sceneId: string, nodeId: string): StoryNode | null {
    return currentNode({ ...this.state!, sceneId, nodeId });
  }

  private background(): Background {
    const n = this.state ? currentNode(this.state) : null;
    void n;
    const id = this.state?.sceneId ?? '';
    const authored = id.startsWith('S1_') ? sceneById(id)?.background : undefined;
    if (authored) return authored === 'aquarium' ? 'neutral_home' : authored === 'neutral_pitch' || authored === 'neutral_home' ? authored : 'neutral_school';
    if (/HOME|CLOSE_WEEK/.test(id)) return 'neutral_home';
    if (/TRAINING|PRACTICE|MATCH|FOCUS/.test(id)) return 'neutral_pitch';
    return 'neutral_school';
  }

  private drawStage(): void {
    const { width } = this.scale;
    const g = this.bg;
    g.clear();
    const bgk = this.mode === 'crossbar' ? 'neutral_school' : this.background();
    const stageH = this.panel.y;
    const n = this.node();
    const art = this.art!;
    const xbar = this.mode === 'crossbar';
    this.xview = xbar ? crossbarView({ x: 0, y: 58, width, height: Math.max(80, stageH - 64) }, { x: 0, y: 0, width, height: stageH }) : null;
    art.update({
      sceneId: this.mode === 'story' || this.mode === 'crossbar' ? (this.state?.sceneId ?? null) : null,
      appearance: this.gender,
      speaker: this.mode === 'story' && n?.type === 'line' ? n.speaker : null,
      showCast: this.mode === 'story' && (n?.type === 'line' || n?.type === 'choice'),
      width,
      height: this.scale.height,
      top: 58,
      panelY: this.panel.y,
      backgroundOverride: xbar ? 'crossbar-schoolyard' : this.mode === 'story' && n?.type === 'activity_handoff' && n.adapter === 'standings' ? 'league-standings' : null,
      backdropPlacement: this.xview?.backdrop ?? null,
    });
    if (art.hasBackdrop) {
      // Supplied Graphics v1 backdrop is on screen; the code-drawn one is only the fallback.
    } else if (bgk === 'neutral_home') {
      g.fillStyle(PALETTE.sand, 1).fillRect(0, 0, width, stageH);
      g.fillStyle(PALETTE.peach, 1).fillRect(0, stageH * 0.72, width, stageH * 0.28);
      g.fillStyle(PALETTE.skyBottom, 1).fillRect(width * 0.08, stageH * 0.12, width * 0.22, stageH * 0.34);
      g.lineStyle(4, PALETTE.ink, 1).strokeRect(width * 0.08, stageH * 0.12, width * 0.22, stageH * 0.34);
      // Aquarium with a clownfish.
      g.fillStyle(PALETTE.blue, 0.55).fillRect(width * 0.66, stageH * 0.46, width * 0.24, stageH * 0.24);
      g.lineStyle(3, PALETTE.ink, 1).strokeRect(width * 0.66, stageH * 0.46, width * 0.24, stageH * 0.24);
      g.fillStyle(PALETTE.tomato, 1).fillEllipse(width * 0.77, stageH * 0.58, width * 0.04, stageH * 0.05);
      g.fillStyle(PALETTE.cream, 1).fillRect(width * 0.765, stageH * 0.555, width * 0.006, stageH * 0.05);
    } else if (bgk === 'neutral_pitch') {
      g.fillGradientStyle(PALETTE.skyTop, PALETTE.skyTop, PALETTE.skyBottom, PALETTE.skyBottom, 1).fillRect(0, 0, width, stageH * 0.45);
      g.fillStyle(PALETTE.grassLight, 1).fillRect(0, stageH * 0.45, width, stageH * 0.55);
      g.lineStyle(3, PALETTE.line, 1).lineBetween(0, stageH * 0.7, width, stageH * 0.7);
    } else {
      g.fillGradientStyle(PALETTE.skyTop, PALETTE.skyTop, PALETTE.skyBottom, PALETTE.skyBottom, 1).fillRect(0, 0, width, stageH * 0.5);
      g.fillStyle(PALETTE.tomatoDark, 1).fillRect(0, stageH * 0.18, width * 0.45, stageH * 0.32);
      g.fillStyle(PALETTE.grassDark, 1).fillRect(0, stageH * 0.5, width, stageH * 0.5);
    }
    const pg = this.panelG;
    pg.clear();
    pg.fillStyle(PALETTE.cream, 0.96).fillRoundedRect(this.panel.x, this.panel.y, this.panel.width, this.panel.height, 14);
    pg.lineStyle(3, PALETTE.ink, 1).strokeRoundedRect(this.panel.x, this.panel.y, this.panel.width, this.panel.height, 14);
    const s = this.stage;
    s.clear();
    if (this.mode === 'story' && n?.type === 'line' && n.speaker !== 'System' && !art.hasCast) {
      // Code-drawn portrait: head, hair and a coloured shirt per speaker.
      const cx = width * 0.5;
      const r = Math.min(stageH * 0.22, width * 0.14);
      // Shirt bottom rests on the panel's top edge so the figure never covers the dialogue.
      const cy = stageH - r * 2.25;
      s.fillStyle(SPEAKER_COLOR[n.speaker] ?? PALETTE.blueDark, 1).fillRoundedRect(cx - r * 1.2, cy + r * 0.8, r * 2.4, r * 1.4, r * 0.4);
      s.fillStyle(PALETTE.skin, 1).fillCircle(cx, cy, r);
      s.fillStyle(PALETTE.hair, 1).fillEllipse(cx, cy - r * 0.6, r * 2, r * 0.9);
      s.fillStyle(PALETTE.ink, 1).fillCircle(cx - r * 0.35, cy + r * 0.05, r * 0.1).fillCircle(cx + r * 0.35, cy + r * 0.05, r * 0.1);
      s.lineStyle(3, PALETTE.ink, 1).strokeCircle(cx, cy, r);
    }
    if (this.mode === 'crossbar') this.drawCrossbar(s, width, stageH);
  }

  private drawCrossbar(s: Phaser.GameObjects.Graphics, width: number, stageH: number): void {
    const v = this.xview;
    if (!v) return;
    const g = goalGeometry(v);
    const proj = v.proj;
    const C = CROSSBAR;
    const half = C.goalWidth / 2;
    const gy = C.spotDistance;
    const lw = g.postWidth;
    // Net first (behind the frame): back frame, side panels and a mesh, all from the same goal model.
    s.fillStyle(PALETTE.net, 0.18).fillPoints([g.leftTop, g.rightTop, g.rearRightTop, g.rearLeftTop], true);
    s.fillStyle(PALETTE.net, 0.14).fillPoints([g.rearLeftTop, g.rearRightTop, g.rearRightBase, g.rearLeftBase], true);
    s.lineStyle(1, PALETTE.cream, 0.45);
    for (let i = 1; i < 12; i++) {
      const x = -half + (C.goalWidth * i) / 12;
      const a = proj(x, gy, C.barHeight);
      const b = proj(x, gy + 0.8, C.barHeight * 0.85);
      const c = proj(x, gy + 1.4, 0);
      s.lineBetween(a.x, a.y, b.x, b.y).lineBetween(b.x, b.y, c.x, c.y);
    }
    for (let j = 1; j < 6; j++) {
      const z = (C.barHeight * 0.85 * j) / 6;
      const t = j / 6;
      const l = proj(-half, gy + 1.4 - 0.6 * t, z);
      const r = proj(half, gy + 1.4 - 0.6 * t, z);
      s.lineBetween(l.x, l.y, r.x, r.y);
    }
    s.lineStyle(Math.max(2, lw * 0.5), PALETTE.cream, 0.8)
      .lineBetween(g.leftTop.x, g.leftTop.y, g.rearLeftTop.x, g.rearLeftTop.y)
      .lineBetween(g.rightTop.x, g.rightTop.y, g.rearRightTop.x, g.rearRightTop.y)
      .lineBetween(g.rearLeftTop.x, g.rearLeftTop.y, g.rearRightTop.x, g.rearRightTop.y)
      .lineBetween(g.rearLeftTop.x, g.rearLeftTop.y, g.rearLeftBase.x, g.rearLeftBase.y)
      .lineBetween(g.rearRightTop.x, g.rearRightTop.y, g.rearRightBase.x, g.rearRightBase.y)
      .lineBetween(g.leftBase.x, g.leftBase.y, g.rearLeftBase.x, g.rearLeftBase.y)
      .lineBetween(g.rightBase.x, g.rightBase.y, g.rearRightBase.x, g.rearRightBase.y);
    // Grounded front frame: contact shadows where the posts meet the grass, then posts and the bar joined at the corners.
    s.fillStyle(PALETTE.shadow, 0.35).fillEllipse(g.leftBase.x, g.leftBase.y, lw * 3.2, lw * 1.1).fillEllipse(g.rightBase.x, g.rightBase.y, lw * 3.2, lw * 1.1);
    s.lineStyle(lw + 3, PALETTE.ink, 0.85)
      .lineBetween(g.leftBase.x, g.leftBase.y, g.leftTop.x, g.leftTop.y)
      .lineBetween(g.leftTop.x, g.leftTop.y, g.rightTop.x, g.rightTop.y)
      .lineBetween(g.rightTop.x, g.rightTop.y, g.rightBase.x, g.rightBase.y);
    s.lineStyle(lw, PALETTE.cream, 1)
      .lineBetween(g.leftBase.x, g.leftBase.y, g.leftTop.x, g.leftTop.y)
      .lineBetween(g.leftTop.x, g.leftTop.y, g.rightTop.x, g.rightTop.y)
      .lineBetween(g.rightTop.x, g.rightTop.y, g.rightBase.x, g.rightBase.y);
    s.fillStyle(PALETTE.cream, 1).fillCircle(g.leftTop.x, g.leftTop.y, lw / 2).fillCircle(g.rightTop.x, g.rightTop.y, lw / 2);
    if (HIT_DEBUG) {
      // Diagnostic only (?debug&hitbox): the simulation's crossbar scoring band and goal-line span.
      s.fillStyle(PALETTE.tomato, 0.35).fillRect(g.leftTop.x, g.barBand.top, g.rightTop.x - g.leftTop.x, g.barBand.bottom - g.barBand.top);
      s.lineStyle(1, PALETTE.tomato, 1).lineBetween(g.leftBase.x, g.leftBase.y, g.rightBase.x, g.rightBase.y);
    }
    const spot = g.spot;
    let at: readonly [number, number, number] = [0, 0, C.ballRadius];
    if (this.anim) {
      const a = this.anim;
      // Presentation only: the result was decided by the fixed-step simulation before the flight started.
      const u = Math.min(1, (this.time.now - a.start) / a.dur) * (a.path.length - 1);
      const i = Math.min(a.path.length - 2, Math.floor(u));
      const p0 = a.path[Math.max(0, i)]!;
      const p1 = a.path[Math.max(0, i + 1)] ?? p0;
      const f = Math.max(0, Math.min(1, u - i));
      at = [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f, p0[2] + (p1[2] - p0[2]) * f];
    }
    const ball = proj(at[0], at[1], at[2]);
    const sh = proj(at[0], at[1], 0);
    const br = Math.max(4, C.ballRadius * ball.k);
    s.fillStyle(PALETTE.line, 0.9).fillEllipse(spot.x, spot.y, br * 2.6, br * 0.9);
    s.fillStyle(PALETTE.shadow, 0.35).fillEllipse(sh.x, sh.y + br * 0.3, br * 2.2, br * 0.8);
    // A ball in front of the goal line is drawn over the frame; behind it, the bar already sits in front.
    s.fillStyle(PALETTE.cream, 1).fillCircle(ball.x, ball.y, br);
    s.lineStyle(2, PALETTE.ink, 1).strokeCircle(ball.x, ball.y, br);
    const p = this.pull;
    if (p && !p.inCancel && this.aimFrom) {
      const room = Math.max(60, stageH - 64);
      const len = 40 + p.power * room * 0.4;
      s.lineStyle(5, PALETTE.mustard, 1).lineBetween(spot.x, spot.y, spot.x + p.dirX * len, spot.y + p.dirY * len);
      const mTop = 64 + room * 0.1;
      const mH = room * 0.8;
      s.fillStyle(PALETTE.mustardDark, 1).fillRect(width * 0.92, mTop + mH * (1 - p.power), width * 0.035, mH * p.power);
      s.lineStyle(2, PALETTE.ink, 1).strokeRect(width * 0.92, mTop, width * 0.035, mH);
    }
  }

  private layout(): void {
    const { width, height } = this.scale;
    const portrait = orientationOf({ width, height }) === 'portrait';
    const pad = 10;
    const topH = 44;
    const tw = Math.round(Math.min((width - pad * 5) / 4, 140));
    this.top.forEach((b, i) => b.resize(tw, 40, Math.round(Math.max(13, Math.min(tw * 0.13, 16)))).setPosition(pad + tw / 2 + i * (tw + pad), pad + topH / 2 - 2));
    this.pauseBtn?.resize(Math.max(tw, 96), 44, Math.round(Math.max(14, Math.min(tw * 0.14, 17)))).setPosition(pad + Math.max(tw, 96) / 2, pad + topH / 2);
    const ph = Math.round(portrait ? height * 0.5 : height * 0.46);
    this.panel = { x: pad, y: height - ph - pad, width: width - 2 * pad, height: ph };
    if (this.panel.y < topH + pad * 2) this.panel = { ...this.panel, y: topH + pad * 2, height: height - topH - pad * 3 };
    this.basePanel = { ...this.panel };
    this.render();
  }

  private layoutText(): boolean {
    const { width, height } = this.scale;
    const x = this.panel.x + 16;
    const w = this.panel.width - 32;
    // Shrink the text (never below 14 px) until it clears the buttons; the panel never overlaps them.
    let fs = Math.round(Math.max(17, Math.min(Math.min(width, height) * 0.05, 24)));
    const fits = () => this.hint.y + this.hint.height <= this.actionsTop - 6;
    for (; fs > 14; fs--) {
      this.placeText(fs, x, w);
      if (fits()) return true;
    }
    this.placeText(fs, x, w);
    if (fits()) return true;
    // Still too tall: grow the panel upward (never under the top bar) and redraw the stage above it.
    const bottom = this.panel.y + this.panel.height;
    const need = this.hint.y + this.hint.height - this.panel.y + (bottom - this.actionsTop) + 18;
    const y = Math.max(64, bottom - need);
    this.panel = { ...this.panel, y, height: bottom - y };
    this.drawStage();
    this.placeText(fs, x, w);
    return fits();
  }

  private placeText(fs: number, x: number, w: number): void {
    this.speaker.setFontSize(fs).setPosition(x, this.panel.y - fs * 1.6).setBackgroundColor(this.speaker.text ? CSS.blue : '').setPadding(8, 4, 8, 4);
    this.body.setFontSize(fs).setWordWrapWidth(w, true).setLineSpacing(4).setPosition(x, this.panel.y + 12);
    this.info.setFontSize(Math.round(fs * 0.8)).setColor(CSS.tomato).setWordWrapWidth(w, true).setPosition(x, this.body.y + this.body.height + 6);
    this.hint.setFontSize(Math.round(fs * 0.75)).setWordWrapWidth(w, true).setPosition(x, this.info.y + this.info.height + 4);
  }

  private onResize(): void {
    this.aimFrom = null;
    this.pull = null;
    this.layout();
  }

  private goStart(): void {
    if (this.navigating) return;
    this.navigating = true;
    this.scene.start(SceneKeys.Start);
  }

  private onShutdown(): void {
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.onBlur, this);
    this.epoch++;
    this.paused = false;
    this.clearActions();
    this.art?.destroy();
    this.art = null;
    this.store?.close();
    this.store = null;
  }

  describeLayout(): SceneLayoutReport {
    const top = this.body.y;
    const bottom = Math.max(this.body.y + this.body.height, this.hint.y + (this.hint.text ? this.hint.height : 0));
    const elements: Record<string, Rect> = { panel: this.panel, 'story-text': { x: this.body.x, y: top, width: this.panel.width - 32, height: bottom - top } };
    for (const b of [...this.top, ...(this.pauseBtn ? [this.pauseBtn] : []), ...this.actions]) if (b.visible) elements[b.name] = b.getButtonBounds();
    return { orientation: orientationOf(this.scale), viewport: { width: this.scale.width, height: this.scale.height }, elements };
  }

  describeGameplay(): unknown {
    const s = this.state;
    const n = this.node();
    const c = this.contest;
    return {
      mode: this.mode,
      art: this.art?.describe() ?? null,
      scene: s?.sceneId ?? null,
      node: s?.nodeId ?? null,
      type: n?.type ?? null,
      adapter: n?.type === 'activity_handoff' ? n.adapter : null,
      revision: s?.revision ?? 0,
      revealed: s?.revealed ?? false,
      complete: s?.complete ?? false,
      speaker: this.speaker?.text ?? '',
      text: this.body?.text ?? '',
      message: this.message,
      hint: this.hint?.text ?? '',
      buttons: this.actions.map((b) => b.name),
      decisions: s?.decisions ?? {},
      outcomes: s ? Object.values(s.runs).map((r) => ({ scene: r.sceneId, state: r.state, outcome: r.outcome, result: r.result })) : [],
      completedScenes: s?.completedScenes.length ?? 0,
      transcript: s?.transcript.length ?? 0,
      player: this.save?.player ? { name: this.save.player.name, gender: this.save.player.gender ?? null } : null,
      crossbar: c ? { status: c.status, next: nextSlot(c), player: points(c, 'player'), blake: points(c, 'blake'), attempts: c.attempts.length, animating: this.anim !== null, ready: this.kickReady(), paused: this.paused, last: this.lastShot, goal: this.xview ? goalGeometry(this.xview) : null } : null,
    };
  }
}
