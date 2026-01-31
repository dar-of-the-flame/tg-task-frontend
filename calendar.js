// Модуль календаря
class CalendarManager {
    constructor() {
        this.currentDate = taskFlow.currentCalendarDate;
        this.selectedDate = taskFlow.selectedCalendarDate;
    }
    
    // Инициализация календаря
    init() {
        this.renderCalendar();
        this.updateDayTasks();
    }
    
    // Рендеринг календаря
    renderCalendar() {
        const container = document.getElementById('calendar-grid');
        const monthElement = document.getElementById('current-month');
        
        if (!container || !monthElement) return;
        
        // Обновляем заголовок месяца
        const monthNames = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        
        monthElement.textContent = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        
        // Очищаем контейнер (сохраняем заголовки дней)
        const weekdays = container.querySelectorAll('.weekday');
        container.innerHTML = '';
        weekdays.forEach(day => container.appendChild(day.cloneNode(true)));
        
        // Получаем первый и последний день месяца
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        
        // Добавляем пустые ячейки до первого дня
        const firstDayOfWeek = firstDay.getDay() || 7;
        for (let i = 1; i < firstDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            container.appendChild(emptyDay);
        }
        
        // Добавляем дни месяца
        const today = new Date().toISOString().split('T')[0];
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
            const dateStr = date.toISOString().split('T')[0];
            
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
            
            // Проверяем, есть ли задачи на этот день
            const hasTasks = taskFlow.allTasks.some(task => task.date === dateStr) || 
                            taskFlow.calendarNotes.some(note => note.date === dateStr);
            
            if (hasTasks) {
                dayElement.classList.add('has-tasks');
            }
            
            dayElement.innerHTML = `<div class="day-number">${day}</div>`;
            
            // Обработчик клика
            dayElement.addEventListener('click', () => {
                this.selectDate(dateStr);
            });
            
            container.appendChild(dayElement);
        }
    }
    
    // Выбор даты
    selectDate(dateStr) {
        this.selectedDate = dateStr;
        taskFlow.selectedCalendarDate = dateStr;
        
        this.renderCalendar();
        this.updateDayTasks();
    }
    
    // Обновление задач на выбранный день
    updateDayTasks() {
        const container = document.getElementById('day-tasks-list');
        const dateElement = document.getElementById('selected-date');
        
        if (!container || !dateElement) return;
        
        // Форматируем дату для отображения
        const date = new Date(this.selectedDate);
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        let dateText = '';
        if (this.selectedDate === today) {
            dateText = 'сегодня';
        } else if (this.selectedDate === tomorrow.toISOString().split('T')[0]) {
            dateText = 'завтра';
        } else {
            dateText = date.toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'long' 
            });
        }
        
        dateElement.textContent = dateText;
        
        // Находим задачи на этот день
        const dayTasks = taskFlow.allTasks.filter(task => task.date === this.selectedDate);
        const dayNotes = taskFlow.calendarNotes.filter(note => note.date === this.selectedDate);
        
        // Если нет задач
        if (dayTasks.length === 0 && dayNotes.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 20px;">
                    <p>Нет задач на этот день</p>
                    <button class="btn btn-primary" onclick="calendarManager.addTaskToSelectedDate()" style="margin-top: 10px;">
                        <i class="fas fa-plus"></i> Добавить задачу
                    </button>
                </div>
            `;
            return;
        }
        
        // Отображаем задачи и заметки
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
                    <button class="task-btn" onclick="calendarManager.deleteNote('${note.id}')" title="Удалить заметку">
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
                    <button class="task-btn" onclick="taskManager.completeTask('${task.id}')" title="Выполнить">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    // Добавление задачи на выбранную дату
    addTaskToSelectedDate() {
        const dateInput = document.getElementById('task-date');
        if (dateInput) {
            dateInput.value = this.selectedDate;
        }
        
        // Открываем форму добавления задачи
        if (typeof openTaskForm === 'function') {
            openTaskForm();
        }
    }
    
    // Создание быстрой заметки
    async createQuickNote(text, color) {
        try {
            const note = {
                id: Date.now(),
                text: text.trim(),
                color: color,
                date: this.selectedDate,
                created_at: new Date().toISOString()
            };
            
            taskFlow.calendarNotes.push(note);
            taskFlow.saveToStorage();
            
            this.updateDayTasks();
            this.renderCalendar();
            
            return { success: true, note };
        } catch (error) {
            console.error('Ошибка создания заметки:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Удаление заметки
    deleteNote(noteId) {
        if (!confirm('Удалить эту заметку?')) return false;
        
        const noteIndex = taskFlow.calendarNotes.findIndex(note => note.id == noteId);
        if (noteIndex !== -1) {
            taskFlow.calendarNotes.splice(noteIndex, 1);
            taskFlow.saveToStorage();
            
            this.updateDayTasks();
            this.renderCalendar();
            
            if (typeof showToast === 'function') {
                showToast('Заметка удалена', 'warning');
            }
            
            return true;
        }
        return false;
    }
    
    // Переключение месяца
    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        taskFlow.currentCalendarDate = this.currentDate;
        this.renderCalendar();
    }
    
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        taskFlow.currentCalendarDate = this.currentDate;
        this.renderCalendar();
    }
    
    // Переход к сегодняшней дате
    goToToday() {
        this.currentDate = new Date();
        this.selectedDate = this.currentDate.toISOString().split('T')[0];
        
        taskFlow.currentCalendarDate = this.currentDate;
        taskFlow.selectedCalendarDate = this.selectedDate;
        
        this.renderCalendar();
        this.updateDayTasks();
    }
}

// Создаем и экспортируем экземпляр
const calendarManager = new CalendarManager();
window.calendarManager = calendarManager;
