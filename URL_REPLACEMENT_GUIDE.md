# 🔄 Инструкция по замене URL бэкенда

## 📋 Места, где нужна замена `http` на `https`

### Все файлы с URL `http://localhost:8000`:

#### 1. **AIHelper.tsx** (строка 33)
```typescript
const response = await fetch('http://localhost:8000/analysis/ai-helper', {
```

#### 2. **GlobalSearch.tsx** (строка 22)
```typescript
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

#### 3. **ProductAnalysis.tsx** (строки 286, 294, 317, 324, 331, 370, 377, 425, 775)
```typescript
const forecastResponse = await fetch(`http://localhost:8000/mpstats-item/forecast/yhat?path=${encodeURIComponent(category)}`);
// ... еще 8 мест
```

#### 4. **CategoryAnalysis.tsx** (строка 150)
```typescript
const response = await fetch('http://localhost:8000/category/category-analysis', {
```

#### 5. **BrandAnalysis.tsx** (строка 135)
```typescript
const response = await fetch('http://localhost:8000/brand/brand-analysis', {
```

#### 6. **ExternalAnalysis.tsx** (строка 33)
```typescript
const response = await fetch('http://localhost:8000/analysis/external', {
```

#### 7. **BloggerSearch.tsx** (строки 145, 284)
```typescript
const response = await fetch('http://localhost:8000/bloggers/search', {
```

#### 8. **SupplyPlanningEnhanced.tsx** (строки 124, 166)
```typescript
const response = await fetch('http://localhost:8000/planning/supply-planning-enhanced', {
```

#### 9. **OracleQueries.tsx** (строки 139, 172)
```typescript
const response = await fetch('http://localhost:8000/oracle/analyze', {
```

#### 10. **Profile.tsx** (строка 35 + axios запросы)
```typescript
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

#### 11. **SeasonalityAnalysis.tsx** (строка 43)
```typescript
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

#### 12. **SupplierAnalysis.tsx** (строки 128, 160)
```typescript
const response = await fetch('http://localhost:8000/seller/analyze', {
```

#### 13. **AuthContext.tsx** (строка 4)
```typescript
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

#### 14. **Dashboard.tsx** (строка 35)
```typescript
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

#### 15. **OracleQueriesEnhanced.tsx** (строки 87, 124)
```typescript
const response = await fetch('http://localhost:8000/analysis/oracle-enhanced', {
```

#### 16. **SupplyPlanning.tsx** (строка 49)
```typescript
const response = await fetch('http://localhost:8000/planning/supply-planning', {
```

#### 17. **AdMonitoring.tsx** (строка 48)
```typescript
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

---

## 🚀 Автоматическая замена

### Вариант 1: Замена на https://93.127.214.183:8000

```bash
# На вашем компьютере (macOS/Linux)
chmod +x replace_backend_url.sh
./replace_backend_url.sh
```

### Вариант 2: Замена на произвольный URL

```bash
# На вашем компьютере (macOS/Linux)
chmod +x replace_backend_url_custom.sh
./replace_backend_url_custom.sh https://ваш-домен.com:8000
```

### На VPS сервере:

```bash
# Перейти в директорию проекта
cd /root/WILD_BOT_9

# Дать права на выполнение
chmod +x replace_backend_url.sh

# Запустить замену
./replace_backend_url.sh

# Пересобрать frontend
cd wild-analytics-web
npm run build

# Перезапустить PM2
pm2 restart all
```

---

## ✋ Ручная замена

Если нужно заменить вручную, используйте команду `sed`:

### На macOS:
```bash
# Замена в конкретном файле
sed -i '' 's|http://localhost:8000|https://93.127.214.183:8000|g' wild-analytics-web/src/pages/AIHelper.tsx

# Замена во всех файлах
find wild-analytics-web/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's|http://localhost:8000|https://93.127.214.183:8000|g' {} +
```

### На Linux (VPS):
```bash
# Замена в конкретном файле
sed -i 's|http://localhost:8000|https://93.127.214.183:8000|g' wild-analytics-web/src/pages/AIHelper.tsx

# Замена во всех файлах
find wild-analytics-web/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|http://localhost:8000|https://93.127.214.183:8000|g' {} +
```

---

## 🔍 Проверка результатов

После замены проверьте, что все URL заменились:

```bash
# Поиск старых URL (должно вернуть пусто)
grep -r "http://localhost:8000" wild-analytics-web/src

# Поиск новых URL (должно показать замены)
grep -r "https://93.127.214.183:8000" wild-analytics-web/src | wc -l
```

---

## 📝 Важные замечания

1. **Переменные окружения имеют приоритет:**
   ```typescript
   const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
   ```
   Если установлена переменная `REACT_APP_API_URL`, она будет использоваться вместо хардкода.

2. **После замены обязательно:**
   - Пересобрать frontend: `npm run build`
   - Перезапустить PM2: `pm2 restart all`
   - Проверить работу в браузере

3. **SSL сертификат:**
   Если используете `https`, убедитесь, что на сервере настроен SSL сертификат (nginx с Let's Encrypt).

---

## 🎯 Итого

**Всего найдено:** ~50 мест с `http://localhost:8000`

**Файлов для замены:** 17 файлов

**Рекомендуемый способ:** Использовать скрипт `replace_backend_url.sh` для автоматической замены.


