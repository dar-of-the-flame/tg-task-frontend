// ===== КОНФИГУРАЦИЯ =====
const CONFIG = {
    BACKEND_URL: 'https://tg-task-bot-service.onrender.com',
    STORAGE_KEY: 'taskflow_data',
    VERSION: '1.0.0'
};

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let tg = null;
let userId = null;
let allTasks = [];
let archivedTasks = [];
let calendarNotes = [];
let currentFilter = 'all';
let activeFilters = {
    categories: ['work', 'personal', 'health', 'study'],
    priorities: ['high', 'medium', 'low'],
    status: ['active']
};
let categoryChart = null;
let weekdayChart = null;
let currentCalendarDate = new Date();
let selectedCalendarDate = new Date().toISOString().split('T')[0];

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Скрываем загрузочный экран через 500мс
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
            document.querySelector('.app-container').style.display = 'block';
        }, 500);

        // Инициализируем Telegram Web App
        await initTelegram();
        
        // Инициализируем приложение
        await initApp();
        
        // Настраиваем обработчики событий
        setupEventListeners();
        
        // Загружаем данные
        await loadData();
        
        // Обновляем интерфейс
        updateUI();
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showToast('Ошибка загрузки приложения', 'error');
    }
});

// ===== TELEGRAM INIT =====
async function initTelegram() {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        
        // Настраиваем Telegram Web App
        tg.expand();
        tg.enableClosingConfirmation();
        tg.ready();
        
        // Получаем данные пользователя
        const user = tg.initDataUnsafe?.user;
        userId = user?.id || `guest_${Date.now()}`;
        
        console.log('Telegram user:', user);
        console.log('User ID:', userId);
        
        // Настраиваем тему Telegram
        if (tg.colorScheme === 'light') {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
        }
    } else {
        // Режим разработки или вне Telegram
        userId = `dev_${Date.now()}`;
        console.log('Development mode, User ID:', userId);
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ =====
async function initApp() {
    // Устанавливаем текущую дату
    updateCurrentDate();
    
    // Настраиваем поля формы
    setupFormDefaults();
    
    // Инициализируем календарь
    initCalendar();
    
    // Инициализируем графики
    initCharts();
    
    // Проверяем обновления данных
    checkForUpdates();
}

function updateCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('ru-RU', options);
    }
}

function setupFormDefaults() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Устанавливаем дату по умолчанию
    document.getElementById('task-date').valueAsDate = now;
    document.getElementById('task-date').min = now.toISOString().split('T')[0];
    
    // Устанавливаем время по умолчанию
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('task-time').value = `${hours}:${minutes}`;
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
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
    
    // Клик вне FAB меню
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.fab-container') && fabMenu.classList.contains('open')) {
            fabMain.classList.remove('rotate');
            fabMenu.classList.remove('open');
        }
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
    
    // Архив
    document.getElementById('clear-archive').addEventListener('click', clearArchive);
    
    // Статистика
    document.getElementById('refresh-stats').addEventListener('click', updateStats);
    
    // Переключение темы
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Кнопка поиска
    document.getElementById('search-btn').addEventListener('click', () => {
        showToast('Поиск скоро будет доступен', 'info');
    });
}

// ===== НАВИГАЦИЯ =====
function switchPage(page) {
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
    
    // Обновляем контент страницы
    switch (page) {
        case 'tasks':
            filterTasks();
            break;
        case 'calendar':
            renderCalendar();
            updateDayTasks();
            break;
        case 'archive':
            renderArchive();
            break;
        case 'stats':
            updateStats();
            break;
    }
    
    // Закрываем FAB меню
    document.getElementById('fab-main').classList.remove('rotate');
    document.getElementById('fab-menu').classList.remove('open');
}

