import { LogLevel } from './types';
import { log } from './logger';

/**
 * Отслеживание ошибок для умных уведомлений
 */
interface ErrorRecord {
  count: number;
  lastError: string;
  lastNotified?: string;
}

const errorTracking: Map<string, ErrorRecord> = new Map();
const ERROR_THRESHOLD = 3; // Отправлять уведомление после 3 ошибок подряд
const NOTIFICATION_COOLDOWN = 60 * 60 * 1000; // Не чаще 1 раза в час для одной и той же ошибки

/**
 * Регистрирует ошибку и определяет, нужно ли отправлять уведомление
 */
export function trackError(url: string, error: string): boolean {
  const key = `${url}:${error}`;
  const record = errorTracking.get(key) || { count: 0, lastError: error };
  
  record.count++;
  record.lastError = error;
  errorTracking.set(key, record);

  // Проверяем, нужно ли отправлять уведомление
  const shouldNotify = 
    record.count >= ERROR_THRESHOLD &&
    (!record.lastNotified || 
     Date.now() - new Date(record.lastNotified).getTime() > NOTIFICATION_COOLDOWN);

  if (shouldNotify) {
    record.lastNotified = new Date().toISOString();
    errorTracking.set(key, record);
    log(LogLevel.INFO, `Отправка уведомления об ошибке (${record.count} раз): ${error}`);
  }

  return shouldNotify;
}

/**
 * Сбрасывает счетчик ошибок для URL (вызывается при успешной проверке)
 */
export function resetErrors(url: string): void {
  // Удаляем все ошибки для данного URL
  for (const key of errorTracking.keys()) {
    if (key.startsWith(url)) {
      errorTracking.delete(key);
    }
  }
}

/**
 * Получает статистику по ошибкам
 */
export function getErrorStats(): string {
  const stats: string[] = [];
  
  for (const [key, record] of errorTracking.entries()) {
    if (record.count >= ERROR_THRESHOLD) {
      const [url, ...errorParts] = key.split(':');
      const error = errorParts.join(':');
      stats.push(`${url.substring(0, 50)}... - ${error} (${record.count} раз)`);
    }
  }

  return stats.length > 0 
    ? `Активные ошибки:\n${stats.join('\n')}` 
    : 'Активных ошибок нет';
}
