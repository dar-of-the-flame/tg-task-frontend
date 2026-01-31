// Модуль работы с задачами
class TaskManager {
    constructor() {
        this.tasks = taskFlow.allTasks;
        this.archived = taskFlow.archivedTasks;
    }
    
    // Фильтрация задач
    filterTasks() {
        let filteredTasks = [...this.tasks];
        
        // Фильтр по категориям
        if (taskFlow.activeFilters.categories.length > 0) {
            filteredTasks = filteredTasks.filter(task => 
                taskFlow.activeFilters.categories.includes(task.category)
            );
        }
        
        // Фильтр по приоритетам
        if (taskFlow.activeFilters.priorities.length > 0) {
            filteredTasks = filteredTasks.filter(task => 
                taskFlow.activeFilters.priorities.includes(task.priority)
            );
        }
        
        // Фильтр по статусу
        if (taskFlow.activeFilters.status.includes('active')) {
            filteredTasks = filteredTasks.filter(task => !task.completed && !task.archived);
        }
        if (taskFlow.activeFilters.status.includes('completed')) {
            filteredTasks = filteredTasks.filter(task => task.completed);
        }
        if (taskFlow.activeFilters.status.includes('overdue')) {
            const today = new Date();
            const todayStr = taskFlow.formatDateForInput(today);
            filteredTasks = filteredTasks.filter(task => {
                if (!task.date) return false;
                let taskDate = task.date;
                if (taskDate.includes('T')) {
                    taskDate = taskDate.split('T')[0];
                }
                return taskDate < todayStr && !task.completed && !task.archived;
            });
        }
        if (taskFlow.activeFilters.status.includes('reminders')) {
            filteredTasks = filteredTasks.filter(task => task.is_reminder);
        }
        
        // Быстрые фильтры
        const today = new Date();
        const todayStr = taskFlow.formatDateForInput(today);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = taskFlow.formatDateForInput(tomorrow);
        
        switch (taskFlow.currentFilter) {
            case 'today':
                filteredTasks = filteredTasks.filter(task => {
                    if (!task.date) return false;
                    let taskDate = task.date;
                    if (taskDate.includes('T')) {
                        taskDate = taskDate.split('T')[0];
                    }
                    return taskDate === todayStr && !task.archived;
                });
                break;
            case 'tomorrow':
                filteredTasks = filteredTasks.filter(task => {
                    if (!task.date) return false;
                    let taskDate = task.date;
                    if (taskDate.includes('T')) {
                        taskDate = taskDate.split('T')[0];
                    }
                    return taskDate === tomorrowStr && !task.archived;
                });
                break;
            case 'week':
                const weekEnd = new Date();
                weekEnd.setDate(weekEnd.getDate() + 7);
                filteredTasks = filteredTasks.filter(task => {
                    if (!task.date || task.archived) return false;
                    let taskDate = task.date;
                    if (taskDate.includes('T')) {
                        taskDate = taskDate.split('T')[0];
                    }
                    const taskDateObj = new Date(taskDate);
                    return taskDateObj <= weekEnd;
                });
                break;
            case 'overdue':
                filteredTasks = filteredTasks.filter(task => {
                    if (!task.date) return false;
                    let taskDate = task.date;
                    if (taskDate.includes('T')) {
                        taskDate = taskDate.split('T')[0];
                    }
                    return taskDate < todayStr && !task.completed && !task.archived;
                });
                break;
            case 'reminders':
                filteredTasks = filteredTasks.filter(task => task.is_reminder && !task.archived);
                break;
            case 'all':
            default:
                // Показываем все, кроме архивированных
                filteredTasks = filteredTasks.filter(task => !task.archived);
                break;
        }
        
        return filteredTasks;
    }
    
