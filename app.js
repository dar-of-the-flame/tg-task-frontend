// Telegram Web App инициализация
const tg = window.Telegram.WebApp;

// Бэкенд URL
const BACKEND_URL = 'https://tg-task-bot-service.onrender.com';

// Глобальные переменные
let currentUserId = null;
let allTasks = [];
let archivedTasks = [];
let currentFilter = 'all';
let categoryChart = null;
let weekdayChart = null;

// DOM элементы
const elements = {
    // Основные элементы
    currentDate: document.getElementById('current-date'),
    themeToggle: document.getElementById('theme-toggle'),
    filterBtn: document.getElementById('filter-btn'),
    addTaskBtn: document.getElementById('add-task-btn'),
    tasksList: document.getElementById('tasks-list'),
    archivedList: document.getElementById('archived-list'),
    archivedToggle: document.getElementById('archived-toggle'),
    
    // Навигация
    navBtns: document.querySelectorAll('.nav-btn'),
    
    // Статистика
    activeTasks: document.getElementById('active-tasks'),
    completedTasks: document.getElementById('completed-tasks'),
    totalTasksStat: document.getElementById('total-tasks-stat'),
    completionRate: document.getElementById('completion-rate'),
    productivityScore: document.getElementById('productivity-score'),
    streakDays: document.getElementById('streak-days'),
    refreshStats: document.getElementById('refresh-stats'),
    
    // Модальные окна
    taskModal: document.getElementById('task-modal'),
    filterModal: document.getElementById('filter-modal'),
    quickActionsMenu: document.getElementById('quick-actions-menu'),
    
    // Форма задачи
    taskForm: document.getElementById('task-form'),
    selectedCategory: document.getElementById('selected-category'),
    selectedEmoji: document.getElementById('selected-emoji'),
    selectedPriority: document.getElementById('selected-priority'),
    taskText: document.getElementById('task-text'),
    taskDateType: document.getElementById('task-date-type'),
    taskDate: document.getElementById('task-date'),
    taskHours: document.getElementById('task-hours'),
    taskMinutes: document.getElementById('task-minutes'),
    timeNowBtn: document.getElementById('time-now-btn'),
    submitBtn: document.getElementById('submit-btn'),
    
    // Уведомления
    successToast: document.getElementById('success-toast'),
    errorToast: document.getElementById('error-toast'),
    toastMessage: document.getElementById('toast-message'),
    errorMessage: document.getElementById('error-message'),
    loadingOverlay: document.getElementById('loading-overlay')
};

// Инициализация приложения
async function initApp() {
    console.log('🚀 Инициализация TaskFlow...');
    
    try {
        // Инициализация Telegram Web App
        tg.expand();
        tg.enableClosingConfirmation();
        tg.ready();
        
        // Получаем данные пользователя
        const userData = tg.initDataUnsafe?.user;
        currentUserId = userData?.id || `guest_${Date.now()}`;
        
        console.log('👤 Пользователь ID:', currentUserId);
        
        // Устанавливаем текущую дату
        updateCurrentDate();
        
        // Загружаем задачи пользователя
        await loadUserTasks();
        
        // Настраиваем обработчики событий
        setupEventListeners();
        
        // Инициализируем графики
        initCharts();
        
        console.log('✅ Приложение готово к работе!');
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError('Ошибка загрузки приложения');
    }
}

