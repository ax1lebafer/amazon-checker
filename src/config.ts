import * as dotenv from 'dotenv';
import { Config, LogLevel } from './types';

// Загружаем переменные окружения
dotenv.config();

/**
 * Валидирует и возвращает конфигурацию
 */
export function loadConfig(): Config {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;
  const checkIntervalMinutes = parseInt(process.env.CHECK_INTERVAL_MINUTES || '5', 10);
  const logLevelStr = process.env.LOG_LEVEL || 'info';
  
  // Преобразуем строку в LogLevel enum
  let logLevel: LogLevel;
  switch (logLevelStr.toLowerCase()) {
    case 'debug':
      logLevel = LogLevel.DEBUG;
      break;
    case 'error':
      logLevel = LogLevel.ERROR;
      break;
    default:
      logLevel = LogLevel.INFO;
  }

  if (!telegramBotToken) {
    throw new Error('TELEGRAM_BOT_TOKEN не установлен в .env файле');
  }

  if (!telegramChatId) {
    throw new Error('TELEGRAM_CHAT_ID не установлен в .env файле');
  }

  if (isNaN(checkIntervalMinutes) || checkIntervalMinutes < 1) {
    throw new Error('CHECK_INTERVAL_MINUTES должен быть числом >= 1');
  }

  return {
    telegramBotToken,
    telegramChatId,
    checkIntervalMinutes,
    logLevel,
  };
}

/**
 * URL товаров для мониторинга
 */
export const PRODUCT_URLS = [
  'https://amzn.in/d/bHg6AfW',
  'https://amzn.in/d/3erpS1I',
  'https://amzn.in/d/9BIxHL1',
  'https://amzn.in/d/2LC2nQE',
  'https://amzn.in/d/4MbeBzP',
  'https://www.amazon.in/dp/B0C1GYD3KN',
];
