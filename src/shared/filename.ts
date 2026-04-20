import { slugify } from './slugify';

export function buildFilename(title: string, now: Date = new Date()): string {
  const slug = slugify(title);
  const date = now.toLocaleDateString('sv-SE'); // yields YYYY-MM-DD
  return `${slug}-${date}.md`;
}
