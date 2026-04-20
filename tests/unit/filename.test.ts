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

  it('uses sv-SE locale so the date is ISO-formatted', () => {
    // Jan 5 — confirm zero-padding
    vi.setSystemTime(new Date(2026, 0, 5, 9, 0, 0));
    expect(buildFilename('hello')).toBe('hello-2026-01-05.md');
  });
});
