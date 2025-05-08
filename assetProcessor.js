// src/_11ty/AssetProcessorPlugin.js

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import * as glob from 'glob';
import * as sass from 'sass'; // Компилятор Sass
import postcss from 'postcss'; // Постпроцессор CSS
import esbuild from 'esbuild'; // Бандлер/минификатор JS
import * as Terser from 'terser'; // Минификатор JS (если esbuild не используется для всего)


// Определяем, идет ли продакшен сборка
const isProdBuild = process.env.ELEVENTY_ENV === "production";

/**
 * Внутренний класс для логики обработки ассетов.
 * Не экспортируется напрямую, используется функцией плагина.
 */
class AssetProcessor {
  constructor(config = {}) {
    // Проверяем наличие обязательных опций, переданных из .eleventy.js
    if (!config.compilers || !config.assetEntryPoints || !config.inputDir || !config.outputDir) {
       // Выбрасываем ошибку, т.к. без этих параметров работать не будет
       throw new Error("AssetProcessor: Missing required configuration options (inputDir, outputDir, compilers, assetEntryPoints).");
    }

    this.config = {
      assetManifest: {}, // Центральный манифест
      ...config // Включает inputDir, outputDir, compilers, assetEntryPoints
    };

    // Проверяем наличие необходимых компиляторов (предупреждения)
    if (!this.config.compilers.sass) console.warn("⚠️ AssetProcessor: Sass compiler not provided in config. SCSS compilation will not work.");
    if (!this.config.compilers.postcss) console.warn("⚠️ AssetProcessor: PostCSS compiler not provided in config. PostCSS processing will not work.");
    if (!this.config.compilers.postcssConfig) console.warn("⚠️ AssetProcessor: PostCSS config not provided in config. PostCSS processing might not work correctly.");
    if (!this.config.compilers.esbuild) console.warn("⚠️ AssetProcessor: Esbuild compiler not provided in config. JS bundling will not work.");
    if (!this.config.compilers.Terser) console.warn("⚠️ AssetProcessor: Terser compiler not provided in config. JS minification (non-bundled) will not work.");


    console.log("⚙️ AssetProcessor: Инициализирован.");
     if(isProdBuild) {
        console.log("⚙️ AssetProcessor: В режиме production. Точки входа ассетов:", this.config.assetEntryPoints);
     }
  }

  /**
   * Геттер для доступа к манифесту.
   * @returns {object} Манифест ассетов.
   */
  get manifest() {
    return this.config.assetManifest;
  }

  /**
   * Генерирует хеш содержимого.
   * @private
   */
  _generateFileHash(content, length = 8) {
    const hashSum = crypto.createHash('md5');
    try {
        if (Buffer.isBuffer(content)) {
          hashSum.update(content);
        } else if (typeof content === 'string') {
          hashSum.update(Buffer.from(content, 'utf8'));
        } else {
          console.error('❌ AssetProcessor: _generateFileHash: Содержимое должно быть строкой или буфером.');
          return '';
        }
    } catch (e) {
         console.error('❌ AssetProcessor: _generateFileHash: Ошибка при обновлении хеша:', e);
         return '';
    }

    try {
        return hashSum.digest('hex').slice(0, length);
    } catch (e) {
        console.error('❌ AssetProcessor: _generateFileHash: Ошибка при получении дайджеста хеша:', e);
        return '';
    }
  }

  /**
   * Формирует новое имя файла с хешем.
   * @private
   */
  _getHashedFilename(originalBaseName, content) {
    const parsedPath = path.parse(originalBaseName);
    const hash = this._generateFileHash(content);

    // Если хеш не сгенерирован, возвращаем оригинальное имя.
    // Предупреждаем только в продакшене, т.к. в dev этот метод не вызывается.
    if (!hash && isProdBuild) {
      console.warn(`⚠️ AssetProcessor: _getHashedFilename: Не удалось сгенерировать хеш для ${originalBaseName}. Используется оригинальное имя.`);
    }

    return `${parsedPath.name}${hash ? '.' + hash : ''}${parsedPath.ext}`;
  }

