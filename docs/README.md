# Markdownly Documentation

Developer and user documentation for the Markdownly browser extension. For the project overview and install instructions, see the [project README](../README.md).

## Contents

| Document | Audience | Topic |
| --- | --- | --- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Developers | Execution model, component map, data flow, error matrix, build pipeline |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Contributors | Local setup, npm scripts, loading the extension, debugging |
| [TESTING.md](./TESTING.md) | Contributors | Unit suite breakdown, fixtures, e2e status, adding new fixtures |
| [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) | Users and developers | SPA pages, infinite scroll, auth-gated content, restricted URLs |
| [FAQ.md](./FAQ.md) | Users | Common questions about filenames, permissions, privacy, uninstall |

## Quick links

- Source code: [`src/`](../src/)
- Manifest: [`manifest.json`](../manifest.json)
- Unit tests: [`tests/unit/`](../tests/unit/)
- Fixtures: [`tests/fixtures/`](../tests/fixtures/)
- Vite config: [`vite.config.ts`](../vite.config.ts)

## Reporting issues

File issues against the upstream repository at `https://github.com/azmym/markdownly`. When reporting a conversion failure, include the page URL (if public), the browser and version, and the exact notification text shown by the extension.
