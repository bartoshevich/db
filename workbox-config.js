export default {
  globDirectory: '_site/',
  globPatterns: [
    // Явно указываем, что кэшируем
    '**/*.html', // Все HTML файлы
    '**/*.js',   // Все JS файлы, сгенерированные Vite
    '**/*.css',  // Все CSS файлы, сгенерированные Vite
    '**/*.woff', // Шрифты
    '**/*.woff2',
    
    // Иконки и манифесты - они должны быть в корне
    'favicon*.{png,ico}',
    'apple-touch-icon*.png',
    'maskable_icon*.png',
    'maskable_icon_x512.png',
    'android-chrome-192x192.png',
    'safari-pinned-tab.svg',
    'site.webmanifest',
    
    // SEO и Feed файлы
    'robots.txt',
    'sitemap.xml',
    'feed.xml',
    'feed.json'
  ],

 globIgnores: [
    'sw.js', 
    'sw.js.map',
    'workbox-*.js',
    'workbox-*.js.map',
    '_headers',
    '_redirects',
    'netlify.toml',
    '**/.netlify/**/*',   
    'assets/images/**/*',   
    'maskable_icon.png', 
    'assets/media/**/*'
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
      urlPattern: ({request, url}) => {
        return request.destination === 'image' && 
               url.origin === self.location.origin;
      },
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-on-demand',
        expiration: {
          maxEntries: 50, // ОГРАНИЧЕНО: только 50 изображений
          maxAgeSeconds: 7 * 24 * 60 * 60 // 7 дней (короче чем статика)
        },
        cacheableResponse: { 
          statuses: [0, 200] 
        },
        plugins: [{
          // Логируем какие изображения кэшируем
          cacheDidUpdate: async ({cacheName, request}) => {
            console.log(`📸 Cached image on demand: ${request.url}`);
          },
          // Ограничиваем размер файлов
          requestWillFetch: async ({request}) => {
            // Можно добавить проверку размера через HEAD request
            return request;
          }
        }]
      }
    },
    
    // ✅ LAZY LOADING: Cloudinary изображения - только по запросу
    {
      urlPattern: /^https:\/\/res\.cloudinary\.com.*bartoshevich/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'cloudinary-on-demand',
        expiration: {
          maxEntries: 30, // ОГРАНИЧЕНО: только 30 изображений
          maxAgeSeconds: 14 * 24 * 60 * 60 // 14 дней
        },
        cacheableResponse: {
          statuses: [0, 200]
        },
        plugins: [{
          cacheKeyWillBeUsed: async ({ request }) => {
            const url = new URL(request.url);
            // Сохраняем параметры трансформации
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
          cacheDidUpdate: async ({cacheName, request}) => {
            console.log(`📸 Cached Cloudinary image: ${request.url}`);
          }
        }]
      }
    }
  ],

  navigateFallback: '/offline/',
  
  navigateFallbackDenylist: [
    /^\/_/,
    /\/[^/?]+\.[^/]+$/,
    /^\/\.netlify/,
    /^\/\.well-known/,
    /^\/admin/,
    /^\/api/,
    /\.json$/,
    /\.xml$/,
    /\.txt$/,
    /^\/sw\.js$/,
    /^\/workbox-/,
  ],
  
  additionalManifestEntries: [
    {
      url: '/offline/',
      revision: null
    }
  ],
  
  manifestTransforms: [
    (manifestEntries) => {
      const manifest = manifestEntries.map(entry => {
        if (entry.url.match(/-[a-f0-9]{8,}\./)) {
          return {
            url: entry.url,
            revision: null
          };
        }
        return entry;
      });
      
      return {
        manifest,
        warnings: []
      };
    }
  ]
};