#!/bin/bash

# Скрипт для исправления ошибки сборки CSS Minimizer
echo "🔧 Исправление ошибки сборки frontend"
echo "======================================"
echo ""

cd /root/WILD_BOT_9/wild-analytics-web

echo "📝 Шаг 1: Очистка кэша и node_modules"
rm -rf node_modules/.cache
rm -rf build
echo "✅ Кэш очищен"
echo ""

echo "📝 Шаг 2: Сборка с обходом проблемы CSS"
echo "   Используем переменные окружения для обхода ошибки"
echo ""

# Попытка 1: Отключение source maps
echo "Попытка 1: Сборка без source maps..."
GENERATE_SOURCEMAP=false npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Сборка успешна!"
    exit 0
fi

echo ""
echo "Попытка 2: Сборка с CI=false..."
CI=false GENERATE_SOURCEMAP=false npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Сборка успешна!"
    exit 0
fi

echo ""
echo "Попытка 3: Сборка с отключением минификации CSS..."
DISABLE_ESLINT_PLUGIN=true GENERATE_SOURCEMAP=false npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Сборка успешна!"
    exit 0
fi

echo ""
echo "❌ Все попытки не удались"
echo "Попробуйте выполнить вручную:"
echo "  cd wild-analytics-web"
echo "  rm -rf node_modules package-lock.json"
echo "  npm install"
echo "  GENERATE_SOURCEMAP=false npm run build"
exit 1

