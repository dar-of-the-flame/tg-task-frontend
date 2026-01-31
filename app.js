// Конфигурация
const CONFIG = {
    BACKEND_URL: 'https://tg-task-bot-service.onrender.com',
    STORAGE_KEY: 'taskflow_data'
};

// Telegram инициализация
let tg = null;
let userId = null;
let allTasks = [];
let currentFilter = 'today';
let currentPage = 'tasks';
let activeFilters = {
    categories: ['work', 'personal', 'health', 'study'],
    priorities: ['high', 'medium', 'low'],
    status: ['active']
};

// Загрузка приложения
document.addEventListener('DOMContentLoaded', () => {
    initTelegram();
    initApp();
    setupEventListeners();
    loadData();
});

// Инициализация Telegram
function initTelegram() {
    if (window.Telegram?.WebApp) {
        tg = window.Telegram.WebApp;
        tg.expand();
        tg.enableClosingConfirmation();
        tg.ready();
        
        const user = tg.initDataUnsafe?.user;
        userId = user?.id || `guest_${Date.now()}`;
        
        // Настройка темы
        if (tg.colorScheme === 'light') {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
        }
    } else {
        userId = `dev_${Date.now()}`;
    }
}

// Инициализация приложения
function initApp() {
    updateCurrentDate();
    setupFormDefaults();
    initCalendar();
}

function updateCurrentDate() {
    const now = new Date();
    const el = document.getElementById('current-date');
    if (el) {
        el.textContent = now.toLocaleDateString('ru-RU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
}

function setupFormDefaults() {
    const now = new Date();
    document.getElementById('task-date').valueAsDate = now;
    document.getElementById('task-date').min = now.toISOString().split('T')[0];
    
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('task-time').value = `${hours}:${minutes}`;
}

// Обработчики событий
function setupEventListeners() {
    // Навигация
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            switchPage(page);
        });
    });
    
    // FAB меню
    const fabMain = document.getElementById('fab-main');
    const fabMenu = document.getElementById('fab-menu');
    
    fabMain.addEventListener('click', () => {
        fabMain.classList.toggle('rotate');
        fabMenu.classList.toggle('open');
    });
    
    // Пункты FAB меню
    document.querySelectorAll('.fab-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            handleFabAction(action);
            fabMain.classList.remove('rotate');
            fabMenu.classList.remove('open');
        });
    });
    
    // Фильтры
    document.getElementById('filter-toggle-btn').addEventListener('click', () => {
        document.getElementById('filters-panel').classList.add('open');
    });
    
    document.querySelector('.close-filters').addEventListener('click', () => {
        document.getElementById('filters-panel').classList.remove('open');
    });
    
    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    
    // Быстрые фильтры
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.dataset.filter;
            filterTasks();
        });
    });
    
    // Форма задачи
    document.getElementById('task-form').addEventListener('submit', handleTaskSubmit);
    document.getElementById('set-now-btn').addEventListener('click', setCurrentTime);
    
    // Категории
    document.querySelectorAll('.category-tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            document.querySelectorAll('.category-tag').forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            document.getElementById('task-category').value = e.currentTarget.dataset.category;
        });
    });
    
    // Приоритеты
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            document.getElementById('task-priority').value = e.currentTarget.dataset.priority;
        });
    });
    
    // Закрытие модальных окон
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
        });
    });
    
    // Клик вне модальных окон
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Календарь
    document.getElementById('prev-month').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });
    
    document.getElementById('next-month').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
    
    document.getElementById('today-btn').addEventListener('click', () => {
        currentCalendarDate = new Date();
        selectedCalendarDate = currentCalendarDate.toISOString().split('T')[0];
        renderCalendar();
        updateDayTasks();
    });
    
    // Переключение темы
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

// Навигация по страницам
function switchPage(page) {
    currentPage = page;
    
    // Обновляем активную кнопку навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.page === page) {
            btn.classList.add('active');
        }
    });
    
    // Показываем активную страницу
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(`${page}-page`).classList.add('active');
    
    // Обновляем контент
    if (page === 'tasks') filterTasks();
    else if (page === 'calendar') renderCalendar();
    else if (page === 'archive') renderArchive();
    else if (page === 'stats') updateStats();
    
    // Закрываем FAB меню
    document.getElementById('fab-main').classList.remove('rotate');
    document.getElementById('fab-menu').classList.remove('open');
}

// Загрузка данных
async function loadData() {
    try {
        showLoading(true);
        
        // Локальное хранилище
        const localData = loadFromStorage();
        if (localData.tasks) {
            allTasks = localData.tasks;
        }
        
        // Обрабатываем задачи
        processTasks();
        filterTasks();
        updateStats();
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showToast('Ошибка загрузки данных', 'error');
    } finally {
        showLoading(false);
    }
}

