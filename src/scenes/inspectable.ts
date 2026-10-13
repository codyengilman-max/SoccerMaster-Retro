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
