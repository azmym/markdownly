# Development

How to set up Markdownly locally, build it, and iterate on it.

## Prerequisites

- Node.js 18 or newer (Vite 5 requires Node 18+; the project is ESM-only, `"type": "module"` in `package.json`).
- npm (bundled with Node). Yarn and pnpm work but have not been tested.
- Chrome or Chromium-based browser (for MV3 smoke testing), or Firefox 121 or newer.

## Clone and install

```bash
git clone https://github.com/azmym/markdownly.git
cd markdownly
npm install
```

All tooling is declared in [`package.json`](../package.json). Key dependencies:

- Runtime: `@mozilla/readability`, `turndown`, `turndown-plugin-gfm`
- Build: `vite`, `@crxjs/vite-plugin`
- Test: `vitest`, `happy-dom`, `@playwright/test`
- Packaging lint: `web-ext`

## npm scripts

| Script | Command | When to use |
| --- | --- | --- |
| `npm run dev` | `vite` | Local dev server with crxjs HMR. Useful when iterating on content-script code against a live tab (see hot-reload caveats below). |
| `npm run build` | `vite build` | Produces `dist/` ready to load as an unpacked extension. Required before every smoke test. |
| `npm test` | `vitest run` | One-shot unit-test run (36 tests across 5 files under [`tests/unit/`](../tests/unit/)). |
| `npm run test:watch` | `vitest` | Unit tests in watch mode. Great for TDD. |
| `npm run test:e2e` | `playwright test` | Playwright smoke. Currently skipped; see [TESTING.md](./TESTING.md). |
| `npm run lint:manifest` | `web-ext lint --source-dir dist` | Runs AMO lint rules against the built extension. Run after `npm run build`, before packaging for Firefox. |

## Project structure

```
src/
  background.ts                 service worker (MV3)
  content/
    content-script.ts           IIFE entry, stashes result on globalThis
    extract.ts                  runExtract(): clone + preprocess + Readability + Turndown
    preprocess.ts               lazy-image promotion, non-content strip
  shared/
    data-url.ts                 UTF-8 to chunked base64 to data: URL
    filename.ts                 slug + local date + .md
    slugify.ts                  title to filesystem-safe basename
    turndown-config.ts          Turndown instance + GFM + fenced-code rule
    types.ts                    ExtractionResult discriminated union

tests/
  fixtures/                     HTML + expected Markdown pairs
    blog-semantic.html / .expected.md
    github-readme.html / .expected.md
    lazy-images.html / .expected.md
    simple-table.html / .expected.md
  unit/
    convert.test.ts             fixture-driven HTML to Markdown
    data-url.test.ts            UTF-8 round-trip, 1 MB stress
    filename.test.ts            slug + date composition (fake timers)
    preprocess.test.ts          DOM mutation tests, end-to-end lazy-images
    slugify.test.ts             18 cases covering ASCII, accents, emoji, Windows, truncation
  e2e/
    smoke.spec.ts               Playwright harness (test.skip'd)
    fixtures/page.html          served over HTTP by smoke.spec.ts
```

## Loading the extension

### Chrome / Edge / Brave

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode (top right).
4. Click "Load unpacked" and select the `dist/` folder.
5. Pin "Markdownly" to the toolbar.

### Firefox (121 or newer)

1. Run `npm run build`.
2. Open `about:debugging`.
3. Click "This Firefox" and then "Load Temporary Add-on".
4. Select `dist/manifest.json`.
5. The icon appears in the toolbar. Temporary add-ons unload when Firefox closes.

For persistent Firefox installs, package with `web-ext build --source-dir dist` and either sign it via `web-ext sign` (requires an AMO API key) or submit to addons.mozilla.org.

## Hot-reload caveats

`@crxjs/vite-plugin` provides HMR for the content-script bundle, but the MV3 service worker must be reloaded manually:

- After editing [`src/background.ts`](../src/background.ts), open `chrome://extensions`, find Markdownly, and click the circular reload icon. Then re-test.
- Edits to [`src/content/*.ts`](../src/content/) and [`src/shared/*.ts`](../src/shared/) are picked up on the next `executeScript` call, which happens on the next toolbar click. You do not need to reload the extension for content-layer changes.
- Edits to `manifest.json` always require an extension reload.

## Debugging

### Service worker

1. `chrome://extensions` -> Markdownly -> "service worker" (blue link under "Inspect views").
2. DevTools opens scoped to the worker. Set breakpoints in `src/background.ts`, inspect `chrome.*` API calls, and view network activity (there should be none).
3. If the worker is "inactive", click the extension action in a tab (or trigger any event) to revive it.

### Content script

1. Open the page's DevTools (F12).
2. In the Sources panel, open the context dropdown at the top.
3. Select "Content scripts" and expand the Markdownly entry to inspect the bundled `content.js`.
4. Breakpoints work the same way they would on a page script. Console output is visible in the page's Console tab (filter to the extension's origin if needed).

### Notifications

Notifications are the user-facing error channel. If a notification does not appear at all on macOS, check System Settings -> Notifications and ensure the browser is allowed to show notifications. This affects both development and production use.

## Typical iteration loop

```bash
npm run build                  # build dist/
# load dist/ unpacked in Chrome (first time only)
# edit src/content/extract.ts
npm run build                  # rebuild
# click the extension toolbar icon on a test page
# or:
npm run test:watch             # for changes that are unit-testable
```

Most bugs in this project are pure-logic and can be reproduced without a live browser. Prefer writing a Vitest case against the relevant module in [`src/shared/`](../src/shared/) or a fixture in [`tests/fixtures/`](../tests/fixtures/) before resorting to manual smoke testing.
