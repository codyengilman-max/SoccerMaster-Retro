import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ALL36_EPISODES } from '../src/game/training12/all36/package';
import { STAND_FRAME, KEEPER, stillCast, stillPose, TT_OPPONENTS, TT_TEAMMATES, ttScale, targetBody, TT_ART, type StillActor } from '../src/render/art/teamTrainingFrames';

const actorsOf = (e: (typeof ALL36_EPISODES)[number], variant = e.variants[0]!): StillActor[] =>
  e.actors.map((a) => ({ id: a.id, team: a.team, role: a.role, at: variant.actor_overrides[a.id] ?? a.position_m }));

describe('Weekly Team Training sprites (All36 pictures on the team-training-v1 package)', () => {
  it.each(['boy', 'girl'] as const)('every actor of all 36 scenarios gets a team-correct, distinct package sheet (%s)', (look) => {
    expect(ALL36_EPISODES).toHaveLength(36);
    for (const e of ALL36_EPISODES) {
      const actors = actorsOf(e);
      const cast = stillCast(look, actors, e.protagonist_id);
      expect(cast.size, e.id).toBe(actors.length);
      for (const a of actors) {
        const sheet = cast.get(a.id)!;
        if (a.id === e.protagonist_id) expect(sheet, e.id).toBe(look);
        else if (a.role === 'GK') expect(sheet, `${e.id} ${a.id}`).toBe(a.team === 'H' ? 'keeper_home' : 'keeper_away');
        else expect((a.team === 'H' ? TT_TEAMMATES : TT_OPPONENTS) as readonly string[], `${e.id} ${a.id}`).toContain(sheet);
      }
      // No two players in one picture share an identity.
      expect(new Set(cast.values()).size, e.id).toBe(actors.length);
    }
  });

  it('identities are stable: the same scenario always casts the same faces', () => {
    for (const e of ALL36_EPISODES) expect([...stillCast('girl', actorsOf(e), e.protagonist_id)]).toEqual([...stillCast('girl', actorsOf(e), e.protagonist_id)]);
  });

  it('teams come from package data, never from colours: swapping a team swaps the kit', () => {
    const e = ALL36_EPISODES.find((x) => x.id === 'D07')!;
    const actors = actorsOf(e).map((a) => (a.id === 'H_ST' ? { ...a, team: 'A' as const } : a));
    expect(TT_OPPONENTS as readonly string[]).toContain(stillCast('boy', actors, e.protagonist_id).get('H_ST'));
  });

  it('observation poses are frozen key poses; defenders near the ball hold the defensive stance; keepers use keeper strips', () => {
    for (const e of ALL36_EPISODES) {
      const v = e.variants[0]!;
      const actors = actorsOf(e, v);
      const cast = stillCast('boy', actors, e.protagonist_id);
      const owner = actors.find((a) => a.id === v.ball_owner) ?? null;
      for (const a of actors) {
        const p = stillPose(a, cast.get(a.id)!, v.ball_position_m, owner, e.field.width_m);
        expect(p.action, `${e.id} ${a.id}`).not.toBe('run');
        if (a.role === 'GK') expect([KEEPER.stand, KEEPER.ready]).toContain(p.frame);
        else if (p.action === 'shuffle') {
          expect(owner && owner.team !== a.team).toBe(true);
          expect(p.frame).toBe(18);
        } else expect(p.frame).toBe(STAND_FRAME);
      }
    }
  });

  it('players face the ball; the carrier faces the middle of the goal they attack', () => {
    const owner: StillActor = { id: 'H_LW', team: 'H', role: 'LW', at: [6, 40] };
    const left: StillActor = { id: 'A_RB', team: 'A', role: 'RB', at: [12, 42] };
    expect(stillPose(owner, 'boy', [6, 40], owner, 45.72).flip).toBe(false);
    expect(stillPose(left, 'opponent_01', [6, 40], owner, 45.72)).toMatchObject({ flip: true, action: 'shuffle' });
    expect(stillPose({ ...owner, at: [40, 40] }, 'boy', [40, 40], { ...owner, at: [40, 40] }, 45.72).flip).toBe(true);
  });

  it('size: the approved 1.2075x visible-body target applied once, normalised by visible height', () => {
    for (const k of [6, 8.1, 12]) expect(ttScale(k) * TT_ART.standVisibleHeight).toBeCloseTo(targetBody(k), 9);
    expect(targetBody(8.1) / (1.3 * 22)).toBeCloseTo(1.2075, 9);
  });

  it('the Weekly screen loads only the team-training-v1 package, never Jungle Ball art', () => {
    const src = readFileSync('src/scenes/WeeklyTrainingScene.ts', 'utf8');
    expect(src).toMatch(/teamTrainingArt/);
    expect(src).not.toMatch(/jungle|Jungle|street/);
    expect(src).not.toMatch(/fillCircle\(p\.x, p\.y, r\)/);
  });
});
