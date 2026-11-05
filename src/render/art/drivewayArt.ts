import type Phaser from 'phaser';
import type { ObjKind } from '../../game/driveway/sim';

/**
 * Driveway Dribbling owner art (src/assets/art/driveway-v1): background plus one object atlas sliced from the owner
 * sheets (originals unchanged in source/). Frames are `<kind>-<0..3>`: breakables intact/cracked/breaking/debris,
 * solids upright..tipped, rollers a 4-frame roll. Swapping final art = replace these files, no gameplay change.
 */
const images = import.meta.glob('../../assets/art/driveway-v1/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const data = import.meta.glob('../../assets/art/driveway-v1/*.json', { eager: true, import: 'default' }) as Record<string, object>;
const pick = <T>(m: Record<string, T>, name: string): T | undefined => Object.entries(m).find(([p]) => p.endsWith(`/${name}`))?.[1];

export const DD_BG_KEY = 'dd:background';
export const DD_OBJ_KEY = 'dd:objects';
/** Background art 1536x1024 (3:2). `garageBase`: the open garage's threshold, where the concrete starts, as a share of the art height (row 429, measured on the owner art). */
export const DD_BG = { width: 1536, height: 1024, garageBase: 429 / 1024 } as const;
/** Displayed object height = collision diameter x this (art includes a soft shadow and some height above the footprint). */
export const DD_ART_HEIGHT: Readonly<Record<ObjKind, number>> = {
  cone: 2.6, bucket: 2.2, wateringCan: 2.1, can: 1.9, basketball: 2.1, skateboard: 1.6, scooter: 2.6, tricycle: 2.4, box: 2.4, boxStack: 2.9, target: 2.6,
};

export function ensureDrivewayArt(scene: Phaser.Scene): void {
  const bg = pick(images, 'driveway-background.webp');
  const obj = pick(images, 'driveway-objects.webp');
  const json = pick(data, 'driveway-objects.json');
  let queued = false;
  if (bg && !scene.textures.exists(DD_BG_KEY)) (scene.load.image(DD_BG_KEY, bg), (queued = true));
  if (obj && json && !scene.textures.exists(DD_OBJ_KEY)) (scene.load.atlas(DD_OBJ_KEY, obj, json), (queued = true));
  if (queued && !scene.load.isLoading()) scene.load.start();
}
export function removeDrivewayArt(scene: Phaser.Scene): void {
  for (const k of [DD_BG_KEY, DD_OBJ_KEY]) if (scene.textures.exists(k)) scene.textures.remove(k);
}
