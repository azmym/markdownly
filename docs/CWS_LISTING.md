# Chrome Web Store Listing Copy

Paste-ready strings for the Markdownly Chrome Web Store submission. Keep this file in sync with the real listing whenever values are changed in the Developer Console.

## Product details

**Title** (pulled automatically from `manifest.json`): `Markdownly`

**Summary** (pulled from `manifest.json` description): `Convert the current webpage to a Markdown (.md) file.`

**Description** (paste into the Description field):

```
Markdownly converts the current webpage into a GitHub-Flavored Markdown file and saves it to your Downloads folder. One click on the toolbar icon, one .md file.

It strips navigation, ads, and sidebars using Mozilla's Readability engine (the same engine behind Firefox Reader View), then converts the article body to Markdown with Turndown. Code blocks keep their language hints, tables become GFM tables, and images are preserved as remote links.

Features
  - One-click conversion of any article page.
  - GitHub-Flavored Markdown: headings, fenced code with language hints, tables, task lists.
  - Filename pattern: slug-YYYY-MM-DD.md (local date).
  - No host permissions. The extension only reads the active tab when you click.
  - No backend. No telemetry. Everything runs in your browser.

How it works
The extension uses chrome.scripting.executeScript to inject a content script into the active tab, run Readability on a cloned DOM, convert the result with Turndown, then download the Markdown via chrome.downloads.

Source code
https://github.com/azmym/markdownly

License: MIT.

Known limitations
Single-page apps that render content entirely client-side (Gmail, Twitter, Notion, Google Docs) often have no detectable article; the extension will show "Couldn't find an article on this page." See the docs on GitHub for the full list.
```

**Category**: `Productivity > Tools` (the Productivity header is a group label; pick the Tools subcategory)

**Language**: `English`

## Graphic assets

| Asset | File |
|---|---|
| Store icon (128 x 128) | `public/icons/128.png` |
| Screenshot 1 (1280 x 800) | `docs/images/store/01-browser-to-markdown.png` |
| Screenshot 2 (1280 x 800) | `docs/images/store/02-webpage-to-file.png` |
| Screenshot 3 (1280 x 800) | `docs/images/store/03-one-click-flow.png` |
| Small promo tile (440 x 280) | `docs/images/cws-small-promo.png` |
| Marquee promo tile (1400 x 560) | skip |
| Promo video | skip |

Replace the three screenshots with real in-browser captures when available; the committed files are illustration placeholders that meet CWS dimensions (PNG, 24-bit, no alpha).

## Additional fields

**Official URL / homepage**: `https://github.com/azmym/markdownly`

**Support URL**: `https://github.com/azmym/markdownly/issues`

## Privacy practices

**Single purpose**:

```
Markdownly converts the current webpage into a Markdown (.md) file and saves it to the user's Downloads folder.
```

**Permission justifications** (paste into each per-permission textarea):

- `activeTab`
  ```
  Required to read the rendered DOM of the user's current tab when they click the extension's toolbar icon. Without activeTab we cannot access the page content to convert.
  ```

- `scripting`
  ```
  Required to inject the content script that runs Readability and Turndown in the tab's isolated world. The content script is executed only on the active tab after a user click.
  ```

- `downloads`
  ```
  Required to save the generated Markdown file to the user's Downloads folder via chrome.downloads.download. The file is the sole user-facing output of the extension.
  ```

- `notifications`
  ```
  Required to surface error states to the user. For example: "Couldn't find an article on this page" on a JavaScript-heavy site, or "This page type can't be converted" on a chrome:// URL. Without notifications, failures would be silent.
  ```

- Host permissions: **none requested**.
- Remote code: **none**. All code is bundled at build time.

**Data usage disclosures** (tick these):

- [x] I do not collect personally identifiable information.
- [x] I do not collect health information.
- [x] I do not collect financial and payment information.
- [x] I do not collect authentication information.
- [x] I do not collect personal communications.
- [x] I do not collect location.
- [x] I do not collect web history.
- [x] I do not collect user activity.
- [x] I do not collect website content.

**Certifications** (tick):

- [x] I certify that the use of data complies with the Developer Program Policies.
- [x] I certify that I do not sell user data to third parties.
- [x] I certify that I do not use or transfer user data for unrelated purposes.
- [x] I certify that I do not use or transfer user data to determine creditworthiness.

**Privacy policy URL**:

```
https://github.com/azmym/markdownly/blob/main/docs/PRIVACY.md
```

## Distribution

- **Visibility**: Public (flip to Unlisted for a dry-run if you prefer).
- **Regions**: All regions.
- **Pricing**: Free.
- **Mature content**: No.
