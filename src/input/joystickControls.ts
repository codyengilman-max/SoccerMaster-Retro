/**
 * Joystick + four fixed action buttons (controls brief §3–5). Pure: no Phaser or DOM.
 * One pointer owns the stick, one pointer owns an action; a finger stays with the control it began on.
 */
export type ActionButton = 'pass' | 'shoot' | 'slide' | 'tackle';
export const ACTION_BUTTONS: readonly ActionButton[] = ['tackle', 'shoot', 'slide', 'pass'];

export interface ControlPrefs {
  /** Scale for stick and buttons. */
  readonly size: number;
  readonly opacity: number;
  /** Radial dead zone as a fraction of the stick radius. */
  readonly deadZone: number;
}

export const PREF_LIMITS = {
  size: { min: 0.8, max: 1.3, def: 1 },
  opacity: { min: 0.3, max: 0.9, def: 0.55 },
  deadZone: { min: 0.05, max: 0.3, def: 0.12 },
} as const;

export const DEFAULT_PREFS: ControlPrefs = {
  size: PREF_LIMITS.size.def,
  opacity: PREF_LIMITS.opacity.def,
  deadZone: PREF_LIMITS.deadZone.def,
};

/** Any missing, non-finite or out-of-range value falls back to its safe default. */
export function validatePrefs(raw: unknown): ControlPrefs {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const pick = (k: keyof ControlPrefs) => {
    const v = o[k];
    const l = PREF_LIMITS[k];
    return typeof v === 'number' && Number.isFinite(v) && v >= l.min && v <= l.max ? v : l.def;
  };
  return { size: pick('size'), opacity: pick('opacity'), deadZone: pick('deadZone') };
}

export interface Circle {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}
export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}
export interface PadLayout {
  readonly stick: Circle;
  /** Touches starting inside this left-hand zone (and on no button) take the stick. */
  readonly stickZone: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly buttons: Readonly<Record<ActionButton, Circle>>;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Lower-left stick; lower-right 2x2 cluster: TACKLE SHOOT / SLIDE PASS. Clear of safe-area insets and edges. */
export function padLayout(width: number, height: number, insets: Insets, prefs: ControlPrefs): PadLayout {
  // On narrow screens a large size preference shrinks until the stick and the cluster cannot touch.
  let l = layoutAt(width, height, insets, prefs.size);
  for (let k = prefs.size * 0.95; !separated(l) && k > 0.3; k *= 0.95) l = layoutAt(width, height, insets, k);
  return l;
}

function separated(l: PadLayout): boolean {
  const s = l.stick;
  const b = l.buttons.slide;
  const t = l.buttons.tackle;
  return s.x + s.r < b.x - b.r && s.x + s.r < t.x - t.r && s.x - s.r >= 0 && t.y - t.r >= 0;
}

function layoutAt(width: number, height: number, insets: Insets, size: number): PadLayout {
  const short = Math.min(width, height);
  const margin = clamp(short * 0.04, 10, 24);
  const r = clamp(short * 0.085, 28, 56) * size;
  const gap = clamp(short * 0.025, 8, 16);
  const R = clamp(short * 0.13, 44, 88) * size;
  const right = width - insets.right - margin;
  const bottom = height - insets.bottom - margin;
  const px = right - r;
  const py = bottom - r;
  const sx = px - 2 * r - gap;
  const ty = py - 2 * r - gap;
  const stick = { x: insets.left + margin + R, y: bottom - R, r: R };
  const zoneRight = Math.max(stick.x + R, sx - r - gap);
  return {
    stick,
    stickZone: { x: insets.left, y: height * 0.3, width: Math.min(width * 0.5, zoneRight) - insets.left, height: height * 0.7 - insets.bottom },
    buttons: {
      pass: { x: px, y: py, r },
      slide: { x: sx, y: py, r },
      shoot: { x: px, y: ty, r },
      tackle: { x: sx, y: ty, r },
    },
  };
}

export type PadEvent =
  | { readonly type: 'move'; readonly x: number; readonly y: number }
  | { readonly type: 'press'; readonly action: ActionButton }
  | { readonly type: 'release'; readonly action: ActionButton }
  | { readonly type: 'cancel'; readonly action: ActionButton; readonly reason: string };

export type Availability = Readonly<Record<ActionButton, boolean>>;
export const NONE_AVAILABLE: Availability = { pass: false, shoot: false, slide: false, tackle: false };

/** Dead-zoned, magnitude-clamped stick vector: diagonals are never longer than straight lines. */
export function stickVector(dx: number, dy: number, radius: number, deadZone: number): { x: number; y: number } {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !(radius > 0)) return { x: 0, y: 0 };
  const len = Math.hypot(dx, dy) / radius;
  if (len <= deadZone) return { x: 0, y: 0 };
  const m = (Math.min(1, len) - deadZone) / (1 - deadZone);
  const k = m / (len * radius);
  return { x: dx * k, y: dy * k };
}

interface ActionTouch {
  readonly id: number;
  readonly action: ActionButton;
  /** False when the button was disabled at touch-down: it stays inert until lifted. */
  live: boolean;
}

export class JoystickControls {
  private layout: PadLayout;
  private deadZone: number;
  private avail: Availability = NONE_AVAILABLE;
  private stickId: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private vec = { x: 0, y: 0 };
  private act: ActionTouch | null = null;
  /** Optional hold-modifier button (Jungle Ball TURBO): its own finger slot, so another action can be pressed while it is held. */
  private modifier: ActionButton | null = null;
  private mod: ActionTouch | null = null;
  /** Fingers that began on nothing usable: ignored until lifted. */
  private ignored = new Set<number>();

  constructor(layout: PadLayout, deadZone: number = DEFAULT_PREFS.deadZone) {
    this.layout = layout;
    this.deadZone = deadZone;
  }

