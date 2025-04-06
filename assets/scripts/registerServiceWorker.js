/* #### Service Worker Registration #### */
(() => {
    // Проверяем поддержку Service Worker и наличие объекта navigator
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    // Функция регистрации с повторными попытками
    const registerServiceWorker = async (maxRetries = 2) => {
      let retries = 0;
      const attemptRegistration = async () => {
        try {
          const registration = await navigator.serviceWorker.register(
            "/service-workers.js",
            { scope: "/" }
          );
          console.log('Service Worker успешно зарегистрирован. Scope:', registration.scope);
          return registration;
        } catch (error) {
          if (retries < maxRetries) {
            retries++;
            // Экспоненциальная задержка между попытками (1s, 2s, 4s...)
            const delay = Math.pow(2, retries) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            return attemptRegistration();
          }
          throw error;
        }
      };
      try {
        await attemptRegistration();
      } catch (error) {
        // В продакшн можно использовать более тихое логирование или мониторинг ошибок
        console.error("Service Worker registration failed after retries:", error);
      }
    };
    // Запускаем регистрацию, когда браузер не занят
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => registerServiceWorker());
    } else {
      setTimeout(() => registerServiceWorker(), 1000);
    }
  })();