  /**
   * Добавляет запись в манифест.
   */
  addToManifest(originalWebPath, hashedWebPath) {
    // Нормализуем пути для консистентности (начинаются со слэша)
    let normalizedOriginal = originalWebPath.startsWith('/') ? originalWebPath : '/' + originalWebPath;
    let normalizedHashed = hashedWebPath.startsWith('/') ? hashedWebPath : '/' + hashedWebPath;

    if (this.config.assetManifest[normalizedOriginal] && this.config.assetManifest[normalizedOriginal] !== normalizedHashed && isProdBuild) {
       console.warn(`⚠️ AssetProcessor: Манифест конфликт для "${normalizedOriginal}": уже "${this.config.assetManifest[normalizedOriginal]}", попытка добавить "${normalizedHashed}".`);
    }

    this.config.assetManifest[normalizedOriginal] = normalizedHashed;
    // console.debug(`✅ AssetProcessor: Манифест: "${normalizedOriginal}" -> "${normalizedHashed}"`); // Лог для отладки
  }

  /**
   * Обрабатывает SCSS файл: компилирует, пост-обрабатывает, хеширует, копирует.
   * @private
   */
  async _processCssFile(filePath) {
     try {
        console.log(`--- AssetProcessor: _processCssFile: Начинаем обработку SCSS для ${filePath} ---`); // НОВЫЙ ЛОГ В НАЧАЛЕ
        const fileContent = await fsPromises.readFile(filePath, 'utf8');
        const relativePath = path.relative(this.config.inputDir, filePath); // e.g., assets/css/style.scss

        // Шаг 1: Компиляция Sass
        if (!this.config.compilers.sass) throw new Error("SCSS_COMPILE_ERROR: Sass compiler is not provided in config.");
        console.log(`--- AssetProcessor: _processCssFile: Компиляция Sass... ---`);
        let { css: resultCss } = this.config.compilers.sass.compileString(fileContent, {
          loadPaths: [path.dirname(filePath)],
          style: isProdBuild ? "compressed" : "expanded", // Сжатие только в проде
          sourceMap: !isProdBuild // Source maps только в разработке
        });
        console.log(`--- AssetProcessor: _processCssFile: Sass компиляция успешна. ---`);

        // Шаг 2: Обработка PostCSS
         console.log(`--- AssetProcessor: _processCssFile: Обработка PostCSS... ---`);
         if (this.config.compilers.postcss && this.config.compilers.postcssConfig && this.config.compilers.postcssConfig.plugins) {
             console.log(`--- AssetProcessor: _processCssFile: Вызов postcss().process()... ---`); // НОВЫЙ ЛОГ
             const postcssResult = await this.config.compilers.postcss(this.config.compilers.postcssConfig.plugins).process(resultCss, {
               from: filePath, // Важно для autoprefixer и source maps
               to: filePath.replace(/\.scss$/, '.css'),
               map: { inline: !isProdBuild } // Inline source maps только в разработке
             });
             resultCss = postcssResult.css;
             console.log(`--- AssetProcessor: _processCssFile: PostCSS обработка успешна. ---`);
         } else if (isProdBuild) {
             console.warn(`⚠️ AssetProcessor: PostCSS не настроен или не имеет плагинов для ${filePath}. Минификация/автопрефикс могут не работать.`);
         }


        // Хешируем финальное содержимое CSS
        console.log(`--- AssetProcessor: _processCssFile: Хеширование и копирование... ---`);
        const hashedName = this._getHashedFilename(path.basename(filePath).replace(/\.scss$/, '.css'), resultCss);
        // Проверяем, добавился ли хеш (для Production)
        if (!hashedName.includes('.') && isProdBuild) {
             console.warn(`⚠️ AssetProcessor: _processCssFile: Хеш не был добавлен к имени файла ${path.basename(filePath)}. Возможно, содержимое пустое или ошибка хеширования.`);
        }

        const outputRelativePath = path.join(path.dirname(relativePath), hashedName).replace(/\\/g, '/'); // assets/css/style.hash.css

        // Формируем веб-пути
        const originalWebPath = '/' + relativePath.replace(/\\/g, '/').replace(/\.scss$/, '.css'); // /assets/css/style.css
        const hashedWebPath = '/' + outputRelativePath; // /assets/css/style.hash.css

        // Полный путь для записи файла
        const fullOutputPath = path.join(process.cwd(), this.config.outputDir, outputRelativePath);

        // Создаем директорию и записываем файл
        await fsPromises.mkdir(path.dirname(fullOutputPath), { recursive: true });
        await fsPromises.writeFile(fullOutputPath, resultCss, 'utf8');
        console.log(`--- AssetProcessor: _processCssFile: Файл записан в ${fullOutputPath}. ---`);


        // Добавляем в манифест
        this.addToManifest(originalWebPath, hashedWebPath);

        console.log(`✅ AssetProcessor: Обработан SCSS: "${originalWebPath}" -> "${hashedWebPath}"`); // НОВЫЙ ЛОГ В КОНЦЕ
        return { originalWebPath, hashedWebPath };

     } catch (e) {
        // Ловим ошибку компиляции/обработки CSS
        console.error(`❌ AssetProcessor: _processCssFile: Ошибка обработки SCSS файла ${filePath}:`, e);
        console.error('    SCSS Ошибка (подробнее):', e.message);
        if (e.stack) {
            console.error('    SCSS Стек вызовов:', e.stack);
        }
        if (e.formatted) { // PostCSS ошибки иногда имеют форматированный вывод
             console.error('    SCSS Форматированная ошибка:', e.formatted);
        } else if (e.file) { // Ошибка Sass может иметь информацию о файле/строке
             console.error('    SCSS Ошибка в файле:', e.file, 'Строка:', e.line, 'Столбец:', e.column);
        }

        // В production режиме мы перебрасываем ошибку, чтобы остановить процесс Eleventy.
        throw e;
     }
  }

