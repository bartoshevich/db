// workbox-config.js - ВЕРСИЯ ДЛЯ injectManifest

export default {
  globDirectory: '_site/',
  globPatterns: [
    '**/*.html',
    'assets/css/*.css',
    'assets/js/main-*.js', // Только основной бандл
    'assets/fonts/*.{woff,woff2}',
    'assets/images/sprite-*.svg',
    'favicon.ico',
    'site.webmanifest',
    'feed.json',
    'feed.xml'
  ],
  // Явно добавляем офлайн-страницу, чтобы она попала в precache manifest
  additionalManifestEntries: [
    { url: '/offline/', revision: null }
  ],
  swSrc: '_site/sw.js',
  swDest: '_site/sw.js',

  // Опции для injectManifest
  injectionPoint: 'self.__WB_MANIFEST',
};