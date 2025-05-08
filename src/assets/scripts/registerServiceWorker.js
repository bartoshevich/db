// src/assets/scripts/registerServiceWorker.js

/* #### Service Worker Registration #### */
(() => {
  // Проверяем поддержку Service Worker и наличие объекта navigator
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    console.warn('Service Worker: Браузер не поддерживает Service Workers.');
    return; // Выходим, если Service Worker не поддерживается
  }

  // --- Проверяем среду выполнения (hostname) ---
  const hostname = window.location.hostname;
  // Определяем ваши продакшен-домены. Добавьте сюда 'www.bartoshevich.by' или другие, если используются.
  const productionHosts = ['bartoshevich.by'];

  // --- Условная регистрация ---
  // Регистрируем Service Worker ТОЛЬКО если текущий hostname находится в списке продакшен-хостов
  if (productionHosts.includes(hostname)) {
      // --- Продакшен Среда: Регистрируем SW ---
      console.log('Service Worker: Текущий хост продакшен (%s). Попытка регистрации...', hostname);

      // Функция регистрации с повторными попытками (оставляем вашу логику)
      const registerServiceWorker = async (maxRetries = 2) => {
        let retries = 0;
        const attemptRegistration = async () => {
          try {
            // Выполняем регистрацию Service Worker'а
            // Убедитесь, что путь к файлу Service Worker'а правильный.
            // Если он копируется в корень _site через PassthroughCopy, путь '/service-workers.js' верен.
            const registration = await navigator.serviceWorker.register(
              "/service-workers.js",
              { scope: "/" } // Область контроля SW (весь сайт)
            );
            console.log('Service Worker успешно зарегистрирован. Scope:', registration.scope);
            return registration;
          } catch (error) {
            if (retries < maxRetries) {
              retries++;
              // Экспоненциальная задержка между попытками
              const delay = Math.pow(2, retries) * 1000;
              console.warn(`Service Worker: Регистрация не удалась, повторная попытка через ${delay}ms (Попытка ${retries}/${maxRetries}):`, error);
              await new Promise((resolve) => setTimeout(resolve, delay));
              return attemptRegistration(); // Повторная попытка
            }
            throw error; // Перебрасываем ошибку после всех попыток
          }
        };

        // Запускаем регистрацию с отложенной логикой (ваша requestIdleCallback/setTimeout)
        try {
          await attemptRegistration();
        } catch (error) {
          // Логирование ошибки после всех неудачных попыток
          console.error("Service Worker: Регистрация не удалась после повторных попыток:", error);
          // В продакшн можно использовать более тихое логирование или отправку в сервис мониторинга ошибок
        }
      };

      // Запускаем регистрацию, когда браузер не занят
      if ("requestIdleCallback" in window) {
        requestIdleCallback(() => registerServiceWorker());
      } else {
        // Фаллбэк для старых браузеров
        setTimeout(() => registerServiceWorker(), 1000);
      }

  } else {
      // --- Среда не Продакшен: Пропускаем Регистрацию и Снимаем Существующие ---
      console.log('Service Worker: Текущий хост НЕ продакшен (%s). Регистрация пропущена.', hostname);

      // В режиме разработки (localhost, 127.0.0.1) или на других не-продакшен хостах
      // очень важно снять регистрацию любого ранее установленного SW,
      // чтобы он не мешал локальной работе и отладке.
      if ('serviceWorker' in navigator) { // Повторная проверка поддержки SW, хотя она уже была в начале IIFE
           navigator.serviceWorker.getRegistrations().then(registrations => {
            if (registrations.length > 0) {
                 console.log('Service Worker: Найдено %d существующих регистраций для снятия.', registrations.length);
            }
            // Снимаем каждую найденную регистрацию
            for (const registration of registrations) {
              console.log('Service Worker: Снятие регистрации:', registration.scope);
              registration.unregister(); // unregister() возвращает Promise, но нам не нужно ждать их завершения здесь
            }
          }).catch(error => {
            console.error('Service Worker: Ошибка при получении/снятии регистраций:', error);
          });

           // Опционально: Можно также очистить все кеши, чтобы гарантировать чистый старт в dev.
           // Будьте осторожны, это может быть излишне агрессивно.
           /*
           caches.keys().then(cacheNames => {
               return Promise.all(
                   cacheNames.map(cacheName => {
                       console.log('Service Worker: Удаление кеша:', cacheName);
                       return caches.delete(cacheName);
                   })
               );
           }).then(() => console.log('Service Worker: Все кеши очищены.'));
           */
      }
  }
})();