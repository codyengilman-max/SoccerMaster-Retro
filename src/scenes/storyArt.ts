import Phaser from 'phaser';
import { MAPPED_SCENE_IDS, SPEAKER_ROLE, artAsset, sceneVisual, type CastRole, type SceneVisual } from '../render/art/catalog';
import { artTextureKey, artUrl } from '../render/art/urls';
import { CSS, FONT_FAMILY, PALETTE } from '../render/theme';

/** Upper bound on cutscene textures resident at once (current scene's backdrop + cast, plus slack). */
export const STORY_ART_MAX_TEXTURES = 12;
const ENTER_MS = 260;
const LIFT_MS = 140;

export interface StoryArtFrame {
  readonly sceneId: string | null;
  readonly appearance: 'boy' | 'girl' | null;
  readonly speaker: string | null;
  readonly showCast: boolean;
  readonly width: number;
  readonly height: number;
  /** Top of the free stage (below the top bar) and the panel's top edge. */
  readonly top: number;
  readonly panelY: number;
}

type CastState = 'shown' | 'loading' | 'gap' | 'failed';
interface Slot { role: CastRole; assetId: string | null; img: Phaser.GameObjects.Image | null; box: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; state: CastState; x: number; placed: boolean }

/**
 * Cutscene backdrop + static portraits for StoryScene. Presentation only: reads the scene id, the saved
 * boy/girl choice and the current speaker; never touches story state, saves, rewards or input. Unknown
 * scenes and missing/failed images fall back to labelled neutral placeholders.
 */
export class StoryArt {
  private readonly scene: Phaser.Scene;
  private readonly bgImage: Phaser.GameObjects.Image;
  private slots: Slot[] = [];
  private visual: SceneVisual | null = null;
  private visualKey = '';
  private speakerRole: CastRole | null = null;
  private readonly failed = new Set<string>();
  private readonly owned = new Set<string>();
  private destroyed = false;
  private last: StoryArtFrame | null = null;

