import TelegramBot from 'node-telegram-bot-api';
import { log, getRecentLogs } from './logger';
import { LogLevel } from './types';

const TELEGRAM_MSG_MAX = 4096;

let bot: TelegramBot | null = null;
let chatId: string = '';

let statusProvider: (() => string) | null = null;

/**
 * Инициализирует Telegram бота (с polling для приёма команд)
 * @param token - токен бота
 * @param targetChatId - ID чата для отправки сообщений и приёма команд
 */
export function initTelegramBot(token: string, targetChatId: string): void {
  try {
    bot = new TelegramBot(token, { polling: true });
    chatId = String(targetChatId);
    log(LogLevel.INFO, '✅ Telegram бот инициализирован');
  } catch (error) {
    log(LogLevel.ERROR, `Ошибка инициализации Telegram бота: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Регистрирует команды бота: /logs, /status, /help
 * @param getStatusText - функция, возвращающая текст для /status
 */
export function setupBotCommands(getStatusText: () => string): void {
  statusProvider = getStatusText;
  if (!bot) return;

  const isAllowed = (msg: TelegramBot.Message): boolean =>
    String(msg.chat?.id) === chatId;

  bot.onText(/\/logs(?:\s+(\d+))?/, (msg, match) => {
    if (!isAllowed(msg)) return;
    const limit = match?.[1] ? Math.min(100, parseInt(match[1], 10)) : 80;
    const text = getRecentLogs(limit);
    const toSend = text.length <= TELEGRAM_MSG_MAX ? text : text.slice(-TELEGRAM_MSG_MAX - 20).replace(/^[^\n]*\n?/, '… (обрезано)\n');
    bot?.sendMessage(msg.chat.id, toSend || 'Логов пока нет.', { disable_web_page_preview: true }).catch(() => {});
  });

  bot.onText(/\/status/, (msg) => {
    if (!isAllowed(msg)) return;
    const text = statusProvider?.() ?? 'Статус недоступен.';
    const toSend = text.length <= TELEGRAM_MSG_MAX ? text : text.slice(0, TELEGRAM_MSG_MAX) + '…';
    bot?.sendMessage(msg.chat.id, toSend, { disable_web_page_preview: true }).catch(() => {});
  });

  bot.onText(/\/help/, (msg) => {
    if (!isAllowed(msg)) return;
    const helpText =
      '📋 Команды бота:\n\n' +
      '/logs [N] — последние логи (по умолчанию 80 строк, N до 100)\n' +
      '/status — статус мониторинга и последняя проверка\n' +
      '/help — эта справка';
    bot?.sendMessage(msg.chat.id, helpText).catch(() => {});
  });
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
