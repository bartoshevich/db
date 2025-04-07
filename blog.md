---
layout: blog
permalink: /blog/
description: "Авторский блог Дмитрия Бартошевича о маркетинге, стратегии и брендинге. Кейсы, анализ данных, тренды. Экспертные советы и инсайты для профессионалов." 
title: "Блог Дмитрия Бартошевича: маркетинг, стратегия, брендинг"
keywords: "блог о маркетинге, стратегия, анализ данных, разработка брендов, управление брендами, антикризисный маркетинг, консультант по маркетингу, Дмитрий Бартошевич, советы по маркетингу, статьи о маркетинге"
date:   2015-07-31
last_modified_at: 2025-04-07
image:
---


<div class="body__container">
  
  {% include menu__blog.html %}

<main class="section__content row-gap--l">
       
<header class="intro max-width-text"><h1 class="inline bold">Блог Дмитрия Бартошевича</h1> <p class="inline">о&nbsp;маркетинге и&nbsp;стратегии. Делюсь инсайтами, актуальными трендами, наблюдениями и&nbsp;кейсами. Подпишитесь на&nbsp;обновления: <a class="link" href="https://t.me/+OuzxNOZg-g44ZjYy">telegram</a>, <a class="link" href="https://eepurl.com/cmkKcz">эл.почта</a></p> 
</header>


<div>     
    <button id="random-article-button">Открыть случайно выбранную статью</button>
        <noscript>
            <div style="color: red;">
                Для полной функциональности сайта необходимо включить JavaScript. 
                Вот <a class="link" href="https://www.enable-javascript.com/ru/" target="_blank" rel="noopener noreferrer">инструкции, как включить JavaScript в вашем веб-браузере</a>.
            </div>
        </noscript>
    </div>


<div class="full-bleed mt-m row-gap--l" id="all-posts">
    

<h2 class="h2 bold">Все записи (84) </h2>

  
<ul class="row-gap--xl list-reset">
		{% for post in site.posts %}
		<li class="block__item">           
            
          
           

            <div class="block__name--align-left">
                <h2 class="h2">
                    <a class="link article-link" href="{{ site.baseurl }}{{ post.url }}" >							
                            <span class="article_title">	{{ post.name }} </span> 
                    </a>
                </h2>

                <p>
                    <small>
                    <time  datetime="{{ post.date | date: "%Y-%m-%d" }}" class="secondary-color"> 						
                        {{ post.date | date: "%e %B %Y" | replace: 'January', 'января' | replace: 'February', 'февраля' | replace: 'March', 'марта' | replace: 'April', 'апреля' | replace: 'May', 'мая' | replace: 'June', 'июня' | replace: 'July', 'июля' | replace: 'August', 'августа' | replace: 'September', 'сентября' | replace: 'October', 'октября' | replace: 'November', 'ноября' | replace: 'December', 'декабря' }}				
                    </time> 
                    </small>
                </p>
            
            </div>
                       
            <p class="block__content">
                {{ post.description }}
            </p>
				
		</li>
		 {% endfor %}
	</ul>
 </div>

</main>

{% include footer.html %}
</div>



