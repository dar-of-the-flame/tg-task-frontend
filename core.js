const CONFIG = {
    BACKEND_URL: 'https://tg-task-bot-service.onrender.com',
    STORAGE_KEY: 'taskflow_data'
};

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

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Сегодня';
    if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
    if (date.toDateString() === tomorrow.toDateString()) return 'Завтра';
    
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
}

function getCategoryName(category) {
    const categories = { work: 'Работа', personal: 'Личное', health: 'Здоровье', study: 'Учёба' };
    return categories[category] || 'Другое';
}

function getPriorityName(priority) {
    const priorities = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };
    return priorities[priority] || 'Средний';
}

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

async function syncWithServer() {
    if (!userId) return false;
    
    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/tasks?user_id=${userId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'ok' && data.tasks) {
                allTasks = data.tasks.filter(task => !task.completed && !task.deleted);
                archivedTasks = data.tasks.filter(task => task.completed || task.deleted);
                saveToStorage();
                return true;
            }
        }
    } catch (error) {
        console.warn('Ошибка синхронизации:', error.message);
    }
    return false;
}

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
