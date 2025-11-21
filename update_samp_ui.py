#!/usr/bin/env python3
"""
Скрипт для обновления файлов в samp-ui из WILD-BOT 9
Сохраняет обращения к https://crm.samp.business/api и Яндекс Метрику
"""

import os
import re
import shutil
from pathlib import Path

# Пути к проектам
WILD_BOT_PATH = Path("/Users/user/Desktop/WILD-BOT 9/wild-analytics-web/src")
SAMP_UI_PATH = Path("/Users/user/Desktop/samp-ui/src")

# Паттерны для поиска и сохранения
API_BASE_PATTERN = r"const\s+API_BASE\s*=\s*process\.env\.REACT_APP_API_URL\s*\|\|\s*['\"](https://crm\.samp\.business/api)['\"];"
YANDEX_METRIKA_PATTERN = r"addYandexMetrika\(['\"](\d+)['\"]\)"
YANDEX_METRIKA_IMPORT = r"import\s+\{?\s*addYandexMetrika\s*\}?\s*from\s+['\"].*yandexMetrika['\"];"

def extract_api_base(content: str) -> str:
    """Извлекает строку API_BASE из содержимого"""
    match = re.search(API_BASE_PATTERN, content)
    if match:
        return match.group(0)
    return None

def extract_yandex_metrika_id(content: str) -> str:
    """Извлекает ID Яндекс Метрики из содержимого"""
    match = re.search(YANDEX_METRIKA_PATTERN, content)
    if match:
        return match.group(1)
    return None

def extract_yandex_metrika_call(content: str) -> str:
    """Извлекает полный вызов addYandexMetrika с контекстом"""
    # Ищем useEffect блок с addYandexMetrika
    pattern = r"useEffect\(\(\)\s*=>\s*\{[^}]*addYandexMetrika\(['\"](\d+)['\"]\)[^}]*\},?\s*\[\]\);"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        return match.group(0)
    
    # Если не нашли в useEffect, ищем просто вызов
    pattern = r"addYandexMetrika\(['\"](\d+)['\"]\);"
    match = re.search(pattern, content)
    if match:
        return match.group(0)
    
    return None

def update_file_content(source_content: str, target_content: str) -> str:
    """Обновляет содержимое файла, сохраняя API_BASE и Яндекс Метрику из target"""
    
    # Извлекаем API_BASE из целевого файла
    target_api_base = extract_api_base(target_content)
    
    # Извлекаем Яндекс Метрику из целевого файла
    target_metrika_id = extract_yandex_metrika_id(target_content)
    target_metrika_call = extract_yandex_metrika_call(target_content)
    
    result = source_content
    
    # Заменяем API_BASE в исходном файле на тот, что из целевого
    if target_api_base:
        # Ищем и заменяем API_BASE в исходном файле
        source_api_pattern = r"const\s+API_BASE\s*=\s*[^;]+;"
        if re.search(source_api_pattern, result):
            result = re.sub(source_api_pattern, target_api_base, result)
        else:
            # Если нет API_BASE, добавляем после импортов
            import_pattern = r"(import\s+.*?from\s+['\"].*?['\"];)"
            match = list(re.finditer(import_pattern, result))
            if match:
                last_import = match[-1]
                insert_pos = last_import.end()
                result = result[:insert_pos] + "\n" + target_api_base + "\n" + result[insert_pos:]
    
    # Заменяем или добавляем Яндекс Метрику
    if target_metrika_id:
        # Проверяем, есть ли уже импорт Яндекс Метрики
        if "addYandexMetrika" not in result:
            # Добавляем импорт
            import_pattern = r"(import\s+.*?from\s+['\"].*?['\"];)"
            match = list(re.finditer(import_pattern, result))
            if match:
                last_import = match[-1]
                insert_pos = last_import.end()
                metrika_import = "import { addYandexMetrika } from '../utils/yandexMetrika';"
                result = result[:insert_pos] + "\n" + metrika_import + "\n" + result[insert_pos:]
        
        # Заменяем или добавляем вызов addYandexMetrika
        metrika_pattern = r"addYandexMetrika\(['\"]\d+['\"]\)"
        if re.search(metrika_pattern, result):
            # Заменяем существующий ID
            result = re.sub(metrika_pattern, f"addYandexMetrika('{target_metrika_id}')", result)
        else:
            # Добавляем новый вызов в useEffect
            # Ищем первый useEffect
            useEffect_pattern = r"(useEffect\(\(\)\s*=>\s*\{)"
            match = re.search(useEffect_pattern, result)
            if match:
                insert_pos = match.end()
                metrika_call = f"\n    addYandexMetrika('{target_metrika_id}');"
                result = result[:insert_pos] + metrika_call + result[insert_pos:]
    
    return result

