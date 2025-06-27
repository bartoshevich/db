// workbox-config.js - ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ

export default {
  // Директория, где находятся готовые файлы сайта
  globDirectory: '_site/',
  
  // ✅ ИСПРАВЛЕНО: Указываем только те файлы, которые нужны для offline-работы.
  // **/*.html включает /offline/index.html, что решит проблему.
  globPatterns: [
    '**/*.html',
    'assets/css/*.css',
    'assets/js/*.js',
    'assets/fonts/*.{woff,woff2}',
    'assets/images/sprite-*.svg', // Только спрайт для предкэширования
    'favicon.ico',
    'site.webmanifest',
    'feed.json',
    'feed.xml'
  ],

  // ✅ ИСПРАВЛЕНО: Убираем конфликтующие и ненужные правила.
  globIgnores: [
    'sw.js', // Исключаем сам SW
    '_headers',
    '_redirects',
    'netlify.toml',
    'CNAME',
    '*.txt', // Исключаем все .txt, включая robots.txt
    'browserconfig.xml',
    'sw.js.map', // Исключаем карту, если она генерируется
     'offline/index.html',
    'workbox-*.js',
    'workbox-*.js.map'
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
  // ✅ ИЗМЕНЕНО: skipWaiting: true позволит новому SW активироваться сразу.
  // Это лучше сочетается с предлагаемым ниже подходом.
  skipWaiting: true, 

 // ✅ Явно добавляем офлайн-страницу.
  additionalManifestEntries: [
    { url: '/offline/', revision: null }
  ],

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
    
    // Cloudinary и другие внешние изображения
    {
      urlPattern: ({ request, url }) => 
        request.destination === 'image' && 
        (url.hostname === 'res.cloudinary.com' || url.hostname === 'i.ytimg.com'),
      handler: 'CacheFirst',
      options: {
        cacheName: 'external-images',
        expiration: { 
          maxEntries: 150, 
          maxAgeSeconds: 60 * 60 * 24 * 60, // 60 дней
          purgeOnQuotaError: true
        }
      }
    },
    
    // Локальные изображения
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
    
    // ✅ НОВОЕ: Отдельное правило для статичных файлов типа robots.txt
    {
      urlPattern: ({url}) => url.pathname === '/robots.txt',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'static-files',
        expiration: {
          maxAgeSeconds: 60 * 60 * 24 // 1 день
        }
      }
    }
  ],
  
   navigateFallback: '/offline/',
  navigateFallbackDenylist: [
    /^\/assets\//,
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|pdf|zip|txt|xml|json|map)$/i,
    /\/feed\.xml$/,
    /\/feed\.json$/,
    /\/sitemap\.xml$/
  ],
  inlineWorkboxRuntime: true,
  sourcemap: false
};