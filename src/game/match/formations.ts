/**
 * Formation data for the 9v9 sandbox. Positions are in the home team's frame:
 * own goal at x = 0, attacking toward x = 75, y across 0..50 with y < 25 on the team's left.
 * The away team uses the same data mirrored through the centre spot.
 */
export type FormationId = '1-3-2-3' | '1-3-3-2' | '1-2-4-2';
export const FORMATION_IDS: readonly FormationId[] = ['1-3-2-3', '1-3-3-2', '1-2-4-2'];
export const DEFAULT_FORMATION: FormationId = '1-3-2-3';

export type RoleId =
  | 'GK'
  | 'LB' | 'CB' | 'RB' | 'LCB' | 'RCB'
  | 'LCM' | 'CM' | 'RCM' | 'LM' | 'RM'
  | 'LW' | 'ST' | 'RW' | 'LS' | 'RS';

export type Line = 'keeper' | 'defence' | 'midfield' | 'attack';

/** What a role contributes when its team has the ball. */
export type InPossessionDuty =
  | 'distribute' // keeper: safe outlet, never joins attacks
  | 'balance' // stays behind the ball as rest defence
  | 'width' // holds the touchline to stretch the press, outlet for a switch
  | 'support' // offers a short angle beside or behind the carrier
  | 'depth'; // pins the back line and makes runs behind

/** What a role does when the other team has the ball (the press/cover jobs are assigned on top of this). */
export type OutOfPossessionDuty =
  | 'goal' // keeper
  | 'holdLine' // defender: protect the space in front of goal, step to runners in its zone
  | 'protectCentre' // midfielder: screen central lanes between the ball and goal
  | 'trackRunner' // follow the nearest opponent through its zone
  | 'pressHigh'; // forward: first pressure on the opponent's back line, cuts back passes

export interface Bounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface RoleDef {
  readonly id: RoleId;
  readonly line: Line;
  /** Shape position with the ball on the centre spot. */
  readonly base: { readonly x: number; readonly y: number };
  readonly inPossession: InPossessionDuty;
  readonly outOfPossession: OutOfPossessionDuty;
  /** Movement limits: the anchor is clamped here, so a role can drift but not abandon its zone. */
  readonly bounds: Bounds;
  /** Roles this one keeps spacing with and covers for. */
  readonly adjacent: readonly RoleId[];
}

export interface FormationDef {
  readonly id: FormationId;
  /** Index i is "slot" i. Switching formation maps slot i to slot i (see ROLE_MAP). */
  readonly roles: readonly RoleDef[];
}

const r = (
  id: RoleId,
  line: Line,
  x: number,
  y: number,
  inPossession: InPossessionDuty,
  outOfPossession: OutOfPossessionDuty,
  bounds: Bounds,
  adjacent: readonly RoleId[],
): RoleDef => ({ id, line, base: { x, y }, inPossession, outOfPossession, bounds, adjacent });

const GK = r('GK', 'keeper', 3, 25, 'distribute', 'goal', { minX: 0.5, maxX: 14, minY: 16, maxY: 34 }, ['CB', 'LCB', 'RCB']);

