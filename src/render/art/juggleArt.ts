import Phaser from 'phaser';
import { JUGGLE_SHEET, type JuggleSex } from './juggleSheet';

/** Juggling/Referee pack sheets (art review build, not shipping approved): 6 x 4 cells of 160 x 128, row-major. */
const sheets = import.meta.glob('../../assets/art/juggling-v1/*_juggling.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const URLS: ReadonlyMap<JuggleSex, string> = new Map(
  Object.entries(sheets).map(([p, u]) => [p.slice(p.lastIndexOf('/') + 1).replace('_juggling.png', '') as JuggleSex, u] as const),
);
export const juggleKey = (sex: JuggleSex): string => `jug1:${sex}`;
export const juggleUrl = (sex: JuggleSex): string | undefined => URLS.get(sex);

/** Queue the sheet once; frames keep nearest-neighbour filtering so the pixel art stays crisp. */
export function ensureJuggleSheet(scene: Phaser.Scene, sex: JuggleSex): boolean {
  const key = juggleKey(sex);
  if (scene.textures.exists(key)) return true;
  const url = URLS.get(sex);
  if (!url) return false;
  if (!scene.load.textureManager.exists(key) && !(scene.load.list as unknown as { entries?: { key: string }[] }).entries?.some((f) => f.key === key)) {
    scene.load.spritesheet(key, url, { frameWidth: JUGGLE_SHEET.cell.w, frameHeight: JUGGLE_SHEET.cell.h });
    scene.load.once(`filecomplete-spritesheet-${key}`, () => scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST));
    if (!scene.load.isLoading()) scene.load.start();
  }
  return false;
}
