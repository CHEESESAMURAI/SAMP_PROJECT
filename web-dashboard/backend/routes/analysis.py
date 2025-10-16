from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
import logging
from utils.global_search import global_search_serper
from wb_product_api import get_product_analysis

# Простая заглушка для аутентификации - в продакшене нужна настоящая аутентификация
def get_current_user():
    return {"email": "test@example.com"}

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/global-search")
async def global_search(query: Dict[str, str], current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Выполняет глобальный поиск по артикулу или бренду.
    
    Args:
        query: Словарь с параметром "query" - строка поиска (артикул или бренд)
        current_user: Текущий пользователь (добавляется автоматически через Depends)
        
    Returns:
        Dict с результатами поиска:
        {
            "success": bool,
            "data": {
                "results": List[Dict] - список найденных результатов
            }
        }
        
    Raises:
        HTTPException: В случае ошибки при поиске
    """
    try:
        logger.info(f"Starting global search for query: {query['query']}")
        
        # Проверяем входные данные
        if not query.get("query"):
            raise HTTPException(status_code=400, detail="Query parameter is required")
            
        # Выполняем поиск
        results = await global_search_serper(query["query"])
        
        # Проверяем результаты
        if not results:
            logger.warning(f"No results found for query: {query['query']}")
            return {
                "success": True,
                "data": {
                    "results": [],
                    "message": "No results found"
                }
            }
            
        logger.info(f"Successfully found {len(results)} results")
        return {
            "success": True,
            "data": {
                "results": results
            }
        }
        
    except HTTPException as he:
        # Пробрасываем HTTPException дальше
        raise he
    except Exception as e:
        logger.error(f"Error during global search: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/product")
async def analyze_product(request: Dict[str, str]) -> Dict[str, Any]:
    """
    Выполняет анализ товара по артикулу.
    
    Args:
        request: Словарь с параметром "article" - артикул товара
        current_user: Текущий пользователь (добавляется автоматически через Depends)
        
    Returns:
        Dict с результатами анализа товара
        
    Raises:
        HTTPException: В случае ошибки при анализе
    """
    try:
        article = request.get("article", "").strip()
        if not article:
            raise HTTPException(status_code=400, detail="Article parameter is required")
            
        logger.info(f"Starting product analysis for article: {article}")
        
        # Выполняем анализ товара
        product_data = await get_product_analysis(article)
        
        if not product_data:
            logger.warning(f"No data found for article: {article}")
            raise HTTPException(status_code=404, detail="Product not found")
            
        logger.info(f"Successfully analyzed product {article}")
        return product_data
        
    except HTTPException as he:
        # Пробрасываем HTTPException дальше
        raise he
    except Exception as e:
        logger.error(f"Error during product analysis: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
