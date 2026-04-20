import { Readability } from '@mozilla/readability';
import { preprocess } from './preprocess';
import { htmlToMarkdown } from '../shared/turndown-config';
import type { ExtractionResult } from '../shared/types';

/**
 * Runs in the tab's isolated world when the background service worker
 * invokes it via chrome.scripting.executeScript({ func: runExtract }).
 * Returns a structured-cloneable ExtractionResult back to the SW.
 *
 * The function is self-contained at build time: Vite/crxjs inlines
 * Readability, preprocess, and htmlToMarkdown when emitting the
 * background bundle that references this symbol.
 */
export function runExtract(): ExtractionResult {
  try {
    const clone = document.cloneNode(true) as Document;
    preprocess(clone.documentElement);

    const parsed = new Readability(clone).parse();
    if (!parsed || !parsed.content || parsed.content.trim() === '') {
      return { kind: 'empty' };
    }

    const title = (parsed.title ?? document.title ?? '').trim();
    const markdown = htmlToMarkdown(parsed.content).trim();

    if (!markdown) return { kind: 'empty' };

    return { kind: 'ok', title, markdown };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { kind: 'error', message };
  }
}
