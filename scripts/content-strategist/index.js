/**
 * Главный оркестратор Content Strategy Assistant
 */

import ora from 'ora';
import {
  print,
  printSection,
  printSubsection,
  saveResults,
  formatDuration,
  colors,
} from './utils.js';
import { checkAPIAvailability } from './claude-api.js';
import {
  collectTopicInfo,
  selectAnalysisModules,
  collectCompetitorInfo,
  confirmAnalysis,
  askSaveOptions,
} from './cli.js';
import {
  researchTopic,
  analyzeCompetitors,
  generateInterviewQuestions,
  analyzeViralPotential,
  generateSEOStrategy,
  generateArticleStructure,
  generateDistributionPlan,
} from './generators.js';

/**
 * Главная функция запуска ассистента
 */
export async function run(initialTopic = null) {
  const startTime = Date.now();

  try {
    // Проверка API ключа
    const spinner = ora('Проверка подключения к Claude API...').start();
    const apiAvailable = await checkAPIAvailability();
    spinner.stop();

    if (!apiAvailable) {
      print(
        '\n❌ Не удалось подключиться к Claude API. Проверьте файл .env и API ключ.\n',
        'red'
      );
      process.exit(1);
    }

    print('✓ Подключение к Claude API успешно\n', 'green');

    // Сбор информации о теме
    const context = await collectTopicInfo(initialTopic);

    // Выбор модулей анализа
    const modules = await selectAnalysisModules();

    // Сбор информации о конкурентах (если выбран модуль)
    let competitors = null;
    if (modules.includes('competitors')) {
      competitors = await collectCompetitorInfo();
    }

    // Подтверждение запуска
    const proceed = await confirmAnalysis(context, modules);

    if (!proceed) {
      print('\n❌ Анализ отменен.\n', 'yellow');
      return;
    }

    // Запуск анализа
    print('\n', 'reset');
    printSection('🚀 ЗАПУСК АНАЛИЗА');
    print('\nЭто может занять несколько минут. Пожалуйста, подождите...\n', 'cyan');

    const results = {};

    // Исследование темы
    if (modules.includes('research')) {
      const spinner = ora('Исследование темы...').start();
      try {
        results.research = await researchTopic(context, false);
        spinner.succeed('Исследование темы завершено');
      } catch (error) {
        spinner.fail(`Ошибка исследования темы: ${error.message}`);
      }
    }

    // Анализ конкурентов
    if (modules.includes('competitors')) {
      const spinner = ora('Анализ конкурентов...').start();
      try {
        const competitorInfo = competitors
          ? competitors
              .map((c, i) => `${i + 1}. ${c.url}${c.description ? ` - ${c.description}` : ''}`)
              .join('\n')
          : '';
        results.competitors = await analyzeCompetitors(context, competitorInfo, false);
        spinner.succeed('Анализ конкурентов завершен');
      } catch (error) {
        spinner.fail(`Ошибка анализа конкурентов: ${error.message}`);
      }
    }

    // Вопросы для интервью
    if (modules.includes('interview')) {
      const spinner = ora('Генерация вопросов для интервью...').start();
      try {
        results.interview = await generateInterviewQuestions(context, false);
        spinner.succeed('Вопросы для интервью сгенерированы');
      } catch (error) {
        spinner.fail(`Ошибка генерации вопросов: ${error.message}`);
      }
    }

    // Анализ вирусного потенциала
    if (modules.includes('viral')) {
      const spinner = ora('Анализ вирусного потенциала...').start();
      try {
        results.viral = await analyzeViralPotential(context, false);
        spinner.succeed('Анализ вирусного потенциала завершен');
      } catch (error) {
        spinner.fail(`Ошибка анализа вирусного потенциала: ${error.message}`);
      }
    }

    // SEO-стратегия
    if (modules.includes('seo')) {
      const spinner = ora('Генерация SEO-стратегии...').start();
      try {
        results.seo = await generateSEOStrategy(context, false);
        spinner.succeed('SEO-стратегия сгенерирована');
      } catch (error) {
        spinner.fail(`Ошибка генерации SEO-стратегии: ${error.message}`);
      }
    }

    // Структура статьи
    if (modules.includes('structure')) {
      const spinner = ora('Разработка структуры статьи...').start();
      try {
        results.structure = await generateArticleStructure(context, false);
        spinner.succeed('Структура статьи готова');
      } catch (error) {
        spinner.fail(`Ошибка генерации структуры: ${error.message}`);
      }
    }

    // План дистрибуции
    if (modules.includes('distribution')) {
      const spinner = ora('Формирование плана дистрибуции...').start();
      try {
        results.distribution = await generateDistributionPlan(context, false);
        spinner.succeed('План дистрибуции готов');
      } catch (error) {
        spinner.fail(`Ошибка генерации плана дистрибуции: ${error.message}`);
      }
    }

    // Вывод результатов
    printSection('📊 РЕЗУЛЬТАТЫ АНАЛИЗА');

    if (results.research) {
      printSubsection('🔬 Исследование темы');
      print('\n' + results.research + '\n');
    }

    if (results.competitors) {
      printSubsection('🔎 Анализ конкурентов');
      print('\n' + results.competitors + '\n');
    }

    if (results.interview) {
      printSubsection('❓ Вопросы для интервью');
      print('\n' + results.interview + '\n');
    }

    if (results.viral) {
      printSubsection('🚀 Анализ вирусного потенциала');
      print('\n' + results.viral + '\n');
    }

    if (results.seo) {
      printSubsection('🔍 SEO-стратегия');
      print('\n' + results.seo + '\n');
    }

    if (results.structure) {
      printSubsection('📋 Структура статьи');
      print('\n' + results.structure + '\n');
    }

    if (results.distribution) {
      printSubsection('📢 План дистрибуции');
      print('\n' + results.distribution + '\n');
    }

    // Сохранение результатов
    const saveOptions = await askSaveOptions();

    if (saveOptions.save) {
      const spinner = ora('Сохранение результатов...').start();

      const markdownContent = generateMarkdown(context, results, modules);
      const outputPath = saveOptions.outputPath || 'content-plans';

      try {
        const filePath = saveResults(context.topic, markdownContent, outputPath);
        spinner.succeed(`Результаты сохранены: ${filePath}`);
      } catch (error) {
        spinner.fail(`Ошибка сохранения: ${error.message}`);
      }
    }

    // Итоговая статистика
    const duration = Date.now() - startTime;
    printSection('✅ ГОТОВО');
    print(`\nВремя выполнения: ${formatDuration(duration)}`, 'cyan');
    print(`Модулей обработано: ${modules.length}`, 'cyan');
    print('\nУспешного написания статьи! 🚀\n', 'green');
  } catch (error) {
    print(`\n❌ Критическая ошибка: ${error.message}\n`, 'red');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Генерация маркдаун-контента для сохранения
 */
function generateMarkdown(context, results, modules) {
  let markdown = `# Контент-стратегия: ${context.topic}\n\n`;

  markdown += `**Формат:** ${context.format}\n`;
  markdown += `**Целевая аудитория:** ${context.targetAudience}\n`;

  if (context.additionalContext) {
    markdown += `**Дополнительный контекст:** ${context.additionalContext}\n`;
  }

  markdown += `\n---\n\n`;

  const sectionTitles = {
    research: '## 🔬 Исследование темы\n\n',
    competitors: '## 🔎 Анализ конкурентов\n\n',
    interview: '## ❓ Вопросы для интервью\n\n',
    viral: '## 🚀 Анализ вирусного потенциала\n\n',
    seo: '## 🔍 SEO-стратегия\n\n',
    structure: '## 📋 Структура статьи\n\n',
    distribution: '## 📢 План дистрибуции\n\n',
  };

  modules.forEach(module => {
    if (results[module]) {
      markdown += sectionTitles[module];
      markdown += results[module];
      markdown += '\n\n---\n\n';
    }
  });

  return markdown;
}
