from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import httpx
import logging
from datetime import datetime, timedelta
import os

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/item", tags=["MPStats Item Analysis"])

# MPStats API конфигурация
MPSTATS_BASE_URL = "https://mpstats.io/api/wb/get"
try:
    from config import MPSTATS_API_KEY  # type: ignore
except ImportError:
    MPSTATS_API_KEY = os.getenv("MPSTATS_API_KEY", "")

async def make_mpstats_request(endpoint: str, params: dict = None) -> dict:
    """Выполняет запрос к MPStats API"""
    try:
        if not MPSTATS_API_KEY:
            logger.error("MPStats API key not configured")
            return []

        url = f"{MPSTATS_BASE_URL}/{endpoint}"
        headers = {
            "X-Mpstats-TOKEN": MPSTATS_API_KEY,
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                return response.json()
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

@router.get("/{article}/sales")
async def get_item_sales(
    article: str,
    d1: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    d2: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    fbs: Optional[int] = Query(1, description="FBS parameter")
):
    """Получает данные о продажах и остатках товара"""
    try:
        # Если даты не указаны, используем последние 30 дней
        if not d1:
            d1 = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not d2:
            d2 = datetime.now().strftime("%Y-%m-%d")
            
        params = {
            "d1": d1,
            "d2": d2,
            "fbs": fbs
        }
        
        endpoint = f"item/{article}/sales"
        data = await make_mpstats_request(endpoint, params)
        
        return data
        
    except Exception as e:
        logger.error(f"Error getting item sales: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{article}/sales_by_region")
async def get_item_sales_by_region(
    article: str,
    d1: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    d2: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    fbs: Optional[int] = Query(1, description="FBS parameter")
):
    """Получает данные о продажах товара по складам"""
    try:
        # Если даты не указаны, используем последние 30 дней
        if not d1:
            d1 = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not d2:
            d2 = datetime.now().strftime("%Y-%m-%d")
            
        params = {
            "d1": d1,
            "d2": d2,
            "fbs": fbs
        }
        
        endpoint = f"item/{article}/sales_by_region"
        data = await make_mpstats_request(endpoint, params)
        
        return data
        
    except Exception as e:
        logger.error(f"Error getting sales by region: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{article}/sales_by_size")
async def get_item_sales_by_size(
    article: str,
    d1: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    d2: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    fbs: Optional[int] = Query(1, description="FBS parameter")
):
    """Получает данные о продажах товара по размерам"""
    try:
        # Если даты не указаны, используем последние 30 дней
        if not d1:
            d1 = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not d2:
            d2 = datetime.now().strftime("%Y-%m-%d")
            
        params = {
            "d1": d1,
            "d2": d2,
            "fbs": fbs
        }
        
        endpoint = f"item/{article}/sales_by_size"
        data = await make_mpstats_request(endpoint, params)
        
        return data
        
    except Exception as e:
        logger.error(f"Error getting sales by size: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{article}/balance_by_region")
async def get_item_balance_by_region(
    article: str,
    d: Optional[str] = Query(None, description="Date (YYYY-MM-DD)"),
    fbs: Optional[int] = Query(1, description="FBS parameter")
):
    """Получает данные об остатках товара по складам"""
    try:
        # Если дата не указана, используем сегодняшнюю
        if not d:
            d = datetime.now().strftime("%Y-%m-%d")
            
        params = {
            "d": d,
            "fbs": fbs
        }
        
        endpoint = f"item/{article}/balance_by_region"
        data = await make_mpstats_request(endpoint, params)
        
        return data
        
    except Exception as e:
        logger.error(f"Error getting balance by region: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{article}/balance_by_size")
async def get_item_balance_by_size(
    article: str,
    d: Optional[str] = Query(None, description="Date (YYYY-MM-DD)"),
    fbs: Optional[int] = Query(1, description="FBS parameter")
):
    """Получает данные об остатках товара по размерам"""
    try:
        # Если дата не указана, используем сегодняшнюю
        if not d:
            d = datetime.now().strftime("%Y-%m-%d")
            
        params = {
            "d": d,
            "fbs": fbs
        }
        
        endpoint = f"item/{article}/balance_by_size"
        data = await make_mpstats_request(endpoint, params)
        
        return data
        
    except Exception as e:
        logger.error(f"Error getting balance by size: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{article}/identical")
async def get_item_identical(
    article: str,
    d1: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    d2: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    fbs: Optional[int] = Query(1, description="FBS parameter")
):
    """Получает данные о похожих товарах (AI)"""
    try:
        # Если даты не указаны, используем последние 30 дней
        if not d1:
            d1 = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not d2:
            d2 = datetime.now().strftime("%Y-%m-%d")
            
        params = {
            "d1": d1,
            "d2": d2,
            "fbs": fbs
        }
        
        endpoint = f"item/{article}/identical"
        data = await make_mpstats_request(endpoint, params)
        
        return data
        
    except Exception as e:
        logger.error(f"Error getting identical items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{article}/comments")
async def get_item_comments(
    article: str,
    limit: int = Query(200, ge=1, le=500, description="Максимальное количество отзывов (1-500)"),
    page: int = Query(1, ge=1, description="Номер страницы отзывов (начиная с 1)")
):
    """
    Получает историю отзывов товара с MPStats.
    По умолчанию возвращает до 200 последних отзывов.
    """
    try:
        params = {
            "limit": limit,
            "page": page
        }

        endpoint = f"item/{article}/comments"
        data = await make_mpstats_request(endpoint, params)

        if isinstance(data, dict):
            return data

        # Приводим к ожидаемой структуре при нестандартном ответе
        return {
            "last_request": None,
            "comments": data if isinstance(data, list) else []
        }
    except Exception as e:
        logger.error(f"Error getting item comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{article}/balance_by_day")
async def get_item_balance_by_day(
    article: str,
    d: Optional[str] = Query(None, description="Date (YYYY-MM-DD)")
):
    """Получает данные об остатках товара за сутки"""
    try:
        # Если дата не указана, используем сегодняшнюю
        if not d:
            d = datetime.now().strftime("%Y-%m-%d")
            
        params = {
            "d": d
        }
        
        endpoint = f"item/{article}/balance_by_day"
        data = await make_mpstats_request(endpoint, params)
        
        return data
        
    except Exception as e:
        logger.error(f"Error getting balance by day: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/forecast/yhat")
async def get_forecast_yhat(
    path: str = Query(..., description="Category path (e.g., Для женщин/Одежда/Платья)")
):
    """Получение прогноза продаж по дням (yhat) для категории"""
    try:
        params = {"path": path}
        
        endpoint = "ds/category/yhat"
        data = await make_mpstats_request(endpoint, params)
        
        return data
        
    except Exception as e:
        logger.error(f"Error getting forecast yhat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/forecast/trend")
async def get_forecast_trend(
    path: str = Query(..., description="Category path (e.g., Для женщин/Одежда/Платья)"),
    period: str = Query("month12", description="Period (month12 or month3)")
):
    """Получение графика тренда продаж для категории"""
    try:
        params = {"path": path, "period": period}
        
        endpoint = "ds/category/trend"
        data = await make_mpstats_request(endpoint, params)
        
        return data
        
    except Exception as e:
        logger.error(f"Error getting forecast trend: {e}")
        raise HTTPException(status_code=500, detail=str(e))
