#!/bin/bash

# Скрипт для замены http://localhost:8000 на https://93.127.214.183:8000
# Использование: ./replace_backend_url.sh

echo "🔄 Замена URL бэкенда в frontend..."

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Путь к frontend
FRONTEND_DIR="wild-analytics-web/src"

# Проверка существования директории
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Директория $FRONTEND_DIR не найдена!"
    exit 1
fi

echo "📁 Поиск файлов в $FRONTEND_DIR..."

# Найти все файлы с http://localhost:8000
FILES=$(grep -rl "http://localhost:8000" "$FRONTEND_DIR" 2>/dev/null)

if [ -z "$FILES" ]; then
    echo "✅ URL уже заменены или файлы не найдены"
    exit 0
fi

echo "📝 Найдено файлов для замены:"
echo "$FILES"
echo ""

# Замена в каждом файле
for file in $FILES; do
    echo -e "${BLUE}Обработка:${NC} $file"
    
    # Для macOS используем sed -i '' (пустая строка после -i)
    # Для Linux просто sed -i
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's|http://localhost:8000|https://93.127.214.183:8000|g' "$file"
    else
        # Linux
        sed -i 's|http://localhost:8000|https://93.127.214.183:8000|g' "$file"
    fi
    
    echo -e "${GREEN}✓${NC} Готово"
done

echo ""
echo -e "${GREEN}✅ Все URL успешно заменены!${NC}"
echo ""
echo "📋 Замененные URL:"
echo "   http://localhost:8000 → https://93.127.214.183:8000"
echo ""
echo "🔍 Проверка результатов:"
grep -n "https://93.127.214.183:8000" $FILES | head -n 5
echo ""
echo "💡 Не забудьте:"
echo "   1. Проверить изменения: git diff"
echo "   2. Пересобрать frontend: cd wild-analytics-web && npm run build"
echo "   3. Перезапустить PM2: pm2 restart all"


