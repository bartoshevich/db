


/* #### Prefetch on hover functionality #### */
(() => {
  // Проверка на наличие необходимых глобальных объектов
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const prefetcher = {
    // Максимальное количество URL в кэше
    MAX_CACHE_SIZE: 100,

    // Хранилище уже предзагруженных URL и DOM-элементов
    cache: new Map(), // url -> DOM элемент

    // Массив для отслеживания порядка добавления URL
    urlQueue: [],

    // Проверяем поддержку prefetch
    supportsPrefetch: () => {
      let link = document.createElement("link");
      const supportsFeature =
        link.relList &&
        link.relList.supports &&
        link.relList.supports("prefetch");
      // Удаляем созданный элемент, чтобы не засорять память
      link = null;
      return supportsFeature;
    },

    // Проверяем, стоит ли предзагружать URL
    shouldPrefetch: (url) => {
      // Получаем текущий домен
      const currentDomain = window.location.origin;

      // Не предзагружаем, если:
      if (
        !url ||  
        url.startsWith("mailto:") ||             
        url.startsWith("tel:") ||   
        (url.startsWith("http") && !url.startsWith(currentDomain)) || // внешняя ссылка
        url.includes("#") || // якорная ссылка
        prefetcher.cache.has(url) // уже загружено
      ) {
        return false;
      }
      return true;
    },

    // Управление размером кэша
    manageCacheSize: () => {
      // Если превышен лимит, удаляем самый старый URL
      if (prefetcher.urlQueue.length > prefetcher.MAX_CACHE_SIZE) {
        const oldestUrl = prefetcher.urlQueue.shift();
        const oldLinkElement = prefetcher.cache.get(oldestUrl);

        // Удаляем DOM-элемент, если он существует
        if (oldLinkElement && oldLinkElement.parentNode) {
          oldLinkElement.parentNode.removeChild(oldLinkElement);
        }

        prefetcher.cache.delete(oldestUrl);
      }
    },

    // Предзагрузка URL
    prefetch: (url) => {
      if (!prefetcher.shouldPrefetch(url)) return;

      // Создаем link prefetch
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = url;
      link.as = "document";

      // Добавляем обработку ошибок
      link.onerror = () => {
        // При ошибке загрузки удаляем URL из кэша
        prefetcher.cache.delete(url);
        const index = prefetcher.urlQueue.indexOf(url);
        if (index !== -1) {
          prefetcher.urlQueue.splice(index, 1);
        }
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      };

      // Добавляем в кэш и очередь
      prefetcher.cache.set(url, link);
      prefetcher.urlQueue.push(url);

      // Проверяем и управляем размером кэша
      prefetcher.manageCacheSize();

      // Добавляем в head
      document.head.appendChild(link);
    },

    // Обработчик наведения
    handleHover: (event) => {
      if (!event || !event.target) return;

      const link = event.target.closest("a");
      if (!link) return;

      const url = link.getAttribute("href");
      if (url) {
        // Используем requestIdleCallback для оптимизации производительности
        if ("requestIdleCallback" in window) {
          requestIdleCallback(() => prefetcher.prefetch(url));
        } else {
          // Fallback для браузеров без requestIdleCallback
          setTimeout(() => prefetcher.prefetch(url), 100);
        }
      }
    },

    // Инициализация
    init: () => {
      if (!prefetcher.supportsPrefetch()) return;

      // Добавляем обработчик на весь документ (делегирование событий)
      document.addEventListener("mouseover", prefetcher.handleHover, {
        passive: true,
      });
    },
  };

  // Запускаем после загрузки DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", prefetcher.init, {
      once: true,
    });
  } else {
    prefetcher.init();
  }
})();

