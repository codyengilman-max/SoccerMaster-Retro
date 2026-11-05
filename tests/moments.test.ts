import { describe, expect, it } from 'vitest';
import { ALL36_EPISODES, episodeById } from '../src/game/training12/all36/package';
import type { ChoiceId } from '../src/game/training12/all36/types';
import { MomentDirector, evaluate, explain, mirrorScene } from '../src/game/training12/moments/director';
import { draftScene } from '../src/game/training12/moments/draft';
import { MOMENT_APPROVALS, MOMENT_SCENES, effectiveStatus, momentScene, playerFacing, playerMoment, sceneHash } from '../src/game/training12/moments/index';
import type { ApprovalRecord, MomentScene } from '../src/game/training12/moments/schema';
import { ballAt, contacts, frameAt } from '../src/game/training12/moments/timeline';
import { releaseBlockers, validateScene } from '../src/game/training12/moments/validate';

const CHOICES: readonly ChoiceId[] = ['A', 'B', 'C', 'D'];
const d2 = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!);
const run = (dir: MomentDirector, dt: number, steps: number) => {
  for (let i = 0; i < steps; i++) dir.tick(dt);
};

describe('Tactical Moments library traceability', () => {
  it('stores one scene per All36 situation and variant, never overwriting the library', () => {
    expect(MOMENT_SCENES).toHaveLength(ALL36_EPISODES.length * 2);
    for (const e of ALL36_EPISODES) for (const v of e.variants) expect(momentScene(e.id, v.id)?.sceneId).toBe(`TM-${e.id}-${v.id}`);
  });
  it('every stored scene validates against its library record', () => {
    for (const s of MOMENT_SCENES) expect(validateScene(s), s.sceneId).toEqual([]);
  });
  it('no scene is goalkeeper-focused and every source id is the package source', () => {
    for (const s of MOMENT_SCENES) {
      expect(s.protagonist.role).not.toBe('GK');
      expect(s.sources).toEqual(episodeById(s.library.situationId)!.source_ids);
    }
  });
  it('no draft claims approval', () => {
    for (const s of MOMENT_SCENES) expect(['DRAFT', 'READY_FOR_REVIEW']).toContain(s.review.status);
    expect(MOMENT_APPROVALS).toEqual([]);
  });
});

describe('timeline', () => {
  const s = MOMENT_SCENES[0]!;
  it('is a pure function of scene time (replay restores the same state)', () => {
    for (const t of [0, 1.3, 2.4, 3.99, 4]) expect(frameAt(s.watch, s.ball.start, t)).toEqual(frameAt(s.watch, s.ball.start, t));
  });
  it('never teleports: consecutive 1/60 s samples move less than 7 m/s', () => {
    for (const sc of MOMENT_SCENES) {
      for (const tl of [sc.watch, ...CHOICES.map((k) => sc.branches[k].timeline)]) {
        const b0 = tl === sc.watch ? sc.ball.start : sc.ball.decision;
        let prev = frameAt(tl, b0, 0);
        for (let t = 1 / 60; t <= tl.duration; t += 1 / 60) {
          const f = frameAt(tl, b0, t);
          f.actors.forEach((a, i) => expect(d2(a.at, prev.actors[i]!.at) * 60, `${sc.sceneId} ${a.id} @${t.toFixed(2)}`).toBeLessThan(7.01));
          expect(d2(f.ball.at, prev.ball.at) * 60, `${sc.sceneId} ball @${t.toFixed(2)}`).toBeLessThan(20.01);
          prev = f;
        }
      }
    }
  });
  it('keeps possession continuous: a held ball stays at its holder', () => {
    for (const sc of MOMENT_SCENES) {
      for (let t = 0; t <= sc.watch.duration; t += 0.1) {
        const f = frameAt(sc.watch, sc.ball.start, t);
        if (f.ball.state.mode === 'held') expect(d2(f.ball.at, f.actors.find((a) => a.id === (f.ball.state as { by: string }).by)!.at)).toBeLessThan(1);
      }
    }
  });
  it('contacts land on the contact frames with the foot that faces the target', () => {
    for (const sc of MOMENT_SCENES) {
      for (const k of CHOICES) {
        const tl = sc.branches[k].timeline;
        for (const c of contacts(tl).filter((x) => x.kind !== 'touch')) {
          const f = frameAt(tl, sc.ball.decision, c.t);
          const a = f.actors.find((x) => x.id === c.by)!;
          expect(a.action, `${sc.sceneId} ${k} ${c.kind}`).toBe(c.kind);
          expect(a.since).toBeCloseTo(0, 6);
          // Facing never decides the foot (owner, 2026-11): unverified until the contact metadata is reviewed.
          expect(c.foot).toBe('unverified');
        }
      }
    }
  });
});

