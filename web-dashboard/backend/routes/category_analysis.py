import logging
import statistics
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import aiohttp
import asyncio
import openai
import os

# Настройка логирования
logger = logging.getLogger(__name__)

# Настройка OpenAI
openai.api_key = "YOUR_OPENAI_API_KEY_HERE"

router = APIRouter(tags=["category_analysis"])

# === Модели данных ===

class ChartData(BaseModel):
    dates: List[str]
    values: List[float]

class CategoryAnalysisRequest(BaseModel):
    category_path: str
    date_from: str
    date_to: str
    fbs: int = 0

class ProductDetail(BaseModel):
    id: int
    name: str
    brand: str = None
    seller: str = None
    final_price: float
    sales: int
    revenue: float
    rating: float
    comments: int
    purchase: float
    balance: int
    country: str = None
    gender: str = None
    thumb_middle: str = None
    url: str = None
    # Расширенные данные
    basic_sale: float = None
    promo_sale: float = None
    client_sale: float = None
    client_price: float = None
    start_price: float = None
    final_price_max: float = None
    final_price_min: float = None
    average_if_in_stock: float = None
    category_position: int = None
    sku_first_date: str = None
    firstcommentdate: str = None
    picscount: int = None
    hasvideo: bool = None
    has3d: bool = None

class CategoryInfo(BaseModel):
    name: str
    period: str
    total_products: int
    total_revenue: float
    total_sales: int
    average_price: float
    average_rating: float
    average_purchase: float
    average_turnover_days: float
    # Новые поля
    total_suppliers: int = 0
    total_brands: int = 0
    total_articles: int = 0
    monopoly_index: float = 0.0  # Индекс монопольности (0-1, где 1 = полная монополия)
    avg_daily_suppliers_with_orders: float = 0.0
    brands_with_sales: int = 0
    articles_with_sales: int = 0

class CategoryMetrics(BaseModel):
    revenue_per_product: float
    sales_per_product: float
    products_with_sales_percentage: float
    fbs_percentage: float
    average_comments: float
    top_brands_count: int
    price_range_min: float
    price_range_max: float

class CategoryCharts(BaseModel):
    sales_graph: ChartData
    stocks_graph: ChartData
    price_graph: ChartData
    visibility_graph: ChartData

class CategoryRecommendations(BaseModel):
    insights: List[str]
    opportunities: List[str]
    threats: List[str]
    recommendations: List[str]
    market_trends: List[str]
    competitive_advantages: List[str]

class CategoryAnalysisResponse(BaseModel):
    category_info: CategoryInfo
    top_products: List[ProductDetail]
    all_products: List[ProductDetail]
    category_metrics: CategoryMetrics
    aggregated_charts: CategoryCharts
    ai_recommendations: CategoryRecommendations
    metadata: Dict[str, Any]

# === Функции обработки данных ===

def normalize_category_path(category_path: str) -> List[str]:
    """Нормализует путь категории и возвращает список возможных вариантов"""
    variants = []
    
    # Оригинальный путь
    original = category_path.strip()
    variants.append(original)
    
    # Убираем пробелы вокруг слэшей
    normalized = original.replace(' / ', '/').replace('/ ', '/').replace(' /', '/')
    if normalized != original:
        variants.append(normalized)
    
    # Заменяем слэши на пробелы со слэшами (если их нет)
    if '/' in normalized and ' / ' not in normalized:
        spaced = normalized.replace('/', ' / ')
        if spaced not in variants:
            variants.append(spaced)
    
    # Убираем двойные пробелы
    no_double_spaces = ' '.join(normalized.split())
    if no_double_spaces not in variants:
        variants.append(no_double_spaces)
    
    # Убираем пробелы в начале и конце каждого сегмента
    segments = normalized.split('/')
    cleaned_segments = [seg.strip() for seg in segments]
    cleaned_path = '/'.join(cleaned_segments)
    if cleaned_path not in variants:
        variants.append(cleaned_path)
    
    # Пробуем с маленькой буквы первого слова
    if cleaned_path:
        first_char_lower = cleaned_path[0].lower() + cleaned_path[1:] if len(cleaned_path) > 1 else cleaned_path.lower()
        if first_char_lower not in variants:
            variants.append(first_char_lower)
    
    # Пробуем вариант с заглавной буквой первого слова каждого сегмента
    title_segments = [seg.capitalize() if seg else seg for seg in cleaned_segments]
    title_path = '/'.join(title_segments)
    if title_path not in variants:
        variants.append(title_path)
    
    # Убираем дубликаты, сохраняя порядок
    seen = set()
    unique_variants = []
    for variant in variants:
        if variant and variant not in seen:
            seen.add(variant)
            unique_variants.append(variant)
    
    return unique_variants

