
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('✅ SW зарегистрирован:', registration.scope);

      // Слушаем обновления
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Новая версия готова
            console.log('🔄 Доступно обновление сайта');
            
            // Можно показать уведомление пользователю
            if (confirm('Доступна новая версия сайта. Обновить?')) {
              newWorker.postMessage({ command: 'updateVersion' });
              window.location.reload();
            }
          }
        });
      });

      // Периодическая проверка обновлений (каждые 10 минут)
      setInterval(() => {
        registration.update();
      }, 10 * 60 * 1000);

    } catch (error) {
      console.error('❌ Ошибка регистрации SW:', error);
    }
  });

  // Слушаем сообщения от SW
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.command === 'reload') {
      window.location.reload();
    }
  });
}

// Утилиты для управления SW из консоли (для отладки)
window.swUtils = {
  // Очистить кеши
  async clearCaches() {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ 
        command: 'trimCaches' 
      });
    }
  },
  
  // Включить/выключить отладку
  setDebug(enabled = true) {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ 
        command: 'setDebug', 
        value: enabled 
      });
    }
  },
  
  // Принудительное обновление
  async forceUpdate() {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      registration.update();
    }
  }
};