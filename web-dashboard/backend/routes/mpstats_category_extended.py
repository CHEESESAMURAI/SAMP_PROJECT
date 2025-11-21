"""
🔧 MPStats Category Extended Routes
Получение дополнительных данных по категориям из MPStats API
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
import httpx
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mpstats-category", tags=["MPStats Category Extended"])

# MPStats API конфигурация
MPSTATS_BASE_URL = "https://mpstats.io/api/wb/get"
try:
    from config import MPSTATS_API_KEY
except ImportError:
    import os
    MPSTATS_API_KEY = os.getenv("MPSTATS_API_KEY", "691224ca5c1122.7009638641fe116d63a053fa882deefbd618dcb3")

async def make_mpstats_request(endpoint: str, params: dict = None, method: str = "GET", json_data: dict = None) -> dict:
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
            if method == "POST":
                response = await client.post(url, headers=headers, params=params, json=json_data)
            else:
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
                error_text = await response.text()
                logger.error(f"❌ MPStats API error {response.status_code}: {error_text}")
                raise HTTPException(status_code=response.status_code, detail=f"MPStats API error: {error_text}")
                
    except httpx.TimeoutException:
        logger.error(f"⏰ Timeout fetching data from MPStats for endpoint {endpoint}")
        raise HTTPException(status_code=408, detail="Request to MPStats API timed out")
    except Exception as e:
        logger.error(f"❌ Error making MPStats request for endpoint {endpoint}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching data from MPStats: {str(e)}")

@router.post("/products")
async def get_category_products(
    path: str = Query(..., description="Путь категории"),
    d1: str = Query(..., description="Дата начала (YYYY-MM-DD)"),
    d2: str = Query(..., description="Дата окончания (YYYY-MM-DD)"),
    fbs: int = Query(0, description="FBS фильтр (0=все, 1=FBS)"),
    startRow: int = Query(0, description="Начальная строка"),
    endRow: int = Query(5000, description="Конечная строка (максимум 5000)")
):
    """Получает товары категории с пагинацией."""
    params = {"path": path, "d1": d1, "d2": d2, "fbs": fbs}
    json_data = {
        "startRow": startRow,
        "endRow": endRow,
        "filterModel": {},
        "sortModel": []
    }
    return await make_mpstats_request("category", params, method="POST", json_data=json_data)

@router.get("/subcategories")
async def get_category_subcategories(
    path: str = Query(..., description="Путь категории"),
    d1: str = Query(..., description="Дата начала (YYYY-MM-DD)"),
    d2: str = Query(..., description="Дата окончания (YYYY-MM-DD)"),
    fbs: int = Query(0, description="FBS фильтр (0=все, 1=FBS)")
):
    """Получает подкатегории категории."""
    params = {"path": path, "d1": d1, "d2": d2, "fbs": fbs}
    return await make_mpstats_request("category/subcategories", params)

@router.get("/brands")
async def get_category_brands(
    path: str = Query(..., description="Путь категории"),
    d1: str = Query(..., description="Дата начала (YYYY-MM-DD)"),
    d2: str = Query(..., description="Дата окончания (YYYY-MM-DD)"),
    fbs: int = Query(0, description="FBS фильтр (0=все, 1=FBS)")
):
    """Получает бренды категории."""
    params = {"path": path, "d1": d1, "d2": d2, "fbs": fbs}
    return await make_mpstats_request("category/brands", params)

@router.get("/sellers")
async def get_category_sellers(
    path: str = Query(..., description="Путь категории"),
    d1: str = Query(..., description="Дата начала (YYYY-MM-DD)"),
    d2: str = Query(..., description="Дата окончания (YYYY-MM-DD)"),
    fbs: int = Query(0, description="FBS фильтр (0=все, 1=FBS)")
):
    """Получает продавцов категории."""
    params = {"path": path, "d1": d1, "d2": d2, "fbs": fbs}
    return await make_mpstats_request("category/sellers", params)

@router.get("/trends")
async def get_category_trends(
    path: str = Query(..., description="Путь категории"),
    d1: str = Query(..., description="Дата начала (YYYY-MM-DD)"),
    d2: str = Query(..., description="Дата окончания (YYYY-MM-DD)"),
    fbs: int = Query(0, description="FBS фильтр (0=все, 1=FBS)"),
    view: Optional[str] = Query("itemsInCategory", description="Вид данных (itemsInCategory или category)")
):
    """Получает тренды категории."""
    params = {"path": path, "d1": d1, "d2": d2, "fbs": fbs, "view": view}
    return await make_mpstats_request("category/trends", params)

@router.get("/by_date")
async def get_category_by_date(
    path: str = Query(..., description="Путь категории"),
    d1: str = Query(..., description="Дата начала (YYYY-MM-DD)"),
    d2: str = Query(..., description="Дата окончания (YYYY-MM-DD)"),
    groupBy: Optional[str] = Query("day", description="Группировка данных (day, week, month)"),
    fbs: int = Query(0, description="FBS фильтр (0=все, 1=FBS)")
):
    """Получает данные по дням/неделям/месяцам для категории."""
    params = {"path": path, "d1": d1, "d2": d2, "groupBy": groupBy, "fbs": fbs}
    return await make_mpstats_request("category/by_date", params)

@router.get("/items")
async def get_category_items(
    path: str = Query(..., description="Путь категории"),
    d1: str = Query(..., description="Дата начала (YYYY-MM-DD)"),
    d2: str = Query(..., description="Дата окончания (YYYY-MM-DD)"),
    fbs: int = Query(0, description="FBS фильтр (0=все, 1=FBS)")
):
    """Получает предметы категории."""
    params = {"path": path, "d1": d1, "d2": d2, "fbs": fbs}
    return await make_mpstats_request("category/items", params)

@router.get("/price_segmentation")
async def get_category_price_segmentation(
    path: str = Query(..., description="Путь категории"),
    d1: str = Query(..., description="Дата начала (YYYY-MM-DD)"),
    d2: str = Query(..., description="Дата окончания (YYYY-MM-DD)"),
    fbs: int = Query(0, description="FBS фильтр (0=все, 1=FBS)"),
    minPrice: Optional[int] = Query(None, description="Минимальный диапазон цены"),
    maxPrice: Optional[int] = Query(None, description="Максимальный диапазон цены"),
    segmentsCnt: Optional[int] = Query(None, description="Количество сегментов"),
    spp: Optional[int] = Query(None, description="Значения с СПП (1=с СПП, 0=без СПП)")
):
    """Получает ценовую сегментацию для категории."""
    params = {"path": path, "d1": d1, "d2": d2, "fbs": fbs}
    if minPrice is not None: params["minPrice"] = minPrice
    if maxPrice is not None: params["maxPrice"] = maxPrice
    if segmentsCnt is not None: params["segmentsCnt"] = segmentsCnt
    if spp is not None: params["spp"] = spp
    return await make_mpstats_request("category/price_segmentation", params)





