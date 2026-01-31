// Модуль ядра приложения
const CONFIG = {
    BACKEND_URL: 'https://tg-task-bot-service.onrender.com',
    STORAGE_KEY: 'taskflow_data'
};

// Глобальные переменные
let allTasks = [];
let archivedTasks = [];
let calendarNotes = [];
let userId = null;
let currentPage = 'tasks';
let currentFilter = 'today';
let activeFilters = {
    categories: ['work', 'personal', 'health', 'study'],
    priorities: ['high', 'medium', 'low'],
    status: ['active']
};

// Функции для работы с хранилищем
function saveToStorage() {
    const data = {
        tasks: allTasks,
        archived: archivedTasks,
        notes: calendarNotes,
        filters: activeFilters,
        userId: userId
    };
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
}

function loadFromStorage() {
    const data = localStorage.getItem(CONFIG.STORAGE_KEY);
    return data ? JSON.parse(data) : { 
        tasks: [], 
        archived: [], 
        notes: [], 
        filters: activeFilters,
        userId: null 
    };
}

// Обработка задач (архивация выполенных и удаленных)
function processTasks() {
    const now = new Date();
    
    archivedTasks = allTasks.filter(task => 
        task.completed || task.deleted || 
        (task.date && new Date(task.date) < new Date(now.setHours(0, 0, 0, 0)))
    );
    
    allTasks = allTasks.filter(task => 
        !task.completed && !task.deleted && 
        (!task.date || new Date(task.date) >= new Date(now.setHours(0, 0, 0, 0)))
    );
    
    saveToStorage();
}

// Форматирование даты
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Вчера';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Завтра';
    }
    
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
}

// Получение названий категорий
function getCategoryName(category) {
    const categories = {
        work: 'Работа',
        personal: 'Личное',
        health: 'Здоровье',
        study: 'Учёба'
    };
    return categories[category] || 'Другое';
}

// Получение названий приоритетов
function getPriorityName(priority) {
    const priorities = {
        high: 'Высокий',
        medium: 'Средний',
        low: 'Низкий'
    };
    return priorities[priority] || 'Средний';
}

// Проверка соединения с бэкендом
async function checkBackendConnection() {
    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000)
        });
        return response.ok;
    } catch (error) {
        console.warn('Бэкенд недоступен:', error.message);
        return false;
    }
}

// Синхронизация с сервером
async function syncWithServer() {
    if (!userId) return false;
    
    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/tasks?user_id=${userId}`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
            const serverTasks = await response.json();
            
            // Объединяем с локальными
            const localTasks = loadFromStorage().tasks || [];
            const taskMap = new Map();
            
            serverTasks.forEach(task => taskMap.set(task.id, task));
            localTasks.forEach(task => {
                if (!taskMap.has(task.id)) {
                    taskMap.set(task.id, task);
                }
            });
            
            allTasks = Array.from(taskMap.values()).filter(task => !task.completed && !task.deleted);
            archivedTasks = Array.from(taskMap.values()).filter(task => task.completed || task.deleted);
            
            saveToStorage();
            return true;
        }
    } catch (error) {
        console.warn('Ошибка синхронизации:', error.message);
    }
    return false;
}

// Экспорт глобального объекта
window.taskFlow = {
    CONFIG,
    allTasks,
    archivedTasks,
    calendarNotes,
    userId,
    currentPage,
    currentFilter,
    activeFilters,
    
    saveToStorage,
    loadFromStorage,
    processTasks,
    formatDate,
    getCategoryName,
    getPriorityName,
    checkBackendConnection,
    syncWithServer
};
