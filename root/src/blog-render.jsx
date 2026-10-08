import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BlogPage from './BlogPage.jsx';

export function renderBlog(posts, post = null) {
  return renderToStaticMarkup(<BlogPage posts={posts} post={post} />);
}
