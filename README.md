# Markdownly

Save any webpage as a Markdown file.

Markdownly is a Chrome and Firefox extension (Manifest V3) that converts the current webpage to a GitHub-Flavored Markdown file with one toolbar click. It is aimed at people who read on the web and write in Markdown: researchers, engineers, note-takers, and anyone who prefers plain text over clipped HTML.

The extension runs entirely in the browser. It does not talk to any server, does not ship remote code, does not read a page until you click the icon, and does not persist anything between clicks. The file you get is a plain `.md` you own.

## Features

- One-click toolbar action: click the icon, the current page is saved to your Downloads folder as a `.md` file.
- Main-content extraction via `@mozilla/readability`: navigation, ads, sidebars, footers, and `<script>` / `<style>` / `<noscript>` / `<iframe>` elements are dropped before conversion.
- GitHub-Flavored Markdown output via `turndown` and `turndown-plugin-gfm`: ATX headings, fenced code blocks with language hints (from `language-*`, `lang-*`, or `hljs-*` class names), tables, strikethrough, task lists, and inlined links.
- Lazy-loaded images are recovered by promoting `data-src`, `data-original`, and the first entry of `data-srcset` to `src` before extraction.
- Filename pattern: `<slugified-title>-YYYY-MM-DD.md`, using the local date. Slugs are NFKD-normalized, stripped of diacritics and emoji, collapsed to ASCII, and guarded against Windows-reserved names.
- Single codebase and single `manifest.json` for Chrome MV3 and Firefox 121+.
- No backend, no telemetry, no analytics, no remote code.
- Four permissions total: `activeTab`, `scripting`, `downloads`, `notifications`. No `host_permissions`.

## Installation

Markdownly is not yet on the Chrome Web Store or Add-ons for Firefox. Install it from source as an unpacked developer build.

### Build from source

```
git clone https://github.com/azmym/markdownly.git
cd markdownly
npm install
npm run build
```

The build writes the production bundle to `dist/`.

### Chrome, Edge, Brave, and other Chromium browsers

1. Open `chrome://extensions`.
2. Toggle "Developer mode" on (top right).
3. Click "Load unpacked" and select the `dist/` directory.
4. Pin "Markdownly" to your toolbar.

### Firefox (version 121 or newer)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on".
3. Select `dist/manifest.json`.

Firefox unloads temporary add-ons when the browser closes. For a persistent install, package a signed build and distribute it as an XPI.

## Usage

1. Open any article page in a regular tab.
2. Click the Markdownly icon in the toolbar.
3. A `.md` file appears in your Downloads folder, named `<slugified-title>-YYYY-MM-DD.md`.

The extension uses `conflictAction: 'uniquify'`, so clicking twice on the same page in the same day produces a second file with ` (1)` appended. The Markdown file starts at the article body; the page title is preserved in the filename rather than written as an H1, so you can prepend your own front matter without conflict.

A typical filename looks like:

```
getting-started-with-rust-2026-04-20.md
```

Failure cases surface as desktop notifications and do not write a file:

- "This page type can't be converted." for `chrome://`, `edge://`, `about:`, `file://`, `chrome-extension://`, `moz-extension://`, and the Chrome Web Store / AMO listing pages.
- "Couldn't find an article on this page." when Readability cannot identify an article (common on single-page apps).
- "Page took too long to convert." if extraction exceeds the 30-second watchdog.
- "Conversion failed. Try reloading the page." for script-injection errors.

## Scripts

Pulled from `package.json`:

| Script | Description |
| --- | --- |
| `npm run dev` | Start Vite in dev mode. |
| `npm run build` | Build the production bundle to `dist/`. |
| `npm test` | Run the Vitest unit suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:e2e` | Run the Playwright end-to-end suite. |
| `npm run lint:manifest` | Run `web-ext lint` on the built `dist/` directory. |

## Project structure

```
markdownly/
├── manifest.json            MV3 manifest (shared by Chrome and Firefox)
├── package.json
├── vite.config.ts
├── playwright.config.ts
├── tsconfig.json
├── public/
│   └── icons/               16, 32, 48, 128 px PNGs
├── src/
│   ├── background.ts        service worker: click handler, injection, download
│   ├── content/             extractor injected into the active tab
│   └── shared/              slugify, filename, data-url, turndown-config, types
├── tests/
│   ├── unit/                Vitest suites and fixtures
│   └── e2e/                 Playwright scaffold
└── docs/                    architecture, development, testing, FAQ
```

## Documentation

Detailed docs live under `docs/`:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): service worker flow, content-script injection model, data-URL download path.
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md): local setup, build pipeline, debugging tips for both browsers.
- [`docs/TESTING.md`](docs/TESTING.md): Vitest unit suite, fixture layout, Playwright end-to-end scaffold.
- [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md): full list of sites and page shapes that do not convert cleanly.
- [`docs/FAQ.md`](docs/FAQ.md): common questions about permissions, privacy, filenames, and output format.

## Known limitations

Single-page apps that render their main content entirely on the client typically return no detectable article: Gmail, Twitter/X, LinkedIn, Notion, Google Docs, and most web apps produce the "Couldn't find an article on this page" notification. Images below the fold may save as placeholder URLs if the host page has not hydrated them before conversion. Browser-internal and store pages are blocked by design. See [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) for the full list.

## Contributing

Issues and pull requests are welcome at [github.com/azmym/markdownly](https://github.com/azmym/markdownly). Please open an issue before starting larger changes so design direction can be agreed up front. Pull requests should include unit tests for new logic and keep `npm test` and `npm run lint:manifest` passing. See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for the local dev loop.

## License

Markdownly is released under the MIT License. See [`LICENSE`](LICENSE) for the full text.
