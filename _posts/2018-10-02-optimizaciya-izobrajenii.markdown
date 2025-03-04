---
layout: post
title:  "Оптимизация изображений: ускоряем сайт без потери качества"
name: "Эффективные способы оптимизации изображений"
description: "Как оптимизировать изображения для быстрой загрузки сайта: от&nbsp;ручных методов до&nbsp;автоматизации с&nbsp;Cloudinary. Практические советы по&nbsp;форматам и&nbsp;тегу picture."
date:   2018-10-02
last_modified_at: 2024-01-09
categories: инструкции
permalink: "/blog/optimizaciya-izobrajenii/"
tags: "инструменты"
image: /assets/images/tizers/tizer-50.jpg
keywords: "оптимизация изображений"
---

{% include post__header--update.html %}

<p>Скорость загрузки сайта была в&nbsp;числе моих основных приоритетов еще до&nbsp;настойчивых рекомендаций Google. Один из&nbsp;факторов, влияющих на&nbsp;скорость,&nbsp;— вес изображений. Меньше вес&nbsp;— браузер быстрее показывает страницу. <strong>Я&nbsp;пробовал разные способы оптимизации изображений и&nbsp;в&nbsp;результате выбрал несколько, которые использую сам и&nbsp;рекомендую другим.</strong> </p>

<nav class="toc">
 <h2 class="toc__title">Содержание</h2>
 <ul class="additive-spacing">
  <li>
   
      <span class="tocnumber">1 </span>
       <a class="link" href="#1">Стандартный подход к&nbsp;оптимизации изображений
    </a>
  </li>
  <li>
   
      <span class="tocnumber">2 </span>
       <a class="link" href="#2">Адаптация изображений для каждого устройства
    </a>
  </li>

      <li>
       
        <span class="tocnumber">3 </span>
         <a class="link" href="#3">Автоматизация и&nbsp;простота: инструменты для оптимизации
        </a>
      </li>
</ul>
</nav>


<section class="row-gap--m" id="1">
<h2 class="section__title h1 bold ">Стандартный подход к&nbsp;оптимизации изображений</h2>
<p>Перед публикацией фотографии на&nbsp;сайте я&nbsp;уменьшаю ее&nbsp;вес. Делаю это в&nbsp;графическом редакторе (Gimp + плагин «gimp-plugin-saveforweb») или <a class="link" href="https://imagecompressor.com/ru/">сервисе Optimizilla</a>. </p>

<span class="bold">Пример</span>
<div class="row">
<div class="c-5">
<img class="image" loading="lazy" decoding="async" src="/assets/images/blog/optimizaciya-izobrajenii/coin-optimizilla.jpg" alt="фотография монеты" width="300" height="298">
</div>
<div class="c-5">
<div class="small">оригинал, 300px*298px, 102.4&nbsp;КБ <br/>
автор фото&nbsp;— www.flickr.com/photos/simon50000/</div>
</div>
</div>

<div class="row">
<div class="c-5">
<img class="image" loading="lazy" decoding="async" src="/assets/images/blog/optimizaciya-izobrajenii/coin-optimizilla.jpg" alt="оптимизированная с помощью Gimp фотография монеты" width="300" height="298" >
</div>
<div class="c-5">
<div class="small">оптимизировано в&nbsp;Gimp, 32.4&nbsp;КБ <br />
открыл фото и&nbsp;сохранил для веб. настройки программы&nbsp;— по&nbsp;умолчанию</div>
</div>
</div>

<div class="row">
<div class="c-5">
<img class="image" loading="lazy" decoding="async" src="/assets/images/blog/optimizaciya-izobrajenii/coin-optimizilla.jpg" alt="оптимизированная с помощью Optimizilla фотография монеты" width="300" height="298" >
</div>
<div class="c-5">
<div class="small">оптимизировано в&nbsp;Optimizilla, 20.5&nbsp;КБ<br />
настройки онлайн сервиса&nbsp;— по&nbsp;умолчанию</div>
</div>
</div>

<p>Уменьшили размер фото&nbsp;— можно публиковать. В&nbsp;код html-страницы добавляем такую строку: </p>