async def fetch_mpstats_category_data(category_path: str, date_from: str, date_to: str, fbs: int) -> Dict[str, Any]:
    """Получение данных категории из MPStats API с пагинацией для получения всех товаров"""
    
    url = "https://mpstats.io/api/wb/get/category"
    headers = {
        'X-Mpstats-TOKEN': '691224ca5c1122.7009638641fe116d63a053fa882deefbd618dcb3',
        'Content-Type': 'application/json'
    }
    
    # Пробуем разные варианты пути категории
    path_variants = normalize_category_path(category_path)
    logger.info(f"🔍 Trying category path variants: {path_variants}")
    
    last_error = None
    for path_variant in path_variants:
        params = {
            'd1': date_from,
            'd2': date_to,
            'path': path_variant,
            'fbs': fbs
        }
        
        logger.info(f"🚀 Trying category path: {path_variant}")
        
        all_products = []
        start_row = 0
        batch_size = 5000  # Максимальный размер батча согласно API
        total_expected = None
        
        try:
            async with aiohttp.ClientSession() as session:
                # Сначала пробуем GET запрос (как в тестовом файле)
                try:
                    async with session.get(url, headers=headers, params=params, timeout=aiohttp.ClientTimeout(total=30)) as get_response:
                        if get_response.status == 200:
                            get_data = await get_response.json()
                            logger.info(f"📦 GET response: {json.dumps(get_data, ensure_ascii=False)[:300]}")
                            
                            # Проверяем структуру GET ответа
                            if isinstance(get_data, list):
                                all_products = get_data
                                total_expected = len(all_products)
                                logger.info(f"✅ GET request successful: {len(all_products)} products")
                                if len(all_products) > 0:
                                    return {
                                        'data': all_products,
                                        'total': len(all_products),
                                        'used_path': path_variant
                                    }
                            elif isinstance(get_data, dict):
                                get_products = get_data.get('data', get_data.get('items', []))
                                if get_products:
                                    all_products = get_products
                                    total_expected = len(all_products)
                                    logger.info(f"✅ GET request successful: {len(all_products)} products")
                                    if len(all_products) > 0:
                                        return {
                                            'data': all_products,
                                            'total': len(all_products),
                                            'used_path': path_variant
                                        }
                except Exception as get_err:
                    logger.info(f"ℹ️ GET request failed, trying POST: {str(get_err)}")
                
                # Если GET не сработал, пробуем POST с пагинацией
                while True:
                    json_data = {
                        'startRow': start_row,
                        'endRow': start_row + batch_size,
                        'filterModel': {},
                        'sortModel': []
                    }
                    
                    async with session.post(url, headers=headers, params=params, json=json_data, timeout=aiohttp.ClientTimeout(total=30)) as response:
                        logger.info(f"📊 MPStats API category response: {response.status} (batch: {start_row}-{start_row + batch_size}, path: {path_variant})")
                        
                        if response.status == 200:
                            data = await response.json()
                            
                            # Логируем полную структуру ответа для отладки
                            logger.info(f"📦 Full response structure: {json.dumps(data, ensure_ascii=False)[:500] if isinstance(data, dict) else str(data)[:500]}")
                            
                            # Проверяем разные возможные структуры ответа
                            if isinstance(data, list):
                                # Если ответ - это массив напрямую
                                products = data
                                total_expected = len(products)
                                logger.info(f"📦 Response is a list with {len(products)} items")
                            elif isinstance(data, dict):
                                # Стандартная структура с полями data и total
                                products = data.get('data', [])
                                total_expected = data.get('total', len(products))
                                
                                # Проверяем альтернативные поля
                                if not products and 'items' in data:
                                    products = data.get('items', [])
                                    logger.info(f"📦 Using 'items' field instead of 'data'")
                                if total_expected == 0 and 'count' in data:
                                    total_expected = data.get('count', 0)
                                    logger.info(f"📦 Using 'count' field instead of 'total'")
                                
                                logger.info(f"📦 Response data structure: total={total_expected}, products_count={len(products)}, keys={list(data.keys())}")
                            else:
                                logger.warning(f"⚠️ Unexpected response type: {type(data)}")
                                products = []
                                total_expected = 0
                            
                            if products:
                                all_products.extend(products)
                                logger.info(f"✅ Fetched {len(products)} products (total so far: {len(all_products)}/{total_expected})")
                            
                            # Если получили все товары или нет больше данных
                            if len(all_products) >= total_expected or len(products) == 0:
                                break
                            
                            start_row += batch_size
                        else:
                            error_text = await response.text()
                            logger.warning(f"⚠️ Error fetching category data: {response.status} - {error_text[:200]}")
                            if len(all_products) > 0:
                                # Если уже получили часть данных, возвращаем их
                                logger.warning(f"⚠️ Partial data received: {len(all_products)} products")
                                break
                            raise Exception(f"HTTP {response.status}: {error_text[:200]}")
            
            # Если получили хотя бы один продукт, возвращаем результат
            if len(all_products) > 0:
                logger.info(f"✅ Successfully fetched category data with path '{path_variant}': {len(all_products)} products")
                return {
                    'data': all_products,
                    'total': len(all_products),
                    'used_path': path_variant
                }
            else:
                logger.warning(f"⚠️ No products found for path variant: {path_variant} (total_expected={total_expected})")
                
                # Пробуем альтернативный endpoint /category/items
                try:
                    items_url = "https://mpstats.io/api/wb/get/category/items"
                    items_params = {
                        'path': path_variant,
                        'd1': date_from,
                        'd2': date_to,
                        'fbs': fbs,
                        'limit': 10000  # Максимальный лимит
                    }
                    
                    async with aiohttp.ClientSession() as items_session:
                        async with items_session.get(items_url, headers=headers, params=items_params, timeout=aiohttp.ClientTimeout(total=30)) as items_response:
                            if items_response.status == 200:
                                items_data = await items_response.json()
                                logger.info(f"📦 Items endpoint response: {json.dumps(items_data, ensure_ascii=False)[:300]}")
                                
                                if isinstance(items_data, list) and len(items_data) > 0:
                                    logger.info(f"✅ Items endpoint successful: {len(items_data)} products")
                                    return {
                                        'data': items_data,
                                        'total': len(items_data),
                                        'used_path': path_variant
                                    }
                                elif isinstance(items_data, dict):
                                    items_list = items_data.get('data', items_data.get('items', []))
                                    if isinstance(items_list, list) and len(items_list) > 0:
                                        logger.info(f"✅ Items endpoint successful: {len(items_list)} products")
                                        return {
                                            'data': items_list,
                                            'total': len(items_list),
                                            'used_path': path_variant
                                        }
                except Exception as items_err:
                    logger.info(f"ℹ️ Items endpoint failed: {str(items_err)}")
                
                # Проверяем, может быть API вернул пустой массив, но это валидный ответ
                if total_expected == 0:
                    last_error = f"API вернул 0 товаров для пути '{path_variant}' - категория пуста в указанный период"
                else:
                    last_error = f"No products found for path '{path_variant}'"
                continue
                
        except Exception as e:
            logger.warning(f"⚠️ Failed to fetch data for path '{path_variant}': {str(e)}")
            last_error = str(e)
            continue
    
    # Если ни один вариант не сработал
    logger.error(f"❌ All path variants failed. Last error: {last_error}")
    return {
        'data': [],
        'total': 0,
        'error': f"Не удалось найти данные для категории '{category_path}'. Попробованы варианты: {', '.join(path_variants)}. {last_error or 'Категория может быть пустой в указанный период или путь указан неверно.'}"
    }

