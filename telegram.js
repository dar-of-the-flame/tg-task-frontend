class TelegramIntegration {
    constructor() {
        this.tg = window.Telegram?.WebApp || null;
        this.user = null;
        this.isReady = false;
        this.isBackendAvailable = false;
    }
    
    init() {
        if (!this.tg) {
            console.log('Браузерный режим');
            taskFlow.userId = `web_${Date.now()}`;
            return this.setupWebMode();
        }
        
        try {
            this.tg.ready();
            this.tg.expand();
            
            this.user = this.tg.initDataUnsafe?.user;
            if (this.user?.id) {
                taskFlow.userId = this.user.id;
                console.log('Telegram user:', this.user);
            } else {
                taskFlow.userId = `tg_noauth_${Date.now()}`;
                console.log('Telegram без авторизации');
            }
            
            this.isReady = true;
            return true;
        } catch (error) {
            console.error('Ошибка Telegram:', error);
            return this.setupWebMode();
        }
    }
    
    async sendTaskToBackend(taskData) {
        if (!this.isBackendAvailable) return false;
        
        try {
            const response = await fetch(`${taskFlow.CONFIG.BACKEND_URL}/api/new_task`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(taskData),
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                await response.json();
                return true;
            }
            return false;
        } catch (error) {
            console.warn('Ошибка отправки:', error.message);
            this.isBackendAvailable = false;
            return false;
        }
    }
    
    async checkBackend() {
        try {
            const response = await fetch(`${taskFlow.CONFIG.BACKEND_URL}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            
            this.isBackendAvailable = response.ok;
            return this.isBackendAvailable;
        } catch (error) {
            console.warn('Бэкенд недоступен:', error.message);
            this.isBackendAvailable = false;
            return false;
        }
    }
    
    setupWebMode() {
        console.log('Запуск в браузерном режиме');
        taskFlow.userId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return true;
    }
    
    showBackButton() {
        if (this.tg?.BackButton) {
            this.tg.BackButton.show();
            this.tg.BackButton.onClick(() => {
                this.hideBackButton();
                if (typeof ui !== 'undefined') ui.closeAllModals();
            });
        }
    }
    
    hideBackButton() {
        if (this.tg?.BackButton) {
            this.tg.BackButton.hide();
        }
    }
    
    sendToBot(data) {
        if (!this.tg || !this.isReady) return;
        try {
            this.tg.sendData(JSON.stringify(data));
        } catch (error) {
            console.warn('Ошибка отправки в бота:', error);
        }
    }
}

window.telegram = new TelegramIntegration();
