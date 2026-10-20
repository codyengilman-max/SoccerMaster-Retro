import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEAGUE_CLUBS, NOT_ENTERED } from '../src/game/league/league';
import { sideLooks } from '../src/render/art/roster';
import { POSE_KINDS } from '../src/render/art/spriteFactory';
import { COACH_POSE, SPRITE_CELL, SPRITE_CLUBS, SPRITE_SETS, clubSet, frameName, juggleFrame, layoutOf } from '../src/render/art/spriteSets';

const ATLAS = 'src/assets/art/sprites-v2';
const SOURCE = 'docs/art/sprites-v2/source';
interface Rect { x: number; y: number; w: number; h: number }
interface Atlas {
  frames: Record<string, { frame: Rect; bodyBox: [number, number, number, number] }>;
  meta: { image: string; size: { w: number; h: number }; cell: { w: number; h: number }; anchor: { x: number; y: number }; bodyHeight: number; source: string; sourceSha256: string };
}
const atlas = (id: string): Atlas => JSON.parse(readFileSync(join(ATLAS, `${id}.json`), 'utf8')) as Atlas;
const sha = (path: string): string => createHash('sha256').update(readFileSync(path)).digest('hex');

describe('sprites v2 assets', () => {
  it('keeps all 14 owner sheets unchanged, matching SHA256SUMS', () => {
    const sums = readFileSync(join(SOURCE, 'SHA256SUMS'), 'utf8').trim().split('\n').map((l) => l.split(/\s+/));
    expect(sums).toHaveLength(14);
    for (const [hash, file] of sums) expect(sha(join(SOURCE, file!)), file).toBe(hash);
    expect(readdirSync(SOURCE).filter((f) => f.endsWith('.png')).sort()).toEqual(SPRITE_SETS.map((s) => `${s}.png`).sort());
  });

  it('builds one atlas per sheet, from that sheet, with in-bounds frames on the shared anchor', () => {
    for (const id of SPRITE_SETS) {
      const a = atlas(id);
      expect(a.meta.image).toBe(`${id}.webp`);
      expect(a.meta.source).toBe(`${SOURCE}/${id}.png`);
      expect(a.meta.sourceSha256).toBe(sha(a.meta.source));
      expect(a.meta.cell).toEqual({ w: SPRITE_CELL.width, h: SPRITE_CELL.height });
      expect(a.meta.anchor).toEqual({ x: SPRITE_CELL.anchorX, y: SPRITE_CELL.anchorY });
      expect(readFileSync(join(ATLAS, a.meta.image)).length).toBeGreaterThan(1000);
      for (const [name, f] of Object.entries(a.frames)) {
        const r = f.frame;
        expect(r.x + r.w <= a.meta.size.w && r.y + r.h <= a.meta.size.h, `${id}:${name}`).toBe(true);
        // Body never cropped by its cell, and feet sit on the anchor line.
        const [x0, y0, x1, y1] = f.bodyBox;
        expect(x0 >= 0 && y0 >= 0 && x1 <= r.w && y1 <= r.h, `${id}:${name} box`).toBe(true);
        expect(Math.abs(y1 - SPRITE_CELL.anchorY), `${id}:${name} feet`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('has a frame for every pose the scenes ask for, in all 8 directions', () => {
    for (const id of SPRITE_SETS) {
      const frames = atlas(id).frames;
      const layout = layoutOf(id);
      if (layout === 'coach') {
        for (const p of Object.values(COACH_POSE)) expect(frames[p], `${id}:${p}`).toBeDefined();
        continue;
      }
      for (const kind of POSE_KINDS) for (let dir = 0; dir < 8; dir++) for (let pose = 0; pose < 9; pose++) for (const keeper of [false, true]) {
        const name = frameName(layout, kind, dir, pose, keeper);
        expect(frames[name], `${id}:${kind}:${dir}:${pose}:${keeper} -> ${name}`).toBeDefined();
      }
      for (let pose = 0; pose < 9; pose++) {
        const j = juggleFrame(layout, pose);
        if (j) expect(frames[j], `${id}:${j}`).toBeDefined();
      }
    }
  });
});

describe('sprites v2 roster', () => {
  it('maps every club, including Next Horizon, to its own sheet without entering it in the league', () => {
    expect(SPRITE_CLUBS.map((c) => clubSet(c))).toEqual(['club-batavia-match', 'club-royal_salt', 'club-valley_rising', 'club-desert_tuzon', 'club-sol_vista', 'club-next_horizon']);
    expect(clubSet('batavia', 'training')).toBe('club-batavia-training');
    expect(clubSet('royal_salt', 'training')).toBe('club-royal_salt');
    expect([...LEAGUE_CLUBS]).toEqual(['batavia', 'royal_salt', 'valley_rising', 'desert_tuzon', 'sol_vista']);
    expect([...NOT_ENTERED]).toEqual(['next_horizon']);
  });

  it('dresses the created player in their own sheet and keepers in keeper poses', () => {
    for (const look of ['boy', 'girl'] as const) for (const kit of ['match', 'training'] as const) {
      const home = sideLooks('home', { slot: 7, look }, { club: 'batavia', kit });
      expect(home[7]!.set).toBe(`${look}-${kit}`);
      expect(home[0]).toMatchObject({ set: 'club-batavia-match', keeper: true });
      expect(home.filter((_, i) => i !== 0 && i !== 7).every((l) => l.set === clubSet('batavia', kit) && !l.keeper)).toBe(true);
    }
    const away = sideLooks('away', null, { club: 'next_horizon' });
    expect(away.every((l) => l.set === 'club-next_horizon')).toBe(true);
    expect(away.filter((l) => l.keeper)).toHaveLength(1);
    // Without a dress the drawn sprites are unchanged.
    expect(sideLooks('away').every((l) => l.set === undefined)).toBe(true);
  });
});
