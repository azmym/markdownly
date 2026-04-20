import { runExtract } from './extract';
import type { ExtractionResult } from '../shared/types';

// Top-level entry injected via chrome.scripting.executeScript({ files: ['content.js'] }).
// Vite bundles this as an IIFE with Readability, Turndown, and preprocess
// inlined into the same closure, so runExtract() can reference them. The
// result is stashed on the isolated-world global; the service worker reads
// it back via a second executeScript({ func }) call. The isolated world
// prevents the page from seeing or overwriting the value.
(globalThis as unknown as { __pageToMarkdownResult: ExtractionResult }).__pageToMarkdownResult =
  runExtract();
