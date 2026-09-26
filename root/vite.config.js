import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootPackage = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(rootPackage, '..');
const cacheDir = path.join(rootPackage, 'node_modules', '.vite');

export default defineConfig({
  root: projectRoot,
  cacheDir,
  build: {
    outDir: path.join(rootPackage, 'dist'),
    emptyOutDir: true,
  },
});
