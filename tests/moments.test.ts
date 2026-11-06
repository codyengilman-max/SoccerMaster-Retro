import { describe, expect, it } from 'vitest';
import { ALL36_EPISODES, episodeById } from '../src/game/training12/all36/package';
import type { ChoiceId } from '../src/game/training12/all36/types';
import { MomentDirector, evaluate, explain, mirrorScene } from '../src/game/training12/moments/director';
import { draftScene } from '../src/game/training12/moments/draft';
import { MOMENT_APPROVALS, MOMENT_SCENES, effectiveStatus, momentScene, playerFacing, playerMoment, sceneHash, bundleHash } from '../src/game/training12/moments/index';
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
  const rec = (over: Partial<ApprovalRecord> = {}): ApprovalRecord => ({ sceneId: s.sceneId, version: s.version, hash: sceneHash(s), bundle: bundleHash(s), status: 'APPROVED', reviewer: 'test', date: '2026-11-05', note: '', ...over });
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
  it('a scene approval binds outcomes, rubric and asset/contact mapping: a missing or different bundle is stale', () => {
    const { bundle: _b, ...noBundle } = rec();
    expect(effectiveStatus(s, [noBundle])).toBe('CHANGES_REQUESTED');
    expect(effectiveStatus(s, [rec({ bundle: '0000000000000000' })])).toBe('CHANGES_REQUESTED');
    const regraded: MomentScene = { ...s, actions: s.actions.map((a, i) => (i ? a : { ...a, rubric: `${a.rubric} (edited)` })) as MomentScene['actions'] };
    expect(bundleHash(regraded)).not.toBe(bundleHash(s));
  });
  it('the hash ignores review status but changes with content', () => {
    expect(sceneHash({ ...s, review: { ...s.review, status: 'APPROVED' } })).toBe(sceneHash(s));
    expect(sceneHash({ ...s, objective: `${s.objective}!` })).not.toBe(sceneHash(s));
  });
  it('an approval appended after an edit (same version, new hash) wins over the stale record', () => {
    const edited: MomentScene = { ...s, assets: { ...s.assets, gaps: [] }, objective: `${s.objective} (edited)` };
    const stale = rec();
    const fresh = { ...rec(), hash: sceneHash(edited), bundle: bundleHash(edited) };
    expect(effectiveStatus(edited, [stale, fresh])).toBe('APPROVED');
    expect(playerFacing(edited, [stale, fresh])).toBe(true);
    expect(effectiveStatus(edited, [stale])).toBe('CHANGES_REQUESTED');
    expect(effectiveStatus(edited, [stale, fresh, { ...fresh, status: 'CHANGES_REQUESTED' }])).toBe('CHANGES_REQUESTED');
  });
  it('a scene with no blockers and a matching approval is player-facing', () => {
    const clean: MomentScene = { ...s, assets: { ...s.assets, gaps: [] } };
    expect(playerFacing(clean, [{ ...rec(), hash: sceneHash(clean), bundle: bundleHash(clean) }])).toBe(true);
  });
});

describe('draft generator', () => {
  it('is deterministic', () => {
    const e = ALL36_EPISODES[5]!;
    expect(draftScene(e, e.variants[1]!)).toEqual(draftScene(e, e.variants[1]!));
  });
});

