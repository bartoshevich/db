export default {
  globDirectory: '_site/',
  globPatterns: ['**/*.{html,js,css,png,jpg,jpeg,gif,webp,avif,svg,woff,woff2}'],

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
    '**/flex_label.png',
  ],

  swDest: '_site/sw.js',
  mode: 'production',

  // Устанавливаем лимит размера файла
  maximumFileSizeToCacheInBytes: 2 * 1024 * 1024, // 2MB лимит

  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: false,

  runtimeCaching: [
    {
      urlPattern: ({ request }) => request.destination === 'document',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 1 день
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
        plugins: [
          {
            cacheKeyWillBeUsed: async ({ request }) => {
              const url = new URL(request.url);
              url.hash = '';
              url.search = '';
              return url.href;
            },
          },
        ],
      },
    },
    {
      urlPattern: /\.(?:js|css|woff|woff2)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 дней
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
        plugins: [
          {
            cacheKeyWillBeUsed: async ({ request }) => {
              const url = new URL(request.url);
              url.search = ''; // Убираем query params
              return url.href;
            },
          },
        ],
      },
    },
    // Обычные изображения
    {
      urlPattern: /\.(?:png|jpg|jpeg|gif|webp|avif|svg)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 дней
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Cloudinary изображения
    {
      urlPattern: /^https:\/\/res\.cloudinary\.com.*bartoshevich/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'cloudinary-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 дней
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
        plugins: [
          {
            cacheKeyWillBeUsed: async ({ request }) => {
              const url = new URL(request.url);
              // Для Cloudinary сохраняем важные параметры трансформации
              const preserveParams = ['f_auto', 'q_auto', 'w_', 'h_', 'c_', 'g_'];
              const newSearchParams = new URLSearchParams();

              for (const [key, value] of url.searchParams) {
                if (preserveParams.some(param => key.startsWith(param))) {
                  newSearchParams.set(key, value);
                }
              }

              url.search = newSearchParams.toString();
              return url.href;
            },
          },
        ],
      },
    },
  ],

  navigateFallback: '/offline/',
  navigateFallbackDenylist: [
    /^\/_/, // Служебные пути
    /\/[^/?]+\.[^/]+$/, // Файлы с расширениями
    /^\/\.netlify/, // Netlify functions
    /^\/\.well-known/, // Security endpoints
    /^\/admin/, // CMS админка
    /^\/api/, // API endpoints
    /\.json$/, // JSON файлы
    /\.xml$/, // XML файлы
    /\.txt$/, // TXT файлы
    /^\/sw\.js$/, // Service Worker файл
    /^\/workbox-/, // Workbox файлы
  ],
  additionalManifestEntries: [
    {
      url: '/offline/',
      revision: null,
    },
  ],

  manifestTransforms: [
    manifestEntries => {
      const manifest = manifestEntries.map(entry => {
        // Для файлов с хэшами в имени не добавляем ревизию
        if (entry.url.match(/-[a-f0-9]{8,}\./)) {
          return {
            url: entry.url,
            revision: null,
          };
        }
        return entry;
      });

      return {
        manifest,
        warnings: [],
      };
    },
  ],
};