  /**
   * Обрабатывает JS файл: минифицирует/бандлит, хеширует, копирует.
   * @private
   */
  async _processJsFile(filePath) {
     try {
        const relativePath = path.relative(this.config.inputDir, filePath); // e.g., assets/scripts/main.js
        const originalWebPath = '/' + relativePath.replace(/\\/g, '/'); // /assets/scripts/main.js

        // Определяем, является ли файл главным входным для бандла (сравнивая с entryPoints)
        // Нужно нормализовать пути для сравнения
         const normalizedAssetEntryPoints = Array.isArray(this.config.assetEntryPoints)
            ? this.config.assetEntryPoints.map(p => path.relative(this.config.inputDir, path.join(process.cwd(), p)).replace(/\\/g, '/'))
            : [path.relative(this.config.inputDir, path.join(process.cwd(), this.config.assetEntryPoints)).replace(/\\/g, '/')];

        const isMainBundleEntry = normalizedAssetEntryPoints.includes(relativePath.replace(/\\/g, '/'));


        let resultJs; // Результат обработки JS

        // Шаг 1: Компиляция/минификация (esbuild или Terser)
        if (isMainBundleEntry) {
           if (!this.config.compilers.esbuild) throw new Error("JS_COMPILE_ERROR: Esbuild compiler is not provided in config.");
            console.log(`⚡ AssetProcessor: Запуск esbuild для бандла: ${filePath}`);
           const result = await this.config.compilers.esbuild.build({
             entryPoints: [filePath],
             bundle: true,
             minify: isProdBuild,
             sourcemap: !isProdBuild,
             write: false, // Не писать на диск пока
           });
           resultJs = result.outputFiles[0].text;

        } else {
           // Используем Terser для других JS файлов (если нужна минификация)
           if (!this.config.compilers.Terser) throw new Error("JS_COMPILE_ERROR: Terser compiler is not provided in config.");
           const fileContent = await fsPromises.readFile(filePath, 'utf8');
           if (isProdBuild) {
               try {
                    const m = await this.config.compilers.Terser.minify(fileContent, {
                         mangle: {
                           toplevel: true,
                           properties: { regex: /^_/ }
                         },
                         compress: { passes: 2 },
                         format: { comments: false }
                    });
                    resultJs = m.code ?? fileContent;
               } catch (e) {
                    console.error(`❌ AssetProcessor: Ошибка минификации Terser для ${filePath}:`, e);
                    resultJs = fileContent; // В случае ошибки используем оригинальное содержимое
               }
           } else {
              resultJs = fileContent; // В разработке просто используем оригинальное содержимое
           }
        }

        // Хешируем финальное содержимое JS
        const outputFileName = isMainBundleEntry ? 'main.bundle.js' : path.basename(filePath); // Имя файла без хеша для пути
        const hashedName = this._getHashedFilename(outputFileName, resultJs);
        // Проверяем, добавился ли хеш (для Production)
        if (!hashedName.includes('.') && isProdBuild) {
            console.warn(`⚠️ AssetProcessor: _processJsFile: Хеш не был добавлен к имени файла ${path.basename(filePath)}. Возможно, содержимое пустое или ошибка хеширования.`);
        }

        const outputRelativePath = path.join(path.dirname(relativePath), hashedName).replace(/\\/g, '/'); // assets/scripts/main.bundle.hash.js

        // Формируем веб-пути
        const hashedWebPath = '/' + outputRelativePath; // /assets/scripts/main.bundle.hash.js

        // Полный путь для записи файла
        const fullOutputPath = path.join(process.cwd(), this.config.outputDir, outputRelativePath);

        // Создаем директорию и записываем файл
        await fsPromises.mkdir(path.dirname(fullOutputPath), { recursive: true });
        await fsPromises.writeFile(fullOutputPath, resultJs, 'utf8');

        // Добавляем в манифест
        // Оригинальный веб-путь для main.js должен быть /assets/scripts/main.bundle.js,
        // т.к. мы ссылаемся на бандл в шаблонах.
        // Для других JS файлов это /assets/scripts/имя_файла.js
        const originalWebPathForManifest = isMainBundleEntry ? '/assets/scripts/main.bundle.js' : originalWebPath;

        this.addToManifest(originalWebPathForManifest, hashedWebPath);

        console.log(`✅ AssetProcessor: Обработан JS: "${originalWebPathForManifest}" -> "${hashedWebPath}"`);
        return { originalWebPath: originalWebPathForManifest, hashedWebPath };


     } catch (e) {
        console.error(`❌ AssetProcessor: _processJsFile: Ошибка обработки JS файла ${filePath}:`, e);
        console.error('    JS Ошибка (подробнее):', e.message);
        if (e.stack) {
            console.error('    JS Стек вызовов:', e.stack);
        }
        throw e; // Перебрасываем ошибку, чтобы Promise.all упал
     }
  }

