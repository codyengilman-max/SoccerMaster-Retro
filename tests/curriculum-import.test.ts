import { describe, expect, it } from 'vitest';
import raw from '../research/training/v1.1/reference/training_manifest_v2.json?raw';
import { approved, choose, contentHash, eligible, EMPTY_STATE, mirror, trustedFrom, type DemoAsset } from '../src/game/career/curriculum/approval';
import { CURRICULUM, publishedLevels } from '../src/game/career/curriculum';
import { parseStrictJson } from '../src/game/career/curriculum/json';
import { CAPABILITIES, loadManifest, type Capability, type Manifest } from '../src/game/career/curriculum/manifest';
import type { ReleaseApproval } from '../src/game/career/curriculum/release';
import { RELEASE_APPROVALS } from '../src/game/career/curriculum/release';
import { sha256Hex, utf8 } from '../src/game/career/curriculum/sha256';

// TypeScript port of the package's reference checks (research/training/v1.1/reference/test_training_reference.py).
const base = (): Manifest => JSON.parse(raw) as Manifest;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type M = any;
const rejects = (change: (m: M) => void) => {
  const m = base();
  change(m);
  expect(() => loadManifest(JSON.stringify(m))).toThrow();
};

describe('curriculum import: valid package', () => {
  it('the unchanged v1.1 manifest parses: 20 families, 100 options, 200 demo references', () => {
    expect(CURRICULUM.ok).toBe(true);
    const m = loadManifest(raw);
    expect(m.families).toHaveLength(20);
    expect(m.families.reduce((n, f) => n + f.levels.length, 0)).toBe(100);
    expect(m.demos).toHaveLength(200);
    expect(m.contentVersion).toBe('1.1.0');
  });
  it('sha256 matches the FIPS test vectors', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('a'.repeat(1000))).toBe('41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3');
  });
});

describe('curriculum import: rejects invalid content atomically', () => {
  const cases: [string, (m: M) => void][] = [
    ['unknown top-level field', (m) => (m.untrusted = true)],
    ['unknown schema version', (m) => (m.schemaVersion = 999)],
    ['boolean schema version', (m) => (m.schemaVersion = true)],
    ['duplicate family ID', (m) => m.families.push(structuredClone(m.families[0]))],
    ['unknown profile', (m) => (m.families[0].profile = 'unsafe')],
    ['missing profile capability', (m) => (m.families[0].requiredCapabilities = ['ball'])],
    ['nonexistent prerequisite', (m) => (m.families[0].levels[0].prerequisites = ['missing'])],
    ['cyclic prerequisite', (m) => (m.families[0].levels[0].prerequisites = ['BM01-L1'])],
    ['missing source reference', (m) => (m.claims[1].sourceIds = ['missing'])],
    ['missing locator', (m) => (m.claims[1].locator = null)],
    ['missing demo', (m) => m.demos.pop()],
    ['wrong-side demo identity', (m) => (m.demos[0].side = 'left')],
    ['forged release flag', (m) => (m.families[0].levels[0].releaseStatus = 'published')],
    ['forged catalog approval record', (m) => m.reviewRecords.push({ approved: true })],
    ['untrusted demo asset authority', (m) => (m.demos[0].assetPath = 'https://evil.example/movie')],
    ['combination contains lane drill', (m) => Object.assign(m.families.at(-1).levels[0], { components: ['DR01-L1'], prerequisites: ['DR01-L1'] })],
    ['unknown fallback target', (m) => (m.substitutions[0].toFamily = 'missing')],
    ['fallback cycle', (m) => m.substitutions.push({ fromFamily: 'PA01', toFamily: 'PA02', sameOutcome: false, notice: 'test' })],
    ['duplicate slot index', (m) => (m.sessionTemplates[0].slots[1].index = 0)],
    ['stat reward injection', (m) => (m.rewardPolicy.statDelta = 1)],
    ['integer disguised as policy boolean', (m) => (m.rewardPolicy.convertible = 0)],
    ['physical catch-up enabled', (m) => (m.physicalSchedule.careerAdvanceCreatesPhysicalBacklog = true)],
    ['null setup', (m) => (m.families[0].levels[0].setup = null)],
    ['HTML in text', (m) => (m.families[0].title = '<img src=x onerror=alert(1)>')],
    ['oversize field', (m) => (m.families[0].title = 'x'.repeat(4001))],
    ['non-HTTPS URL', (m) => (m.sources[0].url = 'javascript:alert(1)')],
    ['hostname suffix spoof', (m) => (m.sources[0].url = 'https://www.ussoccer.com.evil.example/x')],
    ['URL credentials', (m) => (m.sources[0].url = 'https://user@www.ussoccer.com/x')],
    ['query-driven redirect URL', (m) => (m.sources[0].url = 'https://www.ussoccer.com/?next=https://evil.example')],
    ['URL fragment', (m) => (m.sources[0].url = 'https://www.ussoccer.com/x#y')],
    ['unexpected port', (m) => (m.sources[0].url = 'https://www.ussoccer.com:8443/x')],
  ];
  it.each(cases)('%s', (_name, change) => rejects(change));

  const rawCases: [string, string][] = [
    ['duplicate JSON properties', '{"schemaVersion":2,"schemaVersion":2}'],
    ['prototype-like property', '{"__proto__":{}}'],
    ['constructor property', '{"constructor":{}}'],
    ['NaN constant', '{"x":NaN}'],
    ['infinite constant', '{"x":Infinity}'],
    ['truncated JSON', '{"schemaVersion":'],
    ['oversized bytes', ' '.repeat(1_000_001)],
    ['deep nesting before parse', '['.repeat(17) + '0' + ']'.repeat(17)],
    ['trailing data', '{} {}'],
  ];
  it.each(rawCases)('raw: %s', (_name, text) => expect(() => loadManifest(text)).toThrow());

  it('strict reader never produces prototype-carrying objects', () => {
    const o = parseStrictJson('{"a":{"b":1}}') as Record<string, unknown>;
    expect(Object.getPrototypeOf(o)).toBeNull();
    expect(Object.getPrototypeOf(o.a)).toBeNull();
  });
});

