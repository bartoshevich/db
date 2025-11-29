
(function () {
  const STORAGE_KEY = 'theme-preference';
  const ALLOWED_THEMES = ['light', 'dark'];

  const getSystemTheme = () => {
    // оператор ?. на случай старых браузеров без matchMedia
    if (!window.matchMedia) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  };

  const getStoredTheme = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // возвращаем только корректные значения
      if (ALLOWED_THEMES.includes(stored)) {
        return stored;
      }
      return null;
    } catch {
      // если localStorage недоступен — просто игнорируем
      return null;
    }
  };

  const theme = getStoredTheme() ?? getSystemTheme();

  // то же самое, только через dataset
  document.documentElement.dataset.theme = theme;
})();
