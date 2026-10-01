import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, test } from 'vitest';

let aboutPageModule;
let aboutPageImportError;
const aboutPageModules = import.meta.glob('../src/AboutPage.jsx');

beforeAll(async () => {
  const loadAboutPage = Object.values(aboutPageModules)[0];
  if (loadAboutPage) {
    try {
      aboutPageModule = await loadAboutPage();
    } catch (error) {
      aboutPageImportError = error;
    }
  }
});

function renderAboutPage() {
  render(aboutPageModule ? React.createElement(aboutPageModule.default) : null);
}

describe('404 Builds About page', () => {
  test('loads the About page component', () => {
    expect(aboutPageImportError).toBeUndefined();
    expect(aboutPageModule).toBeDefined();
    expect(aboutPageModule?.default).toBeTypeOf('function');
  });

  test('presents the mission and founder in one accessible main landmark', () => {
    renderAboutPage();

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'About 404 Builds' })).toBeInTheDocument();
    expect(screen.getByText('404 Builds is where failure meets creation. A digital foundry for the imperfect and the impossible. We turn ideas, edge cases, and “what ifs” into real products, experiences, and tools.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '404 Builds logo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'MrCodeGameAndAnime' })).toBeInTheDocument();
    expect(screen.getByText('Founder / Builder')).toBeInTheDocument();
  });

  test('keeps the banner outside the constrained content shell', () => {
    renderAboutPage();

    const banner = screen.getByRole('region', { name: '404 Builds banner' });

    expect(banner).not.toHaveClass('shell');
    expect(within(banner).getByRole('img', { name: '404 Builds logo' })).toBeInTheDocument();
  });

  test('links the circular founder portrait accessibly to the founder GitHub profile', () => {
    renderAboutPage();

    const profileLink = screen.getByRole('link', { name: 'View MrCodeGameAndAnime on GitHub' });
    expect(profileLink).toHaveAttribute('href', 'https://github.com/MrCodeGameAndAnime');
    expect(profileLink).toHaveAttribute('target', '_blank');
    expect(profileLink).toHaveAttribute('rel', 'noreferrer');
    expect(within(profileLink).getByRole('img', { name: 'MrCodeGameAndAnime' })).toBeInTheDocument();
    expect(screen.getByText('>', { exact: true })).toHaveAttribute('aria-hidden', 'true');
  });
});
