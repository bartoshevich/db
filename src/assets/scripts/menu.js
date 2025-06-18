/* #### MENU #### */
(() => {
  const menuList = document.querySelector(".menu__header");
  const menuButton = document.querySelector(".menu__button");

  if (!menuButton || !menuList) return;

  const mobileMenu = () => {
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", !expanded);

    menuButton.classList.toggle("menu__button--open", !expanded);
    menuList.classList.toggle("menu__header--open", !expanded);
  };

  menuButton.addEventListener("click", mobileMenu);

  menuButton.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      mobileMenu();
    }
  });

  window.addEventListener("click", (event) => {
    if (
      !event.target.closest(".menu__header") &&
      !event.target.closest(".menu__button")
    ) {
      if (menuButton.getAttribute("aria-expanded") === "true") {
        menuButton.setAttribute("aria-expanded", "false");
      }
      menuList.classList.remove("menu__header--open");
      menuButton.classList.remove("menu__button--open");
    }
  });
})();
