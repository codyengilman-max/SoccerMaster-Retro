export const SceneKeys = {
  Start: 'start',
  Attack: 'attack',
  Formation: 'formation',
  Match: 'match',
  Career: 'career',
  Lab: 'lab',
  Story: 'story',
  Gallery: 'gallery',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
