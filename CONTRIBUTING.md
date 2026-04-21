# Contributing to markdownly

Thanks for your interest in improving markdownly. This document covers how to report issues, propose changes, and get a patch merged.

## Reporting bugs

Please open a bug via the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml). Include clear reproduction steps, the browser and extension versions, and any relevant service worker console output.

## Suggesting features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml). Start with the user problem, not the implementation. Reviewers look for a concrete motivating use case.

## Development setup

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for local setup, loading the unpacked extension, and running the test suite.

## Code style

- TypeScript strict mode. Do not loosen `tsconfig.json` without discussion.
- Do not introduce em dashes or en dashes. Use commas, parentheses, colons, or semicolons.
- Follow test-driven development for pure logic in `src/shared/`. Write the failing test first, then the implementation.
- Match existing patterns in `src/shared/`: small pure modules, named exports, explicit return types on public functions.
- Keep side effects (DOM, chrome.* APIs) at the edges and out of the shared logic.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` user-visible feature
- `fix:` bug fix
- `docs:` documentation only
- `refactor:` internal change without behavior difference
- `chore:` tooling, deps, config
- `test:` tests only

Write a short imperative subject (under 72 chars). Use the body to explain the why, not the what.

## Pull request process

1. Keep one topic per PR. Split unrelated changes.
2. Ensure CI is green: `npm test` and `npm run build` must pass.
3. Describe the behavior change and how you verified it. Screenshots help for UI changes.
4. Be responsive to review feedback. Push follow-up commits rather than rewriting history mid-review.

## License

By submitting a contribution you agree that your work is licensed under the MIT License, the same license that covers this project.
