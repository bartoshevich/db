export default {
  globDirectory: '_site/',
globPatterns: [
    // Только HTML файлы в определенных папках
    'index.html',
    'offline/index.html',
    'about/index.html', 
    'blog/index.html',
    'uslugi/index.html',
    'cases/index.html',
    'contact/index.html',
    'uslugi/index.html',
    
    // Только ассеты
    'assets/**/*.{js,css,woff,woff2}',
    
    // Только критичные иконки
    'favicon.ico',
    'favicon-*.png',
    'apple-touch-icon*.png',
    'maskable_icon*.png'
  ],

 globIgnores: [
    'sw.js', 
    'sw.js.map',
    'workbox-*.js',
    'workbox-*.js.map',
    '**/node_modules/**/*',    
    '_redirects',
    '_headers', 
    '**/_redirects',
    '**/_headers',
    '**/redirects',
    '**/headers',
    'netlify.toml',


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