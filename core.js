// core.js - основной модуль TaskFlow с исправленной логикой
const taskFlow = {
    CONFIG: {
        BACKEND_URL: 'https://tg-task-bot-service.onrender.com',
        STORAGE_KEY: 'taskflow_data',
        SYNC_INTERVAL: 300000, // 5 минут
        CHECK_REMINDERS_INTERVAL: 60000, // 1 минута
        AUTO_ARCHIVE_INTERVAL: 300000 // 5 минут
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
    lastSync: null,
    syncTimer: null,
    reminderTimer: null,
    archiveTimer: null,
    
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
                this.lastSync = parsed.lastSync || null;
                console.log('📁 Загружено задач:', this.allTasks.length);
                console.log('📁 Загружено архивных:', this.archivedTasks.length);
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
                lastSync: this.lastSync || new Date().toISOString()
            };
            localStorage.setItem(this.CONFIG.STORAGE_KEY, JSON.stringify(data));
            console.log('💾 Данные сохранены:', this.allTasks.length, 'активных задач');
        } catch (error) {
            console.error('❌ Ошибка сохранения в localStorage:', error);
        }
    },
    
    // Обработка задач (перенос в архив)
    processTasks() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
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
        
        // Помечаем просроченные задачи (но не архивируем автоматически - пользователь должен сам)
        this.allTasks.forEach(task => {
            if (task.date && task.date < today && !task.completed) {
                task.overdue = true;
            } else {
                task.overdue = false;
            }
        });
        
        this.saveToStorage();
    },
    
    // Автоматическая архивация просроченных задач
    autoArchiveOverdueTasks() {
        const today = new Date().toISOString().split('T')[0];
        let archivedCount = 0;
        
        this.allTasks.forEach(task => {
            if (task.date && task.date < today && !task.completed && !task.archived) {
                task.archived = true;
                task.archived_at = new Date().toISOString();
                archivedCount++;
                console.log(`📦 Задача "${task.text}" автоматически архивирована (просрочена)`);
            }
        });
        
        if (archivedCount > 0) {
            this.processTasks();
            this.saveToStorage();
            console.log(`✅ Автоматически архивировано ${archivedCount} просроченных задач`);
            
            // Обновляем UI если нужно
            if (typeof taskManager !== 'undefined' && typeof taskManager.updateAllTaskLists === 'function') {
                taskManager.updateAllTaskLists();
            }
        }
    },
    
    // Проверка и отправка локальных напоминаний
    checkLocalReminders() {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const today = now.toISOString().split('T')[0];
        
        this.allTasks.forEach(task => {
            // Проверяем только напоминания
            if (task.is_reminder && 
                task.date === today && 
                task.time && 
                task.time.substring(0, 5) === currentTime && 
                !task.completed &&
                !task.reminder_notified) {
                
                // Помечаем как уведомлённое
                task.reminder_notified = true;
                
                // Показываем уведомление
                if (typeof showToast === 'function') {
                    showToast(`🔔 Напоминание: ${task.text}`, 'info');
                }
                
                // Воспроизводим звук если есть
                if (typeof this.playReminderSound === 'function') {
                    this.playReminderSound();
                }
                
                // Показываем системное уведомление если разрешено
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    new Notification('TaskFlow Напоминание', {
                        body: task.text,
                        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔔</text></svg>',
                        requireInteraction: true
                    });
                }
                
                console.log(`🔔 Локальное напоминание: ${task.text}`);
            }
        });
        
        // Сохраняем изменения
        this.saveToStorage();
    },
    
    // Инициализация уведомлений
    initNotifications() {
        if (typeof Notification !== 'undefined') {
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    console.log('🔔 Разрешение на уведомления:', permission);
                });
            }
        }
    },
    
    // Воспроизведение звука напоминания
    playReminderSound() {
        try {
            // Создаём простой бип
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 1);
            
        } catch (e) {
            console.log('🔕 Звук напоминания не поддерживается');
        }
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
                `${this.CONFIG.BACKEND_URL}/api/tasks?user_id=${this.userId}`,
                { 
                    signal: AbortSignal.timeout(10000) // 10 секунд таймаут
                }
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
                this.lastSync = new Date().toISOString();
                this.saveToStorage();
                
                console.log(`✅ Синхронизировано ${serverTasks.length} задач с сервера`);
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
            taskMap.set(task.id, { 
                ...task, 
                source: 'local',
                synced: false
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
                source: 'server',
                synced: true 
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
                signal: AbortSignal.timeout(5000)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            // Обновляем ID задачи если сервер вернул новый
            if (result.task_id && result.task_id !== task.id) {
                task.id = result.task_id;
                task.synced = true;
            }
            
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
                }),
                signal: AbortSignal.timeout(5000)
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
            const response = await fetch(`${this.CONFIG.BACKEND_URL}/health`, {
                signal: AbortSignal.timeout(3000)
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    },
    
    // Запуск всех таймеров
    startTimers() {
        // Очищаем старые таймеры если есть
        if (this.syncTimer) clearInterval(this.syncTimer);
        if (this.reminderTimer) clearInterval(this.reminderTimer);
        if (this.archiveTimer) clearInterval(this.archiveTimer);
        
        // Запускаем синхронизацию
        this.syncTimer = setInterval(() => {
            if (telegram.isBackendAvailable) {
                this.syncWithServer();
            }
        }, this.CONFIG.SYNC_INTERVAL);
        
        // Запускаем проверку напоминаний
        this.reminderTimer = setInterval(() => {
            this.checkLocalReminders();
        }, this.CONFIG.CHECK_REMINDERS_INTERVAL);
        
        // Запускаем автоматическую архивацию
        this.archiveTimer = setInterval(() => {
            this.autoArchiveOverdueTasks();
        }, this.CONFIG.AUTO_ARCHIVE_INTERVAL);
        
        console.log('⏰ Таймеры запущены');
    },
    
    // Остановка всех таймеров
    stopTimers() {
        if (this.syncTimer) clearInterval(this.syncTimer);
        if (this.reminderTimer) clearInterval(this.reminderTimer);
        if (this.archiveTimer) clearInterval(this.archiveTimer);
        
        this.syncTimer = null;
        this.reminderTimer = null;
        this.archiveTimer = null;
        
        console.log('⏰ Таймеры остановлены');
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
    
    // Форматирование времени
    formatTime(timeString) {
        if (!timeString) return '';
        
        try {
            // Убираем секунды если есть
            const parts = timeString.split(':');
            if (parts.length >= 2) {
                return `${parts[0]}:${parts[1]}`;
            }
            return timeString;
        } catch (e) {
            return timeString;
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
    },
    
    // Поиск задачи по ID
    findTaskById(taskId) {
        const allTasks = [...this.allTasks, ...this.archivedTasks];
        return allTasks.find(task => task.id == taskId);
    },
    
    // Получение задач для определённой даты
    getTasksForDate(date) {
        return this.allTasks.filter(task => 
            task.date === date && !task.completed && !task.archived
        );
    },
    
    // Получение просроченных задач
    getOverdueTasks() {
        const today = new Date().toISOString().split('T')[0];
        return this.allTasks.filter(task => 
            task.date && task.date < today && !task.completed && !task.archived
        );
    },
    
    // Получение напоминаний
    getReminders() {
        return this.allTasks.filter(task => 
            task.is_reminder && !task.completed && !task.archived
        );
    },
    
    // Получение активных задач
    getActiveTasks() {
        return this.allTasks.filter(task => 
            !task.completed && !task.archived
        );
    },
    
    // Получение выполненных задач
    getCompletedTasks() {
        return this.archivedTasks.filter(task => task.completed);
    },
    
    // Сброс всех флагов уведомлений (для нового дня)
    resetReminderFlags() {
        const today = new Date().toISOString().split('T')[0];
        
        this.allTasks.forEach(task => {
            if (task.date && task.date !== today) {
                task.reminder_notified = false;
            }
        });
        
        this.saveToStorage();
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
    },
    
    // Импорт данных
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (!data.tasks) {
                throw new Error('Некорректный формат данных');
            }
            
            // Добавляем импортированные задачи
            this.allTasks = [...this.allTasks, ...data.tasks];
            this.archivedTasks = [...this.archivedTasks, ...(data.archived || [])];
            
            this.processTasks();
            this.saveToStorage();
            
            console.log('📥 Данные импортированы:', data.tasks.length, 'задач');
            return true;
        } catch (error) {
            console.error('❌ Ошибка импорта:', error);
            return false;
        }
    },
    
    // Создание демо-задач
    createDemoTasks() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const demoTasks = [
            {
                id: this.generateTaskId(),
                user_id: this.userId,
                text: 'Добро пожаловать в TaskFlow! 🎉',
                category: 'personal',
                priority: 'medium',
                date: today,
                time: '12:00',
                reminder: 0,
                emoji: '🎯',
                is_reminder: false,
                completed: false,
                deleted: false,
                archived: false,
                created_at: now.toISOString()
            },
            {
                id: this.generateTaskId(),
                user_id: this.userId,
                text: 'Протестировать напоминание',
                category: 'personal',
                priority: 'medium',
                date: today,
                time: new Date(now.getTime() + 10 * 60 * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                reminder: 0,
                emoji: '🔔',
                is_reminder: true,
                completed: false,
                deleted: false,
                archived: false,
                created_at: now.toISOString()
            },
            {
                id: this.generateTaskId(),
                user_id: this.userId,
                text: 'Важная задача на завтра',
                category: 'work',
                priority: 'high',
                date: tomorrow,
                time: '10:00',
                reminder: 0,
                emoji: '💼',
                is_reminder: false,
                completed: false,
                deleted: false,
                archived: false,
                created_at: now.toISOString()
            }
        ];
        
        this.allTasks = [...demoTasks, ...this.allTasks];
        this.processTasks();
        this.saveToStorage();
        
        console.log('📝 Созданы демо-задачи');
        return demoTasks;
    },
    
    // Очистка всех данных
    clearAllData() {
        if (confirm('Вы уверены? Это удалит ВСЕ задачи и настройки.')) {
            this.allTasks = [];
            this.archivedTasks = [];
            this.calendarNotes = [];
            localStorage.removeItem(this.CONFIG.STORAGE_KEY);
            console.log('🧹 Все данные очищены');
            return true;
        }
        return false;
    }
};

