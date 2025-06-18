// imageExpand.js
"use strict";

// Экспортируем функцию инициализации
export function initImageExpand() {
  const elements = document.querySelectorAll(".image-expand");
  if (!elements.length) {
    // console.log("[ImageExpand] Элементы .image-expand не найдены.");
    return;
  }

  elements.forEach((element) => {
    // Проверяем, не был ли обработчик уже добавлен (если функция может вызываться несколько раз)
    if (element.dataset.imageExpandInitialized) {
      return;
    }
    element.dataset.imageExpandInitialized = "true";

    element.addEventListener("click", (event) => {
      event.preventDefault(); // Предотвращаем возможное стандартное действие, если .image-expand это <a>
      const url = element.dataset.url || element.href; // Пытаемся получить URL из data-url или href
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        console.warn("[ImageExpand] URL не найден для элемента:", element);
      }
    });

    // Улучшение доступности: делаем элемент фокусируемым и обрабатываем Enter/Space
    if (element.tagName !== 'A' && element.tagName !== 'BUTTON') {
      element.setAttribute('role', 'button');
      element.setAttribute('tabindex', '0');
    }
    element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            element.click(); // Имитируем клик
        }
    });

  });
  console.log(`[ImageExpand] Инициализировано ${elements.length} элементов.`);
}