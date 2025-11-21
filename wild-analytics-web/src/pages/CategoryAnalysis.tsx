import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  Filler,
  TooltipItem
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
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

    const ctx = chart.ctx;
    const chartArea = chart.chartArea;
    const endPixel = chartArea.right;

    ctx.save();
    ctx.fillStyle = pluginOptions.backgroundColor || 'rgba(59, 130, 246, 0.2)';
    ctx.fillRect(startPixel, chartArea.top, endPixel - startPixel, chartArea.bottom - chartArea.top);

    ctx.strokeStyle = pluginOptions.borderColor || 'rgba(59, 130, 246, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(startPixel, chartArea.top);
    ctx.lineTo(startPixel, chartArea.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    if (pluginOptions.label) {
      const text = pluginOptions.label;
      const textX = startPixel + 10;
      const textY = chartArea.top + 25;
      ctx.font = pluginOptions.font || 'bold 14px "Inter", sans-serif';
      ctx.fillStyle = pluginOptions.labelColor || '#1e40af';
      ctx.fillRect(textX - 5, textY - 15, ctx.measureText(text).width + 10, 20);
      ctx.fillStyle = 'white';
      ctx.fillText(text, textX, textY);
    }
    ctx.restore();
  },
};

interface CategoryRecommendations {
  insights: string[];
  opportunities: string[];
  threats: string[];
  recommendations: string[];
  market_trends: string[];
  competitive_advantages: string[];
}

interface CategoryAnalysisData {
  category_info: {
    name: string;
    period: string;
    total_products: number;
    total_revenue: number;
    total_sales: number;
    average_price: number;
    average_rating: number;
    average_purchase: number;
    average_turnover_days: number;
    // Новые поля
    total_suppliers?: number;
    total_brands?: number;
    total_articles?: number;
    monopoly_index?: number;
    avg_daily_suppliers_with_orders?: number;
    brands_with_sales?: number;
    articles_with_sales?: number;
  };
  top_products: Array<{
    id: number;
    name: string;
    brand?: string;
    seller?: string;
    final_price: number;
    sales: number;
    revenue: number;
    rating: number;
    comments: number;
    purchase: number;
    balance: number;
    country?: string;
    gender?: string;
    thumb_middle?: string;
    url?: string;
    // Расширенные данные
    basic_sale?: number;
    promo_sale?: number;
    client_sale?: number;
    client_price?: number;
    start_price?: number;
    final_price_max?: number;
    final_price_min?: number;
    average_if_in_stock?: number;
    category_position?: number;
    sku_first_date?: string;
    firstcommentdate?: string;
    picscount?: number;
    hasvideo?: boolean;
    has3d?: boolean;
  }>;
  all_products: Array<any>;
  category_metrics: {
    revenue_per_product: number;
    sales_per_product: number;
    products_with_sales_percentage: number;
    fbs_percentage: number;
    average_comments: number;
    top_brands_count: number;
    price_range_min: number;
    price_range_max: number;
  };
  aggregated_charts: {
    sales_graph: { dates: string[]; values: number[] };
    stocks_graph: { dates: string[]; values: number[] };
    price_graph: { dates: string[]; values: number[] };
    visibility_graph: { dates: string[]; values: number[] };
  };
  ai_recommendations: CategoryRecommendations;
  metadata: any;
}

