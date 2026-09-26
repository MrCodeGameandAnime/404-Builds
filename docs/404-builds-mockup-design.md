# 404 Builds Landing Page Mock-up Design

## Goal

Create a polished, responsive React landing page that recreates the supplied 404 Builds reference as a visual mock-up. The page should feel like an independent software/game studio site: dark, technical, cinematic, and intentionally red-accented.

## Scope

- Scaffold a local Vite + React app in the empty workspace.
- Build one responsive landing page with semantic sections:
  - sticky-style top navigation
  - hero with studio statement, CTA buttons, and a custom CSS-built 404 emblem
  - selected builds grid with three project cards
  - philosophy split section with a glitchy image-like panel
  - explore/build-category tiles
  - footer with navigation and social-style controls
- Keep the page self-contained with local CSS and inline SVG/CSS shapes; no backend, database, or external API.
- Use accessible landmarks, heading order, button/link semantics, visible focus states, and responsive layout behavior.

## Visual direction

- Base: near-black background with subtle blue/gray grid lines and vignettes.
- Accent: saturated red for the brand wordmark, emphasis text, buttons, borders, and glow effects.
- Type: condensed/monospace-feeling display treatment for navigation, labels, and headings; a clean sans-serif for supporting copy.
- Surface: dark glassy cards with thin gray borders and restrained red hover highlights.
- Motion: small, tasteful hover/focus transitions only; respect `prefers-reduced-motion`.
- Hero art: constructed from layered CSS shapes and text instead of duplicating the reference screenshot or relying on a remote image.

## Component architecture

- `App`: page composition and shared data.
- `Header`: brand, nav links, and “Start here” CTA.
- `Hero`: eyebrow, headline, supporting copy, actions, and emblem.
- `BuildCard`: reusable project card driven by data.
- `BuildGrid`: section heading and three `BuildCard` instances.
- `Philosophy`: image-like glitch panel and editorial copy.
- `ExploreGrid`: three category tiles with icons and descriptions.
- `Footer`: brand lockup, links, social-style controls, and copyright.

Data for project cards and category tiles will live in `App` as small arrays to keep the repeated markup consistent without introducing unnecessary state management.

## Interaction and responsiveness

- Header navigation is a normal anchor list; CTA buttons point to page sections or placeholder project destinations.
- Card and category tiles receive hover/focus treatment and maintain keyboard-visible focus.
- Desktop layout uses a two-column hero and three-column card/category grids.
- Tablet collapses spacing and reduces grid density.
- Mobile stacks hero content, art, cards, philosophy, and category tiles; navigation wraps or compresses without horizontal overflow.

## Verification

- Install dependencies and run the app’s production build.
- Use a browser preview to inspect the rendered page at desktop and narrow/mobile widths.
- Confirm no horizontal overflow, broken routes, or missing assets.
- Confirm build exits successfully and the repository diff contains only the intended app/spec files.

## Out of scope

- Backend functionality, authentication, form submission, CMS integration, or real project pages.
- Pixel-perfect recreation of proprietary typefaces or original artwork.
- Full multi-page routing.
