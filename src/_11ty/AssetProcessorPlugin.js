// src/_11ty/AssetProcessorPlugin.js

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import * as glob from 'glob';
import sass from 'sass';
import postcss from 'postcss';
import esbuild from 'esbuild';
import * as Terser from 'terser';


// Определяем, идет ли продакшен сборка
const isProdBuild = process.env.ELEVENTY_ENV === "production";



/**
 * Внутренний класс для логики обработки ассетов.
 * Не экспортируется напрямую, используется функцией плагина.
 */
class AssetProcessor {
  constructor(config = {}) {
    if (!config.compilers || !config.assetEntryPoints || !config.inputDir || !config.outputDir) {
       throw new Error("AssetProcessor: Missing required configuration options (inputDir, outputDir, compilers, assetEntryPoints).");
    }

    const requiredCompilers = ['sass', 'postcss', 'postcssConfig', 'esbuild', 'Terser'];
    requiredCompilers.forEach(compilerKey => {
        if (!config.compilers[compilerKey]) {
            const message = `AssetProcessor: Compiler "${compilerKey}" not provided in config. Asset processing might fail.`;
            if (isProdBuild) {
                 throw new Error(`❌ ${message}`);
            } else {
                 console.warn(`⚠️ ${message}`);
            }
        }
    });

    this.config = {
      assetManifest: {}, // Центральный манифест
      ...config
    };

    console.log("⚙️ AssetProcessor: Инициализирован.");
     if(isProdBuild) {
        console.log("⚙️ AssetProcessor: В режиме production. Точки входа ассетов:", this.config.assetEntryPoints);
     } else {
         console.log("⚙️ AssetProcessor: В режиме development. Точки входа ассетов будут найдены, но обработка будет минимальной (компиляция/копирование).");
     }
  }

  get manifest() {
    return this.config.assetManifest;
  }

  _generateFileHash(content, length = 8) {
    try {
        const hashSum = crypto.createHash('md5');
        if (Buffer.isBuffer(content)) {
          hashSum.update(content);
        } else if (typeof content === 'string') {
          hashSum.update(Buffer.from(content, 'utf8'));
        } else {
          console.error('❌ AssetProcessor: _generateFileHash: Содержимое должно быть строкой или буфером.');
          return '';
        }
        return hashSum.digest('hex').slice(0, length);
    } catch (e) {
         console.error('❌ AssetProcessor: _generateFileHash: Ошибка при генерации хеша:', e);
         return '';
    }
  }

  /**
   * Формирует имя файла с хешем в проде, оригинальное имя в деве.
   * @private
   */
  _getHashedFilename(originalBaseName, content) {

    const parsedPath = path.parse(originalBaseName);
   

   
    if (!isProdBuild) {
      return originalBaseName;
    }

   
    const hash = this._generateFileHash(content);

    if (!hash) {
       console.warn(`⚠️ AssetProcessor: _getHashedFilename: Не удалось сгенерировать хеш для ${originalBaseName} (возможно, пустое содержимое). Используется оригинальное имя.`);
       return originalBaseName; // Если хеш не сгенерирован в проде, возвращаем оригинальное
    }

    const hashedName = `${parsedPath.name}${'.' + hash}${parsedPath.ext}`; // Хеш ВСЕГДА добавляется перед расширением в проде

     if (!hashedName.includes(hash)) {
         console.warn(`⚠️ AssetProcessor: _getHashedFilename: Сгенерированный хеш (${hash}) не найден в итоговом имени файла для ${originalBaseName}. Получено: ${hashedName}`);
     }

    return hashedName;
  }


  addToManifest(originalWebPath, hashedWebPath) {
    // Добавляем в манифест только в production
    if (!isProdBuild) {
        // console.debug(`⏭️ AssetProcessor: Пропускаем добавление в манифест в режиме разработки: "${originalWebPath}"`);
        return;
    }
    let normalizedOriginal = originalWebPath.startsWith('/') ? originalWebPath : '/' + originalWebPath;
    let normalizedHashed = hashedWebPath.startsWith('/') ? hashedWebPath : '/' + hashedWebPath;

    if (this.config.assetManifest[normalizedOriginal] && this.config.assetManifest[normalizedOriginal] !== normalizedHashed) {
       console.warn(`⚠️ AssetProcessor: Манифест конфликт для "${normalizedOriginal}": уже "${this.config.assetManifest[normalizedOriginal]}", попытка добавить "${normalizedHashed}".`);
    }

    this.config.assetManifest[normalizedOriginal] = normalizedHashed;
    // console.debug(`✅ AssetProcessor: Манифест: "${normalizedOriginal}" -> "${normalizedHashed}"`);
  }


