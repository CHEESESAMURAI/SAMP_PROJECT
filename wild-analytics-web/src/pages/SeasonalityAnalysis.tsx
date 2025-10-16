import React, { useState } from 'react';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

interface AnnualSeasonalityData {
    noyeardate: string;
    season_revenue: number;
  holidays_revenue: number;
    season_sales: number;
  holidays_sales: number;
  season_pws: number;
  holidays_pws: number;
  holiday_name?: string;
}

interface WeeklySeasonalityData {
  day_of_week: number;
  day_name: string;
    weekly_revenue: number;
    weekly_sales: number;
  weekly_pws: number;
}

interface SeasonalityData {
  category_path: string;
  period: string;
  annual_data: AnnualSeasonalityData[];
  weekly_data: WeeklySeasonalityData[];
}

const SeasonalityAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SeasonalityData | null>(null);
  const [categoryPath, setCategoryPath] = useState('Для женщин/Одежда/Платья');
  const [period, setPeriod] = useState('day');
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'sales' | 'pws'>('revenue');
  const [showHolidays, setShowHolidays] = useState(true);
  const [error, setError] = useState('');

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const analyzeSeasonality = async () => {
    if (!categoryPath.trim()) {
      setError('Пожалуйста, укажите категорию товаров');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      console.log('🔍 Starting seasonality analysis for:', categoryPath);
      
      const response = await axios.post(`${API_BASE}/seasonality`, {
        category_path: categoryPath,
        period: period
      });

      console.log('✅ Seasonality data received:', response.data);
      setData(response.data);
    } catch (error: any) {
      console.error('❌ Seasonality analysis error:', error);
      setError(error.response?.data?.detail || 'Ошибка при анализе сезонности');
    } finally {
      setLoading(false);
    }
  };

  // Подготовка данных для годового графика
  const getAnnualChartData = () => {
    if (!data?.annual_data) return null;

    const sortedData = [...data.annual_data].sort((a, b) => {
      const dateA = new Date(`2024-${a.noyeardate}`);
      const dateB = new Date(`2024-${b.noyeardate}`);
      return dateA.getTime() - dateB.getTime();
    });

    const labels = sortedData.map(item => {
      const [month, day] = item.noyeardate.split('-');
      return `${day}.${month}`;
    });

    const metricKey = `season_${selectedMetric}` as keyof AnnualSeasonalityData;
    const holidayMetricKey = `holidays_${selectedMetric}` as keyof AnnualSeasonalityData;

    const seasonData = sortedData.map(item => item[metricKey] as number);
    const holidayData = showHolidays ? sortedData.map(item => item[holidayMetricKey] as number) : [];

    const datasets = [
      {
        label: `Общая сезонность (${getMetricLabel()})`,
        data: seasonData,
        borderColor: getMetricColor(),
        backgroundColor: getMetricColor() + '20',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: getMetricColor(),
        tension: 0.4
      }
    ];

    if (showHolidays) {
      datasets.push({
        label: `Влияние праздников (${getMetricLabel()})`,
        data: holidayData,
        borderColor: '#ff6b6b',
        backgroundColor: '#ff6b6b20',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#ff6b6b',
        tension: 0.4,
        borderDash: [5, 5]
      } as any);
    }

    return {
      labels,
      datasets
    };
  };

  // Подготовка данных для недельного графика
  const getWeeklyChartData = () => {
    if (!data?.weekly_data) return null;

    const sortedData = [...data.weekly_data].sort((a, b) => a.day_of_week - b.day_of_week);
    const labels = sortedData.map(item => item.day_name);

    const revenueData = sortedData.map(item => item.weekly_revenue);
    const salesData = sortedData.map(item => item.weekly_sales);
    const pwsData = sortedData.map(item => item.weekly_pws);

    return {
      labels,
      datasets: [
        {
          label: 'Выручка (%)',
          data: revenueData,
          backgroundColor: '#4CAF50',
          borderColor: '#4CAF50',
          borderWidth: 1
        },
        {
          label: 'Продажи (%)',
          data: salesData,
          backgroundColor: '#2196F3',
          borderColor: '#2196F3',
          borderWidth: 1
        },
        {
          label: 'Ассортимент (%)',
          data: pwsData,
          backgroundColor: '#9C27B0',
          borderColor: '#9C27B0',
          borderWidth: 1
        }
      ]
    };
  };

  const getMetricLabel = () => {
    switch (selectedMetric) {
      case 'revenue': return 'Выручка';
      case 'sales': return 'Продажи';
      case 'pws': return 'Ассортимент';
      default: return 'Показатель';
    }
  };

  const getMetricColor = () => {
    switch (selectedMetric) {
      case 'revenue': return '#4CAF50';
      case 'sales': return '#2196F3';
      case 'pws': return '#9C27B0';
      default: return '#757575';
    }
  };

  const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#ddd',
          borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y;
            const change = value > 100 ? '+' : '';
            return `${context.dataset.label}: ${change}${(value - 100).toFixed(1)}% от среднего`;
          }
        }
      }
      },
      scales: {
        x: { 
        display: true,
        title: {
          display: true,
          text: 'Дата'
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
        },
        y: {
        display: true,
        title: {
          display: true,
          text: '% отклонение от среднего'
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value: any) {
            const change = value - 100;
            return change > 0 ? `+${change}%` : `${change}%`;
          }
        }
        }
      },
      interaction: {
        mode: 'nearest' as const,
        axis: 'x' as const,
      intersect: false
    }
  };

  const weeklyChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
        },
        tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#ddd',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y;
            const change = value > 100 ? '+' : '';
            return `${context.dataset.label}: ${change}${(value - 100).toFixed(1)}% от среднего`;
          }
        }
      }
      },
      scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'День недели'
        },
        grid: {
          display: false
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: '% отклонение от среднего'
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value: any) {
            const change = value - 100;
            return change > 0 ? `+${change}%` : `${change}%`;
          }
        }
      }
    }
  };

    return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh'
    }}>
      {/* Заголовок */}
      <div style={{ textAlign: 'center', marginBottom: '30px', color: 'white' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
          📅 Анализ сезонности
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
          Исследуйте сезонные паттерны продаж, выручки и ассортимента по категориям товаров
        </p>
      </div>

      {/* Панель управления */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        marginBottom: '30px'
      }}>
        <h3 style={{ fontSize: '1.5rem', color: '#1f2937', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🎯 Параметры анализа
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '25px'
        }}>
          <div>
            <label style={{ fontWeight: '600', color: '#6b7280', marginBottom: '8px', display: 'block' }}>
              📁 Категория товаров:
            </label>
            <input
              type="text"
              value={categoryPath}
              onChange={(e) => setCategoryPath(e.target.value)}
              placeholder="Например: Для женщин/Одежда/Платья"
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '14px',
                transition: 'border-color 0.3s'
              }}
            />
          </div>

          <div>
            <label style={{ fontWeight: '600', color: '#6b7280', marginBottom: '8px', display: 'block' }}>
              📅 Период анализа:
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="day">День</option>
              <option value="week">Неделя</option>
              <option value="month">Месяц</option>
            </select>
          </div>

          <div>
            <label style={{ fontWeight: '600', color: '#6b7280', marginBottom: '8px', display: 'block' }}>
              📊 Показатель:
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as 'revenue' | 'sales' | 'pws')}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="revenue">💰 Выручка</option>
              <option value="sales">📦 Продажи</option>
              <option value="pws">🎯 Ассортимент</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', paddingTop: '30px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontWeight: '600', 
              color: '#6b7280',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={showHolidays}
                onChange={(e) => setShowHolidays(e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
              🎄 Показать влияние праздников
            </label>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={analyzeSeasonality}
            disabled={loading}
            style={{
              padding: '15px 40px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.3s'
            }}
          >
            {loading ? '⏳ Анализируем...' : '🚀 Анализировать сезонность'}
          </button>
        </div>
      </div>

      {/* Ошибки */}
      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#dc2626',
          padding: '15px 20px',
          borderRadius: '15px',
          marginBottom: '30px',
          fontSize: '16px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
          ❌ {error}
        </div>
      )}

            {/* Результаты анализа */}
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Информация о категории */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.8rem', color: '#1f2937', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📂 {data.category_path}
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '10px' }}>
                <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '5px' }}>📅 Период:</div>
                <div style={{ fontWeight: '700', color: '#1f2937' }}>
                  {period === 'day' ? 'День' : period === 'week' ? 'Неделя' : 'Месяц'}
                </div>
              </div>
              
              <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '10px' }}>
                <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '5px' }}>📊 Годовых точек:</div>
                <div style={{ fontWeight: '700', color: '#667eea' }}>{data.annual_data.length}</div>
              </div>
              
              <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '10px' }}>
                <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '5px' }}>📈 Недельных точек:</div>
                <div style={{ fontWeight: '700', color: '#10b981' }}>{data.weekly_data.length}</div>
              </div>
              
              <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '10px' }}>
                <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '5px' }}>📊 Выбранная метрика:</div>
                <div style={{ fontWeight: '700', color: '#8b5cf6' }}>{getMetricLabel()}</div>
              </div>
            </div>
          </div>

          {/* График годовой сезонности */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <div style={{ marginBottom: '25px' }}>
              <h2 style={{ fontSize: '1.8rem', color: '#1f2937', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                📈 Годовая сезонность - {getMetricLabel()}
              </h2>
              <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                Показывает изменения {getMetricLabel().toLowerCase()} в течение года с учетом сезонных факторов
              </p>
            </div>
            <div style={{ height: '400px', background: '#f9fafb', borderRadius: '15px', padding: '20px' }}>
              {getAnnualChartData() && (
                <Line data={getAnnualChartData()!} options={chartOptions} />
              )}
            </div>
          </div>

          {/* График недельной сезонности */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <div style={{ marginBottom: '25px' }}>
              <h2 style={{ fontSize: '1.8rem', color: '#1f2937', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                📊 Недельная сезонность
              </h2>
              <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                Сравнение показателей выручки, продаж и ассортимента по дням недели
              </p>
            </div>
            <div style={{ height: '400px', background: '#f9fafb', borderRadius: '15px', padding: '20px' }}>
              {getWeeklyChartData() && (
                <Bar data={getWeeklyChartData()!} options={weeklyChartOptions} />
              )}
            </div>
          </div>

          {/* Дополнительная аналитика */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.8rem', color: '#1f2937', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              💡 Ключевые инсайты
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {data.annual_data.filter(item => item.holiday_name).length > 0 && (
                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
                  borderRadius: '15px',
                  border: '2px solid #f59e0b'
                }}>
                  <h4 style={{ fontSize: '1.2rem', color: '#92400e', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎄 Праздничные периоды
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {data.annual_data
                      .filter(item => item.holiday_name)
                      .map((item, index) => (
                        <span key={index} style={{
                          background: '#f59e0b',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          fontWeight: '600'
                        }}>
                          {item.holiday_name} ({item.noyeardate})
                        </span>
                      ))}
                  </div>
                </div>
              )}

              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                borderRadius: '15px',
                border: '2px solid #10b981'
              }}>
                <h4 style={{ fontSize: '1.2rem', color: '#065f46', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📅 Лучший день недели
                </h4>
                <p style={{ color: '#065f46', fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                  {data.weekly_data.reduce((best, current) => 
                    current.weekly_revenue > best.weekly_revenue ? current : best
                  ).day_name} - самый высокий показатель выручки
                </p>
              </div>

              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #fde2e7 0%, #fbb6ce 100%)',
                borderRadius: '15px',
                border: '2px solid #ec4899'
              }}>
                <h4 style={{ fontSize: '1.2rem', color: '#be185d', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📉 Слабые периоды
                </h4>
                <p style={{ color: '#be185d', fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                  {data.weekly_data.reduce((worst, current) => 
                    current.weekly_revenue < worst.weekly_revenue ? current : worst
                  ).day_name} - самый низкий показатель выручки
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonalityAnalysis; 