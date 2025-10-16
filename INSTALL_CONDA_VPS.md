# 🐍 Установка Conda на VPS (93.127.214.183)

## 📋 **Пошаговая установка:**

### 1. Подключение к серверу
```bash
ssh root@93.127.214.183
```

### 2. Обновление системы
```bash
apt update && apt upgrade -y
```

### 3. Установка зависимостей
```bash
apt install -y wget curl bzip2 ca-certificates
```

### 4. Скачивание и установка Miniconda
```bash
# Скачиваем Miniconda
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh

# Делаем скрипт исполняемым
chmod +x Miniconda3-latest-Linux-x86_64.sh

# Запускаем установку (отвечаем yes на все вопросы)
./Miniconda3-latest-Linux-x86_64.sh

# Перезагружаем shell или выполняем
source ~/.bashrc
```

### 5. Проверка установки
```bash
conda --version
```

### 6. Создание среды для проекта
```bash
conda create -n wildbot python=3.9 -y
conda activate wildbot
```

### 7. Установка Python зависимостей
```bash
cd /root/WILD_BOT_9
pip install -r requirements.txt
```

### 8. Установка Node.js и PM2
```bash
# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Установка PM2
npm install -g pm2 serve
```

### 9. Установка frontend зависимостей
```bash
cd wild-analytics-web
npm install
npm run build
cd ..
```

### 10. Запуск проекта
```bash
chmod +x start_pm2.sh stop_pm2.sh view_pm2_logs.sh
./start_pm2.sh
```

## 🔧 **Альтернативный способ (без conda):**

Если conda не нужна, можно использовать системный Python:

```bash
# Установка Python 3.9
apt update
apt install -y python3.9 python3.9-pip python3.9-venv

# Создание виртуальной среды
python3.9 -m venv /root/wildbot-env
source /root/wildbot-env/bin/activate

# Установка зависимостей
pip install -r requirements.txt
```

## 📊 **Проверка установки:**

```bash
# Проверка conda
conda --version

# Проверка Python
python --version

# Проверка Node.js
node --version
npm --version

# Проверка PM2
pm2 --version
```

## 🚀 **Готово!**

После установки conda можно запускать проект через PM2.


