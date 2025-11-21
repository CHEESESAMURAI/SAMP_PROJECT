from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any, Optional
import requests
import os
import logging
from datetime import datetime, timedelta

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()

# MPStats API конфигурация
MPSTATS_API_URL = "https://mpstats.io/api/wb/get/item"
MPSTATS_TOKEN = "691224ca5c1122.7009638641fe116d63a053fa882deefbd618dcb3"


def get_mpstats_competitors_data(article: str, fbs: int = 1, days: int = 30) -> List[Dict[str, Any]]:
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
        # Вычисляем даты для периода - с начала года до сегодняшнего дня
        end_date = datetime.now()
        start_date = datetime(end_date.year, 1, 1)  # С начала года
        
        d1 = start_date.strftime('%Y-%m-%d')
        d2 = end_date.strftime('%Y-%m-%d')
        
        # Формируем URL для запроса аналогичных товаров
        url = f"{MPSTATS_API_URL}/{article}/identical"
        params = {
            'd1': d1,
            'd2': d2,
            'fbs': fbs
        }
        
        headers = {
            'X-Mpstats-TOKEN': MPSTATS_TOKEN,
            'Content-Type': 'application/json'
        }
        
        logger.info(f"🔍 Fetching competitors data for article {article} from {d1} to {d2}")
        logger.info(f"🔍 Full URL: {url}")
        logger.info(f"🔍 Params: {params}")
        logger.info(f"🔍 Headers: {headers}")
        
        # Выполняем запрос к MPStats API
        response = requests.get(url, params=params, headers=headers, timeout=30)
        
        logger.info(f"🔍 Response status: {response.status_code}")
        logger.info(f"🔍 Response text: {response.text[:500]}...")  # Первые 500 символов
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"✅ Successfully received {len(data)} competitors for article {article}")
            return data
        else:
            logger.warning(f"⚠️ MPStats API returned status {response.status_code}: {response.text}")
            return []
            
    except requests.exceptions.Timeout:
        logger.error(f"❌ Timeout error fetching competitors data for article {article}")
        return []
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Request error fetching competitors data for article {article}: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"❌ Unexpected error fetching competitors data for article {article}: {str(e)}")
        return []

@router.get("/mpstats-competitors/{article}")
async def get_competitors_data(
    article: str,
    fbs: int = 1,
    days: int = 30,
    authorization: str = Header(None)
):
    """
    Получает данные аналогичных товаров для указанного артикула
    
    Args:
        article: Артикул товара
        fbs: Параметр FBS (1 - с FBS, 0 - без FBS)
        days: Количество дней для анализа
        authorization: Токен авторизации
    
    Returns:
        Данные аналогичных товаров
    """
    try:
        logger.info(f"🔍 Starting competitors analysis for article: {article}")
        
        # Получаем данные конкурентов
        competitors_data = get_mpstats_competitors_data(article, fbs, days)
        
        if not competitors_data:
            logger.warning(f"⚠️ No competitors data found for article {article}")
            return {
                "status": "success",
                "message": "No competitors data available",
                "data": [],
                "count": 0
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
                "days": days,
                "fbs": fbs
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Error in competitors analysis for article {article}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching competitors data: {str(e)}"
        )
