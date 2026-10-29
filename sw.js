// Service Worker del Gestor de Refuerzo: la app funciona sin conexión.
const VERSION = 'v2-b2610272230';
const SHELL = 'refuerzo-shell-' + VERSION, LIBS = 'refuerzo-libs-' + VERSION;
const APP = ['./', './index.html', './app.js', './seneca.js', './documentos.js', './programacion.js', './curriculo.js', './manifest.json',
  './lib/jszip.min.js', './lib/docx.umd.js', './img/junta.jpg', './img/colegio.png', './icon-192.png', './icon-512.png'];
const EXT = ['https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js', '/agenda/calendario.js'];

self.addEventListener('install', e => e.waitUntil((async () => {
  const s = await caches.open(SHELL); await Promise.all(APP.map(u => s.add(u).catch(() => {})));
  const l = await caches.open(LIBS); await Promise.all(EXT.map(u => fetch(u).then(r => r.ok && l.put(u, r)).catch(() => {})));
  await self.skipWaiting();
})()));
self.addEventListener('activate', e => e.waitUntil((async () => {
  const ks = await caches.keys(); await Promise.all(ks.filter(k => k !== SHELL && k !== LIBS).map(k => caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (/firebasedatabase\.app$|firebaseio\.com$|googleapis\.com$/.test(u.hostname)) return;
  // Código propio y calendario: primero la red (para no servir versiones viejas)
  if (u.origin === location.origin && !/\/(lib|img)\//.test(u.pathname) && !/\.png$/.test(u.pathname)) {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(SHELL).then(x => x.put(r, c)); } return res; })
      .catch(() => caches.match(r).then(x => x || caches.match('./index.html'))));
    return;
  }
  // Librerías e imágenes: primero la caché
  e.respondWith(caches.match(r).then(x => x || fetch(r).then(res => { if (res.ok || res.type === 'opaque') { const c = res.clone(); caches.open(LIBS).then(k => k.put(r, c)); } return res; })));
});
