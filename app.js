// app.js - УПРОЩЕННАЯ ВЕРСИЯ С РУЧНЫМ ВВОДОМ USER ID
class TaskFlowApp {
    constructor() {
        this.isInitialized = false;
        this.maxRetries = 3;
        this.retryCount = 0;
    }
    
    async init() {
        try {
            console.log('🚀 Инициализация TaskFlow...');
            
            // 1. Показываем загрузочный экран
            this.showLoadingMessage('Инициализация...');
            
            // 2. Пытаемся получить user_id из разных источников
            let userId = null;
            
            // Пробуем получить из URL параметров
            const urlParams = new URLSearchParams(window.location.search);
            const urlUserId = urlParams.get('startapp') || urlParams.get('user_id');
            
            if (urlUserId) {
                userId = urlUserId;
                console.log('👤 User ID из URL:', userId);
            }
            
            // Пробуем получить из Telegram WebApp
            if (!userId && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
                userId = window.Telegram.WebApp.initDataUnsafe.user.id;
                console.log('👤 User ID из Telegram:', userId);
            }
            
            // Пробуем получить из localStorage (сохраненный ранее)
            if (!userId) {
                const savedUserId = localStorage.getItem('taskflow_user_id');
                if (savedUserId) {
                    userId = savedUserId;
                    console.log('👤 User ID из localStorage:', userId);
                }
            }
            
            // Если user_id не найден, просим ввести вручную
            if (!userId) {
                this.showUserIdPrompt();
                return; // Прерываем инициализацию, ждем ввода
            }
            
            // Сохраняем user_id
            taskFlow.userId = userId;
            localStorage.setItem('taskflow_user_id', userId);
            console.log('👤 Используем User ID:', taskFlow.userId);
            
            // 3. Проверяем бэкенд
            this.showLoadingMessage('Проверка сервера...');
            const backendAvailable = await this.checkBackend();
            
            if (!backendAvailable) {
                console.warn('⚠️ Сервер недоступен, работаем в оффлайн режиме');
            }
            
            // 4. Загружаем данные с сервера
            this.showLoadingMessage('Загрузка задач...');
            await this.loadData();
            
            // 5. Инициализация UI
            ui.initTheme();
            ui.updateCurrentDate();
            formManager.init();
            
            // 6. Инициализация модулей
            if (typeof calendarManager !== 'undefined') calendarManager.init();
            if (typeof statsManager !== 'undefined') statsManager.initCharts();
            if (typeof telegram !== 'undefined') await telegram.init();
            
            // 7. Настройка обработчиков UI
            ui.setupAllHandlers();
            
            // 8. Настройка обработчиков событий
            this.setupEventListeners();
            
            // 9. Настройка поиска
            if (typeof taskManager !== 'undefined') {
                taskManager.setupSearch();
            }
            
            // 10. Первоначальный рендеринг
            this.updateUI();
            
            // 11. Скрываем загрузочный экран
            setTimeout(() => {
                this.hideLoadingScreen();
                console.log('✅ TaskFlow инициализирован!');
            }, 500);
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this.showError(error.message);
        }
    }
    
    // ... остальные методы остаются такими же ...
    
    setupEventListeners() {
        // Быстрые фильтры
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                taskFlow.currentFilter = filter;
                
                // Обновляем активную кнопку
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Обновляем список задач
                if (typeof taskManager !== 'undefined') {
                    taskManager.updateAllTaskLists();
                }
            });
        });
        
        // Поиск в архиве
        const archiveSearch = document.getElementById('archive-search');
        if (archiveSearch) {
            archiveSearch.addEventListener('input', (e) => {
                clearTimeout(this.archiveSearchTimeout);
                this.archiveSearchTimeout = setTimeout(() => {
                    if (typeof archiveManager !== 'undefined') {
                        archiveManager.searchInArchive(e.target.value);
                    }
                }, 300);
            });
        }
        
        // ... остальные обработчики ...
    }
    
    // ... остальные методы ...
}

// Глобальные функции
window.taskFlowApp = new TaskFlowApp();

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен');
    console.log('Telegram WebApp доступен:', !!window.Telegram?.WebApp);
    console.log('initDataUnsafe:', window.Telegram?.WebApp?.initDataUnsafe);
    
    window.taskFlowApp.init();
});