// Synthetic approvals are test-only positive controls. They are never written to release.ts.
function fixture() {
  const m = base();
  for (const c of m.claims) if (c.type === 'unresolved') (c as M).type = 'original_adaptation';
  const assets = new Map<string, DemoAsset>();
  const list: ReleaseApproval[] = [];
  for (const f of m.families)
    for (const l of f.levels) {
      const sides: M = {};
      for (const side of ['left', 'right'] as const) {
        const bytes = utf8(`test asset ${side}`);
        const caption = utf8('test caption');
        assets.set(`${l.id}-${side}`, { bytes, caption, side });
        sides[side] = { assetHash: sha256Hex(bytes), captionHash: sha256Hex(caption) };
      }
      list.push({ levelId: l.id, contentHash: contentHash(m, l.id), coachReviewer: 'TEST_ONLY', coachReviewDate: '2026-10-15', qaReviewer: 'TEST_ONLY', qaReviewDate: '2026-10-15', evidenceReviewed: true, rightsReviewed: true, revoked: false, approvedRevision: 'test', sides });
    }
  return { m, assets, list };
}
const ALL = new Set<Capability>(CAPABILITIES);
const lid = 'BM02-L1';

describe('curriculum publication authority', () => {
  it('the shipped release manifest approves nothing, so no level is published', () => {
    expect(RELEASE_APPROVALS).toHaveLength(0);
    expect(publishedLevels()).toEqual([]);
  });
  it('synthetic approval positive control', () => {
    const { m, assets, list } = fixture();
    expect(approved(m, lid, trustedFrom(list), assets)).toBe(true);
  });
  const mutations: [string, (f: ReturnType<typeof fixture>) => void][] = [
    ['revoked approval', (f) => (f.list.find((r) => r.levelId === lid) as M).revoked = true],
    ['changed instruction', (f) => f.m.families[1]!.levels[0]!.steps.push('Changed step.')],
    ['changed safety text', (f) => ((f.m.safety as M).stopRule = 'Different rule')],
    ['changed asset bytes', (f) => f.assets.set(`${lid}-right`, { ...f.assets.get(`${lid}-right`)!, bytes: utf8('changed') })],
    ['changed caption', (f) => f.assets.set(`${lid}-right`, { ...f.assets.get(`${lid}-right`)!, caption: utf8('changed') })],
    ['wrong-foot asset', (f) => f.assets.set(`${lid}-right`, { ...f.assets.get(`${lid}-right`)!, side: 'left' })],
    ['missing coach reviewer', (f) => ((f.list.find((r) => r.levelId === lid) as M).coachReviewer = '')],
    ['missing rights review', (f) => ((f.list.find((r) => r.levelId === lid) as M).rightsReviewed = false)],
  ];
  it.each(mutations)('%s is rejected', (_n, mut) => {
    const f = fixture();
    mut(f);
    expect(approved(f.m, lid, trustedFrom(f.list), f.assets)).toBe(false);
  });
  it('unresolved evidence blocks even a synthetic approval', () => {
    const f = fixture();
    expect(approved(base(), 'BM01-L1', trustedFrom(f.list), f.assets)).toBe(false);
  });
});

describe('curriculum eligibility and one-hop fallback', () => {
  const f = fixture();
  const t = trustedFrom(f.list);
  const comfortable = new Set(f.m.families.flatMap((x) => x.levels.map((l) => l.id)));
  const caps = (...c: Capability[]) => new Set<Capability>(c);
  it('all-draft catalog returns the empty state', () => {
    expect(choose(base(), 'PA02', ALL, comfortable, new Map(), f.assets)).toEqual({ levelId: null, substituted: false, notice: EMPTY_STATE });
  });
  it('no wall and small space cannot fall back to target passing', () => {
    expect(choose(f.m, 'PA02', caps('ball', 'clear_floor'), comfortable, t, f.assets).levelId).toBeNull();
  });
  it('no target/no outdoor cannot fall back from finishing', () => {
    expect(choose(f.m, 'FI01', caps('ball', 'clear_floor'), comfortable, t, f.assets).levelId).toBeNull();
  });
  it('wall fallback requires target capabilities and carries the notice', () => {
    const c = choose(f.m, 'PA02', caps('ball', 'clear_floor', 'lane_clear', 'safe_runout', 'safe_target', 'backstop'), comfortable, t, f.assets);
    expect(c.substituted).toBe(true);
    expect(c.notice).toMatch(/not equivalent/);
  });
  it('no overhead space uses the disclosed ground alternative', () => {
    expect(choose(f.m, 'JU01', caps('ball', 'clear_floor'), comfortable, t, f.assets).levelId).toBe('BM01-L1');
  });
  it('an unfamiliar prerequisite blocks one-touch work', () => {
    expect(eligible(f.m, 'PA03-L1', ALL, new Set(), t, f.assets)).toBe(false);
  });
  it('a combination rechecks component approval', () => {
    const without = new Map([...t].filter(([k]) => k !== 'BM02-L1'));
    expect(eligible(f.m, 'CO01-L2', ALL, comfortable, without, f.assets)).toBe(false);
  });
  it('mirroring keeps inside, outside, sole and laces', () => {
    for (const s of ['inside', 'outside', 'sole', 'laces'] as const) expect(mirror('right', s)).toEqual(['left', s]);
  });
});
