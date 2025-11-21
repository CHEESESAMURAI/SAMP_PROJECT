# 🚀 Быстрая справка: Добавление Yandex.Metrika

## ✅ Что сделано

### 1. Создан helper файл
📁 **Файл:** `wild-analytics-web/src/utils/yandexMetrika.ts`
✅ **Статус:** Готов к использованию

### 2. Обновлен Login.tsx  
📁 **Файл:** `wild-analytics-web/src/pages/Login.tsx`
🆔 **ID:** `104757300`
✅ **Статус:** Полностью настроен

---

## 📋 Быстрая инструкция для остальных файлов

### Шаг 1: Добавить импорты (в начало файла)
```typescript
import { useEffect } from 'react';
import { addYandexMetrika } from '../utils/yandexMetrika';
```

### Шаг 2: Добавить useEffect (в начало компонента)
```typescript
useEffect(() => {
  addYandexMetrika('YOUR_COUNTER_ID');
}, []);
```

---

## 🎯 Таблица счетчиков

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

---

## 📝 Пример изменений в Login.tsx

### ✨ Что добавлено:

**1. В импортах (строки 1-5):**
```typescript
import React, { useState, useEffect } from 'react';  // ← добавили useEffect
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { addYandexMetrika } from '../utils/yandexMetrika';  // ← новый импорт
import './Auth.css';
```

**2. В компоненте (строки 14-17):**
```typescript
// Добавляем Yandex.Metrika счетчик для страницы авторизации
useEffect(() => {
  addYandexMetrika('104757300');
}, []);
```

---

## 🔥 Копируй-вставляй для каждого файла

### Dashboard.tsx
```typescript
// В импортах:
import { useEffect } from 'react';
import { addYandexMetrika } from '../utils/yandexMetrika';

// В компоненте:
useEffect(() => {
  addYandexMetrika('104757369');
}, []);
```

### ProductAnalysis.tsx
```typescript
useEffect(() => {
  addYandexMetrika('104757559');
}, []);
```

### BrandAnalysis.tsx
```typescript
useEffect(() => {
  addYandexMetrika('104757643');
}, []);
```

### SupplierAnalysis.tsx
```typescript
useEffect(() => {
  addYandexMetrika('104757755');
}, []);
```

### CategoryAnalysis.tsx
```typescript
useEffect(() => {
  addYandexMetrika('104757914');
}, []);
```

### SeasonalityAnalysis.tsx
```typescript
useEffect(() => {
  addYandexMetrika('104757938');
}, []);
```

### AIHelper.tsx
```typescript
useEffect(() => {
  addYandexMetrika('104757957');
}, []);
```

### OracleQueries.tsx
```typescript
useEffect(() => {
  addYandexMetrika('104758421');
}, []);
```

### SupplyPlanning.tsx
```typescript
useEffect(() => {
  addYandexMetrika('104758492');
}, []);
```

### BloggerSearch.tsx
```typescript
useEffect(() => {
  addYandexMetrika('104758560');
}, []);
```

### AdMonitoring.tsx
```typescript
useEffect(() => {
  addYandexMetrika('104758642');
}, []);
```

### GlobalSearch.tsx
```typescript
useEffect(() => {
  addYandexMetrika('104758714');
}, []);
```

### Profile.tsx
```typescript
useEffect(() => {
  addYandexMetrika('104758735');
}, []);
```

---

## ✅ Проверка

**В консоли браузера:**
```javascript
window.ym  // должна быть функция
```

**В Network (F12):**
Ищите запросы к `mc.yandex.ru/metrika/tag.js`

---

## 📁 Все созданные файлы

1. ✅ `wild-analytics-web/src/utils/yandexMetrika.ts` - Helper функции

