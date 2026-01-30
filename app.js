// Telegram Web App инициализация
const tg = window.Telegram.WebApp;

// Бэкенд URL
const BACKEND_URL = 'https://tg-task-bot-service.onrender.com';

// Глобальные переменные
let currentUserId = null;
let currentTasks = [];
let currentCategory = 'all';
let currentFilter = 'today';

// DOM элементы
const elements = {
    taskForm: document.getElementById('task-form'),
    taskModal: document.getElementById('task-modal'),
    addTaskBtn: document.getElementById('add-task-btn'),
    tasksList: document.getElementById('tasks-list'),
    currentDate: document.getElementById('current-date'),
    quickActions: document.getElementById('quick-actions'),
    themeToggle: document.getElementById('theme-toggle'),
    clearCompleted: document.getElementById('clear-completed'),
    
    // Форма задачи
    selectedCategory: document.getElementById('selected-category'),
    selectedEmoji: document.getElementById('selected-emoji'),
    selectedPriority: document.getElementById('selected-priority'),
    taskText: document.getElementById('task-text'),
    taskDate: document.getElementById('task-date'),
    startHours: document.getElementById('start-hours'),
    startMinutes: document.getElementById('start-minutes'),
    endHours: document.getElementById('end-hours'),
    endMinutes: document.getElementById('end-minutes'),
    reminder: document.getElementById('reminder'),
    clearTimeBtn: document.getElementById('clear-time'),
    
    // Навигация
    tabBtns: document.querySelectorAll('.tab-btn'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    categoryBtns: document.querySelectorAll('.category-btn'),
    closeModalBtns: document.querySelectorAll('.close-modal'),
    
    // Уведомления
    successToast: document.getElementById('success-toast')
};

// Инициализация приложения
function initApp() {
    console.log('🚀 Инициализация TaskFlow...');
    
    // Инициализация Telegram Web App
    tg.expand();
    tg.enableClosingConfirmation();
    
    // Получаем данные пользователя из Telegram
    const userData = tg.initDataUnsafe?.user;
    currentUserId = userData?.id || `guest_${Date.now()}`;
    
    console.log('👤 Пользователь:', userData ? userData.first_name : 'Гость');
    console.log('🆔 User ID:', currentUserId);
    
    // Устанавливаем текущую дату
    updateCurrentDate();
    
    // Устанавливаем минимальную дату в форме
    const today = new Date().toISOString().split('T')[0];
    elements.taskDate.value = today;
    elements.taskDate.min = today;
    
    // Загружаем задачи пользователя
    loadUserTasks();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Инициализируем календарь
    initCalendar();
    
    console.log('✅ Приложение готово к работе!');
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
    // Открытие модального окна
    elements.addTaskBtn.addEventListener('click', () => {
        elements.taskModal.style.display = 'flex';
        elements.taskText.focus();
    });
    
    // Закрытие модального окна
    elements.closeModalBtns.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    // Клик вне модального окна
    elements.taskModal.addEventListener('click', (e) => {
        if (e.target === elements.taskModal) {
            closeModal();
        }
    });
    
    // Выбор категории в форме
    document.querySelectorAll('.category-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.category-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
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
    
    // Очистка времени
    elements.clearTimeBtn.addEventListener('click', () => {
        elements.startHours.value = '';
        elements.startMinutes.value = '';
        elements.endHours.value = '';
        elements.endMinutes.value = '';
    });
    
    // Отправка формы
    elements.taskForm.addEventListener('submit', handleTaskSubmit);
    
    // Переключение вкладок
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            switchTab(tabId);
        });
    });
    
    // Фильтры по времени
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            filterTasks();
        });
    });
    
    // Фильтры по категориям
    elements.categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            filterTasks();
        });
    });
    
    // Очистка выполненных задач
    elements.clearCompleted.addEventListener('click', clearCompletedTasks);
    
    // Переключение темы
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Quick actions
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            handleQuickAction(action);
        });
    });
    
    // Формат времени (12/24 часа)
    document.querySelectorAll('.time-format-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const timeType = e.currentTarget.dataset.time;
            const format = e.currentTarget.dataset.format;
            
            // Снимаем активность со всех кнопок этой группы
            e.currentTarget.parentNode.querySelectorAll('.time-format-btn').forEach(b => {
                b.classList.remove('active');
            });
            e.currentTarget.classList.add('active');
            
            convertTimeFormat(timeType, format);
        });
    });
}

