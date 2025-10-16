#!/bin/bash

# Скрипт для замены URL бэкенда с пользовательским значением
# Использование: ./replace_backend_url_custom.sh <новый_url>
# Пример: ./replace_backend_url_custom.sh https://93.127.214.183:8000

# Проверка аргументов
if [ $# -eq 0 ]; then
    echo "❌ Ошибка: не указан новый URL"
    echo ""
    echo "Использование: $0 <новый_url>"
    echo "Пример: $0 https://93.127.214.183:8000"
    exit 1
fi

NEW_URL="$1"

echo "🔄 Замена URL бэкенда в frontend..."
echo "📍 Старый URL: http://localhost:8000"
echo "📍 Новый URL: $NEW_URL"
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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
    echo ""
    echo "🔍 Текущие URL в проекте:"
    grep -rh "process.env.REACT_APP_API_URL\|http://\|https://" "$FRONTEND_DIR" | grep -E "(http|https)://" | head -n 5
    exit 0
fi

echo "📝 Найдено файлов для замены:"
echo "$FILES"
echo ""

# Подтверждение
echo -e "${YELLOW}⚠️  Будет выполнена замена в следующих файлах:${NC}"
echo "$FILES" | sed 's/^/   - /'
echo ""
read -p "Продолжить? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Операция отменена"
    exit 1
fi

# Замена в каждом файле
for file in $FILES; do
    echo -e "${BLUE}Обработка:${NC} $file"
    
    # Для macOS используем sed -i '' (пустая строка после -i)
    # Для Linux просто sed -i
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|http://localhost:8000|${NEW_URL}|g" "$file"
    else
        # Linux
        sed -i "s|http://localhost:8000|${NEW_URL}|g" "$file"
    fi
    
    echo -e "${GREEN}✓${NC} Готово"
done

echo ""
echo -e "${GREEN}✅ Все URL успешно заменены!${NC}"
echo ""
echo "📋 Замененные URL:"
echo "   http://localhost:8000 → $NEW_URL"
echo ""
echo "🔍 Проверка результатов (первые 5 совпадений):"
grep -n "$NEW_URL" $FILES | head -n 5
echo ""
echo "💡 Не забудьте:"
echo "   1. Проверить изменения: git diff"
echo "   2. Пересобрать frontend: cd wild-analytics-web && npm run build"
echo "   3. Перезапустить PM2: pm2 restart all"


