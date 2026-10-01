// @vitest-environment node

import { readFile } from 'node:fs/promises';
import { JSDOM, ResourceLoader } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { build, resolveConfig } from 'vite';
import viteConfig from '../vite.config.js';

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
    const bundle = await build({
      ...viteConfig,
      configFile: false,
      logLevel: 'silent',
      build: {
        ...viteConfig.build,
        write: false,
      },
    });
    const outputFiles = Array.isArray(bundle)
      ? bundle.flatMap(({ output }) => output)
      : bundle.output;
    const htmlAsset = outputFiles.find((asset) => asset.type === 'asset' && asset.fileName === 'index.html');
    const faviconAsset = outputFiles.find((asset) => (
      asset.type === 'asset' && Buffer.from(asset.source).equals(sourceFavicon)
    ));
    const page = new JSDOM(Buffer.from(htmlAsset.source).toString());

    expect(faviconAsset).toBeDefined();
    expect(page.window.document.querySelector('link[rel="icon"]')?.getAttribute('href'))
      .toBe(`./${faviconAsset.fileName}`);
    page.window.close();
  }, 15_000);

  it('loads Metricool globally and initializes the tracker with this site’s hash', async () => {
    const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
    const trackerUrl = 'https://tracker.metricool.com/resources/be.js';
    let finishLoading;
    const loaded = new Promise((resolve) => {
      finishLoading = resolve;
    });
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
    const page = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: metricoolResource,
      beforeParse(window) {
        window.addEventListener('load', finishLoading, { once: true });
      },
    });

    await loaded;

    expect(page.window.metricoolPayload).toEqual({
      hash: '918f2d6d2b4e5d0c085914e143822eca',
    });
    page.window.close();
  });
});
