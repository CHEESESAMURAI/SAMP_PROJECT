#!/bin/bash

# Скрипт просмотра логов Wild Analytics Dashboard через PM2

echo "📋 Логи Wild Analytics Dashboard через PM2"
echo "=========================================="

# Показываем статус процессов
echo "📊 Статус процессов:"
pm2 status

echo ""
echo "🔧 Логи backend сервера:"
echo "========================"
pm2 logs wild-backend --lines 20

echo ""
echo "🌐 Логи frontend сервера:"
echo "========================"
pm2 logs wild-frontend --lines 20

echo ""
echo "💡 Полезные команды:"
echo "  pm2 logs wild-backend --lines 50    - Больше логов backend"
echo "  pm2 logs wild-frontend --lines 50   - Больше логов frontend"
echo "  pm2 logs --lines 100                - Все логи"
echo "  pm2 monit                           - Мониторинг в реальном времени"
echo "  pm2 restart wild-backend            - Перезапуск backend"
echo "  pm2 restart wild-frontend           - Перезапуск frontend"





