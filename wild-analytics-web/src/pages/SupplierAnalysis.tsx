import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { useLocation, useNavigate } from 'react-router-dom';
import { addYandexMetrika } from '../utils/yandexMetrika';
import { buildApiUrl } from '../utils/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
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
  BarElement,
  ArcElement,
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

interface SellerProduct {
  id: number;
  name: string;
  brand: string;
  seller: string;
  supplier_id: number;
  color: string;
  balance: number;
  balance_fbs: number;
  comments: number;
  rating: number;
  final_price: number;
  final_price_max: number;
  final_price_min: number;
  final_price_average: number;
  final_price_median: number;
  basic_sale: number;
  basic_price: number;
  promo_sale: number;
  client_sale: number;
  client_price: number;
  start_price: number;
  sales: number;
  sales_per_day_average: number;
  revenue: number;
  revenue_potential: number;
  revenue_average: number;
  lost_profit: number;
  lost_profit_percent: number;
  days_in_stock: number;
  days_with_sales: number;
  average_if_in_stock: number;
  is_fbs: number;
  subject_id: number;
  subject: string;
  purchase: number;
  purchase_after_return: number;
  country: string;
  gender: string;
  sku_first_date: string;
  firstcommentdate: string;
  picscount: number;
  has3d: number;
  hasvideo: number;
  commentsvaluation: number;
  cardratingval: number;
  categories_last_count: number;
  category: string;
  category_position: number;
  product_visibility_graph: number[];
  category_graph: number[];
  graph: number[];
  stocks_graph: number[];
  price_graph: number[];
  thumb: string;
  thumb_middle: string;
  url: string;
  turnover_days: number;
  turnover_once: number;
}

interface SellerAnalysisResponse {
  data: SellerProduct[];
  total: number;
  error: boolean;
  startRow: number;
  endRow: number;
  rowGroupCols: any[];
  valueCols: any[];
  pivotCols: any[];
  pivotMode: boolean;
  groupKeys: any[];
  filterModel: any[];
  sortModel: any[];
}

interface SellerAnalytics {
  total_products: number;
  total_revenue: number;
  total_sales: number;
  average_price: number;
  average_rating: number;
  total_balance: number;
  average_turnover_days: number;
  fbs_percentage: number;
  top_categories: Array<{category: string, count: number, revenue: number}>;
  top_brands: Array<{brand: string, count: number, revenue: number}>;
}

