import TelegramBot from 'node-telegram-bot-api';
import { log } from './logger';
import { LogLevel } from './types';

let bot: TelegramBot | null = null;
let chatId: string = '';

/**
 * Инициализирует Telegram бота
 * @param token - токен бота
 * @param targetChatId - ID чата для отправки сообщений
 */
export function initTelegramBot(token: string, targetChatId: string): void {
  try {
    bot = new TelegramBot(token, { polling: false });
    chatId = targetChatId;
    log(LogLevel.INFO, '✅ Telegram бот инициализирован');
  } catch (error) {
    log(LogLevel.ERROR, `Ошибка инициализации Telegram бота: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Отправляет уведомление о появлении товара
 * @param productName - название товара
 * @param url - ссылка на товар
 */
export async function sendAvailabilityNotification(
  productName: string,
  url: string
): Promise<void> {
  if (!bot) {
    log(LogLevel.ERROR, 'Telegram бот не инициализирован');
    return;
  }

  try {
    const message = `🟢 *${escapeMarkdown(productName)}* \\- появился в наличии\\!\n\n[Открыть товар на Amazon](${escapeMarkdown(url)})`;

    await bot.sendMessage(chatId, message, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: false,
    });

    log(LogLevel.INFO, `📨 Отправлено уведомление: ${productName}`);
  } catch (error) {
    log(LogLevel.ERROR, `Ошибка отправки уведомления: ${(error as Error).message}`);
    
    // Пробуем отправить без markdown в случае ошибки
    try {
      const simpleMessage = `🟢 ${productName} - появился в наличии!\n\n${url}`;
      await bot.sendMessage(chatId, simpleMessage);
      log(LogLevel.INFO, `📨 Уведомление отправлено (простой формат): ${productName}`);
    } catch (retryError) {
      log(LogLevel.ERROR, `Не удалось отправить уведомление даже в простом формате: ${(retryError as Error).message}`);
    }
  }
}

/**
 * Отправляет тестовое сообщение для проверки работы бота
 */
export async function sendTestNotification(): Promise<boolean> {
  if (!bot) {
    log(LogLevel.ERROR, 'Telegram бот не инициализирован');
    return false;
  }

  try {
    const message = '✅ Скрипт мониторинга Amazon.in запущен и работает!';
    await bot.sendMessage(chatId, message);
    log(LogLevel.INFO, '✅ Тестовое уведомление отправлено');
    return true;
  } catch (error) {
    log(LogLevel.ERROR, `Ошибка отправки тестового уведомления: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Экранирует специальные символы для MarkdownV2
 */
function escapeMarkdown(text: string): string {
  // Символы, которые нужно экранировать в MarkdownV2
  const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  
  let escaped = text;
  for (const char of specialChars) {
    escaped = escaped.split(char).join('\\' + char);
  }
  
  return escaped;
}

/**
 * Отправляет уведомление об ошибке
 */
export async function sendErrorNotification(errorMessage: string): Promise<void> {
  if (!bot) {
    return;
  }

  try {
    const message = `⚠️ Ошибка в скрипте мониторинга:\n\n${errorMessage}`;
    await bot.sendMessage(chatId, message);
    log(LogLevel.INFO, '📨 Отправлено уведомление об ошибке');
  } catch (error) {
    log(LogLevel.ERROR, `Не удалось отправить уведомление об ошибке: ${(error as Error).message}`);
  }
}
