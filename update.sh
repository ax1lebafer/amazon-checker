#!/bin/bash

# Скрипт для ручного обновления на сервере
# Использование: ./update.sh

set -e

echo "🔄 Начало обновления Amazon Monitor..."

# Переходим в директорию проекта
cd ~/amazon-checker || cd ~/check-stuff || {
    echo "❌ Директория проекта не найдена!"
    exit 1
}

echo "📦 Получение последних изменений из Git..."
git pull origin main

echo "📥 Установка/обновление зависимостей..."
npm install --production

echo "🔨 Компиляция TypeScript..."
npm run build

echo "🔄 Перезапуск сервиса..."
sudo systemctl restart amazon-monitor

echo "✅ Проверка статуса сервиса..."
sudo systemctl status amazon-monitor --no-pager

echo ""
echo "🎉 Обновление завершено успешно!"
echo ""
echo "Полезные команды:"
echo "  Логи в реальном времени: sudo journalctl -u amazon-monitor -f"
echo "  Статус сервиса:          sudo systemctl status amazon-monitor"
