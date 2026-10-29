/** Jungle Ball replacement package: cast, scale rule and pose mapping (framework-free, unit tested). */

export const JUNGLE4_CAST = ['boy', 'girl', 'sam', 'blake', 'rival'] as const;
export type Jungle4Cast = (typeof JUNGLE4_CAST)[number];
export type Jungle4Set = `jungle4-${Jungle4Cast | 'keeper' | 'ball'}`;
export const jungle4Key = (set: Jungle4Set): string => `jb4:${set}`;

export const JUNGLE4_ART = Object.freeze({
  /** Package rule: visible height = previous Jungle Ball height x 1.35, applied once (depth scaling still applies). */
  heightFactor: 1.35,
  /** Ball rotation frames in the sheet. */
  ballFrames: 12,
});

// ---- Pose mapping (sim action state -> inspected package pose). Side poses are drawn facing right; "-w" is the mirror.

const west = (dir: number): boolean => dir >= 3 && dir <= 5;
const side = (name: string, dir: number): string => (west(dir) ? `${name}-w` : name);
const cycle = (pose: number, n: number): number => ((Math.floor(pose) % n) + n) % n;
const step = (names: readonly string[], k: number): string => names[Math.min(names.length - 1, Math.max(0, Math.floor(k * names.length)))]!;

export type Jungle4Act = 'impact' | 'falling' | 'down' | 'rising' | 'sprint' | 'charge' | 'strike' | 'hit' | 'slide' | 'recover' | 'stagger' | 'celebrate';
export type Jungle4Kind = 'run' | 'idle' | 'kick';

/**
 * Competitor frame. Runs are side-on only: the package has no front/back run, so up/down-screen running keeps the side
 * run (as before). Idle uses the drawn front and back views when facing down/up the screen.
 */
export function jungle4Frame(act: Jungle4Act | null, kind: Jungle4Kind, dir: number, pose: number, k: number): string {
  const d = Number.isInteger(dir) && dir >= 0 && dir <= 7 ? dir : 0;
  switch (act) {
    case 'impact': return side('stumble', d);
    case 'falling': return side(step(['stumble', 'down'], k), d);
    case 'down': return side(step(['down', 'seated'], k), d);
    case 'rising': return side(step(['seated', 'recovery', 'rise-3'], k), d);
    case 'stagger': return side('stumble', d);
    case 'sprint': return side(`run-${cycle(k, 6)}`, d);
    case 'charge': return side(step(['shot-0', 'shot-1', 'shot-2'], k), d);
    case 'strike': return side(step(['shot-3', 'shot-4', 'shot-5'], k), d);
    case 'hit': return side(step(['push-0', 'push-1'], k), d);
    case 'slide': return side(step(['slide-1', 'slide-2', 'slide-3', 'slide-4'], k), d);
    case 'recover': return side(step(['slide-5', 'rise-1', 'rise-3', 'rise-5'], k), d);
    case 'celebrate': return side('taunt', d);
    case null: break;
  }
  if (kind === 'run') return side(`run-${cycle(pose, 6)}`, d);
  if (kind === 'kick') return side('kick', d);
  return d >= 5 && d <= 7 ? 'idle-n' : d >= 1 && d <= 3 ? 'idle-s' : side('idle-e', d);
}

export type KeeperMode = 'set' | 'dive' | 'down' | 'hold';
/** Right-facing dive sequence (the sheet's a2/b1 are drawn facing the other way and are not used). */
const DIVE = ['dive-a0', 'dive-a1', 'dive-b2'] as const;
const GROUND = ['land-b', 'ground-b', 'up-b'] as const;
/** Ball hand while holding, in fractions of the trimmed frame (measured on the built frames). */
export const KEEPER_GLOVES: Readonly<Record<string, { x: number; y: number }>> = Object.freeze({
  'catch-chest': { x: 0.48, y: 0.47 },
  'throw-w': { x: 0.93, y: 0.15 },
});
/** Seconds before the sim's release that the throw key pose shows (ball stays in the glove until the sim lets go). */
export const KEEPER_THROW_LEAD = 0.25;

/**
 * Keeper frame. The keeper stands on the goal line facing the play (screen left). Dives along the goal line are drawn
 * side-on in the package (no toward/away-from-camera dive), so the side dive is used, facing the play.
 */
export function keeperFrame(mode: KeeperMode, k: number, holdLeft: number, moving: boolean): string {
  if (mode === 'dive') return `${step(DIVE, k)}-w`;
  if (mode === 'down') return `${step(GROUND, k)}-w`;
  if (mode === 'hold') return holdLeft <= KEEPER_THROW_LEAD ? 'throw-w' : 'catch-chest';
  return moving ? 'lateral-0-w' : 'side-w';
}

export const ballFrame = (spin: number): string => `ball-${cycle(spin, JUNGLE4_ART.ballFrames)}`;
