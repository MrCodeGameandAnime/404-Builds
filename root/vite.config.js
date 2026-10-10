import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blogPlugin } from './scripts/blog-plugin.js';

const rootPackage = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(rootPackage, '..');
const cacheDir = path.join(rootPackage, 'node_modules', '.vite');

export default defineConfig({
  root: projectRoot,
  publicDir: path.join(rootPackage, 'public'),
  base: './',
  cacheDir,
  plugins: [blogPlugin()],
  build: {
    outDir: path.join(rootPackage, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: [
        path.resolve(projectRoot, 'index.html'),
        path.resolve(projectRoot, 'about.html'),
        path.resolve(projectRoot, 'contact.html'),
        path.resolve(projectRoot, 'blog.html'),
      ],
    },
  },
});
