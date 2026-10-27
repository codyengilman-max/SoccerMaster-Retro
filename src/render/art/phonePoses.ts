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
const seq = (scene: string, show: readonly PhoneShow[], lines: readonly (readonly [string, string])[]): Moment[] =>
  lines.map(([speaker, text]) => ({ scene, speaker, text, show }));

export const PHONE_MOMENTS: readonly Moment[] = [
  // Owner rewrite weeks 2–10 (2026-10-27): only the scenes whose direction shows a phone in use.
  ...seq('S1_W02_T', [IN('player'), P('sam')], [
    ['Sam', 'Found our team.'], ['Player', 'Near the top?'], ['Sam', 'Depends which way you hold the phone.'],
    ['Sam', 'League standings come from league games.'], ['Player', 'How do I move up?'], ['Sam', 'Home training builds'],
    ['Player', "Scrolling doesn't count?"], ['Sam', 'Blake would be unstoppable.'],
  ]),
  // Week 6 training: Sam opens the team rankings on a phone.
  ...seq('S1_W06_T', [IN('player'), P('sam')], [['Sam', "Here's where we are."], ['Player', 'And where we want to be?'], ['Sam', 'Higher.']]),
  // Week 7 school: Blake checks the player rankings on a phone; Sam looks over.
  ...seq('S1_W07_M', [IN('sam'), P('blake')], [['Sam', 'Checking your ranking?'], ['Blake', "Checking why everyone's"]]),
  ...seq('S1_W07_M', [IN('player'), IN('sam'), P('blake')], [['Player', 'You could just follow me.'], ['Blake', "Let's see that other foot first."], ['Sam', 'Weird thing to ask at lunch.']]),
  // Week 8 training: Sam checks the group chat until "Sam puts the phone away."
  ...seq('S1_W08_T', [IN('player'), P('sam')], [['Sam', "Blake's late."], ['Player', 'Maybe stuck admiring the rankings.'], ['Sam', "Hasn't answered the group chat either."]]),
  // Week 9 school: Sam opens the AZ Showcase field on a phone.
  ...seq('S1_W09_M', [IN('player'), P('sam')], [
    ['Sam', 'Two out-of-state teams in our group.'], ['Player', 'Any good?'], ['Sam', "Let's check before you promise a hat trick."],
    ['Player', "Rankings don't play the game."], ['Sam', 'Good. Mine has terrible stamina.'],
  ]),
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
