# Быстрый старт 🚀

## Локальное тестирование

### 1. Установка зависимостей

```bash
npm install
```

### 2. Создайте .env файл

```bash
cp .env.example .env
```

Отредактируйте `.env` и добавьте ваши данные:

```env
TELEGRAM_BOT_TOKEN=ваш_токен_бота
TELEGRAM_CHAT_ID=ваш_chat_id
CHECK_INTERVAL_MINUTES=5
LOG_LEVEL=info
```

### 3. Компиляция и запуск

```bash
npm run build
npm start
```

Или для разработки:

```bash
npm run dev
```

---

## Деплой на Ubuntu сервер

### Быстрый деплой

```bash
# 1. Скопируйте проект на сервер
scp -r check-stuff user@your-server-ip:~/

# 2. Подключитесь к серверу
ssh user@your-server-ip

# 3. Перейдите в директорию
cd check-stuff

# 4. Настройте .env
cp .env.example .env
nano .env  # Вставьте ваши токены

# 5. Запустите автоматический деплой
chmod +x deploy.sh
./deploy.sh
```

### Проверка работы

```bash
# Статус сервиса
sudo systemctl status amazon-monitor

# Логи в реальном времени
sudo journalctl -u amazon-monitor -f
```

---

## Как получить Telegram данные

### Bot Token:

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте: `/newbot`
3. Следуйте инструкциям
4. Получите токен

### Chat ID:

1. Напишите сообщение вашему боту
2. Откройте: `https://api.telegram.org/bot<ВАШ_ТОКЕН>/getUpdates`
3. Найдите `"chat":{"id":123456789}`

---

## Полезные команды на сервере

```bash
# Просмотр логов
sudo journalctl -u amazon-monitor -f

# Перезапуск
sudo systemctl restart amazon-monitor

# Остановка
sudo systemctl stop amazon-monitor

# Запуск
sudo systemctl start amazon-monitor

# Отключить автозапуск
sudo systemctl disable amazon-monitor
```

---

## Изменение списка товаров

Отредактируйте `src/config.ts`:

```typescript
export const PRODUCT_URLS = [
  'https://amzn.in/d/bHg6AfW',
  'https://amzn.in/d/3erpS1I',
  // Добавьте или удалите URL
];
```

После изменения на сервере:

```bash
npm run build
sudo systemctl restart amazon-monitor
```

---

## Проблемы?

Смотрите полную документацию в [README.md](README.md)
