import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { htmlToMarkdown } from '../../src/shared/turndown-config';

function fixture(name: string): { html: string; expected: string } {
  const base = resolve(__dirname, '..', 'fixtures', name);
  return {
    html: readFileSync(`${base}.html`, 'utf8'),
    expected: readFileSync(`${base}.expected.md`, 'utf8').trimEnd(),
  };
}

function extractArticle(html: string): string {
  // happy-dom is the Vitest environment. Pull out the first <article>;
  // fall back to body.
  document.body.innerHTML = html;
  const article = document.querySelector('article');
  return article ? article.innerHTML : document.body.innerHTML;
}

describe('htmlToMarkdown', () => {
  it('converts semantic blog post', () => {
    const { html, expected } = fixture('blog-semantic');
    const md = htmlToMarkdown(extractArticle(html)).trimEnd();
    expect(md).toBe(expected);
  });

  it('converts GitHub-style README with fenced code + language hints', () => {
    const { html, expected } = fixture('github-readme');
    const md = htmlToMarkdown(extractArticle(html)).trimEnd();
    expect(md).toBe(expected);
  });

  it('converts GFM tables', () => {
    const { html, expected } = fixture('simple-table');
    const md = htmlToMarkdown(extractArticle(html)).trimEnd();
    expect(md).toBe(expected);
  });
});
