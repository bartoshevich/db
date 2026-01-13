
let pagefindInstance = null;

/**
 * Debounce-функция для оптимизации поиска
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Проверка доступности Pagefind индекса
 */
async function checkPagefindAvailability() {
  try {
    const response = await fetch('/pagefind/pagefind.js', { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Инициализация Pagefind UI
 */
async function initializePagefind() {
  const container = document.getElementById('blog-search-container');
  if (!container) return;

  // Проверяем доступность индекса
  const isAvailable = await checkPagefindAvailability();
  
  if (!isAvailable) {
    showDevModeMessage();
    return;
  }

  try {
    // Показываем индикатор загрузки
    container.innerHTML = '<div class="pagefind-loading">Загрузка поиска...</div>';

    // Динамически подгружаем CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/pagefind/pagefind-ui.css';
    document.head.appendChild(link);

    // Динамически подгружаем JS
    const script = document.createElement('script');
    script.src = '/pagefind/pagefind-ui.js';
    
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });

    // Очищаем контейнер и инициализируем Pagefind
    container.innerHTML = '';

    if (typeof PagefindUI === 'undefined') {
      throw new Error('PagefindUI не загружен');
    }

    pagefindInstance = new PagefindUI({
      element: '#blog-search-container',
      showSubResults: true,
      showImages: false,
      excerptLength: 15,
      resetStyles: false,
      translations: {
        placeholder: 'Искать по статьям блога',
        zero_results: 'По запросу «[SEARCH_TERM]» ничего не найдено. Попробуйте другие ключевые слова.',
        clear_search: 'Очистить',
        load_more: 'Показать ещё результаты',
        searching: 'Поиск...',
        filters_label: 'Фильтры'
      }
    });

    // Добавляем debounce и управление видимостью
    setupSearchDebounce();
    setupSearchVisibilityToggle();
    applyInitialQueryFromUrl();

  } catch (error) {
    console.error('Ошибка загрузки Pagefind UI:', error);
    showErrorMessage();
  }
}

/**
 * Настройка debounce для поиска
 */
function setupSearchDebounce() {
  setTimeout(() => {
    const searchInput = document.querySelector('#blog-search-container input[type="search"]');
    
    if (searchInput) {
      const originalInputHandler = searchInput.oninput;
      
      searchInput.oninput = debounce((e) => {
        if (originalInputHandler) {
          originalInputHandler.call(searchInput, e);
        }
      }, 300);
    }
  }, 200);
}

/**
 * Переключение видимости списка всех постов
 */
function setupSearchVisibilityToggle() {
  setTimeout(() => {
    const searchInput = document.querySelector('#blog-search-container input[type="search"]');
    const blogList = document.querySelector('.blog-list');
    const allPostsSection = document.getElementById('all-posts');
    
    if (searchInput && blogList && allPostsSection) {
      searchInput.addEventListener('input', (e) => {
        const hasQuery = e.target.value.trim() !== '';
        
        if (hasQuery) {
          blogList.style.display = 'none';
          allPostsSection.querySelector('.heading--beta').style.display = 'none';
          allPostsSection.querySelector('.secondary-color').style.display = 'none';
        } else {
          blogList.style.display = '';
          allPostsSection.querySelector('.heading--beta').style.display = '';
          allPostsSection.querySelector('.secondary-color').style.display = '';
        }
      });
    }
  }, 200);
}

/**
 * Подхватываем поисковый запрос из URL (?q=...)
 */
function applyInitialQueryFromUrl() {
  setTimeout(() => {
    const searchInput = document.querySelector('#blog-search-container input[type="search"]');
    if (!searchInput) return;

    const params = new URL(window.location.href).searchParams;
    const query = params.get('q');
    if (!query) return;

    searchInput.value = query;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  }, 250);
}

/**
 * Сообщение для dev-режима
 */
function showDevModeMessage() {
  const container = document.getElementById('blog-search-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="pagefind-dev-message">
      <p>
        <strong>Dev-режим:</strong> Индекс поиска отсутствует. 
        <br><br>
        Для тестирования поиска запустите:
        <br>
        <code>npm run dev:with-search</code>
        или
        <code>npm run dev:search</code>
      </p>
    </div>
  `;
}

/**
 * Сообщение об ошибке загрузки
 */
function showErrorMessage() {
  const container = document.getElementById('blog-search-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="pagefind-error-message">
      <p>⚠️ Не удалось загрузить поиск. Попробуйте обновить страницу.</p>
    </div>
  `;
}

/**
 * Инициализация при загрузке страницы
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePagefind);
} else {
  initializePagefind();
}
