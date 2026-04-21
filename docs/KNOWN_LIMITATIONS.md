# Known Limitations

Markdownly is a single-shot DOM extractor. It reads whatever is in the DOM at the moment you click, hands it to [@mozilla/readability](https://github.com/mozilla/readability), and converts the result with [Turndown](https://github.com/mixmark-io/turndown) plus the GFM plugin. That pipeline is fast and privacy-friendly, but it imposes real limits. This page lists the ones users hit most often.

## Single-page applications with no server-rendered article

Readability needs a reasonably article-shaped subtree. Sites that render all content client-side after hydration, or that never render an article-shaped subtree at all, are poor matches. Observed behavior per site:

| Site | What happens |
| --- | --- |
| **Twitter / X** | Readability returns empty content. You get "Couldn't find an article on this page." |
| **Gmail inbox view** | Readability finds a subtree and produces Markdown, but the Markdown contains the inbox chrome (folder names, sender lists, UI labels), not the email body. This is not a bug in the extractor; Gmail's DOM does not present the selected message as a discrete article. |
| **Notion** | Client-rendered blocks rarely produce a stable article root. Output is usually empty or a navigation chrome dump. |
| **Google Docs** | The document body is rendered in a `<canvas>`-backed element that has no HTML text nodes. Readability returns empty. |
| **LinkedIn feed** | Mixed: posts sometimes extract, feeds rarely do. |

Recommendation: for Gmail, use the "Print" route or copy and paste the message body. For Notion and Google Docs, use the host application's own Markdown export.

## Infinite-scroll pages

Only the content currently in the DOM is extracted. Posts that are still below the fold, or that have been virtualized away by the site's scroller, are not present and therefore not included. Scroll to the end (and wait for lazy lists to settle) before clicking.

## Authentication-gated pages

Markdownly runs inside the current tab. If you can see the content, the extension can extract it; if you are logged out, you get whatever the logged-out view shows. The extension does not log in, does not store cookies, and does not bypass paywalls or DRM.

## Restricted URL schemes and hosts

The background service worker refuses to run on a set of URLs. See `RESTRICTED_PREFIXES` and `RESTRICTED_HOSTS` in [`src/background.ts`](../src/background.ts).

**Blocked prefixes:**

- `chrome://`
- `edge://`
- `about:`
- `chrome-extension://`
- `moz-extension://`
- `file://`

**Blocked hosts:**

- `chromewebstore.google.com`
- `chrome.google.com`
- `addons.mozilla.org`

On any of these you get "This page type can't be converted." and no download. This is by design: Chrome does not allow `activeTab` injection into internal pages, and the extension galleries actively block extension scripts.

## Image galleries render as inline image runs

Turndown emits each `<img>` as `![alt](src)`. Adjacent `<img>` siblings become a single paragraph of space-separated image references, because that is what the HTML says. There is no gallery-specific renderer. If you want one image per line, wrap each in a block element upstream (not something Markdownly can fix post hoc).

## Lazy-loaded images may save as placeholders

Markdownly promotes `data-src`, `data-original`, and the first URL of `data-srcset` to `src` before Readability runs (see [`src/content/preprocess.ts`](../src/content/preprocess.ts)). But:

- If the site uses a different attribute name (`data-image`, `data-lazy-url`, etc.), Markdownly does not know about it, and the image's `src` is whatever placeholder the site set.
- If the image has a `src` already (even if it is a 1 px transparent GIF placeholder), Markdownly does not overwrite it.

Workaround: scroll the image into view (so the site hydrates it) before clicking the toolbar.

## Very long pages hit the watchdog

The first `chrome.scripting.executeScript` call is wrapped in a 30-second `withWatchdog` (see `WATCHDOG_MS` in [`src/background.ts`](../src/background.ts)). Extracting a very large document (many megabytes of HTML, or deeply nested pathological markup) can exceed this and produce "Page took too long to convert." This is rare for normal articles but can happen on dump pages (for example, a one-page HTML copy of a whole book).

## Filename customization is not available

The filename template is fixed at `<slug>-YYYY-MM-DD.md`. There is no user-facing setting, no prefix field, no folder override. If a duplicate basename exists, `chrome.downloads.download({ conflictAction: 'uniquify' })` appends ` (1)`, ` (2)`, and so on. A settings UI is on the road map but not implemented; see [FAQ.md](./FAQ.md#how-do-i-change-the-filename).

## Firefox e2e is manual only

The committed Playwright e2e targets Chromium; there is no automated Firefox run. Release testing on Firefox 121+ is manual. See [TESTING.md](./TESTING.md#firefox-e2e).

## No offline archive of linked resources

Markdownly emits links as `![alt](url)` and `[text](url)` with the original remote URLs. It does not download images, does not inline CSS, and does not fetch linked pages. If the source URL later breaks, your saved Markdown will reference a dead link. This is an intentional scope choice; full-page archives are a different product.
