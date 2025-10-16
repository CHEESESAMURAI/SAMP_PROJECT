# 🚀 Быстрый старт для crm.samp.business

## 📌 Ваша ситуация

- **Frontend:** https://crm.samp.business ✅
- **Backend:** Нужно настроить HTTPS

---

## 🎯 Выберите вариант

### ✅ Вариант А: Поддомен (Рекомендуется)

**Backend API:** `https://api.samp.business`

**Преимущества:**
- Чище разделение
- Проще конфигурация
- Независимое масштабирование

### ✅ Вариант Б: Путь на основном домене

**Backend API:** `https://crm.samp.business/api`

**Преимущества:**
- Всё на одном домене
- Не нужен поддомен

---

## 📋 Вариант А: Поддомен (api.samp.business)

### Шаг 1: Настройка DNS

Добавьте A-запись:
```
api.samp.business → 93.127.214.183
```

### Шаг 2: Получение SSL сертификата

```bash
certbot --nginx -d api.samp.business
```

### Шаг 3: Конфигурация Nginx

```bash
nano /etc/nginx/sites-available/wild-analytics-api
```

Вставьте:
```nginx
server {
    listen 443 ssl http2;
    server_name api.samp.business;

    ssl_certificate /etc/letsencrypt/live/api.samp.business/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.samp.business/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    access_log /var/log/nginx/wild-api-access.log;
    error_log /var/log/nginx/wild-api-error.log;

    client_max_body_size 20M;

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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

server {
    listen 80;
    server_name api.samp.business;
    return 301 https://$host$request_uri;
}
```

Активируйте:
```bash
ln -s /etc/nginx/sites-available/wild-analytics-api /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Шаг 4: Замена URL в коде

```bash
cd /root/WILD_BOT_9
./replace_url_for_crm_samp.sh subdomain
cd wild-analytics-web && npm run build
pm2 restart all
```

### Шаг 5: Проверка

```bash
# Должна открыться FastAPI документация
curl -I https://api.samp.business/docs
```

---

## 📋 Вариант Б: Путь /api на основном домене

### Шаг 1: Редактирование конфигурации Nginx

Найдите конфигурацию `crm.samp.business`:
```bash
ls /etc/nginx/sites-available/ | grep crm
nano /etc/nginx/sites-available/[имя-файла]
```

### Шаг 2: Добавление location /api

В блок `server` для `crm.samp.business` добавьте:

```nginx
server {
    listen 443 ssl http2;
    server_name crm.samp.business;

    # Ваши существующие SSL настройки...
    
    # Frontend (существующая конфигурация)
    location / {
        # ...
    }

    # ДОБАВЬТЕ ЭТО:
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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        add_header 'Access-Control-Allow-Origin' 'https://crm.samp.business' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://crm.samp.business' always;
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
```

Перезапустите Nginx:
```bash
nginx -t
systemctl restart nginx
```

### Шаг 3: Замена URL в коде

```bash
cd /root/WILD_BOT_9
./replace_url_for_crm_samp.sh path
cd wild-analytics-web && npm run build
pm2 restart all
```

### Шаг 4: Проверка

```bash
curl -I https://crm.samp.business/api/docs
```

---

## 🔧 Настройка CORS в backend

Отредактируйте `web-dashboard/backend/main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://crm.samp.business",
        "https://api.samp.business",  # если используете поддомен
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Перезапустите backend:
```bash
pm2 restart wild-backend
```

---

## ✅ Проверка работы

### В браузере:

**Вариант А:**
```
https://api.samp.business/docs
```

**Вариант Б:**
```
https://crm.samp.business/api/docs
```

### Должна открыться страница FastAPI Swagger UI

---

## 🎯 Итоговая схема

### Вариант А:
```
Frontend: https://crm.samp.business
Backend:  https://api.samp.business → Nginx → FastAPI:8000
```

### Вариант Б:
```
Frontend: https://crm.samp.business
Backend:  https://crm.samp.business/api → Nginx → FastAPI:8000
```

---

## 🔍 Отладка

```bash
# Логи Nginx
tail -f /var/log/nginx/wild-api-access.log
tail -f /var/log/nginx/wild-api-error.log

# Логи Backend
pm2 logs wild-backend

# Статус
pm2 status
systemctl status nginx

# Проверка портов
netstat -tlnp | grep :8000
netstat -tlnp | grep :443
```

---

## 📞 Помощь

Подробная инструкция: **`SETUP_FOR_CRM_SAMP_BUSINESS.md`**

**Рекомендуется использовать Вариант А (поддомен)** 🎯


