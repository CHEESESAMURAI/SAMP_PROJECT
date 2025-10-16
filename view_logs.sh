#!/bin/bash

# Скрипт просмотра логов Wild Analytics Dashboard

echo "📋 Логи Wild Analytics Dashboard"
echo "================================"

# Показываем процессы
echo "🔍 Активные процессы:"
ps aux | grep -E "(python main.py|npm start|node.*react-scripts)" | grep -v grep

echo ""
echo "🌐 Порт 3000 (Frontend):"
lsof -i :3000 2>/dev/null || echo "Порт 3000 свободен"

echo ""
echo "🔧 Порт 8000 (Backend):"
lsof -i :8000 2>/dev/null || echo "Порт 8000 свободен"

echo ""
echo "📊 Использование ресурсов:"
echo "CPU: $(top -l 1 | grep "CPU usage" | awk '{print $3}')"
echo "Memory: $(top -l 1 | grep "PhysMem" | awk '{print $2}')"

echo ""
echo "💡 Для просмотра логов в реальном времени используйте:"
echo "tail -f /var/log/syslog | grep -E '(python|node)'"





