// calendar.js - исправляем календарь
class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = new Date().toISOString().split('T')[0];
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
        this.currentDate = new Date();
        this.selectedDate = this.currentDate.toISOString().split('T')[0];
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
        monthElement.textContent = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        
        // Дни недели
        const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        weekdays.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day weekday';
            dayElement.textContent = day;
            container.appendChild(dayElement);
        });
        
        // Первый день месяца
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const today = new Date().toISOString().split('T')[0];
        
        // Пустые ячейки до первого дня
        const firstDayOfWeek = firstDay.getDay() || 7; // Воскресенье = 0 -> 7
        for (let i = 1; i < firstDayOfWeek; i++) {
            container.appendChild(this.createEmptyDay());
        }
        
        // Дни месяца
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
            const dateStr = date.toISOString().split('T')[0];
            
            container.appendChild(this.createDayElement(day, dateStr, today));
        }
    }
    
    createDayElement(dayNumber, dateStr, today) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.dataset.date = dateStr;
        
        // Сегодня
        if (dateStr === today) {
            dayElement.classList.add('today');
        }
        
        // Выбранный день
        if (dateStr === this.selectedDate) {
            dayElement.classList.add('selected');
        }
        
        // Задачи на этот день
        const hasTasks = taskFlow.allTasks.some(task => 
            task.date === dateStr && !task.completed
        );
        
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
        
        // Форматируем дату
        const date = new Date(this.selectedDate);
        const today = new Date().toISOString().split('T')[0];
        
        let dateText = '';
        if (this.selectedDate === today) {
            dateText = 'Сегодня';
        } else {
            dateText = date.toLocaleDateString('ru-RU', { 
                weekday: 'long',
                day: 'numeric', 
                month: 'long' 
            });
        }
        
        dateElement.textContent = dateText;
        
        // Задачи на выбранный день
        const dayTasks = taskFlow.allTasks.filter(task => 
            task.date === this.selectedDate && !task.completed
        );
        
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
                    </div>
                    ${task.time ? `
                        <div class="day-task-time">
                            <i class="far fa-clock"></i>
                            ${task.time}
                        </div>
                    ` : ''}
                </div>
                <div class="day-task-actions">
                    <button class="task-btn complete" onclick="taskManager.toggleComplete('${task.id}')">
                        <i class="fas fa-check"></i>
                    </button>
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
