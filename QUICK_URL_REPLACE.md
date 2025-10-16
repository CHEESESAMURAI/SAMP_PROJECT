# 🚀 Быстрая замена URL на сервере

## ⚠️ ВАЖНО: HTTP или HTTPS?

### Вариант 1: HTTP (быстро, для тестирования)
Используйте **HTTP**, если у вас НЕТ SSL сертификата:
```
http://93.127.214.183:8000  ← БЕЗ HTTPS!
```

### Вариант 2: HTTPS (правильно, для продакшена)
Используйте **HTTPS** ТОЛЬКО если настроили Nginx + SSL (см. `SETUP_NGINX_SSL.md`):
```
https://93.127.214.183:8000  ← С HTTPS
```

---

## 📋 Вариант 1: HTTP (рекомендуется для начала)

```bash
# 1. Перейти в проект
cd /root/WILD_BOT_9

# 2. Замена на HTTP (не HTTPS!)
find wild-analytics-web/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|http://localhost:8000|http://93.127.214.183:8000|g' {} +

# 3. Пересобрать frontend
cd wild-analytics-web
npm run build

# 4. Перезапустить приложение
pm2 restart all

# 5. Проверить статус
pm2 status
```

## Готово! ✅

Все URL `http://localhost:8000` заменятся на `http://93.127.214.183:8000`

---

## 📋 Вариант 2: HTTPS (требует Nginx + SSL)

**Сначала настройте Nginx и SSL!** (см. `SETUP_NGINX_SSL.md`)

```bash
# 1. Перейти в проект
cd /root/WILD_BOT_9

# 2. Дать права на выполнение скрипта
chmod +x replace_backend_url.sh

# 3. Запустить замену (http → https)
./replace_backend_url.sh

# 4. Пересобрать frontend
cd wild-analytics-web
npm run build

# 5. Перезапустить приложение
pm2 restart all

# 6. Проверить статус
pm2 status
```

Все URL `http://localhost:8000` заменятся на `https://93.127.214.183:8000`

---

## Альтернатива: одной командой (Linux)

```bash
cd /root/WILD_BOT_9 && \
find wild-analytics-web/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|http://localhost:8000|https://93.127.214.183:8000|g' {} + && \
cd wild-analytics-web && npm run build && pm2 restart all
```

---

## Что будет заменено:

- **17 файлов** в `wild-analytics-web/src/`
- **~50 упоминаний** `http://localhost:8000`
- Замена на: `https://93.127.214.183:8000`

## Файлы для замены:

1. `pages/AIHelper.tsx`
2. `pages/GlobalSearch.tsx`
3. `pages/ProductAnalysis.tsx`
4. `pages/CategoryAnalysis.tsx`
5. `pages/BrandAnalysis.tsx`
6. `pages/ExternalAnalysis.tsx`
7. `pages/BloggerSearch.tsx`
8. `pages/SupplyPlanningEnhanced.tsx`
9. `pages/OracleQueries.tsx`
10. `pages/Profile.tsx`
11. `pages/SeasonalityAnalysis.tsx`
12. `pages/SupplierAnalysis.tsx`
13. `pages/Dashboard.tsx`
14. `pages/OracleQueriesEnhanced.tsx`
15. `pages/SupplyPlanning.tsx`
16. `pages/AdMonitoring.tsx`
17. `contexts/AuthContext.tsx`

