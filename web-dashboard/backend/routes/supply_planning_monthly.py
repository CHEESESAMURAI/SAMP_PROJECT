"""
Полный анализ плана поставок на основе реальных данных MPStats API за 30 дней
"""

from fastapi import APIRouter, Query, Body, Depends, HTTPException
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import httpx
import logging
import sys
import os

# Add parent directory to path for config import
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from config import MPSTATS_API_KEY

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/monthly-analysis")
async def analyze_supply_planning_monthly(
    request: Dict[str, Any] = Body(...),
) -> Dict[str, Any]:
    """
    Полный анализ плана поставок на основе данных за последние 30 дней
    """
    try:
        sku = request.get('sku')
        delivery_time = request.get('delivery_time', 7)  # дней на доставку
        safety_days = request.get('safety_days', 3)  # страховой запас в днях
        purchase_price = request.get('purchase_price', 0)  # закупочная цена
        
        if not sku:
            raise HTTPException(status_code=400, detail="SKU required")
        
        # Получаем данные за последние 30 дней
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        d1 = start_date.strftime('%Y-%m-%d')
        d2 = end_date.strftime('%Y-%m-%d')
        
        url = f"https://mpstats.io/api/wb/get/item/{sku}/sales"
        params = {
            'd1': d1,
            'd2': d2,
            'fbs': 1
        }
        headers = {
            'X-Mpstats-TOKEN': MPSTATS_API_KEY,
            'Content-Type': 'application/json'
        }
        
        logger.info(f"📊 Fetching sales data for SKU {sku} from {d1} to {d2}")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, headers=headers, timeout=30.0)
        
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"SKU {sku} not found")
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch data from MPStats")
        
        sales_data = response.json()
        
        if not sales_data or len(sales_data) == 0:
            raise HTTPException(status_code=404, detail="No sales data available")
        
        # Обрабатываем данные
        analysis = calculate_monthly_supply_analysis(
            sales_data, 
            delivery_time, 
            safety_days, 
            purchase_price
        )
        
        return {
            "success": True,
            "data": analysis
        }
    
    except httpx.TimeoutException:
        logger.error(f"Timeout fetching data for SKU {sku}")
        raise HTTPException(status_code=504, detail="Request timeout")
    except Exception as e:
        logger.error(f"Error analyzing SKU {sku}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def calculate_monthly_supply_analysis(
    sales_data: List[Dict],
    delivery_time: int,
    safety_days: int,
    purchase_price: float
) -> Dict[str, Any]:
    """
    Расчет полной аналитики поставок на основе реальных данных
    """
    
    # Сортируем данные по дате (от старых к новым)
    sales_data_sorted = sorted(sales_data, key=lambda x: x.get('data', ''))
    
    # Базовые показатели
    total_sales = sum(int(item.get('sales', 0)) for item in sales_data_sorted)
    total_days = len(sales_data_sorted)
    avg_daily_sales = total_sales / total_days if total_days > 0 else 0
    
    # Остатки
    start_balance = int(sales_data_sorted[0].get('balance', 0)) if sales_data_sorted else 0
    end_balance = int(sales_data_sorted[-1].get('balance', 0)) if sales_data_sorted else 0
    avg_balance = (start_balance + end_balance) / 2
    
    # Оборачиваемость
    turnover = total_sales / avg_balance if avg_balance > 0 else 0
    
    # Планирование поставок
    target_stock = avg_daily_sales * (delivery_time + safety_days)
    
    # Максимальные продажи за день
    max_daily_sales = max(int(item.get('sales', 0)) for item in sales_data_sorted) if sales_data_sorted else 0
    safety_stock = (max_daily_sales - avg_daily_sales) * delivery_time if max_daily_sales > avg_daily_sales else 0
    
    # Точка заказа
    reorder_point = avg_daily_sales * delivery_time + safety_stock
    
    # Рекомендуемый объем поставки
    recommended_order = max(0, target_stock - end_balance)
    
    # Финансовый анализ
    revenue = sum(
        int(item.get('sales', 0)) * int(item.get('client_price', item.get('final_price', 0)))
        for item in sales_data_sorted
    )
    
    cogs = total_sales * purchase_price if purchase_price > 0 else 0
    margin = ((revenue - cogs) / revenue * 100) if revenue > 0 else 0
    stock_value = end_balance * purchase_price if purchase_price > 0 else 0
    
    # Анализ динамики (первая неделя vs последняя неделя)
    if len(sales_data_sorted) >= 14:
        first_week_sales = sum(int(item.get('sales', 0)) for item in sales_data_sorted[:7])
        last_week_sales = sum(int(item.get('sales', 0)) for item in sales_data_sorted[-7:])
        
        sales_trend = ((last_week_sales - first_week_sales) / first_week_sales * 100) if first_week_sales > 0 else 0
    else:
        sales_trend = 0
    
    # Прогнозы
    forecast_next_month = avg_daily_sales * 30 * (1 + sales_trend / 100)
    planned_deliveries = recommended_order
    forecast_end_balance = end_balance - forecast_next_month + planned_deliveries
    
    # Анализ рисков
    shortage = max(0, reorder_point - end_balance) if end_balance < reorder_point else 0
    overstock = max(0, end_balance - target_stock) if end_balance > target_stock else 0
    out_of_stock_risk = (end_balance / reorder_point * 100) if reorder_point > 0 else 0
    
    # KPI
    days_of_supply = end_balance / avg_daily_sales if avg_daily_sales > 0 else 0
    sales_to_stock_ratio = total_sales / (avg_balance + total_sales) if (avg_balance + total_sales) > 0 else 0
    
    # Приоритет поставки
    if end_balance < reorder_point:
        supply_priority = "high"
        supply_priority_emoji = "🔴"
        supply_priority_text = "Срочно"
    elif days_of_supply < delivery_time + safety_days:
        supply_priority = "medium"
        supply_priority_emoji = "🟡"
        supply_priority_text = "Важно"
    else:
        supply_priority = "low"
        supply_priority_emoji = "🟢"
        supply_priority_text = "В порядке"
    
    # Тренд продаж
    if sales_trend > 10:
        trend = "growth"
        trend_emoji = "📈"
        trend_text = "Рост"
    elif sales_trend < -10:
        trend = "decline"
        trend_emoji = "📉"
        trend_text = "Падение"
    else:
        trend = "stable"
        trend_emoji = "➡️"
        trend_text = "Стабильно"
    
    # Даты
    estimated_oos_date = datetime.now() + timedelta(days=int(days_of_supply)) if days_of_supply > 0 else datetime.now()
    
    return {
        "sku": sales_data_sorted[0].get('id', '') if sales_data_sorted else '',
        "name": sales_data_sorted[0].get('name', '') if sales_data_sorted else '',
        "brand": sales_data_sorted[0].get('brand', '') if sales_data_sorted else '',
        "category": sales_data_sorted[0].get('category', '') if sales_data_sorted else '',
        
        # Базовые показатели
        "total_sales": total_sales,
        "total_days": total_days,
        "avg_daily_sales": round(avg_daily_sales, 2),
        "start_balance": start_balance,
        "end_balance": end_balance,
        "avg_balance": round(avg_balance, 2),
        "turnover": round(turnover, 2),
        
        # Планирование поставок
        "target_stock": round(target_stock, 0),
        "safety_stock": round(safety_stock, 0),
        "reorder_point": round(reorder_point, 0),
        "recommended_order": round(recommended_order, 0),
        
        # Финансовый анализ
        "revenue": revenue,
        "cogs": cogs,
        "margin": round(margin, 2),
        "stock_value": round(stock_value, 0),
        
        # Анализ динамики
        "sales_trend": round(sales_trend, 2),
        "trend": trend,
        "trend_emoji": trend_emoji,
        "trend_text": trend_text,
        
        # Прогнозы
        "forecast_next_month": round(forecast_next_month, 0),
        "planned_deliveries": round(planned_deliveries, 0),
        "forecast_end_balance": round(forecast_end_balance, 0),
        
        # Анализ рисков
        "shortage": round(shortage, 0),
        "overstock": round(overstock, 0),
        "out_of_stock_risk": round(out_of_stock_risk, 2),
        
        # KPI
        "days_of_supply": round(days_of_supply, 1),
        "sales_to_stock_ratio": round(sales_to_stock_ratio, 3),
        
        # Приоритет
        "supply_priority": supply_priority,
        "supply_priority_emoji": supply_priority_emoji,
        "supply_priority_text": supply_priority_text,
        
        # Оценка даты
        "estimated_oos_date": estimated_oos_date.strftime('%Y-%m-%d'),
        
        # Графики данных
        "sales_graph": [
            {
                "date": item.get('data'),
                "sales": int(item.get('sales', 0)),
                "balance": int(item.get('balance', 0)),
                "price": int(item.get('client_price', item.get('final_price', 0)))
            }
            for item in sales_data_sorted
        ]
    }

