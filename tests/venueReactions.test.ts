import { describe, expect, it } from 'vitest';
import { SidelineReactions, type SidelineActor } from '../src/render/venueReactions';

const clips = { cheer: 1, clap: 1, disappointed: 1, seated_clap: 1 };
const seatedHome: SidelineActor = { id: 'sh', team: 'home', clips, seated: true };
const seatedAway: SidelineActor = { id: 'sa', team: 'away', clips, seated: true };
const standingAway: SidelineActor = { id: 'st', team: 'away', clips };

function played(type: 'goal' | 'save' | 'miss', team: 'home' | 'away', actors: SidelineActor[]): Record<string, string> {
  const r = new SidelineReactions();
  r.onEvent({ id: 'e1', type, team }, actors, 0);
  const out: Record<string, string> = {};
  r.update(10_000, (a, action) => { out[a.id] = action; });
  return out;
}

describe('SidelineReactions', () => {
  it('seated supporters applaud their own goal and save, never the opponent goal', () => {
    expect(played('goal', 'home', [seatedHome, seatedAway, standingAway])).toEqual({ sh: 'seated_clap', st: 'disappointed' });
    expect(played('save', 'home', [seatedHome, seatedAway])).toEqual({ sh: 'seated_clap' });
    expect(played('miss', 'home', [seatedHome, seatedAway])).toEqual({});
  });

  it('plays each event id once', () => {
    const r = new SidelineReactions();
    r.onEvent({ id: 'g', type: 'goal', team: 'home' }, [seatedHome], 0);
    r.onEvent({ id: 'g', type: 'goal', team: 'home' }, [seatedHome], 5000);
    let n = 0;
    r.update(20_000, () => { n++; });
    expect(n).toBe(1);
  });
});
