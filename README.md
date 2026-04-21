# Markdownly

Save any webpage as a Markdown file.

A Chrome + Firefox extension (MV3) that saves the current webpage as a Markdown `.md` file with one click.

## Features

- Toolbar icon converts the active tab to Markdown; file lands in your Downloads folder.
- Readability-based main-content extraction (strips nav, ads, sidebars, footers).
- GitHub-Flavored Markdown: ATX headings, fenced code blocks with language hints, GFM tables, strikethrough, task lists, inlined links.
- Images kept as remote `![alt](url)` references; no embedding, no local copies.
- Filename: `<slug>-YYYY-MM-DD.md`, using the local date.
- Single manifest, works on Chrome and Firefox 121+.
- No backend, no telemetry, no permissions beyond the active tab.

## Install for development

```
npm install
npm run build
```

### Chrome / Edge

1. Open `chrome://extensions` and enable Developer mode.
2. Click "Load unpacked" and select the `dist/` directory.
3. Pin the "Page to Markdown" extension to your toolbar.

### Firefox (121 or newer)

1. Open `about:debugging` → "This Firefox" → "Load Temporary Add-on".
2. Select `dist/manifest.json`.

Temporary add-ons are unloaded when Firefox closes. For persistent installation, package a signed build with `web-ext sign` and install as an unsigned XPI in developer builds, or submit to AMO.

## Scripts

- `npm run build`: Vite + crxjs build for both browsers, emits `dist/`.
- `npm test`: run the Vitest unit suite (36 tests).
- `npm run test:watch`: unit tests in watch mode.
- `npm run test:e2e`: Playwright smoke (currently skipped; see Testing below).
- `npm run lint:manifest`: `web-ext lint` on the built output.

## Testing

### Unit tests (Vitest)

36 tests across 5 files cover the pure logic and the HTML→Markdown pipeline:

- `slugify.test.ts`: 18 cases: ASCII, NFKD accents, emoji stripping, Windows-reserved names, truncation, etc.
- `filename.test.ts`: 7 cases: slug+date composition, local-date vs UTC, zero-padding.
- `data-url.test.ts`: 4 cases: UTF-8 round-trip, 1 MB stress.
- `convert.test.ts`: 3 fixture-driven cases: semantic blog, GitHub-style README with fenced code + GFM task-lists, GFM tables.
- `preprocess.test.ts`: 4 cases: lazy-image promotion, no-overwrite, non-content strip, end-to-end fixture.

Run with `npm test`.

### Playwright e2e (deferred)

`tests/e2e/smoke.spec.ts` is a scaffold that builds and loads the extension in Chromium and verifies a toolbar click produces a `.md` download. It is currently marked `test.skip` because dispatching the toolbar-icon click from Playwright requires a private Chromium debug API (`chrome.action.onClicked.dispatch`) that is not reliably available in current Playwright + Chromium combinations. Use the manual smoke procedure below until that harness is viable.

### Manual smoke procedure

1. `npm run build`.
2. Load `dist/` as an unpacked extension in Chrome (see above) or as a temporary add-on in Firefox.
3. Open a standard article page (try https://en.wikipedia.org/wiki/Markdown or any blog post) and click the toolbar icon. A `.md` file should appear in your Downloads folder, named after the page title.
4. Verify the following edge cases:
   - `chrome://newtab` (or `about:blank`) → notification "This page type can't be converted"; no download.
   - A single-page app with no server-rendered article (e.g., https://x.com) → notification "Couldn't find an article on this page"; no download.
   - Click the toolbar twice on the same article in the same day → second file appears with ` (1)` appended.

## Known limitations

- Single-page apps that render content entirely client-side (Twitter/X, LinkedIn, Notion, Google Docs) often have no detectable article; the extension shows "Couldn't find an article on this page."
- Lazy-loaded images below the fold may save as their placeholder URL if the site hasn't hydrated them before you click.
- `chrome://`, `edge://`, `about:`, `file://`, and Chrome Web Store / AMO pages are blocked for safety; they cannot be converted.
- Pages with a consecutive image gallery render as a single paragraph of space-separated `![](...)` references, because that is what Turndown emits for adjacent `<img>` siblings.

## Architecture

- **`src/background.ts`**: MV3 service worker. Listens on `chrome.action.onClicked`, guards restricted URLs, injects the extractor via `chrome.scripting.executeScript({ func: runExtract })`, wraps injection in a 30-second watchdog, composes filename + `data:text/markdown;base64,...` URL, calls `chrome.downloads.download`. Surfaces every failure mode as a `chrome.notifications` toast.
- **`src/content/extract.ts`**: exported `runExtract()`, serialized into the tab's isolated world by `executeScript({ func })`. Clones the document, runs `preprocess`, then Readability, then `htmlToMarkdown`. Returns a typed `ExtractionResult`.
- **`src/content/preprocess.ts`**: pre-Readability DOM pass: promote `data-src`/`data-original`/`data-srcset` to `src`, strip `<script>`/`<style>`/`<noscript>`/`<iframe>`. Mutates the cloned subtree in place.
- **`src/shared/slugify.ts`**: title → filesystem-safe basename. NFKD, emoji strip, non-alnum collapse, Windows-reserved prefix, dash-rewind truncation with `MIN_REWIND` floor.
- **`src/shared/filename.ts`**: `slugify(title) + "-YYYY-MM-DD.md"` using local date arithmetic (no ICU dependency).
- **`src/shared/data-url.ts`**: UTF-8 safe `markdownToDataUrl` with chunked base64 for large inputs.
- **`src/shared/turndown-config.ts`**: Turndown with GFM + custom `fencedCodeBlock` rule (language hints from `class="language-*"`, `class="lang-*"`, or `class="hljs-*"`).
- **`manifest.json`**: single manifest; `browser_specific_settings.gecko` block is ignored by Chrome, read by Firefox.

See `docs/superpowers/specs/2026-04-20-page-to-markdown-design.md` for the full design spec and `docs/superpowers/plans/2026-04-20-page-to-markdown.md` for the implementation plan.

## License

MIT (see `LICENSE`).