const SellerAnalysis: React.FC = () => {
  // Добавляем Yandex.Metrika счетчик
  useEffect(() => {
    addYandexMetrika('104757755');
  }, []);

  // Функция для получения дат по умолчанию
  const getDefaultDates = () => {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      from: formatDate(oneMonthAgo),
      to: formatDate(today)
    };
  };

  const defaultDates = getDefaultDates();
  const [sellerName, setSellerName] = useState('ИП Золтоев А А');
  const [dateFrom, setDateFrom] = useState(defaultDates.from);
  const [dateTo, setDateTo] = useState(defaultDates.to);
  const [fbs, setFbs] = useState(1); // По умолчанию FBS товары
  const [newsmode, setNewsmode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SellerAnalysisResponse | null>(null);
  const [analytics, setAnalytics] = useState<SellerAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sellerKPIs, setSellerKPIs] = useState<any>(null);
  const [sellerDailyData, setSellerDailyData] = useState<any[]>([]);
  const [sellerTrendsData, setSellerTrendsData] = useState<any[]>([]);
  const [sellerCategoriesData, setSellerCategoriesData] = useState<any[]>([]);
  const [sellerBrandsData, setSellerBrandsData] = useState<any[]>([]);
  const [sellerItemsData, setSellerItemsData] = useState<any[]>([]);
  const [sellerWarehousesData, setSellerWarehousesData] = useState<any[]>([]);
  const [sellerPriceSegmentationData, setSellerPriceSegmentationData] = useState<any[]>([]);
  const [activeMetrics, setActiveMetrics] = useState<Record<string, boolean>>({});
  
  // Фильтры для таблицы
  const [minRevenue, setMinRevenue] = useState<number | null>(null);
  const [minSales, setMinSales] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Получаем location и navigate из React Router
  const location = useLocation();
  const navigate = useNavigate();

  // Обработка предзаполненных данных при переходе с других страниц
  useEffect(() => {
    if ((location as any).state) {
      const { prefilledSeller, autoAnalyze } = (location as any).state as { 
        prefilledSeller?: string; 
        autoAnalyze?: boolean; 
      };
      
      if (prefilledSeller) {
        console.log('🏢 Получен предзаполненный продавец:', prefilledSeller);
        setSellerName(prefilledSeller);
        
        // Автоматически запускаем анализ, если указано
        if (autoAnalyze) {
          console.log('🚀 Автоматически запускаем анализ продавца:', prefilledSeller);
          setTimeout(() => {
            analyzeSeller();
          }, 500); // Небольшая задержка для корректной установки состояния
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(location as any).state]);

  const formatPrice = (num: number): string => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ru-RU', {
      maximumFractionDigits: 0
    }).format(num);
  };

  // ✅ Расчет общих показателей продавца (KPI)
  const calculateSellerKPIs = useCallback((products: SellerProduct[], totalDays: number) => {
    if (!products || products.length === 0) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        lostProfit: 0,
        avgDailyRevenuePerItem: 0,
        averageOrderValue: 0,
        avgDailyItemsWithSalesPercent: 0,
        avgMonthlyPurchaseRate: 0,
        averageRating: 0,
        fbsPercentage: 0,
      };
    }

    const totalProducts = products.length;
    const totalRevenue = products.reduce((sum, p) => sum + (Number(p.revenue) || 0), 0);
    const totalOrders = products.reduce((sum, p) => sum + (Number(p.sales) || 0), 0);
    
    // Упущенная выручка по формуле:
    // Упущенная выручка = Общее количество артикулов × Дней × Среднедневная выручка на артикул × Процент непродающихся артикулов
    
    // 1. Среднедневная выручка на артикул (только для артикулов с продажами)
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
    
    // 2. Процент непродающихся артикулов
    const productsWithoutSales = products.filter(p => (Number(p.sales) || 0) === 0);
    const percentNonSellingProducts = totalProducts > 0 
      ? (productsWithoutSales.length / totalProducts) 
      : 0;
    
    // 3. Расчет упущенной выручки
    let lostProfit = 0;
    
    // Основной расчет по формуле
    if (totalProducts > 0 && totalDays > 0 && avgDailyRevenuePerItem > 0 && percentNonSellingProducts > 0) {
      lostProfit = totalProducts * totalDays * avgDailyRevenuePerItem * percentNonSellingProducts;
    }
    
    // Если процент непродающихся артикулов = 0, но есть артикулы с низкими продажами
    if (lostProfit === 0 && totalProducts > 0 && totalDays > 0 && avgDailyRevenuePerItem > 0) {
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
        
        const conservativeDailySales = 0.1;
        lostProfit = totalProducts * totalDays * avgPrice * conservativeDailySales * percentNonSellingProducts;
      }
    }
    
    // Если все еще 0, используем более простой расчет на основе общей выручки
    if (lostProfit === 0 && totalProducts > 0 && totalDays > 0 && totalRevenue > 0) {
      const avgRevenuePerProduct = totalRevenue / totalProducts;
      const avgDailyRevenuePerProduct = avgRevenuePerProduct / totalDays;
      
      if (percentNonSellingProducts > 0) {
        lostProfit = totalProducts * totalDays * avgDailyRevenuePerProduct * percentNonSellingProducts;
      } else {
        lostProfit = totalRevenue * 0.2;
      }
    }
    
    // Средний чек
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Среднедневной % артикулов с продажами
    // Вычисляем на основе данных о днях с продажами для каждого товара
    let avgDailyItemsWithSalesPercent = 0;
    
    if (totalProducts > 0 && totalDays > 0) {
      // Считаем средний процент дней с продажами для всех товаров
      const totalDaysWithSales = products.reduce((sum, p) => {
        const daysWithSales = Number(p.days_with_sales || 0);
        return sum + daysWithSales;
      }, 0);
      
      // Среднее количество дней с продажами на товар
      const avgDaysWithSalesPerProduct = totalDaysWithSales / totalProducts;
      
      // Среднедневной процент артикулов с продажами = (Среднее количество дней с продажами / Общее количество дней) × 100
      avgDailyItemsWithSalesPercent = (avgDaysWithSalesPerProduct / totalDays) * 100;
      
      // Альтернативный расчет: если нет данных о днях с продажами, используем процент товаров с продажами
      if (avgDailyItemsWithSalesPercent === 0 && productsWithSales.length > 0) {
        avgDailyItemsWithSalesPercent = (productsWithSales.length / totalProducts) * 100;
      }
    }
    
    // Среднемесячный процент выкупа
    let avgMonthlyPurchaseRate = 0;
    
    if (products.length > 0) {
      const totalPurchaseRate = products.reduce((sum, p) => {
        const purchaseRate = Number(p.purchase || 0);
        return sum + purchaseRate;
      }, 0);
      
      avgMonthlyPurchaseRate = totalPurchaseRate / products.length;
      
      // Если нет данных о проценте выкупа, используем среднее значение из purchase_after_return
      if (avgMonthlyPurchaseRate === 0) {
        const totalPurchaseAfterReturn = products.reduce((sum, p) => {
          const purchaseRate = Number(p.purchase_after_return || 0);
          return sum + purchaseRate;
        }, 0);
        
        avgMonthlyPurchaseRate = totalPurchaseAfterReturn / products.length;
      }
    }
    
    // Отладка
    console.log('🔍 Seller KPIs Calculation:', {
      totalProducts,
      totalDays,
      totalRevenue,
      totalOrders,
      productsWithSales: productsWithSales.length,
      productsWithoutSales: productsWithoutSales.length,
      percentNonSellingProducts: (percentNonSellingProducts * 100).toFixed(2) + '%',
      avgDailyRevenuePerItem: avgDailyRevenuePerItem.toFixed(2),
      lostProfit: lostProfit.toFixed(2),
      averageOrderValue: averageOrderValue.toFixed(2),
      avgDailyItemsWithSalesPercent: avgDailyItemsWithSalesPercent.toFixed(2) + '%',
      avgMonthlyPurchaseRate: avgMonthlyPurchaseRate.toFixed(2) + '%',
    });
    
    // Средний рейтинг
    let averageRating = 0;
    if (products.length > 0) {
      const totalRating = products.reduce((sum, p) => {
        const rating = Number(p.rating || 0);
        return sum + rating;
      }, 0);
      averageRating = totalRating / products.length;
    }
    
    // Процент FBS товаров
    const fbsProducts = products.filter(p => Number(p.is_fbs || 0) === 1).length;
    const fbsPercentage = totalProducts > 0 ? (fbsProducts / totalProducts) * 100 : 0;
    
    return {
      totalRevenue,
      totalOrders,
      lostProfit,
      avgDailyRevenuePerItem,
      averageOrderValue,
      avgDailyItemsWithSalesPercent,
      avgMonthlyPurchaseRate,
      averageRating,
      fbsPercentage,
    };
  }, []);

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
    if (!data || !data.data || data.data.length === 0) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingDates = new Set<string>();
    
    // Добавляем даты из daily_data
    sellerDailyData.forEach((item) => {
      if (item.period) {
        existingDates.add(item.period);
      }
    });
    
    // Добавляем даты из trends_data
    sellerTrendsData.forEach((item) => {
      if (item.date) {
        existingDates.add(item.date);
      }
    });
    
    // Добавляем даты из графиков товаров
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((product: SellerProduct) => {
        // Графики продаж товаров
        if (product.graph && Array.isArray(product.graph)) {
          // Используем даты из daily_data или генерируем на основе периода
          sellerDailyData.forEach((item) => {
            if (item.period) {
              existingDates.add(item.period);
            }
          });
        }
        // Графики остатков товаров
        if (product.stocks_graph && Array.isArray(product.stocks_graph)) {
          sellerDailyData.forEach((item) => {
            if (item.period) {
              existingDates.add(item.period);
            }
          });
        }
        // Графики цен товаров
        if (product.price_graph && Array.isArray(product.price_graph)) {
          sellerDailyData.forEach((item) => {
            if (item.period) {
              existingDates.add(item.period);
            }
          });
        }
        // Графики видимости товаров
        if (product.product_visibility_graph && Array.isArray(product.product_visibility_graph)) {
          sellerDailyData.forEach((item) => {
            if (item.period) {
              existingDates.add(item.period);
            }
          });
        }
        // Графики категорий товаров
        if (product.category_graph && Array.isArray(product.category_graph)) {
          sellerDailyData.forEach((item) => {
            if (item.period) {
              existingDates.add(item.period);
            }
          });
        }
      });
    }

    // Если нет дат, используем период из dateFrom и dateTo
    if (existingDates.size === 0) {
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        existingDates.add(d.toISOString().split('T')[0]);
      }
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

    sellerDailyData.forEach((item) => {
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

    sellerTrendsData.forEach((item) => {
      if (item.date) {
        if (item.revenue) trendRevenueMap.set(item.date, item.revenue);
        if (item.sales) trendSalesMap.set(item.date, item.sales);
        if (item.product_revenue) trendProductRevenueMap.set(item.date, item.product_revenue);
        if (item.average_order_value) trendAvgOrderValueMap.set(item.date, item.average_order_value);
        if (item.items) trendItemsMap.set(item.date, item.items);
        if (item.items_with_sells) trendItemsWithSalesMap.set(item.date, item.items_with_sells);
      }
    });

    // Метрики из товаров (агрегируем графики всех товаров)
    const productsSalesMap = new Map<string, number>();
    const productsStocksMap = new Map<string, number>();
    const productsPriceMap = new Map<string, number>();
    const productsVisibilityMap = new Map<string, number>();
    const productsCategoryMap = new Map<string, number>();

    if (data.data && Array.isArray(data.data)) {
      const dailyDates = sellerDailyData.map(item => item.period).filter(Boolean) as string[];
      
      data.data.forEach((product: SellerProduct) => {
        // Агрегируем графики продаж товаров
        if (product.graph && Array.isArray(product.graph) && dailyDates.length > 0) {
          dailyDates.forEach((date, index) => {
            if (date && product.graph[index] !== undefined && product.graph[index] !== null) {
              const currentValue = productsSalesMap.get(date) || 0;
              productsSalesMap.set(date, currentValue + (product.graph[index] || 0));
            }
          });
        }
        // Агрегируем графики остатков товаров
        if (product.stocks_graph && Array.isArray(product.stocks_graph) && dailyDates.length > 0) {
          dailyDates.forEach((date, index) => {
            if (date && product.stocks_graph[index] !== undefined && product.stocks_graph[index] !== null) {
              const currentValue = productsStocksMap.get(date) || 0;
              productsStocksMap.set(date, currentValue + (product.stocks_graph[index] || 0));
            }
          });
        }
        // Агрегируем графики цен товаров (среднее значение)
        if (product.price_graph && Array.isArray(product.price_graph) && dailyDates.length > 0) {
          dailyDates.forEach((date, index) => {
            if (date && product.price_graph[index] !== undefined && product.price_graph[index] !== null) {
              const currentSum = productsPriceMap.get(date) || 0;
              const currentCount = productsPriceMap.get(`${date}_count`) || 0;
              productsPriceMap.set(date, currentSum + (product.price_graph[index] || 0));
              productsPriceMap.set(`${date}_count`, currentCount + 1);
            }
          });
        }
        // Агрегируем графики видимости товаров (среднее значение)
        if (product.product_visibility_graph && Array.isArray(product.product_visibility_graph) && dailyDates.length > 0) {
          dailyDates.forEach((date, index) => {
            if (date && product.product_visibility_graph[index] !== undefined && product.product_visibility_graph[index] !== null) {
              const currentSum = productsVisibilityMap.get(date) || 0;
              const currentCount = productsVisibilityMap.get(`${date}_count`) || 0;
              productsVisibilityMap.set(date, currentSum + (product.product_visibility_graph[index] || 0));
              productsVisibilityMap.set(`${date}_count`, currentCount + 1);
            }
          });
        }
        // Агрегируем графики категорий товаров
        if (product.category_graph && Array.isArray(product.category_graph) && dailyDates.length > 0) {
          dailyDates.forEach((date, index) => {
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

    // Метрики из categories_data (агрегированные данные - применяем ко всем датам)
    const categoryItemsMap = new Map<string, number>();
    const categoryItemsWithSalesMap = new Map<string, number>();
    const categorySalesMap = new Map<string, number>();
    const categoryRevenueMap = new Map<string, number>();
    const categoryAvgPriceMap = new Map<string, number>();
    const categoryCommentsMap = new Map<string, number>();
    const categoryRatingMap = new Map<string, number>();

    if (sellerCategoriesData && sellerCategoriesData.length > 0 && historicalDates.length > 0) {
      const totalItems = sellerCategoriesData.reduce((sum, cat: any) => sum + (cat.items || 0), 0);
      const totalItemsWithSales = sellerCategoriesData.reduce((sum, cat: any) => sum + (cat.items_with_sells || 0), 0);
      const totalSales = sellerCategoriesData.reduce((sum, cat: any) => sum + (cat.sales || 0), 0);
      const totalRevenue = sellerCategoriesData.reduce((sum, cat: any) => sum + (cat.revenue || 0), 0);
      const avgPrice = sellerCategoriesData.length > 0 
        ? sellerCategoriesData.reduce((sum, cat: any) => sum + (cat.avg_price || 0), 0) / sellerCategoriesData.length
        : 0;
      const avgComments = sellerCategoriesData.length > 0
        ? sellerCategoriesData.reduce((sum, cat: any) => sum + (cat.comments || 0), 0) / sellerCategoriesData.length
        : 0;
      const avgRating = sellerCategoriesData.length > 0
        ? sellerCategoriesData.reduce((sum, cat: any) => sum + (cat.rating || 0), 0) / sellerCategoriesData.length
        : 0;

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

    // Метрики из brands_data (агрегированные данные - применяем ко всем датам)
    const brandSalesMap = new Map<string, number>();
    const brandRevenueMap = new Map<string, number>();
    const brandItemsMap = new Map<string, number>();
    const brandItemsWithSalesMap = new Map<string, number>();
    const brandAvgPriceMap = new Map<string, number>();
    const brandRatingMap = new Map<string, number>();
    const brandCommentsMap = new Map<string, number>();

    if (sellerBrandsData && sellerBrandsData.length > 0 && historicalDates.length > 0) {
      const totalBrandSales = sellerBrandsData.reduce((sum, brand: any) => sum + (brand.sales || 0), 0);
      const totalBrandRevenue = sellerBrandsData.reduce((sum, brand: any) => sum + (brand.revenue || 0), 0);
      const totalBrandItems = sellerBrandsData.reduce((sum, brand: any) => sum + (brand.items || 0), 0);
      const totalBrandItemsWithSales = sellerBrandsData.reduce((sum, brand: any) => sum + (brand.items_with_sells || 0), 0);
      const avgBrandPrice = sellerBrandsData.length > 0
        ? sellerBrandsData.reduce((sum, brand: any) => sum + (brand.avg_price || 0), 0) / sellerBrandsData.length
        : 0;
      const avgBrandRating = sellerBrandsData.length > 0
        ? sellerBrandsData.reduce((sum, brand: any) => sum + (brand.rating || 0), 0) / sellerBrandsData.length
        : 0;
      const avgBrandComments = sellerBrandsData.length > 0
        ? sellerBrandsData.reduce((sum, brand: any) => sum + (brand.comments || 0), 0) / sellerBrandsData.length
        : 0;

      [...historicalDates, ...existingFutureDates].forEach((date) => {
        brandSalesMap.set(date, totalBrandSales);
        brandRevenueMap.set(date, totalBrandRevenue);
        brandItemsMap.set(date, totalBrandItems);
        brandItemsWithSalesMap.set(date, totalBrandItemsWithSales);
        brandAvgPriceMap.set(date, avgBrandPrice);
        brandRatingMap.set(date, avgBrandRating);
        brandCommentsMap.set(date, avgBrandComments);
      });
    }

    // Метрики из items_data (агрегированные данные - применяем ко всем датам)
    const itemSalesMap = new Map<string, number>();
    const itemRevenueMap = new Map<string, number>();
    const itemItemsMap = new Map<string, number>();
    const itemItemsWithSalesMap = new Map<string, number>();
    const itemAvgPriceMap = new Map<string, number>();
    const itemRatingMap = new Map<string, number>();
    const itemCommentsMap = new Map<string, number>();
    const itemBalanceMap = new Map<string, number>();
    const itemLiveItemsMap = new Map<string, number>();

    if (sellerItemsData && sellerItemsData.length > 0 && historicalDates.length > 0) {
      const totalItemSales = sellerItemsData.reduce((sum, item: any) => sum + (item.sales || 0), 0);
      const totalItemRevenue = sellerItemsData.reduce((sum, item: any) => sum + (item.revenue || 0), 0);
      const totalItemItems = sellerItemsData.reduce((sum, item: any) => sum + (item.items || 0), 0);
      const totalItemItemsWithSales = sellerItemsData.reduce((sum, item: any) => sum + (item.items_with_sells || 0), 0);
      const avgItemPrice = sellerItemsData.length > 0
        ? sellerItemsData.reduce((sum, item: any) => sum + (item.avg_price || 0), 0) / sellerItemsData.length
        : 0;
      const avgItemRating = sellerItemsData.length > 0
        ? sellerItemsData.reduce((sum, item: any) => sum + (item.rating || 0), 0) / sellerItemsData.length
        : 0;
      const avgItemComments = sellerItemsData.length > 0
        ? sellerItemsData.reduce((sum, item: any) => sum + (item.comments || 0), 0) / sellerItemsData.length
        : 0;
      const totalItemBalance = sellerItemsData.reduce((sum, item: any) => sum + (item.balance || 0), 0);
      const totalItemLiveItems = sellerItemsData.reduce((sum, item: any) => sum + (item.live_items || 0), 0);

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

    // Метрики из warehouses_data (агрегированные данные - применяем ко всем датам)
    const warehousesBalanceMap = new Map<string, number>();
    const warehousesItemsMap = new Map<string, number>();

    if (sellerWarehousesData && sellerWarehousesData.length > 0 && historicalDates.length > 0) {
      const totalWarehousesBalance = sellerWarehousesData.reduce((sum, wh: any) => sum + (wh.balance || 0), 0);
      const totalWarehousesItems = sellerWarehousesData.reduce((sum, wh: any) => sum + (wh.items || 0), 0);

      [...historicalDates, ...existingFutureDates].forEach((date) => {
        warehousesBalanceMap.set(date, totalWarehousesBalance);
        warehousesItemsMap.set(date, totalWarehousesItems);
      });
    }

    // Метрики из price_segmentation_data (агрегированные данные - применяем ко всем датам)
    const priceSegRevenueMap = new Map<string, number>();
    const priceSegSalesMap = new Map<string, number>();
    const priceSegItemsMap = new Map<string, number>();
    const priceSegItemsWithSalesMap = new Map<string, number>();

    if (sellerPriceSegmentationData && sellerPriceSegmentationData.length > 0 && historicalDates.length > 0) {
      const totalPriceSegRevenue = sellerPriceSegmentationData.reduce((sum, seg: any) => sum + (seg.revenue || 0), 0);
      const totalPriceSegSales = sellerPriceSegmentationData.reduce((sum, seg: any) => sum + (seg.sales || 0), 0);
      const totalPriceSegItems = sellerPriceSegmentationData.reduce((sum, seg: any) => sum + (seg.items || 0), 0);
      const totalPriceSegItemsWithSales = sellerPriceSegmentationData.reduce((sum, seg: any) => sum + (seg.items_with_sells || 0), 0);

      [...historicalDates, ...existingFutureDates].forEach((date) => {
        priceSegRevenueMap.set(date, totalPriceSegRevenue);
        priceSegSalesMap.set(date, totalPriceSegSales);
        priceSegItemsMap.set(date, totalPriceSegItems);
        priceSegItemsWithSalesMap.set(date, totalPriceSegItemsWithSales);
      });
    }

    // Генерируем прогнозы для всех метрик
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
    generateForecastValues(brandSalesMap, existingFutureDates, 'count');
    generateForecastValues(brandRevenueMap, existingFutureDates, 'money');
    generateForecastValues(brandItemsMap, existingFutureDates, 'count');
    generateForecastValues(brandItemsWithSalesMap, existingFutureDates, 'count');
    generateForecastValues(brandAvgPriceMap, existingFutureDates, 'money');
    generateForecastValues(brandRatingMap, existingFutureDates, 'count');
    generateForecastValues(brandCommentsMap, existingFutureDates, 'count');
    generateForecastValues(itemSalesMap, existingFutureDates, 'count');
    generateForecastValues(itemRevenueMap, existingFutureDates, 'money');
    generateForecastValues(itemItemsMap, existingFutureDates, 'count');
    generateForecastValues(itemItemsWithSalesMap, existingFutureDates, 'count');
    generateForecastValues(itemAvgPriceMap, existingFutureDates, 'money');
    generateForecastValues(itemRatingMap, existingFutureDates, 'count');
    generateForecastValues(itemCommentsMap, existingFutureDates, 'count');
    generateForecastValues(itemBalanceMap, existingFutureDates, 'count');
    generateForecastValues(itemLiveItemsMap, existingFutureDates, 'count');
    generateForecastValues(warehousesBalanceMap, existingFutureDates, 'count');
    generateForecastValues(warehousesItemsMap, existingFutureDates, 'count');
    generateForecastValues(priceSegRevenueMap, existingFutureDates, 'money');
    generateForecastValues(priceSegSalesMap, existingFutureDates, 'count');
    generateForecastValues(priceSegItemsMap, existingFutureDates, 'count');
    generateForecastValues(priceSegItemsWithSalesMap, existingFutureDates, 'count');

    const metrics: UnifiedMetricConfig[] = [
      {
        id: 'revenue',
        label: 'Выручка (₽)',
        color: '#2563eb',
        axis: 'money' as MetricAxis,
        map: revenueMap.size > 0 ? revenueMap : new Map(),
        defaultEnabled: true,
      },
      {
        id: 'sales',
        label: 'Заказы (шт.)',
        color: '#f97316',
        axis: 'count' as MetricAxis,
        map: ordersMap.size > 0 ? ordersMap : new Map(),
        defaultEnabled: true,
      },
      {
        id: 'stocks',
        label: 'Товарные остатки (шт.)',
        color: '#8b5cf6',
        axis: 'count' as MetricAxis,
        map: balanceMap.size > 0 ? balanceMap : productsStocksMap.size > 0 ? productsStocksMap : new Map(),
        defaultEnabled: balanceMap.size > 0 || productsStocksMap.size > 0,
      },
      {
        id: 'price',
        label: 'Средняя цена (₽)',
        color: '#10b981',
        axis: 'money' as MetricAxis,
        map: avgPriceMap.size > 0 ? avgPriceMap : productsPriceMap.size > 0 ? productsPriceMap : new Map(),
        borderDash: [6, 4],
        opacity: 0.18,
        defaultEnabled: false,
      },
      {
        id: 'avg_sale_price',
        label: 'Средний чек (₽)',
        color: '#14b8a6',
        axis: 'money' as MetricAxis,
        map: avgSalePriceMap.size > 0 ? avgSalePriceMap : trendAvgOrderValueMap.size > 0 ? trendAvgOrderValueMap : new Map(),
        borderDash: [4, 4],
        opacity: 0.15,
        defaultEnabled: false,
      },
      {
        id: 'items',
        label: 'Артикулов (шт.)',
        color: '#06b6d4',
        axis: 'count' as MetricAxis,
        map: itemsMap.size > 0 ? itemsMap : trendItemsMap.size > 0 ? trendItemsMap : new Map(),
        borderDash: [3, 3],
        opacity: 0.14,
        defaultEnabled: false,
      },
      {
        id: 'items_with_sales',
        label: 'Поставщиков с продажами (шт.)',
        color: '#22d3ee',
        axis: 'count' as MetricAxis,
        map: itemsWithSalesMap.size > 0 ? itemsWithSalesMap : trendItemsWithSalesMap.size > 0 ? trendItemsWithSalesMap : new Map(),
        borderDash: [5, 5],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'visibility',
        label: 'Всего показов (шт.)',
        color: '#f59e0b',
        axis: 'count' as MetricAxis,
        map: productsVisibilityMap.size > 0 ? productsVisibilityMap : new Map(),
        borderDash: [2, 2],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'comments',
        label: 'Динамика количества отзывов (шт.)',
        color: '#a78bfa',
        axis: 'count' as MetricAxis,
        map: commentsMap.size > 0 ? commentsMap : new Map(),
        borderDash: [3, 5],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'rating',
        label: 'Динамика рейтинга',
        color: '#fbbf24',
        axis: 'count' as MetricAxis,
        map: ratingMap.size > 0 ? ratingMap : new Map(),
        borderDash: [2, 4],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'balance_price',
        label: 'Стоимость остатков (₽)',
        color: '#ec4899',
        axis: 'money' as MetricAxis,
        map: balancePriceMap.size > 0 ? balancePriceMap : new Map(),
        borderDash: [4, 4],
        opacity: 0.15,
        defaultEnabled: false,
      },
      {
        id: 'trend_revenue',
        label: 'Тренд выручки (₽)',
        color: '#0ea5e9',
        axis: 'money' as MetricAxis,
        map: trendRevenueMap.size > 0 ? trendRevenueMap : new Map(),
        borderDash: [2, 6],
        opacity: 0.1,
        defaultEnabled: false,
      },
      {
        id: 'trend_sales',
        label: 'Тренд продаж (шт.)',
        color: '#38bdf8',
        axis: 'count' as MetricAxis,
        map: trendSalesMap.size > 0 ? trendSalesMap : new Map(),
        borderDash: [8, 4],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'trend_product_revenue',
        label: 'Выручка на товар (₽)',
        color: '#6366f1',
        axis: 'money' as MetricAxis,
        map: trendProductRevenueMap.size > 0 ? trendProductRevenueMap : new Map(),
        borderDash: [3, 6],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'products_sales',
        label: 'Продажи товаров (сумма)',
        color: '#ef4444',
        axis: 'count' as MetricAxis,
        map: productsSalesMap.size > 0 ? productsSalesMap : new Map(),
        borderDash: [6, 3],
        opacity: 0.16,
        defaultEnabled: false,
      },
      {
        id: 'products_stocks',
        label: 'Остатки товаров (сумма)',
        color: '#a855f7',
        axis: 'count' as MetricAxis,
        map: productsStocksMap.size > 0 ? productsStocksMap : new Map(),
        borderDash: [4, 4],
        opacity: 0.14,
        defaultEnabled: false,
      },
      {
        id: 'products_price',
        label: 'Средняя цена товаров (₽)',
        color: '#22c55e',
        axis: 'money' as MetricAxis,
        map: productsPriceMap.size > 0 ? productsPriceMap : new Map(),
        borderDash: [3, 5],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'products_visibility',
        label: 'Средняя видимость товаров',
        color: '#f59e0b',
        axis: 'count' as MetricAxis,
        map: productsVisibilityMap.size > 0 ? productsVisibilityMap : new Map(),
        borderDash: [7, 3],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'products_category',
        label: 'Категории товаров (сумма)',
        color: '#ec4899',
        axis: 'count' as MetricAxis,
        map: productsCategoryMap.size > 0 ? productsCategoryMap : new Map(),
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
        map: categoryItemsMap.size > 0 ? categoryItemsMap : new Map(),
        borderDash: [4, 6],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'category_items_with_sales',
        label: 'Товаров с продажами (категории)',
        color: '#60a5fa',
        axis: 'count' as MetricAxis,
        map: categoryItemsWithSalesMap.size > 0 ? categoryItemsWithSalesMap : new Map(),
        borderDash: [6, 4],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'category_sales',
        label: 'Продажи по категориям',
        color: '#818cf8',
        axis: 'count' as MetricAxis,
        map: categorySalesMap.size > 0 ? categorySalesMap : new Map(),
        borderDash: [3, 7],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'category_revenue',
        label: 'Выручка по категориям (₽)',
        color: '#a78bfa',
        axis: 'money' as MetricAxis,
        map: categoryRevenueMap.size > 0 ? categoryRevenueMap : new Map(),
        borderDash: [5, 5],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'category_avg_price',
        label: 'Средняя цена категорий (₽)',
        color: '#c084fc',
        axis: 'money' as MetricAxis,
        map: categoryAvgPriceMap.size > 0 ? categoryAvgPriceMap : new Map(),
        borderDash: [4, 4],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'category_comments',
        label: 'Комментарии категорий',
        color: '#d8b4fe',
        axis: 'count' as MetricAxis,
        map: categoryCommentsMap.size > 0 ? categoryCommentsMap : new Map(),
        borderDash: [6, 3],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'category_rating',
        label: 'Рейтинг категорий',
        color: '#e9d5ff',
        axis: 'count' as MetricAxis,
        map: categoryRatingMap.size > 0 ? categoryRatingMap : new Map(),
        borderDash: [2, 8],
        opacity: 0.12,
        defaultEnabled: false,
      },
      // Метрики из brands_data
      {
        id: 'brand_sales',
        label: 'Продажи брендов',
        color: '#06b6d4',
        axis: 'count' as MetricAxis,
        map: brandSalesMap.size > 0 ? brandSalesMap : new Map(),
        borderDash: [5, 4],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'brand_revenue',
        label: 'Выручка брендов (₽)',
        color: '#22d3ee',
        axis: 'money' as MetricAxis,
        map: brandRevenueMap.size > 0 ? brandRevenueMap : new Map(),
        borderDash: [4, 6],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'brand_items',
        label: 'Товаров брендов',
        color: '#67e8f9',
        axis: 'count' as MetricAxis,
        map: brandItemsMap.size > 0 ? brandItemsMap : new Map(),
        borderDash: [6, 3],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'brand_items_with_sales',
        label: 'Товаров с продажами (бренды)',
        color: '#a5f3fc',
        axis: 'count' as MetricAxis,
        map: brandItemsWithSalesMap.size > 0 ? brandItemsWithSalesMap : new Map(),
        borderDash: [3, 7],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'brand_avg_price',
        label: 'Средняя цена брендов (₽)',
        color: '#cffafe',
        axis: 'money' as MetricAxis,
        map: brandAvgPriceMap.size > 0 ? brandAvgPriceMap : new Map(),
        borderDash: [5, 5],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'brand_rating',
        label: 'Рейтинг брендов',
        color: '#e0f2fe',
        axis: 'count' as MetricAxis,
        map: brandRatingMap.size > 0 ? brandRatingMap : new Map(),
        borderDash: [4, 4],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'brand_comments',
        label: 'Комментарии брендов',
        color: '#f0f9ff',
        axis: 'count' as MetricAxis,
        map: brandCommentsMap.size > 0 ? brandCommentsMap : new Map(),
        borderDash: [6, 3],
        opacity: 0.12,
        defaultEnabled: false,
      },
      // Метрики из items_data
      {
        id: 'item_sales',
        label: 'Продажи предметов',
        color: '#ef4444',
        axis: 'count' as MetricAxis,
        map: itemSalesMap.size > 0 ? itemSalesMap : new Map(),
        borderDash: [5, 4],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'item_revenue',
        label: 'Выручка предметов (₽)',
        color: '#f87171',
        axis: 'money' as MetricAxis,
        map: itemRevenueMap.size > 0 ? itemRevenueMap : new Map(),
        borderDash: [4, 6],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'item_items',
        label: 'Товаров по предметам',
        color: '#fca5a5',
        axis: 'count' as MetricAxis,
        map: itemItemsMap.size > 0 ? itemItemsMap : new Map(),
        borderDash: [6, 3],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'item_items_with_sales',
        label: 'Товаров с продажами (предметы)',
        color: '#fecaca',
        axis: 'count' as MetricAxis,
        map: itemItemsWithSalesMap.size > 0 ? itemItemsWithSalesMap : new Map(),
        borderDash: [3, 7],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'item_avg_price',
        label: 'Средняя цена предметов (₽)',
        color: '#fee2e2',
        axis: 'money' as MetricAxis,
        map: itemAvgPriceMap.size > 0 ? itemAvgPriceMap : new Map(),
        borderDash: [5, 5],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'item_rating',
        label: 'Рейтинг предметов',
        color: '#fef2f2',
        axis: 'count' as MetricAxis,
        map: itemRatingMap.size > 0 ? itemRatingMap : new Map(),
        borderDash: [4, 4],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'item_comments',
        label: 'Комментарии предметов',
        color: '#fff1f2',
        axis: 'count' as MetricAxis,
        map: itemCommentsMap.size > 0 ? itemCommentsMap : new Map(),
        borderDash: [6, 3],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'item_balance',
        label: 'Остатки предметов',
        color: '#fff7ed',
        axis: 'count' as MetricAxis,
        map: itemBalanceMap.size > 0 ? itemBalanceMap : new Map(),
        borderDash: [2, 8],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'item_live_items',
        label: 'Товары с движением',
        color: '#fffbeb',
        axis: 'count' as MetricAxis,
        map: itemLiveItemsMap.size > 0 ? itemLiveItemsMap : new Map(),
        borderDash: [5, 4],
        opacity: 0.12,
        defaultEnabled: false,
      },
      // Метрики из warehouses_data
      {
        id: 'warehouses_balance',
        label: 'Остатки на складах',
        color: '#dc2626',
        axis: 'count' as MetricAxis,
        map: warehousesBalanceMap.size > 0 ? warehousesBalanceMap : new Map(),
        borderDash: [4, 6],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'warehouses_items',
        label: 'Товаров на складах',
        color: '#fca5a5',
        axis: 'count' as MetricAxis,
        map: warehousesItemsMap.size > 0 ? warehousesItemsMap : new Map(),
        borderDash: [6, 3],
        opacity: 0.12,
        defaultEnabled: false,
      },
      // Метрики из price_segmentation_data
      {
        id: 'price_seg_revenue',
        label: 'Выручка по ценовым сегментам (₽)',
        color: '#7c3aed',
        axis: 'money' as MetricAxis,
        map: priceSegRevenueMap.size > 0 ? priceSegRevenueMap : new Map(),
        borderDash: [3, 5],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'price_seg_sales',
        label: 'Продажи по ценовым сегментам',
        color: '#a78bfa',
        axis: 'count' as MetricAxis,
        map: priceSegSalesMap.size > 0 ? priceSegSalesMap : new Map(),
        borderDash: [5, 4],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'price_seg_items',
        label: 'Товаров в ценовых сегментах',
        color: '#c4b5fd',
        axis: 'count' as MetricAxis,
        map: priceSegItemsMap.size > 0 ? priceSegItemsMap : new Map(),
        borderDash: [4, 6],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'price_seg_items_with_sales',
        label: 'Товаров с продажами (ценовые сегменты)',
        color: '#ddd6fe',
        axis: 'count' as MetricAxis,
        map: priceSegItemsWithSalesMap.size > 0 ? priceSegItemsWithSalesMap : new Map(),
        borderDash: [6, 3],
        opacity: 0.12,
        defaultEnabled: false,
      },
    ].filter((metric) => metric.map.size > 0);

    return {
      labels: sortedDates,
      rawLabels: sortedDates,
      metrics,
      forecastStartIndex,
    };
  }, [data, sellerDailyData, sellerTrendsData, sellerCategoriesData, sellerBrandsData, sellerItemsData, sellerWarehousesData, sellerPriceSegmentationData, generateForecastValues, generateFutureDates, dateFrom, dateTo]);

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
        Object.keys(next).some((key) => next[key] !== prev[key]);

      return hasChanges ? next : prev;
    });
  }, [unifiedChartData]);

  const unifiedDatasets = useMemo(() => {
    if (!unifiedChartData) {
      return [];
    }

    const toRGBA = (hexColor: string, alpha: number) => {
      const hex = hexColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
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
        borderDash: metric.borderDash,
        fill: false,
        tension: 0.4,
        yAxisID: metric.axis === 'money' ? 'yMoney' : 'yCount',
      }));
  }, [activeMetrics, unifiedChartData]);

  const calculateAnalytics = (products: SellerProduct[]): SellerAnalytics => {
    if (!Array.isArray(products) || products.length === 0) {
      return {
        total_products: 0,
        total_revenue: 0,
        total_sales: 0,
        average_price: 0,
        average_rating: 0,
        total_balance: 0,
        average_turnover_days: 0,
        fbs_percentage: 0,
        top_categories: [],
        top_brands: []
      };
    }
    
    const totalProducts = products.length;
    const totalRevenue = products.reduce((sum, p) => sum + (p.revenue || 0), 0);
    const totalSales = products.reduce((sum, p) => sum + (p.sales || 0), 0);
    const totalBalance = products.reduce((sum, p) => sum + (p.balance || 0), 0);
    
    const averagePrice = totalSales > 0 ? totalRevenue / totalSales : 0;
    const averageRating = totalProducts > 0 ? products.reduce((sum, p) => sum + (p.rating || 0), 0) / totalProducts : 0;
    const averageTurnoverDays = totalProducts > 0 ? products.reduce((sum, p) => sum + (p.turnover_days || 0), 0) / totalProducts : 0;
    
    const fbsProducts = products.filter(p => p.is_fbs === 1).length;
    const fbsPercentage = totalProducts > 0 ? (fbsProducts / totalProducts) * 100 : 0;

    // Топ категории
    const categoryStats: {[key: string]: {count: number, revenue: number}} = {};
    products.forEach(p => {
      const category = p.subject || 'Неизвестно';
      if (!categoryStats[category]) {
        categoryStats[category] = {count: 0, revenue: 0};
      }
      categoryStats[category].count++;
      categoryStats[category].revenue += (p.revenue || 0);
    });
    
    const topCategories = Object.entries(categoryStats)
      .map(([category, stats]) => ({category, ...stats}))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Топ бренды
    const brandStats: {[key: string]: {count: number, revenue: number}} = {};
    products.forEach(p => {
      const brand = p.brand || 'Неизвестно';
      if (!brandStats[brand]) {
        brandStats[brand] = {count: 0, revenue: 0};
      }
      brandStats[brand].count++;
      brandStats[brand].revenue += (p.revenue || 0);
    });
    
    const topBrands = Object.entries(brandStats)
      .map(([brand, stats]) => ({brand, ...stats}))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      total_products: totalProducts,
      total_revenue: totalRevenue,
      total_sales: totalSales,
      average_price: averagePrice,
      average_rating: averageRating,
      total_balance: totalBalance,
      average_turnover_days: averageTurnoverDays,
      fbs_percentage: fbsPercentage,
      top_categories: topCategories,
      top_brands: topBrands
    };
  };

  const analyzeSeller = useCallback(async () => {
    if (!sellerName.trim()) {
      setError('Введите название продавца для анализа');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setAnalytics(null);

    try {
      // Строим URL для MPStats API
      const params = new URLSearchParams({
        path: sellerName.trim(),
        d1: dateFrom,
        d2: dateTo,
        fbs: fbs.toString()
      });
      
      if (newsmode) {
        params.append('newsmode', newsmode.toString());
      }

      const url = buildApiUrl(`mpstats/seller?${params.toString()}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startRow: 0,
          endRow: 1000, // Получаем до 1000 товаров
          filterModel: {},
          sortModel: [{sort: 'desc', colId: 'revenue'}]
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('📊 Получен ответ от сервера:', result);
        
        // Проверяем структуру ответа
        let productsData: SellerProduct[] = [];
        let mpstatsData: SellerAnalysisResponse | null = null;
        
        if (result.success && result.data) {
          // Если ответ обернут в success/data структуру
          mpstatsData = result.data;
          productsData = mpstatsData?.data || [];
        } else if (result.data) {
          // Если ответ напрямую содержит data
          mpstatsData = result;
          productsData = result.data || [];
        } else {
          console.error('❌ Неожиданная структура ответа:', result);
          setError('Неожиданная структура ответа от сервера');
          return;
        }
        
        if (!mpstatsData) {
          console.error('❌ Не удалось получить данные MPStats');
          setError('Не удалось получить данные от сервера');
          return;
        }
        
          console.log('📦 MPStats данные:', mpstatsData);
          setData(mpstatsData);
          
          // Рассчитываем аналитику
        const calculatedAnalytics = calculateAnalytics(productsData);
          setAnalytics(calculatedAnalytics);
        
        // Рассчитываем KPI
        const daysDiff = Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24)) || 30;
        const calculatedKPIs = calculateSellerKPIs(productsData, daysDiff);
        setSellerKPIs(calculatedKPIs);
        
        // ✅ Загружаем дополнительные данные для единого графика
        if (sellerName.trim()) {
          try {
            // Получаем данные по дням
            const dailyResponse = await fetch(
              buildApiUrl(`mpstats-seller/by_date?path=${encodeURIComponent(sellerName.trim())}&d1=${dateFrom}&d2=${dateTo}&groupBy=day&fbs=${fbs}`),
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
            if (dailyResponse.ok) {
              const dailyData = await dailyResponse.json();
              console.log('📊 Получены данные по дням продавца:', dailyData?.length || 0, 'дней');
              setSellerDailyData(Array.isArray(dailyData) ? dailyData : []);
      } else {
              console.warn('⚠️ Ошибка получения данных по дням продавца:', dailyResponse.status);
            }
            
            // Получаем данные трендов
            const trendsResponse = await fetch(
              buildApiUrl(`mpstats-seller/trends?path=${encodeURIComponent(sellerName.trim())}&d1=${dateFrom}&d2=${dateTo}&fbs=${fbs}`),
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
            if (trendsResponse.ok) {
              const trendsData = await trendsResponse.json();
              console.log('📊 Получены данные трендов продавца:', trendsData?.length || 0, 'периодов');
              setSellerTrendsData(Array.isArray(trendsData) ? trendsData : []);
            } else {
              console.warn('⚠️ Ошибка получения данных трендов продавца:', trendsResponse.status);
            }
            
            // Получаем данные категорий
            const categoriesResponse = await fetch(
              buildApiUrl(`mpstats-seller/categories?path=${encodeURIComponent(sellerName.trim())}&d1=${dateFrom}&d2=${dateTo}&fbs=${fbs}`),
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
            if (categoriesResponse.ok) {
              const categoriesData = await categoriesResponse.json();
              console.log('📊 Получены данные категорий продавца:', categoriesData?.length || 0, 'категорий');
              setSellerCategoriesData(Array.isArray(categoriesData) ? categoriesData : []);
            } else {
              console.warn('⚠️ Ошибка получения данных категорий продавца:', categoriesResponse.status);
            }
            
            // Получаем данные брендов
            const brandsResponse = await fetch(
              buildApiUrl(`mpstats-seller/brands?path=${encodeURIComponent(sellerName.trim())}&d1=${dateFrom}&d2=${dateTo}&fbs=${fbs}`),
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
            if (brandsResponse.ok) {
              const brandsData = await brandsResponse.json();
              console.log('📊 Получены данные брендов продавца:', brandsData?.length || 0, 'брендов');
              setSellerBrandsData(Array.isArray(brandsData) ? brandsData : []);
            } else {
              console.warn('⚠️ Ошибка получения данных брендов продавца:', brandsResponse.status);
            }
            
            // Получаем данные предметов
            const itemsResponse = await fetch(
              buildApiUrl(`mpstats-seller/items?path=${encodeURIComponent(sellerName.trim())}&d1=${dateFrom}&d2=${dateTo}&fbs=${fbs}`),
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
            if (itemsResponse.ok) {
              const itemsData = await itemsResponse.json();
              console.log('📊 Получены данные предметов продавца:', itemsData?.length || 0, 'предметов');
              setSellerItemsData(Array.isArray(itemsData) ? itemsData : []);
            } else {
              console.warn('⚠️ Ошибка получения данных предметов продавца:', itemsResponse.status);
            }
            
            // Получаем данные по складам
            const warehousesResponse = await fetch(
              buildApiUrl(`mpstats-seller/in_warehouses?path=${encodeURIComponent(sellerName.trim())}&d1=${dateFrom}&d2=${dateTo}&fbs=${fbs}`),
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
            if (warehousesResponse.ok) {
              const warehousesData = await warehousesResponse.json();
              console.log('📊 Получены данные по складам продавца:', warehousesData?.length || 0, 'складов');
              setSellerWarehousesData(Array.isArray(warehousesData) ? warehousesData : []);
            } else {
              console.warn('⚠️ Ошибка получения данных по складам продавца:', warehousesResponse.status);
            }
            
            // Получаем данные ценовой сегментации
            const priceSegmentationResponse = await fetch(
              buildApiUrl(`mpstats-seller/price_segmentation?path=${encodeURIComponent(sellerName.trim())}&d1=${dateFrom}&d2=${dateTo}&fbs=${fbs}&spp=0`),
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
            if (priceSegmentationResponse.ok) {
              const priceSegmentationData = await priceSegmentationResponse.json();
              console.log('📊 Получены данные ценовой сегментации продавца:', priceSegmentationData?.length || 0, 'сегментов');
              setSellerPriceSegmentationData(Array.isArray(priceSegmentationData) ? priceSegmentationData : []);
            } else {
              console.warn('⚠️ Ошибка получения данных ценовой сегментации продавца:', priceSegmentationResponse.status);
            }
          } catch (err) {
            console.warn('⚠️ Failed to fetch additional seller data:', err);
          }
        }
        
        // Проверяем, есть ли товары
        if (productsData.length === 0) {
          setError(`Товары не найдены для продавца "${sellerName}". Возможные причины:\n• Неправильное написание названия\n• Продавец не существует в базе MPStats\n• Неверный период дат\n\nПопробуйте:\n• Правильное название: "ИП Золтоев А А" (с пробелом между инициалами)\n• Рабочий пример: "ООО Остин" (32,728 товаров)\n• Проверьте FBS фильтр: попробуйте "Только FBS" или "Все товары"\n• Проверьте даты: возможно, в указанном периоде не было продаж`);
        }
      } else {
        try {
        const errorData = await response.json();
          if (response.status === 404) {
            setError(`Продавец "${sellerName}" не найден. Проверьте правильность написания названия. Возможно, стоит попробовать полное название: "Индивидуальный предприниматель Золтоев Артур Арсаланович"`);
          } else {
        setError(errorData.detail || `Ошибка HTTP ${response.status}`);
          }
        } catch {
          if (response.status === 404) {
            setError(`Продавец "${sellerName}" не найден. Проверьте правильность написания названия.`);
          } else {
            setError(`Ошибка сервера: ${response.status}`);
          }
        }
      }
    } catch (err) {
      setError('Ошибка сети. Убедитесь, что сервер запущен на порту 8000.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [sellerName, dateFrom, dateTo, fbs, newsmode, calculateSellerKPIs]);

  const exportToXLSX = useCallback(async () => {
    if (!data) return;
    
    try {
      const response = await fetch(buildApiUrl('seller/export'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sellerName,
          dateFrom,
          dateTo,
          fbs,
          data: data.data
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `seller_analysis_${sellerName}_${dateFrom}_${dateTo}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  }, [data, sellerName, dateFrom, dateTo, fbs]);

  // Фильтрация товаров
  const filteredProducts = (() => {
    try {
      const products = data?.data || [];
      if (!Array.isArray(products)) {
        console.warn('Products is not an array:', products);
        return [];
      }
      
      return products.filter(product => {
        if (minRevenue && product.revenue < minRevenue) return false;
        if (minSales && product.sales < minSales) return false;
        if (minRating && product.rating < minRating) return false;
        if (selectedBrand && product.brand !== selectedBrand) return false;
        if (selectedCategory && product.subject !== selectedCategory) return false;
        return true;
      });
    } catch (error) {
      console.error('Error filtering products:', error);
      return [];
    }
  })();

  const uniqueBrands = (() => {
    try {
      const products = data?.data || [];
      if (!Array.isArray(products)) return [];
      return Array.from(new Set(products.map(p => p.brand))).filter(Boolean);
    } catch (error) {
      console.error('Error getting unique brands:', error);
      return [];
    }
  })();
  
  const uniqueCategories = (() => {
    try {
      const products = data?.data || [];
      if (!Array.isArray(products)) return [];
      return Array.from(new Set(products.map(p => p.subject))).filter(Boolean);
    } catch (error) {
      console.error('Error getting unique categories:', error);
      return [];
    }
  })();

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)',
      padding: '20px 0'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        {/* Заголовок */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '30px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ 
              fontSize: '3rem', 
              margin: '0 0 15px 0', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: '800',
              letterSpacing: '-1px'
            }}>
              🏪 Анализ продавца
            </h1>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '1.2rem', 
              margin: '0',
              fontWeight: '500'
            }}>
              Детальный анализ продавца через MPStats API с полной аналитикой товаров
            </p>
          </div>
          
          {/* Информационное сообщение с рекомендациями */}
          <div style={{
            backgroundColor: '#FEFCE8',
            border: '1px solid #FDE047',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '25px',
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
              💡 Важные рекомендации для анализа продавца
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>🏷️ Название продавца vs Бренд:</strong> Название продавца может отличаться от названия бренда. 
              Если название продавца совпадает с брендом, это может означать, что данные о продавце недоступны.
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>🔍 Как найти правильное название продавца:</strong>
              <br/>
              • Перейдите на страницу товара на Wildberries.ru
              <br/>
              • Справа от названия продавца найдите серый кружок с буквой <strong>i</strong>
              <br/>
              • Наведите курсор на этот кружок - появится полное наименование продавца
              <br/>
              • Используйте это полное название для поиска в нашем сервисе
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>📝 Примеры правильных названий:</strong>
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
                ИП Золтоев А А
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
                ООО Остин
              </span>
            </div>
            <div style={{ 
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '12px',
              marginTop: '15px'
            }}>
              <strong>ℹ️ Почему не всегда можем получить название продавца:</strong>
              <br/>
              • Продавцы могут скрывать свои данные для защиты конфиденциальности
              <br/>
              • Некоторые продавцы используют псевдонимы или сокращенные названия
              <br/>
              • Данные могут быть временно недоступны из-за технических ограничений
              <br/>
              • Мы постоянно работаем над улучшением качества данных! 🚀
            </div>
          </div>
          
          {/* Форма поиска */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '25px'
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                🏷️ Название продавца
              </label>
              <input
                type="text"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                placeholder="ИП Золтоев А А, ООО Остин, Индивидуальный предприниматель Золтоев Артур Арсаланович..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                📅 Дата начала
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                📅 Дата окончания
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                📦 FBS фильтр
              </label>
              <select
                value={fbs}
                onChange={(e) => setFbs(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px',
                  backgroundColor: 'white'
                }}
              >
                <option value={0}>Все товары</option>
                <option value={1}>Только FBS</option>
                <option value={2}>Только FBO</option>
              </select>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                🆕 Новинки
              </label>
              <select
                value={newsmode || ''}
                onChange={(e) => setNewsmode(e.target.value ? Number(e.target.value) : null)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Все товары</option>
                <option value={7}>Новинки за 7 дней</option>
                <option value={14}>Новинки за 14 дней</option>
                <option value={30}>Новинки за 30 дней</option>
              </select>
            </div>
          </div>

          {/* Кнопка анализа */}
          <div style={{ textAlign: 'center' }}>
          <button
              onClick={analyzeSeller}
            disabled={loading}
            style={{
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
                padding: '15px 40px',
                borderRadius: '15px',
              fontSize: '18px',
                fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
                transform: loading ? 'none' : 'translateY(0)',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
                }
              }}
            >
              {loading ? '⏳ Анализируем продавца...' : '🔍 Анализировать продавца'}
          </button>
          
          {/* Быстрые варианты названий */}
          <div style={{ marginTop: '20px' }}>
            <p style={{ 
              fontSize: '0.9rem', 
              color: '#6b7280', 
              marginBottom: '10px',
              textAlign: 'center'
            }}>
              💡 Попробуйте эти варианты: <span style={{color: '#22c55e', fontWeight: '600'}}>✅ ИП Золтоев А А</span> - основной, <span style={{color: '#3b82f6', fontWeight: '600'}}>✅ ООО Остин</span> - пример
            </p>
                <div style={{
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '8px',
              justifyContent: 'center'
            }}>
              {[
                'ИП Золтоев А А',
                'ООО Остин',
                'Индивидуальный предприниматель Золтоев Артур Арсаланович',
                'Золтоев АА'
              ].map((variant, index) => (
                <button
                  key={index}
                  onClick={() => setSellerName(variant)}
                  style={{
                    padding: '6px 12px',
                    background: variant === 'ИП Золтоев А А' ? '#dcfce7' : variant === 'ООО Остин' ? '#dbeafe' : '#f3f4f6',
                    border: variant === 'ИП Золтоев А А' ? '1px solid #22c55e' : variant === 'ООО Остин' ? '1px solid #3b82f6' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    maxWidth: '200px',
                    textAlign: 'center',
                    fontWeight: (variant === 'ИП Золтоев А А' || variant === 'ООО Остин') ? '600' : 'normal'
                  }}
                  onMouseOver={(e) => {
                    if (variant === 'ИП Золтоев А А') {
                      e.currentTarget.style.background = '#bbf7d0';
                      e.currentTarget.style.borderColor = '#16a34a';
                    } else if (variant === 'ООО Остин') {
                      e.currentTarget.style.background = '#bfdbfe';
                      e.currentTarget.style.borderColor = '#2563eb';
                    } else {
                      e.currentTarget.style.background = '#e5e7eb';
                      e.currentTarget.style.borderColor = '#9ca3af';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (variant === 'ИП Золтоев А А') {
                      e.currentTarget.style.background = '#dcfce7';
                      e.currentTarget.style.borderColor = '#22c55e';
                    } else if (variant === 'ООО Остин') {
                      e.currentTarget.style.background = '#dbeafe';
                      e.currentTarget.style.borderColor = '#3b82f6';
                    } else {
                      e.currentTarget.style.background = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }
                  }}
                >
                  {variant.length > 25 ? variant.substring(0, 25) + '...' : variant}
          </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ошибка */}
        {error && (
          <div style={{
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              border: '2px solid #f87171',
              borderRadius: '15px',
              padding: '20px',
              marginTop: '25px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#dc2626', fontWeight: '600', fontSize: '16px' }}>
                ❌ {error}
              </div>
          </div>
        )}
        </div>

        {/* Результаты анализа */}
        {data && analytics && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* ✅ Блок общих показателей (KPI) */}
            {sellerKPIs && (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ fontSize: '1.8rem', color: '#1f2937', marginBottom: '25px', textAlign: 'center' }}>
                  📊 Общие показатели продавца
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
                      {formatPrice(sellerKPIs.totalRevenue).replace('₽', '')}
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
                      {formatNumber(sellerKPIs.totalOrders)}
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
                      {formatPrice(sellerKPIs.lostProfit).replace('₽', '')}
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
                      {formatPrice(sellerKPIs.avgDailyRevenuePerItem).replace('₽', '')}
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
                      {formatPrice(sellerKPIs.averageOrderValue).replace('₽', '')}
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
                    <div style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)', fontWeight: '800', marginBottom: '8px' }}>
                      {sellerKPIs.avgDailyItemsWithSalesPercent.toFixed(2)}%
                    </div>
                    <div style={{ fontSize: '1rem', opacity: 0.95, fontWeight: '500' }}>Среднедневной % артикулов с продажами</div>
              </div>

                  {/* Среднемесячный процент выкупа */}
                <div style={{
                    background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                    color: 'white',
                    padding: '25px',
                    borderRadius: '20px',
                  textAlign: 'center',
                    boxShadow: '0 8px 25px rgba(236, 72, 153, 0.3)',
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                    <div style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)', fontWeight: '800', marginBottom: '8px' }}>
                      {sellerKPIs.avgMonthlyPurchaseRate.toFixed(2)}%
                  </div>
                    <div style={{ fontSize: '1rem', opacity: 0.95, fontWeight: '500' }}>Среднемесячный процент выкупа</div>
                  </div>
                  
                  {/* Средний рейтинг */}
                  <div style={{
                    background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                    color: 'white',
                    padding: '25px',
                    borderRadius: '20px',
                    textAlign: 'center',
                    boxShadow: '0 8px 25px rgba(168, 85, 247, 0.3)',
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⭐</div>
                    <div style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)', fontWeight: '800', marginBottom: '8px' }}>
                      {sellerKPIs.averageRating.toFixed(1)}★
                    </div>
                    <div style={{ fontSize: '1rem', opacity: 0.95, fontWeight: '500' }}>Средний рейтинг</div>
                </div>

                  {/* FBS товары */}
                <div style={{
                    background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                    color: 'white',
                    padding: '25px',
                    borderRadius: '20px',
                  textAlign: 'center',
                    boxShadow: '0 8px 25px rgba(20, 184, 166, 0.3)',
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
                    <div style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)', fontWeight: '800', marginBottom: '8px' }}>
                      {sellerKPIs.fbsPercentage.toFixed(1)}%
                  </div>
                    <div style={{ fontSize: '1rem', opacity: 0.95, fontWeight: '500' }}>FBS товары</div>
                  </div>
                </div>
              </div>
            )}

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

            {/* Графики */}
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ 
                fontSize: '1.8rem', 
                color: '#1f2937', 
                marginBottom: '25px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                justifyContent: 'center'
              }}>
                📈 Графики и аналитика
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 600px), 1fr))',
                gap: '30px',
                width: '100%',
                maxWidth: '100%'
              }}>
                {/* График по категориям */}
                {analytics.top_categories && analytics.top_categories.length > 0 && (
                <div style={{ 
                  height: '500px',
                  minHeight: '500px',
                  padding: '10px',
                  overflow: 'hidden',
                  width: '100%',
                  maxWidth: '100%'
                }}>
                  <h3 style={{
                    textAlign: 'center', 
                    marginBottom: '20px', 
                    color: '#374151',
                    fontSize: '1.2rem',
                    fontWeight: '600'
                  }}>
                    🏷️ Топ категории по выручке
                  </h3>
                  <div style={{ height: 'calc(100% - 60px)', position: 'relative', width: '100%' }}>
                    <Bar
                    data={{
                      labels: analytics.top_categories.slice(0, 6).map(cat => {
                          // Сокращаем длинные названия категорий более умно
                          const maxLength = 40;
                          if (cat.category && cat.category.length > maxLength) {
                            // Пытаемся обрезать по словам
                            const words = cat.category.split(' ');
                            let result = '';
                            for (const word of words) {
                              if ((result + ' ' + word).length > maxLength) break;
                              result += (result ? ' ' : '') + word;
                            }
                            return result + (result.length < cat.category.length ? '...' : '');
                          }
                          return cat.category || 'Без категории';
                      }),
                      datasets: [{
                        label: 'Выручка (₽)',
                        data: analytics.top_categories.slice(0, 6).map(cat => cat.revenue),
                        backgroundColor: [
                          'rgba(99, 102, 241, 0.8)',
                          'rgba(139, 92, 246, 0.8)',
                          'rgba(168, 85, 247, 0.8)',
                          'rgba(196, 79, 248, 0.8)',
                          'rgba(217, 70, 239, 0.8)',
                          'rgba(236, 72, 153, 0.8)'
                        ],
                        borderColor: [
                          'rgba(99, 102, 241, 1)',
                          'rgba(139, 92, 246, 1)',
                          'rgba(168, 85, 247, 1)',
                          'rgba(196, 79, 248, 1)',
                          'rgba(217, 70, 239, 1)',
                          'rgba(236, 72, 153, 1)'
                        ],
                        borderWidth: 2,
                        borderRadius: 12,
                        borderSkipped: false,
                        hoverBackgroundColor: [
                          'rgba(99, 102, 241, 0.9)',
                          'rgba(139, 92, 246, 0.9)',
                          'rgba(168, 85, 247, 0.9)',
                          'rgba(196, 79, 248, 0.9)',
                          'rgba(217, 70, 239, 0.9)',
                          'rgba(236, 72, 153, 0.9)'
                        ]
                      }]
                    }}
                    options={{
                      indexAxis: 'y' as const,
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: 'white',
                          bodyColor: 'white',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          borderWidth: 1,
                          cornerRadius: 8,
                          callbacks: {
                            title: function(context: any) {
                              return analytics.top_categories[context[0].dataIndex].category;
                            },
                            label: function(context: any) {
                              return 'Выручка: ' + formatPrice(context.parsed.x);
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                          },
                          ticks: {
                            callback: function(value: any) {
                              return formatPrice(value);
                            },
                            color: '#6b7280',
                            font: {
                              size: 11
                            },
                            maxTicksLimit: 6
                          },
                          title: {
                            display: true,
                            text: 'Выручка (₽)',
                            color: '#6b7280',
                            font: {
                              size: 12,
                              weight: 'bold'
                            }
                          }
                        },
                        y: {
                          grid: {
                            display: false
                          },
                          ticks: {
                            color: '#374151',
                            font: {
                              size: 11,
                              weight: 'normal'
                            },
                            maxRotation: 0,
                            minRotation: 0,
                            autoSkip: false,
                            padding: 12,
                            callback: function(value: any, index: number) {
                              const label = this.getLabelForValue(value);
                              if (typeof label === 'string') {
                                // Уже обрезано в labels, просто возвращаем как есть
                                return label;
                              }
                              return label;
                            }
                          },
                          afterFit: function(scale: any) {
                            // Увеличиваем ширину для длинных названий
                            scale.width = Math.max(scale.width, 200);
                            // Ограничиваем максимальную ширину, чтобы график не вылезал
                            scale.width = Math.min(scale.width, 300);
                          }
                        }
                      },
                      animation: {
                        duration: 1000,
                        easing: 'easeInOutQuart'
                      }
                    }}
                  />
                  </div>
                </div>
                )}

                {/* График по брендам */}
                {analytics.top_brands && analytics.top_brands.length > 0 && (
                <div style={{ 
                  height: '500px',
                  minHeight: '500px',
                  padding: '10px',
                  overflow: 'hidden',
                  width: '100%',
                  maxWidth: '100%'
                }}>
                  <h3 style={{
                    textAlign: 'center', 
                    marginBottom: '20px', 
                    color: '#374151',
                    fontSize: '1.2rem',
                    fontWeight: '600'
                  }}>
                    🏢 Топ бренды по выручке
                  </h3>
                  <div style={{ height: 'calc(100% - 60px)', position: 'relative', width: '100%' }}>
                    <Bar
                    data={{
                        labels: analytics.top_brands.slice(0, 6).map(brand => {
                          const brandName = brand.brand || 'Без бренда';
                          const maxLength = 35;
                          if (brandName.length > maxLength) {
                            // Пытаемся обрезать по словам
                            const words = brandName.split(' ');
                            let result = '';
                            for (const word of words) {
                              if ((result + ' ' + word).length > maxLength) break;
                              result += (result ? ' ' : '') + word;
                            }
                            return result + (result.length < brandName.length ? '...' : '');
                          }
                          return brandName;
                        }),
                      datasets: [{
                        label: 'Выручка (₽)',
                        data: analytics.top_brands.slice(0, 6).map(brand => brand.revenue),
                        backgroundColor: [
                          'rgba(16, 185, 129, 0.8)',
                          'rgba(34, 197, 94, 0.8)',
                          'rgba(59, 130, 246, 0.8)',
                          'rgba(147, 51, 234, 0.8)',
                          'rgba(239, 68, 68, 0.8)',
                          'rgba(245, 158, 11, 0.8)'
                        ],
                        borderColor: [
                          'rgba(16, 185, 129, 1)',
                          'rgba(34, 197, 94, 1)',
                          'rgba(59, 130, 246, 1)',
                          'rgba(147, 51, 234, 1)',
                          'rgba(239, 68, 68, 1)',
                          'rgba(245, 158, 11, 1)'
                        ],
                        borderWidth: 2,
                        borderRadius: 12,
                        borderSkipped: false,
                        hoverBackgroundColor: [
                          'rgba(16, 185, 129, 0.9)',
                          'rgba(34, 197, 94, 0.9)',
                          'rgba(59, 130, 246, 0.9)',
                          'rgba(147, 51, 234, 0.9)',
                          'rgba(239, 68, 68, 0.9)',
                          'rgba(245, 158, 11, 0.9)'
                        ]
                      }]
                    }}
                    options={{
                      indexAxis: 'y' as const,
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: 'white',
                          bodyColor: 'white',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          borderWidth: 1,
                          cornerRadius: 8,
                          callbacks: {
                            title: function(context: any) {
                              return analytics.top_brands[context[0].dataIndex].brand;
                            },
                            label: function(context: any) {
                              return 'Выручка: ' + formatPrice(context.parsed.x);
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                          },
                          ticks: {
                            callback: function(value: any) {
                              return formatPrice(value);
                            },
                            color: '#6b7280',
                            font: {
                              size: 11
                            },
                            maxTicksLimit: 6
                          },
                          title: {
                            display: true,
                            text: 'Выручка (₽)',
                            color: '#6b7280',
                            font: {
                              size: 12,
                              weight: 'bold'
                            }
                          }
                        },
                        y: {
                          grid: {
                            display: false
                          },
                          ticks: {
                            color: '#374151',
                            font: {
                              size: 11,
                              weight: 'normal'
                            },
                            maxRotation: 0,
                            minRotation: 0,
                            autoSkip: false,
                            padding: 12,
                            callback: function(value: any, index: number) {
                              const label = this.getLabelForValue(value);
                              if (typeof label === 'string') {
                                // Уже обрезано в labels, просто возвращаем как есть
                                return label;
                              }
                              return label;
                            }
                          },
                          afterFit: function(scale: any) {
                            // Увеличиваем ширину для длинных названий
                            scale.width = Math.max(scale.width, 200);
                            // Ограничиваем максимальную ширину, чтобы график не вылезал
                            scale.width = Math.min(scale.width, 300);
                          }
                        }
                      },
                      animation: {
                        duration: 1000,
                        easing: 'easeInOutQuart'
                      }
                    }}
                  />
                  </div>
                </div>
                )}
              </div>
            </div>

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
                <h2 style={{ 
                  fontSize: '1.8rem', 
                  color: '#1f2937', 
                  margin: 0,
              display: 'flex',
              alignItems: 'center',
                  gap: '10px'
            }}>
                  📦 Товары продавца ({filteredProducts.length})
                </h2>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                style={{
                      padding: '8px 16px',
                      background: showFilters ? '#ef4444' : '#6b7280',
                      color: 'white',
                  border: 'none',
                      borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                }}
              >
                    {showFilters ? '❌ Скрыть фильтры' : '🔍 Фильтры'}
              </button>
              
              <button
                onClick={exportToXLSX}
                disabled={!data}
                style={{
                  padding: '10px 20px',
                  background: data ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: data ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📊 Экспорт в Excel
              </button>
              </div>
            </div>

            {/* Панель фильтров */}
            {showFilters && (
              <div style={{
                  background: '#f9fafb',
                  borderRadius: '15px',
                  padding: '20px',
                  marginBottom: '25px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '15px'
              }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Мин. выручка (₽)
                  </label>
                  <input
                    type="number"
                      value={minRevenue || ''}
                      onChange={(e) => setMinRevenue(e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Мин. продажи
                  </label>
                  <input
                    type="number"
                      value={minSales || ''}
                      onChange={(e) => setMinSales(e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    Мин. рейтинг
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={minRating || ''}
                    onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Бренд
                  </label>
                    <select
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Все бренды</option>
                      {uniqueBrands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Категория
                  </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Все категории</option>
                      {uniqueCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                </div>
              </div>
            )}

              {/* Таблица товаров */}
            <div style={{
                overflowX: 'auto',
                    borderRadius: '15px',
                border: '2px solid #e5e7eb'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  backgroundColor: 'white'
                }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        Товар
                      </th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        Бренд
                      </th>
                      <th style={{ padding: '15px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        Цена (₽)
                      </th>
                      <th style={{ padding: '15px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        Продажи
                      </th>
                      <th style={{ padding: '15px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        Выручка (₽)
                      </th>
                      <th style={{ padding: '15px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        Рейтинг
                      </th>
                      <th style={{ padding: '15px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        Остаток
                      </th>
                      <th style={{ padding: '15px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        FBS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.slice(0, 100).map((product, index) => (
                      <tr key={product.id} style={{ 
                        borderBottom: '1px solid #f3f4f6',
                          transition: 'background-color 0.2s'
                        }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                        <td style={{ padding: '15px', borderBottom: '1px solid #f3f4f6' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {product.thumb && (
                              <img 
                                src={`https:${product.thumb}`} 
                                alt={product.name}
                                style={{ 
                                  width: '40px', 
                                  height: '40px', 
                                  objectFit: 'cover', 
                                  borderRadius: '8px',
                                  border: '1px solid #e5e7eb'
                                }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                          <div>
                              <div 
                                style={{ 
                                  fontWeight: '600', 
                                  color: '#1f2937', 
                                  fontSize: '14px', 
                                  lineHeight: '1.4',
                                  cursor: 'pointer',
                                  textDecoration: 'none',
                                  transition: 'color 0.2s'
                                }}
                                onClick={() => {
                                  navigate('/product-analysis', {
                                    state: {
                                      prefilledArticle: product.id,
                                      autoAnalyze: true
                                    }
                                  });
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#2563eb';
                                  e.currentTarget.style.textDecoration = 'underline';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#1f2937';
                                  e.currentTarget.style.textDecoration = 'none';
                                }}
                              >
                                {product.name.length > 50 ? product.name.substring(0, 50) + '...' : product.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                ID: {product.id}
                            </div>
                          </div>
                          </div>
                        </td>
                        <td style={{ padding: '15px', borderBottom: '1px solid #f3f4f6' }}>
                          {product.brand ? (
                            <span
                              style={{
                                fontWeight: '600',
                                color: '#374151',
                                cursor: 'pointer',
                                textDecoration: 'none',
                                transition: 'color 0.2s',
                                display: 'inline-block'
                              }}
                              onClick={() => {
                                navigate('/brand-analysis', {
                                  state: {
                                    brandName: product.brand,
                                    autoAnalyze: true
                                  }
                                });
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#2563eb';
                                e.currentTarget.style.textDecoration = 'underline';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#374151';
                                e.currentTarget.style.textDecoration = 'none';
                              }}
                            >
                              {product.brand}
                            </span>
                          ) : (
                            <span style={{ fontWeight: '600', color: '#9ca3af' }}>
                              Без бренда
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '15px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', fontWeight: '600', color: '#059669' }}>
                          {formatPrice(product.final_price)}
                        </td>
                        <td style={{ padding: '15px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', fontWeight: '600', color: '#d97706' }}>
                          {formatNumber(product.sales)}
                        </td>
                        <td style={{ padding: '15px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', fontWeight: '600', color: '#dc2626' }}>
                          {formatPrice(product.revenue)}
                        </td>
                        <td style={{ padding: '15px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                          <div style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: product.rating >= 4 ? '#dcfce7' : product.rating >= 3 ? '#fef3c7' : '#fee2e2',
                            color: product.rating >= 4 ? '#166534' : product.rating >= 3 ? '#92400e' : '#991b1b',
                            fontWeight: '600',
                            fontSize: '14px'
                          }}>
                            ⭐ {product.rating}
                          </div>
                        </td>
                        <td style={{ padding: '15px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', fontWeight: '600', color: '#7c3aed' }}>
                          {formatNumber(product.balance)}
                        </td>
                        <td style={{ padding: '15px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                          <div style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: product.is_fbs ? '#dcfce7' : '#f3f4f6',
                            color: product.is_fbs ? '#166534' : '#6b7280',
                            fontWeight: '600',
                            fontSize: '12px'
                          }}>
                            {product.is_fbs ? '✅ FBS' : '❌ FBO'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredProducts.length > 100 && (
                <div style={{ 
                  textAlign: 'center', 
                  marginTop: '20px', 
                  color: '#6b7280', 
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Показано 100 из {filteredProducts.length} товаров
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerAnalysis; 