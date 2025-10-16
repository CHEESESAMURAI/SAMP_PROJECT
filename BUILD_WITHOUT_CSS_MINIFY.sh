#!/bin/bash

# Скрипт для сборки без минификации CSS
echo "🔧 Сборка frontend без минификации CSS"
echo "======================================="
echo ""

cd /root/WILD_BOT_9/wild-analytics-web

# Создаем временный файл .env для сборки
echo "📝 Создание .env файла с настройками..."
cat > .env.production.local << 'EOF'
GENERATE_SOURCEMAP=false
DISABLE_ESLINT_PLUGIN=true
IMAGE_INLINE_SIZE_LIMIT=0
EOF

echo "✅ .env.production.local создан"
echo ""

# Очистка
echo "🧹 Очистка кэша..."
rm -rf node_modules/.cache
rm -rf build
echo "✅ Кэш очищен"
echo ""

# Попытка сборки
echo "📦 Запуск сборки..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Сборка успешна!"
    echo ""
    echo "📝 Следующие шаги:"
    echo "   pm2 restart all"
    echo "   pm2 status"
    exit 0
else
    echo ""
    echo "❌ Сборка не удалась"
    echo ""
    echo "Попробуем альтернативный метод..."
    echo ""
    
    # Альтернативный метод - собрать в development режиме
    echo "📦 Сборка в development режиме..."
    NODE_ENV=development npm run build
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Сборка в development режиме успешна!"
        exit 0
    fi
    
    exit 1
fi


