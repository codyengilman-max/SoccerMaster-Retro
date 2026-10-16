import Phaser from 'phaser';
import { SPRITE_FRAME, drawSprite, type PoseKind, type SpriteLook } from './spriteFactory';
import { lookKey } from './roster';

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
  }
}
