# FAQ

Short answers to the questions users ask most often. For deeper context, follow the links into the rest of the docs.

## Where does the saved file go?

Into your browser's default Downloads folder. Markdownly calls `chrome.downloads.download` with `saveAs: false`, so you do not get a "save as" dialog. If a file with the same name already exists from a previous click, `conflictAction: 'uniquify'` appends a ` (1)`, ` (2)`, and so on.

## How is the filename generated?

`<slug>-YYYY-MM-DD.md`, where the date is the local date at the moment you click.

The slug comes from the page title: Unicode NFKD normalization, combining-mark strip, emoji strip, non-alphanumeric runs collapsed to a single dash, and an 80-char length cap that prefers to rewind to the last dash (minimum 20 chars). Windows-reserved basenames such as `con` and `aux` get a `page-` prefix. Empty, pure-emoji, and CJK-only titles fall back to `untitled`.

Full algorithm: see [`src/shared/slugify.ts`](../src/shared/slugify.ts) and the local-date arithmetic in [`src/shared/filename.ts`](../src/shared/filename.ts). Architectural context: [ARCHITECTURE.md](./ARCHITECTURE.md#component-map).

## Why doesn't it work on Gmail / Twitter / Notion / Google Docs?

Because those sites do not expose an article-shaped subtree that Readability can latch onto. Twitter and X return empty. Gmail extracts the inbox chrome, not the selected message body. Notion and Google Docs generally return empty. See [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md#single-page-applications-with-no-server-rendered-article) for a per-site breakdown.

## How do I change the filename?

You can't, not yet. The filename template is hard-coded as `<slug>-YYYY-MM-DD.md` in [`src/shared/filename.ts`](../src/shared/filename.ts). A settings UI for things like filename template, target folder, and format tweaks is on the longer-term road map but has not been implemented. Until then, you can rename the file after it lands, or fork the project and edit `buildFilename` directly.

## What permissions does Markdownly need, and why?

Exactly four, declared in [`manifest.json`](../manifest.json):

| Permission | Why it is needed |
| --- | --- |
| `activeTab` | Grants transient access to the current tab when you click the toolbar icon. No broad host access. |
| `scripting` | Lets the background service worker call `chrome.scripting.executeScript` to inject the extractor into the active tab. |
| `downloads` | Lets the service worker call `chrome.downloads.download` to write the `.md` file to your Downloads folder. |
| `notifications` | Lets the service worker surface errors (for example, "Couldn't find an article on this page") as OS notifications. |

There is no `host_permissions` entry and no `<all_urls>`. The extension has no ability to read or modify any site until you explicitly click its toolbar icon on that tab.

## Is any data sent to a server?

No. There is no `fetch`, `XMLHttpRequest`, or `WebSocket` anywhere in [`src/`](../src/). The only network traffic your browser generates from a Markdownly click is whatever the page was already doing; the extension itself is offline end to end. No telemetry, no analytics, no crash reporting.

## Does it work offline?

Yes, completely. Once the extension is installed, every step runs inside your browser: extraction, Markdown conversion, filename composition, data URL encoding, download. Pages you are viewing must be visible in the tab (which may require the network), but the extension's own pipeline touches no server.

## Why did I get "This page type can't be converted"?

The URL matches the background worker's restricted list: `chrome://`, `edge://`, `about:`, `chrome-extension://`, `moz-extension://`, `file://`, or one of the extension galleries (`chromewebstore.google.com`, `chrome.google.com`, `addons.mozilla.org`). Browsers block extension injection into these URLs by design. See [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md#restricted-url-schemes-and-hosts).

## Why did I get "Couldn't find an article on this page"?

Readability ran but returned empty or whitespace-only content. This usually means the page has no article-shaped root (common on SPAs, dashboards, feeds, and search-result pages). Try scrolling to make sure content is loaded, or move to the canonical article URL (for example, a permalink rather than a feed view).

## Why did I get "Page took too long to convert"?

The 30-second watchdog on the injection step fired. This happens on very large pages, pages with pathological DOMs, or when the tab is hung. Reload the page and try again.

## Can I process multiple tabs at once?

Not from a single click. You can click Markdownly on each tab individually. Each click is an independent pipeline with its own download.

## Does it handle paywalled or logged-in content?

It handles whatever your session can see. If a paywall blocks the body, Markdownly will extract whatever is visible (often the paywall chrome). It does not bypass paywalls. It does not know or care about your login state; it reads the DOM as you see it.

## How do I uninstall Markdownly?

Standard extension removal.

- **Chrome / Edge / Brave:** open `chrome://extensions`, find Markdownly, click "Remove".
- **Firefox:** open `about:addons`, find Markdownly, click the three-dot menu, then "Remove".

No traces are left: there is no server-side account, no local storage, and no cookies. Already-downloaded `.md` files remain in your Downloads folder and are not affected by uninstall.
