import React, { useState, useMemo, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { useLocation } from 'react-router-dom';
import { addYandexMetrika } from '../utils/yandexMetrika';
import { buildApiUrl } from '../utils/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SupplyAnalysis {
  sku: string;
  name: string;
  brand: string;
  category: string;
  
  // Базовые показатели
  total_sales: number;
  total_days: number;
  avg_daily_sales: number;
  start_balance: number;
  end_balance: number;
  avg_balance: number;
  turnover: number;
  
  // Планирование поставок
  target_stock: number;
  safety_stock: number;
  reorder_point: number;
  recommended_order: number;
  
  // Финансовый анализ
  revenue: number;
  cogs: number;
  margin: number;
  stock_value: number;
  
  // Анализ динамики
  sales_trend: number;
  trend: 'growth' | 'decline' | 'stable';
  trend_emoji: string;
  trend_text: string;
  
  // Прогнозы
  forecast_next_month: number;
  planned_deliveries: number;
  forecast_end_balance: number;
  
  // Анализ рисков
  shortage: number;
  overstock: number;
  out_of_stock_risk: number;
  
  // KPI
  days_of_supply: number;
  sales_to_stock_ratio: number;
  
  // Приоритет
  supply_priority: 'high' | 'medium' | 'low';
  supply_priority_emoji: string;
  supply_priority_text: string;
  
  // Оценка даты
  estimated_oos_date: string;
  
  // Графики данных
  sales_graph: Array<{
    date: string;
    sales: number;
    balance: number;
    price: number;
  }>;
}

