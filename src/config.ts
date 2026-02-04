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
  // PlayStation Store Gift Cards - используем полные URL без параметров
  'https://www.amazon.in/dp/B07K6RYVHR', // 1000₹ (было amzn.in/d/bHg6AfW)
  'https://www.amazon.in/dp/B093QF35KZ', // 2000₹ (было amzn.in/d/3erpS1I)
  'https://www.amazon.in/dp/B07K6PVR8B', // 3000₹ (было amzn.in/d/9BIxHL1)
  'https://www.amazon.in/dp/B07K6RYVJ5', // 4000₹ (было amzn.in/d/2LC2nQE)
  'https://www.amazon.in/dp/B0B3DDW7TB', // 5000₹ (было amzn.in/d/4MbeBzP)
  'https://www.amazon.in/dp/B0C1GYD3KN', // Alternative 5000₹
  'https://www.amazon.in/dp/B0C1H473H8', // 3000₹ (было amzn.in/d/0hsyu8x2)
  'https://www.amazon.in/dp/B0C1H3K2V4', // 5000₹ (было amzn.in/d/0j26D3Xe) - РАБОТАЕТ!
];
