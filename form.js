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
        
        // Устанавливаем текущее время + 1 час
        const nextHour = new Date(today.getTime() + 60 * 60 * 1000);
        const timeInput = document.getElementById('task-time');
        if (timeInput) {
            const hours = nextHour.getHours().toString().padStart(2, '0');
            const minutes = nextHour.getMinutes().toString().padStart(2, '0');
            timeInput.value = `${hours}:${minutes}`;
        }
        
        // Скрываем лишние поля
        this.hideUnnecessaryFields();
    }
    
    hideUnnecessaryFields() {
        // Убираем дублирующие поля
        const reminderGroup = document.querySelector('.form-group:nth-child(5)'); // Напоминание
        if (reminderGroup) {
            reminderGroup.style.display = 'none';
        }
        
        // Настраиваем приоритет
        this.setupPriorityButtons();
    }
    
    setupPriorityButtons() {
        const priorityButtons = document.querySelectorAll('.priority-btn');
        priorityButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                priorityButtons.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                const priority = e.currentTarget.dataset.priority;
                document.getElementById('task-priority').value = priority;
                
                // Меняем цвет кнопки
                priorityButtons.forEach(b => {
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
    
    setupEventListeners() {
        // Кнопка "Сейчас"
        const setNowBtn = document.getElementById('set-now-btn');
        if (setNowBtn) {
            setNowBtn.addEventListener('click', () => {
                const now = new Date();
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                
                const timeInput = document.getElementById('task-time');
                if (timeInput) {
                    timeInput.value = `${hours}:${minutes}`;
                }
            });
        }
        
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
    }
    
    adjustFormForType(type) {
        const timeGroup = document.querySelector('.form-group:nth-child(4)');
        const priorityGroup = document.querySelector('.form-group:nth-child(5)');
        
        switch(type) {
            case 'note':
                if (timeGroup) timeGroup.style.display = 'none';
                if (priorityGroup) priorityGroup.style.display = 'none';
                break;
                
            case 'reminder':
                if (timeGroup) timeGroup.style.display = 'block';
                if (priorityGroup) priorityGroup.style.display = 'block';
                // Устанавливаем время на 10 минут вперед
                const now = new Date();
                const in10min = new Date(now.getTime() + 10 * 60 * 1000);
                const hours = in10min.getHours().toString().padStart(2, '0');
                const minutes = in10min.getMinutes().toString().padStart(2, '0');
                
                const timeInput = document.getElementById('task-time');
                if (timeInput) {
                    timeInput.value = `${hours}:${minutes}`;
                }
                break;
                
            case 'task':
            default:
                if (timeGroup) timeGroup.style.display = 'block';
                if (priorityGroup) priorityGroup.style.display = 'block';
                break;
        }
    }
    
    getFormData() {
        const text = document.getElementById('task-text')?.value.trim();
        const category = document.getElementById('task-category')?.value;
        const priority = document.getElementById('task-priority')?.value;
        const date = document.getElementById('task-date')?.value;
        const time = document.getElementById('task-time')?.value;
        
        if (!text) {
            throw new Error('Введите текст задачи');
        }
        
        // Создаем напоминание на основе времени задачи
        let reminderTime = null;
        if (date && time) {
            const taskDateTime = new Date(`${date}T${time}`);
            reminderTime = new Date(taskDateTime.getTime() - 15 * 60 * 1000); // За 15 минут
        }
        
        return {
            text,
            category: category || 'personal',
            priority: priority || 'medium',
            date: date || new Date().toISOString().split('T')[0],
            time: time || '',
            reminder_time: reminderTime ? reminderTime.toISOString() : null
        };
    }
    
    resetForm() {
        const form = document.getElementById('task-form');
        if (form) form.reset();
        
        this.setupFormDefaults();
        
        // Сбрасываем активные кнопки
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
