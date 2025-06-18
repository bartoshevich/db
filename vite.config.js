// vite.config.js - Финальная правильная интеграция с Eleventy
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import postcssNesting from 'postcss-nesting';
import autoprefixer from 'autoprefixer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const isServe = process.env.VITE_MODE === 'serve';

export default defineConfig({
  // =================================================================
  // БАЗОВЫЕ НАСТРОЙКИ
  // =================================================================
  
  // Корневая директория остается в src для доступа к ассетам
  root: path.resolve(__dirname, 'src'),
  
  // В dev режиме base должен быть '/', в prod - '/assets/'
  base: isServe ? '/' : '/assets/',
  
  
 publicDir: false, // Отключаем publicDir, т.к. используем src/assets для ассетов
  
  // =================================================================
  // НАСТРОЙКИ DEV СЕРВЕРА
  // =================================================================
  server: {
    port: 5173,
    host: 'localhost',
    strictPort: true,
    cors: true,
    
    // Настройки HMR для работы через прокси
    hmr: {
      port: 5173,
      host: 'localhost',
      overlay: true
    },
    
    // Правильные заголовки для CORS
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'false'
    },
    
    // middleware для работы через прокси отключен
    middlewareMode: false,
    
    // Не открывать браузер автоматически
    open: false,
    
    // Настройки файловой системы
    fs: {
      strict: false,
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, 'node_modules')
      ]
    }
  },

  // =================================================================
  // НАСТРОЙКИ СБОРКИ
  // =================================================================
  build: {
    // Правильная структура директорий
    outDir: path.resolve(__dirname, '_site/assets'),
    emptyOutDir: true,
    
    // Генерация манифеста для prod
    manifest: "manifest.json",
    
    // Настройки минификации
    minify: isProd ? 'terser' : false,
    terserOptions: isProd ? {
      compress: {
        drop_console: true,
        drop_debugger: true
      },
      format: { comments: false }
    } : {},
    
    cssMinify: isProd,
    
    // Правильные entry points
    rollupOptions: {
      input: {
        // Основной entry point
        main: path.resolve(__dirname, 'src/assets/scripts/main.js'),
        // ДОБАВЛЯЕМ критический скрипт для хеширования
        'critical-theme': path.resolve(__dirname, 'src/assets/scripts/critical--theme.js')
      },
      
      output: {
        // Правильная организация файлов
        entryFileNames: isProd ? 'js/[name]-[hash].js' : 'js/[name].js',
        chunkFileNames: isProd ? 'js/[name]-[hash].js' : 'js/[name].js',
        assetFileNames: (assetInfo) => {
          const ext = path.extname(assetInfo.name).slice(1);
          const dirMap = {
            css: 'css',
            js: 'js',
            svg: 'images',
            png: 'images',
            jpg: 'images',
            jpeg: 'images',
            avif: 'images',
            webp: 'images',
            gif: 'images',
            ico: 'images',
            woff: 'fonts',
            woff2: 'fonts'
          };
          const dir = dirMap[ext] || 'misc';
          return isProd ? `${dir}/[name]-[hash][extname]` : `${dir}/[name][extname]`;
        },
        
        // Настройки для чанков
        manualChunks: isProd ? {
          vendor: ['workbox-window']
        } : undefined
      }
    },
    
    sourcemap: isProd ? false : 'inline',
    reportCompressedSize: isProd,
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari13.1']
  },

  // =================================================================
  // НАСТРОЙКИ CSS
  // =================================================================
  css: {
    postcss: {
      plugins: [
        postcssNesting(),
        autoprefixer({
          overrideBrowserslist: [
            '> 1%',
            'last 2 versions',
            'not dead',
            'not ie 11'
          ],
          grid: true,
          flexbox: true
        })
      ]
    },
    
    preprocessorOptions: {
      scss: {
        // Правильные пути для SCSS
        additionalData: `
          @use "sass:math";
          @use "sass:color";
          @use "sass:string";
          @use "sass:list";
          @use "sass:map";
        `,
        
        api: 'modern-compiler',
        sourceMap: !isProd,
        charset: false,
        
        includePaths: [
          path.resolve(__dirname, 'src/assets/scss'),
          path.resolve(__dirname, 'src/assets'),
          path.resolve(__dirname, 'node_modules')
        ]
      }
    },
    
    devSourcemap: !isProd
  },

  // =================================================================
  // АЛИАСЫ И РЕЗОЛВ
  // =================================================================
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@scripts': path.resolve(__dirname, 'src/assets/scripts'),
      '@styles': path.resolve(__dirname, 'src/assets/scss'),
      '@scss': path.resolve(__dirname, 'src/assets/scss')
    }
  },

  // =================================================================
  // ПЛАГИНЫ
  // =================================================================
   plugins: [
    // Специальный плагин для SVG CORS
    {
      name: 'svg-cors-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Специальная обработка SVG файлов
          if (req.url && req.url.includes('.svg')) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'no-cache');
            
            // Обработка preflight запросов
            if (req.method === 'OPTIONS') {
              res.statusCode = 200;
              res.end();
              return;
            }
          }
          next();
        });
      }
    },

    // Кастомный плагин для интеграции с Eleventy
    {
      name: 'eleventy-integration',
      configureServer(server) {
        server.middlewares.use('/', (req, res, next) => {
          // Добавляем правильные CORS заголовки
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          
          // Специальные заголовки для SVG файлов
          if (req.url && req.url.endsWith('.svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'no-cache');
          }
          
          // Обработка preflight запросов
          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
          }
          
          next();
        });
      },
      
      buildStart() {
        console.log(`🚀 Vite ${isProd ? 'build' : 'dev server'} запущен`);
        if (!isProd) {
          console.log('📡 Dev server: http://localhost:5173');
          console.log('🔄 HMR активен для горячей перезагрузки');
        }
      }
    }
  ],

  // =================================================================
  // ОПТИМИЗАЦИЯ ЗАВИСИМОСТЕЙ
  // =================================================================
  optimizeDeps: {
    include: [
      // Предзагружаем часто используемые модули
    ],
    exclude: [
      // Исключаем модули, которые не нужно оптимизировать
    ]
  },
  
  // Настройки для лучшей совместимости
  esbuild: {
    target: 'es2020'
  }
});