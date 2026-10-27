import { describe, expect, it } from 'vitest';
import { ASSIST_RULES, ContributionTracker, DEFENSE_RULES, DEFENSE_UNITS } from '../src/game/report/assists';
import type { MatchEvent } from '../src/game/match/types';

const players = Object.fromEntries(['h1', 'h2', 'h3', 'h4', 'a1', 'a2', 'a3'].map((id) => [id, { team: id.startsWith('h') ? 'home' : 'away' }])) as never;
let seq = 0;
const ev = (type: string, at: number, by: string | null, detail = ''): MatchEvent => ({ seq: seq++, type: type as never, at, by: by as never, detail });
const run = (events: MatchEvent[], rules?: { windowSeconds: number; recoverySeconds: number }) => {
  const t = new ContributionTracker(rules);
  t.observe({ simTime: events.at(-1)?.at ?? 0, players }, events);
  return t;
};
const get = (t: ContributionTracker, id: string) => t.of(id as never);
/** h1 passes to h2, who controls it at 1s. */
const chain = () => [ev('pass', 0, 'h1', 'h2'), ev('received', 1, 'h2')];

describe('assists', () => {
  it('times the window from the completed pass: 4.0 s counts, just over does not', () => {
    expect(ASSIST_RULES.windowSeconds).toBe(4);
    expect(get(run([...chain(), ev('shot', 4.9, 'h2'), ev('goal', 5, 'h2', 'home scored')]), 'h1').assists).toBe(1);
    expect(get(run([...chain(), ev('shot', 4.9, 'h2'), ev('goal', 5.01, 'h2', 'home scored')]), 'h1').assists).toBe(0);
  });
  it('keeps the window configurable', () => {
    expect(get(run([...chain(), ev('goal', 6, 'h2', 'home scored')], { windowSeconds: 6, recoverySeconds: 2 }), 'h1').assists).toBe(1);
  });
  it('lets the receiver take dribbling touches before scoring', () => {
    const t = run([...chain(), ev('dribble', 2, 'h2'), ev('dribble', 2.5, 'h2'), ev('shot', 3, 'h2'), ev('goal', 3.3, 'h2', 'home scored')]);
    expect(get(t, 'h1').assists).toBe(1);
  });
  it('credits only the last teammate to deliver the ball', () => {
    const t = run([...chain(), ev('pass', 1.5, 'h2', 'h3'), ev('received', 2, 'h3'), ev('goal', 3, 'h3', 'home scored')]);
    expect(get(t, 'h1').assists).toBe(0);
    expect(get(t, 'h2').assists).toBe(1);
  });
  it('ends eligibility on an opponent touch, a deflection, a stoppage or an unreceived pass', () => {
    expect(get(run([...chain(), ev('deflected', 1.5, 'a1', 'deflected'), ev('received', 1.8, 'h2'), ev('goal', 2, 'h2', 'home scored')]), 'h1').assists).toBe(0);
    expect(get(run([...chain(), ev('parried', 1.5, 'a1'), ev('shot', 1.8, 'h2'), ev('goal', 2, 'h2', 'home scored')]), 'h1').assists).toBe(0);
    expect(get(run([...chain(), ev('out', 1.5, null), ev('goal', 2, 'h2', 'home scored')]), 'h1').assists).toBe(0);
    expect(get(run([...chain(), ev('foul', 1.5, 'a1'), ev('goal', 2, 'h2', 'home scored')]), 'h1').assists).toBe(0);
    expect(get(run([ev('pass', 0, 'h1', 'h2'), ev('deflected', 0.5, 'h3', 'too fast to control'), ev('received', 1, 'h2'), ev('goal', 2, 'h2', 'home scored')]), 'h1').assists).toBe(0);
  });
  it('never counts own goals, self-assists or a second assist for one goal', () => {
    expect(get(run([...chain(), ev('goal', 2, 'h2', 'away scored')]), 'h1').assists).toBe(0);
    expect(get(run([ev('pass', 0, 'h1', 'h1'), ev('received', 1, 'h1'), ev('goal', 2, 'h1', 'home scored')]), 'h1').assists).toBe(0);
    const t = run([...chain(), ev('goal', 2, 'h2', 'home scored'), ev('goal', 2.1, 'h2', 'home scored')]);
    expect(get(t, 'h1').assists).toBe(1);
  });
  it('tracks the away team too', () => {
    expect(get(run([ev('pass', 0, 'a1', 'a2'), ev('received', 1, 'a2'), ev('goal', 2, 'a2', 'away scored')]), 'a1').assists).toBe(1);
  });
  it('re-reading the same events (repeated finalisation) never double counts', () => {
    const events = [...chain(), ev('goal', 2, 'h2', 'home scored')];
    const t = new ContributionTracker();
    t.observe({ simTime: 2, players }, events);
    t.observe({ simTime: 2, players }, events);
    t.observe({ simTime: 3, players }, events.slice(1));
    expect(get(t, 'h1').assists).toBe(1);
  });
});

