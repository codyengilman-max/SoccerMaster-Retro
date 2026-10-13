import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? sourceFiles(full) : full.endsWith('.ts') ? [full] : [];
  });
}

function imports(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  return [...text.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1] ?? '');
}

describe('simulation + input / rendering separation', () => {
  const simFiles = [...sourceFiles(join(root, 'src/game')), ...sourceFiles(join(root, 'src/input'))];

  it('has simulation modules to check', () => {
    expect(simFiles.length).toBeGreaterThan(0);
  });

  it.each(simFiles.map((f) => relative(root, f)))('%s does not depend on Phaser, the DOM, or rendering', (file) => {
    const full = join(root, file);
    for (const spec of imports(full)) {
      expect(spec).not.toBe('phaser');
      expect(spec).not.toMatch(/(^|\/)(scenes|render|debug)(\/|$)/);
    }
    const code = readFileSync(full, 'utf8');
    expect(code).not.toMatch(/\b(window|document|HTMLElement)\b/);
  });

  it('pure render layout helpers do not import Phaser', () => {
    for (const spec of imports(join(root, 'src/render/layout.ts'))) expect(spec).not.toBe('phaser');
  });
});
