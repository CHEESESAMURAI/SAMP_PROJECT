# 📤 Перенос файлов на VPS (93.127.214.183)

## 🚀 **Быстрый способ (SCP):**

### 1. Создание архива
```bash
# В папке проекта
cd /Users/user/Desktop
tar -czf wild-bot-9.tar.gz --exclude='WILD-BOT 9/node_modules' --exclude='WILD-BOT 9/.git' --exclude='WILD-BOT 9/__pycache__' "WILD-BOT 9"
```

### 2. Передача на сервер
```bash
scp wild-bot-9.tar.gz root@93.127.214.183:/root/
```

### 3. Распаковка на сервере
```bash
ssh root@93.127.214.183
cd /root
tar -xzf wild-bot-9.tar.gz
```

## 🔧 **Альтернативные способы:**

### **Rsync (Синхронизация):**
```bash
rsync -avz --exclude='node_modules' --exclude='.git' --exclude='__pycache__' \
  /Users/user/Desktop/WILD-BOT\ 9/ root@93.127.214.183:/root/WILD_BOT_9/
```

### **SFTP/FileZilla:**
1. Откройте FileZilla
2. Подключитесь к `93.127.214.183` (логин: `root`)
3. Перетащите папку `WILD-BOT 9` в `/root/`

## 🚀 **После переноса файлов:**

### **Вариант 1: С conda (рекомендуется)**
```bash
# Установка conda
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
chmod +x Miniconda3-latest-Linux-x86_64.sh
./Miniconda3-latest-Linux-x86_64.sh
source ~/.bashrc

# Создание среды
conda create -n wildbot python=3.9 -y
conda activate wildbot

# Установка зависимостей
cd /root/WILD_BOT_9
pip install -r requirements.txt
npm install -g pm2 serve
cd wild-analytics-web && npm install && npm run build && cd ..

# Запуск
chmod +x start_pm2.sh stop_pm2.sh view_pm2_logs.sh
./start_pm2.sh
```

### **Вариант 2: Без conda (проще)**
```bash
# Установка Python и Node.js
apt update
apt install -y python3 python3-pip nodejs npm
npm install -g pm2 serve

# Установка зависимостей
cd /root/WILD_BOT_9
pip3 install -r requirements.txt
cd wild-analytics-web && npm install && npm run build && cd ..

# Запуск
chmod +x start_pm2_no_conda.sh stop_pm2.sh view_pm2_logs.sh
./start_pm2_no_conda.sh
```

## 🌐 **Результат:**
- **Frontend**: http://93.127.214.183:3000
- **Backend**: http://93.127.214.183:8000

## 📋 **Проверка:**
```bash
pm2 status
pm2 logs
```





