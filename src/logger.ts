import { LogLevel } from './types';

let currentLogLevel: LogLevel = LogLevel.INFO;

const LOG_BUFFER_MAX = 150;
const logBuffer: string[] = [];

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
 * Возвращает последние записи лога (для команды /logs в боте)
 */
export function getRecentLogs(limit: number = 80): string {
  const lines = logBuffer.slice(-limit);
  const text = lines.join('\n');
  const maxLen = 4000;
  if (text.length <= maxLen) return text;
  return '...\n' + text.slice(-maxLen);
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
    const line = `${prefix} ${message}`;
    console.log(line);
    logBuffer.push(line);
    if (logBuffer.length > LOG_BUFFER_MAX) logBuffer.shift();
  }
}
