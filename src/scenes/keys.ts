export const SceneKeys = {
  Start: 'start',
  Pitch: 'pitch',
  Attack: 'attack',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
