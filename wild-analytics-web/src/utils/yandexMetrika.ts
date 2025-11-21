/**
 * Yandex.Metrika utility functions
 * Управление счетчиками Яндекс.Метрики
 */

declare global {
    interface Window {
      ym?: (counterId: number, method: string, ...args: any[]) => void;
    }
  }
  
  /**
   * Добавляет счетчик Яндекс.Метрики на страницу
   * @param counterId - ID счетчика Яндекс.Метрики
   */
  export const addYandexMetrika = (counterId: string): void => {
    console.log(`🔍 Initializing Yandex.Metrika counter: ${counterId}`);
    
    // Проверяем, что мы на клиенте
    if (typeof window === 'undefined') {
      console.log('❌ Not in browser environment');
      return;
    }
  
    // Проверяем, не добавлен ли уже скрипт
    const existingScript = document.querySelector(`script[src*="mc.yandex.ru/metrika/tag.js"]`);
    if (existingScript) {
      console.log(`✅ Yandex.Metrika script already exists, initializing counter ${counterId}`);
      // Если скрипт уже есть, просто инициализируем счетчик
      setTimeout(() => {
        if (window.ym) {
          window.ym(Number(counterId), 'init', {
            ssr: true,
            webvisor: true,
            clickmap: true,
            ecommerce: "dataLayer",
            accurateTrackBounce: true,
            trackLinks: true
          });
          console.log(`✅ Yandex.Metrika counter ${counterId} initialized`);
        } else {
          console.log('❌ window.ym not available');
        }
      }, 100);
      return;
    }
  
    // Создаем скрипт с внешним источником
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://mc.yandex.ru/metrika/tag.js?id=${counterId}`;
    
    // Добавляем обработчик загрузки
    script.onload = () => {
      console.log(`✅ Yandex.Metrika script loaded for counter ${counterId}`);
      setTimeout(() => {
        if (window.ym) {
          window.ym(Number(counterId), 'init', {
            ssr: true,
            webvisor: true,
            clickmap: true,
            ecommerce: "dataLayer",
            accurateTrackBounce: true,
            trackLinks: true
          });
          console.log(`✅ Yandex.Metrika counter ${counterId} initialized`);
        } else {
          console.log('❌ window.ym not available after script load');
        }
      }, 100);
    };
    
    script.onerror = () => {
      console.warn(`⚠️ Yandex.Metrika script blocked or failed to load for counter ${counterId}`);
      console.log('💡 This is normal if you have ad blockers or privacy extensions enabled');
      console.log('📊 Analytics will work in production environment without blockers');
      
      // Добавляем fallback - создаем заглушку для разработки
      createMetrikaFallback(counterId);
    };
  
    // Добавляем скрипт в head
    document.head.appendChild(script);
    console.log(`📝 Yandex.Metrika script added to head for counter ${counterId}`);
  
    // Создаем noscript тег только если скрипт не заблокирован
    setTimeout(() => {
      if (!window.ym) {
        console.log('📝 Adding noscript fallback for counter', counterId);
        const noscript = document.createElement('noscript');
        const div = document.createElement('div');
        const img = document.createElement('img');
        img.src = `https://mc.yandex.ru/watch/${counterId}`;
        img.style.position = 'absolute';
        img.style.left = '-9999px';
        img.alt = '';
        div.appendChild(img);
        noscript.appendChild(div);
      
        // Добавляем noscript в body
        if (document.body) {
          document.body.appendChild(noscript);
          console.log(`📝 Noscript tag added for counter ${counterId}`);
        }
      }
    }, 1000);
  };

  /**
   * Создает заглушку для Яндекс.Метрики в случае блокировки
   * @param counterId - ID счетчика
   */
  const createMetrikaFallback = (counterId: string): void => {
    console.log(`🔄 Creating Metrika fallback for counter ${counterId}`);
    
    // Создаем заглушку window.ym для разработки
    if (!window.ym) {
      window.ym = (id: number, method: string, ...args: any[]) => {
        console.log(`📊 [DEV] Yandex.Metrika fallback: ${method} for counter ${id}`, args);
        // В реальном приложении здесь можно добавить отправку в альтернативную аналитику
      };
      console.log('✅ Metrika fallback created for development');
    }
  };
  
  /**
   * Отправляет событие в Яндекс.Метрику
   * @param counterId - ID счетчика
   * @param eventName - Название события
   * @param params - Параметры события
   */
  export const trackYandexEvent = (
    counterId: string,
    eventName: string,
    params?: Record<string, any>
  ): void => {
    if (typeof window !== 'undefined' && window.ym) {
      window.ym(Number(counterId), 'reachGoal', eventName, params);
    }
  };
  
  /**
   * Отправляет просмотр страницы в Яндекс.Метрику
   * @param counterId - ID счетчика
   * @param url - URL страницы
   */
  export const trackYandexPageView = (counterId: string, url: string): void => {
    if (typeof window !== 'undefined' && window.ym) {
      window.ym(Number(counterId), 'hit', url);
    }
  };
  
  /** Описанние как работает
      Helper функция (yandexMetrika.ts) создает и добавляет скрипт Яндекс.Метрики в <head> документа
  
      useEffect хук вызывается один раз при монтировании компонента
  
      Счетчик автоматически начинает собирать статистику посещений
  
      Каждая страница имеет свой уникальный ID для детальной аналитики
  
  | Файл | ID счетчика | Комментарий |
  |------|-------------|-------------|
  | `Login.tsx` | `104757300` | Авторизация |
  | `Dashboard.tsx` | `104757369` | Главная |
  | `ProductAnalysis.tsx` | `104757559` | Анализ товаров |
  | `BrandAnalysis.tsx` | `104757643` | Анализ брендов |
  | `SupplierAnalysis.tsx` | `104757755` | Анализ продавцов |
  | `CategoryAnalysis.tsx` | `104757914` | Анализ категорий |
  | `SeasonalityAnalysis.tsx` | `104757938` | Анализ сезонности |
  | `AIHelper.tsx` | `104757957` | ИИ помощник |
  | `OracleQueries.tsx` | `104758421` | Оракул запросов |
  | `SupplyPlanning.tsx` | `104758492` | План поставок |
  | `BloggerSearch.tsx` | `104758560` | Поиск блогеров |
  | `AdMonitoring.tsx` | `104758642` | Мониторинг рекламы |
  | `GlobalSearch.tsx` | `104758714` | Глобальный поиск |
  | `Profile.tsx` / `Settings.tsx` | `104758735` | Профиль |
  */