import os
import re
from pathlib import Path

# Пути к директориям для сканирования
SCAN_DIRS = ['_posts', '_includes', '_layouts']  # Добавьте дополнительные директории по необходимости

# Флаг для сканирования корневой директории
SCAN_ROOT = False  # Будет изменено на True, если пользователь захочет сканировать файлы в корне

# Домен вашего сайта для обработки абсолютных URL
DOMAIN = "https://bartoshevich.by"

# Словарь с редиректами (старый путь -> новый путь)
redirects = {
    "/blog/feedback/": "/blog/metodika-nps-indeks-loyalnosti-klientov/",
    "/blog/covid-2019/": "/blog/marketing-strategies-pandemic/",
    "/blog/razrabotka-marketingovoj-strategii/": "/blog/riski-splochnennogo-kollektiva-v-marketinge/",
    "/belarus/": "/blog/marketing-strategies-pandemic/",
    "/blog/2-idei-po-razvitiyu-marketinga/": "/blog/vospriyatie-klienta-uspeh/",
    "/blog/3-pravila-marketingovyx-issledovanij/": "/blog/pravila-marketingovyx-issledovanij/",
    "/blog/algoritm-provedeniya-reklamnoj-kampanii/": "/blog/algoritm-reklamnoj-kampanii/",
    "/blog/analiz-prodaj/": "/blog/analiz-prodazh-nielsen/",
    "/blog/brand-conception-hormann/": "/blog/razrabotka-koncepcii-brenda-hormann/",
    "/blog/brand-giperlink/": "/blog/kejs-brend-giperlink/",
    "/blog/brand-is-good/": "/blog/strategiya-silnogo-brenda/",
    "/blog/brief/": "/blog/otkaz-ot-brifov/",
    "/blog/choice/": "/blog/kak-agentstva-skryvayut-slabye-resheniya/",
    "/blog/chatgpt-mozhet-preobrazit-brend-i-reklamnye-kampanii/": "/blog/chatgpt-v-marketinge/",
    "/blog/delayu-sajt-detskogo-psixologa/": "/blog/sajt-dlya-psihologa-kejs/",
    "/blog/delovoy/": "/blog/kejs-internet-magazina-delovoy/",
    "/blog/difficult-clients/": "/blog/kak-rabotat-s-problemnymi-klientami/",
    "/blog/direktor-xochet-korporativ/": "/blog/pochemu-korporativy-ne-rabotayut/",
    "/blog/dlya-tex-kto-pishet/": "/blog/redaktirovanie-teksta-instrumenty/",
    "/blog/ecommerce/": "/blog/klientskij-opyt-v-ecommerce/",
    "/blog/crowdconference/": "/blog/novye-tehnologii-dlya-biznesa/",
    "/blog/effektivnost-marketinga/": "/blog/vremya-kak-metod-analiza-marketinga/",
    "/blog/emotions-in-marketing/": "/blog/kak-brendy-sozdajut-emotsionalnuyu-svyaz/",
    "/blog/faberge/": "/blog/smelyj-brend/",
    "/blog/gifts2clients/": "/blog/korporativnye-podarki-i-pozdravleniya/",
    "/blog/hype/": "/blog/iskusstvennyj-intellekt-v-marketinge/",
    "/blog/igra/": "/blog/lovushka-dlya-marketologov-igra-spasitel/",
    "/blog/kak-privlech-klientov/": "/blog/klienty-vybirayut-brendy-po-cennostyam/",
    "/blog/marketers/": "/blog/kak-uznat-silnogo-marketologa/",
    "/blog/marketing-for-industrial-giants-12-archetypes/": "/blog/12-archetypes-b2b-marketing/",
    "/blog/misconceptions/": "/blog/mify-o-marketinge/",
    "/blog/primer-swot-analiza/": "/blog/oshibki-v-swot-analize-i-kak-ih-izbezhat/",
    "/blog/razvitie-brenda/": "/blog/riski-virusnogo-marketinga/",
    "/blog/seth-godin/": "/blog/set-godin-eto-marketing/"
}

# Создаем расширенный словарь с абсолютными и относительными путями
def create_extended_redirects():
    extended = {}
    for old_path, new_path in redirects.items():
        # Добавляем оригинальный редирект (относительный путь)
        extended[old_path] = new_path
        # Добавляем абсолютный URL с доменом
        extended[DOMAIN + old_path] = DOMAIN + new_path
    return extended

# Инициализируем расширенный словарь
extended_redirects = create_extended_redirects()

