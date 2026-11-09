import { describe, expect, it } from 'vitest';
import { FORMATIONS, FORMATION_IDS, OUTFIELD_PER_TEAM, channelOf, lineCounts, responsibilities, validateFormation } from '../src/game/match/formations';

describe('formation role data: every supported formation', () => {
  it.each(FORMATION_IDS)('%s is valid 9v9: one keeper, eight outfielders, unique roles, lines match the notation', (id) => {
    expect(validateFormation(FORMATIONS[id])).toEqual([]);
    const roles = FORMATIONS[id].roles;
    expect(roles.filter((r) => r.line === 'keeper')).toHaveLength(1);
    expect(roles.filter((r) => r.line !== 'keeper')).toHaveLength(OUTFIELD_PER_TEAM);
  });

  it('notation with or without the keeper gives the same outfield lines and never adds players', () => {
    expect(lineCounts('1-3-2-3')).toEqual([3, 2, 3]);
    expect(lineCounts('3-2-3')).toEqual([3, 2, 3]);
    expect(lineCounts('1-2-4-2')).toEqual([2, 4, 2]);
    for (const id of FORMATION_IDS) expect(lineCounts(id).reduce((a, b) => a + b, 0)).toBe(OUTFIELD_PER_TEAM);
  });

  it('a malformed formation is reported, not silently padded', () => {
    const def = FORMATIONS['1-3-2-3'];
    expect(validateFormation({ ...def, roles: def.roles.slice(0, 8) }).length).toBeGreaterThan(0);
    expect(validateFormation({ ...def, roles: [...def.roles, def.roles[8]!] }).length).toBeGreaterThan(0);
  });

  it.each(FORMATION_IDS)('%s: every responsibility is held by a role that exists, both touchlines get width', (id) => {
    const r = responsibilities(id);
    const ids = new Set(FORMATIONS[id].roles.map((x) => x.id));
    for (const role of [r.centreScreen, ...r.restDefence, r.width.left, r.width.right, ...r.forwards]) expect(ids.has(role)).toBe(true);
    expect(r.forwards.length).toBeGreaterThan(0);
    expect(r.restDefence.length).toBeGreaterThan(0);
    const roles = FORMATIONS[id].roles;
    expect(channelOf(roles.find((x) => x.id === r.width.left)!)).toBe('left');
    expect(channelOf(roles.find((x) => x.id === r.width.right)!)).toBe('right');
    for (const role of roles) if (role.line !== 'keeper') expect(r.coveredBy[role.id], `${role.id} has cover`).toBeDefined();
  });

  it('formations keep their differences: no assumption of three defenders, a number 6, two wingers or one striker', () => {
    expect(responsibilities('1-3-2-3').forwards).toEqual(['ST']);
    expect(responsibilities('1-3-3-2').forwards).toHaveLength(2);
    expect(responsibilities('1-3-3-2').centreScreen).toBe('CM');
    // 1-2-4-2 has no dedicated holding midfielder: the deeper central midfielder with the balance duty screens.
    expect(responsibilities('1-2-4-2').centreScreen).toBe('RCM');
    expect(responsibilities('1-2-4-2').width).toEqual({ left: 'LM', right: 'RM' });
    expect(responsibilities('1-3-2-3').width).toEqual({ left: 'LW', right: 'RW' });
  });
});
