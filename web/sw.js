'use strict';
// El service worker de las mesas: hace que se pueda instalar como app y deja lo estático (el "cascarón") disponible si la red falla un instante.
// Lo importante: la red va primero (así una versión nueva llega apenas se abre) y las consultas del juego (/api/) NUNCA se guardan ni se interceptan.
const VERSION = 'bj-104';
const CASCARON = ['./', 'estilos.css', 'glifos.js', 'sonido.js', 'voxel.js', 'estadisticas.js', 'farolin.js', 'ayuda.js', 'qr.js', 'dados3d.js', 'mesas.js', 'fu_arte.js', 'entrada.js', 'sala.js', 'diezmil.js', 'trecejack.js', 'fundacion.js', 'tutorial.js', 'comun.js', 'fonts/lucid-stakes-400.woff2', 'fonts/lucid-stakes-700.woff2', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CASCARON)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;   // (el juego va siempre directo al servidor)
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copia = res.clone(); caches.open(VERSION).then(c => c.put(req, copia)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./')))
  );
});