// ===== РАБОТА С ДАННЫМИ =====
async function loadData() {
    try {
        showLoading(true);
        
        // Пытаемся загрузить с сервера
        if (tg?.initDataUnsafe?.user?.id) {
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/tasks?user_id=${userId}`);
            if (response.ok) {
                const data = await response.json();
                allTasks = data.tasks || [];
            }
        }
        
        // Загружаем из локального хранилища
        const localData = loadFromStorage();
        if (localData.tasks) {
            allTasks = [...allTasks, ...localData.tasks];
        }
        if (localData.notes) {
            calendarNotes = localData.notes;
        }
        
        // Обрабатываем данные
        processTasks();
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        
        // Демо-данные для тестирования
        if (allTasks.length === 0) {
            allTasks = generateDemoTasks();
        }
        
    } finally {
        showLoading(false);
    }
}

function processTasks() {
    // Разделяем задачи на активные и архивные
    archivedTasks = allTasks.filter(task => task.completed || task.deleted);
    allTasks = allTasks.filter(task => !task.completed && !task.deleted);
    
    // Сортируем задачи по дате и приоритету
    allTasks.sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (a.priority !== 'high' && b.priority === 'high') return 1;
        
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
    });
    
    // Сохраняем обновленные данные
    saveToStorage();
}

function saveToStorage() {
    const data = {
        tasks: [...allTasks, ...archivedTasks],
        notes: calendarNotes,
        filters: activeFilters,
        lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem(`${CONFIG.STORAGE_KEY}_${userId}`, JSON.stringify(data));
}

function loadFromStorage() {
    const data = localStorage.getItem(`${CONFIG.STORAGE_KEY}_${userId}`);
    return data ? JSON.parse(data) : { tasks: [], notes: [], filters: activeFilters };
}

function checkForUpdates() {
    const lastCheck = localStorage.getItem('last_data_check');
    const now = Date.now();
    
    if (!lastCheck || now - parseInt(lastCheck) > 3600000) { // Каждый час
        syncWithBackend();
        localStorage.setItem('last_data_check', now.toString());
    }
}

async function syncWithBackend() {
    if (!tg?.initDataUnsafe?.user?.id) return;
    
    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                tasks: allTasks,
                last_sync: localStorage.getItem('last_sync')
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.tasks) {
                allTasks = data.tasks;
                processTasks();
                filterTasks();
            }
            localStorage.setItem('last_sync', new Date().toISOString());
        }
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
    }
}

// ===== РАБОТА С ЗАДАЧАМИ =====
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
    if (activeFilters.status.includes('completed')) {
        filteredTasks = filteredTasks.filter(task => task.completed);
    }
    if (activeFilters.status.includes('overdue')) {
        const today = new Date().toISOString().split('T')[0];
        filteredTasks = filteredTasks.filter(task => 
            task.date && task.date < today && !task.completed
        );
    }
    
    // Быстрые фильтры
    switch (currentFilter) {
        case 'today':
            const today = new Date().toISOString().split('T')[0];
            filteredTasks = filteredTasks.filter(task => task.date === today);
            break;
        case 'tomorrow':
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            filteredTasks = filteredTasks.filter(task => 
                task.date === tomorrow.toISOString().split('T')[0]
            );
            break;
        case 'week':
            const weekStart = new Date();
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() + 7);
            filteredTasks = filteredTasks.filter(task => {
                if (!task.date) return false;
                const taskDate = new Date(task.date);
                return taskDate >= weekStart && taskDate <= weekEnd;
            });
            break;
        case 'overdue':
            const now = new Date().toISOString().split('T')[0];
            filteredTasks = filteredTasks.filter(task => 
                task.date && task.date < now && !task.completed
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
                <button class="task-btn complete" onclick="completeTask('${task.id}')" title="Отметить выполненным">
                    <i class="fas fa-check"></i>
                </button>
                <button class="task-btn edit" onclick="editTask('${task.id}')" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="task-btn delete" onclick="deleteTask('${task.id}')" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

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
    // Сбрасываем форму
    document.getElementById('task-form').reset();
    
    // Устанавливаем значения по умолчанию
    const now = new Date();
    document.getElementById('task-date').valueAsDate = now;
    
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('task-time').value = `${hours}:${minutes}`;
    
    // Настраиваем в зависимости от типа
    if (options.type === 'quick') {
        document.querySelector('.type-tab[data-type="task"]').click();
        document.getElementById('task-reminder').value = '0';
    } else if (options.type === 'reminder') {
        document.querySelector('.type-tab[data-type="reminder"]').click();
        document.getElementById('task-reminder').value = '15';
    }
    
    // Показываем модальное окно
    document.getElementById('task-modal').style.display = 'flex';
    document.getElementById('task-text').focus();
}

async function handleTaskSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const formData = new FormData(e.target);
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
            deleted: false,
            created_at: new Date().toISOString()
        };
        
        // Валидация
        if (!taskData.text.trim()) {
            throw new Error('Введите текст задачи');
        }
        
        // Сохраняем задачу
        const saved = await saveTask(taskData);
        
        if (saved) {
            // Добавляем задачу в список
            allTasks.unshift(taskData);
            processTasks();
            
            // Обновляем интерфейс
            filterTasks();
            
            // Закрываем модальное окно
            document.getElementById('task-modal').style.display = 'none';
            
            // Показываем уведомление
            showToast('Задача успешно сохранена!', 'success');
            
            // Отправляем в Telegram, если пользователь авторизован
            if (tg?.initDataUnsafe?.user) {
                tg.sendData(JSON.stringify({
                    action: 'task_created',
                    task: taskData.text
                }));
            }
        }
        
    } catch (error) {
        console.error('Ошибка сохранения задачи:', error);
        showToast(error.message || 'Ошибка сохранения задачи', 'error');
    } finally {
        showLoading(false);
    }
}

async function saveTask(taskData) {
    try {
        // Если пользователь авторизован в Telegram, отправляем на сервер
        if (tg?.initDataUnsafe?.user?.id) {
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/new_task`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData)
            });
            
            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }
            
            return await response.json();
        }
        
        // Сохраняем локально
        saveToStorage();
        return { success: true, task: taskData };
        
    } catch (error) {
        console.warn('Ошибка сервера, сохраняем локально:', error);
        saveToStorage();
        return { success: true, task: taskData };
    }
}

function setCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('task-time').value = `${hours}:${minutes}`;
}

// ===== ОПЕРАЦИИ С ЗАДАЧАМИ =====
window.completeTask = function(taskId) {
    const taskIndex = allTasks.findIndex(task => task.id == taskId);
    if (taskIndex !== -1) {
        allTasks[taskIndex].completed = true;
        allTasks[taskIndex].completed_at = new Date().toISOString();
        processTasks();
        filterTasks();
        updateStats();
        showToast('Задача выполнена!', 'success');
    }
};

window.editTask = function(taskId) {
    const task = allTasks.find(t => t.id == taskId);
    if (!task) return;
    
    // Заполняем форму данными задачи
    document.getElementById('task-text').value = task.text;
    document.getElementById('task-category').value = task.category;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-date').value = task.date;
    document.getElementById('task-time').value = task.time || '';
    document.getElementById('task-reminder').value = task.reminder || '0';
    
    // Устанавливаем активные элементы
    document.querySelectorAll('.category-tag').forEach(tag => {
        tag.classList.toggle('active', tag.dataset.category === task.category);
    });
    
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.priority === task.priority);
    });
    
    // Показываем модальное окно
    document.getElementById('task-modal').style.display = 'flex';
    
    // Обновляем обработчик формы для редактирования
    const form = document.getElementById('task-form');
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        try {
            showLoading(true);
            
            // Обновляем задачу
            task.text = document.getElementById('task-text').value;
            task.category = document.getElementById('task-category').value;
            task.priority = document.getElementById('task-priority').value;
            task.date = document.getElementById('task-date').value;
            task.time = document.getElementById('task-time').value;
            task.reminder = parseInt(document.getElementById('task-reminder').value);
            task.updated_at = new Date().toISOString();
            
            // Сохраняем изменения
            saveToStorage();
            
            // Обновляем интерфейс
            filterTasks();
            
            // Закрываем модальное окно
            document.getElementById('task-modal').style.display = 'none';
            
            // Показываем уведомление
            showToast('Задача обновлена!', 'success');
            
        } catch (error) {
            console.error('Ошибка обновления задачи:', error);
            showToast('Ошибка обновления задачи', 'error');
        } finally {
            showLoading(false);
        }
    };
};

window.deleteTask = function(taskId) {
    if (confirm('Удалить эту задачу?')) {
        const taskIndex = allTasks.findIndex(task => task.id == taskId);
        if (taskIndex !== -1) {
            allTasks[taskIndex].deleted = true;
            allTasks[taskIndex].deleted_at = new Date().toISOString();
            processTasks();
            filterTasks();
            updateStats();
            showToast('Задача удалена', 'warning');
        }
    }
};

// ===== КАЛЕНДАРЬ =====
function initCalendar() {
    renderCalendar();
}

