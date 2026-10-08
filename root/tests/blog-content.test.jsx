// @vitest-environment node
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { blogHead, buildRss, buildSitemap, parsePost } from '../scripts/blog-content.js';

const source = `---
title: Tools & ideas
date: 2026-10-03
description: Updates on software & games.
---

# A heading

A **useful** experiment. [Subscribe](../rss.xml?one=1&two=2).

\`\`\`js
const message = '<hello>';
\`\`\`
`;

describe('blog content and RSS', () => {
  it('renders Markdown with one page-level heading and date/author defaults', () => {
    const post = parsePost(source, 'tools-and-ideas.md');
    expect(post.url).toBe('https://404builds.com/blog/tools-and-ideas.html');
    expect(post.displayDate).toBe('Oct 3, 2026');
    expect(post.author).toBe('MrCodeGameAndAnime');
    expect(post.readingMinutes).toBe(1);
    expect(post.html).toContain('<h2>A heading</h2>');
    expect(post.html).toContain('<strong>useful</strong>');
    expect(post.html).toContain('&lt;hello&gt;');
  });

  it('excludes drafts even while their content is unfinished', () => {
    expect(parsePost('---\ndraft: true\n---\n', 'unfinished.md')).toBeNull();
  });

  it('rejects invalid publication metadata with the filename in the error', () => {
    expect(() => parsePost(source.replace('2026-10-03', '2026-02-30'), 'bad-date.md')).toThrow('bad-date.md: date');
    expect(() => parsePost(source, 'Invalid_Name.md')).toThrow('Invalid_Name.md: use a lowercase filename');
    expect(() => parsePost('# No metadata', 'no-metadata.md')).toThrow('no-metadata.md: start');
    expect(() => parsePost(source.replace('date:', 'draft: "true"\ndate:'), 'bad-draft.md')).toThrow('bad-draft.md: draft');
  });

  it('displays raw HTML as text and prevents script URLs in Markdown links', () => {
    const post = parsePost(`${source}\n<script>alert(1)</script>`, 'html.md');
    expect(post.html).not.toContain('<script>');
    expect(post.html).toContain('&lt;script&gt;');
    expect(() => parsePost(`${source}\n[bad](javascript:alert)`, 'bad-link.md')).toThrow('bad-link.md: Unsupported link');
  });

  it('produces readable XML with full post content and absolute links for feed readers', () => {
    const post = parsePost(source, 'tools-and-ideas.md');
    const feed = new JSDOM(buildRss([post]), { contentType: 'text/xml' });
    const document = feed.window.document;
    const item = document.querySelector('item');
    expect(item.querySelector('title').textContent).toBe('Tools & ideas');
    expect(item.querySelector('guid').textContent).toBe(post.url);
    expect(item.querySelector('pubDate').textContent).toBe('Sat, 03 Oct 2026 00:00:00 GMT');
    expect(item.getElementsByTagNameNS('http://purl.org/rss/1.0/modules/content/', 'encoded')[0].textContent)
      .toContain('href="https://404builds.com/rss.xml?one=1&amp;two=2"');
    feed.window.close();
    expect(() => new JSDOM(buildRss([]), { contentType: 'text/xml' })).not.toThrow();
  });

  it('escapes post metadata and adds published articles to the base sitemap', () => {
    const post = parsePost(source, 'tools-and-ideas.md');
    expect(blogHead(post)).toContain('<title>Tools &amp; ideas | 404 Builds</title>');
    const sitemap = new JSDOM(buildSitemap('<urlset><url><loc>https://404builds.com/</loc></url></urlset>', [post]), { contentType: 'text/xml' });
    expect([...sitemap.window.document.querySelectorAll('loc')].map((node) => node.textContent)).toEqual(['https://404builds.com/', post.url]);
    sitemap.window.close();
  });
});
