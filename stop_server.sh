#!/bin/bash

# Скрипт остановки Wild Analytics Dashboard

echo "🛑 Остановка Wild Analytics Dashboard..."

# Останавливаем backend процессы
echo "🔧 Остановка backend сервера..."
pkill -f "python main.py"

# Останавливаем frontend процессы
echo "🔧 Остановка frontend сервера..."
pkill -f "npm start"
pkill -f "node.*react-scripts"

# Останавливаем процессы на портах
echo "🔧 Освобождение портов..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo "✅ Все серверы остановлены!"





