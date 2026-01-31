class TaskFlowApp {
    constructor() {
        this.isInitialized = false;
    }
    
    async init() {
        try {
            console.log('🚀 Инициализация TaskFlow...');
            
            await telegram.init();
            
            const isBackendAvailable = await telegram.checkBackend();
            
            if (!isBackendAvailable) {
                throw new Error('Не удалось подключиться к серверу');
            }
            
            await this.loadDataFromServer();
            
            ui.initTheme();
            ui.updateCurrentDate();
            formManager.init();
            
            calendarManager.init();
            
            this.setupEventListeners();
            
            this.updateUI();
            
            setTimeout(() => {
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                }
                document.querySelector('.app-container').style.display = 'flex';
            }, 500);
            
            this.isInitialized = true;
            console.log('✅ TaskFlow инициализирован!');
            
            if (typeof showToast === 'function') {
                showToast('Приложение загружено', 'success');
            }
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.innerHTML = `
                    <div style="text-align: center; color: white;">
                        <h2 style="color: #ff6b6b;">Ошибка подключения</h2>
                        <p>${error.message}</p>
                        <p style="font-size: 14px; margin-top: 10px;">Проверьте подключение к интернету</p>
                        <button onclick="location.reload()" style="
                            background: white;
                            color: #667eea;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 8px;
                            margin-top: 20px;
                            cursor: pointer;
                        ">
                            Повторить попытку
                        </button>
                    </div>
                `;
            }
        }
    }
    
    async loadDataFromServer() {
        try {
            document.getElementById('global-loading').style.display = 'flex';
            
            const synced = await taskFlow.syncWithServer();
            
            if (!synced) {
                throw new Error('Не удалось загрузить данные с сервера');
            }
            
            taskFlow.processTasks();
            
            console.log('📁 Загружено задач с сервера:', taskFlow.allTasks.length);
            console.log('📁 Архивных задач:', taskFlow.archivedTasks.length);
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            throw error;
        } finally {
            document.getElementById('global-loading').style.display = 'none';
        }
    }
    
    setupEventListeners() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                ui.switchPage(page);
            });
        });
        
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                taskFlow.currentFilter = e.currentTarget.dataset.filter;
                taskManager.updateTaskList();
            });
        });
        
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
        
        document.getElementById('reset-filters')?.addEventListener('click', () => {
            taskManager.resetFilters();
            if (typeof showToast === 'function') {
                showToast('Фильтры сброшены', 'info');
            }
        });
        
        document.getElementById('task-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                document.getElementById('global-loading').style.display = 'flex';
                
                const formData = formManager.getFormData();
                const result = await taskManager.createTask(formData);
                
                if (result.success) {
                    ui.closeModal('task-modal');
                    formManager.resetForm();
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
        
        document.getElementById('prev-month')?.addEventListener('click', () => {
            calendarManager.prevMonth();
        });
        
        document.getElementById('next-month')?.addEventListener('click', () => {
            calendarManager.nextMonth();
        });
        
        document.getElementById('today-btn')?.addEventListener('click', () => {
            calendarManager.goToToday();
        });
        
        document.getElementById('clear-archive')?.addEventListener('click', () => {
            archiveManager.clearArchive();
        });
        
        document.getElementById('refresh-stats')?.addEventListener('click', () => {
            statsManager.updateStats();
            if (typeof showToast === 'function') {
                showToast('Статистика обновлена', 'success');
            }
        });
        
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            ui.toggleTheme();
        });
        
        const fabMain = document.getElementById('fab-main');
        const fabMenu = document.getElementById('fab-menu');
        
        if (fabMain && fabMenu) {
            fabMain.addEventListener('click', () => {
                fabMain.classList.toggle('rotate');
                fabMenu.classList.toggle('open');
            });
        }
        
        document.querySelectorAll('.fab-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
                
                if (fabMain) fabMain.classList.remove('rotate');
                if (fabMenu) fabMenu.classList.remove('open');
            });
        });
        
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

document.addEventListener('DOMContentLoaded', () => {
    window.taskFlowApp = new TaskFlowApp();
    window.taskFlowApp.init();
});
