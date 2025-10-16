#!/bin/bash

# Скрипт для замены URL под домен crm.samp.business
# Использование: ./replace_url_for_crm_samp.sh [вариант]
# Варианты:
#   subdomain - использовать поддомен api.samp.business (рекомендуется)
#   path      - использовать путь /api на crm.samp.business

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка аргументов
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Выберите вариант:${NC}"
    echo "  1) subdomain - https://api.samp.business (рекомендуется)"
    echo "  2) path      - https://crm.samp.business/api"
    echo ""
    read -p "Введите вариант (subdomain/path): " VARIANT
else
    VARIANT="$1"
fi

# Определяем URL
case $VARIANT in
    subdomain|1)
        NEW_URL="https://api.samp.business"
        DESCRIPTION="поддомен api.samp.business"
        ;;
    path|2)
        NEW_URL="https://crm.samp.business/api"
        DESCRIPTION="путь /api на crm.samp.business"
        ;;
    *)
        echo -e "${RED}❌ Неверный вариант!${NC}"
        echo "Используйте: subdomain или path"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}🔄 Замена URL бэкенда...${NC}"
echo -e "📍 Старый URL: http://localhost:8000"
echo -e "📍 Новый URL: ${GREEN}$NEW_URL${NC} ($DESCRIPTION)"
echo ""

# Путь к frontend
FRONTEND_DIR="wild-analytics-web/src"

# Проверка существования директории
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Директория $FRONTEND_DIR не найдена!${NC}"
    exit 1
fi

# Найти файлы с localhost:8000
FILES=$(grep -rl "http://localhost:8000" "$FRONTEND_DIR" 2>/dev/null)

if [ -z "$FILES" ]; then
    echo -e "${YELLOW}⚠️  URL localhost:8000 не найдены${NC}"
    echo ""
    echo -e "${BLUE}🔍 Проверка текущих URL:${NC}"
    grep -rh "process.env.REACT_APP_API_URL\|https://\|http://" "$FRONTEND_DIR" | grep -v "node_modules" | head -n 10
    echo ""
    read -p "Продолжить всё равно? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

echo -e "${BLUE}📝 Файлы для замены:${NC}"
echo "$FILES"
echo ""

# Подтверждение
echo -e "${YELLOW}⚠️  Будет выполнена замена:${NC}"
echo "   http://localhost:8000 → $NEW_URL"
echo ""
read -p "Продолжить? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Операция отменена${NC}"
    exit 1
fi

# Замена
for file in $FILES; do
    echo -e "${BLUE}Обработка:${NC} $file"
    
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
echo -e "${GREEN}✅ URL успешно заменены!${NC}"
echo ""
echo -e "${BLUE}🔍 Проверка (первые 5 совпадений):${NC}"
grep -rn "$NEW_URL" "$FRONTEND_DIR" 2>/dev/null | head -n 5
echo ""

# Дополнительные инструкции
echo -e "${YELLOW}📋 Следующие шаги:${NC}"
echo ""

if [ "$VARIANT" == "subdomain" ] || [ "$VARIANT" == "1" ]; then
    echo "1. Настройте DNS:"
    echo "   api.samp.business → 93.127.214.183"
    echo ""
    echo "2. Получите SSL сертификат:"
    echo "   certbot --nginx -d api.samp.business"
    echo ""
    echo "3. Настройте Nginx (см. SETUP_FOR_CRM_SAMP_BUSINESS.md - Вариант А)"
    echo ""
    echo "4. Пересоберите frontend:"
    echo "   cd wild-analytics-web && npm run build"
    echo ""
    echo "5. Перезапустите PM2:"
    echo "   pm2 restart all"
    echo ""
    echo "6. Проверьте API:"
    echo "   https://api.samp.business/docs"
else
    echo "1. Настройте Nginx для /api (см. SETUP_FOR_CRM_SAMP_BUSINESS.md - Вариант Б)"
    echo ""
    echo "2. Пересоберите frontend:"
    echo "   cd wild-analytics-web && npm run build"
    echo ""
    echo "3. Перезапустите PM2:"
    echo "   pm2 restart all"
    echo ""
    echo "4. Проверьте API:"
    echo "   https://crm.samp.business/api/docs"
fi

echo ""
echo -e "${GREEN}🎉 Готово!${NC}"


