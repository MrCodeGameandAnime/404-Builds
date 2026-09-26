import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootPackage = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(rootPackage, '..'),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
