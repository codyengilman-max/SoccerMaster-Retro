/** Story identity (package v0.7 spec K1). Framework-free. Identity never changes gameplay. */

export type Gender = 'boy' | 'girl';
export const GENDERS: readonly Gender[] = ['boy', 'girl'];

export interface Pronouns {
  readonly subject: string;
  readonly object: string;
  readonly possessive: string;
}

export const PRONOUNS: Readonly<Record<Gender, Pronouns>> = {
  boy: { subject: 'he', object: 'him', possessive: 'his' },
  girl: { subject: 'she', object: 'her', possessive: 'her' },
};

export const NAME_LIMITS = { graphemes: 24, scalars: 96, bytes: 384, combiningRun: 8 } as const;

// C0/C1 controls, line/paragraph separators, bidi embedding/override/isolate controls.
const FORBIDDEN = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;
const TEMPLATE = /[{}<>]/;
const COMBINING = /\p{M}/u;

function graphemes(s: string): number {
  const Seg = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) return [...new Seg(undefined, { granularity: 'grapheme' }).segment(s)].length;
  // Fallback: base characters only (combining marks join the previous character).
  return [...s].filter((c) => !COMBINING.test(c)).length;
}

export type NameResult = { readonly ok: true; readonly name: string } | { readonly ok: false; readonly error: string };

/** Validates a display name. Rejects rather than silently rewriting anything other than NFC/trim. */
export function validateName(raw: unknown): NameResult {
  if (typeof raw !== 'string') return { ok: false, error: 'Name must be text.' };
  if (/[\ud800-\udfff]/.test(raw.replace(/[\ud800-\udbff][\udc00-\udfff]/g, ''))) return { ok: false, error: 'Name contains invalid characters.' };
  const name = raw.normalize('NFC').trim();
  if (name === '') return { ok: false, error: 'Enter a name.' };
  if (FORBIDDEN.test(name)) return { ok: false, error: 'Name cannot contain control or direction characters or line breaks.' };
  if (TEMPLATE.test(name)) return { ok: false, error: 'Name cannot contain { } < or >.' };
  let run = 0;
  for (const c of name) {
    run = COMBINING.test(c) ? run + 1 : 0;
    if (run > NAME_LIMITS.combiningRun) return { ok: false, error: 'Name has too many accent marks in a row.' };
  }
  if ([...name].length > NAME_LIMITS.scalars || new TextEncoder().encode(name).length > NAME_LIMITS.bytes || graphemes(name) > NAME_LIMITS.graphemes) {
    return { ok: false, error: `Name must be ${NAME_LIMITS.graphemes} characters or fewer.` };
  }
  return { ok: true, name };
}

export function isGender(v: unknown): v is Gender {
  return v === 'boy' || v === 'girl';
}

/** Single-pass replacement of the only supported token. Never evaluates or re-parses the result. */
export function renderText(text: string, playerName: string): string {
  return text.split('{player.name}').join(playerName);
}
