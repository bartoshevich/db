// src/sw.js - Кастомный Service Worker для интеграции с Workbox
console.log('🔧 Service Worker загружен');

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  console.log('📨 SW получил сообщение:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏭️ Принудительное обновление SW');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    // Отправляем версию SW обратно клиенту
    event.ports[0].postMessage({
      type: 'SW_VERSION',
      version: '1.0.0'
    });
  }
});

// Активация SW
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker активирован');
  
  // Немедленно контролируем все клиенты
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('🎯 SW контролирует все клиенты');
      
      // Уведомляем клиентов об активации
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            payload: {
              version: '1.0.0',
              timestamp: new Date().toISOString()
            }
          });
        });
      });
    })
  );
});

// Установка SW
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker установлен');
  // Не вызываем skipWaiting() сразу - ждем команды от пользователя
});

// Обработка fetch запросов (дополнительная логика)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Логирование для отладки (только в dev)
  if (request.mode === 'navigate') {
    console.log('🌐 Навигационный запрос:', request.url);
  }
  
  // Специальная обработка для вашего API или конкретных маршрутов
  if (request.url.includes('/api/')) {
    // Кастомная логика для API запросов
    event.respondWith(
      fetch(request)
        .then(response => {
          // Логируем успешные API запросы
          if (response.ok) {
            console.log('✅ API запрос выполнен:', request.url);
          }
          return response;
        })
        .catch(error => {
          console.error('❌ API запрос не выполнен:', request.url, error);
          // Возвращаем заглушку или кешированный ответ
          return new Response(
            JSON.stringify({ error: 'Сеть недоступна' }),
            { 
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
  }
});

// Обработка push уведомлений (для будущего расширения)
self.addEventListener('push', (event) => {
  console.log('📱 Push уведомление получено');
  
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Уведомление', {
        body: data.body || 'Новая информация доступна',
        icon: '/favicon-192x192.png',
        badge: '/maskable_icon.png',
        tag: 'update-notification',
        requireInteraction: false,
        actions: [
          {
            action: 'open',
            title: 'Открыть'
          },
          {
            action: 'dismiss',
            title: 'Закрыть'
          }
        ]
      })
    );
  }
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// Обработка ошибок
self.addEventListener('error', (event) => {
  console.error('❌ Service Worker ошибка:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Service Worker необработанное отклонение:', event.reason);
});