function renderCalendar() {
    const container = document.getElementById('calendar-grid');
    const monthElement = document.getElementById('current-month');
    
    if (!container) return;
    
    // Обновляем заголовок месяца
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    monthElement.textContent = `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;
    
    // Очищаем контейнер (сохраняем заголовки дней)
    const weekdays = container.querySelectorAll('.weekday');
    container.innerHTML = '';
    weekdays.forEach(day => container.appendChild(day.cloneNode(true)));
    
    // Получаем первый и последний день месяца
    const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
    const lastDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
    
    // Добавляем пустые ячейки до первого дня
    const firstDayOfWeek = firstDay.getDay() || 7; // Воскресенье = 0, преобразуем в 7
    for (let i = 1; i < firstDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        container.appendChild(emptyDay);
    }
    
    // Добавляем дни месяца
    const today = new Date().toISOString().split('T')[0];
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.dataset.date = dateStr;
        
        if (dateStr === today) {
            dayElement.classList.add('today');
        }
        
        if (dateStr === selectedCalendarDate) {
            dayElement.classList.add('selected');
        }
        
        // Проверяем, есть ли задачи на этот день
        const hasTasks = allTasks.some(task => task.date === dateStr) || 
                        calendarNotes.some(note => note.date === dateStr);
        
        if (hasTasks) {
            dayElement.classList.add('has-tasks');
        }
        
        dayElement.innerHTML = `
            <div class="day-number">${day}</div>
        `;
        
        dayElement.addEventListener('click', () => {
            selectedCalendarDate = dateStr;
            renderCalendar();
            updateDayTasks();
            
            // Показываем меню быстрых действий для этого дня
            setTimeout(() => {
                showDayActions(dateStr);
            }, 100);
        });
        
        container.appendChild(dayElement);
    }
}

function updateDayTasks() {
    const container = document.getElementById('day-tasks-list');
    const dateElement = document.getElementById('selected-date');
    
    if (!container) return;
    
    // Обновляем заголовок
    const date = new Date(selectedCalendarDate);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let dateText = '';
    if (selectedCalendarDate === today) {
        dateText = 'сегодня';
    } else if (selectedCalendarDate === tomorrow.toISOString().split('T')[0]) {
        dateText = 'завтра';
    } else {
        dateText = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    }
    
    dateElement.textContent = dateText;
    
    // Находим задачи на этот день
    const dayTasks = allTasks.filter(task => task.date === selectedCalendarDate);
    const dayNotes = calendarNotes.filter(note => note.date === selectedCalendarDate);
    
    if (dayTasks.length === 0 && dayNotes.length === 0) {
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
    
    // Отображаем задачи
    let html = '';
    
    // Заметки
    dayNotes.forEach(note => {
        html += `
            <div class="day-task note" style="border-left: 3px solid ${note.color};">
                <i class="fas fa-sticky-note" style="color: ${note.color};"></i>
                <div style="flex: 1;">
                    <div>${note.text}</div>
                    <small style="color: var(--text-secondary); font-size: 12px;">
                        ${new Date(note.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </small>
                </div>
                <button class="task-btn" onclick="deleteNote('${note.id}')" title="Удалить заметку">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });
    
    // Задачи
    dayTasks.forEach(task => {
        html += `
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
        `;
    });
    
    container.innerHTML = html;
}

function showDayActions(dateStr) {
    // Здесь можно добавить контекстное меню для дня
    // Например, показывать плавающие кнопки действий
}

window.openTaskFormForDate = function(dateStr) {
    document.getElementById('task-date').value = dateStr;
    openTaskForm();
};

// ===== БЫСТРЫЕ ЗАМЕТКИ =====
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

window.deleteNote = function(noteId) {
    if (confirm('Удалить эту заметку?')) {
        calendarNotes = calendarNotes.filter(note => note.id !== noteId);
        saveToStorage();
        updateDayTasks();
        renderCalendar();
        showToast('Заметка удалена', 'warning');
    }
};