describe('director', () => {
  const s = MOMENT_SCENES.find((x) => x.sceneId === 'TM-D01-base')!;
  it('runs Brief → Watch → Slow → Decide and freezes on the package picture', () => {
    const d = new MomentDirector(s);
    expect(d.stage).toBe('brief');
    d.tick(1);
    expect(d.t).toBe(0);
    d.start();
    run(d, 1 / 60, 60);
    expect(d.stage).toBe('watch');
    run(d, 1 / 60, 120);
    expect(d.stage).toBe('slow');
    expect(d.rate).toBe(s.slow.rate);
    run(d, 1 / 60, 600);
    expect(d.stage).toBe('decide');
    expect(d.frame()).toEqual(d.snapshot());
    const e = episodeById('D01')!;
    for (const a of e.actors) expect(d2(d.snapshot().actors.find((x) => x.id === a.id)!.at, a.position_m)).toBeLessThan(0.05);
  });
  it('slow motion only changes the clock: arrival order and contacts are identical at any rate', () => {
    const at = (rate: number) => {
      const sc: MomentScene = { ...s, slow: { ...s.slow, rate } };
      const d = new MomentDirector(sc);
      d.start();
      const seen: string[] = [];
      let last = '';
      while (d.stage !== 'decide') {
        d.tick(1 / 60);
        const b = d.frame().ball.state;
        const k = b.mode === 'held' ? b.by : b.mode;
        if (k !== last) seen.push((last = k));
      }
      return { seen, snap: d.snapshot() };
    };
    const a = at(0.35);
    const b = at(1);
    expect(a.seen).toEqual(b.seen);
    expect(a.snap).toEqual(b.snap);
  });
  it('pause holds the clock; resume continues from the same time', () => {
    const d = new MomentDirector(s);
    d.start();
    run(d, 0.05, 10);
    const t = d.t;
    d.pause();
    run(d, 0.05, 40);
    expect(d.t).toBe(t);
    expect(d.rate).toBe(0);
    d.resume();
    d.tick(0.05);
    expect(d.t).toBeGreaterThan(t);
  });
  it('every answer branch resumes from the snapshot and reaches Learn; attempts are recorded by kind', () => {
    const d = new MomentDirector(s);
    d.start();
    run(d, 0.1, 200);
    for (const [i, k] of CHOICES.entries()) {
      if (i === 2) d.hint();
      expect(d.choose(k)).not.toBeNull();
      expect(d.stage).toBe('result');
      expect(d.frame().actors.map((a) => a.at)).toEqual(d.snapshot().actors.map((a) => a.at));
      run(d, 0.1, 400);
      expect(d.stage).toBe('learn');
      d.replay();
      expect(d.replaying).toBe(true);
      run(d, 0.1, 400);
      d.retry();
      run(d, 0.1, 200);
    }
    expect(d.attempts.map((a) => a.kind)).toEqual(['first', 'retry', 'assisted', 'retry']);
    expect(d.replays.filter((r) => r.what === 'result')).toHaveLength(4);
  });
  it('rejects a choice before the freeze', () => {
    const d = new MomentDirector(s);
    d.start();
    expect(d.choose('A')).toBeNull();
  });
});

describe('evaluation and feedback', () => {
  it('grades the decision from the package, apart from what the branch shows', () => {
    for (const s of MOMENT_SCENES) {
      const v = episodeById(s.library.situationId)!.variants.find((x) => x.id === s.library.variant)!;
      for (const k of CHOICES) {
        const ev = evaluate(s, k);
        expect(ev.grade).toBe(v.grades[k]);
        expect(ev.valid).toBe(v.grades[k] !== 'misread');
        const x = explain(s, ev);
        expect(x.mattered).toBe(v.visible_cues[0]);
        expect(x.chose).toContain(v.branches[k].feedback);
        expect(x.changed).toBe(s.branches[k].whatChanged);
      }
    }
  });
  it('feedback agrees with the branch events', () => {
    for (const s of MOMENT_SCENES) {
      for (const k of CHOICES) {
        const br = s.branches[k];
        const end = ballAt(br.timeline, s.ball.decision, br.timeline.duration);
        if (br.kind === 'pass' || br.kind === 'collect' || br.kind === 'turnover') expect(end.state).toEqual({ mode: 'held', by: br.packageTarget.ownerAfter });
        if (br.kind === 'hold' || br.kind === 'off-ball') {
          expect(d2(end.at, s.ball.decision)).toBeLessThan(0.05);
          const moved = br.timeline.actors.filter((a) => a.keys.some((q) => d2(q.at, a.keys[0]!.at) > 0.05)).map((a) => a.id);
          for (const id of moved) expect(br.whatChanged).toContain(id);
          if (!moved.length) expect(br.whatChanged).toMatch(/^Nothing moves/);
        }
      }
    }
  });
});

