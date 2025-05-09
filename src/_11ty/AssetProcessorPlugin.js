// src/_11ty/AssetProcessorPlugin.js

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import * as glob from 'glob';
import * as sass from 'sass';
import postcss from 'postcss';
import esbuild from 'esbuild';
import * as Terser from 'terser';

// Определяем, идет ли продакшен сборка
const isProdBuild = process.env.ELEVENTY_ENV === "production";

/**
 * Оптимизированная система логирования для AssetProcessor
 */
class Logger {
  constructor(isProd = false, componentName = 'AssetProcessor') {
    this.isProd = isProd;
    this.componentName = componentName;
    this.logCache = new Set();
  }

  formatMessage(msg, prefix = null) {
    return prefix ? `[${this.componentName}:${prefix}] ${msg}` : `[${this.componentName}] ${msg}`;
  }

  log(level, msg, prefix, ...args) {
    if (this.isProd && level === 'debug') return;
    const formatted = this.formatMessage(msg, prefix);
    if (level === 'warn' || level === 'error') {
      const key = `${formatted}${args.join('')}`;
      if (this.logCache.has(key)) return;
      this.logCache.add(key);
    }

    const icon = level === 'error' ? '❌ ' : 
                level === 'warn' ? '⚠️ ' : 
                level === 'debug' ? '🔍 ' : '';
    
    console[level](icon + formatted, ...args);
  }

  debug(msg, prefix, ...args) { this.log('debug', msg, prefix, ...args); }
  info(msg, prefix, ...args) { this.log('log', msg, prefix, ...args); }
  warn(msg, prefix, ...args) { this.log('warn', msg, prefix, ...args); }
  error(msg, prefix, ...args) { this.log('error', msg, prefix, ...args); }
}

/**
 * Система кеширования для инкрементальной сборки
 */
class AssetCache {
  constructor(logger) {
    this.logger = logger;
    this.cachePath = path.join(process.cwd(), '.cache');
    this.cacheFile = path.join(this.cachePath, 'asset-cache.json');
    this.manifest = {};
    this.hashCache = new Map();
    this.statsCache = new Map();
    
    // Создаем директорию кеша, если не существует
    if (!fs.existsSync(this.cachePath)) {
      try {
        fs.mkdirSync(this.cachePath, { recursive: true });
      } catch (e) {
        this.logger.warn(`Не удалось создать директорию кеша: ${e.message}`);
      }
    }
    
    this.loadCache();
  }
  
  loadCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const data = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        this.manifest = data.manifest || {};
        
        if (data.hashCache) this.hashCache = new Map(data.hashCache);
        if (data.statsCache) this.statsCache = new Map(data.statsCache);
        
        this.logger.debug(`Кеш загружен: ${Object.keys(this.manifest).length} записей`);
      }
    } catch (e) {
      this.logger.warn(`Ошибка загрузки кеша: ${e.message}`);
    }
  }
  
  saveCache() {
    try {
      const cacheData = {
        manifest: this.manifest,
        hashCache: Array.from(this.hashCache.entries()),
        statsCache: Array.from(this.statsCache.entries())
      };
      
      if (!fs.existsSync(this.cachePath)) {
        fs.mkdirSync(this.cachePath, { recursive: true });
      }
      
      fs.writeFileSync(
        this.cacheFile,
        JSON.stringify(cacheData, null, isProdBuild ? 0 : 2)
      );
      
      this.logger.debug(`Кеш сохранен: ${Object.keys(this.manifest).length} записей`);
    } catch (e) {
      this.logger.warn(`Ошибка сохранения кеша: ${e.message}`);
    }
  }
  
  isFileChanged(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const mtime = stats.mtime.getTime();
      const cachedMtime = this.statsCache.get(filePath);
      
      if (cachedMtime && cachedMtime === mtime) {
        return false;
      }
      
      this.statsCache.set(filePath, mtime);
      return true;
    } catch (e) {
      return true;
    }
  }
  
  getFileHash(content, length = 8) {
    if (!isProdBuild) return '';
    
    try {
      const contentKey = typeof content === 'string' 
        ? content.substring(0, 100) 
        : (Buffer.isBuffer(content) ? content.slice(0, 100).toString('hex') : '');
      
      const cacheKey = `hash_${contentKey}`;
      
      if (this.hashCache.has(cacheKey)) {
        return this.hashCache.get(cacheKey);
      }
      
      const hashSum = crypto.createHash('md5');
      if (Buffer.isBuffer(content)) {
        hashSum.update(content);
      } else if (typeof content === 'string') {
        hashSum.update(Buffer.from(content, 'utf8'));
      } else {
        return '';
      }
      
      const hash = hashSum.digest('hex').slice(0, length);
      this.hashCache.set(cacheKey, hash);
      return hash;
    } catch (e) {
      this.logger.warn(`Ошибка хеширования: ${e.message}`);
      return '';
    }
  }
}

