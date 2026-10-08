# Writing a blog post

The blog is at `/blog.html` and its RSS feed is at `/rss.xml`. Posts are plain Markdown files in `root/blog/posts/`. The existing build generates their HTML pages, RSS items, and sitemap entries automatically.

## Add a post

Create a file such as `root/blog/posts/my-next-build.md`:

```markdown
---
title: My next build
date: 2026-10-03
description: A short summary for the blog list, search results, and RSS readers.
category: Build notes
draft: false
---

Write the opening paragraph here.

## What I built

Markdown supports links, images, lists, quotes, tables, and fenced code blocks.
```

Use lowercase words separated by hyphens in filenames. The filename becomes the URL: `/blog/my-next-build.html`. Keep the filename stable once published so incoming links and RSS subscriptions keep working.

`title`, `date`, and `description` are required. Dates use `YYYY-MM-DD`. `category` defaults to `Build notes`; `author` defaults to `MrCodeGameAndAnime`. Posts appear newest first. Reading time is calculated automatically.

Set `draft: true` to exclude a post from the blog, article output, RSS feed, and sitemap. Future dates do not schedule publication: a non-draft post is published at the next deployment. Raw HTML is displayed as text; use Markdown for formatting.

For images, place files in `root/public/blog-images/` and use a relative link such as `![Description of the image](../blog-images/my-image.webp)`. Relative links in posts resolve from their `/blog/` directory. RSS turns them into absolute URLs for feed readers.

## Preview and publish

From `root/`, run `npm run dev` and open `/blog.html`. Markdown edits refresh the preview automatically. The local `/rss.xml` and `/sitemap.xml` also reflect published posts.

Run `npm test -- --run` and `npm run build` to check the site. The output stays in `root/dist/`. Commit and push using the existing GitHub workflow to deploy.

No feed or sitemap editing is needed when adding a post. Titles, descriptions, canonical URLs, and social preview tags are generated from the post metadata.
