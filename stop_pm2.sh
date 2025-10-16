#!/bin/bash

# Скрипт остановки Wild Analytics Dashboard через PM2

echo "🛑 Остановка Wild Analytics Dashboard через PM2..."

# Останавливаем процессы
echo "🔧 Остановка backend сервера..."
pm2 stop wild-backend 2>/dev/null || true

echo "🌐 Остановка frontend сервера..."
pm2 stop wild-frontend 2>/dev/null || true

# Удаляем процессы
echo "🗑️ Удаление процессов..."
pm2 delete wild-backend 2>/dev/null || true
pm2 delete wild-frontend 2>/dev/null || true

# Сохраняем конфигурацию
echo "💾 Сохранение конфигурации..."
pm2 save

# Показываем статус
echo "📊 Статус процессов:"
pm2 status

echo "✅ Все серверы остановлены!"





