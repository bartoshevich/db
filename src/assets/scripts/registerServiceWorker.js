// src/assets/scripts/registerServiceWorker.js - заменяет ваш существующий файл
import { Workbox } from 'workbox-window';

class ServiceWorkerManager {
  constructor() {
    this.wb = null;
    this.registration = null;
    this.isUpdateAvailable = false;
    this.isOffline = !navigator.onLine;
    
    // Инициализация
    this.init();
    this.setupNetworkListeners();
  }

  async init() {
    if (!('serviceWorker' in navigator)) {
      console.warn('❌ Service Worker не поддерживается');
      return;
    }

    try {
      // Используем комбинированный подход: Workbox + ваш кастомный SW
      this.wb = new Workbox('/sw-generated.js', {
        scope: '/',
        updateViaCache: 'none' // Всегда проверяем обновления
      });
      
      this.setupWorkboxListeners();
      this.registration = await this.wb.register();
      
      console.log('✅ Service Worker зарегистрирован');
      
      // Проверяем обновления каждые 5 минут
      this.startUpdateCheck();
      
    } catch (error) {
      console.error('❌ Ошибка регистрации Service Worker:', error);
    }
  }

  setupWorkboxListeners() {
    // SW установлен и ждет активации
    this.wb.addEventListener('waiting', (event) => {
      console.log('⏳ Новая версия SW ожидает активации');
      this.isUpdateAvailable = true;
      this.showUpdateNotification();
    });

    // SW активирован и контролирует страницу
    this.wb.addEventListener('controlling', (event) => {
      console.log('🎯 Новый SW активирован');
      // Показываем уведомление об успешном обновлении
      this.showSuccessMessage();
      // Перезагружаем через 1 секунду для применения изменений
      setTimeout(() => window.location.reload(), 1000);
    });

    // Первая регистрация SW
    this.wb.addEventListener('installed', (event) => {
      if (!event.isUpdate) {
        console.log('🎉 Service Worker установлен впервые');
        this.showInstallMessage();
      }
    });

    // Обновления кеша
    this.wb.addEventListener('message', (event) => {
      if (event.data.type === 'CACHE_UPDATED') {
        const { updatedURL } = event.data.payload;
        console.log(`📦 Кеш обновлен для: ${updatedURL}`);
      }
      
      if (event.data.type === 'SW_ACTIVATED') {
        console.log('✅ SW сообщает об активации:', event.data.payload);
      }
    });
  }

  setupNetworkListeners() {
    // Мониторинг сетевого статуса
    window.addEventListener('online', () => {
      this.isOffline = false;
      this.hideOfflineIndicator();
      console.log('🌐 Соединение восстановлено');
      
      // Проверяем обновления при восстановлении сети
      this.checkForUpdates();
    });

    window.addEventListener('offline', () => {
      this.isOffline = true;
      this.showOfflineIndicator();
      console.log('📴 Соединение потеряно');
    });

    // Проверяем начальное состояние
    if (this.isOffline) {
      this.showOfflineIndicator();
    }
  }

  showUpdateNotification() {
    // Удаляем предыдущие уведомления
    this.removeNotification();
    
    const notification = document.createElement('div');
    notification.className = 'sw-notification sw-update';
    notification.innerHTML = `
      <div class="sw-notification__content">
        <div class="sw-notification__icon">🔄</div>
        <div class="sw-notification__text">
          <strong>Доступно обновление</strong>
          <p>Новая версия сайта готова к установке</p>
        </div>
        <div class="sw-notification__actions">
          <button class="sw-btn sw-btn--primary" data-action="update">
            Обновить
          </button>
          <button class="sw-btn sw-btn--secondary" data-action="dismiss">
            Позже
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Обработчики событий
    notification.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      
      if (action === 'update') {
        this.activateUpdate();
        this.removeNotification();
      } else if (action === 'dismiss') {
        this.removeNotification();
        // Повторно показать через 10 минут
        setTimeout(() => {
          if (this.isUpdateAvailable) {
            this.showUpdateNotification();
          }
        }, 10 * 60 * 1000);
      }
    });

    // Автоскрытие через 30 секунд
    setTimeout(() => {
      if (notification.parentNode) {
        this.removeNotification();
      }
    }, 30000);
  }

  showInstallMessage() {
    const toast = this.createToast('🎉 Сайт готов к работе офлайн', 'success');
    this.showToast(toast);
  }

  showSuccessMessage() {
    const toast = this.createToast('✅ Сайт обновлен до последней версии', 'success');
    this.showToast(toast);
  }

  showOfflineIndicator() {
    let indicator = document.querySelector('.offline-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'offline-indicator';
      indicator.innerHTML = `
        <span class="offline-indicator__icon">📴</span>
        <span class="offline-indicator__text">Офлайн режим</span>
      `;
      document.body.appendChild(indicator);
    }
    indicator.classList.add('offline-indicator--visible');
  }

  hideOfflineIndicator() {
    const indicator = document.querySelector('.offline-indicator');
    if (indicator) {
      indicator.classList.remove('offline-indicator--visible');
    }
  }

  createToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `sw-toast sw-toast--${type}`;
    toast.textContent = message;
    return toast;
  }

  showToast(toast) {
    document.body.appendChild(toast);
    
    // Анимация появления
    requestAnimationFrame(() => {
      toast.classList.add('sw-toast--visible');
    });

    // Автоудаление через 3 секунды
    setTimeout(() => {
      toast.classList.remove('sw-toast--visible');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 3000);
  }

  removeNotification() {
    const notification = document.querySelector('.sw-notification');
    if (notification) {
      notification.remove();
    }
  }

  async activateUpdate() {
    if (!this.wb || !this.isUpdateAvailable) return;

    console.log('🔄 Активация обновления SW...');
    
    // Показываем индикатор загрузки
    const loading = this.createToast('⏳ Обновление...', 'info');
    this.showToast(loading);

    try {
      // Сообщаем новому SW о необходимости активации
      await this.wb.messageSW({ type: 'SKIP_WAITING' });
      this.isUpdateAvailable = false;
    } catch (error) {
      console.error('❌ Ошибка активации обновления:', error);
      const errorToast = this.createToast('❌ Ошибка обновления', 'error');
      this.showToast(errorToast);
    }
  }

  async checkForUpdates() {
    if (this.registration) {
      try {
        await this.registration.update();
        console.log('🔍 Проверка обновлений выполнена');
      } catch (error) {
        console.warn('⚠️ Ошибка проверки обновлений:', error);
      }
    }
  }

  startUpdateCheck() {
    // Проверяем обновления каждые 5 минут
    setInterval(() => {
      if (!this.isOffline) {
        this.checkForUpdates();
      }
    }, 5 * 60 * 1000);
  }

  // Публичные методы для внешнего использования
  async forceUpdate() {
    await this.checkForUpdates();
  }

  getStatus() {
    return {
      isRegistered: !!this.registration,
      isUpdateAvailable: this.isUpdateAvailable,
      isOffline: this.isOffline
    };
  }
}

// Инициализация и экспорт
const swManager = new ServiceWorkerManager();

// Глобальный доступ для отладки
if (typeof window !== 'undefined') {
  window.swManager = swManager;
}

export default swManager;