export const FORMATIONS: Readonly<Record<FormationId, FormationDef>> = {
  '1-3-2-3': {
    id: '1-3-2-3',
    roles: [
      GK,
      r('LB', 'defence', 17, 12, 'width', 'holdLine', { minX: 4, maxX: 52, minY: 2, maxY: 30 }, ['CB', 'LCM', 'LW']),
      r('CB', 'defence', 14, 25, 'balance', 'holdLine', { minX: 4, maxX: 42, minY: 12, maxY: 38 }, ['LB', 'RB', 'LCM', 'RCM']),
      r('RB', 'defence', 17, 38, 'width', 'holdLine', { minX: 4, maxX: 52, minY: 20, maxY: 48 }, ['CB', 'RCM', 'RW']),
      r('LCM', 'midfield', 31, 19, 'support', 'protectCentre', { minX: 8, maxX: 62, minY: 4, maxY: 36 }, ['RCM', 'LB', 'LW', 'ST']),
      r('RCM', 'midfield', 31, 31, 'support', 'protectCentre', { minX: 8, maxX: 62, minY: 14, maxY: 46 }, ['LCM', 'RB', 'RW', 'ST']),
      r('LW', 'attack', 46, 8, 'width', 'trackRunner', { minX: 18, maxX: 72, minY: 1.5, maxY: 30 }, ['ST', 'LCM', 'LB']),
      r('ST', 'attack', 50, 25, 'depth', 'pressHigh', { minX: 26, maxX: 72, minY: 10, maxY: 40 }, ['LW', 'RW', 'LCM', 'RCM']),
      r('RW', 'attack', 46, 42, 'width', 'trackRunner', { minX: 18, maxX: 72, minY: 20, maxY: 48.5 }, ['ST', 'RCM', 'RB']),
    ],
  },
  '1-3-3-2': {
    id: '1-3-3-2',
    roles: [
      GK,
      r('LB', 'defence', 17, 12, 'width', 'holdLine', { minX: 4, maxX: 50, minY: 2, maxY: 30 }, ['CB', 'LM']),
      r('CB', 'defence', 14, 25, 'balance', 'holdLine', { minX: 4, maxX: 42, minY: 12, maxY: 38 }, ['LB', 'RB', 'CM']),
      r('RB', 'defence', 17, 38, 'width', 'holdLine', { minX: 4, maxX: 50, minY: 20, maxY: 48 }, ['CB', 'RM']),
      r('CM', 'midfield', 30, 25, 'balance', 'protectCentre', { minX: 8, maxX: 58, minY: 10, maxY: 40 }, ['LM', 'RM', 'CB', 'LS', 'RS']),
      r('RM', 'midfield', 34, 41, 'width', 'trackRunner', { minX: 10, maxX: 70, minY: 22, maxY: 48.5 }, ['CM', 'RB', 'RS']),
      r('LM', 'midfield', 34, 9, 'width', 'trackRunner', { minX: 10, maxX: 70, minY: 1.5, maxY: 28 }, ['CM', 'LB', 'LS']),
      r('LS', 'attack', 48, 19, 'depth', 'pressHigh', { minX: 26, maxX: 72, minY: 6, maxY: 36 }, ['RS', 'LM', 'CM']),
      r('RS', 'attack', 48, 31, 'support', 'pressHigh', { minX: 26, maxX: 72, minY: 14, maxY: 44 }, ['LS', 'RM', 'CM']),
    ],
  },
  '1-2-4-2': {
    id: '1-2-4-2',
    roles: [
      GK,
      r('LCB', 'defence', 14, 18, 'balance', 'holdLine', { minX: 4, maxX: 42, minY: 4, maxY: 34 }, ['RCB', 'LM', 'LCM']),
      r('RCB', 'defence', 14, 32, 'balance', 'holdLine', { minX: 4, maxX: 42, minY: 16, maxY: 46 }, ['LCB', 'RM', 'RCM']),
      r('RM', 'midfield', 31, 42, 'width', 'trackRunner', { minX: 8, maxX: 70, minY: 22, maxY: 48.5 }, ['RCM', 'RCB', 'RS']),
      r('LCM', 'midfield', 28, 20, 'support', 'protectCentre', { minX: 8, maxX: 60, minY: 6, maxY: 36 }, ['RCM', 'LM', 'LCB', 'LS']),
      r('RCM', 'midfield', 28, 30, 'balance', 'protectCentre', { minX: 8, maxX: 60, minY: 14, maxY: 44 }, ['LCM', 'RM', 'RCB', 'RS']),
      r('LM', 'midfield', 31, 8, 'width', 'trackRunner', { minX: 8, maxX: 70, minY: 1.5, maxY: 28 }, ['LCM', 'LCB', 'LS']),
      r('LS', 'attack', 47, 19, 'depth', 'pressHigh', { minX: 26, maxX: 72, minY: 6, maxY: 36 }, ['RS', 'LM', 'LCM']),
      r('RS', 'attack', 47, 31, 'support', 'pressHigh', { minX: 26, maxX: 72, minY: 14, maxY: 44 }, ['LS', 'RM', 'RCM']),
    ],
  },
};

/**
 * Explicit, stable role mapping used when a formation changes: the player in slot i of the old
 * formation takes slot i of the new one. Slots were ordered so each pairing is the nearest sensible
 * job (e.g. 1-3-2-3 RW -> 1-3-3-2 RS -> 1-2-4-2 RS; 1-3-x RB -> 1-2-4-2 RM).
 */
export function roleMap(from: FormationId, to: FormationId): ReadonlyMap<RoleId, RoleId> {
  const a = FORMATIONS[from].roles;
  const b = FORMATIONS[to].roles;
  return new Map(a.map((role, i) => [role.id, (b[i] ?? role).id]));
}

export function roleDef(formation: FormationId, slot: number): RoleDef {
  const def = FORMATIONS[formation].roles[slot];
  if (!def) throw new Error(`formation ${formation} has no slot ${slot}`);
  return def;
}
