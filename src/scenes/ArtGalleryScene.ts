import Phaser from 'phaser';
import { ART_ASSETS as ALL_ASSETS, ART_REVISION, isAllowedAsset, type ArtAsset, OWNER_ART_APPROVAL } from '../render/art/catalog';

/** Every image the game can show (Graphics v1 + Season One screens); masters with no runtime use are listed as gaps. */
const ART_ASSETS = ALL_ASSETS.filter((a) => isAllowedAsset(a.assetId));
import { artTextureKey, artUrl } from '../render/art/urls';
import { PlayerArt } from '../render/art/playerArt';
import { sideLooks } from '../render/art/roster';
import { HAIR_STYLES, POSE_KINDS, SPRITE_FRAME } from '../render/art/spriteFactory';
import { CSS, FONT_FAMILY, PALETTE, textResolution } from '../render/theme';
import { orientationOf } from '../render/layout';
import type { Rect } from '../game';
import type { SceneLayoutReport } from './inspectable';
import { SceneKeys } from './keys';
import { Button } from './ui/Button';

/** Known Graphics v1 gaps, shown verbatim in the gallery (docs/art/graphics-v1/docs/ART_GAPS_AND_CAPABILITIES.md). */
export const ART_GAPS: readonly string[] = [
  'No BLOCK pose: the BLOCK button still works; the player shows the idle/run frame while blocking.',
  'No named gameplay sheets for Alex, Sam, Blake or Riley: match players use roster-slot reference hair only.',
  'No squad numbers or club kits in the match engine: numbers are formation slot + 1, kits are home/away/keeper reference colours (match sides, not clubs).',
  'No corridor, moving-box arrival or night bedroom art: the bedroom map is used for all home scenes (time/props awaiting review).',
  'Static portraits only: no expression or lip-sync frames; motion is entrance and speaker highlight.',
  'Season One: no Mom or Casey portrait (their lines are text only); no daytime aquarium; no classroom or lunch room.',
  'Season One: the Tank Cup images (underwater, mini goal, pellet) are kept but not shown, because no Tank Cup activity exists.',
];

type Page = { kind: 'assets'; index: number } | { kind: 'gameplay' } | { kind: 'gaps' };
const PER_PAGE = 6;

/** Review-only gallery of every Graphics v1 asset and its status. Reads art only; no saves, story or input side effects. */
export class ArtGalleryScene extends Phaser.Scene {
  private page: Page = { kind: 'assets', index: 0 };
  private items: Phaser.GameObjects.GameObject[] = [];
  private buttons: Button[] = [];
  private title!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private art: PlayerArt | null = null;
  private shown: string[] = [];
  private loadedKeys = new Set<string>();

  constructor() {
    super(SceneKeys.Gallery);
  }