function processTasks() {
    // Сортируем задачи
    allTasks.sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (a.priority !== 'high' && b.priority === 'high') return 1;
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
    });
    
    saveToStorage();
}

function saveToStorage() {
    const data = {
        tasks: allTasks,
        filters: activeFilters,
        lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(`${CONFIG.STORAGE_KEY}_${userId}`, JSON.stringify(data));
}

function loadFromStorage() {
    const data = localStorage.getItem(`${CONFIG.STORAGE_KEY}_${userId}`);
    return data ? JSON.parse(data) : { tasks: [], filters: activeFilters };
}

// Работа с задачами
function filterTasks() {
    let filteredTasks = [...allTasks];
    
    // Фильтр по категориям
    if (activeFilters.categories.length > 0) {
        filteredTasks = filteredTasks.filter(task => 
            activeFilters.categories.includes(task.category)
        );
    }
    
    // Фильтр по приоритетам
    if (activeFilters.priorities.length > 0) {
        filteredTasks = filteredTasks.filter(task => 
            activeFilters.priorities.includes(task.priority)
        );
    }
    
    // Фильтр по статусу
    if (activeFilters.status.includes('active')) {
        filteredTasks = filteredTasks.filter(task => !task.completed);
    }
    
    // Быстрые фильтры
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    switch (currentFilter) {
        case 'today':
            filteredTasks = filteredTasks.filter(task => task.date === today);
            break;
        case 'tomorrow':
            filteredTasks = filteredTasks.filter(task => task.date === tomorrow.toISOString().split('T')[0]);
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
    
    renderTasks(filteredTasks);
}

function renderTasks(tasks) {
    const container = document.getElementById('tasks-list');
    const emptyState = document.getElementById('empty-tasks');
    
    if (!tasks || tasks.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    container.innerHTML = tasks.map(task => `
        <div class="task-item priority-${task.priority} ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="task-header">
                <div class="task-title">${task.text}</div>
                <div class="task-category">${getCategoryName(task.category)}</div>
            </div>
            <div class="task-meta">
                ${task.date ? `<div class="task-date">${formatDate(task.date)}</div>` : ''}
                ${task.time ? `<div class="task-time"><i class="far fa-clock"></i> ${task.time}</div>` : ''}
            </div>
            <div class="task-actions">
                <button class="task-btn complete" onclick="completeTask('${task.id}')">
                    <i class="fas fa-check"></i>
                </button>
                <button class="task-btn delete" onclick="deleteTask('${task.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Действия FAB
function handleFabAction(action) {
    switch (action) {
        case 'quick-task':
            openTaskForm({ type: 'quick' });
            break;
        case 'add-note':
            openQuickNoteModal();
            break;
        case 'add-reminder':
            openTaskForm({ type: 'reminder' });
            break;
    }
}

function openTaskForm(options = {}) {
    document.getElementById('task-form').reset();
    
    const now = new Date();
    document.getElementById('task-date').valueAsDate = now;
    
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('task-time').value = `${hours}:${minutes}`;
    
    if (options.type === 'quick') {
        document.getElementById('task-reminder').value = '0';
    } else if (options.type === 'reminder') {
        document.getElementById('task-reminder').value = '15';
    }
    
    document.getElementById('task-modal').style.display = 'flex';
    document.getElementById('task-text').focus();
}

async function handleTaskSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const taskData = {
            id: Date.now(),
            user_id: userId,
            text: document.getElementById('task-text').value,
            category: document.getElementById('task-category').value,
            priority: document.getElementById('task-priority').value,
            date: document.getElementById('task-date').value,
            time: document.getElementById('task-time').value,
            reminder: parseInt(document.getElementById('task-reminder').value),
            completed: false,
            created_at: new Date().toISOString()
        };
        
        if (!taskData.text.trim()) {
            throw new Error('Введите текст задачи');
        }
        
        // Сохраняем задачу
        await saveTask(taskData);
        
        allTasks.unshift(taskData);
        processTasks();
        filterTasks();
        
        document.getElementById('task-modal').style.display = 'none';
        showToast('Задача сохранена!', 'success');
        
        if (tg?.initDataUnsafe?.user) {
            tg.sendData(JSON.stringify({
                action: 'task_created',
                task: taskData.text
            }));
        }
        
    } catch (error) {
        showToast(error.message || 'Ошибка сохранения', 'error');
    } finally {
        showLoading(false);
    }
}

async function saveTask(taskData) {
    try {
        if (tg?.initDataUnsafe?.user?.id) {
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/new_task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
            
            if (!response.ok) throw new Error(`Ошибка: ${response.status}`);
            return await response.json();
        }
        
        saveToStorage();
        return { success: true };
        
    } catch (error) {
        saveToStorage();
        return { success: true };
    }
}

function setCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('task-time').value = `${hours}:${minutes}`;
}

// Операции с задачами
window.completeTask = function(taskId) {
    const task = allTasks.find(t => t.id == taskId);
    if (task) {
        task.completed = true;
        task.completed_at = new Date().toISOString();
        processTasks();
        filterTasks();
        updateStats();
        showToast('Задача выполнена!', 'success');
    }
};

window.deleteTask = function(taskId) {
    if (confirm('Удалить задачу?')) {
        allTasks = allTasks.filter(task => task.id != taskId);
        saveToStorage();
        filterTasks();
        updateStats();
        showToast('Задача удалена', 'warning');
    }
};

// Календарь
let currentCalendarDate = new Date();
let selectedCalendarDate = new Date().toISOString().split('T')[0];

function initCalendar() {
    renderCalendar();
}

function renderCalendar() {
    const container = document.getElementById('calendar-grid');
    const monthElement = document.getElementById('current-month');
    
    if (!container) return;
    
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    monthElement.textContent = `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;
    
    // Очищаем контейнер
    const weekdays = container.querySelectorAll('.weekday');
    container.innerHTML = '';
    weekdays.forEach(day => container.appendChild(day.cloneNode(true)));
    
    // Первый и последний день месяца
    const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
    const lastDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
    
    // Пустые ячейки
    const firstDayOfWeek = firstDay.getDay() || 7;
    for (let i = 1; i < firstDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        container.appendChild(emptyDay);
    }
    
    // Дни месяца
    const today = new Date().toISOString().split('T')[0];
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.dataset.date = dateStr;
        
        if (dateStr === today) dayElement.classList.add('today');
        if (dateStr === selectedCalendarDate) dayElement.classList.add('selected');
        
        // Проверяем задачи на этот день
        const hasTasks = allTasks.some(task => task.date === dateStr);
        if (hasTasks) dayElement.classList.add('has-tasks');
        
        dayElement.innerHTML = `<div class="day-number">${day}</div>`;
        
        dayElement.addEventListener('click', () => {
            selectedCalendarDate = dateStr;
            renderCalendar();
            updateDayTasks();
        });
        
        container.appendChild(dayElement);
    }
}

function updateDayTasks() {
    const container = document.getElementById('day-tasks-list');
    const dateElement = document.getElementById('selected-date');
    
    if (!container) return;
    
    const date = new Date(selectedCalendarDate);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let dateText = '';
    if (selectedCalendarDate === today) dateText = 'сегодня';
    else if (selectedCalendarDate === tomorrow.toISOString().split('T')[0]) dateText = 'завтра';
    else dateText = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    
    dateElement.textContent = dateText;
    
    const dayTasks = allTasks.filter(task => task.date === selectedCalendarDate);
    
    if (dayTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <p>Нет задач на этот день</p>
                <button class="btn btn-primary" onclick="openTaskFormForDate('${selectedCalendarDate}')" style="margin-top: 10px;">
                    <i class="fas fa-plus"></i> Добавить задачу
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = dayTasks.map(task => `
        <div class="day-task">
            <i class="fas fa-tasks"></i>
            <div style="flex: 1;">
                <div>${task.text}</div>
                ${task.time ? `<small style="color: var(--text-secondary); font-size: 12px;">${task.time}</small>` : ''}
            </div>
            <button class="task-btn" onclick="completeTask('${task.id}')" title="Выполнить">
                <i class="fas fa-check"></i>
            </button>
        </div>
    `).join('');
}

window.openTaskFormForDate = function(dateStr) {
    document.getElementById('task-date').value = dateStr;
    openTaskForm();
};

// Быстрые заметки
let calendarNotes = [];

function openQuickNoteModal() {
    document.getElementById('quick-note-modal').style.display = 'flex';
    document.getElementById('quick-note-text').focus();
}

document.getElementById('quick-note-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const text = document.getElementById('quick-note-text').value.trim();
    const color = document.getElementById('note-color').value;
    
    if (!text) {
        showToast('Введите текст заметки', 'error');
        return;
    }
    
    const note = {
        id: Date.now(),
        text: text,
        color: color,
        date: selectedCalendarDate,
        created_at: new Date().toISOString()
    };
    
    calendarNotes.push(note);
    saveToStorage();
    
    document.getElementById('quick-note-modal').style.display = 'none';
    document.getElementById('quick-note-form').reset();
    
    updateDayTasks();
    renderCalendar();
    showToast('Заметка сохранена', 'success');
});

document.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', function() {
        document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('note-color').value = this.dataset.color;
    });
});

