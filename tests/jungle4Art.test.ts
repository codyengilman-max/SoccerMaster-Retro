import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { JUNGLE4_ART, JUNGLE4_CAST, KEEPER_GLOVES, ballFrame, jungle4Frame, keeperFrame, type Jungle4Act } from '../src/render/art/jungle4Frames';
import { JUNGLE } from '../src/game/jungle/sim';

interface Atlas { frames: Record<string, { frame: { x: number; y: number; w: number; h: number }; pivot: { x: number; y: number } }>; meta: { bodyHeight?: number; diameter?: number; size: { w: number; h: number }; source: string[] } }
const atlas = (n: string): Atlas => JSON.parse(readFileSync(`src/assets/art/jungle-v4/jungle4-${n}.json`, 'utf8')) as Atlas;
const ACTS: (Jungle4Act | null)[] = [null, 'impact', 'falling', 'down', 'rising', 'sprint', 'charge', 'strike', 'hit', 'slide', 'recover', 'stagger', 'celebrate'];

describe('Jungle Ball replacement package art', () => {
  it('copies every source sheet unchanged (sha256 from the package inventory)', () => {
    const inv = JSON.parse(readFileSync('docs/art/jungle-v4/source/inventory.json', 'utf8')) as { file: string; sha256: string }[];
    expect(inv).toHaveLength(12);
    for (const e of inv) expect(createHash('sha256').update(readFileSync(`docs/art/jungle-v4/source/${e.file}`)).digest('hex')).toBe(e.sha256);
  });

  it('every pose the renderer can ask for exists, in both facings, for every character', () => {
    for (const ch of JUNGLE4_CAST) {
      const a = atlas(ch);
      for (const act of ACTS) for (const kind of ['run', 'idle', 'kick'] as const) for (let dir = 0; dir < 8; dir++) for (const pose of [0, 1, 2, 3, 4, 5, 6.5]) for (const k of [0, 0.3, 0.6, 0.99, 1])
        expect(a.frames[jungle4Frame(act, kind, dir, pose, k)], `${ch} ${act} ${kind} ${dir}`).toBeDefined();
    }
    const kp = atlas('keeper');
    for (const mode of ['set', 'dive', 'down', 'hold'] as const) for (const k of [0, 0.5, 1]) for (const left of [0.9, 0.2]) for (const mv of [true, false]) expect(kp.frames[keeperFrame(mode, k, left, mv)]).toBeDefined();
  });

  it('one scale per character: front idle is the body height, slides keep their drawn width, feet on the frame bottom', () => {
    for (const ch of [...JUNGLE4_CAST, 'keeper']) {
      const a = atlas(ch);
      expect(a.meta.bodyHeight).toBe(150);
      expect(a.frames[ch === 'keeper' ? 'ready' : 'idle-s']!.frame.h).toBe(150);
      for (const [name, f] of Object.entries(a.frames)) {
        expect(f.pivot.y, name).toBe(1);
        expect(f.pivot.x).toBeGreaterThan(0.15);
        expect(f.pivot.x).toBeLessThan(0.85);
        expect(f.frame.x + f.frame.w).toBeLessThanOrEqual(a.meta.size.w);
        expect(f.frame.y + f.frame.h).toBeLessThanOrEqual(a.meta.size.h);
        if (name.endsWith('-w')) expect(f.frame.w).toBe(a.frames[name.slice(0, -2)]!.frame.w);
      }
      if (ch !== 'keeper') {
        // A slide extension is wider than it is tall: it was not squeezed into standing bounds.
        expect(a.frames['slide-3']!.frame.w).toBeGreaterThan(a.frames['slide-3']!.frame.h);
        const runs = [0, 1, 2, 3, 4, 5].map((i) => a.frames[`run-${i}`]!.frame.h);
        expect(Math.max(...runs) - Math.min(...runs)).toBeLessThan(12);
      }
    }
  });

  it('applies the 1.35x height once over the old Jungle Ball height; physics radii unchanged', () => {
    expect(JUNGLE4_ART.heightFactor).toBe(1.35);
    // Old Jungle Ball height is PLAYER_ART.bodyScale x placeholder height; the new one multiplies it once more by 1.35.
    expect(readFileSync('src/render/art/playerArt.ts', 'utf8')).toMatch(/bodyScale: 1\.3,/);
    const art = readFileSync('src/render/art/jungle4Art.ts', 'utf8');
    expect(art).toContain('export const jungle4BodyHeight = (ph: number): number => PLAYER_ART.bodyScale * ph * JUNGLE4_ART.heightFactor;');
    expect(art.match(/heightFactor/g)).toHaveLength(1);
    const scene = readFileSync('src/scenes/JungleScene.ts', 'utf8');
    expect(scene).not.toMatch(/heightFactor\s*\*|\*\s*1\.35|1\.2075/);
    expect(JUNGLE.ballRadius).toBe(0.3);
  });

  it('maps actions to the inspected poses; front/back idle, side runs only', () => {
    expect(jungle4Frame(null, 'idle', 2, 0, 0)).toBe('idle-s');
    expect(jungle4Frame(null, 'idle', 6, 0, 0)).toBe('idle-n');
    expect(jungle4Frame(null, 'idle', 4, 0, 0)).toBe('idle-e-w');
    expect(jungle4Frame(null, 'run', 2, 3, 0)).toBe('run-3');
    expect(jungle4Frame(null, 'run', 4, 7, 0)).toBe('run-1-w');
    expect(jungle4Frame('slide', 'idle', 0, 0, 0.6)).toBe('slide-3');
    expect(jungle4Frame('recover', 'idle', 4, 0, 0.99)).toBe('rise-5-w');
    expect(jungle4Frame('strike', 'idle', 0, 0, 0.5)).toBe('shot-4');
    expect(jungle4Frame('celebrate', 'idle', 0, 0, 0)).toBe('taunt');
  });

  it('keeper holds the ball in the gloves of the shown pose and throws just before the sim releases it', () => {
    expect(keeperFrame('hold', 0, JUNGLE.keeperHoldSeconds, false)).toBe('catch-chest');
    expect(keeperFrame('hold', 0, 0.1, false)).toBe('throw-w');
    expect(keeperFrame('dive', 0.9, 0, false)).toBe('dive-b2-w');
    for (const [name, g] of Object.entries(KEEPER_GLOVES)) {
      expect(atlas('keeper').frames[name]).toBeDefined();
      expect(g.x).toBeGreaterThan(0);
      expect(g.x).toBeLessThan(1);
      expect(g.y).toBeGreaterThan(0);
      expect(g.y).toBeLessThan(1);
    }
  });

  it('ball: 12 rotations, same size and centre', () => {
    const b = atlas('ball');
    expect(Object.keys(b.frames)).toHaveLength(12);
    for (const f of Object.values(b.frames)) expect([f.frame.w, f.frame.h, f.pivot.x, f.pivot.y]).toEqual([64, 64, 0.5, 0.5]);
    expect(ballFrame(13)).toBe('ball-1');
    expect(ballFrame(-1)).toBe('ball-11');
  });
});
