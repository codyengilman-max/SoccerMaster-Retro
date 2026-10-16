import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { activeLogicScenarios, currentText, LOGIC_CATALOG, LOGIC_GROUPS, loadLogicCatalog, SCENARIO_GOAL } from '../src/game/logic/catalog';

const ROOT = join(__dirname, '..', 'research', 'logic', 'v0.2');
const RAW = readFileSync(join(ROOT, 'data', 'scenario_catalog.json'), 'utf8');
const mutate = (f: (d: any) => void): string => {
  const d = JSON.parse(RAW);
  f(d);
  return JSON.stringify(d);
};

describe('soccer-logic research catalog v0.2', () => {
  it('package files are unchanged against the package manifest', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'MANIFEST.sha256.json'), 'utf8')) as { files: Record<string, { bytes: number; sha256: string }> };
    const entries = Object.entries(manifest.files);
    expect(entries.length).toBeGreaterThan(10);
    for (const [path, want] of entries) {
      const buf = readFileSync(join(ROOT, path));
      expect(buf.length, path).toBe(want.bytes);
      expect(createHash('sha256').update(buf).digest('hex'), path).toBe(want.sha256);
    }
  });

  it('holds 40 distinct draft seeds in the supplied groups, far short of the 500-plus goal', () => {
    const ids = LOGIC_CATALOG.scenarios.map((s) => s.id);
    expect(ids.length).toBe(40);
    expect(new Set(ids).size).toBe(40);
    const counts: Record<string, number> = {};
    for (const s of LOGIC_CATALOG.scenarios) counts[s.group] = (counts[s.group] ?? 0) + 1;
    expect(counts).toEqual({ GK: 4, CB: 4, OB: 4, SIX: 4, EIGHT: 4, WING: 4, NINE: 4, DEF: 4, SP: 3, AT: 2, DT: 2, GM: 1 });
    expect(Object.keys(counts).every((g) => g in LOGIC_GROUPS)).toBe(true);
    expect(SCENARIO_GOAL - ids.length).toBe(460);
  });

  it('no seed drives match behaviour and none links to a source yet', () => {
    expect(LOGIC_CATALOG.runtimeReady).toBe(false);
    expect(activeLogicScenarios()).toEqual([]);
    expect(LOGIC_CATALOG.scenarios.every((s) => s.sourceIds.length === 0 && s.requiredBeforeActivation.length > 0)).toBe(true);
  });

  it('keeps the original text and applies the 4 audit corrections on top', () => {
    const corrected = LOGIC_CATALOG.scenarios.filter((s) => s.auditOverride);
    expect(corrected.map((s) => s.id)).toEqual(['CB01', 'OB04', 'WING01', 'AT02']);
    for (const s of corrected) {
      const t = currentText(s);
      expect(t.cue).toBe(s.auditOverride!.cue ?? s.original.cue);
      expect(t.counter).toBe(s.auditOverride!.counter ?? s.original.counter);
    }
  });

  it.each([
    ['runtime flag switched on', (d: any) => (d.runtime_ready = true)],
    ['a seed enabled for production', (d: any) => (d.scenarios[0].production_enabled = true)],
    ['a seed marked calibrated', (d: any) => (d.scenarios[1].calibration_status = 'calibrated')],
    ['a status other than draft', (d: any) => (d.scenarios[2].status = 'active')],
    ['an unknown field', (d: any) => (d.scenarios[3].weight = 1)],
    ['a duplicate id', (d: any) => (d.scenarios[4].id = d.scenarios[5].id)],
    ['an unknown group', (d: any) => (d.scenarios[6].id = 'ZZ01')],
    ['missing activation requirements', (d: any) => (d.scenarios[7].required_before_activation = [])],
    ['markup in text', (d: any) => (d.scenarios[8].original.counter_response = '<b>x</b>')],
  ])('rejects %s', (_name, f) => {
    expect(() => loadLogicCatalog(mutate(f))).toThrow();
  });

  it('rejects duplicate JSON keys and prototype keys', () => {
    expect(() => loadLogicCatalog(RAW.replace('"runtime_ready": false', '"runtime_ready": false, "runtime_ready": false'))).toThrow();
    expect(() => loadLogicCatalog(RAW.replace('"runtime_ready": false', '"runtime_ready": false, "__proto__": {}'))).toThrow();
  });
});
