// calendar.js - исправленная версия
class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        // Используем локальную дату для выбранной даты
        const now = new Date();
        this.selectedDate = this.formatDateForInput(now);
    }
    
    // Форматирование даты для input[type="date"]
    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Форматирование даты для отображения
    formatDateDisplay(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Приводим к одному формату для сравнения
        const dateFormatted = this.formatDateForInput(date);
        const todayFormatted = this.formatDateForInput(today);
        const tomorrowFormatted = this.formatDateForInput(tomorrow);
        
        if (dateFormatted === todayFormatted) {
            return 'Сегодня';
        }
        if (dateFormatted === tomorrowFormatted) {
            return 'Завтра';
        }
        
        return date.toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    }
    
    init() {
        this.renderCalendar();
        this.updateDayTasks();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Кнопка "Сегодня"
        const todayBtn = document.getElementById('today-btn');
        if (todayBtn) {
            todayBtn.addEventListener('click', () => this.goToToday());
        }
        
        // Навигация по месяцам
        document.getElementById('prev-month')?.addEventListener('click', () => this.prevMonth());
        document.getElementById('next-month')?.addEventListener('click', () => this.nextMonth());
        
        // Переключение вида
        const viewToggle = document.getElementById('calendar-view-toggle');
        if (viewToggle) {
            viewToggle.addEventListener('click', () => this.toggleView());
        }
    }
    
    goToToday() {
        const now = new Date();
        this.currentDate = new Date();
        this.selectedDate = this.formatDateForInput(now);
        this.renderCalendar();
        this.updateDayTasks();
        
        // Прокручиваем к сегодняшнему дню
        const todayCell = document.querySelector('.calendar-day.today');
        if (todayCell) {
            todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    toggleView() {
        const grid = document.getElementById('calendar-grid');
        if (grid) {
            grid.classList.toggle('week-view');
        }
    }
    
    renderCalendar() {
        const container = document.getElementById('calendar-grid');
        const monthElement = document.getElementById('current-month');
        
        if (!container || !monthElement) return;
        
        // Очищаем контейнер
        container.innerHTML = '';
        
        // Заголовок месяца
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                          'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const monthYear = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        monthElement.textContent = monthYear;
        
        // Дни недели
        const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        weekdays.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day weekday';
            dayElement.textContent = day;
            container.appendChild(dayElement);
        });
        
        // Первый день месяца
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Определяем день недели для первого дня (0 - воскресенье, 1 - понедельник и т.д.)
        let firstDayOfWeek = firstDay.getDay();
        // Преобразуем к нашей системе (понедельник = 0)
        firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
        
        // Сегодняшняя дата
        const today = new Date();
        const todayFormatted = this.formatDateForInput(today);
        
        // Выбранная дата
        const selectedFormatted = this.selectedDate;
        
        // Пустые ячейки до первого дня
        for (let i = 0; i < firstDayOfWeek; i++) {
            container.appendChild(this.createEmptyDay());
        }
        
        // Дни месяца
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, month, day);
            const dateStr = this.formatDateForInput(date);
            
            container.appendChild(this.createDayElement(day, dateStr, todayFormatted, selectedFormatted));
        }
    }
    
    createDayElement(dayNumber, dateStr, todayStr, selectedStr) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.dataset.date = dateStr;
        
        // Сегодня
        if (dateStr === todayStr) {
            dayElement.classList.add('today');
        }
        
        // Выбранный день
        if (dateStr === selectedStr) {
            dayElement.classList.add('selected');
        }
        
        // Задачи на этот день
        const hasTasks = taskFlow.allTasks.some(task => {
            if (!task.date) return false;
            // Форматируем дату задачи для сравнения
            let taskDate = task.date;
            if (taskDate.includes('T')) {
                taskDate = taskDate.split('T')[0];
            }
            return taskDate === dateStr && !task.completed && !task.archived;
        });
        
        if (hasTasks) {
            dayElement.classList.add('has-tasks');
        }
        
        dayElement.innerHTML = `
            <div class="day-number">${dayNumber}</div>
            ${hasTasks ? '<div class="day-dot"></div>' : ''}
        `;
        
        dayElement.addEventListener('click', () => {
            this.selectDate(dateStr);
        });
        
        return dayElement;
    }
    
    createEmptyDay() {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        return emptyDay;
    }
    
    selectDate(dateStr) {
        this.selectedDate = dateStr;
        this.renderCalendar();
        this.updateDayTasks();
        
        // Открываем форму с выбранной датой
        const dateInput = document.getElementById('task-date');
        if (dateInput) {
            dateInput.value = dateStr;
        }
    }
    
    updateDayTasks() {
        const container = document.getElementById('day-tasks-list');
        const dateElement = document.getElementById('selected-date');
        
        if (!container || !dateElement) return;
        
        // Форматируем дату для отображения
        const displayDate = this.formatDateDisplay(this.selectedDate);
        dateElement.textContent = displayDate;
        
        // Находим задачи на выбранный день
        const dayTasks = taskFlow.allTasks.filter(task => {
            if (!task.date) return false;
            let taskDate = task.date;
            if (taskDate.includes('T')) {
                taskDate = taskDate.split('T')[0];
            }
            return taskDate === this.selectedDate && !task.completed && !task.archived;
        });
        
        if (dayTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="far fa-calendar-check"></i>
                    <p>Нет задач на этот день</p>
                    <button class="btn btn-outline" onclick="calendarManager.addTaskToDate()">
                        <i class="fas fa-plus"></i> Добавить задачу
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = dayTasks.map(task => `
            <div class="day-task">
                <div class="day-task-content">
                    <div class="day-task-title">
                        <span class="task-emoji">${task.emoji || '📝'}</span>
                        ${task.text}
                        ${task.is_reminder ? '<i class="fas fa-bell" style="color: #f59e0b; margin-left: 5px;"></i>' : ''}
                    </div>
                    ${task.time ? `
                        <div class="day-task-time">
                            <i class="far fa-clock"></i>
                            ${task.time}
                        </div>
                    ` : ''}
                </div>
                <div class="day-task-actions">
                    ${task.is_reminder ? '' : `
                        <button class="task-btn complete" onclick="taskManager.toggleComplete('${task.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                    `}
                </div>
            </div>
        `).join('');
    }
    
    addTaskToDate() {
        const dateInput = document.getElementById('task-date');
        if (dateInput) {
            dateInput.value = this.selectedDate;
        }
        
        // Открываем форму
        if (typeof openTaskForm === 'function') {
            openTaskForm({ type: 'task' });
        }
    }
    
    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    }
    
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    }
}

const calendarManager = new CalendarManager();
window.calendarManager = calendarManager;
