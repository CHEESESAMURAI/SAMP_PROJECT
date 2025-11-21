#!/usr/bin/env python3
"""
Тестовый скрипт для проверки эндпоинта анализа продавцов MPStats
"""

import requests
import json

def test_seller_analysis():
    """Тестируем эндпоинт анализа продавцов"""
    
    # URL эндпоинта
    url = "http://localhost:8000/mpstats/seller"
    
    # Параметры запроса
    params = {
        'path': 'ИП Золтоев АА',
        'd1': '2024-06-01',
        'd2': '2024-07-01',
        'fbs': 0
    }
    
    # Данные для POST запроса
    data = {
        "startRow": 0,
        "endRow": 10,
        "filterModel": {},
        "sortModel": [{"sort": "desc", "colId": "revenue"}]
    }
    
    print("🔍 Тестируем эндпоинт анализа продавцов...")
    print(f"📋 URL: {url}")
    print(f"📋 Параметры: {params}")
    print(f"📋 Данные: {data}")
    
    try:
        response = requests.post(url, params=params, json=data, timeout=30)
        
        print(f"📊 Статус ответа: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Успешно!")
            print(f"📦 Получено товаров: {len(result.get('data', {}).get('data', []))}")
            print(f"📊 Общее количество: {result.get('data', {}).get('total', 0)}")
        else:
            print("❌ Ошибка!")
            try:
                error_data = response.json()
                print(f"💬 Сообщение: {error_data.get('detail', 'Неизвестная ошибка')}")
            except:
                print(f"💬 Текст ответа: {response.text}")
                
    except requests.exceptions.RequestException as e:
        print(f"🌐 Ошибка сети: {e}")
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")

if __name__ == "__main__":
    test_seller_analysis()










