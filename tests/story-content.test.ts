import { describe, expect, it } from 'vitest';
import raw from '../docs/story/v0.7/week_one_scenes.json';
import { STORY, StoryContentError, parseCatalog } from '../src/game/story/content';
import { PRONOUNS, renderText, validateName } from '../src/game/story/identity';

const clone = () => JSON.parse(JSON.stringify(raw)) as { scenes: { id: string; nodes: Record<string, unknown>[] }[] } & Record<string, unknown>;

describe('week-one story catalog v0.7', () => {
  it('loads the authoritative 18-scene order', () => {
    expect(STORY.order).toEqual([
      'INIT_IDENTITY', 'W1_HOME_01', 'W1_HOME_DOORWAY', 'W1_SCHOOL_01', 'W1_SCHOOL_02', 'W1_CROSSBAR', 'W1_CROSSBAR_REACTION',
      'W1_TRAINING_CONNECTION', 'INIT_FOCUS', 'W1_TRAINING_ARRIVAL', 'W1_PRACTICE', 'W1_TRAINING_REFLECTION', 'W1_MATCH_PRE',
      'W1_MATCH', 'W1_MATCH_POST', 'W1_HOME_CLOSE', 'CLOSE_WEEK', 'W2_SCHOOL_CALLBACK',
    ]);
    const kinds: Record<string, number> = {};
    for (const s of STORY.scenes) for (const n of s.nodes) kinds[n.type] = (kinds[n.type] ?? 0) + 1;
    expect(kinds).toEqual({ line: 46, end: 18, choice: 9, activity_handoff: 8 });
  });
  const reject = (mut: (c: ReturnType<typeof clone>) => void, msg: RegExp) => {
    const c = clone();
    mut(c);
    expect(() => parseCatalog(c)).toThrow(StoryContentError);
    expect(() => parseCatalog(c)).toThrow(msg);
  };
  const choiceNode = (c: ReturnType<typeof clone>) => c.scenes.find((s) => s.id === 'W1_SCHOOL_02')!.nodes.find((n) => n.type === 'choice')! as { options: Record<string, unknown>[] };
  it('rejects effect injection, unknown predicates and duplicate options', () => {
    reject((c) => void (choiceNode(c).options[0]!.effects = [{ op: 'add_stat', key: 'shooting', value: '5' }]), /effect not allowed/);
    reject((c) => void (choiceNode(c).options[0]!.predicate = 'is_admin'), /predicate not allowed/);
    reject((c) => void (choiceNode(c).options[1]!.id = choiceNode(c).options[0]!.id), /duplicate option|effect not allowed/);
  });
  it('rejects missing targets, cycles, unknown adapters, markup and unknown tokens', () => {
    reject((c) => void (c.scenes[1]!.nodes[0]!.next = 'nowhere'), /missing target/);
    reject((c) => void (c.scenes[1]!.nodes[0]!.next = c.scenes[1]!.nodes[0]!.id), /cycle/);
    reject((c) => void (c.scenes[0]!.nodes.find((n) => n.type === 'activity_handoff')!.adapter = 'shell'), /not allowed/);
    reject((c) => void (c.scenes[1]!.nodes[0]!.text = '<img src=x>'), /markup/);
    reject((c) => void (c.scenes[1]!.nodes[0]!.text = 'Hi {coach.secret}'), /unknown token/);
    reject((c) => void (c.version = '0.6'), /unsupported version/);
    reject((c) => void (c.scenes[0]!.nodes[0]!.__proto__x = 1), /unexpected field/);
  });
  it('requires all four outcomes for crossbar, practice and match', () => {
    reject((c) => {
      const h = c.scenes.find((s) => s.id === 'W1_MATCH')!.nodes.find((n) => n.type === 'activity_handoff')! as { outcomes: Record<string, string> };
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