  async _processCssFile(filePath) {
     const relativePathFromInput = path.relative(this.config.inputDir, filePath);
     const logPrefix = `[CSS:${relativePathFromInput}]`;

     if (path.basename(filePath).startsWith('_')) {
         console.debug(`${logPrefix} ⏭️ Пропускаем частичный файл.`);
         return null;
     }
     if (!filePath.startsWith(path.join(process.cwd(), this.config.inputDir))) {
         console.warn(`${logPrefix} ⚠️ Файл вне входной директории (${this.config.inputDir}). Пропускаем.`);
         return null;
     }

     console.log(`${logPrefix} --- Начинаем обработку SCSS ---`);
     console.debug(`${logPrefix} Полный путь файла: ${filePath}`);

     try {
        console.debug(`${logPrefix} Чтение файла...`);
        const fileContent = await fsPromises.readFile(filePath, 'utf8');
        console.debug(`${logPrefix} Файл прочитан. Размер: ${fileContent.length} байт.`);

        // Шаг 1: Компиляция Sass
        if (!this.config.compilers.sass) throw new Error("Sass compiler is not provided in config.");
        console.log(`${logPrefix} --- Компиляция Sass... ---`);
        let sassResult;
        try {
            sassResult = this.config.compilers.sass.compileString(fileContent, {
              loadPaths: [path.dirname(filePath), path.join(process.cwd(), this.config.inputDir)],
              style: isProdBuild ? "compressed" : "expanded", // Сжатие только в проде
              sourceMap: !isProdBuild // Source maps только в разработке
            });
             console.debug(`${logPrefix} Sass компиляция завершена. Получено ${sassResult.css.length} байт CSS.`);
        } catch (sassError) {
             console.error(`${logPrefix} ❌ Ошибка при компиляции Sass:`, sassError.message);
             if (sassError.file) {
                console.error(`${logPrefix} Ошибка в файле:`, sassError.file, 'Строка:', sassError.line, 'Столбец:', sassError.column);
             }
             throw sassError;
        }
        let resultCss = sassResult.css;

        // Шаг 2: Обработка PostCSS
         console.log(`${logPrefix} --- Обработка PostCSS... ---`);
         if (this.config.compilers.postcss && this.config.compilers.postcssConfig && this.config.compilers.postcssConfig.plugins) {
             console.debug(`${logPrefix} Вызов postcss().process()...`);
             let postcssResult;
             try {
                  const fromPath = filePath.replace(/\.scss$/, '.css');
                   // Определяем целевой путь для source map в _site
                   const toPathForSourceMap = path.join(process.cwd(), this.config.outputDir, 'assets/css', path.basename(filePath).replace(/\.scss$/, '.css'));

                  postcssResult = await this.config.compilers.postcss(this.config.compilers.postcssConfig.plugins).process(resultCss, {
                    from: fromPath,
                    to: toPathForSourceMap, // Используем целевой путь в _site для source map
                    map: { inline: !isProdBuild }
                  });
                   console.debug(`${logPrefix} PostCSS обработка завершена. Получено ${postcssResult.css.length} байт CSS.`);
             } catch (postcssError) {
                  console.error(`${logPrefix} ❌ Ошибка при обработке PostCSS:`, postcssError.message);
                   if (postcssError.stack) console.error(`${logPrefix} Стек вызовов PostCSS:`, postcssError.stack);
                   throw postcssError;
             }
             resultCss = postcssResult.css;
         } else if (isProdBuild) {
             console.warn(`${logPrefix} ⚠️ PostCSS не настроен или не имеет плагинов. Минификация/автопрефикс могут не работать.`);
         }

        // Шаг 3: Определение выходных путей, хеширование и запись файла
        console.log(`${logPrefix} --- Определение выходных путей и запись файла... ---`);

        const mainCssInputFileName = 'style.scss';
        const mainCssInputSubdir = '_input_sass';
        const mainCssInputPathRelativeToInput = path.join(mainCssInputSubdir, mainCssInputFileName).replace(/\\/g, '/');
        const filePathRelativeToInput = relativePathFromInput.replace(/\\/g, '/'); // уже нормализован выше

        let outputSubdirInOutput = 'assets/css'; // Желаемая выходная поддиректория в _site (фиксированная)
        let originalWebPathForManifest; // Ключ в манифесте


        if (filePathRelativeToInput === mainCssInputPathRelativeToInput) {
             // Это главный файл src/_input_sass/style.scss
             originalWebPathForManifest = '/assets/css/style.css'; // Логический путь для манифеста всегда /assets/css/style.css
             console.debug(`${logPrefix} Идентифицирован как главный SCSS файл (${mainCssInputPathRelativeToInput}). Логический путь для манифеста: ${originalWebPathForManifest}. Выходная поддиректория: ${outputSubdirInOutput}`);
        } else {
             // Любой другой SCSS файл из assetEntryPoints (на данный момент у вас их нет кроме style.scss)
             // Если бы были, их логический путь в манифесте и выходная поддиректория зависели бы от требований.
             // Например, если в src/components/button/button.scss -> /components/button/button.css
             // Сейчас просто залогируем, если сюда попадет что-то неожиданное
              console.warn(`${logPrefix} ⚠️ Этот SCSS файл (${filePathRelativeToInput}) не является главным style.scss. Его обработка как отдельного CSS файла может быть непреднамеренной.`);
              outputSubdirInOutput = path.dirname(filePathRelativeToInput).replace(/\\/g, '/'); // Помещаем в ту же поддиректорию, что и исходник
              originalWebPathForManifest = '/' + filePathRelativeToInput.replace(/\.scss$/, '.css');
        }


        const cssFileName = path.basename(filePath).replace(/\.scss$/, '.css'); // style.css
        // *** В dev режиме _getHashedFilename вернет оригинальное имя ***
        const finalOutputFileName = this._getHashedFilename(cssFileName, resultCss);


        // Собираем полный путь относительно выходной директории (_site/)
        const outputRelativePath = path.join(outputSubdirInOutput, finalOutputFileName).replace(/\\/g, '/');

        // Формируем хешированный веб-путь (или оригинальный в dev) для манифеста
        const hashedWebPath = '/' + outputRelativePath; // assets/css/style.hash.css (prod) или assets/css/style.css (dev)

        // Полный путь для записи файла на диск
        const fullOutputPath = path.join(process.cwd(), this.config.outputDir, outputRelativePath);
         console.debug(`${logPrefix} Полный путь для записи файла на диск: ${fullOutputPath}`);


        // Создаем директорию и записываем файл
        await fsPromises.mkdir(path.dirname(fullOutputPath), { recursive: true });
        await fsPromises.writeFile(fullOutputPath, resultCss, 'utf8');
        console.log(`${logPrefix} --- Файл записан в ${fullOutputPath}. ---`);


        // Добавляем в манифест (только в проде)
        this.addToManifest(originalWebPathForManifest, hashedWebPath);

         if(isProdBuild) {
            console.log(`${logPrefix} ✅ Обработан SCSS: "${originalWebPathForManifest}" -> "${hashedWebPath}"`);
         } else {
             console.log(`${logPrefix} ✅ Обработан SCSS (dev): "${originalWebPathForManifest}" -> "${hashedWebPath}"`);
         }

        return { originalWebPath: originalWebPathForManifest, hashedWebPath };

     } catch (e) {
        console.error(`${logPrefix} ❌ Критическая ошибка при обработке SCSS файла:`, e.message);
        if (e.stack) {
            console.error(`${logPrefix} Стек вызовов:`, e.stack);
        }
        throw e;
     }
  }

