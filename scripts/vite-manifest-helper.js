// scripts/vite-manifest-helper.js - Упрощенная и надежная версия

import * as fs from 'node:fs';
import path from 'path';

// =================================================================
// ОСНОВНЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С VITE МАНИФЕСТОМ
// =================================================================

/**
 * Загружает Vite манифест с обработкой ошибок
 * @param {string} manifestPath - Путь к манифесту
 * @returns {Object|null} - Объект манифеста или null
 */
export function loadViteManifest(manifestPath = '_site/assets/manifest.json') {
  const fullPath = path.resolve(process.cwd(), manifestPath);
  
  // В dev режиме манифест не нужен
  if (process.env.ELEVENTY_ENV !== 'production') {
    return null;
  }
  
  try {
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Манифест не найден: ${fullPath}`);
    }
    
    const manifestContent = fs.readFileSync(fullPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    console.log(`✅ Vite manifest загружен (${Object.keys(manifest).length} записей)`);
    return manifest;
    
  } catch (error) {
    console.error(`🚨 Ошибка загрузки Vite manifest: ${error.message}`);
    
    if (process.env.ELEVENTY_ENV === 'production') {
      throw new Error('В production режиме манифест обязателен. Запустите "npm run build:vite" перед сборкой Eleventy.');
    }
    
    return null;
  }
}

/**
 * Получает URL ассета для dev или prod режима
 * @param {string} assetKey - Ключ ассета (например, 'assets/scripts/main.js')
 * @param {Object|null} manifest - Объект манифеста
 * @param {string} devServerUrl - URL dev-сервера Vite
 * @returns {string} - Полный путь к ассету
 */
export function getAssetUrl(assetKey, manifest = null, devServerUrl = 'http://localhost:5173') {
  // В dev режиме всегда используем Vite dev server
  if (process.env.ELEVENTY_ENV !== 'production') {
    const cleanKey = assetKey.startsWith('/') ? assetKey.slice(1) : assetKey;
    return `${devServerUrl}/${cleanKey}`;
  }
  
  // В production ищем в манифесте
  if (!manifest || !manifest[assetKey]) {
    console.warn(`🚨 Ассет "${assetKey}" не найден в манифесте`);
    return `/${assetKey}`;
  }
  
  const entry = manifest[assetKey];
  if (!entry.file) {
    console.warn(`🚨 Файл для ассета "${assetKey}" не найден в манифесте`);
    return `/${assetKey}`;
  }
  
  return `/assets/${entry.file}`;
}

/**
 * Генерирует HTML теги для подключения ассетов
 * @param {string} entryKey - Ключ entry point (например, 'assets/scripts/main.js')
 * @param {Object|null} manifest - Объект манифеста
 * @param {string} devServerUrl - URL dev-сервера Vite
 * @returns {string} - HTML теги
 */
export function generateAssetTags(entryKey, manifest = null, devServerUrl = 'http://localhost:5173') {
  // В dev режиме нужен только один тег script - Vite сам обрабатывает CSS
  if (process.env.ELEVENTY_ENV !== 'production') {
    return `<script type="module" src="${devServerUrl}/${entryKey}"></script>`;
  }
  
  // В production генерируем полные теги
  if (!manifest || !manifest[entryKey]) {
    console.warn(`🚨 Entry point "${entryKey}" не найден в манифесте`);
    return '';
  }
  
  const entry = manifest[entryKey];
  let tags = '';
  
  // Подключаем CSS файлы
  if (entry.css && entry.css.length > 0) {
    entry.css.forEach(cssFile => {
      tags += `<link rel="stylesheet" href="/assets/${cssFile}">\n`;
    });
  }
  
  // Подключаем основной JS файл
  if (entry.file) {
    tags += `<script type="module" src="/assets/${entry.file}"></script>`;
  }
  
  return tags;
}

/**
 * Генерирует Vite dev client для HMR
 * @param {string} devServerUrl - URL dev-сервера Vite
 * @returns {string} - HTML тег или пустая строка
 */
export function generateDevClient(devServerUrl = 'http://localhost:5173') {
  if (process.env.ELEVENTY_ENV === 'production') {
    return '';
  }
  
  return `<script type="module" src="${devServerUrl}/@vite/client"></script>`;
}

/**
 * Генерирует preload теги для критических ресурсов
 * @param {string[]} entryKeys - Массив entry points для предзагрузки
 * @param {Object|null} manifest - Объект манифеста
 * @returns {string} - HTML теги preload
 */
export function generatePreloadLinks(entryKeys = [], manifest = null) {
  // Preload только в production
  if (process.env.ELEVENTY_ENV !== 'production' || !manifest) {
    return '';
  }
  
  const links = new Set();
  
  entryKeys.forEach(entryKey => {
    const entry = manifest[entryKey];
    if (!entry) return;
    
    // Preload основного файла
    if (entry.file) {
      links.add(`<link rel="modulepreload" href="/assets/${entry.file}">`);
    }
    
    // Preload CSS
    if (entry.css) {
      entry.css.forEach(cssFile => {
        links.add(`<link rel="preload" href="/assets/${cssFile}" as="style">`);
      });
    }
    
    // Preload импортируемых модулей
    if (entry.imports) {
      entry.imports.forEach(importKey => {
        const importEntry = manifest[importKey];
        if (importEntry && importEntry.file) {
          links.add(`<link rel="modulepreload" href="/assets/${importEntry.file}">`);
        }
      });
    }
  });
  
  return Array.from(links).join('\n');
}

/**
 * Создает объект с хелперами для Eleventy
 * @param {Object|null} manifest - Объект манифеста
 * @param {string} devServerUrl - URL dev-сервера Vite
 * @returns {Object} - Объект с функциями-хелперами
 */
export function createEleventyHelpers(manifest = null, devServerUrl = 'http://localhost:5173') {
  return {
    // Функция для получения URL ассета
    viteAsset: (assetKey) => getAssetUrl(assetKey, manifest, devServerUrl),
    
    // Функция для генерации тегов ассетов
    viteAssetTags: (entryKey) => generateAssetTags(entryKey, manifest, devServerUrl),
    
    // Функция для генерации dev client
    viteDevClient: () => generateDevClient(devServerUrl),
    
    // Функция для preload ссылок
    vitePreloadLinks: (entryKeys = []) => generatePreloadLinks(entryKeys, manifest),
    
    // Условный рендеринг
    viteDev: (devContent, prodContent = '') => {
      return process.env.ELEVENTY_ENV !== 'production' ? devContent : prodContent;
    },
    
    // URL dev сервера
    viteDevServerUrl: devServerUrl,
    
    // Информация о сборке
    viteBuildInfo: () => ({
      isDev: process.env.ELEVENTY_ENV !== 'production',
      isProd: process.env.ELEVENTY_ENV === 'production',
      hasManifest: !!manifest,
      manifestEntries: manifest ? Object.keys(manifest).length : 0
    })
  };
}

/**
 * Следит за изменениями манифеста в dev режиме
 * @param {string} manifestPath - Путь к манифесту
 * @param {Function} callback - Функция обратного вызова
 */
export function watchManifest(manifestPath = '_site/assets/manifest.json', callback = () => {}) {
  if (process.env.ELEVENTY_ENV === 'production') {
    return;
  }
  
  const fullPath = path.resolve(process.cwd(), manifestPath);
  
  if (fs.existsSync(fullPath)) {
    fs.watchFile(fullPath, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        callback();
      }
    });
  }
}

// =================================================================
// ЭКСПОРТ ПО УМОЛЧАНИЮ
// =================================================================

export default {
  loadViteManifest,
  getAssetUrl,
  generateAssetTags,
  generateDevClient,
  generatePreloadLinks,
  createEleventyHelpers,
  watchManifest
};