// Telegram Web App интеграция
class TelegramIntegration {
    constructor() {
        this.tg = window.Telegram?.WebApp || null;
        this.user = null;
        this.isReady = false;
    }
    
    init() {
        if (!this.tg) {
            console.log('Telegram Web App не обнаружен, работаем в режиме браузера');
            taskFlow.userId = `web_${Date.now()}`;
            return this.setupWebMode();
        }
        
        try {
            // Инициализация Telegram Web App
            this.tg.expand();
            this.tg.enableClosingConfirmation();
            this.tg.ready();
            
            // Получаем данные пользователя
            this.user = this.tg.initDataUnsafe?.user;
            taskFlow.userId = this.user?.id || `tg_${Date.now()}`;
            
            // Настройка темы
            if (this.tg.colorScheme === 'light') {
                document.body.classList.remove('dark-theme');
                document.body.classList.add('light-theme');
            }
            
            // Настройка кнопки "Назад"
            this.setupBackButton();
            
            this.isReady = true;
            console.log('Telegram Web App инициализирован:', this.user);
            
            return true;
        } catch (error) {
            console.error('Ошибка инициализации Telegram:', error);
            return this.setupWebMode();
        }
    }
    
    setupWebMode() {
        taskFlow.userId = `web_${Date.now()}`;
        console.log('Режим веб-браузера, User ID:', taskFlow.userId);
        return true;
    }
    
    setupBackButton() {
        if (!this.tg) return;
        
        this.tg.BackButton.onClick(() => {
            // Закрываем открытые модальные окна
            const openModals = document.querySelectorAll('.modal[style*="display: flex"], .modal[style*="display: block"]');
            if (openModals.length > 0) {
                openModals.forEach(modal => modal.style.display = 'none');
                this.tg.BackButton.hide();
                return;
            }
            
            // Закрываем панель фильтров
            const filtersPanel = document.getElementById('filters-panel');
            if (filtersPanel?.classList.contains('open')) {
                filtersPanel.classList.remove('open');
                this.tg.BackButton.hide();
                return;
            }
            
            // Закрываем FAB меню
            const fabMenu = document.getElementById('fab-menu');
            if (fabMenu?.classList.contains('open')) {
                document.getElementById('fab-main')?.classList.remove('rotate');
                fabMenu.classList.remove('open');
                this.tg.BackButton.hide();
                return;
            }
        });
    }
    
    showBackButton() {
        if (this.tg) {
            this.tg.BackButton.show();
        }
    }
    
    hideBackButton() {
        if (this.tg) {
            this.tg.BackButton.hide();
        }
    }
    
    sendToBot(data) {
        if (!this.tg || !this.user) return false;
        
        try {
            this.tg.sendData(JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Ошибка отправки данных в бота:', error);
            return false;
        }
    }
    
    showAlert(message) {
        if (this.tg) {
            this.tg.showAlert(message);
        } else {
            alert(message);
        }
    }
    
    getTheme() {
        if (this.tg) {
            return this.tg.colorScheme;
        }
        return localStorage.getItem('theme') || 'dark';
    }
}

// Создаем и экспортируем экземпляр
const telegram = new TelegramIntegration();
window.telegram = telegram;