  get stick(): { x: number; y: number } {
    return { ...this.vec };
  }
  get stickOriginPoint(): { x: number; y: number } | null {
    return this.stickId === null ? null : { ...this.stickOrigin };
  }
  /** Makes `b` a hold modifier tracked apart from the single action slot (null turns it off). */
  setModifier(b: ActionButton | null): PadEvent[] {
    const out = this.dropMod('modifier changed');
    this.modifier = b;
    return out;
  }
  get modifierHeld(): boolean {
    return !!this.mod?.live;
  }

  private dropMod(reason: string): PadEvent[] {
    const m = this.mod;
    this.mod = null;
    if (!m) return [];
    this.ignored.add(m.id);
    return m.live ? [{ type: 'cancel', action: m.action, reason }] : [];
  }

  get pressed(): ActionButton | null {
    return this.act?.live ? this.act.action : null;
  }
  get currentLayout(): PadLayout {
    return this.layout;
  }
  get available(): Availability {
    return this.avail;
  }

  /** Rebuilding the layout (rotation, resize, settings) cancels every touch. */
  setLayout(layout: PadLayout, deadZone: number = this.deadZone): PadEvent[] {
    const out = this.cancelAll('layout rebuilt');
    this.layout = layout;
    this.deadZone = deadZone;
    return out;
  }

  /** A held action whose availability is lost (e.g. possession changed) is cancelled, never released. */
  setAvailable(a: Availability): PadEvent[] {
    this.avail = { ...a };
    const out: PadEvent[] = [];
    if (this.mod?.live && !a[this.mod.action]) {
      this.mod.live = false;
      out.push({ type: 'cancel', action: this.mod.action, reason: 'unavailable' });
    }
    const t = this.act;
    if (t?.live && !a[t.action]) {
      t.live = false;
      out.push({ type: 'cancel', action: t.action, reason: 'unavailable' });
    }
    return out;
  }

  buttonAt(x: number, y: number): ActionButton | null {
    for (const b of ACTION_BUTTONS) {
      const c = this.layout.buttons[b];
      if (Math.hypot(x - c.x, y - c.y) <= c.r) return b;
    }
    return null;
  }

  private inStickZone(x: number, y: number): boolean {
    const z = this.layout.stickZone;
    return x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height;
  }

  pointerDown(id: number, x: number, y: number): PadEvent[] {
    if (!Number.isFinite(x) || !Number.isFinite(y) || id === this.stickId || id === this.act?.id || id === this.mod?.id || this.ignored.has(id)) return [];
    const b = this.buttonAt(x, y);
    if (b && b === this.modifier) {
      if (this.mod) {
        this.ignored.add(id);
        return [];
      }
      this.mod = { id, action: b, live: this.avail[b] };
      return this.mod.live ? [{ type: 'press', action: b }] : [];
    }
    if (b) {
      if (this.act) {
        this.ignored.add(id);
        return [];
      }
      this.act = { id, action: b, live: this.avail[b] };
      return this.act.live ? [{ type: 'press', action: b }] : [];
    }
    if (this.stickId === null && this.inStickZone(x, y)) {
      this.stickId = id;
      // Floating stick: centred where the thumb lands, so the first contact never jumps the player.
      this.stickOrigin = { x, y };
      this.vec = { x: 0, y: 0 };
      return [];
    }
    this.ignored.add(id);
    return [];
  }

  pointerMove(id: number, x: number, y: number): PadEvent[] {
    if (id !== this.stickId || !Number.isFinite(x) || !Number.isFinite(y)) return [];
    const v = stickVector(x - this.stickOrigin.x, y - this.stickOrigin.y, this.layout.stick.r, this.deadZone);
    if (v.x === this.vec.x && v.y === this.vec.y) return [];
    this.vec = v;
    return [{ type: 'move', ...v }];
  }

  pointerUp(id: number): PadEvent[] {
    this.ignored.delete(id);
    if (id === this.stickId) return this.releaseStick();
    if (this.mod?.id === id) {
      const m = this.mod;
      this.mod = null;
      return m.live ? [{ type: 'release', action: m.action }] : [];
    }
    const t = this.act;
    if (!t || t.id !== id) return [];
    this.act = null;
    return t.live ? [{ type: 'release', action: t.action }] : [];
  }

  /** Pointer cancel / lost capture: a held action is cancelled, never treated as a release. */
  pointerCancel(id: number, reason = 'pointer cancelled'): PadEvent[] {
    this.ignored.delete(id);
    if (id === this.stickId) return this.releaseStick();
    if (this.mod?.id === id) {
      const m = this.mod;
      this.mod = null;
      return m.live ? [{ type: 'cancel', action: m.action, reason }] : [];
    }
    const t = this.act;
    if (!t || t.id !== id) return [];
    this.act = null;
    return t.live ? [{ type: 'cancel', action: t.action, reason }] : [];
  }

  /** Pause, exit, focus/visibility loss, reassignment, rotation: drop every touch with no kick. */
  cancelAll(reason: string): PadEvent[] {
    const out: PadEvent[] = this.dropMod(reason);
    const t = this.act;
    if (t?.live) out.push({ type: 'cancel', action: t.action, reason });
    // A lifted-and-cancelled action finger stays inert until it lifts.
    if (t) this.ignored.add(t.id);
    this.act = null;
    if (this.stickId !== null) {
      this.ignored.add(this.stickId);
      out.push(...this.releaseStick());
    }
    return out;
  }

  private releaseStick(): PadEvent[] {
    this.stickId = null;
    if (this.vec.x === 0 && this.vec.y === 0) return [];
    this.vec = { x: 0, y: 0 };
    return [{ type: 'move', x: 0, y: 0 }];
  }
}
