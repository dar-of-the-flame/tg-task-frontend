// Модуль статистики
class StatsManager {
    constructor() {
        this.categoryChart = null;
        this.weekdayChart = null;
    }
    
    // Инициализация графиков
    initCharts() {
        // Только если есть canvas элементы
        const categoryCanvas = document.getElementById('categoryChart');
        const weekdayCanvas = document.getElementById('weekdayChart');
        
        if (!categoryCanvas || !weekdayCanvas) return;
        
        // График по категориям
        const categoryCtx = categoryCanvas.getContext('2d');
        this.categoryChart = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: ['Работа', 'Личное', 'Здоровье', 'Учёба'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#667eea', '#f093fb', '#4facfe', '#43e97b'],
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
                            font: { size: 12 }
                        }
                    }
                },
                cutout: '60%'
            }
        });
        
        // График по дням недели
        const weekdayCtx = weekdayCanvas.getContext('2d');
        this.weekdayChart = new Chart(weekdayCtx, {
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
                    legend: { display: false }
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
                        grid: { display: false },
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                        }
                    }
                }
            }
        });
    }
    
    // Обновление статистики
    updateStats() {
        const allActiveTasks = taskFlow.allTasks.filter(t => !t.archived);
        const totalTasks = allActiveTasks.length + taskFlow.archivedTasks.length;
        const completedTasks = taskFlow.archivedTasks.filter(t => t.completed).length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const activeTasks = allActiveTasks.filter(t => !t.completed).length;
        
        // Обновляем основные показатели
        this.updateElement('total-tasks', totalTasks);
        this.updateElement('completed-tasks', completedTasks);
        this.updateElement('productivity', `${completionRate}%`);
        this.updateElement('in-progress', activeTasks);
        
        // Подсчет дней подряд
        const streak = this.calculateStreak();
        this.updateElement('streak', streak);
        
        // Подсчет по категориям
        const categoryStats = this.calculateCategoryStats();
        
        // Подсчет по дням недели
        const weekdayStats = this.calculateWeekdayStats();
        
        // Обновляем графики
        if (this.categoryChart) {
            this.categoryChart.data.datasets[0].data = [
                categoryStats.work,
                categoryStats.personal,
                categoryStats.health,
                categoryStats.study
            ];
            this.categoryChart.update();
        }
        
        if (this.weekdayChart) {
            this.weekdayChart.data.datasets[0].data = weekdayStats;
            this.weekdayChart.update();
        }
        
        // Дополнительная статистика
        const avgPerDay = this.calculateAveragePerDay();
        const bestDay = Math.max(...weekdayStats);
        const overdueTasks = this.calculateOverdueTasks();
        
        this.updateElement('avg-per-day', avgPerDay.toFixed(1));
        this.updateElement('best-day', bestDay);
        this.updateElement('overdue-tasks', overdueTasks);
        
        // Отображаем список задач в статистике
        this.renderTasksInStats();
    }
    
    // Отображение задач в статистике
    renderTasksInStats() {
        const container = document.getElementById('stats-tasks-list');
        if (!container) return;
        
        // Показываем все активные задачи (не архивные)
        const activeTasks = taskFlow.allTasks.filter(task => !task.archived);
        
        if (activeTasks.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Нет активных задач</p></div>';
            return;
        }
        
        // Используем taskManager для рендеринга
        if (typeof taskManager !== 'undefined') {
            taskManager.renderTasks(activeTasks, 'stats-tasks-list');
        }
    }
    
    // Подсчет дней подряд
    calculateStreak() {
        const completedDates = [...new Set(
            taskFlow.archivedTasks
                .filter(t => t.completed && t.completed_at)
                .map(t => t.completed_at.split('T')[0])
        )].sort();
        
        if (completedDates.length === 0) return 0;
        
        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        let currentDate = new Date(today);
        
        while (completedDates.includes(currentDate.toISOString().split('T')[0])) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        }
        
        return streak;
    }
    
    // Подсчет по категориям
    calculateCategoryStats() {
        const stats = { work: 0, personal: 0, health: 0, study: 0 };
        
        taskFlow.allTasks.forEach(task => {
            if (stats[task.category] !== undefined) {
                stats[task.category]++;
            }
        });
        
        return stats;
    }
    
    // Подсчет по дням недели
    calculateWeekdayStats() {
        const stats = [0, 0, 0, 0, 0, 0, 0];
        
        taskFlow.allTasks.forEach(task => {
            if (task.date) {
                const date = new Date(task.date);
                const day = date.getDay(); // 0 - воскресенье, 1 - понедельник
                const adjustedDay = day === 0 ? 6 : day - 1; // Преобразуем к 0-6, где 0 - понедельник
                stats[adjustedDay]++;
            }
        });
        
        return stats;
    }
    
    // Подсчет среднего количества задач в день
    calculateAveragePerDay() {
        const tasksByDate = {};
        const allTasks = [...taskFlow.allTasks, ...taskFlow.archivedTasks];
        
        allTasks.forEach(task => {
            if (task.date) {
                tasksByDate[task.date] = (tasksByDate[task.date] || 0) + 1;
            }
        });
        
        const datesCount = Object.keys(tasksByDate).length;
        if (datesCount === 0) return 0;
        
        const totalTasks = Object.values(tasksByDate).reduce((sum, count) => sum + count, 0);
        return totalTasks / datesCount;
    }
    
    // Подсчет просроченных задач
    calculateOverdueTasks() {
        const today = new Date().toISOString().split('T')[0];
        return taskFlow.allTasks.filter(task => 
            task.date && task.date < today && !task.completed && !task.archived
        ).length;
    }
    
    // Обновление элемента DOM
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    // Обновление темы графиков
    updateChartsTheme() {
        if (this.categoryChart) {
            this.categoryChart.options.plugins.legend.labels.color = 
                getComputedStyle(document.documentElement).getPropertyValue('--text-primary');
            this.categoryChart.update();
        }
        
        if (this.weekdayChart) {
            this.weekdayChart.options.scales.y.ticks.color = 
                getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
            this.weekdayChart.options.scales.x.ticks.color = 
                getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
            this.weekdayChart.update();
        }
    }
}

// Создаем и экспортируем экземпляр
const statsManager = new StatsManager();
window.statsManager = statsManager;
