'use strict';

import { extractOwnerToken, jsonResponse } from '../../_shared/r2-utils.js';

export async function onRequestDelete(context) {
  const { request, env, params } = context;

  try {
    if (!env || !env.R2_BUCKET) {
      return jsonResponse({ error: 'حاوية التخزين R2 غير مربوطة بالمشروع.' }, 503);
    }

    const ownerToken = extractOwnerToken(request);
    const fileId = String((params && params.id) || '').trim();

    if (!ownerToken || !/^[a-f0-9]{16}$/.test(fileId)) {
      return jsonResponse({ error: 'طلب حذف غير صالح.' }, 400);
    }

    const listed = await env.R2_BUCKET.list({
      prefix: `files/${fileId}.`,
      include: ['customMetadata'],
    });

    const targetObj = listed.objects.find((obj) => {
      const meta = obj.customMetadata || {};
      return meta.ownerToken === ownerToken;
    });

    if (!targetObj) {
      return jsonResponse({ error: 'الملف غير موجود أو لا تملك صلاحية حذفه.' }, 404);
    }

    await env.R2_BUCKET.delete(targetObj.key);
    return jsonResponse({ deleted: true, id: fileId }, 200);
  } catch (_) {
    return jsonResponse({ error: 'تعذّر حذف الملف من مخزن Cloudflare R2.' }, 500);
  }
}