/**
 * Основной класс обработки ассетов
 */
class AssetProcessor {
  constructor(config = {}) {
    const { 
      compilers, 
      assetEntryPoints, 
      inputDir, 
      outputDir, 
      concurrency = 4, 
      errorStrategy = { failOnError: isProdBuild }
    } = config;

    if (!compilers || !assetEntryPoints || !inputDir || !outputDir) {
      throw new Error("Missing required configuration options.");
    }

    this.logger = new Logger(isProdBuild);
    this.cache = new AssetCache(this.logger);
    this.manifest = {}; // Манифест ассетов
    
    this.config = { 
      assetEntryPoints, 
      inputDir, 
      outputDir, 
      concurrency,
      errorStrategy
    };
    
    this.compilers = compilers;

    this.logger.info("Инициализирован");
  }

  /**
   * Формирует имя файла с хешем в production или оригинальное имя в dev
   */
  getHashedFilename(originalPath, content) {
    if (!isProdBuild) return originalPath;
    
    const parsedPath = path.parse(originalPath);
    const hash = this.cache.getFileHash(content);
    
    if (!hash) return originalPath;
    
    return `${parsedPath.name}.${hash}${parsedPath.ext}`;
  }

  /**
   * Добавляет запись в манифест ассетов
   */
  addToManifest(originalPath, hashedPath) {
    if (!isProdBuild) return;
    
    let normalizedOriginal = originalPath.startsWith('/') ? originalPath : '/' + originalPath;
    let normalizedHashed = hashedPath.startsWith('/') ? hashedPath : '/' + hashedPath;
    
    if (this.manifest[normalizedOriginal] && this.manifest[normalizedOriginal] !== normalizedHashed) {
      this.logger.warn(`Конфликт в манифесте для "${normalizedOriginal}"`);
    }
    
    this.manifest[normalizedOriginal] = normalizedHashed;
  }

