class FormManager {
    constructor() {
        this.currentFormType = 'task';
    }
    
    init() {
        this.setupFormDefaults();
        this.setupEventListeners();
    }
    
    setupFormDefaults() {
        const today = new Date();
        const dateInput = document.getElementById('task-date');
        if (dateInput) {
            dateInput.value = today.toISOString().split('T')[0];
            dateInput.min = today.toISOString().split('T')[0];
        }
        
        const nextHour = new Date(today.getTime() + 60 * 60 * 1000);
        const timeInput = document.getElementById('task-time');
        if (timeInput) {
            const hours = nextHour.getHours().toString().padStart(2, '0');
            const minutes = nextHour.getMinutes().toString().padStart(2, '0');
            timeInput.value = `${hours}:${minutes}`;
        }
    }
    
    setupPriorityButtons() {
        const priorityButtons = document.querySelectorAll('.priority-btn');
        priorityButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                priorityButtons.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.getElementById('task-priority').value = e.currentTarget.dataset.priority;
            });
            
            if (btn.dataset.priority === 'medium') {
                btn.click();
            }
        });
    }
    
    setupEventListeners() {
        const setNowBtn = document.getElementById('set-now-btn');
        if (setNowBtn) {
            setNowBtn.addEventListener('click', () => {
                const now = new Date();
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                document.getElementById('task-time').value = `${hours}:${minutes}`;
            });
        }
        
        document.querySelectorAll('.category-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                document.querySelectorAll('.category-tag').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.getElementById('task-category').value = e.currentTarget.dataset.category;
            });
            
            if (tag.dataset.category === 'personal') {
                tag.click();
            }
        });
        
        document.querySelectorAll('.type-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentFormType = e.currentTarget.dataset.type;
            });
        });
        
        this.setupPriorityButtons();
    }
    
    getFormData() {
        const text = document.getElementById('task-text')?.value.trim();
        const category = document.getElementById('task-category')?.value;
        const priority = document.getElementById('task-priority')?.value;
        const date = document.getElementById('task-date')?.value;
        const time = document.getElementById('task-time')?.value;
        const reminder = parseInt(document.getElementById('task-reminder')?.value) || 0;
        
        if (!text) throw new Error('Введите текст задачи');
        
        return {
            text,
            category: category || 'personal',
            priority: priority || 'medium',
            date: date || new Date().toISOString().split('T')[0],
            time: time || '',
            reminder: reminder
        };
    }
    
    resetForm() {
        const form = document.getElementById('task-form');
        if (form) form.reset();
        
        this.setupFormDefaults();
        
        document.querySelectorAll('.category-tag').forEach(tag => {
            if (tag.dataset.category === 'personal') tag.click();
        });
        
        document.querySelectorAll('.priority-btn').forEach(btn => {
            if (btn.dataset.priority === 'medium') btn.click();
        });
        
        document.querySelectorAll('.type-tab').forEach(tab => {
            if (tab.dataset.type === 'task') tab.click();
        });
    }
}

const formManager = new FormManager();
window.formManager = formManager;
