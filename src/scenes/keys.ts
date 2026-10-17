export const SceneKeys = {
  Start: 'start',
  Formation: 'formation',
  Match: 'match',
  Career: 'career',
  Lab: 'lab',
  Story: 'story',
  Gallery: 'gallery',
  Jungle: 'jungle',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
