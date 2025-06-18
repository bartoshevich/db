"use strict";

// Экспортируем функцию инициализации
export function randomArticle() {
   
    
    const randomArticleButton = document.getElementById("random-article-button");
   
    
    if (!randomArticleButton) {       
        return;
    }

    // Проверяем, не была ли кнопка уже инициализирована
    if (randomArticleButton.dataset.randomArticleInitialized) {
        return;
    }

    randomArticleButton.dataset.randomArticleInitialized = "true";
   

    const articleLinksArray = Array.from(
        document.querySelectorAll(".article-link")
    );
    
   
    
    if (articleLinksArray.length === 0) {
        randomArticleButton.disabled = true;
        randomArticleButton.style.opacity = "0.5";
        randomArticleButton.style.cursor = "not-allowed";
        randomArticleButton.title = "Нет статей для выбора";
        randomArticleButton.setAttribute("aria-disabled", "true");
        console.warn("❌ [RandomArticle] Ссылки .article-link не найдены, кнопка деактивирована.");
        
        return;
    }

    const setCooldown = (button) => {
        console.log('⏱️ [RandomArticle] Устанавливаем кулдаун');
        button.classList.add("button-cooldown");
        button.disabled = true;
        button.title = "Пожалуйста, подождите...";
        
        setTimeout(() => {
            console.log('✅ [RandomArticle] Кулдаун снят');
            button.classList.remove("button-cooldown");
            button.disabled = false;
            button.title = "Выбрать случайную статью";
        }, 2000);
    };

    const handleClick = (event) => {
      
        
        if (randomArticleButton.disabled || randomArticleButton.classList.contains("button-cooldown")) {
            console.log('⚠️ [RandomArticle] Кнопка заблокирована, отменяем действие');
            event.preventDefault();
            return;
        }

        try {
            setCooldown(randomArticleButton);
            
            const randomIndex = Math.floor(Math.random() * articleLinksArray.length);
            const randomArticleElement = articleLinksArray[randomIndex];
            
         
            if (randomArticleElement && randomArticleElement.href) {
                setTimeout(() => {
                    try {
                        const url = new URL(randomArticleElement.href, window.location.origin);
                        url.searchParams.set("utm_source", "random_button");
                        console.log('🔗 [RandomArticle] Переход на:', url.toString());
                        window.location.href = url.toString();
                    } catch (urlError) {
                        console.warn("⚠️ [RandomArticle] Ошибка создания URL с UTM-меткой, переход по оригинальной ссылке.", urlError);
                        window.location.href = randomArticleElement.href;
                    }
                }, 300);
            } else {
                console.warn("❌ [RandomArticle] Случайный элемент не найден или не имеет href.");
                // Снимаем кулдаун
                randomArticleButton.classList.remove("button-cooldown");
                randomArticleButton.disabled = false;
                randomArticleButton.title = "Выбрать случайную статью";
            }
        } catch (error) {
            console.error("💥 [RandomArticle] Ошибка при обработке клика:", error);
            // Снимаем кулдаун при ошибке
            randomArticleButton.classList.remove("button-cooldown");
            randomArticleButton.disabled = false;
            randomArticleButton.title = "Выбрать случайную статью";
        }
    };

    // Добавляем обработчик клика
    randomArticleButton.addEventListener("click", handleClick);
   
    // Обработка Enter/Space для не-button элементов
    if (randomArticleButton.tagName !== 'BUTTON') {
        console.log('⌨️ [RandomArticle] Добавляем обработчик клавиатуры для', randomArticleButton.tagName);
        randomArticleButton.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                randomArticleButton.click();
            }
        });
    }

   
}

// Для отладки - автоматический вызов если скрипт загружается напрямую
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
       
        randomArticle();
    });
} else if (typeof window !== 'undefined') {
    
    randomArticle();
}