<pre class="language-terminal highlight ">&lt;<span class="tag">img</span> src=<span class="attr-value">"путь к&nbsp;изображению"</span> alt=<span class="attr-value">"описание, что изображено"</span> width=<span class="attr-value">"ширина"</span> height=<span class="attr-value">"высота"</span> /&gt;</pre>




<p class="mb-m">Раньше этих действий было достаточно. Сейчас&nbsp;— нет. Назову три причины:</p>


<ul class="additive-spacing">
	<li class="list-li">
		<p>Иногда оптимизированные фото на&nbsp;«ретине» выглядят плохо → Для мобильных устройств и экранов с высокой плотностью пикселей важно предоставлять адаптивные изображения, которые сохраняют четкость и загружаются быстро. </p>
	</li>
	<li class="list-li additive-spacing">
		<p>Появился <a class="link" href="https://developers.google.com/speed/webp/" >формат изображений&nbsp;— WebP</a>, который делает вес фото еще меньше. Пока формат поддерживается не&nbsp;всеми браузерами → для браузеров, которые «видят» WebP, следует предлагать WebP, а&nbsp;остальным&nbsp;— другие форматы. </p>
    
    <p class="italic"><span class="bold">updated.</span> Сегодня <a class="link" href="https://caniuse.com/webp">WebP поддерживается всеми основными браузерами</a>, однако появляются новые форматы, такие как AVIF и&nbsp;JPEG&nbsp;XL, которые обещают вытеснить WebP. </p>
	</li>
	<li class="list-li">
		<p>Чтобы браузеры в&nbsp;смартфонах не&nbsp;отвлекались на&nbsp;адаптацию картинок под размер экрана, нужно предлагать картинки нужного размера сразу. Один размер для смартфонов, другой&nbsp;— для планшетов, третий&nbsp;— для десктопов.</p>
	</li>
</ul>

<p class="post__note">Вместо одной фотографии, одной строчки кода с&nbsp;адресом и&nbsp;описанием следует готовить набор фотографий (разного размера и&nbsp;формата) и&nbsp;указывать в&nbsp;html-коде условия, при которых должна показываться та&nbsp;или иная фотография из&nbsp;набора. Для каждого экрана должно загружаться наиболее релевантное изображение&nbsp;— нужного размера, формата и&nbsp;разрешения.</p>
</section>


<section class="row-gap--m" id="2">
<h2 class="section__title h1 bold ">Адаптация изображений для каждого устройства</h2>
<p>Принцип «каждому экрану свое изображение» можно реализовать с&nbsp;помощью плагинов: загружаем одну фотографию и&nbsp;плагин автоматически делает копии, меняет размеры и&nbsp;прописывает условия показа. Не&nbsp;нужно сосредотачиваться на&nbsp;технической составляющей работы сайта. Это плюс. </p>

<p>Минусы тоже есть. Во-первых, не&nbsp;все плагины написаны хорошо. Иногда можно здорово проиграть в&nbsp;производительности сайта. Во-вторых, некоторые задачи нельзя решить в&nbsp;автоматическом режиме. Например, кадрирование. Панорамная фотография хорошо смотрится на&nbsp;большом экране, но&nbsp;на&nbsp;смартфоне лучше показать только наиболее значимую часть фотографии. </p>

<p>Адаптировать изображения под разные устройства и&nbsp;требования поможет тег &lt;picture&gt;. </p>

<p>Если вы&nbsp;читаете статью со&nbsp;смартфона, ниже вы&nbsp;видите котенка, который спит, свернувшись калачиком. Если читаете с&nbsp;большого экрана&nbsp;— ваш кот зевает и&nbsp;потягивается. Еще есть кот, который сидит и&nbsp;смотрит на&nbsp;вас. Поэкспериментируете с&nbsp;гаджетами или размером окна браузера и&nbsp;убедитесь, что так и&nbsp;есть. </p>

<div itemprop="image" itemscope itemtype="https://schema.org/ImageObject">	
	<link itemprop="url" href="/assets/images/blog/optimizaciya-izobrajenii/kitten-large.png">
<picture>
  <source media="(min-width: 650px)" srcset="/assets/images/blog/optimizaciya-izobrajenii/kitten-large.png">
  <source media="(min-width: 465px)" srcset="/assets/images/blog/optimizaciya-izobrajenii/kitten-medium.png">
  <img class="image" loading="lazy" decoding="async" src="/assets/images/blog/optimizaciya-izobrajenii/kitten-small.png" alt="котенок, который меняется в зависимости от ширины экрана монитора" itemprop="contentUrl">
