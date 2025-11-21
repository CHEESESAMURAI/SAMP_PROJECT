"""
🔧 MPStats Product Detail Routes
Получение детальной информации о товаре из MPStats API
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import httpx
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mpstats-product", tags=["MPStats Product Detail"])

# MPStats API конфигурация
MPSTATS_BASE_URL = "https://mpstats.io/api/wb/get"
try:
    from config import MPSTATS_API_KEY
except ImportError:
    MPSTATS_API_KEY = "691224ca5c1122.7009638641fe116d63a053fa882deefbd618dcb3"

class MPStatsProductDetailResponse(BaseModel):
    """Детальная информация о товаре из MPStats"""
    id: Optional[int] = None
    subject: Optional[str] = None
    name: Optional[str] = None
    full_name: Optional[str] = None
    link: Optional[str] = None
    brand: Optional[str] = None
    seller: Optional[str] = None
    rating: Optional[float] = None
    comments: Optional[int] = None
    price: Optional[int] = None
    final_price: Optional[int] = None
    wallet_price: Optional[int] = None
    discount: Optional[int] = None
    commission_fbo: Optional[float] = None
    commission_fbs: Optional[float] = None
    basic_sale: Optional[float] = None
    balance: Optional[int] = None
    updated: Optional[str] = None
    first_date: Optional[str] = None
    is_new: Optional[bool] = None
    main_photo: Optional[str] = None
    thumbnails: Optional[List[str]] = None
    available_sizes: Optional[List[Dict[str, Any]]] = None


async def make_mpstats_request(endpoint: str, params: dict = None) -> dict:
    """Выполняет запрос к MPStats API"""
    try:
        url = f"{MPSTATS_BASE_URL}/{endpoint}"
        headers = {
            "X-Mpstats-TOKEN": MPSTATS_API_KEY,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
        
        logger.info(f"Making MPStats request to: {url}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 429:
                logger.warning("MPStats API rate limit exceeded")
                raise HTTPException(status_code=429, detail="Rate limit exceeded")
            else:
                logger.error(f"MPStats API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"MPStats API error: {response.text}")
                
    except httpx.TimeoutException:
        logger.error("MPStats API request timeout")
        raise HTTPException(status_code=504, detail="Request timeout")
    except Exception as e:
        logger.error(f"Error making MPStats request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{item_id}", response_model=MPStatsProductDetailResponse)
async def get_mpstats_product_detail(item_id: int):
    """
    Получает детальную информацию о товаре из MPStats API
    
    Параметры:
    - item_id: ID товара на Wildberries
    
    Возвращает полную информацию о товаре включая:
    - Основные данные (название, бренд, продавец)
    - Цены (базовая, с промо, с WB кошельком)
    - Рейтинг и отзывы
    - Остатки и размеры
    - Фотографии
    - Даты и статусы
    """
    try:
        # Получаем основную информацию о товаре
        logger.info(f"Fetching product detail for item_id: {item_id}")
        item_response = await make_mpstats_request(f"item/{item_id}")
        
        if not item_response:
            raise HTTPException(status_code=404, detail="Product not found")
        
        item = item_response.get("item", {})
        photos = item_response.get("photos", [])
        
        # Получаем данные о продажах для комиссий и выкупа
        today = datetime.now()
        date_from = (today - timedelta(days=30)).strftime("%Y-%m-%d")
        date_to = today.strftime("%Y-%m-%d")
        
        sales_params = {
            "d1": date_from,
            "d2": date_to
        }
        
        logger.info(f"Fetching sales data for item_id: {item_id}")
        sales_response = await make_mpstats_request(f"item/{item_id}/sales", params=sales_params)
        
        # Обрабатываем данные о продажах
        sales_data = []
        if isinstance(sales_response, dict) and "sales" in sales_response:
            sales_data = [day for day in sales_response["sales"] if not day.get("no_data")]
        elif isinstance(sales_response, list):
            sales_data = [day for day in sales_response if not day.get("no_data")]
        
        last_day = sales_data[-1] if sales_data else {}
        
        # Обрабатываем фотографии
        main_photo = f"https:{photos[0]['f']}" if photos else None
        thumbnails = [f"https:{p['t']}" for p in photos] if photos else []
        
        # Обрабатываем доступные размеры
        available_sizes = []
        for size_data in item.get("sizeandstores", {}).values():
            size_info = {
                "Размер": size_data.get("n"),
                "size": size_data.get("n"),
                "Базовая цена": size_data.get("bp"),
                "Цена с промо": size_data.get("pp"),
                "Цена WB кошелек": size_data.get("wp"),
                "Скидка": size_data.get("d"),
                "Остаток": sum(size_data.get("s", {}).values())
            }
            available_sizes.append(size_info)
        
        # Формируем ответ
        result = {
            "id": item.get("id"),
            "subject": item.get("name", "").split()[0] if item.get("name") else None,
            "name": item.get("name"),
            "full_name": item.get("full_name"),
            "link": item.get("link"),
            "brand": item.get("brand"),
            "seller": item.get("seller"),
            "rating": item.get("rating"),
            "comments": item.get("comments"),
            "price": item.get("price"),
            "final_price": item.get("final_price"),
            "wallet_price": item.get("wallet_price"),
            "discount": item.get("discount"),
            "commission_fbo": last_day.get("commission_fbo") if last_day else None,
            "commission_fbs": last_day.get("commission_fbs") if last_day else None,
            "basic_sale": last_day.get("basic_sale") if last_day else None,
            "balance": last_day.get("balance") if last_day else None,
            "updated": item.get("updated"),
            "first_date": item.get("first_date"),
            "is_new": item.get("is_new"),
            "main_photo": main_photo,
            "thumbnails": thumbnails,
            "available_sizes": available_sizes
        }
        
        logger.info(f"Successfully fetched product detail for item_id: {item_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching product detail: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")









