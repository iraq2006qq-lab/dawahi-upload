'use strict';

import { extractOwnerToken, resolvePublicBaseUrl, jsonResponse } from '../../_shared/r2-utils.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env || !env.R2_BUCKET) {
    return jsonResponse({ files: [], warning: 'R2_BUCKET_NOT_BOUND' }, 200);
  }

  const ownerToken = extractOwnerToken(request);
  if (!ownerToken) {
    return jsonResponse({ files: [] }, 200);
  }

  const baseUrl = resolvePublicBaseUrl(request, env);
  const userFiles = [];
  let cursor = undefined;

  do {
    const listed = await env.R2_BUCKET.list({
      prefix: 'files/',
      cursor,
      include: ['httpMetadata', 'customMetadata'],
    });

    for (const obj of listed.objects) {
      const meta = obj.customMetadata || {};
      if (meta.ownerToken !== ownerToken) continue;

      const fileNameOnStorage = obj.key.replace(/^files\//, '');
      const dotIdx = fileNameOnStorage.lastIndexOf('.');
      const id = dotIdx > 0 ? fileNameOnStorage.slice(0, dotIdx) : fileNameOnStorage;
      const ext = meta.extension || (dotIdx > 0 ? fileNameOnStorage.slice(dotIdx + 1) : '');

      let originalName = fileNameOnStorage;
      if (meta.originalName) {
        try {
          originalName = decodeURIComponent(meta.originalName);
        } catch (_) {
          originalName = meta.originalName;
        }
      }

      userFiles.push({
        id,
        originalName,
        extension: ext,
        mimeType: (obj.httpMetadata && obj.httpMetadata.contentType) || 'application/octet-stream',
        sizeBytes: obj.size,
        directUrl: `${baseUrl}/files/${fileNameOnStorage}`,
        createdAt: meta.createdAt || (obj.uploaded ? obj.uploaded.toISOString() : new Date().toISOString()),
      });
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  userFiles.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return jsonResponse({ files: userFiles }, 200);
}
