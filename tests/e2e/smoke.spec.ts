import { test, expect, chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EXT_DIR = resolve(__dirname, '..', '..', 'dist');
const FIXTURE = resolve(__dirname, 'fixtures', 'page.html');

// The background service worker rejects `file://` URLs as restricted (see
// src/background.ts RESTRICTED_PREFIXES), so we serve the fixture over HTTP.
// This is also more realistic; it exercises the same code path a real page
// would hit.
function startFixtureServer(): Promise<{ server: Server; port: number }> {
  return new Promise((resolvePromise, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const body = await readFile(FIXTURE);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(body);
      } catch (err) {
        res.writeHead(500);
        res.end(String(err));
      }
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      resolvePromise({ server, port: addr.port });
    });
  });
}

// NOTE: This test is skipped by default. Playwright + MV3 service workers
// have well-known quirks, and Playwright cannot click the real browser
// toolbar UI, so the action-click must be dispatched from the SW context.
//
// Observed behavior (Chromium 147 / Playwright 1.47): calling
// `chrome.action.onClicked.dispatch(tab)` from sw.evaluate() does not
// error, but also does not invoke the registered listener (the service
// worker's handle() path is not reached, so no download is produced).
// This matches the Chromium security stance of not letting automated
// contexts synthesize user-gesture-gated events against installed
// extensions.
//
// The spec is committed as a scaffold so future work can re-enable it
// (e.g. via a CDP-based Target.Extensions approach, puppeteer harness,
// or a dedicated test-mode manifest entry). Until then, this smoke test
// is executed manually; see README for the manual verification procedure.
test.skip('click toolbar icon downloads a markdown file', async () => {
  expect(existsSync(EXT_DIR), `build first: ${EXT_DIR}`).toBe(true);

  const userDataDir = mkdtempSync(resolve(tmpdir(), 'p2m-'));
  const downloadDir = mkdtempSync(resolve(tmpdir(), 'p2m-dl-'));

  const { server, port } = await startFixtureServer();

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT_DIR}`,
      `--load-extension=${EXT_DIR}`,
      `--no-sandbox`,
    ],
    acceptDownloads: true,
    downloadsPath: downloadDir,
  });

  try {
    // Wait for the extension's service worker to register.
    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent('serviceworker');

    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/`);

    // Playwright cannot click browser-chrome toolbar UI. Dispatch the same
    // code path by invoking chrome.action.onClicked from the SW.
    const tabId = await sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      return tabs[0]?.id ?? null;
    });
    expect(tabId).not.toBeNull();

    await sw.evaluate(async (id) => {
      const tab = await chrome.tabs.get(id as number);
      // chrome.action.onClicked is an EventTarget-ish construct; the
      // private `dispatch` hook is only available in some Chromium builds.
      // @ts-expect-error: private test hook in some Chromium builds
      if (typeof chrome.action.onClicked.dispatch === 'function') {
        // @ts-expect-error same
        chrome.action.onClicked.dispatch(tab);
      } else {
        throw new Error('onClicked.dispatch not available; needs manual testing');
      }
    }, tabId);

    // Poll the download directory for a matching file.
    const expected = /^e2e-test-article-\d{4}-\d{2}-\d{2}\.md$/;
    const deadline = Date.now() + 15_000;
    let found: string | undefined;
    while (Date.now() < deadline) {
      const files = readdirSync(downloadDir);
      found = files.find((f) => expected.test(f));
      if (found) break;
      await new Promise((r) => setTimeout(r, 250));
    }

    expect(found, `no matching .md file in ${downloadDir}`).toBeDefined();
    const contents = readFileSync(resolve(downloadDir, found!), 'utf8');
    expect(contents).toContain('E2E Test Article');
    expect(contents).toContain('lazy dog');
  } finally {
    await context.close();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
