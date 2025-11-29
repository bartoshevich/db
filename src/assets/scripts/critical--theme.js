
(function () {
  const STORAGE_KEY = 'theme-preference';
  const ALLOWED_THEMES = ['light', 'dark'];

  const getSystemTheme = () => {
       if (!window.matchMedia) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  };

  const getStoredTheme = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
       if (ALLOWED_THEMES.includes(stored)) {
        return stored;
      }
      return null;
    } catch {
      return null;
    }
  };

  const theme = getStoredTheme() ?? getSystemTheme();
  document.documentElement.dataset.theme = theme;
})();