def generate_dates_for_period(date_from: str, date_to: str, data_length: int = 30) -> List[str]:
    """Генерирует список дат для указанного периода"""
    
    try:
        start_date = datetime.fromisoformat(date_from)
        end_date = datetime.fromisoformat(date_to)
        
        # Если данных меньше чем дней в периоде, используем данные
        period_days = (end_date - start_date).days + 1
        actual_length = min(data_length, period_days, 30)  # Ограничиваем 30 днями
        
        dates = []
        for i in range(actual_length):
            current_date = end_date - timedelta(days=actual_length - 1 - i)
            dates.append(current_date.strftime("%Y-%m-%d"))
        
        return dates
    except Exception as e:
        logger.warning(f"Error generating dates: {e}")
        # Возвращаем последние 30 дней
        today = datetime.now()
        return [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(29, -1, -1)]

def process_category_info(category_path: str, date_from: str, date_to: str, products: List[Dict], 
                         additional_data: Dict[str, Any] = None) -> CategoryInfo:
    """Обработка общей информации о категории"""
    
    total_products = len(products)
    total_revenue = sum(product.get('revenue', 0) for product in products)
    total_sales = sum(product.get('sales', 0) for product in products)
    
    prices = [product.get('final_price', 0) for product in products if product.get('final_price', 0) > 0]
    average_price = statistics.mean(prices) if prices else 0
    
    ratings = [product.get('rating', 0) for product in products if product.get('rating', 0) > 0]
    average_rating = statistics.mean(ratings) if ratings else 0
    
    purchases = [product.get('purchase', 0) for product in products if product.get('purchase', 0) > 0]
    average_purchase = statistics.mean(purchases) if purchases else 0
    
    turnover_days = [product.get('turnover_days', 0) for product in products if product.get('turnover_days', 0) > 0]
    average_turnover_days = statistics.mean(turnover_days) if turnover_days else 0
    
    # Вычисляем новые метрики из данных продуктов
    unique_suppliers = set()
    unique_brands = set()
    unique_articles = set()
    articles_with_sales_set = set()
    brands_with_sales_set = set()
    suppliers_with_sales_set = set()
    
    for product in products:
        supplier_id = product.get('supplier_id')
        if supplier_id:
            unique_suppliers.add(supplier_id)
            if product.get('sales', 0) > 0:
                suppliers_with_sales_set.add(supplier_id)
        
        brand = product.get('brand')
        if brand:
            unique_brands.add(brand)
            if product.get('sales', 0) > 0:
                brands_with_sales_set.add(brand)
        
        article_id = product.get('id')
        if article_id:
            unique_articles.add(article_id)
            if product.get('sales', 0) > 0:
                articles_with_sales_set.add(article_id)
    
    total_suppliers = len(unique_suppliers)
    total_brands = len(unique_brands)
    total_articles = len(unique_articles)
    brands_with_sales = len(brands_with_sales_set)
    articles_with_sales = len(articles_with_sales_set)
    
    # Вычисляем индекс монопольности (доля выручки топ-1 продавца)
    supplier_revenue = {}
    for product in products:
        supplier_id = product.get('supplier_id')
        if supplier_id:
            supplier_revenue[supplier_id] = supplier_revenue.get(supplier_id, 0) + product.get('revenue', 0)
    
    monopoly_index = 0.0
    if supplier_revenue and total_revenue > 0:
        max_supplier_revenue = max(supplier_revenue.values())
        monopoly_index = round(max_supplier_revenue / total_revenue, 3)
    
    # Среднесуточное количество поставщиков с заказами
    # Используем данные из additional_data если доступны, иначе вычисляем из продуктов
    avg_daily_suppliers_with_orders = 0.0
    if additional_data and 'by_date' in additional_data:
        # Вычисляем среднее из данных по дням
        daily_suppliers = [day.get('sellers_with_sells', 0) for day in additional_data['by_date'] if isinstance(day, dict)]
        if daily_suppliers:
            avg_daily_suppliers_with_orders = round(statistics.mean(daily_suppliers), 1)
    else:
        # Вычисляем приблизительно: количество поставщиков с продажами / количество дней
        try:
            start_date = datetime.fromisoformat(date_from)
            end_date = datetime.fromisoformat(date_to)
            days_count = (end_date - start_date).days + 1
            if days_count > 0:
                avg_daily_suppliers_with_orders = round(len(suppliers_with_sales_set) / days_count, 1)
        except:
            avg_daily_suppliers_with_orders = round(len(suppliers_with_sales_set), 1)
    
    # Если есть данные из дополнительных эндпоинтов, используем их
    if additional_data:
        if 'subcategories' in additional_data and isinstance(additional_data['subcategories'], list) and len(additional_data['subcategories']) > 0:
            # Берем данные из первой подкатегории (текущая категория)
            subcat_data = additional_data['subcategories'][0]
            total_suppliers = subcat_data.get('sellers', total_suppliers)
            total_brands = subcat_data.get('brands', total_brands)
            total_articles = subcat_data.get('items', total_articles)
            brands_with_sales = subcat_data.get('brands_with_sells', brands_with_sales)
            articles_with_sales = subcat_data.get('items_with_sells', articles_with_sales)
            if 'sellers_with_sells' in subcat_data:
                sellers_with_sells_count = subcat_data.get('sellers_with_sells', 0)
                try:
                    start_date = datetime.fromisoformat(date_from)
                    end_date = datetime.fromisoformat(date_to)
                    days_count = (end_date - start_date).days + 1
                    if days_count > 0:
                        avg_daily_suppliers_with_orders = round(sellers_with_sells_count / days_count, 1)
                except:
                    avg_daily_suppliers_with_orders = round(sellers_with_sells_count, 1)
        
        if 'items' in additional_data and isinstance(additional_data['items'], list) and len(additional_data['items']) > 0:
            # Берем данные из первого предмета (текущая категория)
            items_data = additional_data['items'][0]
            total_articles = items_data.get('items', total_articles)
            articles_with_sales = items_data.get('items_with_sells', articles_with_sales)
            total_brands = items_data.get('brands', total_brands)
            brands_with_sales = items_data.get('brands_with_sells', brands_with_sales)
            total_suppliers = items_data.get('sellers', total_suppliers)
    
    return CategoryInfo(
        name=category_path,
        period=f"{date_from} - {date_to}",
        total_products=total_products,
        total_revenue=total_revenue,
        total_sales=total_sales,
        average_price=round(average_price, 2),
        average_rating=round(average_rating, 2),
        average_purchase=round(average_purchase, 2),
        average_turnover_days=round(average_turnover_days, 1),
        total_suppliers=total_suppliers,
        total_brands=total_brands,
        total_articles=total_articles,
        monopoly_index=monopoly_index,
        avg_daily_suppliers_with_orders=avg_daily_suppliers_with_orders,
        brands_with_sales=brands_with_sales,
        articles_with_sales=articles_with_sales
    )