  async _processJsFile(filePath) {
     const relativePathFromInput = path.relative(this.config.inputDir, filePath);
     const logPrefix = `[JS:${relativePathFromInput}]`;
     console.log(`${logPrefix} --- Начинаем обработку JS ---`);
     console.debug(`${logPrefix} Полный путь файла: ${filePath}`);

     try {
        const normalizedRelativePathFromInput = relativePathFromInput.replace(/\\/g, '/');
        const isMainBundleEntry = normalizedRelativePathFromInput === 'assets/scripts/main.js';

         let resultJs;
         let outputFileName;
         let originalWebPathForManifest;
         let outputSubdirInOutput = path.dirname(relativePathFromInput).replace(/\\/g, '/'); // assets/scripts


        if (isMainBundleEntry) {
           if (!this.config.compilers.esbuild) throw new Error("Esbuild compiler is not provided in config.");
            console.log(`${logPrefix} ⚡ Запуск esbuild для бандла.`);
           const result = await this.config.compilers.esbuild.build({
             entryPoints: [filePath],
             bundle: true,
             minify: isProdBuild, // Минификация только в проде
             sourcemap: !isProdBuild, // Source maps только в деве
             write: false,
             absWorkingDir: process.cwd(),
           });
           resultJs = result.outputFiles[0].text;
           outputFileName = 'main.bundle.js';
           originalWebPathForManifest = '/' + path.join(outputSubdirInOutput, outputFileName).replace(/\\/g, '/'); // /assets/scripts/main.bundle.js
           console.debug(`${logPrefix} Идентифицирован как главный JS бандл. outputSubdirInOutput: ${outputSubdirInOutput}, originalWebPathForManifest: ${originalWebPathForManifest}`);

        } else {
           if (!this.config.compilers.Terser || !this.config.compilers.Terser.minify) throw new Error("Terser compiler or minify function is not provided in config.");
           console.debug(`${logPrefix} Чтение файла...`);
           const fileContent = await fsPromises.readFile(filePath, 'utf8');
           outputFileName = path.basename(filePath);
           originalWebPathForManifest = '/' + relativePathFromInput.replace(/\\/g, '/'); // /assets/scripts/critical--theme.js
           console.debug(`${logPrefix} Идентифицирован как другой JS файл. outputSubdirInOutput: ${outputSubdirInOutput}, originalWebPathForManifest: ${originalWebPathForManifest}`);


           if (isProdBuild) {
               try {
                    console.log(`${logPrefix} --- Минификация Terser... ---`);
                    const m = await this.config.compilers.Terser.minify(fileContent, {
                         mangle: { toplevel: true, properties: { regex: /^_/ } },
                         compress: { passes: 2 },
                         format: { comments: false },
                         sourceMap: !isProdBuild ? {} : false
                    });
                    resultJs = m.code ?? fileContent;
                    console.debug(`${logPrefix} Минификация Terser завершена. Получено ${resultJs.length} байт JS.`);
               } catch (e) {
                    console.error(`${logPrefix} ❌ Ошибка минификации Terser:`, e.message);
                    resultJs = fileContent;
               }
           } else {
              resultJs = fileContent; // В разработке просто используем оригинальное содержимое
           }
        }

        // Шаг 2: Хеширование (только имя файла в проде) и запись
        // *** В dev режиме _getHashedFilename вернет оригинальное имя ***
        const finalOutputFileName = this._getHashedFilename(outputFileName, resultJs);

        const outputRelativePath = path.join(outputSubdirInOutput, finalOutputFileName).replace(/\\/g, '/');

        // Формируем хешированный веб-путь (или оригинальный в dev) для манифеста
        const hashedWebPath = '/' + outputRelativePath;

        const fullOutputPath = path.join(process.cwd(), this.config.outputDir, outputRelativePath);
         console.debug(`${logPrefix} Полный путь для записи файла на диск: ${fullOutputPath}`);

        await fsPromises.mkdir(path.dirname(fullOutputPath), { recursive: true });
        await fsPromises.writeFile(fullOutputPath, resultJs, 'utf8');
        console.log(`${logPrefix} --- Файл записан в ${fullOutputPath}. ---`);

        // Добавляем в манифест (только в проде)
        this.addToManifest(originalWebPathForManifest, hashedWebPath);

        if(isProdBuild) {
           console.log(`${logPrefix} ✅ Обработан JS: "${originalWebPathForManifest}" -> "${hashedWebPath}"`);
        } else {
           console.log(`${logPrefix} ✅ Обработан JS (dev): "${originalWebPathForManifest}" -> "${hashedWebPath}"`);
        }

        return { originalWebPath: originalWebPathForManifest, hashedWebPath };

     } catch (e) {
        console.error(`${logPrefix} ❌ Критическая ошибка при обработке JS файла:`, e.message);
         if (e.stack) {
            console.error(`${logPrefix} Стек вызовов:`, e.stack);
        }
        throw e;
     }
  }

