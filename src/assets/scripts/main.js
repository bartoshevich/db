
// ИСПРАВЛЕНИЕ: Правильный импорт основных стилей
import '../scss/style.scss';

import spriteUrl from '../images/sprite.svg?url';

import { Workbox } from 'workbox-window';


// ===== Критично для UX/UI =====
import "./menu.js"; // Меню, header — обязательно
import "./copyLength.js"; // Защита контента — обязательно
import "./theme.js"; 


// ===== Lazyload и другие модули, загружаемые по условию =====

document.addEventListener("DOMContentLoaded", () => {
 if (document.querySelector(".video")) {
    import("./video.js")
      .then((module) => {
        module.initVideo();
      })
      .catch((err) => console.error("⚠️ Ошибка при загрузке video.js", err));
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
// НОВАЯ, УПРОЩЕННАЯ РЕГИСТРАЦИЯ SERVICE WORKER
// =================================================================

if ('serviceWorker' in navigator && !/localhost/.test(window.location)) {
  if (Workbox) {
    const wb = new Workbox('/sw.js');

    const showUpdateBanner = () => {
      console.log("Доступна новая версия сайта. Обновить?");
      // Здесь будет ваша логика для показа красивого баннера.
      // Для принудительного обновления без участия пользователя:
       wb.addEventListener('controlling', () => {
         window.location.reload();
       });
       wb.messageSkipWaiting();
    };
    
    wb.addEventListener('waiting', showUpdateBanner);

    wb.addEventListener('activated', (event) => {
      if (!event.isUpdate) {
        console.log('✅ Service Worker активирован впервые!');
      } else {
        console.log('✅ Service Worker обновлен!');
      }
    });

    wb.register()
      .then(registration => {
        console.log('✅ Service Worker зарегистрирован:', registration);
      })
      .catch(error => {
        console.error('❌ Ошибка регистрации Service Worker:', error);
      });
  }
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
