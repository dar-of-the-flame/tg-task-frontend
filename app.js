// Главный файл инициализации
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
            this.showLoadingMessage('Проверка подключения...');
            
            // 2. Инициализация Telegram
            const telegramInit = await telegram.init();
            if (!telegramInit) {
                throw new Error('Не удалось инициализировать Telegram');
            }
            
            // 3. Устанавливаем userId
            if (telegram.user?.id) {
                taskFlow.userId = telegram.user.id;
                console.log('👤 Telegram User ID:', taskFlow.userId);
            } else {
                // Если нет Telegram авторизации, используем WebApp данные
                if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
                    taskFlow.userId = window.Telegram.WebApp.initDataUnsafe.user.id;
                    console.log('👤 WebApp User ID:', taskFlow.userId);
                } else {
                    // В браузерном режиме не работаем
                    throw new Error('Требуется авторизация в Telegram. Откройте приложение через бота.');
                }
            }
            
            // 4. Проверяем бэкенд
            this.showLoadingMessage('Проверка сервера...');
            const backendAvailable = await this.checkBackend();
            
            if (!backendAvailable) {
                throw new Error('Сервер недоступен. Проверьте подключение к интернету и попробуйте снова.');
            }
            
            // 5. Загружаем данные с сервера
            this.showLoadingMessage('Загрузка данных...');
            await this.loadData();
            
            // 6. Инициализация UI
            ui.initTheme();
            ui.updateCurrentDate();
            formManager.init();
            
            // 7. Инициализация модулей
            calendarManager.init();
            statsManager.initCharts();
            
            // 8. Настройка обработчиков
            this.setupEventListeners();
            
            // 9. Первоначальный рендеринг
            this.updateUI();
            
            // 10. Скрываем загрузочный экран
            setTimeout(() => {
                this.hideLoadingScreen();
                console.log('✅ TaskFlow инициализирован!');
                
                // Показываем приветственное сообщение
                setTimeout(() => {
                    if (typeof showToast === 'function') {
                        showToast('TaskFlow готов к работе!', 'success');
                    }
                }, 500);
                
            }, 1000);
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this.showError(error.message);
        }
    }
    
    async checkBackend() {
        try {
            console.log('🌐 Проверка соединения с бэкендом...');
            
            const response = await fetch(`${taskFlow.CONFIG.BACKEND_URL}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(10000) // 10 секунд таймаут
            });
            
            if (response.ok) {
                telegram.isBackendAvailable = true;
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
                
                // Ждем 2 секунды перед следующей попыткой
                await new Promise(resolve => setTimeout(resolve, 2000));
                return await this.checkBackend();
            }
            
            telegram.isBackendAvailable = false;
            return false;
        }
    }
    
    async loadData() {
        try {
            console.log('📁 Загрузка данных с сервера...');
            
            if (!telegram.isBackendAvailable) {
                throw new Error('Нет подключения к серверу');
            }
            
            if (!taskFlow.userId) {
                throw new Error('Не указан User ID');
            }
            
            // Синхронизируем с сервером
            const synced = await taskFlow.syncWithServer();
            
            if (!synced) {
                throw new Error('Не удалось загрузить данные с сервера');
            }
            
            console.log(`📊 Загружено: ${taskFlow.allTasks.length} активных задач`);
            console.log(`📊 Загружено: ${taskFlow.archivedTasks.length} архивных задач`);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            throw error;
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
        document.querySelector('.app-container').style.display = 'flex';
    }
    
    showError(message) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="text-align: center; color: white; max-width: 90%;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 64px; margin-bottom: 20px; color: #ff6b6b;"></i>
                    <h2 style="color: #ff6b6b; margin-bottom: 15px;">Ошибка запуска</h2>
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
                            min-width: 120px;
                        ">
                            <i class="fas fa-redo"></i> Перезагрузить
                        </button>
                        <button onclick="taskFlowApp.openTelegramBot()" style="
                            background: #667eea;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 8px;
                            font-weight: 600;
                            cursor: pointer;
                            min-width: 120px;
                        ">
                            <i class="fab fa-telegram"></i> Открыть бота
                        </button>
                    </div>
                    <p style="margin-top: 20px; font-size: 12px; opacity: 0.8;">
                        Если проблема повторяется, проверьте:<br>
                        1. Подключение к интернету<br>
                        2. Что бот доступен: @RSplanersisBot<br>
                        3. Сервер работает: https://tg-task-bot-service.onrender.com
                    </p>
                </div>
            `;
        }
    }
    
    openTelegramBot() {
        // Пытаемся открыть Telegram бота
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.openTelegramLink('https://t.me/RSplanersisBot');
        } else {
            window.open('https://t.me/RSplanersisBot', '_blank');
        }
    }
    
    setupEventListeners() {
        // Навигация
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                ui.switchPage(page);
            });
        });
        
        // Быстрые фильтры
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                taskFlow.currentFilter = e.currentTarget.dataset.filter;
                taskManager.updateTaskList();
            });
        });
        
        // Фильтры (применение)
        document.getElementById('apply-filters')?.addEventListener('click', () => {
            const categories = Array.from(document.querySelectorAll('input[name="category"]:checked'))
                .map(cb => cb.value);
            const priorities = Array.from(document.querySelectorAll('input[name="priority"]:checked'))
                .map(cb => cb.value);
            const statuses = Array.from(document.querySelectorAll('input[name="status"]:checked'))
                .map(cb => cb.value);
            
            taskManager.applyFilters(categories, priorities, statuses);
            showToast('Фильтры применены', 'success');
        });
        
        // Фильтры (сброс)
        document.getElementById('reset-filters')?.addEventListener('click', () => {
            taskManager.resetFilters();
            showToast('Фильтры сброшены', 'info');
        });
        
        // Форма задачи
        document.getElementById('task-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                ui.showLoading(true);
                
                // Получаем данные формы
                const formData = formManager.getFormData();
                
                // Добавляем user_id
                formData.user_id = taskFlow.userId;
                
                // Создаем задачу
                const result = await taskManager.createTask(formData);
                
                if (result.success) {
                    // Закрываем форму
                    ui.closeModal('task-modal');
                    formManager.resetForm();
                    
                    // Обновляем UI
                    this.updateUI();
                    
                    // Показываем уведомление
                    showToast('Задача сохранена!', 'success');
                } else {
                    showToast(result.error || 'Ошибка сохранения', 'error');
                }
                
            } catch (error) {
                console.error('Ошибка:', error);
                showToast(error.message || 'Ошибка сохранения задачи', 'error');
            } finally {
                ui.showLoading(false);
            }
        });
        
        // Кнопка "Сейчас" для времени
        document.getElementById('set-now-btn')?.addEventListener('click', () => {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            document.getElementById('task-time').value = `${hours}:${minutes}`;
        });
        
        // Категории в форме
        document.querySelectorAll('.category-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                document.querySelectorAll('.category-tag').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.getElementById('task-category').value = e.currentTarget.dataset.category;
            });
        });
        
        // Приоритеты в форме
        document.querySelectorAll('.priority-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.getElementById('task-priority').value = e.currentTarget.dataset.priority;
            });
        });
        
        // Закрытие модальных окон
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                ui.closeAllModals();
            });
        });
        
        // Клик вне модальных окон
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    telegram.hideBackButton();
                }
            });
        });
        
        // FAB меню
        document.querySelectorAll('.fab-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
                
                // Закрываем меню
                const fabMain = document.getElementById('fab-main');
                const fabMenu = document.getElementById('fab-menu');
                if (fabMain) fabMain.classList.remove('rotate');
                if (fabMenu) fabMenu.classList.remove('open');
                telegram.hideBackButton();
            });
        });
        
        // Кнопка FAB
        document.getElementById('fab-main')?.addEventListener('click', () => {
            const fabMain = document.getElementById('fab-main');
            const fabMenu = document.getElementById('fab-menu');
            
            fabMain.classList.toggle('rotate');
            fabMenu.classList.toggle('open');
            
            if (fabMenu.classList.contains('open')) {
                telegram.showBackButton();
            } else {
                telegram.hideBackButton();
            }
        });
        
        // Тема
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            ui.toggleTheme();
        });
        
        // Календарь
        document.getElementById('today-btn')?.addEventListener('click', () => {
            calendarManager.goToToday();
        });
        
        document.getElementById('prev-month')?.addEventListener('click', () => {
            calendarManager.prevMonth();
        });
        
        document.getElementById('next-month')?.addEventListener('click', () => {
            calendarManager.nextMonth();
        });
        
        // Архив
        document.getElementById('clear-archive')?.addEventListener('click', () => {
            archiveManager.clearArchive();
        });
        
        // Поиск в архиве
        const archiveSearch = document.getElementById('archive-search');
        if (archiveSearch) {
            archiveSearch.addEventListener('input', (e) => {
                archiveManager.searchInArchive(e.target.value);
            });
        }
        
        // Статистика
        document.getElementById('refresh-stats')?.addEventListener('click', () => {
            statsManager.updateStats();
            showToast('Статистика обновлена', 'success');
        });
    }
    
    // Обработка быстрых действий
    handleQuickAction(action) {
        switch (action) {
            case 'quick-task':
                this.openTaskForm({ type: 'quick' });
                break;
                
            case 'add-note':
                this.openQuickNoteModal();
                break;
                
            case 'add-reminder':
                this.openTaskForm({ type: 'reminder' });
                break;
        }
    }
    
    // Открытие формы задачи
    openTaskForm(options = {}) {
        // Проверяем подключение
        if (!telegram.isBackendAvailable) {
            showToast('Нет подключения к серверу. Задачи не будут сохранены.', 'error');
            return;
        }
        
        // Сбрасываем форму
        const form = document.getElementById('task-form');
        if (form) form.reset();
        
        // Устанавливаем значения по умолчанию
        ui.setupFormDefaults();
        
        // Настраиваем в зависимости от типа
        if (options.type === 'quick') {
            document.getElementById('task-reminder').value = '0';
        } else if (options.type === 'reminder') {
            document.getElementById('task-reminder').value = '15';
        }
        
        // Устанавливаем выбранную дату из календаря
        if (options.date) {
            document.getElementById('task-date').value = options.date;
        }
        
        // Показываем модальное окно
        ui.openModal('task-modal');
        
        // Фокус на тексте задачи
        setTimeout(() => {
            const textInput = document.getElementById('task-text');
            if (textInput) textInput.focus();
        }, 100);
    }
    
    // Открытие формы быстрой заметки
    openQuickNoteModal() {
        ui.openModal('quick-note-modal');
        
        setTimeout(() => {
            const textInput = document.getElementById('quick-note-text');
            if (textInput) textInput.focus();
        }, 100);
    }
    
    // Обновление UI
    updateUI() {
        // Обновляем все страницы
        if (typeof taskManager !== 'undefined') {
            taskManager.updateTaskList();
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
    
    // Обновление приложения
    refresh() {
        if (!this.isInitialized) return;
        
        taskFlow.processTasks();
        this.updateUI();
        showToast('Приложение обновлено', 'success');
    }
}

// Глобальные функции
window.openTaskForm = (options) => {
    const app = window.taskFlowApp;
    if (app) app.openTaskForm(options);
};

window.openQuickNoteModal = () => {
    const app = window.taskFlowApp;
    if (app) app.openQuickNoteModal();
};

window.openTaskFormForDate = (dateStr) => {
    const app = window.taskFlowApp;
    if (app) app.openTaskForm({ date: dateStr });
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.taskFlowApp = new TaskFlowApp();
    window.taskFlowApp.init();
    
    // Глобальные функции для отладки
    window.refreshApp = () => window.taskFlowApp.refresh();
    window.showDebugInfo = () => {
        console.log('📊 Debug Info:');
        console.log('- User ID:', taskFlow.userId);
        console.log('- Tasks:', taskFlow.allTasks.length);
        console.log('- Archived:', taskFlow.archivedTasks.length);
        console.log('- Telegram User:', telegram.user);
        console.log('- Backend Available:', telegram.isBackendAvailable);
        console.log('- WebApp:', window.Telegram?.WebApp);
    };
});
