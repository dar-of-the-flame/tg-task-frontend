// UI утилиты
class UIManager {
    constructor() {
        this.modals = new Map();
        this.toasts = [];
    }
    
    // Инициализация темы
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        const icon = document.getElementById('theme-toggle')?.querySelector('i');
        
        if (!icon) return;
        
        if (savedTheme === 'light') {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }
    
    // Переключение темы
    toggleTheme() {
        const icon = document.getElementById('theme-toggle')?.querySelector('i');
        if (!icon) return;
        
        const isDark = document.body.classList.contains('dark-theme');
        
        if (isDark) {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            localStorage.setItem('theme', 'dark');
        }
        
        // Обновляем графики
        if (typeof statsManager !== 'undefined') {
            statsManager.updateChartsTheme();
        }
    }
    
    // Переключение страниц
    switchPage(page) {
        // Обновляем активную кнопку навигации
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === page) {
                btn.classList.add('active');
            }
        });
        
        // Показываем активную страницу
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.classList.add('active');
        }
        
        // Обновляем контент страницы
        switch (page) {
            case 'tasks':
                if (typeof taskManager !== 'undefined') {
                    taskManager.updateAllTaskLists();
                }
                break;
            case 'calendar':
                if (typeof calendarManager !== 'undefined') {
                    calendarManager.renderCalendar();
                    calendarManager.updateDayTasks();
                }
                break;
            case 'archive':
                if (typeof archiveManager !== 'undefined') {
                    archiveManager.renderArchive();
                }
                break;
            case 'stats':
                if (typeof statsManager !== 'undefined') {
                    statsManager.updateStats();
                }
                break;
        }
        
        // Закрываем FAB меню
        const fabMain = document.getElementById('fab-main');
        const fabMenu = document.getElementById('fab-menu');
        if (fabMain) fabMain.classList.remove('rotate');
        if (fabMenu) fabMenu.classList.remove('open');
        
        // Обновляем текущую страницу
        taskFlow.currentPage = page;
    }
    
    // Показать/скрыть загрузку
    showLoading(show) {
        const loader = document.getElementById('global-loading');
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    }
    
    // Показать уведомление
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span class="toast-message">${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Анимация появления
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Автоматическое скрытие
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
        
        this.toasts.push(toast);
    }
    
    // Открытие модального окна
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            this.modals.set(modalId, modal);
            
            // Показываем кнопку "Назад" в Telegram
            if (typeof telegram !== 'undefined') {
                telegram.showBackButton();
            }
        }
    }
    
    // Закрытие модального окна
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            this.modals.delete(modalId);
            
            // Скрываем кнопку "Назад" в Telegram
            if (typeof telegram !== 'undefined') {
                telegram.hideBackButton();
            }
        }
    }
    
    // Закрытие всех модальных окон
    closeAllModals() {
        this.modals.forEach(modal => {
            modal.style.display = 'none';
        });
        this.modals.clear();
        
        if (typeof telegram !== 'undefined') {
            telegram.hideBackButton();
        }
    }
    
    // Настройка FAB меню
    setupFAB() {
        const fabMain = document.getElementById('fab-main');
        const fabMenu = document.getElementById('fab-menu');
        
        if (!fabMain || !fabMenu) return;
        
        fabMain.addEventListener('click', () => {
            fabMain.classList.toggle('rotate');
            fabMenu.classList.toggle('open');
            
            if (fabMenu.classList.contains('open') && typeof telegram !== 'undefined') {
                telegram.showBackButton();
            } else {
                telegram.hideBackButton();
            }
        });
        
        // Клик вне меню
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.fab-container') && 
                fabMenu.classList.contains('open')) {
                fabMain.classList.remove('rotate');
                fabMenu.classList.remove('open');
                if (typeof telegram !== 'undefined') {
                    telegram.hideBackButton();
                }
            }
        });
        
        // Кнопки в FAB меню
        document.querySelectorAll('.fab-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                
                switch(action) {
                    case 'quick-task':
                        document.getElementById('task-text').value = '';
                        document.querySelector('[data-type="task"]')?.click();
                        this.openModal('task-modal');
                        break;
                    case 'add-note':
                        document.getElementById('task-text').value = '';
                        document.querySelector('[data-type="note"]')?.click();
                        this.openModal('task-modal');
                        break;
                    case 'add-reminder':
                        document.getElementById('task-text').value = '';
                        document.querySelector('[data-type="reminder"]')?.click();
                        this.openModal('task-modal');
                        break;
                }
            });
        });
    }
    
    // Настройка фильтров
    setupFilters() {
        const filterToggle = document.getElementById('filter-toggle-btn');
        const filtersPanel = document.getElementById('filters-panel');
        const closeFilters = document.querySelector('.close-filters');
        
        if (!filterToggle || !filtersPanel || !closeFilters) return;
        
        filterToggle.addEventListener('click', () => {
            filtersPanel.classList.add('open');
            if (typeof telegram !== 'undefined') {
                telegram.showBackButton();
            }
        });
        
        closeFilters.addEventListener('click', () => {
            filtersPanel.classList.remove('open');
            if (typeof telegram !== 'undefined') {
                telegram.hideBackButton();
            }
        });
        
        // Применение фильтров
        const applyFiltersBtn = document.getElementById('apply-filters');
        const resetFiltersBtn = document.getElementById('reset-filters');
        
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                const categories = Array.from(document.querySelectorAll('input[name="category"]:checked'))
                    .map(cb => cb.value);
                const priorities = Array.from(document.querySelectorAll('input[name="priority"]:checked'))
                    .map(cb => cb.value);
                const statuses = Array.from(document.querySelectorAll('input[name="status"]:checked'))
                    .map(cb => cb.value);
                
                if (typeof taskManager !== 'undefined') {
                    taskManager.applyFilters(categories, priorities, statuses);
                }
            });
        }
        
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                if (typeof taskManager !== 'undefined') {
                    taskManager.resetFilters();
                }
            });
        }
    }
    
    // Настройка навигации
    setupNavigation() {
        // Кнопки навигации
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.switchPage(page);
            });
        });
        
        // Кнопка темы
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        // Кнопка поиска
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                // Реализуйте поиск
                alert('Функция поиска в разработке');
            });
        }
    }
    
    // Обновление текущей даты в header
    updateCurrentDate() {
        const element = document.getElementById('current-date');
        if (element) {
            const now = new Date();
            element.textContent = now.toLocaleDateString('ru-RU', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
    }
    
    // Установка значений формы по умолчанию
    setupFormDefaults() {
        const now = new Date();
        const dateInput = document.getElementById('task-date');
        const timeInput = document.getElementById('task-time');
        
        if (dateInput) {
            dateInput.valueAsDate = now;
            dateInput.min = now.toISOString().split('T')[0];
        }
        
        if (timeInput) {
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            timeInput.value = `${hours}:${minutes}`;
        }
    }
    
    // Настройка всех обработчиков
    setupAllHandlers() {
        this.setupFAB();
        this.setupFilters();
        this.setupNavigation();
        this.setupFormDefaults();
        this.setupModalHandlers();
    }
    
    // Настройка обработчиков модальных окон
    setupModalHandlers() {
        // Закрытие модалок
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });
        
        // Форма создания задачи
        const taskForm = document.getElementById('task-form');
        if (taskForm) {
            taskForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                try {
                    const formData = formManager.getFormData();
                    formData.user_id = taskFlow.userId;
                    
                    const result = await taskManager.createTask(formData);
                    
                    if (result.success) {
                        this.closeAllModals();
                        formManager.resetForm();
                        this.showToast('Задача создана!', 'success');
                    } else {
                        throw new Error(result.error);
                    }
                } catch (error) {
                    console.error('Ошибка создания задачи:', error);
                    alert(error.message);
                }
            });
        }
        
        // Форма быстрой заметки
        const quickNoteForm = document.getElementById('quick-note-form');
        if (quickNoteForm) {
            quickNoteForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const text = document.getElementById('quick-note-text').value;
                if (text.trim()) {
                    // Создаем заметку
                    const note = {
                        text: text,
                        category: 'personal',
                        priority: 'low',
                        is_reminder: false,
                        task_type: 'note'
                    };
                    
                    // Добавляем задачу
                    taskManager.createTask(note);
                    this.closeAllModals();
                    document.getElementById('quick-note-text').value = '';
                }
            });
        }
    }
}

// Создаем и экспортируем экземпляр
const ui = new UIManager();
window.ui = ui;

// Глобальные функции для вызова из HTML
window.showToast = (message, type) => ui.showToast(message, type);
window.switchPage = (page) => ui.switchPage(page);
window.openTaskForm = (options = {}) => {
    formManager.resetForm();
    
    if (options.type) {
        document.querySelector(`[data-type="${options.type}"]`)?.click();
    }
    
    if (options.date) {
        document.getElementById('task-date').value = options.date;
    }
    
    ui.openModal('task-modal');
};
