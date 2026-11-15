# DAWAHI UPLOAD | دواهي ابلود — نسخة Cloudflare Pages + R2 (تعمل 24/7 بدون توقف)

## محتويات الحزمة
- `index.html`: الواجهة الكاملة (محوّل الفيديو وملفات MOV الشفافة إلى GIF بحد 7.5MB + قسم **رابط مباشر | Direct Link**).
- `functions/api/files/upload.js`: دالة رفع الملفات مباشرة إلى Cloudflare R2 (حتى 100 MB) مع فحص توقيع الملفات الفعلي (Magic Bytes).
- `functions/api/files/index.js`: دالة جلب قائمة ملفاتك الدائمة المحفوظة في R2.
- `functions/api/files/[id].js`: دالة حذف الملفات من R2 عند طلبك.
- `functions/files/[filename].js`: دالة عرض الملفات مباشرة (Inline) مع دعم البث الجزئي Range للفيديو.
- `_routes.json`: توجيه ذكي يخدم الواجهة من شبكة CDN المجانية فوراً ويشغّل الدوال عند الرفع فقط.
- `wrangler.toml`: إعدادات المشروع الجاهزة لـ Cloudflare Pages.

## خطوات التشغيل على Cloudflare Pages (مجاناً وبدون وضع سكون)
1. أنشئ حاوية تخزين في **Cloudflare R2** باسم `dawahi-upload-files`.
2. ارفع ملفات هذه الحزمة إلى مستودع جديد في **GitHub** (أو عبر `npx wrangler pages deploy .`).
3. في لوحة تحكم **Cloudflare -> Workers & Pages -> Create -> Pages -> Connect to Git**، اختر المستودع واضغط **Save and Deploy** (اترك Build command فارغاً).
4. بعد النشر، افتح مشروعك في Pages ثم اذهب إلى:
   **Settings -> Functions -> R2 bucket bindings -> Add binding**:
   - **Variable name**: `R2_BUCKET`
   - **R2 bucket**: `dawahi-upload-files`
5. أعد نشر آخر نسخة (Retry deployment) من تبويب **Deployments** ليتفعّل الربط فوراً.
6. (اختياري) إذا ربطت دومينك الخاص بـ Cloudflare Pages أو فعّلت `r2.dev` للحاوية، أضف في **Settings -> Environment variables** متغيراً باسم `PUBLIC_BASE_URL` وقيمته رابط موقعك (مثل `https://dawahi-upload.com`).