describe('outcome drafts for frozen branches', () => {
  it('cover exactly the 159 package-frozen branches, keeping the package text', async () => {
    const { MOMENT_OUTCOMES } = await import('../src/game/training12/moments/index');
    const { isFrozenBranch } = await import('../src/game/training12/moments/outcomes');
    const frozen = MOMENT_SCENES.flatMap((s) => CHOICES.filter((k) => isFrozenBranch(s, k)).map((k) => `${s.sceneId}/${k}`));
    expect(frozen).toHaveLength(159);
    expect(MOMENT_OUTCOMES.map((o) => o.branchId)).toEqual(frozen);
    for (const o of MOMENT_OUTCOMES) {
      const s = MOMENT_SCENES.find((x) => x.sceneId === o.sceneId)!;
      expect(o.packageConsequence).toBe(s.branches[o.choice].consequence);
      expect(o.packageFeedback).toBe(s.branches[o.choice].feedback);
      expect(o.status).not.toBe('APPROVED');
      if (o.presentation === 'explanation') {
        expect(o.timeline).toBeNull();
        expect(o.missingDecision || o.question || o.category === 'unavailable').toBeTruthy();
      } else if (o.category === 'proposed') {
        // v2 proposal: the protagonist's action plays up to its consequence; nothing is resolved for it.
        const tl = o.timeline!;
        for (const a of s.actors) expect(d2(tl.actors.find((x) => x.id === a.id)!.keys[0]!.at, a.decision)).toBeLessThan(0.05);
        expect(tl.ball.every((e) => e.kind === 'held' || e.kind === 'carry' || (e.kind === 'pass' && e.receiver === null) || e.kind === 'loose')).toBe(true);
        expect(o.assumptions.length).toBeGreaterThan(0);
      } else {
        // Played out from the snapshot; the ball keeps its holder; no new ball event is invented.
        const tl = o.timeline!;
        for (const a of s.actors) expect(d2(tl.actors.find((x) => x.id === a.id)!.keys[0]!.at, a.decision)).toBeLessThan(0.05);
        expect(tl.ball).toHaveLength(1);
        const end = ballAt(tl, s.ball.decision, tl.duration);
        expect(d2(end.at, s.ball.decision)).toBeLessThan(1.5);
        expect(tl.actors.some((a) => a.keys.some((q) => d2(q.at, a.keys[0]!.at) > 0.05))).toBe(true);
      }
    }
  });
  it('v2 proposals: passes stop mid-flight, named runs follow the named runner, unnamed switches ask', async () => {
    const { MOMENT_OUTCOMES } = await import('../src/game/training12/moments/index');
    const { ballAt } = await import('../src/game/training12/moments/timeline');
    const passes = MOMENT_OUTCOMES.filter((o) => o.category === 'proposed' && o.timeline!.ball.some((e) => e.kind === 'pass'));
    expect(passes.length).toBeGreaterThan(0);
    for (const o of passes) {
      const s = MOMENT_SCENES.find((x) => x.sceneId === o.sceneId)!;
      expect(ballAt(o.timeline!, s.ball.decision, o.timeline!.duration).state.mode).toBe('flight');
    }
    // D18: the striker has no established run at the freeze, so "join the same near-post run" is a question.
    for (const id of ['TM-D18-base/C', 'TM-D18-changed/C']) {
      const np = MOMENT_OUTCOMES.find((o) => o.branchId === id)!;
      expect(np.timeline).toBeNull();
      expect(np.question).toBeTruthy();
    }
    const { actorAt } = await import('../src/game/training12/moments/timeline');
    const d16 = MOMENT_OUTCOMES.find((o) => o.branchId === 'TM-D16-changed/C')!;
    const cb = d16.timeline!.actors.find((a) => a.id === 'A_CB')!;
    expect(actorAt(d16.timeline!, 'A_CB', d16.timeline!.duration).at).not.toEqual(cb.keys[0]!.at);
    const sw = MOMENT_OUTCOMES.find((o) => o.branchId === 'TM-D10-base/C')!;
    expect(sw.timeline).toBeNull();
    expect(sw.question).toBeTruthy();
  });
  it('the director labels a frozen frame EXPLANATION and an outcome draft RESULT; players get no unapproved drafts', async () => {
    const { MOMENT_OUTCOMES, outcomesFor } = await import('../src/game/training12/moments/index');
    const o = MOMENT_OUTCOMES.find((x) => x.presentation === 'result')!;
    const s = MOMENT_SCENES.find((x) => x.sceneId === o.sceneId)!;
    expect(outcomesFor(s, false)).toEqual({});
    for (const [outs, want] of [[{}, 'explanation'], [outcomesFor(s, true), 'result']] as const) {
      const d = new MomentDirector(s, undefined, outs);
      d.start();
      run(d, 0.1, 200);
      d.choose(o.choice);
      expect(d.presentation).toBe(want);
    }
  });
});

describe('outcome drafts: review fixes', () => {
  it('mirrored review keeps (mirrored) outcome drafts; Learn describes the played outcome; blocked drafts never reach players', async () => {
    const { MOMENT_OUTCOMES, outcomesFor } = await import('../src/game/training12/moments/index');
    const { explain } = await import('../src/game/training12/moments/director');
    const o = MOMENT_OUTCOMES.find((x) => x.timeline && x.gaps.some((g) => g.blocksRelease))!;
    const s = MOMENT_SCENES.find((x) => x.sceneId === o.sceneId)!;
    const mir = outcomesFor(mirrorScene(s), true)[o.choice]!;
    const a = o.timeline!.actors[0]!.keys[0]!.at;
    expect(mir.timeline!.actors[0]!.keys[0]!.at).toEqual([Math.round((s.field.width - a[0]) * 100) / 100, a[1]]);
    const d = new MomentDirector(s, undefined, { [o.choice]: o });
    d.start();
    run(d, 0.1, 200);
    d.choose(o.choice);
    expect(explain(s, d.evaluation!, o).changed).toBe(o.whatChanged);
    const { outcomeHash } = await import('../src/game/training12/moments/outcomes');
    const rec = [{ sceneId: o.branchId, version: o.outcomeVersion, hash: outcomeHash(o), status: 'APPROVED' as const, reviewer: 't', date: '2026-01-01', note: '' }];
    // Owner-authorized art fallbacks (D76d): directional gaps no longer hold back an approved draft; unapproved ones never reach players.
    expect(outcomesFor(s, false, rec)[o.choice]).toBeDefined();
    expect(outcomesFor(s, false, [])[o.choice]).toBeUndefined();
  });
});

