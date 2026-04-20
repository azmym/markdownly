const CHUNK = 0x8000;

function bytesToBase64(bytes: Uint8Array): string {
  // btoa accepts only Latin-1; chunk to avoid call-stack limits on large inputs.
  let bin = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK);
    bin += String.fromCharCode(...slice);
  }
  return btoa(bin);
}

export function markdownToDataUrl(markdown: string): string {
  const bytes = new TextEncoder().encode(markdown);
  const b64 = bytesToBase64(bytes);
  return `data:text/markdown;charset=utf-8;base64,${b64}`;
}
