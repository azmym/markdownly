const WINDOWS_RESERVED = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

const MAX_LEN = 80;
const MIN_REWIND = 20;

export function slugify(input: string): string {
  let s = input.normalize('NFKD');
  s = s.replace(/\p{M}/gu, '');
  s = s.replace(/\p{Extended_Pictographic}/gu, '');
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, '-');
  s = s.replace(/-+/g, '-');
  s = s.replace(/^-|-$/g, '');

  if (WINDOWS_RESERVED.has(s)) {
    s = `page-${s}`;
  }

  if (s.length > MAX_LEN) {
    const cut = s.slice(0, MAX_LEN);
    const lastDash = cut.lastIndexOf('-');
    s = lastDash >= MIN_REWIND ? cut.slice(0, lastDash) : cut;
  }

  return s || 'untitled';
}
