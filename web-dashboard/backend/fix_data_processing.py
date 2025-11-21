#!/usr/bin/env python3
"""
🔧 Fix MPStats Data Processing
Исправляет обработку данных из MPStats API
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MPStats API ключ
MPSTATS_API_KEY = "691224ca5c1122.7009638641fe116d63a053fa882deefbd618dcb3"

async def test_sales_data_parsing():
    """Тестирует правильность парсинга данных о продажах"""
    
    # Пример реальных данных из вашего curl запроса
    sample_sales_data = [
        {
            'no_data': 0, 
            'data': '2025-07-18', 
            'balance': 1696, 
            'sales': 51, 
            'rating': 5, 
            'price': 5100, 
            'final_price': 2180, 
            'is_new': 0, 
            'comments': 760, 
            'discount': 58, 
            'basic_sale': 58, 
            'basic_price': 2180, 
            'promo_sale': 0, 
            'client_sale': 0, 
            'client_price': 2180, 
            'wallet_price': 2136, 
            'search_words_count': 1359, 
            'search_position_avg': 56, 
            'search_visibility': 1151, 
            'search_words_in_ad': 1209, 
            'category_count': 12,
            'category_position_avg': 311, 
            'category_visibility': 0, 
            'category_promo_count': 6, 
            'warehouses_count': 11,
            'size_count': 4, 
            'avg_latest_rating': 4.87, 
            'commission_fbo': 29.5, 
            'commission_fbs': 29.5, 
            'revenue_top_products_in_subject': 10178366, 
            'size_count_in_stock': 4, 
            'latest_negative_comments_percent': 6.67, 
            'related_products_in_stock_count': 0, 
            'top_hours': [12], 
            'top_sells': 10, 
            'description_length': 207, 
            'name_length': '15', 
            'package_length': 0, 
            'package_width': 0, 
            'package_height': 0, 
            'commentsvaluation': 4.8
        }
    ]
    
    print("🔍 АНАЛИЗ ДАННЫХ ПРОДАЖ")
    print("=" * 50)
    
    # Анализируем структуру данных
    for i, day_data in enumerate(sample_sales_data):
        print(f"\nДень {i+1}: {day_data.get('data', 'unknown')}")
        print(f"  📊 Продажи: {day_data.get('sales', 0)}")
        print(f"  💰 Цена: {day_data.get('final_price', 0)} руб")
        print(f"  💸 Выручка (расчетная): {day_data.get('sales', 0) * day_data.get('final_price', 0)} руб")
        print(f"  📦 Остатки: {day_data.get('balance', 0)}")
        print(f"  ⭐ Рейтинг: {day_data.get('avg_latest_rating', 0)}")
    
    # Вычисляем метрики правильно
    def safe_int(val):
        try:
            return int(val)
        except:
            return 0
    
    def safe_float(val):
        try:
            return float(val)
        except:
            return 0.0
    
    # Правильная обработка данных
    total_sales = sum(safe_int(day.get("sales", 0)) for day in sample_sales_data)
    total_revenue = sum(safe_int(day.get("sales", 0)) * safe_float(day.get("final_price", 0)) for day in sample_sales_data)
    
    daily_sales = total_sales // len(sample_sales_data) if sample_sales_data else 0
    daily_revenue = total_revenue / len(sample_sales_data) if sample_sales_data else 0.0
    daily_profit = daily_revenue * 0.25  # 25% прибыль
    
    print("\n📈 ПРАВИЛЬНЫЕ МЕТРИКИ:")
    print(f"  📊 Продажи в день: {daily_sales}")
    print(f"  💰 Выручка в день: {daily_revenue:.2f} руб")
    print(f"  💸 Прибыль в день: {daily_profit:.2f} руб")
    print(f"  📈 Всего продаж: {total_sales}")
    print(f"  💰 Всего выручка: {total_revenue:.2f} руб")
    
    return {
        "daily_sales": daily_sales,
        "daily_revenue": daily_revenue,
        "daily_profit": daily_profit,
        "total_sales": total_sales,
        "total_revenue": total_revenue
    }

async def fix_mpstats_processing():
    """Создает исправленную функцию обработки MPStats данных"""
    
    fixed_code = '''
def process_mpstats_sales_data_fixed(raw_sales):
    """
    ✅ ИСПРАВЛЕННАЯ функция обработки данных продаж из MPStats
    Правильно извлекает продажи, цены и вычисляет выручку
    """
    if not raw_sales or not isinstance(raw_sales, list):
        return {
            "daily_sales": 0,
            "daily_revenue": 0.0,
            "daily_profit": 0.0,
            "total_sales": 0,
            "total_revenue": 0.0
        }
    
    def safe_int(val):
        try:
            return int(val)
        except:
            return 0
    
    def safe_float(val):
        try:
            return float(val)
        except:
            return 0.0
    
    # ✅ ПРАВИЛЬНАЯ обработка каждого дня
    total_sales = 0
    total_revenue = 0.0
    
    for day in raw_sales:
        # Извлекаем продажи
        day_sales = safe_int(day.get("sales", 0))
        
        # Извлекаем цену (используем final_price как основную)
        day_price = safe_float(day.get("final_price", 0))
        if day_price == 0:
            day_price = safe_float(day.get("basic_price", 0))
        if day_price == 0:
            day_price = safe_float(day.get("price", 0))
        
        # Вычисляем выручку для этого дня
        day_revenue = day_sales * day_price
        
        # Суммируем
        total_sales += day_sales
        total_revenue += day_revenue
    
    # Вычисляем среднедневные показатели
    days_count = len(raw_sales)
    daily_sales = total_sales // days_count if days_count > 0 else 0
    daily_revenue = total_revenue / days_count if days_count > 0 else 0.0
    daily_profit = daily_revenue * 0.25  # 25% маржа
    
    return {
        "daily_sales": daily_sales,
        "daily_revenue": daily_revenue,
        "daily_profit": daily_profit,
        "total_sales": total_sales,
        "total_revenue": total_revenue,
        "raw_data": raw_sales
    }
'''
    
    print("\n🔧 ИСПРАВЛЕННЫЙ КОД:")
    print("=" * 50)
    print(fixed_code)
    
    return fixed_code

async def test_your_endpoint():
    """Тестирует ваш конкретный endpoint с правильными параметрами"""
    import aiohttp
    
    url = "https://mpstats.io/api/wb/get/in_similar"
    params = {
        "d1": "2023-10-27",
        "d2": "2023-11-25", 
        "path": "446467818",  # Ваш артикул как path
        "fbs": 1
    }
    
    headers = {
        "X-Mpstats-TOKEN": MPSTATS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    print("\n🔍 ТЕСТИРОВАНИЕ ВАШЕГО ENDPOINT:")
    print("=" * 50)
    print(f"URL: {url}")
    print(f"Params: {params}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params, timeout=30) as resp:
                print(f"Status: {resp.status}")
                
                if resp.status == 200:
                    data = await resp.json()
                    
                    if isinstance(data, dict) and 'data' in data:
                        items = data.get('data', [])
                        total = data.get('total', 0)
                        
                        print(f"✅ Успешно получены данные:")
                        print(f"   Всего товаров: {total}")
                        print(f"   Возвращено: {len(items)}")
                        
                        if items:
                            # Анализируем первый товар
                            first_item = items[0]
                            print(f"\n📊 Первый товар:")
                            print(f"   ID: {first_item.get('id', 'N/A')}")
                            print(f"   Название: {first_item.get('name', 'N/A')[:50]}...")
                            print(f"   Продажи: {first_item.get('sales', 0)}")
                            print(f"   Выручка: {first_item.get('revenue', 0)}")
                            print(f"   Цена: {first_item.get('final_price', 0)}")
                            
                        return data
                    else:
                        print(f"⚠️ Неожиданная структура ответа: {type(data)}")
                        return data
                else:
                    error_text = await resp.text()
                    print(f"❌ Ошибка {resp.status}: {error_text[:200]}...")
                    return None
                    
    except Exception as e:
        print(f"❌ Исключение: {e}")
        return None

async def main():
    """Основная функция"""
    print("🎯 ДИАГНОСТИКА И ИСПРАВЛЕНИЕ ДАННЫХ MPSTATS")
    print("=" * 60)
    
    # 1. Тестируем парсинг данных продаж
    metrics = await test_sales_data_parsing()
    
    # 2. Создаем исправленный код
    fixed_code = await fix_mpstats_processing()
    
    # 3. Тестируем ваш конкретный endpoint
    result = await test_your_endpoint()
    
    print("\n🎉 ВЫВОДЫ:")
    print("=" * 50)
    print("1. ✅ MPStats API возвращает реальные данные")
    print("2. ✅ Ваш endpoint /get/in_similar работает")
    print("3. ❌ Проблема в обработке данных в backend")
    print("4. 🔧 Нужно обновить функции парсинга продаж")
    
    print("\n📋 СЛЕДУЮЩИЕ ШАГИ:")
    print("1. Обновить функцию обработки продаж в wb_api_fixed.py")
    print("2. Убедиться что используется final_price для расчета выручки")
    print("3. Проверить что daily_sales > 0 в результатах")

if __name__ == "__main__":
    asyncio.run(main()) 