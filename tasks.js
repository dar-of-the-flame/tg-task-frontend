class TaskManager {
    constructor() {
        this.tasks = taskFlow.allTasks;
        this.archived = taskFlow.archivedTasks;
    }
    
    filterTasks() {
        let filteredTasks = [...this.tasks];
        
        if (taskFlow.activeFilters.categories.length > 0) {
            filteredTasks = filteredTasks.filter(task => 
                taskFlow.activeFilters.categories.includes(task.category)
            );
        }
        
        if (taskFlow.activeFilters.priorities.length > 0) {
            filteredTasks = filteredTasks.filter(task => 
                taskFlow.activeFilters.priorities.includes(task.priority)
            );
        }
        
        if (taskFlow.activeFilters.status.includes('active')) {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        }
        if (taskFlow.activeFilters.status.includes('completed')) {
            filteredTasks = filteredTasks.filter(task => task.completed);
        }
        if (taskFlow.activeFilters.status.includes('overdue')) {
            const today = new Date().toISOString().split('T')[0];
            filteredTasks = filteredTasks.filter(task => 
                task.date && task.date < today && !task.completed
            );
        }
        
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        switch (taskFlow.currentFilter) {
            case 'today':
                filteredTasks = filteredTasks.filter(task => task.date === today);
                break;
            case 'tomorrow':
                filteredTasks = filteredTasks.filter(task => 
                    task.date === tomorrow.toISOString().split('T')[0]
                );
                break;
            case 'week':
                const weekEnd = new Date();
                weekEnd.setDate(weekEnd.getDate() + 7);
                filteredTasks = filteredTasks.filter(task => {
                    if (!task.date) return false;
                    const taskDate = new Date(task.date);
                    return taskDate <= weekEnd;
                });
                break;
            case 'overdue':
                filteredTasks = filteredTasks.filter(task => 
                    task.date && task.date < today && !task.completed
                );
                break;
        }
        
        return filteredTasks;
    }
    
    renderTasks(tasks) {
        const container = document.getElementById('tasks-list');
        const emptyState = document.getElementById('empty-tasks');
        
        if (!container) {
            console.error('Контейнер tasks-list не найден!');
            return;
        }
        
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        if (!tasks || tasks.length === 0) {
            container.innerHTML = '';
            if (emptyState) {
                emptyState.style.display = 'block';
            }
            return;
        }
        
        const sortedTasks = [...tasks].sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            const dateA = new Date(a.date || '9999-12-31');
            const dateB = new Date(b.date || '9999-12-31');
            if (dateA.getTime() !== dateB.getTime()) {
                return dateA - dateB;
            }
            
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
        });
        
        container.innerHTML = sortedTasks.map(task => this.renderTaskItem(task)).join('');
    }
    
    renderTaskItem(task) {
        const isCompleted = task.completed;
        const priorityClass = `priority-${task.priority || 'medium'}`;
        const completedClass = isCompleted ? 'completed' : '';
        
        return `
            <div class="task-item ${priorityClass} ${completedClass}" data-id="${task.id}">
                <div class="task-header">
                    <div class="task-title">
                        <span class="task-emoji">${task.emoji || '📝'}</span>
                        ${task.text}
                    </div>
                    <div class="task-category">${taskFlow.getCategoryName(task.category)}</div>
                </div>
                <div class="task-meta">
                    ${task.date ? `<div class="task-date">${taskFlow.formatDate(task.date)}</div>` : ''}
                    ${task.time ? `<div class="task-time"><i class="far fa-clock"></i> ${task.time}</div>` : ''}
                </div>
                <div class="task-actions">
                    <button class="task-btn complete" onclick="taskManager.toggleComplete('${task.id}')" 
                            title="${isCompleted ? 'Вернуть в работу' : 'Выполнить'}">
                        <i class="fas ${isCompleted ? 'fa-redo' : 'fa-check'}"></i>
                    </button>
                    <button class="task-btn delete" onclick="taskManager.deleteTask('${task.id}')" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    async toggleComplete(taskId) {
        const taskIndex = taskFlow.allTasks.findIndex(t => t.id == taskId);
        if (taskIndex === -1) return;
        
        const task = taskFlow.allTasks[taskIndex];
        task.completed = !task.completed;
        
        if (task.completed) {
            task.completed_at = new Date().toISOString();
        } else {
            task.completed_at = null;
        }
        
        if (telegram.isBackendAvailable) {
            await telegram.sendTaskToBackend(task);
        }
        
        taskFlow.processTasks();
        this.updateTaskList();
        
        const message = task.completed ? 'Задача выполнена!' : 'Задача возвращена в работу';
        if (typeof showToast === 'function') {
            showToast(message, 'success');
        }
    }
    
    async createTask(taskData) {
        try {
            if (!taskData.text || !taskData.text.trim()) {
                throw new Error('Введите текст задачи');
            }
            
            const task = {
                id: Date.now(),
                user_id: taskFlow.userId,
                text: taskData.text.trim(),
                category: taskData.category || 'personal',
                priority: taskData.priority || 'medium',
                date: taskData.date,
                time: taskData.time || '',
                reminder: taskData.reminder || 0,
                completed: false,
                deleted: false,
                created_at: new Date().toISOString()
            };
            
            const backendSaved = await telegram.sendTaskToBackend(task);
            
            if (backendSaved) {
                console.log('Задача сохранена на сервере');
            }
            
            taskFlow.allTasks.unshift(task);
            taskFlow.processTasks();
            taskFlow.saveToStorage();
            
            if (telegram.user) {
                telegram.sendToBot({
                    action: 'task_created',
                    task_id: task.id,
                    task_text: task.text
                });
            }
            
            return { success: true, task };
            
        } catch (error) {
            console.error('Ошибка создания задачи:', error);
            return { success: false, error: error.message };
        }
    }
    
    completeTask(taskId) {
        const task = taskFlow.allTasks.find(t => t.id == taskId);
        if (task) {
            task.completed = true;
            task.completed_at = new Date().toISOString();
            taskFlow.processTasks();
            
            this.updateTaskList();
            
            if (typeof showToast === 'function') {
                showToast('Задача выполнена!', 'success');
            }
            
            if (telegram.user) {
                telegram.sendToBot({
                    action: 'task_completed',
                    task_id: task.id,
                    task_text: task.text
                });
            }
            
            return true;
        }
        return false;
    }
    
    deleteTask(taskId) {
        if (!confirm('Удалить эту задачу?')) return false;
        
        const taskIndex = taskFlow.allTasks.findIndex(t => t.id == taskId);
        if (taskIndex !== -1) {
            const task = taskFlow.allTasks[taskIndex];
            task.deleted = true;
            task.deleted_at = new Date().toISOString();
            taskFlow.processTasks();
            
            this.updateTaskList();
            
            if (typeof showToast === 'function') {
                showToast('Задача удалена', 'warning');
            }
            
            return true;
        }
        return false;
    }
    
    updateTaskList() {
        const filteredTasks = this.filterTasks();
        this.renderTasks(filteredTasks);
        
        this.updateCounters();
    }
    
    updateCounters() {
        const activeCount = taskFlow.allTasks.length;
        const completedCount = taskFlow.archivedTasks.filter(t => t.completed).length;
        
        const activeElement = document.getElementById('active-tasks');
        const completedElement = document.getElementById('completed-tasks');
        
        if (activeElement) activeElement.textContent = activeCount;
        if (completedElement) completedElement.textContent = completedCount;
    }
    
    applyFilters(categories, priorities, statuses) {
        taskFlow.activeFilters.categories = categories;
        taskFlow.activeFilters.priorities = priorities;
        taskFlow.activeFilters.status = statuses;
        
        taskFlow.saveToStorage();
        this.updateTaskList();
        
        const filtersPanel = document.getElementById('filters-panel');
        if (filtersPanel) {
            filtersPanel.classList.remove('open');
        }
        
        return true;
    }
    
    resetFilters() {
        taskFlow.activeFilters = {
            categories: ['work', 'personal', 'health', 'study'],
            priorities: ['high', 'medium', 'low'],
            status: ['active']
        };
        
        taskFlow.saveToStorage();
        this.updateTaskList();
        
        return true;
    }
}

const taskManager = new TaskManager();
window.taskManager = taskManager;
