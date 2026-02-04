import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { CheckResult, LogLevel } from './types';
import { log } from './logger';

/**
 * Список User-Agent для ротации (избежание блокировок)
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

/**
 * Получает случайный User-Agent
 */
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Проверяет наличие товара на Amazon.in
 * @param url - URL товара
 * @param retries - количество попыток при ошибке
 * @returns результат проверки
 */
export async function checkProductAvailability(
  url: string,
  retries: number = 3
): Promise<CheckResult> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      log(LogLevel.DEBUG, `Проверка товара (попытка ${attempt}/${retries}): ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Referer': 'https://www.amazon.in/',
          'Cache-Control': 'max-age=0',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
        },
        timeout: 30000, // 30 секунд
        maxRedirects: 5,
      });

      // Логируем финальный URL после редиректов
      const finalUrl = response.request?.res?.responseUrl || url;
      if (finalUrl !== url) {
        log(LogLevel.DEBUG, `Редирект: ${url} -> ${finalUrl}`);
      }

      const $ = cheerio.load(response.data);

      // Извлекаем название товара - пробуем различные селекторы
      let productName = $('#productTitle').text().trim();
      
      if (!productName) {
        productName = $('h1#title').text().trim();
      }
      if (!productName) {
        productName = $('h1.a-size-large').first().text().trim();
      }
      if (!productName) {
        productName = $('span#productTitle').text().trim();
      }
      if (!productName) {
        productName = $('h1 span').first().text().trim();
      }
      if (!productName) {
        productName = $('.product-title').text().trim();
      }
      
      // Очищаем название от лишних пробелов и переносов строк
      productName = productName.replace(/\s+/g, ' ').trim();
      
      if (!productName) {
        // Пробуем найти хотя бы какой-то заголовок на странице
        const anyHeading = $('h1').first().text().trim().replace(/\s+/g, ' ');
        if (anyHeading) {
          productName = anyHeading;
          log(LogLevel.DEBUG, `Найден альтернативный заголовок: ${productName}`);
        } else {
          log(LogLevel.DEBUG, `⚠️ Не удалось найти название товара для ${url}`);
          log(LogLevel.DEBUG, `Доступные h1: ${$('h1').length}, title: ${$('title').text().substring(0, 100)}`);
          productName = 'Название товара не найдено';
        }
      }

      // Проверяем наличие текста "Currently unavailable"
      const bodyText = $('body').text();
      const isUnavailable = bodyText.includes('Currently unavailable');

      // Проверяем наличие капчи
      const hasCaptcha = bodyText.includes('Enter the characters you see below') || 
                         bodyText.includes('Type the characters you see in this image') ||
                         $('form[action*="captcha"]').length > 0;
      
      if (hasCaptcha) {
        log(LogLevel.ERROR, '⚠️ Обнаружена CAPTCHA на странице!');
        throw new Error('Amazon показывает CAPTCHA - требуется человеческая проверка');
      }

      // Проверяем наличие кнопки "Add to Cart" (разные варианты)
      const addToCartSelectors = [
        '#add-to-cart-button',
        'input[name="submit.add-to-cart"]',
        'button[name="submit.add-to-cart"]',
        '#addToCart',
        'input#add-to-cart-button',
        '.a-button-input[name="submit.add-to-cart"]',
        '#buy-now-button',
        'input[name="submit.buy-now"]',
        '[data-action="a-popover"]', // для некоторых gift cards
      ];
      
      let hasAddToCartButton = false;
      let foundSelector = '';
      for (const selector of addToCartSelectors) {
        if ($(selector).length > 0) {
          hasAddToCartButton = true;
          foundSelector = selector;
          break;
        }
      }

      // Дополнительные проверки доступности
      const hasInStock = bodyText.includes('In stock') || bodyText.includes('In Stock');
      const hasAvailability = $('.a-size-medium.a-color-success').length > 0;
      
      // НОВАЯ ЛОГИКА: Если есть кнопка "Add to Cart" И текст "In Stock", то ИГНОРИРУЕМ "Currently unavailable"
      // (Amazon показывает противоречивую информацию для ботов)
      const available = (hasAddToCartButton && hasInStock) || (!isUnavailable && (hasAddToCartButton || hasInStock || hasAvailability));

      // Детальное логирование для отладки
      if (foundSelector) {
        log(LogLevel.DEBUG, `  └─ Unavailable: ${isUnavailable}, Кнопка найдена: ${foundSelector}, InStock: ${hasInStock}, Итог: ${available ? '✅ В НАЛИЧИИ' : '❌ НЕТ'}`);
      } else {
        log(LogLevel.DEBUG, `  └─ Unavailable: ${isUnavailable}, Кнопка: нет, InStock: ${hasInStock}, Availability элемент: ${hasAvailability}, Итог: ${available ? '✅ В НАЛИЧИИ' : '❌ НЕТ'}`);
      }

      log(LogLevel.INFO, `Товар "${productName}": ${available ? '✅ В наличии' : '❌ Нет в наличии'}`);

      return {
        url,
        available,
        productName,
      };
    } catch (error) {
      lastError = error as Error;
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        log(LogLevel.ERROR, `Ошибка при запросе к ${url} (попытка ${attempt}/${retries}): ${axiosError.message}`);
        
        // Определяем тип ошибки для более детального логирования
        if (status === 503) {
          log(LogLevel.DEBUG, '⚠️ 503 Service Unavailable - Amazon может блокировать запросы');
          lastError = new Error('Amazon блокирует запросы (503)');
        } else if (status === 403) {
          log(LogLevel.DEBUG, '⚠️ 403 Forbidden - Доступ запрещен, возможна блокировка');
          lastError = new Error('Доступ запрещен (403) - возможна блокировка');
        } else if (status === 404) {
          log(LogLevel.DEBUG, '⚠️ 404 Not Found - Товар не найден или URL изменился');
          lastError = new Error('Товар не найден (404)');
        } else if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
          log(LogLevel.DEBUG, '⚠️ Таймаут - Amazon не отвечает');
          lastError = new Error('Таймаут соединения');
        }
      } else {
        log(LogLevel.ERROR, `Неизвестная ошибка при проверке ${url}: ${(error as Error).message}`);
      }

      // Ждём перед следующей попыткой (экспоненциальная задержка)
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // макс 10 сек
        log(LogLevel.DEBUG, `Ожидание ${delay}мс перед следующей попыткой...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Если все попытки не удались
  return {
    url,
    available: false,
    productName: 'Ошибка при проверке',
    error: lastError?.message || 'Неизвестная ошибка',
  };
}

/**
 * Проверяет несколько товаров последовательно с задержками
 * @param urls - массив URL товаров
 * @returns массив результатов проверки
 */
export async function checkMultipleProducts(urls: string[]): Promise<CheckResult[]> {
  log(LogLevel.INFO, `Начало проверки ${urls.length} товаров...`);
  
  const results: CheckResult[] = [];
  
  for (let i = 0; i < urls.length; i++) {
    const result = await checkProductAvailability(urls[i]);
    results.push(result);
    
    // Добавляем задержку между запросами (кроме последнего)
    if (i < urls.length - 1) {
      const delay = 2000 + Math.random() * 2000; // 2-4 секунды
      log(LogLevel.DEBUG, `Ожидание ${Math.round(delay)}мс перед следующим товаром...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  const available = results.filter(r => r.available).length;
  log(LogLevel.INFO, `Проверка завершена: ${available} из ${urls.length} товаров в наличии`);

  return results;
}
