---
layout: blog
permalink: /blog/
description: "Авторский блог о маркетинге: анализ данных, разработка и развитие брендов, изучение актуальных трендов и управление проектами. Экспертные советы, статьи и инсайты." 
title: "Блог Дмитрия Бартошевича: Инсайты и Актуальные Тренды в Маркетинге"
keywords: "блог о маркетинге, стратегия, анализ данных, разработка брендов, управление брендами, антикризисный маркетинг, консультант по маркетингу, Дмитрий Бартошевич, советы по маркетингу, статьи о маркетинге"
date:   2022-03-15
last_modified_at: 2023-09-23
image:
---


<div class="body__container">
  
  {% include menu__blog.html %}

<main class="section__content row-gap--l">
       


<div class="intro max-width-text"><h1 class="inline bold">Блог</h1>. <strong>Возвращаю смысл в&nbsp;маркетинг</strong>. Делюсь идеями, наблюдениями, опытом. Подписаться на&nbsp;обновления: <a class="link" href="https://t.me/+OuzxNOZg-g44ZjYy">telegram</a>, <a class="link" href="https://eepurl.com/cmkKcz">эл.почта</a> 

    <div>        
    <button class="small" id="random-article-button">Открыть случайно выбранную статью</button>
        <noscript>
            <div style="color: red;">
                Для полной функциональности сайта необходимо включить JavaScript. 
                Вот <a class="link" href="https://www.enable-javascript.com/ru/" target="_blank" rel="noopener noreferrer">инструкции, как включить JavaScript в вашем веб-браузере</a>.
            </div>
        </noscript>
    </div>
</div>



<div class="full-bleed row-gap--l" id="all-posts" itemscope itemtype="http://schema.org/Blog">
    <meta itemprop="name" content="Блог о маркетинге | Дмитрий Бартошевич">
    <meta itemprop="description" content="Блог Дмитрия Бартошевича о маркетинге, делюсь идеями, наблюдениями, опытом">

    <h2 class="h2 bold">Записи (83) </h2>

  
<ul class="row-gap--xl list-reset">
		{% for post in site.posts %}
		<li class="block__item" itemscope itemtype="http://schema.org/BlogPosting">           
            <meta itemprop="datePublished" content="{{ post.date }}">
            <meta itemprop="dateModified" content="{{ post.last_modified_at }}">           
            <div itemprop="author" itemscope itemtype="http://schema.org/Person">
                <meta itemprop="name" content="Дмитрий Бартошевич">
                <meta itemprop="jobTitle" content="консультант по маркетингу и стратегии">
                <meta itemprop="description" content="Помогаю компаниям развивать свои бренды. Опираясь на исследования и анализ данных, разрабатываю план необходимых действий. Обеспечиваю контроль за реализацией и слежу за результатами каждого проекта, чтобы добиться согласованных с клиентом целей. ">
                <meta itemprop="email" content="dmitry@bartoshevich">
                <link itemprop="sameAs" href="https://bartoshevich.by/">
                <link itemprop="sameAs" href="https://www.linkedin.com/in/bartoshevich">
                <link itemprop="sameAs" href="https://www.facebook.com/bartoshevichby/">
                <link itemprop="sameAs" href="https://twitter.com/dbartoshevich">
                <link itemprop="sameAs" href="https://t.me/MeaningfulMarketing">                
                <link itemprop="image" href="/assets/images/main/bartoshevich@16x9.jpg">
                <link itemprop="image" href="/assets/images/main/bartoshevich@4x3.jpg">
                <link itemprop="image" href="/assets/images/main/bartoshevich@1x1.jpg">
            </div>

            <div class="block__name--align-left">
                <h3 class="h2">
                    <a class="link article-link" href="{{ site.baseurl }}{{ post.url }}">							
                            <span class="article_title" itemprop="headline">	{{ post.name }} </span> 
                    </a>
                </h3>

                <p>
                    <small>
                    <time  datetime="{{ post.date | date: "%Y-%m-%d" }}" class="secondary-color"> 						
                        {{ post.date | date: "%e %B %Y" | replace: 'January', 'января' | replace: 'February', 'февраля' | replace: 'March', 'марта' | replace: 'April', 'апреля' | replace: 'May', 'мая' | replace: 'June', 'июня' | replace: 'July', 'июля' | replace: 'August', 'августа' | replace: 'September', 'сентября' | replace: 'October', 'октября' | replace: 'November', 'ноября' | replace: 'December', 'декабря' }}				
                    </time> 
                    </small>
                </p>
            
            </div>
                       
            <p class="block__content"  itemprop="description">
                {{ post.description }}
            </p>
				
		</li>
		 {% endfor %}
	</ul>
 </div>

</main>

{% include footer.html %}
</div>



