

    (function () {
      const storageKey = 'theme-preference';
      const getColorPreference = () => {
        const stored = localStorage.getItem(storageKey);
        if (stored) 
          return stored;
        return window
          .matchMedia('(prefers-color-scheme: dark)')
          .matches
            ? 'dark'
            : 'light';
      };
      const theme = getColorPreference();
      // Устанавливаем атрибут data-theme на <html> как можно раньше
      document
        .documentElement
        .setAttribute('data-theme', theme);
    })();
 
