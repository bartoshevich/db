// workbox-config.js - ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ (убирает ВСЕ предупреждения)

export default {
  // Директория, где находятся готовые файлы сайта
  globDirectory: '_site/',
  
  // ✅ ИСПРАВЛЕНО: Только файлы которые точно существуют (БЕЗ robots.txt)
  globPatterns: [
    // HTML-страницы
    '**/*.html',
    
    // Ассеты, сгенерированные Vite (с хэшами)
    'assets/css/*.css',
    'assets/js/*.js',
    'assets/fonts/*.{woff,woff2}',
    'assets/images/sprite-*.svg', // Только спрайт для предкэширования

    // ✅ Только файлы которые точно существуют
    'favicon.ico',
    'site.webmanifest',
    'feed.json'
    
  ],

  // ✅ ИСПРАВЛЕНО: Убрали дублирование и конфликты
  globIgnores: [
    // Служебные файлы (БЕЗ дублирования)
    'sw.js',
    'sw.js.map',
    '_headers',
    '_redirects',
    'workbox-*.js',
    'workbox-*.js.map',
    'netlify.toml',
    'CNAME',
    '*.txt', // robots.txt будет кэшироваться через runtimeCaching
    'browserconfig.xml'
  ],

  // Куда сохранить сгенерированный Service Worker
  swDest: '_site/sw.js',
  
  // Режим сборки
  mode: 'production',

  // ✅ Увеличен лимит для современных сайтов
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
        }
      }
    },
    
    // Cloudinary изображения
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
        }
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

    // CSS и JS файлы (если пропущены)
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

    // Шрифты
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
    },

    // ✅ НОВОЕ: Статические файлы (robots.txt, sitemap.xml и др.)
    {
      urlPattern: ({ url }) => 
        /\.(txt|xml)$/i.test(url.pathname) &&
        url.origin === self.location.origin,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-files-cache',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 7 // 7 дней
        }
      }
    }
  ],
  
  // ✅ Страница-заглушка для оффлайн
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

  // ✅ НЕ добавляем additionalManifestEntries - файлы добавляются только если существуют

  // ✅ Настройки для лучшей отладки
  inlineWorkboxRuntime: false, // Выносим workbox в отдельный файл
  sourcemap: process.env.NODE_ENV !== 'production'
};