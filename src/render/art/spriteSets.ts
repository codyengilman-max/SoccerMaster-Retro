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
/** Animated Rosters v2 (owner pack, partial): one atlas per appearance, `<team>_01`..`_08` outfield, `_09` keeper. */
export type AppearanceSetId = `appr-${string}`;
export type SpriteSetId = (typeof SPRITE_SETS)[number] | AppearanceSetId;
export type SetLayout = 'protagonist' | 'goalkeeper' | 'club' | 'club-training' | 'coach' | 'jungle' | 'appearance' | 'appearance-keeper';
/** Clubs whose nine match-kit appearances are all drawn; a partly drawn club keeps its v2 club sheet so one side never mixes styles. */
export const APPEARANCE_CLUBS: Readonly<Partial<Record<SpriteClub, string>>> = Object.freeze({ batavia: 'fc_batavia', royal_salt: 'royal_salt' });
/** Stable appearance for a lineup slot (0 = keeper): the slot is the player's identity, so it never rerolls per match or reload. */
export function appearanceSet(club: SpriteClub, slot: number): AppearanceSetId | null {
  const team = APPEARANCE_CLUBS[club];
  if (!team || !Number.isInteger(slot) || slot < 0 || slot > 8) return null;
  return `appr-${team}_${String(slot === 0 ? 9 : slot).padStart(2, '0')}`;
}
/** Slide frames the pack disables because the drawing drifted from the player's design. */
export const APPEARANCE_UNUSED: Readonly<Record<string, readonly number[]>> = Object.freeze({ royal_salt_03: [23], desert_tuzon_02: [23], desert_tuzon_03: [23] });

export const layoutOf = (id: SpriteSetId): SetLayout =>
  id.startsWith('appr-') ? (id.endsWith('_09') ? 'appearance-keeper' : 'appearance')
  : id === 'coach-code' ? 'coach'
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
    case 'appearance':
    case 'appearance-keeper':
      throw new Error('appearance sets use appearanceFrame');
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

export type JungleAct = 'impact' | 'falling' | 'down' | 'rising' | 'sprint' | 'charge' | 'strike' | 'hit' | 'slide' | 'recover' | 'stagger';
/**
 * Jungle Ball action frames from the owner action sheets (v3). `k` is progress 0..1 through a timed action,
 * or the running-cycle counter for `sprint`. Slides use the grounded frames: the sheets have no slide-tackle pose.
 */
export function jungleActionFrame(act: JungleAct, dir: number, k: number): string {
  const d = Number.isInteger(dir) && dir >= 0 && dir <= 7 ? dir : 0;
  const at = (n: number): number => Math.min(n - 1, Math.max(0, Math.floor(k * n)));
  switch (act) {
    case 'impact': return side('impact', d);
    case 'falling': return side(`fall-${at(2)}`, d);
    case 'down': return side(`down-${at(4)}`, d);
    case 'rising': return side(`rise-${at(3)}`, d);
    case 'stagger': return side(`dazed-${cycle(k * 6, 2)}`, d);
    case 'sprint': return side(`sprint-${cycle(k, 6)}`, d);
    case 'charge': return side(`shot-${at(3)}`, d);
    case 'strike': return side(`shot-${3 + at(3)}`, d);
    case 'hit': return side(`hit-${at(6)}`, d);
    case 'slide': return side(k < 0.5 ? 'fall-1' : 'down-0', d);
    case 'recover': return side(`rise-${at(3)}`, d);
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

/**
 * Animated Rosters v2 frame for a pose: side poses are drawn facing right and the three left-facing
 * directions mirror them (`flipX`), as the pack specifies. Straight down-screen runs use the front cycle,
 * straight up-screen the back cycle. Kicks show the contact frame (the sim owns the ball and timing).
 */
export function appearanceFrame(set: AppearanceSetId, kind: PoseKind, dir: number, pose: number): { name: string; flipX: boolean } {
  const id = set.slice(5);
  const d = Number.isInteger(dir) && dir >= 0 && dir <= 7 ? dir : 2;
  const f = (n: number, flip = west(d)): { name: string; flipX: boolean } => ({ name: `${id}_${String(n).padStart(2, '0')}`, flipX: flip });
  if (set.endsWith('_09')) {
    if (kind === 'run') return d === 2 ? f(6 + cycle(pose, 6), false) : d === 6 ? f(12 + cycle(pose, 6), false) : f(cycle(pose, 6));
    if (kind === 'dive' || kind === 'slide') return f(23);
    if (kind === 'kick') return f(27);
    return f(18, false);
  }
  if (kind === 'run') return d === 2 ? f(4 + cycle(pose, 4), false) : d === 6 ? f(8 + cycle(pose, 4), false) : f(cycle(pose, 4));
  if (kind === 'kick') return f(13);
  if (kind === 'slide' || kind === 'dive') return f((APPEARANCE_UNUSED[id] ?? []).includes(23) ? 22 : 23);
  return f(21, false);
}
