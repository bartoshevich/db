// src/sw.js - Финальная, полная версия с разделением кэшей

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

// Внедряем манифест для precache
precacheAndRoute(self.__WB_MANIFEST);

// --- СТРАТЕГИЯ ДЛЯ HTML-ДОКУМЕНТОВ ---
const navigationStrategy = new NetworkFirst({
  cacheName: 'pages-cache',
  networkTimeoutSeconds: 3,
  plugins: [
    new CacheableResponsePlugin({ statuses: [200] }),
  ],
});

const navigationErrorHandler = async () => {
  const offlinePage = await caches.match('/offline/');
  return offlinePage || new Response('You are offline.', {
    status: 408,
    headers: { 'Content-Type': 'text/plain' },
  });
};

registerRoute(new NavigationRoute(navigationStrategy, {
   denylist: [/^\/pagefind\//],
  errorHandler: navigationErrorHandler
}));


registerRoute(
  ({ url }) => url.pathname.startsWith('/pagefind/'),
  new StaleWhileRevalidate({
    cacheName: 'pagefind-index',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 дней
      }),
    ],
  })
);

// --- СТРАТЕГИИ ДЛЯ АССЕТОВ ---

// ✅ ШАГ 1: Добавляем правило для ВНЕШНИХ изображений
registerRoute(
  ({ request, url }) => 
    request.destination === 'image' &&
    (url.hostname === 'res.cloudinary.com' || url.hostname === 'i.ytimg.com'),
  new CacheFirst({
    cacheName: 'external-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 150,
        maxAgeSeconds: 60 * 60 * 24 * 60, // 60 дней
        purgeOnQuotaError: true,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ✅ ШАГ 2: Добавляем правило для ЛОКАЛЬНЫХ изображений
registerRoute(
  ({ request, url }) => 
    request.destination === 'image' &&
    url.origin === self.location.origin,
  new CacheFirst({
    cacheName: 'local-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 300,
        maxAgeSeconds: 60 * 60 * 24 * 90, // 90 дней
        purgeOnQuotaError: true,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);


// Стили и скрипты
registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script',
  new StaleWhileRevalidate({ // Используем StaleWhileRevalidate для скорости
    cacheName: 'assets-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 дней
      }),
    ],
  })
);

// Шрифты
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 год
      }),
    ],
  })
);

// Сообщение о готовности
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});