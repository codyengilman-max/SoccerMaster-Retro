import type { MatchPlayerId } from '../match/types';
import type { RoleId } from '../match/formations';

const ROLE_WORDS: Record<string, string> = {
  GK: 'keeper',
  LB: 'left back',
  CB: 'centre back',
  RB: 'right back',
  LCB: 'left centre back',
  RCB: 'right centre back',
  LM: 'left midfielder',
  CM: 'centre midfielder',
  RM: 'right midfielder',
  LCM: 'left centre mid',
  RCM: 'right centre mid',
  DM: 'holding midfielder',
  AM: 'attacking midfielder',
  LW: 'left winger',
  RW: 'right winger',
  ST: 'striker',
  LS: 'left striker',
  RS: 'right striker',
  CF: 'centre forward',
};

/**
 * Display-safe player name. Names may come from imported rosters later, so they are treated as plain
 * text: control/format characters are removed, whitespace collapsed and the length capped. Rendering
 * uses canvas text (never HTML), so markup in a name shows literally.
 */
export function safeName(raw: unknown, max = 18): string {
  const s = typeof raw === 'string' ? raw : '';
  // eslint-disable-next-line no-control-regex
  const cleaned = s.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim();
  const chars = Array.from(cleaned);
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : chars.join('');
}

export function roleWords(role: RoleId | string): string {
  return ROLE_WORDS[role] ?? role;
}

/** Name function for templates: an imported name if provided, otherwise the role ("your left winger"). */
export function makeNames(
  roleOf: (id: MatchPlayerId) => RoleId | string,
  imported: Partial<Record<MatchPlayerId, string>> = {},
): (id: MatchPlayerId) => string {
  return (id) => {
    const n = safeName(imported[id]);
    if (n) return n;
    return id.startsWith('H') ? `your ${roleWords(roleOf(id))}` : `their ${roleWords(roleOf(id))}`;
  };
}
