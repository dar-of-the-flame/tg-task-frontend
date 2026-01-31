// Конфигурация
const CONFIG = {
    BACKEND_URL: 'https://tg-task-bot-service.onrender.com',
    STORAGE_KEY: 'taskflow_data'
};

// Глобальные переменные
let userId = null;
let allTasks = [];
let archivedTasks = [];
let calendarNotes = [];
let currentFilter = 'today';
let currentPage = 'tasks';
let activeFilters = {
    categories: ['work', 'personal', 'health', 'study'],
    priorities: ['high', 'medium', 'low'],
    status: ['active']
};

let currentCalendarDate = new Date();
let selectedCalendarDate = new Date().toISOString().split('T')[0];

// Работа с локальным хранилищем
function saveToStorage() {
    const data = {
        tasks: [...allTasks, ...archivedTasks],
        notes: calendarNotes,
        filters: activeFilters,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
    };
    
    try {
        localStorage.setItem(`${CONFIG.STORAGE_KEY}_${userId}`, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        return false;
    }
}

function loadFromStorage() {
    try {
        const data = localStorage.getItem(`${CONFIG.STORAGE_KEY}_${userId}`);
        return data ? JSON.parse(data) : { 
            tasks: [], 
            notes: [], 
            filters: activeFilters 
        };
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        return { tasks: [], notes: [], filters: activeFilters };
    }
}

// Вспомогательные функции
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateString === today) return 'Сегодня';
    if (dateString === tomorrow.toISOString().split('T')[0]) return 'Завтра';
    if (dateString === yesterday.toISOString().split('T')[0]) return 'Вчера';
    
    return date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'short' 
    });
}

function getCategoryName(category) {
    const categories = {
        'work': 'Работа',
        'personal': 'Личное',
        'health': 'Здоровье',
        'study': 'Учёба'
    };
    return categories[category] || category;
}

function getPriorityName(priority) {
    const priorities = {
        'high': 'Высокий',
        'medium': 'Средний',
        'low': 'Низкий'
    };
    return priorities[priority] || priority;
}

function processTasks() {
    // Разделяем задачи на активные и архивные
    archivedTasks = allTasks.filter(task => task.completed || task.deleted);
    allTasks = allTasks.filter(task => !task.completed && !task.deleted);
    
    // Сортируем задачи
    allTasks.sort((a, b) => {
        // Сначала по приоритету
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        
        // Потом по дате
        const dateA = new Date(a.date || '9999-12-31');
        const dateB = new Date(b.date || '9999-12-31');
        return dateA - dateB;
    });
    
    saveToStorage();
}

// Утилиты для работы с временем
function getCurrentTime() {
    const now = new Date();
    return {
        date: now.toISOString().split('T')[0],
        time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    };
}

function validateTime(hours, minutes) {
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

// Проверка подключения к бэкенду
async function checkBackendConnection() {
    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/health`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            timeout: 5000
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.status === 'ok';
        }
        return false;
    } catch (error) {
        console.warn('Бэкенд недоступен:', error.message);
        return false;
    }
}

// Экспорт глобальных переменных
window.taskFlow = {
    CONFIG,
    userId,
    allTasks,
    archivedTasks,
    calendarNotes,
    currentFilter,
    currentPage,
    activeFilters,
    currentCalendarDate,
    selectedCalendarDate,
    
    // Функции
    saveToStorage,
    loadFromStorage,
    formatDate,
    getCategoryName,
    getPriorityName,
    processTasks,
    getCurrentTime,
    validateTime,
    checkBackendConnection
};
