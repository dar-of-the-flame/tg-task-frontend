// core.js - добавляем функции работы с сервером
const CONFIG = {
    BACKEND_URL: 'https://tg-task-bot-service.onrender.com',
    STORAGE_KEY: 'taskflow_data'
};

// Добавляем синхронизацию
async function syncWithServer() {
    try {
        // Получаем все задачи с сервера
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/tasks?user_id=${userId}`);
        if (response.ok) {
            const serverTasks = await response.json();
            
            // Объединяем с локальными
            const localTasks = loadFromStorage().tasks || [];
            const mergedTasks = mergeTasks(localTasks, serverTasks);
            
            // Сохраняем обратно
            allTasks = mergedTasks;
            saveToStorage();
            
            console.log('Синхронизировано задач:', mergedTasks.length);
            return true;
        }
    } catch (error) {
        console.warn('Ошибка синхронизации:', error);
    }
    return false;
}

function mergeTasks(local, server) {
    // Создаем Map для быстрого поиска
    const taskMap = new Map();
    
    // Добавляем серверные задачи
    server.forEach(task => {
        taskMap.set(task.id, { ...task, source: 'server' });
    });
    
    // Добавляем локальные, если их нет на сервере
    local.forEach(task => {
        if (!taskMap.has(task.id)) {
            taskMap.set(task.id, { ...task, source: 'local' });
        }
    });
    
    return Array.from(taskMap.values());
}
