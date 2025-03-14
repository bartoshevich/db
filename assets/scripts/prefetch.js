// Prefetch on hover functionality
const prefetcher = {
    // Хранилище уже предзагруженных URL
    prefetchedUrls: new Set(),
    
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
        // Не предзагружаем, если:
        if (
            !url || // нет URL
            url.startsWith('http') || // внешняя ссылка
            url.includes('#') || // якорная ссылка
            prefetcher.prefetchedUrls.has(url) // уже загружено
        ) {
            return false;
        }
        return true;
    },
    
    // Предзагрузка URL
    prefetch: (url) => {
        if (!prefetcher.shouldPrefetch(url)) return;
        
        // Добавляем в список загруженных
        prefetcher.prefetchedUrls.add(url);
        
        // Создаем link prefetch
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.as = 'document';
        
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