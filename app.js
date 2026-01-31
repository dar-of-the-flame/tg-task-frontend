// Главный файл инициализации
class TaskFlowApp {
    constructor() {
        this.isInitialized = false;
    }
    
    async init() {
        try {
            console.log('🚀 Инициализация TaskFlow...');
            
            // 1. Инициализация Telegram
            await telegram.init();
            
            // 2. Устанавливаем userId для синхронизации
            if (telegram.user?.id) {
                taskFlow.userId = telegram.user.id;
            } else {
                // В веб-режиме используем случайный ID
                taskFlow.userId = `web_${Date.now()}`;
            }
            
            console.log('👤 User ID:', taskFlow.userId);
            
            // 3. Проверяем бэкенд
            await this.checkBackend();
            
            // 4. Загружаем данные (локальные + с сервера)
            await this.loadData();
            
            // 5. Инициализация UI
            ui.initTheme();
            ui.updateCurrentDate();
            formManager.init();
            
            // 6. Инициализация модулей
            calendarManager.init();
            statsManager.initCharts();
            
            // 7. Настройка обработчиков
            this.setupEventListeners();
            
            // 8. Первоначальный рендеринг
            this.updateUI();
            
            // 9. Скрываем загрузочный экран
            setTimeout(() => {
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                }
                document.querySelector('.app-container').style.display = 'flex';
            }, 500);
            
            this.isInitialized = true;
            console.log('✅ TaskFlow инициализирован!');
            
            // Показываем приветственное сообщение
            setTimeout(() => {
                if (typeof showToast === 'function') {
                    showToast('TaskFlow готов к работе!', 'success');
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            
            // Все равно показываем интерфейс
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
            document.querySelector('.app-container').style.display = 'flex';
            
            // Показываем сообщение об ошибке
            if (typeof showToast === 'function') {
                showToast('Приложение загружено в оффлайн-режиме', 'warning');
            }
        }
    }
    
    async checkBackend() {
        try {
            const isConnected = await taskFlow.checkBackendConnection();
            if (isConnected) {
                console.log('✅ Соединение с бэкендом установлено');
                telegram.isBackendAvailable = true;
            } else {
                console.log('⚠️ Бэкенд недоступен, работаем в оффлайн-режиме');
                telegram.isBackendAvailable = false;
            }
        } catch (error) {
            console.warn('⚠️ Ошибка проверки бэкенда:', error);
            telegram.isBackendAvailable = false;
        }
    }
    
    async loadData() {
        try {
            console.log('📁 Загрузка данных...');
            
            // Пытаемся синхронизировать с сервером
            if (telegram.isBackendAvailable) {
                await taskFlow.syncWithServer();
            } else {
                // Загружаем только локальные данные
                taskFlow.loadFromStorage();
                taskFlow.processTasks();
            }
            
            console.log(`📊 Загружено: ${taskFlow.allTasks.length} активных задач`);
            console.log(`📊 Загружено: ${taskFlow.archivedTasks.length} архивных задач`);
            
            // Если задач нет, создаем демо-задачу
            if (taskFlow.allTasks.length === 0) {
                this.createDemoTask();
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            this.createDemoTask();
        }
    }
    
    createDemoTask() {
        const now = new Date();
        
        taskFlow.allTasks = [{
            id: taskFlow.generateTaskId(),
            user_id: taskFlow.userId,
            text: 'Добро пожаловать в TaskFlow! 👋',
            category: 'personal',
            priority: 'medium',
            date: now.toISOString().split('T')[0],
            time: '12:00',
            reminder: 0,
            emoji: '🎯',
            completed: false,
            deleted: false,
            created_at: now.toISOString()
        }];
        
        taskFlow.saveToStorage();
        console.log('📝 Создана демо-задача');
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
                const text = document.getElementById('task-text').value.trim();
                const category = document.getElementById('task-category').value;
                const priority = document.getElementById('task-priority').value;
                const date = document.getElementById('task-date').value;
                const time = document.getElementById('task-time').value;
                const reminder = parseInt(document.getElementById('task-reminder').value) || 0;
                
                if (!text) {
                    throw new Error('Введите текст задачи');
                }
                
                // Создаем задачу
                const taskData = {
                    text,
                    category,
                    priority,
                    date,
                    time,
                    reminder
                };
                
                const result = await taskManager.createTask(taskData);
                
                if (result.success) {
                    // Закрываем форму
                    ui.closeModal('task-modal');
                    formManager.resetForm();
                    
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
        console.log('- Current Page:', taskFlow.currentPage);
        console.log('- Telegram User:', telegram.user);
        console.log('- Backend Available:', telegram.isBackendAvailable);
    };
});
