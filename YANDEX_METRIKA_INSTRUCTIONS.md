# 📊 Инструкция по добавлению Yandex.Metrika в остальные файлы

## ✅ Что уже сделано

### 1. Создан helper файл
**Файл:** `wild-analytics-web/src/utils/yandexMetrika.ts`

Этот файл содержит три функции:
- `addYandexMetrika(counterId)` - добавляет счетчик Яндекс.Метрики
- `trackYandexEvent(counterId, eventName, params)` - отправляет события
- `trackYandexPageView(counterId, url)` - отправляет просмотры страниц

### 2. Обновлен Login.tsx
**Файл:** `wild-analytics-web/src/pages/Login.tsx`
**ID счетчика:** `104757300`

#### Что добавлено:

**1. Импорты (строки 1-5):**
```typescript
import React, { useState, useEffect } from 'react';  // добавили useEffect
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { addYandexMetrika } from '../utils/yandexMetrika';  // новый импорт
import './Auth.css';
```

**2. useEffect хук (строки 14-17):**
```typescript
// Добавляем Yandex.Metrika счетчик для страницы авторизации
useEffect(() => {
  addYandexMetrika('104757300');
}, []);
```

---

## 📋 Инструкции для остальных файлов

Для каждого файла нужно выполнить **2 простых шага**:

### Шаг 1: Добавить импорты
Добавьте в начало файла (где остальные импорты):
```typescript
import { useEffect } from 'react';  // если useEffect еще не импортирован
import { addYandexMetrika } from '../utils/yandexMetrika';
```

### Шаг 2: Добавить useEffect хук
Добавьте внутри компонента (сразу после объявления переменных состояния):
```typescript
// Добавляем Yandex.Metrika счетчик
useEffect(() => {
  addYandexMetrika('COUNTER_ID');  // замените на нужный ID
}, []);
```

---

## 🎯 Конкретные изменения для каждого файла

### 1. ✅ Login.tsx (УЖЕ ГОТОВ)
- **Файл:** `wild-analytics-web/src/pages/Login.tsx`
- **ID:** `104757300`
- **Статус:** ✅ Изменения внесены

---

### 2. Dashboard.tsx
**Файл:** `wild-analytics-web/src/pages/Dashboard.tsx`
**ID счетчика:** `104757369`

#### Найдите в начале файла:
```typescript
import React from 'react';
```

#### Замените на:
```typescript
import React, { useEffect } from 'react';
import { addYandexMetrika } from '../utils/yandexMetrika';
```

#### Найдите начало компонента:
```typescript
const Dashboard: React.FC = () => {
  // здесь могут быть useState и другие хуки
```

#### Добавьте после всех useState:
```typescript
  // Добавляем Yandex.Metrika счетчик для главной страницы
  useEffect(() => {
    addYandexMetrika('104757369');
  }, []);
```

---

### 3. ProductAnalysis.tsx
**Файл:** `wild-analytics-web/src/pages/ProductAnalysis.tsx`
**ID счетчика:** `104757559`

#### В импортах добавьте:
```typescript
import { useEffect } from 'react';
import { addYandexMetrika } from '../utils/yandexMetrika';
```

#### В начале компонента добавьте:
```typescript
  // Добавляем Yandex.Metrika счетчик для анализа товаров
  useEffect(() => {
    addYandexMetrika('104757559');
  }, []);
```

---

### 4. BrandAnalysis.tsx
**Файл:** `wild-analytics-web/src/pages/BrandAnalysis.tsx`
**ID счетчика:** `104757643`

#### В импортах добавьте:
```typescript
import { useEffect } from 'react';
import { addYandexMetrika } from '../utils/yandexMetrika';
```

#### В начале компонента добавьте:
```typescript
  // Добавляем Yandex.Metrika счетчик для анализа брендов
  useEffect(() => {
    addYandexMetrika('104757643');
  }, []);
```

---

### 5. SupplierAnalysis.tsx (Анализ продавца)
**Файл:** `wild-analytics-web/src/pages/SupplierAnalysis.tsx`
**ID счетчика:** `104757755`

#### В импортах добавьте:
```typescript
import { useEffect } from 'react';
import { addYandexMetrika } from '../utils/yandexMetrika';
```

#### В начале компонента добавьте:
```typescript
  // Добавляем Yandex.Metrika счетчик для анализа продавцов
  useEffect(() => {
    addYandexMetrika('104757755');
  }, []);
```

---

### 6. CategoryAnalysis.tsx (Анализ категорий)
**Файл:** `wild-analytics-web/src/pages/CategoryAnalysis.tsx`
**ID счетчика:** `104757914`

#### В импортах добавьте:
```typescript
import { useEffect } from 'react';
import { addYandexMetrika } from '../utils/yandexMetrika';
```

