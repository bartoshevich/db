// .eleventy.js

import path from "path";


import { URL } from "url"; // Используется в фильтре absoluteUrl
import htmlmin from "html-minifier-terser"; // Используется в трансформе htmlmin
import { DateTime } from "luxon"; // Используется в фильтрах даты
import eleventyNavigationPlugin from "@11ty/eleventy-navigation"; // Плагин навигации
import { EleventyHtmlBasePlugin } from "@11ty/eleventy"; // Плагин base URL
import sitemap from "@quasibit/eleventy-plugin-sitemap"; // Плагин карты сайта
import Image from "@11ty/eleventy-img"; // eleventy-img остается здесь, т.к. используется в shortcode
import pluginRss from "@11ty/eleventy-plugin-rss"; // Плагин RSS
import fs from 'fs'; // Используется для проверки существования файлов в PassthroughCopy
import crypto from 'crypto'; // Используется для shortcode Image (нужен для filenameFormat)
import { generateSW } from 'workbox-build'; // Используется для генерации service worker 


import * as Nunjucks from "nunjucks"; // ЭТОТ ИМПОРТ ДОЛЖЕН БЫТЬ НА ВЕРХНЕМ УРОВНЕ И ИСПОЛЬЗОВАТЬ * as


import { transform as lightningcssTransform } from "lightningcss";


import postcssConfig from "./postcss.config.js";


// Эти компиляторы нужны здесь, чтобы передать их в плагин
import * as sass from 'sass'; // Импортируем Sass
import postcss from 'postcss'; // Импортируем PostCSS
import esbuild from 'esbuild'; // Импортируем Esbuild
import * as Terser from 'terser'; // Импортируем Terser (* as Terser)


// --- Импортируем ФУНКЦИЮ плагина AssetProcessor ---

 import EleventyAssetProcessorPlugin from "./src/_11ty/AssetProcessorPlugin.js"; 



// --- Константы ---
const inputDir = "src";
const includesDir = "_includes";
const layoutsDir = "_layouts";
const outputDir = "_site";
const dataDir = "_data";

const isProdBuild = process.env.ELEVENTY_ENV === "production";


// --- Основная конфигурация Eleventy ---
export default function (eleventyConfig) {

  // Устанавливаем buildVersion
  const buildVersion = DateTime.now().toFormat("yyyyMMddHHmmss");
  eleventyConfig.addGlobalData("buildVersion", buildVersion);

  const dateStamp = new Date().toISOString().slice(0,10).replace(/-/g,"");
  eleventyConfig.addGlobalData("swVersion", `v${dateStamp}.${buildVersion}`);


  /* ------------- Nunjucks -------------- */
  // Конфигурация Nunjucks остается как есть, но объект Nunjucks уже импортирован вверху.
  const loader = new Nunjucks.FileSystemLoader(
    [
      path.resolve(inputDir, layoutsDir),
      path.resolve(inputDir, includesDir),
      path.resolve(inputDir)
    ],
    // В режиме разработки watch: true, noCache: false. В продакшене наоборот.
    { watch: !isProdBuild, noCache: isProdBuild }
  );
  const nunjucksEnv = new Nunjucks.Environment(loader);
  eleventyConfig.setLibrary("njk", nunjucksEnv);


  /* --------------- Plugins --------------- */
  // РЕГИСТРИРУЕМ ПЛАГИН ASSET PROCESSOR в первую очередь, чтобы он мог повлиять на другие части конфига (например, PassthroughCopy в dev)
  // Передаем опции (компиляторы и точки входа) вторым аргументом addPlugin
  eleventyConfig.addPlugin(EleventyAssetProcessorPlugin, {
    inputDir: inputDir, // Передаем входную директорию
    outputDir: outputDir, // Передаем выходную директорию
    compilers: {
        // Передаем ИМПОРТИРОВАННЫЕ объекты компиляторов (импорты выше)
        sass: sass,
        postcss: postcss,
        postcssConfig: postcssConfig, // Конфигурация PostCSS
        esbuild: esbuild,
        Terser: Terser, // Объект Terser (импортирован как * as Terser)
        // lightningcss: lightningcss, // lightningcss нужен только в трансформе, можно не передавать, если не используется плагином напрямую
    },

    assetEntryPoints: [
       
       `${inputDir}/assets/images/**/*.{svg,ico}`, // SVG и ICO в assets/images/ (эти форматы не всегда оптимально обрабатываются eleventy-img, обрабатываем как статику)
       // ИСПРАВЛЕНИЕ: Указываем правильный путь к главному SCSS файлу
       `${inputDir}/_input_sass/style.scss`, // Главный SCSS файл
       `${inputDir}/assets/scripts/main.js`, // Главный JS файл для бандла esbuild
       // Добавьте сюда другие JS или статические файлы (например, video, audio),
       // которые НЕ eleventy-img изображения и которые должны быть хешированы и скопированы.
       // Пример: `${inputDir}/assets/scripts/other-script.js`, `${inputDir}/assets/media/*.mp4`
       `${inputDir}/assets/scripts/critical--theme.js`, // Другой JS файл, который нужно минифицировать/копировать (обрабатывается Terser'ом в плагине)
       `${inputDir}/assets/scripts/registerServiceWorker.js`, // Другой JS файл
    ]
  });

  // Остальные плагины остаются как есть
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);
  eleventyConfig.addPlugin(sitemap, {
   lastModifiedProperty: "last_modified_at",
    sitemap: { hostname: "https://bartoshevich.by" }
  });


