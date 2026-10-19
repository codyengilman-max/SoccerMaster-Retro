import Phaser from 'phaser';
import { fixtureForWeek, newLeague, parseLeague, recordPlayed, simulateThrough, table } from '../game/league/league';
import { DRAFT_SCENES } from '../game/story/content';
import { seasonWeek, type TournamentId } from '../game/season/calendar';
import { bataviaRecord, fixtureForSeasonWeek, newSeasonLeague, opponentOf, parseSeasonLeague, recordSeasonPlayed, seasonTable, simulateSeasonThrough } from '../game/season/league';
import { TOURNAMENTS, bataviaFinish, groupTable, nextBataviaFixture, newTournament, parseTournament, playoffs, recordTournamentPlayed, type TournamentState } from '../game/season/tournament';
import { CLUB_WORLD } from '../game/story/clubs';
import type { Rect } from '../game';
import { POSITION_SLOT } from '../game/career/player';
import type { CareerSave } from '../game/career/state';
import { CareerStore } from '../game/career/store';
import type { Position } from '../game/career/types';
import { type Background, type StoryNode } from '../game/story/content';
import { attemptKey, contestResult, launchAttempt, newContest, nextSlot, opponentKick, points, resolveAttempt, restoreContest, simulateShot, type Contest, type KickInput, type Participant } from '../game/story/crossbar';
import { PRONOUNS, renderText, validateName, type Gender } from '../game/story/identity';
import { createSession, currentNode, outcomeOf, type StoryCommand, type StoryOutcome, type StorySession, type StoryState } from '../game/story/runtime';
import { StoryStore } from '../game/story/store';
import { pullFor, thresholdsFor, type Pull } from '../input';
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
type Mode = 'loading' | 'error' | 'story' | 'crossbar' | 'transcript';
type Cmd = StoryCommand extends infer C ? (C extends StoryCommand ? Omit<C, 'revision'> : never) : never;
interface Action { readonly name: string; readonly label: string; readonly onClick: () => void }

let instantText = false;