    renderTasks(tasks, containerId = 'tasks-list') {
        const container = document.getElementById(containerId);
        const emptyState = document.getElementById('empty-tasks');
        
        if (!container) {
            console.error('Контейнер не найден:', containerId);
            return;
        }
        
        // Всегда скрываем пустое состояние сначала
        if (emptyState && containerId === 'tasks-list') {
            emptyState.style.display = 'none';
        }
        
        if (!tasks || tasks.length === 0) {
            container.innerHTML = '';
            if (emptyState && containerId === 'tasks-list') {
                emptyState.style.display = 'block';
            } else if (containerId === 'stats-tasks-list') {
                container.innerHTML = '<div class="empty-state"><p>Нет активных задач</p></div>';
            }
            return;
        }
        
        // Сортируем задачи
        const sortedTasks = [...tasks].sort((a, b) => {
            // Сначала напоминания (срочные)
            if (a.is_reminder !== b.is_reminder) {
                return a.is_reminder ? -1 : 1;
            }
            
            // Потом невыполненные
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            // Потом по дате (сначала ближайшие)
            const dateA = a.date ? new Date(a.date) : new Date('9999-12-31');
            const dateB = b.date ? new Date(b.date) : new Date('9999-12-31');
            if (dateA.getTime() !== dateB.getTime()) {
                return dateA - dateB;
            }
            
            // По приоритету
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
        });
        
        container.innerHTML = sortedTasks.map(task => this.renderTaskItem(task)).join('');
    }
    
