# 🚀 Быстрый запуск через PM2

## 📋 **Команды для VPS (93.127.214.183):**

### 1. Установка PM2
```bash
npm install -g pm2 serve
```

### 2. Подготовка проекта
```bash
conda create -n wildbot python=3.9 -y
conda activate wildbot
pip install -r requirements.txt
cd wild-analytics-web && npm install && npm run build && cd ..
mkdir -p logs
```

### 3. Запуск проекта
```bash
chmod +x start_pm2.sh stop_pm2.sh view_pm2_logs.sh
./start_pm2.sh
```

## 🔧 **Или прямыми командами:**

```bash
# Backend
pm2 start "python3 main.py" \
  --name wild-backend \
  --cwd /root/WILD_BOT_9/web-dashboard/backend \
  --interpreter /root/miniconda3/envs/wildbot/bin/python3

# Frontend
pm2 start serve \
  --name wild-frontend \
  -- -s build -l 3000 \
  --cwd /root/WILD_BOT_9/wild-analytics-web
```

## 🌐 **Результат:**
- **Frontend**: http://93.127.214.183:3000
- **Backend**: http://93.127.214.183:8000

## 🔧 **Управление:**
```bash
pm2 status          # Статус
pm2 logs            # Логи
pm2 restart all     # Перезапуск
pm2 stop all        # Остановка
./stop_pm2.sh       # Остановка через скрипт
```

## 📊 **Автозапуск:**
```bash
pm2 startup
pm2 save
```





