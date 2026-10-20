/**
 * Stable cosmetic identity for the 9v9 roster (pure). Hair comes from the package's roster-slot reference
 * table, keyed by team side + formation slot, so it never changes between matches and never depends on
 * stats, role, RNG or results. Shirt numbers are slot + 1 because the match engine has no squad numbers.
 */
import appearancesRaw from '../../../docs/art/graphics-v1/assets/gameplay/appearances.json';
import { REFERENCE_KITS, type SpriteLook } from './spriteFactory';
import { clubSet, protagonistSet, type Kit, type SpriteClub, type SpriteSetId } from './spriteSets';

interface RawAppearance { readonly id: string; readonly team: number; readonly girl: boolean; readonly hairIndex: number; readonly hairStyle: number }
const APPEARANCES: ReadonlyMap<string, RawAppearance> = new Map((appearancesRaw as RawAppearance[]).map((a) => [a.id, a]));

export type Side = 'home' | 'away';
export type ProtagonistLook = 'boy' | 'girl';
/** Reference sheets the package binds to the two protagonist presentations. */
export const PROTAGONIST_SHEET: Readonly<Record<ProtagonistLook, string>> = { boy: 'team0-slot7', girl: 'protagonist-girl' };

export interface RosterLook extends SpriteLook {
  readonly sheetId: string;
  /** Sprites v2 atlas this player wears; without it (or before it loads) the code-drawn sprite is used. */
  readonly set?: SpriteSetId;
  readonly keeper?: boolean;
}

/** Which club and kit a side wears. Cosmetic only; never read by the simulation or competitions. */
export interface SideDress {
  readonly club: SpriteClub;
  readonly kit?: Kit;
}

function look(sheetId: string, side: Side, slot: number): RosterLook {
  const a = APPEARANCES.get(sheetId);
  if (!a) throw new Error(`roster art: no appearance ${sheetId}`);
  // Keepers wear reference group 2; outfield kit follows the match side (home = group 0, away = group 1).
  const kit = REFERENCE_KITS[slot === 0 ? 2 : side === 'home' ? 0 : 1]!;
  return { sheetId, kit, number: String(slot + 1), girl: a.girl, hairIndex: a.hairIndex, hairStyle: a.hairStyle };
}

/**
 * Look for every slot of one side. When the user's career player occupies `protagonistSlot`, that slot shows
 * the chosen boy/girl presentation and the slot that owned the boy reference hair takes the displaced hair,
 * so no two players share the protagonist look. Shirt number and kit stay with the slot.
 */
export function sideLooks(side: Side, protagonist: { slot: number; look: ProtagonistLook } | null = null, dress: SideDress | null = null): RosterLook[] {
  const prefix = side === 'home' ? 'team0' : 'team1';
  const sheets = Array.from({ length: 9 }, (_, s) => `${prefix}-slot${s}`);
  if (protagonist && side === 'home' && Number.isInteger(protagonist.slot) && protagonist.slot >= 1 && protagonist.slot <= 8) {
    const boySlot = sheets.indexOf(PROTAGONIST_SHEET.boy);
    if (boySlot >= 0 && boySlot !== protagonist.slot) sheets[boySlot] = sheets[protagonist.slot]!;
    sheets[protagonist.slot] = PROTAGONIST_SHEET[protagonist.look];
  }
  const looks = sheets.map((id, s) => look(id, side, s));
  if (!dress) return looks;
  const kit = dress.kit ?? 'match';
  return looks.map((l, s) => {
    const mine = protagonist && side === 'home' && s === protagonist.slot && protagonist.slot >= 1 && protagonist.slot <= 8;
    // Batavia's training sheet has no keeper row, so its keeper keeps the match sheet's keeper poses.
    const set = mine ? protagonistSet(protagonist.look, kit, false) : clubSet(dress.club, s === 0 ? 'match' : kit);
    return { ...l, set, keeper: s === 0 };
  });
}

export const lookKey = (l: SpriteLook): string => [l.kit.shirt, l.kit.shade, l.kit.light, l.number, l.girl ? 1 : 0, l.hairIndex, l.hairStyle].join('_').replace(/#/g, '');
