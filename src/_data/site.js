export default {
    
    url: "https://bartoshevich.by", 
    title: "Системный маркетинг и брендинг в Минске | Дмитрий Бартошевич",
    description: "Превращаю хаотичный маркетинг в системную стратегию роста в Беларуси. 20+ лет опыта в разработке концепций бренда, рекламных кампаний и маркетинговом аудите.",

    // --- Глобальные схемы Schema.org ---
    schemaOrg: {
      organization: {
        
        "@id": "https://bartoshevich.by/#service",
        "@type": "ProfessionalService",
        "name": "Консультант по маркетингу и стратегии (ИП Бартошевич Дмитрий)",
        "legalName": "ИП Бартошевич Дмитрий Александрович",
        "url": "https://bartoshevich.by/",
        "logo": "https://res.cloudinary.com/bartoshevich/image/upload/v1645366318/site/bartoshevich_1x.jpg",
        "telephone": "+375297753340",
        "foundingDate": "2015",
        "openingHours": "Mo-Fr 09:00-18:00",
        "paymentAccepted": ["Банковский перевод"],
        "image": [
          "https://bartoshevich.by/assets/images/main/bartoshevich@16x9.jpg",
          "https://bartoshevich.by/assets/images/main/bartoshevich@4x3.jpg",
          "https://bartoshevich.by/assets/images/main/bartoshevich@1x1.jpg"
        ],
        "founder": { "@id": "https://bartoshevich.by/about/#person" },
        "employee": { "@id": "https://bartoshevich.by/about/#person" },
        "description": "Трансформирую хаотичный маркетинг в системную стратегию роста. Концепция бренда, маркетинговый аудит, брендинг в Минске и Беларуси. Консультант с 20+ летним опытом.",
        "areaServed": [
          { "@type": "Country", "name": "Беларусь", "alternateName": "BY" },
          { "@type": "Country", "name": "Казахстан", "alternateName": "KZ" }
        ],
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "г. Минск, ул. Ольшевского, 22",
          "addressLocality": "Фрунзенский район",
          "addressRegion": "Минск",
          "postalCode": "220073",
          "addressCountry": "BY"
        },
        "contactPoint": [
          {
            "@type": "ContactPoint",
            "telephone": "+375297753340",
            "email": "dmitry@bartoshevich.by",
            "contactType": "customer support",
            "areaServed": "BY",
            "availableLanguage": ["be", "en", "ru"]
          }
        ],
        "priceRange": "$$",
        "sameAs": [
          "https://www.facebook.com/bartoshevichby/",
          "https://www.linkedin.com/in/bartoshevich",
          "https://mastodon.social/@bartoshevich",
          "https://t.me/+OuzxNOZg-g44ZjYy"
        ],
       "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "5",
          "bestRating": "5",
          "worstRating": "1",
          "ratingCount": "11"
        },
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Маркетинговые услуги",
          "itemListElement": [
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Аудит маркетинга",
                "description": "Аудит маркетинга с фокусом на CJM. Независимый анализ потребительского опыта клиентов, выявление слабых мест, рекомендации для роста вашего бизнеса.",
                "url": "https://bartoshevich.by/uslugi/marketing-audit/"
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Разработка концепции бренда",
                "description": "Разработка концепции бренда: точное позиционирование, которое выделит вас на рынке. Усилю ваше конкурентное преимущество и привлекательность для клиентов.",
                "url": "https://bartoshevich.by/uslugi/brand-conception/"
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Разработка рекламных кампаний",
                "description": "Закажите разработку рекламной кампании в Минске. ⭐ Креативные стратегии, уникальные концепции и мощные маркетинговые решения от Дмитрия Бартошевича.",
                "url": "https://bartoshevich.by/uslugi/razrabotka-reklamnyh-kampanij/"
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Абонентское обслуживание",
                "description": "Профессиональный маркетинг-менеджмент без содержания штата. Полный цикл: от стратегии до управления подрядчиками. Доверьте маркетинг эксперту!",
                "url": "https://bartoshevich.by/uslugi/autsorsing-marketinga/"
              }
            }
          ]
        }
      },
      person: {
       
        "@id": "https://bartoshevich.by/about/#person",
        "@type": "Person",
        "name": "Дмитрий Бартошевич",
        "alternateName": "Дмитрий Барташевич",
        "url": "https://bartoshevich.by/about/",
        "image": "https://bartoshevich.by/assets/images/main/bartoshevich@1x1.jpg",
        "description": "Эксперт по маркетингу и развитию брендов с 20+ летним опытом",
        "jobTitle": ["Консультант по маркетингу и стратегии", "Директор"],
        "worksFor": [
          { "@id": "https://bartoshevich.by/#service" },
          { "@type": "Organization", "name": "Агентство маркетинговых решений BARSAN", "url": "https://barsan.kz" }
        ],
        "knowsAbout": [
          "Маркетинговая стратегия",
          "Брендинг",
          "Маркетинговый аудит",
          "Концепция бренда",
          "Рекламные кампании",
          "Абонентское маркетинговое обслуживание"
        ],
        "alumniOf": [
          { "@type": "EducationalOrganization", "name": "Белорусский государственный университет", "url": "https://bsu.by/" },
          { "@type": "EducationalOrganization", "name": "Белорусский государственный экономический университет", "url": "https://bseu.by/" }
        ]
      },
      webSite: {
       
        "@id": "https://bartoshevich.by/#website",
        "@type": "WebSite",
        "url": "https://bartoshevich.by/",
        "name": "Системный маркетинг и брендинг в Минске | Дмитрий Бартошевич",
        "description": "Превращаю хаотичный маркетинг в системную стратегию роста в Беларуси. 20+ лет опыта в разработке концепций бренда, рекламных кампаний и маркетинговом аудите.",
        "inLanguage": "ru",
        "datePublished": "2015-05-11",
        "author": { "@id": "https://bartoshevich.by/about/#person" },
        "publisher": { "@id": "https://bartoshevich.by/#service" },
        "mainEntity": { "@id": "https://bartoshevich.by/#service" }
      },
      specialAnnouncement: {
        
        "@type": "SpecialAnnouncement",
        "name": "Прохождение оценки Европейским банком реконструкции и развития",
        "datePosted": "2019-04-22T08:00",
        "expires": "2064-03-24T23:59",
        "text": "Прошел оценку Европейского банка реконструкции и развития на соответствие оказываемых маркетинговых услуг определенным  критериям качества и надежности.",
        "announcementLocation": {
          "@type": "ProfessionalService",
          "@id": "https://bartoshevich.by/#service"
        }
      }
    }
   };