  /**
   * Обрабатывает статический файл: читает, хеширует, копирует.
   * @private
   */
   async _processStaticFile(filePath) {
      try {
        // Проверяем существование файла
        if (!fs.existsSync(filePath)) {
          console.warn(`⚠️ AssetProcessor: _processStaticFile: Файл не найден: ${filePath}`);
          return null;
        }

        // Читаем содержимое файла как буфер (лучше для бинарных файлов)
        const fileContent = await fsPromises.readFile(filePath);

        // Получаем путь относительно входной директории (без src/)
        const relativePath = path.relative(this.config.inputDir, filePath); // e.g., assets/fonts/...
        const originalWebPath = '/' + relativePath.replace(/\\/g, '/'); // /assets/fonts/...

        // Генерируем хешированное имя
        const hashedName = this._getHashedFilename(path.basename(filePath), fileContent);
        // Проверяем, добавился ли хеш (для Production)
        if (!hashedName.includes('.') && isProdBuild) {
             console.warn(`⚠️ AssetProcessor: _processStaticFile: Хеш не был добавлен к имени файла ${path.basename(filePath)}. Возможно, содержимое пустое или ошибка хеширования.`);
        }

        const outputRelativePath = path.join(path.dirname(relativePath), hashedName).replace(/\\/g, '/'); // assets/fonts/font.hash.woff2

        // Формируем веб-путь с хешем
        const hashedWebPath = '/' + outputRelativePath; // /assets/fonts/font.hash.woff2

        // Полный путь для записи файла
        const fullOutputPath = path.join(process.cwd(), this.config.outputDir, outputRelativePath);

        // Создаем директорию и копируем файл
        await fsPromises.mkdir(path.dirname(fullOutputPath), { recursive: true });
        await fsPromises.copyFile(filePath, fullOutputPath);

        // Добавляем в манифест
        this.addToManifest(originalWebPath, hashedWebPath);

        console.log(`✅ AssetProcessor: Обработан статический файл: "${originalWebPath}" -> "${hashedWebPath}"`);
        return { originalWebPath, hashedWebPath };

      } catch (error) {
        console.error(`❌ AssetProcessor: _processStaticFile: Ошибка при обработке файла ${filePath}:`, error);
        console.error('    Статическая Ошибка (подробнее):', error.message);
         if (error.stack) {
            console.error('    Статическая Стек вызовов:', error.stack);
        }
        throw error; // Перебрасываем ошибку
      }
   }


