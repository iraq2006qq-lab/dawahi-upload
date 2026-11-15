'use strict';

export const ALLOWED_EXTENSIONS = new Set(['gif', 'mp4', 'mov', 'png', 'jpg', 'jpeg', 'webp']);

export function detectTrueFileType(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength < 12) return null;
  const buffer = new Uint8Array(arrayBuffer, 0, Math.min(arrayBuffer.byteLength, 64));

  // GIF87a / GIF89a
  if (
    buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 &&
    buffer[3] === 0x38 && (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61
  ) {
    return { ext: 'gif', mime: 'image/gif' };
  }

  // PNG
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    return { ext: 'png', mime: 'image/png' };
  }

  // JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }

  // RIFF....WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }

  // ISO Base Media File Format (MP4 / MOV) -> 'ftyp' at offset 4
  if (
    buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70
  ) {
    const majorBrand = String.fromCharCode(buffer[8], buffer[9], buffer[10], buffer[11]);
    if (majorBrand === 'qt  ') {
      return { ext: 'mov', mime: 'video/quicktime' };
    }
    return { ext: 'mp4', mime: 'video/mp4' };
  }

  // Legacy QuickTime MOV atoms ('moov', 'wide', 'mdat') at offset 4
  const topAtom = String.fromCharCode(buffer[4], buffer[5], buffer[6], buffer[7]);
  if (topAtom === 'moov' || topAtom === 'wide' || topAtom === 'mdat') {
    return { ext: 'mov', mime: 'video/quicktime' };
  }

  return null;
}

export function extractOwnerToken(request) {
  const token = String(request.headers.get('X-Dawahi-Owner-Token') || '').trim();
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(token)) return null;
  return token;
}

export function generateHexId(byteLength = 8) {
  const arr = new Uint8Array(byteLength);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function resolvePublicBaseUrl(request, env) {
  const configured = env && env.PUBLIC_BASE_URL ? String(env.PUBLIC_BASE_URL).trim() : '';
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  return new URL(request.url).origin;
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
