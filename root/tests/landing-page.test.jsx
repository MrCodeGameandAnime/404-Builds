import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import App from '../src/App.jsx';

describe('404 Builds landing page', () => {
  test('renders the 404 builds landing page landmarks', () => {
    render(<App />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '404 Builds home' })).toHaveLength(2);
    expect(screen.getByRole('heading', { name: /we build what.s missing/i })).toBeInTheDocument();
  });

  test('keeps one page heading followed by section and card headings', () => {
    render(<App />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(6);
  });

  test('keeps the highlighted hero phrase in a dedicated responsive element', () => {
    render(<App />);

    const headline = screen.getByRole('heading', { name: /we build what.s missing/i });
    expect(headline.querySelector('.hero-highlight')).toHaveTextContent("what's missing");
  });

  test('includes a decorative background grid hidden from assistive technology', () => {
    render(<App />);

    expect(document.querySelector('.site-grid')).toHaveAttribute('aria-hidden', 'true');
  });

  test('renders all selected builds and explore categories', () => {
    render(<App />);

    expect(screen.getAllByRole('article')).toHaveLength(3);
    const projects = [
      {
        name: 'HeadsUp',
        description: 'A configurable Avalonia Windows HUD for GitHub repo/branch status, Actions jobs, and exact-SHA CI results.',
        tags: ['Desktop'],
      },
      {
        name: 'WAC',
        description: 'A native WinUI 3 app that turns PNG/JPEG files into a complete Microsoft Store/MSIX asset set.',
        tags: ['Desktop'],
      },
      {
        name: 'Dungeon Drifters',
        description: 'A character-driven fantasy RPG in Ketlyv. Choose one of four Drifters and master their combat styles.',
        tags: ['Web', 'Terminal'],
      },
    ];

    projects.forEach(({ name, description, tags }) => {
      const card = screen.getByRole('heading', { name }).closest('article');
      expect(within(card).getByText(description)).toBeInTheDocument();
      tags.forEach((tag) => expect(within(card).getByText(tag)).toBeInTheDocument());
      expect(card.querySelectorAll('.tag-list span')).toHaveLength(tags.length);
    });

    expect(screen.getByText('AI / Code')).toBeInTheDocument();
    expect(screen.getByText('Design & Merch')).toBeInTheDocument();
    expect(screen.getByText('Hardware / Experiments')).toBeInTheDocument();
    expect(screen.getByText('Tools, automations, and experiments with AI and modern development.')).toBeInTheDocument();
    expect(screen.getByText('Physical builds, electronics, and unconventional ideas.')).toBeInTheDocument();
  });

  test('exposes named navigation and CTA links', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Experiments' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start here' })).toHaveAttribute('href', '#studio');
    expect(screen.getByRole('link', { name: /view builds/i })).toHaveAttribute('href', '#projects');
    const githubLinks = screen.getAllByRole('link', { name: 'GitHub' });
    expect(githubLinks).toHaveLength(2);
    githubLinks.forEach((link) => expect(link).toHaveAttribute('href', 'https://github.com/MrCodeGameandAnime'));
  });

  test('routes selected-build actions to their official project destinations', () => {
    render(<App />);

    const projects = [
      { name: 'HeadsUp', href: 'https://apps.microsoft.com/detail/9nmls5ft4zrw?hl=en-US&gl=US' },
      { name: 'WAC', href: 'https://github.com/MrCodeGameandAnime/Windows-Asset-Creator' },
      { name: 'Dungeon Drifters', href: 'https://mrcodegameandanime.github.io/Dungeon-Drifters/' },
    ];

    projects.forEach(({ name, href }) => {
      const card = screen.getByRole('heading', { name }).closest('article');
      const links = [
        within(card).getByRole('link', { name: /view project/i }),
        within(card).getByRole('link', { name: `${name} details` }),
      ];

      links.forEach((link) => {
        expect(link).toHaveAttribute('href', href);
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noreferrer');
      });
    });
  });

  test('routes social links to the supplied profiles', () => {
    render(<App />);

    const socials = [
      { name: 'Threads', href: 'https://www.threads.com/@404.builds.dev' },
      { name: 'X', href: 'https://x.com/404buildsdev' },
      { name: 'Instagram', href: 'https://www.instagram.com/404.builds.dev/' },
      { name: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61594536011286' },
      { name: 'Discord', href: 'https://discord.gg/NZnTcZtEQ' },
    ];

    socials.forEach(({ name, href }) => {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noreferrer');
    });
  });

  test('renders the CSS-built hero emblem and editorial sections', () => {
    render(<App />);

    expect(screen.getByTestId('hero-emblem')).toHaveTextContent('404');
    expect(screen.getByRole('heading', { name: 'Error is the blueprint' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /view project/i })).toHaveLength(3);
  });

  test('keeps all interactive controls keyboard-addressable', () => {
    render(<App />);

    screen.getAllByRole('link').forEach((link) => {
      expect(link).toHaveAccessibleName();
    });
  });
});
