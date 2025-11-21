from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import sys
import os

# Добавляем корневую директорию в путь для импорта модулей
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

from supplier_analysis import get_supplier_analysis

router = APIRouter(prefix="/api/supplier", tags=["supplier-analysis"])

class SupplierAnalysisRequest(BaseModel):
    supplier_name: str

@router.post("/analysis")
async def analyze_supplier(request: SupplierAnalysisRequest) -> Dict[str, Any]:
    """
    Анализ поставщика на Wildberries
    
    Args:
        request: Запрос с именем поставщика
        
    Returns:
        Анализ поставщика с метриками и рекомендациями
    """
    try:
        if not request.supplier_name or not request.supplier_name.strip():
            raise HTTPException(
                status_code=400, 
                detail="Название поставщика не может быть пустым"
            )
        
        # Получаем анализ поставщика
        analysis_result = await get_supplier_analysis(request.supplier_name.strip())
        
        return {
            "success": True,
            "data": analysis_result,
            "message": f"Анализ поставщика '{request.supplier_name}' выполнен успешно"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при анализе поставщика: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """Проверка работоспособности модуля анализа поставщиков"""
    return {
        "status": "healthy",
        "module": "supplier_analysis",
        "message": "Модуль анализа поставщиков работает корректно"
    }












