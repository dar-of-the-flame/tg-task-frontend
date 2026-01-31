// Главный файл инициализации
class TaskFlowApp {
    constructor() {
        this.isInitialized = false;
    }
    
    // Инициализация приложения
    async init() {
        try {
            console.log('🚀 Инициализация TaskFlow...');
            
            // Скрываем загрузочный экран
            setTimeout(() => {
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                }
                document.querySelector('.app-container').style.display = 'flex';
            }, 500);
            
            // 1. Инициализация Telegram
            await telegram.init();
            
            // 2. Инициализация UI
            ui.initTheme();
            ui.updateCurrentDate();
            ui.setupFormDefaults();
            ui.setupFAB();
            ui.setupFilters();
            
            // 3. Загрузка данных
            await this.loadData();
            
            // 4. Инициализация календаря и графиков
            calendarManager.init();
            statsManager.initCharts();
            
            // 5. Настройка обработчиков событий
            this.setupEventListeners();
            
            // 6. Первоначальный рендеринг
            this.updateUI();
            
            // 7. Проверка соединения с бэкендом
            this.checkBackend();
            
            this.isInitialized = true;
            console.log('✅ TaskFlow инициализирован!');
            
            ui.showToast('Приложение готово к работе!', 'success');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            ui.showToast('Ошибка загрузки приложения', 'error');
        }
    }
    
    // Загрузка данных
    async loadData() {
        try {
            ui.showLoading(true);
            
            // Загружаем из локального хранилища
            const localData = taskFlow.loadFromStorage();
            
            if (localData.tasks) {
                taskFlow.allTasks = localData.tasks;
            }
            if (localData.notes) {
                taskFlow.calendarNotes = localData.notes;
            }
            if (localData.filters) {
                taskFlow.activeFilters = localData.filters;
            }
            
            // Обрабатываем задачи
            taskFlow.processTasks();
            
            console.log('📁 Загружено задач:', taskFlow.allTasks.length);
            console.log('📁 Загружено заметок:', taskFlow.calendarNotes.length);
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            ui.showToast('Ошибка загрузки данных', 'error');
            
            // Демо-данные для тестирования
            if (taskFlow.allTasks.length === 0) {
                this.generateDemoData();
            }
        } finally {
            ui.showLoading(false);
        }
    }
    
    // Генерация демо-данных
    generateDemoData() {
        console.log('📝 Создание демо-данных...');
        
        const now = new Date();
        const categories = ['work', 'personal', 'health', 'study'];
        const priorities = ['high', 'medium', 'low'];
        
        taskFlow.allTasks = [
            {
                id: Date.now() + 1,
                user_id: taskFlow.userId,
                text: 'Добро пожаловать в TaskFlow!',
                category: 'personal',
                priority: 'medium',
                date: now.toISOString().split('T')[0],
                time: '',
                reminder: 0,
                completed: false,
                deleted: false,
                created_at: now.toISOString()
            },
            {
                id: Date.now() + 2,
                user_id: taskFlow.userId,
                text: 'Добавьте свою первую задачу',
                category: 'work',
                priority: 'high',
                date: now.toISOString().split('T')[0],
                time: '10:00',
                reminder: 15,
                completed: false,
                deleted: false,
                created_at: now.toISOString()
            }
        ];
        
        taskFlow.saveToStorage();
        ui.showToast('Демо-данные загружены', 'info');
    }
    
    // Настройка обработчиков событий
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
            ui.showToast('Фильтры применены', 'success');
        });
        
        // Фильтры (сброс)
        document.getElementById('reset-filters')?.addEventListener('click', () => {
            taskManager.resetFilters();
            ui.showToast('Фильтры сброшены', 'info');
        });
        
        // Форма задачи
        document.getElementById('task-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                ui.showLoading(true);
                
                const taskData = {
                    text: document.getElementById('task-text').value,
                    category: document.getElementById('task-category').value,
                    priority: document.getElementById('task-priority').value,
                    date: document.getElementById('task-date').value,
                    time: document.getElementById('task-time').value || '',
                    reminder: parseInt(document.getElementById('task-reminder').value) || 0
                };
                
                const result = await taskManager.createTask(taskData);
                
                if (result.success) {
                    // Закрываем модальное окно
                    ui.closeModal('task-modal');
                    
                    // Сбрасываем форму
                    e.target.reset();
                    ui.setupFormDefaults();
                    
                    // Обновляем UI
                    taskManager.updateTaskList();
                    calendarManager.init();
                    
                    ui.showToast('Задача сохранена!', 'success');
                } else {
                    ui.showToast(result.error || 'Ошибка сохранения', 'error');
                }
                
            } catch (error) {
                console.error('Ошибка:', error);
                ui.showToast('Ошибка сохранения задачи', 'error');
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
                const modal = btn.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                    telegram.hideBackButton();
                }
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
        
        // Календарь (управление)
        document.getElementById('prev-month')?.addEventListener('click', () => {
            calendarManager.prevMonth();
        });
        
        document.getElementById('next-month')?.addEventListener('click', () => {
            calendarManager.nextMonth();
        });
        
        document.getElementById('today-btn')?.addEventListener('click', () => {
            calendarManager.goToToday();
        });
        
        // Архив (очистка)
        document.getElementById('clear-archive')?.addEventListener('click', () => {
            archiveManager.clearArchive();
        });
        
        // Статистика (обновление)
        document.getElementById('refresh-stats')?.addEventListener('click', () => {
            statsManager.updateStats();
            ui.showToast('Статистика обновлена', 'success');
        });
        
        // Тема
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            ui.toggleTheme();
        });
        
        // Быстрые действия из FAB меню
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
        
        // Поиск в архиве
        const archiveSearch = document.getElementById('archive-search');
        if (archiveSearch) {
            archiveSearch.addEventListener('input', (e) => {
                archiveManager.searchInArchive(e.target.value);
            });
        }
        
        // Форма быстрой заметки
        document.getElementById('quick-note-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const text = document.getElementById('quick-note-text').value.trim();
            const color = document.getElementById('note-color').value;
            
            if (!text) {
                ui.showToast('Введите текст заметки', 'error');
                return;
            }
            
            const result = await calendarManager.createQuickNote(text, color);
            
            if (result.success) {
                ui.closeModal('quick-note-modal');
                e.target.reset();
                ui.showToast('Заметка сохранена', 'success');
            } else {
                ui.showToast(result.error || 'Ошибка сохранения', 'error');
            }
        });
        
        // Цвета заметок
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
                this.classList.add('active');
                document.getElementById('note-color').value = this.dataset.color;
            });
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
        // Обновляем страницу задач
        taskManager.updateTaskList();
        
        // Обновляем календарь
        calendarManager.init();
        
        // Обновляем архив
        archiveManager.renderArchive();
        
        // Обновляем статистику
        statsManager.updateStats();
    }
    
    // Проверка соединения с бэкендом
    async checkBackend() {
        const isConnected = await taskFlow.checkBackendConnection();
        
        if (isConnected) {
            console.log('✅ Соединение с бэкендом установлено');
        } else {
            console.log('⚠️ Бэкенд недоступен, работаем в оффлайн-режиме');
            ui.showToast('Работаем в оффлайн-режиме', 'warning');
        }
    }
    
    // Обновление приложения
    refresh() {
        if (!this.isInitialized) return;
        
        taskFlow.processTasks();
        this.updateUI();
        ui.showToast('Приложение обновлено', 'success');
    }
}

