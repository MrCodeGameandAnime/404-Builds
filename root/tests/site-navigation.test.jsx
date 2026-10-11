import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import * as Site from '../src/App.jsx';
import App from '../src/App.jsx';

describe('page-aware shared navigation', () => {
  test('the article header and footer link back out of the blog directory', () => {
    render(<><Site.Header page="post" /><Site.Footer page="post" /></>);
    const header = screen.getByRole('banner');
    const navigation = within(header).getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '../blog.html');
    expect(within(navigation).getByRole('link', { name: 'Blog' })).toHaveAttribute('aria-current', 'page');
    expect(within(navigation).getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '../index.html#projects');
    expect(within(navigation).getByRole('link', { name: 'Products' })).toHaveAttribute('href', '../products.html');
    expect(within(navigation).getByRole('link', { name: 'About' })).toHaveAttribute('href', '../about.html');
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Blog footer link' })).toHaveAttribute('href', '../blog.html');
    expect(within(footer).getByRole('link', { name: '404 Builds home' })).toHaveAttribute('href', '../index.html#top');
  });

  test('keeps the brand above section links without the redundant primary action', () => {
    render(Site.Header ? React.createElement(Site.Header) : null);

    const header = screen.getByRole('banner');
    const brand = within(header).getByRole('link', { name: '404 Builds home' });
    const navigation = within(header).getByRole('navigation', { name: 'Primary navigation' });

    expect(within(header).queryByRole('link', { name: 'Start here' })).not.toBeInTheDocument();
    expect(brand.parentElement).not.toBe(navigation.parentElement);
    expect(brand.parentElement.nextElementSibling).toBe(navigation);
  });

  test('the home page opens Products and About as separate pages while retaining section links', () => {
    render(<App />);

    const header = screen.getByRole('banner');
    const navigation = within(header).getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '#projects');
    expect(within(navigation).getByRole('link', { name: 'Experiments' })).toHaveAttribute('href', '#experiments');
    expect(within(navigation).getByRole('link', { name: 'Products' })).toHaveAttribute('href', './products.html');
    expect(within(navigation).getByRole('link', { name: 'About' })).toHaveAttribute('href', './about.html');

    const footer = screen.getByRole('contentinfo');
    expect(footer).not.toHaveAttribute('id', 'studio');
    expect(within(footer).getByRole('link', { name: 'Projects footer link' })).toHaveAttribute('href', '#projects');
    expect(within(footer).getByRole('link', { name: 'Experiments footer link' })).toHaveAttribute('href', '#experiments');
    expect(within(footer).getByRole('link', { name: 'Products footer link' })).toHaveAttribute('href', './products.html');
    expect(within(footer).getByRole('link', { name: 'About footer link' })).toHaveAttribute('href', './about.html');
  });

  test('the About header routes section navigation and the brand back to the home page', () => {
    render(Site.Header ? React.createElement(Site.Header, { page: 'about' }) : null);

    const header = screen.getByRole('banner');
    const navigation = within(header).getByRole('navigation', { name: 'Primary navigation' });
    expect(within(header).getByRole('link', { name: '404 Builds home' })).toHaveAttribute('href', './index.html#top');
    expect(within(navigation).getByRole('link', { name: 'Projects' })).toHaveAttribute('href', './index.html#projects');
    expect(within(navigation).getByRole('link', { name: 'Experiments' })).toHaveAttribute('href', './index.html#experiments');
    expect(within(navigation).getByRole('link', { name: 'Products' })).toHaveAttribute('href', './products.html');
    expect(within(navigation).getByRole('link', { name: 'About' })).toHaveAttribute('href', './about.html');
    expect(within(header).queryByRole('link', { name: 'Start here' })).not.toBeInTheDocument();
  });

  test('the About footer routes its brand and section links back to the home page', () => {
    render(Site.Footer ? React.createElement(Site.Footer, { page: 'about' }) : null);

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: '404 Builds home' })).toHaveAttribute('href', './index.html#top');
    expect(within(footer).getByRole('link', { name: 'Projects footer link' })).toHaveAttribute('href', './index.html#projects');
    expect(within(footer).getByRole('link', { name: 'Experiments footer link' })).toHaveAttribute('href', './index.html#experiments');
    expect(within(footer).getByRole('link', { name: 'Products footer link' })).toHaveAttribute('href', './products.html');
    expect(within(footer).getByRole('link', { name: 'About footer link' })).toHaveAttribute('href', './about.html');
  });

  test('the Contact page links back to the site, exposes Contact in both menus, and marks it current', () => {
    render(<><Site.Header page="contact" /><Site.Footer page="contact" /></>);

    const header = screen.getByRole('banner');
    const navigation = within(header).getByRole('navigation', { name: 'Primary navigation' });
    const contactLink = within(navigation).getByRole('link', { name: 'Contact' });
    expect(contactLink).toHaveAttribute('href', './contact.html');
    expect(contactLink).toHaveAttribute('aria-current', 'page');
    expect(within(navigation).getAllByRole('link')).toHaveLength(6);
    expect(within(navigation).getByRole('link', { name: 'Projects' })).toHaveAttribute('href', './index.html#projects');
    expect(within(header).getByRole('link', { name: '404 Builds home' })).toHaveAttribute('href', './index.html#top');

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Contact footer link' })).toHaveAttribute('href', './contact.html');
  });

  test('the Products page marks Products current and lists every published Windows app', () => {
    expect(Site.ProductsPage).toBeDefined();
    render(React.createElement(Site.ProductsPage));

    const productsHeading = screen.getByRole('heading', { level: 1, name: 'Useful tools', exact: true });
    expect(productsHeading.querySelector('span')).toHaveTextContent('Useful');
    expect(document.querySelector('.products-intro .section-kicker')).not.toBeInTheDocument();

    const header = screen.getByRole('banner');
    const productsLink = within(header).getByRole('link', { name: 'Products' });
    expect(productsLink).toHaveAttribute('href', './products.html');
    expect(productsLink).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Voice Bridge',
      'Windows Asset Creator',
      'HeadsUp',
    ]);

    const listings = [
      { name: 'HeadsUp', href: 'https://apps.microsoft.com/detail/9nmls5ft4zrw?hl=en-US&gl=US' },
      { name: 'Windows Asset Creator', href: 'https://apps.microsoft.com/detail/9ppcx5fvpdn3?hl=en-US&gl=US' },
      { name: 'Voice Bridge', href: 'https://apps.microsoft.com/detail/9N6KNRV562N8?hl=en-us&gl=US&ocid=pdpshare' },
    ];

    listings.forEach(({ name, href }) => {
      const card = screen.getByRole('heading', { name }).closest('article');
      const storeLink = within(card).getByRole('link', { name: /microsoft store/i });
      expect(storeLink).toHaveAttribute('href', href);
      expect(storeLink).toHaveAttribute('target', '_blank');
      expect(storeLink).toHaveAttribute('rel', 'noreferrer');
    });
  });
});
