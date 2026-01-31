// app.js - УПРОЩЕННАЯ ВЕРСИЯ ДЛЯ ОТЛАДКИ
class TaskFlowApp {
    constructor() {
        this.isInitialized = false;
    }
    
    async init() {
        try {
            console.log('🚀 TaskFlowApp.init() вызван');
            
            // 1. Показываем загрузочный экран
            this.showLoadingMessage('Инициализация...');
            
            // 2. Проверяем Telegram WebApp
            console.log('Telegram WebApp:', window.Telegram?.WebApp);
            console.log('initDataUnsafe:', window.Telegram?.WebApp?.initDataUnsafe);
            console.log('User:', window.Telegram?.WebApp?.initDataUnsafe?.user);
            
            // 3. Получаем user_id
            if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
                taskFlow.userId = window.Telegram.WebApp.initDataUnsafe.user.id;
                console.log('✅ User ID найден:', taskFlow.userId);
            } else {
                console.log('⚠️ User ID не найден в Telegram WebApp');
                // Для отладки - используем тестовый ID
                taskFlow.userId = 123456789;
                console.log('⚠️ Используем тестовый User ID:', taskFlow.userId);
            }
            
            // 4. Проверяем бэкенд
            console.log('Проверяем бэкенд:', taskFlow.CONFIG.BACKEND_URL);
            
            try {
                const response = await fetch(`${taskFlow.CONFIG.BACKEND_URL}/health`, {
                    method: 'GET',
                    timeout: 5000
                });
                console.log('✅ Бэкенд отвечает:', response.status);
            } catch (error) {
                console.error('❌ Бэкенд недоступен:', error.message);
            }
            
            // 5. Загружаем задачи
            console.log('Загружаем задачи...');
            try {
                if (taskFlow.userId) {
                    const response = await fetch(
                        `${taskFlow.CONFIG.BACKEND_URL}/api/tasks?user_id=${taskFlow.userId}`,
                        { timeout: 10000 }
                    );
                    console.log('Ответ от /api/tasks:', response.status);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('Данные задач:', data);
                        taskFlow.allTasks = data.tasks || [];
                        console.log(`Загружено задач: ${taskFlow.allTasks.length}`);
                    }
                }
            } catch (error) {
                console.error('Ошибка загрузки задач:', error);
            }
            
            // 6. Прячем загрузочный экран
            setTimeout(() => {
                this.hideLoadingScreen();
                console.log('✅ TaskFlow загружен');
                
                // Показываем основное приложение
                document.querySelector('.app-container').style.display = 'flex';
                
                // Показываем тестовую задачу
                const tasksList = document.getElementById('tasks-list');
                if (tasksList) {
                    tasksList.innerHTML = `
                        <div class="task-item">
                            <div class="task-header">
                                <div class="task-title">✅ Приложение работает!</div>
                            </div>
                            <div class="task-meta">
                                <div>User ID: ${taskFlow.userId}</div>
                                <div>Backend: ${taskFlow.CONFIG.BACKEND_URL}</div>
                            </div>
                        </div>
                    `;
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ Критическая ошибка:', error);
            this.showError(error.message || 'Неизвестная ошибка');
        }
    }
    
    showLoadingMessage(message) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            const messageElement = loadingScreen.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
    
    showError(message) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="text-align: center; color: white; max-width: 90%;">
                    <h2 style="color: #ff6b6b;">Ошибка</h2>
                    <p style="margin-bottom: 15px;">${message}</p>
                    <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; text-align: left; font-size: 12px;">
                        <div>User ID: ${taskFlow.userId || 'не найден'}</div>
                        <div>Telegram WebApp: ${window.Telegram?.WebApp ? 'да' : 'нет'}</div>
                        <div>initDataUnsafe: ${window.Telegram?.WebApp?.initDataUnsafe ? 'да' : 'нет'}</div>
                        <div>Backend: ${taskFlow.CONFIG.BACKEND_URL}</div>
                    </div>
                    <button onclick="location.reload()" style="
                        background: white;
                        color: #667eea;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        margin-top: 20px;
                    ">
                        Перезагрузить
                    </button>
                </div>
            `;
        }
    }
}

// Глобальный экземпляр
window.taskFlowApp = new TaskFlowApp();

// Запускаем при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен');
    window.taskFlowApp.init();
});