def update_links_in_file(file_path):
    """Обновляет ссылки в одном файле."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
    except UnicodeDecodeError:
        # Попробуем другие распространенные кодировки
        encodings = ['latin1', 'cp1251', 'iso-8859-1']
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as file:
                    content = file.read()
                break
            except UnicodeDecodeError:
                continue
        else:
            print(f"Не удалось прочитать файл {file_path} ни в одной из известных кодировок")
            return False, []
    
    original_content = content
    changes_made = False
    changed_links = []
    
    # Предварительная обработка: защищаем пути в тегах img от замены
    img_tags = []
    img_pattern = r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>'
    
    # Находим все теги <img> и сохраняем их
    for i, match in enumerate(re.finditer(img_pattern, content)):
        img_tag = match.group(0)
        placeholder = f"__IMG_TAG_PLACEHOLDER_{i}__"
        img_tags.append((placeholder, img_tag))
        content = content.replace(img_tag, placeholder)
    
    # Поиск ссылок во всех форматах
    for old_path, new_path in extended_redirects.items():
        # Экранирование специальных символов для регулярного выражения
        escaped_old_path = re.escape(old_path)
        
        # 1. Поиск ссылок в формате Markdown: [текст](ссылка)
        pattern = r'\[([^\]]+)\]\(' + escaped_old_path + r'(#[^)]+)?\)'
        replacement = r'[\1](' + new_path + r'\2)'
        new_content = re.sub(pattern, replacement, content)
        
        # 2. Поиск прямых URL в формате url: "/blog/old-url/" или permalink: "/blog/old-url/"
        url_pattern = r'(url|permalink):\s*["\']' + escaped_old_path + r'["\']'
        url_replacement = r'\1: "' + new_path + '"'
        new_content = re.sub(url_pattern, url_replacement, new_content)
        
        # 3. Поиск ссылок в любом HTML-формате: <a href="ссылка" class="link">текст</a>
        # Более гибкий шаблон, который захватывает все возможные атрибуты
        html_pattern = r'<a\b([^>]*?)href=["\']' + escaped_old_path + r'(#[^"\']+)?["\']([^>]*)>'
        
        def replace_html_link(match):
            attrs_before = match.group(1) or ""  # Атрибуты перед href
            anchor = match.group(2) or ""        # Якорь (#section) или пустая строка
            attrs_after = match.group(3) or ""   # Атрибуты после href
            return f'<a{attrs_before}href="{new_path}{anchor}"{attrs_after}>'
            
        new_content = re.sub(html_pattern, replace_html_link, new_content)
        
        # Для отладки - сохраняем какие замены были сделаны
        if new_content != content:
            # Сохраняем более подробную информацию о заменах
            try:
                # Проверяем markdown-ссылки
                for match in re.finditer(pattern, content):
                    old_link = match.group(0)
                    new_link = old_link.replace(old_path, new_path)
                    changed_links.append(f"  - Заменено: {old_link} -> {new_link}")
                
                # Проверяем html-ссылки с любыми атрибутами
                html_pattern_for_debug = r'<a\b[^>]*?href=["\']' + escaped_old_path + r'(#[^"\']+)?["\'][^>]*>[^<]*</a>'
                for match in re.finditer(html_pattern_for_debug, content):
                    old_link = match.group(0)
                    # Заменяем только часть с href, сохраняя остальные атрибуты
                    new_link = old_link.replace(f'href="{old_path}"', f'href="{new_path}"')
                    new_link = new_link.replace(f"href='{old_path}'", f"href='{new_path}'")
                    changed_links.append(f"  - Заменено: {old_link} -> {new_link}")
                
                # Проверяем более короткие HTML-ссылки (без закрывающего тега)
                html_short_pattern = r'<a\b[^>]*?href=["\']' + escaped_old_path + r'(#[^"\']+)?["\'][^>]*>'
                for match in re.finditer(html_short_pattern, content):
                    if match.group(0) not in [m.group(0) for m in re.finditer(html_pattern_for_debug, content)]:
                        old_link = match.group(0)
                        new_link = old_link.replace(f'href="{old_path}"', f'href="{new_path}"')
                        new_link = new_link.replace(f"href='{old_path}'", f"href='{new_path}'")
                        changed_links.append(f"  - Заменено (открывающий тег): {old_link} -> {new_link}")
                
                # Проверяем URL и permalink
                if 'url_pattern' in locals():  # Если есть шаблон для URL/permalink
                    for match in re.finditer(url_pattern, content):
                        old_link = match.group(0)
                        new_link = old_link.replace(old_path, new_path)
                        changed_links.append(f"  - Заменено: {old_link} -> {new_link}")
                        
            except Exception as e:
                changed_links.append(f"  - [Ошибка при логировании замен: {e}]")
            
            # Добавляем информацию о замененных ссылках для вывода статистики
            if old_path.startswith(DOMAIN):
                # Это абсолютная ссылка с доменом
                changed_links.append(f"  - Заменена абсолютная ссылка: {old_path} -> {new_path}")
            else:
                # Это относительная ссылка
                changed_links.append(f"  - Заменена относительная ссылка: {old_path} -> {new_path}")
                
            content = new_content
            changes_made = True
    
    # Сохраняем файл только если были внесены изменения
    if changes_made:
        # Восстанавливаем теги <img> из защищенных плейсхолдеров
        for placeholder, img_tag in img_tags:
            content = content.replace(placeholder, img_tag)
            
        try:
            with open(file_path, 'w', encoding='utf-8') as file:
                file.write(content)
            return True, changed_links
        except Exception as e:
            print(f"Ошибка при сохранении файла {file_path}: {e}")
            return False, []
    else:
        # Восстанавливаем теги <img> даже если изменений не было
        for placeholder, img_tag in img_tags:
            content = content.replace(placeholder, img_tag)
        return False, []

def process_all_files():
    """Обрабатывает все файлы в указанных директориях и корне (если выбрано)."""
    updated_files = {}
    
    # Обрабатываем каждую директорию из списка
    for directory in SCAN_DIRS:
        if not os.path.exists(directory):
            print(f"Предупреждение: Директория '{directory}' не найдена, пропускаем.")
            continue
            
        print(f"Сканирование директории: {directory}")
        
        # Получаем все файлы в директории и поддиректориях
        for root, _, files in os.walk(directory):
            for file_name in files:
                # Обрабатываем Markdown и HTML файлы
                if file_name.endswith(('.md', '.markdown', '.html', '.htm', '.liquid', '.xml')):
                    file_path = os.path.join(root, file_name)
                    updated, changes = update_links_in_file(file_path)
                    if updated:
                        updated_files[file_path] = changes
    
    # Обрабатываем файлы в корневой директории, если это выбрано
    if SCAN_ROOT:
        print("Сканирование файлов в корневой директории")
        for file_name in os.listdir("."):
            if os.path.isfile(file_name) and file_name.endswith(('.md', '.markdown', '.html', '.htm', '.liquid', '.xml')):
                updated, changes = update_links_in_file(file_name)
                if updated:
                    updated_files[file_name] = changes
    
    return updated_files

def main():
    """Основная функция, управляющая работой скрипта."""
    # Используем глобальные переменные
    global DOMAIN, SCAN_DIRS, SCAN_ROOT, extended_redirects
    
    print("Начинаем обновление ссылок в блоге...")
    
    # Настройка домена
    print(f"Текущий домен для абсолютных URL: {DOMAIN}")
    if input("Хотите изменить домен сайта? (y/n): ").lower() == 'y':
        custom_domain = input("Введите домен сайта (например: https://example.com): ").strip()
        if custom_domain:
            DOMAIN = custom_domain
            # Пересоздаем словарь с новым доменом
            temp_redirects = create_extended_redirects()
            extended_redirects.clear()
            for k, v in temp_redirects.items():
                extended_redirects[k] = v
    
    # Настройка директорий
    print(f"Текущие директории для сканирования: {', '.join(SCAN_DIRS)}")
    if input("Хотите добавить дополнительные директории для сканирования? (y/n): ").lower() == 'y':
        additional_dirs = input("Введите директории через запятую (например: _data, _drafts): ").strip()
        if additional_dirs:
            for dir_name in additional_dirs.split(','):
                dir_name = dir_name.strip()
                if dir_name and dir_name not in SCAN_DIRS:
                    SCAN_DIRS.append(dir_name)
    
    # Настройка сканирования корневой директории
    SCAN_ROOT = input("Сканировать файлы Markdown/HTML в корневой директории? (y/n): ").lower() == 'y'
    
    # Вывод информации о настройках
    dirs_message = ", ".join(SCAN_DIRS)
    if SCAN_ROOT:
        dirs_message += " и файлы в корневой директории"
    print(f"Директории для сканирования: {dirs_message}")
    
    print("\nБудут обрабатываться следующие типы ссылок:")
    print("1. Относительные ссылки (например: /blog/old-url/)")
    print(f"2. Абсолютные ссылки с доменом (например: {DOMAIN}/blog/old-url/)")
    print("3. Ссылки в front matter (url: и permalink:)")
    
    print("\nПоиск ссылок НЕ будет выполняться в тегах изображений (<img>).\n")
    
    # Режим проверки
    dry_run = input("Запустить в режиме проверки без внесения изменений? (y/n): ").lower() == 'y'
    
    # Обработка файлов
    updated = process_all_files()
    
    # Вывод результатов
    if updated:
        print(f"\nОбработано {len(updated)} файлов с изменениями:")
        for file_path, changes in updated.items():
            print(f"\n=== {file_path} ===")
            if changes:
                for change in changes:
                    print(change)
            else:
                print("  - Файл был обновлен, но детали изменений не доступны")
        
        if dry_run:
            print("\nЭто был режим проверки. Никакие изменения не были сохранены.")
    else:
        print("\nНи один файл не был обновлен. Возможно, старые ссылки не найдены.")

    print("\nГотово!")

if __name__ == "__main__":
    main()