   async _processStaticFile(filePath) {
      const relativePathFromInput = path.relative(this.config.inputDir, filePath);
      const logPrefix = `[Static:${relativePathFromInput}]`;
      console.log(`${logPrefix} --- Начинаем обработку статического файла ---`);
      console.debug(`${logPrefix} Полный путь файла: ${filePath}`);

      try {
        if (!fs.existsSync(filePath)) {
          console.warn(`${logPrefix} ⚠️ Файл не найден: ${filePath}. Пропускаем.`);
          return null;
        }
        if (!filePath.startsWith(path.join(process.cwd(), this.config.inputDir))) {
            console.warn(`${logPrefix} ⚠️ Файл вне входной директории (${this.config.inputDir}). Пропускаем.`);
            return null;
        }

        console.debug(`${logPrefix} Чтение файла...`);
        const fileContent = await fsPromises.readFile(filePath); // Читаем как буфер
        console.debug(`${logPrefix} Файл прочитан. Размер: ${fileContent.length} байт.`);

        const originalWebPath = '/' + relativePathFromInput.replace(/\\/g, '/');

        // *** В dev режиме _getHashedFilename вернет оригинальное имя ***
        const finalOutputFileName = this._getHashedFilename(path.basename(filePath), fileContent);


        const outputSubdirInOutput = path.dirname(relativePathFromInput).replace(/\\/g, '/');
        const outputRelativePath = path.join(outputSubdirInOutput, finalOutputFileName).replace(/\\/g, '/');

        // Формируем хешированный веб-путь (или оригинальный в dev) для манифеста
        const hashedWebPath = '/' + outputRelativePath;

        const fullOutputPath = path.join(process.cwd(), this.config.outputDir, outputRelativePath);
         console.debug(`${logPrefix} Полный путь для записи файла на диск: ${fullOutputPath}`);

        await fsPromises.mkdir(path.dirname(fullOutputPath), { recursive: true });
        // *** Копируем файл вместо записи, т.к. мы его прочитали как буфер ***
        await fsPromises.copyFile(filePath, fullOutputPath);
        console.log(`${logPrefix} --- Файл скопирован в ${fullOutputPath}. ---`);

        // Добавляем в манифест (только в проде)
        this.addToManifest(originalWebPath, hashedWebPath);

         if(isProdBuild) {
           console.log(`${logPrefix} ✅ Обработан статический файл: "${originalWebPath}" -> "${hashedWebPath}"`);
         } else {
            console.log(`${logPrefix} ✅ Обработан статический файл (dev): "${originalWebPath}" -> "${hashedWebPath}"`);
         }

        return { originalWebPath, hashedWebPath };

      } catch (error) {
        console.error(`${logPrefix} ❌ Критическая ошибка при обработке файла:`, error.message);
         if (error.stack) {
            console.error(`${logPrefix} Стек вызовов:`, error.stack);
        }
        throw error;
      }
   }


