(() => {
  // src/assets/scripts/base.js
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
      if (!event.target.closest(".menu__header") && !event.target.closest(".menu__button")) {
        if (menuButton.getAttribute("aria-expanded") === "true") {
          menuButton.setAttribute("aria-expanded", "false");
        }
        menuList.classList.remove("menu__header--open");
        menuButton.classList.remove("menu__button--open");
      }
    });
  })();
  (() => {
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
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initImageExpand, {
        once: true
      });
    } else {
      initImageExpand();
    }
  })();
  (() => {
    const MIN_COPY_LENGTH = 300;
    const MAX_COPY_LENGTH = 2e3;
    const MAX_UNMODIFIED_LENGTH = 250;
    const sourceLink = " [\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A: https://bartoshevich.by]";
    document.addEventListener("copy", (event) => {
      if (!event || !event.clipboardData) return;
      event.preventDefault();
      const selection = window.getSelection();
      const originalText = selection ? selection.toString() : "";
      if (!originalText) return;
      if (originalText.length <= MAX_UNMODIFIED_LENGTH) {
        event.clipboardData.setData("text/plain", originalText);
        return;
      }
      const maxLength = Math.floor(Math.random() * (MAX_COPY_LENGTH - MIN_COPY_LENGTH + 1)) + MIN_COPY_LENGTH;
      let truncatedText = originalText.substring(0, maxLength);
      truncatedText = truncatedText.split(" ").join(" ");
      const modifiedText = truncatedText + sourceLink;
      event.clipboardData.setData("text/plain", modifiedText);
    });
  })();
  (() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    const prefetcher = {
      // Максимальное количество URL в кэше
      MAX_CACHE_SIZE: 100,
      // Хранилище уже предзагруженных URL и DOM-элементов
      cache: /* @__PURE__ */ new Map(),
      // url -> DOM элемент
      // Массив для отслеживания порядка добавления URL
      urlQueue: [],
      // Проверяем поддержку prefetch
      supportsPrefetch: () => {
        let link = document.createElement("link");
        const supportsFeature = link.relList && link.relList.supports && link.relList.supports("prefetch");
        link = null;
        return supportsFeature;
      },
      // Проверяем, стоит ли предзагружать URL
      shouldPrefetch: (url) => {
        const currentDomain = window.location.origin;
        if (!url || url.startsWith("mailto:") || url.startsWith("tel:") || url.startsWith("http") && !url.startsWith(currentDomain) || // внешняя ссылка
        url.includes("#") || // якорная ссылка
        prefetcher.cache.has(url)) {
          return false;
        }
        return true;
      },
      // Управление размером кэша
      manageCacheSize: () => {
        if (prefetcher.urlQueue.length > prefetcher.MAX_CACHE_SIZE) {
          const oldestUrl = prefetcher.urlQueue.shift();
          const oldLinkElement = prefetcher.cache.get(oldestUrl);
          if (oldLinkElement && oldLinkElement.parentNode) {
            oldLinkElement.parentNode.removeChild(oldLinkElement);
          }
          prefetcher.cache.delete(oldestUrl);
        }
      },
      // Предзагрузка URL
      prefetch: (url) => {
        if (!prefetcher.shouldPrefetch(url)) return;
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = url;
        link.as = "document";
        link.onerror = () => {
          prefetcher.cache.delete(url);
          const index = prefetcher.urlQueue.indexOf(url);
          if (index !== -1) {
            prefetcher.urlQueue.splice(index, 1);
          }
          if (link.parentNode) {
            link.parentNode.removeChild(link);
          }
        };
        prefetcher.cache.set(url, link);
        prefetcher.urlQueue.push(url);
        prefetcher.manageCacheSize();
        document.head.appendChild(link);
      },
      // Обработчик наведения
      handleHover: (event) => {
        if (!event || !event.target) return;
        const link = event.target.closest("a");
        if (!link) return;
        const url = link.getAttribute("href");
        if (url) {
          if ("requestIdleCallback" in window) {
            requestIdleCallback(() => prefetcher.prefetch(url));
          } else {
            setTimeout(() => prefetcher.prefetch(url), 100);
          }
        }
      },
      // Инициализация
      init: () => {
        if (!prefetcher.supportsPrefetch()) return;
        document.addEventListener("mouseover", prefetcher.handleHover, {
          passive: true
        });
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", prefetcher.init, {
        once: true
      });
    } else {
      prefetcher.init();
    }
  })();
  (() => {
    const initRandomArticle = () => {
      const randomArticleButton = document.getElementById(
        "random-article-button"
      );
      if (!randomArticleButton) return;
      const articleLinksArray = Array.from(
        document.querySelectorAll(".article-link")
      );
      if (articleLinksArray.length === 0) {
        randomArticleButton.disabled = true;
        randomArticleButton.style.opacity = "0.5";
        randomArticleButton.style.cursor = "not-allowed";
        randomArticleButton.title = "\u041D\u0435\u0442 \u0441\u0442\u0430\u0442\u0435\u0439 \u0434\u043B\u044F \u0432\u044B\u0431\u043E\u0440\u0430";
        randomArticleButton.setAttribute("aria-disabled", "true");
        randomArticleButton.setAttribute("aria-label", "\u041D\u0435\u0442 \u0441\u0442\u0430\u0442\u0435\u0439 \u0434\u043B\u044F \u0432\u044B\u0431\u043E\u0440\u0430");
        return;
      }
      const setCooldown = (button) => {
        button.classList.add("button-cooldown");
        button.setAttribute("aria-disabled", "true");
        button.title = "\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u0434\u043E\u0436\u0434\u0438\u0442\u0435...";
        setTimeout(() => {
          button.classList.remove("button-cooldown");
          button.removeAttribute("aria-disabled");
          button.title = "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0441\u043B\u0443\u0447\u0430\u0439\u043D\u0443\u044E \u0441\u0442\u0430\u0442\u044C\u044E";
        }, 2e3);
      };
      randomArticleButton.addEventListener("click", (event) => {
        if (randomArticleButton.classList.contains("button-cooldown")) {
          event.preventDefault();
          return;
        }
        try {
          setCooldown(randomArticleButton);
          const randomIndex = Math.floor(
            Math.random() * articleLinksArray.length
          );
          const randomArticleElement = articleLinksArray[randomIndex];
          if (randomArticleElement && randomArticleElement.href) {
            try {
              setTimeout(() => {
                const url = new URL(
                  randomArticleElement.href,
                  window.location.origin
                );
                url.searchParams.set("utm_source", "random_button");
                window.location.href = url.toString();
              }, 300);
            } catch (error) {
              setTimeout(() => {
                window.location.href = randomArticleElement.href;
              }, 300);
            }
          } else {
            randomArticleButton.classList.remove("button-cooldown");
            randomArticleButton.removeAttribute("aria-disabled");
          }
        } catch (error) {
          randomArticleButton.classList.remove("button-cooldown");
          randomArticleButton.removeAttribute("aria-disabled");
        }
      });
      randomArticleButton.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          randomArticleButton.click();
        }
      });
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initRandomArticle, {
        once: true
      });
    } else {
      initRandomArticle();
    }
  })();

  // src/assets/scripts/theme.js
  var storageKey = "theme-preference";
  var getColorPreference = () => localStorage.getItem(storageKey) ? localStorage.getItem(storageKey) : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  var theme = { value: getColorPreference() };
  var onClick = () => {
    theme.value = theme.value === "light" ? "dark" : "light";
    setPreference();
  };
  var setPreference = () => {
    localStorage.setItem(storageKey, theme.value);
    reflectPreference();
  };
  var reflectPreference = () => {
    document.firstElementChild.setAttribute("data-theme", theme.value);
    const themeToggle = document.querySelector("#theme-toggle");
    if (themeToggle) {
      themeToggle.setAttribute("aria-label", theme.value);
    }
  };
  reflectPreference();
  window.onload = () => {
    reflectPreference();
    const themeToggle = document.querySelector("#theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", onClick);
    }
  };
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ({ matches: e }) => {
    theme.value = e ? "dark" : "light";
    setPreference();
  });

  // src/assets/scripts/video.js
  document.addEventListener("DOMContentLoaded", () => {
    const YOUTUBE_EMBED_BASE = "https://www.youtube-nocookie.com/embed/";
    const YOUTUBE_PARAMS = "?rel=0&showinfo=0&autoplay=1";
    const getYouTubeId = (url) => {
      try {
        const parsedUrl = url instanceof URL ? url : new URL(url);
        if (parsedUrl.hostname === "youtu.be") {
          return parsedUrl.pathname.slice(1);
        } else if (parsedUrl.hostname.includes("youtube.com") && parsedUrl.searchParams.has("v")) {
          return parsedUrl.searchParams.get("v");
        } else if (parsedUrl.hostname.includes("youtube.com") && parsedUrl.pathname.startsWith("/embed/")) {
          return parsedUrl.pathname.slice(7);
        } else {
          return null;
        }
      } catch (error) {
        console.warn("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0430\u0440\u0441\u0438\u043D\u0433\u0435 YouTube URL:", error);
        return null;
      }
    };
    const createIframe = (id) => {
      const iframe = document.createElement("iframe");
      iframe.allowFullscreen = true;
      iframe.allow = "autoplay";
      iframe.classList.add("video__media");
      iframe.loading = "lazy";
      iframe.src = `${YOUTUBE_EMBED_BASE}${id}${YOUTUBE_PARAMS}`;
      return iframe;
    };
    const setupVideo = (videoElement) => {
      const link = videoElement.querySelector(".video__link");
      const button = videoElement.querySelector(".video__button");
      if (!link) {
        console.warn("\u0412\u0438\u0434\u0435\u043E-\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440 \u043D\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 .video__link \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430");
        return;
      }
      const videoId = getYouTubeId(link.href);
      if (!videoId) {
        console.warn("\u041D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E \u0438\u0437\u0432\u043B\u0435\u0447\u044C ID \u0432\u0438\u0434\u0435\u043E \u0438\u0437 \u0441\u0441\u044B\u043B\u043A\u0438:", link.href);
        return;
      }
      const handleClick = (event) => {
        event.preventDefault();
        if (videoElement.querySelector("iframe")) {
          return;
        }
        if (link) link.remove();
        if (button) button.remove();
        const iframe = createIframe(videoId);
        videoElement.appendChild(iframe);
        videoElement.removeEventListener("click", handleClick);
      };
      videoElement.addEventListener("click", handleClick);
      videoElement.classList.add("video--enabled");
    };
    const videos = document.querySelectorAll(".video");
    videos.forEach(setupVideo);
  });
})();
// @license magnet:?xt=urn:btih:d3d9a9a6595521f9666a5e94cc830dab83b65699&dn=expat.txt Expat
// @license-end