def process_top_products(products: List[Dict], limit: int = 10) -> List[ProductDetail]:
    """Обработка топ товаров по выручке"""
    
    # Сортируем по выручке
    sorted_products = sorted(products, key=lambda x: x.get('revenue', 0), reverse=True)
    top_products = sorted_products[:limit]
    
    result = []
    for product in top_products:
        result.append(ProductDetail(
            id=product.get('id', 0),
            name=product.get('name', ''),
            brand=product.get('brand'),
            seller=product.get('seller'),
            final_price=product.get('final_price', 0),
            sales=product.get('sales', 0),
            revenue=product.get('revenue', 0),
            rating=product.get('rating', 0),
            comments=product.get('comments', 0),
            purchase=product.get('purchase', 0),
            balance=product.get('balance', 0),
            country=product.get('country'),
            gender=product.get('gender'),
            thumb_middle=product.get('thumb_middle'),
            url=product.get('url'),
            # Расширенные данные
            basic_sale=product.get('basic_sale'),
            promo_sale=product.get('promo_sale'),
            client_sale=product.get('client_sale'),
            client_price=product.get('client_price'),
            start_price=product.get('start_price'),
            final_price_max=product.get('final_price_max'),
            final_price_min=product.get('final_price_min'),
            average_if_in_stock=product.get('average_if_in_stock'),
            category_position=product.get('category_position'),
            sku_first_date=product.get('sku_first_date'),
            firstcommentdate=product.get('firstcommentdate'),
            picscount=product.get('picscount'),
            hasvideo=product.get('hasvideo'),
            has3d=product.get('has3d')
        ))
    
    return result