export default function SupplyPlanning() {
  const location = useLocation();
  
  // Добавляем Yandex.Metrika счетчик
  useEffect(() => {
    addYandexMetrika('104758492');
  }, []);

  const [sku, setSku] = useState('');
  const [deliveryTime, setDeliveryTime] = useState(7);
  const [safetyDays, setSafetyDays] = useState(3);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [result, setResult] = useState<SupplyAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Функция для автоматического анализа
  const handleAutoAnalyze = async (skuValue: string, purchasePriceValue?: number) => {
    if (!skuValue.trim()) {
      setError('Введите SKU (артикул) товара');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    // Используем переданную закупочную цену или текущее состояние
    const finalPurchasePrice = purchasePriceValue !== undefined ? purchasePriceValue : purchasePrice;
    
    console.log('🔍 Автоматический анализ с параметрами:', {
      sku: skuValue,
      purchasePrice: finalPurchasePrice,
      deliveryTime,
      safetyDays
    });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('planning/monthly-analysis'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sku: skuValue,
          delivery_time: deliveryTime,
          safety_days: safetyDays,
          purchase_price: finalPurchasePrice
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка при анализе поставок');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при анализе');
    } finally {
      setLoading(false);
    }
  };

  // Обработка предзаполненных данных при переходе с других страниц
  useEffect(() => {
    if (location.state) {
      const { prefilledSku, prefilledPurchasePrice, autoAnalyze } = location.state as { 
        prefilledSku?: string; 
        prefilledPurchasePrice?: number;
        autoAnalyze?: boolean; 
      };
      
      if (prefilledSku) {
        console.log('📦 Получен предзаполненный SKU:', prefilledSku);
        setSku(prefilledSku);
        
        // Устанавливаем предзаполненную закупочную цену
        if (prefilledPurchasePrice && prefilledPurchasePrice > 0) {
          console.log('💰 Устанавливаем предзаполненную закупочную цену:', prefilledPurchasePrice);
          setPurchasePrice(prefilledPurchasePrice);
        }
        
        // Автоматически запускаем анализ, если указано
        if (autoAnalyze) {
          console.log('🚀 Автоматически запускаем анализ для SKU:', prefilledSku);
          setTimeout(() => {
            // Передаем закупочную цену напрямую в функцию анализа
            handleAutoAnalyze(prefilledSku, prefilledPurchasePrice || 0);
          }, 500); // Небольшая задержка для корректной установки состояния
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const analyzeSupply = async () => {
    if (!sku.trim()) {
      setError('Введите SKU (артикул) товара');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('planning/monthly-analysis'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sku,
          delivery_time: deliveryTime,
          safety_days: safetyDays,
          purchase_price: purchasePrice
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка при анализе плана поставок');
      }

      const data = await response.json();
      setResult(data.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Произошла ошибка при анализе');
    } finally {
      setLoading(false);
    }
  };

  // График динамики продаж и остатков
  const chartData = useMemo(() => {
    if (!result || !result.sales_graph || result.sales_graph.length === 0) return null;

    const labels = result.sales_graph.map(item => item.date);
    
    return {
      labels,
      datasets: [
        {
          label: 'Продажи (шт)',
          data: result.sales_graph.map(item => item.sales),
          borderColor: '#3B82F6',
          backgroundColor: '#3B82F620',
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: 'Остатки (шт)',
          data: result.sales_graph.map(item => item.balance),
          borderColor: '#10B981',
          backgroundColor: '#10B98120',
          tension: 0.4,
          yAxisID: 'y1',
        },
        {
          label: 'Цена (₽)',
          data: result.sales_graph.map(item => item.price),
          borderColor: '#F59E0B',
          backgroundColor: '#F59E0B20',
          tension: 0.4,
          yAxisID: 'y2',
        },
      ],
    };
  }, [result]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 14,
            weight: 'bold' as const
          }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Продажи (шт)',
          color: '#3B82F6'
        }
      },
      y1: {
        type: 'linear' as const,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Остатки (шт)',
          color: '#10B981'
        },
        grid: {
          drawOnChartArea: false,
        }
      },
      y2: {
        type: 'linear' as const,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Цена (₽)',
          color: '#F59E0B'
        },
        grid: {
          drawOnChartArea: false,
        }
      }
    }
  };

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      background: 'linear-gradient(135deg, rgb(157, 157, 157) 0%, rgb(229, 229, 229) 100%)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px', color: 'white' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
          📦 План поставок (30 дней)
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
          Полный анализ продаж за месяц на основе реальных данных MPStats API
        </p>
      </div>

      {/* Form */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        marginBottom: '30px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
              SKU (артикул)
            </label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Введите артикул"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
              Время доставки (дни)
            </label>
            <input
              type="number"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(Number(e.target.value))}
              min="1"
              max="30"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
              Страховой запас (дни)
            </label>
            <input
              type="number"
              value={safetyDays}
              onChange={(e) => setSafetyDays(Number(e.target.value))}
              min="0"
              max="10"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
              Закупочная цена (₽)
            </label>
            <input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(Number(e.target.value))}
              min="0"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>
        </div>

        <button
          onClick={analyzeSupply}
          disabled={loading}
          style={{
            width: '100%',
            padding: '15px',
            background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s'
          }}
        >
          {loading ? '📊 Анализируем данные...' : '🔍 Анализировать план поставок'}
        </button>
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Общие показатели */}
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            marginBottom: '30px'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#1f2937', fontSize: '1.5rem' }}>
              📊 Базовые показатели за 30 дней
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div style={{ padding: '15px', background: '#F3F4F6', borderRadius: '10px' }}>
                <div style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '5px' }}>Всего продаж</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{(result.total_sales || 0).toLocaleString('ru-RU')} шт</div>
              </div>
              <div style={{ padding: '15px', background: '#F3F4F6', borderRadius: '10px' }}>
                <div style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '5px' }}>Среднесуточные продажи</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{(result.avg_daily_sales || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} шт/день</div>
              </div>
              <div style={{ padding: '15px', background: '#F3F4F6', borderRadius: '10px' }}>
                <div style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '5px' }}>Оборотность</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{(result.turnover || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}</div>
              </div>
              <div style={{ padding: '15px', background: '#F3F4F6', borderRadius: '10px' }}>
                <div style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '5px' }}>Текущий остаток</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{(result.end_balance || 0).toLocaleString('ru-RU')} шт</div>
              </div>
            </div>
          </div>

          {/* Планирование поставок */}
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            marginBottom: '30px'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#1f2937', fontSize: '1.5rem' }}>
              🎯 Планирование поставок
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div style={{ padding: '15px', background: '#EFF6FF', borderRadius: '10px', border: '2px solid #3B82F6' }}>
                <div style={{ color: '#3B82F6', fontSize: '0.9rem', marginBottom: '5px' }}>Оптимальный запас</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{(result.target_stock || 0).toLocaleString('ru-RU')} шт</div>
              </div>
              <div style={{ padding: '15px', background: '#F0FDF4', borderRadius: '10px', border: '2px solid #10B981' }}>
                <div style={{ color: '#10B981', fontSize: '0.9rem', marginBottom: '5px' }}>Страховой запас</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{(result.safety_stock || 0).toLocaleString('ru-RU')} шт</div>
              </div>
              <div style={{ padding: '15px', background: '#FFF7ED', borderRadius: '10px', border: '2px solid #F59E0B' }}>
                <div style={{ color: '#F59E0B', fontSize: '0.9rem', marginBottom: '5px' }}>Точка заказа</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{(result.reorder_point || 0).toLocaleString('ru-RU')} шт</div>
              </div>
              <div style={{ padding: '15px', background: (result.recommended_order || 0) > 0 ? '#FEF2F2' : '#F0FDF4', borderRadius: '10px', border: `2px solid ${(result.recommended_order || 0) > 0 ? '#EF4444' : '#10B981'}` }}>
                <div style={{ color: (result.recommended_order || 0) > 0 ? '#EF4444' : '#10B981', fontSize: '0.9rem', marginBottom: '5px' }}>
                  {result.supply_priority_emoji || '📦'} Рекомендуемая поставка
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
                  {(result.recommended_order || 0).toLocaleString('ru-RU')} шт
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6B7280', marginTop: '5px' }}>
                  {result.supply_priority_text || 'Нет данных'}
                </div>
              </div>
            </div>
          </div>

          {/* Финансовый анализ */}
          {purchasePrice && purchasePrice > 0 && (
            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '20px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              marginBottom: '30px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#1f2937', fontSize: '1.5rem' }}>
                💰 Финансовый анализ
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div style={{ padding: '15px', background: '#F3F4F6', borderRadius: '10px' }}>
                  <div style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '5px' }}>Выручка</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{(result.revenue || 0).toLocaleString('ru-RU')} ₽</div>
                </div>
                <div style={{ padding: '15px', background: '#F3F4F6', borderRadius: '10px' }}>
                  <div style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '5px' }}>Себестоимость</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{(result.cogs || 0).toLocaleString('ru-RU')} ₽</div>
                </div>
                <div style={{ padding: '15px', background: '#F3F4F6', borderRadius: '10px' }}>
                  <div style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '5px' }}>Маржа</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{(result.margin || 0).toFixed(2)}%</div>
                </div>
                <div style={{ padding: '15px', background: '#F3F4F6', borderRadius: '10px' }}>
                  <div style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '5px' }}>Стоимость запасов</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{(result.stock_value || 0).toLocaleString('ru-RU')} ₽</div>
                </div>
              </div>
            </div>
          )}

          {/* Анализ рисков */}
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            marginBottom: '30px'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#1f2937', fontSize: '1.5rem' }}>
              ⚠️ Анализ рисков
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div style={{ padding: '15px', background: result.shortage > 0 ? '#FEF2F2' : '#F0FDF4', borderRadius: '10px', border: `2px solid ${result.shortage > 0 ? '#EF4444' : '#10B981'}` }}>
                <div style={{ color: result.shortage > 0 ? '#EF4444' : '#10B981', fontSize: '0.9rem', marginBottom: '5px' }}>
                  {result.shortage > 0 ? '⚠️' : '✅'} Дефицит
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{(result.shortage || 0).toLocaleString('ru-RU')} шт</div>
              </div>
              <div style={{ padding: '15px', background: result.overstock > 0 ? '#FEF2F2' : '#F0FDF4', borderRadius: '10px', border: `2px solid ${result.overstock > 0 ? '#F59E0B' : '#10B981'}` }}>
                <div style={{ color: result.overstock > 0 ? '#F59E0B' : '#10B981', fontSize: '0.9rem', marginBottom: '5px' }}>
                  {result.overstock > 0 ? '⚠️' : '✅'} Избыток
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{(result.overstock || 0).toLocaleString('ru-RU')} шт</div>
              </div>
              <div style={{ padding: '15px', background: '#FFF7ED', borderRadius: '10px', border: '2px solid #F59E0B' }}>
                <div style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '5px' }}>Дней запаса</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{(result.days_of_supply || 0).toFixed(1)} дней</div>
              </div>
              <div style={{ padding: '15px', background: '#FFF7ED', borderRadius: '10px', border: '2px solid #F59E0B' }}>
                <div style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '5px' }}>Прогнозируемый OOS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{result.estimated_oos_date || 'Нет данных'}</div>
              </div>
            </div>
          </div>

          {/* График динамики */}
          {chartData && (
            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '20px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              marginBottom: '30px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#1f2937', fontSize: '1.5rem' }}>
                📈 Динамика продаж и остатков за 30 дней
              </h2>
              <div style={{ height: '400px' }}>
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
