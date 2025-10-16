# 🔧 Исправление связи Frontend ↔ Backend

## 🔍 Проблема

- ✅ Frontend работает: `https://crm.samp.business/login`
- ✅ Backend работает: `http://93.127.214.183:8000`
- ❌ Но они **НЕ СВЯЗАНЫ** - frontend пытается обратиться к `localhost:8000`

---

## ✅ Решение за 3 шага

### Шаг 1: Настройка Nginx для /api

Откройте конфигурацию Nginx:

```bash
# Найдите файл конфигурации
ls /etc/nginx/sites-available/ | grep crm

# Откройте файл (замените имя на ваше)
sudo nano /etc/nginx/sites-available/[имя-файла-crm]
```

Найдите блок `server` с `listen 443` и **ПЕРЕД** блоком `location /` добавьте:

```nginx
    # Backend API
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        add_header 'Access-Control-Allow-Origin' 'https://crm.samp.business' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://crm.samp.business' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Length' 0;
            return 204;
        }
    }
```

Сохраните файл (Ctrl+O, Enter, Ctrl+X) и проверьте:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

Проверка:

```bash
curl -I https://crm.samp.business/api/docs
# Должен вернуть HTTP/2 200
```

---

### Шаг 2: Обновление CORS в backend (main.py)

Откройте файл:

```bash
nano /root/WILD_BOT_9/web-dashboard/backend/main.py
```

Найдите или добавьте настройку CORS:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://crm.samp.business",
        "http://localhost:3000",  # для разработки
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Сохраните (Ctrl+O, Enter, Ctrl+X).

---

### Шаг 3: Замена URL в frontend и пересборка

**Автоматический способ (рекомендуется):**

```bash
cd /root/WILD_BOT_9
bash FIX_CONNECTION_COMMANDS.sh
```

**Или вручную:**

```bash
cd /root/WILD_BOT_9

# Замена URL
find wild-analytics-web/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|http://localhost:8000|https://crm.samp.business/api|g' {} +

# Проверка
grep -rn "https://crm.samp.business/api" wild-analytics-web/src | head -n 3

# Сборка
cd wild-analytics-web
npm run build

# Перезапуск
cd ..
pm2 restart all
```

---

## ✅ Проверка работы

### 1. Проверьте API через браузер:

```
https://crm.samp.business/api/docs
```

Должна открыться страница FastAPI Swagger UI.

### 2. Проверьте frontend:

```
https://crm.samp.business/login
```

Откройте консоль браузера (F12) и попробуйте выполнить действие (например, анализ товара).

### 3. Проверьте логи:

```bash
# Логи backend
pm2 logs wild-backend --lines 20

# Логи Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🔍 Отладка проблем

### Проблема: "Mixed Content" в консоли браузера

**Решение:** Убедитесь, что все URL используют HTTPS, а не HTTP.

```bash
# Проверьте, что не осталось localhost:8000
grep -r "localhost:8000" /root/WILD_BOT_9/wild-analytics-web/src
```

### Проблема: CORS ошибки

**Решение:** Проверьте CORS в `main.py` и headers в Nginx.

```bash
# Перезапустите backend после изменения CORS
pm2 restart wild-backend
```

### Проблема: 502 Bad Gateway

**Решение:** Backend не запущен или недоступен.

```bash
# Проверьте статус
pm2 status

# Проверьте, что порт 8000 слушается
netstat -tlnp | grep :8000

# Перезапустите backend
pm2 restart wild-backend
```

### Проблема: 404 Not Found на /api/...

**Решение:** Nginx не настроен или неправильно настроен `rewrite`.

```bash
# Проверьте конфигурацию
sudo nginx -t

# Проверьте логи
tail -f /var/log/nginx/error.log
```

---

## 📊 Итоговая схема

```
┌─────────────────────┐
│  Браузер            │
└──────┬──────────────┘
       │
       ▼
https://crm.samp.business/login (Frontend)
       │
       │ API запросы
       ▼
https://crm.samp.business/api/* (Nginx:443)
       │
       │ Proxy
       ▼
http://127.0.0.1:8000/* (FastAPI Backend)
       │
       ▼
┌──────┴───────┬──────────┐
│              │          │
▼              ▼          ▼
Wildberries   MPStats   OpenAI
API           API       API
```

---

## 🎯 Быстрый чеклист

- [ ] Nginx: добавлен `location /api/`
- [ ] Nginx: проверка `nginx -t` прошла
- [ ] Nginx: перезапущен `systemctl restart nginx`
- [ ] `https://crm.samp.business/api/docs` открывается
- [ ] Backend: CORS настроен в `main.py`
- [ ] Backend: перезапущен `pm2 restart wild-backend`
- [ ] Frontend: URL заменены на `https://crm.samp.business/api`
- [ ] Frontend: пересобран `npm run build`
- [ ] Frontend: перезапущен `pm2 restart wild-frontend`
- [ ] Проверка: открывается `https://crm.samp.business/login`
- [ ] Проверка: работает анализ товаров (без ошибок в консоли)

---

## 🚀 Готово!

После выполнения всех шагов ваш frontend и backend будут связаны и работать через HTTPS.

**Все запросы будут идти через:**
```
https://crm.samp.business/api/* → Backend
```

**Никаких Mixed Content ошибок!** ✅