#### В начале компонента добавьте:
```typescript
  // Добавляем Yandex.Metrika счетчик для анализа категорий
  useEffect(() => {
    addYandexMetrika('104757914');
  }, []);
```

---

### 7. SeasonalityAnalysis.tsx (Анализ сезонности)
**Файл:** `wild-analytics-web/src/pages/SeasonalityAnalysis.tsx`
**ID счетчика:** `104757938`

#### В импортах добавьте:
```typescript
import { useEffect } from 'react';
import { addYandexMetrika } from '../utils/yandexMetrika';
```

#### В начале компонента добавьте:
```typescript
  // Добавляем Yandex.Metrika счетчик для анализа сезонности
  useEffect(() => {
    addYandexMetrika('104757938');
  }, []);
```

---

### 8. AIHelper.tsx (ИИ помощник)
**Файл:** `wild-analytics-web/src/pages/AIHelper.tsx`
**ID счетчика:** `104757957`

#### В импортах добавьте:
```typescript
import { useEffect } from 'react';
import { addYandexMetrika } from '../utils/yandexMetrika';
```

#### В начале компонента добавьте:
```typescript
  // Добавляем Yandex.Metrika счетчик для ИИ помощника
  useEffect(() => {
    addYandexMetrika('104757957');
  }, []);
```

---

### 9. OracleQueries.tsx (Оракул запросов)
**Файл:** `wild-analytics-web/src/pages/OracleQueries.tsx`
**ID счетчика:** `104758421`

#### В импортах добавьте:
```typescript
import { useEffect } from 'react';
import { addYandexMetrika } from '../utils/yandexMetrika';
```

#### В начале компонента добавьте:
```typescript
  // Добавляем Yandex.Metrika счетчик для оракула запросов
  useEffect(() => {
    addYandexMetrika('104758421');
  }, []);
```

---

### 10. SupplyPlanning.tsx (План поставок)
**Файл:** `wild-analytics-web/src/pages/SupplyPlanning.tsx`
**ID счетчика:** `104758492`

#### В импортах добавьте:
```typescript
import { useEffect } from 'react';
import { addYandexMetrika } from '../utils/yandexMetrika';
```

#### В начале компонента добавьте:
```typescript
  // Добавляем Yandex.Metrika счетчик для планирования поставок
  useEffect(() => {
    addYandexMetrika('104758492');
  }, []);
```

---

### 11. BloggerSearch.tsx (Поиск блогеров)
**Файл:** `wild-analytics-web/src/pages/BloggerSearch.tsx`
**ID счетчика:** `104758560`

#### В импортах добавьте:
```typescript
import { useEffect } from 'react';
import { addYandexMetrika } from '../utils/yandexMetrika';
```

#### В начале компонента добавьте:
```typescript
  // Добавляем Yandex.Metrika счетчик для поиска блогеров
  useEffect(() => {
    addYandexMetrika('104758560');
  }, []);
```

---

### 12. AdMonitoring.tsx (Мониторинг рекламы)
**Файл:** `wild-analytics-web/src/pages/AdMonitoring.tsx`
**ID счетчика:** `104758642`

#### В импортах добавьте:
```typescript
import { useEffect } from 'react';
import { addYandexMetrika } from '../utils/yandexMetrika';
```

#### В начале компонента добавьте:
```typescript
  // Добавляем Yandex.Metrika счетчик для мониторинга рекламы
  useEffect(() => {
    addYandexMetrika('104758642');
  }, []);
```

---

### 13. GlobalSearch.tsx (Глобальный поиск)
**Файл:** `wild-analytics-web/src/pages/GlobalSearch.tsx`
**ID счетчика:** `104758714`

#### В импортах добавьте:
```typescript
import { useEffect } from 'react';
import { addYandexMetrika } from '../utils/yandexMetrika';
```

#### В начале компонента добавьте:
```typescript
  // Добавляем Yandex.Metrika счетчик для глобального поиска
  useEffect(() => {
    addYandexMetrika('104758714');
  }, []);
```

---

### 14. Profile.tsx или Settings.tsx (Профиль)
**Файл:** `wild-analytics-web/src/pages/Profile.tsx` или `Settings.tsx`
**ID счетчика:** `104758735`

#### В импортах добавьте:
```typescript
import { useEffect } from 'react';
import { addYandexMetrika } from '../utils/yandexMetrika';
```

#### В начале компонента добавьте:
```typescript
  // Добавляем Yandex.Metrika счетчик для профиля
  useEffect(() => {
    addYandexMetrika('104758735');
  }, []);
```

---

## 📊 Полная таблица счетчиков

