import { describe, expect, it } from 'vitest';
import { emptySave, reduce } from '../src/game/career/state';
import { buildReport, coachFeedback } from '../src/game/report/report';

const input = { matchId: 'S1-L3', week: 5, competition: 'League', home: 'Batavia', away: 'Royal Salt', score: { home: 2, away: 1 }, playerName: 'Cody', position: 'MID', minutes: 40 };
describe('saved match reports', () => {
  it('saving the same match twice keeps the first report and changes nothing', () => {
    const r = buildReport(input, [{ id: 'goal-1', kind: 'goal', at: 75, outcome: '' }]);
    const a = reduce(emptySave(), { type: 'matchReport', report: r });
    expect(a.ok && a.save.reports.length).toBe(1);
    if (!a.ok) return;
    const b = reduce(a.save, { type: 'matchReport', report: { ...r, minutes: 1 } });
    expect(b.ok && b.changed).toBe(false);
    expect(b.ok && b.save.reports[0]!.minutes).toBe(40);
    expect(b.ok && b.save.player).toEqual(a.save.player);
  });
  it('coach feedback comes from recorded stats only', () => {
    const r = buildReport(input, []);
    expect(coachFeedback(r).strength).toContain('nothing to judge');
    expect(r.rating.overall).toBeNull();
    expect(r.highlights).toEqual([]);
  });
});
