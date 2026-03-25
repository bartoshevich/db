import path from 'path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';
import eleventyNavigationPlugin from '@11ty/eleventy-navigation';
import sitemap from '@quasibit/eleventy-plugin-sitemap';
import Image from '@11ty/eleventy-img';
import pluginRss from '@11ty/eleventy-plugin-rss';
import * as Nunjucks from 'nunjucks';
import { createProxyMiddleware } from 'http-proxy-middleware';
import htmlmin from 'html-minifier-terser';
import { transform as lightningcssTransform } from 'lightningcss';


import { minify as terserMinify } from 'terser';
import crypto from 'crypto';


// =================================================================
// НАСТРОЙКИ ОКРУЖЕНИЯ И ПУТЕЙ
// =================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProdBuild = process.env.ELEVENTY_ENV === 'production';
const isDevBuild = !isProdBuild;

const inputDir = 'src';
const includesDir = '_includes';
const layoutsDir = '_layouts';
const outputDir = '_site';
const dataDir = '_data';

const VITE_DEV_SERVER_URL = 'http://localhost:5173';
const VITE_MANIFEST_PATH = path.join(outputDir, 'assets', 'manifest.json');

// =================================================================
// УТИЛИТЫ ДЛЯ РАБОТЫ С VITE - ИСПРАВЛЕННЫЕ
// =================================================================

/**
 * Проверяет доступность Vite dev сервера
 */
