# config.py
# Конфигурация для SAMP Analytics Dashboard
# Использует переменные окружения из .env файла

import os
from dotenv import load_dotenv

# Загружаем переменные из .env файла
load_dotenv()

# OpenAI API
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "YOUR_OPENAI_API_KEY_HERE")

# JWT Secret Key
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your_super_secret_jwt_key_change_this_in_production")

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./wild_analytics.db")

# API Keys
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "your_serper_api_key_here")
MPSTATS_API_KEY = os.getenv("MPSTATS_API_KEY", "691224ca5c1122.7009638641fe116d63a053fa882deefbd618dcb3")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "your_youtube_api_key_here")
VK_SERVICE_KEY = os.getenv("VK_SERVICE_KEY", "your_vk_service_key_here")

# Telegram Bot Configuration
BOT_TOKEN = os.getenv("BOT_TOKEN", "your_telegram_bot_token_here")
ADMIN_ID = int(os.getenv("ADMIN_ID", "123456789"))

# Server Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# CORS Origins
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://crm.samp.business").split(",")

# Логирование предупреждений о пустых ключах
if OPENAI_API_KEY == "YOUR_OPENAI_API_KEY_HERE":
    print("⚠️  WARNING: OPENAI_API_KEY не установлен! Создайте .env файл.")

if JWT_SECRET_KEY == "your_super_secret_jwt_key_change_this_in_production":
    print("⚠️  WARNING: JWT_SECRET_KEY использует значение по умолчанию! Измените его для production.")









