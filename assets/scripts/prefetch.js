// Prefetch on hover functionality
const prefetcher = {
    // Максимальное количество URL в кэше
    MAX_CACHE_SIZE: 100,
    
    // Хранилище уже предзагруженных URL с порядком использования
    prefetchedUrls: new Set(),
    
    // Массив для отслеживания порядка добавления URL (для реализации ограниченного кэша)
    urlQueue: [],
    
    // Проверяем поддержку prefetch
    supportsPrefetch: () => {
      const link = document.createElement('link');
      return (
        link.relList &&
        link.relList.supports &&
        link.relList.supports('prefetch')
      );
    },
    
    // Проверяем, стоит ли предзагружать URL
    shouldPrefetch: (url) => {
      // Получаем текущий домен
      const currentDomain = window.location.origin;
      
      // Не предзагружаем, если:
      if (
        !url || // нет URL
        (url.startsWith('http') && !url.startsWith(currentDomain)) || // внешняя ссылка
        url.includes('#') || // якорная ссылка
        prefetcher.prefetchedUrls.has(url) // уже загружено
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
        prefetcher.prefetchedUrls.delete(oldestUrl);
        
        // Опционально: можно также удалить элемент link из DOM
        // Это не обязательно, но может помочь освободить ресурсы
        const oldLink = document.querySelector(`link[href="${oldestUrl}"][rel="prefetch"]`);
        if (oldLink) {
          oldLink.remove();
        }
      }
    },
    
    // Предзагрузка URL
    prefetch: (url) => {
      if (!prefetcher.shouldPrefetch(url)) return;
      
      // Добавляем в список загруженных
      prefetcher.prefetchedUrls.add(url);
      
      // Добавляем в очередь для отслеживания порядка
      prefetcher.urlQueue.push(url);
      
      // Проверяем и управляем размером кэша
      prefetcher.manageCacheSize();
      
      // Создаем link prefetch
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      link.as = 'document';
      
      // Добавляем обработку ошибок
      link.onerror = () => {
        // При ошибке загрузки удаляем URL из списка предзагруженных
        prefetcher.prefetchedUrls.delete(url);
        const index = prefetcher.urlQueue.indexOf(url);
        if (index !== -1) {
          prefetcher.urlQueue.splice(index, 1);
        }
        link.remove();
      };
      
      // Добавляем в head
      document.head.appendChild(link);
    },
    
    // Обработчик наведения
    handleHover: (event) => {
      const link = event.target.closest('a');
      if (!link) return;
      const url = link.getAttribute('href');
      if (url) {
        // Используем requestIdleCallback для оптимизации производительности
        if ('requestIdleCallback' in window) {
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
      document.addEventListener('mouseover', prefetcher.handleHover, { passive: true });
    }
  };
  
  // Запускаем после загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prefetcher.init);
  } else {
    prefetcher.init();
  }