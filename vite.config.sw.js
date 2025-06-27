// vite.config.sw.js - специальный конфиг ТОЛЬКО для сборки Service Worker

import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // Указываем, что корень для этого процесса - весь проект
  root: path.resolve(__dirname, 'src'),
  
  build: {
    // Собираем в _site
    outDir: path.resolve(__dirname, '_site'),
    // Не очищаем _site, так как там уже могут быть файлы от Eleventy и основного Vite
    emptyOutDir: false, 
    
    rollupOptions: {
      input: {
        // Наша единственная точка входа
        sw: path.resolve(__dirname, 'src/sw.js')
      },
      output: {
        // Выходной файл будет называться sw.js
        entryFileNames: 'sw.js', 
      }
    }
  }
});