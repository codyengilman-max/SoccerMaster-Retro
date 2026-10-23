import { describe, expect, it } from 'vitest';
import { PHONE_MOMENTS, phoneAsset, phoneMomentNodes, phoneRoles, phoneStage } from '../src/render/art/phonePoses';
import { RUNTIME_IMAGES, isAllowedAsset, sceneVisual } from '../src/render/art/catalog';
import { sceneById } from '../src/game/story/content';

describe('phone poses (owner "five main characters on their phones")', () => {
  it('every moment matches exactly one scripted line, and only lines that show a phone', () => {
    expect(phoneMomentNodes().size).toBe(PHONE_MOMENTS.length);
    for (const m of PHONE_MOMENTS) expect(m.show.length, m.text).toBeLessThanOrEqual(3);
    for (const m of PHONE_MOMENTS) expect(['S1_W06_H', 'S1_W06_G', 'S1_W07_M', 'S1_W07_G']).toContain(m.scene);
  });

  it('one matching pose per character; no sheet, no invented characters', () => {
    expect(phoneAsset('sam', 'boy')).toBe('phone-sam');
    expect(phoneAsset('blake', 'girl')).toBe('phone-blake');
    expect(phoneAsset('player', 'boy')).toBe('phone-boy');
    expect(phoneAsset('player', 'girl')).toBe('phone-girl');
    expect(phoneAsset('player', null)).toBe(null);
    expect(phoneAsset('riley', 'girl')).toBe(null);
    expect(phoneAsset('coach', 'girl')).toBe(null);
    for (const id of ['phone-sam', 'phone-blake', 'phone-boy', 'phone-girl', 'phone-mom-dressy']) {
      expect(isAllowedAsset(id), id).toBe(true);
      expect(RUNTIME_IMAGES.get(id)).toMatchObject({ width: 512, height: 768 });
    }
    for (const m of PHONE_MOMENTS) for (const s of m.show) if (s.phone) expect(phoneAsset(s.role, 'girl'), `${m.scene} ${s.role}`).not.toBe(null);
  });

  for (const look of ['boy', 'girl'] as const) {
    it(`${look}: phone-only characters join the cast with their own pose, never duplicated, never on other lines`, () => {
      for (const scene of ['S1_W06_H', 'S1_W06_G', 'S1_W07_M', 'S1_W07_G']) {
        const v = sceneVisual(scene, look)!;
        const roles = v.cast.map((c) => c.role);
        expect(new Set(roles).size, scene).toBe(roles.length);
        for (const r of phoneRoles(scene)) expect(roles, `${scene} ${r}`).toContain(r);
        for (const c of v.cast) if (c.outfit === 'phone') expect(c.assetId).toBe(phoneAsset(c.role, look));
        expect(v.cast.map((c) => c.assetId)).not.toContain('phone-mom-dressy');
        for (const e of v.embeddedCharacters ?? []) expect(roles).not.toContain(e);
      }
      // Lines that are not phone moments have no staging (normal cast rules apply).
      const other = sceneById('S1_W06_H')!.nodes.find((n) => n.type === 'line' && (n as { speaker?: string }).speaker === 'Cloudy')!;
      expect(phoneStage('S1_W06_H', other.id)).toBe(null);
      expect(phoneStage('S1_W05_H', other.id)).toBe(null);
    });
  }
});
