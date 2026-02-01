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
    
    showUserIdPrompt() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="text-align: center; color: white; max-width: 90%;">
                    <i class="fas fa-user-circle" style="font-size: 64px; margin-bottom: 20px; color: #667eea;"></i>
                    <h2 style="margin-bottom: 15px;">Введите ваш User ID</h2>
                    <p style="margin-bottom: 25px; line-height: 1.5;">
                        Чтобы использовать TaskFlow, нужен ваш Telegram User ID.<br>
                        Откройте бота @RSplanersisBot и отправьте команду <code>/myid</code>
                    </p>
                    
                    <div style="margin-bottom: 20px; text-align: left; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; font-size: 14px;">
                        <strong>Как получить ID:</strong>
                        <ol style="margin: 10px 0; padding-left: 20px;">
                            <li>Откройте @RSplanersisBot в Telegram</li>
                            <li>Отправьте команду <code>/myid</code></li>
                            <li>Скопируйте цифры (пример: 123456789)</li>
                            <li>Вставьте в поле ниже</li>
                        </ol>
                    </div>
                    
                    <input type="text" id="user-id-input" placeholder="Введите ваш User ID" style="
                        width: 100%;
                        padding: 12px 15px;
                        border: 2px solid #667eea;
                        border-radius: 8px;
                        background: rgba(255,255,255,0.1);
                        color: white;
                        font-size: 16px;
                        margin-bottom: 15px;
                    ">
                    
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="taskFlowApp.saveUserId()" style="
                            background: #667eea;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-weight: 600;
                            cursor: pointer;
                            min-width: 120px;
                        ">
                            <i class="fas fa-check"></i> Сохранить
                        </button>
                        <button onclick="location.reload()" style="
                            background: rgba(255,255,255,0.1);
                            color: white;
                            border: 1px solid rgba(255,255,255,0.3);
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-weight: 600;
                            cursor: pointer;
                        ">
                            <i class="fas fa-redo"></i> Обновить
                        </button>
                    </div>
                    
                    <p style="margin-top: 20px; font-size: 12px; opacity: 0.8;">
                        Или откройте приложение через кнопку в боте
                    </p>
                </div>
            `;
        }
    }
    
    saveUserId() {
        const input = document.getElementById('user-id-input');
        if (!input || !input.value.trim()) {
            alert('Введите User ID');
            return;
        }
        
        const userId = input.value.trim();
        taskFlow.userId = userId;
        localStorage.setItem('taskflow_user_id', userId);
        
        // Продолжаем инициализацию
        this.showLoadingMessage('Сохранение...');
        setTimeout(() => {
            this.init();
        }, 500);
    }
    
    async checkBackend() {
        try {
            console.log('🌐 Проверка соединения с бэкендом...');
            
            const response = await fetch(`${taskFlow.CONFIG.BACKEND_URL}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                console.log('✅ Бэкенд доступен');
                return true;
            } else {
                console.log('❌ Бэкенд не отвечает');
                return false;
            }
            
        } catch (error) {
            console.warn('⚠️ Ошибка проверки бэкенда:', error.message);
            
            // Пробуем переподключиться
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`🔄 Попытка переподключения ${this.retryCount}/${this.maxRetries}...`);
                
                this.showLoadingMessage(`Переподключение... (${this.retryCount}/${this.maxRetries})`);
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                return await this.checkBackend();
            }
            
            return false;
        }
    }
    
    async loadData() {
        try {
            console.log('📁 Загрузка данных с сервера...');
            
            if (!taskFlow.userId) {
                throw new Error('Не указан User ID');
            }
            
            // Синхронизируем с сервером
            const response = await fetch(
                `${taskFlow.CONFIG.BACKEND_URL}/api/tasks?user_id=${taskFlow.userId}`,
                { 
                    signal: AbortSignal.timeout(10000)
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Не удалось загрузить задачи`);
            }
            
            const result = await response.json();
            
            if (result.status === 'ok') {
                taskFlow.allTasks = result.tasks || [];
                console.log(`📊 Загружено: ${taskFlow.allTasks.length} задач`);
                
                // Обновляем данные
                taskFlow.processTasks();
                taskFlow.saveToStorage();
            } else {
                throw new Error(result.message || 'Ошибка сервера');
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            
            // Загружаем из localStorage
            taskFlow.loadFromStorage();
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
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.style.display = 'flex';
        }
    }
    
    showError(message) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="text-align: center; color: white; max-width: 90%;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 64px; margin-bottom: 20px; color: #ff6b6b;"></i>
                    <h2 style="color: #ff6b6b; margin-bottom: 15px;">Ошибка</h2>
                    <p style="margin-bottom: 25px; line-height: 1.5;">${message}</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="location.reload()" style="
                            background: white;
                            color: #667eea;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 8px;
                            font-weight: 600;
                            cursor: pointer;
                        ">
                            <i class="fas fa-redo"></i> Перезагрузить
                        </button>
                        <button onclick="taskFlowApp.showUserIdPrompt()" style="
                            background: #667eea;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 8px;
                            font-weight: 600;
                            cursor: pointer;
                        ">
                            <i class="fas fa-user"></i> Ввести User ID
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
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
        
        // Очистка архива
        const clearArchiveBtn = document.getElementById('clear-archive');
        if (clearArchiveBtn) {
            clearArchiveBtn.addEventListener('click', () => {
                if (typeof archiveManager !== 'undefined') {
                    archiveManager.clearArchive();
                }
            });
        }
        
        // Обновление статистики
        const refreshStatsBtn = document.getElementById('refresh-stats');
        if (refreshStatsBtn) {
            refreshStatsBtn.addEventListener('click', () => {
                if (typeof statsManager !== 'undefined') {
                    statsManager.updateStats();
                }
            });
        }
        
        // Экспорт статистики
        const exportStatsBtn = document.getElementById('export-stats');
        if (exportStatsBtn) {
            exportStatsBtn.addEventListener('click', () => {
                taskFlow.exportData();
            });
        }
        
        // Поиск в архиве
        const archiveSearch = document.getElementById('archive-search');
        if (archiveSearch) {
            this.archiveSearchTimeout = null;
            archiveSearch.addEventListener('input', (e) => {
                clearTimeout(this.archiveSearchTimeout);
                this.archiveSearchTimeout = setTimeout(() => {
                    if (typeof archiveManager !== 'undefined') {
                        archiveManager.searchInArchive(e.target.value);
                    }
                }, 300);
            });
        }
        
        // Сортировка
        const sortBtn = document.getElementById('sort-btn');
        if (sortBtn) {
            sortBtn.addEventListener('click', () => {
                if (typeof taskManager !== 'undefined') {
                    taskManager.sortTasks();
                }
            });
        }
        
        // Фильтры архива
        document.querySelectorAll('input[name="archive-type"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                if (typeof archiveManager !== 'undefined') {
                    const filterValues = Array.from(document.querySelectorAll('input[name="archive-type"]:checked'))
                        .map(cb => cb.value);
                    
                    // Фильтруем архив
                    archiveManager.filterArchive(filterValues);
                }
            });
        });
    }
    
    updateUI() {
        // Обновляем все страницы
        if (typeof taskManager !== 'undefined') {
            taskManager.updateAllTaskLists();
        }
        
        if (typeof calendarManager !== 'undefined') {
            calendarManager.renderCalendar();
            calendarManager.updateDayTasks();
        }
        
        if (typeof archiveManager !== 'undefined') {
            archiveManager.renderArchive();
        }
        
        if (typeof statsManager !== 'undefined') {
            statsManager.updateStats();
        }
    }
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
