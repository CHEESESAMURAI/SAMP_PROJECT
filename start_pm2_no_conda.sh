#!/bin/bash

# Скрипт запуска Wild Analytics Dashboard через PM2 (без conda)
# IP: 93.127.214.183

echo "🚀 Запуск Wild Analytics Dashboard через PM2 (без conda)..."

# Проверяем, что PM2 установлен
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 не установлен. Устанавливаем..."
    npm install -g pm2
fi

# Проверяем, что Python установлен
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 не установлен. Устанавливаем..."
    apt update
    apt install -y python3 python3-pip python3-venv
fi

# Останавливаем существующие процессы
echo "🛑 Остановка существующих процессов..."
pm2 stop wild-frontend wild-backend 2>/dev/null || true
pm2 delete wild-frontend wild-backend 2>/dev/null || true

# Проверяем зависимости
echo "📦 Проверка зависимостей..."

# Python зависимости
if [ ! -f "web-dashboard/backend/requirements.txt" ]; then
    echo "❌ requirements.txt не найден"
    exit 1
fi

# Node.js зависимости
if [ ! -f "wild-analytics-web/package.json" ]; then
    echo "❌ package.json не найден"
    exit 1
fi

# Устанавливаем Python зависимости (системный Python)
echo "🐍 Установка Python зависимостей..."
pip3 install -r requirements.txt

# Устанавливаем Node.js зависимости
echo "📦 Установка Node.js зависимостей..."
cd wild-analytics-web
npm install
cd ..

# Собираем frontend
echo "🏗️ Сборка frontend..."
cd wild-analytics-web
npm run build
cd ..

# Запускаем backend через PM2 (системный Python)
echo "🔧 Запуск backend сервера..."
pm2 start "python3 main.py" \
    --name wild-backend \
    --cwd /root/WILD_BOT_9/web-dashboard/backend

# Запускаем frontend через PM2
echo "🌐 Запуск frontend сервера..."
pm2 start serve \
    --name wild-frontend \
    -- -s build -l 3000 \
    --cwd /root/WILD_BOT_9/wild-analytics-web

# Сохраняем конфигурацию PM2
echo "💾 Сохранение конфигурации PM2..."
pm2 save

# Показываем статус
echo "📊 Статус процессов:"
pm2 status

echo ""
echo "✅ Wild Analytics Dashboard запущен через PM2!"
echo "🌐 Frontend: http://93.127.214.183:3000"
echo "🔧 Backend: http://93.127.214.183:8000"
echo "📋 API Docs: http://93.127.214.183:8000/docs"
echo ""
echo "🔧 Управление:"
echo "  pm2 status          - Статус процессов"
echo "  pm2 logs            - Просмотр логов"
echo "  pm2 restart all     - Перезапуск всех процессов"
echo "  pm2 stop all        - Остановка всех процессов"
echo "  ./stop_pm2.sh       - Остановка проекта"





