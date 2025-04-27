// @license magnet:?xt=urn:btih:d3d9a9a6595521f9666a5e94cc830dab83b65699&dn=expat.txt Expat
// Copyright (C) 2022 Adam Argyle - https://web.dev/building-a-theme-switch-component/

const storageKey = "theme-preference";

const getColorPreference = () => 
  localStorage.getItem(storageKey) ? 
    localStorage.getItem(storageKey) : 
    window.matchMedia("(prefers-color-scheme: dark)").matches ? 
      "dark" : "light";

// Установка начального значения
const theme = { value: getColorPreference() };

const onClick = () => {
  theme.value = theme.value === "light" ? "dark" : "light";
  setPreference();
};

const setPreference = () => {
  localStorage.setItem(storageKey, theme.value);
  reflectPreference();
};

const reflectPreference = () => {
  document.firstElementChild.setAttribute("data-theme", theme.value);
  const themeToggle = document.querySelector("#theme-toggle");
  if (themeToggle) {
    themeToggle.setAttribute(
      "aria-label",
      theme.value === "dark" ? "Переключить на светлую тему" : "Переключить на тёмную тему"
    );
  }
};

// Отражение предпочтения сразу при загрузке скрипта
reflectPreference();

// Настройка обработчиков событий при загрузке страницы
window.onload = () => {
  reflectPreference();
  const themeToggle = document.querySelector("#theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", onClick);
  }
};

// Слушатель изменений системных предпочтений
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ({ matches: e }) => {
  theme.value = e ? "dark" : "light";
  setPreference();
});
// @license-end

