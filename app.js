// app.js - ИСПРАВЛЕННАЯ ВЕРСИЯ (без дублирования)
class TaskFlowApp {
    constructor() {
        this.isInitialized = false;
    }
    
    async init() {
        try {
            console.log('🚀 Инициализация TaskFlow...');
            
            // 1. Инициализация Telegram
            await telegram.init();
            
            // 2. Проверка бэкенда
            await this.checkBackend();
            
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
            if (loadingScreen) loadingScreen.style.display = 'none';
            document.querySelector('.app-container').style.display = 'flex';
            
            if (typeof showToast === 'function') {
                showToast('Ошибка загрузки приложения', 'error');
            }
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
                telegram.isBackendAvailable = data.status === 'ok';
                console.log('Бэкенд доступен:', telegram.isBackendAvailable);
            } else {
                telegram.isBackendAvailable = false;
            }
        } catch (error) {
            console.warn('Бэкенд недоступен, работаем оффлайн');
            telegram.isBackendAvailable = false;
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
            text: 'Добро пожаловать в TaskFlow! Нажмите + чтобы добавить задачу',
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
            if (typeof showToast === 'function') {
                showToast('Фильтры применены', 'success');
            }
        });
        
        // Фильтры (сброс)
        document.getElementById('reset-filters')?.addEventListener('click', () => {
            taskManager.resetFilters();
            if (typeof showToast === 'function') {
                showToast('Фильтры сброшены', 'info');
            }
        });
        
        // Форма задачи
        document.getElementById('task-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                // Показываем загрузку
                document.getElementById('global-loading').style.display = 'flex';
                
                const formData = formManager.getFormData();
                const result = await taskManager.createTask(formData);
                
                if (result.success) {
                    // Закрываем модальное окно
                    ui.closeModal('task-modal');
                    formManager.resetForm();
                    
                    // Обновляем UI
                    this.updateUI();
                    
                    if (typeof showToast === 'function') {
                        showToast('Задача сохранена!', 'success');
                    }
                } else {
                    if (typeof showToast === 'function') {
                        showToast(result.error || 'Ошибка сохранения', 'error');
                    }
                }
                
            } catch (error) {
                console.error('Ошибка:', error);
                if (typeof showToast === 'function') {
                    showToast(error.message || 'Ошибка сохранения', 'error');
                }
            } finally {
                document.getElementById('global-loading').style.display = 'none';
            }
        });
        
        // Календарь
        document.getElementById('prev-month')?.addEventListener('click', () => {
            calendarManager.prevMonth();
        });
        
        document.getElementById('next-month')?.addEventListener('click', () => {
            calendarManager.nextMonth();
        });
        
        document.getElementById('today-btn')?.addEventListener('click', () => {
            calendarManager.goToToday();
        });
        
        // Архив
        document.getElementById('clear-archive')?.addEventListener('click', () => {
            archiveManager.clearArchive();
        });
        
        // Статистика
        document.getElementById('refresh-stats')?.addEventListener('click', () => {
            statsManager.updateStats();
            if (typeof showToast === 'function') {
                showToast('Статистика обновлена', 'success');
            }
        });
        
        // Тема
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            ui.toggleTheme();
        });
        
        // FAB меню
        const fabMain = document.getElementById('fab-main');
        const fabMenu = document.getElementById('fab-menu');
        
        if (fabMain && fabMenu) {
            fabMain.addEventListener('click', () => {
                fabMain.classList.toggle('rotate');
                fabMenu.classList.toggle('open');
            });
        }
        
        // Быстрые действия из FAB меню
        document.querySelectorAll('.fab-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
                
                // Закрываем меню
                if (fabMain) fabMain.classList.remove('rotate');
                if (fabMenu) fabMenu.classList.remove('open');
            });
        });
        
        // Поиск в архиве
        const archiveSearch = document.getElementById('archive-search');
        if (archiveSearch) {
            archiveSearch.addEventListener('input', (e) => {
                archiveManager.searchInArchive(e.target.value);
            });
        }
    }
    
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
    
    openTaskForm(options = {}) {
        formManager.resetForm();
        
        if (options.type) {
            document.querySelector(`.type-tab[data-type="${options.type}"]`)?.click();
        }
        
        if (options.date) {
            document.getElementById('task-date').value = options.date;
        }
        
        ui.openModal('task-modal');
        
        setTimeout(() => {
            document.getElementById('task-text')?.focus();
        }, 100);
    }
    
    openQuickNoteModal() {
        ui.openModal('quick-note-modal');
        setTimeout(() => {
            document.getElementById('quick-note-text')?.focus();
        }, 100);
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
    if (window.taskFlowApp) {
        window.taskFlowApp.openTaskForm(options);
    }
};

window.openQuickNoteModal = () => {
    if (window.taskFlowApp) {
        window.taskFlowApp.openQuickNoteModal();
    }
};

window.openTaskFormForDate = (dateStr) => {
    if (window.taskFlowApp) {
        window.taskFlowApp.openTaskForm({ date: dateStr });
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    window.taskFlowApp = new TaskFlowApp();
    window.taskFlowApp.init();
});
