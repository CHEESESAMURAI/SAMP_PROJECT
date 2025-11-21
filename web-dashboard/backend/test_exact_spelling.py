#!/usr/bin/env python3
"""
Тестовый скрипт для проверки точного написания "ИП Золтоев АА"
"""

import requests
import json

def test_exact_spelling():
    """Тестируем точное написание с разными пробелами"""
    
    # URL эндпоинта
    url = "http://localhost:8000/mpstats/seller"
    
    # Разные варианты написания с пробелами
    seller_variants = [
        "ИП Золтоев АА",
        "ИП Золтоев А А",  # С пробелом между инициалами
        "ИП Золтоев А.А.",  # С точками
        "ИП Золтоев А. А.",  # С точками и пробелом
        "ИП Золтоев А А",  # Двойной пробел
        "ИП Золтоев АА",  # Без пробела
    ]
    
    # Параметры запроса
    from datetime import datetime, timedelta
    
    today = datetime.now()
    one_month_ago = today - timedelta(days=30)
    
    params_base = {
        'd1': one_month_ago.strftime('%Y-%m-%d'),
        'd2': today.strftime('%Y-%m-%d'),
        'fbs': 1
    }
    
    # Данные для POST запроса
    data = {
        "startRow": 0,
        "endRow": 10,
        "filterModel": {},
        "sortModel": [{"sort": "desc", "colId": "revenue"}]
    }
    
    print("🔍 Тестируем точное написание 'ИП Золтоев АА'...")
    print("=" * 60)
    
    for seller_name in seller_variants:
        print(f"\n📋 Тестируем: '{seller_name}'")
        
        params = params_base.copy()
        params['path'] = seller_name
        
        try:
            response = requests.post(url, params=params, json=data, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                products_count = len(result.get('data', {}).get('data', []))
                total_count = result.get('data', {}).get('total', 0)
                
                print(f"✅ Статус: {response.status_code}")
                print(f"📦 Товаров в ответе: {products_count}")
                print(f"📊 Общее количество: {total_count}")
                
                if products_count > 0:
                    print(f"🎉 НАЙДЕНЫ ТОВАРЫ! Используйте название: '{seller_name}'")
                    # Показываем первый товар для примера
                    first_product = result.get('data', {}).get('data', [])[0]
                    print(f"📦 Пример товара: {first_product.get('name', 'N/A')}")
                    print(f"🏷️ Бренд: {first_product.get('brand', 'N/A')}")
                    print(f"💰 Цена: {first_product.get('final_price', 'N/A')} ₽")
                    print(f"📊 Продажи: {first_product.get('sales', 'N/A')}")
                    print(f"💰 Выручка: {first_product.get('revenue', 'N/A')} ₽")
                    break
                else:
                    print("❌ Товары не найдены")
            else:
                print(f"❌ Ошибка: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"💬 Сообщение: {error_data.get('detail', 'Неизвестная ошибка')}")
                except:
                    print(f"💬 Текст ответа: {response.text}")
                    
        except requests.exceptions.RequestException as e:
            print(f"🌐 Ошибка сети: {e}")
        except Exception as e:
            print(f"❌ Неожиданная ошибка: {e}")
        
        print("-" * 40)
    
    print("\n" + "=" * 60)
    print("🏁 Тестирование завершено")

if __name__ == "__main__":
    test_exact_spelling()