// Обновление текущей даты
function updateCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    elements.currentDate.textContent = now.toLocaleDateString('ru-RU', options);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Навигация
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            switchPage(page);
        });
    });
    
    // Переключение темы
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Кнопка фильтров
    elements.filterBtn.addEventListener('click', () => {
        elements.filterModal.style.display = 'flex';
    });
    
    // Кнопка добавления задачи (открытие меню)
    elements.addTaskBtn.addEventListener('click', toggleQuickActionsMenu);
    
    // Закрытие модальных окон
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) modal.style.display = 'none';
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
    
    // Быстрые действия из меню
    document.querySelectorAll('.quick-action-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            handleQuickAction(action);
        });
    });
    
    // Быстрые действия в форме
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.quick-action-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const type = e.currentTarget.dataset.type;
            prefillFormByType(type);
        });
    });
    
    // Выбор категории в форме
    document.querySelectorAll('.category-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.category-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            elements.selectedCategory.value = option.dataset.category;
            elements.selectedEmoji.value = option.dataset.emoji;
        });
    });
    
    // Выбор приоритета
    document.querySelectorAll('.priority-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.priority-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            elements.selectedPriority.value = option.dataset.priority;
        });
    });
    
    // Кнопка "Сейчас" для времени
    elements.timeNowBtn.addEventListener('click', setCurrentTime);
    
    // Выбор типа даты
    elements.taskDateType.addEventListener('change', handleDateTypeChange);
    
    // Архив выполненных
    elements.archivedToggle.addEventListener('click', toggleArchivedList);
    
    // Обновление статистики
    elements.refreshStats?.addEventListener('click', updateStats);
    
    // Фильтры
    document.querySelectorAll('.filter-option').forEach(option => {
        option.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.dataset.filter;
            elements.filterModal.style.display = 'none';
            filterTasks();
        });
    });
    
    // Отправка формы
    elements.taskForm.addEventListener('submit', handleTaskSubmit);
    
    // Клик вне меню быстрых действий
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.quick-actions-menu') && 
            !e.target.closest('.add-task-btn') &&
            elements.quickActionsMenu.style.display === 'block') {
            elements.quickActionsMenu.style.display = 'none';
            elements.addTaskBtn.classList.remove('plus-menu-open');
        }
    });
}

