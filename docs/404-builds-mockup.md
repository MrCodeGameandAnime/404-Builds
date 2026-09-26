# 404 Builds Landing Page Mock-up Implementation Plan

**Goal:** Build a responsive React/Vite landing page that visually recreates the supplied 404 Builds studio reference.

**Architecture:** A single-page React composition in `src/App.jsx`, split into small presentational components for the header, hero, build cards, philosophy, category tiles, and footer. A single stylesheet in `src/styles.css` owns the grid background, red glow system, responsive layout, hover/focus states, and CSS-built hero emblem.

**Tech Stack:** Node.js, Vite, React, Vitest, Testing Library, plain CSS.

**Spec:** `docs/superpowers/specs/2026-09-25-404-builds-mockup-design.md`

## Global Constraints

- Keep the page self-contained with local CSS and inline SVG/CSS shapes; no backend, database, or external API.
- Use accessible landmarks, heading order, button/link semantics, visible focus states, and responsive layout behavior.
- Hero art is constructed from layered CSS shapes and text rather than duplicating the reference screenshot or relying on a remote image.
- Respect `prefers-reduced-motion` for hover and ambient effects.
- No multi-page routing or unrelated app features.


## Review Focus


- Narrow mobile widths: content remains readable and has no horizontal overflow; cover with a mobile viewport smoke check.
- Keyboard navigation: interactive anchors/buttons expose visible focus styles; cover with semantic role/name assertions.
- Reduced-motion users: ambient animation is disabled or minimized; cover with a CSS rule assertion in the stylesheet.
- Repeated data: all three build cards and all three category tiles render from arrays without missing labels; cover with count/text assertions.
- Missing remote assets: the page still renders completely with no network-dependent images; cover with a source scan and build check.


---


### Task 1: Scaffold the React app and semantic page shell


**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.jsx`
- Create: `src/App.jsx`
- Create: `src/styles.css`
- Create: `tests/landing-page.test.jsx`
- Create: `tests/setup.js`


**Interfaces:**
- Produces `App` as the default export from `src/App.jsx`.
- Produces a browser entry point in `src/main.jsx` that mounts `App` into `#root`.
- Produces npm scripts: `dev`, `build`, `test`.


- [ ] **Step 1: Write the failing component test**


  Add Vitest + Testing Library setup and tests named `renders the 404 builds landing page landmarks`, `renders all selected builds and explore categories`, and `exposes named navigation and CTA links`. Assert the page has one `main`, the “404 BUILDS” brand, the “We build what’s missing” heading, three build-card titles, three category labels, and named links for Projects, Experiments, and Start here.


- [ ] **Step 2: Run the test to verify it fails**


  Run: `npm test -- --run tests/landing-page.test.jsx`


  Expected: FAIL because the Vite/React app and `App` component do not exist yet.


- [ ] **Step 3: Scaffold the minimal Vite/React app and semantic JSX**


  Create `package.json` with React, Vite, Vitest, jsdom, `@testing-library/react`, and `@testing-library/jest-dom`. Implement `App` with small local components (`Header`, `Hero`, `BuildGrid`, `Philosophy`, `ExploreGrid`, `Footer`) and arrays for the three projects and three categories. Use section IDs `projects`, `experiments`, and `studio` so nav/CTA links have destinations. Add the CSS import in `src/main.jsx` and a Vitest config through the `test` script or Vite config.


- [ ] **Step 4: Run the component test to verify it passes**


  Run: `npm test -- --run tests/landing-page.test.jsx`


  Expected: PASS with all landing-page assertions green.


- [ ] **Step 5: Commit the semantic shell**


  ```bash
  git add package.json index.html src/main.jsx src/App.jsx src/styles.css tests/landing-page.test.jsx tests/setup.js
  git commit -m "feat: scaffold 404 builds react landing page"
  ```


### Task 2: Add the reference visual system and responsive behavior


**Files:**
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Modify: `tests/landing-page.test.jsx`


**Interfaces:**
- Consumes `App` structure and data arrays from Task 1.
- Produces the complete visual treatment described in the spec: grid background, hero emblem, red accents, cards, philosophy panel, category tiles, footer, focus states, and responsive breakpoints.


- [ ] **Step 1: Extend the failing tests for visual-system hooks**


  Add assertions named `renders the CSS-built hero emblem and editorial sections` and `keeps all interactive controls keyboard-addressable`. Assert the hero contains a `data-testid="hero-emblem"` with visible “404” text, the philosophy section contains “Error is the blueprint”, each project card has a “VIEW PROJECT” link, and every anchor has an accessible name.


- [ ] **Step 2: Run the focused tests to verify the new assertions fail**


  Run: `npm test -- --run tests/landing-page.test.jsx`


  Expected: FAIL on the missing emblem/editorial hooks or card links before the visual implementation is complete.


- [ ] **Step 3: Implement the visual system in `src/styles.css` and finish the JSX hooks**


  Add CSS custom properties, layered linear gradients for the technical grid, red glow treatments, display typography, card surfaces, CSS-built hero emblem layers, glitch panel, section dividers, hover/focus states, and `@media` breakpoints for stacked mobile layouts. Add `@media (prefers-reduced-motion: reduce)` to disable nonessential transitions/animations. Keep project/category content data-driven.


- [ ] **Step 4: Run focused tests and the production build**


  Run: `npm test -- --run tests/landing-page.test.jsx` and `npm run build`


  Expected: all component assertions PASS and Vite exits with code 0, producing `dist/`.


- [ ] **Step 5: Commit the visual treatment**


  ```bash
  git add src/App.jsx src/styles.css tests/landing-page.test.jsx
  git commit -m "feat: style 404 builds studio mockup"
  ```


### Task 3: Browser QA and final verification


**Files:**
- Modify: `src/styles.css` only if QA finds a layout issue.


**Interfaces:**
- Consumes the complete page from Tasks 1–2.
- Produces a verified desktop and mobile-ready mock-up with no broken assets or overflow.


- [ ] **Step 1: Start the local preview server**


  Run: `npm run dev -- --host 127.0.0.1`


  Expected: Vite reports a local URL and stays running.


- [ ] **Step 2: Inspect the page in a browser at desktop and mobile widths**


  Check the hero composition, card grid, philosophy split, category row, footer, focus states, and mobile stacking. Confirm there is no horizontal scrollbar and no missing image/network errors.


- [ ] **Step 3: Run the full verification suite**


  Run: `npm test -- --run` and `npm run build`


  Expected: all tests PASS and the production build exits with code 0.


- [ ] **Step 4: Commit any QA-only fix**


  If browser QA found a real layout defect, run the focused test/build again, then commit with `fix: refine 404 builds responsive layout`. If no fix is needed, keep the two feature commits unchanged.
