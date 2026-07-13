// Static export for GitHub Pages / any static host.
// The app is fully client-side (localStorage persistence) in this mode, so the
// server-only API routes (the AI proxy) must be excluded — `next build` with
// `output: 'export'` cannot compile dynamic route handlers. We move them aside,
// build, then restore. In static mode the AI review uses its heuristic fallback.
import { execSync } from 'node:child_process';
import { existsSync, renameSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const apiDir = join(root, 'app', 'api');
const stash = join(root, '.api-stash');

function restore() {
  if (existsSync(stash)) {
    if (existsSync(apiDir)) rmSync(apiDir, { recursive: true, force: true });
    renameSync(stash, apiDir);
  }
}

process.on('exit', restore);
process.on('SIGINT', () => {
  restore();
  process.exit(1);
});

try {
  if (existsSync(apiDir)) {
    if (existsSync(stash)) rmSync(stash, { recursive: true, force: true });
    renameSync(apiDir, stash);
  }
  mkdirSync(join(root, 'out'), { recursive: true });
  execSync('next build', {
    stdio: 'inherit',
    env: { ...process.env, BUILD_STATIC: '1' },
  });
} finally {
  restore();
}