async function checkViteDevServer(url) {
  if (isProdBuild) return false;

  try {
    const response = await fetch(`${url}/@vite/client`, {
      method: 'HEAD',
      timeout: 1000,
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Загружает и парсит Vite манифест - ИСПРАВЛЕНО
 */
function loadViteManifest() {
  if (isDevBuild) return null;

  try {
    if (fs.existsSync(VITE_MANIFEST_PATH)) {
      const manifestContent = fs.readFileSync(VITE_MANIFEST_PATH, 'utf-8');
      const manifest = JSON.parse(manifestContent);
      console.log(`✅ Vite manifest загружен (${Object.keys(manifest).length} файлов)`);
      return manifest;
    }
  } catch (error) {
    console.warn(`⚠️ Не удалось загрузить Vite манифест: ${error.message}`);
  }

  if (isProdBuild) {
    console.error(`🚨 В production режиме манифест обязателен: ${VITE_MANIFEST_PATH}`);
    throw new Error(
      'Vite манифест не найден. Запустите "npm run build:vite" перед сборкой Eleventy.'
    );
  }

  return null;
}

/**
 * ИСПРАВЛЕНО: Получает URL ассета из Vite манифеста или dev сервера
 */
function getViteAssetUrl(assetKey, manifest = null) {
  if (isDevBuild) {
    // В dev режиме всегда используем Vite dev server
    const cleanKey = assetKey.startsWith('/') ? assetKey.slice(1) : assetKey;
    return `${VITE_DEV_SERVER_URL}/${cleanKey}`;
  }

  if (manifest && manifest[assetKey]) {
    return `/assets/${manifest[assetKey].file}`;
  }

  console.warn(`⚠️ Vite ассет не найден: ${assetKey}`);
  return `/${assetKey}`;
}

// =================================================================
// ОСНОВНАЯ КОНФИГУРАЦИЯ ELEVENTY
// =================================================================

export default function (eleventyConfig) {
  // Загружаем манифест для production
  const viteManifest = loadViteManifest();

  // =================================================================
  // НАСТРОЙКИ DEV РЕЖИМА И СЕРВЕРА С ПРОКСИ
  // =================================================================

  if (isDevBuild) {
    // ИСПРАВЛЕНИЕ: Правильная настройка прокси для всех ассетов
    const viteProxy = createProxyMiddleware({
      target: VITE_DEV_SERVER_URL,
      changeOrigin: true,
      ws: true, // WebSocket для HMR
      pathFilter: pathname => {
        if (pathname.startsWith('/assets/images/optimized/')) {
          return false; // НЕ проксируем оптимизированные изображения
        }
        // Проксируем все запросы к ассетам на Vite
        return (
          pathname.startsWith('/assets/') ||
          pathname.startsWith('/@vite/') ||
          pathname.startsWith('/@fs/') ||
          pathname.startsWith('/@id/') ||
          pathname.includes('.js') ||
          pathname.includes('.css') ||
          pathname.includes('.scss') ||
          pathname.includes('.svg') ||
          pathname.includes('.png') ||
          pathname.includes('.jpg') ||
          pathname.includes('.avif') ||
          pathname.includes('.jpeg') ||
          pathname.includes('.gif') ||
          pathname.includes('.webp') ||
          pathname.includes('.woff') ||
          pathname.includes('.woff2')
        );
      },
      onError: (err, req, res) => {
        console.error(`❌ Vite proxy error для ${req.url}:`, err.message);
        if (!res.headersSent) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Asset not found');
        }
      },
      logLevel: 'silent',
    });

    eleventyConfig.setServerOptions({
      port: process.env.ELEVENTY_PORT || 8080,
      showAllHosts: true,
      middleware: [viteProxy],
    });

    eleventyConfig.setWatchThrottleWaitTime(100);
    eleventyConfig.addWatchTarget('src/assets/');
    eleventyConfig.setQuietMode(true);

    console.log(
      `🚀 Dev режим: Eleventy (${process.env.ELEVENTY_PORT || 8080}) → Vite (${VITE_DEV_SERVER_URL})`
    );
  }

  eleventyConfig.setDataDeepMerge(true);

    

  // =================================================================
  // ГЛОБАЛЬНЫЕ ДАННЫЕ
  // =================================================================

  eleventyConfig.addGlobalData('isProdBuild', isProdBuild);
  eleventyConfig.addGlobalData('isDevBuild', isDevBuild);
  eleventyConfig.addGlobalData('viteDevServerUrl', VITE_DEV_SERVER_URL);

  const buildVersion = DateTime.now().toFormat('yyyyMMddHHmmss');
  eleventyConfig.addGlobalData('buildVersion', buildVersion);

  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  eleventyConfig.addGlobalData('swVersion', `v${dateStamp}.${buildVersion}`);

  // =================================================================
  // НАСТРОЙКА NUNJUCKS - ИСПРАВЛЕНО
  // =================================================================

  const nunjucksEnv = new Nunjucks.Environment(
    new Nunjucks.FileSystemLoader([
      path.join(__dirname, inputDir, includesDir),
      path.join(__dirname, inputDir, layoutsDir),
      path.join(__dirname, inputDir),
    ]),
    {
      watch: isDevBuild,
      noCache: isDevBuild,
    }
  );

  eleventyConfig.setLibrary('njk', nunjucksEnv);

  // =================================================================
  // ИСПРАВЛЕННЫЕ VITE ХЕЛПЕРЫ ДЛЯ NUNJUCKS
  // =================================================================

  /**
   * ИСПРАВЛЕНО: Vite dev client для HMR
   */
  nunjucksEnv.addGlobal('viteDevClient', () => {
    if (process.env.ELEVENTY_ENV === 'production') {
      return '';
    }
    return `<script type="module" src="${VITE_DEV_SERVER_URL}/@vite/client"></script>`;
  });

  /**
   * ИСПРАВЛЕНО: Получение URL ассета
   */
  nunjucksEnv.addGlobal('viteAsset', assetKey => {
    if (process.env.ELEVENTY_ENV !== 'production') {
      const cleanKey = assetKey.startsWith('/') ? assetKey.slice(1) : assetKey;
      return `${VITE_DEV_SERVER_URL}/${cleanKey}`;
    }

    // Проверяем возможные ключи в манифесте для критического скрипта
    const possibleKeys = [
      assetKey,
      assetKey.replace('assets/scripts/', ''),
      assetKey.replace('critical--theme.js', 'critical-theme.js'),
      'critical-theme.js',
      `src/${assetKey}`,
    ];

    for (const key of possibleKeys) {
      if (viteManifest && viteManifest[key]) {
        return `/assets/${viteManifest[key].file}`;
      }
    }

    console.warn(`⚠️ Ассет не найден в манифесте: ${assetKey}`);
    return `/${assetKey}`;
  });

  /**
   * ИСПРАВЛЕНО: Функция viteAssetTags
   */
  nunjucksEnv.addGlobal('viteAssetTags', entryKey => {
    if (process.env.ELEVENTY_ENV !== 'production') {
      return `<script type="module" src="${VITE_DEV_SERVER_URL}/${entryKey}"></script>`;
    }

    if (!viteManifest || !viteManifest[entryKey]) {
      return '';
    }

    const entry = viteManifest[entryKey];
    let tags = '';

    // CSS файлы
    if (entry.css) {
      entry.css.forEach(cssFile => {
        tags += `<link rel="stylesheet" href="/assets/${cssFile}">\n`;
      });
    }

    // JS файлы
    if (entry.file) {
      tags += `<script type="module" src="/assets/${entry.file}"></script>`;
    }

    return tags;
  });

  /**
   * ИСПРАВЛЕНО: Preload ссылки
   */
  nunjucksEnv.addGlobal('vitePreloadLinks', (entryKeys = []) => {
    if (process.env.ELEVENTY_ENV !== 'production') {
      return '';
    }

    const links = new Set();
    entryKeys.forEach(entryKey => {
      const entry = viteManifest && viteManifest[entryKey];
      if (entry) {
        if (entry.file) {
          links.add(`<link rel="modulepreload" href="/assets/${entry.file}">`);
        }
        if (entry.css) {
          entry.css.forEach(cssFile => {
            links.add(`<link rel="preload" href="/assets/${cssFile}" as="style">`);
          });
        }
      }
    });

    return Array.from(links).join('\n');
  });

  /**
   * ИСПРАВЛЕНО: Inline SVG спрайт
   */
  nunjucksEnv.addGlobal('inlineSvgSprite', () => {
    if (isDevBuild) {
      // В DEV режиме читаем и возвращаем inline спрайт
      const spritePath = path.join(__dirname, inputDir, 'assets/images/sprite.svg');

      try {
        if (fs.existsSync(spritePath)) {
          let spriteContent = fs.readFileSync(spritePath, 'utf8');

          // Убираем XML декларацию
          spriteContent = spriteContent.replace('<?xml version="1.0" encoding="UTF-8"?>', '');

          // Делаем спрайт невидимым
          spriteContent = spriteContent.replace(
            /<svg([^>]*)>/,
            '<svg$1 style="position: absolute; width: 0; height: 0; pointer-events: none;">'
          );

          return spriteContent;
        }
      } catch (error) {
        console.error(`❌ Ошибка чтения спрайта: ${error.message}`);
      }
    }

    // В PRODUCTION режиме возвращаем пустую строку (используем внешний файл)
    return '';
  });

  /**
   * ИСПРАВЛЕНО: Простая функция spritePath БЕЗ циклов
   */
  nunjucksEnv.addGlobal('spritePath', () => {
    if (isDevBuild) {
      return '';
    } else {
      // В production ищем спрайт в манифесте ОДИН раз
      if (viteManifest && viteManifest['assets/images/sprite.svg']) {
        return `/assets/${viteManifest['assets/images/sprite.svg'].file}`;
      }

      return '/assets/images/sprite.svg';
    }
  });

  /**
   * Универсальная функция для шрифтов
   */
  nunjucksEnv.addGlobal('fontAsset', fontPath => {
    return getViteAssetUrl(`assets/fonts/${fontPath}`, viteManifest);
  });

  /**
   * Условный рендеринг для dev/prod
   */
  nunjucksEnv.addGlobal('viteDev', (devContent, prodContent = '') => {
    return isDevBuild ? devContent : prodContent;
  });

  /**
   * URL dev сервера
   */
  nunjucksEnv.addGlobal('viteDevServerUrl', VITE_DEV_SERVER_URL);

  /**
   * Информация о сборке
   */
  nunjucksEnv.addGlobal('viteBuildInfo', () => {
    return {
      isDev: isDevBuild,
      isProd: isProdBuild,
      hasManifest: !!viteManifest,
      manifestEntries: viteManifest ? Object.keys(viteManifest).length : 0,
    };
  });



// =================================================================
  // ✅ НОВЫЙ БЛОК: Подготовка данных для инлайн-скрипта и CSP
  // =================================================================
 

  const criticalScriptContent = fs.readFileSync(
    path.resolve(__dirname, 'src/assets/scripts/critical--theme.js'), 'utf8'
  );
  
  // Минимизируем код синхронно (это нормально для старта сборки)
  const minifiedResult = terserMinify(criticalScriptContent, {
    mangle: { toplevel: true },
    compress: true
  });
  
  const minifiedCriticalJs = minifiedResult.code || criticalScriptContent;
  
  // Вычисляем хэш от МИНИМИЗИРОВАННОГО кода
  const cspScriptHash = crypto.createHash('sha256').update(minifiedCriticalJs).digest('base64');
  
  // Делаем минимизированный код и хэш доступными во всех шаблонах
  eleventyConfig.addGlobalData('minifiedCriticalJs', minifiedCriticalJs);
  eleventyConfig.addGlobalData('cspScriptHash', cspScriptHash);


  // =================================================================
  // ПЛАГИНЫ
  // =================================================================
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(sitemap, {
    lastModifiedProperty: 'last_modified_at',
    sitemap: {
      hostname: 'https://bartoshevich.by',
      ignore: ['/404.html', '/offline.html', '/offline/'],
    },
  });

  // =================================================================
  // УЛУЧШЕННЫЙ ШОРТКОД ДЛЯ ИЗОБРАЖЕНИЙ
  // =================================================================
  eleventyConfig.addNunjucksAsyncShortcode(
    'image',
    async function (
      src,
      alt,
      sizes,
      widths = [414, 640, 800, 1366, 1920],
      formats = ['avif', 'webp', 'jpeg'],
      cssClass = '',
      loading = 'lazy',
      decoding = 'async'
    ) {
      if (!alt) {
        throw new Error(`Image Shortcode: Missing alt text for image: ${src}`);
      }

      const fullSrcPath = path.resolve(process.cwd(), inputDir, src);

      if (!fs.existsSync(fullSrcPath)) {
        console.warn(`⚠️ Image Shortcode: Исходное изображение не найдено: ${fullSrcPath}`);
        return `<img src="${src}" alt="${alt}" loading="${loading}" decoding="${decoding}" class="${cssClass}">`;
      }

      const imgOptions = {
        widths,
        formats,
        outputDir: path.join(outputDir, 'assets', 'images', 'optimized'),
        urlPath: '/assets/images/optimized/',
        cacheOptions: {
          duration: '1d',
          directory: '.cache',
        },
        filenameFormat: function (id, src, width, format) {
          const name = path.basename(src, path.extname(src));
          const hash = crypto
            .createHash('md5')
            .update(`${src}-${width}-${format}`)
            .digest('hex')
            .substring(0, 8);
          return `${name}-${width}w-${hash}.${format}`;
        },
      };

      try {
        const metadata = await Image(fullSrcPath, imgOptions);
        return Image.generateHTML(metadata, { alt, sizes, loading, decoding, class: cssClass });
      } catch (error) {
        console.error(`❌ Image processing error for ${src}:`, error.message);
        return `<img src="${src}" alt="${alt}" loading="${loading}" decoding="${decoding}" class="${cssClass}">`;
      }
    }
  );

  eleventyConfig.addShortcode('year', () => `${new Date().getFullYear()}`);

  // =================================================================
  // ФИЛЬТРЫ
  // =================================================================
  eleventyConfig.addLiquidFilter('dateToRfc3339', pluginRss.dateToRfc3339);
  eleventyConfig.addLiquidFilter('dateToRfc822', pluginRss.dateToRfc822);

const NBSP = "\u00A0";
  const PREPOSITION_REGEX = /(^|[\s>])([ВвКкСсУуОоАаИиЯя])\s+(?=[^\s<])/g;
  const QUOTES_REGEX = /(^|[\s>«„(—-])"([^"<]+?)"(?=($|[\s<.,:;!?)]|—))/g;

const JSON_LD_SCRIPT_REGEX = /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi;

const applyTypography = value => {
    if (typeof value !== "string" || !value.trim()) return value || "";

    const preservedScripts = [];
    let protectedValue = value.replace(JSON_LD_SCRIPT_REGEX, match => {
      const placeholder = `__JSON_LD_BLOCK_${preservedScripts.length}__`;
      preservedScripts.push({ placeholder, content: match });
      return placeholder;
    });

    let result = protectedValue.replace(
      PREPOSITION_REGEX,
      (_, prefix, letter) => `${prefix}${letter}${NBSP}`
    );
    result = result.replace(
      QUOTES_REGEX,
      (_, prefix, content) => `${prefix}«${content.trim()}»`
    );

    preservedScripts.forEach(({ placeholder, content }) => {
      result = result.replace(placeholder, content);
    });

    return result;
  };

  eleventyConfig.addFilter("nbspPrepositions", value =>
    typeof value === "string" ? applyTypography(value) : value
  );





  eleventyConfig.addNunjucksGlobal('getBreadcrumbs', (key, items) => {
    if (!key || !Array.isArray(items)) return []; // Проверяем, что items - массив
    const map = new Map(items.map(i => [i.data?.eleventyNavigation?.key, i]));
    const crumbs = [];
    let safety = 10; // Ограничение на 10 уровней для безопасности
    let currentKey = key; // Используем временную переменную
    while (currentKey && safety--) {
      const item = map.get(currentKey);
      if (!item) {
        if (safety === 9)
          console.warn(`⚠️ getBreadcrumbs: Ключ "${currentKey}" не найден в коллекции навигации.`);
        break;
      }
      crumbs.unshift(item); // Добавляем в начало
      currentKey = item.data?.eleventyNavigation?.parent; // Переходим к родителю
    }

    return crumbs;
  });

  // Улучшенная функция парсинга дат
  const parseDate = d => {
    if (d instanceof Date) return DateTime.fromJSDate(d);
    if (typeof d === 'string') {
      // Пробуем разные форматы
      const formats = [
        () => DateTime.fromISO(d),
        () => DateTime.fromRFC2822(d),
        () => DateTime.fromSQL(d),
        () => DateTime.fromFormat(d, 'yyyy-MM-dd'),
        () => DateTime.fromFormat(d, 'dd.MM.yyyy'),
      ];

      for (const formatFn of formats) {
        try {
          const dt = formatFn();
          if (dt.isValid) return dt;
        } catch (e) {
          // Игнорируем ошибки парсинга
        }
      }
    }
    return null;
  };

  eleventyConfig.addFilter('readableDateRU', d => {
    const dt = parseDate(d);
    if (dt?.isValid) {
      return dt.setLocale('ru').toFormat('d MMMM yyyy');
    }

    if (typeof d === 'string') return d;
    if (d instanceof Date) {
      return d.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    return '';
  });

  eleventyConfig.addFilter('htmlDateString', d => {
    const dt = parseDate(d);
    if (dt?.isValid) return dt.toISODate();
    if (d instanceof Date) return d.toISOString().split('T')[0];
    if (typeof d === 'string') return d;
    return '';
  });

  eleventyConfig.addFilter('isoDate', d => {
    const dt = parseDate(d);
    if (dt?.isValid) return dt.toISO();
    if (d instanceof Date) return d.toISOString();
    if (typeof d === 'string') return d;
    return '';
  });

 

  /* --------------- Фильтр для безопасного использования в RSS-каналах --------------- */

  eleventyConfig.addFilter('feedSafe', v => {
    if (typeof v !== 'string') return v;

    // Сначала выполняем обычное декодирование HTML-сущностей
    // (работает так же, как ваш decodeEntities)
    let result = v
      .replace(/&nbsp;/g, '\u00A0') // Неразрывный пробел
      .replace(/&mdash;/g, '—') // Длинное тире
      .replace(/&laquo;/g, '«') // Кавычка елочка левая
      .replace(/&raquo;/g, '»') // Кавычка елочка правая
      .replace(/—/g, '—')
      .replace(/«/g, '«')
      .replace(/»/g, '»');

    // Затем, экранируем стандартные XML-символы
    result = result
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    return result;
  });

  eleventyConfig.addFilter('jsonFeedSafe', v => {
    if (typeof v !== 'string') return v;

    // Для JSON преобразуем HTML-сущности в Unicode
    return v
      .replace(/&nbsp;/g, '\u00A0')
      .replace(/&mdash;/g, '—')
      .replace(/&laquo;/g, '«')
      .replace(/&raquo;/g, '»')
      .replace(/—/g, '—')
      .replace(/«/g, '«')
      .replace(/»/g, '»');

    // JavaScript автоматически экранирует специальные символы при JSON.stringify
  });




      
// =================================================================
// === СИСТЕМА ФИЛЬТРОВ ДЛЯ ТЕКСТА ===

// 1. Создаем чистую, независимую JS-функцию. Это наш "источник правды".
const stripHtml = value => {
  if (typeof value !== 'string') return value;
  const withoutSupSub = value.replace(/<\/?(sup|sub)\b[^>]*>/gi, '');
  const withoutTags = withoutSupSub.replace(/<[^>]*>/g, ' ');
  return withoutTags.replace(/\s+/g, ' ').trim();
};

const countWords = (text) => {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // ШАГ 1: Очищаем текст от HTML-тегов, заменяя их на пробелы.
  const cleanText = stripHtml(text);

  // ШАГ 2: Считаем слова в уже очищенном тексте.
  // Используем улучшенную регулярку для поддержки разных языков и цифр.
  const words = cleanText.match(/[\p{L}\p{N}]+/gu);
  return words ? words.length : 0;
};

// 2. НОВАЯ базовая функция для получения времени чтения В ЧИСЛЕ.
// Она будет переиспользоваться обоими фильтрами.
const getReadingTimeInMinutes = (text) => {
  const words = countWords(text);
  const wordsPerMinute = 190; 
  if (words === 0) {
    return 0;
  }
  return Math.ceil(words / wordsPerMinute);
};

// 3. Фильтр 'wordcount' 
eleventyConfig.addFilter('wordcount', function (text) {
  return countWords(text);
});

// 4. Фильтр 'readingTime' для ЧЕЛОВЕКА 
eleventyConfig.addFilter('readingTime', function (text) {
  const minutes = getReadingTimeInMinutes(text);

  if (minutes === 0) {
    return 'меньше минуты'; // Можно оставить так или вернуть "0 минут"
  }

  // Используем Intl.PluralRules для правильных окончаний (мин., минуты, минут)
  const pluralRules = new Intl.PluralRules('ru-RU');
  const pluralCategory = pluralRules.select(minutes);

  switch (pluralCategory) {
    case 'one': return `${minutes} минута`;
    case 'few': return `${minutes} минуты`;
    default: return `${minutes} минут`;
  }
});


// 5. НОВЫЙ фильтр 'readingTimeISO' для МАШИНЫ (JSON-LD)
eleventyConfig.addFilter('readingTimeISO', function (text) {
    const minutes = getReadingTimeInMinutes(text);
    if (minutes === 0) {
        return 'PT1M'; // Минимальное значение, если контент есть, но очень короткий
    }
    return `PT${minutes}M`;
});

// === КОНЕЦ БЛОКА ===
// =================================================================

  


  eleventyConfig.addFilter('limit', (arr, n) => {
    if (!Array.isArray(arr)) return arr;
    return arr.slice(0, parseInt(n, 10) || 0);
  });

  const decodeEntities = v => {
    if (typeof v !== 'string') return v;
    return v
      .replace(/&nbsp;/g, '\u00A0') // Неразрывный пробел
      .replace(/&mdash;/g, '—') // Длинное тире
      .replace(/&laquo;/g, '«') // Кавычка елочка левая
      .replace(/&raquo;/g, '»') // Кавычка елочка правая
      .replace(/ö/g, 'ö') // Пример символа
      .replace(/—/g, '—')
      .replace(/«/g, '«')
      .replace(/»/g, '»');
  };

  const jsonLdText = value => {
    if (typeof value !== 'string') return value;

    let result = stripHtml(value);
    result = decodeEntities(result);
    result = stripHtml(result);

    return result.replace(/"/g, '\\"');
  };

  const arrayify = value => {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null) return [];
    return [value];
  };

  eleventyConfig.addFilter('decodeEntities', decodeEntities);
  eleventyConfig.addFilter('jsonLdText', jsonLdText);
  eleventyConfig.addFilter('arrayify', arrayify);

  eleventyConfig.addFilter('metaText', value => {
    if (typeof value !== 'string') return value;

    let result = stripHtml(value);
    result = decodeEntities(result);
    result = stripHtml(result);

    return result.replace(/"/g, '&quot;');
  });

  eleventyConfig.addFilter('absoluteUrl', (url, base) => {
    if (typeof url !== 'string') return url;

    try {
      return new URL(url, base).href;
    } catch {
      return url;
    }
  });

  eleventyConfig.addFilter('faqToSchema', function (faqItems) {
    if (!faqItems) return [];
    const items = Array.isArray(faqItems) ? faqItems : Array.from(faqItems);
    return items.map(item => ({
      '@type': 'Question',
      'name': item.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': item.answer,
      },
    }));
  });

  eleventyConfig.addFilter('setAttribute', (obj, key, value) => {
    return {
      ...obj,
      [key]: value,
    };
  });

  eleventyConfig.addFilter('merge', (target, source) => {
    const toPlainObject = value =>
      value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
      ...toPlainObject(target),
      ...toPlainObject(source),
    };
  });

  eleventyConfig.addFilter('jsonify', obj => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      console.warn(`⚠️ jsonify filter error:`, e.message);
      return '{}';
    }
  });

  eleventyConfig.addFilter('cssmin', code => {
    if (!isProdBuild || typeof code !== 'string') return code;

    try {
      return new CleanCSS({ level: 2 }).minify(code).styles;
    } catch (error) {
      console.warn(`⚠️ CSS minification error:`, error.message);
      return code;
    }
  });




 // =================================================================
  //Группировка постов по годам (с учетом даты обновления)
  // =================================================================

 
  eleventyConfig.addFilter('groupByYear', (posts) => {
    if (!posts) return [];

    const groups = new Map();

    // 1. Вспомогательная функция для получения "эффективной даты" (числом)
    const getEffectiveTime = (post) => {
        const dateVal = post.data.last_modified_at || post.date;
        return new Date(dateVal).getTime();
    };

    posts.forEach((post) => {
      // Определяем год
      const effectiveDate = new Date(getEffectiveTime(post));
      const year = effectiveDate.getFullYear().toString();

      if (!groups.has(year)) {
        groups.set(year, []);
      }
      groups.get(year).push(post);
    });

    // 2. Превращаем Map в массив и СОРТИРУЕМ ГОДЫ ПО УБЫВАНИЮ
    const sortedGroups = Array.from(groups.entries())
      .map(([year, posts]) => {
        // 3. На всякий случай сортируем посты ВНУТРИ года (свежие сверху)
        posts.sort((a, b) => getEffectiveTime(b) - getEffectiveTime(a));
        return { year, posts };
      })
      .sort((a, b) => Number(b.year) - Number(a.year)); // Сортировка самих групп (2022, 2019, 2016...)

    return sortedGroups;
  });

  // =================================================================
  // УЛУЧШЕННЫЕ ТРАНСФОРМАЦИИ
  // =================================================================
  eleventyConfig.addTransform('inlineCssOptimize', (content, outputPath) => {
    if (!outputPath?.endsWith('.html') || !isProdBuild || !content) {
      return content;
    }

    return content.replace(/<style>([\s\S]*?)<\/style>/g, (match, cssContent) => {
      if (!cssContent.trim()) return match;

      try {
        const { code } = lightningcssTransform({
          code: Buffer.from(cssContent, 'utf8'),
          minify: true,
          targets: {
            chrome: 90,
            firefox: 88,
            safari: 14,
            edge: 90,
          },
        });
        return `<style>${code.toString('utf8')}</style>`;
      } catch (error) {
        console.warn(`⚠️ CSS transform error:`, error.message);
        return match;
      }
    });
  });

    eleventyConfig.addTransform('htmlmin', async (content, outputPath) => {
    if (!outputPath?.endsWith('.html') || !isProdBuild) {
      return content;
    }

    try {
      return await htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
        removeEmptyAttributes: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        minifyCSS: true,
        // ✅ ВАЖНО: Мы говорим htmlmin, что именно игнорировать
        ignoreCustomFragments: [
            /<script\s*data-csp-preserve\s*>[\s\S]*?<\/script>/
        ],
        minifyJS: true, 
      });
    } catch (error) {
      console.warn(`⚠️ HTML minification error for ${outputPath}:`, error.message);
      return content;
    }
  });


  eleventyConfig.addTransform('normalizeNfc', (content, outputPath) => {
    if (outputPath?.endsWith('.html') && content && typeof content === 'string') {
      return content.normalize('NFC');
    }
    return content;
  });

  // =================================================================
  // КОЛЛЕКЦИИ
  // =================================================================
  eleventyConfig.addCollection('navigationItems', api => {
    return api.getAllSorted().filter(item => item.data?.eleventyNavigation?.key);
  });

  eleventyConfig.addCollection('post', api => {
    return api
      .getFilteredByGlob(`${inputDir}/_posts/**/*.njk`)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  });


  eleventyConfig.addCollection('sitemapPages', (api) => {
  const excludePaths = ['/404.html', '/offline.html', '/offline/'];
  
  return api.getAllSorted().filter(item => {
    return !item.data.eleventyExcludeFromSitemap && 
           !excludePaths.includes(item.url);
  });
});

  // =================================================================
  // КОПИРОВАНИЕ ФАЙЛОВ - ИСПРАВЛЕНО
  // =================================================================
  const passthroughFiles = [
    `${inputDir}/robots.txt`,
    `${inputDir}/site.webmanifest`,
    `${inputDir}/browserconfig.xml`,
    `${inputDir}/favicon.ico`,
    `${inputDir}/mstile-150x150.png`,
    `${inputDir}/48c3b517-7a37-497c-aa5e-76363bef87b1.txt`,
    `${inputDir}/maskable_icon.png`,
    `${inputDir}/maskable_icon_x512.png`,
    `${inputDir}/ew7d7qc6dkbqq2ybv7erfmu21vd135du.txt`,
    `${inputDir}/favicon-32x32.png`,
    `${inputDir}/apple-touch-icon.png`,
    `${inputDir}/favicon-16x16.png`,
    `${inputDir}/android-chrome-192x192.png`,
    `${inputDir}/safari-pinned-tab.svg`,
    `${inputDir}/_redirects`,
    `${inputDir}/netlify.toml`,
    `${inputDir}/CNAME`,
    `llms.txt`,
  ];

  passthroughFiles.forEach(file => {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      eleventyConfig.addPassthroughCopy({ [file]: path.basename(file) });
    }
  });

  // ✅ ПРОСТОЕ РЕШЕНИЕ: копируем ВСЮ папку images
  eleventyConfig.addPassthroughCopy({
    [`${inputDir}/assets/images`]: 'assets/images',
  });

  // ✅ Копируем шрифты
  eleventyConfig.addPassthroughCopy({
    [`${inputDir}/assets/fonts`]: 'assets/fonts',
  });

  // ✅ Копируем media
  eleventyConfig.addPassthroughCopy({
    [`${inputDir}/assets/media`]: 'assets/media',
  });

  // ИСПРАВЛЕНО: Игнорируем все файлы, которые обрабатывает Vite
  eleventyConfig.ignores.add(`${inputDir}/assets/images/sprite.svg`);
  eleventyConfig.ignores.add(`${inputDir}/assets/scripts/**/*`);
  eleventyConfig.ignores.add(`${inputDir}/assets/scss/**/*`);



 // =================================================================
