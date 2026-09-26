import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootPackage = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(rootPackage, '..');
const cacheDir = path.join(rootPackage, 'node_modules', '.vite');

export default defineConfig({
  root: projectRoot,
  cacheDir,
  test: {
    environment: 'jsdom',
    setupFiles: './root/tests/setup.js',
    include: ['root/tests/**/*.test.jsx'],
  },
});
