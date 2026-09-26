import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import App from '../src/App.jsx';

describe('404 Builds landing page', () => {
  test('renders the 404 builds landing page landmarks', () => {
    render(<App />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '404 Builds home' })).toHaveLength(2);
    expect(screen.getByRole('heading', { name: /we build what.s missing/i })).toBeInTheDocument();
  });

  test('renders all selected builds and explore categories', () => {
    render(<App />);

    expect(screen.getByText('HeadsUp')).toBeInTheDocument();
    expect(screen.getByText('WAC')).toBeInTheDocument();
    expect(screen.getByText('Dungeon Drifters')).toBeInTheDocument();
    expect(screen.getByText('AI / Code')).toBeInTheDocument();
    expect(screen.getByText('Design & Merch')).toBeInTheDocument();
    expect(screen.getByText('Hardware / Experiments')).toBeInTheDocument();
  });

  test('exposes named navigation and CTA links', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Experiments' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start here' })).toBeInTheDocument();
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