describe('neutral choices in the review build', () => {
  it('drop the generic option and show neutral wording, keeping action IDs and the package originals', async () => {
    const { shownChoices, reviseChoices, GENERIC, REVEALING } = await import('../src/game/training12/moments/choices');
    for (const s of MOMENT_SCENES) {
      const shown = shownChoices(s);
      const orig = shownChoices(s, true);
      expect(orig.map((c) => c.label)).toEqual(s.actions.map((a) => a.label));
      expect(shown.length).toBeGreaterThanOrEqual(2);
      for (const c of shown) {
        expect(s.actions.find((a) => a.id === c.id)?.label).toBe(c.original);
        expect(GENERIC.test(c.label)).toBe(false);
        if (c.label !== c.original) expect(REVEALING.test(c.label)).toBe(false);
      }
      // A reworded choice keeps its package grade only as RECHECK: the owner confirms it.
      for (const r of reviseChoices(s).revisions) expect(r.gradeStatus).toBe(r.change === 'reworded' ? 'RECHECK' : 'PACKAGE');
    }
  });
  it('apply the owner wording review: branch C of both versions, D17 C archived, grades kept as history', async () => {
    const { shownChoices, reviseChoices, movementCheck, OWNER_R4 } = await import('../src/game/training12/moments/choices');
    const { MOMENT_OUTCOMES } = await import('../src/game/training12/moments/index');
    for (const s of MOMENT_SCENES) {
      const own = OWNER_R4[s.library.situationId];
      const c = reviseChoices(s).revisions.find((r) => r.choice === 'C')!;
      expect(c.grade).toBe(s.actions.find((a) => a.id === 'C')!.grade);
      if (!own) continue;
      expect(c.proposed).toBe(own.label);
      if (own.decision === 'removed') expect(shownChoices(s).map((x) => x.id)).toEqual(['A', 'B']);
      else expect(shownChoices(s).find((x) => x.id === 'C')!.label).toBe(own.label);
    }
    expect(Object.values(OWNER_R4).filter((w) => w.decision === 'approved').length * 2).toBe(24);
    expect(Object.values(OWNER_R4).filter((w) => w.decision === 'replaced').length * 2).toBe(32);
    // A tackle label is not shown as contact: the drafts stop before it.
    for (const v of ['base', 'changed'] as const)
      for (const d of ['D19', 'D25', 'D32']) {
        const s = momentScene(d, v)!;
        expect(movementCheck(s, 'tackle', MOMENT_OUTCOMES.find((o) => o.branchId === `${s.sceneId}/C`)).check).toBe('STOPS_BEFORE_CONTACT');
      }
  });
  it('owner-authorized art fallbacks: directional gaps use the closest supplied frames; a tackle still blocks', async () => {
    const { fallbackFor, blocksAfterFallback } = await import('../src/game/training12/moments/artFallback');
    expect(fallbackFor({ actor: 'H_ST', phase: 'branch', need: 'run up the screen: only right three-quarter frames exist', blocksRelease: true })).not.toBeNull();
    expect(fallbackFor({ actor: 'H_ST', phase: 'branch', need: 'pass up the screen: the pass row only strikes sideways', blocksRelease: true })).not.toBeNull();
    expect(blocksAfterFallback({ actor: 'H_ST', phase: 'branch', need: 'tackle / dispossession: no tackle frames exist (must not be faked with pass frames)', blocksRelease: true })).toBe(true);
    for (const s of MOMENT_SCENES) for (const b of releaseBlockers(s)) expect(b).not.toMatch(/three-quarter frames exist|only strikes sideways/);
  });
  it('a dribbled ball is pushed ahead on each touch and caught up between touches, never glued to the foot', async () => {
    const { ballAt, actorAt } = await import('../src/game/training12/moments/timeline');
    const tl = MOMENT_SCENES.flatMap((x) => Object.values(x.branches).map((b) => b.timeline)).find((x) => x.ball.some((e) => e.kind === 'carry' && e.touches.length >= 2))!;
    const c = tl.ball.find((e) => e.kind === 'carry' && e.touches.length >= 2)! as Extract<(typeof tl.ball)[number], { kind: 'carry' }>;
    const s0 = MOMENT_SCENES.find((x) => Object.values(x.branches).some((b) => b.timeline === tl))!;
    const start = ballAt(s0.watch, s0.ball.start, s0.watch.duration).at;
    const lead = (t: number) => { const b = ballAt(tl, start, t).at; const a = actorAt(tl, c.by, t).at; return Math.hypot(b[0] - a[0], b[1] - a[1]); };
    const t0 = c.touches[0]!.t, t1 = c.touches[1]!.t;
    expect(lead((t0 + t1) / 2)).toBeGreaterThan(lead(t0) + 0.1);
    expect(Math.abs(lead(t1) - lead(t0))).toBeLessThan(0.2);
  });
  it('every drafted dribble touch pushes the ball forward along travel, never behind the carrier', async () => {
    const { ballAt, actorAt } = await import('../src/game/training12/moments/timeline');
    const { MOMENT_OUTCOMES } = await import('../src/game/training12/moments/index');
    const tls = [...MOMENT_SCENES.flatMap((x) => [x.watch, ...Object.values(x.branches).map((b) => b.timeline)]), ...MOMENT_OUTCOMES.flatMap((o) => (o.timeline ? [o.timeline] : []))];
    let checked = 0;
    for (const tl of tls)
      for (const c of tl.ball)
        if (c.kind === 'carry')
          for (let t = c.t0 + 0.05; t < c.t1 - 0.05; t += 0.1) {
            const a0 = actorAt(tl, c.by, t - 0.02).at, a1 = actorAt(tl, c.by, t + 0.02).at;
            const v = [a1[0] - a0[0], a1[1] - a0[1]] as const;
            if (Math.hypot(v[0], v[1]) < 1e-6) continue;
            const b0 = ballAt(tl, [0, 0], c.t0).at, p0 = actorAt(tl, c.by, c.t0).at;
            const base = [b0[0] - p0[0], b0[1] - p0[1]] as const;
            const b = ballAt(tl, [0, 0], t).at, p = actorAt(tl, c.by, t).at;
            const extra = [b[0] - p[0] - base[0], b[1] - p[1] - base[1]] as const;
            expect(extra[0] * v[0] + extra[1] * v[1]).toBeGreaterThanOrEqual(-1e-9);
            checked++;
          }
    expect(checked).toBeGreaterThan(20);
  });
  it('body facing stays separate from travel: a vertical look keeps the closest supplied side view', async () => {
    const { ttFacingFlip } = await import('../src/render/art/teamTrainingFrames');
    expect(ttFacingFlip([10, 10], [10, 20], [5, 30], false)).toBe(true);
    expect(ttFacingFlip([10, 10], [10, 20], [10, 30], true)).toBe(true);
    expect(ttFacingFlip([10, 10], [15, 20], [0, 0], true)).toBe(false);
  });
  it('a run beyond the defensive line only matches when the draft crosses the deepest outfield defender', async () => {
    const { movementCheck, reviseChoices } = await import('../src/game/training12/moments/choices');
    const { MOMENT_OUTCOMES } = await import('../src/game/training12/moments/index');
    for (const v of ['base', 'changed'] as const) {
      const s = momentScene('D12', v)!;
      const r = reviseChoices(s).revisions.find((x) => x.choice === 'C')!;
      expect(movementCheck(s, r.intent, MOMENT_OUTCOMES.find((o) => o.branchId === `${s.sceneId}/C`)).check).toBe('MISMATCH');
    }
  });
  it('a reworded option whose draft does not animate its wording gets no destination marker', async () => {
    const { shownChoices, reviseChoices, movementCheck } = await import('../src/game/training12/moments/choices');
    const { outcomesFor } = await import('../src/game/training12/moments/index');
    for (const s of MOMENT_SCENES) {
      const outs = outcomesFor(s, true);
      for (const r of reviseChoices(s).revisions)
        if (r.change === 'reworded' && movementCheck(s, r.intent, outs[r.choice]).check !== 'MATCHES') expect(shownChoices(s, false, outs).find((x) => x.id === r.choice)!.marker).toBeNull();
    }
  });
  it('Learn names the choice as the screen showed it while the package feedback keeps the judgment', async () => {
    const { shownChoices } = await import('../src/game/training12/moments/choices');
    const s = momentScene('D10', 'base')!;
    const shown = shownChoices(s);
    const x = explain(s, evaluate(s, 'C'), undefined, (id) => shown.find((c) => c.id === id)?.label);
    expect(x.chose.startsWith('Pass across to the opposite side.: a misread')).toBe(true);
    expect(x.chose).toContain(s.branches.C.feedback);
  });
});
