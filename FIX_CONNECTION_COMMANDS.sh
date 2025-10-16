#!/bin/bash

# Скрипт для исправления связи frontend-backend на crm.samp.business
# Запустите на VPS сервере: bash FIX_CONNECTION_COMMANDS.sh

echo "🔧 Исправление связи Frontend ↔ Backend"
echo "========================================"
echo ""

# Проверка директории
if [ ! -d "/root/WILD_BOT_9" ]; then
    echo "❌ Директория /root/WILD_BOT_9 не найдена!"
    exit 1
fi

cd /root/WILD_BOT_9

echo "📝 Шаг 1: Замена URL в коде frontend"
echo "   Замена: http://localhost:8000 → https://crm.samp.business/api"
echo ""

# Замена URL
find wild-analytics-web/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|http://localhost:8000|https://crm.samp.business/api|g' {} +

echo "✅ URL заменены"
echo ""

# Проверка результата
echo "🔍 Проверка замены (первые 3 совпадения):"
grep -rn "https://crm.samp.business/api" wild-analytics-web/src 2>/dev/null | head -n 3
echo ""

echo "📦 Шаг 2: Сборка frontend"
cd wild-analytics-web
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при сборке frontend!"
    exit 1
fi

echo "✅ Frontend собран"
echo ""

cd ..

echo "🔄 Шаг 3: Перезапуск PM2"
pm2 restart all

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при перезапуске PM2!"
    exit 1
fi

echo "✅ PM2 перезапущен"
echo ""

echo "📊 Статус:"
pm2 status

echo ""
echo "========================================"
echo "✅ Готово!"
echo ""
echo "🔍 Проверьте:"
echo "   1. Frontend: https://crm.samp.business/login"
echo "   2. Backend API: https://crm.samp.business/api/docs"
echo ""
echo "⚠️  ВАЖНО: Убедитесь что в Nginx настроен location /api"
echo "   См. файл: NGINX_ADD_API.txt"
echo ""