describe('mirrored variant', () => {
  it('mirrors positions and feet and still matches its own decision picture', () => {
    const s = MOMENT_SCENES.find((x) => x.branches.A.kind === 'pass')!;
    const m = mirrorScene(s);
    const f = frameAt(m.watch, m.ball.start, m.decision.t);
    const o = frameAt(s.watch, s.ball.start, s.decision.t);
    f.actors.forEach((a, i) => expect(a.at[0]).toBeCloseTo(s.field.width - o.actors[i]!.at[0], 6));
    const p = m.branches.A.timeline.ball.find((e) => e.kind === 'pass')!;
    const q = s.branches.A.timeline.ball.find((e) => e.kind === 'pass')!;
    expect(p.kind === 'pass' && q.kind === 'pass' && p.foot === 'unverified' && q.foot === 'unverified').toBe(true);
    const named: MomentScene = { ...s, branches: { ...s.branches, A: { ...s.branches.A, timeline: { ...s.branches.A.timeline, ball: s.branches.A.timeline.ball.map((e) => (e.kind === 'pass' ? { ...e, foot: 'right' as const } : e)) } } } };
    const flipped = mirrorScene(named).branches.A.timeline.ball.find((e) => e.kind === 'pass')!;
    expect(flipped.kind === 'pass' && flipped.foot).toBe('left');
    expect(evaluate(m, 'A').grade).toBe(evaluate(s, 'A').grade);
  });
});

describe('approval gating', () => {
  const s = MOMENT_SCENES[0]!;
  const rec = (over: Partial<ApprovalRecord> = {}): ApprovalRecord => ({ sceneId: s.sceneId, version: s.version, hash: sceneHash(s), status: 'APPROVED', reviewer: 'test', date: '2026-11-05', note: '', ...over });
  it('nothing reaches players without an approval record', () => {
    for (const x of MOMENT_SCENES) expect(playerMoment(x.library.situationId, x.library.variant)).toBeNull();
  });
  it('an approval for a different hash is void (material change) and reads as CHANGES_REQUESTED', () => {
    expect(effectiveStatus(s, [rec({ hash: '0000000000000000' })])).toBe('CHANGES_REQUESTED');
    expect(playerFacing(s, [rec({ hash: '0000000000000000' })])).toBe(false);
  });
  it('an approval for this exact version still waits on release blockers (missing animation)', () => {
    expect(effectiveStatus(s, [rec()])).toBe('APPROVED');
    expect(playerFacing(s, [rec()])).toBe(releaseBlockers(s).length === 0);
  });
  it('the hash ignores review status but changes with content', () => {
    expect(sceneHash({ ...s, review: { ...s.review, status: 'APPROVED' } })).toBe(sceneHash(s));
    expect(sceneHash({ ...s, objective: `${s.objective}!` })).not.toBe(sceneHash(s));
  });
  it('an approval appended after an edit (same version, new hash) wins over the stale record', () => {
    const edited: MomentScene = { ...s, assets: { ...s.assets, gaps: [] }, objective: `${s.objective} (edited)` };
    const stale = rec();
    const fresh = { ...rec(), hash: sceneHash(edited) };
    expect(effectiveStatus(edited, [stale, fresh])).toBe('APPROVED');
    expect(playerFacing(edited, [stale, fresh])).toBe(true);
    expect(effectiveStatus(edited, [stale])).toBe('CHANGES_REQUESTED');
    expect(effectiveStatus(edited, [stale, fresh, { ...fresh, status: 'CHANGES_REQUESTED' }])).toBe('CHANGES_REQUESTED');
  });
  it('a scene with no blockers and a matching approval is player-facing', () => {
    const clean: MomentScene = { ...s, assets: { ...s.assets, gaps: [] } };
    expect(playerFacing(clean, [{ ...rec(), hash: sceneHash(clean) }])).toBe(true);
  });
});

describe('draft generator', () => {
  it('is deterministic', () => {
    const e = ALL36_EPISODES[5]!;
    expect(draftScene(e, e.variants[1]!)).toEqual(draftScene(e, e.variants[1]!));
  });
});
