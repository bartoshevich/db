"use strict";

(function () {
  // Конфигурация
  const CONFIG = {
    version: "v3.5.0::",
    debug: false,
    caches: {
      static: "static-resources",
      pages: "html-pages", 
      images: "optimized-images",
      media: "media-files",
    },
    limits: {
      pages: 35,
      images: 50,
      media: 20,
    },
    externalDomains: {
      allowedOrigins: ["res.cloudinary.com"],
      cachingEnabled: true,
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
      '/offline/', // Обязательная офлайн-страница
      
    ],
  };

  // Служебные функции
  const Utils = {
    log(level, message, ...data) {
      if (!CONFIG.debug && level === "debug") return;

      const styles = {
        debug: "color: #7f8c8d",
        info: "color: #3498db", 
        warn: "color: #f39c12",
        error: "color: #e74c3c; font-weight: bold",
      };

      console[level](
        `%c[SW ${level.toUpperCase()}]`,
        styles[level],
        message,
        ...data
      );
    },

    getCacheName(type) {
      return `${CONFIG.version}${CONFIG.caches[type]}`;
    },

    determineCacheType(request) {
      const url = new URL(request.url);
      const acceptHeader = request.headers.get("Accept") || "";

      // Проверяем внешние домены (Cloudinary)
      if (url.origin !== location.origin) {
        if (CONFIG.externalDomains.allowedOrigins.includes(url.hostname)) {
          return "images";
        }
        return null; // Игнорируем другие внешние ресурсы
      }

      // Определяем тип по заголовкам и URL
      if (request.mode === "navigate" || acceptHeader.includes("text/html")) {
        return "pages";
      } else if (
        request.destination === "image" ||
        acceptHeader.includes("image") ||
        /\.(jpe?g|png|gif|avif|svg|webp)$/i.test(url.pathname)
      ) {
        return "images";
      } else if (
        request.destination === "audio" ||
        request.destination === "video" ||
        /\.(mp3|mp4|webm|ogg)$/i.test(url.pathname)
      ) {
        return "media";
      }

      return "static";
    },

    // Заглушка для изображений
    createImageFallback() {
      return new Response(
        `<svg role="img" aria-labelledby="offline-title" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><title id="offline-title">Offline</title><g fill="none" fill-rule="evenodd"><path fill="#D8D8D8" d="M0 0h400v300H0z"/><text fill="#9B9B9B" font-family="Helvetica Neue,Arial,Helvetica,sans-serif" font-size="72" font-weight="bold"><tspan x="93" y="172">offline</tspan></text></g></svg>`,
        {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "no-store",
          },
        }
      );
    },

    // ИСПРАВЛЕНИЕ: Улучшенная проверка валидности ответа
    isValidResponse(response) {
      return response && 
             response.status >= 200 && 
             response.status < 400 && 
             response.type !== 'error';
    },

    // ИСПРАВЛЕНИЕ: Безопасное клонирование ответа
    safeClone(response) {
      try {
        return response.clone();
      } catch (error) {
        Utils.log("warn", "Не удалось клонировать ответ:", error);
        return null;
      }
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
        // ИСПРАВЛЕНИЕ: Добавляем ресурсы по одному для лучшей обработки ошибок
        const results = await Promise.allSettled(
          urls.map(async (url) => {
            try {
              await cache.add(url);
              Utils.log("debug", `Закеширован: ${url}`);
            } catch (error) {
              Utils.log("warn", `Не удалось кешировать ${url}:`, error);
              throw error;
            }
          })
        );
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        Utils.log("info", `Кеширование завершено. Успешно: ${successful}, Ошибок: ${failed}`);
        
        if (failed > 0) {
          Utils.log("warn", `${failed} ресурсов не удалось закешировать`);
        }
      } catch (error) {
        Utils.log("error", `Критическая ошибка кеширования ресурсов типа ${type}:`, error);
        throw error;
      }
    },

    async put(type, request, response) {
      try {
        // ИСПРАВЛЕНИЕ: Проверяем валидность ответа перед кешированием
        if (!Utils.isValidResponse(response)) {
          Utils.log("warn", "Попытка кеширования невалидного ответа:", response.status);
          return;
        }

        const cache = await this.open(type);
        await cache.put(request, response);
        Utils.log("debug", `Кеширован ресурс типа ${type}:`, request.url);
      } catch (error) {
        Utils.log("error", `Ошибка кеширования ресурса:`, error);
      }
    },

    // Оптимизированная очистка кеша
    async trim(type, maxItems = null) {
      try {
        const limit = maxItems || CONFIG.limits[type];
        const cache = await this.open(type);
        const keys = await cache.keys();

        if (keys.length > limit) {
          const deleteCount = keys.length - limit;
          Utils.log(
            "debug",
            `Удаление ${deleteCount} ресурсов из кеша ${type}, текущий размер: ${keys.length}, лимит: ${limit}`
          );

          // Удаляем старые элементы пакетно (FIFO)
          const deletionPromises = keys
            .slice(0, deleteCount)
            .map((key) => cache.delete(key));
          await Promise.all(deletionPromises);

          Utils.log("debug", `Удалено ${deleteCount} элементов из кеша ${type}`);
        }
      } catch (error) {
        Utils.log("error", `Ошибка при очистке кеша ${type}:`, error);
      }
    },

    async clearOld() {
      try {
        const keys = await caches.keys();
        const currentVersion = CONFIG.version;
        const oldKeys = keys.filter((key) => !key.startsWith(currentVersion));

        if (oldKeys.length > 0) {
          Utils.log("info", `Удаление ${oldKeys.length} устаревших кешей`);
          await Promise.all(oldKeys.map((key) => caches.delete(key)));
        }
      } catch (error) {
        Utils.log("error", `Ошибка при очистке устаревших кешей:`, error);
      }
    },
  };

  // Стратегии кеширования
  const Strategies = {
    // Стратегия "сначала сеть, затем кеш" для HTML-страниц
    async networkFirst(request, cacheType) {
      try {
        // ИСПРАВЛЕНИЕ: Добавляем timeout для сетевых запросов
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(request, { 
          signal: controller.signal 
        });
        clearTimeout(timeoutId);

        // Кешируем копию успешного ответа
        if (Utils.isValidResponse(response)) {
          const copy = Utils.safeClone(response);
          if (copy) {
            await Cache.put(cacheType, request, copy);
            await Cache.trim(cacheType);
          }
        }

        return response;
      } catch (error) {
        Utils.log("warn", `Сеть недоступна, проверяем кеш: ${request.url}`);

        // Ищем в кеше
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // ИСПРАВЛЕНИЕ: Более надежный fallback для HTML-страниц
        if (cacheType === "pages") {
          const offlinePage = await caches.match("./offline/");
          if (offlinePage) {
            return offlinePage;
          }
          
          // Последний резерв - inline HTML
          return new Response(
            `<!DOCTYPE html>
            <html lang="ru">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Страница недоступна</title>
              <style>
                body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
                .offline { color: #666; margin-top: 2rem; }
              </style>
            </head>
            <body>
              <h1>📴 Страница недоступна офлайн</h1>
              <div class="offline">Проверьте подключение к интернету</div>
            </body>
            </html>`,
            { 
              headers: { 
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store"
              } 
            }
          );
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
        .then((networkResponse) => {
          // ИСПРАВЛЕНИЕ: Более строгая проверка ответа
          if (Utils.isValidResponse(networkResponse) && networkResponse.status !== 206) {
            const copy = Utils.safeClone(networkResponse);
            if (copy) {
              Cache.put(cacheType, request, copy)
                .then(() => Cache.trim(cacheType))
                .catch((error) =>
                  Utils.log("error", `Ошибка при обновлении кеша: ${error}`)
                );
            }
          }
          return networkResponse;
        })
        .catch((error) => {
          Utils.log("warn", `Не удалось получить из сети: ${request.url}`, error);
          return null;
        });

      // Если есть в кеше, возвращаем сразу и обновляем в фоне
      if (cachedResponse) {
        fetchPromise.catch(() => {}); // Подавляем необработанные ошибки
        return cachedResponse;
      }

      // Если нет в кеше, ждем ответа из сети
      const networkResponse = await fetchPromise;
      if (networkResponse && Utils.isValidResponse(networkResponse)) {
        return networkResponse;
      }

      // Если и сеть недоступна, возвращаем запасной вариант
      if (cacheType === "images") {
        return Utils.createImageFallback();
      }

      return new Response("Ресурс недоступен офлайн", {
        status: 503,
        statusText: "Service Unavailable",
      });
    },

    // Специальная стратегия для Cloudinary
    async cloudinaryStrategy(request) {
      try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          this.updateCloudinaryCache(request).catch(() => {});
          return cachedResponse;
        }

        // ИСПРАВЛЕНИЕ: Добавляем timeout для внешних запросов
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const networkResponse = await fetch(request, {
          mode: "cors",
          credentials: "omit",
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (Utils.isValidResponse(networkResponse)) {
          const clone = Utils.safeClone(networkResponse);
          if (clone) {
            await Cache.put("images", request, clone);
            await Cache.trim("images");
          }
          return networkResponse;
        }

        throw new Error("Некорректный ответ от Cloudinary");
      } catch (error) {
        Utils.log("error", "Ошибка при получении Cloudinary ресурса:", error);
        return Utils.createImageFallback();
      }
    },

    async updateCloudinaryCache(request) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const networkResponse = await fetch(request, {
          mode: "cors",
          credentials: "omit",
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (Utils.isValidResponse(networkResponse)) {
          const clone = Utils.safeClone(networkResponse);
          if (clone) {
            await Cache.put("images", request, clone);
            Utils.log("debug", "Cloudinary ресурс обновлен в кеше:", request.url);
            await Cache.trim("images");
          }
        }
      } catch (error) {
        Utils.log("warn", "Не удалось обновить Cloudinary ресурс:", error);
      }
    },
  };

  // Обработчики Service Worker

  // Установка: кешируем основные ресурсы
  self.addEventListener("install", (event) => {
    Utils.log("info", "Установка Service Worker " + CONFIG.version);

    event.waitUntil(
      (async () => {
        try {
          await Cache.addAll("static", CONFIG.coreResources);

          // ИСПРАВЛЕНИЕ: Более надежная проверка offline-страницы
          try {
            const offlineRequest = new Request("./offline/");
            const offlinePage = await caches.match(offlineRequest);
            if (!offlinePage) {
              Utils.log("warn", "Offline-страница не найдена, пробуем добавить явно");
              const offlineCache = await Cache.open("pages");
              await offlineCache.add(offlineRequest);
              Utils.log("info", "Offline-страница добавлена в кеш");
            } else {
              Utils.log("info", "Offline-страница успешно закеширована");
            }
          } catch (offlineError) {
            Utils.log("error", "Критическая ошибка с offline-страницей:", offlineError);
          }

          await self.skipWaiting();
          Utils.log("info", "Service Worker успешно установлен");
        } catch (error) {
          Utils.log("error", "Ошибка при установке Service Worker:", error);
          // Не прерываем установку даже при ошибках кеширования
        }
      })()
    );
  });

  // Активация: очищаем старые кеши
  self.addEventListener("activate", (event) => {
    Utils.log("info", "Активация Service Worker " + CONFIG.version);

    event.waitUntil(
      (async () => {
        try {
          await Cache.clearOld();
          await self.clients.claim();
          Utils.log("info", "Service Worker успешно активирован");
        } catch (error) {
          Utils.log("error", "Ошибка при активации Service Worker:", error);
        }
      })()
    );
  });

  // Обработка сообщений
  self.addEventListener("message", (event) => {
    if (event.data && event.data.command) {
      switch (event.data.command) {
        case "trimCaches":
          Utils.log("info", "Запуск очистки кешей");
          Promise.all([
            Cache.trim("pages"),
            Cache.trim("images"), 
            Cache.trim("media"),
          ]).catch((error) => {
            Utils.log("error", "Ошибка при очистке кешей:", error);
          });
          break;

        case "setDebug":
          CONFIG.debug = !!event.data.value;
          Utils.log("info", `Режим отладки ${CONFIG.debug ? "включен" : "выключен"}`);
          break;

        case "updateVersion":
          Utils.log("info", "Получена команда обновления версии");
          self.registration.update();
          break;
      }
    }
  });

  // Обработка fetch-запросов
  self.addEventListener("fetch", (event) => {
    const request = event.request;

    // Игнорируем не GET-запросы
    if (request.method !== "GET") {
      event.respondWith(
        fetch(request).catch(() => 
          caches.match("./offline/") || 
          new Response("Операция недоступна офлайн", { status: 503 })
        )
      );
      return;
    }

    // Пропускаем MP3-файлы и другие медиа-стримы
    if (request.url.endsWith(".mp3") || request.url.includes("/stream/")) {
      return;
    }

    const url = new URL(request.url);
    const cacheType = Utils.determineCacheType(request);

    if (!cacheType) {
      return;
    }

    // Проверяем, является ли запрос к Cloudinary
    const isCloudinaryRequest = CONFIG.externalDomains.allowedOrigins.includes(url.hostname);

    // Специальная обработка для Cloudinary
    if (isCloudinaryRequest && CONFIG.externalDomains.cachingEnabled) {
      event.respondWith(Strategies.cloudinaryStrategy(request));
      return;
    }

    // Выбор стратегии в зависимости от типа ресурса
    if (cacheType === "pages") {
      // ИСПРАВЛЕНИЕ: Более аккуратная обработка navigation-запросов
      let fixedRequest = request;
      if (request.mode !== "navigate" && request.headers.get("Accept")?.includes("text/html")) {
        fixedRequest = new Request(request.url, {
          method: "GET",
          headers: new Headers({
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          }),
          mode: "navigate",
          credentials: "same-origin",
          redirect: "follow",
        });
      }

      event.respondWith(Strategies.networkFirst(fixedRequest, cacheType));
    } else {
      event.respondWith(Strategies.staleWhileRevalidate(request, cacheType));
    }
  });

  // ДОБАВЛЕНИЕ: Обработка необработанных ошибок
  self.addEventListener('error', (event) => {
    Utils.log("error", "Необработанная ошибка Service Worker:", event.error);
  });

  self.addEventListener('unhandledrejection', (event) => {
    Utils.log("error", "Необработанное отклонение промиса в SW:", event.reason);
    event.preventDefault(); // Предотвращаем вывод в консоль
  });

})();