  constructor(scene: Phaser.Scene, private readonly reducedMotion: boolean) {
    this.scene = scene;
    this.bgImage = scene.add.image(0, 0, '__DEFAULT').setDepth(-2).setVisible(false).setName('story-art-bg');
    scene.load.on(Phaser.Loader.Events.FILE_COMPLETE, this.onLoaded, this);
    scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.onFailed, this);
  }

  /** True when an art backdrop is on screen (StoryScene then skips its code-drawn backdrop). */
  get hasBackdrop(): boolean {
    return this.bgImage.visible;
  }

  /** True when the current scene has a mapped cast (portraits or labelled gaps); the code portrait is the fallback otherwise. */
  get hasCast(): boolean {
    return this.slots.length > 0;
  }

  update(f: StoryArtFrame): void {
    if (this.destroyed) return;
    this.last = f;
    const key = `${f.sceneId}|${f.appearance}`;
    const entering = key !== this.visualKey;
    if (entering) {
      this.visualKey = key;
      this.visual = sceneVisual(f.sceneId, f.appearance);
      this.rebuildSlots();
      this.request();
    }
    const role = f.speaker ? (SPEAKER_ROLE[f.speaker] ?? null) : null;
    const speakerChanged = role !== this.speakerRole;
    this.speakerRole = role;
    this.placeBackdrop(f);
    this.placeCast(f, entering, speakerChanged);
  }

  describe(): unknown {
    const v = this.visual;
    return {
      scene: v?.sceneId ?? null,
      mapped: v !== null,
      revision: v?.revision ?? null,
      background: v?.backgroundAssetId ?? null,
      backgroundShown: this.bgImage.visible,
      speakerRole: this.speakerRole,
      cast: this.slots.map((s) => ({ role: s.role, assetId: s.assetId, state: s.state, visible: (s.img?.visible ?? false) || s.box.visible, speaking: s.role === this.speakerRole, alpha: s.img?.alpha ?? s.box.alpha, x: s.x })),
      textures: [...this.owned].filter((k) => this.scene.textures.exists(k)).length,
      reducedMotion: this.reducedMotion,
    };
  }

  destroy(): void {
    this.destroyed = true;
    this.scene.load.off(Phaser.Loader.Events.FILE_COMPLETE, this.onLoaded, this);
    this.scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, this.onFailed, this);
    this.clearSlots();
    for (const k of this.owned) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    this.owned.clear();
  }

  private wanted(v: SceneVisual | null = this.visual): string[] {
    if (!v) return [];
    return [v.backgroundAssetId, ...(v.presentation === 'cutscene' ? v.cast.map((c) => c.assetId) : [])].filter((x): x is string => x !== null);
  }

  private request(): void {
    // Current scene first, then the next authored scene so its art is ready when the story moves on.
    const cur = this.visual?.sceneId ?? null;
    const i = cur ? MAPPED_SCENE_IDS.indexOf(cur) : -1;
    const next = i >= 0 ? sceneVisual(MAPPED_SCENE_IDS[i + 1], this.last?.appearance ?? null) : null;
    const want = [...new Set([...this.wanted(), ...this.wanted(next)])];
    const keep = new Set(want.map(artTextureKey));
    // Bound residency: drop textures the current scene does not use.
    for (const k of [...this.owned]) {
      if (this.owned.size <= STORY_ART_MAX_TEXTURES - want.length) break;
      if (!keep.has(k) && this.scene.textures.exists(k)) {
        this.scene.textures.remove(k);
        this.owned.delete(k);
      }
    }
    let queued = false;
    for (const id of want) {
      const key = artTextureKey(id);
      const url = artUrl(id);
      if (this.scene.textures.exists(key) || this.failed.has(key)) continue;
      if (!url) {
        this.failed.add(key);
        continue;
      }
      this.scene.load.image(key, url);
      queued = true;
    }
    if (queued && !this.scene.load.isLoading()) this.scene.load.start();
  }

  private onLoaded(key: string, type: string): void {
    if (this.destroyed || type !== 'image' || !key.startsWith('art-v1:')) return;
    this.owned.add(key);
    this.refreshImages(true);
  }

  private onFailed(file: Phaser.Loader.File): void {
    if (this.destroyed || !String(file.key).startsWith('art-v1:')) return;
    this.failed.add(String(file.key));
    this.refreshImages(false);
  }

  private refreshImages(fadeIn: boolean): void {
    for (const s of this.slots) this.bindImage(s, fadeIn);
    if (this.last) {
      this.placeBackdrop(this.last);
      this.placeCast(this.last, false, false);
    }
    this.onChange?.();
  }

  /** StoryScene redraws its code-drawn backdrop when art arrives or fails. */
  onChange: (() => void) | null = null;

  private rebuildSlots(): void {
    this.clearSlots();
    const v = this.visual;
    if (!v || v.presentation !== 'cutscene') return;
    this.slots = v.cast.map((c) => {
      const box = this.scene.add.graphics().setDepth(-1).setVisible(false);
      const label = this.scene.add
        .text(0, 0, '', { fontFamily: FONT_FAMILY, fontSize: '12px', color: CSS.cream, align: 'center' })
        .setOrigin(0.5)
        .setDepth(-1)
        .setVisible(false);
      const s: Slot = { role: c.role, assetId: c.assetId, img: null, box, label, state: c.assetId ? 'loading' : 'gap', x: 0, placed: false };
      this.bindImage(s, false);
      return s;
    });
  }

  private bindImage(s: Slot, fadeIn: boolean): void {
    if (!s.assetId) return;
    const key = artTextureKey(s.assetId);
    if (this.failed.has(key)) {
      s.state = 'failed';
      s.img?.destroy();
      s.img = null;
      return;
    }
    if (s.img || !this.scene.textures.exists(key)) return;
    s.img = this.scene.add.image(0, 0, key).setOrigin(0.5, 1).setDepth(-1).setName(`story-art-${s.role}`);
    s.placed = false;
    s.state = 'shown';
    if (fadeIn && !this.reducedMotion) {
      s.img.setAlpha(0);
      this.scene.tweens.add({ targets: s.img, alpha: 1, duration: ENTER_MS });
    }
  }

  private clearSlots(): void {
    for (const s of this.slots) {
      if (s.img) this.scene.tweens.killTweensOf(s.img);
      s.img?.destroy();
      s.box.destroy();
      s.label.destroy();
    }
    this.slots = [];
  }

  private placeBackdrop(f: StoryArtFrame): void {
    const id = this.visual?.backgroundAssetId;
    const key = id ? artTextureKey(id) : '';
    if (!id || !this.scene.textures.exists(key)) {
      this.bgImage.setVisible(false);
      return;
    }
    if (this.bgImage.texture.key !== key) this.bgImage.setTexture(key);
    // Cover the area above the panel; the panel itself is near-opaque.
    const h = Math.max(1, f.panelY);
    const k = Math.max(f.width / this.bgImage.width, h / this.bgImage.height);
    this.bgImage.setScale(k).setPosition(f.width / 2, h / 2).setVisible(true);
  }

  private placeCast(f: StoryArtFrame, entering: boolean, speakerChanged: boolean): void {
    const n = this.slots.length;
    if (!n) return;
    const room = Math.max(40, f.panelY - f.top);
    // Portraits are 2:3; show the top ~78% above the panel so heads never clip the top bar.
    let h = room / 0.78;
    let w = (h * 2) / 3;
    const maxW = (f.width * 0.94) / Math.max(n, 1.6);
    if (w > maxW) {
      w = maxW;
      h = (w * 3) / 2;
    }
    const bottom = f.panelY + h * 0.22;
    this.slots.forEach((s, i) => {
      s.x = Math.round(f.width * ((i + 1) / (n + 1)));
      const speaking = this.speakerRole !== null && s.role === this.speakerRole;
      const anySpeaker = this.speakerRole !== null && this.slots.some((o) => o.role === this.speakerRole);
      const dim = f.showCast && anySpeaker && !speaking;
      const alpha = f.showCast ? 1 : 0;
      const lift = speaking ? Math.round(h * 0.025) : 0;
      if (s.img) {
        s.box.setVisible(false);
        s.label.setVisible(false);
        s.img.setDisplaySize(w, h).setVisible(f.showCast).setTint(dim ? 0x9c968c : 0xffffff);
        const ty = bottom - lift;
        if (this.reducedMotion) s.img.setPosition(s.x, ty).setAlpha(alpha);
        else if (entering) {
          this.scene.tweens.killTweensOf(s.img);
          const from = s.x < f.width / 2 ? -1 : s.x > f.width / 2 ? 1 : 0;
          s.img.setPosition(s.x + from * 24, ty).setAlpha(0);
          this.scene.tweens.add({ targets: s.img, x: s.x, alpha, duration: ENTER_MS, delay: i * 60, ease: 'Sine.easeOut' });
        } else if (speakerChanged) {
          this.scene.tweens.killTweensOf(s.img);
          s.img.setX(s.x);
          this.scene.tweens.add({ targets: s.img, y: ty, alpha, duration: LIFT_MS, ease: 'Sine.easeOut' });
        } else if (!this.scene.tweens.isTweening(s.img)) s.img.setPosition(s.x, ty).setAlpha(alpha);
        // Still fading in after a late load: it has never been placed, so position it now (the fade keeps running).
        else if (!s.placed) s.img.setPosition(s.x, ty);
        else s.img.setDisplaySize(w, h);
        s.placed = true;
      } else {
        // Labelled neutral fallback: never another character's art.
        const bw = Math.min(w * 0.7, 120);
        const bh = Math.min(room * 0.7, 150);
        const label = s.state === 'loading' ? '' : `${s.state === 'failed' ? 'Art unavailable' : 'Art gap'}\n${s.role === 'player' ? 'Player' : (artAsset(s.role)?.label ?? s.role)}`;
        s.box.clear().fillStyle(PALETTE.ink, 0.35).fillRoundedRect(s.x - bw / 2, f.panelY - bh - 6, bw, bh, 12).setVisible(f.showCast && s.state !== 'loading').setAlpha(alpha);
        s.label.setText(label).setPosition(s.x, f.panelY - bh / 2 - 6).setVisible(f.showCast && s.state !== 'loading').setAlpha(alpha);
      }
    });
  }
}
