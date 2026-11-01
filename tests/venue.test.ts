import { describe, expect, it } from 'vitest';
import { VENUE_ASSIGNMENTS, VENUE_IDS, VENUE_NAMES, isVenueId, resolveVenue } from '../src/game/venue';
import layouts from '../src/assets/art/venues/venue-layouts.json';

describe('regular-match venues (Moving Camera Venues v2)', () => {
  it('keeps the four internal ids and shows the revision-2 display names', () => {
    expect([...VENUE_IDS]).toEqual(['pinnacle', 'bell94', 'scottsdale', 'westside']);
    expect(VENUE_NAMES).toEqual({
      pinnacle: 'Pinnacle Park',
      bell94: 'Dell 94',
      scottsdale: 'Scott\u2019s Complex',
      westside: 'Westside Grounds',
    });
    for (const l of layouts as { id: string; name: string }[]) {
      expect(isVenueId(l.id)).toBe(true);
      expect(l.name).toBe(VENUE_NAMES[l.id as keyof typeof VENUE_NAMES]);
    }
  });

  it('every layout keeps scenery and people off the 75 x 50 playing surface', () => {
    for (const l of layouts as { id: string; props: { x: number; y: number }[]; actors: { x: number; y: number }[] }[])
      for (const p of [...l.props, ...l.actors]) {
        const inside = p.x > 0 && p.x < 75 && p.y > 0 && p.y < 50;
        expect(inside, `${l.id} at (${p.x}, ${p.y})`).toBe(false);
      }
  });

  it('only the approved assignment resolves; everything else is reported missing, never guessed', () => {
    expect(VENUE_ASSIGNMENTS).toHaveLength(1);
    expect(resolveVenue({ kind: 'league', side: 'home', opponent: 'Desert Storm' })).toMatchObject({ id: 'pinnacle' });
    for (const q of [
      { kind: 'league', side: 'away' },
      { kind: 'tournament', side: 'home' },
      { kind: 'tournament', side: 'away' },
      { kind: 'exhibition', side: 'home' },
      { kind: 'exhibition', side: 'away' },
    ] as const) {
      const r = resolveVenue(q);
      expect(r.id).toBeNull();
      expect('missing' in r && r.missing).toContain('no approved venue assignment');
    }
  });

  it('rejects unknown ids', () => {
    for (const v of ['dell94', 'Pinnacle Park', '', null, 3]) expect(isVenueId(v)).toBe(false);
  });
});