def process_all_products(products: List[Dict]) -> List[ProductDetail]:
    """Обработка всех товаров для таблицы"""
    
    result = []
    for product in products:
        result.append(ProductDetail(
            id=product.get('id', 0),
            name=product.get('name', ''),
            brand=product.get('brand'),
            seller=product.get('seller'),
            final_price=product.get('final_price', 0),
            sales=product.get('sales', 0),
            revenue=product.get('revenue', 0),
            rating=product.get('rating', 0),
            comments=product.get('comments', 0),
            purchase=product.get('purchase', 0),
            balance=product.get('balance', 0),
            country=product.get('country'),
            gender=product.get('gender'),
            thumb_middle=product.get('thumb_middle'),
            url=product.get('url'),
            # Расширенные данные
            basic_sale=product.get('basic_sale'),
            promo_sale=product.get('promo_sale'),
            client_sale=product.get('client_sale'),
            client_price=product.get('client_price'),
            start_price=product.get('start_price'),
            final_price_max=product.get('final_price_max'),
            final_price_min=product.get('final_price_min'),
            average_if_in_stock=product.get('average_if_in_stock'),
            category_position=product.get('category_position'),
            sku_first_date=product.get('sku_first_date'),
            firstcommentdate=product.get('firstcommentdate'),
            picscount=product.get('picscount'),
            hasvideo=product.get('hasvideo'),
            has3d=product.get('has3d')
        ))
    
    return result

def process_category_metrics(products: List[Dict]) -> CategoryMetrics:
    """Обработка дополнительных метрик категории"""
    
    total_products = len(products)
    if total_products == 0:
        return CategoryMetrics(
            revenue_per_product=0,
            sales_per_product=0,
            products_with_sales_percentage=0,
            fbs_percentage=0,
            average_comments=0,
            top_brands_count=0,
            price_range_min=0,
            price_range_max=0
        )
    
    total_revenue = sum(product.get('revenue', 0) for product in products)
    total_sales = sum(product.get('sales', 0) for product in products)
    
    products_with_sales = len([p for p in products if p.get('sales', 0) > 0])
    products_with_sales_percentage = (products_with_sales / total_products) * 100
    
    fbs_products = len([p for p in products if p.get('fbs', False)])
    fbs_percentage = (fbs_products / total_products) * 100
    
    total_comments = sum(product.get('comments', 0) for product in products)
    average_comments = total_comments / total_products
    
    brands = set(product.get('brand', '') for product in products if product.get('brand'))
    top_brands_count = len(brands)
    
    prices = [product.get('final_price', 0) for product in products if product.get('final_price', 0) > 0]
    price_range_min = min(prices) if prices else 0
    price_range_max = max(prices) if prices else 0
    
    return CategoryMetrics(
        revenue_per_product=round(total_revenue / total_products, 2),
        sales_per_product=round(total_sales / total_products, 2),
        products_with_sales_percentage=round(products_with_sales_percentage, 1),
        fbs_percentage=round(fbs_percentage, 1),
        average_comments=round(average_comments, 1),
        top_brands_count=top_brands_count,
        price_range_min=price_range_min,
        price_range_max=price_range_max
    )

