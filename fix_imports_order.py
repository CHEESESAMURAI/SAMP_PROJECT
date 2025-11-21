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
    api_base_pattern = r"(const\s+API_BASE\s*=\s*process\.env\.REACT_APP_API_URL\s*\|\|\s*['\"]https://crm\.samp\.business/api['\"];)"
    api_base_match = re.search(api_base_pattern, content)
    
    if not api_base_match:
        return False
    
    api_base_line = api_base_match.group(1)
    
    # Находим все импорты (они должны быть в начале файла)
    # Импорты могут быть многострочными, поэтому используем более сложный паттерн
    import_pattern = r"(^import\s+.*?from\s+['\"].*?['\"];?\s*$)"
    imports = []
    lines = content.split('\n')
    
    # Находим позицию последнего импорта
    last_import_line = -1
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('import ') or (stripped.startswith('import{') or stripped.startswith('import {')):
            last_import_line = i
        elif stripped and not stripped.startswith('//') and not stripped.startswith('/*') and last_import_line >= 0:
            # Если нашли непустую строку после импортов, останавливаемся
            break
    
    # Находим позицию const API_BASE
    api_base_line_num = -1
    for i, line in enumerate(lines):
        if 'const API_BASE' in line:
            api_base_line_num = i
            break
    
    if api_base_line_num == -1 or last_import_line == -1:
        return False
    
    # Если API_BASE уже после импортов, пропускаем
    if api_base_line_num > last_import_line:
        return False
    
    # Удаляем API_BASE из текущей позиции
    lines.pop(api_base_line_num)
    
    # Вставляем API_BASE после последнего импорта
    # Находим конец блока импортов (может быть пустая строка)
    insert_pos = last_import_line + 1
    while insert_pos < len(lines) and (not lines[insert_pos].strip() or lines[insert_pos].strip().startswith('//')):
        insert_pos += 1
    
    # Вставляем API_BASE
    lines.insert(insert_pos, api_base_line)
    # Добавляем пустую строку после API_BASE если её нет
    if insert_pos + 1 < len(lines) and lines[insert_pos + 1].strip():
        lines.insert(insert_pos + 1, '')
    
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
                print(f"ℹ️  Пропущен (уже правильно): {file_rel_path}")
        else:
            print(f"⚠️  Файл не найден: {file_rel_path}")
    
    print(f"\n✅ Исправлено файлов: {fixed_count}")
    print("\nТеперь можно запустить: npm run build")

if __name__ == "__main__":
    main()



