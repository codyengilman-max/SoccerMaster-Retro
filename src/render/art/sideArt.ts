import type Phaser from 'phaser';
import { SIDE_CONTACT, type SideSex } from './sideContactFrames';

/** Ball Mastery side-view contact atlases (derived from sprites-v2 training art; teaching pages only, never gameplay). */
const images = import.meta.glob('../../assets/art/ball-mastery-side/*-side.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const data = import.meta.glob('../../assets/art/ball-mastery-side/*-side.json', { eager: true, import: 'default' }) as Record<string, object>;
const sexOf = (p: string): string => p.slice(p.lastIndexOf('/') + 1).replace(/-side\.(webp|json)$/, '');
const URLS = new Map(Object.entries(images).map(([p, u]) => [sexOf(p), u] as const));
const JSONS = new Map(Object.entries(data).map(([p, j]) => [sexOf(p), j] as const));
export const sideKey = (sex: SideSex): string => `bmside:${sex}`;
export { SIDE_CONTACT, type SideSex };

/** Queue the atlas once; pixel art. True once the texture is ready. */
export function ensureSideArt(scene: Phaser.Scene, sex: SideSex): boolean {
  const key = sideKey(sex);
  if (scene.textures.exists(key)) return true;
  const url = URLS.get(sex), json = JSONS.get(sex);
  if (!url || !json) return false;
  if (!(scene.load.list as unknown as { entries?: { key: string }[] }).entries?.some((f) => f.key === key)) {
    scene.load.atlas(key, url, json);
    if (!scene.load.isLoading()) scene.load.start();
  }
  return false;
}
