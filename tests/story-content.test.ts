import { describe, expect, it } from 'vitest';
import rawSeason from '../docs/story/season-one/season_one_scenes.json';
import { CATALOGS, RETIRED_VERSIONS, SEASON_ONE, SEASON_VERSION, StoryContentError, catalogFor, parseCatalog, sceneById } from '../src/game/story/content';
import { PRONOUNS, renderText, validateName } from '../src/game/story/identity';

const clone = () => JSON.parse(JSON.stringify(rawSeason)) as { scenes: { id: string; nodes: Record<string, unknown>[] }[] } & Record<string, unknown>;
const parseSeason = (c: unknown) => parseCatalog(c as never, { version: SEASON_VERSION, branches: true, season: true });

describe('one story catalog (owner directive, 2026-10-20)', () => {
  it('Season One is the only catalog; the v0.7 week one and the weeks 2–4 draft are not loadable', () => {
    expect(CATALOGS).toEqual([SEASON_ONE]);
    for (const v of RETIRED_VERSIONS) expect(catalogFor(v)).toBeUndefined();
    for (const id of ['W1_MONDAY_01', 'W1_SCHOOL_02', 'W2_ROLE_BOARD', 'W2_JUNGLE', 'W4_BEDROOM']) expect(sceneById(id)).toBeUndefined();
    expect(SEASON_ONE.version).toBe('s1-v2.0');
  });
  it('the season catalog rejects branch nodes unless branches are enabled', () => {
    expect(() => parseCatalog(clone() as never, { version: SEASON_VERSION, season: true })).toThrow(StoryContentError);
  });
  const reject = (mut: (c: ReturnType<typeof clone>) => void, msg: RegExp) => {
    const c = clone();
    mut(c);
    expect(() => parseSeason(c)).toThrow(StoryContentError);
    expect(() => parseSeason(c)).toThrow(msg);
  };
  const choiceNode = (c: ReturnType<typeof clone>) => c.scenes.flatMap((s) => s.nodes).find((n) => n.type === 'choice' && (n.options as unknown[]).length >= 2)! as { options: Record<string, unknown>[] };
  it('rejects effect injection, unknown predicates and duplicate options', () => {
    reject((c) => void (choiceNode(c).options[0]!.effects = [{ op: 'add_stat', key: 'shooting', value: '5' }]), /effect not allowed/);
    reject((c) => void (choiceNode(c).options[0]!.predicate = 'is_admin'), /predicate not allowed/);
    reject((c) => void (choiceNode(c).options[1]!.id = choiceNode(c).options[0]!.id), /duplicate option|effect not allowed/);
  });
  it('rejects missing targets, cycles, unknown adapters, markup and unknown tokens', () => {
    reject((c) => void (c.scenes[1]!.nodes[0]!.next = 'nowhere'), /missing target/);
    reject((c) => void (c.scenes[1]!.nodes[0]!.next = c.scenes[1]!.nodes[0]!.id), /cycle/);
    reject((c) => void (c.scenes.flatMap((s) => s.nodes).find((n) => n.type === 'activity_handoff')!.adapter = 'shell'), /not allowed/);
    reject((c) => void (c.scenes[1]!.nodes[0]!.text = '<img src=x>'), /markup/);
    reject((c) => void (c.scenes[1]!.nodes[0]!.text = 'Hi {coach.secret}'), /unknown token/);
    reject((c) => void (c.version = '0.6'), /unsupported version/);
    reject((c) => void (c.scenes[0]!.nodes[0]!.__proto__x = 1), /unexpected field/);
  });
  it('requires all four outcomes for full activities such as league matches', () => {
    reject((c) => {
      const h = c.scenes.flatMap((s) => s.nodes).find((n) => n.type === 'activity_handoff' && n.adapter === 'league_match')! as { outcomes: Record<string, string> };
      delete h.outcomes.interrupted;
    }, /outcomes must be/);
  });
});

describe('story identity', () => {
  it('accepts international names and rejects unsafe ones', () => {
    for (const n of ['Ana', 'José', 'Zoë', '李小龙', 'محمد', 'Nguyễn Thị', 'Ōta-Smith']) expect(validateName(n)).toEqual({ ok: true, name: n.normalize('NFC') });
    for (const n of ['', '   ', 'a\nb', 'x\u202eevil', 'a\u2066b', '{player.name}', '<b>x</b>', 'a'.repeat(25), 'x' + '\u0332'.repeat(9), 'x\u0007']) expect(validateName(n).ok).toBe(false);
    expect(validateName('  Kai  ')).toEqual({ ok: true, name: 'Kai' });
  });
  it('maps boy/girl to pronouns only and renders names as plain text in one pass', () => {
    expect(PRONOUNS.boy.subject).toBe('he');
    expect(PRONOUNS.girl.subject).toBe('she');
    expect(renderText('Hi {player.name}!', '{player.name}')).toBe('Hi {player.name}!');
  });
});
