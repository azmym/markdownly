import TurndownService from 'turndown';
// @ts-expect-error: turndown-plugin-gfm has no types
import { gfm } from 'turndown-plugin-gfm';

function findCodeChild(pre: Node): HTMLElement | null {
  let child = pre.firstChild;
  while (child) {
    if (child.nodeType === 3 /* TEXT_NODE */) {
      const v = child.nodeValue ?? '';
      if (v.trim() === '') {
        child = child.nextSibling;
        continue;
      }
      return null; // non-whitespace text before <code>: not our case
    }
    return child.nodeName === 'CODE' ? (child as HTMLElement) : null;
  }
  return null;
}

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
    filter: (node) => {
      if (node.nodeName !== 'PRE') return false;
      return findCodeChild(node) !== null;
    },
    replacement: (_content, node) => {
      const code = findCodeChild(node as HTMLElement);
      if (!code) return '';
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
