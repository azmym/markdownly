# Page to Markdown — Design Spec

**Date:** 2026-04-20
**Status:** Approved for implementation planning
**Project root:** `~/workspace/page-to-markdown/`

## 1. Purpose

A cross-browser WebExtension (Chrome MV3 and Firefox 121+ MV3) that, on toolbar-icon click, extracts the main article content of the current tab, converts it to GitHub-Flavored Markdown, and downloads it as a `.md` file. Single codebase, single manifest, no backend, no telemetry.

## 2. User Story

As a reader, I click the toolbar icon on any article-style web page. The browser saves a clean Markdown version of that page to my Downloads folder, named after the page title and today's date, in one step, with no popup or prompt.

## 3. Scope

### In scope

- Any-webpage → Markdown conversion (not limited to pages originally authored in Markdown).
- Readability-style main-content extraction (drop nav, ads, sidebars, footers).
- GitHub-Flavored Markdown output: ATX headings, fenced code with language hints, GFM tables, strikethrough, task lists, inlined links.
- Images preserved as `![alt](remote-url)`; no embedding, no download-alongside.
- Filename pattern: `<slugified-title>-YYYY-MM-DD.md`.
- Toolbar-icon trigger → immediate download.
- Chrome (latest) and Firefox (121+).

### Out of scope

