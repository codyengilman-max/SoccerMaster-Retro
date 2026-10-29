import type Phaser from 'phaser';
import { PLAYER_ART } from './playerArt';
import { JUNGLE4_ART, jungle4Key, type Jungle4Set } from './jungle4Frames';

export * from './jungle4Frames';

/**
 * Jungle Ball replacement package (SoccerMaster_JungleBall_Replacement_Devin), built by scripts/art/build-jungle-v4.py.
 * Frames are trimmed with a per-frame pivot (ground point), so wide dives and slides keep their drawn size.
 * Every pose of a character shares one scale, set from its front idle height (`meta.bodyHeight`).
 */
const images = import.meta.glob('../../assets/art/jungle-v4/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const data = import.meta.glob('../../assets/art/jungle-v4/*.json', { eager: true, import: 'default' }) as Record<string, { meta: { bodyHeight?: number; diameter?: number } }>;
const base = (p: string): string => p.slice(p.lastIndexOf('/') + 1, p.lastIndexOf('.'));
const URLS = new Map(Object.entries(images).map(([p, u]) => [base(p), u] as const));
const JSONS = new Map(Object.entries(data).map(([p, j]) => [base(p), j] as const));

/** Standing visible body height on screen for a placeholder height `ph` (old Jungle Ball: bodyScale x ph). */
export const jungle4BodyHeight = (ph: number): number => PLAYER_ART.bodyScale * ph * JUNGLE4_ART.heightFactor;

export const jungle4BodyPx = (set: Jungle4Set): number => JSONS.get(set)?.meta.bodyHeight ?? 150;

/** Queue the given atlases (only what this screen shows). */
export function ensureJungle4(scene: Phaser.Scene, sets: Iterable<Jungle4Set>): void {
  let queued = false;
  for (const set of new Set(sets)) {
    const url = URLS.get(set), json = JSONS.get(set);
    if (!url || !json || scene.textures.exists(jungle4Key(set))) continue;
    scene.load.atlas(jungle4Key(set), url, json);
    queued = true;
  }
  if (queued && !scene.load.isLoading()) scene.load.start();
}

export function removeJungle4(scene: Phaser.Scene, sets: Iterable<Jungle4Set>): void {
  for (const set of sets) if (scene.textures.exists(jungle4Key(set))) scene.textures.remove(jungle4Key(set));
}

/** The frame's ground pivot as fractions of the trimmed frame (from the atlas JSON). */
export function jungle4Pivot(scene: Phaser.Scene, set: Jungle4Set, name: string): { x: number; y: number } | null {
  const tex = scene.textures.exists(jungle4Key(set)) ? scene.textures.get(jungle4Key(set)) : null;
  if (!tex || !tex.has(name)) return null;
  const p = (tex.get(name).customData as { pivot?: { x: number; y: number } }).pivot;
  return p ?? { x: 0.5, y: 1 };
}

/** Show `name` from `set` on `img`, feet on its position, standing height `bodyH` screen px. False until loaded. */
export function applyJungle4(img: Phaser.GameObjects.Image, set: Jungle4Set, name: string, bodyH: number): boolean {
  const p = jungle4Pivot(img.scene, set, name);
  if (!p) return false;
  const s = bodyH / jungle4BodyPx(set);
  img.setTexture(jungle4Key(set), name).setFlipX(false).setOrigin(p.x, p.y).setScale(s, s);
  return true;
}

