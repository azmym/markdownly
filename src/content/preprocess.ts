const LAZY_ATTRS = ['data-src', 'data-original'];

/**
 * Mutates `root` in place: promotes lazy-image attributes to `src` and
 * removes <script>/<style>/<noscript>/<iframe>. Callers MUST pass a cloned
 * subtree, never the live document. See spec §5 step 5.
 */
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
      // Naive parse: assumes srcset grammar (no unescaped commas in URLs).
      // data: URLs or CDN comma-delimited query params will be truncated.
      // Best-effort per spec §9 row 5.
      const first = srcset.split(',')[0]?.trim().split(/\s+/)[0];
      if (first) img.setAttribute('src', first);
    }
  });

  // Strip non-content tags.
  root.querySelectorAll('script, style, noscript, iframe').forEach((el) => el.remove());
}
