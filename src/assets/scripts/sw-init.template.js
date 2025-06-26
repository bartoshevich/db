// src/assets/scripts/sw-init.template.js
// Service Worker инициализация с поддержкой CSP хэширования

(function() {
  'use strict';
  
  // =================================================================
  // ПРОВЕРКИ СОВМЕСТИМОСТИ И ОКРУЖЕНИЯ
  // =================================================================
  
  if (!('serviceWorker' in navigator)) {
    console.warn('SW: navigator.serviceWorker не поддерживается');
    return;
  }
  
  // Development mode protection
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '8080';

  if (isDevelopment) {
    console.log('🚧 SW: Development mode detected, registration skipped');
    return;
  }
  
  // Deploy preview protection (Netlify)
  const isDeployPreview = window.location.hostname.includes('deploy-preview') ||
                         window.location.hostname.includes('branch-deploy'); 
                       

  if (isDeployPreview) {
    console.log('🚧 Deploy preview detected, SW registration skipped');
    return;
  }
  
  // Graceful degradation для sessionStorage
  let hasSessionStorage = false;
  try {
    hasSessionStorage = !!window.sessionStorage;
    if (hasSessionStorage) {
      sessionStorage.setItem('sw-test', 'test');
      sessionStorage.removeItem('sw-test');
    }
  } catch (e) {
    hasSessionStorage = false;
    console.warn('SW: sessionStorage недоступен, сохранение позиции отключено');
  }
  
  // iOS Safari private mode detection
  function checkiOSPrivateMode() {
    try {
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        sessionStorage.setItem('ios-test', '1');
        sessionStorage.removeItem('ios-test');
        return false;
      }
    } catch (e) {
      console.warn('SW: iOS Private Mode detected, некоторые функции недоступны');
      return true;
    }
    return false;
  }
  
  const isIOSPrivate = checkiOSPrivateMode();
  if (isIOSPrivate) {
    hasSessionStorage = false;
  }

  // =================================================================
  // КОНФИГУРАЦИЯ
  // =================================================================

  const CONFIG = {
    updateCheckInterval: {{UPDATE_CHECK_INTERVAL}},
    bannerAutoHideDelay: {{BANNER_AUTO_HIDE_DELAY}},
    scrollSaveKey: '{{SCROLL_SAVE_KEY}}',
    bannerId: '{{BANNER_ID}}'
  };

  const STRINGS = {{SW_STRINGS}};

  // =================================================================
  // СОСТОЯНИЕ
  // =================================================================

  let registration = null;
  let isRefreshing = false;
  let lastUpdateCheck = 0;
  let bannerTimer = null;
  let visibilityChangeTimeout = null;

  // =================================================================
  // UTILITY ФУНКЦИИ
  // =================================================================

  // Network quality detection
  function getNetworkQuality() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (!connection) return 'unknown';
    
    if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
      return 'slow';
    }
    
    if (connection.effectiveType === '3g') {
      return 'medium';
    }
    
    return 'fast';
  }
  
  // Battery awareness
  async function shouldRespectBattery() {
    if (!('getBattery' in navigator)) return false;
    
    try {
      const battery = await navigator.getBattery();
      return battery.level < 0.2 && !battery.charging;
    } catch (e) {
      return false;
    }
  }
  
  // Memory pressure detection
  function handleMemoryPressure() {
    if (performance.memory) {
      const memoryRatio = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
      
      if (memoryRatio > 0.8) {
        console.warn('🧠 SW: High memory usage detected');
        dismissBanner();
        CONFIG.updateCheckInterval *= 2;
        return true;
      }
    }
    
    return false;
  }
  
  // Thermal state monitoring
  function checkThermalState() {
    if ('thermal' in navigator) {
      navigator.thermal.addEventListener('statechange', (event) => {
        const thermalState = event.target.state;
        
        if (thermalState === 'serious' || thermalState === 'critical') {
          console.log('🌡️ SW: Device overheating, reducing activity');
          CONFIG.updateCheckInterval *= 3;
          
          if (bannerTimer) {
            clearTimeout(bannerTimer);
            bannerTimer = null;
          }
        }
      });
    }
  }

  // =================================================================
  // SW CORE ЛОГИКА
  // =================================================================

  async function initServiceWorker() {
    // Проверяем нет ли уже активной регистрации
    const existingRegistration = await navigator.serviceWorker.getRegistration('/sw.js');
    
    if (existingRegistration) {
      console.log('✅ SW: Using existing registration');
      registration = existingRegistration;
    } else {
      try {
        registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ SW registered:', registration.scope);
      } catch (error) {
        console.error('❌ SW registration failed:', error);
        return;
      }
    }
    
    console.log('🔍 SW controller:', navigator.serviceWorker.controller);
    setupEventListeners();
    checkThermalState();
  }

  function setupEventListeners() {
    if (!registration) return;

    registration.addEventListener('updatefound', handleUpdate);
    
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 SW controller changed:', navigator.serviceWorker.controller);
      if (!isRefreshing) {
        isRefreshing = true;
        window.location.reload();
      }
    });

    // Debounced проверка обновлений с учетом Safari throttling
    document.addEventListener('visibilitychange', () => {
      if (visibilityChangeTimeout) {
        clearTimeout(visibilityChangeTimeout);
      }
      
      const delay = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) ? 2000 : 500;
      
      visibilityChangeTimeout = setTimeout(() => {
        if (!document.hidden && shouldCheckForUpdates()) {
          checkForUpdates();
        }
      }, delay);
    });
  }

  function shouldCheckForUpdates() {
    const now = Date.now();
    const timeSinceLastCheck = now - lastUpdateCheck;
    
    if (!navigator.onLine) {
      console.log('🌐 SW: Offline, skipping update check');
      return false;
    }
    
    // На медленных сетях проверяем реже
    const networkQuality = getNetworkQuality();
    const minInterval = networkQuality === 'slow' ? 
      CONFIG.updateCheckInterval * 2 : CONFIG.updateCheckInterval;
    
    return timeSinceLastCheck >= minInterval;
  }

  async function checkForUpdates() {
    if (!registration) return;
    
    if (await shouldRespectBattery()) {
      console.log('🔋 Low battery, skipping SW update check');
      return;
    }
    
    lastUpdateCheck = Date.now();
    console.log('🔍 SW: Checking for updates...');
    
    registration.update().catch(error => {
      console.warn('⚠️ SW update check failed:', error);
    });
  }

  function handleUpdate() {
    const newWorker = registration.installing;
    if (!newWorker) return;

    console.log('🆕 SW: Update found');
    
    newWorker.addEventListener('statechange', () => {
      console.log('🔄 SW state changed:', newWorker.state);
      
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log('✨ SW: New version ready');
        showUpdateBanner();
      }
    });
  }

  // =================================================================
  // UI ЛОГИКА
  // =================================================================

  function showUpdateBanner() {
    if (handleMemoryPressure()) {
      console.log('🧠 SW: Skipping banner due to memory pressure');
      return;
    }
    
    if (document.getElementById(CONFIG.bannerId)) {
      console.log('⚠️ SW: Banner already exists');
      return;
    }

    const banner = createBannerElement();
    const { updateBtn, dismissBtn } = createBannerButtons();
    const message = createBannerMessage();

    const actions = document.createElement('div');
    actions.className = 'sw-update-actions';
    actions.appendChild(updateBtn);
    actions.appendChild(dismissBtn);

    banner.appendChild(message);
    banner.appendChild(actions);

    setupBannerEventListeners(banner, updateBtn, dismissBtn);

    document.body.appendChild(banner);
    
    requestAnimationFrame(() => {
      banner.setAttribute('data-visible', 'true');
      updateBtn.focus();
    });

    bannerTimer = setTimeout(() => {
      if (document.getElementById(CONFIG.bannerId)) {
        dismissBanner();
      }
    }, CONFIG.bannerAutoHideDelay);
  }

  function createBannerElement() {
    const banner = document.createElement('div');
    banner.id = CONFIG.bannerId;
    banner.className = 'sw-update-overlay';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-atomic', 'true');
    banner.setAttribute('data-visible', 'false');
    
    // Error boundary
    banner.addEventListener('error', (event) => {
      console.error('🚨 SW Banner error:', event);
      dismissBanner();
      event.stopPropagation();
    });
    
    return banner;
  }

  function createBannerMessage() {
    const message = document.createElement('div');
    message.className = 'sw-update-message';
    message.textContent = STRINGS.updateMessage;
    return message;
  }

  function createBannerButtons() {
    const updateBtn = document.createElement('button');
    updateBtn.type = 'button';
    updateBtn.className = 'sw-update-btn sw-update-btn-primary';
    updateBtn.textContent = STRINGS.updateButton;
    updateBtn.setAttribute('aria-label', STRINGS.updateButtonAriaLabel);

    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.className = 'sw-update-btn sw-update-btn-secondary';
    dismissBtn.textContent = STRINGS.dismissButton;
    dismissBtn.setAttribute('aria-label', STRINGS.dismissButtonAriaLabel);

    return { updateBtn, dismissBtn };
  }

  function setupBannerEventListeners(banner, updateBtn, dismissBtn) {
    updateBtn.addEventListener('click', applyUpdate);
    dismissBtn.addEventListener('click', dismissBanner);

    banner.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismissBanner();
      }
    });

    banner.addEventListener('mouseenter', () => {
      if (bannerTimer) {
        clearTimeout(bannerTimer);
        bannerTimer = null;
      }
    });
  }

  function applyUpdate() {
    if (!registration || !registration.waiting) {
      console.warn('⚠️ SW: No waiting worker found');
      return;
    }

    // Предотвращаем multiple calls
    if (isRefreshing) {
      console.log('🔄 SW: Update already in progress');
      return;
    }

    console.log('🚀 SW: Applying update...');
    saveScrollPosition();
    
    // Устанавливаем флаг ДО отправки сообщения
    isRefreshing = true;
    
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    dismissBanner();
  }

  function dismissBanner() {
    const banner = document.getElementById(CONFIG.bannerId);
    if (!banner) return;

    console.log('👋 SW: Dismissing banner');

    if (bannerTimer) {
      clearTimeout(bannerTimer);
      bannerTimer = null;
    }

    banner.setAttribute('data-visible', 'false');
    
    setTimeout(() => {
      if (banner.parentElement) {
        banner.remove();
      }
    }, 300);
  }

  // =================================================================
  // SCROLL POSITION UTILITIES
  // =================================================================

  function saveScrollPosition() {
    if (!hasSessionStorage) return;
    
    try {
      const scrollY = Math.round(window.pageYOffset || document.documentElement.scrollTop || 0);
      
      if (scrollY >= 0) {
        sessionStorage.setItem(CONFIG.scrollSaveKey, scrollY.toString());
        console.log('💾 SW: Scroll position saved:', scrollY);
      }
    } catch (error) {
      console.warn('⚠️ SW: Failed to save scroll position:', error);
    }
  }

  function restoreScrollPosition() {
    if (!hasSessionStorage) return;
    
    try {
      const savedPosition = sessionStorage.getItem(CONFIG.scrollSaveKey);
      if (!savedPosition) return;

      const position = parseInt(savedPosition, 10);
      
      if (isNaN(position) || position < 0) {
        console.warn('⚠️ SW: Invalid scroll position:', savedPosition);
        sessionStorage.removeItem(CONFIG.scrollSaveKey);
        return;
      }

      console.log('📍 SW: Restoring scroll position:', position);
      
      requestAnimationFrame(() => {
        window.scrollTo({
          top: position,
          left: 0,
          behavior: 'auto'
        });
      });

      sessionStorage.removeItem(CONFIG.scrollSaveKey);
      
    } catch (error) {
      console.warn('⚠️ SW: Failed to restore scroll position:', error);
    }
  }

  // =================================================================
  // NETWORK MONITORING
  // =================================================================

  function setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      console.log('🌐 SW: Back online');
      if (shouldCheckForUpdates()) {
        checkForUpdates();
      }
    });

    window.addEventListener('offline', () => {
      console.log('📴 SW: Gone offline');
    });
  }

  // =================================================================
  // GRACEFUL SHUTDOWN
  // =================================================================

  function gracefulShutdown() {
    if (bannerTimer) {
      clearTimeout(bannerTimer);
      bannerTimer = null;
    }
    
    if (visibilityChangeTimeout) {
      clearTimeout(visibilityChangeTimeout);
      visibilityChangeTimeout = null;
    }
    
    const banner = document.getElementById(CONFIG.bannerId);
    if (banner) {
      banner.remove();
    }
    
    console.log('👋 SW: Graceful shutdown');
  }

   // =================================================================
  // CSP VIOLATION MONITORING
  // =================================================================
  
  function setupCSPMonitoring() {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.warn('🚨 CSP Violation:', {
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        lineNumber: event.lineNumber,
        sourceFile: event.sourceFile
      });
      
      // Отправляем в аналитику для мониторинга
      if (window.sa_event) {
        window.sa_event('csp_violation', {
          directive: event.violatedDirective,
          uri: event.blockedURI
        });
      }
    });
  }

  // =================================================================
  // ИНИЦИАЛИЗАЦИЯ
  // =================================================================

 if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initServiceWorker();
    setupCSPMonitoring(); // ДОБАВИТЬ
  });
} else {
  initServiceWorker();
  setupCSPMonitoring(); // ДОБАВИТЬ
}

  window.addEventListener('load', restoreScrollPosition);
  window.addEventListener('load', setupNetworkMonitoring);
  window.addEventListener('beforeunload', gracefulShutdown);
  window.addEventListener('pagehide', gracefulShutdown); // iOS Safari

})();