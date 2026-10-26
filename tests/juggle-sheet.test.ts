import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { activityById } from '../src/game/career/catalog';
import { JUGGLE_PATTERNS, demoLength, demoPose, sheetBeats } from '../src/render/art/homeDemo';
import { DEFICIENT_FRAMES, JF, JUGGLE_CAL, JUGGLE_G, JUGGLE_SHEET, MAX_SUPPORT_SHIFT, compileJuggle, sheetPoseAt, supportShift, type JuggleBeat, type JuggleSex } from '../src/render/art/juggleSheet';

const SEXES: readonly JuggleSex[] = ['boy', 'girl'];
const beats = (id: string) => JUGGLE_PATTERNS[id] as readonly JuggleBeat[];
const frames = (id: string, sex: JuggleSex, miss = false) => {
  const tl = compileJuggle(beats(id), sex, miss);
  const out: number[] = [];
  for (let t = 0; t < tl.length; t += 1 / 120) {
    const i = sheetPoseAt(tl, sex, t).index;
    if (out[out.length - 1] !== i) out.push(i);
  }
  return out;
};
const png = (p: string) => {
  const b = readFileSync(p);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};

describe('juggling pack sheets', () => {
  it('ships both prepared 6 x 4 sheets of 160 x 128 cells, unaltered pack status', () => {
    for (const sex of SEXES) expect(png(`src/assets/art/juggling-v1/${sex}_juggling.png`)).toEqual({ w: 960, h: 512 });
    const m = JSON.parse(readFileSync('src/assets/art/juggling-v1/manifest.json', 'utf8'));
    expect(m.status).toBe('art_review_build_not_shipping_approved');
    expect(m.cell).toEqual([JUGGLE_SHEET.cell.w, JUGGLE_SHEET.cell.h]);
    expect(m.anchor).toEqual([JUGGLE_SHEET.anchor.x, JUGGLE_SHEET.anchor.y]);
  });

  it('uses the pack for ladders 1–5 only; thigh, settle and pass ladders keep the sprite-v2 poses', () => {
    expect(Object.keys(JUGGLE_PATTERNS).filter((id) => sheetBeats(activityById(id)!))).toEqual(['jg-1', 'jg-2', 'jg-3', 'jg-4', 'jg-5']);
    for (const id of ['jg-6', 'jg-7', 'jg-8']) expect(demoPose(activityById(id)!, 0.5, { sex: 'girl' }).art).toBeUndefined();
    expect(demoPose(activityById('jg-1')!, 0.5).art).toBeUndefined();
  });

  it('picks the saved protagonist sheet', () => {
    for (const sex of SEXES) expect(demoPose(activityById('jg-3')!, 1, { sex }).art!.sex).toBe(sex);
  });
});

