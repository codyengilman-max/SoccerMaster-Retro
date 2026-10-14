import Phaser from 'phaser';
import type { coach, Rect } from '../../game';
import { CSS, FONT_FAMILY, PALETTE, textResolution } from '../../render/theme';
import { Button } from './Button';

export interface CoachOverlayHandlers {
  readonly onAnswer: (optionId: string) => void;
  readonly onContinue: () => void;
  readonly onAgain: () => void;
  readonly onMenu: () => void;
}

const GRADE_LABEL: Record<coach.Grade, string> = { strong: 'Strong choice', reasonable: 'Reasonable choice', risky: 'Risky choice' };
const MAX_OPTIONS = 4;
const DEPTH = 7400;

type Mode = 'hidden' | 'question' | 'feedback' | 'summary';

/**
 * Coach Moment card over the frozen pitch. A full-screen blocker sits under the card so no tap
 * reaches gameplay; all text is plain canvas text (imported names are never parsed as markup).
 */
export class CoachOverlay {
  private readonly scene: Phaser.Scene;
  private readonly blocker: Phaser.GameObjects.Zone;
  private readonly card: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly options: Button[];
  private readonly continueButton: Button;
  private readonly againButton: Button;
  private readonly menuButton: Button;
  private mode: Mode = 'hidden';
  private suspended = false;
  private optionIds: string[] = [];
  private cardRect: Rect = { x: 0, y: 0, width: 0, height: 0 };

  constructor(scene: Phaser.Scene, handlers: CoachOverlayHandlers) {
    this.scene = scene;
    const res = textResolution();
    this.blocker = scene.add.zone(0, 0, 10, 10).setOrigin(0, 0).setName('coach-blocker').setDepth(DEPTH).setInteractive();
    this.card = scene.add.graphics().setDepth(DEPTH + 1);
    const txt = (size: number): Phaser.GameObjects.Text =>
      scene.add.text(0, 0, '', { fontFamily: FONT_FAMILY, fontStyle: 'bold', fontSize: `${size}px`, color: CSS.ink, align: 'left' }).setResolution(res).setDepth(DEPTH + 2);
    this.title = txt(16).setName('coach-title');
    this.body = txt(14).setName('coach-body');
    const btn = (name: string, label: string, onClick: () => void, cream = true): Button =>
      new Button(scene, 0, 0, { name, label, width: 200, height: 36, fontSize: 14, ...(cream ? { fill: PALETTE.cream, fillPressed: PALETTE.sand } : {}), onClick }).setDepth(DEPTH + 3);
    this.options = Array.from({ length: MAX_OPTIONS }, (_, i) =>
      btn(`coach-option-${i}`, '', () => {
        const id = this.optionIds[i];
        if (this.mode === 'question' && id) handlers.onAnswer(id);
      }),
    );
    this.continueButton = btn('coach-continue', 'Continue ▶', () => this.mode === 'feedback' && handlers.onContinue(), false);
    this.againButton = btn('coach-again', 'Play again', () => this.mode === 'summary' && handlers.onAgain(), false);
    this.menuButton = btn('coach-menu', 'Menu', () => this.mode === 'summary' && handlers.onMenu());
    this.apply();
  }

  get visible(): boolean {
    return this.mode !== 'hidden' && !this.suspended;
  }

  get state(): Mode {
    return this.mode;
  }