// ГЕНЕРАЦИЯ SERVICE WORKER 
// =================================================================

if (isProdBuild) {
  eleventyConfig.on('eleventy.after', async () => {
    try {
      console.log('🔄 Запускаю генерацию Service Worker (режим injectManifest)...');

      // ✅ ИСПОЛЬЗУЕМ injectManifest
      const { injectManifest } = await import('workbox-build');
      const workboxConfigModule = await import('./workbox-config.js');
      const workboxConfig = workboxConfigModule.default;

      const { count, size, warnings } = await injectManifest(workboxConfig);

      if (warnings.length > 0) {
        console.warn('⚠️  Предупреждения от Workbox:', warnings);
      }
      
      console.log(
        `✅ Service Worker успешно сгенерирован: ${count} файлов для precache, итоговый размер ${(size / 1024).toFixed(2)} KB.`
      );

    } catch (error) {
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА при генерации Service Worker:', error.message);
      if (process.env.SW_REQUIRED === 'true') {
        process.exit(1);
      }
    }
  });
}

  // =================================================================
  // КОНФИГУРАЦИЯ ВОЗВРАТА
  // =================================================================
  return {
    templateFormats: ['md', 'njk', 'html', 'yml', 'liquid'],
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    dataTemplateEngine: 'njk',
    dir: {
      input: inputDir,
      includes: includesDir,
      layouts: layoutsDir,
      data: dataDir,
      output: outputDir,
    },
  };
}