def process_aggregated_charts(products: List[Dict], date_from: str, date_to: str) -> CategoryCharts:
    """Обработка агрегированных графиков с исправленной логикой"""
    
    if not products:
        empty_dates = generate_dates_for_period(date_from, date_to, 30)
        empty_values = [0.0] * len(empty_dates)
        return CategoryCharts(
            sales_graph=ChartData(dates=empty_dates, values=empty_values),
            stocks_graph=ChartData(dates=empty_dates, values=empty_values),
            price_graph=ChartData(dates=empty_dates, values=empty_values),
            visibility_graph=ChartData(dates=empty_dates, values=empty_values)
        )
    
    # Определяем максимальную длину графиков
    max_length = 0
    for product in products:
        for graph_type in ["graph", "stocks_graph", "price_graph", "product_visibility_graph"]:
            graph_data = product.get(graph_type, [])
            if isinstance(graph_data, list):
                max_length = max(max_length, len(graph_data))
    
    # Если нет данных графиков, создаем пустые
    if max_length == 0:
        dates = generate_dates_for_period(date_from, date_to, 30)
        values = [0.0] * len(dates)
        return CategoryCharts(
            sales_graph=ChartData(dates=dates, values=values),
            stocks_graph=ChartData(dates=dates, values=values),
            price_graph=ChartData(dates=dates, values=values),
            visibility_graph=ChartData(dates=dates, values=values)
        )
    
    # Ограничиваем длину графика 30 днями
    max_length = min(max_length, 30)
    
    # Генерируем даты для графиков
    dates = generate_dates_for_period(date_from, date_to, max_length)
    
    # Инициализируем агрегированные массивы
    aggregated_sales = [0.0] * max_length
    aggregated_stocks = [0.0] * max_length
    aggregated_prices = []
    aggregated_visibility = [0.0] * max_length
    
    # Агрегируем данные по дням
    for i in range(max_length):
        sales_sum = 0.0
        stocks_sum = 0.0
        prices_for_avg = []
        visibility_sum = 0.0
        
        for product in products:
            # Продажи - суммируем (graph - это массив)
            sales_graph = product.get("graph", [])
            if isinstance(sales_graph, list) and i < len(sales_graph):
                sales_val = sales_graph[i] or 0
                sales_sum += float(sales_val)
            
            # Остатки - суммируем (stocks_graph - это массив)
            stocks_graph = product.get("stocks_graph", [])
            if isinstance(stocks_graph, list) and i < len(stocks_graph):
                stocks_val = stocks_graph[i] or 0
                stocks_sum += float(stocks_val)
            
            # Цены - берем для усреднения (price_graph - это массив)
            price_graph = product.get("price_graph", [])
            if isinstance(price_graph, list) and i < len(price_graph):
                price = price_graph[i] or 0
                if price > 0:
                    prices_for_avg.append(float(price))
            
            # Видимость - суммируем (product_visibility_graph - это массив)
            visibility_graph = product.get("product_visibility_graph", [])
            if isinstance(visibility_graph, list) and i < len(visibility_graph):
                visibility_val = visibility_graph[i] or 0
                visibility_sum += float(visibility_val)
        
        aggregated_sales[i] = sales_sum
        aggregated_stocks[i] = stocks_sum
        aggregated_visibility[i] = visibility_sum
        
        # Средняя цена
        avg_price = statistics.mean(prices_for_avg) if prices_for_avg else 0.0
        aggregated_prices.append(round(avg_price, 2))
    
    return CategoryCharts(
        sales_graph=ChartData(dates=dates, values=aggregated_sales),
        stocks_graph=ChartData(dates=dates, values=aggregated_stocks),
        price_graph=ChartData(dates=dates, values=aggregated_prices),
        visibility_graph=ChartData(dates=dates, values=aggregated_visibility)
    )

