// core.js - основной модуль TaskFlow
const taskFlow = {
    CONFIG: {
        BACKEND_URL: 'https://tg-task-bot-service.onrender.com',
        STORAGE_KEY: 'taskflow_data'
    },
    
    userId: null,
    allTasks: [],
    archivedTasks: [],
    calendarNotes: [],
    currentPage: 'tasks',
    currentFilter: 'today',
    activeFilters: {
        categories: ['work', 'personal', 'health', 'study'],
        priorities: ['high', 'medium', 'low'],
        status: ['active']
    },
    
    // Инициализация
    init() {
        console.log('🚀 TaskFlow initializing...');
        this.loadFromStorage();
        this.processTasks();
        return this;
    },
    
    // Загрузка из локального хранилища
    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.CONFIG.STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                this.allTasks = parsed.tasks || [];
                this.archivedTasks = parsed.archived || [];
                this.calendarNotes = parsed.notes || [];
                this.activeFilters = parsed.filters || this.activeFilters;
                console.log('📁 Загружено задач:', this.allTasks.length);
                return parsed;
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки из localStorage:', error);
        }
        return {};
    },
    
    // Сохранение в локальное хранилище
    saveToStorage() {
        try {
            const data = {
                tasks: this.allTasks,
                archived: this.archivedTasks,
                notes: this.calendarNotes,
                filters: this.activeFilters,
                lastSync: new Date().toISOString()
            };
            localStorage.setItem(this.CONFIG.STORAGE_KEY, JSON.stringify(data));
            console.log('💾 Данные сохранены:', this.allTasks.length, 'задач');
        } catch (error) {
            console.error('❌ Ошибка сохранения в localStorage:', error);
        }
    },
    
    // Обработка задач (перенос в архив)
    processTasks() {
        const now = new Date();
        
        // Находим завершённые и удалённые задачи
        const completedTasks = this.allTasks.filter(task => task.completed);
        const deletedTasks = this.allTasks.filter(task => task.deleted);
        
        // Добавляем в архив
        this.archivedTasks = [
            ...this.archivedTasks,
            ...completedTasks,
            ...deletedTasks
        ];
        
        // Удаляем из активных
        this.allTasks = this.allTasks.filter(task => 
            !task.completed && !task.deleted
        );
        
        // Очищаем старые архивные задачи (старше 30 дней)
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        this.archivedTasks = this.archivedTasks.filter(task => {
            if (task.deleted_at) {
                return new Date(task.deleted_at) > monthAgo;
            }
            if (task.completed_at) {
                return new Date(task.completed_at) > monthAgo;
            }
            return true;
        });
        
        this.saveToStorage();
    },
    
    // Синхронизация с сервером
    async syncWithServer() {
        if (!this.userId) {
            console.log('⚠️ Нет user_id для синхронизации');
            return false;
        }
        
        try {
            console.log('🔄 Синхронизация с сервером...');
            
            // Загружаем задачи с сервера
            const response = await fetch(
                `${this.CONFIG.BACKEND_URL}/api/tasks?user_id=${this.userId}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'ok') {
                // Объединяем задачи
                const serverTasks = result.tasks || [];
                const mergedTasks = this.mergeTasks(this.allTasks, serverTasks);
                
                this.allTasks = mergedTasks;
                this.processTasks();
                this.saveToStorage();
                
                console.log(`✅ Синхронизировано ${serverTasks.length} задач`);
                return true;
            }
            
            throw new Error(result.message || 'Ошибка сервера');
            
        } catch (error) {
            console.warn('⚠️ Ошибка синхронизации:', error.message);
            return false;
        }
    },
    
    // Объединение задач (серверные имеют приоритет)
    mergeTasks(localTasks, serverTasks) {
        const taskMap = new Map();
        
        // Сначала добавляем локальные задачи
        localTasks.forEach(task => {
            taskMap.set(task.id, { ...task, source: 'local' });
        });
        
        // Затем добавляем/обновляем серверными
        serverTasks.forEach(task => {
            taskMap.set(task.id, { ...task, source: 'server' });
        });
        
        return Array.from(taskMap.values());
    },
    
    // Сохранение задачи на сервер
    async saveTaskToServer(task) {
        try {
            const response = await fetch(`${this.CONFIG.BACKEND_URL}/api/new_task`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(task)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            return result.status === 'ok';
            
        } catch (error) {
            console.warn('⚠️ Ошибка сохранения на сервер:', error.message);
            return false;
        }
    },
    
    // Обновление задачи на сервере
    async updateTaskOnServer(taskId, updates) {
        try {
            const response = await fetch(`${this.CONFIG.BACKEND_URL}/api/update_task`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    task_id: taskId,
                    user_id: this.userId,
                    ...updates
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            return result.status === 'ok';
            
        } catch (error) {
            console.warn('⚠️ Ошибка обновления на сервере:', error.message);
            return false;
        }
    },
    
    // Проверка соединения с бэкендом
    async checkBackendConnection() {
        try {
            const response = await fetch(`${this.CONFIG.BACKEND_URL}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    },
    
    // Форматирование даты
    formatDate(dateString) {
        if (!dateString) return 'Без даты';
        
        try {
            const date = new Date(dateString);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // Проверяем сегодня/завтра
            if (date.toDateString() === today.toDateString()) {
                return 'Сегодня';
            }
            if (date.toDateString() === tomorrow.toDateString()) {
                return 'Завтра';
            }
            
            // Форматируем
            return date.toLocaleDateString('ru-RU', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            });
        } catch (e) {
            return dateString;
        }
    },
    
    // Получение имени категории
    getCategoryName(category) {
        const names = {
            work: 'Работа',
            personal: 'Личное',
            health: 'Здоровье',
            study: 'Учёба'
        };
        return names[category] || category;
    },
    
    // Получение имени приоритета
    getPriorityName(priority) {
        const names = {
            high: 'Высокий',
            medium: 'Средний',
            low: 'Низкий'
        };
        return names[priority] || priority;
    },
    
    // Генерация ID задачи
    generateTaskId() {
        return Date.now() + Math.floor(Math.random() * 1000);
    }
};

// Инициализируем и экспортируем
window.taskFlow = taskFlow.init();