def update_file(source_path: Path, target_path: Path):
    """Обновляет один файл"""
    if not source_path.exists():
        print(f"⚠️  Исходный файл не найден: {source_path}")
        return False
    
    if not target_path.exists():
        print(f"⚠️  Целевой файл не найден: {target_path}, копируем как есть")
        shutil.copy2(source_path, target_path)
        return True
    
    # Читаем содержимое обоих файлов
    with open(source_path, 'r', encoding='utf-8') as f:
        source_content = f.read()
    
    with open(target_path, 'r', encoding='utf-8') as f:
        target_content = f.read()
    
    # Обновляем содержимое
    updated_content = update_file_content(source_content, target_content)
    
    # Записываем обновленный файл
    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(updated_content)
    
    print(f"✅ Обновлен: {target_path.relative_to(SAMP_UI_PATH)}")
    return True

def update_utils_api():
    """Обновляет utils/api.ts с сохранением структуры samp-ui"""
    source_path = WILD_BOT_PATH / "utils" / "api.ts"
    target_path = SAMP_UI_PATH / "utils" / "api.ts"
    
    if not source_path.exists():
        print(f"⚠️  Исходный файл не найден: {source_path}")
        return
    
    # Читаем исходный файл
    with open(source_path, 'r', encoding='utf-8') as f:
        source_content = f.read()
    
    # Заменяем DEFAULT_API_BASE на https://crm.samp.business/api
    updated_content = source_content.replace(
        "const DEFAULT_API_BASE = 'http://localhost:8000';",
        "const DEFAULT_API_BASE = 'https://crm.samp.business/api';"
    )
    
    # Записываем обновленный файл
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(updated_content)
    
    print(f"✅ Обновлен: {target_path.relative_to(SAMP_UI_PATH)}")

def main():
    """Основная функция"""
    print("🚀 Начало обновления samp-ui из WILD-BOT 9\n")
    
    # Обновляем utils/api.ts
    print("📝 Обновление utils/api.ts...")
    update_utils_api()
    print()
    
    # Обновляем все страницы
    print("📝 Обновление страниц (pages/*.tsx)...")
    pages_source = WILD_BOT_PATH / "pages"
    pages_target = SAMP_UI_PATH / "pages"
    
    if pages_source.exists():
        for source_file in pages_source.glob("*.tsx"):
            target_file = pages_target / source_file.name
            update_file(source_file, target_file)
    
    print()
    
    # Обновляем компоненты
    print("📝 Обновление компонентов...")
    components_source = WILD_BOT_PATH / "components"
    components_target = SAMP_UI_PATH / "components"
    
    if components_source.exists():
        for source_file in components_source.rglob("*.tsx"):
            relative_path = source_file.relative_to(components_source)
            target_file = components_target / relative_path
            target_file.parent.mkdir(parents=True, exist_ok=True)
            update_file(source_file, target_file)
    
    print()
    
    # Обновляем другие файлы (но не трогаем yandexMetrika.ts)
    print("📝 Обновление других файлов...")
    files_to_update = [
        "App.tsx",
        "index.tsx",
        "App.css",
        "index.css",
    ]
    
    for file_name in files_to_update:
        source_file = WILD_BOT_PATH / file_name
        target_file = SAMP_UI_PATH / file_name
        if source_file.exists():
            # Для этих файлов просто копируем, не сохраняя API_BASE
            shutil.copy2(source_file, target_file)
            print(f"✅ Скопирован: {file_name}")
    
    print("\n✅ Обновление завершено!")
    print("\n⚠️  ВАЖНО: Проверьте файлы вручную:")
    print("   1. Убедитесь, что API_BASE = 'https://crm.samp.business/api' во всех файлах")
    print("   2. Убедитесь, что ID Яндекс Метрики сохранены правильно")
    print("   3. Проверьте, что buildApiUrl используется правильно")

if __name__ == "__main__":
    main()