    renderTaskItem(task) {
        const isCompleted = task.completed;
        const isReminder = task.is_reminder;
        const priorityClass = `priority-${task.priority || 'medium'}`;
        const completedClass = isCompleted ? 'completed' : '';
        const reminderClass = isReminder ? 'reminder' : '';
        
        // Проверяем просроченность
        const today = new Date();
        const todayStr = taskFlow.formatDateForInput(today);
        let taskDate = task.date;
        if (taskDate && taskDate.includes('T')) {
            taskDate = taskDate.split('T')[0];
        }
        const isOverdue = taskDate && taskDate < todayStr && !task.completed && !task.archived;
        const overdueClass = isOverdue ? 'overdue' : '';
        
        // Для напоминаний добавляем специальный стиль
        const reminderStyle = isReminder ? 'border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.1);' : '';
        
        return `
            <div class="task-item ${priorityClass} ${completedClass} ${reminderClass} ${overdueClass}" 
                 data-id="${task.id}" style="${reminderStyle}">
                <div class="task-header">
                    <div class="task-title">
                        <span class="task-emoji">${task.emoji || '📝'}</span>
                        ${task.text}
                        ${isReminder ? ' <i class="fas fa-bell" style="color: #f59e0b;"></i>' : ''}
                    </div>
                    <div class="task-category">${taskFlow.getCategoryName(task.category)}</div>
                </div>
                <div class="task-meta">
                    ${task.date ? `<div class="task-date"><i class="far fa-calendar"></i> ${taskFlow.formatDate(task.date)}</div>` : ''}
                    ${task.time ? `<div class="task-time"><i class="far fa-clock"></i> ${task.time}</div>` : ''}
                    ${isOverdue ? `<div class="task-overdue"><i class="fas fa-exclamation-triangle"></i> Просрочено</div>` : ''}
                    ${isReminder ? `<div class="task-reminder"><i class="fas fa-bell"></i> Напоминание</div>` : ''}
                </div>
                <div class="task-actions">
                    ${isReminder ? '' : `
                        <button class="task-btn complete" onclick="taskManager.toggleComplete('${task.id}')" 
                                title="${isCompleted ? 'Вернуть в работу' : 'Выполнить'}">
                            <i class="fas ${isCompleted ? 'fa-redo' : 'fa-check'}"></i>
                        </button>
                    `}
                    <button class="task-btn delete" onclick="taskManager.deleteTask('${task.id}')" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                    ${isOverdue ? `
                        <button class="task-btn archive" onclick="taskManager.archiveTask('${task.id}')" title="В архив">
                            <i class="fas fa-archive"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // НОВЫЙ МЕТОД: Обновление списка задач
    updateTaskList() {
        const filteredTasks = this.filterTasks();
        this.renderTasks(filteredTasks, 'tasks-list');
    }
    
    async toggleComplete(taskId) {
        const taskIndex = taskFlow.allTasks.findIndex(t => t.id == taskId);
        if (taskIndex === -1) return;
        
        const task = taskFlow.allTasks[taskIndex];
        
        // Напоминания нельзя отмечать выполненными
        if (task.is_reminder) {
            if (typeof showToast === 'function') {
                showToast('Напоминания отмечаются автоматически после отправки', 'warning');
            }
            return;
        }
        
        const newCompletedState = !task.completed;
        
        // Обновляем локально
        task.completed = newCompletedState;
        task.completed_at = newCompletedState ? new Date().toISOString() : null;
        
        // Обновляем на сервере
        if (telegram.isBackendAvailable) {
            await taskFlow.updateTaskOnServer(taskId, { completed: newCompletedState });
        }
        
        taskFlow.processTasks();
        this.updateAllTaskLists();
        
        // Показываем уведомление
        const message = newCompletedState ? 'Задача выполнена!' : 'Задача возвращена в работу';
        if (typeof showToast === 'function') {
            showToast(message, 'success');
        }
    }
    
    async archiveTask(taskId) {
        const taskIndex = taskFlow.allTasks.findIndex(t => t.id == taskId);
        if (taskIndex === -1) return;
        
        const task = taskFlow.allTasks[taskIndex];
        
        // Обновляем локально
        task.archived = true;
        
        // Обновляем на сервере
        if (telegram.isBackendAvailable) {
            await taskFlow.updateTaskOnServer(taskId, { archived: true });
        }
        
        taskFlow.processTasks();
        this.updateAllTaskLists();
        
        // Уведомление
        if (typeof showToast === 'function') {
            showToast('Задача перемещена в архив', 'warning');
        }
        
        return true;
    }
    
    // Создание новой задачи
    async createTask(taskData) {
        try {
            // Валидация
            if (!taskData.text || !taskData.text.trim()) {
                throw new Error('Введите текст задачи');
            }
            
            // Для напоминания - проверяем дату и время
            if (taskData.is_reminder) {
                if (!taskData.date || !taskData.time) {
                    throw new Error('Для напоминания укажите дату и время');
                }
                
                // Проверяем, что дата напоминания не в прошлом
                const reminderDate = new Date(`${taskData.date}T${taskData.time}`);
                const now = new Date();
                if (reminderDate < now) {
                    throw new Error('Напоминание нельзя установить на прошедшее время');
                }
            }
            
            // Формируем объект задачи
            const task = {
                id: taskFlow.generateTaskId(),
                user_id: taskFlow.userId,
                text: taskData.text.trim(),
                category: taskData.category || 'personal',
                priority: taskData.priority || 'medium',
                date: taskData.date,
                time: taskData.time || '',
                reminder: taskData.reminder || 0,
                emoji: taskData.emoji || (taskData.is_reminder ? '🔔' : '📝'),
                is_reminder: taskData.is_reminder || false,
                completed: false,
                deleted: false,
                archived: false,
                created_at: new Date().toISOString()
            };
            
            // Пытаемся сохранить на сервер
            const backendSaved = await taskFlow.saveTaskToServer(task);
            
            if (backendSaved) {
                console.log('✅ Задача сохранена на сервере');
            } else {
                console.log('⚠️ Задача сохранена локально');
            }
            
            // Добавляем в локальный список
            taskFlow.allTasks.unshift(task);
            taskFlow.processTasks();
            taskFlow.saveToStorage();
            
            // Обновляем UI
            this.updateAllTaskLists();
            
            // Обновляем календарь
            if (typeof calendarManager !== 'undefined') {
                calendarManager.renderCalendar();
            }
            
            // Обновляем статистику
            if (typeof statsManager !== 'undefined') {
                statsManager.updateStats();
            }
            
            // Показываем сообщение о напоминании
            if (taskData.is_reminder) {
                const reminderDate = new Date(`${taskData.date}T${taskData.time}`);
                const now = new Date();
                const timeDiff = reminderDate.getTime() - now.getTime();
                const minutesDiff = Math.floor(timeDiff / (1000 * 60));
                
                if (minutesDiff > 0) {
                    showToast(`Напоминание создано! Оно придет в чат через ${minutesDiff} минут`, 'success');
                } else {
                    showToast('Напоминание создано! Оно придет в чат в указанное время', 'success');
                }
            }
            
            return { success: true, task };
            
        } catch (error) {
            console.error('❌ Ошибка создания задачи:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Удаление задачи
    async deleteTask(taskId) {
        if (!confirm('Удалить эту задачу?')) return false;
        
        const taskIndex = taskFlow.allTasks.findIndex(t => t.id == taskId);
        if (taskIndex === -1) return false;
        
        const task = taskFlow.allTasks[taskIndex];
        
        // Обновляем локально
        task.deleted = true;
        task.deleted_at = new Date().toISOString();
        
        // Обновляем на сервере
        if (telegram.isBackendAvailable) {
            await taskFlow.updateTaskOnServer(taskId, { deleted: true });
        }
        
        taskFlow.processTasks();
        this.updateAllTaskLists();
        
        // Уведомление
        if (typeof showToast === 'function') {
            showToast('Задача удалена', 'warning');
        }
        
        return true;
    }
    
    // Обновление ВСЕХ списков задач в UI
    updateAllTaskLists() {
        // Главный список задач
        const filteredTasks = this.filterTasks();
        this.renderTasks(filteredTasks, 'tasks-list');
        
        // Список задач в статистике
        this.renderTasks(taskFlow.allTasks.filter(t => !t.archived), 'stats-tasks-list');
        
        // Обновляем календарь
        if (typeof calendarManager !== 'undefined') {
            calendarManager.updateDayTasks();
            calendarManager.renderCalendar();
        }
        
        // Обновляем архив
        if (typeof archiveManager !== 'undefined') {
            archiveManager.renderArchive();
        }
        
        // Обновляем статистику
        if (typeof statsManager !== 'undefined') {
            statsManager.updateStats();
        }
        
        // Обновляем счетчики
        this.updateCounters();
    }
    
    // Обновление счетчиков задач
    updateCounters() {
        const activeCount = taskFlow.allTasks.filter(t => !t.completed && !t.archived).length;
        const completedCount = taskFlow.archivedTasks.filter(t => t.completed).length;
        const overdueCount = taskFlow.allTasks.filter(t => {
            if (!t.date) return false;
            const today = new Date();
            const todayStr = taskFlow.formatDateForInput(today);
            let taskDate = t.date;
            if (taskDate.includes('T')) {
                taskDate = taskDate.split('T')[0];
            }
            return taskDate < todayStr && !t.completed && !t.archived;
        }).length;
        
        // Обновляем элементы на странице статистики
        if (typeof statsManager !== 'undefined') {
            statsManager.updateStats();
        }
    }
    
    // Применение фильтров
    applyFilters(categories, priorities, statuses) {
        taskFlow.activeFilters.categories = categories;
        taskFlow.activeFilters.priorities = priorities;
        taskFlow.activeFilters.status = statuses;
        
        taskFlow.saveToStorage();
        this.updateAllTaskLists();
        
        // Закрываем панель фильтров
        const filtersPanel = document.getElementById('filters-panel');
        if (filtersPanel) {
            filtersPanel.classList.remove('open');
        }
        
        return true;
    }
    
    // Сброс фильтров
    resetFilters() {
        taskFlow.activeFilters = {
            categories: ['work', 'personal', 'health', 'study'],
            priorities: ['high', 'medium', 'low'],
            status: ['active']
        };
        
        taskFlow.saveToStorage();
        this.updateAllTaskLists();
        
        return true;
    }
}

// Создаем и экспортируем экземпляр
const taskManager = new TaskManager();
window.taskManager = taskManager;
