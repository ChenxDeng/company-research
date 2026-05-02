// lib/font-loader.ts

let cachedFontBase64: string | null = null;

export async function loadChineseFont(): Promise<string> {
  if (cachedFontBase64) return cachedFontBase64;

  const response = await fetch("/fonts/NotoSansSC-Regular.ttf");
  if (!response.ok) {
    throw new Error(`Failed to load font: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  cachedFontBase64 = btoa(binary);
  return cachedFontBase64;
}
