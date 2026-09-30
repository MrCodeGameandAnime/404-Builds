// @vitest-environment node

import { readFile } from 'node:fs/promises';
import { JSDOM, ResourceLoader } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { resolveConfig } from 'vite';
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
