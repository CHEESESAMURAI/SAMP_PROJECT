import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { addYandexMetrika } from '../utils/yandexMetrika';
import { buildApiUrl } from '../utils/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
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

// ✅ Плагин для выделения зоны прогноза
const forecastShadePlugin = {
  id: 'forecastShade',
  beforeDraw: (chart: any, _args: any, pluginOptions: any) => {
    const startIndex = pluginOptions?.startIndex;
    if (startIndex === null || startIndex === undefined) {
      return;
    }

    const xScale = chart.scales?.x;
    if (!xScale || !chart.data?.labels?.length) {
      return;
    }

    const labelsCount = chart.data.labels.length;
    if (startIndex >= labelsCount) {
      return;
    }

    const labelAtIndex = chart.data.labels[startIndex];
    const startPixel = xScale.getPixelForValue(labelAtIndex ?? startIndex);
    if (!Number.isFinite(startPixel)) {
      return;
    }

    const { top, bottom, right } = chart.chartArea;
    if (startPixel >= right) {
      return;
    }

    const ctx = chart.ctx;
    ctx.save();
    
    // Более заметный фон для зоны прогноза с градиентом
    const gradient = ctx.createLinearGradient(startPixel, top, right, bottom);
    gradient.addColorStop(0, pluginOptions?.backgroundColor || 'rgba(59, 130, 246, 0.2)');
    gradient.addColorStop(1, pluginOptions?.backgroundColor || 'rgba(59, 130, 246, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(startPixel, top, right - startPixel, bottom - top);
    
    // Добавляем вертикальную линию-разделитель с более заметным стилем
    ctx.strokeStyle = pluginOptions?.borderColor || 'rgba(59, 130, 246, 0.6)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(startPixel, top);
    ctx.lineTo(startPixel, bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Подпись "Прогноз" с более заметным стилем и рамкой
    const text = pluginOptions?.label || 'Прогноз';
    ctx.font = pluginOptions?.font || 'bold 16px "Inter", sans-serif';
    const textMetrics = ctx.measureText(text);
    const textX = startPixel + 15;
    const textY = top + 28;
    
    // Фон для текста с рамкой для лучшей читаемости
    const padding = 8;
    const bgWidth = textMetrics.width + padding * 2;
    const bgHeight = 24;
    const bgX = textX - padding;
    const bgY = textY - bgHeight + 6;
    
    // Белый фон с тенью
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
    
    // Рамка вокруг текста
    ctx.strokeStyle = pluginOptions?.labelColor || '#1e40af';
    ctx.lineWidth = 2;
    ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);
    
    // Текст
    ctx.fillStyle = pluginOptions?.labelColor || '#1e40af';
    ctx.fillText(text, textX, textY);
    ctx.restore();
  },
};

interface BrandAnalysisData {
  brand_info: {
    name: string;
    total_products: number;
    total_revenue: number;
    total_sales: number;
    average_price: number;
    average_turnover_days: number;
    date_range: string;
  };
  top_products: Array<{
    name: string;
    category: string;
    final_price: number;
    rating: number;
    sales: number;
    revenue: number;
    url: string;
    thumb_url: string;
    article: string;
    comments: number;
  }>;
  all_products: Array<{
    name: string;
    category: string;
    final_price: number;
    sales: number;
    revenue: number;
    rating: number;
    balance: number;
    purchase: number;
    turnover_days: number;
    comments: number;
    sku_first_date: string;
    basic_sale: number;
    promo_sale: number;
    client_sale: number;
    start_price: number;
    basic_price: number;
    client_price: number;
    category_position: number;
    country: string;
    gender: string;
    picscount: number;
    hasvideo: boolean;
    has3d: boolean;
    article: string;
    url: string;
    is_fbs: boolean;
    thumb_url?: string; // Добавляем thumb_url как опциональное поле
  }>;
  aggregated_charts: {
    sales_graph: { dates: string[]; values: number[] };
    stocks_graph: { dates: string[]; values: number[] };
    price_graph: { dates: string[]; values: number[] };
    visibility_graph: { dates: string[]; values: number[] };
  };
  brand_metrics: {
    products_with_sales: number;
    products_with_sales_percentage: number;
    average_rating: number;
    total_comments: number;
    fbs_percentage: number;
    video_products_count: number;
    d3_products_count: number;
    top_categories: Array<{ name: string; count: number }>;
  };
  metadata: {
    request_params: any;
    processing_info: any;
  };
}

export default function BrandAnalysis() {
  const location = useLocation();
  const navigate = useNavigate();
  const [brandName, setBrandName] = useState('');
  const [data, setData] = useState<BrandAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    fbs: 0,
    newsmode: 0,
    period: 90
  });
  const [tableView, setTableView] = useState<'basic' | 'detailed'>('basic');
  const [sortField, setSortField] = useState<string>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeMetrics, setActiveMetrics] = useState<Record<string, boolean>>({});
  const [brandDailyData, setBrandDailyData] = useState<any[]>([]);
  const [brandTrendsData, setBrandTrendsData] = useState<any[]>([]);
  const [brandCategoriesData, setBrandCategoriesData] = useState<any[]>([]);
  const [brandSellersData, setBrandSellersData] = useState<any[]>([]);
  const [brandItemsData, setBrandItemsData] = useState<any[]>([]);
  
  const getDateRange = useCallback((days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    return {
      date_from: startDate.toISOString().split('T')[0],
      date_to: endDate.toISOString().split('T')[0]
    };
  }, []);
  
  // Добавляем Yandex.Metrika счетчик для анализа брендов
  useEffect(() => {
    addYandexMetrika('104757643');
  }, []);

  // Автоматический запуск анализа при получении бренда из state
  useEffect(() => {
    const state = location.state as { brandName?: string } | null;
    if (state?.brandName && state.brandName !== brandName) {
      console.log('🏷️ Auto-analyzing brand from navigation:', state.brandName);
      setBrandName(state.brandName);
      
      // Запускаем анализ с переданным брендом
      const runAnalysis = async () => {
        setLoading(true);
        setError('');
        setData(null);

        try {
          const dateRange = getDateRange(filters.period);
          
          const response = await fetch(buildApiUrl('brand/brand-analysis'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              brand_name: state.brandName,
              date_from: dateRange.date_from,
              date_to: dateRange.date_to,
              fbs: filters.fbs,
              newsmode: filters.newsmode
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            let errorMessage = `HTTP error! status: ${response.status}`;
            
            if (errorData?.detail) {
              errorMessage = errorData.detail;
            } else {
              switch (response.status) {
                case 401:
                  errorMessage = 'Ошибка авторизации MPStats API. Проверьте API токен.';
                  break;
                case 404:
                  errorMessage = `Бренд "${state.brandName}" не найден. Проверьте правильность названия.`;
                  break;
                case 408:
                  errorMessage = 'Timeout запроса. MPStats API недоступен.';
                  break;
                case 500:
                  errorMessage = 'Внутренняя ошибка сервера. Попробуйте позже.';
                  break;
                default:
                  errorMessage = `Ошибка API: ${response.status}`;
              }
            }
            
            throw new Error(errorMessage);
          }

          const result = await response.json();
          
          if (!result.brand_info || result.brand_info.total_products === 0) {
            throw new Error(`Нет данных для бренда "${state.brandName}" за указанный период. Попробуйте изменить фильтры или период.`);
          }
          
          setData(result);
          
          // ✅ Загружаем дополнительные данные для единого графика
          if (result.brand_info?.name) {
            try {
              const dateRange = getDateRange(filters.period);
              
              // Получаем данные по дням
              const dailyResponse = await fetch(
                buildApiUrl(`mpstats-brand/by_date?path=${encodeURIComponent(result.brand_info.name)}&d1=${dateRange.date_from}&d2=${dateRange.date_to}&groupBy=day&fbs=${filters.fbs}`),
                {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                }
              );
              if (dailyResponse.ok) {
                const dailyData = await dailyResponse.json();
                console.log('📊 Получены данные по дням:', dailyData?.length || 0, 'дней');
                setBrandDailyData(Array.isArray(dailyData) ? dailyData : []);
              } else {
                console.warn('⚠️ Ошибка получения данных по дням:', dailyResponse.status);
              }
              
              // Получаем данные трендов
              const trendsResponse = await fetch(
                buildApiUrl(`mpstats-brand/trends?path=${encodeURIComponent(result.brand_info.name)}&d1=${dateRange.date_from}&d2=${dateRange.date_to}&fbs=${filters.fbs}`),
                {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                }
              );
              if (trendsResponse.ok) {
                const trendsData = await trendsResponse.json();
                console.log('📊 Получены данные трендов:', trendsData?.length || 0, 'периодов');
                setBrandTrendsData(Array.isArray(trendsData) ? trendsData : []);
              } else {
                console.warn('⚠️ Ошибка получения данных трендов:', trendsResponse.status);
              }
              
              // Получаем данные категорий
              const categoriesResponse = await fetch(
                buildApiUrl(`mpstats-brand/categories?path=${encodeURIComponent(result.brand_info.name)}&d1=${dateRange.date_from}&d2=${dateRange.date_to}&fbs=${filters.fbs}`),
                {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                }
              );
              if (categoriesResponse.ok) {
                const categoriesData = await categoriesResponse.json();
                console.log('📊 Получены данные категорий:', categoriesData?.length || 0, 'категорий');
                console.log('📊 Первые 3 категории:', categoriesData?.slice(0, 3));
                setBrandCategoriesData(Array.isArray(categoriesData) ? categoriesData : []);
              } else {
                const errorText = await categoriesResponse.text().catch(() => 'Unknown error');
                console.warn('⚠️ Ошибка получения данных категорий:', categoriesResponse.status, errorText);
                setBrandCategoriesData([]);
              }
              
              // Получаем данные продавцов
              const sellersResponse = await fetch(
                buildApiUrl(`mpstats-brand/sellers?path=${encodeURIComponent(result.brand_info.name)}&d1=${dateRange.date_from}&d2=${dateRange.date_to}&fbs=${filters.fbs}`),
                {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                }
              );
              if (sellersResponse.ok) {
                const sellersData = await sellersResponse.json();
                console.log('📊 Получены данные продавцов:', sellersData?.length || 0, 'продавцов');
                setBrandSellersData(Array.isArray(sellersData) ? sellersData : []);
              } else {
                console.warn('⚠️ Ошибка получения данных продавцов:', sellersResponse.status);
              }
              
              // Получаем данные предметов
              const itemsResponse = await fetch(
                buildApiUrl(`mpstats-brand/items?path=${encodeURIComponent(result.brand_info.name)}&d1=${dateRange.date_from}&d2=${dateRange.date_to}&fbs=${filters.fbs}`),
                {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                }
              );
              if (itemsResponse.ok) {
                const itemsData = await itemsResponse.json();
                console.log('📊 Получены данные предметов:', itemsData?.length || 0, 'предметов');
                setBrandItemsData(Array.isArray(itemsData) ? itemsData : []);
              } else {
                console.warn('⚠️ Ошибка получения данных предметов:', itemsResponse.status);
              }
            } catch (err) {
              console.warn('⚠️ Failed to fetch additional brand data:', err);
            }
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Произошла неизвестная ошибка при анализе бренда';
          setError(errorMessage);
          console.error('Brand analysis error:', err);
        } finally {
          setLoading(false);
        }
      };
      
      runAnalysis();
    }
  }, [location.state, brandName, filters.fbs, filters.newsmode, filters.period, getDateRange]);

  const analyzeBrand = async () => {
    if (!brandName.trim()) {
      setError('Введите название бренда');
      return;
    }

    setLoading(true);
    setError('');
    setData(null);

    try {
      const dateRange = getDateRange(filters.period);
      
      const response = await fetch(buildApiUrl('brand/brand-analysis'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand_name: brandName,
          date_from: dateRange.date_from,
          date_to: dateRange.date_to,
          fbs: filters.fbs,
          newsmode: filters.newsmode
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        if (errorData?.detail) {
          errorMessage = errorData.detail;
        } else {
          switch (response.status) {
            case 401:
              errorMessage = 'Ошибка авторизации MPStats API. Проверьте API токен.';
              break;
            case 404:
              errorMessage = `Бренд "${brandName}" не найден. Проверьте правильность названия.`;
              break;
            case 408:
              errorMessage = 'Timeout запроса. MPStats API недоступен.';
              break;
            case 500:
              errorMessage = 'Внутренняя ошибка сервера. Попробуйте позже.';
              break;
            default:
              errorMessage = `Ошибка API: ${response.status}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Проверяем, что получили данные
      if (!result.brand_info || result.brand_info.total_products === 0) {
        throw new Error(`Нет данных для бренда "${brandName}" за указанный период. Попробуйте изменить фильтры или период.`);
      }
      
      setData(result);
      
      // ✅ Загружаем дополнительные данные для единого графика
      if (result.brand_info?.name) {
        try {
          const dateRange = getDateRange(filters.period);
          
          // Получаем данные по дням
          const dailyResponse = await fetch(
            buildApiUrl(`mpstats-brand/by_date?path=${encodeURIComponent(result.brand_info.name)}&d1=${dateRange.date_from}&d2=${dateRange.date_to}&groupBy=day&fbs=${filters.fbs}`),
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
          if (dailyResponse.ok) {
            const dailyData = await dailyResponse.json();
            console.log('📊 Получены данные по дням:', dailyData?.length || 0, 'дней');
            setBrandDailyData(Array.isArray(dailyData) ? dailyData : []);
          } else {
            console.warn('⚠️ Ошибка получения данных по дням:', dailyResponse.status);
          }
          
          // Получаем данные трендов
          const trendsResponse = await fetch(
            buildApiUrl(`mpstats-brand/trends?path=${encodeURIComponent(result.brand_info.name)}&d1=${dateRange.date_from}&d2=${dateRange.date_to}&fbs=${filters.fbs}`),
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
          if (trendsResponse.ok) {
            const trendsData = await trendsResponse.json();
            console.log('📊 Получены данные трендов:', trendsData?.length || 0, 'периодов');
            setBrandTrendsData(Array.isArray(trendsData) ? trendsData : []);
          } else {
            console.warn('⚠️ Ошибка получения данных трендов:', trendsResponse.status);
          }
          
          // Получаем данные категорий
          const categoriesResponse = await fetch(
            buildApiUrl(`mpstats-brand/categories?path=${encodeURIComponent(result.brand_info.name)}&d1=${dateRange.date_from}&d2=${dateRange.date_to}&fbs=${filters.fbs}`),
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
          if (categoriesResponse.ok) {
            const categoriesData = await categoriesResponse.json();
            console.log('📊 Получены данные категорий:', categoriesData?.length || 0, 'категорий');
            console.log('📊 Первые 3 категории:', categoriesData?.slice(0, 3));
            setBrandCategoriesData(Array.isArray(categoriesData) ? categoriesData : []);
          } else {
            const errorText = await categoriesResponse.text().catch(() => 'Unknown error');
            console.warn('⚠️ Ошибка получения данных категорий:', categoriesResponse.status, errorText);
            setBrandCategoriesData([]);
          }
          
          // Получаем данные продавцов
          const sellersResponse = await fetch(
            buildApiUrl(`mpstats-brand/sellers?path=${encodeURIComponent(result.brand_info.name)}&d1=${dateRange.date_from}&d2=${dateRange.date_to}&fbs=${filters.fbs}`),
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
          if (sellersResponse.ok) {
            const sellersData = await sellersResponse.json();
            console.log('📊 Получены данные продавцов:', sellersData?.length || 0, 'продавцов');
            setBrandSellersData(Array.isArray(sellersData) ? sellersData : []);
          } else {
            console.warn('⚠️ Ошибка получения данных продавцов:', sellersResponse.status);
          }
          
          // Получаем данные предметов
          const itemsResponse = await fetch(
            buildApiUrl(`mpstats-brand/items?path=${encodeURIComponent(result.brand_info.name)}&d1=${dateRange.date_from}&d2=${dateRange.date_to}&fbs=${filters.fbs}`),
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
          if (itemsResponse.ok) {
            const itemsData = await itemsResponse.json();
            console.log('📊 Получены данные предметов:', itemsData?.length || 0, 'предметов');
            setBrandItemsData(Array.isArray(itemsData) ? itemsData : []);
          } else {
            console.warn('⚠️ Ошибка получения данных предметов:', itemsResponse.status);
          }
        } catch (err) {
          console.warn('⚠️ Failed to fetch additional brand data:', err);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла неизвестная ошибка при анализе бренда';
      setError(errorMessage);
      console.error('Brand analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  // ✅ Расчет общих показателей бренда
  const calculateBrandKPIs = useCallback((data: BrandAnalysisData) => {
    if (!data || !data.all_products || data.all_products.length === 0) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        lostProfit: 0,
        avgDailyRevenuePerItem: 0,
        averageOrderValue: 0,
        avgDailyItemsWithSalesPercent: 0,
        avgMonthlyPurchaseRate: 0,
      };
    }

    const products = data.all_products;
    const totalRevenue = data.brand_info.total_revenue;
    const totalOrders = data.brand_info.total_sales;
    const totalDays = filters.period;
    
    // Упущенная выручка по формуле:
    // Упущенная выручка = Общее количество артикулов × Дней × Среднедневная выручка на артикул × Процент непродающихся артикулов
    
    // 1. Общее количество артикулов
    const totalProducts = products.length;
    
    // 2. Среднедневная выручка на артикул (только для артикулов с продажами)
    const productsWithSales = products.filter(p => (Number(p.sales) || 0) > 0);
    let avgDailyRevenuePerItem = 0;
    
    if (productsWithSales.length > 0 && totalDays > 0) {
      const totalRevenueFromProductsWithSales = productsWithSales.reduce((sum, p) => {
        return sum + (Number(p.revenue) || 0);
      }, 0);
      
      // Средняя выручка на артикул с продажами за весь период
      const avgRevenuePerItemWithSales = totalRevenueFromProductsWithSales / productsWithSales.length;
      
      // Среднедневная выручка на артикул с продажами
      avgDailyRevenuePerItem = avgRevenuePerItemWithSales / totalDays;
    }
    
    // Если нет артикулов с продажами, используем общую выручку
    if (avgDailyRevenuePerItem === 0 && totalProducts > 0 && totalDays > 0 && totalRevenue > 0) {
      avgDailyRevenuePerItem = totalRevenue / totalProducts / totalDays;
    }
    
    // 3. Процент непродающихся артикулов
    const productsWithoutSales = products.filter(p => (Number(p.sales) || 0) === 0);
    const percentNonSellingProducts = totalProducts > 0 
      ? (productsWithoutSales.length / totalProducts) 
      : 0;
    
    // 4. Расчет упущенной выручки
    let lostProfit = 0;
    
    // Основной расчет по формуле
    if (totalProducts > 0 && totalDays > 0 && avgDailyRevenuePerItem > 0 && percentNonSellingProducts > 0) {
      // Упущенная выручка = Общее количество артикулов × Дней × Среднедневная выручка на артикул × Процент непродающихся артикулов
      lostProfit = totalProducts * totalDays * avgDailyRevenuePerItem * percentNonSellingProducts;
    }
    
    // Если процент непродающихся артикулов = 0, но есть артикулы с низкими продажами, считаем упущенную выручку от них
    if (lostProfit === 0 && totalProducts > 0 && totalDays > 0 && avgDailyRevenuePerItem > 0) {
      // Находим артикулы с продажами ниже среднего
      if (productsWithSales.length > 0) {
        const avgSalesPerProduct = productsWithSales.reduce((sum, p) => sum + (Number(p.sales) || 0), 0) / productsWithSales.length;
        const lowSalesProducts = productsWithSales.filter(p => (Number(p.sales) || 0) < avgSalesPerProduct * 0.5);
        const percentLowSalesProducts = lowSalesProducts.length / totalProducts;
        
        if (percentLowSalesProducts > 0) {
          lostProfit = totalProducts * totalDays * avgDailyRevenuePerItem * percentLowSalesProducts * 0.5;
        }
      }
    }
    
    // Альтернативный расчет: если нет артикулов с продажами, используем среднюю цену
    if (lostProfit === 0 && totalProducts > 0 && totalDays > 0 && percentNonSellingProducts > 0) {
      const productsWithPrice = products.filter(p => (Number(p.final_price || p.basic_price) || 0) > 0);
      if (productsWithPrice.length > 0) {
        const avgPrice = productsWithPrice.reduce((sum, p) => {
          return sum + (Number(p.final_price || p.basic_price) || 0);
        }, 0) / productsWithPrice.length;
        
        // Консервативная оценка: если бы непродающиеся артикулы продавались хотя бы 0.1 раза в день
        const conservativeDailySales = 0.1;
        lostProfit = totalProducts * totalDays * avgPrice * conservativeDailySales * percentNonSellingProducts;
      }
    }
    
    // Если все еще 0, используем более простой расчет на основе общей выручки
    if (lostProfit === 0 && totalProducts > 0 && totalDays > 0 && totalRevenue > 0) {
      // Средняя выручка на артикул за период
      const avgRevenuePerProduct = totalRevenue / totalProducts;
      // Среднедневная выручка на артикул
      const avgDailyRevenuePerProduct = avgRevenuePerProduct / totalDays;
      
      // Если есть непродающиеся артикулы, используем их процент
      if (percentNonSellingProducts > 0) {
        lostProfit = totalProducts * totalDays * avgDailyRevenuePerProduct * percentNonSellingProducts;
      } else {
        // Если все артикулы продаются, считаем что могли бы продаваться лучше (на 20% больше)
        lostProfit = totalRevenue * 0.2;
      }
    }
    
    // Отладка: выводим информацию о расчете
    console.log('🔍 Lost Profit Calculation:', {
      totalProducts,
      totalDays,
      totalRevenue,
      productsWithSales: productsWithSales.length,
      productsWithoutSales: productsWithoutSales.length,
      percentNonSellingProducts: (percentNonSellingProducts * 100).toFixed(2) + '%',
      avgDailyRevenuePerItem: avgDailyRevenuePerItem.toFixed(2),
      lostProfit: lostProfit.toFixed(2),
      formula: `lostProfit = ${totalProducts} × ${totalDays} × ${avgDailyRevenuePerItem.toFixed(2)} × ${(percentNonSellingProducts * 100).toFixed(2)}%`,
      check: {
        totalProductsCheck: totalProducts > 0,
        totalDaysCheck: totalDays > 0,
        avgDailyRevenueCheck: avgDailyRevenuePerItem > 0,
        percentCheck: percentNonSellingProducts > 0,
      }
    });

    // Среднедневная выручка на артикул с продажи (используем уже вычисленное значение выше)
    // avgDailyRevenuePerItem уже вычислено выше для расчета упущенной выручки

    // Средний чек
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Среднедневной % артикулов с продажами
    // Вычисляем на основе данных о днях с продажами для каждого товара
    let totalDaysWithSales = 0;
    let totalDaysInStock = 0;
    
    products.forEach((p: any) => {
      const daysWithSales = p.days_with_sales || p.days_with_sale || 0;
      const daysInStock = p.days_in_stock || 0;
      
      if (daysWithSales > 0 && typeof daysWithSales === 'number') {
        totalDaysWithSales += daysWithSales;
      } else if (p.sales > 0) {
        // Если товар продавался, но нет данных о днях, оцениваем на основе продаж
        // Предполагаем, что если есть продажи, то товар продавался хотя бы часть дней
        const estimatedDays = Math.min(p.sales, totalDays);
        totalDaysWithSales += estimatedDays;
      }
      
      if (daysInStock > 0 && typeof daysInStock === 'number') {
        totalDaysInStock += daysInStock;
      } else if (p.balance > 0 || p.sales > 0) {
        // Если товар был в наличии или продавался, считаем что он был в наличии весь период
        totalDaysInStock += totalDays;
      }
    });
    
    // Вычисляем процент: сколько дней в среднем товары продавались от общего количества дней
    let avgDailyItemsWithSalesPercent = 0;
    
    if (products.length > 0 && totalDays > 0) {
      if (totalDaysInStock > 0) {
        // Процент дней с продажами от дней в наличии
        avgDailyItemsWithSalesPercent = (totalDaysWithSales / totalDaysInStock) * 100;
      } else {
        // Альтернативный расчет: процент товаров с продажами
        const productsWithSales = products.filter((p: any) => p.sales > 0).length;
        avgDailyItemsWithSalesPercent = (productsWithSales / products.length) * 100;
      }
    } else if (data.brand_metrics?.products_with_sales_percentage) {
      avgDailyItemsWithSalesPercent = data.brand_metrics.products_with_sales_percentage;
    }
    
    // Ограничиваем значение от 0 до 100
    avgDailyItemsWithSalesPercent = Math.max(0, Math.min(100, avgDailyItemsWithSalesPercent));

    // Среднемесячный процент выкупа
    const purchaseRates = products
      .map(p => p.purchase)
      .filter(p => typeof p === 'number' && p > 0);
    const avgMonthlyPurchaseRate = purchaseRates.length > 0
      ? purchaseRates.reduce((sum, p) => sum + p, 0) / purchaseRates.length
      : 0;

    return {
      totalRevenue,
      totalOrders,
      lostProfit,
      avgDailyRevenuePerItem,
      averageOrderValue,
      avgDailyItemsWithSalesPercent,
      avgMonthlyPurchaseRate,
    };
  }, [filters.period]);

  const brandKPIs = data ? calculateBrandKPIs(data) : null;

  // ✅ Функция для генерации прогнозных значений
  const generateForecastValues = useCallback((
    map: Map<string, number>,
    futureDates: string[],
    type: 'money' | 'count'
  ) => {
    if (futureDates.length === 0 || map.size === 0) return;
    
    const sortedEntries = Array.from(map.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    
    if (sortedEntries.length === 0) return;
    
    const lastValues = sortedEntries.slice(-7); // Последние 7 значений для расчета тренда
    const avgValue = lastValues.reduce((sum, [, val]) => sum + val, 0) / lastValues.length;
    
    // Простой прогноз на основе среднего значения с небольшим трендом
    const trend = lastValues.length > 1
      ? (lastValues[lastValues.length - 1][1] - lastValues[0][1]) / lastValues.length
      : 0;
    
    futureDates.forEach((date, index) => {
      if (!map.has(date)) {
        const forecastValue = Math.max(0, avgValue + trend * (index + 1) * 0.1);
        map.set(date, type === 'money' ? Math.round(forecastValue) : Math.round(forecastValue));
      }
    });
  }, []);

  // ✅ Функция для генерации будущих дат
  const generateFutureDates = useCallback((lastDate: string | null, days: number): string[] => {
    if (!lastDate) return [];
    const dates: string[] = [];
    const startDate = new Date(lastDate);
    for (let i = 1; i <= days; i++) {
      const nextDate = new Date(startDate);
      nextDate.setDate(startDate.getDate() + i);
      dates.push(nextDate.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  // ✅ Подготовка данных для единого графика метрик
  type MetricAxis = 'money' | 'count';
  interface UnifiedMetricConfig {
    id: string;
    label: string;
    color: string;
    axis: MetricAxis;
    map: Map<string, number>;
    defaultEnabled: boolean;
    borderDash?: number[];
    opacity?: number;
  }

  const unifiedChartData = useMemo(() => {
    if (!data || !data.aggregated_charts) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingDates = new Set<string>();
    
    // Добавляем даты из aggregated_charts
    data.aggregated_charts.sales_graph?.dates?.forEach((date) => date && existingDates.add(date));
    data.aggregated_charts.stocks_graph?.dates?.forEach((date) => date && existingDates.add(date));
    data.aggregated_charts.price_graph?.dates?.forEach((date) => date && existingDates.add(date));
    data.aggregated_charts.visibility_graph?.dates?.forEach((date) => date && existingDates.add(date));
    
    // Добавляем даты из daily_data
    brandDailyData.forEach((item) => {
      if (item.period) {
        existingDates.add(item.period);
      }
    });
    
    // Добавляем даты из trends_data
    brandTrendsData.forEach((item) => {
      if (item.date) {
        existingDates.add(item.date);
      }
    });
    
    // Добавляем даты из all_products (графики товаров)
    if (data.all_products && Array.isArray(data.all_products)) {
      data.all_products.forEach((product: any) => {
        // Графики продаж товаров
        if (product.graph && Array.isArray(product.graph)) {
          const salesDates = data.aggregated_charts?.sales_graph?.dates;
          if (salesDates) {
            salesDates.forEach((date) => date && existingDates.add(date));
          }
        }
        // Графики остатков товаров
        if (product.stocks_graph && Array.isArray(product.stocks_graph)) {
          const stocksDates = data.aggregated_charts?.stocks_graph?.dates;
          if (stocksDates) {
            stocksDates.forEach((date) => date && existingDates.add(date));
          }
        }
        // Графики цен товаров
        if (product.price_graph && Array.isArray(product.price_graph)) {
          const priceDates = data.aggregated_charts?.price_graph?.dates;
          if (priceDates) {
            priceDates.forEach((date) => date && existingDates.add(date));
          }
        }
        // Графики видимости товаров
        if (product.product_visibility_graph && Array.isArray(product.product_visibility_graph)) {
          const visibilityDates = data.aggregated_charts?.visibility_graph?.dates;
          if (visibilityDates) {
            visibilityDates.forEach((date) => date && existingDates.add(date));
          }
        }
        // Графики категорий товаров
        if (product.category_graph && Array.isArray(product.category_graph)) {
          const categoryDates = data.aggregated_charts?.sales_graph?.dates;
          if (categoryDates) {
            categoryDates.forEach((date) => date && existingDates.add(date));
          }
        }
      });
    }

    if (existingDates.size === 0) {
      return null;
    }

    const datesArray = Array.from(existingDates);
    const historicalDates = datesArray
      .filter((date) => new Date(date) <= today)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    let existingFutureDates = datesArray
      .filter((date) => new Date(date) > today)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const lastHistoricalDate =
      historicalDates.length > 0
        ? historicalDates[historicalDates.length - 1]
        : null;

    const FORECAST_HORIZON = 14;
    const newFutureDates = generateFutureDates(
      existingFutureDates.length
        ? existingFutureDates[existingFutureDates.length - 1]
        : lastHistoricalDate,
      FORECAST_HORIZON
    );
    existingFutureDates = [...existingFutureDates, ...newFutureDates];

    const sortedDates = [
      ...historicalDates,
      ...existingFutureDates.filter(
        (date, index, self) => self.indexOf(date) === index
      ),
    ];

    const forecastStartIndex =
      historicalDates.length > 0
        ? historicalDates.length
        : existingFutureDates.length > 0
        ? 0
        : null;

    const toMap = (
      dates?: string[],
      values?: Array<number | null | undefined>
    ) => {
      const map = new Map<string, number>();
      if (!dates || !values) {
        return map;
      }
      dates.forEach((date, index) => {
        const value = values[index];
        if (date && value !== undefined && value !== null) {
          map.set(date, value);
        }
      });
      return map;
    };

    // Основные метрики из aggregated_charts
    const salesMap = toMap(
      data.aggregated_charts.sales_graph?.dates,
      data.aggregated_charts.sales_graph?.values
    );
    const stocksMap = toMap(
      data.aggregated_charts.stocks_graph?.dates,
      data.aggregated_charts.stocks_graph?.values
    );
    const priceMap = toMap(
      data.aggregated_charts.price_graph?.dates,
      data.aggregated_charts.price_graph?.values
    );
    const visibilityMap = toMap(
      data.aggregated_charts.visibility_graph?.dates,
      data.aggregated_charts.visibility_graph?.values
    );

    // Метрики из daily_data
    const revenueMap = new Map<string, number>();
    const ordersMap = new Map<string, number>();
    const avgPriceMap = new Map<string, number>();
    const itemsMap = new Map<string, number>();
    const itemsWithSalesMap = new Map<string, number>();
    const commentsMap = new Map<string, number>();
    const ratingMap = new Map<string, number>();
    const avgSalePriceMap = new Map<string, number>();
    const balanceMap = new Map<string, number>();
    const balancePriceMap = new Map<string, number>();

    brandDailyData.forEach((item) => {
      if (item.period) {
        if (item.revenue) revenueMap.set(item.period, item.revenue);
        if (item.sales) ordersMap.set(item.period, item.sales);
        if (item.avg_price) avgPriceMap.set(item.period, item.avg_price);
        if (item.items) itemsMap.set(item.period, item.items);
        if (item.items_with_sells) itemsWithSalesMap.set(item.period, item.items_with_sells);
        if (item.comments) commentsMap.set(item.period, item.comments);
        if (item.rating) ratingMap.set(item.period, item.rating);
        if (item.avg_sale_price) avgSalePriceMap.set(item.period, item.avg_sale_price);
        if (item.balance) balanceMap.set(item.period, item.balance);
        if (item.balance_price) balancePriceMap.set(item.period, item.balance_price);
      }
    });

    // Метрики из trends_data
    const trendRevenueMap = new Map<string, number>();
    const trendSalesMap = new Map<string, number>();
    const trendProductRevenueMap = new Map<string, number>();
    const trendAvgOrderValueMap = new Map<string, number>();
    const trendItemsMap = new Map<string, number>();
    const trendItemsWithSalesMap = new Map<string, number>();

    brandTrendsData.forEach((item) => {
      if (item.date) {
        if (item.revenue) trendRevenueMap.set(item.date, item.revenue);
        if (item.sales) trendSalesMap.set(item.date, item.sales);
        if (item.product_revenue) trendProductRevenueMap.set(item.date, item.product_revenue);
        if (item.average_order_value) trendAvgOrderValueMap.set(item.date, item.average_order_value);
        if (item.items) trendItemsMap.set(item.date, item.items);
        if (item.items_with_sells) trendItemsWithSalesMap.set(item.date, item.items_with_sells);
      }
    });

    // Метрики из categories_data (агрегированные данные - применяем к последней дате)
    const categoryItemsMap = new Map<string, number>();
    const categoryItemsWithSalesMap = new Map<string, number>();
    const categorySalesMap = new Map<string, number>();
    const categoryRevenueMap = new Map<string, number>();
    const categoryAvgPriceMap = new Map<string, number>();
    const categoryCommentsMap = new Map<string, number>();
    const categoryRatingMap = new Map<string, number>();

    if (brandCategoriesData && brandCategoriesData.length > 0 && historicalDates.length > 0) {
      // Агрегируем данные по всем категориям
      const totalItems = brandCategoriesData.reduce((sum, cat: any) => sum + (cat.items || 0), 0);
      const totalItemsWithSales = brandCategoriesData.reduce((sum, cat: any) => sum + (cat.items_with_sells || 0), 0);
      const totalSales = brandCategoriesData.reduce((sum, cat: any) => sum + (cat.sales || 0), 0);
      const totalRevenue = brandCategoriesData.reduce((sum, cat: any) => sum + (cat.revenue || 0), 0);
      const avgPrice = brandCategoriesData.length > 0 
        ? brandCategoriesData.reduce((sum, cat: any) => sum + (cat.avg_price || 0), 0) / brandCategoriesData.length
        : 0;
      const avgComments = brandCategoriesData.length > 0
        ? brandCategoriesData.reduce((sum, cat: any) => sum + (cat.comments || 0), 0) / brandCategoriesData.length
        : 0;
      const avgRating = brandCategoriesData.length > 0
        ? brandCategoriesData.reduce((sum, cat: any) => sum + (cat.rating || 0), 0) / brandCategoriesData.length
        : 0;

      // Применяем к последней дате и всем будущим датам
      [...historicalDates, ...existingFutureDates].forEach((date) => {
        categoryItemsMap.set(date, totalItems);
        categoryItemsWithSalesMap.set(date, totalItemsWithSales);
        categorySalesMap.set(date, totalSales);
        categoryRevenueMap.set(date, totalRevenue);
        categoryAvgPriceMap.set(date, avgPrice);
        categoryCommentsMap.set(date, avgComments);
        categoryRatingMap.set(date, avgRating);
      });
    }

    // Метрики из sellers_data (агрегированные данные - применяем к последней дате)
    const sellerItemsMap = new Map<string, number>();
    const sellerItemsWithSalesMap = new Map<string, number>();
    const sellerSalesMap = new Map<string, number>();
    const sellerRevenueMap = new Map<string, number>();
    const sellerAvgPriceMap = new Map<string, number>();
    const sellerRatingMap = new Map<string, number>();
    const sellerCommentsMap = new Map<string, number>();
    const sellerBalanceMap = new Map<string, number>();

    if (brandSellersData && brandSellersData.length > 0 && historicalDates.length > 0) {
      const totalSellerItems = brandSellersData.reduce((sum, seller: any) => sum + (seller.items || 0), 0);
      const totalSellerItemsWithSales = brandSellersData.reduce((sum, seller: any) => sum + (seller.items_with_sells || 0), 0);
      const totalSellerSales = brandSellersData.reduce((sum, seller: any) => sum + (seller.sales || 0), 0);
      const totalSellerRevenue = brandSellersData.reduce((sum, seller: any) => sum + (seller.revenue || 0), 0);
      const avgSellerPrice = brandSellersData.length > 0
        ? brandSellersData.reduce((sum, seller: any) => sum + (seller.avg_price || 0), 0) / brandSellersData.length
        : 0;
      const avgSellerRating = brandSellersData.length > 0
        ? brandSellersData.reduce((sum, seller: any) => sum + (seller.rating || 0), 0) / brandSellersData.length
        : 0;
      const avgSellerComments = brandSellersData.length > 0
        ? brandSellersData.reduce((sum, seller: any) => sum + (seller.comments || 0), 0) / brandSellersData.length
        : 0;
      const totalSellerBalance = brandSellersData.reduce((sum, seller: any) => sum + (seller.balance || 0), 0);

      [...historicalDates, ...existingFutureDates].forEach((date) => {
        sellerItemsMap.set(date, totalSellerItems);
        sellerItemsWithSalesMap.set(date, totalSellerItemsWithSales);
        sellerSalesMap.set(date, totalSellerSales);
        sellerRevenueMap.set(date, totalSellerRevenue);
        sellerAvgPriceMap.set(date, avgSellerPrice);
        sellerRatingMap.set(date, avgSellerRating);
        sellerCommentsMap.set(date, avgSellerComments);
        sellerBalanceMap.set(date, totalSellerBalance);
      });
    }

    // Метрики из items_data (агрегированные данные - применяем к последней дате)
    const itemSalesMap = new Map<string, number>();
    const itemRevenueMap = new Map<string, number>();
    const itemItemsMap = new Map<string, number>();
    const itemItemsWithSalesMap = new Map<string, number>();
    const itemAvgPriceMap = new Map<string, number>();
    const itemRatingMap = new Map<string, number>();
    const itemCommentsMap = new Map<string, number>();
    const itemBalanceMap = new Map<string, number>();
    const itemLiveItemsMap = new Map<string, number>();

    if (brandItemsData && brandItemsData.length > 0 && historicalDates.length > 0) {
      const totalItemSales = brandItemsData.reduce((sum, item: any) => sum + (item.sales || 0), 0);
      const totalItemRevenue = brandItemsData.reduce((sum, item: any) => sum + (item.revenue || 0), 0);
      const totalItemItems = brandItemsData.reduce((sum, item: any) => sum + (item.items || 0), 0);
      const totalItemItemsWithSales = brandItemsData.reduce((sum, item: any) => sum + (item.items_with_sells || 0), 0);
      const avgItemPrice = brandItemsData.length > 0
        ? brandItemsData.reduce((sum, item: any) => sum + (item.avg_price || 0), 0) / brandItemsData.length
        : 0;
      const avgItemRating = brandItemsData.length > 0
        ? brandItemsData.reduce((sum, item: any) => sum + (item.rating || 0), 0) / brandItemsData.length
        : 0;
      const avgItemComments = brandItemsData.length > 0
        ? brandItemsData.reduce((sum, item: any) => sum + (item.comments || 0), 0) / brandItemsData.length
        : 0;
      const totalItemBalance = brandItemsData.reduce((sum, item: any) => sum + (item.balance || 0), 0);
      const totalItemLiveItems = brandItemsData.reduce((sum, item: any) => sum + (item.live_items || 0), 0);

      [...historicalDates, ...existingFutureDates].forEach((date) => {
        itemSalesMap.set(date, totalItemSales);
        itemRevenueMap.set(date, totalItemRevenue);
        itemItemsMap.set(date, totalItemItems);
        itemItemsWithSalesMap.set(date, totalItemItemsWithSales);
        itemAvgPriceMap.set(date, avgItemPrice);
        itemRatingMap.set(date, avgItemRating);
        itemCommentsMap.set(date, avgItemComments);
        itemBalanceMap.set(date, totalItemBalance);
        itemLiveItemsMap.set(date, totalItemLiveItems);
      });
    }

    // Метрики из all_products (агрегируем графики всех товаров)
    const productsSalesMap = new Map<string, number>();
    const productsStocksMap = new Map<string, number>();
    const productsPriceMap = new Map<string, number>();
    const productsVisibilityMap = new Map<string, number>();
    const productsCategoryMap = new Map<string, number>();

    if (data.all_products && Array.isArray(data.all_products)) {
      const salesDates = data.aggregated_charts?.sales_graph?.dates || [];
      const stocksDates = data.aggregated_charts?.stocks_graph?.dates || [];
      const priceDates = data.aggregated_charts?.price_graph?.dates || [];
      const visibilityDates = data.aggregated_charts?.visibility_graph?.dates || [];

      data.all_products.forEach((product: any) => {
        // Агрегируем графики продаж товаров
        if (product.graph && Array.isArray(product.graph) && salesDates.length === product.graph.length) {
          salesDates.forEach((date, index) => {
            if (date && product.graph[index] !== undefined && product.graph[index] !== null) {
              const currentValue = productsSalesMap.get(date) || 0;
              productsSalesMap.set(date, currentValue + (product.graph[index] || 0));
            }
          });
        }
        // Агрегируем графики остатков товаров
        if (product.stocks_graph && Array.isArray(product.stocks_graph) && stocksDates.length === product.stocks_graph.length) {
          stocksDates.forEach((date, index) => {
            if (date && product.stocks_graph[index] !== undefined && product.stocks_graph[index] !== null) {
              const currentValue = productsStocksMap.get(date) || 0;
              productsStocksMap.set(date, currentValue + (product.stocks_graph[index] || 0));
            }
          });
        }
        // Агрегируем графики цен товаров (среднее значение)
        if (product.price_graph && Array.isArray(product.price_graph) && priceDates.length === product.price_graph.length) {
          priceDates.forEach((date, index) => {
            if (date && product.price_graph[index] !== undefined && product.price_graph[index] !== null) {
              const currentSum = productsPriceMap.get(date) || 0;
              const currentCount = productsPriceMap.get(`${date}_count`) || 0;
              productsPriceMap.set(date, currentSum + (product.price_graph[index] || 0));
              productsPriceMap.set(`${date}_count`, currentCount + 1);
            }
          });
        }
        // Агрегируем графики видимости товаров (среднее значение)
        if (product.product_visibility_graph && Array.isArray(product.product_visibility_graph) && visibilityDates.length === product.product_visibility_graph.length) {
          visibilityDates.forEach((date, index) => {
            if (date && product.product_visibility_graph[index] !== undefined && product.product_visibility_graph[index] !== null) {
              const currentSum = productsVisibilityMap.get(date) || 0;
              const currentCount = productsVisibilityMap.get(`${date}_count`) || 0;
              productsVisibilityMap.set(date, currentSum + (product.product_visibility_graph[index] || 0));
              productsVisibilityMap.set(`${date}_count`, currentCount + 1);
            }
          });
        }
        // Агрегируем графики категорий товаров
        if (product.category_graph && Array.isArray(product.category_graph) && salesDates.length === product.category_graph.length) {
          salesDates.forEach((date, index) => {
            if (date && product.category_graph[index] !== undefined && product.category_graph[index] !== null) {
              const currentValue = productsCategoryMap.get(date) || 0;
              productsCategoryMap.set(date, currentValue + (product.category_graph[index] || 0));
            }
          });
        }
      });

      // Вычисляем средние значения для цен и видимости
      productsPriceMap.forEach((value, key) => {
        if (key.endsWith('_count')) {
          const date = key.replace('_count', '');
          const sum = productsPriceMap.get(date) || 0;
          const count = value;
          if (count > 0) {
            productsPriceMap.set(date, sum / count);
            productsPriceMap.delete(key);
          }
        }
      });
      productsVisibilityMap.forEach((value, key) => {
        if (key.endsWith('_count')) {
          const date = key.replace('_count', '');
          const sum = productsVisibilityMap.get(date) || 0;
          const count = value;
          if (count > 0) {
            productsVisibilityMap.set(date, sum / count);
            productsVisibilityMap.delete(key);
          }
        }
      });
    }

    // Генерируем прогнозы для всех метрик
    generateForecastValues(salesMap, existingFutureDates, 'count');
    generateForecastValues(stocksMap, existingFutureDates, 'count');
    generateForecastValues(priceMap, existingFutureDates, 'money');
    generateForecastValues(visibilityMap, existingFutureDates, 'count');
    generateForecastValues(revenueMap, existingFutureDates, 'money');
    generateForecastValues(ordersMap, existingFutureDates, 'count');
    generateForecastValues(avgPriceMap, existingFutureDates, 'money');
    generateForecastValues(itemsMap, existingFutureDates, 'count');
    generateForecastValues(itemsWithSalesMap, existingFutureDates, 'count');
    generateForecastValues(commentsMap, existingFutureDates, 'count');
    generateForecastValues(ratingMap, existingFutureDates, 'count');
    generateForecastValues(avgSalePriceMap, existingFutureDates, 'money');
    generateForecastValues(balanceMap, existingFutureDates, 'count');
    generateForecastValues(balancePriceMap, existingFutureDates, 'money');
    generateForecastValues(trendRevenueMap, existingFutureDates, 'money');
    generateForecastValues(trendSalesMap, existingFutureDates, 'count');
    generateForecastValues(trendProductRevenueMap, existingFutureDates, 'money');
    generateForecastValues(trendAvgOrderValueMap, existingFutureDates, 'money');
    generateForecastValues(trendItemsMap, existingFutureDates, 'count');
    generateForecastValues(trendItemsWithSalesMap, existingFutureDates, 'count');
    generateForecastValues(productsSalesMap, existingFutureDates, 'count');
    generateForecastValues(productsStocksMap, existingFutureDates, 'count');
    generateForecastValues(productsPriceMap, existingFutureDates, 'money');
    generateForecastValues(productsVisibilityMap, existingFutureDates, 'count');
    generateForecastValues(productsCategoryMap, existingFutureDates, 'count');
    generateForecastValues(categoryItemsMap, existingFutureDates, 'count');
    generateForecastValues(categoryItemsWithSalesMap, existingFutureDates, 'count');
    generateForecastValues(categorySalesMap, existingFutureDates, 'count');
    generateForecastValues(categoryRevenueMap, existingFutureDates, 'money');
    generateForecastValues(categoryAvgPriceMap, existingFutureDates, 'money');
    generateForecastValues(categoryCommentsMap, existingFutureDates, 'count');
    generateForecastValues(categoryRatingMap, existingFutureDates, 'count');
    generateForecastValues(sellerItemsMap, existingFutureDates, 'count');
    generateForecastValues(sellerItemsWithSalesMap, existingFutureDates, 'count');
    generateForecastValues(sellerSalesMap, existingFutureDates, 'count');
    generateForecastValues(sellerRevenueMap, existingFutureDates, 'money');
    generateForecastValues(sellerAvgPriceMap, existingFutureDates, 'money');
    generateForecastValues(sellerRatingMap, existingFutureDates, 'count');
    generateForecastValues(sellerCommentsMap, existingFutureDates, 'count');
    generateForecastValues(sellerBalanceMap, existingFutureDates, 'count');
    generateForecastValues(itemSalesMap, existingFutureDates, 'count');
    generateForecastValues(itemRevenueMap, existingFutureDates, 'money');
    generateForecastValues(itemItemsMap, existingFutureDates, 'count');
    generateForecastValues(itemItemsWithSalesMap, existingFutureDates, 'count');
    generateForecastValues(itemAvgPriceMap, existingFutureDates, 'money');
    generateForecastValues(itemRatingMap, existingFutureDates, 'count');
    generateForecastValues(itemCommentsMap, existingFutureDates, 'count');
    generateForecastValues(itemBalanceMap, existingFutureDates, 'count');
    generateForecastValues(itemLiveItemsMap, existingFutureDates, 'count');

    const metrics: UnifiedMetricConfig[] = [
      {
        id: 'revenue',
        label: 'Выручка (₽)',
        color: '#2563eb',
        axis: 'money' as MetricAxis,
        map: revenueMap.size > 0 ? revenueMap : salesMap.size > 0 ? new Map(Array.from(salesMap.entries()).map(([date, sales]) => {
          const price = priceMap.get(date) || avgPriceMap.get(date) || 0;
          return [date, sales * price];
        })) : new Map(),
        defaultEnabled: true,
      },
      {
        id: 'sales',
        label: 'Продажи (шт.)',
        color: '#f97316',
        axis: 'count' as MetricAxis,
        map: ordersMap.size > 0 ? ordersMap : salesMap,
        defaultEnabled: true,
      },
      {
        id: 'stocks',
        label: 'Остатки (шт.)',
        color: '#8b5cf6',
        axis: 'count' as MetricAxis,
        map: balanceMap.size > 0 ? balanceMap : stocksMap,
        defaultEnabled: stocksMap.size > 0 || balanceMap.size > 0,
      },
      {
        id: 'price',
        label: 'Средняя цена (₽)',
        color: '#10b981',
        axis: 'money' as MetricAxis,
        map: avgPriceMap.size > 0 ? avgPriceMap : priceMap,
        borderDash: [6, 4],
        opacity: 0.18,
        defaultEnabled: false,
      },
      {
        id: 'avg_sale_price',
        label: 'Средняя цена продажи (₽)',
        color: '#14b8a6',
        axis: 'money' as MetricAxis,
        map: avgSalePriceMap,
        borderDash: [4, 4],
        opacity: 0.15,
        defaultEnabled: false,
      },
      {
        id: 'visibility',
        label: 'Видимость (%)',
        color: '#f59e0b',
        axis: 'count' as MetricAxis,
        map: visibilityMap,
        borderDash: [2, 2],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'items',
        label: 'Количество товаров',
        color: '#06b6d4',
        axis: 'count' as MetricAxis,
        map: itemsMap.size > 0 ? itemsMap : trendItemsMap,
        borderDash: [3, 3],
        opacity: 0.14,
        defaultEnabled: false,
      },
      {
        id: 'items_with_sales',
        label: 'Товары с продажами',
        color: '#22d3ee',
        axis: 'count' as MetricAxis,
        map: itemsWithSalesMap.size > 0 ? itemsWithSalesMap : trendItemsWithSalesMap,
        borderDash: [5, 5],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'comments',
        label: 'Комментарии',
        color: '#a78bfa',
        axis: 'count' as MetricAxis,
        map: commentsMap,
        borderDash: [3, 5],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'rating',
        label: 'Рейтинг',
        color: '#fbbf24',
        axis: 'count' as MetricAxis,
        map: ratingMap,
        borderDash: [2, 4],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'balance_price',
        label: 'Стоимость остатков (₽)',
        color: '#ec4899',
        axis: 'money' as MetricAxis,
        map: balancePriceMap,
        borderDash: [4, 4],
        opacity: 0.15,
        defaultEnabled: false,
      },
      {
        id: 'trend_revenue',
        label: 'Тренд выручки (₽)',
        color: '#0ea5e9',
        axis: 'money' as MetricAxis,
        map: trendRevenueMap,
        borderDash: [2, 6],
        opacity: 0.1,
        defaultEnabled: false,
      },
      {
        id: 'trend_sales',
        label: 'Тренд продаж (шт.)',
        color: '#38bdf8',
        axis: 'count' as MetricAxis,
        map: trendSalesMap,
        borderDash: [8, 4],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'trend_product_revenue',
        label: 'Выручка на товар (₽)',
        color: '#6366f1',
        axis: 'money' as MetricAxis,
        map: trendProductRevenueMap,
        borderDash: [3, 6],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'trend_avg_order_value',
        label: 'Средний чек (₽)',
        color: '#8b5cf6',
        axis: 'money' as MetricAxis,
        map: trendAvgOrderValueMap,
        borderDash: [5, 4],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'products_sales',
        label: 'Продажи товаров (сумма)',
        color: '#ef4444',
        axis: 'count' as MetricAxis,
        map: productsSalesMap.size > 0 ? productsSalesMap : salesMap,
        borderDash: [6, 3],
        opacity: 0.16,
        defaultEnabled: false,
      },
      {
        id: 'products_stocks',
        label: 'Остатки товаров (сумма)',
        color: '#a855f7',
        axis: 'count' as MetricAxis,
        map: productsStocksMap.size > 0 ? productsStocksMap : stocksMap,
        borderDash: [4, 4],
        opacity: 0.14,
        defaultEnabled: false,
      },
      {
        id: 'products_price',
        label: 'Средняя цена товаров (₽)',
        color: '#22c55e',
        axis: 'money' as MetricAxis,
        map: productsPriceMap.size > 0 ? productsPriceMap : priceMap,
        borderDash: [3, 5],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'products_visibility',
        label: 'Средняя видимость товаров',
        color: '#f59e0b',
        axis: 'count' as MetricAxis,
        map: productsVisibilityMap.size > 0 ? productsVisibilityMap : visibilityMap,
        borderDash: [7, 3],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'products_category',
        label: 'Категории товаров (сумма)',
        color: '#ec4899',
        axis: 'count' as MetricAxis,
        map: productsCategoryMap,
        borderDash: [5, 5],
        opacity: 0.12,
        defaultEnabled: false,
      },
      // Метрики из categories_data
      {
        id: 'category_items',
        label: 'Товаров в категориях',
        color: '#3b82f6',
        axis: 'count' as MetricAxis,
        map: categoryItemsMap,
        borderDash: [4, 6],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'category_items_with_sales',
        label: 'Товаров с продажами (категории)',
        color: '#60a5fa',
        axis: 'count' as MetricAxis,
        map: categoryItemsWithSalesMap,
        borderDash: [6, 4],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'category_sales',
        label: 'Продажи по категориям',
        color: '#818cf8',
        axis: 'count' as MetricAxis,
        map: categorySalesMap,
        borderDash: [3, 7],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'category_revenue',
        label: 'Выручка по категориям (₽)',
        color: '#a78bfa',
        axis: 'money' as MetricAxis,
        map: categoryRevenueMap,
        borderDash: [5, 5],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'category_avg_price',
        label: 'Средняя цена категорий (₽)',
        color: '#c084fc',
        axis: 'money' as MetricAxis,
        map: categoryAvgPriceMap,
        borderDash: [4, 4],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'category_comments',
        label: 'Комментарии категорий',
        color: '#d8b4fe',
        axis: 'count' as MetricAxis,
        map: categoryCommentsMap,
        borderDash: [6, 3],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'category_rating',
        label: 'Рейтинг категорий',
        color: '#e9d5ff',
        axis: 'count' as MetricAxis,
        map: categoryRatingMap,
        borderDash: [2, 8],
        opacity: 0.12,
        defaultEnabled: false,
      },
      // Метрики из sellers_data
      {
        id: 'seller_items',
        label: 'Товаров у продавцов',
        color: '#06b6d4',
        axis: 'count' as MetricAxis,
        map: sellerItemsMap,
        borderDash: [5, 4],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'seller_items_with_sales',
        label: 'Товаров с продажами (продавцы)',
        color: '#22d3ee',
        axis: 'count' as MetricAxis,
        map: sellerItemsWithSalesMap,
        borderDash: [4, 6],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'seller_sales',
        label: 'Продажи продавцов',
        color: '#67e8f9',
        axis: 'count' as MetricAxis,
        map: sellerSalesMap,
        borderDash: [6, 3],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'seller_revenue',
        label: 'Выручка продавцов (₽)',
        color: '#a5f3fc',
        axis: 'money' as MetricAxis,
        map: sellerRevenueMap,
        borderDash: [3, 7],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'seller_avg_price',
        label: 'Средняя цена продавцов (₽)',
        color: '#cffafe',
        axis: 'money' as MetricAxis,
        map: sellerAvgPriceMap,
        borderDash: [5, 5],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'seller_rating',
        label: 'Рейтинг продавцов',
        color: '#e0f2fe',
        axis: 'count' as MetricAxis,
        map: sellerRatingMap,
        borderDash: [4, 4],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'seller_comments',
        label: 'Комментарии продавцов',
        color: '#f0f9ff',
        axis: 'count' as MetricAxis,
        map: sellerCommentsMap,
        borderDash: [6, 3],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'seller_balance',
        label: 'Остатки продавцов',
        color: '#f8fafc',
        axis: 'count' as MetricAxis,
        map: sellerBalanceMap,
        borderDash: [2, 8],
        opacity: 0.11,
        defaultEnabled: false,
      },
      // Метрики из items_data
      {
        id: 'item_sales',
        label: 'Продажи предметов',
        color: '#ef4444',
        axis: 'count' as MetricAxis,
        map: itemSalesMap,
        borderDash: [5, 4],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'item_revenue',
        label: 'Выручка предметов (₽)',
        color: '#f87171',
        axis: 'money' as MetricAxis,
        map: itemRevenueMap,
        borderDash: [4, 6],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'item_items',
        label: 'Товаров по предметам',
        color: '#fca5a5',
        axis: 'count' as MetricAxis,
        map: itemItemsMap,
        borderDash: [6, 3],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'item_items_with_sales',
        label: 'Товаров с продажами (предметы)',
        color: '#fecaca',
        axis: 'count' as MetricAxis,
        map: itemItemsWithSalesMap,
        borderDash: [3, 7],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'item_avg_price',
        label: 'Средняя цена предметов (₽)',
        color: '#fee2e2',
        axis: 'money' as MetricAxis,
        map: itemAvgPriceMap,
        borderDash: [5, 5],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'item_rating',
        label: 'Рейтинг предметов',
        color: '#fef2f2',
        axis: 'count' as MetricAxis,
        map: itemRatingMap,
        borderDash: [4, 4],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'item_comments',
        label: 'Комментарии предметов',
        color: '#fff1f2',
        axis: 'count' as MetricAxis,
        map: itemCommentsMap,
        borderDash: [6, 3],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'item_balance',
        label: 'Остатки предметов',
        color: '#fff7ed',
        axis: 'count' as MetricAxis,
        map: itemBalanceMap,
        borderDash: [2, 8],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'item_live_items',
        label: 'Товары с движением',
        color: '#fffbeb',
        axis: 'count' as MetricAxis,
        map: itemLiveItemsMap,
        borderDash: [5, 4],
        opacity: 0.12,
        defaultEnabled: false,
      },
    ].filter((metric) => metric.map.size > 0);

    if (metrics.length === 0) {
      return null;
    }

    const formattedLabels = sortedDates.map((date) =>
      new Date(date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'short',
      })
    );

    return {
      rawLabels: sortedDates,
      labels: formattedLabels,
      metrics,
      forecastStartIndex,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, brandDailyData, brandTrendsData, brandCategoriesData, brandSellersData, brandItemsData, generateForecastValues, generateFutureDates]);

  useEffect(() => {
    if (!unifiedChartData) {
      setActiveMetrics((prev) =>
        Object.keys(prev).length === 0 ? prev : {}
      );
      return;
    }

    setActiveMetrics((prev) => {
      const next: Record<string, boolean> = {};
      unifiedChartData.metrics.forEach((metric) => {
        next[metric.id] = prev[metric.id] ?? metric.defaultEnabled;
      });

      const hasChanges =
        Object.keys(next).length !== Object.keys(prev).length ||
        Object.entries(next).some(([key, value]) => prev[key] !== value);

      return hasChanges ? next : prev;
    });
  }, [unifiedChartData]);

  const unifiedDatasets = useMemo(() => {
    if (!unifiedChartData) {
      return [];
    }

    const toRGBA = (hexColor: string, alpha: number) => {
      const hex = hexColor.replace('#', '');
      const bigint = parseInt(hex, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    return unifiedChartData.metrics
      .filter((metric) => activeMetrics[metric.id])
      .map((metric) => ({
        label: metric.label,
        data: unifiedChartData.rawLabels.map((date) =>
          metric.map.has(date) ? metric.map.get(date) ?? null : null
        ),
        borderColor: metric.color,
        backgroundColor: toRGBA(metric.color, metric.opacity ?? 0.18),
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        spanGaps: true,
        yAxisID: metric.axis === 'money' ? 'yMoney' : 'yCount',
        borderDash: metric.borderDash,
      }));
  }, [activeMetrics, unifiedChartData]);

  const getSortedProducts = () => {
    if (!data) return [];
    
    const products = [...data.all_products];
    return products.sort((a, b) => {
      const aVal = a[sortField as keyof typeof a] as number;
      const bVal = b[sortField as keyof typeof b] as number;
      
      if (sortDirection === 'desc') {
        return (bVal || 0) - (aVal || 0);
      } else {
        return (aVal || 0) - (bVal || 0);
      }
    });
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      background: 'linear-gradient(135deg,rgb(157, 157, 157) 0%,rgb(229, 229, 229) 100%)',
      minHeight: '100vh'
    }}>
      {/* Заголовок */}
      <div style={{ textAlign: 'center', marginBottom: '30px', color: 'white' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
          🏢 Анализ бренда
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
          Комплексная аналитика бренда с использованием MPStats API
        </p>
      </div>

      {/* Информационное сообщение с рекомендациями */}
      <div style={{
        backgroundColor: '#FEFCE8',
        border: '1px solid #FDE047',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '30px',
        color: '#78350F',
        fontSize: '0.95rem',
        lineHeight: '1.6',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ 
          fontWeight: 'bold', 
          marginBottom: '15px',
          fontSize: '1.05rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          💡 Важные рекомендации для анализа бренда
        </div>
        <div style={{ marginBottom: '12px' }}>
          <strong>🏷️ Правильное написание названия бренда:</strong> Указывайте название бренда точно как на Wildberries, без лишних символов, пробелов и специальных знаков.
          <br/>
          <span style={{ 
            backgroundColor: '#FDE047', 
            padding: '4px 8px', 
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            margin: '4px 0',
            display: 'inline-block'
          }}>
            Mango
          </span>
          {' '}или{' '}
          <span style={{ 
            backgroundColor: '#FDE047', 
            padding: '4px 8px', 
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            margin: '4px 0',
            display: 'inline-block'
          }}>
            Zara
          </span>
          {' '}вместо{' '}
          <span style={{ 
            backgroundColor: '#FEE2E2', 
            padding: '4px 8px', 
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            margin: '4px 0',
            display: 'inline-block'
          }}>
            Mango Store
          </span>
          {' '}или{' '}
          <span style={{ 
            backgroundColor: '#FEE2E2', 
            padding: '4px 8px', 
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            margin: '4px 0',
            display: 'inline-block'
          }}>
            Zara Home
          </span>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <strong>📅 Рекомендуемый период:</strong> Для получения четких и точных данных рекомендуется использовать период <strong>90 дней</strong>. 
          Более короткие периоды могут давать неточные результаты из-за недостатка данных.
        </div>
        <div style={{ marginBottom: '12px' }}>
          <strong>📦 Настройки фильтров для лучших результатов:</strong>
          <br/>
          • <strong>FBS:</strong> "Все товары" - для получения полной картины по бренду
          <br/>
          • <strong>Новинки:</strong> "Все товары" - для анализа всего ассортимента бренда
        </div>
        <div style={{ 
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '8px',
          padding: '12px',
          marginTop: '15px'
        }}>
          <strong>🔄 Если анализ не дает результатов:</strong>
          <br/>
          • Попробуйте изменить период на 30 или 60 дней
          <br/>
          • Проверьте правильность написания названия бренда
          <br/>
          • Попробуйте другие настройки FBS (только FBS или только не-FBS)
          <br/>
          • Измените фильтр новинок на "Только новинки" или "Без новинок"
          <br/>
          • Убедитесь, что бренд существует и имеет товары на Wildberries
        </div>
      </div>

      {/* Форма анализа */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        marginBottom: '30px'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '250px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Название бренда
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Например: Mango, Zara, H&M"
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px'
              }}
              onKeyPress={(e) => e.key === 'Enter' && analyzeBrand()}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Период
            </label>
            <select
              value={filters.period}
              onChange={(e) => setFilters({...filters, period: parseInt(e.target.value)})}
              style={{
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px'
              }}
            >
              <option value={7}>7 дней</option>
              <option value={14}>14 дней</option>
              <option value={30}>30 дней</option>
              <option value={90}>90 дней</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              FBS
            </label>
            <select
              value={filters.fbs}
              onChange={(e) => setFilters({...filters, fbs: parseInt(e.target.value)})}
              style={{
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px'
              }}
            >
              <option value={0}>Все товары</option>
              <option value={1}>Только FBS</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Новинки
            </label>
            <select
              value={filters.newsmode}
              onChange={(e) => setFilters({...filters, newsmode: parseInt(e.target.value)})}
              style={{
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px'
              }}
            >
              <option value={0}>Все товары</option>
              <option value={7}>За 7 дней</option>
              <option value={14}>За 14 дней</option>
              <option value={30}>За 30 дней</option>
            </select>
          </div>
          
          <button 
            onClick={analyzeBrand}
            disabled={loading}
            style={{
              padding: '12px 25px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '🔄 Анализируем...' : '🔍 Анализировать'}
          </button>
        </div>
        
        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '10px 15px',
            borderRadius: '10px',
            marginTop: '15px'
          }}>
            {error}
          </div>
        )}
      </div>

      {data && brandKPIs && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* ✅ Блок общих показателей */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.8rem', color: '#1f2937', marginBottom: '25px', textAlign: 'center' }}>
              📊 Общие показатели бренда
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px'
            }}>
              {/* Выручка */}
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '25px',
                borderRadius: '20px',
                textAlign: 'center',
                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💰</div>
                <div style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)', fontWeight: '800', marginBottom: '8px' }}>
                  {formatPrice(brandKPIs.totalRevenue).replace('₽', '')}
                </div>
                <div style={{ fontSize: '1rem', opacity: 0.95, fontWeight: '500' }}>Выручка</div>
              </div>
              
              {/* Общее количество заказов */}
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                padding: '25px',
                borderRadius: '20px',
                textAlign: 'center',
                boxShadow: '0 8px 25px rgba(245, 158, 11, 0.3)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
                <div style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: '800', marginBottom: '8px' }}>
                  {formatNumber(brandKPIs.totalOrders)}
                </div>
                <div style={{ fontSize: '1rem', opacity: 0.95, fontWeight: '500' }}>Общее количество заказов</div>
              </div>
              
              {/* Упущенная выручка */}
              <div style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                padding: '25px',
                borderRadius: '20px',
                textAlign: 'center',
                boxShadow: '0 8px 25px rgba(239, 68, 68, 0.3)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
                <div style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)', fontWeight: '800', marginBottom: '8px' }}>
                  {formatPrice(brandKPIs.lostProfit).replace('₽', '')}
                </div>
                <div style={{ fontSize: '1rem', opacity: 0.95, fontWeight: '500' }}>Упущенная выручка</div>
              </div>
              
              {/* Среднедневная выручка на артикул с продажи */}
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                padding: '25px',
                borderRadius: '20px',
                textAlign: 'center',
                boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📈</div>
                <div style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)', fontWeight: '800', marginBottom: '8px' }}>
                  {formatPrice(brandKPIs.avgDailyRevenuePerItem).replace('₽', '')}
                </div>
                <div style={{ fontSize: '1rem', opacity: 0.95, fontWeight: '500' }}>Среднедневная выручка на артикул с продажи</div>
              </div>
              
              {/* Средний чек */}
              <div style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                padding: '25px',
                borderRadius: '20px',
                textAlign: 'center',
                boxShadow: '0 8px 25px rgba(139, 92, 246, 0.3)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💳</div>
                <div style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)', fontWeight: '800', marginBottom: '8px' }}>
                  {formatPrice(brandKPIs.averageOrderValue).replace('₽', '')}
                </div>
                <div style={{ fontSize: '1rem', opacity: 0.95, fontWeight: '500' }}>Средний чек</div>
              </div>
              
              {/* Среднедневной % артикулов с продажами */}
              <div style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                color: 'white',
                padding: '25px',
                borderRadius: '20px',
                textAlign: 'center',
                boxShadow: '0 8px 25px rgba(6, 182, 212, 0.3)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</div>
                <div style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: '800', marginBottom: '8px' }}>
                  {brandKPIs.avgDailyItemsWithSalesPercent.toFixed(1)}%
                </div>
                <div style={{ fontSize: '1rem', opacity: 0.95, fontWeight: '500' }}>Среднедневной % артикулов с продажами</div>
              </div>

              {/* Среднемесячный процент выкупа */}
                <div style={{ 
                background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                color: 'white',
                padding: '25px',
                borderRadius: '20px',
                textAlign: 'center',
                boxShadow: '0 8px 25px rgba(20, 184, 166, 0.3)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                <div style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: '800', marginBottom: '8px' }}>
                  {brandKPIs.avgMonthlyPurchaseRate.toFixed(1)}%
                </div>
                <div style={{ fontSize: '1rem', opacity: 0.95, fontWeight: '500' }}>Среднемесячный процент выкупа</div>
              </div>
            </div>
          </div>

          {/* ✅ Единый обзор метрик */}
          {unifiedChartData && unifiedChartData.metrics.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              marginBottom: '30px'
          }}>
            <h3 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '1.5rem', textAlign: 'center' }}>
                📈 Единый обзор метрик
            </h3>
            
              {/* Чекбоксы для выбора метрик */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '20px',
                padding: '15px',
                  background: '#f9fafb',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                {unifiedChartData.metrics.map((metric) => (
                  <label
                    key={metric.id}
                        style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: activeMetrics[metric.id] ? '#eff6ff' : 'white',
                      border: `2px solid ${activeMetrics[metric.id] ? metric.color : '#e5e7eb'}`,
                      transition: 'all 0.2s',
                      fontSize: '0.9rem',
                      fontWeight: activeMetrics[metric.id] ? '600' : '400'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={activeMetrics[metric.id] || false}
                      onChange={(e) => {
                        setActiveMetrics((prev) => ({
                          ...prev,
                          [metric.id]: e.target.checked,
                        }));
                      }}
                          style={{
                        cursor: 'pointer',
                        accentColor: metric.color
                      }}
                    />
                    <span style={{ color: activeMetrics[metric.id] ? metric.color : '#6b7280' }}>
                      {metric.label}
                    </span>
                  </label>
                ))}
          </div>

              <div style={{ height: '600px', position: 'relative' }}>
              <Line
                data={{
                    labels: unifiedChartData.labels,
                    datasets: unifiedDatasets as any,
                  }}
                  plugins={[forecastShadePlugin]}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                      legend: { 
                        display: false,
                      },
                      tooltip: {
                        callbacks: {
                          label: (context: TooltipItem<'line'>) => {
                            const value = context.parsed?.y ?? null;
                            const datasetLabel = context.dataset.label || '';
                            const axis = (context.dataset as any)?.yAxisID;
                            if (value === null || value === undefined) {
                              return `${datasetLabel}: нет данных`;
                            }
                            if (axis === 'yMoney') {
                              return `${datasetLabel}: ${formatPrice(Number(value))}`;
                            }
                            return `${datasetLabel}: ${formatNumber(Number(value))}`;
                          },
                        },
                      },
                      forecastShade:
                        unifiedChartData.forecastStartIndex !== null &&
                        unifiedChartData.forecastStartIndex !== undefined
                          ? {
                              startIndex: unifiedChartData.forecastStartIndex,
                              backgroundColor: 'rgba(59, 130, 246, 0.2)',
                              borderColor: 'rgba(59, 130, 246, 0.6)',
                              label: 'Прогноз',
                              labelColor: '#1e40af',
                              font: 'bold 16px "Inter", sans-serif',
                            }
                          : { startIndex: null },
                    } as any,
                  scales: {
                    x: {
                      display: true,
                      title: {
                        display: true,
                          text: 'Дата',
                        },
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)',
                        },
                      },
                      yMoney: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                      title: {
                        display: true,
                          text: 'Выручка (₽)',
                          color: '#2563eb',
                        },
                        ticks: {
                          callback: (value: any) => formatPrice(value),
                        },
                        grid: {
                          color: 'rgba(37, 99, 235, 0.1)',
                        },
                      },
                      yCount: {
                        type: 'linear',
                      display: true,
                        position: 'right',
                      title: {
                        display: true,
                          text: 'Количество',
                          color: '#f97316',
                        },
                        ticks: {
                          callback: (value: any) => formatNumber(value),
                        },
                        grid: {
                          color: 'rgba(249, 115, 22, 0.1)',
                        },
                      },
                    },
                }}
              />
              </div>
            </div>
          )}


          {/* Топ-категории */}
          {(brandCategoriesData && brandCategoriesData.length > 0) || (data && data.brand_metrics && data.brand_metrics.top_categories && data.brand_metrics.top_categories.length > 0) ? (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '1.5rem', textAlign: 'center' }}>
                📊 Топ-категории по выручке
                {brandCategoriesData && brandCategoriesData.length > 0 && (
                  <span style={{ fontSize: '0.9rem', color: '#6b7280', marginLeft: '10px' }}>
                    ({brandCategoriesData.length} категорий)
                  </span>
                )}
              </h3>
              {brandCategoriesData && brandCategoriesData.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                  {brandCategoriesData
                    .sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0))
                    .slice(0, 10)
                    .map((category: any, index: number) => (
                <div 
                  key={index} 
                  style={{
                    padding: '20px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '15px',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => {
                    if (category.name) {
                      navigate('/category-analysis', {
                        state: {
                          prefilledCategory: category.name,
                          autoAnalyze: true
                        }
                      });
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                  }}
                >
                        <h4 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', fontWeight: '600' }}>
                          {category.name || 'Без названия'}
                      </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9rem' }}>
                        <div>
                            <div style={{ opacity: 0.9 }}>Товаров:</div>
                            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{category.items || 0}</div>
                        </div>
                        <div>
                            <div style={{ opacity: 0.9 }}>С продажами:</div>
                            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                              {category.items_with_sells || 0} ({((category.items_with_sells_percent || 0)).toFixed(1)}%)
                            </div>
                        </div>
                        <div>
                            <div style={{ opacity: 0.9 }}>Продажи:</div>
                            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{category.sales || 0}</div>
                        </div>
                        <div>
                            <div style={{ opacity: 0.9 }}>Выручка:</div>
                            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                              {new Intl.NumberFormat('ru-RU').format(category.revenue || 0)} ₽
                        </div>
                      </div>
                          <div>
                            <div style={{ opacity: 0.9 }}>Средняя цена:</div>
                            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                              {new Intl.NumberFormat('ru-RU').format(category.avg_price || 0)} ₽
                    </div>
                  </div>
                          <div>
                            <div style={{ opacity: 0.9 }}>Рейтинг:</div>
                            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                              ⭐ {(category.rating || 0).toFixed(2)}
                </div>
            </div>
          </div>
                  </div>
                    ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
                  {data.brand_metrics.top_categories.map((category, index) => (
                    <span 
                      key={index} 
                      style={{
                        padding: '10px 20px',
                        background: '#e0e7ff',
                        color: '#3730a3',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => {
                        if (category.name) {
                          navigate('/category-analysis', {
                            state: {
                              prefilledCategory: category.name,
                              autoAnalyze: true
                            }
                          });
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#c7d2fe';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#e0e7ff';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {category.name} ({category.count})
                    </span>
                  ))}
                </div>
              )}
                </div>
          ) : null}

          {/* Таблица товаров */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px',
              flexWrap: 'wrap',
              gap: '15px'
            }}>
              <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.5rem' }}>
                📋 Все товары бренда ({data.all_products.length})
              </h3>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setTableView('basic')}
                  style={{
                    padding: '8px 16px',
                    background: tableView === 'basic' ? '#667eea' : '#f3f4f6',
                    color: tableView === 'basic' ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Основные данные
                </button>
                <button
                  onClick={() => setTableView('detailed')}
                  style={{
                    padding: '8px 16px',
                    background: tableView === 'detailed' ? '#667eea' : '#f3f4f6',
                    color: tableView === 'detailed' ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Детальные данные
                </button>
              </div>
            </div>
            
            <div style={{ overflowX: 'auto' }} className="products-table-container">
              <table style={{ width: '100%', borderCollapse: 'collapse' }} className="products-table">
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={tableHeaderStyle} onClick={() => handleSort('name')}>
                      Товар {sortField === 'name' && (sortDirection === 'desc' ? '↓' : '↑')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('category')}>
                      Категория {sortField === 'category' && (sortDirection === 'desc' ? '↓' : '↑')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('final_price')}>
                      Цена {sortField === 'final_price' && (sortDirection === 'desc' ? '↓' : '↑')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('sales')}>
                      Продажи {sortField === 'sales' && (sortDirection === 'desc' ? '↓' : '↑')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('revenue')}>
                      Выручка {sortField === 'revenue' && (sortDirection === 'desc' ? '↓' : '↑')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('rating')}>
                      Рейтинг {sortField === 'rating' && (sortDirection === 'desc' ? '↓' : '↑')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('balance')}>
                      Остаток {sortField === 'balance' && (sortDirection === 'desc' ? '↓' : '↑')}
                    </th>
                    {tableView === 'detailed' && (
                      <>
                        <th style={tableHeaderStyle} onClick={() => handleSort('purchase')}>
                          Выкуп % {sortField === 'purchase' && (sortDirection === 'desc' ? '↓' : '↑')}
                        </th>
                        <th style={tableHeaderStyle} onClick={() => handleSort('turnover_days')}>
                          Оборот (дни) {sortField === 'turnover_days' && (sortDirection === 'desc' ? '↓' : '↑')}
                        </th>
                        <th style={tableHeaderStyle} onClick={() => handleSort('comments')}>
                          Отзывы {sortField === 'comments' && (sortDirection === 'desc' ? '↓' : '↑')}
                        </th>
                        <th style={tableHeaderStyle}>Дополнительно</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {getSortedProducts().map((product, index) => (
                    <tr key={index} style={{
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <td style={tableCellStyle}>
                        <div style={{ maxWidth: '200px' }}>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '2px' }}>
                            {product.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                            {product.article}
                          </div>
                        </div>
                      </td>
                      <td style={tableCellStyle}>{product.category}</td>
                      <td style={tableCellStyle}>{formatPrice(product.final_price)}</td>
                      <td style={tableCellStyle}>{formatNumber(product.sales)}</td>
                      <td style={tableCellStyle}>{formatPrice(product.revenue)}</td>
                      <td style={tableCellStyle}>
                        <span style={{
                          color: product.rating >= 4.5 ? '#10b981' : product.rating >= 4 ? '#f59e0b' : '#ef4444'
                        }}>
                          {product.rating}/5
                        </span>
                      </td>
                      <td style={tableCellStyle}>{formatNumber(product.balance)}</td>
                      {tableView === 'detailed' && (
                        <>
                          <td style={tableCellStyle}>{product.purchase}%</td>
                          <td style={tableCellStyle}>{product.turnover_days}</td>
                          <td style={tableCellStyle}>{formatNumber(product.comments)}</td>
                          <td style={tableCellStyle}>
                            <div style={{ fontSize: '0.8rem' }}>
                              {product.is_fbs && <span style={{ color: '#10b981' }}>FBS </span>}
                              {product.hasvideo && <span style={{ color: '#f59e0b' }}>📹 </span>}
                              {product.has3d && <span style={{ color: '#8b5cf6' }}>3️⃣ </span>}
                              <br />
                              {product.country && <span style={{ color: '#6b7280' }}>{product.country}</span>}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* CSS для исправления растягивающихся графиков */}
      <style>{`
        /* КОНТРОЛЬ ПЕРЕПОЛНЕНИЯ СТРАНИЦЫ */
        @media (max-width: 768px) {
          body, html {
            overflow-x: hidden !important;
            max-width: 100vw !important;
          }
        }
      `}</style>
    </div>
  );
}

const tableHeaderStyle = {
  padding: '12px',
  textAlign: 'left' as const,
  fontWeight: '600',
  color: '#374151',
  fontSize: '0.9rem',
  cursor: 'pointer',
  userSelect: 'none' as const,
  border: '1px solid #e5e7eb'
};

const tableCellStyle = {
  padding: '12px',
  fontSize: '0.85rem',
  color: '#1f2937',
  border: '1px solid #e5e7eb'
}; 