describe('defensive points', () => {
  it('uses half-point units with a 20-unit threshold and a 2 s recovery window', () => {
    expect(DEFENSE_UNITS).toEqual({ slide: 2, standing: 1, interception: 3, threshold: 20 });
    expect(DEFENSE_RULES.recoverySeconds).toBe(2);
  });
  it('counts a slide only after clean contact and team possession inside the window', () => {
    const won = run([ev('slide', 0, 'h4', 'start'), ev('slide', 0.3, 'h4', 'ball poked from a1'), ev('received', 1.2, 'h3')]);
    expect(get(won, 'h4')).toMatchObject({ slideWon: 1, defenseUnits: 2 });
    expect(get(won, 'h3').interceptions).toBe(0);
    const late = run([ev('slide', 0, 'h4', 'start'), ev('slide', 0.3, 'h4', 'ball poked from a1'), ev('received', 2.5, 'h3')]);
    expect(get(late, 'h4').slideWon).toBe(0);
    const theirs = run([ev('slide', 0, 'h4', 'start'), ev('slide', 0.3, 'h4', 'ball poked from a1'), ev('received', 0.8, 'a2'), ev('tackle', 1, 'h3', 'won the ball from a2')]);
    expect(get(theirs, 'h4').slideWon).toBe(0);
    const miss = run([ev('slide', 0, 'h4', 'start'), ev('slide', 1, 'h4', 'recovered'), ev('received', 1.5, 'h3')]);
    expect(get(miss, 'h4').slideWon).toBe(0);
    const foul = run([ev('slide', 0, 'h4', 'start'), ev('slide', 0.2, 'h4', 'ball poked from a1'), ev('foul', 0.3, 'h4', 'slide on a1'), ev('received', 1, 'h3')]);
    expect(get(foul, 'h4').slideWon).toBe(0);
    const dirty = run([ev('slide', 0, 'h4', 'start'), ev('slide', 0.2, 'h4', 'contact a1, play on'), ev('tackle', 0.4, 'h4', 'won the ball from a1')]);
    expect(get(dirty, 'h4').slideWon).toBe(0);
    expect(get(run([ev('slide', 0, 'h4', 'start'), ev('tackle', 0.4, 'h4', 'won the ball from a1')]), 'h4').slideWon).toBe(1);
  });
  it('counts interceptions of passes only, never shots, and a slide that cuts out a pass is a slide only', () => {
    expect(get(run([ev('pass', 0, 'a1', 'a2'), ev('intercepted', 0.5, 'h3', 'cut out a1')]), 'h3')).toMatchObject({ interceptions: 1, defenseUnits: 3 });
    expect(get(run([ev('shot', 0, 'a1'), ev('intercepted', 0.5, 'h3', 'cut out a1')]), 'h3').interceptions).toBe(0);
    const sl = run([ev('pass', 0, 'a1', 'a2'), ev('slide', 0.1, 'h4', 'start'), ev('slide', 0.3, 'h4', 'ball touched'), ev('received', 0.9, 'h4')]);
    expect(get(sl, 'h4')).toMatchObject({ slideWon: 1, interceptions: 0, defenseUnits: 2 });
  });
  it('gives a deflected pass to the cutter once, not to the teammate who collects it', () => {
    const t = run([ev('pass', 0, 'a1', 'a2'), ev('deflected', 0.4, 'h3', 'deflected'), ev('intercepted', 1.1, 'h2', 'cut out a1')]);
    expect(get(t, 'h3')).toMatchObject({ interceptions: 1, defenseUnits: 3 });
    expect(get(t, 'h2').interceptions).toBe(0);
    const lost = run([ev('pass', 0, 'a1', 'a2'), ev('deflected', 0.4, 'h3', 'deflected'), ev('received', 1, 'a2')]);
    expect(get(lost, 'h3').interceptions).toBe(0);
  });
  it('never invents standing tackles from the ordinary contact tackle; a PR D standing event scores 1 unit', () => {
    expect(get(run([ev('tackle', 0, 'h4', 'won the ball from a1')]), 'h4').defenseUnits).toBe(0);
    expect(get(run([ev('tackle', 0, 'h4', 'standing tackle on a1')]), 'h4')).toMatchObject({ standingWon: 1, defenseUnits: 1 });
  });
  it('mixes scores: 4 interceptions + 4 slides = 20 units; 7 interceptions = 21', () => {
    const evs: MatchEvent[] = [];
    let at = 0;
    for (let i = 0; i < 4; i++) evs.push(ev('pass', (at += 5), 'a1', 'a2'), ev('intercepted', (at += 0.5), 'h4', 'cut out a1'));
    for (let i = 0; i < 4; i++) evs.push(ev('slide', (at += 5), 'h4', 'start'), ev('slide', (at += 0.2), 'h4', 'ball poked from a1'), ev('received', (at += 0.5), 'h4'));
    expect(get(run(evs), 'h4')).toMatchObject({ interceptions: 4, slideWon: 4, defenseUnits: 20 });
    const seven: MatchEvent[] = [];
    for (let i = 0; i < 7; i++) seven.push(ev('pass', (at += 5), 'a1', 'a2'), ev('intercepted', (at += 0.5), 'h4', 'cut out a1'));
    expect(get(run(seven), 'h4').defenseUnits).toBe(21);
  });
});
