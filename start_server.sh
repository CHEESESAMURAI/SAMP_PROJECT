#!/bin/bash

# Скрипт запуска Wild Analytics Dashboard на VPS
# IP: 93.127.214.183

echo "🚀 Запуск Wild Analytics Dashboard..."

# Проверяем, что conda установлена
if ! command -v conda &> /dev/null; then
    echo "❌ Conda не установлена. Установите Anaconda или Miniconda"
    exit 1
fi

# Активируем conda среду wildbot
echo "🔧 Активация conda среды wildbot..."
source ~/miniconda3/etc/profile.d/conda.sh
conda activate wildbot

# Переходим в директорию backend
cd web-dashboard/backend

# Проверяем, что порт 8000 свободен
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ Порт 8000 занят. Останавливаем существующий процесс..."
    pkill -f "python main.py"
    sleep 2
fi

# Запускаем backend сервер
echo "🔧 Запуск backend сервера на порту 8000..."
python main.py &

# Ждем запуска backend
sleep 5

# Переходим в директорию frontend
cd ../../wild-analytics-web

# Устанавливаем зависимости если нужно
if [ ! -d "node_modules" ]; then
    echo "📦 Установка npm зависимостей..."
    npm install
fi

# Запускаем frontend сервер
echo "🔧 Запуск frontend сервера на порту 3000..."
npm start &

echo "✅ Серверы запущены!"
echo "🌐 Frontend: http://93.127.214.183:3000"
echo "🔧 Backend: http://93.127.214.183:8000"
echo ""
echo "Для остановки серверов используйте: ./stop_server.sh"
echo "Для просмотра логов используйте: ./view_logs.sh"





