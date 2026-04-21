# Testing

Markdownly has two test layers:

- **Unit tests** (Vitest) for pure logic and the HTML to Markdown pipeline. These run on every change and are the primary safety net.
- **Playwright e2e** for a real-browser smoke. The spec is committed as a scaffold but is currently `test.skip`'d; see the [e2e section](#playwright-e2e) for why.

## Test philosophy

The extension's runtime is simple: one code path, one download per click. Almost everything it does is pure logic operating on strings and DOM fragments. That logic is unit-testable without a live browser:

- String utilities (`slugify`, `buildFilename`, `markdownToDataUrl`) are called directly.
- The HTML to Markdown pipeline (`preprocess` + `htmlToMarkdown`) is exercised against committed HTML fixtures using `happy-dom` as the Vitest environment.

The service worker itself (`src/background.ts`) is intentionally small and is covered indirectly; it orchestrates, delegates, and surfaces errors. Unit-testing it directly would require mocking four distinct `chrome.*` APIs; the cost is higher than the value at this project's size.

## Running the suite

```bash
npm test            # one-shot
npm run test:watch  # watch mode
```

As of the current commit, `vitest run` reports:

```
 Test Files  5 passed (5)
      Tests  36 passed (36)
```

## Per-file breakdown

### [`tests/unit/slugify.test.ts`](../tests/unit/slugify.test.ts), 18 cases

Covers every branch of [`src/shared/slugify.ts`](../src/shared/slugify.ts):

- ASCII happy path and lowercasing.
- Collapse of runs of non-alphanumerics to a single dash.
- Trim of leading and trailing dashes.
- NFKD normalization of accents and stripping of combining marks (`Crème brûlée` becomes `creme-brulee`).
- Emoji and extended-pictograph stripping.
- Pure-emoji, empty, whitespace-only, and CJK-only inputs all fall back to `untitled`.
- Windows-reserved basename guard: `CON`, `prn`, `com1`, `lpt9`, `aux`, `nul` are prefixed with `page-`. Names that merely start with a reserved word (`conference`, `com10`) are left alone.
- Length cap: result never exceeds 80 chars. If a dash exists at or after `MIN_REWIND=20`, the slug is rewound to that dash; otherwise a hard 80-char cut.
- Control-character handling.
- Mixed case with punctuation and numbers (`React 18.2: What's New?` becomes `react-18-2-what-s-new`).

### [`tests/unit/filename.test.ts`](../tests/unit/filename.test.ts), 7 cases

Covers [`src/shared/filename.ts`](../src/shared/filename.ts). Uses `vi.useFakeTimers()` to pin the system clock.

- Basic slug + date composition: `how-to-use-claude-2026-04-20.md`.
- Fallback to `untitled` for empty, pure-emoji, and CJK-only titles.
- Windows-reserved guard surfaces through: `CON` becomes `page-con-...`.
- Zero-padding of single-digit months and days.
- **Local date, not UTC**, across the midnight boundary. At 23:30 local, the filename must still say the local date, not the UTC date.

### [`tests/unit/data-url.test.ts`](../tests/unit/data-url.test.ts), 4 cases

Covers [`src/shared/data-url.ts`](../src/shared/data-url.ts).

- ASCII round-trip.
- Multi-byte UTF-8 round-trip (emoji, CJK, accents): confirms the `TextEncoder` plus chunked `btoa` pipeline does not corrupt non-Latin-1 bytes.
- 1 MB stress: exercises the `CHUNK = 0x8000` loop to ensure large inputs do not blow the call stack.
- Prefix check: output matches `/^data:text\/markdown;charset=utf-8;base64,/`.

### [`tests/unit/convert.test.ts`](../tests/unit/convert.test.ts), 3 cases

Fixture-driven tests for the Turndown configuration in [`src/shared/turndown-config.ts`](../src/shared/turndown-config.ts). The test pulls the first `<article>` from each fixture HTML (using `happy-dom`), runs `htmlToMarkdown`, and compares against a committed `.expected.md`.

Fixtures covered:

- `blog-semantic`: paragraphs, emphasis, figure with image and caption, blockquote.
- `github-readme`: headings, bold, inlined link, fenced code with `language-bash` and `language-ts` hints, task-list items.
- `simple-table`: GFM table with header and two body rows.

### [`tests/unit/preprocess.test.ts`](../tests/unit/preprocess.test.ts), 4 cases

Covers [`src/content/preprocess.ts`](../src/content/preprocess.ts).

