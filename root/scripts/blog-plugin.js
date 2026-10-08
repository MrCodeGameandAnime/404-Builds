import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { blogHead, buildRss, buildSitemap, readPosts } from './blog-content.js';

const runtime = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = path.dirname(runtime);
const postsDirectory = path.join(runtime, 'blog', 'posts');
const sitemapFile = path.join(runtime, 'public', 'sitemap.xml');

async function inlineIcons(markup) {
  const assets = [...new Set([...markup.matchAll(/(?:src|href)="(\/root\/res\/[a-z0-9_-]+\.svg)"/gi)].map((match) => match[1]))];
  for (const asset of assets) {
    const source = await readFile(path.join(project, asset.slice(1)));
    markup = markup.replaceAll(`"${asset}"`, `"data:image/svg+xml;base64,${source.toString('base64')}"`);
  }
  return markup;
}

async function documentHtml(template, render, posts, post = null) {
  // Vite's relative asset paths need one extra level for /blog/<slug>.html.
  if (post) template = template.replace(/((?:href|src)=")\.\//g, '$1../');
  return template.replace('<!--blog-head-->', () => blogHead(post))
    .replace('<!--blog-content-->', () => render(posts, post));
}

export function blogPlugin() {
  return {
    name: '404-builds-blog',
    enforce: 'post',
    configureServer(server) {
      server.watcher.on('all', (_, file) => {
        if (path.dirname(file) === postsDirectory && file.endsWith('.md')) server.ws.send({ type: 'full-reload' });
      });
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url, 'http://localhost').pathname;
        const slug = url.match(/^\/blog\/([a-z0-9-]+)\.html$/)?.[1];
        if (!slug && !['/blog.html', '/rss.xml', '/sitemap.xml'].includes(url)) return next();
        try {
          const posts = await readPosts(postsDirectory);
          response.setHeader('Cache-Control', 'no-cache');
          if (url === '/rss.xml' || url === '/sitemap.xml') {
            response.setHeader('Content-Type', 'application/xml; charset=utf-8');
            response.end(url === '/rss.xml' ? buildRss(posts) : buildSitemap(await readFile(sitemapFile, 'utf8'), posts));
            return;
          }
          const post = slug ? posts.find((candidate) => candidate.slug === slug) : null;
          if (slug && !post) {
            response.statusCode = 404;
            response.end('Post not found.');
            return;
          }
          const { renderBlog } = await server.ssrLoadModule('/root/src/blog-render.jsx');
          const template = await readFile(path.join(project, 'blog.html'), 'utf8');
          const html = await documentHtml(template, renderBlog, posts, post);
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.end(await server.transformIndexHtml(url, html));
        } catch (error) {
          next(error);
        }
      });
    },
    async generateBundle(_, bundle) {
      const page = bundle['blog.html'];
      if (!page) throw new Error('The blog.html entry is missing from the Vite build.');
      const template = String(page.source);
      const posts = await readPosts(postsDirectory);
      const server = await createServer({
        configFile: path.join(runtime, 'vite.config.js'),
        logLevel: 'error',
        optimizeDeps: { noDiscovery: true, include: [] },
        server: { middlewareMode: true, watch: null, hmr: false },
        appType: 'custom',
      });
      try {
        const { renderBlog } = await server.ssrLoadModule('/root/src/blog-render.jsx');
        page.source = await inlineIcons(await documentHtml(template, renderBlog, posts));
        for (const post of posts) {
          this.emitFile({ type: 'asset', fileName: `blog/${post.slug}.html`, source: await inlineIcons(await documentHtml(template, renderBlog, posts, post)) });
        }
        this.emitFile({ type: 'asset', fileName: 'rss.xml', source: buildRss(posts) });
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buildSitemap(await readFile(sitemapFile, 'utf8'), posts) });
      } finally {
        await server.close();
      }
    },
  };
}
