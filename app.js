// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Раскрываем на весь экран
tg.enableClosingConfirmation(); // Просим подтверждение при закрытии

// Получаем данные пользователя
const user = tg.initDataUnsafe.user;
console.log('User:', user);

// Основной класс приложения
class TaskApp {
    constructor() {
        this.appElement = document.getElementById('app');
        this.render();
    }

    render() {
        // Заглушка - потом заменим на реальный интерфейс
        this.appElement.innerHTML = `
            <div class="welcome">
                <h2>👋 Привет, ${user?.first_name || 'друг'}!</h2>
                <p>Твой ID: <code>${user?.id || 'не определён'}</code></p>
                <p style="margin-top: 30px; color: #666;">
                    Интерфейс планировщика скоро появится здесь.<br>
                    А пока бот уже может принимать задачи через API.
                </p>
            </div>
        `;
    }
}

// Запускаем приложение когда всё загружено
document.addEventListener('DOMContentLoaded', () => {
    new TaskApp();
});

// Функция для отправки задачи на сервер (пример)
async function sendTaskToServer(taskData) {
    const backendUrl = 'https://tg-task-bot-service.onrender.com/api/new_task'; // Замени на свой URL бекенда!
    
    const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: user.id,
            emoji: taskData.emoji || '📌',
            task_text: taskData.text,
            start_time: taskData.startTime,
            end_time: taskData.endTime,
            remind_in_minutes: parseInt(taskData.remindBefore) || 0
        })
    });
    
    return await response.json();
}
