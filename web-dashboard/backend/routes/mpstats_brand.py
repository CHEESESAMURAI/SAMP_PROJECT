"""
🔧 MPStats Brand Routes
Получение дополнительных данных по брендам из MPStats API
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
import httpx
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mpstats-brand", tags=["MPStats Brand"])

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
async def get_brand_by_date(
    path: str = Query(..., description="Название бренда"),
    d1: Optional[str] = Query(None, description="Дата начала периода (YYYY-MM-DD)"),
    d2: Optional[str] = Query(None, description="Дата окончания периода (YYYY-MM-DD)"),
    groupBy: Optional[str] = Query("day", description="Группировка: day, week, month"),
    fbs: Optional[int] = Query(0, description="FBS параметр (0 или 1)")
):
    """
    Получает данные по бренду по дням/неделям/месяцам
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
        
        endpoint = "brand/by_date"
        data = await make_mpstats_request(endpoint, params)
        
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Error getting brand by_date: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trends")
async def get_brand_trends(
    path: str = Query(..., description="Название бренда"),
    d1: Optional[str] = Query(None, description="Дата начала периода (YYYY-MM-DD)"),
    d2: Optional[str] = Query(None, description="Дата окончания периода (YYYY-MM-DD)"),
    fbs: Optional[int] = Query(0, description="FBS параметр (0 или 1)")
):
    """
    Получает тренды по бренду
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
        
        endpoint = "brand/trends"
        data = await make_mpstats_request(endpoint, params)
        
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Error getting brand trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_brand_categories(
    path: str = Query(..., description="Название бренда"),
    d1: Optional[str] = Query(None, description="Дата начала периода (YYYY-MM-DD)"),
    d2: Optional[str] = Query(None, description="Дата окончания периода (YYYY-MM-DD)"),
    fbs: Optional[int] = Query(0, description="FBS параметр (0 или 1)")
):
    """
    Получает данные по категориям бренда
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
        
        endpoint = "brand/categories"
        data = await make_mpstats_request(endpoint, params)
        
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Error getting brand categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sellers")
async def get_brand_sellers(
    path: str = Query(..., description="Название бренда"),
    d1: Optional[str] = Query(None, description="Дата начала периода (YYYY-MM-DD)"),
    d2: Optional[str] = Query(None, description="Дата окончания периода (YYYY-MM-DD)"),
    fbs: Optional[int] = Query(0, description="FBS параметр (0 или 1)")
):
    """
    Получает данные по продавцам бренда
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
        
        endpoint = "brand/sellers"
        data = await make_mpstats_request(endpoint, params)
        
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Error getting brand sellers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/items")
async def get_brand_items(
    path: str = Query(..., description="Название бренда"),
    d1: Optional[str] = Query(None, description="Дата начала периода (YYYY-MM-DD)"),
    d2: Optional[str] = Query(None, description="Дата окончания периода (YYYY-MM-DD)"),
    fbs: Optional[int] = Query(0, description="FBS параметр (0 или 1)")
):
    """
    Получает данные по предметам бренда
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
        
        endpoint = "brand/items"
        data = await make_mpstats_request(endpoint, params)
        
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Error getting brand items: {e}")
        raise HTTPException(status_code=500, detail=str(e))

