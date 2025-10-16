# 🔒 Настройка Nginx с SSL для Wild Analytics

## Проблема

Frontend на HTTPS не может обращаться к backend на HTTP (Mixed Content Error).

## Решение

Настроить Nginx как reverse proxy с SSL сертификатом от Let's Encrypt.

---

## 📋 Шаг 1: Установка Nginx

```bash
# Обновить систему
apt update && apt upgrade -y

# Установить Nginx
apt install nginx -y

# Проверить статус
systemctl status nginx

# Запустить Nginx
systemctl start nginx
systemctl enable nginx
```

---

## 📋 Шаг 2: Установка Certbot (Let's Encrypt)

```bash
# Установить Certbot
apt install certbot python3-certbot-nginx -y
```

---

## 📋 Шаг 3: Настройка домена (опционально)

Если у вас есть домен (например, `wildanalytics.com`):

1. Создайте A-запись в DNS:
   ```
   wildanalytics.com → 93.127.214.183
   api.wildanalytics.com → 93.127.214.183
   ```

2. Получите SSL сертификат:
   ```bash
   certbot --nginx -d wildanalytics.com -d api.wildanalytics.com
   ```

---

## 📋 Шаг 4: Конфигурация Nginx

### Создайте конфигурацию:

```bash
nano /etc/nginx/sites-available/wild-analytics
```

### Вставьте конфигурацию:

```nginx
# Backend API (порт 8000 → https://api.ваш-домен.com или https://93.127.214.183/api)
server {
    listen 443 ssl http2;
    server_name api.wildanalytics.com;  # или просто IP: 93.127.214.183

    # SSL сертификаты (Let's Encrypt автоматически добавит пути)
    ssl_certificate /etc/letsencrypt/live/api.wildanalytics.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.wildanalytics.com/privkey.pem;
    
    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Логи
    access_log /var/log/nginx/wild-api-access.log;
    error_log /var/log/nginx/wild-api-error.log;

    # Proxy к FastAPI backend
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
        
        # CORS headers (если нужны)
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
    }
}

# Frontend (порт 3000 → https://wildanalytics.com)
server {
    listen 443 ssl http2;
    server_name wildanalytics.com;  # или просто IP: 93.127.214.183

    # SSL сертификаты
    ssl_certificate /etc/letsencrypt/live/wildanalytics.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wildanalytics.com/privkey.pem;
    
    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Логи
    access_log /var/log/nginx/wild-frontend-access.log;
    error_log /var/log/nginx/wild-frontend-error.log;

    # Proxy к React frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Редирект HTTP → HTTPS
server {
    listen 80;
    server_name wildanalytics.com api.wildanalytics.com;
    return 301 https://$host$request_uri;
}
```

### Если НЕТ домена (только IP):

```nginx
# Упрощенная конфигурация без SSL (временно)
server {
    listen 80;
    server_name 93.127.214.183;

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # CORS
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
    }

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📋 Шаг 5: Активация конфигурации

```bash
# Создать симлинк
ln -s /etc/nginx/sites-available/wild-analytics /etc/nginx/sites-enabled/

# Проверить конфигурацию
nginx -t

# Перезапустить Nginx
systemctl restart nginx

# Проверить статус
systemctl status nginx
```

---

## 📋 Шаг 6: Обновить URL в frontend

После настройки Nginx обновите URL в коде:

```bash
cd /root/WILD_BOT_9

# Если есть домен:
find wild-analytics-web/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|http://localhost:8000|https://api.wildanalytics.com|g' {} +

# Если только IP (через Nginx):
find wild-analytics-web/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|http://localhost:8000|http://93.127.214.183/api|g' {} +

# Пересобрать
cd wild-analytics-web
npm run build
pm2 restart all
```

---

## 🎯 Итоговая схема

### С доменом и SSL:
```
Браузер → https://wildanalytics.com → Nginx (443) → React (3000)
         ↓
Браузер → https://api.wildanalytics.com → Nginx (443) → FastAPI (8000)
```

### Без домена (только IP):
```
Браузер → http://93.127.214.183 → Nginx (80) → React (3000)
         ↓
Браузер → http://93.127.214.183/api → Nginx (80) → FastAPI (8000)
```

---

## 🔧 Полезные команды

```bash
# Проверить логи Nginx
tail -f /var/log/nginx/wild-api-access.log
tail -f /var/log/nginx/wild-api-error.log

# Перезапустить Nginx
systemctl restart nginx

# Проверить статус
systemctl status nginx

# Тест конфигурации
nginx -t

# Обновить SSL сертификат
certbot renew --dry-run
```

---

## ⚠️ Важно для CORS

Если используете Nginx, убедитесь что в `main.py` настроен CORS:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # или конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🚀 Быстрый старт без SSL (для тестирования)

Если нужно быстро проверить, используйте HTTP везде:

```bash
# В frontend заменить на:
http://93.127.214.183:8000  # ← HTTP, не HTTPS!
```

**Для продакшена обязательно настройте SSL через Nginx + Let's Encrypt!**


