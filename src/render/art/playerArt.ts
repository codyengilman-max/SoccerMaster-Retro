import Phaser from 'phaser';
import { SPRITE_FRAME, drawSprite, type PoseKind, type SpriteLook } from './spriteFactory';
import { lookKey, type RosterLook } from './roster';
import { SPRITE_CELL, frameName, layoutOf, type SpriteSetId } from './spriteSets';

const atlasImages = import.meta.glob('../../assets/art/sprites-v2/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const atlasData = import.meta.glob('../../assets/art/sprites-v2/*.json', { eager: true, import: 'default' }) as Record<string, object>;
const base = (path: string): string => path.slice(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));
const ATLAS_URL: ReadonlyMap<string, string> = new Map(Object.entries(atlasImages).map(([p, u]) => [base(p), u] as const));
const ATLAS_JSON: ReadonlyMap<string, object> = new Map(Object.entries(atlasData).map(([p, j]) => [base(p), j] as const));
export const atlasKey = (set: SpriteSetId): string => `spr2:${set}`;

/** Gameplay art scale, independent of physics: visible body height as a multiple of the old placeholder height. */
export const PLAYER_ART = Object.freeze({
  /** Visible body (hair top to boots) in unpadded reference pixels at 1x. */
  visibleSourceHeight: 51,
  /** Oversized look: drawn body height relative to the pre-v1 placeholder height. Cosmetic only. */
  bodyScale: 1.3,
  /** Hard cap on cached frame textures (the reference factory's own cache bound). */
  maxFrames: 512,
});

/**
 * Bounded, lazily-filled frame cache for the current roster. Frames are drawn by the approved factory on
 * first use, uploaded as individual canvas textures and evicted least-recently-used. All textures are
 * removed on `destroy()` (scene shutdown).
 */
export class PlayerArt {
  private readonly keys = new Map<string, true>();
  private readonly atlases = new Set<SpriteSetId>();
  constructor(private readonly scene: Phaser.Scene) {}

  frame(look: SpriteLook, kind: PoseKind, dir: number, pose: number): string {
    const p = kind === 'run' ? pose % 6 : 0;
    const key = `pa:${lookKey(look)}:${kind}:${dir}:${p}`;
    if (this.keys.has(key)) {
      this.keys.delete(key);
      this.keys.set(key, true);
      return key;
    }
    while (this.keys.size >= PLAYER_ART.maxFrames) {
      const old = this.keys.keys().next().value as string;
      this.keys.delete(old);
      if (this.scene.textures.exists(old)) this.scene.textures.remove(old);
    }
    const canvas = document.createElement('canvas');
    canvas.width = SPRITE_FRAME.width;
    canvas.height = SPRITE_FRAME.height;
    drawSprite(canvas.getContext('2d')!, look, dir, p, kind);
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    this.scene.textures.addCanvas(key, canvas);
    this.keys.set(key, true);
    return key;
  }

  /** Queue the given sprite atlases (only what this screen shows). Until one loads, its players use drawn frames. */
  ensure(sets: Iterable<SpriteSetId | undefined>): void {
    let queued = false;
    for (const set of new Set(sets)) {
      if (!set || this.scene.textures.exists(atlasKey(set))) continue;
      const url = ATLAS_URL.get(set), json = ATLAS_JSON.get(set);
      if (!url || !json) continue;
      this.scene.load.atlas(atlasKey(set), url, json);
      this.atlases.add(set);
      queued = true;
    }
    if (queued && !this.scene.load.isLoading()) this.scene.load.start();
  }

  /**
   * Show a pose on `img`: the player's atlas frame when it is loaded, otherwise the drawn frame. `bodyH` is the
   * screen height the standing body should have (bodyScale x placeholder height); `k` is perspective.
   */
  apply(img: Phaser.GameObjects.Image, look: RosterLook | SpriteLook, kind: PoseKind, dir: number, pose: number, placeholderH: number, k = 1): Phaser.GameObjects.Image {
    const set = (look as RosterLook).set;
    const key = set ? atlasKey(set) : '';
    if (set && this.scene.textures.exists(key)) {
      const name = frameName(layoutOf(set), kind, dir, pose, (look as RosterLook).keeper === true);
      const tex = this.scene.textures.get(key);
      if (tex.has(name)) {
        const s = (PLAYER_ART.bodyScale * placeholderH * k) / SPRITE_CELL.bodyHeight;
        return img.setTexture(key, name).setOrigin(SPRITE_CELL.anchorX / SPRITE_CELL.width, SPRITE_CELL.anchorY / SPRITE_CELL.height).setScale(s, s);
      }
    }
    const sc = PlayerArt.scaleFor(placeholderH);
    return img.setTexture(this.frame(look, kind, dir, pose)).setOrigin(0.5, SPRITE_FRAME.anchorY / SPRITE_FRAME.height).setScale(sc.x * k, sc.y * k);
  }

  /** A named atlas frame (e.g. a Jungle Ball action) when the look's sheet has it; otherwise the `kind` pose. */
  applyNamed(img: Phaser.GameObjects.Image, look: RosterLook | SpriteLook, name: string | null, kind: PoseKind, dir: number, pose: number, placeholderH: number): Phaser.GameObjects.Image {
    const set = (look as RosterLook).set;
    const key = set ? atlasKey(set) : '';
    if (name && set && this.scene.textures.exists(key) && this.scene.textures.get(key).has(name)) {
      const s = (PLAYER_ART.bodyScale * placeholderH) / SPRITE_CELL.bodyHeight;
      return img.setTexture(key, name).setOrigin(SPRITE_CELL.anchorX / SPRITE_CELL.width, SPRITE_CELL.anchorY / SPRITE_CELL.height).setScale(s, s);
    }
    return this.apply(img, look, kind, dir, pose, placeholderH);
  }

  get size(): number {
    return this.keys.size;
  }

  /** Display scale for a frame so the visible body is `bodyScale x placeholderH` tall, keeping the approved 1.5:1.65 aspect. */
  static scaleFor(placeholderH: number): { x: number; y: number } {
    const k = (PLAYER_ART.bodyScale * placeholderH) / (PLAYER_ART.visibleSourceHeight * SPRITE_FRAME.scaleY);
    return { x: k * SPRITE_FRAME.scaleX, y: k * SPRITE_FRAME.scaleY };
  }

  destroy(): void {
    for (const k of this.keys.keys()) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    this.keys.clear();
    for (const s of this.atlases) if (this.scene.textures.exists(atlasKey(s))) this.scene.textures.remove(atlasKey(s));
    this.atlases.clear();
  }
}
