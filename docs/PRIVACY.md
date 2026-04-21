# Privacy Policy

Last updated: 2026-04-21.

Markdownly does not collect, store, transmit, or sell any personal or usage data.

## What the extension does with data

- Reads the DOM of the active browser tab only after you click the toolbar icon.
- Converts the extracted article content to Markdown entirely on your device.
- Saves the resulting `.md` file to your local Downloads folder via the browser's downloads API.

## What the extension does NOT do

- No data is sent to any server. The extension has no backend.
- No analytics, no telemetry, no crash reporting, no error tracking.
- No cookies. No local or session storage is used beyond what the browser needs to run the extension itself.
- No third-party code is loaded at runtime. All code ships inside the extension bundle.
- No advertising, no affiliate links, no revenue share of any kind.

## Permissions

| Permission | Why it is requested |
|---|---|
| `activeTab` | Read the rendered DOM of the tab you clicked on. |
| `scripting` | Inject the content script that runs Readability and Turndown in the tab's isolated world. |
| `downloads` | Save the generated `.md` file to your local Downloads folder. |
| `notifications` | Show error messages when extraction fails (for example, "Couldn't find an article on this page"). |

No host permissions are requested; access is scoped to the active tab on user click.

## Source code

The full source is published under the MIT License at
[https://github.com/azmym/markdownly](https://github.com/azmym/markdownly).

## Contact

- Questions or concerns: open an issue at
  [https://github.com/azmym/markdownly/issues](https://github.com/azmym/markdownly/issues).
- Security reports: use GitHub's private security advisory form at
  [https://github.com/azmym/markdownly/security/advisories/new](https://github.com/azmym/markdownly/security/advisories/new).
