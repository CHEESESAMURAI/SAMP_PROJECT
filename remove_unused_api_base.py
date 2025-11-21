#!/usr/bin/env python3
"""
Скрипт для удаления неиспользуемых переменных API_BASE и импортов getApiBase
"""

import re
from pathlib import Path

SAMP_UI_PATH = Path("/Users/user/Desktop/samp-ui/src")

def remove_unused_api_base(file_path: Path):
    """Удаляет неиспользуемую переменную API_BASE из файла"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    changed = False
    
    # Удаляем const API_BASE если он не используется в файле
    # Проверяем, используется ли API_BASE в коде (кроме объявления)
    api_base_pattern = r"const\s+API_BASE\s*=\s*process\.env\.REACT_APP_API_URL\s*\|\|\s*['\"]https://crm\.samp\.business/api['\"];"
    
    # Проверяем, используется ли API_BASE после объявления
    if re.search(api_base_pattern, content):
        # Удаляем объявление
        content = re.sub(api_base_pattern + r'\s*\n?', '', content)
        
        # Удаляем пустую строку после удаления, если она есть
        content = re.sub(r'\n\n\n+', '\n\n', content)
        
        if content != original_content:
            changed = True
    
    # Удаляем неиспользуемый импорт getApiBase
    get_api_base_import_pattern = r"import\s+\{\s*getApiBase\s*\}\s*from\s+['\"].*?api['\"];?\s*\n"
    if re.search(get_api_base_import_pattern, content):
        # Проверяем, используется ли getApiBase
        if 'getApiBase(' not in content and 'getApiBase ' not in content:
            content = re.sub(get_api_base_import_pattern, '', content)
            changed = True
    
    # Удаляем getApiBase из множественного импорта
    multi_import_pattern = r"import\s+\{\s*([^}]*?)\s*,\s*getApiBase\s*([^}]*?)\s*\}\s*from\s+['\"].*?api['\"];"
    if re.search(multi_import_pattern, content):
        # Заменяем на импорт без getApiBase
        def remove_get_api_base(match):
            imports = match.group(1) + match.group(2)
            imports = imports.replace(',', '').strip()
            if imports:
                return f"import {{ {imports} }} from '../utils/api';"
            else:
                return ""
        content = re.sub(multi_import_pattern, remove_get_api_base, content)
        changed = True
    
    if changed:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    
    return False

def clean_utils_api():
    """Очищает utils/api.ts от неиспользуемых переменных"""
    file_path = SAMP_UI_PATH / "utils" / "api.ts"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Удаляем неиспользуемые переменные
    content = re.sub(r'const\s+sanitizeBaseUrl\s*=\s*[^;]+;\s*\n', '', content)
    content = re.sub(r'const\s+rawBase\s*=\s*[^;]+;\s*\n', '', content)
    
    # Удаляем лишние пустые строки
    content = re.sub(r'\n\n\n+', '\n\n', content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return True

def main():
    """Основная функция"""
    print("🧹 Удаление неиспользуемых переменных API_BASE и getApiBase...\n")
    
    files_to_fix = [
        "components/Layout.tsx",
        "components/UI/FormattedNumber.tsx",
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
        "pages/AdMonitoring.tsx",
        "pages/Dashboard.tsx",
        "pages/Profile.tsx",
        "pages/SeasonalityAnalysis.tsx",
        "pages/GlobalSearch.tsx",
    ]
    
    fixed_count = 0
    for file_rel_path in files_to_fix:
        file_path = SAMP_UI_PATH / file_rel_path
        if file_path.exists():
            if remove_unused_api_base(file_path):
                print(f"✅ Исправлен: {file_rel_path}")
                fixed_count += 1
            else:
                print(f"ℹ️  Пропущен (нет неиспользуемых переменных): {file_rel_path}")
        else:
            print(f"⚠️  Файл не найден: {file_rel_path}")
    
    # Очищаем utils/api.ts
    print("\n🧹 Очистка utils/api.ts...")
    if clean_utils_api():
        print("✅ Очищен: utils/api.ts")
        fixed_count += 1
    
    print(f"\n✅ Исправлено файлов: {fixed_count}")
    print("\nТеперь можно запустить: npm run build")

if __name__ == "__main__":
    main()