const CategoryAnalysis: React.FC = () => {
  const location = useLocation();
  
  // Добавляем Yandex.Metrika счетчик
  useEffect(() => {
    addYandexMetrika('104757914');
  }, []);

  const [categoryPath, setCategoryPath] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fbs, setFbs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CategoryAnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [brandFilter, setBrandFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  // Состояния для дополнительных данных категории
  const [categoryDailyData, setCategoryDailyData] = useState<any[]>([]);
  const [categoryTrendsData, setCategoryTrendsData] = useState<any[]>([]);
  const [categoryBrandsData, setCategoryBrandsData] = useState<any[]>([]);
  const [categorySellersData, setCategorySellersData] = useState<any[]>([]);
  const [categoryItemsData, setCategoryItemsData] = useState<any[]>([]);
  const [categoryPriceSegmentationData, setCategoryPriceSegmentationData] = useState<any[]>([]);
  const [activeMetrics, setActiveMetrics] = useState<Record<string, boolean>>({});

  // Устанавливаем даты по умолчанию
  useEffect(() => {
    const today = new Date();
    const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(oneMonthAgo.toISOString().split('T')[0]);
  }, []);

  // Обработка предзаполненных данных при переходе с других страниц
  useEffect(() => {
    if (location.state) {
      const { prefilledCategory, autoAnalyze } = location.state as { 
        prefilledCategory?: string; 
        autoAnalyze?: boolean; 
      };
      
      if (prefilledCategory) {
        console.log('🏷️ Получена предзаполненная категория:', prefilledCategory);
        setCategoryPath(prefilledCategory);
        
        // Автоматически запускаем анализ, если указано
        if (autoAnalyze) {
          console.log('🚀 Автоматически запускаем анализ категории:', prefilledCategory);
          setTimeout(() => {
            analyzeCategory();
          }, 500); // Небольшая задержка для корректной установки состояния
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ru-RU').format(Math.round(num));
  };

  const setQuickDateRange = (days: number) => {
    const today = new Date();
    const pastDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(pastDate.toISOString().split('T')[0]);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const analyzeCategory = useCallback(async () => {
    if (!categoryPath.trim()) {
      setError('Введите путь категории');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(buildApiUrl('category/category-analysis'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_path: categoryPath,
          date_from: dateFrom,
          date_to: dateTo,
          fbs: fbs
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
        
        // Получаем дополнительные данные из MPStats API
        try {
          // Получаем данные по дням
          const dailyResponse = await fetch(
            buildApiUrl(`mpstats-category/by_date?path=${encodeURIComponent(categoryPath)}&d1=${dateFrom}&d2=${dateTo}&groupBy=day&fbs=${fbs}`),
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
          );
          if (dailyResponse.ok) {
            const dailyData = await dailyResponse.json();
            console.log('📊 Получены данные по дням:', dailyData?.length || 0, 'дней');
            setCategoryDailyData(Array.isArray(dailyData) ? dailyData : []);
          }
          
          // Получаем данные трендов
          const trendsResponse = await fetch(
            buildApiUrl(`mpstats-category/trends?path=${encodeURIComponent(categoryPath)}&d1=${dateFrom}&d2=${dateTo}&fbs=${fbs}&view=itemsInCategory`),
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
          );
          if (trendsResponse.ok) {
            const trendsData = await trendsResponse.json();
            console.log('📊 Получены данные трендов:', trendsData?.length || 0, 'периодов');
            setCategoryTrendsData(Array.isArray(trendsData) ? trendsData : []);
          }
          
          // Получаем данные брендов
          const brandsResponse = await fetch(
            buildApiUrl(`mpstats-category/brands?path=${encodeURIComponent(categoryPath)}&d1=${dateFrom}&d2=${dateTo}&fbs=${fbs}`),
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
          );
          if (brandsResponse.ok) {
            const brandsData = await brandsResponse.json();
            console.log('📊 Получены данные брендов:', brandsData?.length || 0, 'брендов');
            setCategoryBrandsData(Array.isArray(brandsData) ? brandsData : []);
          }
          
          // Получаем данные продавцов
          const sellersResponse = await fetch(
            buildApiUrl(`mpstats-category/sellers?path=${encodeURIComponent(categoryPath)}&d1=${dateFrom}&d2=${dateTo}&fbs=${fbs}`),
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
          );
          if (sellersResponse.ok) {
            const sellersData = await sellersResponse.json();
            console.log('📊 Получены данные продавцов:', sellersData?.length || 0, 'продавцов');
            setCategorySellersData(Array.isArray(sellersData) ? sellersData : []);
          }
          
          // Получаем данные предметов
          const itemsResponse = await fetch(
            buildApiUrl(`mpstats-category/items?path=${encodeURIComponent(categoryPath)}&d1=${dateFrom}&d2=${dateTo}&fbs=${fbs}`),
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
          );
          if (itemsResponse.ok) {
            const itemsData = await itemsResponse.json();
            console.log('📊 Получены данные предметов:', itemsData?.length || 0, 'предметов');
            setCategoryItemsData(Array.isArray(itemsData) ? itemsData : []);
          }
          
          // Получаем данные ценовой сегментации
          const priceSegResponse = await fetch(
            buildApiUrl(`mpstats-category/price_segmentation?path=${encodeURIComponent(categoryPath)}&d1=${dateFrom}&d2=${dateTo}&fbs=${fbs}&spp=0`),
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
          );
          if (priceSegResponse.ok) {
            const priceSegData = await priceSegResponse.json();
            console.log('📊 Получены данные ценовой сегментации:', priceSegData?.length || 0, 'сегментов');
            setCategoryPriceSegmentationData(Array.isArray(priceSegData) ? priceSegData : []);
          }
        } catch (err) {
          console.warn('⚠️ Failed to fetch additional category data:', err);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || `Ошибка HTTP ${response.status}`);
      }
    } catch (err) {
      setError('Ошибка сети. Убедитесь, что сервер запущен на порту 8000.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryPath, dateFrom, dateTo, fbs]);

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
    
    const lastValues = sortedEntries.slice(-7);
    const avgValue = lastValues.reduce((sum, [, val]) => sum + val, 0) / lastValues.length;
    
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
    
    data.aggregated_charts.sales_graph?.dates?.forEach((date) => date && existingDates.add(date));
    data.aggregated_charts.stocks_graph?.dates?.forEach((date) => date && existingDates.add(date));
    data.aggregated_charts.price_graph?.dates?.forEach((date) => date && existingDates.add(date));
    data.aggregated_charts.visibility_graph?.dates?.forEach((date) => date && existingDates.add(date));
    
    categoryDailyData.forEach((item) => {
      if (item.period) existingDates.add(item.period);
    });
    
    categoryTrendsData.forEach((item) => {
      if (item.date) existingDates.add(item.date);
    });
    
    if (data.all_products && Array.isArray(data.all_products)) {
      data.all_products.forEach((product: any) => {
        if (product.graph && Array.isArray(product.graph)) {
          const salesDates = data.aggregated_charts?.sales_graph?.dates;
          if (salesDates) salesDates.forEach((date) => date && existingDates.add(date));
        }
        if (product.stocks_graph && Array.isArray(product.stocks_graph)) {
          const stocksDates = data.aggregated_charts?.stocks_graph?.dates;
          if (stocksDates) stocksDates.forEach((date) => date && existingDates.add(date));
        }
        if (product.price_graph && Array.isArray(product.price_graph)) {
          const priceDates = data.aggregated_charts?.price_graph?.dates;
          if (priceDates) priceDates.forEach((date) => date && existingDates.add(date));
        }
        if (product.product_visibility_graph && Array.isArray(product.product_visibility_graph)) {
          const visibilityDates = data.aggregated_charts?.visibility_graph?.dates;
          if (visibilityDates) visibilityDates.forEach((date) => date && existingDates.add(date));
        }
        if (product.category_graph && Array.isArray(product.category_graph)) {
          const categoryDates = data.aggregated_charts?.sales_graph?.dates;
          if (categoryDates) categoryDates.forEach((date) => date && existingDates.add(date));
        }
      });
    }

    if (existingDates.size === 0) return null;

    const datesArray = Array.from(existingDates);
    const historicalDates = datesArray
      .filter((date) => new Date(date) <= today)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    let existingFutureDates = datesArray
      .filter((date) => new Date(date) > today)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const lastHistoricalDate = historicalDates.length > 0 ? historicalDates[historicalDates.length - 1] : null;
    const FORECAST_HORIZON = 14;
    const newFutureDates = generateFutureDates(
      existingFutureDates.length ? existingFutureDates[existingFutureDates.length - 1] : lastHistoricalDate,
      FORECAST_HORIZON
    );
    existingFutureDates = [...existingFutureDates, ...newFutureDates];

    const sortedDates = [
      ...historicalDates,
      ...existingFutureDates.filter((date, index, self) => self.indexOf(date) === index),
    ];

    const forecastStartIndex = historicalDates.length > 0 ? historicalDates.length : existingFutureDates.length > 0 ? 0 : null;

    const toMap = (dates?: string[], values?: Array<number | null | undefined>) => {
      const map = new Map<string, number>();
      if (!dates || !values) return map;
      dates.forEach((date, index) => {
        const value = values[index];
        if (date && value !== undefined && value !== null) {
          map.set(date, value);
        }
      });
      return map;
    };

    const salesMap = toMap(data.aggregated_charts.sales_graph?.dates, data.aggregated_charts.sales_graph?.values);
    const stocksMap = toMap(data.aggregated_charts.stocks_graph?.dates, data.aggregated_charts.stocks_graph?.values);
    const priceMap = toMap(data.aggregated_charts.price_graph?.dates, data.aggregated_charts.price_graph?.values);
    const visibilityMap = toMap(data.aggregated_charts.visibility_graph?.dates, data.aggregated_charts.visibility_graph?.values);

    const revenueMap = new Map<string, number>();
    const ordersMap = new Map<string, number>();
    const avgPriceMap = new Map<string, number>();
    const itemsMap = new Map<string, number>();
    const itemsWithSalesMap = new Map<string, number>();
    const commentsMap = new Map<string, number>();
    const ratingMap = new Map<string, number>();
    const avgSalePriceMap = new Map<string, number>();
    const brandsMap = new Map<string, number>();
    const brandsWithSalesMap = new Map<string, number>();
    const sellersMap = new Map<string, number>();
    const sellersWithSalesMap = new Map<string, number>();

    categoryDailyData.forEach((item) => {
      if (item.period) {
        if (item.revenue) revenueMap.set(item.period, item.revenue);
        if (item.sales) ordersMap.set(item.period, item.sales);
        if (item.avg_price) avgPriceMap.set(item.period, item.avg_price);
        if (item.items) itemsMap.set(item.period, item.items);
        if (item.items_with_sells) itemsWithSalesMap.set(item.period, item.items_with_sells);
        if (item.comments) commentsMap.set(item.period, item.comments);
        if (item.rating) ratingMap.set(item.period, item.rating);
        if (item.avg_sale_price) avgSalePriceMap.set(item.period, item.avg_sale_price);
        if (item.brands) brandsMap.set(item.period, item.brands);
        if (item.brands_with_sells) brandsWithSalesMap.set(item.period, item.brands_with_sells);
        if (item.sellers) sellersMap.set(item.period, item.sellers);
        if (item.sellers_with_sells) sellersWithSalesMap.set(item.period, item.sellers_with_sells);
      }
    });

    const trendRevenueMap = new Map<string, number>();
    const trendSalesMap = new Map<string, number>();
    const trendProductRevenueMap = new Map<string, number>();
    const trendAvgOrderValueMap = new Map<string, number>();
    const trendItemsMap = new Map<string, number>();
    const trendItemsWithSalesMap = new Map<string, number>();
    const trendBrandsMap = new Map<string, number>();
    const trendBrandsWithSalesMap = new Map<string, number>();
    const trendSellersMap = new Map<string, number>();
    const trendSellersWithSalesMap = new Map<string, number>();

    categoryTrendsData.forEach((item) => {
      if (item.date) {
        if (item.revenue) trendRevenueMap.set(item.date, item.revenue);
        if (item.sales) trendSalesMap.set(item.date, item.sales);
        if (item.product_revenue) trendProductRevenueMap.set(item.date, item.product_revenue);
        if (item.average_order_value) trendAvgOrderValueMap.set(item.date, item.average_order_value);
        if (item.items) trendItemsMap.set(item.date, item.items);
        if (item.items_with_sells) trendItemsWithSalesMap.set(item.date, item.items_with_sells);
        if (item.brands) trendBrandsMap.set(item.date, item.brands);
        if (item.brands_with_sells) trendBrandsWithSalesMap.set(item.date, item.brands_with_sells);
        if (item.sellers) trendSellersMap.set(item.date, item.sellers);
        if (item.sellers_with_sells) trendSellersWithSalesMap.set(item.date, item.sellers_with_sells);
      }
    });

    const brandItemsMap = new Map<string, number>();
    const brandItemsWithSalesMap = new Map<string, number>();
    const brandSalesMap = new Map<string, number>();
    const brandRevenueMap = new Map<string, number>();
    const brandAvgPriceMap = new Map<string, number>();
    const brandRatingMap = new Map<string, number>();
    const brandCommentsMap = new Map<string, number>();
    const brandBalanceMap = new Map<string, number>();

    if (categoryBrandsData && categoryBrandsData.length > 0 && historicalDates.length > 0) {
      const totalBrandItems = categoryBrandsData.reduce((sum, brand: any) => sum + (brand.items || 0), 0);
      const totalBrandItemsWithSales = categoryBrandsData.reduce((sum, brand: any) => sum + (brand.items_with_sells || 0), 0);
      const totalBrandSales = categoryBrandsData.reduce((sum, brand: any) => sum + (brand.sales || 0), 0);
      const totalBrandRevenue = categoryBrandsData.reduce((sum, brand: any) => sum + (brand.revenue || 0), 0);
      const avgBrandPrice = categoryBrandsData.length > 0
        ? categoryBrandsData.reduce((sum, brand: any) => sum + (brand.avg_price || 0), 0) / categoryBrandsData.length
        : 0;
      const avgBrandRating = categoryBrandsData.length > 0
        ? categoryBrandsData.reduce((sum, brand: any) => sum + (brand.rating || 0), 0) / categoryBrandsData.length
        : 0;
      const avgBrandComments = categoryBrandsData.length > 0
        ? categoryBrandsData.reduce((sum, brand: any) => sum + (brand.comments || 0), 0) / categoryBrandsData.length
        : 0;
      const totalBrandBalance = categoryBrandsData.reduce((sum, brand: any) => sum + (brand.balance || 0), 0);

      [...historicalDates, ...existingFutureDates].forEach((date) => {
        brandItemsMap.set(date, totalBrandItems);
        brandItemsWithSalesMap.set(date, totalBrandItemsWithSales);
        brandSalesMap.set(date, totalBrandSales);
        brandRevenueMap.set(date, totalBrandRevenue);
        brandAvgPriceMap.set(date, avgBrandPrice);
        brandRatingMap.set(date, avgBrandRating);
        brandCommentsMap.set(date, avgBrandComments);
        brandBalanceMap.set(date, totalBrandBalance);
      });
    }

    const sellerItemsMap = new Map<string, number>();
    const sellerItemsWithSalesMap = new Map<string, number>();
    const sellerSalesMap = new Map<string, number>();
    const sellerRevenueMap = new Map<string, number>();
    const sellerAvgPriceMap = new Map<string, number>();
    const sellerRatingMap = new Map<string, number>();
    const sellerCommentsMap = new Map<string, number>();
    const sellerBalanceMap = new Map<string, number>();

    if (categorySellersData && categorySellersData.length > 0 && historicalDates.length > 0) {
      const totalSellerItems = categorySellersData.reduce((sum, seller: any) => sum + (seller.items || 0), 0);
      const totalSellerItemsWithSales = categorySellersData.reduce((sum, seller: any) => sum + (seller.items_with_sells || 0), 0);
      const totalSellerSales = categorySellersData.reduce((sum, seller: any) => sum + (seller.sales || 0), 0);
      const totalSellerRevenue = categorySellersData.reduce((sum, seller: any) => sum + (seller.revenue || 0), 0);
      const avgSellerPrice = categorySellersData.length > 0
        ? categorySellersData.reduce((sum, seller: any) => sum + (seller.avg_price || 0), 0) / categorySellersData.length
        : 0;
      const avgSellerRating = categorySellersData.length > 0
        ? categorySellersData.reduce((sum, seller: any) => sum + (seller.rating || 0), 0) / categorySellersData.length
        : 0;
      const avgSellerComments = categorySellersData.length > 0
        ? categorySellersData.reduce((sum, seller: any) => sum + (seller.comments || 0), 0) / categorySellersData.length
        : 0;
      const totalSellerBalance = categorySellersData.reduce((sum, seller: any) => sum + (seller.balance || 0), 0);

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

    const itemSalesMap = new Map<string, number>();
    const itemRevenueMap = new Map<string, number>();
    const itemItemsMap = new Map<string, number>();
    const itemItemsWithSalesMap = new Map<string, number>();
    const itemAvgPriceMap = new Map<string, number>();
    const itemRatingMap = new Map<string, number>();
    const itemCommentsMap = new Map<string, number>();
    const itemBalanceMap = new Map<string, number>();
    const itemLiveItemsMap = new Map<string, number>();

    if (categoryItemsData && categoryItemsData.length > 0 && historicalDates.length > 0) {
      const totalItemSales = categoryItemsData.reduce((sum, item: any) => sum + (item.sales || 0), 0);
      const totalItemRevenue = categoryItemsData.reduce((sum, item: any) => sum + (item.revenue || 0), 0);
      const totalItemItems = categoryItemsData.reduce((sum, item: any) => sum + (item.items || 0), 0);
      const totalItemItemsWithSales = categoryItemsData.reduce((sum, item: any) => sum + (item.items_with_sells || 0), 0);
      const avgItemPrice = categoryItemsData.length > 0
        ? categoryItemsData.reduce((sum, item: any) => sum + (item.avg_price || 0), 0) / categoryItemsData.length
        : 0;
      const avgItemRating = categoryItemsData.length > 0
        ? categoryItemsData.reduce((sum, item: any) => sum + (item.rating || 0), 0) / categoryItemsData.length
        : 0;
      const avgItemComments = categoryItemsData.length > 0
        ? categoryItemsData.reduce((sum, item: any) => sum + (item.comments || 0), 0) / categoryItemsData.length
        : 0;
      const totalItemBalance = categoryItemsData.reduce((sum, item: any) => sum + (item.balance || 0), 0);
      const totalItemLiveItems = categoryItemsData.reduce((sum, item: any) => sum + (item.live_items || 0), 0);

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

    const priceSegRevenueMap = new Map<string, number>();
    const priceSegSalesMap = new Map<string, number>();
    const priceSegItemsMap = new Map<string, number>();
    const priceSegItemsWithSalesMap = new Map<string, number>();
    const priceSegLostProfitMap = new Map<string, number>();

    if (categoryPriceSegmentationData && categoryPriceSegmentationData.length > 0 && historicalDates.length > 0) {
      const totalPriceSegRevenue = categoryPriceSegmentationData.reduce((sum, seg: any) => sum + (seg.revenue || 0), 0);
      const totalPriceSegSales = categoryPriceSegmentationData.reduce((sum, seg: any) => sum + (seg.sales || 0), 0);
      const totalPriceSegItems = categoryPriceSegmentationData.reduce((sum, seg: any) => sum + (seg.items || 0), 0);
      const totalPriceSegItemsWithSales = categoryPriceSegmentationData.reduce((sum, seg: any) => sum + (seg.items_with_sells || 0), 0);
      const totalPriceSegLostProfit = categoryPriceSegmentationData.reduce((sum, seg: any) => sum + (seg.lost_profit || 0), 0);

      [...historicalDates, ...existingFutureDates].forEach((date) => {
        priceSegRevenueMap.set(date, totalPriceSegRevenue);
        priceSegSalesMap.set(date, totalPriceSegSales);
        priceSegItemsMap.set(date, totalPriceSegItems);
        priceSegItemsWithSalesMap.set(date, totalPriceSegItemsWithSales);
        priceSegLostProfitMap.set(date, totalPriceSegLostProfit);
      });
    }

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
        if (product.graph && Array.isArray(product.graph) && salesDates.length === product.graph.length) {
          salesDates.forEach((date, index) => {
            if (date && product.graph[index] !== undefined && product.graph[index] !== null) {
              const currentValue = productsSalesMap.get(date) || 0;
              productsSalesMap.set(date, currentValue + (product.graph[index] || 0));
            }
          });
        }
        if (product.stocks_graph && Array.isArray(product.stocks_graph) && stocksDates.length === product.stocks_graph.length) {
          stocksDates.forEach((date, index) => {
            if (date && product.stocks_graph[index] !== undefined && product.stocks_graph[index] !== null) {
              const currentValue = productsStocksMap.get(date) || 0;
              productsStocksMap.set(date, currentValue + (product.stocks_graph[index] || 0));
            }
          });
        }
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
        if (product.category_graph && Array.isArray(product.category_graph) && salesDates.length === product.category_graph.length) {
          salesDates.forEach((date, index) => {
            if (date && product.category_graph[index] !== undefined && product.category_graph[index] !== null) {
              const currentValue = productsCategoryMap.get(date) || 0;
              productsCategoryMap.set(date, currentValue + (product.category_graph[index] || 0));
            }
          });
        }
      });

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
    generateForecastValues(brandsMap, existingFutureDates, 'count');
    generateForecastValues(brandsWithSalesMap, existingFutureDates, 'count');
    generateForecastValues(sellersMap, existingFutureDates, 'count');
    generateForecastValues(sellersWithSalesMap, existingFutureDates, 'count');
    generateForecastValues(trendRevenueMap, existingFutureDates, 'money');
    generateForecastValues(trendSalesMap, existingFutureDates, 'count');
    generateForecastValues(trendProductRevenueMap, existingFutureDates, 'money');
    generateForecastValues(trendAvgOrderValueMap, existingFutureDates, 'money');
    generateForecastValues(trendItemsMap, existingFutureDates, 'count');
    generateForecastValues(trendItemsWithSalesMap, existingFutureDates, 'count');
    generateForecastValues(trendBrandsMap, existingFutureDates, 'count');
    generateForecastValues(trendBrandsWithSalesMap, existingFutureDates, 'count');
    generateForecastValues(trendSellersMap, existingFutureDates, 'count');
    generateForecastValues(trendSellersWithSalesMap, existingFutureDates, 'count');
    generateForecastValues(productsSalesMap, existingFutureDates, 'count');
    generateForecastValues(productsStocksMap, existingFutureDates, 'count');
    generateForecastValues(productsPriceMap, existingFutureDates, 'money');
    generateForecastValues(productsVisibilityMap, existingFutureDates, 'count');
    generateForecastValues(productsCategoryMap, existingFutureDates, 'count');
    generateForecastValues(brandItemsMap, existingFutureDates, 'count');
    generateForecastValues(brandItemsWithSalesMap, existingFutureDates, 'count');
    generateForecastValues(brandSalesMap, existingFutureDates, 'count');
    generateForecastValues(brandRevenueMap, existingFutureDates, 'money');
    generateForecastValues(brandAvgPriceMap, existingFutureDates, 'money');
    generateForecastValues(brandRatingMap, existingFutureDates, 'count');
    generateForecastValues(brandCommentsMap, existingFutureDates, 'count');
    generateForecastValues(brandBalanceMap, existingFutureDates, 'count');
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
    generateForecastValues(priceSegRevenueMap, existingFutureDates, 'money');
    generateForecastValues(priceSegSalesMap, existingFutureDates, 'count');
    generateForecastValues(priceSegItemsMap, existingFutureDates, 'count');
    generateForecastValues(priceSegItemsWithSalesMap, existingFutureDates, 'count');
    generateForecastValues(priceSegLostProfitMap, existingFutureDates, 'money');

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
        map: stocksMap,
        defaultEnabled: stocksMap.size > 0,
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
        label: 'Товаров в категории',
        color: '#6366f1',
        axis: 'count' as MetricAxis,
        map: itemsMap,
        defaultEnabled: false,
      },
      {
        id: 'items_with_sales',
        label: 'Товаров с продажами',
        color: '#8b5cf6',
        axis: 'count' as MetricAxis,
        map: itemsWithSalesMap,
        defaultEnabled: false,
      },
      {
        id: 'comments',
        label: 'Комментарии',
        color: '#ec4899',
        axis: 'count' as MetricAxis,
        map: commentsMap,
        borderDash: [3, 3],
        opacity: 0.1,
        defaultEnabled: false,
      },
      {
        id: 'rating',
        label: 'Рейтинг',
        color: '#f59e0b',
        axis: 'count' as MetricAxis,
        map: ratingMap,
        borderDash: [4, 4],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'brands',
        label: 'Количество брендов',
        color: '#06b6d4',
        axis: 'count' as MetricAxis,
        map: brandsMap.size > 0 ? brandsMap : trendBrandsMap,
        defaultEnabled: false,
      },
      {
        id: 'brands_with_sales',
        label: 'Брендов с продажами',
        color: '#0891b2',
        axis: 'count' as MetricAxis,
        map: brandsWithSalesMap.size > 0 ? brandsWithSalesMap : trendBrandsWithSalesMap,
        defaultEnabled: false,
      },
      {
        id: 'sellers',
        label: 'Количество продавцов',
        color: '#0d9488',
        axis: 'count' as MetricAxis,
        map: sellersMap.size > 0 ? sellersMap : trendSellersMap,
        defaultEnabled: false,
      },
      {
        id: 'sellers_with_sales',
        label: 'Продавцов с продажами',
        color: '#14b8a6',
        axis: 'count' as MetricAxis,
        map: sellersWithSalesMap.size > 0 ? sellersWithSalesMap : trendSellersWithSalesMap,
        defaultEnabled: false,
      },
      {
        id: 'trend_revenue',
        label: 'Выручка (тренд) (₽)',
        color: '#3b82f6',
        axis: 'money' as MetricAxis,
        map: trendRevenueMap,
        borderDash: [5, 5],
        opacity: 0.15,
        defaultEnabled: false,
      },
      {
        id: 'trend_sales',
        label: 'Продажи (тренд) (шт.)',
        color: '#fb923c',
        axis: 'count' as MetricAxis,
        map: trendSalesMap,
        borderDash: [5, 5],
        opacity: 0.15,
        defaultEnabled: false,
      },
      {
        id: 'trend_product_revenue',
        label: 'Выручка на товар (тренд) (₽)',
        color: '#60a5fa',
        axis: 'money' as MetricAxis,
        map: trendProductRevenueMap,
        borderDash: [6, 3],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'trend_avg_order_value',
        label: 'Средний чек (тренд) (₽)',
        color: '#93c5fd',
        axis: 'money' as MetricAxis,
        map: trendAvgOrderValueMap,
        borderDash: [4, 4],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'trend_items',
        label: 'Товаров (тренд)',
        color: '#a5b4fc',
        axis: 'count' as MetricAxis,
        map: trendItemsMap,
        borderDash: [3, 5],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'trend_items_with_sales',
        label: 'Товаров с продажами (тренд)',
        color: '#c7d2fe',
        axis: 'count' as MetricAxis,
        map: trendItemsWithSalesMap,
        borderDash: [5, 3],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'brand_items',
        label: 'Товаров (бренды)',
        color: '#818cf8',
        axis: 'count' as MetricAxis,
        map: brandItemsMap.size > 0 ? brandItemsMap : new Map(),
        borderDash: [4, 6],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'brand_items_with_sales',
        label: 'Товаров с продажами (бренды)',
        color: '#a5b4fc',
        axis: 'count' as MetricAxis,
        map: brandItemsWithSalesMap.size > 0 ? brandItemsWithSalesMap : new Map(),
        borderDash: [3, 7],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'brand_sales',
        label: 'Продажи (бренды) (шт.)',
        color: '#fbbf24',
        axis: 'count' as MetricAxis,
        map: brandSalesMap.size > 0 ? brandSalesMap : new Map(),
        borderDash: [5, 4],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'brand_revenue',
        label: 'Выручка (бренды) (₽)',
        color: '#fcd34d',
        axis: 'money' as MetricAxis,
        map: brandRevenueMap.size > 0 ? brandRevenueMap : new Map(),
        borderDash: [4, 6],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'brand_avg_price',
        label: 'Средняя цена брендов (₽)',
        color: '#fde047',
        axis: 'money' as MetricAxis,
        map: brandAvgPriceMap.size > 0 ? brandAvgPriceMap : new Map(),
        borderDash: [5, 5],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'brand_rating',
        label: 'Рейтинг брендов',
        color: '#fef3c7',
        axis: 'count' as MetricAxis,
        map: brandRatingMap.size > 0 ? brandRatingMap : new Map(),
        borderDash: [4, 4],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'brand_comments',
        label: 'Комментарии брендов',
        color: '#fffbeb',
        axis: 'count' as MetricAxis,
        map: brandCommentsMap.size > 0 ? brandCommentsMap : new Map(),
        borderDash: [6, 3],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'brand_balance',
        label: 'Остатки брендов (шт.)',
        color: '#fef9c3',
        axis: 'count' as MetricAxis,
        map: brandBalanceMap.size > 0 ? brandBalanceMap : new Map(),
        borderDash: [3, 6],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'seller_items',
        label: 'Товаров (продавцы)',
        color: '#ef4444',
        axis: 'count' as MetricAxis,
        map: sellerItemsMap.size > 0 ? sellerItemsMap : new Map(),
        borderDash: [5, 4],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'seller_items_with_sales',
        label: 'Товаров с продажами (продавцы)',
        color: '#f87171',
        axis: 'count' as MetricAxis,
        map: sellerItemsWithSalesMap.size > 0 ? sellerItemsWithSalesMap : new Map(),
        borderDash: [4, 6],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'seller_sales',
        label: 'Продажи (продавцы) (шт.)',
        color: '#fb7185',
        axis: 'count' as MetricAxis,
        map: sellerSalesMap.size > 0 ? sellerSalesMap : new Map(),
        borderDash: [6, 3],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'seller_revenue',
        label: 'Выручка (продавцы) (₽)',
        color: '#fda4af',
        axis: 'money' as MetricAxis,
        map: sellerRevenueMap.size > 0 ? sellerRevenueMap : new Map(),
        borderDash: [4, 5],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'seller_avg_price',
        label: 'Средняя цена продавцов (₽)',
        color: '#fecdd3',
        axis: 'money' as MetricAxis,
        map: sellerAvgPriceMap.size > 0 ? sellerAvgPriceMap : new Map(),
        borderDash: [5, 4],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'seller_rating',
        label: 'Рейтинг продавцов',
        color: '#ffe4e6',
        axis: 'count' as MetricAxis,
        map: sellerRatingMap.size > 0 ? sellerRatingMap : new Map(),
        borderDash: [4, 4],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'seller_comments',
        label: 'Комментарии продавцов',
        color: '#fff1f2',
        axis: 'count' as MetricAxis,
        map: sellerCommentsMap.size > 0 ? sellerCommentsMap : new Map(),
        borderDash: [6, 3],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'seller_balance',
        label: 'Остатки продавцов (шт.)',
        color: '#fee2e2',
        axis: 'count' as MetricAxis,
        map: sellerBalanceMap.size > 0 ? sellerBalanceMap : new Map(),
        borderDash: [3, 6],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'item_sales',
        label: 'Продажи предметов (шт.)',
        color: '#dc2626',
        axis: 'count' as MetricAxis,
        map: itemSalesMap.size > 0 ? itemSalesMap : new Map(),
        borderDash: [5, 4],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'item_revenue',
        label: 'Выручка предметов (₽)',
        color: '#ea580c',
        axis: 'money' as MetricAxis,
        map: itemRevenueMap.size > 0 ? itemRevenueMap : new Map(),
        borderDash: [4, 6],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'item_items',
        label: 'Товаров (предметы)',
        color: '#f97316',
        axis: 'count' as MetricAxis,
        map: itemItemsMap.size > 0 ? itemItemsMap : new Map(),
        borderDash: [6, 3],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'item_items_with_sales',
        label: 'Товаров с продажами (предметы)',
        color: '#fb923c',
        axis: 'count' as MetricAxis,
        map: itemItemsWithSalesMap.size > 0 ? itemItemsWithSalesMap : new Map(),
        borderDash: [5, 4],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'item_avg_price',
        label: 'Средняя цена предметов (₽)',
        color: '#fdba74',
        axis: 'money' as MetricAxis,
        map: itemAvgPriceMap.size > 0 ? itemAvgPriceMap : new Map(),
        borderDash: [4, 5],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'item_rating',
        label: 'Рейтинг предметов',
        color: '#fed7aa',
        axis: 'count' as MetricAxis,
        map: itemRatingMap.size > 0 ? itemRatingMap : new Map(),
        borderDash: [5, 3],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'item_comments',
        label: 'Комментарии предметов',
        color: '#ffedd5',
        axis: 'count' as MetricAxis,
        map: itemCommentsMap.size > 0 ? itemCommentsMap : new Map(),
        borderDash: [6, 3],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'item_balance',
        label: 'Остатки предметов (шт.)',
        color: '#fff7ed',
        axis: 'count' as MetricAxis,
        map: itemBalanceMap.size > 0 ? itemBalanceMap : new Map(),
        borderDash: [3, 6],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'item_live_items',
        label: 'Товары с движением (предметы)',
        color: '#fef3c7',
        axis: 'count' as MetricAxis,
        map: itemLiveItemsMap.size > 0 ? itemLiveItemsMap : new Map(),
        borderDash: [4, 4],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'products_sales',
        label: 'Продажи товаров (шт.)',
        color: '#7c3aed',
        axis: 'count' as MetricAxis,
        map: productsSalesMap.size > 0 ? productsSalesMap : new Map(),
        borderDash: [5, 4],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'products_stocks',
        label: 'Остатки товаров (шт.)',
        color: '#8b5cf6',
        axis: 'count' as MetricAxis,
        map: productsStocksMap.size > 0 ? productsStocksMap : new Map(),
        borderDash: [4, 6],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'products_price',
        label: 'Средняя цена товаров (₽)',
        color: '#a78bfa',
        axis: 'money' as MetricAxis,
        map: productsPriceMap.size > 0 ? productsPriceMap : new Map(),
        borderDash: [6, 3],
        opacity: 0.13,
        defaultEnabled: false,
      },
      {
        id: 'products_visibility',
        label: 'Видимость товаров (%)',
        color: '#c4b5fd',
        axis: 'count' as MetricAxis,
        map: productsVisibilityMap.size > 0 ? productsVisibilityMap : new Map(),
        borderDash: [5, 4],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'products_category',
        label: 'Категории товаров',
        color: '#ddd6fe',
        axis: 'count' as MetricAxis,
        map: productsCategoryMap.size > 0 ? productsCategoryMap : new Map(),
        borderDash: [4, 5],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'price_seg_revenue',
        label: 'Выручка (ценовые сегменты) (₽)',
        color: '#be185d',
        axis: 'money' as MetricAxis,
        map: priceSegRevenueMap.size > 0 ? priceSegRevenueMap : new Map(),
        borderDash: [5, 4],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'price_seg_sales',
        label: 'Продажи (ценовые сегменты) (шт.)',
        color: '#db2777',
        axis: 'count' as MetricAxis,
        map: priceSegSalesMap.size > 0 ? priceSegSalesMap : new Map(),
        borderDash: [4, 6],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'price_seg_items',
        label: 'Товаров (ценовые сегменты)',
        color: '#ec4899',
        axis: 'count' as MetricAxis,
        map: priceSegItemsMap.size > 0 ? priceSegItemsMap : new Map(),
        borderDash: [6, 3],
        opacity: 0.12,
        defaultEnabled: false,
      },
      {
        id: 'price_seg_items_with_sales',
        label: 'Товаров с продажами (ценовые сегменты)',
        color: '#f472b6',
        axis: 'count' as MetricAxis,
        map: priceSegItemsWithSalesMap.size > 0 ? priceSegItemsWithSalesMap : new Map(),
        borderDash: [5, 4],
        opacity: 0.11,
        defaultEnabled: false,
      },
      {
        id: 'price_seg_lost_profit',
        label: 'Упущенная прибыль (ценовые сегменты) (₽)',
        color: '#f9a8d4',
        axis: 'money' as MetricAxis,
        map: priceSegLostProfitMap.size > 0 ? priceSegLostProfitMap : new Map(),
        borderDash: [4, 5],
        opacity: 0.12,
        defaultEnabled: false,
      },
    ];

    return {
      labels: sortedDates,
      metrics,
      forecastStartIndex,
      rawLabels: sortedDates,
    };
  }, [data, categoryDailyData, categoryTrendsData, categoryBrandsData, categorySellersData, categoryItemsData, categoryPriceSegmentationData, generateForecastValues, generateFutureDates]);

  // Инициализация активных метрик при загрузке данных
  useEffect(() => {
    if (!unifiedChartData) {
      setActiveMetrics((prev) =>
        Object.keys(prev).length > 0 ? prev : {}
      );
      return;
    }
    setActiveMetrics((prev) => {
      const newMetrics: Record<string, boolean> = {};
      unifiedChartData.metrics.forEach((metric) => {
        newMetrics[metric.id] = prev[metric.id] !== undefined ? prev[metric.id] : metric.defaultEnabled;
      });
      return newMetrics;
    });
  }, [unifiedChartData]);

  // Подготовка датасетов для графика
  const unifiedDatasets = useMemo(() => {
    if (!unifiedChartData) {
      return [];
    }
    return unifiedChartData.metrics
      .filter((metric) => activeMetrics[metric.id])
      .map((metric) => ({
        label: metric.label,
        data: unifiedChartData.rawLabels.map((date) =>
          metric.map.get(date) ?? null
        ),
        borderColor: metric.color,
        backgroundColor: metric.color + (metric.opacity !== undefined ? Math.round(metric.opacity * 255).toString(16).padStart(2, '0') : '33'),
        borderWidth: 2,
        borderDash: metric.borderDash || [],
        fill: false,
        tension: 0.4,
        yAxisID: metric.axis === 'money' ? 'yMoney' : 'yCount',
        pointRadius: 0,
        pointHoverRadius: 4,
      }));
  }, [activeMetrics, unifiedChartData]);

  const getCombinedChartData = (data: CategoryAnalysisData['aggregated_charts']) => {
    // Проверяем, что данные корректны
    if (!data || !data.sales_graph || !data.sales_graph.dates || data.sales_graph.dates.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    return {
      labels: data.sales_graph.dates,
      datasets: [
        {
          label: '📈 Продажи',
          data: data.sales_graph.values,
          borderColor: '#3B82F6',
          backgroundColor: '#3B82F620',
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 8,
          pointBackgroundColor: '#3B82F6',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          yAxisID: 'y',
        },
        {
          label: '📦 Остатки',
          data: data.stocks_graph.values,
          borderColor: '#10B981',
          backgroundColor: '#10B98120',
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 8,
          pointBackgroundColor: '#10B981',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          yAxisID: 'y1',
        },
        {
          label: '💰 Цены',
          data: data.price_graph.values,
          borderColor: '#F59E0B',
          backgroundColor: '#F59E0B20',
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 8,
          pointBackgroundColor: '#F59E0B',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          yAxisID: 'y2',
        },
        {
          label: '🔍 Видимость',
          data: data.visibility_graph.values,
          borderColor: '#8B5CF6',
          backgroundColor: '#8B5CF620',
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 8,
          pointBackgroundColor: '#8B5CF6',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          yAxisID: 'y3',
        },
      ],
    };
  };

  const combinedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 14,
            weight: 'bold' as const
          },
          color: '#374151',
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#F9FAFB',
        bodyColor: '#F9FAFB',
        borderColor: '#6B7280',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            
            if (label.includes('Цены')) {
              return `${label}: ${value.toLocaleString('ru-RU')} ₽`;
            } else if (label.includes('Продажи') || label.includes('Остатки')) {
              return `${label}: ${value.toLocaleString('ru-RU')} шт`;
            } else if (label.includes('Видимость')) {
              return `${label}: ${value.toLocaleString('ru-RU')}`;
            }
            return `${label}: ${value.toLocaleString('ru-RU')}`;
          }
        }
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Дата',
          color: '#374151',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        },
        grid: {
          color: '#E5E7EB',
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 12
          }
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Продажи (шт)',
          color: '#3B82F6',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        },
        grid: {
          color: '#E5E7EB',
        },
        ticks: {
          color: '#3B82F6',
          font: {
            size: 12
          },
          callback: function(value: any) {
            return value.toLocaleString('ru-RU');
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Остатки (шт)',
          color: '#10B981',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#10B981',
          font: {
            size: 12
          },
          callback: function(value: any) {
            return value.toLocaleString('ru-RU');
          }
        }
      },
      y2: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Цены (₽)',
          color: '#F59E0B',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#F59E0B',
          font: {
            size: 12
          },
          callback: function(value: any) {
            return value.toLocaleString('ru-RU') + ' ₽';
          }
        }
      },
      y3: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Видимость',
          color: '#8B5CF6',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#8B5CF6',
          font: {
            size: 12
          },
          callback: function(value: any) {
            return value.toLocaleString('ru-RU');
          }
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart' as const
    }
  };

  // Фильтрация и сортировка товаров
  const filteredProducts = data ? data.all_products.filter(product => {
    const brandMatch = !brandFilter || (product.brand && product.brand.toLowerCase().includes(brandFilter.toLowerCase()));
    const countryMatch = !countryFilter || (product.country && product.country.toLowerCase().includes(countryFilter.toLowerCase()));
    const genderMatch = !genderFilter || (product.gender && product.gender.toLowerCase().includes(genderFilter.toLowerCase()));
    
    return brandMatch && countryMatch && genderMatch;
  }).sort((a, b) => {
    const aValue = a[sortField] || 0;
    const bValue = b[sortField] || 0;
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  }) : [];

  // Пагинация
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const toggleProductDetails = (productId: number) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
  };

  const sortTable = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  return (
    <div className="category-analysis-container">
      <div className="category-analysis-content">
        {/* Заголовок и форма ввода */}
        <div className="category-form-card">
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
              📊 Анализ категории
            </h1>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '1.2rem', 
              margin: '0',
              fontWeight: '500'
            }}>
              Детальная аналитика категорий Wildberries с интеллектуальными рекомендациями
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
              💡 Важные рекомендации для анализа категорий
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>👔 Для категорий одежды:</strong> Обязательно указывайте пол в начале пути:
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
                Мужчинам/Одежда/Худи
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
                Женщинам/Одежда/Платья
              </span>
              <br/>
              <span style={{ color: '#DC2626', fontSize: '0.9rem' }}>
                ⚠️ Без указания пола поиск может не работать, особенно при переходе из анализа товара
              </span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>🚫 Не используйте пробелы:</strong> В пути категории не должно быть пробелов вокруг символа <code>/</code>
              <br/>
              <span style={{ color: '#16A34A', fontWeight: 'bold' }}>✅ Правильно:</span>{' '}
              <span style={{ 
                backgroundColor: '#D1FAE5', 
                padding: '3px 6px', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.85rem'
              }}>
                Мужчинам/Одежда/Худи
              </span>
              <br/>
              <span style={{ color: '#DC2626', fontWeight: 'bold' }}>❌ Неправильно:</span>{' '}
              <span style={{ 
                backgroundColor: '#FEE2E2', 
                padding: '3px 6px', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.85rem'
              }}>
                Мужчинам / Одежда / Худи
              </span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>🎯 Соответствие категориям Wildberries:</strong> Убедитесь, что путь точно соответствует существующим категориям на сайте Wildberries.ru
            </div>
            <div style={{ 
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '12px',
              marginTop: '15px'
            }}>
              <strong>🔄 Если поиск не дает результатов:</strong>
              <br/>
              • Попробуйте изменить даты на более ранние (например, 2021 год)
              <br/>
              • Мы постоянно работаем над улучшением поиска и обновлением данных
              <br/>
              • По некоторым категориям свежие данные могут быть временно недоступны
              <br/>
              • Мы стремимся сделать сервис максимально точным и полезным для вас! 🚀
            </div>
          </div>
          
          {/* Форма ввода */}
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
                📂 Путь категории
              </label>
              <input
                type="text"
                value={categoryPath}
                onChange={(e) => setCategoryPath(e.target.value)}
                placeholder="Спорт, Красота, Дом"
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
                📅 Дата от
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
                📅 Дата до
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
                📦 FBS
              </label>
              <select
                value={fbs}
                onChange={(e) => setFbs(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px'
                }}
              >
                <option value={0}>Все товары</option>
                <option value={1}>Только FBS</option>
              </select>
            </div>
          </div>

          {/* Быстрый выбор периода */}
                            <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '10px', 
                    marginBottom: '25px',
                    justifyContent: 'center'
                  }}>
                    {[7, 14, 30, 90].map((days) => (
                      <button
                        key={days}
                        onClick={() => setQuickDateRange(days)}
                        style={{
                          padding: '10px 20px',
                          background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                          border: '1px solid #d1d5db',
                          borderRadius: '10px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
                  e.currentTarget.style.color = '#374151';
                }}
              >
                {days} дней
              </button>
            ))}
          </div>

          <button
            onClick={analyzeCategory}
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px 30px',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #ffffff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Анализируется...
              </span>
            ) : (
              '🔍 Анализировать категорию'
            )}
          </button>
        </div>

        {/* Ошибка */}
        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '15px 20px',
            borderRadius: '10px',
            marginBottom: '30px',
            border: '2px solid #fecaca'
          }}>
            <strong>❌ Ошибка:</strong> {error}
          </div>
        )}

        {/* Результаты анализа */}
        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Основная информация о категории */}
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
                textAlign: 'center',
                justifyContent: 'center'
              }}>
                📋 Общая информация о категории
              </h2>
              
              <div className="category-info-grid">
                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  textAlign: 'center',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📦</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '5px' }}>
                    {formatNumber(data.category_info.total_products)}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                    Товаров в категории
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  textAlign: 'center',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>💰</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981', marginBottom: '5px' }}>
                    {formatNumber(data.category_info.total_revenue)} ₽
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                    Общая выручка
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  textAlign: 'center',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📈</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#667eea', marginBottom: '5px' }}>
                    {formatNumber(data.category_info.total_sales)}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                    Общие продажи
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🏷️</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b', marginBottom: '5px' }}>
                    {formatNumber(data.category_info.average_price)} ₽
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                    Средняя цена
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>⭐</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#8b5cf6', marginBottom: '5px' }}>
                    {data.category_info.average_rating.toFixed(1)}/5
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                    Средний рейтинг
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎯</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444', marginBottom: '5px' }}>
                    {data.category_info.average_purchase.toFixed(1)}%
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                    Средний выкуп
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔄</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#06b6d4', marginBottom: '5px' }}>
                    {data.category_info.average_turnover_days.toFixed(1)}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                    Дней оборачиваемости
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🏢</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#64748b', marginBottom: '5px' }}>
                    {data.category_info.total_brands ?? data.category_metrics.top_brands_count}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                    Брендов в категории
                  </div>
                </div>

                {/* Новые метрики */}
                {data.category_info.total_suppliers !== undefined && (
                  <div style={{
                    background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                    borderRadius: '15px',
                    padding: '25px',
                    textAlign: 'center',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🚚</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6', marginBottom: '5px' }}>
                      {formatNumber(data.category_info.total_suppliers)}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                      Количество поставщиков
                    </div>
                  </div>
                )}

                {data.category_info.total_articles !== undefined && (
                  <div style={{
                    background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                    borderRadius: '15px',
                    padding: '25px',
                    textAlign: 'center',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📋</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#8b5cf6', marginBottom: '5px' }}>
                      {formatNumber(data.category_info.total_articles)}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                      Количество артикулов
                    </div>
                  </div>
                )}

                {data.category_info.monopoly_index !== undefined && (
                  <div style={{
                    background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                    borderRadius: '15px',
                    padding: '25px',
                    textAlign: 'center',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>⚖️</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444', marginBottom: '5px' }}>
                      {(data.category_info.monopoly_index * 100).toFixed(1)}%
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                      Монопольность
                    </div>
                  </div>
                )}

                {data.category_info.avg_daily_suppliers_with_orders !== undefined && (
                  <div style={{
                    background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                    borderRadius: '15px',
                    padding: '25px',
                    textAlign: 'center',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📊</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981', marginBottom: '5px' }}>
                      {data.category_info.avg_daily_suppliers_with_orders.toFixed(1)}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                      Среднесуточное количество поставщиков с заказами
                    </div>
                  </div>
                )}

                {data.category_info.brands_with_sales !== undefined && (
                  <div style={{
                    background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                    borderRadius: '15px',
                    padding: '25px',
                    textAlign: 'center',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>✅</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#059669', marginBottom: '5px' }}>
                      {formatNumber(data.category_info.brands_with_sales)}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                      Количество брендов с продажами
                    </div>
                  </div>
                )}

                {data.category_info.articles_with_sales !== undefined && (
                  <div style={{
                    background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                    borderRadius: '15px',
                    padding: '25px',
                    textAlign: 'center',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📦</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#16a34a', marginBottom: '5px' }}>
                      {formatNumber(data.category_info.articles_with_sales)}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                      Артикулов с продажами
                    </div>
                  </div>
                )}
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
                              return `${datasetLabel}: ${formatNumber(Number(value))} ₽`;
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
                          callback: (value: any) => formatNumber(value) + ' ₽',
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

            {/* Объединенный график */}
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h2 style={{ 
                margin: '0 0 25px 0', 
                color: '#1f2937', 
                fontSize: '1.8rem',
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                textAlign: 'center',
                justifyContent: 'center'
              }}>
                📊 Динамика категории
              </h2>
              <div style={{ height: '500px' }}>
                <Line
                  data={getCombinedChartData(data.aggregated_charts)}
                  options={combinedChartOptions}
                />
              </div>
            </div>

            {/* AI Рекомендации */}
            {data.ai_recommendations && (
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
                  textAlign: 'center',
                  justifyContent: 'center'
                }}>
                  🤖 Интеллектуальные рекомендации
                </h2>
                
                <div className="category-ai-grid">
                  {/* Ключевые инсайты */}
                  {data.ai_recommendations.insights.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)',
                      borderRadius: '15px',
                      padding: '20px',
                      border: '1px solid #bae6fd'
                    }}>
                      <h3 style={{
                        margin: '0 0 15px 0',
                        color: '#0c4a6e',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        💡 Ключевые инсайты
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                        {data.ai_recommendations.insights.map((insight, idx) => (
                          <li key={idx} style={{ marginBottom: '8px', color: '#1e40af' }}>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Возможности */}
                  {data.ai_recommendations.opportunities.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)',
                      borderRadius: '15px',
                      padding: '20px',
                      border: '1px solid #bbf7d0'
                    }}>
                      <h3 style={{
                        margin: '0 0 15px 0',
                        color: '#14532d',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        🚀 Возможности роста
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                        {data.ai_recommendations.opportunities.map((opportunity, idx) => (
                          <li key={idx} style={{ marginBottom: '8px', color: '#166534' }}>
                            {opportunity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Рекомендации */}
                  {data.ai_recommendations.recommendations.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
                      borderRadius: '15px',
                      padding: '20px',
                      border: '1px solid #fde68a'
                    }}>
                      <h3 style={{
                        margin: '0 0 15px 0',
                        color: '#92400e',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        🎯 Рекомендации
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                        {data.ai_recommendations.recommendations.map((recommendation, idx) => (
                          <li key={idx} style={{ marginBottom: '8px', color: '#d97706' }}>
                            {recommendation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Угрозы */}
                  {data.ai_recommendations.threats.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)',
                      borderRadius: '15px',
                      padding: '20px',
                      border: '1px solid #fecaca'
                    }}>
                      <h3 style={{
                        margin: '0 0 15px 0',
                        color: '#991b1b',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        ⚠️ Потенциальные угрозы
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                        {data.ai_recommendations.threats.map((threat, idx) => (
                          <li key={idx} style={{ marginBottom: '8px', color: '#dc2626' }}>
                            {threat}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Рыночные тренды */}
                  {data.ai_recommendations.market_trends.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%)',
                      borderRadius: '15px',
                      padding: '20px',
                      border: '1px solid #e9d5ff'
                    }}>
                      <h3 style={{
                        margin: '0 0 15px 0',
                        color: '#6b21a8',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        📊 Рыночные тренды
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                        {data.ai_recommendations.market_trends.map((trend, idx) => (
                          <li key={idx} style={{ marginBottom: '8px', color: '#7c3aed' }}>
                            {trend}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Конкурентные преимущества */}
                  {data.ai_recommendations.competitive_advantages.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%)',
                      borderRadius: '15px',
                      padding: '20px',
                      border: '1px solid #a7f3d0'
                    }}>
                      <h3 style={{
                        margin: '0 0 15px 0',
                        color: '#065f46',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        🏆 Конкурентные преимущества
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                        {data.ai_recommendations.competitive_advantages.map((advantage, idx) => (
                          <li key={idx} style={{ marginBottom: '8px', color: '#047857' }}>
                            {advantage}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ТОП-10 товаров */}
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
                textAlign: 'center',
                justifyContent: 'center'
              }}>
                🏆 ТОП-10 товаров по выручке
              </h2>
              
              <div className="category-top-products-grid">
                {data.top_products.map((product, index) => (
                  <div key={product.id} style={{
                    background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                    borderRadius: '15px',
                    padding: '20px',
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    overflow: 'hidden'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginBottom: '15px' 
                    }}>
                      <span style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '5px 12px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '700'
                      }}>
                        #{index + 1}
                      </span>
                      <span style={{ 
                        background: '#fef3c7',
                        color: '#d97706',
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        ⭐ {product.rating}
                      </span>
                    </div>
                    
                    {product.thumb_middle && (
                      <img
                        src={product.thumb_middle}
                        alt={product.name}
                        style={{
                          width: '100%',
                          height: '150px',
                          objectFit: 'cover',
                          borderRadius: '10px',
                          marginBottom: '15px'
                        }}
                      />
                    )}
                    
                    <h3 style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: '#1f2937', 
                      marginBottom: '10px',
                      lineHeight: '1.3',
                      minHeight: '40px',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {product.name}
                    </h3>
                    
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', wordBreak: 'break-word' }}>
                      🏢 {product.brand || 'Неизвестно'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#10b981', fontWeight: '600', marginBottom: '8px' }}>
                      💰 {formatNumber(product.final_price)} ₽
                    </div>
                    <div style={{ fontSize: '13px', color: '#667eea', marginBottom: '8px' }}>
                      📦 {formatNumber(product.sales)} шт.
                    </div>
                    <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: '600', marginBottom: '15px' }}>
                      💸 {formatNumber(product.revenue)} ₽
                    </div>
                    
                    {product.url && (
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                      >
                        🔗 Открыть WB
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Таблица всех товаров */}
            <div className="category-table-container">
              <h2 style={{ 
                fontSize: '1.8rem', 
                color: '#1f2937', 
                marginBottom: '25px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                textAlign: 'center',
                justifyContent: 'center'
              }}>
                📋 Полная таблица товаров
              </h2>
              
              {/* Фильтры */}
              <div className="category-filters-grid">
                <input
                  type="text"
                  placeholder="🔍 Поиск по бренду..."
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '14px'
                  }}
                />
                <input
                  type="text"
                  placeholder="🌍 Поиск по стране..."
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '14px'
                  }}
                />
                <input
                  type="text"
                  placeholder="👥 Поиск по полу..."
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Таблица */}
              <div style={{ 
                overflowX: 'auto',
                border: '2px solid #e5e7eb',
                borderRadius: '15px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)' }}>
                    <tr>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Фото</th>
                      <th 
                        style={{ 
                          padding: '15px', 
                          textAlign: 'left', 
                          fontWeight: '600', 
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                        onClick={() => sortTable('name')}
                      >
                        Название {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        style={{ 
                          padding: '15px', 
                          textAlign: 'left', 
                          fontWeight: '600', 
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                        onClick={() => sortTable('brand')}
                      >
                        Бренд {sortField === 'brand' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        style={{ 
                          padding: '15px', 
                          textAlign: 'left', 
                          fontWeight: '600', 
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                        onClick={() => sortTable('final_price')}
                      >
                        Цена {sortField === 'final_price' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        style={{ 
                          padding: '15px', 
                          textAlign: 'left', 
                          fontWeight: '600', 
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                        onClick={() => sortTable('sales')}
                      >
                        Продажи {sortField === 'sales' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        style={{ 
                          padding: '15px', 
                          textAlign: 'left', 
                          fontWeight: '600', 
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                        onClick={() => sortTable('revenue')}
                      >
                        Выручка {sortField === 'revenue' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        style={{ 
                          padding: '15px', 
                          textAlign: 'left', 
                          fontWeight: '600', 
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                        onClick={() => sortTable('rating')}
                      >
                        Рейтинг {sortField === 'rating' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Детали</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((product, idx) => (
                      <React.Fragment key={product.id}>
                        <tr style={{ 
                          background: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f9fafb'}>
                          <td style={{ padding: '15px', borderBottom: '1px solid #e5e7eb' }}>
                            {product.thumb_middle && (
                              <img
                                src={product.thumb_middle}
                                alt={product.name}
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  objectFit: 'cover',
                                  borderRadius: '10px'
                                }}
                              />
                            )}
                          </td>
                          <td style={{ padding: '15px', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ maxWidth: '200px' }}>
                              <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '5px' }}>
                                {product.name.length > 50 ? product.name.substring(0, 50) + '...' : product.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                {product.seller}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '15px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>
                            {product.brand || '-'}
                          </td>
                          <td style={{ padding: '15px', borderBottom: '1px solid #e5e7eb', fontWeight: '600', color: '#10b981' }}>
                            {formatNumber(product.final_price)} ₽
                          </td>
                          <td style={{ padding: '15px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>
                            {formatNumber(product.sales)}
                          </td>
                          <td style={{ padding: '15px', borderBottom: '1px solid #e5e7eb', fontWeight: '600', color: '#667eea' }}>
                            {formatNumber(product.revenue)} ₽
                          </td>
                          <td style={{ padding: '15px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>
                            ⭐ {product.rating}
                          </td>
                          <td style={{ padding: '15px', borderBottom: '1px solid #e5e7eb' }}>
                            <button
                              onClick={() => toggleProductDetails(product.id)}
                              style={{
                                background: expandedProduct === product.id ? '#ef4444' : '#667eea',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              {expandedProduct === product.id ? '🔼 Скрыть' : '🔽 Показать'}
                            </button>
                          </td>
                        </tr>
                        
                        {/* Расширенная информация */}
                        {expandedProduct === product.id && (
                          <tr>
                            <td colSpan={8} style={{ 
                              padding: '25px', 
                              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)',
                              borderBottom: '1px solid #e5e7eb'
                            }}>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                gap: '20px'
                              }}>
                                <div style={{
                                  background: 'white',
                                  borderRadius: '15px',
                                  padding: '20px',
                                  border: '1px solid #e5e7eb'
                                }}>
                                  <h4 style={{ 
                                    margin: '0 0 15px 0', 
                                    color: '#1f2937', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px' 
                                  }}>
                                    💰 Цены
                                  </h4>
                                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                                    <div><strong>Стартовая:</strong> {product.start_price ? formatNumber(product.start_price) + ' ₽' : '-'}</div>
                                    <div><strong>Максимальная:</strong> {product.final_price_max ? formatNumber(product.final_price_max) + ' ₽' : '-'}</div>
                                    <div><strong>Минимальная:</strong> {product.final_price_min ? formatNumber(product.final_price_min) + ' ₽' : '-'}</div>
                                  </div>
                                </div>
                                
                                <div style={{
                                  background: 'white',
                                  borderRadius: '15px',
                                  padding: '20px',
                                  border: '1px solid #e5e7eb'
                                }}>
                                  <h4 style={{ 
                                    margin: '0 0 15px 0', 
                                    color: '#1f2937', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px' 
                                  }}>
                                    🎯 Скидки
                                  </h4>
                                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                                    <div><strong>Базовая:</strong> {product.basic_sale ? product.basic_sale + '%' : '-'}</div>
                                    <div><strong>Промо:</strong> {product.promo_sale ? product.promo_sale + '%' : '-'}</div>
                                    <div><strong>СПП:</strong> {product.client_sale ? product.client_sale + '%' : '-'}</div>
                                  </div>
                                </div>
                                
                                <div style={{
                                  background: 'white',
                                  borderRadius: '15px',
                                  padding: '20px',
                                  border: '1px solid #e5e7eb'
                                }}>
                                  <h4 style={{ 
                                    margin: '0 0 15px 0', 
                                    color: '#1f2937', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px' 
                                  }}>
                                    📊 Информация
                                  </h4>
                                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                                    <div><strong>Страна:</strong> {product.country || '-'}</div>
                                    <div><strong>Пол:</strong> {product.gender || '-'}</div>
                                    <div><strong>Фото:</strong> {product.picscount || 0}</div>
                                    <div><strong>Видео:</strong> {product.hasvideo ? 'Да' : 'Нет'}</div>
                                    <div><strong>3D:</strong> {product.has3d ? 'Да' : 'Нет'}</div>
                                  </div>
                                </div>
                              </div>
                              
                              {product.url && (
                                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                  <a
                                    href={product.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'inline-block',
                                      padding: '12px 24px',
                                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                      color: 'white',
                                      textDecoration: 'none',
                                      borderRadius: '10px',
                                      fontWeight: '600',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    🔗 Открыть на Wildberries
                                  </a>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Пагинация */}
              {totalPages > 1 && (
                <div className="category-pagination" style={{ position: 'relative', zIndex: 10 }}>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '10px 20px',
                      background: currentPage === 1 ? '#f3f4f6' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: currentPage === 1 ? '#9ca3af' : 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontWeight: '600',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ← Предыдущая
                  </button>
                  
                  <span style={{
                    padding: '10px 20px',
                    background: '#f0f9ff',
                    color: '#1e40af',
                    borderRadius: '10px',
                    fontWeight: '600',
                    border: '2px solid #dbeafe'
                  }}>
                    {currentPage} из {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '10px 20px',
                      background: currentPage === totalPages ? '#f3f4f6' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: currentPage === totalPages ? '#9ca3af' : 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontWeight: '600',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Следующая →
                  </button>
                </div>
              )}
            </div>

            {/* Дополнительные метрики */}
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
                textAlign: 'center',
                justifyContent: 'center'
              }}>
                📊 Дополнительные метрики
              </h2>
              
              <div className="category-additional-metrics-grid">
                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#10b981', marginBottom: '5px' }}>
                    {formatNumber(data.category_metrics.revenue_per_product)} ₽
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Выручка на товар
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#667eea', marginBottom: '5px' }}>
                    {data.category_metrics.sales_per_product.toFixed(1)} шт.
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Продаж на товар
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#8b5cf6', marginBottom: '5px' }}>
                    {data.category_metrics.products_with_sales_percentage.toFixed(1)}%
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Товаров с продажами
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f59e0b', marginBottom: '5px' }}>
                    {data.category_metrics.fbs_percentage.toFixed(1)}%
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    FBS товаров
                  </div>
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                borderRadius: '15px',
                padding: '20px',
                textAlign: 'center',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '20px',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  <div><strong>📊 Диапазон цен:</strong> {formatNumber(data.category_metrics.price_range_min)} ₽ - {formatNumber(data.category_metrics.price_range_max)} ₽</div>
                  <div><strong>💬 Среднее отзывов:</strong> {data.category_metrics.average_comments.toFixed(1)}</div>
                  <div><strong>🏢 Количество брендов:</strong> {data.category_metrics.top_brands_count}</div>
                </div>
                <div style={{ 
                  marginTop: '15px', 
                  fontSize: '12px', 
                  color: '#6b7280',
                  borderTop: '1px solid #e5e7eb',
                  paddingTop: '15px'
                }}>
                  🔧 <strong>Источник данных:</strong> {data.metadata.processing_info.data_source} | 
                  ⏰ <strong>Обработано:</strong> {new Date(data.metadata.processing_info.processing_timestamp).toLocaleString('ru-RU')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .category-charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 30px;
          margin-top: 30px;
          align-items: start;
        }
        
        .category-filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .category-charts-grid > div {
          max-width: 100%;
          overflow: hidden;
        }
        
        .category-charts-grid canvas {
          max-height: 300px !important;
          width: 100% !important;
        }
      `}</style>
    </div>
  );
};

export default CategoryAnalysis; 