async def generate_ai_recommendations(category_info: CategoryInfo, products: List[Dict], category_metrics: CategoryMetrics) -> CategoryRecommendations:
    """Генерация рекомендаций с использованием OpenAI"""
    
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key="YOUR_OPENAI_API_KEY_HERE")
        
        # Формируем контекст для AI
        context = f"""
Категория: {category_info.name}
Период анализа: {category_info.period}
Общее количество товаров: {category_info.total_products}
Общая выручка: {category_info.total_revenue:,.0f} ₽
Общие продажи: {category_info.total_sales:,} шт.
Средняя цена: {category_info.average_price:,.0f} ₽
Средний рейтинг: {category_info.average_rating:.1f}/5
Средний процент выкупа: {category_info.average_purchase:.1f}%
Дни оборачиваемости: {category_info.average_turnover_days:.1f}

Дополнительные метрики:
- Выручка на товар: {category_metrics.revenue_per_product:,.0f} ₽
- Продаж на товар: {category_metrics.sales_per_product:.1f}
- Товаров с продажами: {category_metrics.products_with_sales_percentage:.1f}%
- FBS товаров: {category_metrics.fbs_percentage:.1f}%
- Количество брендов: {category_metrics.top_brands_count}
- Диапазон цен: {category_metrics.price_range_min:,.0f} - {category_metrics.price_range_max:,.0f} ₽

Топ-5 товаров по выручке:
"""
        
        # Добавляем информацию о топ товарах
        top_5_products = sorted(products, key=lambda x: x.get('revenue', 0), reverse=True)[:5]
        for i, product in enumerate(top_5_products, 1):
            context += f"\n{i}. {product.get('name', 'Без названия')[:50]}..."
            context += f"\n   Бренд: {product.get('brand', 'Неизвестно')}"
            context += f"\n   Выручка: {product.get('revenue', 0):,.0f} ₽"
            context += f"\n   Продажи: {product.get('sales', 0):,} шт."
            context += f"\n   Рейтинг: {product.get('rating', 0):.1f}/5"

        # Запрос к OpenAI с новым API
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "Ты - эксперт по анализу маркетплейсов и e-commerce аналитике. Проанализируй данные категории Wildberries и дай профессиональные рекомендации на русском языке."
                },
                {
                    "role": "user",
                    "content": f"{context}\n\nНа основе этих данных предоставь:\n1. Ключевые инсайты (3-4 пункта)\n2. Возможности для роста (3-4 пункта)\n3. Потенциальные угрозы (2-3 пункта)\n4. Конкретные рекомендации (4-5 пунктов)\n5. Рыночные тренды (2-3 пункта)\n6. Конкурентные преимущества (2-3 пункта)"
                }
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        ai_text = response.choices[0].message.content
        
        # Парсим ответ AI и структурируем
        return parse_ai_recommendations(ai_text)
        
    except Exception as e:
        logger.warning(f"Failed to generate AI recommendations: {e}")
        # Fallback к базовым рекомендациям
        return generate_fallback_recommendations(category_info, category_metrics)

def parse_ai_recommendations(ai_text: str) -> CategoryRecommendations:
    """Парсинг ответа от AI в структурированный формат"""
    
    try:
        sections = {
            "insights": [],
            "opportunities": [],
            "threats": [],
            "recommendations": [],
            "market_trends": [],
            "competitive_advantages": []
        }
        
        current_section = None
        
        for line in ai_text.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            # Определяем секцию
            line_lower = line.lower()
            if any(word in line_lower for word in ['инсайт', 'insight', 'ключевые']):
                current_section = "insights"
            elif any(word in line_lower for word in ['возможност', 'opportunity', 'рост']):
                current_section = "opportunities"
            elif any(word in line_lower for word in ['угроз', 'threat', 'риск']):
                current_section = "threats"
            elif any(word in line_lower for word in ['рекомендаци', 'recommend']):
                current_section = "recommendations"
            elif any(word in line_lower for word in ['тренд', 'trend']):
                current_section = "market_trends"
            elif any(word in line_lower for word in ['преимущест', 'advantage']):
                current_section = "competitive_advantages"
            elif line.startswith(('•', '-', '*', '1.', '2.', '3.', '4.', '5.')) and current_section:
                # Убираем маркеры списка
                clean_line = line.lstrip('•-*123456789. ')
                if clean_line:
                    sections[current_section].append(clean_line)
        
        return CategoryRecommendations(**sections)
        
    except Exception as e:
        logger.warning(f"Failed to parse AI recommendations: {e}")
        return CategoryRecommendations(
            insights=["Не удалось обработать рекомендации AI"],
            opportunities=[],
            threats=[],
            recommendations=[],
            market_trends=[],
            competitive_advantages=[]
        )

def generate_fallback_recommendations(category_info: CategoryInfo, category_metrics: CategoryMetrics) -> CategoryRecommendations:
    """Генерация fallback рекомендаций при недоступности AI"""
    
    insights = []
    opportunities = []
    threats = []
    recommendations = []
    market_trends = []
    competitive_advantages = []
    
    # Анализ на основе метрик
    if category_info.average_rating >= 4.5:
        insights.append(f"Высокий рейтинг товаров ({category_info.average_rating:.1f}/5) указывает на качественную продукцию в категории")
    elif category_info.average_rating <= 3.5:
        opportunities.append("Возможность выделиться качеством - средний рейтинг категории невысокий")
    
    if category_info.average_purchase >= 70:
        insights.append(f"Отличный процент выкупа ({category_info.average_purchase:.1f}%) показывает высокий спрос")
    elif category_info.average_purchase <= 40:
        threats.append("Низкий процент выкупа может указывать на проблемы с качеством или ценообразованием")
    
    if category_metrics.products_with_sales_percentage <= 50:
        opportunities.append("Многие товары не продаются - есть возможность захватить их долю рынка")
        
    if category_metrics.fbs_percentage <= 30:
        opportunities.append("Низкая доля FBS товаров - возможность получить преимущество через быструю доставку")
    
    if category_info.average_turnover_days <= 10:
        competitive_advantages.append("Быстрая оборачиваемость товаров в категории")
    elif category_info.average_turnover_days >= 30:
        threats.append("Медленная оборачиваемость может привести к затовариванию")
    
    # Общие рекомендации
    recommendations.extend([
        "Мониторить топ товары и их стратегии ценообразования",
        "Анализировать отзывы лидеров для выявления потребностей покупателей",
        "Отслеживать сезонные колебания спроса",
        "Изучить успешные маркетинговые стратегии конкурентов"
    ])
    
    market_trends.extend([
        "Рост конкуренции в популярных нишах",
        "Важность качественного контента и изображений"
    ])
    
    return CategoryRecommendations(
        insights=insights,
        opportunities=opportunities,
        threats=threats,
        recommendations=recommendations,
        market_trends=market_trends,
        competitive_advantages=competitive_advantages
    )

