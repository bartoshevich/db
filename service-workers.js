'use strict';

(function () {
  // Конфигурация
  const CONFIG = {
    version: 'v4.0.02::',
    debug: false,
    caches: {
      static: 'static-resources',
      pages: 'html-pages',
      images: 'optimized-images',
      media: 'media-files'
    },
    limits: {
      pages: 35,
      images: 50,
      media: 20
    },
    externalDomains: {
      allowedOrigins: ['res.cloudinary.com'],
      cachingEnabled: true
    },
    // Базовые ресурсы, которые должны быть кешированы при установке
    coreResources: [
      '/',
            '/cases/',
            '/blog/',
            '/faq/',
            '/contact/',
            '/uslugi/',
            '/uslugi/marketing-audit/',
            '/uslugi/brand-conception/',
            '/uslugi/razrabotka-reklamnyh-kampanij/',
            '/uslugi/autsorsing-marketinga/',
            '/about/',
            '/offline/',
            '/assets/scripts/main.js',
            '/assets/scripts/video.js',
            '/assets/scripts/theme.js',
            '/assets/css/style.css',
            '/assets/css/style-home.css',
            '/assets/fonts/pt-sans-v12-latin_cyrillic/pt-sans-v12-latin_cyrillic-regular.woff2',
            '/assets/fonts/pt-sans-v12-latin_cyrillic/pt-sans-v12-latin_cyrillic-700.woff2',
            '/assets/fonts/pt-sans-v12-latin_cyrillic/pt-sans-v12-latin_cyrillic-italic.woff2',
            '/assets/images/sprite_2.svg',
            '/assets/images/logo/bartoshevich@1x.avif',
            '/assets/images/logo/bartoshevich@2x.avif',
            '/assets/images/logo/bartoshevich@1x.webp',
            '/assets/images/logo/bartoshevich@2x.webp'
    ]
  };

  // Служебные функции
  const Utils = {
    log(level, message, ...data) {
      if (!CONFIG.debug && level === 'debug') return;
      
      const styles = {
        debug: 'color: #7f8c8d',
        info: 'color: #3498db',
        warn: 'color: #f39c12',
        error: 'color: #e74c3c; font-weight: bold'
      };
      
      console[level](`%c[SW ${level.toUpperCase()}]`, styles[level], message, ...data);
    },
    
    getCacheName(type) {
      return `${CONFIG.version}${CONFIG.caches[type]}`;
    },
    
    determineCacheType(request) {
      const url = new URL(request.url);
      const acceptHeader = request.headers.get('Accept') || '';
      
      // Проверяем внешние домены (Cloudinary)
      if (url.origin !== location.origin) {
        if (CONFIG.externalDomains.allowedOrigins.includes(url.hostname)) {
          return 'images';
        }
        return null; // Игнорируем другие внешние ресурсы
      }
      
      // Определяем тип по заголовкам и URL
      if (request.mode === 'navigate' || acceptHeader.includes('text/html')) {
        return 'pages';
      } else if (
        request.destination === 'image' || 
        acceptHeader.includes('image') || 
        /\.(jpe?g|png|gif|avif|svg|webp)$/i.test(url.pathname)
      ) {
        return 'images';
      } else if (
        request.destination === 'audio' || 
        request.destination === 'video' || 
        /\.(mp3|mp4|webm|ogg)$/i.test(url.pathname)
      ) {
        return 'media';
      }
      
      return 'static';
    },
    
    // Заглушка для изображений
    createImageFallback() {
      return new Response(
        `<svg role="img" aria-labelledby="offline-title" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><title id="offline-title">Offline</title><g fill="none" fill-rule="evenodd"><path fill="#D8D8D8" d="M0 0h400v300H0z"/><text fill="#9B9B9B" font-family="Helvetica Neue,Arial,Helvetica,sans-serif" font-size="72" font-weight="bold"><tspan x="93" y="172">offline</tspan></text></g></svg>`,
        {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'no-store'
          }
        }
      );
    }
  };

  // Управление кешем
  const Cache = {
    async open(type) {
      return await caches.open(Utils.getCacheName(type));
    },
    
    async addAll(type, urls) {
      try {
        const cache = await this.open(type);
        await cache.addAll(urls);
        Utils.log('info', `Кеширование ${urls.length} ресурсов типа ${type}`);
      } catch (error) {
        Utils.log('error', `Ошибка кеширования ресурсов типа ${type}:`, error);
        throw error;
      }
    },
    
    async put(type, request, response) {
      try {
        const cache = await this.open(type);
        await cache.put(request, response);
        Utils.log('debug', `Кеширован ресурс типа ${type}:`, request.url);
      } catch (error) {
        Utils.log('error', `Ошибка кеширования ресурса:`, error);
      }
    },
    
    // Оптимизированная очистка кеша (цикл вместо рекурсии)
    async trim(type, maxItems = null) {
      try {
        const limit = maxItems || CONFIG.limits[type];
        const cache = await this.open(type);
        const keys = await cache.keys();
        
        if (keys.length > limit) {
          const deleteCount = keys.length - limit;
          Utils.log('debug', `Удаление ${deleteCount} ресурсов из кеша ${type}, текущий размер: ${keys.length}, лимит: ${limit}`);
          
          // Удаляем старые элементы пакетно (FIFO)
          const deletionPromises = keys.slice(0, deleteCount).map(key => cache.delete(key));
          await Promise.all(deletionPromises);
          
          Utils.log('debug', `Удалено ${deleteCount} элементов из кеша ${type}`);
        }
      } catch (error) {
        Utils.log('error', `Ошибка при очистке кеша ${type}:`, error);
      }
    },
    
    async clearOld() {
      try {
        const keys = await caches.keys();
        const currentVersion = CONFIG.version;
        const oldKeys = keys.filter(key => !key.startsWith(currentVersion));
        
        if (oldKeys.length > 0) {
          Utils.log('info', `Удаление ${oldKeys.length} устаревших кешей`);
          await Promise.all(oldKeys.map(key => caches.delete(key)));
        }
      } catch (error) {
        Utils.log('error', `Ошибка при очистке устаревших кешей:`, error);
      }
    }
  };

  // Стратегии кеширования
  const Strategies = {
    // Стратегия "сначала сеть, затем кеш" для HTML-страниц
    async networkFirst(request, cacheType) {
      try {
        // Пробуем получить из сети
        const response = await fetch(request);
        
        // Кешируем копию успешного ответа
        if (response.ok) {
          const copy = response.clone();
          await Cache.put(cacheType, request, copy);
          await Cache.trim(cacheType);
        }
        
        return response;
      } catch (error) {
        Utils.log('warn', `Сеть недоступна, проверяем кеш: ${request.url}`);
        
        // Ищем в кеше
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Если нет в кеше, возвращаем offline-страницу для HTML
        if (cacheType === 'pages') {
          return caches.match('./offline/') || 
            new Response('<html><body><h1>Страница недоступна офлайн</h1></body></html>', 
              { headers: { 'Content-Type': 'text/html' } });
        }
        
        throw error;
      }
    },
    
    // Стратегия "сначала кеш, затем обновление в фоне" для статических ресурсов
    async staleWhileRevalidate(request, cacheType) {
      // Проверяем кеш
      const cachedResponse = await caches.match(request);
      
      // Создаем промис на получение из сети и обновление кеша
      const fetchPromise = fetch(request)
        .then(networkResponse => {
          // Кешируем только успешные и не частичные ответы
          if (networkResponse.ok && networkResponse.status !== 206) {
            const copy = networkResponse.clone();
            Cache.put(cacheType, request, copy)
              .then(() => Cache.trim(cacheType))
              .catch(error => Utils.log('error', `Ошибка при обновлении кеша: ${error}`));
          }
          return networkResponse;
        })
        .catch(error => {
          Utils.log('warn', `Не удалось получить из сети: ${request.url}`, error);
          return null;
        });
      
      // Если есть в кеше, возвращаем сразу и обновляем в фоне
      if (cachedResponse) {
        // Запускаем обновление кеша асинхронно
        fetchPromise.catch(() => {});
        return cachedResponse;
      }
      
      // Если нет в кеше, ждем ответа из сети
      const networkResponse = await fetchPromise;
      if (networkResponse) {
        return networkResponse;
      }
      
      // Если и сеть недоступна, возвращаем запасной вариант
      if (cacheType === 'images') {
        return Utils.createImageFallback();
      }
      
      // Для остальных ресурсов
      return new Response('Ресурс недоступен офлайн', { 
        status: 503, 
        statusText: 'Service Unavailable' 
      });
    },
    
    // Специальная стратегия для Cloudinary
    async cloudinaryStrategy(request) {
      try {
        // Проверяем кеш
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          // Запускаем обновление в фоне
          this.updateCloudinaryCache(request).catch(() => {});
          return cachedResponse;
        }
        
        // Если нет в кеше, получаем из сети
        const networkResponse = await fetch(request, {
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (networkResponse && networkResponse.ok) {
          // Кешируем копию
          const clone = networkResponse.clone();
          await Cache.put('images', request, clone);
          await Cache.trim('images');
          return networkResponse;
        }
        
        throw new Error('Некорректный ответ от Cloudinary');
      } catch (error) {
        Utils.log('error', 'Ошибка при получении Cloudinary ресурса:', error);
        return Utils.createImageFallback();
      }
    },
    
    // Вспомогательный метод для обновления кеша Cloudinary
    async updateCloudinaryCache(request) {
      try {
        const networkResponse = await fetch(request, {
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          await Cache.put('images', request, clone);
          Utils.log('debug', 'Cloudinary ресурс обновлен в кеше:', request.url);
          await Cache.trim('images');
        }
      } catch (error) {
        Utils.log('warn', 'Не удалось обновить Cloudinary ресурс:', error);
      }
    }
  };

  // Обработчики Service Worker
  
  // Установка: кешируем основные ресурсы
  self.addEventListener('install', event => {
    Utils.log('info', 'Установка Service Worker ' + CONFIG.version);
    
    event.waitUntil(
      (async () => {
        try {
          await Cache.addAll('static', CONFIG.coreResources);
          
          // Важно: проверяем наличие offline-страницы
          const offlinePage = await caches.match(new Request('./offline/'));
          if (!offlinePage) {
            Utils.log('warn', 'Offline-страница не найдена в кеше после установки');
            // Пробуем явно кешировать
            const offlineCache = await Cache.open('pages');
            await offlineCache.add('./offline/');
          } else {
            Utils.log('info', 'Offline-страница успешно закеширована');
          }
          
          await self.skipWaiting();
          Utils.log('info', 'Service Worker успешно установлен');
        } catch (error) {
          Utils.log('error', 'Ошибка при установке Service Worker:', error);
        }
      })()
    );
  });

  // Активация: очищаем старые кеши
  self.addEventListener('activate', event => {
    Utils.log('info', 'Активация Service Worker ' + CONFIG.version);
    
    event.waitUntil(
      (async () => {
        try {
          await Cache.clearOld();
          await self.clients.claim();
          Utils.log('info', 'Service Worker успешно активирован');
        } catch (error) {
          Utils.log('error', 'Ошибка при активации Service Worker:', error);
        }
      })()
    );
  });

  // Обработка сообщений
  self.addEventListener('message', event => {
    if (event.data && event.data.command) {
      switch (event.data.command) {
        case 'trimCaches':
          Utils.log('info', 'Запуск очистки кешей');
          Promise.all([
            Cache.trim('pages'),
            Cache.trim('images'),
            Cache.trim('media')
          ]).catch(error => {
            Utils.log('error', 'Ошибка при очистке кешей:', error);
          });
          break;
          
        case 'setDebug':
          CONFIG.debug = !!event.data.value;
          Utils.log('info', `Режим отладки ${CONFIG.debug ? 'включен' : 'выключен'}`);
          break;
          
        case 'updateVersion':
          Utils.log('info', 'Получена команда обновления версии');
          self.registration.update();
          break;
      }
    }
  });

  // Обработка fetch-запросов
  self.addEventListener('fetch', event => {
    const request = event.request;
    
    // Игнорируем не GET-запросы, предлагая offline страницу при ошибке
    if (request.method !== 'GET') {
      event.respondWith(
        fetch(request).catch(() => caches.match('./offline/'))
      );
      return;
    }
    
    // Пропускаем MP3-файлы
    if (request.url.endsWith('.mp3')) {
      return;
    }
    
    const url = new URL(request.url);
    const cacheType = Utils.determineCacheType(request);
    
    if (!cacheType) {
      return; // Не обрабатываем запросы без определенного типа кеша
    }
    
    // Проверяем, является ли запрос к Cloudinary
    const isCloudinaryRequest = CONFIG.externalDomains.allowedOrigins.includes(url.hostname);
    
    // Специальная обработка для Cloudinary
    if (isCloudinaryRequest && CONFIG.externalDomains.cachingEnabled) {
      event.respondWith(Strategies.cloudinaryStrategy(request));
      return;
    }
    
    // Выбор стратегии в зависимости от типа ресурса
    if (cacheType === 'pages') {
      // Для HTML-страниц используем стратегию Network First
      // Фиксируем запрос в режиме навигации
      let fixedRequest = request;
      if (request.mode !== 'navigate') {
        fixedRequest = new Request(request.url, {
          method: 'GET',
          headers: request.headers,
          mode: request.mode,
          credentials: request.credentials,
          redirect: request.redirect
        });
      }
      
      event.respondWith(Strategies.networkFirst(fixedRequest, cacheType));
    } else {
      // Для статических ресурсов, изображений и медиа используем Stale While Revalidate
      event.respondWith(Strategies.staleWhileRevalidate(request, cacheType));
    }
  });
})();