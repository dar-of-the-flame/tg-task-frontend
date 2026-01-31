// Telegram WebApp интеграция
class TelegramIntegration {
    constructor() {
        this.tg = window.Telegram?.WebApp || null;
        this.user = null;
        this.isReady = false;
        this.isBackendAvailable = false;
    }
    
    init() {
        if (!this.tg) {
            console.log('🌐 Браузерный режим');
            this.setupWebMode();
            return Promise.resolve(true);
        }
        
        try {
            // Важно: сначала ready(), потом expand()
            this.tg.ready();
            this.tg.expand();
            
            // Получаем данные пользователя
            this.user = this.tg.initDataUnsafe?.user;
            
            if (this.user?.id) {
                console.log('👤 Telegram user:', this.user);
                
                // Настройка кнопки "Назад"
                this.tg.BackButton.onClick(() => {
                    this.hideBackButton();
                    
                    // Закрываем все модальные окна
                    ui.closeAllModals();
                    
                    // Закрываем FAB меню
                    const fabMain = document.getElementById('fab-main');
                    const fabMenu = document.getElementById('fab-menu');
                    if (fabMain) fabMain.classList.remove('rotate');
                    if (fabMenu) fabMenu.classList.remove('open');
                    
                    // Закрываем панель фильтров
                    const filtersPanel = document.getElementById('filters-panel');
                    if (filtersPanel) {
                        filtersPanel.classList.remove('open');
                    }
                });
                
                this.tg.MainButton.setText('Готово').hide();
                
            } else {
                console.log('👤 Telegram без авторизации');
            }
            
            this.isReady = true;
            return Promise.resolve(true);
            
        } catch (error) {
            console.error('❌ Ошибка Telegram:', error);
            this.setupWebMode();
            return Promise.resolve(true);
        }
    }
    
    setupWebMode() {
        // Создаем мок-объект для браузерного режима
        this.user = {
            id: `web_${Date.now()}`,
            username: 'web_user',
            first_name: 'Web',
            last_name: 'User'
        };
        
        this.isReady = true;
        console.log('🌐 Режим браузера активирован');
    }
    
    async checkBackend() {
        try {
            const response = await fetch(`${taskFlow.CONFIG.BACKEND_URL}/health`, {
                signal: AbortSignal.timeout(5000)
            });
            
            this.isBackendAvailable = response.ok;
            console.log('🌐 Бэкенд доступен:', this.isBackendAvailable);
            return this.isBackendAvailable;
            
        } catch (error) {
            console.warn('🌐 Бэкенд недоступен:', error.message);
            this.isBackendAvailable = false;
            return false;
        }
    }
    
    // Показать кнопку "Назад"
    showBackButton() {
        if (this.tg?.BackButton) {
            this.tg.BackButton.show();
        }
    }
    
    // Скрыть кнопку "Назад"
    hideBackButton() {
        if (this.tg?.BackButton) {
            this.tg.BackButton.hide();
        }
    }
    
    // Показать основную кнопку
    showMainButton(text, callback) {
        if (this.tg?.MainButton) {
            this.tg.MainButton.setText(text).show();
            this.tg.MainButton.onClick(callback);
        }
    }
    
    // Скрыть основную кнопку
    hideMainButton() {
        if (this.tg?.MainButton) {
            this.tg.MainButton.hide();
        }
    }
}

// Создаем и экспортируем экземпляр
const telegram = new TelegramIntegration();
window.telegram = telegram;
