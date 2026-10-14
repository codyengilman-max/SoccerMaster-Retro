import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

function resolveBuildSha(): string {
  const fromEnv = process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv;
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
}

/** Gameplay Lab: on for the dev server and branch previews, off for the production (main) build. */
export function labEnabled(command: 'serve' | 'build', env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.SMR_LAB === '1') return true;
  if (env.SMR_LAB === '0') return false;
  if (command === 'serve') return true;
  const branch = env.CF_PAGES_BRANCH;
  return Boolean(branch) && branch !== 'main';
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig(({ command }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_SHA__: JSON.stringify(resolveBuildSha()),
    __LAB__: JSON.stringify(labEnabled(command)),
  },
  server: {
    host: true,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    // Phaser alone is ~1.5 MB minified; keep it in its own cacheable chunk.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
}));