| № | Страница | Файл | ID счетчика | Статус |
|---|----------|------|-------------|--------|
| 1 | Авторизация | `Login.tsx` | `104757300` | ✅ Готово |
| 2 | Dashboard | `Dashboard.tsx` | `104757369` | ⏳ Нужно добавить |
| 3 | Анализ товара | `ProductAnalysis.tsx` | `104757559` | ⏳ Нужно добавить |
| 4 | Анализ бренда | `BrandAnalysis.tsx` | `104757643` | ⏳ Нужно добавить |
| 5 | Анализ продавца | `SupplierAnalysis.tsx` | `104757755` | ⏳ Нужно добавить |
| 6 | Анализ категорий | `CategoryAnalysis.tsx` | `104757914` | ⏳ Нужно добавить |
| 7 | Анализ сезонности | `SeasonalityAnalysis.tsx` | `104757938` | ⏳ Нужно добавить |
| 8 | ИИ помощник | `AIHelper.tsx` | `104757957` | ⏳ Нужно добавить |
| 9 | Оракул запросов | `OracleQueries.tsx` | `104758421` | ⏳ Нужно добавить |
| 10 | План поставок | `SupplyPlanning.tsx` | `104758492` | ⏳ Нужно добавить |
| 11 | Поиск блогеров | `BloggerSearch.tsx` | `104758560` | ⏳ Нужно добавить |
| 12 | Мониторинг рекламы | `AdMonitoring.tsx` | `104758642` | ⏳ Нужно добавить |
| 13 | Глобальный поиск | `GlobalSearch.tsx` | `104758714` | ⏳ Нужно добавить |
| 14 | Профиль | `Profile.tsx/Settings.tsx` | `104758735` | ⏳ Нужно добавить |

---

## 🎯 Пример полного кода

### Было:
```typescript
import React, { useState } from 'react';

const MyPage: React.FC = () => {
  const [data, setData] = useState(null);
  
  return (
    <div>Content</div>
  );
};

export default MyPage;
```

### Стало:
```typescript
import React, { useState, useEffect } from 'react';
import { addYandexMetrika } from '../utils/yandexMetrika';

const MyPage: React.FC = () => {
  const [data, setData] = useState(null);
  
  // Добавляем Yandex.Metrika счетчик
  useEffect(() => {
    addYandexMetrika('104757XXX');  // ваш ID
  }, []);
  
  return (
    <div>Content</div>
  );
};

export default MyPage;
```

---

## ✨ Дополнительные возможности

### Отслеживание событий
Если хотите отследить конкретные действия пользователя:

```typescript
import { trackYandexEvent } from '../utils/yandexMetrika';

// Например, при клике на кнопку анализа
const handleAnalysis = () => {
  trackYandexEvent('104757559', 'product_analysis_started', {
    article: productArticle
  });
  
  // ваш код анализа
};
```

### Отслеживание просмотров страниц
```typescript
import { trackYandexPageView } from '../utils/yandexMetrika';

useEffect(() => {
  trackYandexPageView('104757369', window.location.pathname);
}, []);
```

---

## 🔍 Проверка работы

### В браузере
1. Откройте Developer Tools (F12)
2. Перейдите на вкладку **Network**
3. Обновите страницу
4. Найдите запросы к `mc.yandex.ru/metrika/tag.js`
5. Если запрос есть - счетчик работает! ✅

### В консоли
Откройте консоль и введите:
```javascript
window.ym
```
Если видите функцию - Метрика загружена! ✅

---

## 📝 Примечания

1. **useEffect уже есть?** - Просто добавьте импорт `addYandexMetrika` и новый `useEffect` хук
2. **Порядок useEffect** - Не важен, можно добавить в любое место после объявления переменных
3. **Ошибки линтера** - Не должно быть, все типы корректны
4. **SSR** - Код работает и с Server-Side Rendering (параметр `ssr: true`)

---

## ❓ Частые вопросы

**Q: Нужно ли добавлять счетчик в каждый файл?**
A: Да, для каждой страницы свой уникальный счетчик для детальной аналитики.

**Q: Что если useEffect уже используется?**
A: Добавьте еще один useEffect - их может быть несколько в одном компоненте.

**Q: Можно ли использовать один счетчик на все страницы?**
A: Можно, но тогда вы не получите детальную аналитику по каждой странице отдельно.

**Q: Счетчик добавляется каждый раз при рендере?**
A: Нет, функция `addYandexMetrika` проверяет, не добавлен ли уже скрипт.

---

## 🚀 Готово!

После добавления счетчиков во все файлы:
1. Перезапустите сервер разработки (`npm start`)
2. Откройте каждую страницу в браузере
3. Проверьте в Network, что счетчики загружаются
4. Зайдите в Яндекс.Метрику и увидите данные! 📊

**Удачи с аналитикой! 🎉**















