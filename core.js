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

// ========== ДЕБАГ И ДИАГНОСТИКА ==========
window.debugAPI = async function() {
    console.log('🔍 ДЕБАГ API подключения...');
    console.log('URL бэкенда:', CONFIG.BACKEND_URL);
    
    try {
        // 1. Проверка /health
        console.log('🩺 Проверка /health...');
        const healthResponse = await fetch(`${CONFIG.BACKEND_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });
        console.log('✅ /health status:', healthResponse.status, healthResponse.statusText);
        console.log('✅ /health response:', await healthResponse.text());
        
        // 2. Проверка /api/tasks
        if (userId) {
            console.log(`📋 Проверка /api/tasks?user_id=${userId}...`);
            const tasksResponse = await fetch(`${CONFIG.BACKEND_URL}/api/tasks?user_id=${userId}`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            console.log('✅ /api/tasks status:', tasksResponse.status, tasksResponse.statusText);
            
            if (tasksResponse.ok) {
                const data = await tasksResponse.json();
                console.log('✅ /api/tasks response:', data);
                console.log(`📊 Задач получено: ${data.tasks ? data.tasks.length : 0}`);
            }
        } else {
            console.log('⚠️ userId не установлен');
        }
        
        // 3. Проверка localStorage
        console.log('💾 Проверка localStorage...');
        const storedData = localStorage.getItem(CONFIG.STORAGE_KEY);
        console.log('✅ localStorage data:', storedData ? JSON.parse(storedData) : 'пусто');
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка отладки:', error);
        return false;
    }
};

window.testApiConnection = async function() {
    console.log('🔌 Тестируем API подключение...');
    
    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
            console.log('✅ Сервер доступен');
            return true;
        } else {
            console.error('❌ Сервер вернул ошибку:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Не удалось подключиться к серверу:', error.message);
        return false;
    }
};

// ========== ОСНОВНЫЕ ФУНКЦИИ ==========
async function syncWithServer() {
    console.log('🔄 Синхронизация с сервером...');
    
    if (!userId) {
        console.error('❌ userId не установлен, пропускаем синхронизацию');
        return false;
    }
    
    try {
        console.log(`📥 Запрашиваем задачи для user_id=${userId}...`);
        
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/tasks?user_id=${userId}`, {
            method: 'GET',
            signal: AbortSignal.timeout(10000)
        });
        
        console.log('📊 Ответ сервера:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        const data = await response.json();
        console.log('📦 Полученные данные:', data);
        
        if (data.status === 'ok' && Array.isArray(data.tasks)) {
            // Фильтруем задачи
            allTasks = data.tasks.filter(task => {
                if (task.deleted) return false;
                if (task.completed) return false;
                return true;
            });
            
            archivedTasks = data.tasks.filter(task => task.completed || task.deleted);
            
            console.log(`✅ Синхронизация успешна:`);
            console.log(`   Активных задач: ${allTasks.length}`);
            console.log(`   Архивных задач: ${archivedTasks.length}`);
            
            // Сохраняем в localStorage
            saveToStorage();
            
            // Обновляем интерфейс если он уже инициализирован
            if (typeof taskManager !== 'undefined') {
                taskManager.updateTaskList();
            }
            
            return true;
        } else {
            throw new Error(data.message || 'Некорректный формат ответа сервера');
        }
        
    } catch (error) {
        console.error('❌ Ошибка синхронизации:', error);
        
        // Пробуем загрузить из localStorage
        const localData = loadFromStorage();
        if (localData.tasks && localData.tasks.length > 0) {
            console.log('📂 Загружаем данные из localStorage...');
            allTasks = localData.tasks.filter(t => !t.completed && !t.deleted);
            archivedTasks = localData.tasks.filter(t => t.completed || t.deleted);
            return true;
        }
        
        return false;
    }
}

function saveToStorage() {
    const data = {
        tasks: [...allTasks, ...archivedTasks],
        notes: calendarNotes,
        filters: activeFilters,
        userId: userId,
        lastSync: new Date().toISOString()
    };
    
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
        console.log('💾 Данные сохранены в localStorage');
    } catch (error) {
        console.error('❌ Ошибка сохранения в localStorage:', error);
    }
}

