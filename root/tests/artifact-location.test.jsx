// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { resolveConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import viteConfig from '../vite.config.js';

const rootPackage = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function resolveFromViteRoot(viteRoot, target) {
  return path.resolve(viteRoot, target);
}

describe('Vite artifact locations', () => {
  it('keeps build output and the Vite cache inside root', async () => {
    const resolved = await resolveConfig(viteConfig, 'build');

    expect(resolveFromViteRoot(resolved.root, resolved.build.outDir)).toBe(
      path.join(rootPackage, 'dist'),
    );
    expect(path.resolve(resolved.cacheDir)).toBe(
      path.join(rootPackage, 'node_modules', '.vite'),
    );
  });
});