// ===== АРХИВ =====
function renderArchive() {
    const container = document.getElementById('archive-list');
    const emptyState = document.getElementById('empty-archive');
    
    if (archivedTasks.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    container.innerHTML = archivedTasks.map(task => `
        <div class="archive-item ${task.deleted ? 'deleted' : ''}" data-id="${task.id}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="flex: 1;">
                    <div style="font-weight: 500; margin-bottom: 4px;">${task.text}</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">
                        ${task.date ? formatDate(task.date) : 'Без даты'}
                        ${task.completed ? ` · Выполнено ${formatDate(task.completed_at)}` : ''}
                        ${task.deleted ? ` · Удалено ${formatDate(task.deleted_at)}` : ''}
                    </div>
                </div>
                ${task.deleted ? '' : `
                    <button class="task-btn" onclick="restoreTask('${task.id}')" title="Восстановить">
                        <i class="fas fa-redo"></i>
                    </button>
                `}
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 12px; padding: 2px 8px; background: var(--bg-tertiary); border-radius: 12px;">
                    ${getCategoryName(task.category)}
                </span>
                <span style="font-size: 12px; padding: 2px 8px; background: var(--bg-tertiary); border-radius: 12px;">
                    ${getPriorityName(task.priority)}
                </span>
            </div>
        </div>
    `).join('');
}

window.restoreTask = function(taskId) {
    const taskIndex = archivedTasks.findIndex(task => task.id == taskId);
    if (taskIndex !== -1) {
        const task = archivedTasks[taskIndex];
        task.completed = false;
        task.deleted = false;
        
        allTasks.push(task);
        archivedTasks.splice(taskIndex, 1);
        
        processTasks();
        renderArchive();
        showToast('Задача восстановлена', 'success');
    }
};

function clearArchive() {
    if (confirm('Очистить весь архив? Это действие нельзя отменить.')) {
        archivedTasks = [];
        saveToStorage();
        renderArchive();
        showToast('Архив очищен', 'warning');
    }
};

// ===== ФИЛЬТРЫ =====
function applyFilters() {
    // Собираем выбранные категории
    activeFilters.categories = [];
    document.querySelectorAll('input[name="category"]:checked').forEach(checkbox => {
        activeFilters.categories.push(checkbox.value);
    });
    
    // Собираем выбранные приоритеты
    activeFilters.priorities = [];
    document.querySelectorAll('input[name="priority"]:checked').forEach(checkbox => {
        activeFilters.priorities.push(checkbox.value);
    });
    
    // Собираем выбранные статусы
    activeFilters.status = [];
    document.querySelectorAll('input[name="status"]:checked').forEach(checkbox => {
        activeFilters.status.push(checkbox.value);
    });
    
    // Сохраняем фильтры
    saveToStorage();
    
    // Закрываем панель и применяем фильтры
    document.getElementById('filters-panel').classList.remove('open');
    filterTasks();
    
    showToast('Фильтры применены', 'success');
}

function resetFilters() {
    // Сбрасываем все чекбоксы
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
    });
    
    // Сбрасываем активные фильтры
    activeFilters = {
        categories: ['work', 'personal', 'health', 'study'],
        priorities: ['high', 'medium', 'low'],
        status: ['active']
    };
    
    showToast('Фильтры сброшены', 'info');
}

// ===== СТАТИСТИКА =====
function initCharts() {
    const categoryCtx = document.getElementById('categoryChart')?.getContext('2d');
    const weekdayCtx = document.getElementById('weekdayChart')?.getContext('2d');
    
    if (categoryCtx) {
        categoryChart = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: ['Работа', 'Личное', 'Здоровье', 'Учёба'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        '#667eea',
                        '#f093fb',
                        '#4facfe',
                        '#43e97b'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }
    
    if (weekdayCtx) {
        weekdayChart = new Chart(weekdayCtx, {
            type: 'bar',
            data: {
                labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
                datasets: [{
                    label: 'Задачи',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: '#667eea',
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                        }
                    }
                }
            }
        });
    }
}

