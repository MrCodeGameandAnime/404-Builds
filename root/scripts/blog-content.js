import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { Marked } from 'marked';
import { parse } from 'yaml';

export const siteUrl = 'https://404builds.com';

export function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]);
}

function safeUrl(value) {
  const normalized = String(value).replace(/[\u0000-\u0020\u007f]/g, '');
  if (/^(?:https?:|mailto:)/i.test(normalized) || !/^[a-z][a-z0-9+.-]*:/i.test(normalized)) return value;
  throw new Error(`Unsupported link or image URL: ${value}`);
}

const markdown = new Marked({
  gfm: true,
  renderer: {
    html({ text }) { return escapeXml(text); },
    heading({ tokens, depth }) {
      const level = Math.max(2, depth);
      return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>\n`;
    },
    link({ href, title, tokens }) {
      return `<a href="${escapeXml(safeUrl(href))}"${title ? ` title="${escapeXml(title)}"` : ''}>${this.parser.parseInline(tokens)}</a>`;
    },
    image({ href, title, text }) {
      return `<img src="${escapeXml(safeUrl(href))}" alt="${escapeXml(text)}"${title ? ` title="${escapeXml(title)}"` : ''} loading="lazy" decoding="async" />`;
    },
  },
});

export function parsePost(source, fileName) {
  const match = source.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error(`${fileName}: start the post with YAML metadata between --- lines.`);
  try {
    const metadata = parse(match[1]);
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('metadata must be a mapping.');
    if (metadata.draft !== undefined && typeof metadata.draft !== 'boolean') throw new Error('draft must be true or false.');
    if (metadata.draft === true) return null;
    const slug = path.basename(fileName, '.md');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('use a lowercase filename with words separated by hyphens.');
    for (const field of ['title', 'description', 'date']) {
      if (typeof metadata[field] !== 'string' || !metadata[field].trim()) throw new Error(`${field} is required.`);
    }
    const date = metadata.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
      throw new Error('date must be a valid YYYY-MM-DD date.');
    }
    for (const field of ['author', 'category']) {
      if (metadata[field] !== undefined && (typeof metadata[field] !== 'string' || !metadata[field].trim())) throw new Error(`${field} must be text.`);
    }
    const body = match[2].trim();
    if (!body) throw new Error('the post needs some Markdown content.');
    return {
      slug,
      title: metadata.title.trim(),
      description: metadata.description.trim(),
      date,
      displayDate: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date)),
      author: metadata.author?.trim() || 'MrCodeGameAndAnime',
      category: metadata.category?.trim() || 'Build notes',
      readingMinutes: Math.max(1, Math.ceil(body.split(/\s+/).length / 220)),
      url: `${siteUrl}/blog/${slug}.html`,
      html: markdown.parse(body),
    };
  } catch (error) {
    throw new Error(`${fileName}: ${error.message}`, { cause: error });
  }
}

export async function readPosts(directory) {
  const files = (await readdir(directory)).filter((file) => file.endsWith('.md')).sort();
  const posts = await Promise.all(files.map(async (file) => parsePost(await readFile(path.join(directory, file), 'utf8'), file)));
  return posts.filter(Boolean).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

function absoluteContent(post) {
  return post.html.replace(/\b(href|src)="([^"]*)"/g, (_, attribute, url) => {
    const decoded = url.replace(/&(amp|quot|apos|lt|gt);/g, (entity) => ({
      '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>',
    })[entity]);
    return `${attribute}="${escapeXml(new URL(decoded, post.url).href)}"`;
  });
}

export function buildRss(posts) {
  const items = posts.map((post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(post.url)}</link>
      <guid isPermaLink="true">${escapeXml(post.url)}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <category>${escapeXml(post.category)}</category>
      <dc:creator>${escapeXml(post.author)}</dc:creator>
      <description>${escapeXml(post.description)}</description>
      <content:encoded><![CDATA[${absoluteContent(post).replace(/\]\]>/g, ']]]]><![CDATA[>')}]]></content:encoded>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>404 Builds Blog</title>
    <link>${siteUrl}/blog.html</link>
    <description>Software, games, and experiments. Notes from behind the builds.</description>
    <language>en-us</language>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
${posts.length ? `    <lastBuildDate>${new Date(posts[0].date).toUTCString()}</lastBuildDate>\n` : ''}${items}
  </channel>
</rss>
`;
}

export function buildSitemap(base, posts) {
  const entries = posts.map((post) => `  <url>\n    <loc>${escapeXml(post.url)}</loc>\n    <lastmod>${post.date}</lastmod>\n  </url>\n`).join('');
  return base.replace('</urlset>', `${entries}</urlset>`);
}

export function blogHead(post = null) {
  const title = post ? `${post.title} | 404 Builds` : 'Blog | 404 Builds';
  const description = post?.description || 'Project updates, experiments, and lessons from behind the builds. Read the 404 Builds blog or follow along with RSS.';
  const url = post?.url || `${siteUrl}/blog.html`;
  return `<title>${escapeXml(title)}</title>
    <meta name="description" content="${escapeXml(description)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:site_name" content="404 Builds" />
    <meta property="og:type" content="${post ? 'article' : 'website'}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${escapeXml(title)}" />
    <meta property="og:description" content="${escapeXml(description)}" />
    <meta property="og:image" content="${siteUrl}/og-image.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="675" />
    <meta property="og:image:alt" content="404 Builds — software, games, and experiments" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeXml(title)}" />
    <meta name="twitter:description" content="${escapeXml(description)}" />
    <meta name="twitter:image" content="${siteUrl}/og-image.jpg" />
    <meta name="twitter:image:alt" content="404 Builds — software, games, and experiments" />${post ? `
    <meta property="article:published_time" content="${post.date}T00:00:00Z" />
    <meta property="article:author" content="${escapeXml(post.author)}" />` : ''}`;
}