  /**
   * Находит все ассеты по заданным точкам входа, обрабатывает их (компиляция/минификация/хеширование/копирование)
   * и заполняет манифест. Вызывается в beforeBuild.
   * @returns {Promise<void>} Промис, который завершается после обработки всех ассетов.
   */
  async processAllAssets() {
    if (!isProdBuild) {
      console.log('⏭️ AssetProcessor: Пропускаем обработку ассетов в режиме разработки.');
      return; // Ничего не делаем в разработке
    }

    console.log('🔍 AssetProcessor: Начинаем обработку всех ассетов (статические, SCSS, JS) по точкам входа:', this.config.assetEntryPoints);

    let filesToProcess = []; // Массив путей к файлам, найденным по всем шаблонам

    try {
      // Находим все файлы по точкам входа/шаблонам с использованием СИНХРОННОЙ версии glob.
      // Это гарантирует, что мы получим список всех файлов ДО того, как начнем их обрабатывать.
      // Ошибки glob.sync здесь будут пойманы.
      // Glob ожидает путь от корня cwd().
      const globResults = Array.isArray(this.config.assetEntryPoints)
        ? this.config.assetEntryPoints.map(pattern => {
            // Ловим ошибки glob.sync для каждого шаблона отдельно
             try {
                 // Убедимся, что шаблон начинается с inputDir/ или является полным путем
                 // glob.sync({ cwd: process.cwd(), ... options }) - может быть чище
                 const searchPattern = path.join(process.cwd(), pattern); // Строим полный путь
                 return glob.sync(searchPattern, { nodir: true, absolute: true });
             } catch(e) {
                 console.error(`❌ AssetProcessor: processAllAssets: Ошибка в glob.sync для шаблона "${pattern}":`, e);
                 // Возвращаем пустой массив для этого шаблона, но логируем ошибку
                 return [];
             }
          })
        : [glob.sync(path.join(process.cwd(), this.config.assetEntryPoints), { nodir: true, absolute: true })]; // Если assetEntryPoints - строка

      filesToProcess = globResults.flat(); // Объединяем результаты всех шаблонов

      // Фильтруем уникальные файлы
      const uniqueFiles = [...new Set(filesToProcess)];

      console.log(`✨ AssetProcessor: Найдено ${uniqueFiles.length} уникальных ассетов для обработки. Начинаем обработку.`);

      if (uniqueFiles.length === 0) {
          console.log('ℹ️ AssetProcessor: Не найдено ассетов для обработки.');
          // Если точек входа указано > 0, но файлов не найдено, это может быть ошибка в шаблонах
           if (Array.isArray(this.config.assetEntryPoints) ? this.config.assetEntryPoints.length > 0 : !!this.config.assetEntryPoints) {
              console.warn("⚠️ AssetProcessor: Указаны точки входа, но ни один файл не найден по шаблонам. Проверьте 'assetEntryPoints'!");
           }
          return;
      }

      // Обрабатываем каждый файл в зависимости от его типа
      const processingPromises = uniqueFiles.map(async filePath => {
          const ext = path.extname(filePath).toLowerCase();

          try { // Добавляем try/catch вокруг вызова _process*File
              if (ext === '.scss') {
                  // Пропускаем частичные файлы (_*.scss)
                  if (path.basename(filePath).startsWith('_')) {
                      console.debug(`⏭️ AssetProcessor: Пропускаем частичный SCSS файл: ${filePath}`);
                      return null; // Возвращаем null для пропущенных файлов
                  }
                   // Убедимся, что SCSS файл находится внутри inputDir
                  if (!filePath.startsWith(path.join(process.cwd(), this.config.inputDir))) {
                      console.warn(`⚠️ AssetProcessor: SCSS файл вне входной директории (${this.config.inputDir}): ${filePath}. Пропускаем обработку.`);
                      return null;
                  }
                  return await this._processCssFile(filePath); // Ожидаем выполнения и возвращаем результат/ошибку
              } else if (ext === '.js') {
                   // Убедимся, что JS файл находится внутри inputDir
                  if (!filePath.startsWith(path.join(process.cwd(), this.config.inputDir))) {
                      console.warn(`⚠️ AssetProcessor: JS файл вне входной директории (${this.config.inputDir}): ${filePath}. Пропускаем обработку.`);
                      return null;
                  }
                   // Логика определения isMainBundleEntry уже есть в _processJsFile.
                   // Тут просто вызываем _processJsFile для всех .js файлов, найденных glob'ом в assetEntryPoints.
                  return await this._processJsFile(filePath);
              } else {
                   // Обрабатываем как статический файл.
                   // Убедимся, что статический файл находится внутри inputDir
                  if (!filePath.startsWith(path.join(process.cwd(), this.config.inputDir))) {
                      console.warn(`⚠️ AssetProcessor: Статический файл вне входной директории (${this.config.inputDir}): ${filePath}. Пропускаем обработку.`);
                      return null;
                  }
                  return await this._processStaticFile(filePath);
              }
          } catch(e) {
              // Ошибка уже залогирована внутри _process*File.
              // Возвращаем null, чтобы Promise.all не упал,
              // но сохраняем информацию об ошибке в консоли.
              return null; // Возвращаем null при ошибке обработки файла
          }
      });

      // Ждем завершения обработки всех файлов.
      // Promise.all ждет, пока все промисы в массиве завершатся.
      // Если какой-то промис был отклонен (т.е. _process*File не поймал ошибку и перебросил ее),
      // Promise.all сам отклонится с первой ошибкой.
      // Поскольку _process*File теперь ловят ошибки и возвращают null, Promise.all не должен падать,
      // если только ошибка не происходит где-то вне _process*File вызовов (например, в map).
      const results = await Promise.all(processingPromises);

      // Фильтруем успешные результаты (те, где _process*File не вернул null)
      const successfulResults = results.filter(r => r !== null);

      console.log(`🎉 AssetProcessor: Обработка всех ассетов завершена. Успешно обработано файлов: ${successfulResults.length}`);

    } catch (error) {
      // Ловим критические ошибки, например, если сам glob.sync упал (хотя мы его обернули)
      // или что-то пошло не так до вызова _process*File
      console.error('❌ AssetProcessor: processAllAssets: Критическая ошибка при обработке ассетов (вне обработки отдельных файлов):', error);
      // В production режиме перебрасываем ошибку, чтобы Eleventy остановился.
      if (isProdBuild) {
          console.error('💥 AssetProcessor: Прерывание сборки из-за критической ошибки обработки ассетов в production режиме.');
          throw error;
      }
    }
  }


