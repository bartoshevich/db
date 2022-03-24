---
layout: blog
permalink: /blog/
description: "Статьи по различным вопросам маркетинга и развития бизнеса. Делюсь идеями, наблюдениями, опытом." 
title: "Блог о маркетинге | Дмитрий Бартошевич"
keywords: "блог о маркетинге"
date:   2022-03-15
last_modified_at: 2022-03-15
image:
---


<div class="body__container">
  
  {% include menu__blog.html %}

<main class="section__content row-gap--m">
       


<div class="intro max-width-text"><h1 class="inline bold">Блог</h1>. 	<strong>Возвращаю смысл в&nbsp;маркетинг</strong>. Делюсь идеями, наблюдениями, опытом. Подписаться на&nbsp;обновления: <a class="link" href="/feed.xml">RSS</a>, <a class="link" href="https://eepurl.com/cmkKcz">эл.почта</a> </div>

	

<div class="full-bleed row-gap--m" itemscope itemtype="https://schema.org/FAQPage">
    <h2 class="h2 bold">Все записи (74) </h2>
  
	<ul class="row-gap--l list-reset">
		{% for post in site.posts %}
		<li class="block__item">


            <div class="block__name--align-left">
                <h3 class="h2">
                    <a class="link" href="{{ site.baseurl }}{{ post.url }}">							
                            <span class="article_title">	{{ post.name }} </span> 
                    </a>
                </h3>

                <small>
                <time  datetime="{{ post.date | date: "%Y-%m-%d" }}" class="secondary-color"> 						
                    {{ post.date | date: "%e %B %Y" | replace: 'January', 'января' | replace: 'February', 'февраля' | replace: 'March', 'марта' | replace: 'April', 'апреля' | replace: 'May', 'мая' | replace: 'June', 'июня' | replace: 'July', 'июля' | replace: 'August', 'августа' | replace: 'September', 'сентября' | replace: 'October', 'октября' | replace: 'November', 'ноября' | replace: 'December', 'декабря' }}				
                </time> 
                </small>
            
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