function loadFromStorage() {
    try {
        const data = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            console.log('📂 Данные загружены из localStorage');
            return parsed;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки из localStorage:', error);
    }
    
    return { 
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
    const categories = {
        work: 'Работа',
        personal: 'Личное',
        health: 'Здоровье',
        study: 'Учёба'
    };
    return categories[category] || 'Другое';
}

function getPriorityName(priority) {
    const priorities = {
        high: 'Высокий',
        medium: 'Средний',
        low: 'Низкий'
    };
    return priorities[priority] || 'Средний';
}

async function checkBackendConnection() {
    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
            console.log('✅ Подключение к серверу установлено');
            return true;
        }
        return false;
    } catch (error) {
        console.warn('⚠️ Нет подключения к серверу:', error.message);
        return false;
    }
}

// ========== УТИЛИТЫ ==========
function addTask(task) {
    task.id = task.id || Date.now();
    task.created_at = task.created_at || new Date().toISOString();
    allTasks.unshift(task);
    processTasks();
    return task;
}

function updateTask(taskId, updates) {
    const taskIndex = allTasks.findIndex(t => t.id == taskId);
    if (taskIndex !== -1) {
        allTasks[taskIndex] = { ...allTasks[taskIndex], ...updates };
        processTasks();
        return true;
    }
    return false;
}

function deleteTask(taskId) {
    const taskIndex = allTasks.findIndex(t => t.id == taskId);
    if (taskIndex !== -1) {
        const task = allTasks[taskIndex];
        task.deleted = true;
        task.deleted_at = new Date().toISOString();
        processTasks();
        return true;
    }
    return false;
}

// ========== ЭКСПОРТ ==========
window.taskFlow = {
    // Конфигурация
    CONFIG,
    
    // Данные
    allTasks,
    archivedTasks,
    calendarNotes,
    userId,
    currentPage,
    currentFilter,
    activeFilters,
    
    // Основные функции
    saveToStorage,
    loadFromStorage,
    processTasks,
    formatDate,
    getCategoryName,
    getPriorityName,
    checkBackendConnection,
    syncWithServer,
    
    // Утилиты
    addTask,
    updateTask,
    deleteTask
};

// Глобальные функции для отладки
window.debugTaskFlow = () => {
    console.log('=== DEBUG TASKFLOW ===');
    console.log('userId:', taskFlow.userId);
    console.log('allTasks:', taskFlow.allTasks.length, 'items');
    console.log('archivedTasks:', taskFlow.archivedTasks.length, 'items');
    console.log('currentPage:', taskFlow.currentPage);
    console.log('activeFilters:', taskFlow.activeFilters);
    console.log('CONFIG.BACKEND_URL:', taskFlow.CONFIG.BACKEND_URL);
    console.log('====================');
};

window.forceSync = async () => {
    console.log('🔄 Принудительная синхронизация...');
    const result = await taskFlow.syncWithServer();
    if (result) {
        console.log('✅ Синхронизация успешна');
        if (typeof showToast === 'function') {
            showToast('Данные синхронизированы', 'success');
        }
    } else {
        console.error('❌ Ошибка синхронизации');
        if (typeof showToast === 'function') {
            showToast('Ошибка синхронизации', 'error');
        }
    }
    return result;
};

// Автоматическая проверка при загрузке
window.addEventListener('load', () => {
    console.log('🚀 TaskFlow Core загружен');
    console.log('Backend URL:', CONFIG.BACKEND_URL);
    
    // Инициализация данных из localStorage
    const localData = loadFromStorage();
    taskFlow.allTasks = localData.tasks || [];
    taskFlow.archivedTasks = localData.archived || [];
    taskFlow.calendarNotes = localData.notes || [];
    taskFlow.userId = localData.userId || null;
    
    if (localData.filters) {
        taskFlow.activeFilters = localData.filters;
    }
    
    console.log('📂 Инициализировано из localStorage:');
    console.log(`   Задачи: ${taskFlow.allTasks.length}`);
    console.log(`   Архив: ${taskFlow.archivedTasks.length}`);
    console.log(`   userId: ${taskFlow.userId}`);
});
