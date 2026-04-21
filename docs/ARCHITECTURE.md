# Architecture

This document describes how Markdownly extracts a page, converts it to Markdown, and writes it to disk. All behavior described here is grounded in the files under [`src/`](../src/) and [`manifest.json`](../manifest.json).

## Execution model

Markdownly runs in two isolated JavaScript contexts:

1. **Background service worker** (MV3). Source: [`src/background.ts`](../src/background.ts). Declared in `manifest.json` as `"background": { "service_worker": "src/background.ts", "type": "module" }`. Owns the user interaction (toolbar click), permission-sensitive APIs (`chrome.scripting`, `chrome.downloads`, `chrome.notifications`), URL validation, filename composition, and the data URL download.
2. **Content script (tab isolated world)**. Source: [`src/content/content-script.ts`](../src/content/content-script.ts). Injected on demand via `chrome.scripting.executeScript({ files: ['content.js'] })`. Has DOM access to the page but runs in the extension's isolated world, so the page cannot observe or tamper with its globals.

There is no popup, no options page, no long-lived page, and no persistent state. Each click is a one-shot pipeline.

## The two-call injection pattern

The service worker performs two sequential `chrome.scripting.executeScript` calls per click:

```ts
// 1. Load the bundled IIFE into the tab. This runs runExtract() and
//    stashes the ExtractionResult on the isolated-world globalThis.
await withWatchdog(
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js'],
  }),
  WATCHDOG_MS,
);

// 2. Read the stashed value back as the InjectionResult.
const readback = await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () =>
    (globalThis as unknown as { __pageToMarkdownResult?: ExtractionResult })
      .__pageToMarkdownResult,
});
```

(See [`src/background.ts`](../src/background.ts) lines 78 to 90.)

### Why two calls?

`chrome.scripting.executeScript({ func })` serializes the function via `Function.prototype.toString()` and re-parses the source in the target context. Any variables captured by the function's module closure, including imports such as `Readability`, `TurndownService`, and `gfm`, are lost. Before this fix, a single `{ func: runExtract }` call produced `ReferenceError: Readability is not defined` in the tab.

The `{ files: ['content.js'] }` path evaluates the file's bundled IIFE in full, so Vite's inlined dependencies are available. The second call only needs to read a value, which is safe to do via a small arrow function that has no closure dependencies.

The stashed value is written to `globalThis.__pageToMarkdownResult` inside the isolated world (see [`src/content/content-script.ts`](../src/content/content-script.ts) lines 10 and 11). Page scripts cannot see or overwrite it because isolated worlds have separate globals.

## Component map

| File | Context | Responsibility |
| --- | --- | --- |
| [`src/background.ts`](../src/background.ts) | Service worker | Toolbar click listener, URL guard, two-call injection, 30 s watchdog, filename and data URL composition, download, notifications |
| [`src/content/content-script.ts`](../src/content/content-script.ts) | Tab isolated world | IIFE entry point that calls `runExtract()` and stashes the result on `globalThis.__pageToMarkdownResult` |
| [`src/content/extract.ts`](../src/content/extract.ts) | Tab isolated world | `runExtract()`: clones the document, preprocesses, invokes Readability, converts to Markdown, returns a typed `ExtractionResult` |
| [`src/content/preprocess.ts`](../src/content/preprocess.ts) | Tab isolated world | Pre-Readability DOM pass: promotes lazy-image attributes to `src`, strips `<script>`, `<style>`, `<noscript>`, `<iframe>` |
| [`src/shared/slugify.ts`](../src/shared/slugify.ts) | Both | Title to filesystem-safe slug: NFKD, combining mark strip, emoji strip, non-alnum collapse, Windows-reserved guard, 80 char cap with `MIN_REWIND=20` |
| [`src/shared/filename.ts`](../src/shared/filename.ts) | Service worker | `slugify(title) + '-YYYY-MM-DD.md'` using local date arithmetic (no ICU) |
| [`src/shared/data-url.ts`](../src/shared/data-url.ts) | Service worker | UTF-8 encode, chunked base64 (CHUNK = `0x8000`), emit `data:text/markdown;charset=utf-8;base64,...` URL |
| [`src/shared/turndown-config.ts`](../src/shared/turndown-config.ts) | Tab isolated world | Turndown instance with GFM plugin plus a custom `fencedCodeBlock` rule that extracts language hints from `class="language-*"`, `lang-*`, or `hljs-*` |
| [`src/shared/types.ts`](../src/shared/types.ts) | Both | Discriminated union `ExtractionResult` with variants `ok`, `empty`, `error` |

