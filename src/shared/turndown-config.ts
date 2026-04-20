import TurndownService from 'turndown';
// @ts-expect-error: turndown-plugin-gfm has no types
import { gfm } from 'turndown-plugin-gfm';

export function createTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    fence: '```',
    bulletListMarker: '-',
    emDelimiter: '_',
    strongDelimiter: '**',
    linkStyle: 'inlined',
  });

  td.use(gfm);

  td.addRule('fencedCodeBlock', {
    filter: (node) =>
      node.nodeName === 'PRE' &&
      node.firstChild !== null &&
      node.firstChild.nodeName === 'CODE',
    replacement: (_content, node) => {
      const code = (node as HTMLElement).firstChild as HTMLElement;
      const className = code.getAttribute('class') ?? '';
      const match = className.match(/(?:language|lang|hljs)-([\w-]+)/);
      const lang = match ? match[1] : '';
      const body = code.textContent ?? '';
      return `\n\n\`\`\`${lang}\n${body}\n\`\`\`\n\n`;
    },
  });

  return td;
}

export function htmlToMarkdown(html: string): string {
  return createTurndown().turndown(html);
}
