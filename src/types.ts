/**
 * Уровни логирования
 */
export enum LogLevel {
  INFO = 'info',
  DEBUG = 'debug',
  ERROR = 'error'
}

/**
 * Конфигурация приложения
 */
export interface Config {
  telegramBotToken: string;
  telegramChatId: string;
  checkIntervalMinutes: number;
  logLevel: LogLevel;
}

/**
 * Состояние товара
 */
export interface ProductState {
  available: boolean;
  lastChecked: string;
  productName: string;
  lastError?: string;
}

/**
 * Результат проверки товара
 */
export interface CheckResult {
  url: string;
  available: boolean;
  productName: string;
  error?: string;
}

/**
 * Хранилище состояний всех товаров
 */
export interface StateStorage {
  [url: string]: ProductState;
}
