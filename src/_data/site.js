const knowledgeAreas = [
  "Маркетинговая стратегия",
  "Психология потребителя",
  "Теория брендинга",
  "Customer Journey Mapping",
  "Архитектура бренда",
  "B2B-брендинг",
  "Бренд-архетипы",
  "Контент-стратегии",
  "Коммуникационные стратегии",
  "Этический маркетинг"
];

const practicalSkills = [
  "Разработка маркетинговых стратегий",
  "Маркетинговый аудит",
  "Разработка концепции бренда",
  "Разработка и позиционирование брендов",
  "Разработка рекламных кампаний",
  "Управление брендинговыми проектами",
  "Анализ конкурентов",
  "Проведение маркетинговых исследований",
  "Управление аутсорсингом подрядчиков"
];

export default {
  url: "https://bartoshevich.by", title: "Системный маркетинг и брендинг | Персональный сайт Дмитрия Бартошевича", description: "Экспертный блог и портфолио Дмитрия Бартошевича, основателя агентства BARSAN. 20+ лет опыта в разработке концепций бренда, рекламных кампаний и маркетинговом аудите.",

  // --- Глобальные схемы Schema.org ---
  schemaOrg: {
    person: {
      "@type": "Person",
      "@id": "https://bartoshevich.by/about/#person",
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": "https://bartoshevich.by/about/"
      },
      name: "Дмитрий Бартошевич",
      alternateName: "Дмитрий Барташевич",
      url: "https://bartoshevich.by/about/",
      image: {
        "@type": "ImageObject",
        url: "https://bartoshevich.by/assets/images/main/bartoshevich@1x1.jpg",
        width: 1200,
        height: 1200
      },
      description: "Эксперт по маркетинговой стратегии и архитектуре брендов с 20+ летним опытом. Основатель агентства маркетинговых решений BARSAN.",
      email: "mailto:dmitry@bartoshevich.by",
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "personal communication",
          email: "mailto:dmitry@bartoshevich.by",
          url: "https://t.me/bartoshevich"
        }, 
        {
          "@type": "ContactPoint",
          contactType: "commercial project",
          url: "https://barsan.kz/contacts/",
          description: "Для коммерческих запросов и сотрудничества, пожалуйста, обращайтесь через агентство BARSAN."
        }
      ],
      jobTitle: "Основатель и директор | Founder & CEO",
      worksFor: {
        "@id": "https://barsan.kz#organization"
      },
      award: ["Преквалификация консультанта по маркетингу (ЕБРР)"],
      subjectOf: [
        {
          "@type": "ItemList",
          name: "Ключевые проекты Дмитрия Бартошевича",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              item: {
                "@id": "https://bartoshevich.by/blog/razrabotka-koncepcii-brenda-hormann/"
              }
            }, {
              "@type": "ListItem",
              position: 2,
              item: {
                "@id": "https://bartoshevich.by/blog/brand-strategy-flex-n-roll/"
              }
            }, {
              "@type": "ListItem",
              position: 3,
              item: {
                "@id": "https://bartoshevich.by/blog/pes-global-brand-concept/"
              }
            }, {
              "@type": "ListItem",
              position: 4,
              item: {
                "@id": "https://bartoshevich.by/blog/kejs-brend-giperlink/"
              }
            }, {
              "@type": "ListItem",
              position: 5,
              item: {
                "@id": "https://bartoshevich.by/blog/spam-replacement/"
              }
            }
          ]
        }, {
          "@type": "Article",
          name: "Неадекваты и «холодная шаурма»: как работать с проблемными клиентами",
          headline: "Неадекваты и «холодная шаурма»: как работать с проблемными клиентами",
          url: "https://probusiness.io/management/4239-neadekvaty-ikholodnaya-shaurma-kak-rabotat-sproblemnymi-klientami.html",
          author: {
            "@id": "https://bartoshevich.by/about/#person"
          },
          publisher: {
            "@type": "Organization",
            name: "Про Бизнес",
            url: "https://probusiness.io/"
          }
        }, {
          "@type": "Article",
          name: "Как взглянуть на работу компании глазами клиентов, чтобы повысить продажи: методика Customer Journey Mapping",
          headline: "Как взглянуть на работу компании глазами клиентов, чтобы повысить продажи: методика Customer Journey Mapping",
          url: "https://probusiness.io/tech/2150-kak-vzglyanut-na-rabotu-kompanii-glazami-klientov-chtoby-povysit-prodazhi-metodika-customer-journey-mapping.html",
          author: {
            "@id": "https://bartoshevich.by/about/#person"
          },
          publisher: {
            "@type": "Organization",
            name: "Про Бизнес",
            url: "https://probusiness.io/"
          }
        }, {
          "@type": "Article",
          name: "Эти элементарные ошибки на сайтах мешают компаниям привлекать иностранных клиентов: пример агроусадеб",
          headline: "Эти элементарные ошибки на сайтах мешают компаниям привлекать иностранных клиентов: пример агроусадеб",
          url: "https://probusiness.io/tech/2323-eti-elementarnye-oshibki-na-saytakh-meshayut-kompaniyam-privlekat-klientov-inostrancev-primer-agrousadeb.html",
          author: {
            "@id": "https://bartoshevich.by/about/#person"
          },
          publisher: {
            "@type": "Organization",
            name: "Про Бизнес",
            url: "https://probusiness.io/"
          }
        }, {
          "@type": "Article",
          name: "Не ставьте телегу впереди лошади — вещи, которые обязательно должен знать и делать маркетолог",
          headline: "Не ставьте телегу впереди лошади — вещи, которые обязательно должен знать и делать маркетолог",
          url: "https://probusiness.io/do_it/2445-ne-stavte-telegu-vperedi-loshadi-veshchi-kotorye-obyazatelno-dolzhen-znat-i-delat-marketolog.html",
          author: {
            "@id": "https://bartoshevich.by/about/#person"
          },
          publisher: {
            "@type": "Organization",
            name: "Про Бизнес",
            url: "https://probusiness.io/"
          }
        }, {
          "@type": "Article",
          name: "В «Черную пятницу» скидки будут у многих — чем выделиться на фоне конкурентов",
          headline: "В «Черную пятницу» скидки будут у многих — чем выделиться на фоне конкурентов",
          url: "https://probusiness.io/management/2778-v-chernuyu-pyatnicu-skidki-budut-u-mnogikh-chem-vydelitsya-na-fone-konkurentov.html",
          author: {
            "@id": "https://bartoshevich.by/about/#person"
          },
          publisher: {
            "@type": "Organization",
            name: "Про Бизнес",
            url: "https://probusiness.io/"
          }
        }, {
          "@type": "Article",
          name: "Бренд и перформанс-маркетинг: что важно знать маркетологу",
          headline: "Бренд и перформанс-маркетинг: что важно знать маркетологу",
          url: "https://wunder-digital.kz/brend-i-perfomans-marketing-chto-vazhno-znat-marketologu/",
          sameAs: ["https://wunder-digital.by/brend-i-perfomans-marketing-chto-vazhno-znat-marketologu/"],
          author: {
            "@id": "https://bartoshevich.by/about/#person"
          },
          publisher: {
            "@type": "Organization",
            name: "Wunder Digital"
          }
        }
      ],

      owns: [
        {
          "@id": "https://barsan.kz/#organization"
        }
      ],
      hasOccupation: [
        {
          "@type": "Occupation",
          name: "Маркетинговый стратег",
          occupationalCategory: {
            "@type": "CategoryCode",
            codeValue: "11-2021.00",
            inCodeSet: "https://www.onetonline.org/"
          },
          description: "Разработка долгосрочных маркетинговых стратегий, позиционирования бренда и системный аудит для роста бизнеса.",
          occupationLocation: [
            {
              "@type": "Country",
              name: "Казахстан",
              sameAs: "https://en.wikipedia.org/wiki/Kazakhstan"
            }, {
              "@type": "Country",
              name: "Беларусь",
              sameAs: "https://en.wikipedia.org/wiki/Belarus"
            }
          ]
        }, {
          "@type": "Occupation",
          name: "Бренд-консультант",
          occupationalCategory: {
            "@type": "CategoryCode",
            codeValue: "11-2021.00",
            inCodeSet: "https://www.onetonline.org/"
          },
          description: "Консультирование по вопросам создания и управления архитектурой бренда для повышения его капитализации и конкурентоспособности."
        }
      ],
      knowsAbout: knowledgeAreas,
      skills: practicalSkills,

      alumniOf: [
        {
          "@type": "EducationalOrganization",
          name: "Белорусский государственный университет",
          url: "https://bsu.by/"
        }, {
          "@type": "EducationalOrganization",
          name: "Белорусский государственный экономический университет",
          url: "https://bseu.by/"
        }, {
          "@type": "Organization",
          name: "Nielsen",
          sameAs: "https://en.wikipedia.org/wiki/Nielsen_Company"
        }, {
          "@type": "Organization",
          name: "Aida Pioneer",
          url: "https://aidapioneer.com/"
        }
      ],
      sameAs: [
        "https://www.linkedin.com/in/bartoshevich/", "https://mastodon.social/@bartoshevich", "https://www.facebook.com/dmitry.bartoshevich", "https://t.me/+OuzxNOZg-g44ZjYy", "https://barsan.kz/about-us#bartoshevich"
      ],

      hasCredential: [
        {
          "@type": "EducationalOccupationalCredential",
          credentialCategory: "higher education",
          name: "Психология",
          educationalLevel: "university",
          recognizedBy: {
            "@type": "CollegeOrUniversity",
            name: "БГУ",
            url: "https://bsu.by/"
          }
        }, {
          "@type": "EducationalOccupationalCredential",
          credentialCategory: "higher education",
          name: "Бизнес-администрирование",
          educationalLevel: "university",
          recognizedBy: {
            "@type": "CollegeOrUniversity",
            name: "БГЭУ",
            url: "https://bseu.by/"
          }
        }, {
          "@type": "EducationalOccupationalCredential",
          name: "Оценка соответствия услуг критериям качества ЕБРР",
          credentialCategory: "professional assessment",
          datePublished: "2019-04-22T08:00:00+03:00",
          recognizedBy: {
            "@type": "Organization",
            name: "ЕБРР",
            url: "https://www.ebrd.com/"
          }
        }
      ]
    },

    brandOrganization: {
      "@type": "Organization",
      "@id": "https://bartoshevich.by/#organization",
      name: "bartoshevich.by",
      logo: {
        "@type": "ImageObject",
        "@id": "https://bartoshevich.by/#logo",
        url: "https://bartoshevich.by/assets/images/logo/bartoshevich@1x1.jpg",
        width: 1200,
        height: 1200
      },
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "editorial",
          email: "mailto:dmitry@bartoshevich.by",
          availableLanguage: ["ru", "be", "en"]
        }
      ]
    },
    webSite: {
      "@type": "WebSite",
      "@id": "https://bartoshevich.by/#website",
      url: "https://bartoshevich.by/",
      name: "Персональный сайт и блог Дмитрия Бартошевича",
      description: "Экспертный блог и база знаний Дмитрия Бартошевича, основателя BARSAN Agency (KZ). Статьи и кейсы по системному маркетингу, стратегии и архитектуре бренда. 20+ лет опыта, преквалификация ЕБРР.",
      inLanguage: "ru",
      datePublished: "2015-05-11",
      author: {
        "@id": "https://bartoshevich.by/about/#person"
      },
      publisher: {
        "@id": "https://bartoshevich.by/#organization"
      },
      editor: {
        "@id": "https://bartoshevich.by/about/#person"
      }
    },
    barsanOrganization: {
      "@type": [
        "Organization", "ProfessionalService"
      ],
      "@id": "https://barsan.kz#organization",
      name: "Агентство маркетинговых решений BARSAN",
      alternateName: [
        "BARSAN Agency", "БАРСАН"
      ],
      legalName: "ТОО «Агентство маркетинговых решений BARSAN»",
      url: "https://barsan.kz/",
      foundingDate: "2024-01-05",
      priceRange: "$$",
      telephone: "+77783193022",
      logo: {
        "@type": "ImageObject",
        url: "https://barsan.kz/img/logo.svg",
        width: 217,
        height: 47,
        encodingFormat: "image/svg+xml"
      },
      image: {
        "@type": "ImageObject",
        url: "https://res.cloudinary.com/bartoshevich/image/upload/q_auto,f_auto/v1760212197/barsan/tizers/agency.jpg",
        contentUrl: "https://res.cloudinary.com/bartoshevich/image/upload/q_auto,f_auto/v1760212197/barsan/tizers/agency.jpg",
        width: 1200,
        height: 630
      },
      founder: {
        "@id": "https://bartoshevich.by/about/#person"
      },
      address: {
        "@type": "PostalAddress",
        streetAddress: "Сыганак, 54А",
        addressLocality: "Astana",
        postalCode: "010000",
        addressCountry: "KZ",
        addressRegion: "Astana"
      },
      areaServed: ["KZ", "BY"]
    }
  }
};
