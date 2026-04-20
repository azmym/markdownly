export type ExtractionResult =
  | { kind: 'ok'; title: string; markdown: string }
  | { kind: 'empty' }
  | { kind: 'error'; message: string };