// Глобальные функции для вызова из HTML
window.openTaskForm = (options) => {
    const app = window.taskFlowApp;
    if (app) app.openTaskForm(options);
};

window.openQuickNoteModal = () => {
    const app = window.taskFlowApp;
    if (app) app.openQuickNoteModal();
};

window.openTaskFormForDate = (dateStr) => {
    const dateInput = document.getElementById('task-date');
    if (dateInput) {
        dateInput.value = dateStr;
    }
    
    const app = window.taskFlowApp;
    if (app) app.openTaskForm();
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Создаем экземпляр приложения
        window.taskFlowApp = new TaskFlowApp();
        
        // Запускаем инициализацию
        await window.taskFlowApp.init();
        
        // Глобальные функции для отладки
        window.refreshApp = () => window.taskFlowApp.refresh();
        window.showDebugInfo = () => {
            console.log('📊 Debug Info:');
            console.log('- User ID:', taskFlow.userId);
            console.log('- Tasks:', taskFlow.allTasks.length);
            console.log('- Archived:', taskFlow.archivedTasks.length);
            console.log('- Notes:', taskFlow.calendarNotes.length);
            console.log('- Current Page:', taskFlow.currentPage);
            console.log('- Active Filters:', taskFlow.activeFilters);
            console.log('- Telegram User:', telegram.user);
        };
        
    } catch (error) {
        console.error('Критическая ошибка инициализации:', error);
        
        // Показываем сообщение об ошибке
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="text-align: center; color: white;">
                    <h2 style="color: #ff6b6b;">Ошибка загрузки</h2>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="
                        background: white;
                        color: #667eea;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        margin-top: 20px;
                        cursor: pointer;
                    ">
                        Перезагрузить
                    </button>
                </div>
            `;

            // app.js - исправленная инициализация
class TaskFlowApp {
    constructor() {
        this.isInitialized = false;
    }
    
    async init() {
        try {
            console.log('🚀 Инициализация TaskFlow...');
            
            // 1. Инициализация Telegram
            await telegram.init();
            
            // 2. Проверяем бэкенд
            await telegram.checkBackend();
            
            if (!telegram.isBackendAvailable) {
                console.log('⚠️ Работаем в оффлайн-режиме');
                // Не показываем тост, просто логируем
            } else {
                console.log('✅ Бэкенд доступен');
                // Пробуем синхронизировать данные
                try {
                    await taskFlow.syncWithServer();
                } catch (syncError) {
                    console.warn('Ошибка синхронизации:', syncError);
                }
            }
            
            // 3. Инициализация UI
            ui.initTheme();
            ui.updateCurrentDate();
            formManager.init();
            
            // 4. Загрузка данных
            await this.loadData();
            
            // 5. Инициализация модулей
            calendarManager.init();
            
            // 6. Настройка обработчиков
            this.setupEventListeners();
            
            // 7. Первоначальный рендеринг
            this.updateUI();
            
            // 8. Скрываем загрузочный экран
            setTimeout(() => {
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                }
                document.querySelector('.app-container').style.display = 'flex';
            }, 500);
            
            this.isInitialized = true;
            console.log('✅ TaskFlow инициализирован!');
            
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
                showToast('Ошибка загрузки приложения', 'error');
            }
        }
    }
    
    async loadData() {
        try {
            // Загружаем из локального хранилища
            const localData = taskFlow.loadFromStorage();
            
            if (localData.tasks) {
                taskFlow.allTasks = localData.tasks;
                taskFlow.processTasks();
                
                console.log('📁 Загружено задач:', taskFlow.allTasks.length);
                console.log('📁 Архивных задач:', taskFlow.archivedTasks.length);
                
                // Если задач нет, создаем демо-задачу
                if (taskFlow.allTasks.length === 0) {
                    this.createDemoTask();
                }
            }
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.createDemoTask();
        }
    }
    
    createDemoTask() {
        const now = new Date();
        
        taskFlow.allTasks = [{
            id: Date.now(),
            user_id: taskFlow.userId,
            text: 'Добро пожаловать в TaskFlow!',
            category: 'personal',
            priority: 'medium',
            date: now.toISOString().split('T')[0],
            time: '10:00',
            completed: false,
            created_at: now.toISOString()
        }];
        
        taskFlow.saveToStorage();
        console.log('📝 Создана демо-задача');
    }
    
    setupEventListeners() {
        // Форма задачи
        const taskForm = document.getElementById('task-form');
        if (taskForm) {
            taskForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                try {
                    ui.showLoading(true);
                    
                    // Получаем данные формы
                    const formData = formManager.getFormData();
                    
                    // Создаем задачу
                    const taskData = {
                        ...formData,
                        id: Date.now(),
                        user_id: taskFlow.userId,
                        completed: false,
                        created_at: new Date().toISOString()
                    };
                    
                    // Сохраняем задачу
                    const result = await taskManager.createTask(taskData);
                    
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
                    showToast(error.message || 'Ошибка сохранения', 'error');
                } finally {
                    ui.showLoading(false);
                }
            });
        }
        
        // Другие обработчики...
    }
    
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
}

// Глобальные функции
window.openTaskForm = (options = {}) => {
    formManager.resetForm();
    
    if (options.type) {
        document.querySelector(`.type-tab[data-type="${options.type}"]`)?.click();
    }
    
    if (options.date) {
        document.getElementById('task-date').value = options.date;
    }
    
    ui.openModal('task-modal');
    
    // Фокус на тексте
    setTimeout(() => {
        document.getElementById('task-text')?.focus();
    }, 100);
};

window.openQuickNoteModal = () => {
    ui.openModal('quick-note-modal');
    setTimeout(() => {
        document.getElementById('quick-note-text')?.focus();
    }, 100);
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    window.taskFlowApp = new TaskFlowApp();
    window.taskFlowApp.init();
});
        }
    }
});
