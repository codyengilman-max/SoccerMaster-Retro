import Phaser from 'phaser';
import {
  ACTION_BUTTONS,
  DEFAULT_PREFS,
  JoystickControls,
  padLayout,
  validatePrefs,
  type ActionButton,
  type Availability,
  type ControlPrefs,
  type Insets,
  type PadEvent,
} from '../../input/joystickControls';

/** Control preferences live in their own localStorage key, never inside career or story saves. */
export const PREFS_KEY = 'smr-controls-v1';

export function loadPrefs(): ControlPrefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw === null ? DEFAULT_PREFS : validatePrefs(JSON.parse(raw));
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: ControlPrefs): ControlPrefs {
  const v = validatePrefs(p);
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(v));
  } catch {
    // Private mode / quota: keep the in-memory value.
  }
  return v;
}

/** CSS env(safe-area-inset-*) measured through a hidden probe element. */
export function safeInsets(): Insets {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const px = (v: string) => Number.parseFloat(v) || 0;
  const insets = { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) };
  probe.remove();
  return insets;
}

const LABELS: Record<ActionButton, string> = { pass: 'PASS', shoot: 'SHOOT', slide: 'SLIDE\nTACKLE', block: 'BLOCK' };
const COLORS: Record<ActionButton, number> = { pass: 0x2e6b8f, shoot: 0xd9643a, slide: 0xc9a227, block: 0x6b4fa0 };

/** Joystick + four permanent buttons. Pure input logic lives in JoystickControls; this only draws it. */
export class PadHud {
  readonly controls: JoystickControls;
  private prefs: ControlPrefs;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly labels: Record<ActionButton, Phaser.GameObjects.Text>;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    this.prefs = loadPrefs();
    this.controls = new JoystickControls(padLayout(width, height, safeInsets(), this.prefs), this.prefs.deadZone);
    this.g = scene.add.graphics().setDepth(5900).setScrollFactor(0);
    this.labels = Object.fromEntries(
      ACTION_BUTTONS.map((a) => [
        a,
        scene.add
          .text(0, 0, LABELS[a], { fontFamily: 'system-ui, sans-serif', fontStyle: 'bold', fontSize: '14px', color: '#fff8e7', align: 'center' })
          .setOrigin(0.5)
          .setDepth(5901)
          .setScrollFactor(0)
          .setName(`pad-${a}`),
      ]),
    ) as Record<ActionButton, Phaser.GameObjects.Text>;
  }

  get preferences(): ControlPrefs {
    return this.prefs;
  }

  /** Rebuilding the layout cancels any held control (brief: no stale hit areas). */
  layout(width: number, height: number): PadEvent[] {
    return this.controls.setLayout(padLayout(width, height, safeInsets(), this.prefs), this.prefs.deadZone);
  }

  setPrefs(p: ControlPrefs | null, width: number, height: number): PadEvent[] {
    this.prefs = p === null ? savePrefs(DEFAULT_PREFS) : savePrefs(p);
    return this.layout(width, height);
  }

  setVisible(v: boolean): void {
    this.g.setVisible(v);
    for (const a of ACTION_BUTTONS) this.labels[a].setVisible(v);
  }

  draw(): void {
    const g = this.g;
    const L = this.controls.currentLayout;
    const op = this.prefs.opacity;
    const avail: Availability = this.controls.available;
    const pressed = this.controls.pressed;
    g.clear();
    const origin = this.controls.stickOriginPoint ?? L.stick;
    const r = L.stick.r;
    g.fillStyle(0x10202a, op * 0.45).fillCircle(origin.x, origin.y, r);
    g.lineStyle(3, 0xfff8e7, op).strokeCircle(origin.x, origin.y, r);
    const st = this.controls.stick;
    g.fillStyle(0xfff8e7, Math.min(1, op + 0.2)).fillCircle(origin.x + st.x * r, origin.y + st.y * r, r * 0.42);
    for (const a of ACTION_BUTTONS) {
      const c = L.buttons[a];
      const on = avail[a];
      const down = pressed === a;
      g.fillStyle(COLORS[a], (on ? op : op * 0.35) * (down ? 1.4 : 1));
      g.fillCircle(c.x, c.y, down ? c.r * 0.94 : c.r);
      g.lineStyle(down ? 5 : 3, 0xfff8e7, on ? Math.min(1, op + 0.25) : op * 0.4).strokeCircle(c.x, c.y, c.r);
      this.labels[a]
        .setPosition(c.x, c.y)
        .setFontSize(Math.max(11, Math.round(c.r * (a === 'slide' ? 0.3 : 0.36))))
        .setAlpha(on ? 1 : 0.45);
    }
  }

  destroy(): void {
    this.g.destroy();
    for (const a of ACTION_BUTTONS) this.labels[a].destroy();
  }
}
