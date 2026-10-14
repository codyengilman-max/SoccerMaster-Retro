import Phaser from 'phaser';
import { ATTRIBUTE_EVIDENCE } from '../game/career/config';
import { ALL_ACTIVITIES, FOCUSES, SOURCES, activityById, focusById } from '../game/career/catalog';
import { substitutes, workableFocuses } from '../game/career/planner';
import { emptySave, levelSuggestion, type CareerSave, type Completion } from '../game/career/state';
import { CareerStore } from '../game/career/store';
import { ATTRIBUTES, ATTRIBUTE_LABELS, LEVEL_NAMES, POSITIONS, SKILL_FAMILY_LABELS, type Activity, type Foot, type Position, type Rating } from '../game/career/types';
import { orientationOf } from '../render/layout';
import { CSS, FONT_FAMILY, PALETTE, textResolution } from '../render/theme';
import type { GameplayScene, InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';

type Screen =
  | { kind: 'home' }
  | { kind: 'create' }
  | { kind: 'setup' }
  | { kind: 'focus' }
  | { kind: 'sessions' }
  | { kind: 'library'; family: string | null }
  | { kind: 'activity'; id: string; sessionId: string | null; index: number }
  | { kind: 'log'; id: string; sessionId: string | null }
  | { kind: 'journal' }
  | { kind: 'review' }
  | { kind: 'player' };

interface Action {
  readonly name: string;
  readonly label: string;
  readonly onClick: () => void;
  readonly on?: boolean;
}

/** Log form draft. The completion id is created once when the form opens, so repeated taps save once. */
interface Draft {
  completionId: string;
  completion: Completion;
  rating: Rating | null;
  foot: Foot | null;
  easier: boolean;
  personalBest: number | null;
  reflection: string;
}

/** M6 home training and career screens. Reads and writes the career only through CareerStore. */
export class CareerScene extends Phaser.Scene implements InspectableScene, GameplayScene {
  private store: CareerStore | null = null;
  private save: CareerSave = emptySave();
  private screen: Screen = { kind: 'home' };
  private history: Screen[] = [];
  private page = 0;
  private draft: Draft | null = null;
  private toast = '';
  private busy = false;
  private navigating = false;
  private bg!: Phaser.GameObjects.Graphics;
  private demoG!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private note!: Phaser.GameObjects.Text;
  private buttons: Button[] = [];
  private demoRect: { x: number; y: number; w: number; h: number } | null = null;
  private demoT = 0;
  private unsub: (() => void) | null = null;

  constructor() {
    super(SceneKeys.Career);
  }

  create(): void {
    this.navigating = false;
    this.screen = { kind: 'home' };
    this.history = [];
    this.page = 0;
    this.toast = 'Loading your career…';
    const res = textResolution();
    this.bg = this.add.graphics();
    this.demoG = this.add.graphics();
    const style = { fontFamily: FONT_FAMILY, color: CSS.ink } as const;
    this.title = this.add.text(0, 0, '', { ...style, fontStyle: 'bold' }).setOrigin(0.5, 0).setResolution(res);
    this.body = this.add.text(0, 0, '', { ...style }).setOrigin(0, 0).setResolution(res);
    this.note = this.add.text(0, 0, '', { ...style, fontStyle: 'bold', color: CSS.tomato }).setOrigin(0.5, 1).setResolution(res);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.render, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.render();
    void CareerStore.open().then(async (store) => {
      if (!this.sys.isActive() && !this.sys.isPaused()) {
        store.close();
        return;
      }
      this.store = store;
      this.save = await store.load();
      this.unsub = store.onChange((s) => {
        this.save = s;
        this.render();
      });
      this.toast = store.status.kind === 'ok' ? '' : store.status.reason;
      if (!this.save.player) this.screen = { kind: 'create' };
      this.render();
    });
  }

  override update(_t: number, delta: number): void {
    if (!this.demoRect) return;
    this.demoT += delta / 1000;
    this.drawDemo();
  }

  describeLayout(): SceneLayoutReport {
    const elements: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const b of this.buttons) if (b.active) elements[b.name] = b.getButtonBounds();
    const tb = this.title.getBounds();
    elements.title = { x: tb.x, y: tb.y, width: tb.width, height: tb.height };
    const bb = this.body.getBounds();
    elements.body = { x: bb.x, y: bb.y, width: bb.width, height: Math.min(bb.height, this.body.height) };
    return { orientation: orientationOf({ width: this.scale.width, height: this.scale.height }), viewport: { width: this.scale.width, height: this.scale.height }, elements };
  }

  /** Debug snapshot for browser tests. */
  describeGameplay(): { screen: string; week: number; credit: number; journal: number; player: string | null; attributes: Record<string, number> | null; plan: string[]; status: string; toast: string } {
    return {
      screen: this.screen.kind,
      week: this.save.week,
      credit: this.save.credit,
      journal: this.save.journal.length,
      player: this.save.player?.name ?? null,
      attributes: this.save.player ? { ...this.save.player.attributes } : null,
      plan: this.save.plan?.sessions.map((s) => s.id) ?? [],
      status: this.store?.status.kind ?? 'loading',
      toast: this.toast,
    };
  }

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.render, this);
    this.unsub?.();
    this.unsub = null;
    this.store?.close();
    this.store = null;
    this.buttons = [];
  }

  private go(s: Screen): void {
    this.history.push(this.screen);
    this.screen = s;
    this.page = 0;
    this.toast = '';
    this.render();
  }

  private back(): void {
    this.screen = this.history.pop() ?? { kind: 'home' };
    this.page = 0;
    this.toast = '';
    this.render();
  }

  private menu(): void {
    if (this.navigating) return;
    this.navigating = true;
    this.scene.start(SceneKeys.Start);
  }

  private async act(action: Parameters<CareerStore['dispatch']>[0], then?: Screen): Promise<boolean> {
    if (!this.store || this.busy) return false;
    this.busy = true;
    const r = await this.store.dispatch(action);
    this.busy = false;
    if (!this.sys.isActive()) return false;
    if (r.ok) {
      this.save = r.save;
      this.toast = r.message;
      if (then) {
        this.history.push(this.screen);
        this.screen = then;
        this.page = 0;
      }
    } else this.toast = r.error;
    this.render();
    return r.ok;
  }

  private content(): { title: string; body: string; actions: Action[]; demo?: Activity } {
    const s = this.save;
    const sc = this.screen;
    const p = s.player;
    switch (sc.kind) {
      case 'home': {
        const f = s.focusId ? focusById(s.focusId) : null;
        return {
          title: p ? `${p.name} · Week ${s.week}` : 'Home Training',
          body: p
            ? `Focus: ${f ? f.label : 'not chosen yet'}\nHome sessions done: ${s.completedSessions.length} of 3 (optional)\nGame moments recorded this week: ${s.evidence.length}\n\nHome practice is your own log. Game attributes only change from what you do in the 9v9 sandbox.`
            : 'Create your player to start.',
          actions: p
            ? [
                { name: 'nav-focus', label: 'Weekly Focus', onClick: () => this.go({ kind: 'focus' }) },
                { name: 'nav-sessions', label: 'My Home Sessions', onClick: () => this.go({ kind: 'sessions' }) },
                { name: 'nav-library', label: 'Training Library', onClick: () => this.go({ kind: 'library', family: null }) },
                { name: 'nav-journal', label: 'Practice Journal', onClick: () => this.go({ kind: 'journal' }) },
                { name: 'nav-play', label: 'Play Sandbox (records game moments)', onClick: () => this.playSandbox() },
                { name: 'nav-review', label: 'Weekly Review', onClick: () => this.go({ kind: 'review' }) },
                { name: 'nav-player', label: 'Character Development', onClick: () => this.go({ kind: 'player' }) },
              ]
            : [{ name: 'nav-create', label: 'Create Player', onClick: () => this.go({ kind: 'create' }) }],
        };
      }
      case 'create':
        return {
          title: 'Create Your Player',
          body: 'Pick a position. You will be asked for a name (plain text, up to 24 characters).\n\nYour player is the one shown as your slot in the sandbox: defender (H3), midfielder (H5) or forward (H8). Only that player\'s actions count as game evidence.',
          actions: POSITIONS.map((pos) => ({ name: `pos-${pos}`, label: { DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward' }[pos], onClick: () => this.createPlayer(pos) })),
        };
      case 'setup': {
        const i = s.input;
        const set = (patch: Partial<typeof i>) => void this.act({ type: 'setInput', input: { ...i, ...patch } });
        return {
          title: 'Where Do You Practise?',
          body: `Only a ball is ever required. Cones, walls and targets are optional, with ball-only versions.\nMinutes per session: ${i.minutes} (a suggestion, no timer).`,
          actions: [
            { name: 'eq-ball', label: 'Ball only', on: i.equipment === 'ballOnly', onClick: () => set({ equipment: 'ballOnly' }) },
            { name: 'eq-optional', label: 'Ball + optional items', on: i.equipment === 'optional', onClick: () => set({ equipment: 'optional' }) },
            { name: 'sp-small', label: 'Small space', on: i.space === 'small', onClick: () => set({ space: 'small' }) },
            { name: 'sp-medium', label: 'Medium space', on: i.space === 'medium', onClick: () => set({ space: 'medium' }) },
            { name: 'st-indoor', label: 'Indoors', on: i.setting === 'indoor', onClick: () => set({ setting: 'indoor', striking: false }) },
            { name: 'st-outdoor', label: 'Outdoors', on: i.setting === 'outdoor', onClick: () => set({ setting: 'outdoor' }) },
            { name: 'strike', label: i.striking ? 'Safe striking area: yes' : 'Safe striking area: no', on: i.striking, onClick: () => set({ striking: !i.striking && i.setting === 'outdoor' }) },
            { name: 'min-less', label: 'Fewer minutes', onClick: () => set({ minutes: i.minutes - 2 }) },
            { name: 'min-more', label: 'More minutes', onClick: () => set({ minutes: i.minutes + 2 }) },
          ],
        };
      }
      case 'focus': {
        const ok = new Set(FOCUSES.filter((f) => workableFocuses(s.levels[f.family].level, s.input).includes(f.id)).map((f) => f.id));
        return {
          title: 'Weekly Focus',
          body: `Setup: ${s.input.space} ${s.input.setting}, ${s.input.equipment === 'ballOnly' ? 'ball only' : 'optional items'}, ${s.input.striking ? 'striking area' : 'no striking area'}.\nFocuses marked "not here" can't be practised honestly with this setup.`,
          actions: [
            { name: 'nav-setup', label: 'Change setup', onClick: () => this.go({ kind: 'setup' }) },
            ...FOCUSES.map((f) => ({
              name: `focus-${f.id}`,
              label: `${f.label} · ${LEVEL_NAMES[s.levels[f.family].level]}${ok.has(f.id) ? '' : ' (not here)'}`,
              on: s.focusId === f.id,
              onClick: () => void this.act({ type: 'chooseFocus', focusId: f.id }, { kind: 'sessions' }),
            })),
          ],
        };
      }
      case 'sessions': {
        if (!s.plan) return { title: 'My Home Sessions', body: 'Choose a weekly focus first.', actions: [{ name: 'nav-focus', label: 'Weekly Focus', onClick: () => this.go({ kind: 'focus' }) }] };
        const lines: string[] = [];
        const actions: Action[] = [];
        for (const ses of s.plan.sessions) {
          const done = s.completedSessions.includes(ses.id);
          lines.push(`Session ${ses.index + 1}${done ? ' ✓ done' : ''} · about ${ses.minutes} min`);
          ses.items.forEach((it, k) => {
            const a = activityById(it.activityId)!;
            actions.push({ name: `open-${ses.id}-${k}`, label: `S${ses.index + 1} ${it.role}: ${a.title}${it.ballOnly ? ' (ball only)' : ''}`, onClick: () => this.go({ kind: 'activity', id: a.id, sessionId: ses.id, index: k }) });
          });
        }
        const f = focusById(s.plan.focusId)!;
        const sug = levelSuggestion(s, f.family);
        if (sug) actions.unshift({ name: 'level-up', label: `Try ${LEVEL_NAMES[sug]} level next`, onClick: () => void this.act({ type: 'acceptLevel', family: f.family }) });
        return { title: `Week ${s.week}: ${f.label}`, body: `${lines.join('\n')}\nAll sessions are optional. No streaks, no timers.`, actions };
      }
      case 'library': {
        const fams = ['firstTouch', 'passing', 'dribbling', 'finishing', 'defending', 'awareness', 'juggling'] as const;
        if (!sc.family)
          return {
            title: 'Training Library',
            body: `${ALL_ACTIVITIES.length} activities. All are original home adaptations awaiting coaching review.`,
            actions: fams.map((fam) => ({ name: `lib-${fam}`, label: `${SKILL_FAMILY_LABELS[fam]} (${ALL_ACTIVITIES.filter((a) => a.skillFamilyId === fam).length})`, onClick: () => this.go({ kind: 'library', family: fam }) })),
          };
        return {
          title: SKILL_FAMILY_LABELS[sc.family as (typeof fams)[number]],
          body: 'Tap an activity for steps and a demonstration.',
          actions: ALL_ACTIVITIES.filter((a) => a.skillFamilyId === sc.family).map((a) => ({ name: `act-${a.id}`, label: `${a.title} · ${LEVEL_NAMES[a.entryLevel]}`, onClick: () => this.go({ kind: 'activity', id: a.id, sessionId: null, index: 0 }) })),
        };
      }
      case 'activity': {
        const a = activityById(sc.id)!;
        const it = sc.sessionId ? s.plan?.sessions.find((x) => x.id === sc.sessionId)?.items[sc.index] : undefined;
        const variant = it?.variantId ? a.variants.find((v) => v.id === it.variantId) : undefined;
        const useBallOnly = it?.ballOnly && a.ballOnly;
        const body = [
          a.objective,
          useBallOnly ? `Ball-only version: ${a.ballOnly!.objective} ${a.ballOnly!.steps}` : `1. ${a.steps[0]}\n2. ${a.steps[1]}\n3. ${a.steps[2]}`,
          variant ? `This week's change: ${variant.change}` : '',
          `Cue: ${a.cue}`,
          `Looks right when: ${a.success}`,
          `Common mistake: ${a.mistake.mistake} Fix: ${a.mistake.correction}`,
          `Easier: ${a.easier}  Harder: ${a.harder}`,
          `Needs: ball${a.equipment.optional.length ? ` (optional: ${a.equipment.optional.join(', ')})` : ''}, ${a.space} space${a.strikingArea ? ', safe outdoor striking area' : ''}.`,
          `Limits: ${a.limitations.join(' ')}`,
          `Source: ${a.sources.map((r) => SOURCES[r.id].title).join('; ') || a.sourceNote}. ${a.sourceNote}`,
          `Review: coaching ${a.review.coaching}.`,
        ]
          .filter(Boolean)
          .join('\n');
        const actions: Action[] = [{ name: 'log-open', label: sc.sessionId ? 'Log this session' : 'Log extra practice', onClick: () => this.openLog(a.id, sc.sessionId) }];
        if (sc.sessionId && s.plan && !s.completedSessions.includes(sc.sessionId))
          for (const alt of substitutes(s.plan, sc.sessionId, sc.index).slice(0, 3))
            actions.push({ name: `swap-${alt.id}`, label: `Swap for ${alt.title}`, onClick: () => void this.act({ type: 'substitute', sessionId: sc.sessionId!, index: sc.index, activityId: alt.id }, { kind: 'activity', id: alt.id, sessionId: sc.sessionId, index: sc.index }) });
        return { title: a.title, body, actions, demo: a };
      }
      case 'log': {
        const a = activityById(sc.id)!;
        const d = this.draft!;
        const set = (patch: Partial<Draft>) => {
          Object.assign(d, patch);
          this.render();
        };
        return {
          title: `Log: ${a.title}`,
          body: `What you report is your own record. It earns participation credit for a scheduled session, never game attributes.\nPersonal best (${a.personalBestLabel ?? 'none'}): ${d.personalBest ?? '-'}\nReflection: ${d.reflection || '-'}`,
          actions: [
            { name: 'log-complete', label: 'Complete', onClick: () => this.complete(a, sc.sessionId) },
            ...(['done', 'partly', 'skipped'] as const).map((c) => ({ name: `c-${c}`, label: { done: 'Did it', partly: 'Did some', skipped: 'Skipped' }[c], on: d.completion === c, onClick: () => set({ completion: c }) })),
            ...(['learning', 'improving', 'comfortable'] as const).map((r) => ({ name: `r-${r}`, label: r[0]!.toUpperCase() + r.slice(1), on: d.rating === r, onClick: () => set({ rating: r }) })),
            ...(['left', 'right', 'both'] as const).map((f) => ({ name: `f-${f}`, label: `Foot: ${f}`, on: d.foot === f, onClick: () => set({ foot: f }) })),
            { name: 'easier', label: d.easier ? 'Used the easier version: yes' : 'Used the easier version: no', on: d.easier, onClick: () => set({ easier: !d.easier }) },
            ...(a.personalBestLabel ? [{ name: 'pb', label: 'Personal best…', onClick: () => this.askPb() }] : []),
            { name: 'note', label: 'Reflection…', onClick: () => this.askNote() },
          ],
        };
      }
      case 'journal': {
        const rows = s.journal.slice(-12).reverse().map((j) => `W${j.week} ${activityById(j.activityId)?.title ?? j.activityId}: ${j.completion}${j.rating ? `, ${j.rating}` : ''}${j.credited ? ' (credit)' : j.sessionId ? '' : ' (extra)'}${j.reflection ? ` · “${j.reflection}”` : ''}`);
        return {
          title: 'Practice Journal',
          body: rows.length ? rows.join('\n') : 'Nothing logged yet.',
          actions: [
            { name: 'export', label: 'Export save', onClick: () => void this.exportSave() },
            { name: 'import', label: 'Import save…', onClick: () => void this.importSave() },
          ],
        };
      }
      case 'review': {
        const last = s.history.at(-1);
        const sug = last?.suggestedFocus ? focusById(last.suggestedFocus)?.label : null;
        const outcome = last ? last.outcomes.map((o) => `${o.reason}`).join('\n') : 'No week reviewed yet.';
        return {
          title: `Weekly Review${last ? ` · Week ${last.week}` : ''}`,
          body: [
            `This week so far: ${s.completedSessions.length}/3 home sessions (self-reported), ${s.evidence.length} game moments (observed in the sandbox).`,
            last ? `\nLast review — Self-reported practice: ${last.sessionsCompleted} sessions, ${last.extraLogged} extra logs; felt comfortable ${last.ratings.comfortable}x.` : '',
            last ? `Demonstrated in play: ${last.evidenceCount} moments${last.missedEvents ? ` (${last.missedEvents} events missed and not counted)` : ''}.` : '',
            `Character changes and reasons:\n${outcome}`,
            sug ? `Suggested next focus: ${sug}` : '',
            'Physical skill is not assessed by this game.',
          ]
            .filter(Boolean)
            .join('\n'),
          actions: [{ name: 'end-week', label: `Finish Week ${s.week}`, onClick: () => void this.act({ type: 'endWeek' }) }],
        };
      }
      case 'player': {
        if (!p) return { title: 'Character Development', body: 'No player yet.', actions: [] };
        const rows = ATTRIBUTES.map((a) => `${ATTRIBUTE_LABELS[a]}: ${p.attributes[a]} / ${p.potential[a]}\n   grows from: ${ATTRIBUTE_EVIDENCE[a]}`);
        return { title: `${p.name} (${p.position})`, body: rows.join('\n'), actions: [] };
      }
    }
  }

  private playSandbox(): void {
    if (this.navigating) return;
    this.navigating = true;
    this.scene.start(SceneKeys.Formation, { career: true });
  }

  private createPlayer(position: Position): void {
    const name = window.prompt('Player name (plain text, up to 24 characters)', 'Player') ?? '';
    void this.act({ type: 'createPlayer', id: `career-${Date.now().toString(36)}`, name, position }, { kind: 'setup' });
  }

  private openLog(id: string, sessionId: string | null): void {
    const rnd = Math.floor(Math.random() * 1e9).toString(36);
    this.draft = { completionId: `c-${Date.now().toString(36)}-${rnd}`, completion: 'done', rating: null, foot: null, easier: false, personalBest: null, reflection: '' };
    this.go({ kind: 'log', id, sessionId });
  }

  private askPb(): void {
    const v = window.prompt('Personal best (a whole number)', '');
    if (v === null || !this.draft) return;
    const n = Number(v);
    this.draft.personalBest = Number.isInteger(n) && n >= 0 && n <= 9999 ? n : null;
    this.toast = this.draft.personalBest === null ? 'Personal best must be a whole number 0-9999.' : '';
    this.render();
  }

  private askNote(): void {
    const v = window.prompt('Short reflection (up to 200 characters)', this.draft?.reflection ?? '');
    if (v === null || !this.draft) return;
    this.draft.reflection = v.slice(0, 200);
    this.render();
  }

  private complete(a: Activity, sessionId: string | null): void {
    const d = this.draft;
    if (!d) return;
    const it = sessionId ? this.save.plan?.sessions.find((x) => x.id === sessionId)?.items.find((x) => x.activityId === a.id) : undefined;
    void this.act(
      {
        type: 'log',
        entry: { id: d.completionId, sessionId, activityId: a.id, variantId: it?.variantId ?? null, contentVersion: a.version, completion: d.completion, rating: d.rating, foot: d.foot, personalBest: d.personalBest, reflection: d.reflection, easier: d.easier },
      },
      sessionId ? { kind: 'sessions' } : { kind: 'journal' },
    );
  }

  private async exportSave(): Promise<void> {
    if (!this.store) return;
    const text = await this.store.exportText();
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `soccermaster-career-week${this.save.week}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.toast = 'Save exported.';
    this.render();
  }

  private async importSave(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !this.store) return;
      if (file.size > 400_000) {
        this.toast = 'Import refused: file is too large.';
        this.render();
        return;
      }
      const r = await this.store.importText(await file.text());
      this.toast = r.ok ? 'Imported.' : r.error;
      if (r.ok) this.save = r.save;
      this.render();
    };
    input.click();
  }

  private render(): void {
    if (!this.title?.active) return;
    const width = this.scale.width;
    const height = this.scale.height;
    const portrait = orientationOf({ width, height }) === 'portrait';
    const c = this.content();
    const g = this.bg;
    g.clear();
    g.fillStyle(PALETTE.sand, 1).fillRect(0, 0, width, height);
    g.fillStyle(PALETTE.cream, 1).fillRoundedRect(8, 8, width - 16, height - 16, 18);
    g.lineStyle(4, PALETTE.ink, 1).strokeRoundedRect(8, 8, width - 16, height - 16, 18);
    const base = Math.max(13, Math.min(portrait ? width * 0.04 : height * 0.04, 20));
    this.title.setText(c.title).setFontSize(Math.round(base * 1.45)).setPosition(width / 2, 18).setWordWrapWidth(width - 40);

    const navH = Math.max(48, Math.round(base * 2.8));
    const top = this.title.y + this.title.displayHeight + 10;
    const demoOn = !!c.demo && this.screen.kind === 'activity';
    const contentW = portrait ? width - 40 : (width - 48) / 2;
    let bodyX = 20;
    let bodyY = top;
    let colX = 20;
    let colY = top;
    if (demoOn) {
      const dh = portrait ? Math.min(height * 0.2, (width - 40) * 0.6) : Math.min(height * 0.32, contentW * 0.6);
      this.demoRect = { x: 20, y: top, w: portrait ? width - 40 : contentW, h: dh };
      bodyY = top + dh + 8;
    } else this.demoRect = null;
    this.demoG.clear();
    if (!portrait) {
      colX = 28 + contentW;
      colY = top;
    }
    const bodySize = Math.round(base * 0.82);
    this.body.setFontSize(bodySize).setPosition(bodyX, bodyY).setWordWrapWidth(contentW).setText(c.body);
    if (portrait) colY = Math.min(this.body.y + this.body.displayHeight + 10, height * 0.62);
    // Shorten overly long text so buttons stay reachable. (setCrop on a high-resolution Text crops in
    // texture pixels and draws it magnified, so whole wrapped lines are dropped instead.)
    const maxBodyBottom = portrait ? colY - 6 : height - navH - 20;
    const maxBodyH = Math.max(0, maxBodyBottom - this.body.y);
    if (this.body.displayHeight > maxBodyH) {
      const lines = this.body.getWrappedText(c.body);
      let n = lines.length - 1;
      do {
        this.body.setText([...lines.slice(0, n), '…'].join('\n'));
        n--;
      } while (n > 0 && this.body.displayHeight > maxBodyH);
    }

    for (const b of this.buttons) b.destroy();
    this.buttons = [];
    const btnH = Math.max(44, Math.round(base * 2.4));
    const gap = 8;
    const areaH = height - navH - 24 - colY;
    const perCol = Math.max(1, Math.floor((areaH + gap) / (btnH + gap)));
    const cols = portrait ? (contentW > 420 ? 2 : 1) : c.actions.length > perCol && contentW >= 340 ? 2 : 1;
    const perPage = Math.max(1, perCol * cols - (c.actions.length > perCol * cols ? 1 : 0));
    const pages = Math.max(1, Math.ceil(c.actions.length / perPage));
    this.page = Math.min(this.page, pages - 1);
    const shown = c.actions.slice(this.page * perPage, this.page * perPage + perPage);
    if (pages > 1) shown.push({ name: 'more', label: `More (${this.page + 1}/${pages})`, onClick: () => ((this.page = (this.page + 1) % pages), this.render()) });
    const bw = (contentW - gap * (cols - 1)) / cols;
    const font = Math.round(Math.max(13, Math.min(base * 0.85, 18)));
    shown.forEach((a, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const b = new Button(this, colX + col * (bw + gap) + bw / 2, colY + row * (btnH + gap) + btnH / 2, { name: a.name, label: a.label, width: bw, height: btnH, fontSize: font, onClick: a.onClick });
      if (a.on) b.setFill(PALETTE.mustard, PALETTE.mustardDark);
      this.buttons.push(b);
    });
    const nav: Action[] = [
      { name: 'career-back', label: 'Back', onClick: () => this.back() },
      { name: 'career-home', label: 'Training Home', onClick: () => (this.history = [], (this.screen = this.save.player ? { kind: 'home' } : { kind: 'create' }), this.render()) },
      { name: 'career-menu', label: 'Menu', onClick: () => this.menu() },
    ];
    const nw = (width - 40 - gap * 2) / 3;
    nav.forEach((a, i) => {
      const b = new Button(this, 20 + i * (nw + gap) + nw / 2, height - 16 - navH / 2, { name: a.name, label: a.label, width: nw, height: navH, fontSize: font, onClick: a.onClick, fill: PALETTE.blue, fillPressed: PALETTE.blueDark });
      this.buttons.push(b);
    });
    this.note.setFontSize(Math.round(base * 0.85)).setPosition(width / 2, height - navH - 22).setWordWrapWidth(width - 40).setText(this.toast).setDepth(5);
    if (this.toast) this.note.setBackgroundColor(CSS.cream);
    if (demoOn) this.drawDemo();
  }

  /** Programmatic, original demonstration. Footwork uses still frames; ground paths animate. */
  private drawDemo(): void {
    const r = this.demoRect;
    const s = this.screen;
    if (!r || s.kind !== 'activity') return;
    const a = activityById(s.id);
    if (!a) return;
    const g = this.demoG;
    g.clear();
    g.fillStyle(PALETTE.grassLight, 1).fillRoundedRect(r.x, r.y, r.w, r.h, 12);
    g.lineStyle(3, PALETTE.ink, 1).strokeRoundedRect(r.x, r.y, r.w, r.h, 12);
    const d = a.demo;
    const sx = (x: number) => r.x + 10 + (x / 10) * (r.w - 20);
    const sy = (y: number) => r.y + 8 + (y / 6) * (r.h - 16);
    const unit = Math.min(r.w / 10, r.h / 6);
    if (d.kind === 'path') {
      for (const m of d.markers) {
        if (m.kind === 'cone') g.fillStyle(PALETTE.tomato, 1).fillTriangle(sx(m.x), sy(m.y) - unit * 0.3, sx(m.x) - unit * 0.22, sy(m.y) + unit * 0.2, sx(m.x) + unit * 0.22, sy(m.y) + unit * 0.2);
        else if (m.kind === 'wall') g.fillStyle(PALETTE.track, 1).fillRect(sx(m.x) - unit * 0.15, r.y + 6, unit * 0.3, r.h - 12);
        else if (m.kind === 'target') g.lineStyle(3, PALETTE.blue, 1).strokeRect(sx(m.x) - unit * 0.3, sy(m.y) - unit * 0.5, unit * 0.6, unit);
        else g.lineStyle(3, PALETTE.mustardDark, 1).strokeRect(sx(m.x) - unit * 0.6, sy(m.y) - unit * 0.6, unit * 1.2, unit * 1.2);
      }
      const t = this.demoT % (d.seconds + 1);
      const at = (k: readonly { t: number; x: number; y: number }[]) => {
        let i = 0;
        while (i < k.length - 2 && k[i + 1]!.t < t) i++;
        const p = k[i]!;
        const q = k[Math.min(i + 1, k.length - 1)]!;
        const f = q.t > p.t ? Math.min(1, Math.max(0, (t - p.t) / (q.t - p.t))) : 1;
        return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f };
      };
      const pl = at(d.player);
      const b = at(d.ball);
      g.fillStyle(PALETTE.blue, 1).fillCircle(sx(pl.x), sy(pl.y), unit * 0.3);
      g.lineStyle(2, PALETTE.ink, 1).strokeCircle(sx(pl.x), sy(pl.y), unit * 0.3);
      g.fillStyle(0xffffff, 1).fillCircle(sx(b.x), sy(b.y), unit * 0.16);
      g.lineStyle(2, PALETTE.ink, 1).strokeCircle(sx(b.x), sy(b.y), unit * 0.16);
    } else {
      const n = d.frames.length;
      const k = Math.floor(this.demoT / 1.4) % n;
      d.frames.forEach((fr, i) => {
        const cx = r.x + ((i + 0.5) * r.w) / n;
        const cy = r.y + r.h * 0.45;
        g.fillStyle(i === k ? PALETTE.sun : PALETTE.cream, 1).fillCircle(cx, cy, unit * 0.9);
        g.lineStyle(2, PALETTE.ink, 1).strokeCircle(cx, cy, unit * 0.9);
        const off = { inside: [-0.4, 0.3], outside: [0.5, 0.3], sole: [0, 0.4], front: [0, 0.6], air: [0, -0.6], away: [0.7, 0.1] }[fr.ball];
        g.fillStyle(0xffffff, 1).fillCircle(cx + off[0]! * unit, cy + off[1]! * unit, unit * 0.2);
        g.lineStyle(2, PALETTE.ink, 1).strokeCircle(cx + off[0]! * unit, cy + off[1]! * unit, unit * 0.2);
      });
      const cap = d.frames[k]!.caption;
      if (!this.demoCaption?.active) this.demoCaption = this.add.text(0, 0, '', { fontFamily: FONT_FAMILY, color: CSS.ink, fontStyle: 'bold' }).setOrigin(0.5, 1).setResolution(textResolution());
      this.demoCaption.setFontSize(Math.round(Math.max(12, unit * 0.45))).setPosition(r.x + r.w / 2, r.y + r.h - 4).setText(`${k + 1}. ${cap}`).setVisible(true);
      return;
    }
    this.demoCaption?.setVisible(false);
  }

  private demoCaption: Phaser.GameObjects.Text | null = null;
}
