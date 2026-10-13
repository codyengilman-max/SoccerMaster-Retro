import type { Rect } from '../game';
import type { Orientation } from '../render/layout';

/** Read-only layout facts a scene reports for diagnostics and browser tests. */
export interface SceneLayoutReport {
  readonly orientation: Orientation;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly elements: Readonly<Record<string, Rect>>;
}

export interface InspectableScene {
  describeLayout(): SceneLayoutReport;
}

export function isInspectable(scene: unknown): scene is InspectableScene {
  return typeof (scene as Partial<InspectableScene> | null)?.describeLayout === 'function';
}

/** Scenes with live gameplay also report a plain-data snapshot of it (debug builds only). */
export interface GameplayScene {
  describeGameplay(): unknown;
}

export function hasGameplay(scene: unknown): scene is GameplayScene {
  return typeof (scene as Partial<GameplayScene> | null)?.describeGameplay === 'function';
}