const FINISH_LABEL: Record<string, string> = { champion: 'Champions', shared_champion: 'Shared champions (drawn final, no shoot-out)', runner_up: 'Runners-up', third: 'Third', shared_third: 'Shared third (drawn placement game)', fourth: 'Fourth' };
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
  private anim: { path: readonly (readonly [number, number, number])[]; start: number; dur: number; who: Participant; scored: boolean } | null = null;
  private aimFrom: { x: number; y: number } | null = null;
  private pull: Pull | null = null;
  private crossbarSummary = '';
  private leagueSummary = '';
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

  create(): void {
    this.mode = 'loading';
    this.busy = false;
    this.navigating = false;
    this.message = '';
    this.nodeKey = '';
    this.contest = null;
    this.anim = null;
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
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.layout();
    void this.boot();
  }

  private async boot(): Promise<void> {
    this.career = await CareerStore.open();
    this.save = await this.career.load();
    this.store = await StoryStore.open();
    const begun = await this.store.begin(CAREER_ID);
    if (!begun.ok) return this.fail(begun.error);
    this.state = begun.state;
    this.session = createSession('live', (c) => this.store!.dispatch(CAREER_ID, c));
    this.gender = this.save.player?.gender ?? null;
    this.pendingName = this.save.player?.name ?? '';
    if (this.save.player) this.position = this.save.player.position;
    this.mode = 'story';
    await this.loadSummaries();
    await this.resumeHandoff();
    this.render();
  }

  private fail(error: string): void {
    this.mode = 'error';
    this.message = error;
    this.render();
  }

  private async send(c: Cmd): Promise<StoryOutcome> {
    if (!this.session || !this.state) return { ok: false, error: 'not ready' };
    const r = await this.session.dispatch({ ...c, revision: this.state.revision } as StoryCommand);
    if (r.ok) this.state = r.state;
    else {
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
    if (this.mode === 'crossbar' && this.kickReady() && p.y > 60) this.aimFrom = { x: p.x, y: p.y };
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
    if ((await this.store.getRecord(`run:${run}`)) === undefined) {
      const s = this.save;
      const snap: Snapshot = { revision: s.revision, sessions: s.completedSessions.length, batches: s.batches.length, week: s.week };
      await this.store.putRecord(`run:${run}`, snap);
    }
    this.navigating = true;
    if (MATCH_ADAPTERS.includes(kind)) this.scene.start(SceneKeys.Formation, { career: true, returnTo: 'story', resultKey: run });
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
      const rec = (await this.store.getRecord(`jungle:${run.runId}`)) as { status?: string } | undefined;
      if (rec) await this.complete(run.runId, rec.status === 'completed' ? 'completed' : 'abandoned');
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
      const t = await this.recordTournament(full);
      if (!t) return void (this.message = 'This tournament result could not be recorded. Nothing was changed.');
      return this.complete(run.runId, 'completed', resultOf(full), t.detail);
    }
    await this.complete(run.runId, 'completed');
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

  /** This week's Batavia league fixture counts once; other clubs are simulated through its round. */
  private async recordSeasonLeague(score: { home: number; away: number }): Promise<boolean> {
    const week = this.seasonWeekNo();
    const f = week === null ? null : fixtureForSeasonWeek(week);
    if (!f || !this.store || !this.state) return false;
    const r = recordSeasonPlayed(await this.seasonLeague(), f.id, score.home, score.away);
    if (!r.ok) return false;
    await this.store.putRecord(`league-s1:${this.state.careerId}`, simulateSeasonThrough(r.state, f.round));
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
  private async recordTournament(score: { home: number; away: number }): Promise<{ detail: string | null } | null> {
    const t = await this.tournament();
    const f = t ? nextBataviaFixture(t) : null;
    if (!t || !f || !this.store || !this.state) return null;
    const r = recordTournamentPlayed(t, f.id, score.home, score.away);
    if (!r.ok) return null;
    await this.store.putRecord(`tourney-s1:${this.state.careerId}:${t.id}`, r.state);
    const finish = bataviaFinish(r.state);
    if (finish) return { detail: finish };
    const po = playoffs(r.state);
    if (po) return { detail: po.final.home === 'batavia' || po.final.away === 'batavia' ? 'final' : 'placement' };
    return { detail: null };
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

  private async enterCrossbar(runId: string): Promise<void> {
    if (!this.store || !this.state) return;
    this.runId = runId;
    const inv = this.state.decisions.W1_SCHOOL_02?.invitation;
    let c = restoreContest(await this.store.getRecord(`crossbar:${runId}`)) ?? newContest(runId, inv === 'accept' || inv === 'shared_warmup');
    if (c.status === 'interrupted') return this.complete(runId, 'interrupted');
    if (c.attempts.some((a) => a.state === 'launched')) {
      const r = resolveAttempt(c);
      if (r.ok) c = r.contest;
    }
    await this.store.putRecord(`crossbar:${runId}`, c);
    this.contest = c;
    this.mode = 'crossbar';
    this.message = '';
    this.nodeShownAt = this.time.now;
    this.afterShot();
  }

  private playerTurn(): boolean {
    return !!this.contest && nextSlot(this.contest)?.participant === 'player';
  }

  private kickReady(): boolean {
    return this.mode === 'crossbar' && !this.busy && !this.anim && this.playerTurn();
  }

  private async shoot(who: Participant, input: KickInput): Promise<void> {
    if (!this.contest || !this.store || this.anim || this.busy) return;
    const l = launchAttempt(this.contest, who, input);
    if (!l.ok) return;
    this.busy = true;
    // Freeze the launch input before simulating, so a reload replays this exact attempt.
    if (!(await this.store.putRecord(`crossbar:${this.runId}`, l.contest))) {
      this.busy = false;
      this.message = 'Save failed; that kick did not count.';
      return this.render();
    }
    const r = resolveAttempt(l.contest);
    if (!r.ok) return void (this.busy = false);
    // Start the flight before the turn passes, so the next kicker never sees a turn that is not open yet.
    const shot = simulateShot(input);
    this.anim = { path: shot.path, start: this.time.now, dur: Math.max(400, shot.time * 1000), who, scored: shot.scored };
    this.contest = r.contest;
    this.message = '';
    this.render();
    // The launch record above already makes a reload replay this exact attempt if this write is lost.
    await this.store.putRecord(`crossbar:${this.runId}`, r.contest);
    this.busy = false;
    this.render();
  }

  private afterShot(): void {
    const c = this.contest;
    if (!c) return;
    const result = contestResult(c);
    if (result) {
      this.time.delayedCall(900, () => void this.complete(this.runId, 'completed', result).then(() => this.render()));
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
    // Leaving before a result is ABANDONED: never a loss, and it cannot be replaced by a reward-bearing retry.
    await this.complete(this.runId, 'abandoned');
    this.render();
  }

  private async loadSummaries(): Promise<void> {
    if (!this.state || !this.store) return;
    const league = parseLeague(await this.store.getRecord(`league:${this.state.careerId}`));
    const names = Object.fromEntries(CLUB_WORLD.clubs.map((c) => [c.id, c.displayName]));
    this.leagueSummary = league.ok
      ? `League table (other clubs' games are simulated):\n${table(league.value, names).map((r) => `${r.position}. ${names[r.club] ?? r.club}  P${r.played} ${r.points} pts`).join('\n')}`
      : 'League table: no league result recorded yet (a match left early counts for nobody).';
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
      const g = groupTable(t);
      const next = nextBataviaFixture(t);
      const finish = bataviaFinish(t);
      const tname = (id: string): string => TOURNAMENTS[t.id].names[id] ?? id;
      lines.push('', `${TOURNAMENTS[t.id].name} group:`, ...g.rows.map((r) => `${r.position}. ${tname(r.team)}  P${r.played} ${r.points} pts GD ${r.goalsFor - r.goalsAgainst}`));
      if (finish) lines.push(`Final place: ${FINISH_LABEL[finish]}`);
      if (next) this.tournamentSummary = `${next.stage === 'final' ? 'Championship game' : next.stage === 'placement' ? 'Placement game (3rd/4th)' : `Group game ${next.stage.slice(2)}`} vs ${tname(next.home === 'batavia' ? next.away : next.home)}.`;
      lines.push('Tournament results do not count in the league.');
    }
    this.seasonSummary = lines.join('\n');
  }

  /** Factual recap from committed evidence only (shown on result scenes). */
  private recap(): string {
    const s = this.state;
    if (!s) return '';
    const draft = 'Draft dialogue (weeks 2–4), awaiting owner review.';
    if (/^W[234]_(MATCH_POST|FINAL)$/.test(s.sceneId)) return `${this.leagueSummary}\n${draft}`;
    if (DRAFT_SCENES.has(s.sceneId)) return draft;
    if (s.sceneId === 'W1_CROSSBAR_REACTION' || s.sceneId === 'W1_TRAINING_CONNECTION') return this.crossbarSummary;
    if (s.sceneId === 'W1_TRAINING_REFLECTION' || s.sceneId === 'W1_MATCH_POST' || s.sceneId === 'W1_HOME_CLOSE' || s.sceneId === 'W2_SCHOOL_CALLBACK') {
      const practice = outcomeOf(s, 'W1_PRACTICE');
      const match = outcomeOf(s, 'W1_MATCH');
      const parts = [practice ? `Practice: ${practice.outcome === 'completed' ? 'one scheduled session logged' : 'not done'}` : '', match ? `Match: ${match.outcome === 'completed' ? 'played' : 'not played'}` : ''].filter(Boolean);
      const recap = parts.join(' · ');
      return s.sceneId === 'W1_MATCH_POST' ? `${recap}\n${this.leagueSummary}` : recap;
    }
    return '';
  }

  // ---- rendering ----

  private fullText(): string {
    const n = this.node();
    return n?.type === 'line' ? renderText(n.text, this.name()) : '';
  }

  override update(time: number): void {
    if (this.mode === 'story' && this.state && !this.state.revealed && !instantText) {
      const full = this.fullText();
      if (this.typed < full.length) {
        this.typed = Math.min(full.length, Math.floor((time - this.nodeShownAt) / 22));
        this.body.setText(full.slice(0, this.typed));
      }
    }
    if (this.anim) {
      this.drawStage();
      if (time - this.anim.start >= this.anim.dur + 500 && !this.busy) {
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
    if (this.mode === 'crossbar') {
      // A short panel leaves the goal and the kicking spot a clear stage under the top bar.
      const h = Math.round(Math.min(this.basePanel.height, this.scale.height * 0.34));
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
      acts.push({ name: 'story-back', label: 'Back to menu', onClick: () => this.goStart() });
    } else if (this.mode === 'transcript') {
      log = (this.state?.transcript ?? []).map((t) => this.lineFor(t.sceneId, t.nodeId)).filter(Boolean).slice(-8);
      body = log.join('\n');
      acts.push({ name: 'story-log-close', label: 'Close log', onClick: () => this.toggleTranscript() });
    } else if (this.mode === 'crossbar' && this.contest) {
      const c = this.contest;
      const slot = nextSlot(c);
      const main = c.attempts.filter((a) => a.round === 'main' && a.participant === 'player').length;
      body = `${this.name()} ${points(c, 'player')} · Blake ${points(c, 'blake')}`;
      hint = this.anim ? (this.anim.scored ? 'Crossbar! One point.' : 'No point.') : slot?.participant === 'player' ? `${slot.round === 'warmup' ? 'Warm-up shot (does not count)' : slot.round === 'sudden' ? 'Sudden death' : `Your shot ${main + 1} of 3`}: press and pull back, release to kick.` : slot ? 'Blake is shooting…' : 'Done.';
      acts.push({ name: 'crossbar-leave', label: 'Leave (no result)', onClick: () => void this.leaveCrossbar() });
    } else if (n && this.state) {
      if (this.state.complete) {
        body = `Chapter complete (weeks 1–4). ${this.recap()}`;
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
        const inv = s.decisions.W1_SCHOOL_02?.invitation;
        if (inv === 'decline') {
          setBody('You head back with Jordan. No score is recorded.');
          acts.push({ name: 'handoff-continue', label: 'Continue', onClick: () => void this.decline() });
        } else {
          setBody(`Three counted shots each from the same spot.${inv === 'equal_attempts' ? '' : ' One warm-up shot each first (does not count).'} Hit the crossbar to score.`);
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
        setBody(`Team Training for week ${this.save?.week ?? 1}: three situations from the team's logic catalog. Same rules as always: up to +2 attribute points for a good week, one per week.`);
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
        setBody('Jungle Ball at lunch: one goal, a neutral keeper, you against Alex, Blake and Sam. Just for fun: scores never count as match growth.');
        acts.push({ name: 'handoff-jungle', label: 'Play Jungle Ball', onClick: () => void this.openJungle() });
        acts.push({ name: 'handoff-skip', label: 'Not today', onClick: () => void this.skipRun('declined') });
        return;
      case 'week_close':
        setBody(`Finish week ${this.save?.week ?? 1}: your week review is saved and week ${(this.save?.week ?? 1) + 1} opens.`);
        acts.push({ name: 'handoff-week', label: `Finish week ${this.save?.week ?? 1}`, onClick: () => void this.closeWeek() });
        return;
    }
  }

  private async finishStandings(): Promise<void> {
    if (!this.fresh()) return;
    this.busy = true;
    const run = await this.launch();
    if (run) await this.complete(run, 'completed');
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
    if (run && this.node()?.type === 'activity_handoff' && (this.node() as { adapter?: string }).adapter === 'match') await this.recordLeague(null);
    if (run) await this.complete(run, outcome);
    this.busy = false;
    this.render();
  }

  private lineFor(sceneId: string, nodeId: string): string {
    const s = this.state && sceneId ? this.sceneNode(sceneId, nodeId) : null;
    if (!s || s.type !== 'line') return '';
    return `${s.speaker === 'System' ? '' : `${s.speaker === 'Player' ? this.name() : s.speaker}: `}${renderText(s.text, this.name())}`;
  }

  private sceneNode(sceneId: string, nodeId: string): StoryNode | null {
    return currentNode({ ...this.state!, sceneId, nodeId });
  }

  private background(): Background {
    const n = this.state ? currentNode(this.state) : null;
    void n;
    const id = this.state?.sceneId ?? '';
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
    art.update({
      sceneId: this.mode === 'story' || this.mode === 'crossbar' ? (this.state?.sceneId ?? null) : null,
      appearance: this.gender,
      speaker: this.mode === 'story' && n?.type === 'line' ? n.speaker : null,
      showCast: this.mode === 'story' && (n?.type === 'line' || n?.type === 'choice'),
      width,
      height: this.scale.height,
      top: 58,
      panelY: this.panel.y,
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
    // Fit the goal-to-spot view between the top bar and the panel.
    const top = 64;
    const room = Math.max(60, stageH - top);
    const f = Math.min((width * 0.62 * 15) / 6.4, room * 4);
    const cx = width / 2;
    const horizon = top + 0.035 * f + 4;
    const proj = (x: number, y: number, z: number) => {
      const d = y + 4;
      return { x: cx + (x / d) * f * 0.5, y: horizon + ((1.4 - z) / d) * f * 0.5, k: 1 / d };
    };
    const tl = proj(-3.2, 11, 2.13);
    const tr = proj(3.2, 11, 2.13);
    const bl = proj(-3.2, 11, 0);
    const br = proj(3.2, 11, 0);
    s.fillStyle(PALETTE.net, 0.25).fillRect(tl.x, tl.y, tr.x - tl.x, bl.y - tl.y);
    s.lineStyle(Math.max(4, width * 0.008), PALETTE.cream, 1).lineBetween(bl.x, bl.y, tl.x, tl.y).lineBetween(tl.x, tl.y, tr.x, tr.y).lineBetween(tr.x, tr.y, br.x, br.y);
    const spot = proj(0, 0, 0);
    let ball = proj(0, 0, 0.105);
    if (this.anim) {
      const a = this.anim;
      const i = Math.min(a.path.length - 1, Math.floor(((this.time.now - a.start) / a.dur) * (a.path.length - 1)));
      const pt = a.path[Math.max(0, i)]!;
      ball = proj(pt[0], pt[1], pt[2]);
      const sh = proj(pt[0], pt[1], 0);
      s.fillStyle(PALETTE.shadow, 0.3).fillEllipse(sh.x, sh.y, 30 * sh.k * 8, 10 * sh.k * 8);
      s.fillStyle(a.who === 'blake' ? PALETTE.tomato : PALETTE.blue, 1).fillCircle(width * 0.08, top + 10, 8);
    }
    s.fillStyle(PALETTE.line, 1).fillCircle(spot.x, spot.y, 5);
    s.fillStyle(PALETTE.cream, 1).fillCircle(ball.x, ball.y, Math.max(4, 0.105 * f * 0.5 * ball.k * 2));
    s.lineStyle(2, PALETTE.ink, 1).strokeCircle(ball.x, ball.y, Math.max(4, 0.105 * f * 0.5 * ball.k * 2));
    const p = this.pull;
    if (p && !p.inCancel && this.aimFrom) {
      const len = 40 + p.power * room * 0.5;
      s.lineStyle(5, PALETTE.mustard, 1).lineBetween(spot.x, spot.y, spot.x + p.dirX * len, spot.y + p.dirY * len);
      const mTop = top + room * 0.1;
      const mH = room * 0.8;
      s.fillStyle(PALETTE.mustardDark, 1).fillRect(width * 0.9, mTop + mH * (1 - p.power), width * 0.04, mH * p.power);
      s.lineStyle(2, PALETTE.ink, 1).strokeRect(width * 0.9, mTop, width * 0.04, mH);
    }
  }

  private layout(): void {
    const { width, height } = this.scale;
    const portrait = orientationOf({ width, height }) === 'portrait';
    const pad = 10;
    const topH = 44;
    const tw = Math.round(Math.min((width - pad * 5) / 4, 140));
    this.top.forEach((b, i) => b.resize(tw, 40, Math.round(Math.max(13, Math.min(tw * 0.13, 16)))).setPosition(pad + tw / 2 + i * (tw + pad), pad + topH / 2 - 2));
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
    for (const b of [...this.top, ...this.actions]) elements[b.name] = b.getButtonBounds();
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
      crossbar: c ? { status: c.status, next: nextSlot(c), player: points(c, 'player'), blake: points(c, 'blake'), attempts: c.attempts.length, animating: this.anim !== null, ready: this.kickReady() } : null,
    };
  }
}
