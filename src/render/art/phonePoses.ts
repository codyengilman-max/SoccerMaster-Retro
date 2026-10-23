/**
 * Owner phone poses ("five main characters on their phones"): one existing pose per character, shown only on
 * the story lines where the script explicitly has that character using a phone. Each moment lists exactly who
 * is on screen for that line; nobody else's portrait shows, and no character without phone art is invented.
 */
import { sceneById } from '../../game/story/content';
import type { CastRole } from './catalog';

export interface PhoneShow { readonly role: CastRole; readonly phone: boolean }
interface Moment { readonly scene: string; readonly speaker: string; readonly text: string; readonly show: readonly PhoneShow[] }

const P = (role: CastRole): PhoneShow => ({ role, phone: true });
const IN = (role: CastRole): PhoneShow => ({ role, phone: false });

export const PHONE_MOMENTS: readonly Moment[] = [
  // Week 6 home: Sam's text arrives, then your reply (by text).
  { scene: 'S1_W06_H', speaker: 'Sam', text: 'Park tomorrow.', show: [P('sam')] },
  { scene: 'S1_W06_H', speaker: 'Player', text: 'Training first. What time?', show: [P('player')] },
  { scene: 'S1_W06_H', speaker: 'Player', text: "I'll come early. Train afterward.", show: [P('player')] },
  { scene: 'S1_W06_H', speaker: 'Player', text: 'Not this time. Have fun.', show: [P('player')] },
  // Week 6 group chat: Riley has no phone art, so you read her message; Sam replies.
  { scene: 'S1_W06_G', speaker: 'Riley', text: 'Finally. Someone who might answer.', show: [P('player')] },
  { scene: 'S1_W06_G', speaker: 'Sam', text: '⚽', show: [P('sam')] },
  // Week 7 school: Blake is still scrolling Next Horizon clips while Sam talks (he locks it on the next line).
  { scene: 'S1_W07_M', speaker: 'Sam', text: 'You scouting them or joining the fan club?', show: [IN('sam'), P('blake')] },
  // Week 7 after the match: Blake opens another clip.
  { scene: 'S1_W07_G', speaker: 'Sam', text: 'You coming?', show: [IN('player'), IN('sam'), P('blake')] },
  { scene: 'S1_W07_G', speaker: 'Blake', text: 'In a minute.', show: [IN('player'), IN('sam'), P('blake')] },
];

type Line = { readonly id: string; readonly type: string; readonly speaker?: string; readonly text?: string };
let resolved: Map<string, readonly PhoneShow[]> | null = null;
const key = (scene: string, node: string) => `${scene}|${node}`;

/** Node ids of each moment, resolved from the compiled script (every moment must match exactly one line). */
export function phoneMomentNodes(): Map<string, readonly PhoneShow[]> {
  if (resolved) return resolved;
  const out = new Map<string, readonly PhoneShow[]>();
  for (const m of PHONE_MOMENTS) {
    const sc = sceneById(m.scene);
    const hits = ((sc?.nodes ?? []) as readonly Line[]).filter((n) => n.type === 'line' && n.speaker === m.speaker && (n.text ?? '').startsWith(m.text));
    if (hits.length !== 1) throw new Error(`phone moment ${m.scene} ${m.speaker}: "${m.text}" matched ${hits.length} lines`);
    out.set(key(m.scene, hits[0]!.id), m.show);
  }
  resolved = out;
  return out;
}

/** Who is on screen for this line, or null when the line is not a phone moment. */
export const phoneStage = (sceneId: string | null, nodeId: string | null): readonly PhoneShow[] | null =>
  sceneId && nodeId ? phoneMomentNodes().get(key(sceneId, nodeId)) ?? null : null;

/** Roles a scene needs only for its phone moments (they are hidden on every other line). */
export const phoneRoles = (sceneId: string): readonly CastRole[] =>
  [...new Set(PHONE_MOMENTS.filter((m) => m.scene === sceneId).flatMap((m) => m.show.map((s) => s.role)))];

/** The single matching phone pose for a character, never the whole sheet and never another character. */
export function phoneAsset(role: CastRole, appearance: 'boy' | 'girl' | null): string | null {
  if (role === 'player') return appearance ? `phone-${appearance}` : null;
  if (role === 'sam' || role === 'blake') return `phone-${role}`;
  if (role === 'caregiver') return 'phone-mom-dressy';
  return null;
}
