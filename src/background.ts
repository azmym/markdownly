import { runExtract } from './content/extract';
import { buildFilename } from './shared/filename';
import { markdownToDataUrl } from './shared/data-url';
import type { ExtractionResult } from './shared/types';

const RESTRICTED_PREFIXES = [
  'chrome://',
  'edge://',
  'about:',
  'chrome-extension://',
  'moz-extension://',
  'file://',
];
const RESTRICTED_HOSTS = new Set([
  'chromewebstore.google.com',
  'chrome.google.com',
  'addons.mozilla.org',
]);
const WATCHDOG_MS = 30_000;

function isRestricted(url: string | undefined): boolean {
  if (!url) return true;
  if (RESTRICTED_PREFIXES.some((p) => url.startsWith(p))) return true;
  try {
    const host = new URL(url).hostname;
    return RESTRICTED_HOSTS.has(host);
  } catch {
    return true;
  }
}

async function notify(title: string, message: string): Promise<void> {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/128.png',
      title,
      message,
    });
  } catch {
    // notifications permission should be present, but never let a notify
    // failure mask the real error.
  }
}

async function withWatchdog<T>(p: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('__p2m_timeout__')), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

async function handle(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id || isRestricted(tab.url)) {
    await notify('Page to Markdown', "This page type can't be converted.");
    return;
  }

  let result: ExtractionResult;
  try {
    const injection = await withWatchdog(
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: runExtract,
      }),
      WATCHDOG_MS,
    );
    const first = injection?.[0];
    if (!first || first.result === undefined) {
      await notify('Page to Markdown', 'Conversion failed. Try reloading the page.');
      return;
    }
    result = first.result as ExtractionResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === '__p2m_timeout__') {
      await notify('Page to Markdown', 'Page took too long to convert.');
    } else {
      await notify('Page to Markdown', 'Conversion failed. Try reloading the page.');
    }
    return;
  }

  if (result.kind === 'empty') {
    await notify('Page to Markdown', "Couldn't find an article on this page.");
    return;
  }
  if (result.kind === 'error') {
    await notify('Page to Markdown', 'Conversion failed.');
    return;
  }

  const filename = buildFilename(result.title);
  const url = markdownToDataUrl(result.markdown);

  try {
    await chrome.downloads.download({
      url,
      filename,
      saveAs: false,
      conflictAction: 'uniquify',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await notify('Page to Markdown', msg.slice(0, 120));
  }
}

chrome.action.onClicked.addListener((tab) => {
  // Fire and forget: SW listener return value is ignored by the runtime,
  // so we do not await here; unhandled errors bubble to a top-level notify.
  handle(tab).catch(async (err) => {
    const msg = err instanceof Error ? err.message : String(err);
    await notify('Page to Markdown', `Unexpected error: ${msg.slice(0, 100)}`);
  });
});
