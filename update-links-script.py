import os
import re
from pathlib import Path

# Путь к директории с вашими markdown-файлами
POSTS_DIR = '_posts'  # Измените на путь к вашим статьям

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
            return False
    
    original_content = content
    changes_made = False
    changed_links = []
    
    # Поиск и замена ссылок в markdown-формате: [текст](ссылка)
    for old_path, new_path in redirects.items():
        # Экранирование специальных символов для регулярного выражения
        escaped_old_path = re.escape(old_path)
        # Поиск ссылок в формате [текст](ссылка)
        pattern = r'\[([^\]]+)\]\(' + escaped_old_path + r'(#[^)]+)?\)'
        replacement = r'[\1](' + new_path + r'\2)'
        new_content = re.sub(pattern, replacement, content)
        
        # Поиск ссылок в любом HTML-формате: <a href="ссылка" class="link">текст</a>
        # Обрабатывает ссылки независимо от порядка атрибутов и наличия пробелов
        html_pattern = r'<a([^>]*?)href=["\']' + escaped_old_path + r'(#[^"\']+)?["\']([^>]*)>([^<]+)</a>'
        
        def replace_html_link(match):
            before_href = match.group(1)  # Атрибуты перед href
            anchor = match.group(2) or ""  # Якорь (#section) или пустая строка
            after_href = match.group(3)   # Атрибуты после href
            text = match.group(4)         # Текст ссылки
            return f'<a{before_href}href="{new_path}{anchor}"{after_href}>{text}</a>'
            
        new_content = re.sub(html_pattern, replace_html_link, new_content)
        
        if new_content != content:
            content = new_content
            changes_made = True
    
        # Для отладки - сохраняем какие замены были сделаны
        if new_content != content:
            for match in re.finditer(pattern, content):
                old_link = match.group(0)
                changed_links.append(f"  - Заменено: {old_link}")
            for match in re.finditer(html_pattern, content):
                old_link = match.group(0)
                changed_links.append(f"  - Заменено: {old_link}")
            content = new_content
            changes_made = True
    
    # Сохраняем файл только если были внесены изменения
    if changes_made:
        try:
            with open(file_path, 'w', encoding='utf-8') as file:
                file.write(content)
            return True, changed_links
        except Exception as e:
            print(f"Ошибка при сохранении файла {file_path}: {e}")
            return False, []
    return False, []

def process_all_files():
    """Обрабатывает все markdown-файлы в указанной директории."""
    updated_files = {}
    
    # Получаем все markdown-файлы в директории и поддиректориях
    for root, _, files in os.walk(POSTS_DIR):
        for file_name in files:
            if file_name.endswith(('.md', '.markdown', '.html')):  # Добавили .html
                file_path = os.path.join(root, file_name)
                updated, changes = update_links_in_file(file_path)
                if updated:
                    updated_files[file_path] = changes
    
    return updated_files

if __name__ == "__main__":
    print("Начинаем обновление ссылок в блоге...")
    
    # Проверяем существование директории
    if not os.path.exists(POSTS_DIR):
        print(f"Ошибка: Директория '{POSTS_DIR}' не найдена.")
        print("Введите путь к директории с вашими статьями: ")
        custom_dir = input().strip()
        if custom_dir and os.path.exists(custom_dir):
            POSTS_DIR = custom_dir
        else:
            print("Корректный путь не указан. Выход.")
            exit(1)
    
    # Опция только анализа без изменений
    dry_run = input("Запустить в режиме проверки без внесения изменений? (y/n): ").lower() == 'y'
    
    updated = process_all_files()
    
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