- Popup preview, right-click context menu, keyboard shortcut (can be added later).
- Image downloading, base64 embedding, folder-with-assets output.
- Site-specific extractors (Twitter/X, Notion, LinkedIn).
- Settings UI. All behavior is fixed.
- Full-page (non-Readability) mode.
- Rendered-Markdown-to-source recovery (e.g., re-extracting `.md` from GitHub's rendered view).

## 4. Architecture

Two execution contexts, nothing else.

### 4.1 Background service worker (`src/background.ts`)

Always-registered. Owns:

- `chrome.action.onClicked` listener.
- URL-scheme guard (reject `chrome://`, `edge://`, `about:`, `chrome-extension://`, `moz-extension://`, `file://`, Chrome Web Store, AMO).
- `chrome.scripting.executeScript` call to inject the extractor.
- Filename slugification (via `src/shared/slugify.ts`).
- Base64 data-URL construction (`TextEncoder` + chunked base64).
- `chrome.downloads.download` call.
- User-facing notifications via `chrome.notifications`.

Never touches page HTML. Has no DOM.

### 4.2 Injected one-shot function (`src/content/extract.ts` + `src/content/preprocess.ts`)

Bundled into a single `content.js`. Injected on demand via `scripting.executeScript({ files: ['content.js'] })`. Runs in the tab's isolated world.

Owns:

- `document.cloneNode(true)`.
- Lazy-image unwrap: promote `data-src`, `data-srcset`, `data-original` to `src` on the clone; strip `<script>`, `<style>`, `<noscript>`, `<iframe>`.
- `@mozilla/readability` parse on the clone.
- `turndown` conversion with `turndown-plugin-gfm` and a custom `fencedCodeBlock` rule.

Returns `{ kind: 'ok', title, markdown } | { kind: 'empty' } | { kind: 'error', message }`.

### 4.3 Shared (`src/shared/`)

Pure TypeScript, no extension APIs. Unit-testable in isolation.

- `slugify.ts` — deterministic filename builder.
- `turndown-config.ts` — Turndown options + custom rule wiring.
- `types.ts` — message result types.

### 4.4 Permissions

`activeTab`, `scripting`, `downloads`, `notifications`. No `host_permissions`, no `<all_urls>`.

### 4.5 Dependencies

Runtime: `@mozilla/readability`, `turndown`, `turndown-plugin-gfm`. No `webextension-polyfill` (unnecessary in 2026; use `globalThis.browser ?? globalThis.chrome`).

Dev: `typescript`, `vite`, `@crxjs/vite-plugin`, `vitest`, `happy-dom`, `@types/chrome`, `@types/turndown`, Playwright (e2e).

### 4.6 Build

Vite + `@crxjs/vite-plugin`. Emits MV3-correct bundles. Single `manifest.json` checked into source, shipped to `dist/` for loading/zipping.

## 5. Execution Flow

Context tags: `[SW]` = service worker, `[C]` = content script.

1. User clicks toolbar icon. `[browser]`
2. `chrome.action.onClicked(tab)` fires. `[SW]`
3. URL guard on `tab.url`. On restricted URL: notify "This page type can't be converted." and abort. `[SW]`
4. `chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] })`. `[SW → C]`
5. Clone document: `document.cloneNode(true)`. `[C]`
6. Preprocess clone: promote lazy-image attrs to `src`; strip `<script>`, `<style>`, `<noscript>`, `<iframe>`. `[C]`
7. `new Readability(clone).parse()`. If null or empty content, return `{ kind: 'empty' }`. `[C]`
8. Instantiate Turndown with fixed options (see §7); `use(gfm)`; install custom `fencedCodeBlock` rule. Convert `article.content`. `[C]`
9. Return `{ kind: 'ok', title, markdown }` as the `executeScript` result. `[C → SW]`
10. SW inspects first `InjectionResult`. On `empty`/`error`: notify and abort. On `ok`: continue. `[SW]`
11. Build filename via `slugify(title)` + `-YYYY-MM-DD.md`. `[SW]`
12. Encode markdown as base64 data URL: `TextEncoder().encode(md)` → chunked base64 → `data:text/markdown;charset=utf-8;base64,<b64>`. `[SW]`
13. `chrome.downloads.download({ url, filename, saveAs: false, conflictAction: 'uniquify' })`. `[SW → browser]`
14. SW returns to idle. No persistent state. `[SW]`

Invariants:

- HTML never crosses the content↔SW boundary; only the typed result does.
- SW never runs DOM APIs.
- No state persists between clicks.

## 6. Manifest

Single `manifest.json`. Chrome ignores `browser_specific_settings`; Firefox reads it.

```json
{
  "manifest_version": 3,
  "name": "Page to Markdown",
  "version": "0.1.0",
  "description": "Convert the current webpage to a Markdown (.md) file.",
  "action": { "default_title": "Save page as Markdown" },
  "permissions": ["activeTab", "scripting", "downloads", "notifications"],
  "background": { "service_worker": "background.js", "type": "module" },
  "icons": {
    "16": "icons/16.png",
    "32": "icons/32.png",
    "48": "icons/48.png",
    "128": "icons/128.png"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "page-to-markdown@local",
      "strict_min_version": "121.0"
    }
  }
}
```

## 7. Turndown Configuration

Options:

- `headingStyle: 'atx'`
- `codeBlockStyle: 'fenced'`
- `fence`: triple backtick
- `bulletListMarker: '-'`
- `emDelimiter: '_'`
- `strongDelimiter: '**'`
- `linkStyle: 'inlined'`

Plugins:

- `turndown-plugin-gfm` (tables, strikethrough, task lists).

Custom rules:

- **`fencedCodeBlock`** (replaces default code handling):
  - Filter: `pre > code`.
  - Language: first match of `/(?:language|lang|hljs)-([\w-]+)/` on `code.className`.
  - Body: `code.textContent` (no Markdown escaping inside).
  - Output: `` ```<lang>\n<body>\n``` ``. If no language match, omit the hint.

## 8. Filename Algorithm

Input: `article.title` from Readability, falling back to `document.title`, falling back to `new URL(tab.url).hostname`.

Steps:

1. Unicode-normalize NFKD; strip combining marks (`\p{M}`).
2. Strip emoji and other pictographs (`\p{Extended_Pictographic}`).
3. Lowercase.
4. Replace any run of non-`[a-z0-9]` with a single `-`.
5. Trim leading/trailing `-`; collapse repeated `-`.
6. If the basename equals a Windows reserved name (`con`, `prn`, `aux`, `nul`, `com1`–`com9`, `lpt1`–`lpt9`), prefix with `page-`.
7. Truncate to 80 chars; if the truncation cut a word, rewind to the preceding `-`.
8. If empty, substitute `untitled`.
9. Append `-YYYY-MM-DD` using local date via `toLocaleDateString('sv-SE')`.
10. Append `.md`.
11. On filesystem collision: `chrome.downloads.download({ conflictAction: 'uniquify' })` — browser appends ` (1)`, ` (2)`.

Examples:

- `How to Use Claude` → `how-to-use-claude-2026-04-20.md`
- `Crème brûlée: A Recipe` → `creme-brulee-a-recipe-2026-04-20.md`
- `🎉🎉🎉` → `untitled-2026-04-20.md`
- `CON` → `page-con-2026-04-20.md`

## 9. Error Handling & Edge Cases

Always surface a visible, truthful notification; never write a garbage `.md`.

| # | Case | Detection | User-facing behavior |
|---|---|---|---|
| 1 | Restricted URL scheme/host | SW pre-check before `executeScript` | Notify: "This page type can't be converted." |
| 2 | Readability returns null or empty | Content returns `{ kind: 'empty' }` | Notify: "Couldn't find an article on this page." |
| 3 | `executeScript` throws (tab closed, etc.) | `try/catch` in SW | Notify: "Conversion failed. Try reloading the page." |
| 4 | Turndown throws | `try/catch` in content fn; returns `{ kind: 'error' }` | Notify: "Conversion failed." |
| 5 | Lazy images with no resolvable `src` | Best-effort preprocess; no retry | Image kept as-is with placeholder URL. |
| 6 | Very long page | No artificial cap; SW wraps `executeScript` in a 30 s watchdog | On timeout, notify: "Page took too long to convert." |
| 7 | `downloads.download` rejects | Promise rejection in SW | Notify with first 120 chars of error message. |
| 8 | Title slugifies to empty | `slugify` returns `untitled` | `untitled-YYYY-MM-DD.md` still writes. |
| 9 | Stale `document.title` on SPA | Prefer `article.title` over `document.title` | Better title fidelity. |
| 10 | Duplicate filename same day | `conflictAction: 'uniquify'` | Browser appends ` (1)`, ` (2)`. |

Explicitly not handled (documented limitations):

- Auth-gated pages render whatever the user's session shows.
- Infinite-scroll pages convert current viewport state only.
- Browser PDF viewer, Google Docs, Notion, Twitter/X: Readability will typically return empty; case (2) applies.

## 10. Testing

### 10.1 Unit (Vitest)

- `slugify.test.ts` — ~20 cases covering ASCII happy path, NFKD accents, CJK, RTL, emoji-only, Windows-reserved names, 500-char truncation, empty/whitespace, control chars.
- `filename.test.ts` — date-stamped composition with mocked `Date`.
- `convert.test.ts` — fixture-driven snapshot tests run under `happy-dom`.

### 10.2 Fixtures (`tests/fixtures/`)

Pinned HTML → expected Markdown, 8 cases:

1. `wikipedia-article.html` — tables, references, infobox.
2. `github-readme.html` — fenced code with `class="language-*"`, task lists.
3. `mdn-docs.html` — nested lists, `<dl>`, inline code.
4. `blog-semantic.html` — clean `<article>` with figure/figcaption.
5. `news-with-chrome.html` — ads + related-links (Readability stripping test).
6. `stackoverflow-answer.html` — inline code, code blocks, blockquotes.
7. `lazy-images.html` — `data-src`/`data-srcset` unwrap.
8. `empty-spa.html` — shell-only page; expects `{ kind: 'empty' }`.

### 10.3 Integration (Playwright)

One smoke test per engine (Chromium, Firefox):

- Build the extension.
- Load via Playwright's extension APIs.
- Serve a fixture locally with `vite preview`.
- Click the toolbar action; assert a `.md` file appears in the download dir with expected name pattern and content substrings.

### 10.4 Manual

Documented in README: paywalls, infinite-scroll feeds, browser PDF viewer, Google Docs, very long pages.

## 11. Directory Layout

```
page-to-markdown/
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── LICENSE
├── public/
│   └── icons/
│       ├── 16.png
│       ├── 32.png
│       ├── 48.png
│       └── 128.png
├── src/
│   ├── background.ts
│   ├── content/
│   │   ├── extract.ts
│   │   └── preprocess.ts
│   └── shared/
│       ├── slugify.ts
│       ├── turndown-config.ts
│       └── types.ts
├── tests/
│   ├── unit/
│   │   ├── slugify.test.ts
│   │   ├── convert.test.ts
│   │   └── filename.test.ts
│   ├── fixtures/
│   │   ├── wikipedia-article.html
│   │   ├── wikipedia-article.expected.md
│   │   ├── github-readme.html
│   │   ├── github-readme.expected.md
│   │   ├── mdn-docs.html
│   │   ├── mdn-docs.expected.md
│   │   ├── blog-semantic.html
│   │   ├── blog-semantic.expected.md
│   │   ├── news-with-chrome.html
│   │   ├── news-with-chrome.expected.md
│   │   ├── stackoverflow-answer.html
│   │   ├── stackoverflow-answer.expected.md
│   │   ├── lazy-images.html
│   │   ├── lazy-images.expected.md
│   │   └── empty-spa.html
│   └── e2e/
│       └── smoke.spec.ts
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-04-20-page-to-markdown-design.md
└── dist/           (gitignored)
```

## 12. Top 3 Architectural Risks

1. **Readability false negatives on modern SPAs** (Twitter/X, LinkedIn, Notion render almost nothing server-side). **Mitigation:** accept as a product limitation, surface the "Couldn't find an article" notification, document unsupported-site classes in the README. Do not build site-specific extractors.
2. **MV3 service-worker lifecycle on slow conversions.** **Mitigation:** keep all heavy work in the content script; SW's only job is orchestration, filename, and download. Add a 30 s watchdog on `executeScript` so the user gets a message instead of silent death.
3. **Firefox MV3 divergence in `scripting.executeScript` result serialization.** **Mitigation:** only return structured-cloneable plain objects (`{ kind, title, markdown }`); pin `strict_min_version` to 121.0 in the manifest.

## 13. Acceptance Criteria

- Clicking the toolbar icon on a standard article page (e.g., a Wikipedia article, a blog post, an MDN page) writes a file named `<slug>-YYYY-MM-DD.md` containing the article body as GFM.
- Clicking on a restricted URL (`chrome://newtab`, `about:blank`) shows the "This page type can't be converted" notification and writes nothing.
- Clicking on an SPA shell with no article content shows the "Couldn't find an article" notification and writes nothing.
- `npm run test` passes: all unit tests green, fixture snapshots match.
- `npm run test:e2e` passes on both Chromium and Firefox.
- `npm run build` produces a loadable, zippable `dist/` for both browsers.
- Manifest passes `web-ext lint` with no errors.

## 14. Deferred / Future

- Popup preview with copy + edit-selection.
- Right-click context menu for partial-page conversion.
- Keyboard shortcut.
- Image-download-alongside mode.
- Settings UI (Readability vs full-page toggle, filename template).
- Site-specific extractors.
