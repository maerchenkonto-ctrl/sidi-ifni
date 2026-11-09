// غيّر رقم الإصدار عند تغيير ملفات ثابتة مثل الأيقونات أو الصور
const CACHE = 'sidi-ifni-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  // كل ملف على حدة: غياب ملف واحد لا يُفشل تثبيت الـ Service Worker
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(ASSETS.map(a => c.add(a)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // لا نتعامل إلا مع ملفات الموقع نفسه (الجدول والخطوط والصوت الخارجي يتولاها المتصفح)
  if (url.origin !== self.location.origin) return;
  // الفيديو يستخدم طلبات Range والردود الجزئية (206) لا يمكن تخزينها
  if (req.headers.has('range')) return;

  // الصفحة: الشبكة أولاً حتى يرى الزبون آخر نسخة، وإن تأخرت الشبكة نستخدم النسخة المخزنة
  if (req.mode === 'navigate') {
    e.respondWith(
      new Promise(resolve => {
        const fallback = () => caches.match('./index.html').then(r => r || caches.match('./'));
        const timer = setTimeout(() => fallback().then(r => r && resolve(r)), 4000);
        fetch(req)
          .then(res => {
            clearTimeout(timer);
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then(c => c.put('./index.html', copy));
            }
            resolve(res);
          })
          .catch(() => {
            clearTimeout(timer);
            fallback().then(r => resolve(r || Response.error()));
          });
      })
    );
    return;
  }

  // باقي ملفات الموقع (أيقونات، صور): المخزن أولاً مع تحديث في الخلفية
  e.respondWith(
    caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req)
        .then(res => {
          if (res && res.status === 200) c.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      return hit || (await net) || Response.error();
    })
  );
});
