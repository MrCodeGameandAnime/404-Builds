import React from 'react';
import { Footer, Header } from './App.jsx';

function RssIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="5" cy="19" r="1.5" fill="currentColor" stroke="none" />
      <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" />
    </svg>
  );
}

function PostMeta({ post }) {
  return (
    <div className="post-meta">
      <time dateTime={post.date}>{post.displayDate}</time>
      <span aria-hidden="true">/</span>
      <span>{post.category}</span>
      <span aria-hidden="true">/</span>
      <span>{post.readingMinutes} min read</span>
    </div>
  );
}

function BlogIndex({ posts }) {
  return (
    <main className="blog-main shell">
      <section className="blog-heading" aria-labelledby="blog-heading">
        <div>
          <div className="section-kicker">// THE BLOG</div>
          <h1 id="blog-heading">The build <span>log.</span></h1>
          <p>Software, games, and experiments. Notes from behind the builds.</p>
        </div>
        <a className="button button-ghost rss-button" href="./rss.xml"><RssIcon /> RSS feed</a>
      </section>

      <div className="blog-layout">
        <section className="blog-posts" aria-label="Latest posts">
          {posts.length ? posts.map((post) => (
            <article className="blog-card" key={post.slug}>
              <PostMeta post={post} />
              <h2><a href={`./blog/${post.slug}.html`}>{post.title}<span aria-hidden="true">↗</span></a></h2>
              <p>{post.description}</p>
              <a className="card-link" href={`./blog/${post.slug}.html`}>Read post <span aria-hidden="true">→</span></a>
            </article>
          )) : <p className="blog-empty">The next build starts here. Check back for the first post.</p>}
        </section>

        <aside className="blog-follow" aria-labelledby="blog-follow-heading">
          <div className="section-kicker">// STAY IN THE LOOP</div>
          <h2 id="blog-follow-heading">In your reader.</h2>
          <p>Follow the blog with RSS and get new posts in your favorite feed reader.</p>
          <a className="card-link" href="./rss.xml">Subscribe via RSS <span aria-hidden="true">→</span></a>
          <div className="blog-byline">Built by <a href="https://github.com/MrCodeGameAndAnime" target="_blank" rel="noreferrer">MrCodeGameAndAnime</a></div>
        </aside>
      </div>
    </main>
  );
}

function BlogPost({ post }) {
  return (
    <main className="post-main shell">
      <a className="post-back" href="../blog.html"><span aria-hidden="true">←</span> All posts</a>
      <article className="blog-article">
        <header className="post-heading">
          <PostMeta post={post} />
          <h1>{post.title}</h1>
          <p className="post-description">{post.description}</p>
          <p className="post-author">By {post.author}</p>
        </header>
        <div className="post-content" dangerouslySetInnerHTML={{ __html: post.html }} />
        <footer className="post-end">
          <a className="card-link" href="../blog.html">More from the builds <span aria-hidden="true">→</span></a>
          <a className="post-rss" href="../rss.xml"><RssIcon /> Follow with RSS</a>
        </footer>
      </article>
    </main>
  );
}

export default function BlogPage({ posts, post = null }) {
  const page = post ? 'post' : 'blog';
  return (
    <div id="top" className="site-shell blog-shell">
      <Header page={page} />
      {post ? <BlogPost post={post} /> : <BlogIndex posts={posts} />}
      <Footer page={page} />
    </div>
  );
}