// Закрытие модального окна
function closeModal() {
    elements.taskModal.style.display = 'none';
    elements.taskForm.reset();
    document.querySelectorAll('.category-option')[0].click(); // Сбрасываем на первую категорию
    document.querySelectorAll('.priority-option')[1].click(); // Сбрасываем на средний приоритет
}

// Переключение вкладок
function switchTab(tabId) {
    // Обновляем активные кнопки
    elements.tabBtns.forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Показываем соответствующий контент
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === `${tabId}-tab`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
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
        date: elements.taskDate.value,
        priority: elements.selectedPriority.value,
        remind_in_minutes: parseInt(elements.reminder.value)
    };
    
    // Добавляем время, если указано
    if (elements.startHours.value && elements.startMinutes.value) {
        taskData.start_time = formatTimeString(
            elements.startHours.value,
            elements.startMinutes.value
        );
    }
    
    if (elements.endHours.value && elements.endMinutes.value) {
        taskData.end_time = formatTimeString(
            elements.endHours.value,
            elements.endMinutes.value
        );
    }
    
    // Валидация
    if (!taskData.task_text) {
        showError('Введите текст задачи');
        return;
    }
    
    try {
        // Показываем индикатор загрузки
        const submitBtn = elements.taskForm.querySelector('.btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
        submitBtn.disabled = true;
        
        // Отправляем на бэкенд
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
        
        const result = await response.json();
        
        // Показываем уведомление об успехе
        showSuccess('Задача успешно сохранена!');
        
        // Закрываем модальное окно
        closeModal();
        
        // Обновляем список задач
        loadUserTasks();
        
        // Отправляем сообщение в Telegram (если пользователь авторизован)
        if (tg.initDataUnsafe?.user) {
            tg.sendData(JSON.stringify({
                action: 'task_created',
                task: taskData.task_text
            }));
        }
        
    } catch (error) {
        console.error('Ошибка при сохранении задачи:', error);
        showError('Ошибка при сохранении задачи. Попробуйте еще раз.');
    } finally {
        // Восстанавливаем кнопку
        const submitBtn = elements.taskForm.querySelector('.btn-primary');
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

// Форматирование времени в строку HH:MM
function formatTimeString(hours, minutes) {
    const h = hours.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    return `${h}:${m}`;
}

// Конвертация формата времени
function convertTimeFormat(timeType, format) {
    const hoursField = timeType === 'start' ? elements.startHours : elements.endHours;
    const minutesField = timeType === 'start' ? elements.startMinutes : elements.endMinutes;
    
    let hours = parseInt(hoursField.value) || 0;
    let minutes = parseInt(minutesField.value) || 0;
    
    if (format === '12') {
        // Конвертируем в 12-часовой формат
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        
        // Показываем подсказку
        hoursField.placeholder = hours;
        minutesField.placeholder = minutes.toString().padStart(2, '0');
        
        // Добавляем индикатор периода
        const timeGroup = hoursField.closest('.time-input-group');
        let periodIndicator = timeGroup.querySelector('.period-indicator');
        
        if (!periodIndicator) {
            periodIndicator = document.createElement('div');
            periodIndicator.className = 'period-indicator';
            timeGroup.querySelector('.time-input-wrapper').appendChild(periodIndicator);
        }
        
        periodIndicator.textContent = period;
        periodIndicator.style.marginLeft = '0.5rem';
        periodIndicator.style.fontWeight = 'bold';
        periodIndicator.style.color = 'var(--primary)';
    } else {
        // Конвертируем в 24-часовой формат
        hoursField.placeholder = '00';
        minutesField.placeholder = '00';
        
        // Убираем индикатор периода
        const periodIndicator = hoursField.closest('.time-input-group').querySelector('.period-indicator');
        if (periodIndicator) {
            periodIndicator.remove();
        }
    }
}

// Загрузка задач пользователя
async function loadUserTasks() {
    try {
        // Здесь должен быть запрос к API для получения задач пользователя
        // Пока используем демо-данные
        
        const demoTasks = [
            {
                id: 1,
                emoji: '💼',
                text: 'Завершить проект TaskFlow',
                category: 'work',
                date: new Date().toISOString().split('T')[0],
                time: '19:30-20:30',
                priority: 'high',
                completed: false,
                created_at: new Date().toISOString()
            },
            {
                id: 2,
                emoji: '❤️',
                text: 'Тренировка в спортзале',
                category: 'health',
                date: new Date().toISOString().split('T')[0],
                time: '21:00-22:00',
                priority: 'medium',
                completed: false,
                created_at: new Date().toISOString()
            },
            {
                id: 3,
                emoji: '📚',
                text: 'Прочитать главу книги',
                category: 'study',
                date: new Date().toISOString().split('T')[0],
                time: '',
                priority: 'low',
                completed: true,
                created_at: new Date().toISOString()
            }
        ];
        
        currentTasks = demoTasks;
        renderTasks(currentTasks);
        updateStats();
        
    } catch (error) {
        console.error('Ошибка при загрузке задач:', error);
        showError('Не удалось загрузить задачи');
    }
}

// Отображение задач
function renderTasks(tasks) {
    if (!tasks || tasks.length === 0) {
        elements.tasksList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>Нет задач</h3>
                <p>Добавьте первую задачу, нажав на кнопку ниже</p>
            </div>
        `;
        return;
    }
    
    elements.tasksList.innerHTML = tasks.map(task => `
        <div class="task-item ${task.priority} ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="task-emoji">${task.emoji}</div>
            <div class="task-content">
                <div class="task-text">${task.text}</div>
                ${task.time ? `<div class="task-time"><i class="far fa-clock"></i> ${task.time}</div>` : ''}
                <div class="task-date">${formatDate(task.date)}</div>
            </div>
            <div class="task-category">
                ${getCategoryName(task.category)}
            </div>
            ${task.priority !== 'medium' ? `<div class="task-priority">${getPriorityName(task.priority)}</div>` : ''}
            <div class="task-actions">
                <button class="task-btn complete-btn" onclick="toggleTaskComplete(${task.id})" title="${task.completed ? 'Вернуть в работу' : 'Отметить выполненным'}">
                    <i class="fas ${task.completed ? 'fa-redo' : 'fa-check'}"></i>
                </button>
                <button class="task-btn delete-btn" onclick="deleteTask(${task.id})" title="Удалить задачу">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Фильтрация задач
function filterTasks() {
    let filteredTasks = [...currentTasks];
    
    // Фильтр по категории
    if (currentCategory !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.category === currentCategory);
    }
    
    // Фильтр по времени
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    switch (currentFilter) {
        case 'today':
            filteredTasks = filteredTasks.filter(task => task.date === today);
            break;
        case 'tomorrow':
            filteredTasks = filteredTasks.filter(task => task.date === tomorrow);
            break;
        case 'week':
            const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            filteredTasks = filteredTasks.filter(task => {
                const taskDate = new Date(task.date);
                return taskDate >= now && taskDate <= weekLater;
            });
            break;
        case 'no-time':
            filteredTasks = filteredTasks.filter(task => !task.time);
            break;
        // 'all' - все задачи, фильтрация не нужна
    }
    
    renderTasks(filteredTasks);
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    if (dateString === today) return 'Сегодня';
    if (dateString === tomorrow) return 'Завтра';
    
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

// Получение названия приоритета
function getPriorityName(priority) {
    const priorities = {
        'low': 'Низкий',
        'medium': 'Средний',
        'high': 'Высокий'
    };
    return priorities[priority] || priority;
}

// Обновление статистики
function updateStats() {
    const totalTasks = currentTasks.length;
    const completedTasks = currentTasks.filter(task => task.completed).length;
    const productivity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    document.getElementById('total-tasks').textContent = totalTasks;
    document.getElementById('completed-tasks').textContent = completedTasks;
    document.getElementById('productivity').textContent = `${productivity}%`;
    
    // Дней подряд (демо)
    document.getElementById('streak-days').textContent = Math.floor(Math.random() * 30) + 1;
}

// Инициализация календаря
function initCalendar() {
    const calendar = document.getElementById('calendar');
    const currentMonth = document.getElementById('current-month');
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();
    
    currentMonth.textContent = now.toLocaleDateString('ru-RU', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    // Генерация календаря
    const firstDay = new Date(currentYear, currentMonthIndex, 1);
    const lastDay = new Date(currentYear, currentMonthIndex + 1, 0);
    
    let calendarHTML = '';
    
    // Дни недели
    const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    weekdays.forEach(day => {
        calendarHTML += `<div class="calendar-day weekday">${day}</div>`;
    });
    
    // Пустые дни до первого числа месяца
    const firstDayOfWeek = firstDay.getDay() || 7;
    for (let i = 1; i < firstDayOfWeek; i++) {
        calendarHTML += `<div class="calendar-day empty"></div>`;
    }
    
    // Дни месяца
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(currentYear, currentMonthIndex, day);
        const isToday = day === now.getDate() && currentMonthIndex === now.getMonth();
        const hasTasks = currentTasks.some(task => {
            const taskDate = new Date(task.date);
            return taskDate.getDate() === day && 
                   taskDate.getMonth() === currentMonthIndex && 
                   taskDate.getFullYear() === currentYear;
        });
        
        let className = 'calendar-day';
        if (isToday) className += ' today';
        if (hasTasks) className += ' has-tasks';
        
        calendarHTML += `<div class="${className}" data-date="${date.toISOString().split('T')[0]}">${day}</div>`;
    }
    
    calendar.innerHTML = calendarHTML;
    
    // Обработчики кликов по дням
    calendar.querySelectorAll('.calendar-day:not(.weekday):not(.empty)').forEach(day => {
        day.addEventListener('click', () => {
            const selectedDate = day.dataset.date;
            // Переключаемся на вкладку задач и фильтруем по дате
            switchTab('tasks');
            // Здесь можно добавить фильтрацию по выбранной дате
            showSuccess(`Показаны задачи на ${selectedDate}`);
        });
    });
}

// Быстрые действия
function handleQuickAction(action) {
    switch (action) {
        case 'quick-task':
            // Открываем форму с предзаполненными данными
            elements.taskModal.style.display = 'flex';
            elements.taskText.placeholder = 'Быстрая задача...';
            elements.taskText.focus();
            break;
            
        case 'add-note':
            // Создаём задачу без времени
            elements.taskModal.style.display = 'flex';
            elements.taskText.placeholder = 'Заметка...';
            elements.clearTimeBtn.click();
            elements.taskText.focus();
            break;
            
        case 'add-reminder':
            // Создаём задачу с напоминанием
            elements.taskModal.style.display = 'flex';
            elements.taskText.placeholder = 'Напоминание...';
            elements.reminder.value = '15';
            elements.taskText.focus();
            break;
    }
}

// Переключение темы
function toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    const icon = elements.themeToggle.querySelector('i');
    
    if (isDark) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
}

// Очистка выполненных задач
function clearCompletedTasks() {
    if (confirm('Удалить все выполненные задачи?')) {
        currentTasks = currentTasks.filter(task => !task.completed);
        renderTasks(currentTasks);
        updateStats();
        showSuccess('Выполненные задачи удалены');
    }
}

// Глобальные функции для кнопок
window.toggleTaskComplete = function(taskId) {
    const taskIndex = currentTasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
        currentTasks[taskIndex].completed = !currentTasks[taskIndex].completed;
        renderTasks(currentTasks);
        updateStats();
        
        showSuccess(currentTasks[taskIndex].completed ? 
            'Задача отмечена как выполненная!' : 
            'Задача возвращена в работу!');
    }
};

window.deleteTask = function(taskId) {
    if (confirm('Удалить эту задачу?')) {
        currentTasks = currentTasks.filter(task => task.id !== taskId);
        renderTasks(currentTasks);
        updateStats();
        showSuccess('Задача удалена!');
    }
};

// Вспомогательные функции
function showSuccess(message) {
    const toast = elements.successToast;
    const text = toast.querySelector('span');
    
    text.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showError(message) {
    // Простое уведомление об ошибке
    alert(`❌ ${message}`);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initApp);

// Обработчик кнопки "Назад" в Telegram
tg.BackButton.onClick(() => {
    if (elements.taskModal.style.display === 'flex') {
        closeModal();
        tg.BackButton.hide();
    }
});

// Показываем кнопку "Назад" при открытии модального окна
elements.addTaskBtn.addEventListener('click', () => {
    tg.BackButton.show();
});

elements.closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tg.BackButton.hide();
    });
});