## Sequence diagram

The end-to-end interaction, generated with PlantUML `-utxt` (Unicode ASCII). Covers the happy path plus the four error branches (restricted URL, empty extraction, extractor error, watchdog timeout).

```
                                ┌─┐
                                ║"│
                                └┬┘
                                ┌┼┐                                                ┌────────────────┐
                                 │             ┌───────┐           ┌─────────────┐ │Content Script  │           ┌─────────┐
                                ┌┴┐            │Toolbar│           │Background SW│ │(isolated world)│           │Downloads│
                               User            └───┬───┘           └──────┬──────┘ └────────┬───────┘           └────┬────┘
                                 │   click icon    │                      │                 │                        │
                                 │────────────────>│                      │                 │                        │
                                 │                 │action.onClicked(tab) │                 │                        │
                                 │                 │─────────────────────>│                 │                        │
          ╔══════╤═══════════════╪═════════════════╪══════════════════════╪═════════════════╪════════════════════════╪═══════╗
          ║ ALT  │  restricted URL                 │                      │                 │                        │       ║
          ╟──────┘               │        notify "Can't convert"          │                 │                        │       ║
          ║                      │<───────────────────────────────────────│                 │                        │       ║
          ╠══════════════════════╪═════════════════╪══════════════════════╪═════════════════╪════════════════════════╪═══════╣
          ║ [URL allowed]        │                 │   executeScript(files: content.js)     │                        │       ║
          ║                      │                 │                      │────────────────>│                        │       ║
          ║                      │                 │                      │                 │ ╔════════════════╗     │       ║
          ║                      │                 │                      │                 │ ║clone DOM       ║     │       ║
          ║                      │                 │                      │                 │ ║preprocess      ║     │       ║
          ║                      │                 │                      │                 │ ║Readability     ║     │       ║
          ║                      │                 │                      │                 │ ║Turndown -> md  ║     │       ║
          ║                      │                 │                      │                 │ ║stash result    ║     │       ║
          ║                      │                 │                      │                 │ ╚════════════════╝     │       ║
          ║                      │                 │                      │executeScript(func: readResult)           │       ║
          ║                      │                 │                      │────────────────>│                        │       ║
          ║                      │                 │                      │ ExtractionResult                         │       ║
          ║                      │                 │                      │<─ ─ ─ ─ ─ ─ ─ ─ │                        │       ║
          ║         ╔══════╤═════╪═════════════════╪══════════════════════╪═════════════════╪════════════════════════╪═════╗ ║
          ║         ║ ALT  │  kind = empty         │                      │                 │                        │     ║ ║
          ║         ╟──────┘     │          notify "No article"           │                 │                        │     ║ ║
          ║         ║            │<───────────────────────────────────────│                 │                        │     ║ ║
          ║         ╠════════════╪═════════════════╪══════════════════════╪═════════════════╪════════════════════════╪═════╣ ║
          ║         ║ [kind = error]               │notify "Conversion failed"              │                        │     ║ ║
          ║         ║            │<───────────────────────────────────────│                 │                        │     ║ ║
          ║         ╠════════════╪═════════════════╪══════════════════════╪═════════════════╪════════════════════════╪═════╣ ║
          ║         ║ [watchdog timeout]           │    notify "Too slow" │                 │                        │     ║ ║
          ║         ║            │<───────────────────────────────────────│                 │                        │     ║ ║
          ║         ╠════════════╪═════════════════╪══════════════════════╪═════════════════╪════════════════════════╪═════╣ ║
          ║         ║ [kind = ok]│                 │                      │────┐            │                        │     ║ ║
          ║         ║            │                 │                      │    │ build filename + data URL           │     ║ ║
          ║         ║            │                 │                      │<───┘            │                        │     ║ ║
          ║         ║            │                 │                      │      downloads.download                  │     ║ ║
          ║         ║            │                 │                      │─────────────────────────────────────────>│     ║ ║
          ║         ║            │                 │                      │ file in Downloads                        │     ║ ║
          ║         ║            │<──────────────────────────────────────────────────────────────────────────────────│     ║ ║
          ║         ╚════════════╪═════════════════╪══════════════════════╪═════════════════╪════════════════════════╪═════╝ ║
          ╚══════════════════════╪═════════════════╪══════════════════════╪═════════════════╪════════════════════════╪═══════╝
                               User            ┌───┴───┐           ┌──────┴──────┐ ┌────────┴───────┐           ┌────┴────┐
                                               │Toolbar│           │Background SW│ │Content Script  │           │Downloads│
                                               └───────┘           └─────────────┘ │(isolated world)│           └─────────┘
                                                                                   └────────────────┘
```