@router.post("/category-analysis", response_model=CategoryAnalysisResponse)
async def analyze_category(request: CategoryAnalysisRequest):
    """Эндпоинт для анализа категории"""
    
    try:
        logger.info(f"🎯 Category analysis request: {request.category_path}")
        
        # Получаем данные из MPStats API
        external_data = await fetch_mpstats_category_data(
            request.category_path, 
            request.date_from, 
            request.date_to, 
            request.fbs
        )
        
        products = external_data.get('data', [])
        error_message = external_data.get('error')
        used_path = external_data.get('used_path', request.category_path)  # Используем успешный путь или оригинальный
        
        if not products:
            logger.warning(f"⚠️ No products found for category: {request.category_path}")
            detail_message = error_message or f"No products found for category '{request.category_path}' in the specified period."
            raise HTTPException(status_code=404, detail=detail_message)
        
        logger.info(f"📊 Processing {len(products)} products for category analysis (used path: {used_path})")
        
        # Получаем дополнительные данные из MPStats API
        additional_data = {}
        try:
            # Получаем данные из дополнительных эндпоинтов параллельно
            async with aiohttp.ClientSession() as session:
                headers = {
                    'X-Mpstats-TOKEN': '691224ca5c1122.7009638641fe116d63a053fa882deefbd618dcb3',
                    'Content-Type': 'application/json'
                }
                params = {
                    'd1': request.date_from,
                    'd2': request.date_to,
                    'path': used_path,  # Используем успешный путь
                    'fbs': request.fbs
                }
                
                # Запросы к дополнительным эндпоинтам
                tasks = []
                endpoints = {
                    'subcategories': 'category/subcategories',
                    'items': 'category/items',
                    'by_date': 'category/by_date'
                }
                
                for key, endpoint in endpoints.items():
                    url = f"https://mpstats.io/api/wb/get/{endpoint}"
                    if key == 'by_date':
                        params_with_group = {**params, 'groupBy': 'day'}
                        task = session.get(url, headers=headers, params=params_with_group)
                    else:
                        task = session.get(url, headers=headers, params=params)
                    tasks.append((key, task))
                
                # Выполняем запросы
                for key, task in tasks:
                    try:
                        async with task as response:
                            if response.status == 200:
                                data = await response.json()
                                additional_data[key] = data
                                logger.info(f"✅ Fetched {key} data: {len(data) if isinstance(data, list) else 'object'}")
                    except Exception as e:
                        logger.warning(f"⚠️ Failed to fetch {key} data: {e}")
        except Exception as e:
            logger.warning(f"⚠️ Failed to fetch additional data: {e}")
        
        # Обрабатываем данные
        category_info = process_category_info(request.category_path, request.date_from, request.date_to, products, additional_data)
        top_products = process_top_products(products, 10)
        all_products = process_all_products(products)
        category_metrics = process_category_metrics(products)
        aggregated_charts = process_aggregated_charts(products, request.date_from, request.date_to)
        
        # Генерируем AI рекомендации
        ai_recommendations = await generate_ai_recommendations(category_info, products, category_metrics)
        
        # Метаданные
        metadata = {
            "processing_info": {
                "data_source": "SAMP Analytics Intelligence",
                "processing_timestamp": datetime.now().isoformat(),
                "total_products_found": len(products),
                "period": f"{request.date_from} to {request.date_to}",
                "fbs_filter": request.fbs
            }
        }
        
        logger.info(f"✅ Category analysis completed successfully for: {request.category_path}")
        
        return CategoryAnalysisResponse(
            category_info=category_info,
            top_products=top_products,
            all_products=all_products,
            category_metrics=category_metrics,
            aggregated_charts=aggregated_charts,
            ai_recommendations=ai_recommendations,
            metadata=metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in category analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") 