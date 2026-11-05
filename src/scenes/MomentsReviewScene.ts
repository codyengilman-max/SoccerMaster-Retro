import Phaser from 'phaser';
import type { Rect } from '../game';
import { effectiveStatus, MOMENT_SCENES } from '../game/training12/moments/index';
import { releaseBlockers } from '../game/training12/moments/validate';
import { orientationOf } from '../render/layout';
import { FONT_FAMILY, textResolution } from '../render/theme';
import type { GameplayScene, InspectableScene, SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';

/** Owner review list (`?dev`): all 36 situations with each variant's review status and release blockers. */
export class MomentsReviewScene extends Phaser.Scene implements InspectableScene, GameplayScene {
  private page = 0;
  private buttons: Button[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private elements: Record<string, Rect> = {};

  constructor() {
    super(SceneKeys.MomentsReview);
  }

  create(data: { situationId?: string } = {}): void {
    this.cameras.main.setBackgroundColor('#0d1630');
    const idx = Math.max(0, MOMENT_SCENES.findIndex((s) => s.library.situationId === data.situationId));
    this.page = Math.floor(Math.floor(idx / 2) / this.perPage());
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    this.layout();
  }

  private perPage(): number {
    return Math.max(4, Math.floor((this.scale.height - 110) / 40)) * (this.scale.width >= 700 ? 2 : 1);
  }

  private situations(): string[] {
    return [...new Set(MOMENT_SCENES.map((s) => s.library.situationId))];
  }

  private layout(): void {
    for (const b of this.buttons) b.destroy();
    for (const t of this.texts) t.destroy();
    this.buttons = [];
    this.texts = [];
    this.elements = {};
    const w = this.scale.width;
    const res = textResolution();
    const ids = this.situations();
    const per = this.perPage();
    const pages = Math.ceil(ids.length / per);
    this.page = Math.min(this.page, pages - 1);
    this.texts.push(this.add.text(10, 8, `TACTICAL MOMENTS REVIEW · ${MOMENT_SCENES.length} drafts · page ${this.page + 1}/${pages}`, { fontFamily: FONT_FAMILY, color: '#f2c14e', fontStyle: 'bold', fontSize: '13px' }).setResolution(res));
    this.texts.push(this.add.text(10, 26, 'Drafts only: nothing here is approved or shown to players. Tap a situation to review it.', { fontFamily: FONT_FAMILY, color: '#fff4dc', fontSize: '11px', wordWrap: { width: w - 20 } }).setResolution(res));
    const cols = w >= 700 ? 2 : 1;
    const colW = (w - 20 - (cols - 1) * 8) / cols;
    ids.slice(this.page * per, this.page * per + per).forEach((id, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const vs = MOMENT_SCENES.filter((s) => s.library.situationId === id);
      const title = vs[0]!.library.title;
      const status = vs.map((s) => `${s.library.variant}: ${effectiveStatus(s)} (${releaseBlockers(s).length} blockers)`).join(' · ');
      const b = new Button(this, 10 + col * (colW + 8) + colW / 2, 70 + row * 40, { name: `tmr-${id}`, label: `${id} ${title}`.slice(0, Math.floor(colW / 7)), width: colW, height: 24, fontSize: 12, onClick: () => this.scene.start(SceneKeys.Moments, { review: true, situationId: id, variant: 'base' }), fill: 0xf2a93b, fillPressed: 0xd98e1f });
      this.buttons.push(b);
      this.elements[`tmr-${id}`] = b.getButtonBounds();
      this.texts.push(this.add.text(10 + col * (colW + 8), 84 + row * 40, status, { fontFamily: FONT_FAMILY, color: '#fff4dc', fontSize: '10px' }).setResolution(res));
    });
    const h = this.scale.height;
    const nav = [
      { name: 'tmr-prev', label: 'Prev', on: () => ((this.page = Math.max(0, this.page - 1)), this.layout()) },
      { name: 'tmr-next', label: 'Next', on: () => ((this.page = Math.min(pages - 1, this.page + 1)), this.layout()) },
      { name: 'tmr-back', label: 'Back', on: () => this.scene.start(SceneKeys.Start) },
    ];
    const bw = Math.min(140, (w - 20 - 16) / 3);
    nav.forEach((n, i) => {
      const b = new Button(this, 10 + bw / 2 + i * (bw + 8), h - 26, { name: n.name, label: n.label, width: bw, height: 36, fontSize: 14, onClick: n.on });
      this.buttons.push(b);
      this.elements[n.name] = b.getButtonBounds();
    });
  }

  describeLayout(): SceneLayoutReport {
    return { orientation: orientationOf({ width: this.scale.width, height: this.scale.height }), viewport: { width: this.scale.width, height: this.scale.height }, elements: { ...this.elements } };
  }

  describeGameplay(): unknown {
    return { page: this.page, situations: this.situations().length, scenes: MOMENT_SCENES.map((s) => ({ id: s.sceneId, status: effectiveStatus(s), blockers: releaseBlockers(s).length })) };
  }
}
