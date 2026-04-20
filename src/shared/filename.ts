import { slugify } from './slugify';

export function buildFilename(title: string, now: Date = new Date()): string {
  const slug = slugify(title);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${slug}-${year}-${month}-${day}.md`;
}
