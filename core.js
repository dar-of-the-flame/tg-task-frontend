// core.js - основной модуль TaskFlow
const taskFlow = {
    CONFIG: {
        BACKEND_URL: 'https://tg-task-bot-service.onrender.com',
        STORAGE_KEY: 'taskflow_data'
    },
    
    userId: null,
    allTasks: [],
    archivedTasks: [],
    currentPage: 'tasks',
    currentFilter: 'all',
    activeFilters: {
        categories: ['work', 'personal', 'health', 'study'],
        priorities: ['high', 'medium', 'low'],
        status: ['active']
    },
    
    // Инициализация
    init() {
        console.log('🚀 TaskFlow initializing...');
        return this;
    },
    
    // Загрузка из локального хранилища (только кэш)
    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.CONFIG.STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                this.allTasks = parsed.tasks || [];
                this.archivedTasks = parsed.archived || [];
                this.activeFilters = parsed.filters || this.activeFilters;
                console.log('📁 Загружено из кэша:', this.allTasks.length, 'задач');
                return parsed;
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки из кэша:', error);
        }
        return {};
    },
    
    // Сохранение в локальное хранилища (только кэш)
    saveToStorage() {
        try {
            const data = {
                tasks: this.allTasks,
                archived: this.archivedTasks,
                filters: this.activeFilters,
                lastSync: new Date().toISOString()
            };
            localStorage.setItem(this.CONFIG.STORAGE_KEY, JSON.stringify(data));
            console.log('💾 Данные сохранены в кэш');
        } catch (error) {
            console.error('❌ Ошибка сохранения в кэш:', error);
        }
    },
    
    // Обработка задач
    processTasks() {
        const now = new Date();
        const today = this.formatDateForInput(now);
        
        // Находим выполненные и удалённые задачи
        const completedTasks = this.allTasks.filter(task => task.completed && !task.deleted);
        const deletedTasks = this.allTasks.filter(task => task.deleted);
        
        // Добавляем в архив
        this.archivedTasks = [
            ...this.archivedTasks,
            ...completedTasks,
            ...deletedTasks
        ];
        
        // Удаляем из активных
        this.allTasks = this.allTasks.filter(task => 
            !task.completed && !task.deleted && !task.archived
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
        
        // Помечаем просроченные задачи
        this.allTasks.forEach(task => {
            if (task.date) {
                let taskDate = task.date;
                if (taskDate.includes('T')) {
                    taskDate = taskDate.split('T')[0];
                }
                task.overdue = taskDate < today && !task.completed;
            } else {
                task.overdue = false;
            }
        });
        
        // Архивируем просроченные напоминания
        this.allTasks.forEach(task => {
            if (task.is_reminder && task.overdue) {
                task.archived = true;
                this.archivedTasks.push({...task});
            }
        });
        
        // Убираем заархивированные из активных
        this.allTasks = this.allTasks.filter(task => !task.archived);
        
        this.saveToStorage();
    },
    
    // Синхронизация с сервером
    async syncWithServer() {
        if (!this.userId) {
            throw new Error('Нет User ID для синхронизации');
        }
        
        try {
            console.log('🔄 Синхронизация с сервером...');
            
            // Загружаем задачи с сервера
            const response = await fetch(
                `${this.CONFIG.BACKEND_URL}/api/tasks?user_id=${this.userId}`,
                { 
                    signal: AbortSignal.timeout(15000)
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'ok') {
                // Объединяем задачи
                const serverTasks = result.tasks || [];
                const mergedTasks = this.mergeTasks(this.allTasks, serverTasks);
                
                this.allTasks = mergedTasks;
                this.processTasks();
                this.saveToStorage();
                
                console.log(`✅ Синхронизировано ${serverTasks.length} задач с сервера`);
                return true;
            }
            
            throw new Error(result.message || 'Ошибка сервера');
            
        } catch (error) {
            console.error('❌ Ошибка синхронизации:', error.message);
            throw error;
        }
    },
    
    // Объединение задач (серверные имеют приоритет)
    mergeTasks(localTasks, serverTasks) {
        const taskMap = new Map();
        
        // Сначала добавляем локальные задачи
        localTasks.forEach(task => {
            taskMap.set(task.id, { 
                ...task, 
                source: 'cache'
            });
        });
        
        // Затем добавляем/обновляем серверными
        serverTasks.forEach(task => {
            // Конвертируем дату/время если нужно
            if (task.date && typeof task.date === 'string') {
                task.date = task.date.split('T')[0];
            }
            if (task.time && typeof task.time === 'string' && task.time.includes(':')) {
                task.time = task.time.substring(0, 5);
            }
            
            taskMap.set(task.id, { 
                ...task, 
                source: 'server'
            });
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
                body: JSON.stringify(task),
                signal: AbortSignal.timeout(10000)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            // Обновляем ID задачи если сервер вернул новый
            if (result.task_id && result.task_id !== task.id) {
                task.id = result.task_id;
            }
            
            return result.status === 'ok';
            
        } catch (error) {
            console.error('❌ Ошибка сохранения на сервер:', error.message);
            throw error;
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
                }),
                signal: AbortSignal.timeout(10000)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            return result.status === 'ok';
            
        } catch (error) {
            console.error('❌ Ошибка обновления на сервере:', error.message);
            throw error;
        }
    },
    
    // Проверка соединения с бэкендом
    async checkBackendConnection() {
        try {
            const response = await fetch(`${this.CONFIG.BACKEND_URL}/health`, {
                signal: AbortSignal.timeout(5000)
            });
            return response.ok;
        } catch (error) {
            console.log('🌐 Нет соединения с бэкендом:', error.message);
            return false;
        }
    },
    
    // Форматирование даты
    formatDate(dateString) {
        if (!dateString) return 'Без даты';
        
        try {
            // Если дата содержит время, берем только дату
            let dateStr = dateString;
            if (dateStr.includes('T')) {
                dateStr = dateStr.split('T')[0];
            }
            
            const dateParts = dateStr.split('-');
            if (dateParts.length !== 3) return dateStr;
            
            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1;
            const day = parseInt(dateParts[2]);
            
            const date = new Date(year, month, day);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // Приводим к одному формату для сравнения
            const todayFormatted = this.formatDateForInput(today);
            const tomorrowFormatted = this.formatDateForInput(tomorrow);
            
            if (dateStr === todayFormatted) {
                return 'Сегодня';
            }
            if (dateStr === tomorrowFormatted) {
                return 'Завтра';
            }
            
            // Форматируем
            return date.toLocaleDateString('ru-RU', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            });
        } catch (e) {
            console.error('Ошибка форматирования даты:', e);
            return dateString;
        }
    },
    
    // Форматирование даты для input[type="date"]
    formatDateForInput(date) {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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
    
    // Генерация временного ID задачи
    generateTaskId() {
        return `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    },
    
    // Поиск задачи по ID
    findTaskById(taskId) {
        const allTasks = [...this.allTasks, ...this.archivedTasks];
        return allTasks.find(task => task.id == taskId);
    },
    
    // Получение задач для определённой даты
    getTasksForDate(date) {
        return this.allTasks.filter(task => {
            if (!task.date) return false;
            let taskDate = task.date;
            if (taskDate.includes('T')) {
                taskDate = taskDate.split('T')[0];
            }
            return taskDate === date && !task.completed && !task.archived;
        });
    },
    
    // Получение активных задач
    getActiveTasks() {
        return this.allTasks.filter(task => 
            !task.completed && !task.archived
        );
    },
    
    // Экспорт данных
    exportData() {
        try {
            const data = {
                tasks: this.allTasks,
                archived: this.archivedTasks,
                export_date: new Date().toISOString(),
                user_id: this.userId
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            a.href = url;
            a.download = `taskflow_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('📤 Данные экспортированы');
            return true;
        } catch (error) {
            console.error('❌ Ошибка экспорта:', error);
            return false;
        }
    }
};

// Инициализируем и экспортируем
window.taskFlow = taskFlow.init();