describe('juggling timelines', () => {
  for (const sex of SEXES) {
    it(`${sex}: JU01 is hold → release → touch → catch, never the 24 frames as one loop`, () => {
      expect(frames('jg-1', sex)).toEqual([JF.hold, JF.release, JF.prepA, JF.touchA, JF.recoverA, JF.ready, JF.track, JF.catchPrep, JF.catch, JF.finish]);
      const kinds = compileJuggle(beats('jg-1'), sex).events.map((e) => e.kind);
      expect(kinds).toEqual(['release', 'touch', 'catch']);
      for (const id of Object.keys(JUGGLE_PATTERNS).slice(0, 5)) expect(new Set(frames(id, sex)).size).toBeLessThan(24);
    });

    it(`${sex}: JU02 bounces once on the ground between the two touches`, () => {
      const tl = compileJuggle(beats('jg-3'), sex);
      expect(tl.events.map((e) => e.kind)).toEqual(['release', 'touch', 'bounce', 'touch', 'catch']);
      const b = tl.events[2]!;
      expect(b.ball.y).toBe(JUGGLE_SHEET.anchor.y - JUGGLE_SHEET.ballR);
      expect(sheetPoseAt(tl, sex, b.t + 0.01).index).toBe(JF.waitBounce);
      expect(sheetPoseAt(tl, sex, b.t + 0.01).contact).toBe('bounce');
    });

    it(`${sex}: continuous juggling alternates the two foot cycles`, () => {
      const tl = compileJuggle(beats('jg-5'), sex);
      expect(tl.events.filter((e) => e.kind === 'touch').map((e) => e.frame)).toEqual([JF.touchA, JF.touchB, JF.touchA, JF.touchB]);
      expect(frames('jg-4', sex).filter((f) => f === JF.touchA || f === JF.touchB)).toEqual([JF.touchA, JF.touchA]);
    });

    it(`${sex}: every touch, bounce and catch lands on its body frame at the calibrated point`, () => {
      for (const id of ['jg-1', 'jg-2', 'jg-3', 'jg-4', 'jg-5']) {
        const tl = compileJuggle(beats(id), sex);
        for (const e of tl.events) {
          const p = sheetPoseAt(tl, sex, e.t + 0.001);
          expect(Math.hypot(p.ball.x - e.ball.x, p.ball.y - e.ball.y), `${id} ${e.kind}`).toBeLessThan(1.5);
          if (e.kind === 'touch') {
            expect(p.index).toBe(e.frame);
            expect(p.contact).toBe('laces');
            const cal = JUGGLE_CAL[sex].ball[e.frame]!;
            expect(Math.abs(e.ball.x - (cal.x + supportShift(sex, e.frame).dx))).toBeLessThan(0.01);
            expect(e.ball.y).toBe(cal.y);
            expect([JF.prepA, JF.prepB]).toContain(sheetPoseAt(tl, sex, e.t - 0.03).index);
          }
          if (e.kind === 'catch') {
            expect(p.index).toBe(JF.catch);
            expect(p.contact).toBe('catch');
            expect(sheetPoseAt(tl, sex, e.t - 0.03).index).toBe(JF.catchPrep);
          }
        }
      }
    });

    it(`${sex}: the ball flies on its own: continuous, ballistic between contacts`, () => {
      for (const [id, miss] of [['jg-2', false], ['jg-3', false], ['jg-5', false], ['jg-1', true], ['jg-3', true]] as const) {
        const tl = compileJuggle(beats(id), sex, miss);
        const dt = 1 / 240;
        let prev = sheetPoseAt(tl, sex, 0).ball;
        for (let t = dt; t < tl.length - dt; t += dt) {
          const b = sheetPoseAt(tl, sex, t).ball;
          expect(Math.hypot(b.x - prev.x, b.y - prev.y), `${id} @${t.toFixed(3)}`).toBeLessThan(3);
          prev = b;
        }
        if (miss) continue;
        const touch = tl.events.find((e) => e.kind === 'touch')!;
        const y = (t: number) => sheetPoseAt(tl, sex, t).ball.y;
        const t = touch.t + 0.3;
        expect((y(t + 0.01) - 2 * y(t) + y(t - 0.01)) / 1e-4).toBeCloseTo(JUGGLE_G, 0);
        // Ball rises after the touch (y up is negative) and peaks around head height.
        const ys = Array.from({ length: 100 }, (_, k) => y(touch.t + k * 0.01));
        expect(Math.min(...ys)).toBeLessThan(40);
      }
    });

    it(`${sex}: a miss chases, picks up and resets instead of catching`, () => {
      const f = frames('jg-1', sex, true);
      expect(f.slice(-5)).toEqual([JF.miss, JF.chase, JF.reach, JF.pickup, JF.stand]);
      expect(f).not.toContain(JF.catch);
      const tl = compileJuggle(beats('jg-1'), sex, true);
      expect(tl.events.map((e) => e.kind)).toEqual(['release', 'touch', 'land', 'pickup']);
      const land = tl.events[2]!;
      expect(land.ball.y).toBe(JUGGLE_SHEET.anchor.y - JUGGLE_SHEET.ballR);
      // The loop restarts from the hold with the ball back in the hands.
      const end = sheetPoseAt(tl, sex, tl.length - 0.001).ball;
      const start = sheetPoseAt(tl, sex, 0).ball;
      expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeLessThan(10);
      expect(demoLength(activityById('jg-1')!, { sex, miss: true })).toBeCloseTo(tl.length, 6);
    });

    it(`${sex}: planted boot stays put within ${MAX_SUPPORT_SHIFT} px; larger gaps are listed as deficient`, () => {
      const used = new Set(['jg-1', 'jg-2', 'jg-3', 'jg-4', 'jg-5'].flatMap((id) => [...frames(id, sex), ...frames(id, sex, true)]));
      const flagged = new Set(DEFICIENT_FRAMES[sex].map((d) => d.frame));
      for (const f of used) {
        const { dx, raw } = supportShift(sex, f);
        expect(Math.abs(dx)).toBeLessThanOrEqual(MAX_SUPPORT_SHIFT);
        if (Math.abs(raw) > MAX_SUPPORT_SHIFT) expect(flagged, `frame ${f}`).toContain(f);
      }
    });
  }
});
