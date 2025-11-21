#!/usr/bin/env python3
"""
Скрипт для исправления порядка импортов - перемещает const API_BASE после всех импортов
"""

import re
from pathlib import Path

SAMP_UI_PATH = Path("/Users/user/Desktop/samp-ui/src")

def fix_imports_order(file_path: Path):
    """Исправляет порядок импортов в файле"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Ищем const API_BASE
    api_base_pattern = r"const\s+API_BASE\s*=\s*process\.env\.REACT_APP_API_URL\s*\|\|\s*['\"]https://crm\.samp\.business/api['\"];"
    api_base_match = re.search(api_base_pattern, content)
    
    if not api_base_match:
        return False
    
    api_base_line = api_base_match.group(0)
    
    # Удаляем API_BASE из текущей позиции
    content = re.sub(api_base_pattern + r'\s*\n?', '', content)
    
    # Находим конец всех импортов
    # Импорты могут быть многострочными (например, import { ... } from '...')
    lines = content.split('\n')
    
    # Ищем последнюю строку с импортом
    last_import_index = -1
    in_multiline_import = False
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Проверяем начало импорта
        if stripped.startswith('import ') or stripped.startswith('import{') or stripped.startswith('import {'):
            last_import_index = i
            # Проверяем, многострочный ли это импорт
            if '{' in line and '}' not in line:
                in_multiline_import = True
        elif in_multiline_import:
            # Продолжаем искать конец многострочного импорта
            if '}' in line and 'from' in line:
                last_import_index = i
                in_multiline_import = False
        elif stripped.startswith('//') or stripped.startswith('/*'):
            # Комментарии пропускаем
            continue
        elif stripped and last_import_index >= 0 and not in_multiline_import:
            # Нашли непустую строку после импортов
            break
    
    if last_import_index == -1:
        return False
    
    # Вставляем API_BASE после последнего импорта
    # Пропускаем пустые строки после импортов
    insert_pos = last_import_index + 1
    while insert_pos < len(lines) and (not lines[insert_pos].strip() or lines[insert_pos].strip().startswith('//')):
        insert_pos += 1
    
    # Вставляем API_BASE с пустой строкой перед и после
    lines.insert(insert_pos, '')
    lines.insert(insert_pos + 1, api_base_line)
    lines.insert(insert_pos + 2, '')
    
    new_content = '\n'.join(lines)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return True

def main():
    """Основная функция"""
    print("🔧 Исправление порядка импортов...\n")
    
    files_to_fix = [
        "components/Layout.tsx",
        "pages/AIHelper.tsx",
        "pages/BloggerSearch.tsx",
        "pages/BrandAnalysis.tsx",
        "pages/CategoryAnalysis.tsx",
        "pages/ExternalAnalysis.tsx",
        "pages/Login.tsx",
        "pages/OracleQueries.tsx",
        "pages/ProductAnalysis.tsx",
        "pages/Register.tsx",
        "pages/SupplierAnalysis.tsx",
        "pages/SupplyPlanning.tsx",
        "pages/SupplyPlanningEnhanced.tsx",
    ]
    
    fixed_count = 0
    for file_rel_path in files_to_fix:
        file_path = SAMP_UI_PATH / file_rel_path
        if file_path.exists():
            if fix_imports_order(file_path):
                print(f"✅ Исправлен: {file_rel_path}")
                fixed_count += 1
            else:
                print(f"ℹ️  Пропущен (нет API_BASE или уже правильно): {file_rel_path}")
        else:
            print(f"⚠️  Файл не найден: {file_rel_path}")
    
    print(f"\n✅ Исправлено файлов: {fixed_count}")
    print("\nТеперь можно запустить: npm run build")

if __name__ == "__main__":
    main()



