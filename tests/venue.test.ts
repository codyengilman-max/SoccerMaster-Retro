import { describe, expect, it } from 'vitest';
import { AWAY_LEAGUE_ROTATION, VENUE_IDS, VENUE_NAMES, assignLeagueVenues, isVenueId, resolveVenue } from '../src/game/venue';
import { leagueFormat, leagueVenue, newSeasonLeague, parseSeasonLeague, recordSeasonPlayed, withLeagueVenues } from '../src/game/season/league';
const { batavia: BATAVIA_FIXTURES, venues: LEAGUE_VENUES } = leagueFormat(null);
import { newTournament, parseTournament } from '../src/game/season/tournament';
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

  it('tournament games are always at Scott\u2019s Complex, ahead of a home designation or a saved venue', () => {
    for (const side of ['home', 'away'] as const)
      for (const saved of [undefined, 'pinnacle', 'westside'])
        expect(resolveVenue({ kind: 'tournament', side, saved })).toMatchObject({ id: 'scottsdale' });
  });

  it('league games use the saved venue; without one, home is Pinnacle Park and nothing else is guessed', () => {
    expect(resolveVenue({ kind: 'league', side: 'away', saved: 'bell94' })).toMatchObject({ id: 'bell94' });
    expect(resolveVenue({ kind: 'league', side: 'home', opponent: 'Desert Storm' })).toMatchObject({ id: 'pinnacle' });
    for (const q of [{ kind: 'league', side: 'away' }, { kind: 'league', side: 'away', saved: 'nowhere' }, { kind: 'exhibition', side: 'home' }, { kind: 'exhibition', side: 'away', saved: 'pinnacle' }] as const) {
      const r = resolveVenue(q);
      expect(r.id).toBeNull();
      expect('missing' in r && r.missing).toContain('no approved venue assignment');
    }
  });

  it('Batavia home league fixtures are at Pinnacle Park; away fixtures rotate evenly in fixture order', () => {
    const away = BATAVIA_FIXTURES.filter((f) => f.home !== 'batavia');
    const home = BATAVIA_FIXTURES.filter((f) => f.home === 'batavia');
    expect(BATAVIA_FIXTURES).toHaveLength(12);
    for (const f of home) expect(LEAGUE_VENUES[f.id]).toBe('pinnacle');
    expect(away.map((f) => LEAGUE_VENUES[f.id])).toEqual(away.map((_, i) => AWAY_LEAGUE_ROTATION[i % 3]));
    const counts = AWAY_LEAGUE_ROTATION.map((v) => away.filter((f) => LEAGUE_VENUES[f.id] === v).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(Object.keys(LEAGUE_VENUES).sort()).toEqual(BATAVIA_FIXTURES.map((f) => f.id).sort());
    expect(assignLeagueVenues([{ id: 'a', bataviaHome: false }, { id: 'b', bataviaHome: true }, { id: 'c', bataviaHome: false }])).toEqual({ a: 'bell94', b: 'pinnacle', c: 'westside' });
  });

  it('a new season saves every fixture venue at creation, independent of seed or career, and it survives a save round trip', () => {
    const a = newSeasonLeague('c1', 1);
    expect(a.venues).toEqual(LEAGUE_VENUES);
    expect(newSeasonLeague('other', 999).venues).toEqual(a.venues);
    const back = parseSeasonLeague(JSON.parse(JSON.stringify(a)));
    expect(back.ok && back.value.venues).toEqual(LEAGUE_VENUES);
    for (const f of BATAVIA_FIXTURES) expect(leagueVenue(a, f.id)).toBe(LEAGUE_VENUES[f.id]);
    const played = recordSeasonPlayed(a, BATAVIA_FIXTURES[0]!.id, 2, 1);
    expect(played.ok && played.state.venues).toEqual(LEAGUE_VENUES);
  });

  it('an old save gets venues once, for unplayed fixtures only; played history is untouched and nothing rerolls', () => {
    const { venues: _drop, ...legacy } = newSeasonLeague('c1', 5);
    const f1 = BATAVIA_FIXTURES[0]!;
    const r = recordSeasonPlayed(legacy, f1.id, 1, 1);
    if (!r.ok) throw new Error(r.error);
    const before = JSON.stringify(r.state.results);
    const m = withLeagueVenues(r.state);
    expect(m.changed).toBe(true);
    expect(JSON.stringify(m.state.results)).toBe(before);
    expect(leagueVenue(m.state, f1.id)).toBeNull();
    for (const f of BATAVIA_FIXTURES.slice(1)) expect(leagueVenue(m.state, f.id)).toBe(LEAGUE_VENUES[f.id]);
    const again = withLeagueVenues(m.state);
    expect(again.changed).toBe(false);
    expect(again.state).toBe(m.state);
  });

  it('rejects saved venues that are unknown or on fixtures Batavia does not play', () => {
    const s = newSeasonLeague('c1', 1);
    const other = 's1-r1-x-y';
    expect(parseSeasonLeague({ ...s, venues: { [BATAVIA_FIXTURES[0]!.id]: 'dell94' } }).ok).toBe(false);
    expect(parseSeasonLeague({ ...s, venues: { [other]: 'pinnacle' } }).ok).toBe(false);
    expect(parseSeasonLeague({ ...s, venues: [] }).ok).toBe(false);
  });

  it('tournaments save Scott\u2019s Complex at creation; older tournament saves get it on load', () => {
    const t = newTournament('az_showcase', 'c1', 3);
    expect(t.venue).toBe('scottsdale');
    const { venue: _v, ...legacy } = t;
    const p = parseTournament(legacy, 'az_showcase');
    expect(p.ok && p.value.venue).toBe('scottsdale');
    expect(parseTournament({ ...t, venue: 'nowhere' }, 'az_showcase').ok).toBe(false);
  });

  it('rejects unknown ids', () => {
    for (const v of ['dell94', 'Pinnacle Park', '', null, 3]) expect(isVenueId(v)).toBe(false);
  });
});
