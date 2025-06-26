export default {
  globDirectory: '_site/',
  globPatterns: [
    '**/*.{html,js,css,png,jpg,jpeg,gif,webp,avif,svg,woff,woff2}'
  ],
  
  // ИСПРАВЛЕНО: Правильные паттерны исключения
  globIgnores: [
    '**/sw.js',
    '**/workbox-*.js',
    '**/node_modules/**/*',
    // Исключаем большие изображения - ПРАВИЛЬНЫЕ ПУТИ
    '**/archetype/**/*.png',
    '**/marketing map.png',
    '**/bartoshevich@4x3.jpg',
    'maskable_icon.png',
    'maskable_icon_x512.png',
    '**/flex_label.png'
  ],
  
  swDest: '_site/sw.js',
  mode: 'production',
  
  // Устанавливаем лимит размера файла
  maximumFileSizeToCacheInBytes: 2 * 1024 * 1024, // 2MB лимит
  
  runtimeCaching: [
    {
      urlPattern: /\.(?:html)$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        cacheableResponse: { statuses: [0, 200] }
      }
    },
    {
      urlPattern: /\.(?:js|css|woff|woff2)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-cache',
        cacheableResponse: { statuses: [0, 200] }
      }
    },
    // Обычные изображения
    {
      urlPattern: /\.(?:png|jpg|jpeg|gif|webp|avif|svg)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 дней
        },
        cacheableResponse: { statuses: [0, 200] }
      }
    },
    {
    urlPattern: /^https:\/\/res\.cloudinary\.com.*bartoshevich/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'cloudinary-cache',
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 дней
      },
      cacheableResponse: {
        statuses: [0, 200]
      }
    }
  }
  ],
  
  navigateFallback: '/offline/',
  navigateFallbackDenylist: [
    /^\/_/,                    // Служебные пути
    /\/[^/?]+\.[^/]+$/,       // Файлы с расширениями
    /^\/\.netlify/,           // Netlify functions
    /^\/\.well-known/,        // Security endpoints
    /^\/admin/,               // CMS админка
    /^\/api/,                 // API endpoints
    /\.json$/,                // JSON файлы
    /\.xml$/,                 // XML файлы
    /\.txt$/,                 // TXT файлы
    /^\/sw\.js$/,             // Service Worker файл
    /^\/workbox-/,            // Workbox файлы
  ],
  skipWaiting: false,
  clientsClaim: true
};