  /** The user pause panel replaces the card while it is open; the moment itself stays frozen. */
  setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    this.apply();
  }

  showQuestion(view: coach.MomentView, index: number, total: number): void {
    this.mode = 'question';
    this.optionIds = view.options.map((o) => o.id);
    this.title.setText(`Coach Moment ${index}/${total}`);
    this.body.setText(view.question);
    view.options.forEach((o, i) => this.options[i]!.setLabel(o.text));
    this.apply();
  }

  showFeedback(view: coach.MomentView, selected: coach.EvaluatedOption): void {
    this.mode = 'feedback';
    const others = view.options.filter((o) => o.id !== selected.id && o.grade === 'strong').map((o) => `“${o.text}”`);
    const also = others.length > 0 ? `\nAlso a strong choice: ${others.join(', ')}.` : '';
    const doIt = selected.intention.kind === 'onBall' ? '\nNow you do it: play resumes and the ball is yours.' : selected.intention.kind === 'offBall' ? '\nWatch your teammate act on it when play resumes.' : '';
    this.title.setText(GRADE_LABEL[selected.grade]);
    this.body.setText(`${selected.feedback}${also}${doIt}`);
    this.apply();
  }

  showSummary(s: coach.CoachSummary): void {
    this.mode = 'summary';
    const lines = [`Moments completed: ${s.completed} of ${s.target}`];
    if (s.shortfall > 0) lines.push(`Only ${s.completed} real coaching situations came up this session.`);
    lines.push(...(s.strengths.length > 0 ? s.strengths : ['Keep practising: every moment teaches something.']));
    lines.push(s.nextFocus);
    this.title.setText(s.abandoned ? 'Session stopped' : 'Session summary');
    this.body.setText(lines.join('\n'));
    this.apply();
  }

  hide(): void {
    this.mode = 'hidden';
    this.apply();
  }

  bounds(): Record<string, Rect> {
    if (!this.visible) return {};
    const out: Record<string, Rect> = { 'coach-card': this.cardRect };
    const add = (b: Button): void => {
      if (b.visible) out[b.name] = b.getButtonBounds();
    };
    [...this.options, this.continueButton, this.againButton, this.menuButton].forEach(add);
    return out;
  }

  /** Card on the right in landscape, bottom in portrait, so the highlighted pitch stays visible. */
  layout(width: number, height: number): void {
    this.blocker.setSize(width, height);
    this.blocker.input?.hitArea.setTo(0, 0, width, height);
    const portrait = height > width;
    const compact = Math.min(width, height) < 420;
    const pad = 12;
    const w = portrait ? width - 16 : Math.min(420, Math.max(300, width * 0.44));
    const bh = compact ? 34 : 40;
    const font = compact ? 13 : 15;
    this.title.setFontSize(compact ? 15 : 18).setWordWrapWidth(w - pad * 2, true);
    this.body.setFontSize(compact ? 12 : 14).setWordWrapWidth(w - pad * 2, true);
    const buttons = this.activeButtons();
    const h = pad + this.title.height + 6 + this.body.height + 10 + buttons.length * (bh + 8) + pad;
    const x = portrait ? 8 : width - w - 8;
    const y = portrait ? Math.max(8, height - h - 8) : Math.max(8, Math.min((height - h) / 2, height - h - 8));
    this.cardRect = { x, y, width: w, height: h };
    const g = this.card;
    g.clear();
    g.fillStyle(PALETTE.ink, 1);
    g.fillRoundedRect(x, y + 4, w, h, 14);
    g.fillStyle(PALETTE.cream, 0.97);
    g.fillRoundedRect(x, y, w, h, 14);
    g.lineStyle(3, PALETTE.ink, 1);
    g.strokeRoundedRect(x, y, w, h, 14);
    this.title.setPosition(x + pad, y + pad);
    this.body.setPosition(x + pad, this.title.y + this.title.height + 6);
    let by = this.body.y + this.body.height + 10 + bh / 2;
    for (const b of buttons) {
      b.resize(w - pad * 2, bh, font).setPosition(x + w / 2, by);
      by += bh + 8;
    }
  }

  private activeButtons(): Button[] {
    if (this.mode === 'question') return this.options.slice(0, this.optionIds.length);
    if (this.mode === 'feedback') return [this.continueButton];
    if (this.mode === 'summary') return [this.againButton, this.menuButton];
    return [];
  }

  private apply(): void {
    const on = this.visible;
    this.blocker.setVisible(on);
    if (this.blocker.input) this.blocker.input.enabled = on;
    this.card.setVisible(on);
    this.title.setVisible(on);
    this.body.setVisible(on);
    const active = new Set(on ? this.activeButtons() : []);
    for (const b of [...this.options, this.continueButton, this.againButton, this.menuButton]) b.setEnabled(active.has(b));
    if (on) this.layout(this.scene.scale.width, this.scene.scale.height);
  }
}