The PlantUML source is at [`docs/diagrams/markdownly-flow.puml`](diagrams/markdownly-flow.puml); regenerate with `java -jar plantuml.jar -utxt docs/diagrams/markdownly-flow.puml`.

## Data flow (component pipeline)

```
+--------------------------+
|  User: clicks toolbar    |
+-------------+------------+
              |
              v
+--------------------------+
|  Browser UI              |
|  fires                   |
|  chrome.action.onClicked |
+-------------+------------+
              |
              v
+--------------------------------------------+
|  Background service worker                 |
|  src/background.ts                         |
|                                            |
|  [1] isRestricted(tab.url)?                |
|      yes -> notify + return                |
|      no  -> proceed                        |
+------------------+-------------------------+
                   |
                   | withWatchdog(30 s)
                   v
+--------------------------------------------+
|  chrome.scripting.executeScript            |
|  { files: ['content.js'] }                 |
|                                            |
|  Loads the IIFE into the tab isolated      |
|  world, then the IIFE runs:                |
|                                            |
|    runExtract() from extract.ts            |
|       -> clone document                    |
|       -> preprocess(clone)                 |
|            (promote lazy img, strip        |
|             script/style/noscript/iframe)  |
|       -> new Readability(clone).parse()    |
|       -> htmlToMarkdown(parsed.content)    |
|            (Turndown + GFM + fenced code)  |
|       -> return ExtractionResult           |
|                                            |
|    content-script.ts stashes the result:   |
|      globalThis.__pageToMarkdownResult = r |
+------------------+-------------------------+
                   |
                   v
+--------------------------------------------+
|  chrome.scripting.executeScript            |
|  { func: () => globalThis.              }  |
|  { __pageToMarkdownResult              }   |
|                                            |
|  Returns readback[0].result, typed as      |
|  ExtractionResult.                         |
+------------------+-------------------------+
                   |
                   v
+--------------------------------------------+
|  Background service worker resumes         |
|                                            |
|  switch on result.kind                     |
|    'empty' -> notify, return               |
|    'error' -> notify, return               |
|    'ok'    -> continue                     |
|                                            |
|  filename = buildFilename(result.title)    |
|             = slug + '-YYYY-MM-DD.md'      |
|                                            |
|  url      = markdownToDataUrl(result.md)   |
|             = data:text/markdown;          |
|               charset=utf-8;base64,...     |
+------------------+-------------------------+
                   |
                   v
+--------------------------------------------+
|  chrome.downloads.download({               |
|    url, filename,                          |
|    saveAs: false,                          |
|    conflictAction: 'uniquify'              |
|  })                                        |
+------------------+-------------------------+
                   |
                   v
+--------------------------+
|  File lands in the       |
|  user's Downloads folder |
+--------------------------+
```

Error paths (restricted URL, empty extraction, watchdog timeout, download failure) terminate in a `chrome.notifications.create` call. See the error matrix below.

## Error handling matrix

Every failure mode in [`src/background.ts`](../src/background.ts) produces a user-visible notification. The table below enumerates the paths and messages.

| # | Condition | Detection point | Notification title | Notification message |
| --- | --- | --- | --- | --- |
| 1 | `tab.id` missing | `handle()` guard | Markdownly | `This page type can't be converted.` |
| 2 | URL has restricted prefix (`chrome://`, `edge://`, `about:`, `chrome-extension://`, `moz-extension://`, `file://`) | `isRestricted()` via `RESTRICTED_PREFIXES` | Markdownly | `This page type can't be converted.` |
| 3 | URL host is restricted (`chromewebstore.google.com`, `chrome.google.com`, `addons.mozilla.org`) | `isRestricted()` via `RESTRICTED_HOSTS` | Markdownly | `This page type can't be converted.` |
| 4 | URL parses as invalid | `isRestricted()` catch branch | Markdownly | `This page type can't be converted.` |
| 5 | First `executeScript` call exceeds 30 seconds | `withWatchdog` rejects with `WatchdogTimeoutError` | Markdownly | `Page took too long to convert.` |
| 6 | `executeScript` throws (injection blocked, tab closed, etc.) | outer try/catch | Markdownly | `Conversion failed. Try reloading the page.` |
| 7 | Readback returns no result (empty array or `undefined`) | post-injection check | Markdownly | `Conversion failed. Try reloading the page.` |
| 8 | `runExtract()` returned `{ kind: 'empty' }` (Readability found no article) | result switch | Markdownly | `Couldn't find an article on this page.` |
| 9 | `runExtract()` returned `{ kind: 'error', message }` | result switch | Markdownly | `Conversion failed.` |
| 10 | `chrome.downloads.download` throws | download try/catch | Markdownly | First 120 chars of the thrown message |
| 11 | Uncaught error bubbling out of `handle()` | `addListener` wrapper | Markdownly | `Unexpected error: <first 100 chars>` |