// Переключение страниц
function switchPage(page) {
    // Обновляем активные кнопки
    elements.navBtns.forEach(btn => {
        if (btn.dataset.page === page) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Показываем соответствующий контент
    document.querySelectorAll('.main-content > div').forEach(section => {
        section.style.display = 'none';
    });
    
    if (page === 'tasks') {
        document.getElementById('tasks-section').style.display = 'block';
    } else if (page === 'stats') {
        document.getElementById('stats-section').style.display = 'block';
        updateStats();
    }
}

// Переключение темы
function toggleTheme() {
    const icon = elements.themeToggle.querySelector('i');
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

// Инициализация темы из localStorage
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const icon = elements.themeToggle.querySelector('i');
    
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

// Переключение меню быстрых действий
function toggleQuickActionsMenu() {
    const isVisible = elements.quickActionsMenu.style.display === 'block';
    
    if (isVisible) {
        elements.quickActionsMenu.style.display = 'none';
        elements.addTaskBtn.classList.remove('plus-menu-open');
    } else {
        elements.quickActionsMenu.style.display = 'block';
        elements.addTaskBtn.classList.add('plus-menu-open');
    }
}

// Обработка быстрых действий
function handleQuickAction(action) {
    elements.quickActionsMenu.style.display = 'none';
    elements.addTaskBtn.classList.remove('plus-menu-open');
    
    switch (action) {
        case 'quick-task':
            openTaskForm({
                type: 'quick',
                category: 'personal',
                priority: 'normal',
                dateType: 'today'
            });
            break;
            
        case 'add-note':
            openTaskForm({
                type: 'note',
                category: 'personal',
                priority: 'low',
                dateType: 'specific',
                time: false
            });
            break;
            
        case 'add-reminder':
            openTaskForm({
                type: 'reminder',
                category: 'personal',
                priority: 'high',
                dateType: 'today',
                time: true
            });
            break;
    }
}

// Открытие формы задачи с предзаполнением
function openTaskForm(options = {}) {
    // Сброс формы
    elements.taskForm.reset();
    document.querySelectorAll('.category-option')[1].click(); // Личное по умолчанию
    document.querySelectorAll('.priority-option')[1].click(); // Обычная по умолчанию
    
    // Установка типа
    const type = options.type || 'task';
    document.querySelector(`.quick-action-btn[data-type="${type}"]`).click();
    
    // Установка категории
    if (options.category) {
        document.querySelector(`.category-option[data-category="${options.category}"]`).click();
    }
    
    // Установка приоритета
    if (options.priority) {
        document.querySelector(`.priority-option[data-priority="${options.priority}"]`).click();
    }
    
    // Установка даты
    if (options.dateType) {
        elements.taskDateType.value = options.dateType;
        handleDateTypeChange();
    }
    
    // Установка времени
    if (options.time === false) {
        elements.taskHours.value = '';
        elements.taskMinutes.value = '';
    } else if (options.time === true) {
        setCurrentTime();
    }
    
    // Фокус на тексте задачи
    elements.taskText.focus();
    
    // Показ модального окна
    elements.taskModal.style.display = 'flex';
}

// Предзаполнение формы по типу
function prefillFormByType(type) {
    switch (type) {
        case 'quick':
            elements.taskText.placeholder = 'Что нужно сделать быстро?';
            break;
        case 'note':
            elements.taskText.placeholder = 'Заметка для памяти...';
            break;
        case 'task':
            elements.taskText.placeholder = 'Что нужно сделать?';
            break;
    }
}

// Установка текущего времени
function setCurrentTime() {
    const now = new Date();
    elements.taskHours.value = now.getHours().toString().padStart(2, '0');
    elements.taskMinutes.value = now.getMinutes().toString().padStart(2, '0');
}

// Обработчик изменения типа даты
function handleDateTypeChange() {
    const type = elements.taskDateType.value;
    
    if (type === 'specific') {
        elements.taskDate.style.display = 'block';
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        elements.taskDate.min = new Date().toISOString().split('T')[0];
        elements.taskDate.value = tomorrow.toISOString().split('T')[0];
    } else {
        elements.taskDate.style.display = 'none';
    }
}

// Переключение списка архива
function toggleArchivedList() {
    const list = elements.archivedList;
    const icon = elements.archivedToggle.querySelector('.fa-chevron-down');
    
    if (list.classList.contains('expanded')) {
        list.classList.remove('expanded');
        icon.style.transform = 'rotate(0deg)';
    } else {
        list.classList.add('expanded');
        icon.style.transform = 'rotate(180deg)';
    }
}

// Загрузка задач пользователя
async function loadUserTasks() {
    try {
        showLoading(true);
        
        // Если есть userId из Telegram, запрашиваем задачи с сервера
        if (tg.initDataUnsafe?.user?.id) {
            const response = await fetch(`${BACKEND_URL}/api/tasks?user_id=${currentUserId}`);
            
            if (response.ok) {
                const data = await response.json();
                allTasks = data.tasks || [];
            } else {
                throw new Error('Ошибка загрузки задач');
            }
        } else {
            // Гостевой режим - загружаем из localStorage
            const savedTasks = localStorage.getItem(`tasks_${currentUserId}`);
            allTasks = savedTasks ? JSON.parse(savedTasks) : [];
        }
        
        // Разделяем задачи на активные и архивные
        archivedTasks = allTasks.filter(task => task.completed || task.archived);
        const activeTasks = allTasks.filter(task => !task.completed && !task.archived);
        
        // Сохраняем обновленный список
        allTasks = [...activeTasks, ...archivedTasks];
        saveTasksToStorage();
        
        // Рендерим задачи
        filterTasks();
        updateTaskCounters();
        
    } catch (error) {
        console.error('Ошибка загрузки задач:', error);
        
        // Демо-данные для тестирования
        if (allTasks.length === 0) {
            allTasks = [
                {
                    id: Date.now(),
                    emoji: '👤',
                    text: 'Добро пожаловать в TaskFlow!',
                    category: 'personal',
                    date: new Date().toISOString().split('T')[0],
                    time: '',
                    priority: 'normal',
                    completed: false,
                    archived: false,
                    created_at: new Date().toISOString()
                }
            ];
            filterTasks();
            updateTaskCounters();
        }
        
    } finally {
        showLoading(false);
    }
}

// Фильтрация задач
function filterTasks() {
    let filteredTasks = allTasks.filter(task => !task.completed && !task.archived);
    
    switch (currentFilter) {
        case 'today':
            const today = new Date().toISOString().split('T')[0];
            filteredTasks = filteredTasks.filter(task => task.date === today);
            break;
            
        case 'tomorrow':
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            filteredTasks = filteredTasks.filter(task => task.date === tomorrowStr);
            break;
            
        case 'week':
            const weekStart = new Date();
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() + 7);
            filteredTasks = filteredTasks.filter(task => {
                const taskDate = new Date(task.date);
                return taskDate >= weekStart && taskDate <= weekEnd;
            });
            break;
            
        case 'no-date':
            filteredTasks = filteredTasks.filter(task => !task.date || task.date === '');
            break;
            
        case 'high':
            filteredTasks = filteredTasks.filter(task => task.priority === 'high');
            break;
            
        case 'all':
        default:
            // Показываем все активные задачи
            break;
    }
    
    renderTasks(filteredTasks);
    renderArchivedTasks();
}

// Отображение задач
function renderTasks(tasks) {
    if (!tasks || tasks.length === 0) {
        elements.tasksList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>Нет задач</h3>
                <p>Добавьте первую задачу, нажав на плюсик</p>
            </div>
        `;
        return;
    }
    
    elements.tasksList.innerHTML = tasks.map(task => `
        <div class="task-item ${task.priority ? 'priority-' + task.priority : ''}" data-id="${task.id}">
            <div class="task-emoji">${task.emoji || '📝'}</div>
            <div class="task-content">
                <div class="task-text">${task.text}</div>
                <div class="task-meta">
                    ${task.date ? `<span class="task-date">${formatDate(task.date)}</span>` : ''}
                    ${task.time ? `<span class="task-time"><i class="far fa-clock"></i> ${task.time}</span>` : ''}
                    <span class="task-category">${getCategoryName(task.category)}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="task-btn complete-btn" onclick="completeTask('${task.id}')" title="Отметить выполненным">
                    <i class="fas fa-check"></i>
                </button>
                <button class="task-btn delete-btn" onclick="deleteTask('${task.id}')" title="Удалить задачу">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Отображение архивных задач
function renderArchivedTasks() {
    const archived = allTasks.filter(task => task.completed || task.archived);
    
    if (archived.length === 0) {
        elements.archivedList.innerHTML = `
            <div class="empty-state">
                <p>Архив пуст</p>
            </div>
        `;
        return;
    }
    
    elements.archivedList.innerHTML = archived.map(task => `
        <div class="archived-item" data-id="${task.id}">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div class="task-emoji">${task.emoji || '📝'}</div>
                <div style="flex: 1;">
                    <div class="task-text">${task.text}</div>
                    <div class="task-meta">
                        ${task.date ? `<span class="task-date">${formatDate(task.date)}</span>` : ''}
                    </div>
                </div>
                <button class="task-btn restore-btn" onclick="restoreTask('${task.id}')" title="Восстановить">
                    <i class="fas fa-redo"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Форматирование даты
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    if (dateString === today) return 'Сегодня';
    if (dateString === tomorrowStr) return 'Завтра';
    
    return date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'short' 
    });
}

// Получение названия категории
function getCategoryName(category) {
    const categories = {
        'work': 'Работа',
        'personal': 'Личное',
        'health': 'Здоровье',
        'study': 'Учёба'
    };
    return categories[category] || category;
}

// Обновление счетчиков задач
function updateTaskCounters() {
    const active = allTasks.filter(task => !task.completed && !task.archived).length;
    const completed = allTasks.filter(task => task.completed || task.archived).length;
    
    elements.activeTasks.textContent = active;
    elements.completedTasks.textContent = completed;
}

// Обработка отправки задачи
async function handleTaskSubmit(e) {
    e.preventDefault();
    
    // Собираем данные задачи
    const taskData = {
        user_id: currentUserId,
        emoji: elements.selectedEmoji.value,
        category: elements.selectedCategory.value,
        task_text: elements.taskText.value.trim(),
        priority: elements.selectedPriority.value
    };
    
    // Добавляем дату
    const dateType = elements.taskDateType.value;
    if (dateType === 'today') {
        taskData.date = new Date().toISOString().split('T')[0];
    } else if (dateType === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        taskData.date = tomorrow.toISOString().split('T')[0];
    } else if (dateType === 'specific') {
        taskData.date = elements.taskDate.value;
    }
    
    // Добавляем время, если указано
    if (elements.taskHours.value && elements.taskMinutes.value) {
        const hours = elements.taskHours.value.padStart(2, '0');
        const minutes = elements.taskMinutes.value.padStart(2, '0');
        taskData.time = `${hours}:${minutes}`;
    }
    
    // Валидация
    if (!taskData.task_text) {
        showError('Введите текст задачи');
        return;
    }
    
    try {
        showLoading(true);
        
        // Создаем ID задачи
        taskData.id = Date.now();
        taskData.completed = false;
        taskData.archived = false;
        taskData.created_at = new Date().toISOString();
        
        // Сохраняем задачу
        const saved = await saveTask(taskData);
        
        if (saved) {
            // Добавляем задачу в список
            allTasks.unshift(taskData);
            saveTasksToStorage();
            
            // Обновляем интерфейс
            filterTasks();
            updateTaskCounters();
            
            // Закрываем модальное окно
            elements.taskModal.style.display = 'none';
            
            // Показываем уведомление
            showSuccess('Задача успешно сохранена!');
            
            // Отправляем в Telegram, если пользователь авторизован
            if (tg.initDataUnsafe?.user) {
                tg.sendData(JSON.stringify({
                    action: 'task_created',
                    task: taskData.task_text
                }));
            }
        }
        
    } catch (error) {
        console.error('Ошибка при сохранении задачи:', error);
        showError('Ошибка при сохранении задачи');
        
    } finally {
        showLoading(false);
    }
}

// Сохранение задачи (локально или на сервер)
async function saveTask(taskData) {
    try {
        // Если пользователь авторизован в Telegram, отправляем на сервер
        if (tg.initDataUnsafe?.user?.id) {
            const response = await fetch(`${BACKEND_URL}/api/new_task`, {
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
        } else {
            // Гостевой режим - сохраняем локально
            return { success: true, task: taskData };
        }
        
    } catch (error) {
        // При ошибке сервера сохраняем локально
        console.warn('Сервер недоступен, сохраняем локально:', error);
        return { success: true, task: taskData };
    }
}

// Сохранение задач в хранилище
function saveTasksToStorage() {
    localStorage.setItem(`tasks_${currentUserId}`, JSON.stringify(allTasks));
}

// Инициализация графиков
function initCharts() {
    const categoryCtx = document.getElementById('categoryChart')?.getContext('2d');
    const weekdayCtx = document.getElementById('weekdayChart')?.getContext('2d');
    
    if (categoryCtx) {
        categoryChart = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#6366f1',
                        '#8b5cf6',
                        '#10b981',
                        '#f59e0b'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
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
                    backgroundColor: '#6366f1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Обновление статистики
function updateStats() {
    // Общие данные
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => task.completed || task.archived).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    elements.totalTasksStat.textContent = totalTasks;
    elements.completionRate.textContent = `${completionRate}%`;
    
    // Подсчет по категориям
    const categoryCount = {
        work: 0,
        personal: 0,
        health: 0,
        study: 0
    };
    
    allTasks.forEach(task => {
        if (categoryCount[task.category] !== undefined) {
            categoryCount[task.category]++;
        }
    });
    
    // Подсчет по дням недели
    const weekdayCount = [0, 0, 0, 0, 0, 0, 0];
    
    allTasks.forEach(task => {
        if (task.date) {
            const date = new Date(task.date);
            const day = date.getDay(); // 0 - воскресенье, 1 - понедельник
            const adjustedDay = day === 0 ? 6 : day - 1; // Преобразуем к 0-6, где 0 - понедельник
            weekdayCount[adjustedDay]++;
        }
    });
    
    // Обновляем графики
    if (categoryChart) {
        categoryChart.data.labels = ['Работа', 'Личное', 'Здоровье', 'Учёба'];
        categoryChart.data.datasets[0].data = [
            categoryCount.work,
            categoryCount.personal,
            categoryCount.health,
            categoryCount.study
        ];
        categoryChart.update();
    }
    
    if (weekdayChart) {
        weekdayChart.data.datasets[0].data = weekdayCount;
        weekdayChart.update();
    }
    
    // Продуктивность (простое вычисление)
    const productivity = Math.min(Math.round((completedTasks / Math.max(totalTasks, 1)) * 10), 10);
    elements.productivityScore.textContent = productivity;
    
    // Дни подряд (упрощенная логика)
    elements.streakDays.textContent = Math.min(Math.floor(completedTasks / 2), 30);
}

// Обновление темы графиков
function updateChartsTheme() {
    // При смене темы пересоздаем графики
    setTimeout(() => {
        if (categoryChart) categoryChart.destroy();
        if (weekdayChart) weekdayChart.destroy();
        initCharts();
        updateStats();
    }, 100);
}

// Глобальные функции для кнопок
window.completeTask = function(taskId) {
    const taskIndex = allTasks.findIndex(task => task.id == taskId);
    if (taskIndex !== -1) {
        allTasks[taskIndex].completed = true;
        saveTasksToStorage();
        filterTasks();
        updateTaskCounters();
        showSuccess('Задача выполнена!');
    }
};

window.deleteTask = function(taskId) {
    if (confirm('Удалить эту задачу?')) {
        allTasks = allTasks.filter(task => task.id != taskId);
        saveTasksToStorage();
        filterTasks();
        updateTaskCounters();
        showSuccess('Задача удалена!');
    }
};

window.restoreTask = function(taskId) {
    const taskIndex = allTasks.findIndex(task => task.id == taskId);
    if (taskIndex !== -1) {
        allTasks[taskIndex].completed = false;
        allTasks[taskIndex].archived = false;
        saveTasksToStorage();
        filterTasks();
        updateTaskCounters();
        showSuccess('Задача восстановлена!');
    }
};

// Вспомогательные функции
function showLoading(show) {
    elements.loadingOverlay.style.display = show ? 'flex' : 'none';
}

function showSuccess(message) {
    elements.toastMessage.textContent = message;
    elements.successToast.classList.add('show');
    
    setTimeout(() => {
        elements.successToast.classList.remove('show');
    }, 3000);
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorToast.classList.add('show');
    
    setTimeout(() => {
        elements.errorToast.classList.remove('show');
    }, 3000);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initApp();
});

// Обработчик кнопки "Назад" в Telegram
tg.BackButton.onClick(() => {
    if (elements.taskModal.style.display === 'flex') {
        elements.taskModal.style.display = 'none';
        tg.BackButton.hide();
    } else if (elements.filterModal.style.display === 'flex') {
        elements.filterModal.style.display = 'none';
        tg.BackButton.hide();
    } else if (elements.quickActionsMenu.style.display === 'block') {
        elements.quickActionsMenu.style.display = 'none';
        elements.addTaskBtn.classList.remove('plus-menu-open');
        tg.BackButton.hide();
    }
});

// Показываем кнопку "Назад" при открытии модальных окон
elements.addTaskBtn.addEventListener('click', () => {
    tg.BackButton.show();
});

elements.filterBtn.addEventListener('click', () => {
    tg.BackButton.show();
});

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        tg.BackButton.hide();
    });
});

// Скрываем кнопку "Назад" при закрытии меню быстрых действий
document.addEventListener('click', (e) => {
    if (e.target === elements.quickActionsMenu || 
        e.target.closest('.quick-actions-menu') ||
        !elements.quickActionsMenu.contains(e.target)) {
        tg.BackButton.hide();
    }
});
