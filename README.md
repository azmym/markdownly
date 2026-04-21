<div align="center">

<img src="docs/images/banner.png" alt="Markdownly" width="880">

<h1>Markdownly</h1>

<em>Save any webpage as a Markdown file. One click. No backend.</em>

<p>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green"></a>
  <a href="https://github.com/azmym/markdownly/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/azmym/markdownly/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="Manifest V3" src="https://img.shields.io/badge/manifest-v3-blue">
  <img alt="Chrome supported" src="https://img.shields.io/badge/chrome-supported-1e40af">
  <img alt="Firefox 121+" src="https://img.shields.io/badge/firefox-121%2B-orange">
  <img alt="TypeScript strict" src="https://img.shields.io/badge/TypeScript-strict-3178c6">
</p>

</div>

---

Markdownly is a Chrome and Firefox extension (Manifest V3) that converts the current webpage to a GitHub-Flavored Markdown file with one toolbar click. It is aimed at people who read on the web and write in Markdown: researchers, engineers, note-takers, and anyone who prefers plain text over clipped HTML. Everything happens in the browser; no server, no telemetry, no remote code.

## Table of Contents

- [Features](#features)
- [At a glance](#at-a-glance)
- [Installation](#installation)
- [Usage](#usage)
- [How it works](#how-it-works)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Documentation](#documentation)
- [Known limitations](#known-limitations)
- [Contributing](#contributing)
- [License](#license)

## Features

- One-click toolbar action: click the icon, the current page lands in your Downloads folder as a `.md` file.
- Extracts main article content via Mozilla's Readability; strips navigation, ads, sidebars, footers, and `<script>`, `<style>`, `<noscript>`, `<iframe>` elements before conversion.
- Generates GitHub-Flavored Markdown via `turndown` and `turndown-plugin-gfm`: ATX headings, fenced code blocks with language hints (from `language-*`, `lang-*`, or `hljs-*` class names), tables, strikethrough, task lists, inline links.
- Recovers lazy-loaded images by promoting `data-src`, `data-original`, and the first entry of `data-srcset` to `src` before extraction.
- Deterministic filename pattern `<slug>-YYYY-MM-DD.md`, using the local date. Slugs are NFKD-normalized, stripped of diacritics and emoji, collapsed to ASCII, and guarded against Windows-reserved names.
- Single codebase, single `manifest.json`, no polyfill: one artifact for Chrome MV3 and Firefox 121+.
- Minimal permission surface: `activeTab`, `scripting`, `downloads`, `notifications`. No `host_permissions`.
- Zero network egress: nothing is sent anywhere. The file you receive is a plain `.md` you own.
- TypeScript strict mode, built with Vite and `@crxjs/vite-plugin`; 36 unit tests under Vitest plus a Playwright e2e scaffold.

## At a glance

<table>
  <thead>
    <tr>
      <th align="center">Before</th>
      <th align="center">After</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><sub>Webpage<br>(screenshot coming soon)</sub></td>
      <td align="center"><sub>Clean <code>.md</code> file<br>(screenshot coming soon)</sub></td>
    </tr>
  </tbody>
</table>

Screenshots land in the next release. In the meantime, the sequence diagram in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#sequence-diagram) walks through the full click-to-file flow.

## Installation

Markdownly is not yet published to the Chrome Web Store or Add-ons for Firefox. Install it from source as an unpacked developer build.

### From source (Chrome, Edge, Brave)

```bash
git clone https://github.com/azmym/markdownly.git
cd markdownly
npm install
npm run build
```

Then:

1. Open `chrome://extensions`.
2. Toggle **Developer mode** on (top right).
3. Click <kbd>Load unpacked</kbd> and select the `dist/` directory.
4. Pin **Markdownly** to your toolbar.

### From source (Firefox 121+)

```bash
git clone https://github.com/azmym/markdownly.git
cd markdownly
npm install
npm run build
```

Then:

1. Open `about:debugging#/runtime/this-firefox`.
2. Click <kbd>Load Temporary Add-on</kbd>.
3. Select `dist/manifest.json`.

Firefox unloads temporary add-ons when the browser closes. For a persistent install, package a signed build and distribute it as an XPI.

## Usage

1. Open any article page in a regular tab.
2. Click the Markdownly icon in the toolbar.
3. A `.md` file appears in your Downloads folder, named `<slug>-YYYY-MM-DD.md` (for example, `getting-started-with-rust-2026-04-20.md`).

Clicking twice on the same page in the same day produces a second file with ` (1)` appended (`conflictAction: 'uniquify'`). Failure cases surface as desktop notifications and do not write a file: unsupported page types (`chrome://`, `about:`, `file://`, extension pages, Web Store / AMO listings), pages where Readability cannot locate an article, timeouts beyond the 30-second watchdog, and script-injection errors.

## How it works

A click on the toolbar icon wakes the MV3 service worker. The worker validates the active tab's URL against a blocklist, then uses `chrome.scripting.executeScript` to inject the extractor into the page. Inside the page, the content script hydrates lazy images, runs Mozilla's Readability over a cloned DOM, hands the cleaned HTML to Turndown with the GFM plugin, and returns a Markdown string. The service worker encodes that string as a `data:` URL and triggers `chrome.downloads.download`; the browser saves the file to the user's Downloads folder. No remote calls, no storage, no state held between clicks.

For the full sequence diagram and module boundaries, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite in dev mode with HMR against the extension. |
| `npm run build` | Build the production bundle to `dist/`. |
| `npm test` | Run the Vitest unit suite once (36 tests across 5 files). |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:e2e` | Run the Playwright end-to-end suite. |
| `npm run lint:manifest` | Run `web-ext lint` against the built `dist/` directory. |

## Project structure

```
markdownly/
├── manifest.json          MV3 manifest, shared by Chrome and Firefox
├── package.json
├── vite.config.ts
├── playwright.config.ts
├── tsconfig.json
├── public/
│   └── icons/             16, 32, 48, 128 px PNGs
├── src/
│   ├── background.ts      service worker: click, injection, download
│   ├── content/           extractor injected into the active tab
│   └── shared/            slugify, filename, data-url, turndown-config, types
├── tests/
│   ├── unit/              Vitest suites and fixtures
│   └── e2e/               Playwright scaffold
└── docs/                  architecture, development, testing, FAQ
```

## Documentation

The `docs/` directory covers everything beyond this page:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): service worker flow, content-script injection model, data-URL download path, sequence diagram.
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md): local setup, build pipeline, debugging tips for both browsers.
- [`docs/TESTING.md`](docs/TESTING.md): Vitest unit suite, fixture layout, Playwright end-to-end scaffold.
- [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md): full list of sites and page shapes that do not convert cleanly.
- [`docs/FAQ.md`](docs/FAQ.md): common questions about permissions, privacy, filenames, and output format.

## Known limitations

A few highlights; the full list lives in [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md).

- Single-page apps that render their main content entirely on the client typically return no detectable article: Gmail, Twitter/X, LinkedIn, Notion, Google Docs, and most web apps produce the "Couldn't find an article on this page" notification.
- Images below the fold may save as placeholder URLs if the host page has not hydrated them before conversion.
- Browser-internal and store pages (`chrome://`, `about:`, extension pages, Web Store / AMO listings) are blocked by design.

## Contributing

Issues and pull requests are welcome at [github.com/azmym/markdownly](https://github.com/azmym/markdownly). Please open an issue before starting larger changes so design direction can be agreed up front. Pull requests should include unit tests for new logic and keep `npm test` and `npm run lint:manifest` passing. See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for the local dev loop.

## License

Released under the [MIT License](LICENSE).

<div align="center"><sub>Built with <code>@mozilla/readability</code>, <code>turndown</code>, and Vite.</sub></div>
