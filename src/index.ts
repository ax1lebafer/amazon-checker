import { loadConfig, PRODUCT_URLS } from './config';
import { log, setLogLevel } from './logger';
import { initTelegramBot, setupBotCommands, sendAvailabilityNotification, sendTestNotification, sendErrorNotification } from './telegramNotifier';
import { checkMultipleProducts } from './amazonChecker';
import { loadState, saveState, updateProductState, hasStateChanged } from './stateManager';
import { StateStorage, LogLevel } from './types';
import { trackError, resetErrors } from './errorTracker';

let isRunning = true;
let state: StateStorage = {};
let lastCheckTime: Date | null = null;
let lastCheckError: string | null = null;

/**
 * Основная функция проверки товаров
 */
async function checkProducts(): Promise<void> {
  lastCheckError = null;
  try {
    log(LogLevel.INFO, '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log(LogLevel.INFO, 'Начало цикла проверки товаров');

    // Проверяем все товары
    const results = await checkMultipleProducts(PRODUCT_URLS);

    // Обрабатываем результаты
    for (const result of results) {
      const { url, available, productName, error } = result;

      // Если есть ошибка, отслеживаем её
      if (error) {
        const shouldNotify = trackError(url, error);
        if (shouldNotify) {
          const shortUrl = url.length > 50 ? url.substring(0, 50) + '...' : url;
          await sendErrorNotification(
            `❌ Проблема с проверкой товара:\n\n` +
            `Товар: ${productName}\n` +
            `URL: ${shortUrl}\n` +
            `Ошибка: ${error}\n\n` +
            `Проверьте доступность Amazon.in и наличие блокировок/капчи.`
          );
        }
      } else {
        // Успешная проверка - сбрасываем счетчик ошибок
        resetErrors(url);
      }

      // Проверяем, изменилось ли состояние
      const stateChanged = hasStateChanged(state, url, available);

      // Обновляем состояние
      updateProductState(state, url, available, productName, error);

      // Если товар появился в наличии, отправляем уведомление
      if (stateChanged) {
        log(LogLevel.INFO, `🎉 ТОВАР ПОЯВИЛСЯ В НАЛИЧИИ: ${productName}`);
        await sendAvailabilityNotification(productName, url);
      }
    }

    // Сохраняем состояние
    saveState(state);
    lastCheckTime = new Date();

    log(LogLevel.INFO, 'Цикл проверки завершён');
  } catch (error) {
    lastCheckError = (error as Error).message;
    log(LogLevel.ERROR, `Ошибка в цикле проверки: ${(error as Error).message}`);
  }
}

/**
 * Основной цикл работы приложения
 */
async function main(): Promise<void> {
  try {
    log(LogLevel.INFO, '🚀 Запуск скрипта мониторинга Amazon.in');

    // Загружаем конфигурацию
    const config = loadConfig();
    setLogLevel(config.logLevel);

    log(LogLevel.INFO, `Интервал проверки: ${config.checkIntervalMinutes} минут`);
    log(LogLevel.INFO, `Количество товаров для мониторинга: ${PRODUCT_URLS.length}`);

    // Инициализируем Telegram бота
    initTelegramBot(config.telegramBotToken, config.telegramChatId);

    // Отправляем тестовое уведомление
    const testSent = await sendTestNotification();
    if (!testSent) {
      log(LogLevel.ERROR, 'Не удалось отправить тестовое уведомление. Проверьте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID');
      process.exit(1);
    }

    // Регистрируем команды бота: /logs, /status, /help
    setupBotCommands(() => {
      const lines: string[] = [
        '📊 Статус мониторинга Amazon.in',
        '',
        lastCheckTime
          ? `Последняя проверка: ${lastCheckTime.toLocaleString('ru-RU')}`
          : 'Проверка ещё не выполнялась.',
        lastCheckError ? `Ошибка: ${lastCheckError}` : '',
        '',
        'Товары:',
      ];
      for (const [url, s] of Object.entries(state)) {
        const asin = url.replace(/.*\/dp\/([A-Z0-9]+).*/, '$1') || url.slice(0, 20);
        lines.push(`  ${s.available ? '🟢' : '🔴'} ${asin} — ${s.productName || '—'}`);
      }
      return lines.filter(Boolean).join('\n');
    });

    // Загружаем состояние
    state = loadState();

    // Первая проверка сразу при запуске
    await checkProducts();

    // Запускаем периодическую проверку
    const intervalMs = config.checkIntervalMinutes * 60 * 1000;
    log(LogLevel.INFO, `Следующая проверка через ${config.checkIntervalMinutes} минут`);

    const interval = setInterval(async () => {
      if (isRunning) {
        await checkProducts();
        log(LogLevel.INFO, `Следующая проверка через ${config.checkIntervalMinutes} минут`);
      }
    }, intervalMs);

    // Обработка сигналов для graceful shutdown
    process.on('SIGINT', () => handleShutdown(interval));
    process.on('SIGTERM', () => handleShutdown(interval));

    log(LogLevel.INFO, '✅ Скрипт запущен и работает');
    log(LogLevel.INFO, 'Для остановки нажмите Ctrl+C');

  } catch (error) {
    log(LogLevel.ERROR, `Критическая ошибка: ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * Обработка остановки приложения
 */
function handleShutdown(interval: NodeJS.Timeout): void {
  if (!isRunning) {
    return;
  }

  log(LogLevel.INFO, '');
  log(LogLevel.INFO, '🛑 Получен сигнал остановки');
  isRunning = false;

  // Очищаем интервал
  clearInterval(interval);

  // Сохраняем состояние перед выходом
  saveState(state);

  log(LogLevel.INFO, '✅ Скрипт остановлен');
  process.exit(0);
}

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
  log(LogLevel.ERROR, `Необработанный отказ промиса: ${reason}`);
});

process.on('uncaughtException', (error) => {
  log(LogLevel.ERROR, `Необработанное исключение: ${error.message}`);
  saveState(state);
  process.exit(1);
});

// Запускаем приложение
main();
