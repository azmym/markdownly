const LAZY_ATTRS = ['data-src', 'data-original'];

export function preprocess(root: Element): void {
  // Promote lazy image attributes to src where src is missing.
  root.querySelectorAll('img').forEach((img) => {
    if (img.getAttribute('src')) return;
    for (const attr of LAZY_ATTRS) {
      const v = img.getAttribute(attr);
      if (v) {
        img.setAttribute('src', v);
        return;
      }
    }
  });

  // Handle data-srcset, first URL in srcset list becomes src if still missing.
  root.querySelectorAll('img').forEach((img) => {
    if (img.getAttribute('src')) return;
    const srcset = img.getAttribute('data-srcset');
    if (srcset) {
      const first = srcset.split(',')[0]?.trim().split(/\s+/)[0];
      if (first) img.setAttribute('src', first);
    }
  });

  // Strip non-content tags.
  root.querySelectorAll('script, style, noscript, iframe').forEach((el) => el.remove());
}
