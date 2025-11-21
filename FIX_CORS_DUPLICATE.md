# 🔧 Исправление ошибки CORS: дублирование заголовков

## Проблема

Ошибка:
```
Access-Control-Allow-Origin header contains multiple values 'http://localhost:3000, https://crm.samp.business', but only one is allowed.
```

## Причина

CORS заголовки добавляются **дважды**:
1. **FastAPI** (через CORSMiddleware) добавляет заголовок на основе `allow_origins`
2. **Nginx** добавляет заголовок через `add_header 'Access-Control-Allow-Origin'`

Когда запрос идет с `http://localhost:3000`, FastAPI добавляет `Access-Control-Allow-Origin: http://localhost:3000`, а Nginx добавляет `Access-Control-Allow-Origin: https://crm.samp.business`. В результате получается два значения в одном заголовке.

## Решение

### Вариант 1: Убрать CORS заголовки из Nginx (РЕКОМЕНДУЕТСЯ)

Nginx не должен добавлять CORS заголовки, если их уже добавляет FastAPI. Удалите или закомментируйте строки с `add_header 'Access-Control-Allow-Origin'` из конфигурации Nginx.

**В файле конфигурации Nginx** (`/etc/nginx/sites-available/crm.samp.business` или аналогичном):

```nginx
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
    
    # Таймауты
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # УБРАТЬ ЭТИ СТРОКИ - CORS обрабатывается в FastAPI
    # add_header 'Access-Control-Allow-Origin' 'https://crm.samp.business' always;
    # add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH' always;
    # add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
    # add_header 'Access-Control-Allow-Credentials' 'true' always;
    
    # УБРАТЬ ЭТОТ БЛОК - OPTIONS обрабатывается в FastAPI
    # if ($request_method = 'OPTIONS') {
    #     add_header 'Access-Control-Allow-Origin' 'https://crm.samp.business' always;
    #     add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH' always;
    #     add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
    #     add_header 'Access-Control-Max-Age' 1728000;
    #     add_header 'Content-Length' 0;
    #     return 204;
    # }
}
```

После изменений:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Вариант 2: Настроить Nginx для передачи CORS заголовков от FastAPI

Если нужно оставить CORS в Nginx, нужно настроить его так, чтобы он не добавлял заголовки, если они уже есть от FastAPI:

```nginx
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
    
    # Проксируем заголовки от FastAPI
    proxy_pass_header Access-Control-Allow-Origin;
    proxy_pass_header Access-Control-Allow-Methods;
    proxy_pass_header Access-Control-Allow-Headers;
    proxy_pass_header Access-Control-Allow-Credentials;
    
    # НЕ добавляем свои заголовки
}
```

## Настройка FastAPI

Убедитесь, что в `main.py` правильно настроены разрешенные origins:

```python
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", 
    "http://localhost:3000,http://127.0.0.1:3000,https://crm.samp.business"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Проверка

После исправления проверьте:

```bash
# Проверка заголовков
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://crm.samp.business/api/auth/login \
     -v

# Должен быть только ОДИН заголовок Access-Control-Allow-Origin
```

## Рекомендация

**Используйте Вариант 1** - убрать CORS из Nginx и оставить только в FastAPI. Это проще и правильнее, так как:
- FastAPI может динамически определять origin
- Меньше дублирования конфигурации
- Проще управлять разрешенными origins через переменные окружения



