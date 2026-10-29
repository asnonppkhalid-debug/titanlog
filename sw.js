/* TITANLOG service worker — يخزّن ملفات التطبيق فقط. بيانات التمارين في IndexedDB ولا يلمسها هذا الملف أبداً. */
var V = 'titanlog-static-v3.5.0';
var FILES = ['index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];
var WAIT = 4000; // إذا الشبكة بطيئة/ضعيفة (مثل قاعة التمرين) نفتح النسخة المخزّنة بعد ٤ ثواني بدل ما نعلّق
// نثبّت بدون ما نستخدم كاش المتصفح حتى نخزّن آخر نسخة فعلاً
self.addEventListener('install', function (e) { e.waitUntil(caches.open(V).then(function (c) { return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('titanlog-static-') === 0 && k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET') return;
  var u = new URL(r.url); if (u.origin !== location.origin) return;
  if (r.mode === 'navigate') {
    // الشبكة أولاً (نتأكد من وجود تحديث دائماً، بدون ما نعتمد على كاش المتصفح)، والنسخة المخزّنة احتياط: بدون إنترنت أو إذا تأخرت الشبكة.
    // حتى لو فتحنا من الكاش، نكمّل التحميل بالخلفية ونحدّث الكاش حتى الفتحة الجاية تكون آخر نسخة.
    var net = fetch(r, { cache: 'no-cache' });
    e.waitUntil(net.then(function (res) { if (!res.ok) return; var cp = res.clone(); return caches.open(V).then(function (c) { return c.put('index.html', cp); }); }).catch(function () {}));
    e.respondWith(new Promise(function (resolve) {
      var done = false;
      function use(res) { if (!done) { done = true; resolve(res); } }
      var timer = setTimeout(function () { caches.match('index.html').then(function (m) { if (m) use(m); }); }, WAIT);
      net.then(function (res) { clearTimeout(timer); use(res); }, function () { clearTimeout(timer); caches.match('index.html').then(function (m) { use(m || Response.error()); }); });
    }));
    return;
  }
  e.respondWith(caches.match(r).then(function (m) { return m || fetch(r).then(function (res) { if (res.ok) { var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); } return res; }); }));
});
