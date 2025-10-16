import requests
import json
from typing import Dict, Any, Optional

class WildberriesAPI:
    """Класс для работы с Wildberries API"""
    
    def __init__(self):
        self.base_url = "https://card.wb.ru/cards/v2/detail"
        self.default_params = {
            "appType": 1,
            "curr": "rub",
            "dest": -1257786,
            "spp": 30
        }
    
    def get_product_info(self, article: str) -> Optional[Dict[str, Any]]:
        """
        Получает информацию о товаре по артикулу
        
        Args:
            article (str): Артикул товара
            
        Returns:
            Optional[Dict[str, Any]]: Данные о товаре или None при ошибке
        """
        try:
            params = {**self.default_params, "nm": article}
            
            response = requests.get(
                self.base_url,
                params=params,
                timeout=10,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Проверяем, что товар найден
                if data.get("data") and data["data"].get("products") and len(data["data"]["products"]) > 0:
                    product = data["data"]["products"][0]
                    return self._process_product_data(product)
                else:
                    print(f"❌ Товар с артикулом {article} не найден в Wildberries")
                    return None
                    
            else:
                print(f"❌ Ошибка Wildberries API: {response.status_code}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Ошибка запроса к Wildberries API: {e}")
            return None
        except Exception as e:
            print(f"❌ Неожиданная ошибка: {e}")
            return None
    
    def _process_product_data(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """
        Обрабатывает сырые данные от Wildberries API
        
        Args:
            product (Dict[str, Any]): Сырые данные товара
            
        Returns:
            Dict[str, Any]: Обработанные данные
        """
        try:
            # Основная информация
            processed_data = {
                "name": product.get("name", ""),
                "brand": product.get("brand", ""),
                "article": str(product.get("id", "")),
                "rating": product.get("rating", 0),
                "reviews_count": product.get("feedbacks", 0),
                "pics_count": product.get("pics", 0),
                "supplier": product.get("supplier", ""),
                "supplier_id": product.get("supplierId", 0),
                "subject_name": "",  # Будем определять по названию
                "colors": product.get("colors", []),
                "sizes": product.get("sizes", [])
            }
            
            # Определяем категорию по названию товара
            if processed_data["name"]:
                name_lower = processed_data["name"].lower()
                if any(word in name_lower for word in ["бант", "заколка", "резинка", "ободок"]):
                    processed_data["subject_name"] = "/Для женщин/Аксессуары/Головные уборы"
                elif any(word in name_lower for word in ["платье", "сарафан", "юбка", "блузка", "рубашка"]):
                    processed_data["subject_name"] = "/Для женщин/Одежда/Платья"
                elif any(word in name_lower for word in ["джинсы", "брюки", "шорты"]):
                    processed_data["subject_name"] = "/Для женщин/Одежда/Джинсы и брюки"
                elif any(word in name_lower for word in ["куртка", "пальто", "шуба", "пуховик"]):
                    processed_data["subject_name"] = "/Для женщин/Одежда/Верхняя одежда"
                elif any(word in name_lower for word in ["туфли", "ботинки", "кроссовки", "сапоги"]):
                    processed_data["subject_name"] = "/Для женщин/Обувь"
                elif any(word in name_lower for word in ["сумка", "рюкзак", "кошелек"]):
                    processed_data["subject_name"] = "/Для женщин/Аксессуары/Сумки"
                else:
                    processed_data["subject_name"] = "/Для женщин/Одежда"
            
            # Цены (конвертируем из копеек в рубли)
            # В Wildberries API цены могут быть в разных полях
            current_price = None
            base_price = None
            
            # Пытаемся найти текущую цену
            if product.get("salePriceU"):
                current_price = product["salePriceU"]
            elif product.get("priceU"):
                current_price = product["priceU"]
            elif product.get("sizes") and product["sizes"]:
                # Берем цену из первого размера
                first_size = product["sizes"][0]
                if first_size.get("price", {}).get("total"):
                    current_price = first_size["price"]["total"]
                elif first_size.get("price", {}).get("product"):
                    current_price = first_size["price"]["product"]
            
            # Пытаемся найти базовую цену
            if product.get("priceU"):
                base_price = product["priceU"]
            elif product.get("sizes") and product["sizes"]:
                first_size = product["sizes"][0]
                if first_size.get("price", {}).get("basic"):
                    base_price = first_size["price"]["basic"]
                elif first_size.get("price", {}).get("product"):
                    base_price = first_size["price"]["product"]
            
            if current_price or base_price:
                processed_data["price"] = {
                    "current": round((current_price or base_price) / 100),
                    "base": round((base_price or current_price) / 100),
                    "discount": 0
                }
                
                # Вычисляем скидку если есть обе цены
                if current_price and base_price and current_price < base_price:
                    discount = ((base_price - current_price) / base_price) * 100
                    processed_data["price"]["discount"] = round(discount)
            
            # Остатки (суммируем по всем размерам)
            if product.get("sizes"):
                total_stocks = 0
                for size in product["sizes"]:
                    if size.get("stocks"):
                        for stock in size["stocks"]:
                            total_stocks += stock.get("qty", 0)
                
                processed_data["stocks"] = {
                    "total": total_stocks,
                    "fbs": total_stocks,  # В Wildberries API все остатки FBS
                    "days_in_stock": 30,
                    "days_with_sales": 30
                }
            
            # Фото товара - используем правильный алгоритм с артикулом и root
            if product.get("pics") and product.get("root") and product.get("id"):
                root = product["root"]  # Используем root для basket
                product_id = product["id"]  # Используем артикул для vol/part и URL
                pics = product["pics"]
                
                # Правильный алгоритм формирования URL по примеру пользователя
                vol = str(product_id)[:4]  # Первые 4 цифры артикула
                part = str(product_id)[:6]  # Первые 6 цифр артикула
                
                # Пробуем разные варианты basket
                basket_options = [
                    f"{root % 10:02d}",  # Последняя цифра от root
                    "19", "05", "10", "01", "02", "03", "04", "06", "07", "08", "09"
                ]
                
                print(f"🔍 Photo URL calculation: root={root}, product_id={product_id}, vol={vol}, part={part}, pics={pics}")
                
                # Формируем URL для первого изображения с разными вариантами basket
                photo_urls = []
                for basket in basket_options[:3]:  # Пробуем первые 3 варианта
                    photo_urls.append(f"https://basket-{basket}.wbbasket.ru/vol{vol}/part{part}/{product_id}/images/c516x688/1.webp")
                
                # Добавляем альтернативные форматы
                photo_urls.extend([
                    f"https://basket-{basket_options[0]}.wbbasket.ru/vol{vol}/part{part}/{product_id}/images/big/1.webp",
                    f"https://images.wbstatic.net/c516x688/{root}.jpg",
                    f"https://images.wbstatic.net/big/{root}.jpg"
                ])
                
                processed_data["photo_url"] = photo_urls[0]  # Основной URL
                processed_data["photo_urls_alternatives"] = photo_urls  # Альтернативные URL
                print(f"📸 Generated photo URLs: {photo_urls}")
                
                # Генерируем все доступные изображения
                processed_data["all_images"] = []
                for i in range(1, min(pics + 1, 11)):  # Максимум 10 изображений
                    image_url = f"https://basket-{basket_options[0]}.wbbasket.ru/vol{vol}/part{part}/{product_id}/images/c516x688/{i}.webp"
                    processed_data["all_images"].append(image_url)
            
            # Если root недоступен, используем id товара как fallback
            elif product.get("pics") and product.get("id"):
                product_id = product["id"]
                pics = product["pics"]
                
                # Fallback алгоритм с id товара
                vol = str(product_id)[:4]
                part = str(product_id)[:6]
                basket = f"{product_id % 10:02d}"  # Последняя цифра от артикула
                
                print(f"🔍 Fallback photo URL calculation: product_id={product_id}, vol={vol}, part={part}, basket={basket}")
                
                # Формируем fallback URL
                photo_urls = [
                    f"https://basket-{basket}.wbbasket.ru/vol{vol}/part{part}/{product_id}/images/c516x688/1.webp",
                    f"https://basket-{basket}.wbbasket.ru/vol{vol}/part{part}/{product_id}/images/big/1.webp"
                ]
                
                processed_data["photo_url"] = photo_urls[0]
                processed_data["photo_urls_alternatives"] = photo_urls
                print(f"📸 Generated fallback photo URLs: {photo_urls}")
                
                # Генерируем все доступные изображения
                processed_data["all_images"] = []
                for i in range(1, min(pics + 1, 11)):
                    image_url = f"https://basket-{basket}.wbbasket.ru/vol{vol}/part{part}/{product_id}/images/c516x688/{i}.webp"
                    processed_data["all_images"].append(image_url)
            
            # Цвета
            if product.get("colors"):
                processed_data["colors_info"] = {
                    "total_colors": len(product["colors"]),
                    "color_names": [color.get("name", "") for color in product["colors"]],
                    "current_color": product["colors"][0].get("name", "Не указан") if product["colors"] else "Не указан",
                    "revenue_share_percent": 100,
                    "stock_share_percent": 100
                }
            
            # Поставщик
            if product.get("supplier"):
                processed_data["supplier_info"] = {
                    "id": product.get("supplierId", 0),
                    "name": product["supplier"]
                }
            
            print(f"✅ Обработаны данные товара: {processed_data['name']} (артикул: {processed_data['article']})")
            return processed_data
            
        except Exception as e:
            print(f"❌ Ошибка обработки данных товара: {e}")
            return {}

def get_wildberries_product(article: str) -> Optional[Dict[str, Any]]:
    """
    Функция для получения данных товара из Wildberries
    
    Args:
        article (str): Артикул товара
        
    Returns:
        Optional[Dict[str, Any]]: Данные о товаре или None при ошибке
    """
    api = WildberriesAPI()
    return api.get_product_info(article)

if __name__ == "__main__":
    # Тестирование
    test_article = "215968815"
    result = get_wildberries_product(test_article)
    
    if result:
        print("✅ Тест успешен!")
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("❌ Тест не прошел")
