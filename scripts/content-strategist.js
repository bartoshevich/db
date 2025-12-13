#!/usr/bin/env node

/**
 * Content Strategy Assistant
 * Интеллектуальный помощник для планирования контент-стратегии
 *
 * Использование:
 *   npm run plan-article                  - Интерактивный режим
 *   npm run plan-article "Тема статьи"    - С указанием темы
 */

import { run } from './content-strategist/index.js';
import { print, colors } from './content-strategist/utils.js';

// Обработка аргументов командной строки
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Извлечение темы из аргументов
const topic = args.length > 0 ? args.join(' ') : null;

// Запуск ассистента
run(topic).catch(error => {
  print(`\n❌ Неожиданная ошибка: ${error.message}\n`, 'red');
  console.error(error);
  process.exit(1);
});

/**
 * Справка
 */
function showHelp() {
  console.log(`
${colors.bright}Content Strategy Assistant${colors.reset}
${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

Интеллектуальный помощник для планирования контент-стратегии.
Использует Claude API для глубокого анализа темы и генерации персонализированных рекомендаций.

${colors.yellow}ИСПОЛЬЗОВАНИЕ:${colors.reset}

  ${colors.green}npm run plan-article${colors.reset}
    Запуск в интерактивном режиме

  ${colors.green}npm run plan-article "Тема статьи"${colors.reset}
    Запуск с указанием темы (остальное будет запрошено интерактивно)

${colors.yellow}ВОЗМОЖНОСТИ:${colors.reset}

  🔬 ${colors.bright}Исследование темы${colors.reset}
     Анализ актуальности, целевой аудитории, ключевых инсайтов

  🔎 ${colors.bright}Анализ конкурентов${colors.reset}
     Поиск пробелов в контенте, уникальный угол подачи

  ❓ ${colors.bright}Генерация вопросов для интервью${colors.reset}
     Персонализированные вопросы, специфичные для темы

  🚀 ${colors.bright}Анализ вирусного потенциала${colors.reset}
     Оценка потенциала, рекомендации по усилению

  🔍 ${colors.bright}SEO-стратегия${colors.reset}
     Ключевые слова, метаданные, структура контента

  📋 ${colors.bright}Структура статьи${colors.reset}
     Детальная структура с рекомендациями по объему

  📢 ${colors.bright}План дистрибуции${colors.reset}
     Стратегия продвижения в Telegram, LinkedIn, Email

${colors.yellow}ТРЕБОВАНИЯ:${colors.reset}

  • Node.js >= 22.21.0
  • Claude API ключ (создайте файл .env с ANTHROPIC_API_KEY)

${colors.yellow}ПРИМЕРЫ:${colors.reset}

  ${colors.dim}# Интерактивный режим${colors.reset}
  ${colors.green}npm run plan-article${colors.reset}

  ${colors.dim}# С указанием темы${colors.reset}
  ${colors.green}npm run plan-article "Трудовая миграция маркетолога"${colors.reset}

  ${colors.dim}# Показать эту справку${colors.reset}
  ${colors.green}npm run plan-article -- --help${colors.reset}

${colors.yellow}ПОЛУЧЕНИЕ API КЛЮЧА:${colors.reset}

  1. Зарегистрируйтесь на ${colors.cyan}https://console.anthropic.com/${colors.reset}
  2. Создайте API ключ
  3. Создайте файл ${colors.bright}.env${colors.reset} в корне проекта:
     ${colors.dim}ANTHROPIC_API_KEY=your_api_key_here${colors.reset}

${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
`);
}
