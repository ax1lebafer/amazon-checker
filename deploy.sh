#!/bin/bash

# Скрипт для деплоя на Ubuntu сервер
# Использование: ./deploy.sh

set -e

echo "🚀 Начало деплоя Amazon Monitor на сервер..."

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка наличия Node.js
echo -e "${YELLOW}Проверка Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js не найден!${NC}"
    echo "Установка Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo -e "${GREEN}Node.js установлен${NC}"
else
    echo -e "${GREEN}Node.js уже установлен: $(node --version)${NC}"
fi

# Проверка наличия npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm не найден!${NC}"
    exit 1
else
    echo -e "${GREEN}npm версия: $(npm --version)${NC}"
fi

# Установка зависимостей
echo -e "${YELLOW}Установка зависимостей...${NC}"
npm install

# Компиляция TypeScript
echo -e "${YELLOW}Компиляция TypeScript...${NC}"
npm run build

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo -e "${RED}.env файл не найден!${NC}"
    echo -e "${YELLOW}Создаём .env из .env.example...${NC}"
    cp .env.example .env
    echo -e "${RED}ВАЖНО: Отредактируйте .env файл и добавьте ваши токены!${NC}"
    echo "nano .env"
    exit 1
fi

# Получаем текущую директорию и пользователя
CURRENT_DIR=$(pwd)
CURRENT_USER=$(whoami)
NODE_PATH=$(which node)

echo -e "${YELLOW}Настройка systemd сервиса...${NC}"

# Создаём временный файл сервиса с правильными путями
cat > /tmp/amazon-monitor.service <<EOF
[Unit]
Description=Amazon.in Product Availability Monitor
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CURRENT_DIR
ExecStart=$NODE_PATH $CURRENT_DIR/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=amazon-monitor

[Install]
WantedBy=multi-user.target
EOF

# Копируем файл сервиса
echo -e "${YELLOW}Копирование файла сервиса...${NC}"
sudo cp /tmp/amazon-monitor.service /etc/systemd/system/amazon-monitor.service

# Перезагружаем systemd
echo -e "${YELLOW}Перезагрузка systemd...${NC}"
sudo systemctl daemon-reload

# Включаем автозапуск
echo -e "${YELLOW}Включение автозапуска...${NC}"
sudo systemctl enable amazon-monitor

# Запускаем сервис
echo -e "${YELLOW}Запуск сервиса...${NC}"
sudo systemctl start amazon-monitor

# Проверяем статус
sleep 2
echo -e "${YELLOW}Проверка статуса...${NC}"
sudo systemctl status amazon-monitor --no-pager

echo ""
echo -e "${GREEN}✅ Деплой завершён!${NC}"
echo ""
echo "Полезные команды:"
echo "  Просмотр логов:       sudo journalctl -u amazon-monitor -f"
echo "  Остановка:            sudo systemctl stop amazon-monitor"
echo "  Запуск:               sudo systemctl start amazon-monitor"
echo "  Перезапуск:           sudo systemctl restart amazon-monitor"
echo "  Отключить автозапуск: sudo systemctl disable amazon-monitor"
echo "  Статус:               sudo systemctl status amazon-monitor"
