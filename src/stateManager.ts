import * as fs from 'fs';
import * as path from 'path';
import { StateStorage, ProductState, LogLevel } from './types';
import { log } from './logger';

const STATE_FILE = path.join(process.cwd(), 'state.json');

/**
 * Загружает состояния товаров из файла
 */
export function loadState(): StateStorage {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      const state = JSON.parse(data);
      log(LogLevel.INFO, `Загружено состояние для ${Object.keys(state).length} товаров`);
      return state;
    }
  } catch (error) {
    log(LogLevel.ERROR, `Ошибка загрузки состояния: ${(error as Error).message}`);
  }

  log(LogLevel.INFO, 'Создано новое пустое состояние');
  return {};
}

/**
 * Сохраняет состояния товаров в файл
 */
export function saveState(state: StateStorage): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    log(LogLevel.DEBUG, 'Состояние сохранено в файл');
  } catch (error) {
    log(LogLevel.ERROR, `Ошибка сохранения состояния: ${(error as Error).message}`);
  }
}

/**
 * Обновляет состояние товара
 */
export function updateProductState(
  state: StateStorage,
  url: string,
  available: boolean,
  productName: string,
  error?: string
): ProductState {
  const productState: ProductState = {
    available,
    lastChecked: new Date().toISOString(),
    productName,
  };

  if (error) {
    productState.lastError = error;
  }

  state[url] = productState;
  return productState;
}

/**
 * Проверяет, изменилось ли состояние товара с последней проверки
 */
export function hasStateChanged(
  state: StateStorage,
  url: string,
  newAvailable: boolean
): boolean {
  const oldState = state[url];
  
  // Если товара не было в состоянии, считаем что это первая проверка
  if (!oldState) {
    return false;
  }

  // Нас интересует только переход из unavailable -> available
  return !oldState.available && newAvailable;
}
