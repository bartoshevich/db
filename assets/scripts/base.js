/* #### MENU #### */
(() => {
  const menuList = document.querySelector(".menu__header");
  const menuButton = document.querySelector(".menu__button");

  if (!menuButton || !menuList) return;

  const mobileMenu = () => {
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", !expanded);

    menuButton.classList.toggle("menu__button--open", !expanded);
    menuList.classList.toggle("menu__header--open", !expanded);
  };

  menuButton.addEventListener("click", mobileMenu);

  menuButton.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      mobileMenu();
    }
  });

  window.addEventListener("click", (event) => {
    if (
      !event.target.closest(".menu__header") &&
      !event.target.closest(".menu__button")
    ) {
      if (menuButton.getAttribute("aria-expanded") === "true") {
        menuButton.setAttribute("aria-expanded", "false");
      }
      menuList.classList.remove("menu__header--open");
      menuButton.classList.remove("menu__button--open");
    }
  });
})();

/* #### Service Worker Registration #### */
(() => {
  // Проверяем поддержку Service Worker и наличие объекта navigator
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
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
        return registration;
      } catch (error) {
        if (retries < maxRetries) {
          retries++;
          // Экспоненциальная задержка между попытками (1s, 2s, 4s...)
          const delay = Math.pow(2, retries) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
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
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => registerServiceWorker());
  } else {
    setTimeout(() => registerServiceWorker(), 1000);
  }
})();

/* #### Image Expand #### */
(() => {
  // Проверяем готовность DOM
  const initImageExpand = () => {
    const elements = document.querySelectorAll(".image-expand");
    if (!elements.length) return;

    elements.forEach((element) => {
      element.addEventListener("click", () => {
        const url = element.dataset.url;
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      });
    });
  };

  // Используем единый подход к проверке готовности DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initImageExpand, { once: true });
  } else {
    initImageExpand();
  }
})();

/* #### Copy to Clipboard #### */
(() => {
  const MIN_COPY_LENGTH = 300;
  const MAX_COPY_LENGTH = 2000;
  const MAX_UNMODIFIED_LENGTH = 250;
  const sourceLink = " [Источник: https://bartoshevich.by]";

  document.addEventListener("copy", (event) => {
    // Проверяем доступность объекта event и clipboardData
    if (!event || !event.clipboardData) return;
    
    event.preventDefault();

    const selection = window.getSelection();
    const originalText = selection ? selection.toString() : "";

    if (!originalText) return;

    if (originalText.length <= MAX_UNMODIFIED_LENGTH) {
      event.clipboardData.setData("text/plain", originalText);
      return;
    }

    const maxLength =
      Math.floor(Math.random() * (MAX_COPY_LENGTH - MIN_COPY_LENGTH + 1)) +
      MIN_COPY_LENGTH;

    let truncatedText = originalText.substring(0, maxLength);
    truncatedText = truncatedText.split(" ").join(" ");

    const modifiedText = truncatedText + sourceLink;

    event.clipboardData.setData("text/plain", modifiedText);
  });
})();

/* #### Prefetch on hover functionality #### */
(() => {
  // Проверка на наличие необходимых глобальных объектов
  if (typeof window === 'undefined' || typeof document === 'undefined') {
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
      const supportsFeature = link.relList && 
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
        !url || // нет URL
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
    document.addEventListener("DOMContentLoaded", prefetcher.init, { once: true });
  } else {
    prefetcher.init();
  }
})();

/* #### Random Article #### */
(() => {
  // Функция инициализации случайной статьи
  const initRandomArticle = () => {
    const randomArticleButton = document.getElementById("random-article-button");
    if (!randomArticleButton) return;

    const articleLinksArray = Array.from(document.querySelectorAll(".article-link"));
    
    if (articleLinksArray.length === 0) {
      // Предупреждение только для разработки, в продакшене можно убрать
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          "Кнопка случайной статьи найдена (#random-article-button), но ссылки на статьи (.article-link) отсутствуют."
        );
      }
      
      // Деактивируем кнопку
      randomArticleButton.disabled = true;
      randomArticleButton.style.opacity = "0.5";
      randomArticleButton.style.cursor = "not-allowed";
      randomArticleButton.title = "Нет статей для выбора";
      randomArticleButton.setAttribute("aria-disabled", "true");
      randomArticleButton.setAttribute("aria-label", "Нет статей для выбора");
      return;
    }

    // Добавляем обработчик события клика
    randomArticleButton.addEventListener("click", () => {
      try {
        const randomIndex = Math.floor(Math.random() * articleLinksArray.length);
        const randomArticleElement = articleLinksArray[randomIndex];
        
        if (randomArticleElement && randomArticleElement.href) {
          try {
            const url = new URL(randomArticleElement.href, window.location.origin);
            url.searchParams.set("utm_source", "random_button");
            window.location.href = url.toString();
          } catch (error) {
            // В продакшн режиме можно убрать детали ошибки
            window.location.href = randomArticleElement.href;
          }
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.error("Выбранный элемент не является корректной ссылкой:", randomArticleElement);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error("Ошибка при попытке перехода к случайной статье:", error);
        }
      }
    });
  };

  // Проверяем готовность DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRandomArticle, { once: true });
  } else {
    initRandomArticle();
  }
})();