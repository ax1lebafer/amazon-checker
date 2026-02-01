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
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 30000, // 30 секунд
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);

      // Извлекаем название товара
      let productName = $('#productTitle').text().trim();
      
      // Если не нашли по первому селектору, пробуем альтернативные
      if (!productName) {
        productName = $('h1.a-size-large').first().text().trim();
      }
      if (!productName) {
        productName = $('span#productTitle').text().trim();
      }
      if (!productName) {
        productName = 'Название товара не найдено';
      }

      // Очищаем название от лишних пробелов и переносов строк
      productName = productName.replace(/\s+/g, ' ').trim();

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

      // Проверяем наличие кнопки "Add to Cart"
      const hasAddToCartButton = 
        $('#add-to-cart-button').length > 0 ||
        $('input[name="submit.add-to-cart"]').length > 0 ||
        $('button[name="submit.add-to-cart"]').length > 0 ||
        $('#addToCart').length > 0;

      // Товар доступен, если НЕТ текста "Currently unavailable" И ЕСТЬ кнопка добавления в корзину
      const available = !isUnavailable && hasAddToCartButton;

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
 * Проверяет несколько товаров параллельно
 * @param urls - массив URL товаров
 * @returns массив результатов проверки
 */
export async function checkMultipleProducts(urls: string[]): Promise<CheckResult[]> {
  log(LogLevel.INFO, `Начало проверки ${urls.length} товаров...`);
  
  const results = await Promise.all(
    urls.map(url => checkProductAvailability(url))
  );

  const available = results.filter(r => r.available).length;
  log(LogLevel.INFO, `Проверка завершена: ${available} из ${urls.length} товаров в наличии`);

  return results;
}
