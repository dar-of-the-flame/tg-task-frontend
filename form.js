// form.js - управление формами
class FormManager {
    constructor() {
        this.currentFormType = 'task';
    }
    
    init() {
        this.setupFormDefaults();
        this.setupEventListeners();
    }
    
    setupFormDefaults() {
        // Устанавливаем сегодняшнюю дату
        const today = new Date();
        const dateInput = document.getElementById('task-date');
        if (dateInput) {
            dateInput.value = today.toISOString().split('T')[0];
            dateInput.min = today.toISOString().split('T')[0];
        }
        
        // Устанавливаем текущее время в формате HH:MM
        const timeInput = document.getElementById('task-time');
        if (timeInput) {
            const hours = today.getHours().toString().padStart(2, '0');
            const minutes = today.getMinutes().toString().padStart(2, '0');
            timeInput.value = `${hours}:${minutes}`;
        }
        
        // Устанавливаем тип формы
        this.adjustFormForType('task');
    }
    
    setupEventListeners() {
        // Категории
        document.querySelectorAll('.category-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                document.querySelectorAll('.category-tag').forEach(t => {
                    t.classList.remove('active');
                    t.style.background = '';
                    t.style.color = '';
                });
                
                e.currentTarget.classList.add('active');
                e.currentTarget.style.background = '#3b82f6';
                e.currentTarget.style.color = 'white';
                
                document.getElementById('task-category').value = e.currentTarget.dataset.category;
            });
            
            // Активируем "Личное" по умолчанию
            if (tag.dataset.category === 'personal') {
                tag.click();
            }
        });
        
        // Типы задач
        document.querySelectorAll('.type-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                this.currentFormType = e.currentTarget.dataset.type;
                this.adjustFormForType(this.currentFormType);
            });
        });
        
        // Приоритеты
        document.querySelectorAll('.priority-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                const priority = e.currentTarget.dataset.priority;
                document.getElementById('task-priority').value = priority;
                
                document.querySelectorAll('.priority-btn').forEach(b => {
                    b.style.background = '';
                    b.style.color = '';
                });
                
                let color = '';
                switch(priority) {
                    case 'high': color = '#ef4444'; break;
                    case 'medium': color = '#f59e0b'; break;
                    case 'low': color = '#10b981'; break;
                }
                
                e.currentTarget.style.background = color;
                e.currentTarget.style.color = 'white';
            });
            
            // Активируем средний приоритет по умолчанию
            if (btn.dataset.priority === 'medium') {
                btn.click();
            }
        });
    }
    
    adjustFormForType(type) {
        const datetimeGroup = document.getElementById('datetime-group');
        const priorityGroup = document.getElementById('priority-group');
        const dateInput = document.getElementById('task-date');
        const timeInput = document.getElementById('task-time');
        
        switch(type) {
            case 'note':
                // Заметка: без даты/времени и приоритета
                if (datetimeGroup) datetimeGroup.style.display = 'none';
                if (priorityGroup) priorityGroup.style.display = 'none';
                if (dateInput) dateInput.required = false;
                if (timeInput) timeInput.required = false;
                break;
                
            case 'reminder':
                // Напоминание: с датой/временем, без приоритета
                if (datetimeGroup) datetimeGroup.style.display = 'block';
                if (priorityGroup) priorityGroup.style.display = 'none';
                if (dateInput) dateInput.required = true;
                if (timeInput) timeInput.required = true;
                break;
                
            case 'task':
            default:
                // Задача: с датой/временем и приоритетом
                if (datetimeGroup) datetimeGroup.style.display = 'block';
                if (priorityGroup) priorityGroup.style.display = 'block';
                if (dateInput) dateInput.required = false; // Дата не обязательна для задачи
                if (timeInput) timeInput.required = false; // Время не обязательно для задачи
                break;
        }
    }
    
    getFormData() {
        const text = document.getElementById('task-text')?.value.trim();
        const category = document.getElementById('task-category')?.value;
        const priority = document.getElementById('task-priority')?.value;
        const date = document.getElementById('task-date')?.value;
        const time = document.getElementById('task-time')?.value;
        const type = this.currentFormType;
        
        if (!text) {
            throw new Error('Введите текст задачи');
        }
        
        // Для заметки
        if (type === 'note') {
            return {
                text,
                category: category || 'personal',
                priority: 'medium',
                date: null,
                time: null,
                reminder: 0,
                emoji: '📝',
                is_reminder: false,
                task_type: 'note'
            };
        }
        
        // Для напоминания
        if (type === 'reminder') {
            if (!date || !time) {
                throw new Error('Для напоминания укажите дату и время');
            }
            
            return {
                text,
                category: category || 'personal',
                priority: 'medium',
                date: date,
                time: time,
                reminder: 0,
                emoji: '🔔',
                is_reminder: true,
                task_type: 'reminder'
            };
        }
        
        // Для обычной задачи
        return {
            text,
            category: category || 'personal',
            priority: priority || 'medium',
            date: date || null,
            time: time || null,
            reminder: 0,
            emoji: '📝',
            is_reminder: false,
            task_type: 'task'
        };
    }
    
    resetForm() {
        const form = document.getElementById('task-form');
        if (form) form.reset();
        
        this.setupFormDefaults();
        
        document.querySelectorAll('.category-tag').forEach(tag => {
            if (tag.dataset.category === 'personal') {
                tag.click();
            }
        });
        
        document.querySelectorAll('.priority-btn').forEach(btn => {
            if (btn.dataset.priority === 'medium') {
                btn.click();
            }
        });
        
        document.querySelectorAll('.type-tab').forEach(tab => {
            if (tab.dataset.type === 'task') {
                tab.click();
            }
        });
    }
}

const formManager = new FormManager();
window.formManager = formManager;
