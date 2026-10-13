export const SceneKeys = {
  Start: 'start',
  Pitch: 'pitch',
  Attack: 'attack',
  Formation: 'formation',
  Match: 'match',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
