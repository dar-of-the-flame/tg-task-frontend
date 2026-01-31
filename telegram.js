// telegram.js
class TelegramIntegration {
    constructor() {
        this.tg = window.Telegram?.WebApp || null;
        this.user = null;
        this.isReady = false;
    }
    
    init() {
        if (!this.tg) {
            console.log('Браузерный режим');
            taskFlow.userId = `web_${Date.now()}`;
            return this.setupWebMode();
        }
        
        try {
            // Важно: сначала ready(), потом expand()
            this.tg.ready();
            this.tg.expand();
            
            // Получаем данные пользователя
            this.user = this.tg.initDataUnsafe?.user;
            if (this.user?.id) {
                taskFlow.userId = this.user.id;
                console.log('Telegram user:', this.user);
                
                // Проверяем авторизацию
                const initData = this.tg.initData;
                if (initData) {
                    console.log('User авторизован в Telegram');
                }
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
            console.log('Отправка задачи на сервер:', taskData);
            
            const response = await fetch(`${taskFlow.CONFIG.BACKEND_URL}/api/new_task`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData),
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Сервер ответил:', result);
                return true;
            } else {
                console.error('Ошибка сервера:', response.status);
                return false;
            }
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
            
            if (response.ok) {
                const data = await response.json();
                this.isBackendAvailable = data.status === 'ok';
                console.log('Бэкенд доступен:', this.isBackendAvailable);
            } else {
                this.isBackendAvailable = false;
            }
        } catch (error) {
            console.warn('Бэкенд недоступен:', error.message);
            this.isBackendAvailable = false;
        }
        return this.isBackendAvailable;
    }
}
