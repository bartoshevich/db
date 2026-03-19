/* #### MENU #### */
(() => {
  const menuList = document.querySelector('.menu__header');
  const menuButton = document.querySelector('.menu__button');

  if (!menuButton || !menuList) return;

  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])'
  ].join(',');

  const getFocusableElements = () =>
    Array.from(menuList.querySelectorAll(focusableSelector)).filter(
      (element) => !element.hasAttribute('hidden') && element.offsetParent !== null
    );

  const openMenu = () => {
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.classList.add('menu__button--open');
    menuList.classList.add('menu__header--open');

    const [firstFocusable] = getFocusableElements();
    if (firstFocusable) firstFocusable.focus();
  };

  const closeMenu = ({ returnFocus = false } = {}) => {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.classList.remove('menu__button--open');
    menuList.classList.remove('menu__header--open');

    if (returnFocus) menuButton.focus();
  };

  const toggleMenu = () => {
    const expanded = menuButton.getAttribute('aria-expanded') === 'true';
    if (expanded) {
      closeMenu({ returnFocus: true });
    } else {
      openMenu();
    }
  };

  menuButton.addEventListener('click', toggleMenu);

  menuButton.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (menuButton.getAttribute('aria-expanded') !== 'true') return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu({ returnFocus: true });
      return;
    }

    if (event.key === 'Tab') {
      const focusableElements = getFocusableElements();
      if (!focusableElements.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const isShift = event.shiftKey;

      if (isShift && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!isShift && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  });

  window.addEventListener('click', (event) => {
    if (
      !event.target.closest('.menu__header') &&
      !event.target.closest('.menu__button') &&
      menuButton.getAttribute('aria-expanded') === 'true'
    ) {
      closeMenu();
    }
  });
})();
