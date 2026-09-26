import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(root, '..'),
  test: {
    environment: 'jsdom',
    setupFiles: './root/tests/setup.js',
    include: ['root/tests/**/*.test.jsx'],
  },
});
