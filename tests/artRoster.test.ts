import { describe, expect, it } from 'vitest';
import { PROTAGONIST_SHEET, lookKey, sideLooks } from '../src/render/art/roster';
import { REFERENCE_KITS, dirFromScreen, validLook } from '../src/render/art/spriteFactory';

describe('gameplay roster art', () => {
  it('is stable per side and slot, with slot numbers and side kits', () => {
    const a = sideLooks('home');
    expect(sideLooks('home')).toEqual(a);
    expect(a.map((l) => l.number)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    expect(a[0]!.kit).toEqual(REFERENCE_KITS[2]);
    expect(a.slice(1).every((l) => l.kit === REFERENCE_KITS[0])).toBe(true);
    expect(sideLooks('away').slice(1).every((l) => l.kit === REFERENCE_KITS[1])).toBe(true);
    for (const l of [...a, ...sideLooks('away')]) expect(validLook(l)).toBe(true);
    expect(new Set(a.map(lookKey)).size).toBe(9);
  });

  it('covers every hair style and colour across the roster', () => {
    const all = [...sideLooks('home'), ...sideLooks('away')];
    expect(new Set(all.map((l) => l.hairStyle))).toEqual(new Set([0, 1, 2, 3, 4, 5, 6]));
    expect(new Set(all.map((l) => l.hairIndex))).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it('shows the chosen boy/girl look on the career slot without duplicating it', () => {
    for (const slot of [2, 4, 7]) {
      for (const look of ['boy', 'girl'] as const) {
        const l = sideLooks('home', { slot, look });
        expect(l[slot]!.sheetId).toBe(PROTAGONIST_SHEET[look]);
        expect(l[slot]!.number).toBe(String(slot + 1));
        expect(l.filter((x) => x.sheetId === PROTAGONIST_SHEET.boy)).toHaveLength(look === 'boy' ? 1 : 0);
        expect(new Set(l.map((x) => x.sheetId)).size).toBe(9);
      }
    }
    expect(sideLooks('home', { slot: 4, look: 'girl' })[4]).toMatchObject({ girl: true, hairStyle: 5 });
    expect(sideLooks('away', { slot: 4, look: 'girl' })).toEqual(sideLooks('away'));
    expect(sideLooks('home', { slot: 0, look: 'girl' })).toEqual(sideLooks('home'));
  });

  it('maps screen headings to the eight reference directions', () => {
    expect([dirFromScreen(1, 0), dirFromScreen(1, 1), dirFromScreen(0, 1), dirFromScreen(-1, 0), dirFromScreen(0, -1), dirFromScreen(1, -0.1)]).toEqual([0, 1, 2, 4, 6, 0]);
  });
});
