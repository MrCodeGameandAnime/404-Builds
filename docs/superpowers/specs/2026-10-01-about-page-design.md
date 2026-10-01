# 404 Builds About Page Design

**Date:** 2026-10-01

**Status:** Conversational design approved; awaiting written-spec review.

## Goal

Give 404 Builds a real, separate About page that introduces the studio's mission and its solo founder. Selecting About in the site navigation must open this page rather than jump to the homepage philosophy section.

## Agreed direction

- Build an actual static page at `about.html` as a second Vite entry. This is preferred over client-side routing because GitHub Pages can serve and refresh the page directly without a route fallback.
- Keep the existing homepage and its philosophy section; the About page is additive. Do not alter the existing CI or GitHub Pages deployment workflow, `root/dist` output location, or repository structure beyond the new page source and tests.
- Give the page its own title and description, reuse the existing favicon, and include the existing Metricool tracking configuration so visits to About are measured consistently.
- Use the existing `root/res/404_builds_logo.png` as a wide hero/banner at the top, inside a subtle red frame on a flat black background.
- Below the banner, use a two-column desktop layout with the mission on the left and a founder spotlight on the right. Use the existing mission text verbatim: “404 Builds is where failure meets creation. A digital foundry for the imperfect and the impossible. We turn ideas, edge cases, and ‘what ifs’ into real products, experiences, and tools.”
- The founder spotlight is only for the user; do not invent or add team members. Use `root/res/MrCodeGameAndAnime.jpg`, cropped into a red-outlined circle. Place a red `>` immediately before the portrait. Make the portrait a link to `https://github.com/MrCodeGameandAnime` and identify the profile as `MrCodeGameAndAnime` with a “Founder / Builder” caption.
- Keep the header/footer visual language consistent with the homepage. About links to `about.html`; logo and section navigation return to the corresponding homepage sections. Preserve social links and use relative local asset paths so the build remains compatible with the project path and custom domain.
- At narrow widths, stack mission before founder spotlight; preserve visible keyboard focus, descriptive accessible names, and reduced-motion behavior.

## Implementation boundaries

- Add only the About document, its React entry/component and styles, the required Vite multi-page input configuration, and focused tests.
- Reuse existing assets and dependencies; do not add routing libraries, remote image services, backend behavior, or new people/content.
- Leave all unrelated in-progress working-tree changes untouched.

## Verification

- Confirm the production build emits both `index.html` and `about.html` to `root/dist` and includes both supplied images.
- Add tests for the About content, the accessible GitHub portrait link, and the navigation destination.
- Run the full existing test suite and production build.
- Inspect the page at desktop and mobile widths, including the image crop, contrast, and keyboard focus states.
