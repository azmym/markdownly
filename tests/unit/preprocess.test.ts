import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { preprocess } from '../../src/content/preprocess';
import { htmlToMarkdown } from '../../src/shared/turndown-config';

function loadFixture(name: string): { html: string; expected: string } {
  const base = resolve(__dirname, '..', 'fixtures', name);
  return {
    html: readFileSync(`${base}.html`, 'utf8'),
    expected: readFileSync(`${base}.expected.md`, 'utf8').trimEnd(),
  };
}

describe('preprocess', () => {
  it('promotes data-src and data-original to src', () => {
    document.body.innerHTML = `
      <img data-src="https://x/a.jpg" alt="A">
      <img data-original="https://x/b.jpg" alt="B">
      <img src="https://x/c.jpg" alt="C">
    `;
    preprocess(document.body);
    const srcs = [...document.body.querySelectorAll('img')].map((i) => i.getAttribute('src'));
    expect(srcs).toEqual(['https://x/a.jpg', 'https://x/b.jpg', 'https://x/c.jpg']);
  });

  it('does not overwrite an existing src', () => {
    document.body.innerHTML =
      `<img data-src="https://x/lazy.jpg" src="https://x/real.jpg" alt="">`;
    preprocess(document.body);
    expect(document.body.querySelector('img')!.getAttribute('src')).toBe('https://x/real.jpg');
  });

  it('strips <script>, <style>, <noscript>, <iframe>', () => {
    document.body.innerHTML = `
      <p>keep</p>
      <script>evil()</script>
      <style>.x{}</style>
      <noscript>fallback</noscript>
      <iframe src="https://x"></iframe>
    `;
    preprocess(document.body);
    expect(document.body.querySelector('script')).toBeNull();
    expect(document.body.querySelector('style')).toBeNull();
    expect(document.body.querySelector('noscript')).toBeNull();
    expect(document.body.querySelector('iframe')).toBeNull();
    expect(document.body.querySelector('p')).not.toBeNull();
  });

  it('produces expected markdown for lazy-images fixture end to end', () => {
    const { html, expected } = loadFixture('lazy-images');
    document.body.innerHTML = html;
    const article = document.querySelector('article')!;
    preprocess(article);
    const md = htmlToMarkdown(article.innerHTML).trimEnd();
    expect(md).toBe(expected);
  });
});