</picture>
<div class="figcaption">Пример взят <a class="link" href="https://cloudfour.com/examples/img-currentsrc/" >отсюда</a></div>
</div>

<p>А&nbsp;вот как это работает:</p>


<pre class="language-terminal highlight ">
&lt;<span class="tag">picture</span>&gt;<br />
    &lt;<span class="tag">source</span> media=<span class="attr-value">"(min-width: 650px)"</span> srcset=<span class="attr-value">"...kitten-large.png"</span> &gt;<br />
    &lt;<span class="tag">source</span> media=<span class="attr-value">"(min-width: 465px)"</span> srcset=<span class="attr-value">"...kitten-medium.png"</span> &gt;<br />
    &lt;<span class="tag">img</span> src=<span class="attr-value">"...kitten-small.png"</span> alt=<span class="attr-value">"кот"</span> &gt;<br />
&lt;/<span class="tag">picture</span>&gt;
</pre>


<p>Атрибут srcset указывает путь изображения для загрузки. Тег &lt;source&gt; и&nbsp;атрибут media указывают условия появления каждой из&nbsp;картинок. Если ширина экрана больше 650px, показывается зевающий кот, если от&nbsp;465px до&nbsp;650px&nbsp;— кот сидит. Если экран меньше 465px или если браузер не&nbsp;распознает тег &lt;picture&gt;, вы&nbsp;увидите спящего кота. </p>

<p>В&nbsp;блоге Opera есть <a class="link" href="https://dev.opera.com/articles/responsive-images/" >15&nbsp;примеров использования тега &lt;picture&gt;</a> (англ.). Я&nbsp;заглядываю туда как в&nbsp;шпаргалку по&nbsp;синтаксису: какой код нужен, чтобы для ретины загружать изображения с&nbsp;высоким разрешением, чтобы показывать разные фото для разных экранов, чтобы предлагать WebP там, где браузеры распознают этот формат, чтобы все эти условия указать разом для одного изображения. </p>



<div class="figure">
<div class="figcaption">
<span class="bold">updated</span>  Для желающих углубиться в&nbsp;тему Вадим Макеев рассказывает, как с&nbsp;помощью image-set можно подключать картинки разных типов и&nbsp;разрешения
</div>
 <div class="video ">
        <a class="video__link " href="https://youtu.be/VnjrIGvoO_Y" target="_blank" rel="noopener noreferrer">
            <picture>
                <source srcset="https://i.ytimg.com/vi_webp/VnjrIGvoO_Y/maxresdefault.webp" type="image/webp">
                <img loading="lazy" class="video__media " src="https://i.ytimg.com/vi/VnjrIGvoO_Y/maxresdefault.jpg" alt="Вадим Макеев рассказывает об image-set" width="1280" height="720"/>
            </picture>
            <span class="element--hidden">Видео: Макеев об image-set</span>
        </a>
        <button class="video__button" aria-label="Запустить видео">
            <svg width="68" height="48" viewBox="0 0 68 48"><path class="video__button-shape" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z"></path><path class="video__button-icon" d="M 45,24 27,14 27,34"></path></svg>
        </button>
</div>
</div>

</section>

<section class="row-gap--m" id="3">
<h2 class="section__title h1 bold ">Автоматизация и&nbsp;простота: инструменты для оптимизации</h2>

<p>С&nbsp;тегом &lt;picture&gt; код картинки занимает иногда более 10&nbsp;строк, не&nbsp;говоря уже о&nbsp;том, что нужно вручную подготовить несколько вариантов изображения. Если писать <span class="noperenos">1-2</span> статьи в&nbsp;месяц, это необременительно. А&nbsp;если у&nbsp;вас <a class="link" href="/blog/klientskij-opyt-v-ecommerce/">интернет-магазин</a> с&nbsp;тысячей наименований и&nbsp;соответствующим количеством фотографий? </p>