  /**
   * Находит все ассеты по заданным точкам входа, обрабатывает их.
   * В Production: компилирует/минифицирует/хеширует/копирует, заполняет манифест.
   * В Development: компилирует (применимо)/копирует (без минификации/хеширования), не заполняет манифест.
   * Вызывается в beforeBuild.
   */
  async processAllAssets() {
    // Логика поиска файлов одинакова для dev и prod
    console.log('🔍 AssetProcessor: Начинаем поиск всех ассетов по точкам входа:', this.config.assetEntryPoints);

    let filesToProcess = [];
    const processingErrors = [];

    try {
      const globResults = Array.isArray(this.config.assetEntryPoints)
        ? this.config.assetEntryPoints.flatMap(pattern => {
             try {
                 const searchPattern = path.join(process.cwd(), pattern);
                 console.debug(`AssetProcessor: Поиск файлов по шаблону: ${searchPattern}`);
                 return glob.sync(searchPattern, { nodir: true, absolute: true });
             } catch(e) {
                 console.error(`❌ AssetProcessor: processAllAssets: Ошибка в glob.sync для шаблона "${pattern}":`, e.message);
                 return [];
             }
          })
        : glob.sync(path.join(process.cwd(), this.config.assetEntryPoints), { nodir: true, absolute: true });


      const uniqueFiles = [...new Set(globResults)];

      console.log(`✨ AssetProcessor: Найдено ${uniqueFiles.length} уникальных ассетов для обработки.`);

      if (uniqueFiles.length === 0) {
           const effectiveEntryPoints = Array.isArray(this.config.assetEntryPoints) ? this.config.assetEntryPoints : [this.config.assetEntryPoints];
           if (effectiveEntryPoints.length > 0 && effectiveEntryPoints.some(p => p && typeof p === 'string')) {
             console.warn("⚠️ AssetProcessor: Указаны точки входа, но ни один файл не найден. Проверьте 'assetEntryPoints' и пути!");
           }
          return;
      }

      console.log(`AssetProcessor: Начинаем параллельную обработку файлов в режиме ${isProdBuild ? 'production' : 'development'}...`);

      const processingPromises = uniqueFiles.map(async filePath => {
          if (!filePath.startsWith(path.join(process.cwd(), this.config.inputDir))) {
              console.warn(`[SKIP:${path.relative(this.config.inputDir, filePath)}] ⚠️ Файл вне входной директории (${this.config.inputDir}). Пропускаем.`);
              return null;
          }

          const ext = path.extname(filePath).toLowerCase();

          try {
              if (ext === '.scss') {
                  return await this._processCssFile(filePath);
              } else if (ext === '.js') {
                  return await this._processJsFile(filePath);
              } else {
                  return await this._processStaticFile(filePath);
              }
          } catch(e) {
              processingErrors.push({ filePath, error: e });
              return null;
          }
      });

      const results = await Promise.all(processingPromises);

      const successfulResults = results.filter(r => r !== null);

      console.log(`🎉 AssetProcessor: Обработка всех ассетов завершена. Успешно обработано файлов: ${successfulResults.length}. Ошибок: ${processingErrors.length}.`);

      // Пробрасываем ошибки в production, логируем в development
      if (processingErrors.length > 0) {
           const errorLevel = isProdBuild ? 'error' : 'warn';
           console[errorLevel](`💥 AssetProcessor: Обнаружены ошибки при обработке ассетов в ${isProdBuild ? 'production' : 'development'} режиме.`);
           processingErrors.forEach(({ filePath, error }) => {
               console[errorLevel](`- Ошибка при обработке файла "${filePath}": ${error.message}`);
           });
           if (isProdBuild) {
               const errorMessage = `AssetProcessor: Failed to process ${processingErrors.length} asset file(s) in production. See logs above for details.`;
               const err = new Error(errorMessage);
               err.errors = processingErrors;
               throw err; // Прерываем сборку в production
           }
      }


    } catch (error) {
      console.error('❌ AssetProcessor: processAllAssets: Критическая ошибка:', error);
      if (isProdBuild) {
          console.error('💥 AssetProcessor: Прерывание сборки из-за критической ошибки.');
          throw error;
      }
    }
  }


