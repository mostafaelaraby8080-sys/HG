# موقع HG

HTML + دوال Vercel (api/products.js) + MongoDB.

## الملفات

- index.html : الموقع ولوحة التحكم (/#admin)
- banner.jpg , shop.jpg : صور البانر والمحل
- api/products.js : الـ API اللي بيكلم MongoDB
- package.json : مكتبة mongodb
- .env.example : مثال للمتغيرات (متحطش الملف الحقيقي على GitHub)

## المتغيرات (Environment Variables)

- MONGODB_URI : رابط الاتصال من MongoDB Atlas
- ADMIN_PASSWORD : HG@2026#Admin (غيّرها زي ما تحب)

## التشغيل المحلي

npm i -g vercel
npm install
vercel dev
(حط المتغيرات في ملف .env.local أو أضفها وقت الـ vercel link)
