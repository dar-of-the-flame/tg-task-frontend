// Telegram WebApp интеграция
class TelegramIntegration {
    constructor() {
        this.tg = window.Telegram?.WebApp || null;
        this.user = null;
        this.isBackendAvailable = false;
    }
    
    init() {
        return new Promise((resolve) => {
            if (!this.tg) {
                console.log('🌐 Telegram WebApp не обнаружен, работаем в браузерном режиме');
                resolve(false);
                return;
            }
            
            try {
                // Инициализируем Telegram WebApp
                this.tg.ready();
                this.tg.expand();
                
                // Получаем данные пользователя
                this.user = this.tg.initDataUnsafe?.user;
                
                if (this.user?.id) {
                    console.log('👤 Telegram user detected:', this.user.id);
                } else {
                    console.log('👤 Telegram user not authorized');
                }
                
                // Настройка кнопки "Назад"
                this.tg.BackButton.onClick(() => {
                    this.hideBackButton();
                    ui.closeAllModals();
                    
                    // Закрываем FAB меню
                    const fabMain = document.getElementById('fab-main');
                    const fabMenu = document.getElementById('fab-menu');
                    if (fabMain) fabMain.classList.remove('rotate');
                    if (fabMenu) fabMenu.classList.remove('open');
                });
                
                this.tg.MainButton.setText('Готово').hide();
                
                resolve(true);
                
            } catch (error) {
                console.error('❌ Ошибка Telegram:', error);
                resolve(false);
            }
        });
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
}

// Создаем и экспортируем экземпляр
const telegram = new TelegramIntegration();
window.telegram = telegram;
