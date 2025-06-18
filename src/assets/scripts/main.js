
// ИСПРАВЛЕНИЕ: Правильный импорт основных стилей
import '../scss/style.scss';

import spriteUrl from '../images/sprite.svg?url';


// ===== Критично для UX/UI =====
import "./menu.js"; // Меню, header — обязательно
import "./copyLength.js"; // Защита контента — обязательно
import "./theme.js"; // Предполагается, что это registerServiceWorker.js или его часть
import "./video.js";  // Видео — обязательно, если есть видео на странице

// ===== Lazyload и другие модули, загружаемые по условию =====

document.addEventListener("DOMContentLoaded", () => {
  // Улучшенные пути для статических импортов (Vite будет их анализировать)
  const randomButton = document.querySelector("#random-article-button");
   
    
    if (randomButton) {
      
        import("./randomArticle.js")
            .then((module) => {
               
                if (typeof module.randomArticle === 'function') {
                   
                    module.randomArticle();
                } else {
                    console.error('❌ Функция randomArticle не найдена в модуле');
                }
            })
            .catch((err) => {
                console.error("💥 Не удалось загрузить randomArticle.js:", err);
            });
    } else {
        console.warn('⚠️ Кнопка #random-article-button не найдена на странице');
        // Покажем все ID на странице для отладки
       
       
    }



  if (document.querySelector(".image-expand")) {
    import("./imageExpand.js")
      .then((module) => {
        if (typeof module.initImageExpand === 'function') {
          module.initImageExpand();
        }
      })
      .catch((err) => console.warn("Не удалось загрузить imageExpand.js:", err));
  }
});

// ===== Prefetch — только при наличии hover =====
if (window.matchMedia("(hover: hover)").matches) {
  import("./prefetcher.js")
    .catch(err => console.warn("Не удалось загрузить prefetcher.js:", err));
}


// =================================================================
// HMR ДЛЯ DEV РЕЖИМА
// =================================================================


if (import.meta.hot) {
  // Принимаем изменения для текущего модуля
  import.meta.hot.accept();
  
  // Принимаем изменения в стилях
  import.meta.hot.accept('../scss/style.scss', () => {
    console.log('🔄 Стили обновлены через HMR');
  });
  
  // Логирование для отладки
  console.log('🔥 HMR активен для main.js');
}