// Глобальные функции уведомлений
function showLocalReminder(text) {
    // Создаём элемент уведомления
    const notification = document.createElement('div');
    notification.className = 'reminder-notification';
    notification.innerHTML = `
        <i class="fas fa-bell"></i>
        <div>
            <strong>Напоминание</strong>
            <p>${text}</p>
        </div>
        <button class="close-notification">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Кнопка закрытия
    notification.querySelector('.close-notification').addEventListener('click', () => {
        notification.remove();
    });
    
    // Автоматическое закрытие через 10 секунд
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 10000);
}

// Инициализация уведомлений при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    taskFlow.initNotifications();
    
    // Проверяем, новый ли день, чтобы сбросить флаги уведомлений
    const lastReset = localStorage.getItem('taskflow_last_reset');
    const today = new Date().toISOString().split('T')[0];
    
    if (lastReset !== today) {
        taskFlow.resetReminderFlags();
        localStorage.setItem('taskflow_last_reset', today);
    }
    
    // Запускаем проверку напоминаний сразу
    setTimeout(() => {
        taskFlow.checkLocalReminders();
    }, 2000);
});

// Инициализируем и экспортируем
window.taskFlow = taskFlow.init();
window.showLocalReminder = showLocalReminder;

// Экспортируем глобальные функции для отладки
window.taskFlowUtils = {
    exportData: () => taskFlow.exportData(),
    importData: (json) => taskFlow.importData(json),
    createDemoTasks: () => taskFlow.createDemoTasks(),
    clearData: () => taskFlow.clearAllData(),
    startTimers: () => taskFlow.startTimers(),
    stopTimers: () => taskFlow.stopTimers(),
    syncNow: () => taskFlow.syncWithServer(),
    getStats: () => ({
        active: taskFlow.getActiveTasks().length,
        archived: taskFlow.archivedTasks.length,
        overdue: taskFlow.getOverdueTasks().length,
        reminders: taskFlow.getReminders().length
    })
};