Notifications are the only user-facing error channel. Markdownly does not log to the service-worker console for user-facing errors; the service worker console is available for development but not surfaced.

## Security posture

- **Minimal permissions.** `manifest.json` declares only `activeTab`, `scripting`, `downloads`, `notifications`. No `host_permissions` and no `<all_urls>`. Injection authority is granted transiently by the user gesture (the toolbar click activates `activeTab` for the current tab only).
- **Isolated world.** All DOM work happens in the extension's isolated world, so the page cannot read or write `__pageToMarkdownResult`, `Readability`, or any other injected code.
- **Restricted URL guard.** Chrome-internal pages, extension galleries, and `file://` URLs are refused before injection is attempted. See `RESTRICTED_PREFIXES` and `RESTRICTED_HOSTS` in [`src/background.ts`](../src/background.ts).
- **data: URL download.** The Markdown bytes are encoded as a `data:text/markdown;charset=utf-8;base64,...` URL and passed to `chrome.downloads.download`. This avoids the need for `Blob` URLs (which require `URL.createObjectURL` and are subject to origin constraints) and does not interact with page CSP.
- **No network.** There are no `fetch`, `XMLHttpRequest`, or `WebSocket` calls anywhere in `src/`. Zero telemetry, zero analytics.

## Cross-browser strategy

A single `manifest.json` targets both Chrome MV3 and Firefox 121 and later. Firefox-specific metadata lives in `browser_specific_settings.gecko`:

```json
"browser_specific_settings": {
  "gecko": {
    "id": "markdownly@local",
    "strict_min_version": "121.0"
  }
}
```

Chrome ignores `browser_specific_settings` silently. Firefox before 121 lacks MV3 service-worker support, hence the `strict_min_version`.

No `webextension-polyfill` is used. Both browsers expose `chrome.*` APIs at the call sites this project uses (`chrome.action.onClicked`, `chrome.scripting.executeScript`, `chrome.downloads.download`, `chrome.notifications.create`, `chrome.tabs.get`). Types come from `@types/chrome`.

## Build pipeline

Tooling: Vite 5 plus [`@crxjs/vite-plugin`](https://crxjs.dev/vite-plugin).

From [`vite.config.ts`](../vite.config.ts):

```ts
rollupOptions: {
  input: {
    background: 'src/background.ts',
    content: 'src/content/content-script.ts',
  },
  output: {
    entryFileNames: (chunk) =>
      chunk.name === 'content' ? 'content.js' : 'assets/[name]-[hash].js',
  },
}
```

Key points:

- Two rollup inputs: the service worker and the content script. Each is bundled as a self-contained IIFE. Readability, Turndown, and `turndown-plugin-gfm` are inlined into `content.js`.
- The content entry is emitted with a **stable name**, `content.js`, because the service worker references it by literal filename in `chrome.scripting.executeScript({ files: ['content.js'] })`. The background entry uses a hash suffix; crxjs rewrites the manifest's `background.service_worker` pointer for us.
- `outDir: 'dist'`, `emptyOutDir: true`. The `dist/` folder is the unpacked extension.
- The Vitest config shares the same file, using `environment: 'happy-dom'` and `include: ['tests/unit/**/*.test.ts']`. E2E tests are picked up by Playwright separately via [`playwright.config.ts`](../playwright.config.ts).

### Observed bundle sizes (as of commit at time of writing)

```
dist/service-worker-loader.js        0.04 kB
dist/manifest.json                   0.75 kB (gzip: 0.37 kB)
dist/assets/background-<hash>.js     2.79 kB (gzip: 1.36 kB)
dist/content.js                     47.81 kB (gzip: 15.63 kB)
```

Content dominates because it carries Readability plus Turndown plus the GFM plugin. The service worker is tiny because it only orchestrates.

### Lint

`npm run lint:manifest` runs `web-ext lint --source-dir dist`, which validates the built extension against the AMO submission rules. Use it before packaging for Firefox.