function updateStats() {
    // Общие данные
    const totalTasks = allTasks.length + archivedTasks.length;
    const completedTasks = archivedTasks.filter(t => t.completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const activeTasks = allTasks.length;
    const overdueTasks = allTasks.filter(task => {
        if (!task.date) return false;
        return new Date(task.date) < new Date() && !task.completed;
    }).length;
    
    // Обновляем статистику
    document.getElementById('total-tasks').textContent = totalTasks;
    document.getElementById('completed-tasks').textContent = completedTasks;
    document.getElementById('productivity').textContent = `${completionRate}%`;
    document.getElementById('in-progress').textContent = activeTasks;
    document.getElementById('overdue-tasks').textContent = overdueTasks;
    
    // Считаем среднее в день
    const tasksByDate = {};
    [...allTasks, ...archivedTasks].forEach(task => {
        if (task.date) {
            tasksByDate[task.date] = (tasksByDate[task.date] || 0) + 1;
        }
    });
    
    const avgPerDay = Object.keys(tasksByDate).length > 0 
        ? (Object.values(tasksByDate).reduce((a, b) => a + b, 0) / Object.keys(tasksByDate).length).toFixed(1)
        : 0;
    
    const bestDay = Object.keys(tasksByDate).length > 0
        ? Math.max(...Object.values(tasksByDate))
        : 0;
    
    document.getElementById('avg-per-day').textContent = avgPerDay;
    document.getElementById('best-day').textContent = bestDay;
    
    // Считаем дни подряд
    let streak = 0;
    const dates = Object.keys(tasksByDate).sort();
    const today = new Date().toISOString().split('T')[0];
    
    for (let i = dates.length - 1; i >= 0; i--) {
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - (dates.length - 1 - i));
        const expectedDateStr = expectedDate.toISOString().split('T')[0];
        
        if (dates[i] === expectedDateStr) {
            streak++;
        } else {
            break;
        }
    }
    
    document.getElementById('streak').textContent = streak;
    
    // Обновляем графики
    updateCharts();
}

function updateCharts() {
    if (!categoryChart || !weekdayChart) return;
    
    // Статистика по категориям
    const categoryStats = {
        work: 0,
        personal: 0,
        health: 0,
        study: 0
    };
    
    allTasks.forEach(task => {
        if (categoryStats[task.category] !== undefined) {
            categoryStats[task.category]++;
        }
    });
    
    categoryChart.data.datasets[0].data = [
        categoryStats.work,
        categoryStats.personal,
        categoryStats.health,
        categoryStats.study
    ];
    categoryChart.update();
    
    // Статистика по дням недели
    const weekdayStats = [0, 0, 0, 0, 0, 0, 0];
    
    allTasks.forEach(task => {
        if (task.date) {
            const date = new Date(task.date);
            const day = date.getDay(); // 0 = воскресенье, 1 = понедельник...
            const adjustedDay = day === 0 ? 6 : day - 1; // Преобразуем к 0-6, где 0 = понедельник
            weekdayStats[adjustedDay]++;
        }
    });
    
    weekdayChart.data.datasets[0].data = weekdayStats;
    weekdayChart.update();
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
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

function getPriorityName(priority) {
    const priorities = {
        'high': 'Высокий',
        'medium': 'Средний',
        'low': 'Низкий'
    };
    return priorities[priority] || priority;
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
    
    // Обновляем графики при смене темы
    updateChartsTheme();
}

function updateChartsTheme() {
    setTimeout(() => {
        if (categoryChart) categoryChart.destroy();
        if (weekdayChart) weekdayChart.destroy();
        initCharts();
        updateStats();
    }, 100);
}

function showLoading(show) {
    const loader = document.getElementById('global-loading');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
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

function updateUI() {
    filterTasks();
    renderArchive();
    updateStats();
}

// ===== ДЕМО-ДАННЫЕ =====
function generateDemoTasks() {
    const categories = ['work', 'personal', 'health', 'study'];
    const priorities = ['high', 'medium', 'low'];
    const now = new Date();
    
    return Array.from({ length: 10 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() + Math.floor(Math.random() * 7));
        
        return {
            id: Date.now() + i,
            user_id: userId,
            text: `Демо задача ${i + 1}`,
            category: categories[Math.floor(Math.random() * categories.length)],
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            date: date.toISOString().split('T')[0],
            time: Math.random() > 0.5 ? `${Math.floor(Math.random() * 23).toString().padStart(2, '0')}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}` : '',
            reminder: Math.random() > 0.5 ? 15 : 0,
            completed: Math.random() > 0.7,
            deleted: false,
            created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        };
    });
}

// ===== TELEGRAM BACK BUTTON =====
if (window.Telegram && window.Telegram.WebApp) {
    tg.BackButton.onClick(() => {
        // Закрываем открытые модальные окна
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

// Показываем кнопку "Назад" при открытии модальных окон
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal && tg) {
            tg.BackButton.show();
        }
    });
});

document.getElementById('filter-toggle-btn').addEventListener('click', () => {
    if (tg) tg.BackButton.show();
});

document.getElementById('fab-main').addEventListener('click', () => {
    const fabMenu = document.getElementById('fab-menu');
    if (fabMenu.classList.contains('open') && tg) {
        tg.BackButton.show();
    }
});
