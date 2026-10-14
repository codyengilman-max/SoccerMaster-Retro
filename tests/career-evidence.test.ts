import { describe, expect, it } from 'vitest';
import { EvidenceCollector, coachEvidence } from '../src/game/career/evidence';
import { MatchSim } from '../src/game/match/sim';
import { MATCH_TUNING } from '../src/game/match/tuning';
import type { MatchEvent, MatchState } from '../src/game/match/types';

const PITCH = MATCH_TUNING.pitch;

describe('M6 game evidence', () => {
  it('reads the real sandbox without changing it and only attributes the career player', () => {
    const a = new MatchSim({ seed: 11 });
    const b = new MatchSim({ seed: 11 });
    const col = new EvidenceCollector('H5', PITCH);
    const items = [];
    for (let i = 0; i < 60 * 120; i++) {
      a.step(1 / 60);
      b.step(1 / 60);
      items.push(...col.observe(a.state, a.state.events));
    }
    expect(JSON.stringify(a.state.ball)).toBe(JSON.stringify(b.state.ball));
    expect(a.state.events.map((e) => e.seq)).toEqual(b.state.events.map((e) => e.seq));
    expect(col.missed).toBe(0);
    for (const it of items) expect(['match']).toContain(it.source);
    expect(items.every((it) => [0, 0.5, 1].includes(it.success))).toBe(true);
  });

  it('goals give no evidence on their own and a gap in the event window drops pending items', () => {
    const sim = new MatchSim({ seed: 3 });
    const col = new EvidenceCollector('H8', PITCH);
    const st = sim.state as MatchState;
    const ev = (seq: number, type: MatchEvent['type'], by: MatchEvent['by'], detail = ''): MatchEvent => ({ seq, type, at: st.simTime, by, detail });
    expect(col.observe(st, [ev(1, 'goal', 'H8', 'home')])).toEqual([]);
    col.observe(st, [ev(2, 'received', 'H8')]);
    expect(col.observe(st, [ev(50, 'pass', 'H8', 'H5')]).filter((i) => i.attribute === 'firstTouch')).toEqual([]);
    expect(col.missed).toBe(47);
  });

  it('a shot from long range is a poor choice; a placed close shot counts', () => {
    const sim = new MatchSim({ seed: 3 });
    const st = sim.state as MatchState;
    const col = new EvidenceCollector('H8', PITCH);
    st.ball.pos = { x: 20, y: 25 } as never;
    st.ball.vel = { x: 20, y: 0 } as never;
    const far = col.observe(st, [{ seq: 1, type: 'shot', at: 0, by: 'H8', detail: '' }]);
    expect(far[0]).toMatchObject({ attribute: 'finishing', success: 0 });
    st.ball.pos = { x: 62, y: 25 } as never;
    st.ball.vel = { x: 20, y: 4 } as never;
    const near = col.observe(st, [{ seq: 2, type: 'shot', at: 0, by: 'H8', detail: '' }]);
    expect(near[0]).toMatchObject({ attribute: 'finishing', success: 1 });
    const other = col.observe(st, [{ seq: 3, type: 'shot', at: 0, by: 'H7', detail: '' }]);
    expect(other).toEqual([]);
  });

  it('coach evidence: unanswered moments are no opportunity; grades map to awareness', () => {
    const e = coachEvidence([
      { templateId: 't1', selectedGrade: 'strong' },
      { templateId: 't2', selectedGrade: null },
      { templateId: 't3', selectedGrade: 'risky' },
    ]);
    expect(e.map((x) => [x.attribute, x.source, x.success])).toEqual([
      ['awareness', 'coach', 1],
      ['awareness', 'coach', 0],
    ]);
  });
});
