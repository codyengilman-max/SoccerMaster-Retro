/**
 * Sprites v2 (owner sheets, 2026-10-20): which runtime atlas a player wears and which named pose shows for
 * what the sim says they are doing. Pure and cosmetic: nothing here is read by the simulation.
 * Atlases are built by scripts/art/build-sprites.py from docs/art/sprites-v2/source/ (sheets kept unchanged).
 */
import type { PoseKind } from './spriteFactory';

export const SPRITE_CLUBS = ['batavia', 'royal_salt', 'valley_rising', 'desert_tuzon', 'sol_vista', 'next_horizon'] as const;
export type SpriteClub = (typeof SPRITE_CLUBS)[number];
export type Kit = 'match' | 'training';
export type ProtagonistSex = 'boy' | 'girl';

export const SPRITE_SETS = [
  'boy-match', 'girl-match', 'boy-training', 'girl-training', 'boy-goalkeeper', 'girl-goalkeeper',
  'club-batavia-match', 'club-batavia-training', 'club-royal_salt', 'club-valley_rising', 'club-desert_tuzon', 'club-sol_vista', 'club-next_horizon',
  'coach-code',
  'jungle-boy', 'jungle-girl', 'jungle-blake', 'jungle-sam',
] as const;
export type SpriteSetId = (typeof SPRITE_SETS)[number];
export type SetLayout = 'protagonist' | 'goalkeeper' | 'club' | 'club-training' | 'coach' | 'jungle';

export const layoutOf = (id: SpriteSetId): SetLayout =>
  id === 'coach-code' ? 'coach'
  : id.startsWith('jungle-') ? 'jungle'
  : id.endsWith('-goalkeeper') ? 'goalkeeper'
  : id === 'club-batavia-training' ? 'club-training'
  : id.startsWith('club-') ? 'club'
  : 'protagonist';

/** Atlas geometry shared by every set (see build-sprites.py). */
export const SPRITE_CELL = Object.freeze({ width: 160, height: 128, anchorX: 80, anchorY: 120, bodyHeight: 100 });

/** Club sheet for a club id; Batavia has separate match and training kits. */
export function clubSet(club: SpriteClub, kit: Kit = 'match'): SpriteSetId {
  return club === 'batavia' ? (kit === 'training' ? 'club-batavia-training' : 'club-batavia-match') : `club-${club}`;
}

export const isSpriteClub = (v: unknown): v is SpriteClub => typeof v === 'string' && (SPRITE_CLUBS as readonly string[]).includes(v);

/** The created player's own sheet: outfield kit, or the keeper sheet when they play in goal. */
export function protagonistSet(sex: ProtagonistSex, kit: Kit, keeper: boolean): SpriteSetId {
  return keeper ? `${sex}-goalkeeper` : `${sex}-${kit}`;
}

// Reference direction index (0 = east, 2 = south/down-screen, clockwise) -> protagonist idle facing.
const IDLE8 = ['idle-e', 'idle-se', 'idle-s', 'idle-sw', 'idle-w', 'idle-nw', 'idle-n', 'idle-ne'] as const;
/** Sheets draw side poses facing right; the three left-facing directions use the pre-mirrored "-w" copy. */
const west = (dir: number): boolean => dir === 3 || dir === 4 || dir === 5;
const side = (name: string, dir: number): string => (west(dir) ? `${name}-w` : name);
const cycle = (pose: number, n: number): number => ((Math.floor(pose) % n) + n) % n;

/**
 * Frame name for a pose. `keeper` selects goalkeeper poses on sheets that carry them (club sheets' keeper
 * row); `pose` is the running-cycle counter the scenes already keep.
 */
export function frameName(layout: SetLayout, kind: PoseKind, dir: number, pose: number, keeper = false): string {
  const d = Number.isInteger(dir) && dir >= 0 && dir <= 7 ? dir : 2;
  switch (layout) {
    case 'protagonist':
      if (kind === 'idle') return IDLE8[d]!;
      if (kind === 'run') return side(`run-${cycle(pose, 8)}`, d);
      if (kind === 'kick') return side('kick-4', d);
      return side('slide-1', d); // slide; outfield sheets have no dive
    case 'goalkeeper':
      if (kind === 'dive' || kind === 'slide') return west(d) ? 'dive-l-3' : 'dive-r-3';
      if (kind === 'kick') return side('throw-2', d);
      if (kind === 'run') return side(`shuffle-${cycle(pose, 2)}`, d);
      return d >= 5 && d <= 7 ? 'ready-n' : 'ready-s';
    case 'club':
      if (keeper) return kind === 'dive' || kind === 'slide' ? (west(d) ? 'gk-dive-l' : 'gk-dive-r') : 'gk-ready';
      if (kind === 'run') return side(`run-${cycle(pose, 6)}`, d);
      if (kind === 'kick') return side('kick-3', d);
      if (kind === 'slide' || kind === 'dive') return side('slide-0', d);
      return d === 6 ? 'idle-n' : d === 2 ? 'idle-s' : side('idle-e', d);
    case 'club-training':
      if (kind === 'run') return side(`run-${cycle(pose, 6)}`, d);
      if (kind === 'kick') return side('kick-1', d);
      if (kind === 'slide' || kind === 'dive') return side('slide-0', d);
      return side('ready-0', d);
    case 'coach':
      return 'idle';
    case 'jungle':
      // Jungle Ball package clips (side-on schoolyard): run_right x6, pass (kick contact), stumble; no hand-action frames.
      if (kind === 'run') return side(`run-${cycle(pose, 6)}`, d);
      if (kind === 'kick') return side('kick-1', d);
      if (kind === 'slide' || kind === 'dive') return side('stumble', d);
      return d >= 5 ? 'idle-n' : d >= 1 && d <= 3 ? 'idle-s' : d === 4 ? 'idle-w' : 'idle-e';
  }
}

/** Coach Code's poses for training beats (instruction, pointing, observing, clipboard, encouragement, correction). */
export const COACH_POSE = Object.freeze({
  instruct: 'explain', point: 'point', observe: 'hips', clipboard: 'clipboard', encourage: 'clap', correct: 'shout', idle: 'idle', walk: 'walk',
} as const);

/** Juggling cycle for a set (protagonist sheets have 8 touches, Batavia training 6). */
export function juggleFrame(layout: SetLayout, pose: number): string | null {
  if (layout === 'protagonist') return `juggle-${cycle(pose, 8)}`;
  if (layout === 'club-training') return `juggle-${cycle(pose, 6)}`;
  return null;
}