// Архив
function renderArchive() {
    const container = document.getElementById('archive-list');
    const emptyState = document.getElementById('empty-archive');
    
    const archivedTasks = allTasks.filter(task => task.completed);
    
    if (archivedTasks.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    container.innerHTML = archivedTasks.map(task => `
        <div class="archive-item" data-id="${task.id}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="flex: 1;">
                    <div style="font-weight: 500; margin-bottom: 4px;">${task.text}</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">
                        ${task.date ? formatDate(task.date) : 'Без даты'}
                        ${task.completed ? ` · Выполнено ${formatDate(task.completed_at)}` : ''}
                    </div>
                </div>
                <button class="task-btn" onclick="restoreTask('${task.id}')" title="Восстановить">
                    <i class="fas fa-redo"></i>
                </button>
            </div>
        </div>
    `).join('');
}

window.restoreTask = function(taskId) {
    const task = allTasks.find(t => t.id == taskId);
    if (task) {
        task.completed = false;
        saveToStorage();
        renderArchive();
        showToast('Задача восстановлена', 'success');
    }
};

// Фильтры
function applyFilters() {
    activeFilters.categories = [];
    document.querySelectorAll('input[name="category"]:checked').forEach(checkbox => {
        activeFilters.categories.push(checkbox.value);
    });
    
    activeFilters.priorities = [];
    document.querySelectorAll('input[name="priority"]:checked').forEach(checkbox => {
        activeFilters.priorities.push(checkbox.value);
    });
    
    activeFilters.status = [];
    document.querySelectorAll('input[name="status"]:checked').forEach(checkbox => {
        activeFilters.status.push(checkbox.value);
    });
    
    saveToStorage();
    document.getElementById('filters-panel').classList.remove('open');
    filterTasks();
    showToast('Фильтры применены', 'success');
}

function resetFilters() {
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
    });
    
    activeFilters = {
        categories: ['work', 'personal', 'health', 'study'],
        priorities: ['high', 'medium', 'low'],
        status: ['active']
    };
    
    showToast('Фильтры сброшены', 'info');
}

