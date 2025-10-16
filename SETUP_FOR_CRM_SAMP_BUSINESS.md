# 🚀 Настройка для crm.samp.business

## 📋 Текущая ситуация

- **Frontend:** https://crm.samp.business/login (работает с HTTPS ✅)
- **Backend:** http://93.127.214.183:8000 (работает на HTTP ⚠️)
- **Проблема:** Mixed Content - браузер блокирует HTTP запросы с HTTPS страницы

---

## 🎯 Решение: Настройка Nginx для API

### Вариант 1: Использовать поддомен `api.samp.business`

```
Frontend: https://crm.samp.business
Backend API: https://api.samp.business  ← через Nginx
```

### Вариант 2: Использовать путь `/api` на том же домене

```
Frontend: https://crm.samp.business
Backend API: https://crm.samp.business/api  ← через Nginx
```

---

## 📋 Шаг 1: Настройка DNS (если используете поддомен)

Если выбрали `api.samp.business`, добавьте A-запись в DNS:

```
api.samp.business → 93.127.214.183
```

⏳ Подождите 5-10 минут для распространения DNS.

---

## 📋 Шаг 2: Получение SSL сертификата

### Если у вас уже есть Certbot:

```bash
# Для поддомена api.samp.business
certbot --nginx -d api.samp.business

# ИЛИ добавить /api путь к существующему сертификату crm.samp.business
# (не требуется отдельный сертификат)
```

---

## 📋 Шаг 3: Конфигурация Nginx

### Вариант А: Поддомен `api.samp.business`

Создайте файл конфигурации:

```bash
nano /etc/nginx/sites-available/wild-analytics-api
```

Вставьте:

```nginx
# Backend API на поддомене
server {
    listen 443 ssl http2;
    server_name api.samp.business;

    # SSL сертификаты (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.samp.business/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.samp.business/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Логи
    access_log /var/log/nginx/wild-api-access.log;
    error_log /var/log/nginx/wild-api-error.log;

    # Размер загрузки файлов
    client_max_body_size 20M;

    # Proxy к FastAPI backend (порт 8000)
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Редирект HTTP → HTTPS
server {
    listen 80;
    server_name api.samp.business;
    return 301 https://$host$request_uri;
}
```

### Вариант Б: Путь `/api` на `crm.samp.business`

Отредактируйте существующую конфигурацию для `crm.samp.business`:

```bash
# Найдите файл конфигурации
ls /etc/nginx/sites-available/ | grep crm

# Откройте для редактирования
nano /etc/nginx/sites-available/crm-samp-business  # или другое имя
```

Добавьте блок `location /api`:

```nginx
server {
    listen 443 ssl http2;
    server_name crm.samp.business;

    # Ваши существующие SSL настройки...
    # ...

    # Frontend (существующая конфигурация)
    location / {
        # Ваши существующие настройки для frontend
        # ...
    }

    # ДОБАВЬТЕ ЭТО: Backend API
    location /api/ {
        # Убираем /api из пути при проксировании
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
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # CORS (если нужны)
        add_header 'Access-Control-Allow-Origin' 'https://crm.samp.business' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        # OPTIONS запросы для CORS
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://crm.samp.business' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
```

---

## 📋 Шаг 4: Активация конфигурации

```bash
# Если создали новый файл (Вариант А):
ln -s /etc/nginx/sites-available/wild-analytics-api /etc/nginx/sites-enabled/

# Проверить конфигурацию
nginx -t

# Если всё ОК, перезапустить Nginx
systemctl restart nginx

# Проверить статус
systemctl status nginx
```

---

## 📋 Шаг 5: Обновить URL в frontend коде

### Для варианта А (поддомен):

```bash
cd /root/WILD_BOT_9

# Замена на поддомен
find wild-analytics-web/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|http://localhost:8000|https://api.samp.business|g' {} +

# Проверить результат
grep -r "api.samp.business" wild-analytics-web/src | head -n 5

# Пересобрать frontend
cd wild-analytics-web
npm run build

# Перезапустить PM2
pm2 restart all
```

### Для варианта Б (путь /api):

```bash
cd /root/WILD_BOT_9

# Замена на путь /api
find wild-analytics-web/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|http://localhost:8000|https://crm.samp.business/api|g' {} +

# Проверить результат
grep -r "crm.samp.business/api" wild-analytics-web/src | head -n 5

# Пересобрать frontend
cd wild-analytics-web
npm run build

# Перезапустить PM2
pm2 restart all
```

---

## 📋 Шаг 6: Проверка работы

### Проверка через браузер:

```
# Для варианта А:
https://api.samp.business/docs  ← Должна открыться FastAPI документация

# Для варианта Б:
https://crm.samp.business/api/docs  ← Должна открыться FastAPI документация
```

### Проверка через curl:

```bash
# Для варианта А:
curl -I https://api.samp.business/docs

# Для варианта Б:
curl -I https://crm.samp.business/api/docs

# Должны увидеть HTTP/2 200
```

---

## 🔧 Настройка CORS в backend (main.py)

Убедитесь, что в `main.py` правильно настроен CORS:

```python
from fastapi.middleware.cors import CORSMiddleware

# Добавьте ваш домен
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://crm.samp.business",
        "http://localhost:3000",  # для локальной разработки
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

После изменения `main.py`:

```bash
pm2 restart wild-backend
```

---

## 📊 Итоговая схема

### Вариант А (Рекомендуется):
```
Браузер → https://crm.samp.business (Frontend)
         ↓ API запросы
Браузер → https://api.samp.business → Nginx (443) → FastAPI (8000)
```

### Вариант Б:
```
Браузер → https://crm.samp.business (Frontend)
         ↓ API запросы
Браузер → https://crm.samp.business/api → Nginx (443) → FastAPI (8000)
```

---

## 🔍 Полезные команды для отладки

```bash
# Логи Nginx
tail -f /var/log/nginx/wild-api-access.log
tail -f /var/log/nginx/wild-api-error.log

# Логи PM2
pm2 logs wild-backend --lines 50

# Проверка портов
netstat -tlnp | grep :8000
netstat -tlnp | grep :443

# Перезапуск всего
systemctl restart nginx
pm2 restart all
```

---

## ✅ Быстрый чеклист

- [ ] DNS настроен (если используете поддомен)
- [ ] SSL сертификат получен
- [ ] Nginx сконфигурирован
- [ ] `nginx -t` проходит без ошибок
- [ ] Nginx перезапущен
- [ ] URL в frontend коде заменены
- [ ] Frontend пересобран (`npm run build`)
- [ ] PM2 перезапущен
- [ ] CORS настроен в `main.py`
- [ ] Тестовый запрос работает

---

## 🎯 Рекомендация

**Используйте Вариант А** (поддомен `api.samp.business`):
- ✅ Чище разделение frontend/backend
- ✅ Проще конфигурация Nginx
- ✅ Независимые логи и мониторинг
- ✅ Можно масштабировать отдельно

**Вариант Б** подходит, если:
- У вас ограничены поддомены
- Всё должно быть на одном домене