  create(): void {
    this.page = { kind: 'assets', index: 0 };
    this.items = [];
    this.buttons = [];
    this.shown = [];
    this.loadedKeys = new Set();
    this.art = new PlayerArt(this);
    const res = textResolution();
    this.title = this.add.text(0, 0, '', { fontFamily: FONT_FAMILY, color: CSS.ink, fontStyle: 'bold' }).setResolution(res);
    this.body = this.add.text(0, 0, '', { fontFamily: FONT_FAMILY, color: CSS.ink }).setResolution(res);
    this.load.on(Phaser.Loader.Events.FILE_COMPLETE, this.onLoaded, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.render, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.render();
  }

  private pages(): Page[] {
    const n = Math.ceil(ART_ASSETS.length / PER_PAGE);
    return [...Array.from({ length: n }, (_, index) => ({ kind: 'assets', index }) as Page), { kind: 'gameplay' }, { kind: 'gaps' }];
  }

  private go(delta: number): void {
    const all = this.pages();
    const i = all.findIndex((p) => JSON.stringify(p) === JSON.stringify(this.page));
    this.page = all[(i + delta + all.length) % all.length]!;
    this.render();
  }

  private onLoaded(key: string): void {
    if (this.loadedKeys.has(key) || !key.startsWith('art-v1:')) return;
    this.loadedKeys.add(key);
    if (this.shown.some((id) => artTextureKey(id) === key)) this.render();
    else this.evictOffPage();
  }

  /** Keep only the visible asset page decoded; a finished request for a page already left is dropped. */
  private evictOffPage(): void {
    const keep = new Set(this.shown.map(artTextureKey));
    for (const k of [...this.loadedKeys]) {
      if (keep.has(k)) continue;
      if (this.textures.exists(k)) this.textures.remove(k);
      this.loadedKeys.delete(k);
    }
  }

  private clear(): void {
    for (const o of this.items) o.destroy();
    for (const b of this.buttons) b.destroy();
    this.items = [];
    this.buttons = [];
  }

  private text(x: number, y: number, s: string, size: number, color: string = CSS.ink, w = 0): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, s, { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color, align: 'center' }).setResolution(textResolution()).setOrigin(0.5, 0);
    if (w) t.setWordWrapWidth(w, true);
    this.items.push(t);
    return t;
  }

  private render(): void {
    if (!this.title) return;
    this.clear();
    const { width, height } = this.scale;
    const portrait = orientationOf({ width, height }) === 'portrait';
    const g = this.add.graphics().setDepth(-1);
    this.items.push(g);
    g.fillStyle(PALETTE.sand, 1).fillRect(0, 0, width, height);
    const pad = 10;
    const bw = Math.min(120, (width - pad * 4) / 3);
    const mk = (name: string, label: string, x: number, onClick: () => void) => {
      const b = new Button(this, x, pad + 20, { name, label, width: bw, height: 40, fontSize: 14, onClick });
      this.buttons.push(b);
    };
    mk('gallery-back', '‹ Review', pad + bw / 2, () => this.scene.start(SceneKeys.Career, { open: 'reviewHub' }));
    mk('gallery-prev', '‹ Prev', width - pad * 2 - bw * 1.5, () => this.go(-1));
    mk('gallery-next', 'Next ›', width - pad - bw / 2, () => this.go(1));
    const fs = Math.round(Math.max(13, Math.min(width, height) * 0.035));
    const top = pad + 48;
    this.title.setFontSize(fs + 2).setPosition(pad, top);
    const area: Rect = { x: pad, y: top + fs * 2.2, width: width - pad * 2, height: height - top - fs * 2.2 - pad };
    const p = this.page;
    this.body.setText('');
    if (p.kind === 'assets') {
      const list = ART_ASSETS.slice(p.index * PER_PAGE, p.index * PER_PAGE + PER_PAGE);
      this.title.setText(`Art Gallery · ${ART_REVISION} · cutscene art ${p.index + 1}/${Math.ceil(ART_ASSETS.length / PER_PAGE)} · owner approved`);
      this.drawAssets(list, area, portrait ? 2 : 3, fs);
    } else if (p.kind === 'gameplay') {
      this.shown = [];
      this.evictOffPage();
      this.title.setText(`Art Gallery · gameplay players (STYLE_APPROVED look, ported reference factory)`);
      this.drawGameplay(area, fs);
    } else {
      this.shown = [];
      this.evictOffPage();
      this.title.setText('Art Gallery · known gaps (not invented)');
      this.body.setFontSize(fs).setWordWrapWidth(area.width, true).setPosition(area.x, area.y).setText(ART_GAPS.map((s) => `• ${s}`).join('\n\n'));
    }
  }

  private drawAssets(list: readonly ArtAsset[], area: Rect, cols: number, fs: number): void {
    const rows = Math.ceil(PER_PAGE / cols);
    const cw = area.width / cols;
    const ch = area.height / rows;
    const want: string[] = [];
    list.forEach((a, i) => {
      const cx = area.x + cw * (i % cols) + cw / 2;
      const y0 = area.y + ch * Math.floor(i / cols);
      const imgH = ch - fs * 3.4;
      const key = artTextureKey(a.assetId);
      if (this.textures.exists(key)) {
        const img = this.add.image(cx, y0 + imgH / 2, key).setName(`gallery-${a.assetId}`);
        const k = Math.min((cw - 8) / img.width, imgH / img.height);
        img.setScale(k);
        this.items.push(img);
      } else if (artUrl(a.assetId)) want.push(a.assetId);
      const color = CSS.blue;
      this.text(cx, y0 + imgH + 2, a.label, Math.max(11, fs - 3), CSS.ink, cw - 6);
      this.text(cx, y0 + imgH + fs * 1.6, `Owner approved ${OWNER_ART_APPROVAL}`, Math.max(10, fs - 4), color, cw - 6);
    });
    for (const id of want) this.load.image(artTextureKey(id), artUrl(id)!);
    if (want.length && !this.load.isLoading()) this.load.start();
    this.shown = list.map((a) => a.assetId);
    this.evictOffPage();
  }

  private drawGameplay(area: Rect, fs: number): void {
    const art = this.art!;
    const home = sideLooks('home');
    const away = sideLooks('away');
    const looks = [...home.slice(1), ...away.slice(1, 4), sideLooks('home', { slot: 7, look: 'girl' })[7]!, home[0]!];
    const cols = Math.min(looks.length, Math.max(4, Math.floor(area.width / 70)));
    const cw = area.width / cols;
    const rows = Math.ceil(looks.length / cols) + 1;
    const k = Math.min(cw / (SPRITE_FRAME.width * SPRITE_FRAME.scaleX * 0.5), (area.height - 30) / (rows * 100 + 10), 1.6);
    looks.forEach((l, i) => {
      const x = area.x + cw * (i % cols) + cw / 2;
      const y = area.y + Math.floor(i / cols) * 100 * k + 80 * k;
      this.items.push(this.add.image(x, y, art.frame(l, 'idle', 2, 0)).setOrigin(0.5, SPRITE_FRAME.anchorY / SPRITE_FRAME.height).setScale(k * SPRITE_FRAME.scaleX * 0.45, k * SPRITE_FRAME.scaleY * 0.45));
      this.text(x, y + 6 * k, l.girl ? 'ponytail' : HAIR_STYLES[l.hairStyle]!, 10);
    });
    const rowY = area.y + Math.ceil(looks.length / cols) * 100 * k + 40 * k;
    POSE_KINDS.forEach((kind, i) => {
      const x = area.x + (area.width / POSE_KINDS.length) * (i + 0.5);
      this.items.push(this.add.image(x, rowY + 70 * k, art.frame(home[5]!, kind, 0, 1)).setOrigin(0.5, SPRITE_FRAME.anchorY / SPRITE_FRAME.height).setScale(k * SPRITE_FRAME.scaleX * 0.45, k * SPRITE_FRAME.scaleY * 0.45));
      this.text(x, rowY + 76 * k, kind, 11);
    });
    this.text(area.x + area.width / 2, rowY + 100 * k, 'No BLOCK pose supplied (gap). Hair is fixed per roster slot.', Math.max(11, fs - 3), CSS.ink, area.width);
  }

  describeLayout(): SceneLayoutReport {
    const elements: Record<string, Rect> = {};
    for (const b of this.buttons) elements[b.name] = b.getButtonBounds();
    return { orientation: orientationOf(this.scale), viewport: { width: this.scale.width, height: this.scale.height }, elements };
  }

  describeGameplay(): unknown {
    return { page: this.page, shown: this.shown, loaded: this.shown.filter((id) => this.textures.exists(artTextureKey(id))), title: this.title?.text ?? '', gaps: ART_GAPS.length, frames: this.art?.size ?? 0 };
  }

  private onShutdown(): void {
    this.load.off(Phaser.Loader.Events.FILE_COMPLETE, this.onLoaded, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.render, this);
    this.clear();
    this.art?.destroy();
    this.art = null;
    for (const k of this.loadedKeys) if (this.textures.exists(k)) this.textures.remove(k);
    this.loadedKeys.clear();
  }
}
