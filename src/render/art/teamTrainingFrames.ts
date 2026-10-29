import manifest from '../../assets/art/team-training-v1/manifest.json';

/**
 * Team Training package art (art review build, not shipping approved): derived atlases from
 * scripts/art/build-team-training.py. Framework-free so frame choice and sizing are unit tested.
 */
export const TT_ART = Object.freeze({
  cell: { w: manifest.cell[0]!, h: manifest.cell[1]! },
  anchor: { x: manifest.anchor[0]!, y: manifest.anchor[1]! },
  /** Visible standing-body height in atlas px (every sheet is normalised to it; protagonist outline excluded). */
  standVisibleHeight: manifest.standVisibleHeight,
  /** Owner target: 1.2075x the original training body height. No earlier 1.15x step was ever applied, so all of it applies here once. */
  sizeFactor: 1.2075,
  /** Original training body: the old PlayerArt drew the visible body at bodyScale (1.3) x the placeholder height. */
  baselineBodyScale: 1.3,
});

export const TT_TEAMMATES = ['teammate_01', 'teammate_02', 'teammate_03', 'teammate_04', 'teammate_05', 'teammate_06', 'teammate_07'] as const;
export const TT_OPPONENTS = ['opponent_01', 'opponent_02', 'opponent_03', 'opponent_04', 'opponent_05', 'opponent_06', 'opponent_07', 'opponent_08'] as const;
export type TtSheet = 'boy' | 'girl' | (typeof TT_TEAMMATES)[number] | (typeof TT_OPPONENTS)[number] | 'keeper_home' | 'keeper_away';
export const TT_SHEETS: readonly TtSheet[] = ['boy', 'girl', ...TT_TEAMMATES, ...TT_OPPONENTS, 'keeper_home', 'keeper_away'];

/** Original training placeholder height (px) for k screen px per metre, unchanged from the old scene. */
export const baselinePlaceholder = (k: number): number => Math.max(22, Math.min(34, k * 2.6));
/** Original visible body height on screen. */
export const baselineBody = (k: number): number => TT_ART.baselineBodyScale * baselinePlaceholder(k);
/** Target visible body height: 1.2075x the original, applied once. Visual only: no physics radius uses it. */
export const targetBody = (k: number): number => TT_ART.sizeFactor * baselineBody(k);
/** Display scale for an atlas frame so the standing body is `targetBody(k)` tall. */
export const ttScale = (k: number): number => targetBody(k) / TT_ART.standVisibleHeight;

export type TtAction = 'stand' | 'run' | 'pass' | 'receive' | 'shuffle' | 'keeper-ready';

/** Row starts in the 6 x 4 outfield atlas. */
const ROW = { run: 0, pass: 6, receive: 12, shuffle: 18 } as const;
/** Row 2 column 1: the validated upright two-foot stance (no idle cycle is supplied). */
export const STAND_FRAME = 6;
/** Pass row: plant (8), strike with the foot on the ball (9, the contact frame), follow-through (10). */
export const PASS_CONTACT_FRAME = 9;
/** Receive row: reach (13), first touch with the foot on the ball (14, the contact frame), settle (15). */
export const RECEIVE_CONTACT_FRAME = 14;
/** Keeper strip: stand, run, stride, ready. Only these four key poses exist; there are no save, dive, catch, throw or punt cycles. */
export const KEEPER = { stand: 0, run: 1, stride: 2, ready: 3 } as const;

/**
 * Frame for an action. `phase` is the distance-driven run phase (0..1 per stride cycle); `since` is seconds since
 * the ball left (pass) or arrived (receive), so the contact frame lines up with the ball's own sprite.
 */
