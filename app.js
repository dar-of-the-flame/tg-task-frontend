// Telegram Web App инициализация
const tg = window.Telegram.WebApp;
let userId = null;
let userData = null;

// DOM элементы
const elements = {
    taskForm: document.getElementById('task-form'),
    taskModal: document.getElementById('task-modal'),
    addTaskBtn: document.getElementById('add-task-btn'),
    tasksList: document.getElementById('tasks-list'),
    emojiOptions: document.querySelectorAll('.emoji-option'),
    selectedEmoji: document.getElementById('selected-emoji'),
    taskText: document.getElementById('task-text'),
    startTime: document.getElementById('start-time'),
    endTime: document.getElementById('end-time'),
    reminder: document.getElementById('reminder'),
    closeModalBtns: document.querySelectorAll('.close-modal'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    successToast: document.getElementById('success-toast')
};

// Бэкенд URL
const BACKEND_URL = 'https://tg-task-bot-service.onrender.com';

// Инициализация приложения
function initApp() {
    console.log('Инициализация TaskFlow Web App...');
    
    // Инициализация Telegram Web App
    tg.expand();
    tg.enableClosingConfirmation();
    
    // Получаем данные пользователя
    userData = tg.initDataUnsafe?.user;
    userId = userData?.id;
    
    if (userId) {
        console.log('Пользователь авторизован:', userData);
        updateUserInfo();
    } else {
        console.log('Пользователь не авторизован');
        showError('Требуется авторизация в Telegram');
    }
    
    // Устанавливаем текущее время по умолчанию
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    
    elements.startTime.value = formatTime(now);
    elements.endTime.value = formatTime(nextHour);
    
    // Загружаем задачи пользователя
    loadUserTasks();
    
    setupEventListeners();
    
    console.log('Приложение инициализировано');
}

// Обновление информации о пользователе
function updateUserInfo() {
    if (userData) {
        const avatar = document.querySelector('.user-info .avatar');
        if (avatar) {
            if (userData.photo_url) {
                avatar.innerHTML = `<img src="${userData.photo_url}" alt="${userData.first_name}" style="width:100%;height:100%;border-radius:50%;">`;
            } else {
                avatar.innerHTML = `<i class="fas fa-user"></i>`;
                avatar.style.background = getRandomGradient();
            }
        }
    }
}

// Генерация случайного градиента
function getRandomGradient() {
    const gradients = [
        'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
}

// Форматирование времени
function formatTime(date) {
    return date.toTimeString().slice(0, 5);
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
        btn.addEventListener('click', () => {
            elements.taskModal.style.display = 'none';
            elements.taskForm.reset();
        });
    });
    
    // Клик вне модального окна
    elements.taskModal.addEventListener('click', (e) => {
        if (e.target === elements.taskModal) {
            elements.taskModal.style.display = 'none';
            elements.taskForm.reset();
        }
    });
    
    // Выбор эмодзи
    elements.emojiOptions.forEach(option => {
        option.addEventListener('click', () => {
            elements.emojiOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            elements.selectedEmoji.value = option.dataset.emoji;
        });
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
            filterTasks(btn.dataset.filter);
        });
    });
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
    
    if (!userId) {
        showError('Пользователь не авторизован');
        return;
    }
    
    const taskData = {
        user_id: userId,
        emoji: elements.selectedEmoji.value,
        task_text: elements.taskText.value.trim(),
        start_time: formatDateTime(elements.startTime.value),
        end_time: formatDateTime(elements.endTime.value),
        remind_in_minutes: parseInt(elements.reminder.value)
    };
    
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
        elements.taskModal.style.display = 'none';
        elements.taskForm.reset();
        
        // Обновляем список задач
        loadUserTasks();
        
        // Отправляем сообщение в Telegram
        tg.sendData(JSON.stringify({
            action: 'task_created',
            task: taskData.task_text
        }));
        
    } catch (error) {
        console.error('Ошибка при сохранении задачи:', error);
        showError('Ошибка при сохранении задачи. Попробуйте еще раз.');
    } finally {
        // Восстанавливаем кнопку
        const submitBtn = elements.taskForm.querySelector('.btn-primary');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Форматирование даты и времени для API
function formatDateTime(timeString) {
    const now = new Date();
    const [hours, minutes] = timeString.split(':');
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    return date.toISOString();
}

// Загрузка задач пользователя
async function loadUserTasks() {
    if (!userId) return;
    
    try {
        // В реальном приложении здесь был бы запрос к API
        // Для демо показываем примерные задачи
        const demoTasks = [
            {
                id: 1,
                emoji: '🏃‍♀️',
                text: 'Тренировка в спортзале',
                time: '19:30-20:00',
                completed: false
            },
            {
                id: 2,
                emoji: '📚',
                text: 'Читать книгу "Atomic Habits"',
                time: '21:00-22:00',
                completed: true
            },
            {
                id: 3,
                emoji: '💼',
                text: 'Подготовить отчет по проекту',
                time: 'Завтра, 10:00',
                completed: false
            }
        ];
        
        renderTasks(demoTasks);
        
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
                <h3>Нет задач на выбранный период</h3>
                <p>Добавьте первую задачу, нажав на кнопку ниже</p>
            </div>
        `;
        return;
    }
    
    elements.tasksList.innerHTML = tasks.map(task => `
        <div class="task-item" data-id="${task.id}">
            <div class="task-emoji">${task.emoji}</div>
            <div class="task-content">
                <div class="task-text">${task.text}</div>
                <div class="task-time">
                    <i class="far fa-clock"></i>
                    ${task.time}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-btn complete-btn" onclick="toggleTaskComplete(${task.id})" title="Отметить выполненным">
                    <i class="fas ${task.completed ? 'fa-redo' : 'fa-check'}"></i>
                </button>
                <button class="task-btn delete-btn" onclick="deleteTask(${task.id})" title="Удалить задачу">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    // Обновляем счетчик задач
    const taskCount = document.querySelector('.task-count');
    if (taskCount) {
        taskCount.textContent = `${tasks.length} ${getTaskWord(tasks.length)}`;
    }
}

// Функции для работы с задачами (демо)
window.toggleTaskComplete = function(taskId) {
    const task = document.querySelector(`.task-item[data-id="${taskId}"]`);
    if (task) {
        const btn = task.querySelector('.complete-btn');
        const icon = btn.querySelector('i');
        
        if (icon.classList.contains('fa-check')) {
            icon.classList.remove('fa-check');
            icon.classList.add('fa-redo');
            task.style.opacity = '0.7';
            showSuccess('Задача отмечена как выполненная!');
        } else {
            icon.classList.remove('fa-redo');
            icon.classList.add('fa-check');
            task.style.opacity = '1';
            showSuccess('Задача возвращена в работу!');
        }
    }
};

window.deleteTask = function(taskId) {
    if (confirm('Удалить эту задачу?')) {
        const task = document.querySelector(`.task-item[data-id="${taskId}"]`);
        if (task) {
            task.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                task.remove();
                showSuccess('Задача удалена!');
                // Обновляем счетчик
                const remainingTasks = document.querySelectorAll('.task-item').length;
                const taskCount = document.querySelector('.task-count');
                if (taskCount) {
                    taskCount.textContent = `${remainingTasks} ${getTaskWord(remainingTasks)}`;
                }
            }, 300);
        }
    }
};

// Фильтрация задач
function filterTasks(filter) {
    console.log('Фильтрация задач по:', filter);
    // В реальном приложении здесь была бы фильтрация через API
    // Для демо просто показываем сообщение
    const messages = {
        'today': 'Показываю задачи на сегодня',
        'tomorrow': 'Показываю задачи на завтра',
        'week': 'Показываю задачи на неделю',
        'all': 'Показываю все задачи',
        'no-time': 'Показываю задачи без времени'
    };
    
    if (messages[filter]) {
        showSuccess(messages[filter]);
    }
}

// Вспомогательные функции
function getTaskWord(count) {
    if (count % 10 === 1 && count % 100 !== 11) return 'задача';
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'задачи';
    return 'задач';
}

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
    alert(`❌ ${message}`);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initApp);

// Добавляем обработчик для кнопки "Назад" в Telegram
tg.BackButton.onClick(() => {
    if (elements.taskModal.style.display === 'flex') {
        elements.taskModal.style.display = 'none';
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
