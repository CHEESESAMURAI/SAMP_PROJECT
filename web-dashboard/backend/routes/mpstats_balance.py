import requests
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

# MPStats API настройки
MPSTATS_TOKEN = "691224ca5c1122.7009638641fe116d63a053fa882deefbd618dcb3"
MPSTATS_BASE_URL = "https://mpstats.io/api/wb/get/item"

router = APIRouter()

def get_mpstats_balance_data(article: str, start_date: str, end_date: str) -> List[Dict[str, Any]]:
    """
    Получает данные об остатках из MPStats API через /sales endpoint (один запрос вместо 30)
    """
    try:
        # URL для получения продаж и остатков за весь период одним запросом
        url = f"{MPSTATS_BASE_URL}/{article}/sales"
        params = {
            "d1": start_date,
            "d2": end_date,
            "fbs": "1"  # Включаем FBS склады
        }
        
        headers = {
            "X-Mpstats-TOKEN": MPSTATS_TOKEN,
            "Content-Type": "application/json"
        }
        
        logger.info(f"🔍 Запрашиваем продажи и остатки для {article} с {start_date} по {end_date}")
        logger.info(f"📡 URL: {url}")
        logger.info(f"📋 Параметры: {params}")
        
        response = requests.get(url, params=params, headers=headers, timeout=30)
        
        if response.status_code == 200:
            sales_data = response.json()
            if isinstance(sales_data, list) and sales_data:
                # Преобразуем данные из /sales в формат остатков
                balance_data = []
                
                for item in sales_data:
                    if item.get("no_data") == 0:  # Только данные без ошибок
                        balance_data.append({
                            "date": item.get("data", ""),
                            "total_balance": int(item.get("balance", 0)),
                            "sales": item.get("sales", 0),
                            "price": item.get("final_price", 0),
                            "warehouses": []  # Упрощаем - не разбиваем по складам
                        })
                
                logger.info(f"✅ Получено {len(balance_data)} дней продаж и остатков для {article}")
                return balance_data
            else:
                logger.warning(f"⚠️ Пустые данные продаж для {article}")
                return []
        else:
            logger.warning(f"❌ Ошибка API: {response.status_code}")
            return []
        
    except Exception as e:
        logger.error(f"❌ Ошибка получения данных: {str(e)}")
        return []

@router.get("/mpstats-balance/{article}")
async def get_balance_data(article: str):
    """
    Получает данные об остатках по складам для товара
    """
    try:
        # Определяем период: за последний месяц
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        start_date_str = start_date.strftime("%Y-%m-%d")
        end_date_str = end_date.strftime("%Y-%m-%d")
        
        logger.info(f"🔍 Получение остатков для артикула {article} с {start_date_str} по {end_date_str}")
        
        # Получаем данные об остатках
        balance_data = get_mpstats_balance_data(article, start_date_str, end_date_str)
        
        if not balance_data:
            logger.warning(f"⚠️ Нет данных об остатках для {article}")
            return {
                "status": "success",
                "message": "No balance data available",
                "data": [],
                "count": 0
            }
        
        # Формируем ответ
        result = {
            "status": "success",
            "message": f"Balance data retrieved for {article}",
            "data": balance_data,
            "count": len(balance_data),
            "period": {
                "start_date": start_date_str,
                "end_date": end_date_str
            }
        }
        
        logger.info(f"✅ Успешно получены остатки: {len(balance_data)} дней")
        return result
        
    except Exception as e:
        logger.error(f"❌ Ошибка получения остатков для {article}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving balance data: {str(e)}")
