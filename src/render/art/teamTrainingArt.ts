import Phaser from 'phaser';
import { TT_ART, TT_SHEETS, type TtSheet } from './teamTrainingFrames';

/** Team Training package atlases (art review build, not shipping approved). The glob is the build-time allowlist. */
const files = import.meta.glob('../../assets/art/team-training-v1/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const URLS: ReadonlyMap<string, string> = new Map(Object.entries(files).map(([p, u]) => [p.slice(p.lastIndexOf('/') + 1, -'.webp'.length), u] as const));

export const ttKey = (sheet: TtSheet): string => `tt1:${sheet}`;
export const ttUrl = (sheet: TtSheet): string | undefined => URLS.get(sheet);

/** Queue every sheet once. Returns true when all are already loaded. */
export function ensureTtArt(scene: Phaser.Scene, sheets: readonly TtSheet[] = TT_SHEETS): boolean {
  let ready = true;
  for (const s of sheets) {
    const key = ttKey(s);
    if (scene.textures.exists(key)) continue;
    ready = false;
    const url = URLS.get(s);
    if (!url) continue;
    const queued = (scene.load.list as unknown as { entries?: { key: string }[] }).entries?.some((f) => f.key === key);
    if (!queued) scene.load.spritesheet(key, url, { frameWidth: TT_ART.cell.w, frameHeight: TT_ART.cell.h });
  }
  if (!ready && !scene.load.isLoading()) scene.load.start();
  return ready;
}
