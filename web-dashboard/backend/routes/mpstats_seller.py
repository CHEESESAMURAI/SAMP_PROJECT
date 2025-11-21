from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, Any, Optional
import requests
import logging
import os
from datetime import datetime

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mpstats", tags=["MPStats Seller Analysis"])

class SellerAnalysisRequest(BaseModel):
    startRow: int = 0
    endRow: int = 100
    filterModel: Dict[str, Any] = {}
    sortModel: list = []

@router.post("/seller")
async def analyze_seller_mpstats(
    path: str = Query(..., description="Название продавца"),
    d1: str = Query(..., description="Дата начала (YYYY-MM-DD)"),
    d2: str = Query(..., description="Дата окончания (YYYY-MM-DD)"),
    fbs: int = Query(1, description="FBS фильтр (0=все, 1=FBS, 2=FBO)"),
    newsmode: Optional[int] = Query(None, description="Фильтр новинок (7, 14, 30 дней)"),
    request: SellerAnalysisRequest = None
) -> Dict[str, Any]:
    """
    Анализ продавца через MPStats API
    
    Args:
        path: Название продавца
        d1: Дата начала
        d2: Дата окончания
        fbs: FBS фильтр
        newsmode: Фильтр новинок
        request: Параметры пагинации и сортировки
        
    Returns:
        Данные о товарах продавца из MPStats API
    """
    try:
        if not path or not path.strip():
            raise HTTPException(
                status_code=400, 
                detail="Название продавца не может быть пустым"
            )
        
        # Получаем токен MPStats из конфигурации
        try:
            import sys
            import os
            ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
            if ROOT_DIR not in sys.path:
                sys.path.append(ROOT_DIR)
            from config import MPSTATS_API_KEY
            mpstats_token = MPSTATS_API_KEY
        except ImportError:
            mpstats_token = os.getenv('MPSTATS_TOKEN')
        
        if not mpstats_token:
            logger.error("MPSTATS_TOKEN не найден в конфигурации")
            raise HTTPException(
                status_code=500,
                detail="MPStats токен не настроен"
            )
        
        # Строим URL для MPStats API
        base_url = "https://mpstats.io/api/wb/get/seller"
        params = {
            'path': path.strip(),
            'd1': d1,
            'd2': d2,
            'fbs': str(fbs)
        }
        
        if newsmode:
            params['newsmode'] = str(newsmode)
        
        # Логируем запрос
        logger.info(f"🔍 Запрос к MPStats API для продавца: {path}")
        logger.info(f"📋 Параметры: {params}")
        
        # Подготавливаем данные для POST запроса
        post_data = {
            "startRow": request.startRow if request else 0,
            "endRow": request.endRow if request else 100,
            "filterModel": request.filterModel if request else {},
            "sortModel": request.sortModel if request else []
        }
        
        # Выполняем запрос к MPStats API
        headers = {
            'X-Mpstats-TOKEN': mpstats_token,
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            base_url,
            params=params,
            json=post_data,
            headers=headers,
            timeout=30
        )
        
        logger.info(f"📊 MPStats API ответ: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"✅ Получено {len(data.get('data', []))} товаров для продавца {path}")
            logger.info(f"📊 Структура ответа MPStats: {list(data.keys())}")
            logger.info(f"📊 Общее количество товаров: {data.get('total', 0)}")
            
            # Если товаров нет, попробуем найти похожие названия
            if len(data.get('data', [])) == 0:
                logger.warning(f"⚠️ Товары не найдены для '{path}'. Возможные причины:")
                logger.warning(f"   - Неправильное написание названия")
                logger.warning(f"   - Продавец не существует в базе MPStats")
                logger.warning(f"   - Неверный период дат")
                logger.warning(f"   - Попробуйте полное название: 'Индивидуальный предприниматель Золтоев Артур Арсаланович'")
            
            return {
                "success": True,
                "data": data,
                "message": f"Анализ продавца '{path}' выполнен успешно"
            }
        elif response.status_code == 404:
            logger.warning(f"⚠️ Продавец '{path}' не найден в MPStats")
            raise HTTPException(
                status_code=404,
                detail=f"Продавец '{path}' не найден. Проверьте правильность написания названия."
            )
        else:
            logger.error(f"❌ Ошибка MPStats API: {response.status_code}")
            try:
                error_data = response.json()
                error_message = error_data.get('message', f'Ошибка API: {response.status_code}')
            except:
                error_message = f'Ошибка API: {response.status_code}'
            
            raise HTTPException(
                status_code=response.status_code,
                detail=error_message
            )
            
    except requests.exceptions.Timeout:
        logger.error("⏰ Таймаут запроса к MPStats API")
        raise HTTPException(
            status_code=504,
            detail="Таймаут запроса к MPStats API. Попробуйте позже."
        )
    except requests.exceptions.RequestException as e:
        logger.error(f"🌐 Ошибка сети при запросе к MPStats: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail="Ошибка сети при обращении к MPStats API"
        )
    except Exception as e:
        logger.error(f"❌ Неожиданная ошибка: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )

@router.get("/seller/health")
async def health_check():
    """Проверка работоспособности модуля анализа продавцов MPStats"""
    return {
        "status": "healthy",
        "module": "mpstats_seller_analysis",
        "message": "Модуль анализа продавцов MPStats работает корректно"
    }
