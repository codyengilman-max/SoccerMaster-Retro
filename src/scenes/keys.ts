export const SceneKeys = {
  Start: 'start',
  Formation: 'formation',
  Match: 'match',
  Career: 'career',
  Lab: 'lab',
  Story: 'story',
  Gallery: 'gallery',
  Jungle: 'jungle',
  Tactical: 'tactical',
  Cloudy: 'cloudy',
  Report: 'report',
  MyPlayer: 'myPlayer',
  Rankings: 'rankings',
  Weekly: 'weekly',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
