// @vitest-environment node

import { readFile } from 'node:fs/promises';
import { JSDOM, ResourceLoader } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
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
  it('allows the initial Worker deploy before its private secrets are provisioned', async () => {
    const configText = await readFile(new URL('../workers/contact-api/wrangler.jsonc', import.meta.url), 'utf8');
    const config = JSON.parse(configText);

    expect(config.secrets?.required).toBeUndefined();
    expect(config.routes).toContainEqual({
      pattern: 'contact-api.404builds.com',
      custom_domain: true,
    });
  });

  it('uses a descriptive brand title in the browser tab', async () => {
    const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
    const page = new JSDOM(html);

    expect(page.window.document.title).toBe('404 Builds | Software, Games & AI Experiments');
    page.window.close();
  });

  it('uses relative asset URLs for both the Pages project path and a domain root', async () => {
    const resolved = await resolveConfig(viteConfig, 'build');

    expect(resolved.base).toBe('./');
  });

  it('ships a compact favicon and points the built page to that emitted asset', async () => {
    const sourceFavicon = await readFile(new URL('../res/optimized/favicon.png', import.meta.url));
    const outputFiles = await getBuiltOutputFiles();
    const htmlAsset = outputFiles.find((asset) => asset.type === 'asset' && asset.fileName === 'index.html');
    const faviconAsset = outputFiles.find((asset) => (
      asset.type === 'asset' && Buffer.from(asset.source).equals(sourceFavicon)
    ));
    const page = new JSDOM(Buffer.from(htmlAsset.source).toString());

    expect(faviconAsset).toBeDefined();
    expect(sourceFavicon.byteLength).toBeLessThan(100_000);
    expect(page.window.document.querySelector('link[rel="icon"]')?.getAttribute('href'))
      .toBe(`./${faviconAsset.fileName}`);
    page.window.close();
  }, 30_000);

  it('builds the main site pages with relative local URLs and emits the optimized About images', async () => {
    const outputFiles = await getBuiltOutputFiles();
    const builtPages = Object.fromEntries(outputFiles
      .filter((asset) => asset.type === 'asset' && ['index.html', 'about.html', 'contact.html'].includes(asset.fileName))
      .map((asset) => [asset.fileName, new JSDOM(Buffer.from(asset.source).toString())]));

    expect(Object.keys(builtPages).sort()).toEqual(['about.html', 'contact.html', 'index.html']);
    Object.values(builtPages).forEach((page) => {
      page.window.document.querySelectorAll('[src], [href]').forEach((element) => {
        const url = element.getAttribute('src') ?? element.getAttribute('href');
        expect(url.startsWith('./') || url.startsWith('https://') || url.startsWith('data:')).toBe(true);
      });
    });

    const aboutEntry = outputFiles.find((output) => (
      output.type === 'chunk' && output.isEntry && output.name === 'about'
    ));
    expect(aboutEntry).toBeDefined();
    const optimizedImages = outputFiles.filter((asset) => (
      asset.type === 'asset' && /assets\/(404_builds_logo|MrCodeGameAndAnime)-[^/]+\.webp$/.test(asset.fileName)
    ));
    expect(optimizedImages).toHaveLength(2);
    expect(optimizedImages.every((asset) => Buffer.byteLength(asset.source) < 400_000)).toBe(true);
    optimizedImages.forEach((asset) => {
      expect(aboutEntry.code).toContain(asset.fileName.split('/').at(-1));
    });

    Object.values(builtPages).forEach((page) => page.window.close());
  }, 15_000);

  it('ships unique search and social metadata on both built pages', async () => {
    const outputFiles = await getBuiltOutputFiles();
    const expectedPages = {
      'index.html': {
        title: '404 Builds | Software, Games & AI Experiments',
        description: '404 Builds turns ideas and edge cases into software, games, AI tools, and experiments. Explore independent projects built from scratch.',
        canonical: 'https://404builds.com/',
      },
      'about.html': {
        title: 'About 404 Builds | Founder & Builder',
        description: 'Meet the founder of 404 Builds, a digital foundry creating software, games, AI tools, and experiments from ideas, edge cases, and what-ifs.',
        canonical: 'https://404builds.com/about.html',
      },
      'contact.html': {
        title: 'Contact 404 Builds | Get in Touch',
        description: 'Contact 404 Builds about a project, collaboration, question, or idea. Send a message directly to our support inbox.',
        canonical: 'https://404builds.com/contact.html',
      },
    };

    Object.entries(expectedPages).forEach(([fileName, expected]) => {
      const asset = outputFiles.find((output) => output.type === 'asset' && output.fileName === fileName);
      expect(asset).toBeDefined();
      const page = new JSDOM(Buffer.from(asset.source).toString());
      const document = page.window.document;

      expect(document.title).toBe(expected.title);
      expect(document.querySelector('meta[name="description"]')?.content).toBe(expected.description);
      expect(document.querySelector('link[rel="canonical"]')?.href).toBe(expected.canonical);
      expect(document.querySelector('meta[property="og:title"]')?.content).toBe(expected.title);
      expect(document.querySelector('meta[property="og:description"]')?.content).toBe(expected.description);
      expect(document.querySelector('meta[property="og:url"]')?.content).toBe(expected.canonical);
      expect(document.querySelector('meta[name="twitter:title"]')?.content).toBe(expected.title);
      expect(document.querySelector('meta[name="twitter:description"]')?.content).toBe(expected.description);
      expect(document.querySelector('meta[property="og:image"]')?.content)
        .toBe('https://404builds.com/og-image.jpg');
      expect(document.querySelector('meta[name="twitter:card"]')?.content).toBe('summary_large_image');
      expect(document.querySelector('meta[name="twitter:image"]')?.content)
        .toBe('https://404builds.com/og-image.jpg');
      page.window.close();
    });
  });

  it('keeps the base site pages in the sitemap and a compact social preview image', async () => {
    const sitemapSource = await readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
    const socialImage = await readFile(new URL('../public/og-image.jpg', import.meta.url));
    const sitemap = new JSDOM(sitemapSource, { contentType: 'text/xml' });
    expect(Array.from(sitemap.window.document.querySelectorAll('loc')).map((node) => node.textContent)).toEqual([
      'https://404builds.com/',
      'https://404builds.com/about.html',
      'https://404builds.com/blog.html',
      'https://404builds.com/contact.html',
    ]);
    expect(socialImage.byteLength).toBeLessThan(350_000);
    sitemap.window.close();
  });

  it('builds readable blog pages, matching RSS items, and sitemap entries', async () => {
    const files = await getBuiltOutputFiles();
    const readAsset = (fileName) => {
      const file = files.find((output) => output.type === 'asset' && output.fileName === fileName);
      expect(file, fileName).toBeDefined();
      return Buffer.from(file.source).toString();
    };
    const index = new JSDOM(readAsset('blog.html'));
    const post = new JSDOM(readAsset('blog/welcome-to-404-builds.html'));
    expect(index.window.document.querySelector('h1').textContent).toBe('The build log.');
    expect(index.window.document.querySelector('.blog-card h2 a').getAttribute('href')).toBe('./blog/welcome-to-404-builds.html');
    const document = post.window.document;
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelector('h1').textContent).toBe('Welcome to 404 Builds');
    expect(document.querySelector('.post-content').textContent).toContain('where failure meets creation');
    expect(document.querySelector('link[rel="canonical"]').href).toBe('https://404builds.com/blog/welcome-to-404-builds.html');
    expect(document.querySelector('meta[property="og:type"]').content).toBe('article');
    expect(document.querySelector('link[rel="alternate"]').getAttribute('href')).toBe('../rss.xml');
    expect(document.querySelector('script[type="module"]')).toBeNull();
    expect(document.querySelector('link[rel="stylesheet"]').getAttribute('href')).toMatch(/^\.\.\/assets\//);
    expect([...document.querySelectorAll('img')].every((image) => image.src.startsWith('data:'))).toBe(true);
    const rss = new JSDOM(readAsset('rss.xml'), { contentType: 'text/xml' });
    expect(rss.window.document.querySelector('item link').textContent).toBe('https://404builds.com/blog/welcome-to-404-builds.html');
    const sitemap = new JSDOM(readAsset('sitemap.xml'), { contentType: 'text/xml' });
    expect([...sitemap.window.document.querySelectorAll('loc')].map((node) => node.textContent)).toEqual([
      'https://404builds.com/',
      'https://404builds.com/about.html',
      'https://404builds.com/blog.html',
      'https://404builds.com/contact.html',
      'https://404builds.com/blog/welcome-to-404-builds.html',
    ]);
    [index, post, rss, sitemap].forEach((page) => page.window.close());
  }, 30_000);

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

  it('keeps the Worker source and server secrets out of the Pages artifact', async () => {
    const outputFiles = await getBuiltOutputFiles();
    const fileNames = outputFiles.map((output) => output.fileName);
    const outputText = outputFiles.map((output) => (
      output.type === 'chunk' ? output.code : Buffer.from(output.source ?? '').toString()
    )).join('\n');

    expect(fileNames).toContain('contact.html');
    expect(fileNames.some((fileName) => fileName.includes('workers/contact-api'))).toBe(false);
    expect(outputText).not.toContain('SMTP2GO_API_KEY');
    expect(outputText).not.toContain('TURNSTILE_SECRET_KEY');
  });

  it('passes only the public Turnstile site key to the Pages build step', async () => {
    const workflowSource = await readFile(new URL('../../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
    const workflow = parse(workflowSource);
    const buildStep = workflow.jobs.build.steps.find((step) => step.name === 'Build site');

    expect(buildStep.env.VITE_TURNSTILE_SITE_KEY).toBe('${{ vars.VITE_TURNSTILE_SITE_KEY }}');
    expect(JSON.stringify(buildStep.env)).not.toContain('SMTP2GO_API_KEY');
    expect(JSON.stringify(buildStep.env)).not.toContain('TURNSTILE_SECRET_KEY');
  });

  it('uses six columns for the mobile primary navigation', async () => {
    const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

    expect(styles).toMatch(/\.primary-nav\s*\{[^}]*grid-template-columns:\s*repeat\(6,/s);
  });
});
