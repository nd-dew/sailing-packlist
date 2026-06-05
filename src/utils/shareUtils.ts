export interface SharedLuggage {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface SharedCategory {
  id: string;
  title: string;
  priority?: 'must-have' | 'should-have' | 'nice-to-have';
}

export interface SharedPayload {
  v: number;         // Protocol version
  p: string;         // Preset name (e.g. "med_blueward_26")
  lugs: SharedLuggage[]; // Luggage bags definition
  cats: (string | SharedCategory)[]; // Active category IDs in order, or custom Category structures
  l: number[];       // Array of luggage indices (matching lugs array) for each preset item in static order. -1 if unassigned.
  c?: {              // Custom items added by the user
    n: string;       // Item name
    cat: string;     // Category ID
    b: number;       // Bag index. -1 if unassigned.
  }[];
}

// Helper: Convert Uint8Array to URL-safe Base64 (base64url)
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Helper: Convert URL-safe Base64 back to Uint8Array
function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Async Compression: JSON String -> Deflated Base64url
export async function compressPayload(payload: SharedPayload): Promise<string> {
  const jsonStr = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(jsonStr);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  });
  const compressedStream = stream.pipeThrough(new CompressionStream('deflate'));
  const buffer = await new Response(compressedStream).arrayBuffer();
  return bytesToBase64Url(new Uint8Array(buffer));
}

// Async Decompression: Deflated Base64url -> JSON String -> SharedPayload
export async function decompressPayload(hash: string): Promise<SharedPayload> {
  const bytes = base64UrlToBytes(hash);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  });
  const decompressedStream = stream.pipeThrough(new DecompressionStream('deflate'));
  const jsonStr = await new Response(decompressedStream).text();
  return JSON.parse(jsonStr) as SharedPayload;
}
