'use strict';

import {
  detectTrueFileType,
  extractOwnerToken,
  generateHexId,
  resolvePublicBaseUrl,
  jsonResponse,
} from '../../_shared/r2-utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (!env || !env.R2_BUCKET) {
      return jsonResponse(
        {
          error:
            'حاوية التخزين R2 غير مربوطة بعد. افتح إعدادات مشروعك في Cloudflare Pages -> Settings -> Functions -> R2 bucket bindings وأضف متغيراً باسم R2_BUCKET.',
        },
        503
      );
    }

    const ownerToken = extractOwnerToken(request);
    if (!ownerToken) {
      return jsonResponse({ error: 'رمز الجلسة غير صالح.' }, 400);
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
      return jsonResponse({ error: 'لم يتم استلام أي ملف صالح.' }, 400);
    }

    const maxMb = Number(env.MAX_DIRECT_FILE_MB || 100);
    const maxBytes = maxMb * 1024 * 1024;

    if (file.size <= 0) {
      return jsonResponse({ error: 'الملف فارغ (0 بايت).' }, 400);
    }

    if (file.size > maxBytes) {
      return jsonResponse(
        { error: `حجم الملف يتجاوز الحد الأقصى المسموح به (${maxMb} MB).` },
        413
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const detected = detectTrueFileType(arrayBuffer);

    if (!detected) {
      return jsonResponse(
        {
          error:
            'تم رفض الملف: محتوى الملف الفعلي لا يطابق صيغ GIF أو MP4 أو MOV أو PNG أو JPG أو WEBP.',
        },
        415
      );
    }

    const rawName = String(file.name || 'file');
    const dotPos = rawName.lastIndexOf('.');
    const origExt = dotPos >= 0 ? rawName.slice(dotPos + 1).toLowerCase() : '';
    const finalExt = detected.ext === 'jpg' && origExt === 'jpeg' ? 'jpeg' : detected.ext;

    const uniqueId = generateHexId(8);
    const fileNameOnStorage = `${uniqueId}.${finalExt}`;
    const storageKey = `files/${fileNameOnStorage}`;

    const baseUrl = resolvePublicBaseUrl(request, env);
    const directUrl = `${baseUrl}/files/${fileNameOnStorage}`;

    const cleanBaseName = rawName.split(/[\\/]/).pop().slice(0, 160) || fileNameOnStorage;
    const createdAt = new Date().toISOString();

    await env.R2_BUCKET.put(storageKey, arrayBuffer, {
      httpMetadata: {
        contentType: detected.mime,
        contentDisposition: 'inline',
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: {
        ownerToken,
        originalName: encodeURIComponent(cleanBaseName),
        extension: finalExt,
        createdAt,
      },
    });

    return jsonResponse(
      {
        id: uniqueId,
        originalName: cleanBaseName,
        extension: finalExt,
        mimeType: detected.mime,
        sizeBytes: file.size,
        directUrl,
        createdAt,
      },
      201
    );
  } catch (err) {
    return jsonResponse(
      { error: 'حدث خطأ أثناء رفع الملف إلى مخزن Cloudflare R2.' },
      500
    );
  }
}