export function ttFrame(keeper: boolean, action: TtAction, phase: number, since = 0): number {
  if (keeper) return action === 'run' || action === 'shuffle' ? KEEPER.run : action === 'keeper-ready' ? KEEPER.ready : action === 'pass' ? KEEPER.stride : KEEPER.stand;
  const cyc = (n: number) => Math.floor((((phase % 1) + 1) % 1) * n) % n;
  switch (action) {
    case 'run':
      return ROW.run + cyc(6);
    case 'shuffle':
      return ROW.shuffle + cyc(6);
    case 'pass':
      return since < 0.12 ? PASS_CONTACT_FRAME : since < 0.3 ? PASS_CONTACT_FRAME + 1 : STAND_FRAME;
    case 'receive':
      return since < 0.15 ? RECEIVE_CONTACT_FRAME : since < 0.35 ? RECEIVE_CONTACT_FRAME + 1 : STAND_FRAME;
    case 'keeper-ready':
    case 'stand':
      return STAND_FRAME;
  }
}

/**
 * Identities for one session: protagonist (saved boy or girl, never both), the 7 supplied teammates, the 8 supplied
 * opponents and the two keepers. Slots keep the same sheet for the whole session, retries and replays.
 */
export function ttIdentities(look: 'boy' | 'girl', homeSlots: readonly string[], awaySlots: readonly string[], human: string, homeKeeper: string | null, awayKeeper: string | null): ReadonlyMap<string, TtSheet> {
  const m = new Map<string, TtSheet>();
  m.set(human, look);
  let i = 0;
  for (const s of homeSlots) if (s !== human && s !== homeKeeper) m.set(s, TT_TEAMMATES[i++ % TT_TEAMMATES.length]!);
  let j = 0;
  for (const s of awaySlots) if (s !== awayKeeper) m.set(s, TT_OPPONENTS[j++ % TT_OPPONENTS.length]!);
  if (homeKeeper && homeKeeper !== human) m.set(homeKeeper, 'keeper_home');
  if (awayKeeper) m.set(awayKeeper, 'keeper_away');
  return m;
}

/** One actor of a static Weekly Team Training picture (All36 package data, metres, home attacking +y). */
export interface StillActor {
  readonly id: string;
  readonly team: 'H' | 'A';
  readonly role: string;
  readonly at: readonly [number, number];
}
export interface StillPose {
  readonly sheet: TtSheet;
  readonly action: TtAction;
  readonly frame: number;
  readonly flip: boolean;
  readonly keeper: boolean;
}

/**
 * Supplied sheets for a Weekly Team Training picture: the saved boy or girl in the protagonist's slot, distinct
 * orange teammates for the other home actors, distinct green-pinnie opponents for the away actors and the training
 * keeper sheets for each side's GK. Teams and keepers come from the package actor data only.
 */
export function stillCast(look: 'boy' | 'girl', actors: readonly StillActor[], protagonist: string): ReadonlyMap<string, TtSheet> {
  const home = actors.filter((a) => a.team === 'H').map((a) => a.id);
  const away = actors.filter((a) => a.team === 'A').map((a) => a.id);
  const gk = (t: 'H' | 'A') => actors.find((a) => a.team === t && a.role === 'GK')?.id ?? null;
  return ttIdentities(look, home, away, protagonist, gk('H'), gk('A'));
}

/** Defenders within this many metres of the ball hold the defensive stance instead of standing. */
export const STILL_PRESS_M = 8;

/**
 * The frozen observation pose: nobody moves (positions are the approved state). Sheets face right, so each player
 * is mirrored to face the ball; the carrier faces the goal they attack. Defenders near the ball and a defending
 * keeper hold their ready stances; everyone else stands.
 */
export function stillPose(a: StillActor, sheet: TtSheet, ball: readonly [number, number], owner: StillActor | null, fieldWidth: number): StillPose {
  const keeper = a.role === 'GK';
  const defending = owner ? owner.team !== a.team : false;
  const near = Math.hypot(a.at[0] - ball[0], a.at[1] - ball[1]) < STILL_PRESS_M;
  const action: TtAction = keeper ? (defending || !owner ? 'keeper-ready' : 'stand') : defending && near ? 'shuffle' : 'stand';
  const frame = action === 'shuffle' ? ROW.shuffle : ttFrame(keeper, action, 0);
  const lookX = owner?.id === a.id ? fieldWidth / 2 : ball[0];
  return { sheet, action, frame, flip: lookX < a.at[0] - 0.25, keeper };
}
