import { describe, expect, it } from 'vitest';
import { slugify } from '../../src/shared/slugify';

describe('slugify', () => {
  it('handles ASCII happy path', () => {
    expect(slugify('How to Use Claude')).toBe('how-to-use-claude');
  });

  it('lowercases', () => {
    expect(slugify('HELLO World')).toBe('hello-world');
  });

  it('collapses runs of non-alphanumerics to a single dash', () => {
    expect(slugify('hello   world---foo/bar')).toBe('hello-world-foo-bar');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('---hello world---')).toBe('hello-world');
  });

  it('normalizes accents via NFKD and strips combining marks', () => {
    expect(slugify('Crème brûlée')).toBe('creme-brulee');
  });

  it('strips emoji and pictographs', () => {
    expect(slugify('🎉 Party Time 🎊')).toBe('party-time');
  });

  it('returns "untitled" for pure emoji input', () => {
    expect(slugify('🎉🎉🎉')).toBe('untitled');
  });

  it('returns "untitled" for empty input', () => {
    expect(slugify('')).toBe('untitled');
  });

  it('returns "untitled" for whitespace-only input', () => {
    expect(slugify('   \t\n  ')).toBe('untitled');
  });

  it('returns "untitled" when CJK input has no alphanumerics', () => {
    expect(slugify('日本語のタイトル')).toBe('untitled');
  });

  it('prefixes Windows-reserved basenames with "page-"', () => {
    expect(slugify('CON')).toBe('page-con');
    expect(slugify('prn')).toBe('page-prn');
    expect(slugify('COM1')).toBe('page-com1');
    expect(slugify('LPT9')).toBe('page-lpt9');
    expect(slugify('aux')).toBe('page-aux');
    expect(slugify('nul')).toBe('page-nul');
  });

  it('does not prefix names that merely start with a reserved word', () => {
    expect(slugify('conference')).toBe('conference');
    expect(slugify('com10')).toBe('com10');
  });

  it('truncates to 80 chars, rewinding to preceding dash', () => {
    const long = 'a'.repeat(50) + ' ' + 'b'.repeat(50);
    const result = slugify(long);
    expect(result.length).toBeLessThanOrEqual(80);
    expect(result.endsWith('-')).toBe(false);
    expect(result).toBe('a'.repeat(50));
  });

  it('truncates hard (no preceding dash in first 80 chars) by cutting at 80', () => {
    const result = slugify('a'.repeat(200));
    expect(result.length).toBe(80);
  });

  it('strips control characters', () => {
    expect(slugify('hello\u0000\u0007world')).toBe('hello-world');
  });

  it('handles mixed case with punctuation and numbers', () => {
    expect(slugify("React 18.2: What's New?")).toBe('react-18-2-what-s-new');
  });
});
