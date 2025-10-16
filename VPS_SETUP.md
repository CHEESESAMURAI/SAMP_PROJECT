# 🚀 Установка Wild Analytics Dashboard на VPS

## 📋 Требования к серверу
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **RAM**: Минимум 2GB (рекомендуется 4GB+)
- **CPU**: 2 ядра+
- **Диск**: 10GB+ свободного места
- **IP**: 93.127.214.183

## 🔧 Подготовка сервера

### 1. Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Установка необходимых пакетов
```bash
sudo apt install -y curl wget git build-essential python3 python3-pip nodejs npm
```

### 3. Установка Anaconda/Miniconda
```bash
# Скачиваем Miniconda
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh

# Устанавливаем
bash Miniconda3-latest-Linux-x86_64.sh -b -p $HOME/miniconda3

# Добавляем в PATH
echo 'export PATH="$HOME/miniconda3/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 4. Создание conda среды
```bash
conda create -n wildbot python=3.9 -y
conda activate wildbot
```

### 5. Установка Python зависимостей
```bash
pip install -r requirements.txt
```

## 📁 Развертывание проекта

### 1. Клонирование/загрузка проекта
```bash
# Если проект в git
git clone <your-repo-url>
cd WILD-BOT\ 9

# Или загрузите файлы через SCP/SFTP
```

### 2. Настройка прав доступа
```bash
chmod +x start_server.sh
chmod +x stop_server.sh
chmod +x view_logs.sh
```

### 3. Настройка конфигурации
```bash
# Отредактируйте config.py с вашими API ключами
nano web-dashboard/backend/config.py
```

## 🚀 Запуск проекта

### Быстрый запуск
```bash
./start_server.sh
```

### Ручной запуск
```bash
# Backend
conda activate wildbot
cd web-dashboard/backend
python main.py &

# Frontend (в новом терминале)
cd wild-analytics-web
npm install
npm start &
```

## 🔧 Управление сервером

### Остановка
```bash
./stop_server.sh
```

### Просмотр логов
```bash
./view_logs.sh
```

### Проверка статуса
```bash
ps aux | grep -E "(python main.py|npm start)"
```

## 🌐 Настройка firewall

### Открытие портов
```bash
sudo ufw allow 3000  # Frontend
sudo ufw allow 8000  # Backend
sudo ufw enable
```

## 📊 Мониторинг

### Автозапуск при перезагрузке
```bash
# Добавить в crontab
crontab -e

# Добавить строку:
@reboot cd /path/to/project && ./start_server.sh
```

## 🔍 Устранение неполадок

### Проверка портов
```bash
netstat -tlnp | grep -E "(3000|8000)"
```

### Проверка логов
```bash
tail -f /var/log/syslog | grep -E "(python|node)"
```

### Перезапуск сервисов
```bash
./stop_server.sh
sleep 5
./start_server.sh
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `./view_logs.sh`
2. Убедитесь, что все порты открыты
3. Проверьте права доступа к файлам
4. Убедитесь, что conda среда активирована

## 🎯 Результат

После успешной установки:
- **Frontend**: http://93.127.214.183:3000
- **Backend**: http://93.127.214.183:8000
- **API Docs**: http://93.127.214.183:8000/docs