// Статистика
function updateStats() {
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const activeTasks = allTasks.filter(t => !t.completed).length;
    
    document.getElementById('total-tasks').textContent = totalTasks;
    document.getElementById('completed-tasks').textContent = completedTasks;
    document.getElementById('productivity').textContent = `${completionRate}%`;
    document.getElementById('in-progress').textContent = activeTasks;
    
    // Подсчет дней подряд
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const completedDates = [...new Set(allTasks.filter(t => t.completed && t.completed_at).map(t => t.completed_at.split('T')[0]))].sort();
    
    let currentDate = new Date(today);
    while (completedDates.includes(currentDate.toISOString().split('T')[0])) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    document.getElementById('streak').textContent = streak;
}

// Вспомогательные функции
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateString === today) return 'Сегодня';
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

function toggleTheme() {
    const icon = document.getElementById('theme-toggle').querySelector('i');
    const isDark = document.body.classList.contains('dark-theme');
    
    if (isDark) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        localStorage.setItem('theme', 'dark');
    }
}

function showLoading(show) {
    const loader = document.getElementById('global-loading');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = container.querySelector('.toast');
    
    toast.className = `toast ${type}`;
    toast.querySelector('.toast-message').textContent = message;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Инициализация темы
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const icon = document.getElementById('theme-toggle')?.querySelector('i');
    
    if (!icon) return;
    
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

// Инициализация при загрузке
initTheme();

// Telegram Back Button
if (window.Telegram?.WebApp) {
    tg.BackButton.onClick(() => {
        const modals = document.querySelectorAll('.modal');
        const openModal = Array.from(modals).find(modal => 
            getComputedStyle(modal).display === 'flex'
        );
        
        if (openModal) {
            openModal.style.display = 'none';
            tg.BackButton.hide();
        } else if (document.getElementById('filters-panel').classList.contains('open')) {
            document.getElementById('filters-panel').classList.remove('open');
            tg.BackButton.hide();
        } else if (document.getElementById('fab-menu').classList.contains('open')) {
            document.getElementById('fab-main').classList.remove('rotate');
            document.getElementById('fab-menu').classList.remove('open');
            tg.BackButton.hide();
        }
    });
}
