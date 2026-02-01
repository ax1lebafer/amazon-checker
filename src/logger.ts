import { LogLevel } from './types';

let currentLogLevel: LogLevel = LogLevel.INFO;

/**
 * Устанавливает уровень логирования
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Форматирует дату и время для логов
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString();
}

/**
 * Логирует сообщение
 */
export function log(level: LogLevel, message: string): void {
  const levels = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.ERROR]: 2,
  };

  if (levels[level] >= levels[currentLogLevel]) {
    const prefix = `[${getTimestamp()}] [${level.toUpperCase()}]`;
    console.log(`${prefix} ${message}`);
  }
}
