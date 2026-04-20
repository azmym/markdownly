import { Readability } from '@mozilla/readability';
import { preprocess } from './preprocess';
import { htmlToMarkdown } from '../shared/turndown-config';
import type { ExtractionResult } from '../shared/types';

function run(): ExtractionResult {
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

// Executes immediately when injected via chrome.scripting.executeScript({ files }).
// The last expression is the InjectionResult.result (structured-cloneable).
// Assigning to a variable avoids tree-shaking; leaving it as the trailing
// expression makes it the script's return value.
const __pageToMarkdownResult = run();
(globalThis as unknown as { __pageToMarkdownResult: ExtractionResult }).__pageToMarkdownResult =
  __pageToMarkdownResult;
__pageToMarkdownResult;
