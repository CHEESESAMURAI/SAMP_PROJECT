"""
🔧 MPStats Seller Extended Routes
Получение дополнительных данных по продавцам из MPStats API
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
import httpx
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mpstats-seller", tags=["MPStats Seller Extended"])

# MPStats API конфигурация
MPSTATS_BASE_URL = "https://mpstats.io/api/wb/get"
try:
    from config import MPSTATS_API_KEY
except ImportError:
    import os
    MPSTATS_API_KEY = os.getenv("MPSTATS_API_KEY", "691224ca5c1122.7009638641fe116d63a053fa882deefbd618dcb3")

async def make_mpstats_request(endpoint: str, params: dict = None) -> dict:
    """
    Выполняет запрос к MPStats API
    """
    try:
        url = f"{MPSTATS_BASE_URL}/{endpoint}"
        headers = {
            "X-Mpstats-TOKEN": MPSTATS_API_KEY,
            "Content-Type": "application/json"
        }
        
        logger.info(f"📡 MPStats request: {url} with params: {params}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ MPStats response: {len(data) if isinstance(data, list) else 'object'}")
                return data
            elif response.status_code == 401:
                logger.error(f"❌ MPStats API unauthorized")
                raise HTTPException(status_code=401, detail="MPStats API authorization failed")
            elif response.status_code == 404:
                logger.warn(f"⚠️ MPStats API: Not found")
                return []
            else:
                logger.error(f"❌ MPStats API error {response.status_code}: {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"MPStats API error: {response.text}")
    except httpx.TimeoutException:
        logger.error(f"⏰ MPStats API timeout")
        raise HTTPException(status_code=408, detail="MPStats API timeout")
    except Exception as e:
        logger.error(f"❌ Error in MPStats request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/by_date")
async def get_seller_by_date(
    path: str = Query(..., description="Название продавца"),
    d1: Optional[str] = Query(None, description="Дата начала периода (YYYY-MM-DD)"),
    d2: Optional[str] = Query(None, description="Дата окончания периода (YYYY-MM-DD)"),
    groupBy: Optional[str] = Query("day", description="Группировка: day, week, month"),
    fbs: Optional[int] = Query(0, description="FBS параметр (0 или 1)")
):
    """
    Получает данные по продавцу по дням/неделям/месяцам
    """
    try:
        params = {
            "path": path,
            "groupBy": groupBy,
            "fbs": fbs
        }
        
        if d1:
            params["d1"] = d1
        if d2:
            params["d2"] = d2
        
        endpoint = "seller/by_date"
        data = await make_mpstats_request(endpoint, params)
        
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Error getting seller by_date: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trends")
async def get_seller_trends(
    path: str = Query(..., description="Название продавца"),
    d1: Optional[str] = Query(None, description="Дата начала периода (YYYY-MM-DD)"),
    d2: Optional[str] = Query(None, description="Дата окончания периода (YYYY-MM-DD)"),
    fbs: Optional[int] = Query(0, description="FBS параметр (0 или 1)")
):
    """
    Получает тренды по продавцу
    """
    try:
        params = {
            "path": path,
            "fbs": fbs
        }
        
        if d1:
            params["d1"] = d1
        if d2:
            params["d2"] = d2
        
        endpoint = "seller/trends"
        data = await make_mpstats_request(endpoint, params)
        
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Error getting seller trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_seller_categories(
    path: str = Query(..., description="Название продавца"),
    d1: Optional[str] = Query(None, description="Дата начала периода (YYYY-MM-DD)"),
    d2: Optional[str] = Query(None, description="Дата окончания периода (YYYY-MM-DD)"),
    fbs: Optional[int] = Query(0, description="FBS параметр (0 или 1)")
):
    """
    Получает данные по категориям продавца
    """
    try:
        params = {
            "path": path,
            "fbs": fbs
        }
        
        if d1:
            params["d1"] = d1
        if d2:
            params["d2"] = d2
        
        endpoint = "seller/categories"
        data = await make_mpstats_request(endpoint, params)
        
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Error getting seller categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/brands")
async def get_seller_brands(
    path: str = Query(..., description="Название продавца"),
    d1: Optional[str] = Query(None, description="Дата начала периода (YYYY-MM-DD)"),
    d2: Optional[str] = Query(None, description="Дата окончания периода (YYYY-MM-DD)"),
    fbs: Optional[int] = Query(0, description="FBS параметр (0 или 1)")
):
    """
    Получает данные по брендам продавца
    """
    try:
        params = {
            "path": path,
            "fbs": fbs
        }
        
        if d1:
            params["d1"] = d1
        if d2:
            params["d2"] = d2
        
        endpoint = "seller/brands"
        data = await make_mpstats_request(endpoint, params)
        
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Error getting seller brands: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/items")
async def get_seller_items(
    path: str = Query(..., description="Название продавца"),
    d1: Optional[str] = Query(None, description="Дата начала периода (YYYY-MM-DD)"),
    d2: Optional[str] = Query(None, description="Дата окончания периода (YYYY-MM-DD)"),
    fbs: Optional[int] = Query(0, description="FBS параметр (0 или 1)")
):
    """
    Получает данные по предметам продавца
    """
    try:
        params = {
            "path": path,
            "fbs": fbs
        }
        
        if d1:
            params["d1"] = d1
        if d2:
            params["d2"] = d2
        
        endpoint = "seller/items"
        data = await make_mpstats_request(endpoint, params)
        
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Error getting seller items: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/in_warehouses")
async def get_seller_in_warehouses(
    path: str = Query(..., description="Название продавца"),
    d1: Optional[str] = Query(None, description="Дата начала периода (YYYY-MM-DD)"),
    d2: Optional[str] = Query(None, description="Дата окончания периода (YYYY-MM-DD)"),
    fbs: Optional[int] = Query(0, description="FBS параметр (0 или 1)")
):
    """
    Получает данные по складам продавца
    """
    try:
        params = {
            "path": path,
            "fbs": fbs
        }
        
        if d1:
            params["d1"] = d1
        if d2:
            params["d2"] = d2
        
        endpoint = "seller/in_warehouses"
        data = await make_mpstats_request(endpoint, params)
        
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Error getting seller in_warehouses: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/price_segmentation")
async def get_seller_price_segmentation(
    path: str = Query(..., description="Название продавца"),
    d1: Optional[str] = Query(None, description="Дата начала периода (YYYY-MM-DD)"),
    d2: Optional[str] = Query(None, description="Дата окончания периода (YYYY-MM-DD)"),
    fbs: Optional[int] = Query(0, description="FBS параметр (0 или 1)"),
    minPrice: Optional[int] = Query(None, description="Минимальный диапазон цены"),
    maxPrice: Optional[int] = Query(None, description="Максимальный диапазон цены"),
    segmentsCnt: Optional[int] = Query(None, description="Количество сегментов"),
    spp: Optional[int] = Query(0, description="Значения с СПП (0 или 1)")
):
    """
    Получает данные по ценовой сегментации продавца
    """
    try:
        params = {
            "path": path,
            "fbs": fbs,
            "spp": spp
        }
        
        if d1:
            params["d1"] = d1
        if d2:
            params["d2"] = d2
        if minPrice is not None:
            params["minPrice"] = minPrice
        if maxPrice is not None:
            params["maxPrice"] = maxPrice
        if segmentsCnt is not None:
            params["segmentsCnt"] = segmentsCnt
        
        endpoint = "seller/price_segmentation"
        data = await make_mpstats_request(endpoint, params)
        
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Error getting seller price_segmentation: {e}")
        raise HTTPException(status_code=500, detail=str(e))





