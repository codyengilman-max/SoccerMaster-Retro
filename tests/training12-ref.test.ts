import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { catalog } from '../src/game/training12/ref/catalog.mjs';
import { sessions, validateCurriculum } from '../src/game/training12/ref/seasons.mjs';

const ref = join(__dirname, '../src/game/training12/ref');

/** SHA-256 of each file exactly as shipped in SoccerMaster_Team_Training_Fixed_v1.2.zip. */
const PACKAGE_HASHES: Record<string, string> = {
  'engine.mjs': 'c33883c10191966c1bb089165546ec2f24397f5ecb5a24084970fc6e329f48ac',
  'catalog.mjs': 'ff78821baf08bd3b3a9ce90777e10c5b6da167429fd870ac1408cc9aaf410a6b',
  'seasons.mjs': '4072da7b4bb3bedc983ef7f3f523b477e12977f0133d1b78c7a6666ce521ffd2',
};

describe('Team Training v1.2 reference package', () => {
  it.each(Object.entries(PACKAGE_HASHES))('%s is byte-identical to the supplied package', (file, hash) => {
    expect(createHash('sha256').update(readFileSync(join(ref, file))).digest('hex')).toBe(hash);
  });

  it('the supplied 36 reference tests pass unchanged', () => {
    const out = execFileSync(process.execPath, ['--test', 'engine.test.mjs', 'seasons.test.mjs', 'regressions.test.mjs'], { cwd: ref, encoding: 'utf8' });
    expect(out).toMatch(/^# tests 36$/m);
    expect(out).toMatch(/^# pass 36$/m);
    expect(out).toMatch(/^# fail 0$/m);
  }, 60_000);

  it('the curriculum is two 18-week seasons of three sessions with the authored level caps', () => {
    expect(validateCurriculum()).toMatchObject({ scheduledSessions: 108, basePracticeCards: 24, roleMappings: 972 });
    expect(catalog).toHaveLength(24);
    for (const s of sessions) {
      const cap = s.season === 2 ? 3 : s.week <= 6 ? 1 : s.week <= 12 ? 2 : 3;
      expect(s.maxLevel, s.id).toBe(cap);
    }
  });
});
