import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFilename } from '../../src/shared/filename';

describe('buildFilename', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 20, 14, 30, 0)); // April 20, 2026 local
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('composes slug + local date + .md', () => {
    expect(buildFilename('How to Use Claude')).toBe('how-to-use-claude-2026-04-20.md');
  });

  it('uses "untitled" for empty titles', () => {
    expect(buildFilename('')).toBe('untitled-2026-04-20.md');
  });

  it('uses "untitled" for pure-emoji titles', () => {
    expect(buildFilename('🎉🎉🎉')).toBe('untitled-2026-04-20.md');
  });

  it('prefixes Windows-reserved with page-', () => {
    expect(buildFilename('CON')).toBe('page-con-2026-04-20.md');
  });

  it('zero-pads single-digit months and days', () => {
    // Jan 5 — confirm zero-padding
    vi.setSystemTime(new Date(2026, 0, 5, 9, 0, 0));
    expect(buildFilename('hello')).toBe('hello-2026-01-05.md');
  });

  it('uses local date, not UTC, across midnight boundary', () => {
    // 2026-04-20 23:30 local. In UTC this is either still the 20th or the 21st
    // depending on offset, but local-date MUST say the 20th.
    vi.setSystemTime(new Date(2026, 3, 20, 23, 30, 0));
    expect(buildFilename('x')).toBe('x-2026-04-20.md');
  });

  it('composes untitled for CJK-only titles', () => {
    expect(buildFilename('日本語')).toBe('untitled-2026-04-20.md');
  });
});
