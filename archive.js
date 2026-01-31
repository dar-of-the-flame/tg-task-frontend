// Модуль архива
class ArchiveManager {
    constructor() {
        this.archivedTasks = taskFlow.archivedTasks;
    }
    
    // Рендеринг архива
    renderArchive() {
        const container = document.getElementById('archive-list');
        const emptyState = document.getElementById('empty-archive');
        
        if (!container || !emptyState) return;
        
        if (this.archivedTasks.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        container.innerHTML = this.archivedTasks.map(task => `
            <div class="archive-item ${task.deleted ? 'deleted' : ''}" data-id="${task.id}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; margin-bottom: 4px;">${task.text}</div>
                        <div style="font-size: 13px; color: var(--text-secondary);">
                            ${task.date ? taskFlow.formatDate(task.date) : 'Без даты'}
                            ${task.completed ? ` · Выполнено ${taskFlow.formatDate(task.completed_at)}` : ''}
                            ${task.deleted ? ` · Удалено ${taskFlow.formatDate(task.deleted_at)}` : ''}
                        </div>
                    </div>
                    ${task.deleted ? '' : `
                        <button class="task-btn" onclick="archiveManager.restoreTask('${task.id}')" title="Восстановить">
                            <i class="fas fa-redo"></i>
                        </button>
                    `}
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <span style="font-size: 12px; padding: 2px 8px; background: var(--bg-tertiary); border-radius: 12px;">
                        ${taskFlow.getCategoryName(task.category)}
                    </span>
                    <span style="font-size: 12px; padding: 2px 8px; background: var(--bg-tertiary); border-radius: 12px;">
                        ${taskFlow.getPriorityName(task.priority)}
                    </span>
                </div>
            </div>
        `).join('');
    }
    
    // Восстановление задачи из архива
    restoreTask(taskId) {
        const taskIndex = this.archivedTasks.findIndex(task => task.id == taskId);
        if (taskIndex === -1) return false;
        
        const task = this.archivedTasks[taskIndex];
        task.completed = false;
        task.deleted = false;
        
        // Перемещаем задачу обратно в активные
        taskFlow.allTasks.push(task);
        this.archivedTasks.splice(taskIndex, 1);
        
        // Обновляем данные
        taskFlow.processTasks();
        taskFlow.saveToStorage();
        
        // Обновляем UI
        this.renderArchive();
        
        // Обновляем список задач
        if (typeof taskManager !== 'undefined') {
            taskManager.updateTaskList();
        }
        
        // Уведомление
        if (typeof showToast === 'function') {
            showToast('Задача восстановлена', 'success');
        }
        
        return true;
    }
    
    // Очистка архива
    clearArchive() {
        if (!confirm('Очистить весь архив? Это действие нельзя отменить.')) {
            return false;
        }
        
        // Фильтруем только удаленные задачи (выполненные оставляем)
        this.archivedTasks = this.archivedTasks.filter(task => !task.deleted);
        
        // Обновляем данные
        taskFlow.archivedTasks = this.archivedTasks;
        taskFlow.saveToStorage();
        
        // Обновляем UI
        this.renderArchive();
        
        // Уведомление
        if (typeof showToast === 'function') {
            showToast('Архив очищен', 'warning');
        }
        
        return true;
    }
    
    // Поиск в архиве
    searchInArchive(query) {
        if (!query.trim()) {
            this.renderArchive();
            return;
        }
        
        const container = document.getElementById('archive-list');
        if (!container) return;
        
        const searchTerm = query.toLowerCase();
        const filteredTasks = this.archivedTasks.filter(task => 
            task.text.toLowerCase().includes(searchTerm) ||
            (task.category && task.category.toLowerCase().includes(searchTerm))
        );
        
        if (filteredTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 20px;">
                    <p>Ничего не найдено</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredTasks.map(task => `
            <div class="archive-item ${task.deleted ? 'deleted' : ''}" data-id="${task.id}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; margin-bottom: 4px;">${task.text}</div>
                        <div style="font-size: 13px; color: var(--text-secondary);">
                            ${task.date ? taskFlow.formatDate(task.date) : 'Без даты'}
                        </div>
                    </div>
                    ${task.deleted ? '' : `
                        <button class="task-btn" onclick="archiveManager.restoreTask('${task.id}')" title="Восстановить">
                            <i class="fas fa-redo"></i>
                        </button>
                    `}
                </div>
            </div>
        `).join('');
    }
}

// Создаем и экспортируем экземпляр
const archiveManager = new ArchiveManager();
window.archiveManager = archiveManager;