  /**
   * Сохраняет финальный манифест ассетов в JSON файл. Вызывается в afterBuild.
   */
  async saveManifest() {
    if (!isProdBuild) {
       console.log('⏭️ AssetProcessor: Пропускаем сохранение манифеста в режиме разработки.');
       return false;
     }
     console.log(`📝 AssetProcessor: Сохранение манифеста ассетов (${Object.keys(this.config.assetManifest).length} записей)...`);

   const manifestPath = path.join(
     process.cwd(),
     this.config.outputDir,
     'asset-manifest.json'
   );
   // console.debug(`--- AssetProcessor: saveManifest: Полный путь к файлу: ${manifestPath} ---`); // Слишком много логов

   try {
     // console.debug(`--- AssetProcessor: saveManifest: Перед созданием директории: ${path.dirname(manifestPath)} ---`); // Слишком много логов
     // Убедимся, что выходная директория существует (хотя Eleventy должен ее создать сам)
     await fsPromises.mkdir(path.dirname(manifestPath), { recursive: true });
     // console.debug(`--- AssetProcessor: saveManifest: Директория создана/существует. ---`); // Слишком много логов

     // console.debug(`--- AssetProcessor: saveManifest: Перед записью файла: ${manifestPath} ---`); // Слишком много логов
     // Записываем манифест в файл
     await fsPromises.writeFile(
       manifestPath,
       JSON.stringify(this.config.assetManifest, null, 2),
       'utf8'
     );
     // console.debug(`--- AssetProcessor: saveManifest: Файл записан. ---`); // Слишком много логов

     console.log(`✅ AssetProcessor: Манифест ассетов сохранен: ${manifestPath}`);

     return true;

   } catch (error) {
     console.error('❌ AssetProcessor: saveManifest: Ошибка при сохранении манифеста:', error);
     return false;
   }
 }
}