<p>Однажды я&nbsp;верстал фотогалерею в&nbsp;flexbox. В&nbsp;зависимости от&nbsp;размера экрана ширина фотографий могла занимать любое значение от&nbsp;250px до&nbsp;1200px. Этот диапазон я&nbsp;разбил на&nbsp;интервалы и&nbsp;для каждого подготовил свое изображение со&nbsp;своим размером и&nbsp;форматом. Большой объем ручной работы + неидеальный результат (часто требуемая ширина картинки не&nbsp;совпадала с&nbsp;имеющейся, что расстраивало гугловский pagespeed insight)&nbsp;— все это вынудило меня искать другое решение. И&nbsp;я&nbsp;его нашел&nbsp;— <a class="link" href="https://cloudinary.com/invites/lpov9zyyucivvxsnalc5/wtgfrafckbpng93fntsg?t=default">Cloudinary</a>. </p>

<p>C&nbsp;Cloudinary работа по&nbsp;оптимизации изображений сводится к&nbsp;корректировке адреса картинки, загруженной в&nbsp;облако сервиса. Поясню на&nbsp;примере. Давайте войдем в&nbsp;Cloudinary, добавим фотографию монеты из&nbsp;примера выше и&nbsp;скопируем url картинки. </p>

<img class="image" loading="lazy" decoding="async" src="//res.cloudinary.com/bartoshevich/image/upload/q_auto,f_auto/v1538445318/copy_cloudinary.jpg" alt="пример работы с Cloudinary" width="519" height="478"/>


<p>Адрес фото:</p>

<div class="highlight">
<pre class="language-terminal highlight">
//res.cloudinary.com/bartoshevich/image/upload/v1538423803/coin_original.jpg
</pre>
</div>

<p>Все, что требуется,&nbsp;— это после upload/ в&nbsp;адресе добавить q_auto,f_auto/. Новый адрес:</p>


<pre class="language-terminal highlight ">
//res.cloudinary.com/bartoshevich/image/upload/q_auto,f_auto/v1538423803/coin_original.jpg
</pre>


<p>На&nbsp;этом работа по&nbsp;оптимизации картинки завершена. Сервис автоматически изменит качество и&nbsp;формат изображения в&nbsp;зависимости от&nbsp;экрана, на&nbsp;котором открывают адрес картинки. Не&nbsp;нужно готовить много вариантов изображения, прописывать условия для «ретины» и&nbsp;WebP. Все это уже «зашито» в&nbsp;адресе. Код картинки снова умещается в&nbsp;одну строку. </p>

<p>Ниже — оптимизированная с&nbsp;помощью Cloudinary фотография монеты. Если вы&nbsp;откроете статью в&nbsp;разных браузерах (Firefox и&nbsp;Chrome) и&nbsp;сохраните фото, вы&nbsp;получите фотографии разных форматов и&nbsp;веса. У&nbsp;меня скачанная с&nbsp;Chrome фотография весит всего 10.9&nbsp;КБ&nbsp;— почти в&nbsp;10&nbsp;раз меньше оригинала. Код&nbsp;же&nbsp;— одна строка. Нет &lt;picture&gt;, &lt;source&gt;, media и&nbsp;пр. </p>

<img class="image" loading="lazy" decoding="async" src="https://res.cloudinary.com/bartoshevich/image/upload/q_auto,f_auto/v1538423803/coin_original.jpg" alt="оптимизированная с помощью Optimizilla фотография монеты" width="300" height="298" >
<p>Сотрудники Cloudinary подготовили <a class="link" href="https://cloudinary.com/cookbook">Cookbook</a>, где описывают возможности сервиса: что можно добавить в&nbsp;адрес изображения и&nbsp;какой результат получить. Например, можно улучшить фотографию, если после upload/ написать в&nbsp;адресе e_improve/. Результат:</p>

<img class="image" loading="lazy" decoding="async" src="https://res.cloudinary.com/bartoshevich/image/upload/e_improve/q_auto,f_auto/v1538423803/coin_original.jpg" alt="оптимизированная с помощью Optimizilla фотография монеты" width="300" height="298" >

<p>Иногда я&nbsp;не&nbsp;могу обходиться без тега &lt;picture&gt;. И&nbsp;если тег комбинирую с&nbsp;Cloudinary, «пропуская» адреса изображений через сервис, я&nbsp;использую больше возможностей оптимизации при минимальных усилиях. </p>

</section>