  /**
   * Обрабатывает все ассеты согласно конфигурации
   */
  async processAllAssets() {
    this.logger.info("Начинаем обработку ассетов...");
    
    try {
      // Находим все файлы для обработки
      const globResults = Array.isArray(this.config.assetEntryPoints)
        ? this.config.assetEntryPoints.flatMap(pattern => {
            try {
              return glob.sync(path.join(process.cwd(), pattern), { nodir: true, absolute: true });
            } catch(e) {
              this.logger.error(`Ошибка в glob.sync для шаблона "${pattern}": ${e.message}`);
              return [];
            }
          })
        : glob.sync(path.join(process.cwd(), this.config.assetEntryPoints), { nodir: true, absolute: true });
      
      const uniqueFiles = [...new Set(globResults)];
      
      if (uniqueFiles.length === 0) {
        this.logger.warn("Не найдено файлов для обработки");
        return [];
      }
      
      this.logger.info(`Найдено ${uniqueFiles.length} файлов для обработки`);
      
      // Обработка всех файлов с ограничением конкурентности
      const concurrency = this.config.concurrency;
      const errors = [];
      const results = [];
      
      for (let i = 0; i < uniqueFiles.length; i += concurrency) {
        const batch = uniqueFiles.slice(i, i + concurrency);
        const batchPromises = batch.map(async filePath => {
          try {
            return await this.processFile(filePath);
          } catch (error) {
            errors.push({ filePath, error });
            return null;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(r => r !== null));
        
        // Сохраняем кеш после каждой партии файлов
        if (isProdBuild) {
          this.cache.saveCache();
        }
      }
      
      // Обработка ошибок
      if (errors.length > 0) {
        this.logger.warn(`Обнаружено ${errors.length} ошибок при обработке файлов`);
        
        errors.forEach(({ filePath, error }) => {
          this.logger.error(`Ошибка при обработке ${path.basename(filePath)}: ${error.message}`);
        });
        
        // В production режиме прерываем сборку при наличии ошибок, если настроено
        if (isProdBuild && this.config.errorStrategy.failOnError) {
          throw new Error(`Ошибка обработки ${errors.length} файлов`);
        }
      }
      
      this.logger.info(`Обработано успешно ${results.length} файлов`);
      return results;
      
    } catch (error) {
      this.logger.error(`Критическая ошибка: ${error.message}`);
      if (isProdBuild) throw error;
      return [];
    }
  }

  /**
   * Обрабатывает отдельный файл в зависимости от типа
   */
  async processFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const relPath = path.relative(this.config.inputDir, filePath);
    
    // Проверяем, изменился ли файл с момента последней сборки
    if (isProdBuild && !this.cache.isFileChanged(filePath)) {
      const cachedResult = this.cache.manifest[relPath];
      if (cachedResult) {
        this.logger.debug(`Используем кешированный результат для ${path.basename(filePath)}`);
        
        if (cachedResult.originalWebPath && cachedResult.hashedWebPath) {
          this.addToManifest(cachedResult.originalWebPath, cachedResult.hashedWebPath);
        }
        
        return cachedResult;
      }
    }
    
    try {
      // Обработка в зависимости от типа файла
      if (ext === '.scss' || ext === '.sass') {
        return await this.processScss(filePath);
      } else if (ext === '.js') {
        return await this.processJs(filePath);
      } else {
        return await this.processStatic(filePath);
      }
    } catch (error) {
      this.logger.error(`Ошибка обработки ${path.basename(filePath)}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Обрабатывает SCSS файлы
   */
  async processScss(filePath) {
    const filePrefix = path.basename(filePath);
    const relativePathFromInput = path.relative(this.config.inputDir, filePath).replace(/\\/g, '/');
    
    // Пропускаем частичные файлы (начинающиеся с _)
    if (path.basename(filePath).startsWith('_')) {
      this.logger.debug(`Пропускаем частичный файл ${filePrefix}`);
      return null;
    }
    
    try {
      // Чтение файла
      const fileContent = await fsPromises.readFile(filePath, 'utf8');
      
      // Компиляция SCSS
      const sassResult = this.compilers.sass.compileString(fileContent, {
        loadPaths: [path.dirname(filePath), path.join(process.cwd(), this.config.inputDir)],
        style: isProdBuild ? "compressed" : "expanded",
        sourceMap: !isProdBuild
      });
      
      let resultCss = sassResult.css;
      
      // Обработка PostCSS если настроена
      if (this.compilers.postcss && this.compilers.postcssConfig && this.compilers.postcssConfig.plugins) {
        const fromPath = filePath.replace(/\.scss$/, '.css');
        const toPath = path.join(process.cwd(), this.config.outputDir, 
          path.relative(this.config.inputDir, fromPath));
        
        const postcssResult = await this.compilers.postcss(this.compilers.postcssConfig.plugins)
          .process(resultCss, {
            from: fromPath,
            to: toPath,
            map: { inline: !isProdBuild }
          });
        
        resultCss = postcssResult.css;
      }
      
      // Определение выходных путей
      const isMainStylesheet = relativePathFromInput === '_input_sass/style.scss';
      
      let outputSubdir, originalWebPath;
      
      if (isMainStylesheet) {
        // Это главный файл стилей, помещаем его в assets/css/style.css
        outputSubdir = 'assets/css';
        originalWebPath = '/assets/css/style.css';
      } else {
        // Другие файлы сохраняют относительный путь
        outputSubdir = path.dirname(relativePathFromInput);
        originalWebPath = '/' + relativePathFromInput.replace(/\.scss$/, '.css');
      }
      
      // Хеширование имени файла (в продакшене)
      const outputBaseName = path.basename(filePath).replace(/\.scss$/, '.css');
      const hashedBaseName = this.getHashedFilename(outputBaseName, resultCss);
      
      // Формирование выходных путей
      const outputRelPath = path.join(outputSubdir, hashedBaseName).replace(/\\/g, '/');
      const hashedWebPath = '/' + outputRelPath;
      const fullOutputPath = path.join(process.cwd(), this.config.outputDir, outputRelPath);
      
      // Запись файла
      await fsPromises.mkdir(path.dirname(fullOutputPath), { recursive: true });
      await fsPromises.writeFile(fullOutputPath, resultCss, 'utf8');
      
      // Добавление в манифест
      this.addToManifest(originalWebPath, hashedWebPath);
      
      this.logger.info(`Обработан SCSS: ${path.basename(filePath)}`);
      
      // Сохраняем результат в кеш
      const result = { originalWebPath, hashedWebPath };
      if (isProdBuild) {
        this.cache.manifest[relativePathFromInput] = result;
      }
      
      return result;
      
    } catch (e) {
      this.logger.error(`Ошибка при обработке SCSS ${filePrefix}: ${e.message}`);
      throw e;
    }
  }

  /**
   * Обрабатывает JavaScript файлы
   */
  async processJs(filePath) {
    const filePrefix = path.basename(filePath);
    const relativePathFromInput = path.relative(this.config.inputDir, filePath).replace(/\\/g, '/');
    
    try {
      // Определяем, является ли файл главным входным файлом для бандла
      const isMainBundleEntry = relativePathFromInput === 'assets/scripts/main.js';
      
      let resultJs, outputFileName, originalWebPath;
      
      if (isMainBundleEntry) {
        // Для главного бандла используем esbuild с полным бандлингом
        const result = await this.compilers.esbuild.build({
          entryPoints: [filePath],
          bundle: true,
          minify: isProdBuild,
          sourcemap: !isProdBuild,
          write: false,
          absWorkingDir: process.cwd(),
        });
        
        resultJs = result.outputFiles[0].text;
        outputFileName = 'main.bundle.js';
        originalWebPath = '/assets/scripts/main.bundle.js';
        
      } else {
        // Для остальных файлов просто минимизируем с Terser, если это продакшен
        const fileContent = await fsPromises.readFile(filePath, 'utf8');
        
        if (isProdBuild && this.compilers.Terser) {
          try {
            const minified = await this.compilers.Terser.minify(fileContent, {
              mangle: { toplevel: true },
              compress: { passes: 2 },
              format: { comments: false }
            });
            
            resultJs = minified.code || fileContent;
          } catch (e) {
            this.logger.warn(`Ошибка минификации Terser для ${filePrefix}: ${e.message}`);
            resultJs = fileContent;
          }
        } else {
          resultJs = fileContent;
        }
        
        outputFileName = path.basename(filePath);
        originalWebPath = '/' + relativePathFromInput;
      }
      
      // Хеширование имени файла (в продакшене)
      const hashedFileName = this.getHashedFilename(outputFileName, resultJs);
      
      // Формирование выходных путей
      const outputSubdir = path.dirname(relativePathFromInput);
      const outputRelPath = path.join(outputSubdir, hashedFileName).replace(/\\/g, '/');
      const hashedWebPath = '/' + outputRelPath;
      const fullOutputPath = path.join(process.cwd(), this.config.outputDir, outputRelPath);
      
      // Запись файла
      await fsPromises.mkdir(path.dirname(fullOutputPath), { recursive: true });
      await fsPromises.writeFile(fullOutputPath, resultJs, 'utf8');
      
      // Добавление в манифест
      this.addToManifest(originalWebPath, hashedWebPath);
      
      this.logger.info(`Обработан JS: ${filePrefix}`);
      
      // Сохраняем результат в кеш
      const result = { originalWebPath, hashedWebPath };
      if (isProdBuild) {
        this.cache.manifest[relativePathFromInput] = result;
      }
      
      return result;
      
    } catch (e) {
      this.logger.error(`Ошибка при обработке JS ${filePrefix}: ${e.message}`);
      throw e;
    }
  }

  /**
   * Обрабатывает статические файлы (копирование + хеширование в production)
   */
  async processStatic(filePath) {
    const filePrefix = path.basename(filePath);
    const relativePathFromInput = path.relative(this.config.inputDir, filePath).replace(/\\/g, '/');
    
    try {
      // Чтение файла
      const fileContent = await fsPromises.readFile(filePath);
      
      // Формирование веб-пути к оригинальному файлу
      const originalWebPath = '/' + relativePathFromInput;
      
      // Хеширование имени файла (в продакшене)
      const hashedFileName = this.getHashedFilename(path.basename(filePath), fileContent);
      
      // Формирование выходных путей
      const outputSubdir = path.dirname(relativePathFromInput);
      const outputRelPath = path.join(outputSubdir, hashedFileName).replace(/\\/g, '/');
      const hashedWebPath = '/' + outputRelPath;
      const fullOutputPath = path.join(process.cwd(), this.config.outputDir, outputRelPath);
      
      // Запись файла
      await fsPromises.mkdir(path.dirname(fullOutputPath), { recursive: true });
      await fsPromises.copyFile(filePath, fullOutputPath);
      
      // Добавление в манифест
      this.addToManifest(originalWebPath, hashedWebPath);
      
      this.logger.info(`Обработан статический файл: ${filePrefix}`);
      
      // Сохраняем результат в кеш
      const result = { originalWebPath, hashedWebPath };
      if (isProdBuild) {
        this.cache.manifest[relativePathFromInput] = result;
      }
      
      return result;
      
    } catch (e) {
      this.logger.error(`Ошибка при обработке статического файла ${filePrefix}: ${e.message}`);
      throw e;
    }
  }

  /**
   * Сохраняет манифест ассетов в JSON файл
   */
  async saveManifest() {
    if (!isProdBuild) {
      this.logger.debug(`Пропускаем сохранение манифеста в режиме разработки`);
      return false;
    }
    
    try {
      const manifestPath = path.join(
        process.cwd(),
        this.config.outputDir,
        'asset-manifest.json'
      );
      
      await fsPromises.mkdir(path.dirname(manifestPath), { recursive: true });
      await fsPromises.writeFile(
        manifestPath,
        JSON.stringify(this.manifest, null, 2),
        'utf8'
      );
      
      this.logger.info(`Манифест сохранен: ${Object.keys(this.manifest).length} записей`);
      
      return true;
    } catch (e) {
      this.logger.error(`Ошибка сохранения манифеста: ${e.message}`);
      return false;
    }
  }
}

/**
 * Экспортируемая функция плагина для Eleventy
 */
export default function EleventyAssetProcessorPlugin(eleventyConfig, pluginOptions) {
  const logger = new Logger(isProdBuild, 'AssetProcessor Plugin');
  
  // Инициализация процессора ассетов
  let assetProcessor;
  try {
    assetProcessor = new AssetProcessor(pluginOptions);
  } catch (e) {
    logger.error(`Ошибка инициализации: ${e.message}`);
    if (isProdBuild) throw e;
    
    // Заглушка для режима разработки
    assetProcessor = {
      manifest: {},
      processAllAssets: async () => {},
      saveManifest: async () => {},
      addToManifest: () => {}
    };
  }
  
  // Регистрация фильтра hashed для шаблонов
  eleventyConfig.addFilter("hashed", filePath => {
    if (!isProdBuild) return filePath;
    
    let normalizedPath;
    try {
      const url = new URL(filePath, 'http://localhost');
      normalizedPath = url.pathname.startsWith('/') ? url.pathname : '/' + url.pathname;
    } catch (e) {
      normalizedPath = filePath.startsWith('/') ? filePath : '/' + filePath;
    }
    
    const hashedPath = assetProcessor.manifest[normalizedPath];
    if (!hashedPath) {
      logger.warn(`В манифесте не найден путь: ${normalizedPath}`);
      return filePath;
    }
    
    return hashedPath;
  });
  
  // Регистрация глобальных данных для манифеста
  eleventyConfig.addGlobalData("assetManifest", assetProcessor.manifest);
  
  // Обработка событий Eleventy
  
  // beforeBuild: Обработка всех ассетов
  eleventyConfig.on("beforeBuild", async () => {
    logger.info('Событие "beforeBuild"');
    
    // Очистка манифеста перед сборкой в production
    if (isProdBuild && assetProcessor.manifest) {
      Object.keys(assetProcessor.manifest).forEach(key => {
        delete assetProcessor.manifest[key];
      });
    }
    
    try {
      await assetProcessor.processAllAssets();
    } catch (e) {
      logger.error(`Ошибка в processAllAssets: ${e.message}`);
      if (isProdBuild) throw e;
    }
  });
  
  // afterBuild: Сохранение манифеста
  eleventyConfig.on("afterBuild", async () => {
    logger.info('Событие "afterBuild"');
    
    try {
      await assetProcessor.saveManifest();
    } catch (e) {
      logger.error(`Ошибка в saveManifest: ${e.message}`);
      if (isProdBuild) throw e;
    }
  });
  
  logger.info("Плагин зарегистрирован");
}