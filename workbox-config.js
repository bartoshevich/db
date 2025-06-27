// workbox-config.js - ИСПРАВЛЕННАЯ КОНФИГУРАЦИЯ

export default {
  // Директория, где находятся готовые файлы сайта
  globDirectory: '_site/',
  
  // ЧТО кэшировать при установке SW
  globPatterns: [
    // HTML-страницы (критичные)
    '**/*.html',
    
    // Ассеты, сгенерированные Vite (с хэшами)
    'assets/css/*.css',
    'assets/js/*.js',
    'assets/fonts/*.{woff,woff2}',
    'assets/images/sprite-*.svg', // ✅ Только спрайт для предкэширования

    // Корневые PWA файлы
    '*.{ico,png,svg,webmanifest,xml,txt}',
    'feed.json'
  ],

  // ЧТО НЕ кэшировать при установке
  globIgnores: [
    // Служебные файлы
    'sw.js',
    'sw.js.map',
    '_headers', 
    '_redirects',
    'workbox-*.js',
    'workbox-*.js.map',
    'netlify.toml'
    // ✅ НЕ исключаем изображения - они обрабатываются в runtimeCaching
  ],

  // Куда сохранить сгенерированный Service Worker
  swDest: '_site/sw.js',
  
  // Режим сборки
  mode: 'production',

  // ✅ ИСПРАВЛЕНО: Увеличен лимит для современных сайтов
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB

  // Очистка старых кэшей
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: false,

  // ✅ ИСПРАВЛЕНО: Оптимизированное кэширование во время работы
  runtimeCaching: [
    // Страницы - Network First с таймаутом
    {
      urlPattern: ({ request }) => request.destination === 'document',
      handler: 'NetworkFirst',
      options: { 
        cacheName: 'pages-cache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 7 // 7 дней
        },
        // ✅ Добавлены broadcast updates для уведомлений
        plugins: [{
          cacheKeyWillBeUsed: async ({ request }) => {
            return `${request.url}?v=${Date.now()}`;
          }
        }]
      }
    },
    
    // Cloudinary изображения - оптимизированное кэширование
    {
      urlPattern: ({ request, url }) => 
        request.destination === 'image' && 
        url.hostname === 'res.cloudinary.com',
      handler: 'CacheFirst',
      options: {
        cacheName: 'cloudinary-images',
        expiration: { 
          maxEntries: 150, 
          maxAgeSeconds: 60 * 60 * 24 * 60, // 60 дней
          purgeOnQuotaError: true
        },
        plugins: [{
          cacheKeyWillBeUsed: async ({ request }) => {
            // ✅ Убираем query params для лучшего кэширования
            const url = new URL(request.url);
            url.searchParams.delete('_t');
            return url.toString();
          }
        }]
      }
    },
    
    // ✅ ИСПРАВЛЕНО: Локальные изображения с проверкой origin
    {
      urlPattern: ({ request, url }) => 
        request.destination === 'image' && 
        url.origin === self.location.origin &&
        !url.pathname.includes('sprite'), // Спрайт уже в precache
      handler: 'CacheFirst', 
      options: {
        cacheName: 'local-images',
        expiration: { 
          maxEntries: 300,
          maxAgeSeconds: 60 * 60 * 24 * 90, // 90 дней
          purgeOnQuotaError: true
        }
      }
    },

    // ✅ НОВОЕ: CSS и JS файлы (если пропущены)
    {
      urlPattern: ({ request }) => 
        request.destination === 'style' || 
        request.destination === 'script',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'assets-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30 // 30 дней
        }
      }
    },

    // ✅ НОВОЕ: Шрифты
    {
      urlPattern: ({ request }) => request.destination === 'font',
      handler: 'CacheFirst',
      options: {
        cacheName: 'fonts-cache',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 365 // 1 год
        }
      }
    }
  ],
  
  // ✅ ИСПРАВЛЕНО: Улучшенная страница-заглушка для оффлайн
  navigateFallback: '/offline/',
  
  // ✅ ИСПРАВЛЕНО: Точные правила исключения
  navigateFallbackDenylist: [
    /^\/_/,                    // Служебные пути
    /^\/\.netlify/,           // Netlify функции
    /^\/api\//,               // API пути
    /^\/admin/,               // Админка
    // Файлы по расширениям
    /\.(?:css|js|png|jpg|jpeg|gif|webp|svg|woff|woff2|ico|pdf|zip|txt|xml|json|map)$/i,
    // RSS и похожие
    /\/feed\./,
    /\/sitemap\./
  ],

  // ✅ НОВОЕ: Дополнительные файлы манифеста с версионированием
  additionalManifestEntries: [
    {
      url: '/offline/',
      revision: '{{BUILD_VERSION}}' // Будет заменено при сборке
    }
  ],

  // ✅ НОВОЕ: Настройки для лучшей отладки
  inlineWorkboxRuntime: false, // Выносим workbox в отдельный файл
  sourcemap: process.env.NODE_ENV !== 'production'
};

// ✅ ДОПОЛНИТЕЛЬНЫЕ НАСТРОЙКИ для интеграции с Eleventy
export const workboxPlugins = [
  // Plugin для broadcast updates (уведомления об обновлениях)
  {
    name: 'broadcast-update-plugin',
    code: `
      import { BroadcastUpdatePlugin } from 'workbox-broadcast-update';
      
      const broadcastUpdate = new BroadcastUpdatePlugin({
        headersToCheck: ['content-length', 'etag', 'last-modified'],
        generatePayload: ({ cacheName, updatedURL }) => ({
          type: 'CACHE_UPDATED',
          payload: {
            cacheName,
            updatedURL,
            timestamp: Date.now()
          }
        })
      });
    `
  },
  
  // Plugin для background sync (офлайн формы)
  {
    name: 'background-sync-plugin', 
    code: `
      import { BackgroundSyncPlugin } from 'workbox-background-sync';
      
      const bgSyncPlugin = new BackgroundSyncPlugin('contact-form-queue', {
        maxRetentionTime: 24 * 60 // 24 часа
      });
    `
  }
];