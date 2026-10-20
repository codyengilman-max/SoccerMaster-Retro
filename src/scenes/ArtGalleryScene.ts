import Phaser from 'phaser';
import { ART_ASSETS as ALL_ASSETS, ART_REVISION, isAllowedAsset, type ArtAsset, OWNER_ART_APPROVAL } from '../render/art/catalog';

/** Every image the game can show (Graphics v1 + Season One screens); masters with no runtime use are listed as gaps. */
const ART_ASSETS = ALL_ASSETS.filter((a) => isAllowedAsset(a.assetId));
import { artTextureKey, artUrl } from '../render/art/urls';
import { PLAYER_ART, PlayerArt, atlasKey } from '../render/art/playerArt';
import { COACH_POSE, SPRITE_CELL, SPRITE_CLUBS, protagonistSet } from '../render/art/spriteSets';
import { sideLooks, type RosterLook } from '../render/art/roster';
import { POSE_KINDS } from '../render/art/spriteFactory';
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
      this.title.setText('Art Gallery · gameplay players (owner sprite sheets v2)');
      this.drawGameplay(area);
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

  /** Sprites v2: every owner sheet's standing pose, the girl's pose kinds, and Coach Code's training beats. */
  private drawGameplay(area: Rect): void {
    const art = this.art!;
    const prot = (look: 'boy' | 'girl', kit: 'match' | 'training'): RosterLook => sideLooks('home', { slot: 7, look }, { club: 'batavia', kit })[7]!;
    const looks: { l: RosterLook; label: string }[] = [];
    for (const look of ['boy', 'girl'] as const) {
      looks.push({ l: prot(look, 'match'), label: `${look} match` }, { l: prot(look, 'training'), label: `${look} train` });
      looks.push({ l: { ...prot(look, 'match'), set: protagonistSet(look, 'match', true) }, label: `${look} GK` });
    }
    looks.push({ l: sideLooks('home', null, { club: 'batavia', kit: 'training' })[5]!, label: 'batavia train' });
    for (const c of SPRITE_CLUBS) looks.push({ l: sideLooks('away', null, { club: c })[5]!, label: c.replace('_', ' ') });
    art.ensure([...looks.map((x) => x.l.set), 'coach-code']);
    if (this.load.isLoading()) this.load.once(Phaser.Loader.Events.COMPLETE, () => this.art && this.page.kind === 'gameplay' && this.render());
    const cols = Math.max(4, Math.floor(area.width / 70));
    const cw = area.width / cols;
    const coachBeats = Object.entries(COACH_POSE);
    const poseRows = Math.ceil(POSE_KINDS.length / cols);
    const rows = Math.ceil(looks.length / cols) + poseRows + Math.ceil(coachBeats.length / cols);
    const rh = Math.min(110, (area.height - 30) / rows);
    const bodyH = (rh * 0.7) / PLAYER_ART.bodyScale;
    const cell = (i: number, row0: number): { x: number; y: number } => ({ x: area.x + cw * (i % cols) + cw / 2, y: area.y + (row0 + Math.floor(i / cols)) * rh + rh * 0.78 });
    looks.forEach(({ l, label }, i) => {
      const { x, y } = cell(i, 0);
      this.items.push(art.apply(this.add.image(x, y, '__DEFAULT'), l, 'idle', 2, 0, bodyH));
      this.text(x, y + 4, label, 10);
    });
    const r1 = Math.ceil(looks.length / cols);
    const girl = prot('girl', 'match');
    POSE_KINDS.forEach((kind, i) => {
      const { x, y } = cell(i, r1);
      this.items.push(art.apply(this.add.image(x, y, '__DEFAULT'), girl, kind, 0, 1, bodyH));
      this.text(x, y + 4, kind, 11);
    });
    const coach = atlasKey('coach-code');
    if (this.textures.exists(coach)) {
      coachBeats.forEach(([beat, frame], i) => {
        const { x, y } = cell(i, r1 + poseRows);
        const s = (rh * 0.8) / SPRITE_CELL.bodyHeight;
        this.items.push(this.add.image(x, y, coach, frame).setOrigin(SPRITE_CELL.anchorX / SPRITE_CELL.width, SPRITE_CELL.anchorY / SPRITE_CELL.height).setScale(s));
        this.text(x, y + 4, beat, 10);
      });
    }
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
