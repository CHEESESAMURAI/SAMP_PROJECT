# 🔐 Настройка переменных окружения (.env)

## 📋 Текущая структура конфигурации

### ❌ **Старая структура (НЕ рекомендуется):**
```
config.py - ключи прямо в коде (небезопасно!)
```

### ✅ **Новая структура (РЕКОМЕНДУЕТСЯ):**
```
.env - секретные ключи (НЕ в Git!)
.env.example - шаблон для команды
config.py - читает из .env
```

---

## 🚀 Быстрый старт

### 1️⃣ Backend (.env)

```bash
# Перейдите в папку backend
cd web-dashboard/backend

# Скопируйте шаблон
cp .env.example .env

# Отредактируйте .env и добавьте свои ключи
nano .env  # или vim, или любой редактор
```

**Содержимое `.env` файла:**
```bash
# OpenAI API
OPENAI_API_KEY=sk-proj-ваш_реальный_ключ

# JWT Secret (сгенерируйте случайную строку)
JWT_SECRET_KEY=super_secret_random_string_12345

# API Keys
SERPER_API_KEY=ваш_ключ_от_serper
MPSTATS_API_KEY=ваш_ключ_от_mpstats

# CORS Origins
ALLOWED_ORIGINS=http://localhost:3000,https://crm.samp.business
```

### 2️⃣ Frontend (.env)

```bash
# Перейдите в папку frontend
cd wild-analytics-web

# Скопируйте шаблон
cp .env.example .env

# Отредактируйте .env
nano .env
```

**Для локальной разработки:**
```bash
REACT_APP_API_URL=http://localhost:8000
```

**Для production:**
```bash
REACT_APP_API_URL=https://crm.samp.business/api
```

---

## 🔧 Миграция с config.py на .env

### Шаг 1: Установите python-dotenv

```bash
cd web-dashboard/backend
pip install python-dotenv
```

Или добавьте в `requirements.txt`:
```
python-dotenv==1.0.0
```

### Шаг 2: Замените config.py

```bash
# Сделайте резервную копию
cp config.py config.py.backup

# Используйте новый config.py
cp config_new.py config.py
```

### Шаг 3: Создайте .env файл

```bash
cp .env.example .env
# Заполните своими ключами
nano .env
```

### Шаг 4: Добавьте .env в .gitignore

Уже добавлено в `.gitignore`:
```gitignore
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

---

## 📝 Пример использования в коде

### Python (Backend):
```python
from config import OPENAI_API_KEY, JWT_SECRET_KEY

# Ключи загружаются автоматически из .env
print(f"API Key: {OPENAI_API_KEY[:10]}...")
```

### TypeScript (Frontend):
```typescript
// В AuthContext.tsx
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

---

## 🔒 Безопасность

### ✅ НУЖНО:
1. Добавить `.env` в `.gitignore`
2. Хранить `.env.example` в Git (БЕЗ реальных ключей)
3. Передавать настоящие ключи через безопасные каналы
4. Использовать разные ключи для dev/prod

### ❌ НЕ НУЖНО:
1. Коммитить `.env` файлы в Git
2. Хранить реальные ключи в `config.py`
3. Отправлять `.env` по email/Telegram
4. Использовать одинаковые ключи для всех окружений

---

## 🌍 Переменные окружения по окружениям

### Development (локально):
```bash
# Backend
OPENAI_API_KEY=sk-test-ключ
JWT_SECRET_KEY=dev_secret_key
ALLOWED_ORIGINS=http://localhost:3000

# Frontend
REACT_APP_API_URL=http://localhost:8000
```

### Production (VPS):
```bash
# Backend
OPENAI_API_KEY=sk-prod-реальный_ключ
JWT_SECRET_KEY=очень_длинный_случайный_ключ
ALLOWED_ORIGINS=https://crm.samp.business

# Frontend
REACT_APP_API_URL=https://crm.samp.business/api
```

---

## 🔑 Генерация JWT Secret

```bash
# Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Или
openssl rand -base64 32
```

---

## 📦 Деплой на VPS

### Вариант 1: Прямое редактирование на сервере

```bash
# SSH на сервер
ssh root@93.127.214.183

# Создайте .env
cd /root/WILD_BOT_9/web-dashboard/backend
nano .env
# Вставьте ключи, сохраните (Ctrl+O, Enter, Ctrl+X)

# Рестарт PM2
pm2 restart all
```

### Вариант 2: Загрузка через SCP

```bash
# На локальной машине
scp web-dashboard/backend/.env root@93.127.214.183:/root/WILD_BOT_9/web-dashboard/backend/

# На сервере
ssh root@93.127.214.183
pm2 restart all
```

---

## 🐛 Troubleshooting

### Проблема: "ModuleNotFoundError: No module named 'dotenv'"

**Решение:**
```bash
pip install python-dotenv
```

### Проблема: Переменные не загружаются

**Проверьте:**
```python
import os
from dotenv import load_dotenv

load_dotenv()
print("OPENAI_API_KEY:", os.getenv("OPENAI_API_KEY"))
```

### Проблема: Frontend не видит REACT_APP_API_URL

**Решение:**
1. Переменные должны начинаться с `REACT_APP_`
2. Перезапустите dev-сервер после изменения `.env`
```bash
npm start
```

---

## 📚 Дополнительные ресурсы

- [python-dotenv документация](https://pypi.org/project/python-dotenv/)
- [Create React App: Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [12-Factor App: Config](https://12factor.net/config)

---

## 🎯 Чеклист для команды

- [ ] Создать `.env` файлы на локальных машинах
- [ ] Добавить свои API ключи
- [ ] Проверить, что `.env` в `.gitignore`
- [ ] Установить `python-dotenv`
- [ ] Заменить `config.py` на новую версию
- [ ] Настроить `.env` на VPS
- [ ] Перезапустить PM2 на сервере
- [ ] Удалить старые `config.py.backup`

---

**Сделано с ❤️ для безопасности WILD-BOT**



















