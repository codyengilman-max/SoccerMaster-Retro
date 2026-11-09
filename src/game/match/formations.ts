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

// ---- Formation responsibilities (shared tactical framework) -------------------------------------

/** Players on the pitch for standard 9v9: one keeper and eight outfielders. */
export const PLAYERS_PER_TEAM = 9;
export const OUTFIELD_PER_TEAM = PLAYERS_PER_TEAM - 1;

export type Channel = 'left' | 'central' | 'right';

/** Lateral channel of a role from its start spot (team frame, y < 25 on the team's left). */
export function channelOf(role: RoleDef, width = 50): Channel {
  const third = width / 3;
  if (role.base.y < third) return 'left';
  if (role.base.y > width - third) return 'right';
  return 'central';
}

/** Outfield line counts parsed from a formation id; a leading keeper digit ("1-") is ignored, so "1-3-2-3" and "3-2-3" agree. */
export function lineCounts(id: string): number[] {
  const parts = id.split('-').map((n) => Number(n));
  if (parts.some((n) => !Number.isInteger(n) || n < 0)) throw new Error(`bad formation notation ${id}`);
  const sum = parts.reduce((a, b) => a + b, 0);
  if (sum === PLAYERS_PER_TEAM && parts[0] === 1) return parts.slice(1);
  return parts;
}

/**
 * Who carries each shared responsibility in a formation. Never invents a player: a missing specialist role
 * (no holding midfielder, no full-backs, no wingers, one or two forwards) is given to the nearest suitable role.
 */
export interface FormationResponsibilities {
  readonly id: FormationId;
  /** Protects central space in front of the back line when the team loses the ball (a holding midfielder, else the deepest central midfielder). */
  readonly centreScreen: RoleId;
  /** Rest defence kept behind the ball in possession (every 'balance' role, at least one defender). */
  readonly restDefence: readonly RoleId[];
  /** Width on each side in possession: the most advanced 'width' role in that channel. */
  readonly width: Readonly<Record<'left' | 'right', RoleId>>;
  /** Forwards that pin the back line; with two, the first makes the run behind and the second checks short. */
  readonly forwards: readonly RoleId[];
  /** Each outfield role and the role that covers behind it when it steps out (same or deeper line, nearest). */
  readonly coveredBy: Readonly<Partial<Record<RoleId, RoleId>>>;
  /** Default defensive depth: start-spot x of the back line (team frame yards). */
  readonly defensiveDepth: number;
}

const RESP = new Map<FormationId, FormationResponsibilities>();
const LINE_ORDER: Record<Line, number> = { keeper: 0, defence: 1, midfield: 2, attack: 3 };

export function responsibilities(id: FormationId): FormationResponsibilities {
  const hit = RESP.get(id);
  if (hit) return hit;
  const roles = FORMATIONS[id].roles.filter((r0) => r0.line !== 'keeper');
  const mids = roles.filter((r0) => r0.line === 'midfield');
  const central = mids.filter((r0) => channelOf(r0) === 'central');
  const pool = central.length ? central : mids.length ? mids : roles.filter((r0) => r0.line === 'defence');
  const screen = [...pool].sort((a, b) => (a.inPossession === 'balance' ? 0 : 1) - (b.inPossession === 'balance' ? 0 : 1) || a.base.x - b.base.x || Math.abs(a.base.y - 25) - Math.abs(b.base.y - 25))[0]!;
  const rest = roles.filter((r0) => r0.inPossession === 'balance').map((r0) => r0.id);
  if (!roles.some((r0) => r0.inPossession === 'balance' && r0.line === 'defence')) {
    const deepest = roles.filter((r0) => r0.line === 'defence').sort((a, b) => a.base.x - b.base.x)[0];
    if (deepest && !rest.includes(deepest.id)) rest.push(deepest.id);
  }
  const widthOn = (side: 'left' | 'right'): RoleId => {
    const onSide = roles.filter((r0) => channelOf(r0) === side);
    const wide = onSide.filter((r0) => r0.inPossession === 'width');
    const from = wide.length ? wide : onSide.length ? onSide : roles;
    return [...from].sort((a, b) => b.base.x - a.base.x || (side === 'left' ? a.base.y - b.base.y : b.base.y - a.base.y))[0]!.id;
  };
  const attackers = roles.filter((r0) => r0.line === 'attack');
  const fwd = attackers.filter((r0) => channelOf(r0) === 'central' || r0.inPossession === 'depth');
  const forwards = (fwd.length ? fwd : attackers).sort((a, b) => (a.inPossession === 'depth' ? 0 : 1) - (b.inPossession === 'depth' ? 0 : 1) || a.base.y - b.base.y).map((r0) => r0.id);
  const coveredBy: Partial<Record<RoleId, RoleId>> = {};
  for (const r0 of roles) {
    let best: RoleDef | undefined;
    let bd = Infinity;
    for (const c of roles) {
      if (c.id === r0.id || LINE_ORDER[c.line] > LINE_ORDER[r0.line]) continue;
      const d = Math.hypot(c.base.x - r0.base.x, c.base.y - r0.base.y) + (c.line === r0.line ? 0 : 4);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (best) coveredBy[r0.id] = best.id;
  }
  const back = roles.filter((r0) => r0.line === 'defence');
  const out: FormationResponsibilities = {
    id,
    centreScreen: screen.id,
    restDefence: rest,
    width: { left: widthOn('left'), right: widthOn('right') },
    forwards,
    coveredBy,
    defensiveDepth: back.length ? back.reduce((a, r0) => a + r0.base.x, 0) / back.length : 14,
  };
  RESP.set(id, out);
  return out;
}

/** Structural problems with a formation, empty when valid (one keeper, eight outfielders, unique roles, line counts match the id). */
export function validateFormation(def: FormationDef): string[] {
  const errs: string[] = [];
  if (def.roles.length !== PLAYERS_PER_TEAM) errs.push(`${def.id}: ${def.roles.length} roles, expected ${PLAYERS_PER_TEAM}`);
  const keepers = def.roles.filter((r0) => r0.line === 'keeper');
  if (keepers.length !== 1) errs.push(`${def.id}: ${keepers.length} keepers, expected 1`);
  if (def.roles[0]?.line !== 'keeper') errs.push(`${def.id}: slot 0 must be the keeper`);
  const ids = new Set(def.roles.map((r0) => r0.id));
  if (ids.size !== def.roles.length) errs.push(`${def.id}: duplicate role ids`);
  const counts = lineCounts(def.id);
  const actual = (['defence', 'midfield', 'attack'] as const).map((l) => def.roles.filter((r0) => r0.line === l).length).filter((n, i, a) => n > 0 || i < a.length - 1);
  if (counts.join('-') !== actual.join('-')) errs.push(`${def.id}: lines ${actual.join('-')} do not match the notation`);
  for (const r0 of def.roles) {
    const b = r0.bounds;
    if (r0.base.x < b.minX || r0.base.x > b.maxX || r0.base.y < b.minY || r0.base.y > b.maxY) errs.push(`${def.id} ${r0.id}: start spot outside its bounds`);
    for (const a of r0.adjacent) if (r0.line !== 'keeper' && !ids.has(a)) errs.push(`${def.id} ${r0.id}: adjacent ${a} not in formation`);
  }
  return errs;
}
