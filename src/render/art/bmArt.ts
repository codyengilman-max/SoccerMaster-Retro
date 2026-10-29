import Phaser from 'phaser';

/** Ball Mastery art v1 runtime sheets (cleaned owner drafts; teaching pages only, never gameplay). */
import { BM_SHEET } from './bmSheet';
const sheets = import.meta.glob('../../assets/art/ball-mastery-v1/*_ball_mastery.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export type BmSex = keyof typeof BM_SHEET;
const URLS: ReadonlyMap<string, string> = new Map(Object.entries(sheets).map(([p, u]) => [p.slice(p.lastIndexOf('/') + 1).replace('_ball_mastery.png', ''), u] as const));
export const bmKey = (sex: BmSex): string => `bm1:${sex}`;

/** Queue the sheet once; painted art keeps linear filtering. Returns true once the texture is ready. */
export function ensureBmSheet(scene: Phaser.Scene, sex: BmSex): boolean {
  const key = bmKey(sex);
  if (scene.textures.exists(key)) return true;
  const url = URLS.get(sex);
  if (!url) return false;
  if (!(scene.load.list as unknown as { entries?: { key: string }[] }).entries?.some((f) => f.key === key)) {
    const { cell } = BM_SHEET[sex];
    scene.load.spritesheet(key, url, { frameWidth: cell.w, frameHeight: cell.h });
    if (!scene.load.isLoading()) scene.load.start();
  }
  return false;
}