  /**
   * Сохраняет финальный манифест ассетов в JSON файл. Вызывается в afterBuild.
   * Сохраняется только в production.
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

   try {
     await fsPromises.mkdir(path.dirname(manifestPath), { recursive: true });
     await fsPromises.writeFile(
       manifestPath,
       JSON.stringify(this.config.assetManifest, null, 2),
       'utf8'
     );
     console.log(`✅ AssetProcessor: Манифест ассетов сохранен: ${manifestPath}`);
     return true;

   } catch (error) {
     console.error('❌ AssetProcessor: saveManifest: Ошибка:', error);
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

    let assetProcessor;
    try {
        assetProcessor = new AssetProcessor(pluginOptions);
    } catch (e) {
        console.error("❌ AssetProcessor Plugin: Ошибка при инициализации AssetProcessor:", e.message);
        if (isProdBuild) { throw e; }
         console.error("⚠️ AssetProcessor Plugin: Плагин не инициализирован из-за ошибки. Функциональность может быть ограничена.");
         assetProcessor = {
             manifest: {},
             processAllAssets: async () => console.error("AssetProcessor not initialized."),
             saveManifest: async () => console.error("AssetProcessor not initialized."),
             addToManifest: () => {},
             config: { inputDir: pluginOptions.inputDir }
         };
    }


    // --- Регистрируем фильтр `hashed` ---
     if (assetProcessor && assetProcessor.manifest) {
        eleventyConfig.addFilter("hashed", (filePath) => {
          if (!isProdBuild) {
             // В режиме разработки фильтр просто возвращает оригинальный путь
             // console.debug(`ℹ️ AssetProcessor: Фильтр "hashed": Dev режим, возвращаем оригинальный путь "${filePath}".`);
             return filePath;
          }

          let originalUrl;
          try {
             originalUrl = new URL(filePath, 'http://localhost');
          } catch (e) {
             console.error(`❌ AssetProcessor: Фильтр "hashed": Ошибка при парсинге URL "${filePath}":`, e);
             return filePath;
          }

          const cleanPath = originalUrl.pathname;
          let normalizedPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;

          const hashedPath = assetProcessor.manifest[normalizedPath];

          if (!hashedPath) {
             // Предупреждаем только в продакшене, если хешированный путь не найден
             console.warn(`⚠️ AssetProcessor: Фильтр "hashed": В Production сборке не найден хешированный путь для "${normalizedPath}". Возможно, файл не был обработан или точка входа отсутствует.`);
             return filePath; // В продакшене вернет оригинальный путь (с предупреждением)
          }

          originalUrl.pathname = hashedPath;
          return originalUrl.pathname + originalUrl.search + originalUrl.hash;
        });
     } else {
          console.error("❌ AssetProcessor Plugin: Фильтр 'hashed' не зарегистрирован, т.к. AssetProcessor не инициализирован.");
           eleventyConfig.addFilter("hashed", (filePath) => {
               console.warn("⚠️ AssetProcessor Plugin: Фильтр 'hashed' недоступен из-за ошибки инициализации. Используется оригинальный путь.");
               return filePath;
           });
     }


    // Добавляем манифест в глобальные данные (только в проде)
     if (isProdBuild && assetProcessor && assetProcessor.manifest) {
        eleventyConfig.addGlobalData("assetManifest", assetProcessor.manifest);
     } else if (!isProdBuild) {
        eleventyConfig.addGlobalData("assetManifest", {}); // В dev отдаем пустой объект
     }


    // ---- Слушатели событий Eleventy ----

    // Событие 'beforeBuild': Обработка всех ассетов.
    eleventyConfig.on("beforeBuild", async () => {
       console.log('--- AssetProcessor: Событие "beforeBuild" ---');
       // Очищаем манифест только в production
      if (isProdBuild && assetProcessor && assetProcessor.config && assetProcessor.config.assetManifest) {
         console.log("🧹 AssetProcessor: Очистка манифеста ассетов перед сборкой...");
         Object.keys(assetProcessor.config.assetManifest).forEach(key => delete assetProcessor.config.assetManifest[key]);
          // Global data уже ссылается на этот объект
      }

      if (assetProcessor && assetProcessor.processAllAssets) {
          try {
             await assetProcessor.processAllAssets();
             console.log('--- AssetProcessor: processAllAssets завершен (в beforeBuild) ---');
          } catch(e) {
              // Логирование и проброс ошибки уже происходит внутри processAllAssets в production
          }
      } else {
          console.error("❌ AssetProcessor Plugin: Невозможно выполнить processAllAssets, т.к. AssetProcessor не инициализирован.");
          if (isProdBuild) {
              throw new Error("AssetProcessor Plugin failed to initialize or process assets correctly. Aborting production build.");
          }
      }
    });


    // Событие 'afterBuild': Сохранение финального манифеста.
     eleventyConfig.on("afterBuild", async () => {
       console.log('--- AssetProcessor: Событие "afterBuild" ---');
        if (assetProcessor && assetProcessor.saveManifest) {
            await assetProcessor.saveManifest();
            console.log('--- AssetProcessor: saveManifest завершен (в afterBuild) ---');
        } else {
             console.error("❌ AssetProcessor Plugin: Невозможно выполнить saveManifest, т.к. AssetProcessor не инициализирован.");
        }
    });


    // ---- Passthrough Copy (плагин сам обрабатывает копирование) ----
    // Убираем PassthroughCopy папок assets из плагина, т.к. плагин сам копирует файлы в обоих режимах.
    // PassthroughCopy для других файлов (вне assets) должен быть в .eleventy.js
     if (!isProdBuild) {
       console.log('ℹ️ AssetProcessor: В режиме разработки PassthroughCopy папок assets отключен в плагине (копирование выполняет сам плагин).');
     } else {
        console.log('ℹ️ AssetProcessor: В режиме production PassthroughCopy папок assets отключен в плагине (копирование выполняет сам плагин).');
     }

    console.log("✅ AssetProcessor Plugin: Зарегистрирован.");
};