- Promotes `data-src` and `data-original` to `src`.
- Does not overwrite an existing `src` value.
- Strips `<script>`, `<style>`, `<noscript>`, `<iframe>` while keeping surrounding content.
- End-to-end: for the `lazy-images` fixture, after `preprocess` plus `htmlToMarkdown`, the output matches `lazy-images.expected.md`.

## Fixtures

There are 4 committed fixture pairs in [`tests/fixtures/`](../tests/fixtures/). Each pair is `<name>.html` (input) plus `<name>.expected.md` (expected Markdown, with trailing whitespace trimmed).

| Fixture | What it pins |
| --- | --- |
| `blog-semantic` | Basic article structure: headings, paragraphs, emphasis, figure + caption, blockquote |
| `github-readme` | Fenced code blocks with language hints via `class="language-*"`, inlined links, GFM task lists |
| `simple-table` | GFM table rendering (header separator, aligned cells) |
| `lazy-images` | `preprocess` promoting `data-src` and `data-original` to `src`, plus `<script>`/`<style>`/`<noscript>` strip |

### Adding a new fixture

1. Decide what behavior you want to pin. Write a minimal HTML snippet that triggers it, using only the tags and attributes the real-world source would use.
2. Save it as `tests/fixtures/<name>.html`. Wrap it in an `<article>` so the test helper finds it.
3. Save an empty `tests/fixtures/<name>.expected.md` for now.
4. In the appropriate test file (`convert.test.ts` for pure Turndown, `preprocess.test.ts` if you also need the preprocess step), add an `it` block that calls `fixture('<name>')` or `loadFixture('<name>')`.
5. Run `npm test`. The test will fail and print the actual Markdown output.
6. Review the output carefully. If it is correct, paste it into `<name>.expected.md` (trim the trailing newline the helper strips with `.trimEnd()`).
7. Re-run `npm test`. It should pass.
8. Commit both the HTML and the expected Markdown together.

Fixtures are the first line of defense against Turndown regressions. Keep them small; one concern per fixture.

## Playwright e2e

[`tests/e2e/smoke.spec.ts`](../tests/e2e/smoke.spec.ts) is a scaffold that:

1. Launches a persistent Chromium context with `dist/` loaded via `--load-extension`.
2. Starts a local HTTP server serving `tests/e2e/fixtures/page.html` (a `file://` URL would be blocked by the background worker's restricted-prefix list).
3. Navigates a page to the fixture.
4. Attempts to invoke `chrome.action.onClicked.dispatch(tab)` from the service-worker context.
5. Polls the download directory for a `.md` file matching the expected filename.

### Why it is skipped

Playwright cannot click browser-chrome toolbar UI (the toolbar sits outside the page's rendering surface). The usual workaround is to invoke the click event directly from the service worker. However, on Chromium 147 with Playwright 1.47 (the pinned version range in `package.json`), `chrome.action.onClicked.dispatch(tab)` resolves without error but **does not invoke the registered listener**. This matches Chromium's security stance: automated contexts cannot synthesize user-gesture-gated events against installed extensions.

The test is committed with `test.skip(...)` so the scaffolding is not lost. See the long comment block in `smoke.spec.ts` for the full context.

### Re-enabling paths to explore

- A CDP-based `Target.Extensions` approach (low-level Chromium API).
- A Puppeteer harness, which has historically had better support for extension automation.
- A test-mode manifest entry that registers a DOM-driven trigger (for example, a message-passing endpoint) used only in e2e builds. This introduces code divergence between test and production, so it is a last resort.

### Manual smoke procedure

Until the harness is viable, every release must be smoke-tested by hand. See [DEVELOPMENT.md](./DEVELOPMENT.md) for loading the extension, then:

1. Open a standard article page (for example, `https://en.wikipedia.org/wiki/Markdown`).
2. Click the Markdownly toolbar icon.
3. Confirm a `.md` file lands in the Downloads folder with the expected `<slug>-YYYY-MM-DD.md` name.
4. Open the file and confirm the body matches the article (allowing for Readability's known limitations; see [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md)).
5. Repeat on `chrome://newtab`. Confirm the "This page type can't be converted" notification appears.
6. Repeat on an SPA with no detectable article (`https://x.com`). Confirm the "Couldn't find an article on this page" notification appears.
7. Click twice on the same article in the same day. Confirm the second download gets a ` (1)` suffix from `conflictAction: 'uniquify'`.

## Firefox e2e

No automated Firefox e2e exists. Manual smoke on Firefox 121+ is covered by the same procedure above, loaded via `about:debugging` as a temporary add-on. See [DEVELOPMENT.md](./DEVELOPMENT.md#firefox-121-or-newer).
