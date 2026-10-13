export const SceneKeys = {
  Start: 'start',
  Pitch: 'pitch',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
