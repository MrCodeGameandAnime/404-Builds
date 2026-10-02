import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import * as Site from '../src/App.jsx';
import App from '../src/App.jsx';

describe('page-aware shared navigation', () => {
  test('groups the brand and primary action above the section links', () => {
    render(Site.Header ? React.createElement(Site.Header) : null);

    const header = screen.getByRole('banner');
    const brand = within(header).getByRole('link', { name: '404 Builds home' });
    const action = within(header).getByRole('link', { name: 'Start here' });
    const navigation = within(header).getByRole('navigation', { name: 'Primary navigation' });

    expect(brand.parentElement).toBe(action.parentElement);
    expect(brand.parentElement).not.toBe(navigation.parentElement);
    expect(brand.parentElement.nextElementSibling).toBe(navigation);
  });

  test('the home page opens About as a separate page while retaining its section links', () => {
    render(<App />);

    const header = screen.getByRole('banner');
    const navigation = within(header).getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '#projects');
    expect(within(navigation).getByRole('link', { name: 'Experiments' })).toHaveAttribute('href', '#experiments');
    expect(within(navigation).getByRole('link', { name: 'Studio' })).toHaveAttribute('href', '#studio');
    expect(within(navigation).getByRole('link', { name: 'About' })).toHaveAttribute('href', './about.html');

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Projects footer link' })).toHaveAttribute('href', '#projects');
    expect(within(footer).getByRole('link', { name: 'Experiments footer link' })).toHaveAttribute('href', '#experiments');
    expect(within(footer).getByRole('link', { name: 'Studio footer link' })).toHaveAttribute('href', '#studio');
    expect(within(footer).getByRole('link', { name: 'About footer link' })).toHaveAttribute('href', './about.html');
  });

  test('the About header routes section navigation and the brand back to the home page', () => {
    render(Site.Header ? React.createElement(Site.Header, { page: 'about' }) : null);

    const header = screen.getByRole('banner');
    const navigation = within(header).getByRole('navigation', { name: 'Primary navigation' });
    expect(within(header).getByRole('link', { name: '404 Builds home' })).toHaveAttribute('href', './index.html#top');
    expect(within(navigation).getByRole('link', { name: 'Projects' })).toHaveAttribute('href', './index.html#projects');
    expect(within(navigation).getByRole('link', { name: 'Experiments' })).toHaveAttribute('href', './index.html#experiments');
    expect(within(navigation).getByRole('link', { name: 'Studio' })).toHaveAttribute('href', './index.html#studio');
    expect(within(navigation).getByRole('link', { name: 'About' })).toHaveAttribute('href', './about.html');
    expect(within(header).getByRole('link', { name: 'Start here' })).toHaveAttribute('href', './index.html#studio');
  });

  test('the About footer routes its brand and section links back to the home page', () => {
    render(Site.Footer ? React.createElement(Site.Footer, { page: 'about' }) : null);

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: '404 Builds home' })).toHaveAttribute('href', './index.html#top');
    expect(within(footer).getByRole('link', { name: 'Projects footer link' })).toHaveAttribute('href', './index.html#projects');
    expect(within(footer).getByRole('link', { name: 'Experiments footer link' })).toHaveAttribute('href', './index.html#experiments');
    expect(within(footer).getByRole('link', { name: 'Studio footer link' })).toHaveAttribute('href', './index.html#studio');
    expect(within(footer).getByRole('link', { name: 'About footer link' })).toHaveAttribute('href', './about.html');
  });
});