/* ------------- Плагин для генерации service worker ------------- */

// Копирование Service Worker файлов 
  eleventyConfig.addPassthroughCopy({
    "src/service-workers.js": "service-workers.js" 
  });
  
  // Workbox: генерация дополнительного SW (только в production)
  if (isProdBuild) {
    eleventyConfig.on("afterBuild", async () => {
      try {
        console.log("🔄 Генерация Workbox Service Worker...");
        
        const { count, size } = await generateSW({
          globDirectory: outputDir,
          globPatterns: [
            // Прекешируем критические ресурсы
            '**/*.{html,css,js}',
            // Ваши статические ресурсы
            'assets/fonts/**/*.{woff2,woff}',
            'assets/images/**/*.{svg,ico,png,jpg,jpeg,webp}',
            // Исключаем медиа файлы
            '!assets/media/**/*',
            '!assets/images/optimized/**/*'
          ],
          globIgnores: [
            '**/node_modules/**/*',
            'service-workers.js', // Не кешируем ваш основной SW
            'sw-generated.js' // Не кешируем сам Workbox SW
          ],
          swDest: `${outputDir}/sw-generated.js`,
          // Импортируем ваш существующий SW
          importScripts: ['/service-workers.js'],
          
          // Стратегии кеширования оптимизированы под ваш сайт
          runtimeCaching: [
            // HTML страницы - Network First (свежий контент приоритет)
            {
              urlPattern: /\.html$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'bartoshevich-pages',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 24 * 60 * 60
                }
              }
            },
            // CSS и JS - Stale While Revalidate  
            {
              urlPattern: /\.(?:css|js)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'bartoshevich-assets',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 7 * 24 * 60 * 60
                }
              }
            },
            // Изображения - Cache First (долгосрочно)
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|webp|avif|gif|ico)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'bartoshevich-images',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 30 * 24 * 60 * 60
                }
              }
            },
            // Шрифты - Cache First (очень долгосрочно)
            {
              urlPattern: /\.(?:woff|woff2|ttf|otf)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'bartoshevich-fonts',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 365 * 24 * 60 * 60
                }
              }
            }
          ],
          
          clientsClaim: true,
          skipWaiting: false, // Контролируемое обновление как у вас
          mode: 'production'
        });

        console.log(`✅ Workbox Service Worker сгенерирован: ${count} файлов, ${(size / 1024).toFixed(2)} KB`);
        
      } catch (error) {
        console.error('❌ Ошибка генерации Workbox Service Worker:', error);
        // Сборка продолжается даже при ошибке SW
      }
    });
  }


 

  /* ------------- Shortcodes ------------- */
  // Shortcode для изображений с eleventy-img остается как есть.
  // Он сам генерирует хешированные имена и копирует файлы в свою папку вывода.
  // Мы не добавляем эти изображения в основной манифест AssetProcessorPlugin'а.
  async function imageShortcode(
    src, // Путь к исходному изображению ОТНОСИТЕЛЬНО inputDir (например, 'assets/images/...')
    alt,
    sizes,
    widths = [414, 640, 800, 1366],
    formats = ["avif", "webp", "jpeg"],
    cssClass = ""
  ) {
    if (!alt) throw new Error(`Image Shortcode: Missing alt for image: ${src}`);

    // Строим полный путь к исходному изображению
    const fullSrcPath = path.join(process.cwd(), inputDir, src);
    if (!fs.existsSync(fullSrcPath)) {
         console.warn(`⚠️ Image Shortcode: Исходное изображение не найдено: ${fullSrcPath}`);
         // Вернуть заглушку или пустую строку? Возвращаем пустую строку.
         return '';
    }

    // Опции для eleventy-img
    const imgOptions = {
      widths,
      formats,
      outputDir: `${outputDir}/assets/images/optimized/`, // Куда сохранять в _site
      urlPath: "/assets/images/optimized/", // URL путь на сайте
      // filenameFormat уже включает хеш, генерируемый eleventy-img по умолчанию или кастомно
      filenameFormat: function(id, src, width, format) {
         // src здесь - это полный путь к исходному файлу, как передан в Image().
         // id - хеш содержимого файла (или данных).
        const extension = format;
        const name = path.basename(src, path.extname(src)); // Имя файла без расширения из полного пути

        // Хеширование на основе всех параметров - ХОРОШО для eleventy-img
        // Используем id, сгенерированный eleventy-img
        const hash = crypto
          .createHash('md5')
          .update(`${id}-${width}-${format}`) // Хешируем id, ширину и формат
          .digest('hex')
          .substring(0, 8);

        // Возвращаем только имя файла с хешем
        return `${name}-${width}w.${hash}.${extension}`;
      }
    };

    const metadata = await Image(fullSrcPath, imgOptions);

    // Генерируем HTML тег <picture>
    const lowsrc = metadata.jpeg?.[0] || Object.values(metadata)[0][0]; // Находим изображение с наименьшей шириной (или первое) для src в <img tag>
    if (!lowsrc) {
        console.warn(`⚠️ Image Shortcode: Не удалось сгенерировать метаданные для ${src}. Возможно, нет поддерживаемых форматов/ширин?`);
        return ''; // Возвращаем пустую строку, если метаданные не сгенерированы
    }

    const srcsetFor = (f) =>
      f ? Object.values(f).map((img) => img.srcset).join(", ") : "";

    // Фильтруем пустые source теги, если srcset пустой
    const sources = Object.values(metadata)
      .map((f) => {
          const srcset = srcsetFor(f);
          return srcset ? `<source type="${f[0].sourceType}" srcset="${srcset}" sizes="${sizes}">` : "";
      })
      .join("\n");

    const primarySrcset = srcsetFor(metadata.jpeg) || srcsetFor(metadata.webp); // Используем jpeg или webp для основного srcset img тега

    // Убедимся, что lowsrc.url существует перед использованием
     const imgSrc = lowsrc.url || '';


    return `<picture>\n${sources}\n<img src="${imgSrc}" width="${lowsrc.width}" height="${lowsrc.height}" alt="${alt}" loading="lazy" decoding="async"${
      cssClass ? ` class="${cssClass}"` : ""
    } sizes="${sizes}"${primarySrcset ? ` srcset="${primarySrcset}"` : ''} itemprop="contentUrl">\n</picture>`;
  }
  eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);


  /* -------------- Filters --------------- */
  // Фильтр 'hashed' теперь предоставляется и регистрируется плагином AssetProcessorPlugin.

  // Остальные фильтры остаются как есть
  eleventyConfig.addFilter("readingTime", function(text) {
    if (!text) return "0 мин."; // Добавляем проверку на null/undefined
    const wordsPerMinute = 190;
    // Учитываем различные пробельные символы и фильтруем пустые строки после split
    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    const minutes = Math.ceil(words / wordsPerMinute);
     if (minutes === 0) return "меньше минуты";
     if (minutes === 1) return "1 мин.";
    return `${minutes} мин.`;
  });
  eleventyConfig.addLiquidFilter("dateToRfc3339", pluginRss.dateToRfc3339);
	eleventyConfig.addLiquidFilter("dateToRfc822", pluginRss.dateToRfc822);

  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);
  eleventyConfig.addFilter("limit", (arr, n) => Array.isArray(arr) ? arr.slice(0, n) : arr); // Проверяем, что arr - массив
  eleventyConfig.addFilter("decodeEntities", (v) =>
    typeof v === 'string' ? v
      .replace(/ /g, "\u00A0") // Неразрывный пробел
      .replace(/—/g, "—") // Длинное тире
      .replace(/«/g, "«") // Кавычка елочка левая
      .replace(/»/g, "»") // Кавычка елочка правая
      .replace(/ö/g, "ö") // Пример символа
      .replace(/ /g, "\u00A0") // HTML сущности
      .replace(/—/g, "—")
      .replace(/«/g, "«")
      .replace(/»/g, "»")
      // Добавьте другие распространенные сущности при необходимости
      : v // Возвращаем как есть, если не строка
  );
   // Фильтр absoluteUrl может использовать base URL сайта или localhost для парсинга
  eleventyConfig.addFilter("absoluteUrl", (url, base) => {
    if (typeof url !== 'string') return url;
    try { return new URL(url, base).href; } catch { return url; }
  });
  // Фильтр setAttribute: создает новый объект с добавленным/измененным атрибутом
  eleventyConfig.addFilter("setAttribute", (obj, key, value) => {
      if (typeof obj !== 'object' || obj === null) {
          console.warn(`⚠️ setAttribute filter: Input is not an object: ${obj}. Returning input.`);
          return obj; // Возвращаем входные данные, если это не объект
      }
      return { ...obj, [key]: value };
  });

  const parseDate = (d) => {
    if (d instanceof Date) return DateTime.fromJSDate(d);
    if (typeof d === "string") {
        // Пытаемся спарсить разные форматы
        const dt = DateTime.fromISO(d);
        if (dt.isValid) return dt;
        const dt2 = DateTime.fromRFC2822(d);
        if (dt2.isValid) return dt2;
        const dt3 = DateTime.fromSQL(d);
        if (dt3.isValid) return dt3;
        // Добавьте другие форматы, если нужно, например, DateTime.fromFormat()
    }
     // Если не строка или Date, или парсинг не удался, возвращаем null
    return null;
  };

  eleventyConfig.addFilter("htmlDateString", (d) => {
    const dt = parseDate(d);
    return dt?.isValid ? dt.toISODate() : (d instanceof Date ? d.toISOString().split('T')[0] : (typeof d === 'string' ? d : '')); // Fallback
  });
  eleventyConfig.addFilter("isoDate", (d) => {
    const dt = parseDate(d);
    return dt?.isValid ? dt.toISO() : (d instanceof Date ? d.toISOString() : (typeof d === 'string' ? d : '')); // Fallback
  });
  eleventyConfig.addFilter("readableDateRU", (d) => {
    const dt = parseDate(d);
    return dt?.isValid ? dt.setLocale("ru").toFormat("d MMMM yyyy") : (typeof d === 'string' ? d : (d instanceof Date ? d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }) : '')); // Fallback
  });
  eleventyConfig.addFilter("jsonify", (o) => {
      try {
          return JSON.stringify(o, null, 2); // Добавляем форматирование для читаемости в dev, в prod минифицируется htmlmin
      } catch (e) {
          console.warn(`⚠️ jsonify filter: Failed to stringify object:`, e);
          return '{}'; // Возвращаем пустой объект или строку ошибки
      }
  });



 
 /* --------------- Фильтр для безопасного использования в RSS-каналах --------------- */

  eleventyConfig.addFilter("feedSafe", (v) => {
    if (typeof v !== 'string') return v;
    
    // Сначала выполняем обычное декодирование HTML-сущностей
    // (работает так же, как ваш decodeEntities)
    let result = v
      .replace(/&nbsp;/g, "\u00A0") // Неразрывный пробел
      .replace(/&mdash;/g, "—") // Длинное тире
      .replace(/&laquo;/g, "«") // Кавычка елочка левая
      .replace(/&raquo;/g, "»") // Кавычка елочка правая
      .replace(/ /g, "\u00A0") // HTML сущности
      .replace(/—/g, "—")
      .replace(/«/g, "«")
      .replace(/»/g, "»");
  
    // Затем, экранируем стандартные XML-символы
    result = result
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
      
    return result;
  });


  eleventyConfig.addFilter("jsonFeedSafe", (v) => {
    if (typeof v !== 'string') return v;
    
    // Для JSON преобразуем HTML-сущности в Unicode
    return v
      .replace(/&nbsp;/g, "\u00A0")
      .replace(/&mdash;/g, "—")
      .replace(/&laquo;/g, "«")
      .replace(/&raquo;/g, "»")
      .replace(/ /g, "\u00A0")
      .replace(/—/g, "—")
      .replace(/«/g, "«")
      .replace(/»/g, "»");
    
    // JavaScript автоматически экранирует специальные символы при JSON.stringify
  });


  /* --------------- Globals --------------- */
  // Пример глобальной функции Nunjucks
  eleventyConfig.addNunjucksGlobal("getBreadcrumbs", (key, items) => {
    if (!key || !Array.isArray(items)) return []; // Проверяем, что items - массив
    const map = new Map(items.map((i) => [i.data?.eleventyNavigation?.key, i]));
    const crumbs = []; let safety=10; // Ограничение на 10 уровней для безопасности
    let currentKey = key; // Используем временную переменную
    while (currentKey && safety--) {
      const item = map.get(currentKey);
      if (!item) {
           if (safety === 9) console.warn(`⚠️ getBreadcrumbs: Ключ "${currentKey}" не найден в коллекции навигации.`);
          break;
      }
      crumbs.unshift(item); // Добавляем в начало
      currentKey = item.data?.eleventyNavigation?.parent; // Переходим к родителю
    }
     // Проверяем, нашли ли мы "домашнюю" страницу или остановились раньше из-за отсутствия родителя
     // или ключа. Возможно, нужна дополнительная логика для добавления корневой страницы, если ее нет.
    return crumbs;
  });


  /* -------------- Оптимизация встроенных стилей (в HTML) -------------- */
   // Использует lightningcss.
   // Вызывается ПОСЛЕ рендеринга шаблонов.
  eleventyConfig.addTransform("optimizeInlineStyles", (content, outputPath) => {
    // Применяем только к HTML файлам и только в продакшене
    if (outputPath && outputPath.endsWith(".html")) {
      if (!isProdBuild) return content; // Только в продакшене

      // lightningcssTransform импортирован в начале файла
      if (!lightningcssTransform) {
          console.warn("⚠️ Eleventy Transform: lightningcssTransform не импортирован или недоступен.");
          return content;
      }

      return content.replace(/<style>([\s\S]*?)<\/style>/g, (match, cssContent) => {
        // Пропускаем пустые стили
        if (!cssContent.trim()) return match;

        try {
          // Используем импортированный lightningcssTransform
          const { code } = lightningcssTransform({
            code: Buffer.from(cssContent, 'utf8'),
            minify: true,
            // Дополнительные опции lightningcss при необходимости
            // например, browsers: '>= 0.2% and not dead'
          });
           // Возвращаем сжатый CSS
          return `<style>${code.toString('utf8')}</style>`;
        } catch (error) {
          // Логируем ошибку, но не прерываем сборку
          console.warn(`⚠️ Eleventy Transform: Ошибка при оптимизации встроенных стилей в ${outputPath}:`, error.message);
           // В случае ошибки возвращаем оригинальные стили
          return match;
        }
      });
    }
    return content;
  });


  /* ------------ Collections ------------ */
  // Коллекции остаются как есть
  eleventyConfig.addCollection("navigationItems", (api) =>
    // Фильтруем элементы, у которых есть ключ eleventyNavigation
    api.getAllSorted().filter((i) => i.data?.eleventyNavigation?.key)
  );
  eleventyConfig.addCollection("post", (collectionApi) =>
    collectionApi
      // Получаем все файлы .njk внутри _posts и сортируем по дате
      .getFilteredByGlob(`${inputDir}/_posts/**/*.njk`)
       .sort((a, b) => b.date - a.date) // Сортировка от новых к старым
  );


  /* ------------- HTML Minify ------------ */
  eleventyConfig.addTransform("htmlmin", async (content, outputPath) => {
    // Применяем только к HTML файлам
    if (typeof outputPath === "string" && outputPath.endsWith(".html")) {
      // Не обрабатываем в разработке
      if (!isProdBuild) return content;
       // Пропускаем пустой контент
       if (!content || typeof content !== 'string') return content;

      try {
        return await htmlmin.minify(content, {
          useShortDoctype: true,
          removeComments: true,
          collapseWhitespace: true,
          conservativeCollapse: true, // Коллапсировать только безопасные случаи
          minifyCSS: true, // Минифицирует инлайн CSS (дублирует optimizeInlineStyles, но полезно как запасной вариант)
          minifyJS: true   // Минифицирует инлайн JS
          // Добавьте другие опции по необходимости
          // processConditionalComments: true,
          // removeScriptTypeAttributes: true,
          // removeStyleLinkTypeAttributes: true,
          // sortClassName: true,
          // sortAttributes: true,
        });
      } catch (e) {
         console.warn(`⚠️ Eleventy Transform: Ошибка минификации HTML в ${outputPath}:`, e.message);
         // В случае ошибки возвращаем оригинальный контент
         return content;
      }
    }
    return content;
  });


  /* ------------ Passthrough ------------ */
  [
   
"src/mstile-150x150.png", "src/48c3b517-7a37-497c-aa5e-76363bef87b1.txt",
    "src/maskable_icon.png","src/maskable_icon_x512.png", "src/ew7d7qc6dkbqq2ybv7erfmu21vd135du.txt",
    "src/_redirects","src/_headers","src/netlify.toml","src/CNAME", 
  ].forEach((p) => eleventyConfig.addPassthroughCopy(p));


  const passthroughPaths = [
    path.join(inputDir, 'robots.txt'),
    path.join(inputDir, 'site.webmanifest'), 
    path.join(inputDir, 'browserconfig.xml'),
    path.join(inputDir, 'favicon.ico'), 
    path.join(inputDir, 'favicon-32x32.png'), 
    path.join(inputDir, 'apple-touch-icon.png'), 
    path.join(inputDir, 'favicon-16x16.png'), 
    path.join(inputDir, 'favicon-192x192.png'), 
    path.join(inputDir, 'android-chrome-192x192.png'), 
    path.join(inputDir, 'safari-pinned-tab.svg'), 
    path.join(inputDir, 'mstile-150x150.png'), 
    path.join(inputDir, '48c3b517-7a37-497c-aa5e-76363bef87b1.txt'), 
    path.join(inputDir, 'maskable_icon.png'), 
    path.join(inputDir, 'android-chrome-192x192.png'), 
    path.join(inputDir, 'maskable_icon_x512.png'), 

    path.join(inputDir, 'ew7d7qc6dkbqq2ybv7erfmu21vd135du.txt'), 
   
    path.join(inputDir, '_redirects'), // Для Netlify
    path.join(inputDir, '_headers'), // Для Netlify (нужен для настройки заголовков, как обсуждали)
    path.join(inputDir, 'netlify.toml'), // Для Netlify
    path.join(inputDir, 'CNAME'), // Для кастомного домена
    
    path.join(inputDir, 'assets/fonts') + path.sep, // <-- Копируем папку fonts   
    path.join(inputDir, 'assets/images') + path.sep, // Копируем папку images
    path.join(inputDir, 'assets/media') + path.sep, // Копируем папку media
 ];

 passthroughPaths.forEach((p) => {
     // Логика определения файла/папки и вызова addPassthroughCopy(source, dest) или addPassthroughCopy(source)
     // из предыдущего моего ответа, чтобы корректно копировать папки с сохранением структуры.
     // ... (ваш код цикла forEach из предыдущего ответа) ...
      let normalizedP = p.replace(/\\/g, '/');
      let source = normalizedP;
      let destination = undefined; // For files, destination is implicitly source relative to inputDir

      try {
           const fullPathBase = path.join(process.cwd(), normalizedP.endsWith('/') ? normalizedP.slice(0, -1) : normalizedP);
            if (!fs.existsSync(fullPathBase)) {
                 if (!isProdBuild || passthroughPaths.some(item => path.join(inputDir, item).replace(/\\/g, '/').replace(/\/$/, '') === normalizedP.replace(/\/$/, ''))) {
                    console.warn(`⚠️ Eleventy: PassthroughCopy: Путь не найден: ${fullPathBase}. Пропускаем.`);
                 }
                 return; // Skip if source path doesn't exist
            }

           const isDirectory = fs.lstatSync(fullPathBase).isDirectory();

           if (isDirectory) {
                // Для директорий используем addPassthroughCopy(source, dest) API
                source = normalizedP.endsWith('/') ? normalizedP : normalizedP + '/'; // Исходный путь со слешем
                // Целевой путь в _site будет относительно корня _site
                destination = source.startsWith(inputDir + '/') ? source.substring(inputDir.length + 1) : source;
                // Убираем конечный слеш для адресации в addPassthroughCopy если он корневой
                if (destination === './') destination = ''; // Корень

                if (!isProdBuild) console.log(`ℹ️ Eleventy: PassthroughCopy: Копирование директории "${source}" в "${destination}"`);
                eleventyConfig.addPassthroughCopy(source, destination);
           } else {
               // Для отдельных файлов используем старый синтаксис addPassthroughCopy(source)
                if (!isProdBuild) console.log(`ℹ️ Eleventy: PassthroughCopy: Копирование файла: ${p}`);
                eleventyConfig.addPassthroughCopy(p);
           }
      } catch (e) {
           console.error(`❌ Eleventy: PassthroughCopy: Ошибка при обработке пути "${p}":`, e);
      }
 });


  /* ------------- Нормализация текста ------------- */
   // Трансформ для нормализации текста в HTML.
  eleventyConfig.addTransform("normalizeNfc", (content, outputPath) => {
    if(outputPath && outputPath.endsWith(".html") && typeof content === 'string') {
       try {
           return content.normalize("NFC");
       } catch(e) {
           console.warn(`⚠️ Eleventy Transform (normalizeNfc): Ошибка нормализации NFC в ${outputPath}:`, e.message);
           return content;
       }
    }
    return content; // Возвращаем как есть, если не HTML или не строка
  });

  /* ------------- Завершение сборки ------------- */
  // В продакшене можно явно завершить процесс после afterBuild,
  // но часто Eleventy сам завершается корректно после выполнения всех асинхронных операций.
  // Раскомментируйте, если процесс Node.js не завершается сам в продакшене.
  // if (isProdBuild) {
  //   eleventyConfig.on("afterBuild", () => {
  //     console.log("✅ Продакшен сборка завершена.");
  //    process.exit(0); // Завершаем процесс Node.js
  //   });
  // }


  /* ------------- Final Config ----------- */
  return {
    // Удаляем "scss" и "js" из templateFormats, т.к. они обрабатываются в beforeBuild плагином
    templateFormats: ["md","markdown","html","liquid","njk", "json"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk", // Используем Nunjucks для обработки файлов в _data
    dir: { input: inputDir, includes: includesDir, layouts: layoutsDir, data: dataDir, output: outputDir }
  };
}