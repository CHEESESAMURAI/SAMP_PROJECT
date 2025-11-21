from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any, Optional
import httpx
import os
import logging
from datetime import datetime, timedelta

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# MPStats API конфигурация
MPSTATS_BASE_URL = "https://mpstats.io/api/wb/get"
MPSTATS_TOKEN = os.getenv('MPSTATS_TOKEN', '5f356bf2a55695.18670170077856385aaba91fb0b6b76bb7533b52')

# Для отладки попробуем разные endpoints
IDENTICAL_ENDPOINTS = [
    "/identical",  # Оригинальный endpoint
    "/similar",    # Альтернативный endpoint
    "/competitors", # Дополнительный endpoint
    ""  # Попробовать просто базовый endpoint без суффикса
]


async def make_mpstats_request(endpoint: str, params: dict = None) -> List[Dict[str, Any]]:
    """Выполняет запрос к MPStats API"""
    try:
        url = f"{MPSTATS_BASE_URL}/{endpoint}"
        headers = {
            "X-Mpstats-TOKEN": MPSTATS_TOKEN,
            "Content-Type": "application/json"
        }

        logger.info(f"📡 Request URL: {url}")
        logger.info(f"📡 Request params: {params}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)

            logger.info(f"📡 Response status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ Successfully received {len(data)} items")
                return data
            elif response.status_code == 429:
                logger.warning("MPStats API rate limit exceeded")
                return []
            elif response.status_code == 405:
                logger.warning("MPStats API method not allowed")
                return []
            else:
                logger.error(f"MPStats API error: {response.status_code} - {response.text}")
                return []

    except Exception as e:
        logger.error(f"Error making MPStats request: {e}")
        return []


async def get_mpstats_competitors_data_async(article: str, fbs: int = 1, days: int = 30) -> List[Dict[str, Any]]:
    """
    Получает данные аналогичных товаров из MPStats API

    Args:
        article: Артикул товара
        fbs: Параметр FBS (1 - с FBS, 0 - без FBS)
        days: Количество дней для анализа

    Returns:
        Список данных аналогичных товаров
    """
    try:
        # Вычисляем даты для периода - с начала года до сегодня
        end_date = datetime.now()
        start_date = datetime(end_date.year, 1, 1)  # С начала года

        d1 = start_date.strftime('%Y-%m-%d')
        d2 = end_date.strftime('%Y-%m-%d')

        logger.info(f"🔍 Fetching competitors data for article {article} from {d1} to {d2}")

        # Пробуем разные endpoints для получения данных конкурентов
        for endpoint in IDENTICAL_ENDPOINTS:
            try:
                if endpoint == "":  # Пустой endpoint для базового URL
                    full_endpoint = f"item/{article}"
                else:
                    full_endpoint = f"item/{article}{endpoint}"

                params = {
                    'd1': d1,
                    'd2': d2,
                    'fbs': fbs
                }

                logger.info(f"📡 Trying endpoint: {full_endpoint}")

                data = await make_mpstats_request(full_endpoint, params)

                if data and len(data) > 0:
                    logger.info(f"✅ Successfully received {len(data)} competitors for article {article} via {endpoint}")
                    return data
                else:
                    logger.warning(f"⚠️ No data from endpoint {endpoint}")
                    continue

            except Exception as e:
                logger.warning(f"⚠️ Error with endpoint {endpoint}: {str(e)}")
                continue

        # Альтернативный метод: попробуем получить данные через поиск в категории
        logger.info(f"🔄 Trying alternative method to get competitors data for article {article}")

        try:
            # Сначала получим информацию о товаре для определения категории
            product_data = await make_mpstats_request(f"item/{article}")

            if product_data and len(product_data) > 0:
                product_info = product_data[0] if isinstance(product_data, list) else product_data
                category = product_info.get('subject', '')

                if category:
                    logger.info(f"📂 Found product category: {category}")

                    # Теперь попробуем найти похожие товары через категорию
                    # Это может быть другой endpoint в MPStats API
                    category_data = await make_mpstats_request("category", {
                        'path': category,
                        'd1': d1,
                        'd2': d2,
                        'fbs': fbs,
                        'limit': 10
                    })

                    if category_data and len(category_data) > 0:
                        # Фильтруем товары, исключая текущий артикул
                        filtered_data = [item for item in category_data if str(item.get('id', '')) != str(article)]
                        logger.info(f"✅ Successfully received {len(filtered_data)} competitors via category search")
                        return filtered_data[:6]  # Возвращаем первые 6 товаров

        except Exception as e:
            logger.error(f"❌ Error in alternative method: {str(e)}")

        logger.warning(f"⚠️ All methods failed for article {article}")
        return []


@router.get("/mpstats-competitors/{article}")
async def get_competitors_data(
    article: str,
    fbs: int = 1,
    authorization: str = Header(None)
):
    """
    Получает данные аналогичных товаров для указанного артикула

    Args:
        article: Артикул товара
        fbs: Параметр FBS (1 - с FBS, 0 - без FBS)
        authorization: Токен авторизации

    Returns:
        Данные аналогичных товаров
    """
    try:
        logger.info(f"🔍 Starting competitors analysis for article: {article}")

        # Получаем данные конкурентов (используем период с начала года)
        competitors_data = await get_mpstats_competitors_data_async(article, fbs)

        if not competitors_data:
            logger.warning(f"⚠️ No competitors data found for article {article}")
            return {
                "status": "success",
                "message": "No competitors data available",
                "data": [],
                "count": 0,
                "period": {
                    "start_date": datetime.now().strftime('%Y-01-01'),
                    "end_date": datetime.now().strftime('%Y-%m-%d'),
                    "fbs": fbs
                }
            }

        # Обрабатываем и форматируем данные
        processed_data = []
        for competitor in competitors_data:
            try:
                processed_competitor = {
                    "id": competitor.get("id"),
                    "name": competitor.get("name", ""),
                    "brand": competitor.get("brand", ""),
                    "seller": competitor.get("seller", ""),
                    "supplier_id": competitor.get("supplier_id"),
                    "color": competitor.get("color", ""),
                    "balance": competitor.get("balance", 0),
                    "balance_fbs": competitor.get("balance_fbs", 0),
                    "comments": competitor.get("comments", 0),
                    "rating": competitor.get("rating", 0),
                    "final_price": competitor.get("final_price", 0),
                    "final_price_max": competitor.get("final_price_max", 0),
                    "final_price_min": competitor.get("final_price_min", 0),
                    "final_price_average": competitor.get("final_price_average", 0),
                    "final_price_median": competitor.get("final_price_median", 0),
                    "basic_sale": competitor.get("basic_sale", 0),
                    "basic_price": competitor.get("basic_price", 0),
                    "promo_sale": competitor.get("promo_sale", 0),
                    "client_sale": competitor.get("client_sale", 0),
                    "client_price": competitor.get("client_price", 0),
                    "start_price": competitor.get("start_price", 0),
                    "sales": competitor.get("sales", 0),
                    "sales_per_day_average": competitor.get("sales_per_day_average", 0),
                    "revenue": competitor.get("revenue", 0),
                    "percent_from_revenue": competitor.get("percent_from_revenue", 0),
                    "revenue_potential": competitor.get("revenue_potential", 0),
                    "revenue_average": competitor.get("revenue_average", 0),
                    "lost_profit": competitor.get("lost_profit", 0),
                    "lost_profit_percent": competitor.get("lost_profit_percent", 0),
                    "days_in_stock": competitor.get("days_in_stock", 0),
                    "days_with_sales": competitor.get("days_with_sales", 0),
                    "average_if_in_stock": competitor.get("average_if_in_stock", 0),
                    "is_fbs": competitor.get("is_fbs", 0),
                    "subject_id": competitor.get("subject_id"),
                    "subject": competitor.get("subject", ""),
                    "purchase": competitor.get("purchase", 0),
                    "purchase_after_return": competitor.get("purchase_after_return", 0),
                    "country": competitor.get("country", ""),
                    "gender": competitor.get("gender", ""),
                    "sku_first_date": competitor.get("sku_first_date", ""),
                    "firstcommentdate": competitor.get("firstcommentdate", ""),
                    "picscount": competitor.get("picscount", 0),
                    "has3d": competitor.get("has3d", 0),
                    "hasvideo": competitor.get("hasvideo", 0),
                    "commentsvaluation": competitor.get("commentsvaluation", 0),
                    "cardratingval": competitor.get("cardratingval", 0),
                    "categories_last_count": competitor.get("categories_last_count", 0),
                    "category": competitor.get("category", ""),
                    "category_position": competitor.get("category_position", 0),
                    "product_visibility_graph": competitor.get("product_visibility_graph", []),
                    "category_graph": competitor.get("category_graph", []),
                    "graph": competitor.get("graph", []),
                    "stocks_graph": competitor.get("stocks_graph", []),
                    "price_graph": competitor.get("price_graph", []),
                    "thumb": competitor.get("thumb", ""),
                    "thumb_middle": competitor.get("thumb_middle", ""),
                    "url": competitor.get("url", ""),
                    "turnover_days": competitor.get("turnover_days", 0),
                    "turnover_once": competitor.get("turnover_once", 0),
                    "warehouses_count": competitor.get("warehouses_count", ""),
                    "distance": competitor.get("distance", 0)
                }
                processed_data.append(processed_competitor)
            except Exception as e:
                logger.error(f"❌ Error processing competitor data: {str(e)}")
                continue

        logger.info(f"✅ Successfully processed {len(processed_data)} competitors for article {article}")

        return {
            "status": "success",
            "message": f"Found {len(processed_data)} competitors",
            "data": processed_data,
            "count": len(processed_data),
            "period": {
                "start_date": datetime.now().strftime('%Y-01-01'),
                "end_date": datetime.now().strftime('%Y-%m-%d'),
                "fbs": fbs
            }
        }

    except Exception as e:
        logger.error(f"❌ Error in competitors analysis for article {article}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching competitors data: {str(e)}"
        )
