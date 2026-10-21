import type Phaser from 'phaser';
import { hasGameplay, isInspectable, type SceneLayoutReport } from '../scenes/inspectable';

export interface Diagnostics {
  readonly canvases: number;
  readonly canvasSize: { readonly width: number; readonly height: number };
  readonly activeScenes: readonly string[];
  readonly displayListSize: number;
  /** Named textures only; Phaser Text objects own auto-keyed canvas textures. */
  readonly textureKeys: readonly string[];
  readonly textureCount: number;
  /** Total listener count per Phaser emitter; must be stable across navigation. */
  readonly listeners: Readonly<Record<string, number>>;
  readonly layout: SceneLayoutReport | null;
  /** Gameplay snapshot of the top scene, if it has one (see AttackReport). */
  readonly gameplay: unknown;
}

export interface DebugHandle {
  readonly game: Phaser.Game;
  diagnostics(): Diagnostics;
}

declare global {
  interface Window {
    __SMR__?: DebugHandle;
  }
}

interface CountableEmitter {
  eventNames(): (string | symbol)[];
  listenerCount(event: string | symbol): number;
}

const AUTO_TEXTURE_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function totalListeners(emitter: CountableEmitter | null | undefined): number {
  if (!emitter) return 0;
  return emitter.eventNames().reduce((sum, name) => sum + emitter.listenerCount(name), 0);
}

export function collectDiagnostics(game: Phaser.Game): Diagnostics {
  const listeners: Record<string, number> = {
    'game.events': totalListeners(game.events),
    'game.scale': totalListeners(game.scale),
    'game.input': totalListeners(game.input.events),
  };
  for (const scene of game.scene.getScenes(false)) {
    const key = scene.sys.settings.key;
    listeners[`${key}.events`] = totalListeners(scene.sys.events);
    listeners[`${key}.input`] = totalListeners(scene.input);
    listeners[`${key}.keyboard`] = totalListeners(scene.input?.keyboard);
  }

  const active = game.scene.getScenes(true);
  const textureKeys = game.textures.getTextureKeys();
  const top = active[active.length - 1];
  return {
    canvases: document.querySelectorAll('canvas').length,
    canvasSize: { width: game.canvas.width, height: game.canvas.height },
    activeScenes: active.map((s) => s.sys.settings.key),
    displayListSize: active.reduce((n, s) => n + s.sys.displayList.length, 0),
    textureKeys: textureKeys.filter((k) => !AUTO_TEXTURE_KEY.test(k)).sort(),
    textureCount: textureKeys.length,
    listeners,
    layout: top && isInspectable(top) ? top.describeLayout() : null,
    gameplay: top && hasGameplay(top) ? top.describeGameplay() : null,
  };
}

export function shouldExposeDebug(location: Location): boolean {
  return import.meta.env.DEV || new URLSearchParams(location.search).has('debug');
}

/** Story mode is the only way to play; `?dev` adds the developer and owner-review entries (free match, Home Training, Jungle Ball, Review & Lab). */
export function shouldExposeDevMenu(location: Location): boolean {
  return new URLSearchParams(location.search).has('dev');
}

export function installDebugHandle(game: Phaser.Game): void {
  if (!shouldExposeDebug(window.location)) return;
  window.__SMR__ = { game, diagnostics: () => collectDiagnostics(game) };
}
