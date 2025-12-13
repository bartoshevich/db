/**
 * Модуль для работы с Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { print, colors } from './utils.js';

dotenv.config();

let anthropic = null;

/**
 * Инициализация Claude API клиента
 */
export function initializeClaudeAPI() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY не найден в переменных окружения.\n' +
        'Создайте файл .env в корне проекта и добавьте:\n' +
        'ANTHROPIC_API_KEY=your_api_key_here\n\n' +
        'Получить API ключ можно на: https://console.anthropic.com/'
    );
  }

  anthropic = new Anthropic({
    apiKey: apiKey,
  });

  return anthropic;
}

/**
 * Генерация контента через Claude API
 */
export async function generateContent(prompt, options = {}) {
  if (!anthropic) {
    initializeClaudeAPI();
  }

  const {
    model = 'claude-sonnet-4-20250514',
    maxTokens = 8000,
    temperature = 1.0,
    systemPrompt = 'Вы опытный маркетинговый стратег и контент-консультант, специализирующийся на создании успешного контента для русскоязычной аудитории.',
  } = options;

  try {
    const message = await anthropic.messages.create({
      model: model,
      max_tokens: maxTokens,
      temperature: temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return message.content[0].text;
  } catch (error) {
    if (error.status === 401) {
      throw new Error('Неверный API ключ. Проверьте ANTHROPIC_API_KEY в .env файле.');
    } else if (error.status === 429) {
      throw new Error('Превышен лимит запросов к API. Попробуйте позже.');
    } else {
      throw new Error(`Ошибка API: ${error.message}`);
    }
  }
}

/**
 * Генерация контента с потоковой передачей (для интерактивности)
 */
export async function generateContentStream(prompt, options = {}, onChunk = null) {
  if (!anthropic) {
    initializeClaudeAPI();
  }

  const {
    model = 'claude-sonnet-4-20250514',
    maxTokens = 8000,
    temperature = 1.0,
    systemPrompt = 'Вы опытный маркетинговый стратег и контент-консультант, специализирующийся на создании успешного контента для русскоязычной аудитории.',
  } = options;

  try {
    const stream = await anthropic.messages.stream({
      model: model,
      max_tokens: maxTokens,
      temperature: temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    let fullText = '';

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta &&
        chunk.delta.type === 'text_delta'
      ) {
        const text = chunk.delta.text;
        fullText += text;

        if (onChunk) {
          onChunk(text);
        }
      }
    }

    return fullText;
  } catch (error) {
    if (error.status === 401) {
      throw new Error('Неверный API ключ. Проверьте ANTHROPIC_API_KEY в .env файле.');
    } else if (error.status === 429) {
      throw new Error('Превышен лимит запросов к API. Попробуйте позже.');
    } else {
      throw new Error(`Ошибка API: ${error.message}`);
    }
  }
}

/**
 * Проверка доступности API
 */
export async function checkAPIAvailability() {
  try {
    initializeClaudeAPI();
    await generateContent('Test', { maxTokens: 10 });
    return true;
  } catch (error) {
    print(`\nОшибка подключения к Claude API: ${error.message}`, 'red');
    return false;
  }
}
