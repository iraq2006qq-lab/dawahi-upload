'use strict';

const MIME_BY_EXT = {
  gif: 'image/gif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export async function onRequestGet(context) {
  const { request, env, params } = context;

  if (!env || !env.R2_BUCKET) {
    return new Response('R2_BUCKET binding is not configured', { status: 503 });
  }

  const filename = String((params && params.filename) || '').trim();
  const match = filename.match(/^[a-f0-9]{16}\.(gif|mp4|mov|png|jpg|jpeg|webp)$/i);
  if (!match) {
    return new Response('File Not Found', { status: 404 });
  }

  const ext = match[1].toLowerCase();
  const storageKey = `files/${filename}`;
  const rangeHeader = request.headers.get('range');

  const obj = await env.R2_BUCKET.get(storageKey, {
    range: rangeHeader ? request.headers : undefined,
  });

  if (!obj) {
    return new Response('File Not Found', { status: 404 });
  }

  const headers = new Headers();
  headers.set(
    'Content-Type',
    (obj.httpMetadata && obj.httpMetadata.contentType) || MIME_BY_EXT[ext] || 'application/octet-stream'
  );
  headers.set('Content-Disposition', 'inline');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Access-Control-Allow-Origin', '*');

  if (obj.range && typeof obj.range.offset === 'number' && typeof obj.range.length === 'number') {
    const start = obj.range.offset;
    const end = start + obj.range.length - 1;
    headers.set('Content-Range', `bytes ${start}-${end}/${obj.size}`);
    headers.set('Content-Length', String(obj.range.length));
    return new Response(obj.body, { status: 206, headers });
  }

  headers.set('Content-Length', String(obj.size));
  return new Response(obj.body, { status: 200, headers });
}

export async function onRequestHead(context) {
  const { env, params } = context;

  if (!env || !env.R2_BUCKET) {
    return new Response(null, { status: 503 });
  }

  const filename = String((params && params.filename) || '').trim();
  const match = filename.match(/^[a-f0-9]{16}\.(gif|mp4|mov|png|jpg|jpeg|webp)$/i);
  if (!match) {
    return new Response(null, { status: 404 });
  }

  const ext = match[1].toLowerCase();
  const obj = await env.R2_BUCKET.head(`files/${filename}`);
  if (!obj) {
    return new Response(null, { status: 404 });
  }

  const headers = new Headers();
  headers.set(
    'Content-Type',
    (obj.httpMetadata && obj.httpMetadata.contentType) || MIME_BY_EXT[ext] || 'application/octet-stream'
  );
  headers.set('Content-Disposition', 'inline');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Length', String(obj.size));
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(null, { status: 200, headers });
}
