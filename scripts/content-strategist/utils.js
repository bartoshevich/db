/**
 * Утилиты для Content Strategy Assistant
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Цвета для терминала
export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

/**
 * Выводит текст с цветом
 */
export function print(text, color = 'reset') {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

/**
 * Выводит заголовок секции
 */
export function printSection(title) {
  print('\n═══════════════════════════════════════════════════════════════', 'cyan');
  print(`  ${title}`, 'bright');
  print('═══════════════════════════════════════════════════════════════', 'cyan');
}

/**
 * Выводит подзаголовок
 */
export function printSubsection(title) {
  print(`\n${title}`, 'yellow');
  print('─'.repeat(60), 'yellow');
}

/**
 * Анализ успешных паттернов в существующих статьях
 */
export function analyzeSuccessfulPatterns() {
  const postsDir = path.join(__dirname, '..', '..', 'src', '_posts');

  if (!fs.existsSync(postsDir)) {
    return {
      totalPosts: 0,
      patterns: {
        interviews: 0,
        withImages: 0,
        withTOC: 0,
        withVideo: 0,
        longForm: 0,
      },
    };
  }

  const posts = fs
    .readdirSync(postsDir)
    .filter(file => file.endsWith('.njk'))
    .map(file => {
      const content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
      return { file, content };
    });

  // Ищем паттерны успешных статей
  const patterns = {
    interviews: posts.filter(p => p.content.includes('mentions:') || p.content.includes('интервью'))
      .length,
    withImages: posts.filter(p => (p.content.match(/<img/g) || []).length > 5).length,
    withTOC: posts.filter(p => p.content.includes('class="toc')).length,
    withVideo: posts.filter(p => p.content.includes('VideoObject')).length,
    longForm: posts.filter(p => p.content.length > 20000).length,
  };

  return {
    totalPosts: posts.length,
    patterns,
  };
}

/**
 * Форматирование списка маркдаун
 */
export function formatMarkdownList(items, indent = 0) {
  const prefix = ' '.repeat(indent);
  return items.map(item => `${prefix}• ${item}`).join('\n');
}

/**
 * Сохранение результатов в файл
 */
export function saveResults(topic, results, outputDir = 'content-plans') {
  const timestamp = new Date().toISOString().slice(0, 10);
  const slug = topic
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);

  const filename = `${timestamp}-${slug}.md`;
  const dirPath = path.join(process.cwd(), outputDir);
  const filePath = path.join(dirPath, filename);

  // Создаем директорию если её нет
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Формируем маркдаун
  const markdown = `# Контент-стратегия: ${topic}

Дата создания: ${new Date().toLocaleString('ru-RU')}

${results}

---
*Сгенерировано Content Strategy Assistant*
`;

  fs.writeFileSync(filePath, markdown, 'utf-8');

  return filePath;
}

/**
 * Форматирование времени выполнения
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

/**
 * Создание разделителя
 */
export function separator(char = '─', length = 60) {
  return char.repeat(length);
}
