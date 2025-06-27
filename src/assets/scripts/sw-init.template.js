// src/assets/scripts/sw-init.template.js
// БЕЗОПАСНАЯ ВЕРСИЯ - сохраняет совместимость с существующим хэшированием

(function() {
  'use strict';
  
  if (!('serviceWorker' in navigator)) {
    console.warn('SW: navigator.serviceWorker не поддерживается');
    return;
  }
  
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '8080';

  if (isDevelopment) {
    console.log('🚧 SW: Development mode detected, registration skipped');
    return;
  }
  
  const isDeployPreview = window.location.hostname.includes('deploy-preview') ||
                         window.location.hostname.includes('branch-deploy'); 
                       
  if (isDeployPreview) {
    console.log('🚧 Deploy preview detected, SW registration skipped');
    return;
  }
  
  let hasSessionStorage = false;
  try {
    hasSessionStorage = !!window.sessionStorage;
    sessionStorage.setItem('sw-test', '1');
    sessionStorage.removeItem('sw-test');
  } catch (e) {
    console.warn('SW: sessionStorage недоступен');
    hasSessionStorage = false;
  }

  const CONFIG = {
    updateCheckInterval: {{UPDATE_CHECK_INTERVAL}},
    bannerAutoHideDelay: {{BANNER_AUTO_HIDE_DELAY}},
    scrollSaveKey: '{{SCROLL_SAVE_KEY}}',
    bannerId: '{{BANNER_ID}}',
    lowBatteryThreshold: 0.15,
    memoryPressureThreshold: 0.85,
    retryDelay: 30000,
    visibilityChangeDelay: 1000
  };
  
  const STRINGS = {{SW_STRINGS}};

  let registration = null;
  let isRefreshing = false;
  let bannerTimer = null;
  let updateCheckTimer = null;
  let visibilityChangeTimeout = null;

  function isLowEndDevice() {
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
      return true;
    }
    
    if (navigator.deviceMemory && navigator.deviceMemory <= 2) {
      return true;
    }
    
    if (navigator.connection) {
      const conn = navigator.connection;
      if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
        return true;
      }
      if (conn.saveData === true) {
        return true;
      }
    }
    
    return false;
  }
  
  async function isLowBattery() {
    if (!('getBattery' in navigator)) return false;
    
    try {
      const battery = await navigator.getBattery();
      return battery.level < CONFIG.lowBatteryThreshold && !battery.charging;
    } catch (e) {
      return false;
    }
  }
  
  function checkNetworkConditions() {
    if (!navigator.connection) return { quality: 'unknown', saveData: false };
    
    const conn = navigator.connection;
    let quality = 'good';
    
    if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
      quality = 'poor';
    } else if (conn.effectiveType === '3g') {
      quality = 'moderate';
    }
    
    return {
      quality,
      saveData: conn.saveData === true,
      downlink: conn.downlink,
      rtt: conn.rtt
    };
  }
  
  function handleMemoryPressure() {
    if (!performance.memory) return false;
    
    const memory = performance.memory;
    const memoryRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    
    if (memoryRatio > CONFIG.memoryPressureThreshold) {
      console.warn('🧠 SW: Critical memory usage detected');
      dismissBanner();
      CONFIG.updateCheckInterval *= 3;
      return true;
    } else if (memoryRatio > 0.7) {
      console.warn('🧠 SW: High memory usage detected');
      CONFIG.updateCheckInterval *= 2;
      return true;
    }
    
    return false;
  }
  
  function checkThermalState() {
    if (!('thermal' in navigator)) return;
    
    navigator.thermal.addEventListener('statechange', (event) => {
      const thermalState = event.target.state;
      
      if (thermalState === 'serious' || thermalState === 'critical') {
        console.log('🌡️ SW: Device overheating, reducing activity');
        CONFIG.updateCheckInterval *= 4;
        
        if (bannerTimer) {
          clearTimeout(bannerTimer);
          bannerTimer = null;
        }
        
        if (updateCheckTimer) {
          clearTimeout(updateCheckTimer);
          updateCheckTimer = null;
        }
      }
    });
  }

  async function initServiceWorker() {
    try {
      console.log('🚀 SW: Initializing...');
      
      const networkConditions = checkNetworkConditions();
      const isLowEnd = isLowEndDevice();
      const lowBattery = await isLowBattery();
      
      if (networkConditions.quality === 'poor' && (isLowEnd || lowBattery)) {
        console.log('⚠️ SW: Poor conditions detected, delaying registration');
        setTimeout(initServiceWorker, 10000);
        return;
      }
      
      const existingRegistration = await navigator.serviceWorker.getRegistration('/sw.js');
      
      if (existingRegistration) {
        console.log('✅ SW: Using existing registration');
        registration = existingRegistration;
        
        if (existingRegistration.waiting) {
          console.log('⏳ SW: Update is waiting');
          showUpdateBanner();
        } else if (existingRegistration.installing) {
          console.log('⏳ SW: New version installing');
          existingRegistration.installing.addEventListener('statechange', handleInstallStateChange);
        }
      } else {
        console.log('🔄 SW: Registering new service worker');
        registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none'
        });
        console.log('✅ SW registered:', registration.scope);
      }
      
      console.log('🔍 SW controller:', navigator.serviceWorker.controller);
      setupEventListeners();
      checkThermalState();
      scheduleUpdateCheck();
      restoreScrollPosition();
      
    } catch (error) {
      console.error('❌ SW registration failed:', error);
      
      if (error.name === 'SecurityError') {
        console.log('🔒 SW: Security error, not retrying');
        return;
      }
      
      console.log('🔄 SW: Will retry registration in 30 seconds');
      setTimeout(initServiceWorker, CONFIG.retryDelay);
    }
  }

  function handleInstallStateChange(event) {
    const worker = event.target;
    
    if (worker.state === 'installed') {
      if (navigator.serviceWorker.controller) {
        console.log('🆕 SW: New version installed');
        showUpdateBanner();
      } else {
        console.log('✅ SW: First installation complete');
      }
    } else if (worker.state === 'activated') {
      console.log('✅ SW: Activated');
    }
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

    document.addEventListener('visibilitychange', () => {
      if (visibilityChangeTimeout) {
        clearTimeout(visibilityChangeTimeout);
      }
      
      const delay = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) ? 
                   2000 : CONFIG.visibilityChangeDelay;
      
      visibilityChangeTimeout = setTimeout(() => {
        if (!document.hidden && registration) {
          console.log('👁️ SW: Page visible, checking for updates');
          checkForUpdates();
        }
      }, delay);
    });

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
  }

  function handleSWMessage(event) {
    const { data } = event;
    
    if (!data || !data.type) return;
    
    switch (data.type) {
      case 'VERSION_INFO':
        console.log('📊 SW Version: ' + data.version + ' (' + data.mode + ')');
        break;
        
      case 'CACHE_CLEARED':
        console.log('🗑️ SW: Cache cleared');
        break;
        
      case 'CACHE_UPDATED': 
        console.log('🔄 SW: Cache updated for:', data.payload && data.payload.updatedURL);
        break;
        
      default:
        console.log('📨 SW Message:', data);
    }
  }

  function handleUpdate() {
    if (!registration.installing) return;
    
    console.log('🔄 SW: Update found, installing...');
    
    registration.installing.addEventListener('statechange', () => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        console.log('⏳ SW: Update ready');
        showUpdateBanner();
      }
    });
  }

  async function checkForUpdates() {
    if (!registration) return;
    
    try {
      if (handleMemoryPressure()) {
        console.log('⚠️ SW: Skipping update check due to memory pressure');
        return;
      }
      
      const networkConditions = checkNetworkConditions();
      if (networkConditions.saveData || networkConditions.quality === 'poor') {
        console.log('⚠️ SW: Skipping update check due to poor network');
        return;
      }
      
      console.log('🔍 SW: Checking for updates...');
      await registration.update();
      
    } catch (error) {
      console.warn('⚠️ SW: Update check failed:', error.message);
    }
  }

  function scheduleUpdateCheck() {
    if (updateCheckTimer) {
      clearTimeout(updateCheckTimer);
    }
    
    const interval = Math.max(CONFIG.updateCheckInterval, 60000);
    
    updateCheckTimer = setTimeout(() => {
      if (!document.hidden) {
        checkForUpdates();
      }
      scheduleUpdateCheck();
    }, interval);
  }

  function showUpdateBanner() {
    if (document.getElementById(CONFIG.bannerId)) {
      return;
    }
    
    console.log('📢 SW: Showing update banner');
    
    const banner = document.createElement('div');
    banner.id = CONFIG.bannerId;
    banner.className = 'sw-update-overlay';
    banner.setAttribute('data-visible', 'false');
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-labelledby', 'sw-update-title');
    
    banner.innerHTML = '<div class="sw-update-content">' +
      '<div class="sw-update-icon">🆕</div>' +
      '<div class="sw-update-text">' +
        '<div id="sw-update-title" class="sw-update-title">' +
          STRINGS.updateMessage +
        '</div>' +
      '</div>' +
      '<div class="sw-update-actions">' +
        '<button type="button" class="sw-update-btn sw-update-btn--primary" ' +
                'aria-label="' + STRINGS.updateButtonAriaLabel + '">' +
          STRINGS.updateButton +
        '</button>' +
        '<button type="button" class="sw-update-btn sw-update-btn--secondary"' +
                'aria-label="' + STRINGS.dismissButtonAriaLabel + '">' +
          STRINGS.dismissButton +
        '</button>' +
      '</div>' +
    '</div>';
    
    document.body.appendChild(banner);
    
    requestAnimationFrame(() => {
      banner.setAttribute('data-visible', 'true');
    });
    
    setupBannerEventListeners(banner);
    
    if (CONFIG.bannerAutoHideDelay > 0) {
      bannerTimer = setTimeout(() => {
        if (document.getElementById(CONFIG.bannerId)) {
          console.log('⏰ SW: Auto-hiding banner');
          dismissBanner();
        }
      }, CONFIG.bannerAutoHideDelay);
    }
  }

  function setupBannerEventListeners(banner) {
    const updateBtn = banner.querySelector('.sw-update-btn--primary');
    const dismissBtn = banner.querySelector('.sw-update-btn--secondary');
    
    if (!updateBtn || !dismissBtn) {
      console.error('❌ SW: Banner buttons not found');
      return;
    }
    
    updateBtn.addEventListener('click', applyUpdate);
    dismissBtn.addEventListener('click', dismissBanner);

    banner.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismissBanner();
      } else if (event.key === 'Enter' && event.target === banner) {
        event.preventDefault();
        updateBtn.focus();
      }
    });

    banner.addEventListener('mouseenter', () => {
      if (bannerTimer) {
        clearTimeout(bannerTimer);
        bannerTimer = null;
      }
    });
    
    banner.addEventListener('mouseleave', () => {
      if (!bannerTimer && CONFIG.bannerAutoHideDelay > 0) {
        bannerTimer = setTimeout(dismissBanner, CONFIG.bannerAutoHideDelay);
      }
    });
  }

  function applyUpdate() {
    if (!registration || !registration.waiting) {
      console.warn('⚠️ SW: No waiting worker found');
      return;
    }

    if (isRefreshing) {
      console.log('🔄 SW: Update already in progress');
      return;
    }

    console.log('🚀 SW: Applying update...');
    saveScrollPosition();
    
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

  function saveScrollPosition() {
    if (!hasSessionStorage) return;
    
    try {
      const scrollY = Math.round(window.pageYOffset || document.documentElement.scrollTop || 0);
      
      if (scrollY >= 0) {
        sessionStorage.setItem(CONFIG.scrollSaveKey, scrollY.toString());
        console.log('💾 SW: Scroll position saved: ' + scrollY);
      }
    } catch (error) {
      console.warn('⚠️ SW: Failed to save scroll position:', error);
    }
  }

  function restoreScrollPosition() {
    if (!hasSessionStorage) return;
    
    try {
      const savedPosition = sessionStorage.getItem(CONFIG.scrollSaveKey);
      
      if (savedPosition !== null) {
        const scrollY = parseInt(savedPosition, 10);
        
        if (!isNaN(scrollY) && scrollY > 0) {
          const restoreScroll = () => {
            if (document.readyState === 'complete') {
              window.scrollTo({
                top: scrollY,
                behavior: 'auto'
              });
              console.log('📍 SW: Scroll position restored: ' + scrollY);
              sessionStorage.removeItem(CONFIG.scrollSaveKey);
            } else {
              setTimeout(restoreScroll, 100);
            }
          };
          
          if (document.readyState === 'loading') {
            window.addEventListener('load', restoreScroll, { once: true });
          } else {
            restoreScroll();
          }
        } else {
          sessionStorage.removeItem(CONFIG.scrollSaveKey);
        }
      }
    } catch (error) {
      console.warn('⚠️ SW: Failed to restore scroll position:', error);
    }
  }

  function setupCSPMonitoring() {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.warn('🚨 CSP Violation:', {
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        lineNumber: event.lineNumber,
        sourceFile: event.sourceFile
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initServiceWorker();
      setupCSPMonitoring();
    }, { once: true });
  } else {
    initServiceWorker();
    setupCSPMonitoring();
  }

  window.addEventListener('beforeunload', () => {
    if (updateCheckTimer) {
      clearTimeout(updateCheckTimer);
    }
    if (bannerTimer) {
      clearTimeout(bannerTimer);
    }
    if (visibilityChangeTimeout) {
      clearTimeout(visibilityChangeTimeout);
    }
  });

  if (window.location.hostname === 'localhost') {
    window.swDebug = {
      registration: () => registration,
      checkUpdate: checkForUpdates,
      showBanner: showUpdateBanner,
      dismissBanner: dismissBanner,
      clearCache: () => {
        if (registration && registration.active) {
          registration.active.postMessage({ type: 'FORCE_UPDATE_CACHE' });
        }
      }
    };
  }

})();