// --- ЭКСПОРТИРУЕМ ФУНКЦИЮ ПЛАГИНА ПО УМОЛЧАНИЮ ---
/**
 * Функция плагина AssetProcessor для Eleventy.
 * Инициализирует процессор и регистрирует его компоненты в Eleventy.
 * @param {object} eleventyConfig - Экземпляр конфигурации Eleventy.
 * @param {object} pluginOptions - Опции, переданные при регистрации плагина (например, { compilers, assetEntryPoints }).
 */
export default function EleventyAssetProcessorPlugin(eleventyConfig, pluginOptions) {

    // --- Инициализируем Asset Processor ВНУТРИ ФУНКЦИИ ПЛАГИНА ---
    // Экземпляр создается при регистрации плагина.
    const assetProcessor = new AssetProcessor(pluginOptions);

    // --- Регистрируем фильтр `hashed` ---
    eleventyConfig.addFilter("hashed", (filePath) => {
      const cleanPath = filePath.split('?')[0].split('#')[0];
      let normalizedPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;

      const hashedPath = assetProcessor.manifest[normalizedPath]; // Используем локальный assetProcessor

      if (!hashedPath) {
         if (isProdBuild) {
             // Предупреждаем только в продакшене
             console.warn(`⚠️ AssetProcessor: Фильтр "hashed": В Production сборке не найден хешированный путь для "${normalizedPath}". Возможно, файл не был обработан или точка входа отсутствует.`);
         } else {
            // В разработке это нормально, т.к. файлы просто копируются
            // console.debug(`ℹ️ AssetProcessor: Фильтр "hashed": В режиме разработки не найден хешированный путь для "${normalizedPath}". Используется оригинальный путь.`);
         }
         return filePath; // В продакшене вернет оригинальный путь (с предупреждением)
      }

      try {
           const url = new URL(filePath, 'http://localhost'); // Используем URL для парсинга search/hash
           url.pathname = hashedPath;
           return url.pathname + url.search + url.hash;
      } catch (e) {
           console.error(`❌ AssetProcessor: Фильтр "hashed": Ошибка при парсинге URL "${filePath}":`, e);
           return filePath;
      }
    });

    // Добавляем манифест в глобальные данные (для отладки или специфического использования)
    eleventyConfig.addGlobalData("assetManifest", assetProcessor.manifest);


    // ---- Слушатели событий Eleventy ----

    // Событие 'beforeBuild': Обработка всех ассетов.
    // Нет нужды в .bind(this), т.к. assetProcessor - это локальная переменная,
    // доступная благодаря замыканию.
    eleventyConfig.on("beforeBuild", async () => {
       console.log('--- AssetProcessor: Событие "beforeBuild" ---');
       // В production очищаем манифест перед каждой сборкой (используем локальный assetProcessor)
      if (isProdBuild) {
         console.log("🧹 AssetProcessor: Очистка манифеста ассетов перед сборкой...");
         Object.keys(assetProcessor.manifest).forEach(key => delete assetProcessor.manifest[key]);
      }

      try {
         await assetProcessor.processAllAssets(); // Используем локальный assetProcessor
         console.log('--- AssetProcessor: processAllAssets завершен (в beforeBuild) ---');
      } catch(e) {
          // Логирование уже произошло внутри processAllAssets.
          // В production режиме Eleventy сам остановится, т.к. ошибка была переброшена.
          // Можно добавить дополнительный лог здесь, если нужно:
          // console.error('❌ AssetProcessor: Критическая ошибка в beforeBuild обработчике:', e);
      }
    });


    // Событие 'afterBuild': Сохранение финального манифеста.
    // Нет нужды в .bind(this).
    eleventyConfig.on("afterBuild", async () => {
       console.log('--- AssetProcessor: Событие "afterBuild" ---');
       await assetProcessor.saveManifest(); // Используем локальный assetProcessor
       console.log('--- AssetProcessor: saveManifest завершен (в afterBuild) ---');
    });


    // ---- Passthrough Copy (условное) ----
    // В режиме разработки просто копируем все папки assets как есть.
    // В продакшене это отключено, т.к. файлы уже скопированы с хешами в beforeBuild.
     if (!isProdBuild) {
        console.log('ℹ️ AssetProcessor: В режиме разработки PassthroughCopy для папок assets...');
        const assetDirs = [
             path.join(assetProcessor.config.inputDir, 'assets/images'),
             path.join(assetProcessor.config.inputDir, 'assets/fonts'),
             path.join(assetProcessor.config.inputDir, 'assets/media'),
             path.join(assetProcessor.config.inputDir, 'assets/scripts'),
             path.join(assetProcessor.config.inputDir, 'assets/css'),
        ];
        assetDirs.forEach((p) => {
            if (fs.existsSync(p)) {
                eleventyConfig.addPassthroughCopy(p);
            } else {
                 console.warn(`⚠️ AssetProcessor: PassthroughCopy: Путь не найден в режиме разработки: ${p}`);
            }
        });
      } else {
         console.log('ℹ️ AssetProcessor: В режиме production PassthroughCopy для папок assets отключен. Копирование выполнено в beforeBuild.');
      }

       // Passthrough Copy для других файлов, которые не хешируются вообще (вне папки assets)
       // Этот список должен быть в .eleventy.js, как у тебя сейчас.
       // eleventyConfig.addPassthroughCopy("src/robots.txt"); // Пример


    console.log("✅ AssetProcessor: Плагин зарегистрирован успешно.");

    // Плагин не возвращает ничего
};