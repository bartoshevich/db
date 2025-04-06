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

(async () => {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Worker не поддерживается в этом браузере.");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      "/service-workers.js",
      {
        scope: "/",
      }
    );
    console.log("Service Worker зарегистрирован. Scope:", registration.scope);
  } catch (error) {
    console.error("Service Worker registration failed:", error);
  }
})();

/* #### Image Expand #### */
(() => {
  document.addEventListener("DOMContentLoaded", () => {
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
  });
})();

/* #### Copy to Clipboard #### */
(() => {
  const MIN_COPY_LENGTH = 300;
  const MAX_COPY_LENGTH = 2000;
  const MAX_UNMODIFIED_LENGTH = 250;
  const sourceLink = " [Источник: https://bartoshevich.by]";

  document.addEventListener("copy", (event) => {
    event.preventDefault();

    const selection = window.getSelection();
    const originalText = selection ? selection.toString() : "";

    if (!originalText) return;

    if (originalText.length <= MAX_UNMODIFIED_LENGTH) {
      event.clipboardData?.setData("text/plain", originalText);
      return;
    }

    const maxLength =
      Math.floor(Math.random() * (MAX_COPY_LENGTH - MIN_COPY_LENGTH + 1)) +
      MIN_COPY_LENGTH;

    let truncatedText = originalText.substring(0, maxLength);

    truncatedText = truncatedText.split(" ").join(" ");

    const modifiedText = truncatedText + sourceLink;

    event.clipboardData?.setData("text/plain", modifiedText);
  });
})();

/* #### Prefetch on hover functionality #### */

const prefetcher = {
  // Максимальное количество URL в кэше
  MAX_CACHE_SIZE: 100,

  // Хранилище уже предзагруженных URL с порядком использования
  prefetchedUrls: new Set(),

  // Массив для отслеживания порядка добавления URL (для реализации ограниченного кэша)
  urlQueue: [],

  // Проверяем поддержку prefetch
  supportsPrefetch: () => {
    const link = document.createElement("link");
    return (
      link.relList && link.relList.supports && link.relList.supports("prefetch")
    );
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
      const oldLink = document.querySelector(
        `link[href="${oldestUrl}"][rel="prefetch"]`
      );
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
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = url;
    link.as = "document";

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
  document.addEventListener("DOMContentLoaded", prefetcher.init);
} else {
  prefetcher.init();
}



/* #### Random Article #### */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    const randomArticleButton = document.getElementById(
      "random-article-button"
    );
    if (!randomArticleButton) {
      return;
    }
    const articleLinksArray = Array.from(
      document.querySelectorAll(".article-link")
    );
    if (articleLinksArray.length === 0) {
      console.warn(
        "Кнопка случайной статьи найдена (#random-article-button), но ссылки на статьи (.article-link) отсутствуют."
      );
      randomArticleButton.disabled = true;
      randomArticleButton.style.opacity = "0.5";
      randomArticleButton.style.cursor = "not-allowed";
      randomArticleButton.title = "Нет статей для выбора";
      randomArticleButton.setAttribute("aria-disabled", "true");
      randomArticleButton.setAttribute("aria-label", "Нет статей для выбора");
      return;
    }
    randomArticleButton.addEventListener("click", () => {
      try {
        const randomIndex = Math.floor(
          Math.random() * articleLinksArray.length
        );
        const randomArticleElement = articleLinksArray[randomIndex];
        if (randomArticleElement && randomArticleElement.href) {
          try {
            const url = new URL(
              randomArticleElement.href,
              window.location.origin
            );
            url.searchParams.set("utm_source", "random_button");
            window.location.href = url.toString();
          } catch (error) {
            console.warn(
              "Не удалось добавить UTM-метку, используем исходную ссылку:",
              error
            );
            window.location.href = randomArticleElement.href;
          }
        } else {
          console.error(
            "Выбранный элемент не является корректной ссылкой:",
            randomArticleElement
          );
        }
      } catch (error) {
        console.error("Ошибка при попытке перехода к случайной статье:", error);
      }
    });
  },
  { once: true }
);
