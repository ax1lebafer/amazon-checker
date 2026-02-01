#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки Telegram уведомлений
 * Использование: node test-notifications.js
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TOKEN || !CHAT_ID) {
  console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не установлены в .env');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: false });

async function testNotifications() {
  console.log('🧪 Начало тестирования уведомлений...\n');

  try {
    // Тест 1: Стартовое сообщение
    console.log('1️⃣  Отправка тестового стартового сообщения...');
    await bot.sendMessage(CHAT_ID, '✅ Скрипт мониторинга Amazon.in запущен и работает!');
    console.log('✅ Стартовое сообщение отправлено!\n');
    await sleep(2000);

    // Тест 2: Уведомление о появлении товара
    console.log('2️⃣  Отправка уведомления о появлении товара...');
    const testProductName = 'Rs.1000 Sony PlayStation Store Gift Card (Email Delivery in 1 hour- Digital Voucher Code)';
    const testUrl = 'https://amzn.in/d/bHg6AfW';
    const message = `🟢 *${escapeMarkdown(testProductName)}* \\- появился в наличии\\!\n\n[Открыть товар на Amazon](${escapeMarkdown(testUrl)})`;
    
    await bot.sendMessage(CHAT_ID, message, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: false,
    });
    console.log('✅ Уведомление о товаре отправлено!\n');
    await sleep(2000);

    // Тест 3: Уведомление об ошибке
    console.log('3️⃣  Отправка уведомления об ошибке...');
    const errorMessage = 
      '❌ Проблема с проверкой товара:\n\n' +
      'Товар: ' + testProductName + '\n' +
      'URL: https://amzn.in/d/bHg6AfW...\n' +
      'Ошибка: Amazon блокирует запросы (503)\n\n' +
      'Проверьте доступность Amazon.in и наличие блокировок/капчи.';
    
    await bot.sendMessage(CHAT_ID, errorMessage);
    console.log('✅ Уведомление об ошибке отправлено!\n');
    await sleep(2000);

    // Тест 4: Простое текстовое сообщение
    console.log('4️⃣  Отправка простого текстового сообщения...');
    await bot.sendMessage(CHAT_ID, '🎉 Все тесты пройдены успешно! Уведомления работают корректно.');
    console.log('✅ Тестовое сообщение отправлено!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📱 Проверьте Telegram - должно прийти 4 сообщения:');
    console.log('   1. Стартовое сообщение');
    console.log('   2. Уведомление о появлении товара (с кнопкой)');
    console.log('   3. Уведомление об ошибке');
    console.log('   4. Сообщение об успешных тестах\n');

  } catch (error) {
    console.error('\n❌ Ошибка при отправке уведомлений:', error.message);
    console.error('\nВозможные причины:');
    console.error('  - Неправильный TELEGRAM_BOT_TOKEN');
    console.error('  - Неправильный TELEGRAM_CHAT_ID');
    console.error('  - Нет интернет-соединения');
    console.error('  - Бот заблокирован в Telegram\n');
    process.exit(1);
  }
}

function escapeMarkdown(text) {
  const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  let escaped = text;
  for (const char of specialChars) {
    escaped = escaped.split(char).join('\\' + char);
  }
  return escaped;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Запуск тестов
testNotifications()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Критическая ошибка:', err);
    process.exit(1);
  });
