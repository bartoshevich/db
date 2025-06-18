import fs from 'fs';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Указать URL тестируемого сайта
const url = 'http://localhost:8080';

// Настройки Lighthouse
const options = {
  chromeFlags: ['--headless'],
  output: ['html', 'json'],
  logLevel: 'info',
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Папка для отчётов
const outputDir = resolve(__dirname, '../reports');
fs.mkdirSync(outputDir, { recursive: true });

(async () => {
  const chrome = await launch({ chromeFlags: options.chromeFlags });
  const result = await lighthouse(url, {
    ...options,
    port: chrome.port,
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const htmlPath = resolve(outputDir, `lighthouse-report-${timestamp}.html`);
  const jsonPath = resolve(outputDir, `lighthouse-report-${timestamp}.json`);

  fs.writeFileSync(htmlPath, result.report[0]);
  fs.writeFileSync(jsonPath, result.report[1]);

  console.log(`✅ Lighthouse HTML report saved to: ${htmlPath}`);
  console.log(`✅ Lighthouse JSON report saved to: ${jsonPath}`);

  await chrome.kill();
})();
