// @vitest-environment node

import { readFile } from 'node:fs/promises';
import { JSDOM, ResourceLoader } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { build, resolveConfig } from 'vite';
import viteConfig from '../vite.config.js';

let builtOutputPromise;

async function getBuiltOutputFiles() {
  if (!builtOutputPromise) {
    builtOutputPromise = build({
      ...viteConfig,
      configFile: false,
      logLevel: 'silent',
      build: {
        ...viteConfig.build,
        write: false,
      },
    }).then((bundle) => (Array.isArray(bundle)
      ? bundle.flatMap(({ output }) => output)
      : bundle.output));
  }

  return builtOutputPromise;
}

async function readSourceHtml(path) {
  try {
    return await readFile(new URL(path, import.meta.url), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

describe('GitHub Pages deployment setup', () => {
  it('uses the concise brand as the browser tab title', async () => {
    const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
    const page = new JSDOM(html);

    expect(page.window.document.title).toBe('404 Builds');
    page.window.close();
  });

  it('uses relative asset URLs for both the Pages project path and a domain root', async () => {
    const resolved = await resolveConfig(viteConfig, 'build');

    expect(resolved.base).toBe('./');
  });

  it('ships the favicon and points the built page to that emitted asset', async () => {
    const sourceFavicon = await readFile(new URL('../res/favicon.png', import.meta.url));
    const outputFiles = await getBuiltOutputFiles();
    const htmlAsset = outputFiles.find((asset) => asset.type === 'asset' && asset.fileName === 'index.html');
    const faviconAsset = outputFiles.find((asset) => (
      asset.type === 'asset' && Buffer.from(asset.source).equals(sourceFavicon)
    ));
    const page = new JSDOM(Buffer.from(htmlAsset.source).toString());

    expect(faviconAsset).toBeDefined();
    expect(page.window.document.querySelector('link[rel="icon"]')?.getAttribute('href'))
      .toBe(`./${faviconAsset.fileName}`);
    page.window.close();
  }, 30_000);

  it('builds both pages with relative local URLs and emits the original About images', async () => {
    const outputFiles = await getBuiltOutputFiles();
    const builtPages = Object.fromEntries(outputFiles
      .filter((asset) => asset.type === 'asset' && ['index.html', 'about.html'].includes(asset.fileName))
      .map((asset) => [asset.fileName, new JSDOM(Buffer.from(asset.source).toString())]));

    expect(Object.keys(builtPages).sort()).toEqual(['about.html', 'index.html']);
    Object.values(builtPages).forEach((page) => {
      page.window.document.querySelectorAll('[src], [href]').forEach((element) => {
        const url = element.getAttribute('src') ?? element.getAttribute('href');
        expect(url.startsWith('./') || url.startsWith('https://') || url.startsWith('data:')).toBe(true);
      });
    });

    const sourceAssets = await Promise.all([
      '../res/404_builds_logo.png',
      '../res/MrCodeGameAndAnime.jpg',
      '../res/favicon.png',
    ].map((path) => readFile(new URL(path, import.meta.url))));
    const emittedAssets = sourceAssets.map((source) => outputFiles.find((asset) => (
      asset.type === 'asset' && Buffer.from(asset.source).equals(source)
    )));

    emittedAssets.forEach((asset) => expect(asset).toBeDefined());
    const aboutEntry = outputFiles.find((output) => (
      output.type === 'chunk' && output.isEntry && output.name === 'about'
    ));
    expect(aboutEntry).toBeDefined();
    [emittedAssets[0], emittedAssets[1]].forEach((asset) => {
      expect(aboutEntry.code).toContain(asset.fileName.split('/').at(-1));
    });

    Object.values(builtPages).forEach((page) => page.window.close());
  }, 15_000);

  it('gives About its own title and search description', async () => {
    const html = await readSourceHtml('../../about.html');
    expect(html).not.toBeNull();
    if (!html) return;

    const page = new JSDOM(html);
    expect(page.window.document.title).toBe('About | 404 Builds');
    expect(page.window.document.querySelector('meta[name="description"]')?.content)
      .toBe('404 Builds is where failure meets creation. A digital foundry for the imperfect and the impossible.');
    page.window.close();
  });

  it('loads Metricool on both pages and initializes the tracker with this site’s hash', async () => {
    const pagesHtml = await Promise.all([
      readSourceHtml('../../index.html'),
      readSourceHtml('../../about.html'),
    ]);
    expect(pagesHtml[1]).not.toBeNull();
    if (!pagesHtml[1]) return;

    const trackerUrl = 'https://tracker.metricool.com/resources/be.js';
    const metricoolResource = new (class extends ResourceLoader {
      fetch(url) {
        if (url === trackerUrl) {
          return Promise.resolve(Buffer.from(
            'window.beTracker = { t: (payload) => { window.metricoolPayload = payload; } };',
          ));
        }

        return null;
      }
    })();
    const results = await Promise.all(pagesHtml.map((html) => new Promise((resolve) => {
      let page;
      page = new JSDOM(html, {
        runScripts: 'dangerously',
        resources: metricoolResource,
        beforeParse(window) {
          window.addEventListener('load', () => resolve({
            page,
            payload: window.metricoolPayload,
          }), { once: true });
        },
      });
    })));

    results.forEach(({ page, payload }) => {
      expect(payload).toEqual({ hash: '918f2d6d2b4e5d0c085914e143822eca' });
      page.window.close();
    });
  });
});
