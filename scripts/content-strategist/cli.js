/**
 * Интерактивный CLI для сбора информации
 */

import { input, select, confirm, checkbox } from '@inquirer/prompts';
import { print, printSection, colors } from './utils.js';

/**
 * Приветствие и сбор базовой информации о теме
 */
export async function collectTopicInfo(initialTopic = null) {
  printSection('🎯 АНАЛИЗ КОНТЕНТА');
  print('\nДобро пожаловать в Content Strategy Assistant!', 'bright');
  print('Я помогу спланировать вашу статью с учетом всех важных аспектов.\n', 'cyan');

  // Тема статьи
  const topic = initialTopic
    ? initialTopic
    : await input({
        message: 'Какую тему вы хотите исследовать?',
        required: true,
      });

  print(`\n✓ Тема: ${topic}`, 'green');

  // Формат контента
  const format = await select({
    message: 'Какой формат контента планируется?',
    choices: [
      { name: 'Интервью', value: 'interview' },
      { name: 'Экспертная статья', value: 'expert-article' },
      { name: 'Кейс-стади', value: 'case-study' },
      { name: 'Исследование', value: 'research' },
      { name: 'Обзор / Сравнение', value: 'review' },
      { name: 'Гайд / How-to', value: 'guide' },
      { name: 'Другое', value: 'other' },
    ],
  });

  // Целевая аудитория
  const targetAudience = await input({
    message: 'Опишите целевую аудиторию статьи:',
    default: 'Маркетологи, владельцы бизнеса',
  });

  // Дополнительный контекст
  const hasAdditionalContext = await confirm({
    message: 'Есть ли дополнительный контекст или специфические требования?',
    default: false,
  });

  let additionalContext = '';
  if (hasAdditionalContext) {
    additionalContext = await input({
      message: 'Опишите дополнительный контекст:',
    });
  }

  return {
    topic,
    format,
    targetAudience,
    additionalContext,
  };
}

/**
 * Выбор модулей анализа
 */
export async function selectAnalysisModules() {
  printSection('📊 ВЫБОР МОДУЛЕЙ АНАЛИЗА');
  print('\nВыберите, что вы хотите получить:', 'cyan');

  const modules = await checkbox({
    message: 'Модули анализа (используйте пробел для выбора):',
    choices: [
      { name: '🔬 Исследование темы', value: 'research', checked: true },
      { name: '🔎 Анализ конкурентов', value: 'competitors', checked: true },
      { name: '❓ Вопросы для интервью', value: 'interview', checked: false },
      { name: '🚀 Анализ вирусного потенциала', value: 'viral', checked: true },
      { name: '🔍 SEO-стратегия', value: 'seo', checked: true },
      { name: '📋 Структура статьи', value: 'structure', checked: true },
      { name: '📢 План дистрибуции', value: 'distribution', checked: true },
    ],
    required: true,
    validate: answers => {
      if (answers.length === 0) {
        return 'Выберите хотя бы один модуль';
      }
      return true;
    },
  });

  return modules;
}

/**
 * Сбор информации о конкурентах
 */
export async function collectCompetitorInfo() {
  print('\n', 'reset');

  const hasCompetitors = await confirm({
    message: 'Есть ли у вас ссылки на статьи конкурентов по этой теме?',
    default: false,
  });

  if (!hasCompetitors) {
    return null;
  }

  print(
    '\nВведите URL статей конкурентов (по одному на строку, пустая строка для завершения):',
    'cyan'
  );

  const competitors = [];
  let index = 1;

  while (true) {
    const url = await input({
      message: `URL #${index}:`,
      required: false,
    });

    if (!url || url.trim() === '') {
      break;
    }

    competitors.push(url.trim());
    index++;
  }

  if (competitors.length === 0) {
    return null;
  }

  // Опционально: краткое описание для каждого конкурента
  const addDescriptions = await confirm({
    message: 'Хотите добавить краткое описание для каждой статьи?',
    default: false,
  });

  if (!addDescriptions) {
    return competitors.map(url => ({ url }));
  }

  const competitorsWithDesc = [];
  for (let i = 0; i < competitors.length; i++) {
    const description = await input({
      message: `Описание для ${competitors[i]}:`,
      required: false,
    });

    competitorsWithDesc.push({
      url: competitors[i],
      description: description || '',
    });
  }

  return competitorsWithDesc;
}

/**
 * Подтверждение запуска анализа
 */
export async function confirmAnalysis(context, modules) {
  printSection('📝 РЕЗЮМЕ');

  print('\nТема:', 'bright');
  print(`  ${context.topic}`, 'cyan');

  print('\nФормат:', 'bright');
  print(`  ${formatType(context.format)}`, 'cyan');

  print('\nЦелевая аудитория:', 'bright');
  print(`  ${context.targetAudience}`, 'cyan');

  if (context.additionalContext) {
    print('\nДополнительный контекст:', 'bright');
    print(`  ${context.additionalContext}`, 'cyan');
  }

  print('\nВыбранные модули:', 'bright');
  modules.forEach(module => {
    print(`  • ${getModuleName(module)}`, 'cyan');
  });

  print('\n' + '─'.repeat(60), 'yellow');

  const proceed = await confirm({
    message: '\nНачать анализ?',
    default: true,
  });

  return proceed;
}

/**
 * Опции сохранения результатов
 */
export async function askSaveOptions() {
  const shouldSave = await confirm({
    message: '\nСохранить результаты в файл?',
    default: true,
  });

  if (!shouldSave) {
    return { save: false };
  }

  const customPath = await confirm({
    message: 'Хотите указать свой путь для сохранения?',
    default: false,
  });

  let outputPath = null;
  if (customPath) {
    outputPath = await input({
      message: 'Укажите путь к директории:',
      default: 'content-plans',
    });
  }

  return {
    save: true,
    outputPath,
  };
}

/**
 * Вспомогательные функции
 */

function formatType(type) {
  const types = {
    interview: 'Интервью',
    'expert-article': 'Экспертная статья',
    'case-study': 'Кейс-стади',
    research: 'Исследование',
    review: 'Обзор / Сравнение',
    guide: 'Гайд / How-to',
    other: 'Другое',
  };

  return types[type] || type;
}

function getModuleName(moduleKey) {
  const names = {
    research: '🔬 Исследование темы',
    competitors: '🔎 Анализ конкурентов',
    interview: '❓ Вопросы для интервью',
    viral: '🚀 Анализ вирусного потенциала',
    seo: '🔍 SEO-стратегия',
    structure: '📋 Структура статьи',
    distribution: '📢 План дистрибуции',
  };

  return names[moduleKey] || moduleKey;
}
