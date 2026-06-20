// IMPORTANTE: cada vez que subas cambios a app.js, gamification.js,
// gamification-ui.js, index.html, etc., subí también este sw.js
// cambiando el número de versión de abajo. Eso fuerza a todos los
// celulares a descartar la caché vieja y bajar los archivos nuevos.
const CACHE_NAME = 'alkaranta-v2'; // <-- subí este número en cada actualización futura

// Evento de instalación: precalentamos la caché con los archivos
// principales para que la app funcione offline.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalado (' + CACHE_NAME + ')');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './app.js',
        './gamification.js',
        './gamification-ui.js'
      ]).catch((err) => {
        // Si algún archivo no existe (ej. nombre distinto), no rompemos
        // la instalación entera por eso.
        console.warn('Service Worker: no se pudo precachear todo', err);
      });
    })
  );
  // FIX: hace que la versión nueva del Service Worker se active
  // inmediatamente, sin esperar a que se cierren todas las pestañas/app.
  self.skipWaiting();
});

// Evento de activación: borramos cachés de versiones anteriores.
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activado (' + CACHE_NAME + ')');
  event.waitUntil(
    caches.keys().then((nombres) => {
      return Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_NAME)
          .map((nombre) => {
            console.log('Service Worker: borrando caché vieja', nombre);
            return caches.delete(nombre);
          })
      );
    }).then(() => self.clients.claim()) // FIX: toma control de las pestañas abiertas ya mismo
  );
});

// Evento fetch: FIX — antes era "cache-first para siempre" (nunca
// volvía a pedir nada al servidor). Ahora es "network-first":
// 1) intenta traer la versión más nueva desde la red,
// 2) si lo logra, actualiza la caché y la devuelve,
// 3) si no hay internet, recién ahí usa la caché como respaldo.
self.addEventListener('fetch', (event) => {
  // Solo interceptamos pedidos GET (evita romper otros métodos).
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((respuestaRed) => {
        // Guardamos una copia fresca en caché para uso offline futuro.
        const copia = respuestaRed.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, copia);
        });
        return respuestaRed;
      })
      .catch(() => {
        // Sin internet: devolvemos lo que haya en caché, si existe.
        return caches.match(event.request);
      })
  );
});
