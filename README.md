# Amazon.in Availability Monitor

Скрипт для автоматического мониторинга наличия товаров на Amazon.in с уведомлениями в Telegram.

## Возможности

- Проверка наличия товаров каждые 5 минут
- Отправка уведомлений в Telegram только при появлении товара в наличии
- Отслеживание состояния товаров между запусками
- Автоматический перезапуск при сбоях
- Подробное логирование

## Установка

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка конфигурации

Скопируйте `.env.example` в `.env` и заполните необходимые данные:

```bash
cp .env.example .env
```

Отредактируйте `.env`:
- `TELEGRAM_BOT_TOKEN` - токен вашего Telegram бота
- `TELEGRAM_CHAT_ID` - ID вашего Telegram чата

### 3. Компиляция

```bash
npm run build
```

### 4. Запуск

```bash
npm start
```

## Разработка

Для запуска в режиме разработки:

```bash
npm run dev
```

## Получение Telegram Bot Token и Chat ID

### Шаг 1: Создание Telegram бота

1. Откройте Telegram и найдите бота [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot`
3. Введите имя для вашего бота (например: "Amazon Monitor")
4. Введите username для бота (должен заканчиваться на "bot", например: "my_amazon_monitor_bot")
5. BotFather отправит вам токен в формате: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`
6. Скопируйте этот токен - это ваш `TELEGRAM_BOT_TOKEN`

### Шаг 2: Получение Chat ID

1. Напишите любое сообщение вашему новому боту в Telegram
2. Откройте в браузере: `https://api.telegram.org/bot<ВАШ_ТОКЕН>/getUpdates`
   - Замените `<ВАШ_ТОКЕН>` на токен из предыдущего шага
3. В ответе найдите `"chat":{"id":123456789}`
4. Число `123456789` - это ваш `TELEGRAM_CHAT_ID`

## Деплой на сервер Ubuntu

### Вариант 1: Автоматический деплой (рекомендуется)

1. **Подключитесь к серверу по SSH:**

```bash
ssh your_user@your_server_ip
```

2. **Скопируйте проект на сервер:**

Вы можете использовать `scp` с вашей локальной машины:

```bash
scp -r check-stuff your_user@your_server_ip:~/
```

Или клонировать из Git репозитория (если вы загрузили код на GitHub):

```bash
git clone https://github.com/your-username/check-stuff.git
cd check-stuff
```

3. **Настройте .env файл:**

```bash
cd check-stuff
cp .env.example .env
nano .env
```

Вставьте ваши данные:
```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
CHECK_INTERVAL_MINUTES=5
LOG_LEVEL=info
```

Сохраните файл (Ctrl+X, затем Y, затем Enter)

4. **Запустите скрипт деплоя:**

```bash
chmod +x deploy.sh
./deploy.sh
```

Скрипт автоматически:
- Установит Node.js (если не установлен)
- Установит зависимости
- Скомпилирует TypeScript
- Настроит и запустит systemd сервис

✅ **Готово!** Скрипт работает в фоне и автоматически запустится при перезагрузке сервера.

### Вариант 2: Ручной деплой

1. **Подключитесь к серверу:**

```bash
ssh your_user@your_server_ip
```

2. **Установите Node.js (если не установлен):**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Проверьте установку:
```bash
node --version
npm --version
```

3. **Скопируйте проект на сервер** (см. вариант 1, шаг 2)

4. **Установите зависимости:**

```bash
cd check-stuff
npm install
```

5. **Настройте .env файл** (см. вариант 1, шаг 3)

6. **Скомпилируйте TypeScript:**

```bash
npm run build
```

7. **Настройте systemd сервис:**

Отредактируйте файл `amazon-monitor.service`:

```bash
nano amazon-monitor.service
```

Замените:
- `YOUR_USERNAME` на ваше имя пользователя
- `/path/to/check-stuff` на полный путь к проекту (например: `/home/username/check-stuff`)
- `/usr/bin/node` на путь к node (узнайте командой `which node`)

Скопируйте файл сервиса:

```bash
sudo cp amazon-monitor.service /etc/systemd/system/
```

8. **Запустите сервис:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable amazon-monitor
sudo systemctl start amazon-monitor
```

9. **Проверьте статус:**

```bash
sudo systemctl status amazon-monitor
```

## Управление сервисом

После деплоя вы можете управлять скриптом следующими командами:

### Просмотр логов в реальном времени:
```bash
sudo journalctl -u amazon-monitor -f
```

### Просмотр последних 100 строк логов:
```bash
sudo journalctl -u amazon-monitor -n 100
```

### Остановка сервиса:
```bash
sudo systemctl stop amazon-monitor
```

### Запуск сервиса:
```bash
sudo systemctl start amazon-monitor
```

### Перезапуск сервиса:
```bash
sudo systemctl restart amazon-monitor
```

### Проверка статуса:
```bash
sudo systemctl status amazon-monitor
```

### Отключение автозапуска:
```bash
sudo systemctl disable amazon-monitor
```

### Включение автозапуска:
```bash
sudo systemctl enable amazon-monitor
```

## Обновление кода на сервере

Если вы внесли изменения в код и хотите обновить его на сервере:

```bash
# Подключитесь к серверу
ssh your_user@your_server_ip

# Перейдите в директорию проекта
cd check-stuff

# Загрузите изменения (если используете Git)
git pull

# Или скопируйте файлы заново с вашей локальной машины:
# (выполните на локальной машине)
# scp -r src/* your_user@your_server_ip:~/check-stuff/src/

# Установите новые зависимости (если изменился package.json)
npm install

# Скомпилируйте код
npm run build

# Перезапустите сервис
sudo systemctl restart amazon-monitor

# Проверьте логи
sudo journalctl -u amazon-monitor -f
```

## Редактирование списка товаров

Чтобы изменить список отслеживаемых товаров:

1. Откройте файл `src/config.ts`
2. Измените массив `PRODUCT_URLS`
3. Сохраните файл
4. Выполните обновление на сервере (см. раздел выше)

## Решение проблем

### Сервис не запускается

Проверьте логи:
```bash
sudo journalctl -u amazon-monitor -n 50
```

Типичные проблемы:
- Неправильный `TELEGRAM_BOT_TOKEN` или `TELEGRAM_CHAT_ID` в `.env`
- Отсутствует файл `.env`
- Неправильные права на файлы
- Node.js не установлен

### Уведомления не приходят

1. Проверьте, что бот запущен: `sudo systemctl status amazon-monitor`
2. Проверьте логи: `sudo journalctl -u amazon-monitor -f`
3. Убедитесь, что вы написали боту первое сообщение
4. Проверьте правильность `TELEGRAM_CHAT_ID`

### Amazon блокирует запросы

Если в логах видите ошибки 503 или 403:
- Amazon может блокировать частые запросы с одного IP
- Попробуйте увеличить `CHECK_INTERVAL_MINUTES` до 10-15 минут
- Рассмотрите использование прокси-сервера

## Структура проекта

```
check-stuff/
├── src/
│   ├── index.ts              # Основной файл приложения
│   ├── amazonChecker.ts      # Модуль проверки Amazon
│   ├── telegramNotifier.ts   # Модуль уведомлений Telegram
│   ├── stateManager.ts       # Управление состояниями товаров
│   ├── config.ts             # Конфигурация и список товаров
│   ├── logger.ts             # Логирование
│   └── types.ts              # TypeScript типы
├── dist/                     # Скомпилированные JS файлы
├── .env                      # Конфигурация (не коммитится)
├── .env.example              # Пример конфигурации
├── state.json                # Текущее состояние товаров
├── package.json              # Зависимости проекта
├── tsconfig.json             # Конфигурация TypeScript
├── amazon-monitor.service    # Systemd unit файл
├── deploy.sh                 # Скрипт автоматического деплоя
└── README.md                 # Эта инструкция
```

## Лицензия

MIT
