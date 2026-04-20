import { describe, expect, it } from 'vitest';
import { markdownToDataUrl } from '../../src/shared/data-url';

function decodeDataUrl(url: string): string {
  const prefix = 'data:text/markdown;charset=utf-8;base64,';
  expect(url.startsWith(prefix)).toBe(true);
  const b64 = url.slice(prefix.length);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

describe('markdownToDataUrl', () => {
  it('round-trips ASCII', () => {
    const md = '# Hello\n\nWorld';
    expect(decodeDataUrl(markdownToDataUrl(md))).toBe(md);
  });

  it('round-trips multi-byte UTF-8 (emoji, CJK, accents)', () => {
    const md = '# 日本語\n\nCrème brûlée 🎉';
    expect(decodeDataUrl(markdownToDataUrl(md))).toBe(md);
  });

  it('round-trips a large (1 MB) string', () => {
    const md = 'a'.repeat(1_048_576);
    expect(decodeDataUrl(markdownToDataUrl(md))).toBe(md);
  });

  it('starts with the correct prefix', () => {
    expect(markdownToDataUrl('x')).toMatch(/^data:text\/markdown;charset=utf-8;base64,/);
  });
});
