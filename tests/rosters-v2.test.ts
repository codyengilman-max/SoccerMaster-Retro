import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sideLooks } from '../src/render/art/roster';
import { APPEARANCE_CLUBS, clubSet, APPEARANCE_UNUSED, appearanceFrame, appearanceSet, layoutOf, type AppearanceSetId } from '../src/render/art/spriteSets';

const DIR = 'src/assets/art/rosters-v2';
const atlas = (id: string): Record<string, unknown> => (JSON.parse(readFileSync(`${DIR}/${id}.json`, 'utf8')) as { frames: Record<string, unknown> }).frames;
const clips = (id: string): { clips: Record<string, { frames: string[] }>; unusedFrames: number[] } => JSON.parse(readFileSync(`${DIR}/${id}.clips.json`, 'utf8'));

describe('Animated Rosters v2', () => {
  it('ships every packed atlas with its texture and clip map', () => {
    const ids = readdirSync(DIR).filter((f) => f.endsWith('.clips.json')).map((f) => f.replace('.clips.json', ''));
    expect(ids.length).toBe(36);
    for (const id of ids) {
      expect(readdirSync(DIR)).toContain(`${id}.webp`);
      const frames = atlas(id);
      for (const c of Object.values(clips(id).clips)) for (const f of c.frames) expect(frames[f], `${id} ${f}`).toBeDefined();
    }
  });

  it('only switches clubs whose nine appearances are all drawn', () => {
    for (const [club, team] of Object.entries(APPEARANCE_CLUBS)) {
      for (let s = 0; s <= 8; s++) expect(readdirSync(DIR)).toContain(`${team}_${String(s === 0 ? 9 : s).padStart(2, '0')}.json`);
      expect(appearanceSet(club as never, 0)).toBe(`appr-${team}_09`);
    }
    for (const club of ['valley_rising', 'desert_tuzon', 'sol_vista', 'next_horizon'] as const) expect(appearanceSet(club, 1)).toBeNull();
  });

  it('every slot keeps one appearance, nine distinct, keeper in slot 0, and the career player keeps their own sheet', () => {
    const a = sideLooks('home', null, { club: 'batavia' }).map((l) => l.set);
    expect(sideLooks('home', null, { club: 'batavia' }).map((l) => l.set)).toEqual(a);
    expect(new Set(a).size).toBe(9);
    expect(a[0]).toBe('appr-fc_batavia_09');
    const mine = sideLooks('home', { slot: 4, look: 'girl' }, { club: 'batavia' });
    expect(mine[4]!.set).toBe('girl-match');
    expect(mine.filter((l) => l.set?.startsWith('appr-')).length).toBe(8);
    expect(sideLooks('away', null, { club: 'valley_rising' }).every((l) => l.set === 'club-valley_rising')).toBe(true);
  });

  it('training keeps the training kit for outfield players', () => {
    const t = sideLooks('home', null, { club: 'batavia', kit: 'training' });
    expect(t.slice(1).every((l) => l.set === 'club-batavia-training')).toBe(true);
    expect(t[0]).toMatchObject({ set: 'club-batavia-match', keeper: true });
  });

  it('training sessions keep every participant on the existing sheets, even in match kit', () => {
    for (const club of ['batavia', 'royal_salt'] as const) {
      const p = sideLooks('away', null, { club, kit: 'match', practice: true });
      expect(p.every((l) => l.set === clubSet(club, 'match'))).toBe(true);
      expect(sideLooks('away', null, { club, kit: 'match' }).every((l) => String(l.set).startsWith('appr-'))).toBe(true);
    }
  });

  it('every pose in every direction resolves to a drawn, enabled frame; left mirrors right', () => {
    for (const team of Object.values(APPEARANCE_CLUBS)) {
      for (let n = 1; n <= 9; n++) {
        const id = `${team}_${String(n).padStart(2, '0')}`;
        const set = `appr-${id}` as AppearanceSetId;
        expect(layoutOf(set)).toBe(n === 9 ? 'appearance-keeper' : 'appearance');
        const frames = atlas(id);
        const unused = clips(id).unusedFrames;
        for (const kind of ['run', 'idle', 'kick', 'slide', 'dive'] as const) {
          for (let d = 0; d < 8; d++) for (let p = 0; p < 6; p++) {
            const f = appearanceFrame(set, kind, d, p);
            expect(frames[f.name], `${id} ${kind} ${d}`).toBeDefined();
            expect(unused).not.toContain(Number(f.name.slice(-2)));
          }
        }
        expect(appearanceFrame(set, 'run', 4, 1)).toEqual({ ...appearanceFrame(set, 'run', 0, 1), flipX: true });
      }
    }
    expect(APPEARANCE_UNUSED.royal_salt_03).toEqual(clips('royal_salt_03').unusedFrames);
  });

  it('front and back runs come from the drawn cycles, not a rotated side pose', () => {
    expect(appearanceFrame('appr-fc_batavia_01', 'run', 2, 0).name).toBe('fc_batavia_01_04');
    expect(appearanceFrame('appr-fc_batavia_01', 'run', 6, 3).name).toBe('fc_batavia_01_11');
    expect(appearanceFrame('appr-fc_batavia_09', 'dive', 4, 0)).toEqual({ name: 'fc_batavia_09_23', flipX: true });
  });
});
